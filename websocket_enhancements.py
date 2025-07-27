# websocket_enhancements.py
"""
WebSocket handler enhancements from my_kraken_bot
Integrates with the existing EnhancedWebSocketHandler
"""

import asyncio
import logging
from typing import Optional, Dict, List, Callable
from datetime import datetime
from threading import Thread, Lock

from websocket_handler import EnhancedWebSocketHandler
from kraken_utils import (
    KrakenDataManager, 
    KrakenPairConverter, 
    KrakenWebSocketEnhancer,
    TradingMetricsCalculator
)


class KrakenWebSocketHandlerV2(EnhancedWebSocketHandler):
    """
    Enhanced Kraken WebSocket handler combining features from both projects
    Adds V2 API support and advanced data management
    """
    
    def __init__(self, *args, **kwargs):
        # Support both V1 and V2 WebSocket APIs
        self.api_version = kwargs.pop('api_version', 'v1')
        if self.api_version == 'v2':
            kwargs['wss_uri'] = kwargs.get('wss_uri', 'wss://ws.kraken.com/v2')
        
        super().__init__(*args, **kwargs)
        
        # Add enhanced data management
        self.data_manager = KrakenDataManager()
        self.pair_converter = KrakenPairConverter()
        self.metrics_calculator = TradingMetricsCalculator()
        
        # V2 specific attributes
        self.v2_subscriptions = {}
        self.sequence_numbers = {}
        
        # OHLC-specific tracking
        self.ohlc_subscriptions = {}  # {pair: [intervals]}
        
    async def subscribe_ohlc_multi(self, pairs: List[str], intervals: List[int] = [1, 5, 15]):
        """
        Subscribe to multiple OHLC intervals for multiple pairs
        Feature from my_kraken_bot
        """
        for pair in pairs:
            for interval in intervals:
                msg = KrakenWebSocketEnhancer.create_subscription_message(
                    'ohlc', [pair], interval=interval, snapshot=True
                )
                
                if self.api_version == 'v2':
                    msg['method'] = 'subscribe'
                    msg['params'] = {
                        'channel': 'ohlc',
                        'symbol': [pair],
                        'interval': interval,
                        'snapshot': True
                    }
                    del msg['event']
                    del msg['pair']
                    del msg['subscription']
                
                await self.ensure_connection()
                if self.connected:
                    await self.websocket.send(json.dumps(msg))
                    
                    # Track subscription
                    if pair not in self.ohlc_subscriptions:
                        self.ohlc_subscriptions[pair] = []
                    if interval not in self.ohlc_subscriptions[pair]:
                        self.ohlc_subscriptions[pair].append(interval)
                
                await asyncio.sleep(0.1)  # Rate limiting
    
    async def _handle_message(self, message: str):
        """
        Override to add V2 message handling and enhanced data management
        """
        try:
            data = json.loads(message)
            
            # V2 API message format
            if self.api_version == 'v2' and isinstance(data, dict):
                if 'channel' in data:
                    await self._handle_v2_message(data)
                    return
            
            # V1 API - use parent handler but enhance with data manager
            await super()._handle_message(message)
            
            # Additional processing for OHLC data
            if isinstance(data, list) and len(data) >= 4:
                channel_type, pair, metadata = KrakenWebSocketEnhancer.parse_channel_name(data)
                
                if channel_type == 'ohlc':
                    interval = metadata.get('interval', 1)
                    candle_data = data[1]
                    if isinstance(candle_data, dict):
                        self.data_manager.update_ohlc_data(pair, candle_data, interval)
                        
        except Exception as e:
            self.logger.error(f"Error in enhanced message handler: {e}")
    
    async def _handle_v2_message(self, data: Dict):
        """
        Handle V2 WebSocket API messages
        """
        channel = data.get('channel')
        
        if channel == 'ticker':
            for ticker in data.get('data', []):
                pair = ticker.get('symbol')
                if pair:
                    # Convert V2 ticker format to V1 compatible format
                    v1_ticker = self._convert_v2_ticker(ticker)
                    self._handle_ticker(pair, v1_ticker)
                    
        elif channel == 'ohlc':
            for candle in data.get('data', []):
                pair = candle.get('symbol')
                interval = candle.get('interval', 1)
                if pair:
                    self.data_manager.update_ohlc_data(pair, candle, interval)
                    
        elif channel == 'trade':
            # Handle trades similar to V1
            for trade in data.get('data', []):
                pair = trade.get('symbol')
                if pair:
                    self._handle_trades(pair, [self._convert_v2_trade(trade)])
    
    def _convert_v2_ticker(self, v2_ticker: Dict) -> Dict:
        """
        Convert V2 ticker format to V1 format for compatibility
        """
        return {
            'a': [str(v2_ticker.get('ask', 0)), '', ''],
            'b': [str(v2_ticker.get('bid', 0)), '', ''],
            'c': [str(v2_ticker.get('last', 0)), ''],
            'v': ['', str(v2_ticker.get('volume', 0))],
            'p': ['', str(v2_ticker.get('vwap', 0))],
            't': ['', str(v2_ticker.get('trades', 0))],
            'l': ['', str(v2_ticker.get('low', 0))],
            'h': ['', str(v2_ticker.get('high', 0))],
            'o': str(v2_ticker.get('open', 0))
        }
    
    def _convert_v2_trade(self, v2_trade: Dict) -> List:
        """
        Convert V2 trade format to V1 format
        """
        return [
            str(v2_trade.get('price', 0)),
            str(v2_trade.get('qty', 0)),
            str(v2_trade.get('time', 0)),
            'b' if v2_trade.get('side') == 'buy' else 's',
            'l' if v2_trade.get('type') == 'limit' else 'm',
            ''
        ]
    
    def get_technical_indicators(self, pair: str, interval: int = 1) -> Dict:
        """
        Get technical indicators for a pair
        Convenience method using the data manager
        """
        return self.data_manager.calculate_indicators(pair, interval)
    
    def get_ohlc_dataframe(self, pair: str, interval: int = 1, 
                          lookback: Optional[int] = None) -> 'pd.DataFrame':
        """
        Get OHLC data as a pandas DataFrame
        """
        return self.data_manager.get_ohlc_data(pair, interval, lookback)
    
    def calculate_position_metrics(self, position: Dict, current_price: float) -> Dict:
        """
        Calculate metrics for a position
        """
        return self.metrics_calculator.calculate_pnl(
            entry_price=position['entry_price'],
            current_price=current_price,
            quantity=position['quantity'],
            side=position['side']
        )
    
    async def get_market_snapshot(self, pairs: List[str]) -> Dict:
        """
        Get a complete market snapshot for multiple pairs
        Includes ticker data, indicators, and recent trades
        """
        snapshot = {}
        
        for pair in pairs:
            ticker = self.get_ticker_data([pair]).get(pair, {})
            indicators = self.get_technical_indicators(pair)
            
            snapshot[pair] = {
                'ticker': ticker,
                'indicators': indicators,
                'timestamp': datetime.now().isoformat()
            }
            
            # Add recent trades if available
            if pair in self._trades_data:
                recent_trades = self._trades_data[pair][-10:]  # Last 10 trades
                snapshot[pair]['recent_trades'] = recent_trades
        
        return snapshot


