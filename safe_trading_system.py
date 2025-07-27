"""
Safe Trading System - Integration of all safety components

This is the main entry point for safe live trading with all protective measures.
"""

import asyncio
import logging
import signal
import sys
from typing import Dict, Optional, Any
from datetime import datetime

from kraken_api import EnhancedKrakenAPI
from risk_manager import RiskManager
from kill_switch import KillSwitch
from order_validator import OrderValidator
from rate_limiter import RateLimitedAPI, AdaptiveRateLimiter
from production_monitor import ProductionMonitor
from trading_mode import TradingMode, TradingModeManager
from notification_system import NotificationConfig, PerformanceEnvelope
from production_monitor import ProductionMonitor

logger = logging.getLogger(__name__)


class SafeTradingSystem:
    """
    Production-ready trading system with all safety features integrated
    """
    
    def __init__(self, api_key: str, api_secret: str, mode: TradingMode = TradingMode.DRY_RUN, notification_config: Optional[NotificationConfig] = None):
        # Core components
        self.base_api = EnhancedKrakenAPI(api_key, api_secret)
        self.risk_manager = RiskManager(account_size=10000)  # Will update with real balance
        
        # Safety components
        self.kill_switch = KillSwitch(self.base_api, self.risk_manager)
        self.order_validator = OrderValidator(self.base_api, self.risk_manager)
        self.rate_limiter = AdaptiveRateLimiter()
        self.mode_manager = TradingModeManager()
        
        # Production monitoring with notifications
        self.monitor = ProductionMonitor(
            self.base_api, 
            self.kill_switch, 
            self.risk_manager,
            notification_config=notification_config
        )
        
        # Store notification config for alerts
        self.notification_config = notification_config
        
        # Wrap API with rate limiting
        self.api = RateLimitedAPI(self.base_api, self.rate_limiter)
        
        # Set trading mode
        self.mode_manager.current_mode = mode
        
        # Setup notification callbacks for critical actions
        if self.monitor.notification_system:
            self._setup_notification_callbacks()
        
        # State
        self.is_running = False
        self._tasks = []
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.warning(f"Received signal {signum}, initiating graceful shutdown...")
        asyncio.create_task(self.shutdown())
        
    async def initialize(self):
        """Initialize all components"""
        logger.info("Initializing Safe Trading System...")
        
        try:
            # Start rate limiter
            await self.rate_limiter.start()
            
            # Get account balance and update risk manager
            balance = await self.api.get_account_balance()
            total_usd = await self._calculate_total_balance_usd(balance)
            self.risk_manager.update_account_size(total_usd)
            logger.info(f"Account balance: ${total_usd:.2f}")
            
            # Initialize kill switch daily balance
            await self.kill_switch._update_start_balance()
            
            # Start monitoring
            await self.monitor.start()
            
            # Connect WebSocket for real-time data
            await self.base_api.connect_websocket()
            
            self.is_running = True
            logger.info(f"Safe Trading System initialized in {self.mode_manager.current_mode.value} mode")
            
        except Exception as e:
            logger.error(f"Initialization failed: {e}")
            await self.shutdown()
            raise
            
    async def create_order(
        self,
        pair: str,
        side: str,
        order_type: str,
        volume: float,
        price: Optional[float] = None,
        **kwargs
    ) -> Dict:
        """
        Create order with full safety pipeline
        """
        logger.info(f"Order request: {side} {volume} {pair} @ {price or 'market'}")
        
        # 1. Check kill switch
        if not self.kill_switch.can_trade():
            raise Exception(f"Trading halted: {self.kill_switch.trigger_reason}")
            
        # 2. Check trading mode limits
        can_trade, reason = self.mode_manager.can_execute_order(pair, side, volume, price or 0)
        if not can_trade:
            raise Exception(f"Mode restriction: {reason}")
            
        # 3. Validate order
        validation = await self.order_validator.validate_order(
            pair, side, volume, order_type, price
        )
        
        if not validation.is_valid:
            error_msg = "Order validation failed:\n" + "\n".join(validation.errors)
            if validation.warnings:
                error_msg += "\nWarnings:\n" + "\n".join(validation.warnings)
            raise Exception(error_msg)
            
        # Log warnings
        for warning in validation.warnings:
            logger.warning(f"Order warning: {warning}")
            
        # 4. Check risk limits
        order_value = volume * (price or await self._get_market_price(pair))
        if not self.risk_manager.can_open_position(pair, order_value, side):
            raise Exception("Order rejected by risk manager")
            
        # 5. Execute order through mode manager
        try:
            result = await self.mode_manager.execute_order(
                self.api,
                pair=pair,
                side=side,
                order_type=order_type,
                volume=volume,
                price=price,
                **kwargs
            )
            
            # 6. Record successful trade
            self.monitor.record_trade({
                'pair': pair,
                'side': side,
                'volume': volume,
                'price': price or 'market',
                'order_id': result.get('txid', ['unknown'])[0],
                'status': 'submitted'
            })
            
            # Update risk manager
            self.risk_manager.add_position(pair, order_value, side)
            
            logger.info(f"Order successful: {result}")
            return result
            
        except Exception as e:
            # Record failure
            self.kill_switch.record_order_failure()
            self.monitor.record_error('order_failure', str(e), 
                                    pair=pair, side=side, volume=volume)
            raise
            
    async def cancel_order(self, order_id: str) -> Dict:
        """Cancel order with safety checks"""
        if not self.kill_switch.can_trade():
            raise Exception(f"Trading halted: {self.kill_switch.trigger_reason}")
            
        return await self.api.cancel_order(order_id)
        
    async def emergency_stop(self, reason: str = "Manual emergency stop"):
        """Trigger emergency stop"""
        logger.critical(f"EMERGENCY STOP TRIGGERED: {reason}")
        await self.kill_switch.trigger(reason)
        await self.monitor.create_alert('critical', 'system', f'Emergency stop: {reason}')
        
    async def get_system_status(self) -> Dict:
        """Get comprehensive system status"""
        return {
            'mode': self.mode_manager.current_mode.value,
            'kill_switch': {
                'state': self.kill_switch.state.value,
                'can_trade': self.kill_switch.can_trade(),
                'trigger_reason': self.kill_switch.trigger_reason
            },
            'risk_manager': {
                'current_drawdown': self.risk_manager.current_drawdown,
                'daily_loss': self.risk_manager.daily_loss,
                'open_positions': len(self.risk_manager.positions),
                'total_exposure': sum(p['size'] for p in self.risk_manager.positions.values())
            },
            'rate_limiter': self.rate_limiter.get_stats(),
            'monitor': {
                'uptime': (datetime.now() - self.monitor.start_time).total_seconds(),
                'active_alerts': len(self.monitor.active_alerts),
                'performance': self.monitor.performance
            },
            'paper_trading': self.mode_manager.get_paper_trading_summary()
            if self.mode_manager.current_mode in [TradingMode.DRY_RUN, TradingMode.PAPER]
            else None
        }
        
    async def run_strategy(self, strategy_class, **strategy_params):
        """Run a trading strategy with safety wrapper"""
        if not self.is_running:
            raise Exception("System not initialized")
            
        logger.info(f"Starting strategy: {strategy_class.__name__}")
        
        # Create strategy instance with safe API
        strategy = strategy_class(
            api=self,  # Pass safe system as API
            **strategy_params
        )
        
        # Run strategy loop
        while self.is_running and self.kill_switch.can_trade():
            try:
                # Check kill switch conditions
                if await self.kill_switch.check_conditions():
                    logger.error("Kill switch triggered during strategy execution")
                    break
                    
                # Execute strategy
                await strategy.execute()
                
                # Respect rate limits
                delay = self.rate_limiter.get_recommended_delay()
                await asyncio.sleep(delay)
                
            except Exception as e:
                logger.error(f"Strategy error: {e}")
                self.monitor.record_error('strategy_error', str(e))
                
                # Check if we should continue
                if 'rate limit' in str(e).lower():
                    await asyncio.sleep(60)  # Wait 1 minute on rate limit
                else:
                    await asyncio.sleep(5)   # Brief pause on other errors
                    
    async def _calculate_total_balance_usd(self, balance: Dict) -> float:
        """Calculate total account balance in USD"""
        total = float(balance.get('ZUSD', 0))
        
        # Add major cryptocurrencies
        if 'XXBT' in balance and float(balance['XXBT']) > 0:
            try:
                ticker = await self.api.get_ticker('XBTUSD')
                btc_price = float(ticker['XBTUSD']['c'][0])
                total += float(balance['XXBT']) * btc_price
            except Exception as e:
                logger.error(f"Failed to get BTC price: {e}")
                
        return total
        
    async def _get_market_price(self, pair: str) -> float:
        """Get current market price"""
        ticker = await self.api.get_ticker(pair)
        return float(ticker[pair]['c'][0])
        
    async def shutdown(self):
        """Graceful shutdown"""
        logger.info("Shutting down Safe Trading System...")
        self.is_running = False
        
        # Cancel all orders if in production
        if self.mode_manager.current_mode in [TradingMode.STAGING, TradingMode.PRODUCTION]:
            try:
                await self.kill_switch.emergency_close_all_positions()
            except Exception as e:
                logger.error(f"Error during emergency close: {e}")
                
        # Stop components
        await self.monitor.stop()
        await self.rate_limiter.stop()
        
        # Disconnect WebSocket
        if hasattr(self.base_api, 'ws_handler') and self.base_api.ws_handler:
            await self.base_api.ws_handler.close()
            
        # Export paper trades if applicable
        if self.mode_manager.current_mode in [TradingMode.DRY_RUN, TradingMode.PAPER]:
            self.mode_manager.export_paper_trades()
            
        logger.info("Shutdown complete")
        
    def _setup_notification_callbacks(self):
        """Setup callbacks for notification system remote actions"""
        if not self.monitor.notification_system:
            return
            
        # These would be called when user clicks action buttons in notifications
        async def emergency_stop_callback():
            await self.emergency_stop("Remote emergency stop via notification")
            return "Emergency stop activated"
            
        async def pause_trading_callback():
            self.kill_switch.pause_trading("Remote pause via notification")
            return "Trading paused"
            
        async def close_positions_callback():
            await self.kill_switch.emergency_close_all_positions()
            return "All positions closed"
            
        # Register common callbacks (will be used by alert system)
        self.emergency_stop_callback = emergency_stop_callback
        self.pause_trading_callback = pause_trading_callback
        self.close_positions_callback = close_positions_callback
        
    async def _test_notification_system(self):
        """Test notification system with sample alert"""
        if not self.monitor.notification_system:
            return
            
        from notification_system import Alert, AlertLevel
        
        test_alert = Alert(
            alert_id="system-test-001",
            level=AlertLevel.INFO,
            title="Trading System Started",
            message=f"Safe trading system initialized in {self.mode_manager.current_mode.value} mode",
            strategy_name="System Test",
            metrics={
                "mode": self.mode_manager.current_mode.value,
                "initial_capital": self.risk_manager.account_size,
                "safety_features": "enabled"
            }
        )
        
        await self.monitor.notification_system.send_alert(test_alert)
        logger.info("Test notification sent")


