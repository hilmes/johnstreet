"""
Advanced Notification System for Trading Alerts

Supports multiple channels including iOS push notifications, SMS, email, and webhooks.
Monitors strategy performance and sends alerts when operating outside expected parameters.
"""

import asyncio
import logging
import json
import aiohttp
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
import os
from twilio.rest import Client as TwilioClient
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests

logger = logging.getLogger(__name__)


class AlertLevel(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"
    

class NotificationChannel(Enum):
    """Available notification channels"""
    IOS_PUSH = "ios_push"
    SMS = "sms"
    EMAIL = "email"
    WEBHOOK = "webhook"
    DISCORD = "discord"
    TELEGRAM = "telegram"
    PUSHOVER = "pushover"
    

@dataclass
class PerformanceEnvelope:
    """Expected performance parameters for strategy monitoring"""
    max_drawdown: float = 0.10  # 10% max drawdown
    min_sharpe_ratio: float = 0.5
    max_losing_streak: int = 5
    max_daily_loss: float = 0.03  # 3% daily loss
    min_win_rate: float = 0.35  # 35% minimum win rate
    max_position_loss: float = 0.05  # 5% max loss per position
    deviation_threshold: float = 2.0  # Standard deviations from expected
    

@dataclass
class NotificationConfig:
    """Configuration for notification channels"""
    # iOS Push (via Pushover or custom webhook)
    ios_token: Optional[str] = None
    ios_webhook_url: Optional[str] = None
    
    # SMS (via Twilio)
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_from_number: Optional[str] = None
    sms_to_number: Optional[str] = None
    
    # Email
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    email_from: Optional[str] = None
    email_password: Optional[str] = None
    email_to: Optional[str] = None
    
    # Webhooks
    webhook_urls: List[str] = field(default_factory=list)
    
    # Discord
    discord_webhook_url: Optional[str] = None
    
    # Telegram
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    
    # Pushover (iOS/Android push notifications)
    pushover_user_key: Optional[str] = None
    pushover_api_token: Optional[str] = None
    

@dataclass
class Alert:
    """Trading alert with remote control capabilities"""
    alert_id: str
    level: AlertLevel
    title: str
    message: str
    timestamp: datetime = field(default_factory=datetime.now)
    strategy_name: Optional[str] = None
    metrics: Dict[str, Any] = field(default_factory=dict)
    actions: List[Dict[str, str]] = field(default_factory=list)  # Remote actions
    

class NotificationSystem:
    """
    Advanced notification system with performance monitoring and remote control
    """
    
    def __init__(self, config: NotificationConfig, performance_envelope: PerformanceEnvelope):
        self.config = config
        self.envelope = performance_envelope
        
        # Alert tracking
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.alert_callbacks: Dict[str, Callable] = {}
        
        # Performance tracking
        self.performance_baseline = {}
        self.performance_history = []
        
        # Channel setup
        self.channels = self._setup_channels()
        
        # Remote control server
        self.control_server = None
        self.control_port = 8888
        
    def _setup_channels(self) -> Dict[NotificationChannel, bool]:
        """Setup and validate notification channels"""
        channels = {}
        
        # iOS Push via Pushover
        if self.config.pushover_user_key and self.config.pushover_api_token:
            channels[NotificationChannel.IOS_PUSH] = True
            logger.info("iOS push notifications enabled via Pushover")
            
        # SMS via Twilio
        if all([self.config.twilio_account_sid, self.config.twilio_auth_token, 
                self.config.sms_to_number]):
            channels[NotificationChannel.SMS] = True
            logger.info("SMS notifications enabled via Twilio")
            
        # Email
        if all([self.config.email_from, self.config.email_password, self.config.email_to]):
            channels[NotificationChannel.EMAIL] = True
            logger.info("Email notifications enabled")
            
        # Webhooks
        if self.config.webhook_urls:
            channels[NotificationChannel.WEBHOOK] = True
            logger.info(f"Webhook notifications enabled ({len(self.config.webhook_urls)} endpoints)")
            
        # Discord
        if self.config.discord_webhook_url:
            channels[NotificationChannel.DISCORD] = True
            logger.info("Discord notifications enabled")
            
        # Telegram
        if self.config.telegram_bot_token and self.config.telegram_chat_id:
            channels[NotificationChannel.TELEGRAM] = True
            logger.info("Telegram notifications enabled")
            
        return channels
        
    async def check_performance(self, strategy_metrics: Dict[str, float]) -> List[Alert]:
        """
        Check if strategy is operating within expected performance envelope
        Returns list of alerts for any violations
        """
        alerts = []
        
        # Check drawdown
        current_drawdown = strategy_metrics.get('current_drawdown', 0)
        if abs(current_drawdown) > self.envelope.max_drawdown:
            alerts.append(self._create_alert(
                AlertLevel.CRITICAL,
                "Excessive Drawdown",
                f"Strategy drawdown {current_drawdown:.1%} exceeds limit {self.envelope.max_drawdown:.1%}",
                strategy_metrics,
                actions=[
                    {"action": "pause_trading", "label": "⏸️ Pause Trading"},
                    {"action": "close_positions", "label": "🛑 Close All Positions"},
                    {"action": "reduce_size", "label": "📉 Reduce Position Size"}
                ]
            ))
            
        # Check daily loss
        daily_loss = strategy_metrics.get('daily_loss', 0)
        if abs(daily_loss) > self.envelope.max_daily_loss:
            alerts.append(self._create_alert(
                AlertLevel.ERROR,
                "Daily Loss Limit",
                f"Daily loss {daily_loss:.1%} exceeds limit {self.envelope.max_daily_loss:.1%}",
                strategy_metrics,
                actions=[
                    {"action": "pause_until_tomorrow", "label": "⏸️ Pause Until Tomorrow"},
                    {"action": "review_positions", "label": "👁️ Review Positions"}
                ]
            ))
            
        # Check losing streak
        losing_streak = strategy_metrics.get('consecutive_losses', 0)
        if losing_streak > self.envelope.max_losing_streak:
            alerts.append(self._create_alert(
                AlertLevel.WARNING,
                "Losing Streak",
                f"Lost {losing_streak} trades in a row (limit: {self.envelope.max_losing_streak})",
                strategy_metrics,
                actions=[
                    {"action": "reduce_frequency", "label": "🐢 Reduce Trade Frequency"},
                    {"action": "review_strategy", "label": "📊 Review Strategy"}
                ]
            ))
            
        # Check win rate
        win_rate = strategy_metrics.get('win_rate', 1.0)
        if win_rate < self.envelope.min_win_rate and strategy_metrics.get('total_trades', 0) > 20:
            alerts.append(self._create_alert(
                AlertLevel.WARNING,
                "Low Win Rate",
                f"Win rate {win_rate:.1%} below minimum {self.envelope.min_win_rate:.1%}",
                strategy_metrics,
                actions=[
                    {"action": "adjust_parameters", "label": "⚙️ Adjust Parameters"},
                    {"action": "backtest_recent", "label": "📈 Backtest Recent Data"}
                ]
            ))
            
        # Check Sharpe ratio
        sharpe = strategy_metrics.get('sharpe_ratio', 1.0)
        if sharpe < self.envelope.min_sharpe_ratio:
            alerts.append(self._create_alert(
                AlertLevel.INFO,
                "Low Risk-Adjusted Returns",
                f"Sharpe ratio {sharpe:.2f} below target {self.envelope.min_sharpe_ratio:.2f}",
                strategy_metrics
            ))
            
        # Check for anomalous behavior
        if self._detect_anomaly(strategy_metrics):
            alerts.append(self._create_alert(
                AlertLevel.ERROR,
                "Anomalous Behavior Detected",
                "Strategy performance deviates significantly from historical baseline",
                strategy_metrics,
                actions=[
                    {"action": "emergency_stop", "label": "🚨 Emergency Stop"},
                    {"action": "diagnostic_mode", "label": "🔍 Run Diagnostics"}
                ]
            ))
            
        return alerts
        
    def _detect_anomaly(self, metrics: Dict[str, float]) -> bool:
        """Detect anomalous strategy behavior using statistical methods"""
        if len(self.performance_history) < 20:
            return False
            
        # Calculate rolling statistics
        import numpy as np
        recent_returns = [h.get('hourly_return', 0) for h in self.performance_history[-20:]]
        
        if recent_returns:
            mean_return = np.mean(recent_returns)
            std_return = np.std(recent_returns)
            
            current_return = metrics.get('hourly_return', 0)
            
            # Check if current performance is outside expected range
            if std_return > 0:
                z_score = abs((current_return - mean_return) / std_return)
                return z_score > self.envelope.deviation_threshold
                
        return False
        
    def _create_alert(
        self, 
        level: AlertLevel, 
        title: str, 
        message: str,
        metrics: Dict[str, Any],
        actions: List[Dict[str, str]] = None
    ) -> Alert:
        """Create a new alert"""
        import uuid
        
        alert = Alert(
            alert_id=str(uuid.uuid4()),
            level=level,
            title=title,
            message=message,
            strategy_name=metrics.get('strategy_name', 'Unknown'),
            metrics=metrics,
            actions=actions or []
        )
        
        self.active_alerts[alert.alert_id] = alert
        self.alert_history.append(alert)
        
        return alert
        
    async def send_alert(self, alert: Alert, channels: Optional[List[NotificationChannel]] = None):
        """Send alert through specified channels"""
        # Use all available channels if none specified
        if not channels:
            channels = list(self.channels.keys())
            
        # Send through each channel
        tasks = []
        for channel in channels:
            if channel in self.channels and self.channels[channel]:
                if channel == NotificationChannel.IOS_PUSH:
                    tasks.append(self._send_ios_push(alert))
                elif channel == NotificationChannel.SMS:
                    tasks.append(self._send_sms(alert))
                elif channel == NotificationChannel.EMAIL:
                    tasks.append(self._send_email(alert))
                elif channel == NotificationChannel.WEBHOOK:
                    tasks.append(self._send_webhook(alert))
                elif channel == NotificationChannel.DISCORD:
                    tasks.append(self._send_discord(alert))
                elif channel == NotificationChannel.TELEGRAM:
                    tasks.append(self._send_telegram(alert))
                    
        # Send all notifications concurrently
        await asyncio.gather(*tasks, return_exceptions=True)
        
    async def _send_ios_push(self, alert: Alert):
        """Send iOS push notification via Pushover"""
        try:
            url = "https://api.pushover.net/1/messages.json"
            
            # Format message with actions
            message = f"{alert.message}\n\n"
            if alert.actions:
                message += "Actions:\n"
                for i, action in enumerate(alert.actions):
                    message += f"{i+1}. {action['label']}\n"
                    
            # Add metrics
            if alert.metrics:
                message += f"\nMetrics: {json.dumps(alert.metrics, indent=2)}"
                
            data = {
                "token": self.config.pushover_api_token,
                "user": self.config.pushover_user_key,
                "title": f"🚨 {alert.title}",
                "message": message,
                "priority": self._get_pushover_priority(alert.level),
                "timestamp": int(alert.timestamp.timestamp()),
                "url": f"http://localhost:{self.control_port}/alert/{alert.alert_id}",
                "url_title": "Open Control Panel"
            }
            
            # High priority alerts require acknowledgment
            if alert.level in [AlertLevel.CRITICAL, AlertLevel.ERROR]:
                data["priority"] = 2
                data["retry"] = 60
                data["expire"] = 3600
                
            async with aiohttp.ClientSession() as session:
                async with session.post(url, data=data) as response:
                    if response.status == 200:
                        logger.info(f"iOS push notification sent for alert {alert.alert_id}")
                    else:
                        logger.error(f"Failed to send iOS push: {await response.text()}")
                        
        except Exception as e:
            logger.error(f"iOS push notification error: {e}")
            
    async def _send_sms(self, alert: Alert):
        """Send SMS notification via Twilio"""
        try:
            client = TwilioClient(self.config.twilio_account_sid, self.config.twilio_auth_token)
            
            # Format SMS message (limited to 160 chars)
            message = f"🚨 {alert.title}\n{alert.message[:100]}"
            if alert.actions:
                message += f"\nReply with action number: "
                message += ", ".join([f"{i+1}" for i in range(len(alert.actions))])
                
            client.messages.create(
                body=message,
                from_=self.config.twilio_from_number,
                to=self.config.sms_to_number
            )
            
            logger.info(f"SMS notification sent for alert {alert.alert_id}")
            
        except Exception as e:
            logger.error(f"SMS notification error: {e}")
            
    async def _send_email(self, alert: Alert):
        """Send email notification"""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"🚨 Trading Alert: {alert.title}"
            msg['From'] = self.config.email_from
            msg['To'] = self.config.email_to
            
            # Create HTML content with action buttons
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif;">
                <h2 style="color: {self._get_color_for_level(alert.level)};">{alert.title}</h2>
                <p>{alert.message}</p>
                
                <h3>Strategy: {alert.strategy_name}</h3>
                
                <h4>Metrics:</h4>
                <pre>{json.dumps(alert.metrics, indent=2)}</pre>
                
                {self._create_action_buttons_html(alert)}
                
                <p style="color: #666; font-size: 12px;">
                    Alert ID: {alert.alert_id}<br>
                    Time: {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S')}
                </p>
            </body>
            </html>
            """
            
            msg.attach(MIMEText(html_content, 'html'))
            
            # Send email
            with smtplib.SMTP(self.config.smtp_server, self.config.smtp_port) as server:
                server.starttls()
                server.login(self.config.email_from, self.config.email_password)
                server.send_message(msg)
                
            logger.info(f"Email notification sent for alert {alert.alert_id}")
            
        except Exception as e:
            logger.error(f"Email notification error: {e}")
            
    async def _send_webhook(self, alert: Alert):
        """Send webhook notification"""
        payload = {
            "alert_id": alert.alert_id,
            "level": alert.level.value,
            "title": alert.title,
            "message": alert.message,
            "timestamp": alert.timestamp.isoformat(),
            "strategy_name": alert.strategy_name,
            "metrics": alert.metrics,
            "actions": alert.actions
        }
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for webhook_url in self.config.webhook_urls:
                tasks.append(session.post(webhook_url, json=payload))
                
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            for i, response in enumerate(responses):
                if isinstance(response, Exception):
                    logger.error(f"Webhook error for {self.config.webhook_urls[i]}: {response}")
                elif response.status == 200:
                    logger.info(f"Webhook sent to {self.config.webhook_urls[i]}")
                    
    async def _send_discord(self, alert: Alert):
        """Send Discord notification"""
        try:
            embed = {
                "title": f"🚨 {alert.title}",
                "description": alert.message,
                "color": self._get_discord_color(alert.level),
                "fields": [
                    {
                        "name": "Strategy",
                        "value": alert.strategy_name,
                        "inline": True
                    },
                    {
                        "name": "Level",
                        "value": alert.level.value.upper(),
                        "inline": True
                    }
                ],
                "timestamp": alert.timestamp.isoformat(),
                "footer": {
                    "text": f"Alert ID: {alert.alert_id}"
                }
            }
            
            # Add metrics as fields
            for key, value in list(alert.metrics.items())[:5]:  # Limit to 5 fields
                embed["fields"].append({
                    "name": key.replace('_', ' ').title(),
                    "value": f"{value:.2f}" if isinstance(value, float) else str(value),
                    "inline": True
                })
                
            # Add action buttons (Discord doesn't support inline actions)
            if alert.actions:
                actions_text = "\n".join([f"`!{action['action']}` - {action['label']}" 
                                        for action in alert.actions])
                embed["fields"].append({
                    "name": "Available Actions",
                    "value": actions_text,
                    "inline": False
                })
                
            webhook_data = {
                "embeds": [embed],
                "username": "Trading Bot",
                "avatar_url": "https://i.imgur.com/AfFp7pu.png"  # Replace with your avatar
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(self.config.discord_webhook_url, json=webhook_data) as response:
                    if response.status == 204:
                        logger.info(f"Discord notification sent for alert {alert.alert_id}")
                    else:
                        logger.error(f"Failed to send Discord notification: {await response.text()}")
                        
        except Exception as e:
            logger.error(f"Discord notification error: {e}")
            
    async def _send_telegram(self, alert: Alert):
        """Send Telegram notification"""
        try:
            # Format message with Markdown
            message = f"*🚨 {alert.title}*\n\n{alert.message}\n\n"
            message += f"*Strategy:* {alert.strategy_name}\n"
            message += f"*Level:* {alert.level.value.upper()}\n\n"
            
            # Add key metrics
            if alert.metrics:
                message += "*Metrics:*\n"
                for key, value in list(alert.metrics.items())[:5]:
                    formatted_key = key.replace('_', ' ').title()
                    formatted_value = f"{value:.2f}" if isinstance(value, float) else str(value)
                    message += f"• {formatted_key}: `{formatted_value}`\n"
                    
            # Add inline keyboard for actions
            keyboard = None
            if alert.actions:
                keyboard = {
                    "inline_keyboard": [
                        [{"text": action['label'], 
                          "callback_data": f"{alert.alert_id}:{action['action']}"}]
                        for action in alert.actions
                    ]
                }
                
            url = f"https://api.telegram.org/bot{self.config.telegram_bot_token}/sendMessage"
            
            data = {
                "chat_id": self.config.telegram_chat_id,
                "text": message,
                "parse_mode": "Markdown",
                "disable_web_page_preview": True
            }
            
            if keyboard:
                data["reply_markup"] = json.dumps(keyboard)
                
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=data) as response:
                    if response.status == 200:
                        logger.info(f"Telegram notification sent for alert {alert.alert_id}")
                    else:
                        logger.error(f"Failed to send Telegram notification: {await response.text()}")
                        
        except Exception as e:
            logger.error(f"Telegram notification error: {e}")
            
    def _get_pushover_priority(self, level: AlertLevel) -> int:
        """Convert alert level to Pushover priority"""
        priority_map = {
            AlertLevel.INFO: -1,      # Low priority
            AlertLevel.WARNING: 0,    # Normal
            AlertLevel.ERROR: 1,      # High priority
            AlertLevel.CRITICAL: 2    # Emergency
        }
        return priority_map.get(level, 0)
        
    def _get_color_for_level(self, level: AlertLevel) -> str:
        """Get color for alert level"""
        color_map = {
            AlertLevel.INFO: "#3498db",
            AlertLevel.WARNING: "#f39c12",
            AlertLevel.ERROR: "#e74c3c",
            AlertLevel.CRITICAL: "#c0392b"
        }
        return color_map.get(level, "#95a5a6")
        
    def _get_discord_color(self, level: AlertLevel) -> int:
        """Get Discord embed color for alert level"""
        color_map = {
            AlertLevel.INFO: 0x3498db,
            AlertLevel.WARNING: 0xf39c12,
            AlertLevel.ERROR: 0xe74c3c,
            AlertLevel.CRITICAL: 0xc0392b
        }
        return color_map.get(level, 0x95a5a6)
        
    def _create_action_buttons_html(self, alert: Alert) -> str:
        """Create HTML action buttons for email"""
        if not alert.actions:
            return ""
            
        html = "<h4>Quick Actions:</h4>"
        for action in alert.actions:
            action_url = f"http://localhost:{self.control_port}/execute/{alert.alert_id}/{action['action']}"
            html += f'''
            <a href="{action_url}" style="display: inline-block; margin: 5px; padding: 10px 20px; 
               background-color: #3498db; color: white; text-decoration: none; border-radius: 5px;">
               {action['label']}
            </a>
            '''
            
        return html
        
    async def start_control_server(self):
        """Start web server for remote control actions"""
        from aiohttp import web
        
        async def handle_alert(request):
            alert_id = request.match_info['alert_id']
            if alert_id in self.active_alerts:
                alert = self.active_alerts[alert_id]
                return web.json_response({
                    'alert': {
                        'id': alert.alert_id,
                        'title': alert.title,
                        'message': alert.message,
                        'level': alert.level.value,
                        'timestamp': alert.timestamp.isoformat(),
                        'metrics': alert.metrics,
                        'actions': alert.actions
                    }
                })
            return web.json_response({'error': 'Alert not found'}, status=404)
            
        async def handle_action(request):
            alert_id = request.match_info['alert_id']
            action = request.match_info['action']
            
            if alert_id in self.active_alerts:
                # Execute callback if registered
                callback_key = f"{alert_id}:{action}"
                if callback_key in self.alert_callbacks:
                    result = await self.alert_callbacks[callback_key]()
                    return web.json_response({'status': 'success', 'result': result})
                    
                return web.json_response({'error': 'Action not found'}, status=404)
                
            return web.json_response({'error': 'Alert not found'}, status=404)
            
        app = web.Application()
        app.router.add_get('/alert/{alert_id}', handle_alert)
        app.router.add_post('/execute/{alert_id}/{action}', handle_action)
        
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, 'localhost', self.control_port)
        await site.start()
        
        logger.info(f"Control server started on port {self.control_port}")
        self.control_server = runner
        
    def register_action_callback(self, alert_id: str, action: str, callback: Callable):
        """Register callback for remote action"""
        self.alert_callbacks[f"{alert_id}:{action}"] = callback
        
    async def update_performance_baseline(self, metrics: Dict[str, float]):
        """Update performance baseline for anomaly detection"""
        self.performance_history.append({
            **metrics,
            'timestamp': datetime.now()
        })
        
        # Keep only recent history (last 7 days)
        cutoff = datetime.now() - timedelta(days=7)
        self.performance_history = [
            h for h in self.performance_history 
            if h['timestamp'] > cutoff
        ]