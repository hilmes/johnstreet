#!/usr/bin/env python3
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent / "src"))

import cProfile
import pstats
import io
import logging
import asyncio
import os
import traceback
from typing import Dict
from datetime import datetime

# Optional: psutil for CPU/Memory usage
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

# Updated imports to use src structure
from cli import parse_args
from helpers import setup_directories, manage_old_logs, check_environment
from config import AppConfig
from src.api.enhanced_kraken import EnhancedKrakenAPI
from src.data.db_manager import DBManager
from src.core.portfolio import PortfolioManager
from websocket_handler import EnhancedWebSocketHandler
from application import EnhancedAlgoTradingTUI
from logger_setup import setup_logging


def log_detailed_resource_usage(label: str = "Resource Usage", logger=None) -> Dict:
    """
    Log comprehensive CPU & Memory usage with advanced details if psutil is installed.
    Returns a dictionary of resource usage metrics.
    """
    if not PSUTIL_AVAILABLE:
        if logger:
            logger.warning("psutil not available - detailed resource usage disabled")
        return {}

    try:
        process = psutil.Process(os.getpid())
        mem_info = process.memory_info()
        mem_percent = process.memory_percent()
        cpu_percent = process.cpu_percent(interval=0.1)
        cpu_times = process.cpu_times()
        num_threads = process.num_threads()
        open_files = len(process.open_files())

        # Enhanced Memory Details
        try:
            memory_maps = process.memory_maps()
            total_mapped_size = sum(m.rss for m in memory_maps)
        except Exception:
            total_mapped_size = 0

        # Network Connections
        try:
            network_connections = len(process.net_connections())
        except Exception:
            network_connections = 0

        resource_metrics = {
            "process_pid": process.pid,
            "executable": process.exe(),
            "cpu_usage": cpu_percent,
            "user_cpu_time": cpu_times.user,
            "system_cpu_time": cpu_times.system,
            "threads": num_threads,
            "rss_memory_mb": mem_info.rss / (1024 * 1024),
            "vms_memory_mb": mem_info.vms / (1024 * 1024),
            "memory_percent": mem_percent,
            "total_mapped_memory_mb": total_mapped_size / (1024 * 1024),
            "open_files": open_files,
            "network_connections": network_connections
        }

        if logger:
            logger.info(
                f"[DETAILED RESOURCE USAGE: {label}]\n"
                f"  Process Details:\n"
                f"    PID: {resource_metrics['process_pid']}\n"
                f"    Executable: {resource_metrics['executable']}\n\n"
                f"  CPU Metrics:\n"
                f"    Overall Usage: {resource_metrics['cpu_usage']:.2f}%\n"
                f"    User CPU Time: {resource_metrics['user_cpu_time']:.2f}s\n"
                f"    System CPU Time: {resource_metrics['system_cpu_time']:.2f}s\n"
                f"    Threads: {resource_metrics['threads']}\n\n"
                f"  Memory Metrics:\n"
                f"    Resident Set Size (RSS): {resource_metrics['rss_memory_mb']:.2f} MB\n"
                f"    Virtual Memory Size (VMS): {resource_metrics['vms_memory_mb']:.2f} MB\n"
                f"    Memory Percentage: {resource_metrics['memory_percent']:.2f}%\n"
                f"    Total Mapped Memory: {resource_metrics['total_mapped_memory_mb']:.2f} MB\n\n"
                f"  System Interaction:\n"
                f"    Open Files: {resource_metrics['open_files']}\n"
                f"    Network Connections: {resource_metrics['network_connections']}"
            )
        
        return resource_metrics

    except Exception as e:
        if logger:
            logger.error(f"Failed to log detailed resource usage: {str(e)}")
            logger.error(traceback.format_exc())
        return {}


