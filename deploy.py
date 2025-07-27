"""
Deployment Automation Script

Handles setup, installation, and deployment of the trading bot.
"""

import subprocess
import sys
import os
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
import argparse

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class TradingBotDeployer:
    """Automate deployment of the trading bot"""
    
    def __init__(self, project_dir: str = None):
        self.project_dir = Path(project_dir) if project_dir else Path.cwd()
        self.venv_dir = self.project_dir / "venv"
        self.config_file = self.project_dir / ".env"
        
    def run_command(self, command: str, cwd: str = None) -> bool:
        """Run shell command and return success status"""
        try:
            result = subprocess.run(
                command.split(),
                cwd=cwd or self.project_dir,
                capture_output=True,
                text=True,
                check=True
            )
            logger.info(f"✅ {command}")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ {command}")
            logger.error(f"Error: {e.stderr}")
            return False
            
    def check_python_version(self) -> bool:
        """Check if Python version is compatible"""
        version = sys.version_info
        if version.major == 3 and version.minor >= 8:
            logger.info(f"✅ Python {version.major}.{version.minor}.{version.micro} is compatible")
            return True
        else:
            logger.error(f"❌ Python {version.major}.{version.minor} is not compatible. Need Python 3.8+")
            return False
            
    def create_virtual_environment(self) -> bool:
        """Create Python virtual environment"""
        if self.venv_dir.exists():
            logger.info("Virtual environment already exists")
            return True
            
        logger.info("Creating virtual environment...")
        return self.run_command(f"python -m venv {self.venv_dir}")
        
    def activate_virtual_environment(self) -> str:
        """Get activation command for virtual environment"""
        if sys.platform == "win32":
            return str(self.venv_dir / "Scripts" / "activate")
        else:
            return f"source {self.venv_dir}/bin/activate"
            
    def install_dependencies(self) -> bool:
        """Install Python dependencies"""
        logger.info("Installing dependencies...")
        
        # Determine pip path
        if sys.platform == "win32":
            pip_path = self.venv_dir / "Scripts" / "pip"
        else:
            pip_path = self.venv_dir / "bin" / "pip"
            
        # Upgrade pip first
        if not self.run_command(f"{pip_path} install --upgrade pip"):
            return False
            
        # Install requirements
        requirements_file = self.project_dir / "requirements.txt"
        if requirements_file.exists():
            return self.run_command(f"{pip_path} install -r {requirements_file}")
        else:
            logger.error("requirements.txt not found")
            return False
            
    def create_env_template(self) -> bool:
        """Create .env template file"""
        env_template = '''# Trading Bot Configuration
# Copy this to .env and fill in your actual values

# Kraken API (Required for live trading)
KRAKEN_API_KEY=your-kraken-api-key
KRAKEN_API_SECRET=your-kraken-api-secret

# Data Sources (Optional but recommended)
CRYPTOCOMPARE_API_KEY=your-cryptocompare-api-key

# Notifications (Optional)
# iOS Push Notifications (Pushover)
PUSHOVER_USER_KEY=your-pushover-user-key
PUSHOVER_API_TOKEN=your-pushover-api-token

# SMS Notifications (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=+1234567890
SMS_TO_NUMBER=+0987654321

# Discord Notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Telegram Notifications
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id

# Email Notifications
EMAIL_FROM=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_TO=your-email@gmail.com

# Security
PRODUCTION_UNLOCK_KEY=create-a-strong-password
KILL_SWITCH_RESET_KEY=create-an-admin-password
'''
        
        env_file = self.project_dir / ".env.template"
        try:
            with open(env_file, 'w') as f:
                f.write(env_template)
            logger.info(f"✅ Created {env_file}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to create .env template: {e}")
            return False
            
    def setup_directories(self) -> bool:
        """Create necessary directories"""
        directories = [
            "data_cache",
            "logs", 
            "backups",
            "strategies"
        ]
        
        for dir_name in directories:
            dir_path = self.project_dir / dir_name
            try:
                dir_path.mkdir(exist_ok=True)
                logger.info(f"✅ Created directory: {dir_name}")
            except Exception as e:
                logger.error(f"❌ Failed to create {dir_name}: {e}")
                return False
                
        return True
        
    def check_api_configuration(self) -> Dict[str, bool]:
        """Check if API keys are configured"""
        from dotenv import load_dotenv
        load_dotenv()
        
        checks = {
            'kraken_api': bool(os.getenv('KRAKEN_API_KEY') and os.getenv('KRAKEN_API_SECRET')),
            'cryptocompare': bool(os.getenv('CRYPTOCOMPARE_API_KEY')),
            'notifications': bool(
                os.getenv('PUSHOVER_USER_KEY') or 
                os.getenv('TWILIO_ACCOUNT_SID') or 
                os.getenv('DISCORD_WEBHOOK_URL') or 
                os.getenv('EMAIL_FROM')
            ),
            'security': bool(os.getenv('PRODUCTION_UNLOCK_KEY'))
        }
        
        return checks
        
    def test_installation(self) -> bool:
        """Test if installation is working"""
        logger.info("Testing installation...")
        
        try:
            # Test imports
            sys.path.insert(0, str(self.project_dir))
            
            # Test core modules
            import pandas as pd
            import numpy as np
            logger.info("✅ Core dependencies imported successfully")
            
            # Test trading modules
            from backtesting_engine import BacktestingEngine
            from historical_data_manager import HistoricalDataManager
            logger.info("✅ Trading modules imported successfully")
            
            # Test strategies
            from strategies.momentum_strategy import MomentumStrategy
            from strategies.mean_reversion_strategy import MeanReversionStrategy
            logger.info("✅ Trading strategies imported successfully")
            
            return True
            
        except ImportError as e:
            logger.error(f"❌ Import error: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Test error: {e}")
            return False
            
    def download_sample_data(self) -> bool:
        """Download sample historical data"""
        logger.info("Downloading sample data...")
        
        try:
            # Import after ensuring path is set
            sys.path.insert(0, str(self.project_dir))
            
            import asyncio
            from download_historical_data import download_data
            
            # Download 30 days of BTC data
            asyncio.run(download_data(
                pairs=['XBTUSD'],
                timeframes=['5m', '1h'],
                days_back=30,
                force_refresh=False
            ))
            
            logger.info("✅ Sample data downloaded")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to download sample data: {e}")
            logger.info("You can download data later using: python download_historical_data.py")
            return False
            
    def create_startup_scripts(self) -> bool:
        """Create startup scripts for different platforms"""
        
        # Windows batch file
        windows_script = '''@echo off
echo Starting Trading Bot...
cd /d "%~dp0"
call venv\\Scripts\\activate
python safe_trading_system.py
pause
'''
        
        # Unix shell script
        unix_script = '''#!/bin/bash
echo "Starting Trading Bot..."
cd "$(dirname "$0")"
source venv/bin/activate
python safe_trading_system.py
'''
        
        # Backtesting UI script
        ui_script_win = '''@echo off
echo Starting Backtesting UI...
cd /d "%~dp0"
call venv\\Scripts\\activate
python backtest_ui.py
echo Open http://localhost:8050 in your browser
pause
'''
        
        ui_script_unix = '''#!/bin/bash
echo "Starting Backtesting UI..."
cd "$(dirname "$0")"
source venv/bin/activate
python backtest_ui.py &
echo "Open http://localhost:8050 in your browser"
echo "Press Ctrl+C to stop"
wait
'''
        
        scripts = [
            ("start_trading.bat", windows_script),
            ("start_trading.sh", unix_script),
            ("start_backtesting.bat", ui_script_win),
            ("start_backtesting.sh", ui_script_unix)
        ]
        
        for filename, content in scripts:
            try:
                with open(self.project_dir / filename, 'w') as f:
                    f.write(content)
                
                # Make Unix scripts executable
                if filename.endswith('.sh'):
                    os.chmod(self.project_dir / filename, 0o755)
                    
                logger.info(f"✅ Created {filename}")
                
            except Exception as e:
                logger.error(f"❌ Failed to create {filename}: {e}")
                
        return True
        
    def full_deployment(self) -> bool:
        """Run full deployment process"""
        logger.info("🚀 Starting full deployment...")
        
        steps = [
            ("Checking Python version", self.check_python_version),
            ("Creating virtual environment", self.create_virtual_environment),
            ("Installing dependencies", self.install_dependencies),
            ("Setting up directories", self.setup_directories),
            ("Creating .env template", self.create_env_template),
            ("Testing installation", self.test_installation),
            ("Creating startup scripts", self.create_startup_scripts),
        ]
        
        failed_steps = []
        
        for step_name, step_func in steps:
            logger.info(f"\n🔧 {step_name}...")
            if not step_func():
                failed_steps.append(step_name)
                logger.error(f"❌ {step_name} failed")
            else:
                logger.info(f"✅ {step_name} completed")
                
        # Optional step - download sample data
        logger.info(f"\n🔧 Downloading sample data (optional)...")
        self.download_sample_data()
        
        # Summary
        logger.info("\n" + "="*60)
        logger.info("DEPLOYMENT SUMMARY")
        logger.info("="*60)
        
        if not failed_steps:
            logger.info("🎉 Deployment completed successfully!")
            self.print_next_steps()
        else:
            logger.error(f"❌ Deployment failed. Failed steps: {', '.join(failed_steps)}")
            return False
            
        return True
        
    def print_next_steps(self):
        """Print next steps for user"""
        checks = self.check_api_configuration()
        
        logger.info("\n📋 NEXT STEPS:")
        logger.info("1. Configure your API keys:")
        logger.info("   - Copy .env.template to .env")
        logger.info("   - Add your Kraken API credentials")
        logger.info("   - Optionally add notification settings")
        
        if not checks['kraken_api']:
            logger.info("\n⚠️  IMPORTANT: You need Kraken API keys to trade live!")
            logger.info("   - Go to https://pro.kraken.com")
            logger.info("   - Create API key with trading permissions")
            logger.info("   - Add to .env file")
            
        logger.info("\n2. Test the system:")
        if sys.platform == "win32":
            logger.info("   - Run: start_backtesting.bat")
        else:
            logger.info("   - Run: ./start_backtesting.sh")
        logger.info("   - Open http://localhost:8050")
        logger.info("   - Try backtesting with simulated data")
        
        logger.info("\n3. Download real data:")
        logger.info("   - Run: python download_historical_data.py")
        logger.info("   - Test backtesting with real historical data")
        
        logger.info("\n4. Start live trading:")
        logger.info("   - Begin with paper trading mode")
        logger.info("   - Graduate to staging with small amounts")
        logger.info("   - Scale to production trading")
        
        logger.info("\n📚 Documentation:")
        logger.info("   - Read GETTING_STARTED.md for detailed guide")
        logger.info("   - Check REAL_DATA_GUIDE.md for data setup") 
        logger.info("   - Review NOTIFICATION_SETUP.md for alerts")


def main():
    parser = argparse.ArgumentParser(description='Deploy trading bot')
    parser.add_argument('--project-dir', help='Project directory (default: current)')
    parser.add_argument('--test-only', action='store_true', help='Only test installation')
    parser.add_argument('--data-only', action='store_true', help='Only download data')
    
    args = parser.parse_args()
    
    deployer = TradingBotDeployer(args.project_dir)
    
    if args.test_only:
        success = deployer.test_installation()
        sys.exit(0 if success else 1)
    elif args.data_only:
        success = deployer.download_sample_data()
        sys.exit(0 if success else 1)
    else:
        success = deployer.full_deployment()
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()