class ThreadedWebSocketManager:
    """
    Thread-based WebSocket manager from my_kraken_bot
    Useful for non-async contexts
    """
    
    def __init__(self, handler: KrakenWebSocketHandlerV2):
        self.handler = handler
        self.loop = None
        self.thread = None
        self._lock = Lock()
        self._running = False
        
    def start(self):
        """Start WebSocket in a separate thread"""
        if self._running:
            return
            
        self._running = True
        self.thread = Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        
        # Wait for the handler to be ready
        import time
        timeout = 10
        start = time.time()
        while not self.handler.connected and time.time() - start < timeout:
            time.sleep(0.1)
            
    def _run_loop(self):
        """Run the asyncio event loop in the thread"""
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        
        try:
            self.loop.run_until_complete(self.handler.start())
            # Keep the loop running
            self.loop.run_forever()
        except Exception as e:
            logging.error(f"Error in WebSocket thread: {e}")
        finally:
            self.loop.close()
            
    def stop(self):
        """Stop the WebSocket thread"""
        if not self._running:
            return
            
        self._running = False
        
        # Schedule handler close
        if self.loop and self.handler:
            asyncio.run_coroutine_threadsafe(
                self.handler.close(), 
                self.loop
            )
        
        # Stop the event loop
        if self.loop:
            self.loop.call_soon_threadsafe(self.loop.stop)
            
        # Wait for thread to finish
        if self.thread:
            self.thread.join(timeout=5)
            
    def get_ticker_data(self, pairs: List[str] = None) -> Dict:
        """Thread-safe ticker data access"""
        with self._lock:
            return self.handler.get_ticker_data(pairs)
            
    def get_indicators(self, pair: str, interval: int = 1) -> Dict:
        """Thread-safe indicator access"""
        with self._lock:
            return self.handler.get_technical_indicators(pair, interval)


# Example usage function
def create_enhanced_websocket_handler(
    api_version: str = 'v1',
    portfolio_manager=None,
    logger=None
) -> KrakenWebSocketHandlerV2:
    """
    Factory function to create enhanced WebSocket handler
    """
    handler = KrakenWebSocketHandlerV2(
        api_version=api_version,
        portfolio_manager=portfolio_manager,
        logger=logger
    )
    
    return handler