import sys
import os
import logging
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Dict, List
from dotenv import load_dotenv

def setup_directories():
    """Create necessary directories if they don't exist."""
    try:
        directories = ["data", "logs", "config", "backups"]
        for directory in directories:
            path = Path(directory)
            path.mkdir(exist_ok=True)
            logging.debug(f"Directory verified/created: {path}")
    except Exception as e:
        logging.error(f"Failed to setup directories: {e}")
        raise

def manage_old_logs(log_dir: Path, max_logs: int = 5) -> None:
    """
    Manage log rotation by removing older log files.
    
    Args:
        log_dir: Directory containing log files
        max_logs: Maximum number of log files to keep
    """
    try:
        log_files = sorted(
            log_dir.glob("algo_trading_*.log"),
            key=lambda x: x.stat().st_mtime,
            reverse=True
        )
        for old_log in log_files[max_logs:]:
            logging.debug(f"Removing old log file: {old_log}")
            old_log.unlink()
    except Exception as e:
        logging.warning(f"Error managing old logs: {e}")

def check_environment() -> None:
    """
    Verify Python version and critical environment variables.
    Loads environment variables from .env file if present.
    """
    # Check Python version first
    if sys.version_info < (3, 7):
        raise RuntimeError("Python 3.7 or higher is required")
    
    # Load environment variables from .env file
    env_path = Path.cwd() / '.env'  # Look in current working directory
    if env_path.exists():
        try:
            load_dotenv(str(env_path))
            logging.info(f"Loaded environment variables from {env_path}")
        except Exception as e:
            logging.error(f"Error loading .env file: {e}")
    else:
        logging.warning(f"No .env file found at {env_path}")

    # Check required variables
    required_vars = ['KRAKEN_API_KEY', 'KRAKEN_API_SECRET']
    missing = [var for var in required_vars if not os.getenv(var)]
    
    if missing:
        raise RuntimeError(
            f"Missing required environment variables: {' or '.join(missing)}"
        )
    
    logging.info("Environment check passed successfully")

def safe_backup_path(base_dir: Path, filename: str) -> Path:
    """
    Sanitize the filename to prevent directory traversal or special chars.
    
    Args:
        base_dir: Base directory for the backup
        filename: Original filename
    
    Returns:
        Path: Safe path for the backup file
    """
    # Sanitize filename to only allow alphanumeric chars and some punctuation
    safe_name = "".join(c for c in filename if c.isalnum() or c in "._-")
    return base_dir / safe_name

def format_timestamp(dt: datetime = None) -> str:
    """
    Format a timestamp for logging and filenames.
    
    Args:
        dt: Datetime to format (defaults to current time)
    
    Returns:
        str: Formatted timestamp
    """
    if dt is None:
        dt = datetime.now()
    return dt.strftime("%Y%m%d_%H%M%S")

def get_log_path(base_dir: Path = None) -> Path:
    """
    Generate a path for a new log file.
    
    Args:
        base_dir: Base directory for logs (defaults to 'logs')
    
    Returns:
        Path: Complete path for the new log file
    """
    if base_dir is None:
        base_dir = Path("logs")
    
    timestamp = format_timestamp()
    return base_dir / f"algo_trading_{timestamp}.log"

async def async_retry(func, max_retries: int = 3, delay: float = 1.0, *args, **kwargs):
    """
    Retry an async function with exponential backoff.
    
    Args:
        func: Async function to retry
        max_retries: Maximum number of retry attempts
        delay: Initial delay between retries (doubles after each attempt)
        *args: Positional arguments for func
        **kwargs: Keyword arguments for func
    
    Returns:
        Any: Result from the function if successful
    
    Raises:
        Exception: Last exception encountered if all retries fail
    """
    last_error = None
    current_delay = delay

    for attempt in range(max_retries):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            last_error = e
            if attempt < max_retries - 1:  # Don't sleep on the last attempt
                logging.warning(f"Attempt {attempt + 1} failed, retrying in {current_delay}s: {e}")
                await asyncio.sleep(current_delay)
                current_delay *= 2  # Exponential backoff
            else:
                logging.error(f"All {max_retries} attempts failed: {e}")
    
    raise last_error

def setup_logging(log_path: Path = None, level: int = logging.INFO) -> None:
    """
    Setup logging configuration.
    
    Args:
        log_path: Path to log file (defaults to auto-generated path)
        level: Logging level
    """
    if log_path is None:
        log_path = get_log_path()

    # Ensure log directory exists
    log_path.parent.mkdir(parents=True, exist_ok=True)

    # Setup logging format
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Configure logging
    logging.basicConfig(
        level=level,
        format=log_format,
        handlers=[
            logging.FileHandler(log_path),
            logging.StreamHandler()
        ]
    )
    
    logging.info("Logger initialized. Starting application...")
