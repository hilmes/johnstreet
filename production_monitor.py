"""
Production Monitoring and Alerting System

Real-time monitoring, metrics collection, and alerting for live trading.
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, field
from collections import deque
import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from notification_system import (
    NotificationSystem, NotificationConfig, PerformanceEnvelope,
    AlertLevel, NotificationChannel
)

logger = logging.getLogger(__name__)


@dataclass
class HealthCheck:
    """Health check result"""
    component: str
    status: str  # 'healthy', 'degraded', 'unhealthy'
    message: str
    timestamp: datetime = field(default_factory=datetime.now)
    details: Dict = field(default_factory=dict)


@dataclass
class Alert:
    """Alert notification"""
    level: str  # 'info', 'warning', 'error', 'critical'
    component: str
    message: str
    timestamp: datetime = field(default_factory=datetime.now)
    details: Dict = field(default_factory=dict)
    resolved: bool = False


class ProductionMonitor:
    """
    Comprehensive monitoring system for production trading
    """
    
    def __init__(self, kraken_api, kill_switch, risk_manager, notification_config: Optional[NotificationConfig] = None):
        self.api = kraken_api
        self.kill_switch = kill_switch
        self.risk_manager = risk_manager
        
        # Initialize notification system
        if notification_config:
            performance_envelope = PerformanceEnvelope(
                max_drawdown=0.10,
                min_sharpe_ratio=0.5,
                max_losing_streak=5,
                max_daily_loss=0.03,
                min_win_rate=0.35
            )
            self.notification_system = NotificationSystem(notification_config, performance_envelope)
        else:
            self.notification_system = None
        
        # Monitoring state
        self.is_running = False
        self.start_time = datetime.now()
        
        # Metrics storage
        self.metrics = {
            'trades': deque(maxlen=1000),
            'pnl': deque(maxlen=1000),
            'errors': deque(maxlen=100),
            'api_calls': deque(maxlen=1000),
            'positions': {},
            'balance_history': deque(maxlen=288),  # 24 hours at 5-min intervals
        }
        
        # Performance metrics
        self.performance = {
            'total_trades': 0,
            'winning_trades': 0,
            'losing_trades': 0,
            'total_pnl': 0.0,
            'max_drawdown': 0.0,
            'sharpe_ratio': 0.0,
            'win_rate': 0.0,
        }
        
        # Health checks
        self.health_checks: List[HealthCheck] = []
        self.health_check_interval = 60  # seconds
        
        # Alerts
        self.active_alerts: List[Alert] = []
        self.alert_history: deque = deque(maxlen=100)
        self.alert_callbacks: List[Callable] = []
        
        # Thresholds
        self.thresholds = {
            'max_api_errors_per_minute': 5,
            'max_trade_failures_per_hour': 10,
            'min_balance_usd': 100,
            'max_position_concentration': 0.3,
            'max_daily_loss': 0.05,
            'high_slippage_pct': 0.01,
        }
        
        # Monitoring tasks
        self._monitor_task = None
        self._health_check_task = None
        self._metrics_task = None
        
    async def start(self):
        """Start monitoring system"""
        if self.is_running:
            return
            
        self.is_running = True
        self.start_time = datetime.now()
        
        # Start monitoring tasks
        self._monitor_task = asyncio.create_task(self._monitor_loop())
        self._health_check_task = asyncio.create_task(self._health_check_loop())
        self._metrics_task = asyncio.create_task(self._metrics_collection_loop())
        
        # Start notification system control server
        if self.notification_system:
            await self.notification_system.start_control_server()
        
        logger.info("Production monitoring started")
        await self.create_alert('info', 'monitor', 'Production monitoring started')
        
    async def stop(self):
        """Stop monitoring system"""
        self.is_running = False
        
        # Cancel tasks
        for task in [self._monitor_task, self._health_check_task, self._metrics_task]:
            if task:
                task.cancel()
                await asyncio.gather(task, return_exceptions=True)
                
        logger.info("Production monitoring stopped")
        
    async def _monitor_loop(self):
        """Main monitoring loop"""
        while self.is_running:
            try:
                # Check critical conditions
                await self._check_kill_switch()
                await self._check_risk_limits()
                await self._check_api_errors()
                await self._check_positions()
                await self._check_balance()
                
                await asyncio.sleep(5)  # Check every 5 seconds
                
            except Exception as e:
                logger.error(f"Monitor loop error: {e}")
                await self.create_alert('error', 'monitor', f'Monitoring error: {str(e)}')
                
    async def _health_check_loop(self):
        """Perform regular health checks"""
        while self.is_running:
            try:
                checks = []
                
                # API connectivity
                api_health = await self._check_api_health()
                checks.append(api_health)
                
                # WebSocket status
                ws_health = await self._check_websocket_health()
                checks.append(ws_health)
                
                # Database connectivity
                db_health = await self._check_database_health()
                checks.append(db_health)
                
                # System resources
                system_health = await self._check_system_health()
                checks.append(system_health)
                
                self.health_checks = checks
                
                # Alert on unhealthy components
                for check in checks:
                    if check.status == 'unhealthy':
                        await self.create_alert(
                            'error', 
                            check.component,
                            f'{check.component} is unhealthy: {check.message}'
                        )
                        
                await asyncio.sleep(self.health_check_interval)
                
            except Exception as e:
                logger.error(f"Health check error: {e}")
                
    async def _metrics_collection_loop(self):
        """Collect performance metrics"""
        while self.is_running:
            try:
                # Update balance history
                balance = await self._get_total_balance_usd()
                self.metrics['balance_history'].append({
                    'timestamp': datetime.now(),
                    'balance': balance
                })
                
                # Calculate performance metrics
                self._update_performance_metrics()
                
                # Check performance envelope
                if self.notification_system:
                    await self._check_performance_envelope()
                
                # Save metrics to file
                self._save_metrics()
                
                await asyncio.sleep(300)  # Every 5 minutes
                
            except Exception as e:
                logger.error(f"Metrics collection error: {e}")
                
    async def _check_kill_switch(self):
        """Monitor kill switch status"""
        if self.kill_switch.state != 'active':
            await self.create_alert(
                'critical',
                'kill_switch',
                f'Kill switch is {self.kill_switch.state}: {self.kill_switch.trigger_reason}'
            )
            
    async def _check_risk_limits(self):
        """Monitor risk management limits"""
        if self.risk_manager.is_max_drawdown_exceeded():
            await self.create_alert(
                'critical',
                'risk_manager',
                'Maximum drawdown exceeded'
            )
            
        if self.risk_manager.daily_loss_limit_exceeded():
            await self.create_alert(
                'error',
                'risk_manager',
                'Daily loss limit exceeded'
            )
            
    async def _check_api_errors(self):
        """Monitor API error rate"""
        recent_errors = [e for e in self.metrics['errors'] 
                        if e['timestamp'] > datetime.now() - timedelta(minutes=1)]
        
        if len(recent_errors) > self.thresholds['max_api_errors_per_minute']:
            await self.create_alert(
                'error',
                'api',
                f'High API error rate: {len(recent_errors)} errors/minute'
            )
            
    async def _check_positions(self):
        """Monitor position concentration and risk"""
        try:
            positions = await self.api.get_open_positions()
            total_value = 0
            max_position_value = 0
            
            for pos in positions:
                value = abs(float(pos.get('vol', 0)) * float(pos.get('price', 0)))
                total_value += value
                max_position_value = max(max_position_value, value)
                
            if total_value > 0:
                concentration = max_position_value / total_value
                if concentration > self.thresholds['max_position_concentration']:
                    await self.create_alert(
                        'warning',
                        'positions',
                        f'High position concentration: {concentration:.1%}'
                    )
                    
        except Exception as e:
            logger.error(f"Position check error: {e}")
            
    async def _check_balance(self):
        """Monitor account balance"""
        try:
            balance = await self._get_total_balance_usd()
            
            if balance < self.thresholds['min_balance_usd']:
                await self.create_alert(
                    'critical',
                    'balance',
                    f'Low account balance: ${balance:.2f}'
                )
                
            # Check for rapid balance decline
            if len(self.metrics['balance_history']) > 12:  # 1 hour of data
                hour_ago_balance = self.metrics['balance_history'][-12]['balance']
                decline_pct = (hour_ago_balance - balance) / hour_ago_balance
                
                if decline_pct > 0.02:  # 2% decline in 1 hour
                    await self.create_alert(
                        'error',
                        'balance',
                        f'Rapid balance decline: -{decline_pct:.1%} in 1 hour'
                    )
                    
        except Exception as e:
            logger.error(f"Balance check error: {e}")
            
    async def _check_api_health(self) -> HealthCheck:
        """Check API connectivity"""
        try:
            start_time = time.time()
            server_time = await self.api.get_server_time()
            response_time = time.time() - start_time
            
            if response_time > 2.0:
                return HealthCheck(
                    'api',
                    'degraded',
                    f'Slow API response: {response_time:.1f}s',
                    details={'response_time': response_time}
                )
            else:
                return HealthCheck(
                    'api',
                    'healthy',
                    'API responding normally',
                    details={'response_time': response_time}
                )
                
        except Exception as e:
            return HealthCheck(
                'api',
                'unhealthy',
                f'API error: {str(e)}'
            )
            
    async def _check_websocket_health(self) -> HealthCheck:
        """Check WebSocket connectivity"""
        # Check if websocket handler exists and is connected
        if hasattr(self.api, 'ws_handler') and self.api.ws_handler:
            if self.api.ws_handler.connected:
                return HealthCheck('websocket', 'healthy', 'WebSocket connected')
            else:
                return HealthCheck('websocket', 'unhealthy', 'WebSocket disconnected')
        else:
            return HealthCheck('websocket', 'degraded', 'WebSocket not initialized')
            
    async def _check_database_health(self) -> HealthCheck:
        """Check database connectivity"""
        # Placeholder - implement based on your database
        return HealthCheck('database', 'healthy', 'Database operational')
        
    async def _check_system_health(self) -> HealthCheck:
        """Check system resources"""
        try:
            import psutil
            
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            
            if cpu_percent > 90 or memory.percent > 90:
                return HealthCheck(
                    'system',
                    'degraded',
                    f'High resource usage - CPU: {cpu_percent}%, Memory: {memory.percent}%',
                    details={'cpu': cpu_percent, 'memory': memory.percent}
                )
            else:
                return HealthCheck(
                    'system',
                    'healthy',
                    'System resources normal',
                    details={'cpu': cpu_percent, 'memory': memory.percent}
                )
                
        except ImportError:
            return HealthCheck('system', 'degraded', 'psutil not installed')
            
    async def _get_total_balance_usd(self) -> float:
        """Get account balance in USD"""
        try:
            balance = await self.api.get_account_balance()
            total_usd = float(balance.get('ZUSD', 0))
            
            # Add major crypto holdings
            if 'XXBT' in balance:
                ticker = await self.api.get_ticker('XBTUSD')
                btc_price = float(ticker['XBTUSD']['c'][0])
                total_usd += float(balance['XXBT']) * btc_price
                
            return total_usd
            
        except Exception as e:
            logger.error(f"Failed to get balance: {e}")
            return 0.0
            
    def _update_performance_metrics(self):
        """Calculate performance metrics"""
        if not self.metrics['trades']:
            return
            
        # Win rate
        winning = len([t for t in self.metrics['trades'] if t['pnl'] > 0])
        total = len(self.metrics['trades'])
        self.performance['win_rate'] = winning / total if total > 0 else 0
        
        # Total P&L
        self.performance['total_pnl'] = sum(t['pnl'] for t in self.metrics['trades'])
        
        # Max drawdown
        if self.metrics['balance_history']:
            peak = max(b['balance'] for b in self.metrics['balance_history'])
            current = self.metrics['balance_history'][-1]['balance']
            self.performance['max_drawdown'] = (peak - current) / peak if peak > 0 else 0
            
    def _save_metrics(self):
        """Save metrics to file"""
        try:
            metrics_data = {
                'timestamp': datetime.now().isoformat(),
                'performance': self.performance,
                'health_checks': [
                    {
                        'component': hc.component,
                        'status': hc.status,
                        'message': hc.message,
                        'timestamp': hc.timestamp.isoformat()
                    }
                    for hc in self.health_checks
                ],
                'active_alerts': [
                    {
                        'level': alert.level,
                        'component': alert.component,
                        'message': alert.message,
                        'timestamp': alert.timestamp.isoformat()
                    }
                    for alert in self.active_alerts
                ]
            }
            
            with open('production_metrics.json', 'w') as f:
                json.dump(metrics_data, f, indent=2)
                
        except Exception as e:
            logger.error(f"Failed to save metrics: {e}")
            
    async def create_alert(self, level: str, component: str, message: str, **kwargs):
        """Create and dispatch alert"""
        alert = Alert(
            level=level,
            component=component,
            message=message,
            details=kwargs
        )
        
        # Add to active alerts
        self.active_alerts.append(alert)
        self.alert_history.append(alert)
        
        # Log alert
        log_method = getattr(logger, level, logger.info)
        log_method(f"[{component}] {message}")
        
        # Execute callbacks
        for callback in self.alert_callbacks:
            try:
                await callback(alert)
            except Exception as e:
                logger.error(f"Alert callback error: {e}")
                
        # Send notifications for critical alerts
        if level in ['error', 'critical'] and self.notification_system:
            # Convert to notification system alert
            alert_level = AlertLevel.CRITICAL if level == 'critical' else AlertLevel.ERROR
            notification_alert = self.notification_system._create_alert(
                alert_level,
                f"{component.upper()}: {message}",
                message,
                self._get_current_metrics(),
                actions=self._get_alert_actions(level, component)
            )
            
            # Send through all channels for critical alerts
            channels = [NotificationChannel.IOS_PUSH, NotificationChannel.SMS] if level == 'critical' else None
            await self.notification_system.send_alert(notification_alert, channels)
            
            # Register action callbacks
            self._register_alert_actions(notification_alert)
            
    def _get_alert_actions(self, level: str, component: str) -> List[Dict[str, str]]:
        """Get available actions based on alert type"""
        if level == 'critical':
            if component == 'kill_switch':
                return [
                    {"action": "reset_kill_switch", "label": "🔄 Reset Kill Switch"},
                    {"action": "view_positions", "label": "👁️ View Positions"},
                    {"action": "diagnostic_report", "label": "📊 Generate Report"}
                ]
            elif component == 'risk_manager':
                return [
                    {"action": "pause_trading", "label": "⏸️ Pause Trading"},
                    {"action": "close_all_positions", "label": "🛑 Close All Positions"},
                    {"action": "reduce_position_sizes", "label": "📉 Reduce Sizes"}
                ]
        elif level == 'error':
            return [
                {"action": "pause_strategy", "label": "⏸️ Pause Strategy"},
                {"action": "review_logs", "label": "📋 Review Logs"},
                {"action": "adjust_parameters", "label": "⚙️ Adjust Parameters"}
            ]
        return []
    
    def _register_alert_actions(self, alert):
        """Register callbacks for alert actions"""
        for action in alert.actions:
            action_name = action['action']
            
            # Define action callbacks
            if action_name == 'pause_trading':
                async def pause_callback():
                    self.kill_switch.pause_trading("Remote pause via alert")
                    return "Trading paused"
                self.notification_system.register_action_callback(alert.alert_id, action_name, pause_callback)
                
            elif action_name == 'close_all_positions':
                async def close_callback():
                    await self.kill_switch.emergency_close_all_positions()
                    return "All positions closed"
                self.notification_system.register_action_callback(alert.alert_id, action_name, close_callback)
                
            elif action_name == 'reset_kill_switch':
                async def reset_callback():
                    # Would need admin key in production
                    admin_key = os.environ.get('KILL_SWITCH_RESET_KEY', '')
                    self.kill_switch.reset_kill_switch(admin_key)
                    return "Kill switch reset attempted"
                self.notification_system.register_action_callback(alert.alert_id, action_name, reset_callback)
    
    async def _check_performance_envelope(self):
        """Check if strategy is within performance envelope"""
        metrics = self._get_current_metrics()
        
        # Update baseline
        await self.notification_system.update_performance_baseline(metrics)
        
        # Check for violations
        alerts = await self.notification_system.check_performance(metrics)
        
        # Send any generated alerts
        for alert in alerts:
            await self.notification_system.send_alert(alert)
            self._register_alert_actions(alert)
    
    def _get_current_metrics(self) -> Dict[str, float]:
        """Get current performance metrics for envelope checking"""
        # Calculate current metrics
        recent_trades = list(self.metrics['trades'])[-50:] if self.metrics['trades'] else []
        winning_trades = [t for t in recent_trades if t.get('pnl', 0) > 0]
        
        # Calculate consecutive losses
        consecutive_losses = 0
        for trade in reversed(recent_trades):
            if trade.get('pnl', 0) < 0:
                consecutive_losses += 1
            else:
                break
        
        # Get current drawdown from risk manager
        current_drawdown = self.risk_manager.current_drawdown if hasattr(self.risk_manager, 'current_drawdown') else 0
        
        # Calculate daily P&L
        today_trades = [t for t in self.metrics['trades'] 
                       if t.get('timestamp', datetime.min) > datetime.now().replace(hour=0, minute=0, second=0)]
        daily_pnl = sum(t.get('pnl', 0) for t in today_trades)
        
        # Get latest balance for daily loss calculation
        if self.metrics['balance_history']:
            latest_balance = self.metrics['balance_history'][-1]['balance']
            start_of_day_balance = next(
                (b['balance'] for b in reversed(self.metrics['balance_history'])
                 if b['timestamp'].date() < datetime.now().date()),
                latest_balance
            )
            daily_loss = (latest_balance - start_of_day_balance) / start_of_day_balance if start_of_day_balance > 0 else 0
        else:
            daily_loss = 0
        
        return {
            'strategy_name': 'Production Trading',
            'current_drawdown': current_drawdown,
            'daily_loss': daily_loss,
            'consecutive_losses': consecutive_losses,
            'win_rate': len(winning_trades) / len(recent_trades) if recent_trades else 0,
            'sharpe_ratio': self.performance.get('sharpe_ratio', 0),
            'total_trades': len(recent_trades),
            'hourly_return': daily_pnl / 24 if daily_pnl else 0,  # Simplified
            'daily_pnl': daily_pnl
        }
        
    def add_alert_callback(self, callback: Callable):
        """Add callback for alerts"""
        self.alert_callbacks.append(callback)
        
    def record_trade(self, trade_data: Dict):
        """Record trade execution"""
        self.metrics['trades'].append({
            **trade_data,
            'timestamp': datetime.now()
        })
        self.performance['total_trades'] += 1
        
        if trade_data.get('pnl', 0) > 0:
            self.performance['winning_trades'] += 1
        else:
            self.performance['losing_trades'] += 1
            
    def record_error(self, error_type: str, error_message: str, **kwargs):
        """Record error event"""
        self.metrics['errors'].append({
            'type': error_type,
            'message': error_message,
            'timestamp': datetime.now(),
            'details': kwargs
        })
        
    def get_dashboard_data(self) -> Dict:
        """Get data for monitoring dashboard"""
        return {
            'uptime': (datetime.now() - self.start_time).total_seconds(),
            'performance': self.performance,
            'health_checks': [
                {
                    'component': hc.component,
                    'status': hc.status,
                    'message': hc.message,
                    'timestamp': hc.timestamp.isoformat()
                }
                for hc in self.health_checks
            ],
            'active_alerts': len(self.active_alerts),
            'recent_trades': list(self.metrics['trades'])[-10:],
            'current_positions': self.metrics.get('positions', {}),
            'balance_trend': [
                {
                    'timestamp': b['timestamp'].isoformat(),
                    'balance': b['balance']
                }
                for b in list(self.metrics['balance_history'])[-20:]
            ]
        }