async def main():
    """Example usage"""
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Setup notifications (optional)
    notification_config = None
    if any([os.getenv('PUSHOVER_USER_KEY'), os.getenv('TWILIO_ACCOUNT_SID'), 
            os.getenv('DISCORD_WEBHOOK_URL'), os.getenv('EMAIL_FROM')]):
        
        notification_config = NotificationConfig(
            # iOS Push (Pushover)
            pushover_user_key=os.getenv('PUSHOVER_USER_KEY'),
            pushover_api_token=os.getenv('PUSHOVER_API_TOKEN'),
            
            # SMS (Twilio)
            twilio_account_sid=os.getenv('TWILIO_ACCOUNT_SID'),
            twilio_auth_token=os.getenv('TWILIO_AUTH_TOKEN'),
            twilio_from_number=os.getenv('TWILIO_FROM_NUMBER'),
            sms_to_number=os.getenv('SMS_TO_NUMBER'),
            
            # Discord
            discord_webhook_url=os.getenv('DISCORD_WEBHOOK_URL'),
            
            # Telegram
            telegram_bot_token=os.getenv('TELEGRAM_BOT_TOKEN'),
            telegram_chat_id=os.getenv('TELEGRAM_CHAT_ID'),
            
            # Email
            email_from=os.getenv('EMAIL_FROM'),
            email_password=os.getenv('EMAIL_PASSWORD'),
            email_to=os.getenv('EMAIL_TO')
        )
        logger.info("Notification system configured")
    else:
        logger.info("No notification channels configured")
    
    # Create system in dry-run mode
    system = SafeTradingSystem(
        api_key=os.getenv('KRAKEN_API_KEY'),
        api_secret=os.getenv('KRAKEN_API_SECRET'),
        mode=TradingMode.DRY_RUN,
        notification_config=notification_config
    )
    
    try:
        # Initialize
        await system.initialize()
        
        # Show status
        status = await system.get_system_status()
        logger.info(f"System status: {status}")
        
        # Test notifications if configured
        if system.notification_config:
            logger.info("Testing notification system...")
            await system._test_notification_system()
        
        # Example: Create a test order (will be paper traded)
        result = await system.create_order(
            pair='XBTUSD',
            side='buy',
            order_type='limit',
            volume=0.001,
            price=45000
        )
        
        logger.info(f"Order result: {result}")
        
        # Keep running
        await asyncio.sleep(3600)  # Run for 1 hour
        
    finally:
        await system.shutdown()


if __name__ == "__main__":
    asyncio.run(main())