#!/usr/bin/env python3

import asyncio
import time
import hmac
import hashlib
import base64
import urllib.parse
import requests
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Union, Optional

# Use absolute imports
from src.config import AppConfig
from src.data.database import Database
from src.core.risk import RiskManager
from src.core.portfolio import PortfolioManager
from src.core.trade import TradeExecutor
from src.core.monitor import MonitoringSystem
from websocket_handler import EnhancedWebSocketHandler


class EnhancedKrakenAPI:
    """
    Enhanced Kraken API with specific endpoints for the TUI application.
    
    - Includes async wrappers that offload blocking requests to a thread.
    - Supports a sandbox/test mode if needed.
    - Provides improved ticker methods with caching, structured returns, and robust error handling.
    """

    def __init__(
        self,
        api_key: str = "",
        api_secret: str = "",
        test_mode: bool = False,
        cache_ttl: int = 5
    ):
        """
        :param api_key: Kraken API key
        :param api_secret: Kraken API secret
        :param test_mode: If True, use a sandbox/test URL (if available).
        :param cache_ttl: Time in seconds to cache ticker results (avoid frequent re-fetching).
        """
        self.api_key = api_key
        self.api_secret = api_secret

        if test_mode:
            # Replace with Kraken's official sandbox URL if available
            self.api_url = "https://api.sandbox.kraken.com"
        else:
            self.api_url = "https://api.kraken.com"

        self.api_version = "0"
        
        # Common symbol mappings
        self.pair_conversions = {
            'XBT/USD': 'XXBTZUSD',
            'ETH/USD': 'XETHZUSD',
            'SOL/USD': 'SOLUSD',
            'AVAX/USD': 'AVAXUSD',
            'LINK/USD': 'LINKUSD',
            'DOT/USD': 'DOTUSD',
            'BTC/USD': 'XXBTZUSD',  # Common alternative notation
        }

        # Ticker caching
        self.cache_ttl = cache_ttl
        self._ticker_cache: Dict[str, dict] = {}
        self._ticker_cache_time = 0.0

    def _get_kraken_signature(self, urlpath: str, data: dict) -> str:
        """Create authentication signature for private endpoints."""
        post_data = urllib.parse.urlencode(data)
        encoded = (str(data['nonce']) + post_data).encode()
        message = urlpath.encode() + hashlib.sha256(encoded).digest()
        mac = hmac.new(base64.b64decode(self.api_secret), message, hashlib.sha512)
        sigdigest = base64.b64encode(mac.digest())
        return sigdigest.decode()

    def _make_request(self, uri_path: str, data: dict = None, public: bool = True) -> dict:
        """
        Make a synchronous request to Kraken API.

        :param uri_path: e.g. '0/public/Ticker'
        :param data: Query or POST data
        :param public: True if public endpoint, else private
        :return: JSON 'result' dict if successful, or {}
        """
        if data is None:
            data = {}

        if not public:
            data['nonce'] = str(int(time.time() * 1000))

        headers = {}
        if not public:
            signature = self._get_kraken_signature(f"/{uri_path}", data)
            headers = {
                'API-Key': self.api_key,
                'API-Sign': signature
            }

        url = f"{self.api_url}/{uri_path}"

        try:
            if public:
                # GET request for public endpoints (10s timeout)
                response = requests.get(url, params=data, timeout=10)
            else:
                # POST request for private endpoints (10s timeout)
                response = requests.post(url, headers=headers, data=data, timeout=10)

            response.raise_for_status()
            raw_json = response.json()

            if raw_json.get('error'):
                logging.error(f"Kraken API error: {raw_json['error']}")
                return {}
            return raw_json.get('result', {})

        except requests.exceptions.RequestException as e:
            logging.error(f"Request error: {e}", exc_info=True)
            return {}

    def _convert_pair_format(self, pair: str) -> str:
        """
        Convert common trading pair notations to Kraken's format.
        
        :param pair: Trading pair (e.g. 'XBT/USD' or 'XXBTZUSD')
        :return: Kraken-formatted pair
        """
        # If it's already in the correct format, return it
        if pair in self.get_tradable_pairs():
            return pair

        # Check if it's in our known conversions
        if pair in self.pair_conversions:
            return self.pair_conversions[pair]

        # Try to convert the format if it contains a slash
        if '/' in pair:
            base, quote = pair.split('/')
            # Handle special cases
            if base == 'XBT':
                base = 'XXBT'
            elif base == 'ETH':
                base = 'XETH'
            # (Add more special cases as needed)

            # Try both with and without the 'Z' suffix for quote currency
            candidates = [
                f"{base}{quote}",      # e.g. SOLUSD
                f"{base}Z{quote}"     # e.g. XETHZUSD
            ]

            available_pairs = self.get_tradable_pairs()
            for candidate in candidates:
                if candidate in available_pairs:
                    # Cache this conversion for future use
                    self.pair_conversions[pair] = candidate
                    return candidate

        # If we can't convert it, return the original to let validation fail
        return pair

    def get_tradable_pairs(self) -> List[str]:
        """
        Returns all tradable asset pairs recognized by Kraken (synchronous).

        :return: Sorted list of official Kraken pair strings, e.g. ['XXBTZUSD', 'XETHZUSD', ...]
        """
        response = self._make_request("0/public/AssetPairs")
        return sorted(response.keys()) if response else []

    def validate_pair_name(self, pair: str) -> str:
        """
        Ensures the passed pair is in the set of known tradable pairs.
        Handles both slash notation (e.g. 'XBT/USD') and Kraken format (e.g. 'XXBTZUSD').
        
        :param pair: A trading pair in either format
        :return: The Kraken-formatted pair if valid
        :raises ValueError: If the pair is not recognized by Kraken
        """
        kraken_pair = self._convert_pair_format(pair)
        available = self.get_tradable_pairs()
        if kraken_pair not in available:
            logging.error(f"Invalid pair: {pair}")
            logging.error(f"Available pairs: {available}")
            raise ValueError(f"Unsupported or invalid pair: {pair}. Available pairs: {available}")
        return kraken_pair

    def get_tradable_pairs_cache(self) -> List[str]:
        """
        (Optional) A cached version of get_tradable_pairs if necessary, or
        you can just call get_tradable_pairs directly. This is shown as an example.
        """
        return self.get_tradable_pairs()

    def get_ticker_info(self, pairs: List[str]) -> Dict[str, dict]:
        """
        Get ticker information for the specified Kraken pairs, with optional caching.

        Example input: ['XXBTZUSD', 'SOLUSD'] or ['XBT/USD', 'SOL/USD']
        Example return:
           {
             "XXBTZUSD": { "a": [...], "b": [...], "c": [...], ... },
             "SOLUSD":   { "a": [...], "b": [...], "c": [...], ... },
             ...
           }

        :param pairs: A list of pairs in either format
        :return: Dict with pair keys and their ticker data, or {}
        """
        validated_pairs = [self.validate_pair_name(p) for p in pairs]
        
        now = time.time()
        use_cache = ((now - self._ticker_cache_time) < self.cache_ttl)

        # If cached data is still fresh, check if we already have data for all requested pairs
        if use_cache and all(p in self._ticker_cache for p in validated_pairs):
            # Return a subset of the cache
            return {p: self._ticker_cache[p] for p in validated_pairs}

        # Otherwise, fetch fresh data for *all* requested pairs
        pairs_param = ",".join(validated_pairs)
        uri_path = f"0/public/Ticker?pair={pairs_param}"
        api_result = self._make_request(uri_path)

        # Update the cache with whatever we got
        if api_result:
            for p in api_result:
                self._ticker_cache[p] = api_result[p]
            self._ticker_cache_time = time.time()

        # Return only the data for the requested pairs
        return {p: self._ticker_cache.get(p, {}) for p in validated_pairs}

    def get_ticker_details(self, pair: str) -> Dict[str, Optional[float]]:
        """
        Returns a dictionary with ask, bid, last, volume, etc. for a single pair.
        Raises ValueError if the pair is invalid or data is missing.

        Example return:
           {
             "ask": 27879.5,
             "bid": 27877.0,
             "last": 27878.7,
             "volume_today": 120.67,
             "volume_24h": 215.45
           }
        """
        validated_pair = self.validate_pair_name(pair)
        ticker_info = self.get_ticker_info([validated_pair])
        pair_data = ticker_info.get(validated_pair)

        if not pair_data:
            raise ValueError(f"No ticker data found for pair: {validated_pair}")

        details = {
            "ask":   float(pair_data["a"][0]) if "a" in pair_data else None,
            "bid":   float(pair_data["b"][0]) if "b" in pair_data else None,
            "last":  float(pair_data["c"][0]) if "c" in pair_data else None,
            "volume_today": float(pair_data["v"][0]) if "v" in pair_data else None,
            "volume_24h":   float(pair_data["v"][1]) if "v" in pair_data else None,
        }
        return details

    def get_ticker_price(self, pair: str) -> Optional[float]:
        """
        Get the current ticker price (last trade closed) for a pair (synchronous).
        Returns None if not available or on error.

        :param pair: Trading pair in either format
        :return: The float current price or None on error
        """
        try:
            details = self.get_ticker_details(pair)
            return details["last"] if details["last"] is not None else None
        except Exception as e:
            logging.error(f"Error getting ticker price for {pair}: {e}", exc_info=True)
            return None

    def get_multiple_ticker_details(self, pairs: List[str]) -> Dict[str, Dict[str, Optional[float]]]:
        """
        Return a dictionary of { <kraken_pair>: { 'ask': x, 'bid': y, 'last': z, 'volume_today': ..., 'volume_24h': ... } }
        for multiple pairs in one request.
        """
        validated_pairs = [self.validate_pair_name(p) for p in pairs]
        ticker_info = self.get_ticker_info(validated_pairs)

        results = {}
        for kraken_pair in validated_pairs:
            pair_data = ticker_info.get(kraken_pair, {})
            if pair_data:
                results[kraken_pair] = {
                    "ask":   float(pair_data["a"][0]) if "a" in pair_data else None,
                    "bid":   float(pair_data["b"][0]) if "b" in pair_data else None,
                    "last":  float(pair_data["c"][0]) if "c" in pair_data else None,
                    "volume_today": float(pair_data["v"][0]) if "v" in pair_data else None,
                    "volume_24h":   float(pair_data["v"][1]) if "v" in pair_data else None,
                }
            else:
                results[kraken_pair] = {}
        return results

    def get_ohlc_data(self, pair: str, interval: int = 1) -> Dict:
        """
        Get OHLC data for a pair (synchronous).
        
        :param pair: Trading pair in either format
        :param interval: time frame in minutes (1, 5, 15, 30, 60, etc.)
        """
        validated_pair = self.validate_pair_name(pair)
        return self._make_request(f"0/public/OHLC?pair={validated_pair}&interval={interval}")

    def get_order_book(self, pair: str, count: int = 100) -> Dict:
        """
        Get order book data (synchronous). Flatten the result to
        remove the top-level pair key.

        Example return structure:
          {
            "bids": [...],
            "asks": [...],
            "last": 1679999999.444
          }
        """
        validated_pair = self.validate_pair_name(pair)
        response = self._make_request(f"0/public/Depth?pair={validated_pair}&count={count}")
        if validated_pair in response:
            return response[validated_pair]
        else:
            logging.error(f"No data returned for validated pair: {validated_pair}")
            return {}

    def get_trade_history(self, pair: str, since: str = None) -> Dict:
        """
        Get recent trades (public, synchronous).
        
        :param pair: Trading pair in either format
        :param since: optional 'since' timestamp or trade ID
        """
        validated_pair = self.validate_pair_name(pair)
        params = {'pair': validated_pair}
        if since:
            params['since'] = since
        return self._make_request("0/public/Trades", params)

    def get_system_status(self) -> Dict:
        """Get system status (synchronous)."""
        return self._make_request("0/public/SystemStatus")

    def get_account_balance(self) -> Dict:
        """Get account balance from private endpoint."""
        return self._make_request("0/private/Balance", public=False)

    def create_order(self, **kwargs) -> Dict:
        """Create a new order (private, synchronous)."""
        # If pair is provided in kwargs, validate and convert it
        if 'pair' in kwargs:
            kwargs['pair'] = self.validate_pair_name(kwargs['pair'])
        return self._make_request("0/private/AddOrder", data=kwargs, public=False)

    def get_open_orders(self) -> Dict:
        """Get open orders (private, synchronous)."""
        return self._make_request("0/private/OpenOrders", public=False)

    def get_closed_orders(self) -> Dict:
        """Get closed orders (private, synchronous)."""
        return self._make_request("0/private/ClosedOrders", public=False)

    def get_trades_history(self) -> Dict:
        """Get trade history (private, synchronous)."""
        return self._make_request("0/private/TradesHistory", public=False)

    def get_open_positions(self) -> Dict:
        """Get open positions (private, synchronous)."""
        return self._make_request("0/private/OpenPositions", public=False)

    def cancel_order(self, txid: str) -> Dict:
        """Cancel open order (private, synchronous)."""
        return self._make_request("0/private/CancelOrder", data={'txid': txid}, public=False)

    def get_websocket_token(self) -> Dict:
        """Get WebSocket authentication token (private, synchronous)."""
        return self._make_request("0/private/GetWebSocketsToken", public=False)

    # ------------------ Async Wrappers ------------------ #
    async def make_request_async(self, uri_path: str, data: dict = None, public: bool = True) -> dict:
        """
        Asynchronous wrapper for _make_request.
        Offloads the blocking call to a thread to prevent freezing the event loop.
        """
        return await asyncio.to_thread(self._make_request, uri_path, data, public)

    async def get_ticker_info_async(self, pairs: List[str]) -> Dict[str, dict]:
        """Async wrapper for get_ticker_info."""
        return await asyncio.to_thread(self.get_ticker_info, pairs)

    async def get_ohlc_data_async(self, pair: str, interval: int = 1) -> Dict:
        """Async wrapper for get_ohlc_data."""
        return await asyncio.to_thread(self.get_ohlc_data, pair, interval)

    async def get_ticker_price_async(self, pair: str) -> Optional[float]:
        """Async wrapper for get_ticker_price."""
        return await asyncio.to_thread(self.get_ticker_price, pair)

    async def get_multiple_ticker_details_async(
        self, pairs: List[str]
    ) -> Dict[str, Dict[str, Optional[float]]]:
        """Async wrapper for get_multiple_ticker_details."""
        return await asyncio.to_thread(self.get_multiple_ticker_details, pairs)


