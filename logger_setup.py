# logger_setup.py
import logging
import sys
import os
import traceback
from pathlib import Path
from datetime import datetime
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler

def get_log_color(level):
    """
    Return ANSI color codes for different log levels to enhance console readability.
    
    :param level: Logging level
    :return: ANSI color code
    """
    colors = {
        logging.DEBUG: '\033[94m',     # Blue
        logging.INFO: '\033[92m',      # Green
        logging.WARNING: '\033[93m',   # Yellow
        logging.ERROR: '\033[91m',     # Red
        logging.CRITICAL: '\033[1;31m' # Bold Red
    }
    return colors.get(level, '\033[0m')

class ColoredFormatter(logging.Formatter):
    """
    Custom log formatter that adds color to console output.
    """
    def format(self, record):
        message = super().format(record)
        # Add color if running in a TTY-like console
        if sys.stderr.isatty():
            color = get_log_color(record.levelno)
            reset = '\033[0m'
            return f"{color}{message}{reset}"
        return message

def setup_logging(
    debug: bool = False,
    log_dir: str = "logs",
    max_logs: int = 10,
    max_bytes: int = 10_000_000,  # 10MB
    log_to_console: bool = False, # <--- default = False to disable console
    log_to_file: bool = True
) -> logging.Logger:
    """
    Setup a comprehensive logging system with multiple configuration options.
    
    :param debug: Enable debug logging if True
    :param log_dir: Directory where log files will be saved
    :param max_logs: Maximum number of rotated log files to keep
    :param max_bytes: Maximum size (in bytes) of a single log file before rotation
    :param log_to_console: Whether to log to console (False means no console logs)
    :param log_to_file: Whether to log to file
    :return: A fully configured logger instance named 'johnstreet'
    """
    # 1) Ensure log directory exists
    log_directory = Path(log_dir)
    log_directory.mkdir(parents=True, exist_ok=True)
    
    # 2) Create a timestamped logfile path with more detailed naming
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    log_file = log_directory / f"johnstreet_{timestamp}.log"
    
    # 3) Define detailed log formats
    detailed_format = (
        "%(asctime)s — "
        "%(levelname)8s — "
        "%(name)s — "
        "[%(filename)s:%(lineno)d] — "
        "%(message)s"
    )
    
    # 4) Create (or get) our named logger
    logger = logging.getLogger("johnstreet")
    logger.handlers.clear()  # Clear any existing handlers on "johnstreet"
    
    # 5) Decide logger level
    logger.setLevel(logging.DEBUG if debug else logging.INFO)
    
    # 6) Prepare handlers
    handlers = []
    
    # If file logging is enabled, configure a file handler
    if log_to_file:
        try:
            # Timed rotating file handler (rotates at midnight)
            file_handler = TimedRotatingFileHandler(
                filename=str(log_file),
                when='midnight',
                interval=1,
                backupCount=max_logs,
                encoding='utf-8'
            )
            file_handler.setFormatter(logging.Formatter(detailed_format))
            file_handler.setLevel(logger.level)
            handlers.append(file_handler)
        except Exception as e:
            print(f"Error setting up file logging: {e}")
            traceback.print_exc()
    
    # If console logging is enabled, configure a console (stream) handler
    # Set log_to_console=False to hide logs from terminal
    if log_to_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(ColoredFormatter(detailed_format))
        console_handler.setLevel(logger.level)
        handlers.append(console_handler)
    
    # 7) Attach handlers to "johnstreet" logger
    for handler in handlers:
        logger.addHandler(handler)
    
    # Also attach these handlers to the root logger so that logs from
    # external libraries (e.g. websockets, urllib3) go to the same place.
    root_logger = logging.getLogger()
    root_logger.setLevel(logger.level)
    # Clear any default handlers that might conflict
    root_logger.handlers.clear()
    for handler in handlers:
        root_logger.addHandler(handler)
    
    # 8) Prevent double-logging by turning off propagation from "johnstreet"
    logger.propagate = False
    
    # 9) Add an exception hook for uncaught exceptions
    def handle_exception(exc_type, exc_value, exc_traceback):
        if issubclass(exc_type, KeyboardInterrupt):
            sys.__excepthook__(exc_type, exc_value, exc_traceback)
            return
        logger.critical("Uncaught exception", exc_info=(exc_type, exc_value, exc_traceback))
    
    sys.excepthook = handle_exception
    
    return logger

def configure_third_party_loggers():
    """
    Configure logging for third-party libraries to reduce noise or adjust levels.
    """
    # Example: reduce verbosity of some known noisy libraries
    noisy_loggers = [
        'urllib3', 
        'websockets', 
        'asyncio', 
        'aiohttp', 
        'boto3', 
        'botocore'
    ]
    
    for logger_name in noisy_loggers:
        logging.getLogger(logger_name).setLevel(logging.WARNING)