def validate_config(config: AppConfig, logger=None) -> None:
    """
    Validate the loaded configuration object with verbose logging.
    Raises ValueError if critical fields are missing.
    """
    if logger:
        logger.debug("Initiating comprehensive configuration validation...")
        logger.info("Configuration Validation Report:")

        config_dict = config.to_dict()
        for key, value in config_dict.items():
            if 'SECRET' in key or 'KEY' in key:
                masked_value = (
                    value[:3] + '*' * (len(value) - 6) + value[-3:]
                    if value and len(value) > 6
                    else 'N/A'
                )
                logger.info(f"  {key}: {masked_value}")
            else:
                logger.info(f"  {key}: {value}")

    if not config.API_KEY:
        if logger:
            logger.critical("SECURITY ALERT: API_KEY is MISSING from configuration!")
        raise ValueError("Invalid API credentials: Missing API_KEY")

    if not config.API_SECRET:
        if logger:
            logger.critical("SECURITY ALERT: API_SECRET is MISSING from configuration!")
        raise ValueError("Invalid API credentials: Missing API_SECRET")

    if not config.DB_PATH:
        if logger:
            logger.critical("CONFIGURATION ERROR: DB_PATH is not specified!")
        raise ValueError("Invalid database path: DB_PATH not specified")

    if not config.WSS_URI:
        if logger:
            logger.critical("CONFIGURATION ERROR: WSS_URI is not specified!")
        raise ValueError("Invalid WebSocket URI: WSS_URI not specified")

    if logger:
        logger.info("✅ Configuration validation completed successfully")
        logger.debug(f"Database will be located at: {config.DB_PATH}")
        logger.debug(f"WebSocket connection will use: {config.WSS_URI}")


async def _init_environment_async(args, logger) -> AppConfig:
    """
    Asynchronously handle old log management, directory setup, environment checks,
    and load/validate the application configuration.
    Returns a validated AppConfig instance.
    """
    max_log_files = args.max_log_files
    logger.info(f"Log Management: Retaining maximum {max_log_files} log files")

    # Convert to async-friendly calls with asyncio.to_thread if needed
    await asyncio.to_thread(manage_old_logs, Path("logs"), max_log_files)

    logger.info("📁 Preparing application directories...")
    await asyncio.to_thread(setup_directories)

    logger.info("🌍 Performing environment validation...")
    await asyncio.to_thread(check_environment)

    logger.info("🔧 Loading application configuration...")
    if args.config_file:
        logger.debug(f"Loading configuration from file: {args.config_file}")
        config = AppConfig.from_file(args.config_file)
    else:
        logger.debug("Loading configuration from environment variables")
        config = AppConfig.from_env()

    # Validate (still synchronous, but that's OK since it's quick)
    validate_config(config, logger=logger)
    return config


async def _shutdown_procedures_async(
    db_manager: DBManager,
    websocket_handler: EnhancedWebSocketHandler,
    logger: logging.Logger
):
    """
    Cleanly close DB connections, log final WebSocket metrics, etc. (Async version).
    """
    try:
        if db_manager:
            logger.info("🔒 Closing database connection...")
            await db_manager.close()

        if websocket_handler:
            final_network_metrics = websocket_handler.get_network_connection_metrics()
            logger.info(f"Final WebSocket Network Metrics: {final_network_metrics}")
            # If EnhancedWebSocketHandler has an async close method, you could do:
            await websocket_handler.close()
            logger.info("✅ WebSocket connection closed")

    except Exception as cleanup_error:
        logger.error("⚠️ Error during final cleanup", exc_info=True)


