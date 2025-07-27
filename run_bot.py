"""
Trading Bot Runner - Easy command-line interface

Simplified interface for running different components of the trading system.
"""

import asyncio
import argparse
import sys
import os
import logging
from pathlib import Path
from typing import Optional

# Add project directory to path
sys.path.insert(0, str(Path(__file__).parent))

from safe_trading_system import SafeTradingSystem
from trading_mode import TradingMode
from notification_system import NotificationConfig

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TradingBotRunner:
    """Main interface for running the trading bot"""
    
    def __init__(self):
        self.load_environment()
        
    def load_environment(self):
        """Load environment variables"""
        try:
            from dotenv import load_dotenv
            load_dotenv()
            logger.info("Environment variables loaded")
        except ImportError:
            logger.warning("python-dotenv not installed, skipping .env file")
            
    def check_configuration(self) -> bool:
        """Check if minimum configuration is present"""
        required_for_live = ['KRAKEN_API_KEY', 'KRAKEN_API_SECRET']
        
        missing = [key for key in required_for_live if not os.getenv(key)]
        
        if missing:
            logger.warning(f"Missing API keys: {missing}")
            logger.warning("Live trading will not be available")
            logger.info("You can still use backtesting and paper trading")
            return False
            
        return True
        
    def create_notification_config(self) -> Optional[NotificationConfig]:
        """Create notification configuration from environment"""
        # Check if any notification channels are configured
        has_notifications = any([
            os.getenv('PUSHOVER_USER_KEY'),
            os.getenv('TWILIO_ACCOUNT_SID'), 
            os.getenv('DISCORD_WEBHOOK_URL'),
            os.getenv('EMAIL_FROM')
        ])
        
        if not has_notifications:
            logger.info("No notification channels configured")
            return None
            
        return NotificationConfig(
            # iOS Push
            pushover_user_key=os.getenv('PUSHOVER_USER_KEY'),
            pushover_api_token=os.getenv('PUSHOVER_API_TOKEN'),
            
            # SMS
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
        
    async def run_backtesting_ui(self):
        """Start the backtesting web interface"""
        logger.info("🚀 Starting backtesting UI...")
        logger.info("Open http://localhost:8050 in your browser")
        
        try:
            from backtest_ui import app
            app.run_server(debug=False, port=8050, host='127.0.0.1')
        except KeyboardInterrupt:
            logger.info("Backtesting UI stopped")
        except Exception as e:
            logger.error(f"Failed to start backtesting UI: {e}")
            
    async def run_data_download(self, pairs: list = None, days: int = 30):
        """Download historical data"""
        logger.info(f"📥 Downloading {days} days of historical data...")
        
        try:
            from download_historical_data import download_data
            
            if not pairs:
                pairs = ['XBTUSD', 'ETHUSD']
                
            await download_data(
                pairs=pairs,
                timeframes=['5m', '1h'],
                days_back=days,
                force_refresh=False
            )
            
            logger.info("✅ Data download completed")
            
        except Exception as e:
            logger.error(f"Data download failed: {e}")
            
    async def run_paper_trading(self, strategy: str = 'momentum'):
        """Run paper trading with real market data"""
        logger.info("📊 Starting paper trading...")
        
        notification_config = self.create_notification_config()
        
        system = SafeTradingSystem(
            api_key=os.getenv('KRAKEN_API_KEY', 'demo'),
            api_secret=os.getenv('KRAKEN_API_SECRET', 'demo'),
            mode=TradingMode.PAPER,
            notification_config=notification_config
        )
        
        try:
            await system.initialize()
            
            logger.info("🎯 Paper trading started - no real money at risk")
            logger.info("Press Ctrl+C to stop")
            
            # Run for specified duration or until interrupted
            await asyncio.sleep(3600)  # Run for 1 hour by default
            
        except KeyboardInterrupt:
            logger.info("Paper trading stopped by user")
        except Exception as e:
            logger.error(f"Paper trading error: {e}")
        finally:
            await system.shutdown()
            
    async def run_live_trading(self, mode: str = 'staging'):
        """Run live trading (staging or production)"""
        if not self.check_configuration():
            logger.error("Cannot start live trading without API configuration")
            return
            
        # Confirm with user
        if mode == 'production':
            confirm = input("⚠️  Start PRODUCTION trading with real money? (type 'YES'): ")
            if confirm != 'YES':
                logger.info("Production trading cancelled")
                return
        else:
            logger.info("🧪 Starting STAGING mode with limited risk")
            
        trading_mode = TradingMode.PRODUCTION if mode == 'production' else TradingMode.STAGING
        notification_config = self.create_notification_config()
        
        system = SafeTradingSystem(
            api_key=os.getenv('KRAKEN_API_KEY'),
            api_secret=os.getenv('KRAKEN_API_SECRET'),
            mode=trading_mode,
            notification_config=notification_config
        )
        
        try:
            await system.initialize()
            
            logger.info(f"💰 Live trading started in {mode} mode")
            logger.info("🚨 Real money trading active!")
            logger.info("Press Ctrl+C for graceful shutdown")
            
            # Run until interrupted
            while True:
                await asyncio.sleep(60)  # Check every minute
                
        except KeyboardInterrupt:
            logger.info("Live trading stopped by user")
        except Exception as e:
            logger.error(f"Live trading error: {e}")
        finally:
            logger.info("Shutting down trading system...")
            await system.shutdown()
            
    async def test_notifications(self):
        """Test notification system"""
        logger.info("🔔 Testing notifications...")
        
        try:
            from test_notifications import test_notifications
            await test_notifications()
        except Exception as e:
            logger.error(f"Notification test failed: {e}")
            
    async def run_command(self, command: str, **kwargs):
        """Run a specific command"""
        commands = {
            'backtest': self.run_backtesting_ui,
            'download': lambda: self.run_data_download(**kwargs),
            'paper': lambda: self.run_paper_trading(**kwargs),
            'staging': lambda: self.run_live_trading(mode='staging'),
            'production': lambda: self.run_live_trading(mode='production'),
            'test-notifications': self.test_notifications
        }
        
        if command in commands:
            await commands[command]()
        else:
            logger.error(f"Unknown command: {command}")
            self.print_help()
            
    def print_help(self):
        """Print help information"""
        print("""
🤖 Trading Bot Runner

Available commands:

📊 BACKTESTING & ANALYSIS:
  backtest          Start backtesting web UI (http://localhost:8050)
  download          Download historical data

📈 TRADING MODES:
  paper             Start paper trading (no real money)
  staging           Start live trading with limits ($100 max orders)
  production        Start full live trading (requires confirmation)

🔧 UTILITIES:
  test-notifications Test notification channels

EXAMPLES:
  python run_bot.py backtest
  python run_bot.py download --pairs XBTUSD ETHUSD --days 90
  python run_bot.py paper --strategy momentum
  python run_bot.py staging
  python run_bot.py test-notifications

SAFETY NOTES:
- Always start with 'paper' mode to test strategies
- Use 'staging' mode with small amounts before production
- Configure notifications for monitoring
- Keep your API keys secure
        """)


async def main():
    parser = argparse.ArgumentParser(description='Trading Bot Runner')
    parser.add_argument('command', help='Command to run', nargs='?', default='help')
    parser.add_argument('--pairs', nargs='+', default=['XBTUSD', 'ETHUSD'], 
                       help='Trading pairs for data download')
    parser.add_argument('--days', type=int, default=30, help='Days of data to download')
    parser.add_argument('--strategy', default='momentum', help='Strategy to use')
    
    args = parser.parse_args()
    
    runner = TradingBotRunner()
    
    if args.command == 'help' or not args.command:
        runner.print_help()
        return
        
    try:
        await runner.run_command(
            args.command,
            pairs=args.pairs,
            days=args.days, 
            strategy=args.strategy
        )
    except KeyboardInterrupt:
        logger.info("👋 Goodbye!")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        

if __name__ == "__main__":
    asyncio.run(main())