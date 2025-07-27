"""
Historical Data Manager - Real market data integration for accurate backtesting

Supports multiple data sources with automatic fallbacks and local caching.
"""

import asyncio
import logging
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Union
import aiohttp
import sqlite3
import json
import os
from pathlib import Path
import time
import ccxt.async_support as ccxt

logger = logging.getLogger(__name__)


class DataSource:
    """Base class for data sources"""
    
    def __init__(self, name: str, rate_limit_ms: int = 1000):
        self.name = name
        self.rate_limit_ms = rate_limit_ms
        self.last_request = 0
        
    async def _rate_limit(self):
        """Enforce rate limiting"""
        elapsed = (time.time() * 1000) - self.last_request
        if elapsed < self.rate_limit_ms:
            await asyncio.sleep((self.rate_limit_ms - elapsed) / 1000)
        self.last_request = time.time() * 1000
        
    async def get_ohlcv(
        self, 
        pair: str, 
        timeframe: str, 
        start_date: datetime, 
        end_date: datetime
    ) -> Optional[pd.DataFrame]:
        """Get OHLCV data for the specified period"""
        raise NotImplementedError


class KrakenDataSource(DataSource):
    """Kraken exchange data source"""
    
    def __init__(self, api_key: str = None, api_secret: str = None):
        super().__init__("Kraken", rate_limit_ms=1000)
        self.exchange = ccxt.kraken({
            'apiKey': api_key,
            'secret': api_secret,
            'sandbox': False,
            'enableRateLimit': True,
        })
        
    async def get_ohlcv(
        self, 
        pair: str, 
        timeframe: str, 
        start_date: datetime, 
        end_date: datetime
    ) -> Optional[pd.DataFrame]:
        """Get OHLCV data from Kraken"""
        try:
            await self._rate_limit()
            
            # Convert pair format (XBTUSD -> BTC/USD)
            ccxt_pair = self._convert_pair_format(pair)
            
            # Kraken limits: max 720 data points per request
            since = int(start_date.timestamp() * 1000)
            
            all_data = []
            current_since = since
            end_timestamp = int(end_date.timestamp() * 1000)
            
            while current_since < end_timestamp:
                try:
                    ohlcv = await self.exchange.fetch_ohlcv(
                        ccxt_pair, timeframe, since=current_since, limit=720
                    )
                    
                    if not ohlcv:
                        break
                        
                    all_data.extend(ohlcv)
                    
                    # Update since to last timestamp + 1
                    if len(ohlcv) > 0:
                        current_since = ohlcv[-1][0] + self._timeframe_to_ms(timeframe)
                    else:
                        break
                        
                    # Don't hammer the API
                    await asyncio.sleep(1)
                    
                except Exception as e:
                    logger.warning(f"Kraken API error: {e}")
                    break
                    
            if all_data:
                df = pd.DataFrame(all_data, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
                df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
                df.set_index('timestamp', inplace=True)
                df = df.sort_index()
                
                # Filter to requested date range
                df = df[(df.index >= start_date) & (df.index <= end_date)]
                
                logger.info(f"Kraken: Retrieved {len(df)} {timeframe} candles for {pair}")
                return df
                
        except Exception as e:
            logger.error(f"Kraken data source error: {e}")
            
        return None
        
    def _convert_pair_format(self, kraken_pair: str) -> str:
        """Convert Kraken pair format to CCXT format"""
        pair_map = {
            'XBTUSD': 'BTC/USD',
            'ETHUSD': 'ETH/USD',
            'XRPUSD': 'XRP/USD',
            'ADAUSD': 'ADA/USD',
            'SOLUSD': 'SOL/USD',
            'DOTUSD': 'DOT/USD',
            'LINKUSD': 'LINK/USD',
        }
        return pair_map.get(kraken_pair, kraken_pair)
        
    def _timeframe_to_ms(self, timeframe: str) -> int:
        """Convert timeframe to milliseconds"""
        timeframe_map = {
            '1m': 60 * 1000,
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000
        }
        return timeframe_map.get(timeframe, 60 * 1000)


class CryptoCompareDataSource(DataSource):
    """CryptoCompare API data source"""
    
    def __init__(self, api_key: str = None):
        super().__init__("CryptoCompare", rate_limit_ms=100)  # 10 requests/second
        self.api_key = api_key
        self.base_url = "https://min-api.cryptocompare.com/data/v2"
        
    async def get_ohlcv(
        self, 
        pair: str, 
        timeframe: str, 
        start_date: datetime, 
        end_date: datetime
    ) -> Optional[pd.DataFrame]:
        """Get OHLCV data from CryptoCompare"""
        try:
            await self._rate_limit()
            
            # Convert formats
            fsym, tsym = self._parse_pair(pair)
            endpoint = self._get_endpoint(timeframe)
            
            params = {
                'fsym': fsym,
                'tsym': tsym,
                'toTs': int(end_date.timestamp()),
                'limit': 2000,  # Max 2000 points per request
            }
            
            if self.api_key:
                params['api_key'] = self.api_key
                
            url = f"{self.base_url}/{endpoint}"
            
            all_data = []
            current_end = end_date
            
            async with aiohttp.ClientSession() as session:
                while current_end > start_date:
                    params['toTs'] = int(current_end.timestamp())
                    
                    async with session.get(url, params=params) as response:
                        if response.status == 200:
                            data = await response.json()
                            
                            if data.get('Response') == 'Success':
                                ohlcv_data = data['Data']['Data']
                                
                                if not ohlcv_data:
                                    break
                                    
                                all_data.extend(ohlcv_data)
                                
                                # Update for next batch
                                oldest_time = datetime.fromtimestamp(ohlcv_data[0]['time'])
                                if oldest_time <= start_date:
                                    break
                                    
                                current_end = oldest_time - timedelta(seconds=1)
                                
                            else:
                                logger.warning(f"CryptoCompare API error: {data.get('Message')}")
                                break
                        else:
                            logger.error(f"CryptoCompare HTTP error: {response.status}")
                            break
                            
                    await asyncio.sleep(0.1)  # Rate limiting
                    
            if all_data:
                # Convert to DataFrame
                df_data = []
                for candle in all_data:
                    df_data.append({
                        'timestamp': datetime.fromtimestamp(candle['time']),
                        'open': float(candle['open']),
                        'high': float(candle['high']),
                        'low': float(candle['low']),
                        'close': float(candle['close']),
                        'volume': float(candle['volumefrom'])
                    })
                    
                df = pd.DataFrame(df_data)
                df.set_index('timestamp', inplace=True)
                df = df.sort_index()
                
                # Filter to requested range
                df = df[(df.index >= start_date) & (df.index <= end_date)]
                
                logger.info(f"CryptoCompare: Retrieved {len(df)} {timeframe} candles for {pair}")
                return df
                
        except Exception as e:
            logger.error(f"CryptoCompare data source error: {e}")
            
        return None
        
    def _parse_pair(self, pair: str) -> Tuple[str, str]:
        """Parse trading pair"""
        pair_map = {
            'XBTUSD': ('BTC', 'USD'),
            'ETHUSD': ('ETH', 'USD'),
            'XRPUSD': ('XRP', 'USD'),
            'ADAUSD': ('ADA', 'USD'),
            'SOLUSD': ('SOL', 'USD'),
        }
        
        if pair in pair_map:
            return pair_map[pair]
            
        # Try to parse manually
        if pair.endswith('USD'):
            base = pair[:-3]
            if base.startswith('X'):
                base = base[1:]  # Remove X prefix
            return (base, 'USD')
            
        return ('BTC', 'USD')  # Default
        
    def _get_endpoint(self, timeframe: str) -> str:
        """Get API endpoint for timeframe"""
        endpoint_map = {
            '1m': 'histominute',
            '5m': 'histominute',
            '15m': 'histominute',
            '1h': 'histohour',
            '1d': 'histoday'
        }
        return endpoint_map.get(timeframe, 'histohour')


class BinanceDataSource(DataSource):
    """Binance data source as backup"""
    
    def __init__(self):
        super().__init__("Binance", rate_limit_ms=100)
        self.exchange = ccxt.binance({
            'enableRateLimit': True,
        })
        
    async def get_ohlcv(
        self, 
        pair: str, 
        timeframe: str, 
        start_date: datetime, 
        end_date: datetime
    ) -> Optional[pd.DataFrame]:
        """Get OHLCV data from Binance"""
        try:
            await self._rate_limit()
            
            # Convert pair format
            binance_pair = self._convert_pair_format(pair)
            
            since = int(start_date.timestamp() * 1000)
            
            all_data = []
            current_since = since
            end_timestamp = int(end_date.timestamp() * 1000)
            
            while current_since < end_timestamp:
                try:
                    ohlcv = await self.exchange.fetch_ohlcv(
                        binance_pair, timeframe, since=current_since, limit=1000
                    )
                    
                    if not ohlcv:
                        break
                        
                    all_data.extend(ohlcv)
                    
                    if len(ohlcv) > 0:
                        current_since = ohlcv[-1][0] + 1
                    else:
                        break
                        
                    await asyncio.sleep(0.1)
                    
                except Exception as e:
                    logger.warning(f"Binance API error: {e}")
                    break
                    
            if all_data:
                df = pd.DataFrame(all_data, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
                df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
                df.set_index('timestamp', inplace=True)
                df = df.sort_index()
                
                df = df[(df.index >= start_date) & (df.index <= end_date)]
                
                logger.info(f"Binance: Retrieved {len(df)} {timeframe} candles for {pair}")
                return df
                
        except Exception as e:
            logger.error(f"Binance data source error: {e}")
            
        return None
        
    def _convert_pair_format(self, kraken_pair: str) -> str:
        """Convert to Binance format"""
        pair_map = {
            'XBTUSD': 'BTC/USDT',  # Binance uses USDT
            'ETHUSD': 'ETH/USDT',
            'XRPUSD': 'XRP/USDT',
            'ADAUSD': 'ADA/USDT',
            'SOLUSD': 'SOL/USDT',
        }
        return pair_map.get(kraken_pair, 'BTC/USDT')


class DataCache:
    """Local SQLite cache for historical data"""
    
    def __init__(self, cache_dir: str = "data_cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self.db_path = self.cache_dir / "historical_data.db"
        self._init_database()
        
    def _init_database(self):
        """Initialize SQLite database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ohlcv_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pair TEXT NOT NULL,
                timeframe TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                open REAL NOT NULL,
                high REAL NOT NULL,
                low REAL NOT NULL,
                close REAL NOT NULL,
                volume REAL NOT NULL,
                source TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                UNIQUE(pair, timeframe, timestamp)
            )
        ''')
        
        # Create indexes for faster queries
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_pair_timeframe_timestamp 
            ON ohlcv_data(pair, timeframe, timestamp)
        ''')
        
        conn.commit()
        conn.close()
        
    def get_cached_data(
        self, 
        pair: str, 
        timeframe: str, 
        start_date: datetime, 
        end_date: datetime
    ) -> Optional[pd.DataFrame]:
        """Retrieve cached data"""
        conn = sqlite3.connect(self.db_path)
        
        query = '''
            SELECT timestamp, open, high, low, close, volume
            FROM ohlcv_data
            WHERE pair = ? AND timeframe = ? 
            AND timestamp >= ? AND timestamp <= ?
            ORDER BY timestamp
        '''
        
        start_ts = int(start_date.timestamp())
        end_ts = int(end_date.timestamp())
        
        df = pd.read_sql_query(
            query, 
            conn, 
            params=(pair, timeframe, start_ts, end_ts)
        )
        
        conn.close()
        
        if not df.empty:
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='s')
            df.set_index('timestamp', inplace=True)
            logger.info(f"Cache: Retrieved {len(df)} cached candles for {pair} {timeframe}")
            return df
            
        return None
        
    def cache_data(
        self, 
        df: pd.DataFrame, 
        pair: str, 
        timeframe: str, 
        source: str
    ):
        """Store data in cache"""
        if df.empty:
            return
            
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        created_at = int(time.time())
        
        for timestamp, row in df.iterrows():
            cursor.execute('''
                INSERT OR REPLACE INTO ohlcv_data 
                (pair, timeframe, timestamp, open, high, low, close, volume, source, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                pair, timeframe, int(timestamp.timestamp()),
                float(row['open']), float(row['high']), float(row['low']),
                float(row['close']), float(row['volume']),
                source, created_at
            ))
            
        conn.commit()
        conn.close()
        
        logger.info(f"Cache: Stored {len(df)} candles for {pair} {timeframe}")
        
    def get_cache_coverage(
        self, 
        pair: str, 
        timeframe: str
    ) -> Tuple[Optional[datetime], Optional[datetime]]:
        """Get the date range available in cache"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT MIN(timestamp), MAX(timestamp)
            FROM ohlcv_data
            WHERE pair = ? AND timeframe = ?
        ''', (pair, timeframe))
        
        result = cursor.fetchone()
        conn.close()
        
        if result and result[0] and result[1]:
            return (
                datetime.fromtimestamp(result[0]),
                datetime.fromtimestamp(result[1])
            )
            
        return None, None


class HistoricalDataManager:
    """Main historical data manager with multiple sources and caching"""
    
    def __init__(
        self, 
        kraken_api_key: str = None,
        kraken_api_secret: str = None,
        cryptocompare_api_key: str = None,
        cache_dir: str = "data_cache"
    ):
        # Initialize data sources in priority order
        self.sources = []
        
        # Primary: Kraken (most accurate for Kraken trading)
        if kraken_api_key and kraken_api_secret:
            self.sources.append(KrakenDataSource(kraken_api_key, kraken_api_secret))
        else:
            self.sources.append(KrakenDataSource())  # Public data only
            
        # Secondary: CryptoCompare (more historical data)
        self.sources.append(CryptoCompareDataSource(cryptocompare_api_key))
        
        # Tertiary: Binance (backup)
        self.sources.append(BinanceDataSource())
        
        # Local cache
        self.cache = DataCache(cache_dir)
        
        logger.info(f"Initialized HistoricalDataManager with {len(self.sources)} data sources")
        
    async def get_historical_data(
        self, 
        pair: str, 
        timeframe: str, 
        start_date: datetime, 
        end_date: datetime,
        use_cache: bool = True
    ) -> pd.DataFrame:
        """
        Get historical OHLCV data with intelligent source selection and caching
        """
        logger.info(f"Requesting {pair} {timeframe} data from {start_date} to {end_date}")
        
        # Check cache first
        if use_cache:
            cached_data = self.cache.get_cached_data(pair, timeframe, start_date, end_date)
            
            if cached_data is not None and not cached_data.empty:
                # Check if cache covers the full requested range
                cache_start = cached_data.index.min()
                cache_end = cached_data.index.max()
                
                if cache_start <= start_date and cache_end >= end_date:
                    logger.info(f"Cache hit: Full range available for {pair} {timeframe}")
                    return cached_data
                    
                # Partial cache hit - identify missing ranges
                logger.info(f"Partial cache hit for {pair} {timeframe}")
                
        # Try each data source until we get data
        for source in self.sources:
            try:
                logger.info(f"Trying {source.name} for {pair} {timeframe}")
                
                data = await source.get_ohlcv(pair, timeframe, start_date, end_date)
                
                if data is not None and not data.empty:
                    # Validate and clean data
                    data = self._validate_and_clean_data(data, pair)
                    
                    if not data.empty:
                        # Cache the data
                        if use_cache:
                            self.cache.cache_data(data, pair, timeframe, source.name)
                            
                        logger.info(f"Successfully retrieved {len(data)} candles from {source.name}")
                        return data
                        
            except Exception as e:
                logger.warning(f"Error with {source.name}: {e}")
                continue
                
        # If no source worked, return empty DataFrame
        logger.error(f"Failed to retrieve data for {pair} {timeframe} from all sources")
        return pd.DataFrame()
        
    def _validate_and_clean_data(self, df: pd.DataFrame, pair: str) -> pd.DataFrame:
        """Validate and clean OHLCV data"""
        if df.empty:
            return df
            
        original_len = len(df)
        
        # Remove duplicates
        df = df[~df.index.duplicated(keep='first')]
        
        # Remove rows with invalid prices (zeros, negative, NaN)
        df = df[
            (df['open'] > 0) & (df['high'] > 0) & 
            (df['low'] > 0) & (df['close'] > 0) &
            (df['volume'] >= 0) &
            df['open'].notna() & df['high'].notna() & 
            df['low'].notna() & df['close'].notna()
        ]
        
        # Validate OHLC relationships
        df = df[
            (df['high'] >= df['open']) & (df['high'] >= df['close']) &
            (df['low'] <= df['open']) & (df['low'] <= df['close']) &
            (df['high'] >= df['low'])
        ]
        
        # Remove extreme outliers (price spikes > 50% from previous close)
        if len(df) > 1:
            price_changes = df['close'].pct_change().abs()
            df = df[price_changes <= 0.5]  # Remove >50% price changes
            
        cleaned_len = len(df)
        
        if cleaned_len < original_len:
            logger.warning(f"Data cleaning removed {original_len - cleaned_len} invalid candles for {pair}")
            
        return df.sort_index()
        
    async def download_and_cache_data(
        self, 
        pairs: List[str], 
        timeframes: List[str],
        days_back: int = 365
    ):
        """Download and cache historical data for multiple pairs/timeframes"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        logger.info(f"Downloading {days_back} days of data for {len(pairs)} pairs, {len(timeframes)} timeframes")
        
        for pair in pairs:
            for timeframe in timeframes:
                try:
                    logger.info(f"Downloading {pair} {timeframe}...")
                    
                    data = await self.get_historical_data(
                        pair, timeframe, start_date, end_date, use_cache=False
                    )
                    
                    if not data.empty:
                        logger.info(f"✅ Downloaded {len(data)} candles for {pair} {timeframe}")
                    else:
                        logger.warning(f"❌ No data retrieved for {pair} {timeframe}")
                        
                    # Small delay between requests
                    await asyncio.sleep(0.5)
                    
                except Exception as e:
                    logger.error(f"Error downloading {pair} {timeframe}: {e}")
                    
        logger.info("Data download complete")
        
    async def get_latest_price(self, pair: str) -> Optional[float]:
        """Get latest price for a pair"""
        end_date = datetime.now()
        start_date = end_date - timedelta(minutes=5)
        
        data = await self.get_historical_data(pair, '1m', start_date, end_date)
        
        if not data.empty:
            return float(data['close'].iloc[-1])
            
        return None
        
    def get_available_pairs(self) -> List[str]:
        """Get list of available trading pairs"""
        return [
            'XBTUSD', 'ETHUSD', 'XRPUSD', 'ADAUSD', 'SOLUSD',
            'DOTUSD', 'LINKUSD', 'LTCUSD', 'BCHUSD', 'XLMUSD'
        ]
        
    def get_available_timeframes(self) -> List[str]:
        """Get list of available timeframes"""
        return ['1m', '5m', '15m', '1h', '1d']
        
    async def cleanup(self):
        """Clean up resources"""
        for source in self.sources:
            if hasattr(source, 'exchange') and source.exchange:
                await source.exchange.close()