async def main_async(args, logger, start_time) -> None:
    """
    Asynchronous version of the main application logic,
    encapsulating setup, runtime, and teardown.
    Uses app.run_async() to avoid nested event loops.
    """
    # Log initial resource usage
    init_resources = log_detailed_resource_usage("Initialization", logger=logger)
    logger.info(f"Initial Resource State: {init_resources}")

    # 1) Environment & Config
    config = await _init_environment_async(args, logger)

    # 2) Test mode override
    if args.test_mode:
        logger.warning("🧪 ENTERING TEST MODE - Using test environment configuration")
        config.WSS_URI = "wss://ws.test.kraken.com"
        logger.info(f"Test Mode WebSocket URI: {config.WSS_URI}")

    # 3) DB, API, Portfolio, WebSocket
    logger.info("💾 Establishing database connection...")
    db_manager = DBManager(db_path=config.DB_PATH)
    await db_manager.connect()
    logger.info("✅ Database connection established successfully")

    logger.info("🌐 Initializing Kraken API...")
    kraken_api = EnhancedKrakenAPI(
        api_key=config.API_KEY,
        api_secret=config.API_SECRET,
        test_mode=args.test_mode
    )

    logger.info("💰 Initializing Portfolio Management...")
    portfolio_manager = await PortfolioManager.create(config.to_dict(), db_manager, kraken_api)
    logger.info("✅ Portfolio Manager initialized successfully")

    logger.info("🔌 Setting up WebSocket communication...")
    websocket_handler = EnhancedWebSocketHandler(
        wss_uri=config.WSS_URI,
        max_retries=5,
        retry_delay=5,
        portfolio_manager=portfolio_manager
    )
    logger.info("✅ WebSocket handler prepared")

    net_metrics = websocket_handler.get_network_connection_metrics()
    logger.info(f"Initial WebSocket Network Metrics: {net_metrics}")

    # 4) Prepare & launch TUI
    logger.info("🖥️  Preparing Textual User Interface...")
    app = EnhancedAlgoTradingTUI(
        websocket=websocket_handler,
        portfolio_manager=portfolio_manager
    )

    pre_launch_resources = log_detailed_resource_usage("Pre-Launch", logger=logger)
    logger.info(f"Pre-Launch Resource State: {pre_launch_resources}")

    logger.info("🎉 Launching application...")
    if args.test_mode:
        logger.info("🧪 Executing in TEST MODE")
    else:
        logger.info("🚀 Launching in standard mode")

    # Use the asynchronous run method to avoid nested event loops.
    await app.run_async()
    logger.info("✅ Application executed successfully")

    # 5) Cleanup
    await _shutdown_procedures_async(db_manager, websocket_handler, logger)

    # (Optional) Additional logging after the TUI completes
    duration = datetime.now() - start_time
    logger.info(f"🕒 TUI Execution Duration: {duration}")


def main():
    """
    Main entry point of the application with comprehensive logging, error tracking,
    resource usage monitoring, and cProfile-based performance profiling.

    This is now mostly a wrapper that:
      1) Parses CLI & sets up logging
      2) Launches main_async(...) with asyncio.run(...)
      3) Handles performance profiling info and final logs
    """
    start_time = datetime.now()
    global_error = None

    # Use a context manager for profiling
    with cProfile.Profile() as profiler:
        try:
            # Parse CLI args and setup logging
            args = parse_args()
            debug_mode = args.debug

            logger = setup_logging(debug=debug_mode, max_logs=args.max_log_files)
            logger.info("🚀 APPLICATION STARTUP SEQUENCE INITIATED")
            logger.info(f"Startup Timestamp: {start_time.isoformat()}")
            logger.info(f"Platform: {sys.platform}")
            logger.info(f"Python Version: {sys.version}")

            # Run the async main logic
            asyncio.run(main_async(args, logger, start_time))

        except Exception as app_error:
            logging.critical("❌ CRITICAL: Application component initialization failed", exc_info=True)
            global_error = app_error
            # Re-raise so we exit with sys.exit(1) below
            raise

    # Outside the profiler context manager:
    end_time = datetime.now()
    duration = end_time - start_time

    # Final resource usage log & profiling data
    if 'logger' in locals() and logger:
        final_resources = log_detailed_resource_usage("Shutdown", logger=logger)
        logger.info(f"Final Resource State: {final_resources}")

        # Collect and log profiler stats
        s = io.StringIO()
        ps = pstats.Stats(profiler, stream=s).sort_stats("cumtime")
        ps.print_stats(20)  # Show top 20 lines

        logger.info(f"🕒 Total Application Runtime: {duration}")
        logger.info("===== 📊 Performance Profiling (Top 20 by cumulative time) =====")
        logger.info(s.getvalue())
        logger.info("================================================================")

        if global_error:
            logger.critical(f"🚨 Global Error Encountered: {global_error}")

        logger.info("🔚 Application shutdown sequence complete")

    # Exit with error if needed
    if global_error:
        sys.exit(1)


if __name__ == "__main__":
    main()
