"""
Historical Data Downloader

Downloads and caches historical data for backtesting.
Run this script to pre-populate your local data cache.
"""

import asyncio
import logging
import argparse
from datetime import datetime, timedelta
from typing import List
import os
from dotenv import load_dotenv

from historical_data_manager import HistoricalDataManager

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


async def download_data(
    pairs: List[str],
    timeframes: List[str],
    days_back: int = 365,
    force_refresh: bool = False
):
    """Download historical data for specified pairs and timeframes"""
    
    logger.info("🔽 Starting historical data download")
    logger.info(f"Pairs: {pairs}")
    logger.info(f"Timeframes: {timeframes}")
    logger.info(f"Days back: {days_back}")
    
    # Initialize data manager
    data_manager = HistoricalDataManager(
        kraken_api_key=os.getenv('KRAKEN_API_KEY'),
        kraken_api_secret=os.getenv('KRAKEN_API_SECRET'),
        cryptocompare_api_key=os.getenv('CRYPTOCOMPARE_API_KEY')
    )
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)
    
    logger.info(f"Date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
    
    total_combinations = len(pairs) * len(timeframes)
    completed = 0
    errors = 0
    
    try:
        for pair in pairs:
            for timeframe in timeframes:
                try:
                    logger.info(f"📊 [{completed+1}/{total_combinations}] Downloading {pair} {timeframe}")
                    
                    # Check if data already exists (unless force refresh)
                    if not force_refresh:
                        cache_start, cache_end = data_manager.cache.get_cache_coverage(pair, timeframe)
                        
                        if cache_start and cache_end:
                            if cache_start <= start_date and cache_end >= end_date:
                                logger.info(f"✅ Cache hit: {pair} {timeframe} already available")
                                completed += 1
                                continue
                            else:
                                logger.info(f"⚠️ Partial cache: {pair} {timeframe} - updating...")
                    
                    # Download data
                    data = await data_manager.get_historical_data(
                        pair=pair,
                        timeframe=timeframe,
                        start_date=start_date,
                        end_date=end_date,
                        use_cache=not force_refresh
                    )
                    
                    if not data.empty:
                        logger.info(f"✅ Downloaded {len(data)} candles for {pair} {timeframe}")
                    else:
                        logger.warning(f"❌ No data retrieved for {pair} {timeframe}")
                        errors += 1
                        
                    completed += 1
                    
                    # Small delay to be nice to APIs
                    await asyncio.sleep(0.5)
                    
                except Exception as e:
                    logger.error(f"❌ Error downloading {pair} {timeframe}: {e}")
                    errors += 1
                    completed += 1
                    
        # Summary
        logger.info("📈 Download Summary:")
        logger.info(f"  Total combinations: {total_combinations}")
        logger.info(f"  Completed: {completed}")
        logger.info(f"  Errors: {errors}")
        logger.info(f"  Success rate: {((completed - errors) / completed * 100):.1f}%")
        
        if errors == 0:
            logger.info("🎉 All data downloaded successfully!")
        elif errors < completed / 2:
            logger.info("✅ Download mostly successful - you have enough data for backtesting")
        else:
            logger.warning("⚠️ Many download errors - check your API configuration")
            
    finally:
        # Cleanup
        await data_manager.cleanup()


async def test_data_sources():
    """Test all configured data sources"""
    
    logger.info("🧪 Testing data sources...")
    
    data_manager = HistoricalDataManager(
        kraken_api_key=os.getenv('KRAKEN_API_KEY'),
        kraken_api_secret=os.getenv('KRAKEN_API_SECRET'),
        cryptocompare_api_key=os.getenv('CRYPTOCOMPARE_API_KEY')
    )
    
    # Test with a small date range
    end_date = datetime.now()
    start_date = end_date - timedelta(hours=2)
    
    test_pair = 'XBTUSD'
    test_timeframe = '5m'
    
    logger.info(f"Testing with {test_pair} {test_timeframe} for last 2 hours...")
    
    try:
        data = await data_manager.get_historical_data(
            pair=test_pair,
            timeframe=test_timeframe,
            start_date=start_date,
            end_date=end_date,
            use_cache=False  # Force fresh data
        )
        
        if not data.empty:
            logger.info(f"✅ Test successful: Retrieved {len(data)} data points")
            logger.info(f"   Date range: {data.index.min()} to {data.index.max()}")
            logger.info(f"   Price range: ${data['low'].min():.2f} - ${data['high'].max():.2f}")
            
            # Show sample
            logger.info("📊 Sample data:")
            sample = data.tail(3)
            for timestamp, row in sample.iterrows():
                logger.info(f"   {timestamp}: O:{row['open']:.2f} H:{row['high']:.2f} L:{row['low']:.2f} C:{row['close']:.2f}")
                
        else:
            logger.error("❌ Test failed: No data retrieved")
            
    except Exception as e:
        logger.error(f"❌ Test failed with error: {e}")
        
    finally:
        await data_manager.cleanup()


async def show_cache_status():
    """Show current cache status"""
    
    logger.info("📂 Checking cache status...")
    
    data_manager = HistoricalDataManager()
    
    # Common pairs and timeframes to check
    pairs = ['XBTUSD', 'ETHUSD', 'XRPUSD']
    timeframes = ['5m', '1h', '1d']
    
    logger.info("Cache coverage:")
    logger.info("-" * 60)
    
    for pair in pairs:
        for timeframe in timeframes:
            cache_start, cache_end = data_manager.cache.get_cache_coverage(pair, timeframe)
            
            if cache_start and cache_end:
                days = (cache_end - cache_start).days
                logger.info(f"  {pair:8} {timeframe:3}: {cache_start.strftime('%Y-%m-%d')} to {cache_end.strftime('%Y-%m-%d')} ({days} days)")
            else:
                logger.info(f"  {pair:8} {timeframe:3}: No data")
                
    await data_manager.cleanup()


def main():
    """Main function with command line interface"""
    
    parser = argparse.ArgumentParser(description='Download historical market data for backtesting')
    
    parser.add_argument(
        '--command', 
        choices=['download', 'test', 'status'], 
        default='download',
        help='Command to run (default: download)'
    )
    
    parser.add_argument(
        '--pairs', 
        nargs='+', 
        default=['XBTUSD', 'ETHUSD'],
        help='Trading pairs to download (default: XBTUSD ETHUSD)'
    )
    
    parser.add_argument(
        '--timeframes', 
        nargs='+', 
        default=['5m', '1h'],
        help='Timeframes to download (default: 5m 1h)'
    )
    
    parser.add_argument(
        '--days', 
        type=int, 
        default=90,
        help='Number of days to download (default: 90)'
    )
    
    parser.add_argument(
        '--force', 
        action='store_true',
        help='Force refresh existing cached data'
    )
    
    parser.add_argument(
        '--all-pairs', 
        action='store_true',
        help='Download all available pairs'
    )
    
    parser.add_argument(
        '--all-timeframes', 
        action='store_true',
        help='Download all available timeframes'
    )
    
    args = parser.parse_args()
    
    # Get available options
    data_manager = HistoricalDataManager()
    available_pairs = data_manager.get_available_pairs()
    available_timeframes = data_manager.get_available_timeframes()
    
    # Override with all options if requested
    if args.all_pairs:
        args.pairs = available_pairs
        
    if args.all_timeframes:
        args.timeframes = available_timeframes
    
    # Validate inputs
    invalid_pairs = [p for p in args.pairs if p not in available_pairs]
    invalid_timeframes = [t for t in args.timeframes if t not in available_timeframes]
    
    if invalid_pairs:
        logger.error(f"Invalid pairs: {invalid_pairs}")
        logger.info(f"Available pairs: {available_pairs}")
        return
        
    if invalid_timeframes:
        logger.error(f"Invalid timeframes: {invalid_timeframes}")
        logger.info(f"Available timeframes: {available_timeframes}")
        return
    
    # Run command
    if args.command == 'download':
        asyncio.run(download_data(
            pairs=args.pairs,
            timeframes=args.timeframes,
            days_back=args.days,
            force_refresh=args.force
        ))
        
    elif args.command == 'test':
        asyncio.run(test_data_sources())
        
    elif args.command == 'status':
        asyncio.run(show_cache_status())


if __name__ == "__main__":
    main()