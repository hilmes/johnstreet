from dataclasses import dataclass
from typing import Dict, List, Optional, Callable
from datetime import datetime, timedelta
import logging
from enum import Enum
import asyncio
import numpy as np
from threading import Lock


class AlertLevel(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class Alert:
    level: AlertLevel
    message: str
    timestamp: datetime
    source: str
    data: Optional[Dict] = None


class MonitoringSystem:
    """Central monitoring and alerting system"""
    
    def __init__(
        self,
        portfolio_manager,
        risk_manager,
        trade_executor,
        websocket_handler,
        config: Dict
    ):
        self.portfolio_manager = portfolio_manager
        self.risk_manager = risk_manager
        self.trade_executor = trade_executor
        self.websocket_handler = websocket_handler
        self.config = config
        
        self.alerts: List[Alert] = []
        self.alert_handlers: List[Callable] = []
        self.last_health_check = datetime.now()
        self._running = False
        self._monitor_task = None
        
        # Control parameters
        self.check_interval = config.get('MONITOR_CHECK_INTERVAL', 5)
        self.api_timeout = config.get('API_TIMEOUT', 30)
        self.max_retries = config.get('MAX_RETRIES', 3)
        
        # Alert thresholds
        self.thresholds = {
            'margin_level_warning': config.get('MARGIN_LEVEL_WARNING', 2.5),
            'margin_level_critical': config.get('MARGIN_LEVEL_CRITICAL', 1.5),
            'drawdown_warning': config.get('DRAWDOWN_WARNING', 0.08),
            'drawdown_critical': config.get('DRAWDOWN_CRITICAL', 0.15),
            'daily_loss_warning': config.get('DAILY_LOSS_WARNING', 0.015),
            'daily_loss_critical': config.get('DAILY_LOSS_CRITICAL', 0.025),
            'latency_warning': config.get('LATENCY_WARNING', 500),  # ms
            'latency_critical': config.get('LATENCY_CRITICAL', 1000)  # ms
        }

    async def start(self):
        """Start the monitoring system"""
        self._running = True
        self._monitor_task = asyncio.create_task(self.monitor())

    async def stop(self):
        """Stop the monitoring system"""
        self._running = False
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
            self._monitor_task = None
    
    def add_alert_handler(self, handler: Callable):
        """Add a new alert handler"""
        self.alert_handlers.append(handler)
    
    async def monitor(self):
        """Main monitoring loop with improved error handling"""
        error_count = 0
        
        while self._running:
            try:
                async with asyncio.timeout(self.api_timeout):
                    await self._check_system_health()
                    await self._check_portfolio_health()
                    await self._check_risk_metrics()
                    await self._check_trade_execution()
                    await self._check_market_data()
                
                # Clean up old alerts
                self._cleanup_old_alerts()
                
                error_count = 0  # Reset on success
                await asyncio.sleep(self.check_interval)
                
            except asyncio.TimeoutError:
                error_count += 1
                logging.error("Monitoring checks timed out")
            except Exception as e:
                error_count += 1
                logging.error(f"Error in monitoring loop: {e}", exc_info=True)
                
            if error_count >= self.max_retries:
                logging.critical("Too many monitoring errors, stopping monitor")
                self._running = False
                break
                
            if self._running and error_count > 0:
                # Exponential backoff with max delay of 60 seconds
                delay = min(self.check_interval * (2 ** error_count), 60.0)
                await asyncio.sleep(delay)

    async def _check_system_health(self):
        """Check overall system health with timeout"""
        try:
            async with asyncio.timeout(self.api_timeout):
                # Check WebSocket connection
                ws_metrics = await self.websocket_handler.get_performance_metrics()
                
                if ws_metrics['status'] != 'connected':
                    self._create_alert(
                        AlertLevel.CRITICAL,
                        f"WebSocket disconnected: {ws_metrics['status']}",
                        "system"
                    )
                
                # Check latency
                if ws_metrics['last_latency'] > self.thresholds['latency_critical']:
                    self._create_alert(
                        AlertLevel.CRITICAL,
                        f"High latency: {ws_metrics['last_latency']}ms",
                        "system"
                    )
                elif ws_metrics['last_latency'] > self.thresholds['latency_warning']:
                    self._create_alert(
                        AlertLevel.WARNING,
                        f"Elevated latency: {ws_metrics['last_latency']}ms",
                        "system"
                    )
                
                # Check error rate
                error_rate = ws_metrics['error_count'] / max(ws_metrics['message_count'], 1)
                if error_rate > 0.01:  # More than 1% errors
                    self._create_alert(
                        AlertLevel.WARNING,
                        f"High error rate: {error_rate:.2%}",
                        "system"
                    )
                    
        except asyncio.TimeoutError:
            logging.error("Timeout checking system health")
            raise
        except Exception as e:
            logging.error(f"Error checking system health: {e}", exc_info=True)
            raise

    async def _check_portfolio_health(self):
        """Check portfolio health metrics with timeout"""
        try:
            async with asyncio.timeout(self.api_timeout):
                # 1) Ensure we have a metrics object
                if not self.portfolio_manager.metrics:
                    return
                
                metrics = self.portfolio_manager.metrics
                
                # 2) Check margin level
                if metrics.margin_level < self.thresholds['margin_level_critical']:
                    self._create_alert(
                        AlertLevel.CRITICAL,
                        f"Critical margin level: {metrics.margin_level:.2f}",
                        "portfolio"
                    )
                elif metrics.margin_level < self.thresholds['margin_level_warning']:
                    self._create_alert(
                        AlertLevel.WARNING,
                        f"Low margin level: {metrics.margin_level:.2f}",
                        "portfolio"
                    )
                
                # 3) Check drawdown
                if metrics.max_drawdown > self.thresholds['drawdown_critical']:
                    self._create_alert(
                        AlertLevel.CRITICAL,
                        f"Critical drawdown: {metrics.max_drawdown:.2%}",
                        "portfolio"
                    )
                elif metrics.max_drawdown > self.thresholds['drawdown_warning']:
                    self._create_alert(
                        AlertLevel.WARNING,
                        f"High drawdown: {metrics.max_drawdown:.2%}",
                        "portfolio"
                    )
                
                # 4) Check daily PnL
                daily_return = metrics.daily_pnl / metrics.total_equity
                if daily_return < -self.thresholds['daily_loss_critical']:
                    self._create_alert(
                        AlertLevel.CRITICAL,
                        f"Critical daily loss: {daily_return:.2%}",
                        "portfolio"
                    )
                elif daily_return < -self.thresholds['daily_loss_warning']:
                    self._create_alert(
                        AlertLevel.WARNING,
                        f"High daily loss: {daily_return:.2%}",
                        "portfolio"
                    )

                # 5) Check the actual balances (NEW step)
                await self._check_portfolio_balances()

        except asyncio.TimeoutError:
            logging.error("Timeout checking portfolio health")
            raise
        except Exception as e:
            logging.error(f"Error checking portfolio health: {e}", exc_info=True)
            raise

    async def _check_portfolio_balances(self):
        """
        Example method that uses the real `async get_balances()` in PortfolioManager.
        This ensures we actually confirm the portfolio_manager has that async method.
        """
        try:
            # Attempt to call the real async method:
            balances = await self.portfolio_manager.get_balances()

            # Just an example check: if total balance is 0, raise a warning
            total_balance = sum(balances.values())
            if total_balance <= 0:
                self._create_alert(
                    AlertLevel.WARNING,
                    f"Portfolio total balance is {total_balance}, which is suspiciously low.",
                    "portfolio"
                )

        except AttributeError:
            # If we literally do not have an async method:
            logging.error(
                "The object passed as portfolio_manager does not have an async get_balances() method. "
                "Make sure you're passing a valid PortfolioManager instance."
            )
        except Exception as e:
            logging.error(f"Error checking portfolio balances: {e}", exc_info=True)

    async def _check_risk_metrics(self):
        """Check risk management metrics with timeout"""
        try:
            async with asyncio.timeout(self.api_timeout):
                # Check position concentration
                for position in self.portfolio_manager.positions.values():
                    exposure = position.current_price * position.volume
                    exposure_pct = exposure / self.portfolio_manager.metrics.total_equity
                    
                    if exposure_pct > 0.4:  # More than 40% in a single position
                        self._create_alert(
                            AlertLevel.WARNING,
                            f"High position concentration in {position.pair}: {exposure_pct:.2%}",
                            "risk"
                        )
                
                # Check leveraged positions
                total_leveraged = sum(
                    1 for pos in self.portfolio_manager.positions.values()
                    if pos.leverage > 1
                )
                if total_leveraged > 3:  # More than 3 leveraged positions
                    self._create_alert(
                        AlertLevel.WARNING,
                        f"High number of leveraged positions: {total_leveraged}",
                        "risk"
                    )
                    
        except asyncio.TimeoutError:
            logging.error("Timeout checking risk metrics")
            raise
        except Exception as e:
            logging.error(f"Error checking risk metrics: {e}", exc_info=True)
            raise
    
    async def _check_trade_execution(self):
        """Check trade execution health with timeout"""
        try:
            async with asyncio.timeout(self.api_timeout):
                # Check pending orders
                for order_id, status in self.trade_executor.order_status.items():
                    if status == "PENDING":
                        order = self.trade_executor.active_orders.get(order_id)
                        if order and (datetime.now() - order.entry_time) > timedelta(minutes=5):
                            self._create_alert(
                                AlertLevel.WARNING,
                                f"Order {order_id} pending for >5 minutes",
                                "execution",
                                {"order": order.__dict__}
                            )
                
                # Check execution errors
                error_orders = [
                    order_id for order_id, status in self.trade_executor.order_status.items()
                    if status == "ERROR"
                ]
                if error_orders:
                    self._create_alert(
                        AlertLevel.WARNING,
                        f"Trade execution errors: {len(error_orders)} orders",
                        "execution",
                        {"order_ids": error_orders}
                    )
                    
        except asyncio.TimeoutError:
            logging.error("Timeout checking trade execution")
            raise
        except Exception as e:
            logging.error(f"Error checking trade execution: {e}", exc_info=True)
            raise
    
    async def _check_market_data(self):
        """Monitor market data quality with timeout"""
        try:
            async with asyncio.timeout(self.api_timeout):
                # Check data freshness
                ticker_data = await self.websocket_handler.get_ticker_data()
                for pair, data in ticker_data.items():
                    if data.get('timestamp', 0) < datetime.now().timestamp() - 60:  # Data older than 60s
                        self._create_alert(
                            AlertLevel.WARNING,
                            f"Stale market data for {pair}",
                            "market_data"
                        )
                
                # Check price gaps
                for pair in self.portfolio_manager.positions.keys():
                    if pair in ticker_data:
                        last_price = float(ticker_data[pair].get('c', [0])[0])
                        if await self._check_price_gap(pair, last_price):
                            self._create_alert(
                                AlertLevel.WARNING,
                                f"Large price gap detected in {pair}",
                                "market_data",
                                {"price": last_price}
                            )
                            
        except asyncio.TimeoutError:
            logging.error("Timeout checking market data")
            raise
        except Exception as e:
            logging.error(f"Error checking market data: {e}", exc_info=True)
            raise
    
    async def _check_price_gap(self, pair: str, current_price: float) -> bool:
        """Check for significant price gaps with timeout"""
        try:
            async with asyncio.timeout(self.api_timeout):
                # Get recent prices from the database, for instance
                recent_prices = await self.portfolio_manager.db.get_recent_prices(pair, limit=10)
                if not recent_prices:
                    return False
                
                # Calculate average price change
                price_changes = np.diff(recent_prices)
                avg_change = np.mean(np.abs(price_changes))
                std_change = np.std(np.abs(price_changes))
                
                # Check if current change is significant
                last_price = recent_prices[-1]
                current_change = abs(current_price - last_price)
                
                return current_change > (avg_change + 3 * std_change)  # 3 standard deviations
                
        except asyncio.TimeoutError:
            logging.error(f"Timeout checking price gap for {pair}")
            return False
        except Exception as e:
            logging.error(f"Error checking price gap: {e}", exc_info=True)
            return False
    
    def _create_alert(
        self,
        level: AlertLevel,
        message: str,
        source: str,
        data: Optional[Dict] = None
    ):
        """Create and process a new alert"""
        try:
            # Create alert
            alert = Alert(
                level=level,
                message=message,
                timestamp=datetime.now(),
                source=source,
                data=data
            )
            
            # Add to alerts list
            self.alerts.append(alert)
            
            # Notify all handlers
            for handler in self.alert_handlers:
                try:
                    handler(alert)
                except Exception as handler_error:
                    logging.error(f"Error in alert handler: {handler_error}")
            
            # Log alert
            log_level = (
                logging.CRITICAL if level == AlertLevel.CRITICAL else
                logging.WARNING if level == AlertLevel.WARNING else
                logging.INFO
            )
            logging.log(log_level, f"[{source.upper()}] {message}")
            
        except Exception as e:
            logging.error(f"Error creating alert: {e}")
    
    def _cleanup_old_alerts(self):
        """Remove old alerts"""
        try:
            current_time = datetime.now()
            retention_period = timedelta(days=7)  # Keep alerts for 7 days
            
            self.alerts = [
                alert for alert in self.alerts
                if current_time - alert.timestamp <= retention_period
            ]
        except Exception as e:
            logging.error(f"Error cleaning up alerts: {e}")


class SystemMonitor:
    """Thread-safe basic system monitoring functionality"""
    
    def __init__(self):
        self.start_time = datetime.now()
        self.last_check = self.start_time
        self.error_count = 0
        self.warn_count = 0
        self._lock = Lock()  # Add thread safety
        
    def get_system_metrics(self) -> Dict:
        """Get basic system metrics"""
        with self._lock:
            current_time = datetime.now()
            uptime = (current_time - self.start_time).total_seconds()
            return {
                'uptime': uptime,
                'error_count': self.error_count,
                'warn_count': self.warn_count,
                'last_check': self.last_check.isoformat()
            }
    
    def record_error(self):
        """Record a system error thread-safely"""
        with self._lock:
            self.error_count += 1
            self.last_check = datetime.now()
    
    def record_warning(self):
        """Record a system warning thread-safely"""
        with self._lock:
            self.warn_count += 1
            self.last_check = datetime.now()
