import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict

from dotenv import load_dotenv

@dataclass
class AppConfig:
    """Application configuration settings"""
    
    # API Configuration
    API_KEY: str
    API_SECRET: str
    WSS_URI: str = "wss://ws.kraken.com"
    

    

    # Trading Configuration
    DEFAULT_PAIR: str = "XBT/USD"
    MAX_POSITION_SIZE: float = 1.0
    MAX_LEVERAGE: int = 3
    MAX_DAILY_LOSS: float = 0.02
    ACCOUNT_SIZE: float = 100000
    RISK_PER_TRADE: float = 0.01
    RISK_FREE_RATE: float = 0.02
    REBALANCE_THRESHOLD: float = 0.05

    # *** Here's the new line adding a default value for TARGET_ALLOCATIONS ***
    TARGET_ALLOCATIONS: Dict[str, float] = field(default_factory=dict)

    # System Configuration
    UPDATE_INTERVAL: float = 2.0
    MAX_RETRIES: int = 3
    RETRY_DELAY: int = 5
    
    # Path Configuration
    BASE_DIR: Path = Path(__file__).parent.parent
    DB_PATH: str = str(BASE_DIR / "data/algo_trading.db")
    LOG_PATH: str = str(BASE_DIR / "logs/algo_trading.log")
    CONFIG_PATH: str = str(BASE_DIR / "config")
    
    def get(self, key: str, default=None):
        """Get configuration value with a default fallback"""
        return getattr(self, key, default)
    
    @classmethod
    def from_env(cls) -> 'AppConfig':
        """Create configuration from environment variables"""
        # Load .env file if it exists
        env_path = Path(__file__).parent.parent / '.env'
        if env_path.exists():
            load_dotenv(env_path)
        
        # Required settings
        api_key = os.getenv('KRAKEN_API_KEY', '')
        api_secret = os.getenv('KRAKEN_API_SECRET', '')
        
        # Create instance with required settings
        config = cls(
            API_KEY=api_key,
            API_SECRET=api_secret
        )
        
        # Optional settings
        config.WSS_URI = os.getenv('KRAKEN_WSS_URI', config.WSS_URI)
        config.DEFAULT_PAIR = os.getenv('DEFAULT_PAIR', config.DEFAULT_PAIR)
        
        # Trading settings
        config.MAX_POSITION_SIZE = float(os.getenv('MAX_POSITION_SIZE', str(config.MAX_POSITION_SIZE)))
        config.MAX_LEVERAGE = int(os.getenv('MAX_LEVERAGE', str(config.MAX_LEVERAGE)))
        config.MAX_DAILY_LOSS = float(os.getenv('MAX_DAILY_LOSS', str(config.MAX_DAILY_LOSS)))
        config.ACCOUNT_SIZE = float(os.getenv('ACCOUNT_SIZE', str(config.ACCOUNT_SIZE)))
        config.RISK_PER_TRADE = float(os.getenv('RISK_PER_TRADE', str(config.RISK_PER_TRADE)))
        config.RISK_FREE_RATE = float(os.getenv('RISK_FREE_RATE', str(config.RISK_FREE_RATE)))
        config.REBALANCE_THRESHOLD = float(os.getenv('REBALANCE_THRESHOLD', str(config.REBALANCE_THRESHOLD)))
        
        # System settings
        config.UPDATE_INTERVAL = float(os.getenv('UPDATE_INTERVAL', str(config.UPDATE_INTERVAL)))
        config.MAX_RETRIES = int(os.getenv('MAX_RETRIES', str(config.MAX_RETRIES)))
        config.RETRY_DELAY = int(os.getenv('RETRY_DELAY', str(config.RETRY_DELAY)))
        
        # Path settings
        config.DB_PATH = os.getenv('DB_PATH', config.DB_PATH)
        config.LOG_PATH = os.getenv('LOG_PATH', config.LOG_PATH)
        
        # Ensure directories exist
        config.ensure_directories()
        
        return config
    
    def ensure_directories(self):
        """Ensure required directories exist"""
        Path(self.DB_PATH).parent.mkdir(parents=True, exist_ok=True)
        Path(self.LOG_PATH).parent.mkdir(parents=True, exist_ok=True)
        Path(self.CONFIG_PATH).mkdir(parents=True, exist_ok=True)
    
    def to_dict(self) -> Dict:
        """Convert configuration to dictionary"""
        return {
            'api_key': self.API_KEY,
            'api_secret': '***',  # Hide secret
            'wss_uri': self.WSS_URI,
            'default_pair': self.DEFAULT_PAIR,
            'max_position_size': self.MAX_POSITION_SIZE,
            'max_leverage': self.MAX_LEVERAGE,
            'max_daily_loss': self.MAX_DAILY_LOSS,
            'account_size': self.ACCOUNT_SIZE,
            'risk_per_trade': self.RISK_PER_TRADE,
            'risk_free_rate': self.RISK_FREE_RATE,
            'rebalance_threshold': self.REBALANCE_THRESHOLD,
            
            # Now, this will always exist (it may be an empty dict if unset):
            'target_allocations': self.TARGET_ALLOCATIONS,
            
            'update_interval': self.UPDATE_INTERVAL,
            'max_retries': self.MAX_RETRIES,
            'retry_delay': self.RETRY_DELAY,
            'db_path': self.DB_PATH,
            'log_path': self.LOG_PATH
        }
    
    def update_api_keys(self, api_key: str, api_secret: str):
        """Update API keys"""
        self.API_KEY = api_key
        self.API_SECRET = api_secret
        
        # Update .env file
        env_path = Path(__file__).parent.parent / '.env'
        env_content = []
        
        # Read existing content
        if env_path.exists():
            with open(env_path, 'r') as f:
                env_content = f.readlines()
        
        # Update or add API keys
        api_key_found = api_secret_found = False
        for i, line in enumerate(env_content):
            if line.startswith('KRAKEN_API_KEY='):
                env_content[i] = f'KRAKEN_API_KEY={api_key}\n'
                api_key_found = True
            elif line.startswith('KRAKEN_API_SECRET='):
                env_content[i] = f'KRAKEN_API_SECRET={api_secret}\n'
                api_secret_found = True
        
        if not api_key_found:
            env_content.append(f'KRAKEN_API_KEY={api_key}\n')
        if not api_secret_found:
            env_content.append(f'KRAKEN_API_SECRET={api_secret}\n')
        
        # Write updated content
        with open(env_path, 'w') as f:
            f.writelines(env_content)
    
    def update_trading_params(self, params: Dict):
        """Update trading parameters"""
        if 'max_position_size' in params:
            self.MAX_POSITION_SIZE = float(params['max_position_size'])
        if 'max_leverage' in params:
            self.MAX_LEVERAGE = int(params['max_leverage'])
        if 'max_daily_loss' in params:
            self.MAX_DAILY_LOSS = float(params['max_daily_loss'])
        if 'account_size' in params:
            self.ACCOUNT_SIZE = float(params['account_size'])
        if 'risk_per_trade' in params:
            self.RISK_PER_TRADE = float(params['risk_per_trade'])
        if 'risk_free_rate' in params:
            self.RISK_FREE_RATE = float(params['risk_free_rate'])
        if 'rebalance_threshold' in params:
            self.REBALANCE_THRESHOLD = float(params['rebalance_threshold'])
        
        # If target_allocations is provided, this overrides the default dict:
        if 'target_allocations' in params:
            self.TARGET_ALLOCATIONS = params['target_allocations']
    
    def get_db_path(self) -> Path:
        """Get the database path as a resolved Path object."""
        db_path = Path(self.DB_PATH).resolve()
        if not db_path.parent.exists():
            db_path.parent.mkdir(parents=True, exist_ok=True)
        return db_path