def initialize_components(config: AppConfig, test_mode: bool = False):
    """
    Initialize core application components.
    If test_mode is True, EnhancedKrakenAPI will use its sandbox/test endpoint.
    
    Returns a dict of:
        {
            'db': Database,
            'kraken_api': EnhancedKrakenAPI,
            'websocket': EnhancedWebSocketHandler,
            'risk_manager': RiskManager,
            'portfolio_manager': PortfolioManager,
            'trade_executor': TradeExecutor,
            'monitoring_system': MonitoringSystem
        }
    """
    try:
        # 1) Initialize database
        logging.info("Initializing database...")
        logging.debug(f"Using database path: {config.DB_PATH}")
        db = Database(config.DB_PATH)

        # 2) Initialize Kraken API with credentials from config
        logging.info("Initializing API components...")
        logging.debug(f"test_mode={test_mode}")
        kraken_api = EnhancedKrakenAPI(
            api_key=config.API_KEY,
            api_secret=config.API_SECRET,
            test_mode=test_mode,
            cache_ttl=5  # or any desired TTL in seconds
        )

        # 3) Initialize WebSocket handler
        websocket = EnhancedWebSocketHandler(
            config.WSS_URI,
            config.MAX_RETRIES,
            config.RETRY_DELAY
        )

        # 4) Initialize core components
        logging.info("Initializing core components...")
        risk_manager = RiskManager(config, db)
        portfolio_manager = PortfolioManager(config, db, kraken_api)
        trade_executor = TradeExecutor(kraken_api, risk_manager, db, config)

        # 5) Initialize monitoring
        logging.info("Initializing monitoring system...")
        monitoring_system = MonitoringSystem(
            portfolio_manager,
            risk_manager,
            trade_executor,
            websocket,
            config
        )

        components = {
            'db': db,
            'kraken_api': kraken_api,
            'websocket': websocket,
            'risk_manager': risk_manager,
            'portfolio_manager': portfolio_manager,
            'trade_executor': trade_executor,
            'monitoring_system': monitoring_system
        }

        # Optional: Additional validations
        if not isinstance(kraken_api, EnhancedKrakenAPI):
            raise TypeError("kraken_api must be an instance of EnhancedKrakenAPI.")
        if not isinstance(portfolio_manager, PortfolioManager):
            raise TypeError("portfolio_manager must be an instance of PortfolioManager.")

        return components

    except Exception as e:
        logging.critical("Failed to initialize components", exc_info=True)
        raise


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Example usage (for debugging this file directly):
    dummy_config = AppConfig(
        API_KEY="fake_key",
        API_SECRET="fake_secret",
        DB_PATH="dummy_db.sqlite",
        WSS_URI="wss://ws.kraken.com",
        MAX_RETRIES=5,
        RETRY_DELAY=2,
        DEFAULT_PAIR="XXBTZUSD",
        UPDATE_INTERVAL=10
    )
    
    # 2. Initialize components with or without test_mode
    components = initialize_components(dummy_config, test_mode=True)

    # 3. Example usage of the created kraken_api
    kraken_api = components['kraken_api']
    # Try an official Kraken pair like 'XXBTZUSD' or common notation like 'XBT/USD'
    order_book = kraken_api.get_order_book("XBT/USD", count=10)
    print("Order Book Flattened:", order_book)

    # Example: Use the new ticker methods
    ticker_price = kraken_api.get_ticker_price("XBT/USD")
    print(f"Ticker last price for XBT/USD: {ticker_price}")

    # Example: Get multiple ticker details at once
    details = kraken_api.get_multiple_ticker_details(["XBT/USD", "ETH/USD"])
    print("Multiple Ticker Details:", details)
