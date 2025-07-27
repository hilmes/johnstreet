# kraken_utils.py
"""
Kraken-specific utilities extracted from my_kraken_bot
Provides additional functionality for the johnstreet project
"""

import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class KrakenDataManager:
    """
    Enhanced data management for Kraken WebSocket data
    Extracted from my_kraken_bot with improvements
    """
    
    def __init__(self):
        # OHLC data storage with pandas for efficient time series operations
        self.ohlc_data = {}  # Dict[pair, DataFrame]
        self.ohlc_interval_map = {
            1: '1m',
            5: '5m',
            15: '15m',
            30: '30m',
            60: '1h',
            240: '4h',
            1440: '1d',
            10080: '1w'
        }
        
    def update_ohlc_data(self, pair: str, candle: dict, interval: int = 1) -> pd.DataFrame:
        """
        Update OHLC data with intelligent DataFrame management
        Maintains sorted time series data with efficient updates
        """
        try:
            candle_time = datetime.utcfromtimestamp(float(candle["time"]))
            new_row = {
                "time": candle_time,
                "open": float(candle["open"]),
                "high": float(candle["high"]),
                "low": float(candle["low"]),
                "close": float(candle["close"]),
                "volume": float(candle["volume"]),
                "trades": int(candle.get("count", 0))
            }
            
            key = f"{pair}:{interval}"
            
            # Initialize DataFrame if needed
            if key not in self.ohlc_data:
                self.ohlc_data[key] = pd.DataFrame(
                    columns=["time", "open", "high", "low", "close", "volume", "trades"]
                )
                self.ohlc_data[key].set_index("time", inplace=True)
            
            df = self.ohlc_data[key]
            
            # Update or append the row
            if candle_time in df.index:
                # Update existing candle
                df.loc[candle_time] = [
                    new_row["open"], new_row["high"], new_row["low"],
                    new_row["close"], new_row["volume"], new_row["trades"]
                ]
            else:
                # Append new candle
                new_df_row = pd.DataFrame([new_row]).set_index("time")
                df = pd.concat([df, new_df_row])
                df.sort_index(inplace=True)
                
                # Keep only last 10000 candles for memory efficiency
                if len(df) > 10000:
                    df = df.iloc[-10000:]
                
                self.ohlc_data[key] = df
            
            return df
            
        except Exception as e:
            logger.error(f"Error updating OHLC data for {pair}: {e}")
            return pd.DataFrame()
    
    def get_ohlc_data(self, pair: str, interval: int = 1, 
                      lookback_periods: Optional[int] = None) -> pd.DataFrame:
        """
        Get OHLC data with optional lookback
        """
        key = f"{pair}:{interval}"
        if key not in self.ohlc_data:
            return pd.DataFrame()
        
        df = self.ohlc_data[key].copy()
        if lookback_periods and len(df) > lookback_periods:
            return df.iloc[-lookback_periods:]
        return df
    
    def calculate_indicators(self, pair: str, interval: int = 1) -> Dict:
        """
        Calculate common technical indicators for a pair
        Returns dict with SMA, EMA, RSI, MACD, etc.
        """
        df = self.get_ohlc_data(pair, interval, lookback_periods=500)
        if df.empty or len(df) < 20:
            return {}
        
        indicators = {}
        close_prices = df['close']
        
        try:
            # Simple Moving Averages
            indicators['sma_20'] = close_prices.rolling(window=20).mean().iloc[-1]
            indicators['sma_50'] = close_prices.rolling(window=50).mean().iloc[-1] if len(df) >= 50 else None
            indicators['sma_200'] = close_prices.rolling(window=200).mean().iloc[-1] if len(df) >= 200 else None
            
            # Exponential Moving Averages
            indicators['ema_12'] = close_prices.ewm(span=12, adjust=False).mean().iloc[-1]
            indicators['ema_26'] = close_prices.ewm(span=26, adjust=False).mean().iloc[-1]
            
            # MACD
            ema_12 = close_prices.ewm(span=12, adjust=False).mean()
            ema_26 = close_prices.ewm(span=26, adjust=False).mean()
            macd_line = ema_12 - ema_26
            signal_line = macd_line.ewm(span=9, adjust=False).mean()
            indicators['macd'] = macd_line.iloc[-1]
            indicators['macd_signal'] = signal_line.iloc[-1]
            indicators['macd_histogram'] = indicators['macd'] - indicators['macd_signal']
            
            # RSI
            delta = close_prices.diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            indicators['rsi'] = 100 - (100 / (1 + rs)).iloc[-1]
            
            # Bollinger Bands
            sma_20 = close_prices.rolling(window=20).mean()
            std_20 = close_prices.rolling(window=20).std()
            indicators['bb_upper'] = (sma_20 + 2 * std_20).iloc[-1]
            indicators['bb_middle'] = sma_20.iloc[-1]
            indicators['bb_lower'] = (sma_20 - 2 * std_20).iloc[-1]
            
            # Volume indicators
            indicators['volume_sma'] = df['volume'].rolling(window=20).mean().iloc[-1]
            indicators['volume_ratio'] = df['volume'].iloc[-1] / indicators['volume_sma'] if indicators['volume_sma'] > 0 else 0
            
        except Exception as e:
            logger.error(f"Error calculating indicators for {pair}: {e}")
        
        return indicators


class KrakenPairConverter:
    """
    Utility for converting between different Kraken pair formats
    """
    
    # Common base/quote mappings
    BASE_MAPPINGS = {
        'XBT': 'BTC',
        'XDG': 'DOGE',
        'XLM': 'STR',
        'XRP': 'XRP',
        'ETH': 'ETH',
        'ADA': 'ADA',
        'SOL': 'SOL'
    }
    
    QUOTE_MAPPINGS = {
        'ZUSD': 'USD',
        'ZEUR': 'EUR',
        'ZGBP': 'GBP',
        'ZCAD': 'CAD',
        'ZJPY': 'JPY',
        'USDT': 'USDT',
        'USDC': 'USDC'
    }
    
    @classmethod
    def rest_to_ws(cls, rest_pair: str) -> str:
        """
        Convert REST API format to WebSocket format
        e.g., 'XXBTZUSD' -> 'XBT/USD'
        """
        try:
            # Remove leading X if present
            if rest_pair.startswith('X') and len(rest_pair) > 6:
                rest_pair = rest_pair[1:]
            
            # Try to parse the pair
            for quote_len in [4, 3]:  # Try 4-char quotes first (ZUSD), then 3-char (USD)
                if len(rest_pair) >= quote_len:
                    potential_quote = rest_pair[-quote_len:]
                    potential_base = rest_pair[:-quote_len]
                    
                    # Check if this is a valid quote
                    if potential_quote in cls.QUOTE_MAPPINGS:
                        base = cls.BASE_MAPPINGS.get(potential_base, potential_base)
                        quote = cls.QUOTE_MAPPINGS.get(potential_quote, potential_quote)
                        return f"{base}/{quote}"
                    elif potential_quote in ['USD', 'EUR', 'GBP', 'CAD', 'JPY', 'USDT', 'USDC']:
                        base = cls.BASE_MAPPINGS.get(potential_base, potential_base)
                        return f"{base}/{potential_quote}"
            
            # Fallback: assume standard 3/3 split
            if len(rest_pair) >= 6:
                base = rest_pair[:3]
                quote = rest_pair[3:]
                return f"{base}/{quote}"
                
            return rest_pair  # Return as-is if parsing fails
            
        except Exception as e:
            logger.error(f"Error converting pair {rest_pair}: {e}")
            return rest_pair
    
    @classmethod
    def ws_to_rest(cls, ws_pair: str) -> str:
        """
        Convert WebSocket format to REST API format
        e.g., 'XBT/USD' -> 'XXBTZUSD'
        """
        try:
            if '/' in ws_pair:
                base, quote = ws_pair.split('/')
                
                # Reverse mappings
                rest_base = base
                for k, v in cls.BASE_MAPPINGS.items():
                    if v == base:
                        rest_base = k
                        break
                
                rest_quote = quote
                for k, v in cls.QUOTE_MAPPINGS.items():
                    if v == quote:
                        rest_quote = k
                        break
                
                # Add X prefix for certain bases
                if rest_base in ['XBT', 'ETH', 'XRP', 'LTC', 'XLM', 'XDG']:
                    rest_base = 'X' + rest_base
                
                return rest_base + rest_quote
            
            return ws_pair
            
        except Exception as e:
            logger.error(f"Error converting pair {ws_pair}: {e}")
            return ws_pair


class KrakenWebSocketEnhancer:
    """
    Enhancements for the existing WebSocket handler
    Adds features from my_kraken_bot
    """
    
    @staticmethod
    def create_subscription_message(channel: str, pairs: List[str], 
                                   interval: Optional[int] = None,
                                   depth: Optional[int] = None,
                                   snapshot: bool = True) -> dict:
        """
        Create properly formatted subscription messages for various channels
        """
        msg = {
            "event": "subscribe",
            "pair": pairs,
            "subscription": {"name": channel}
        }
        
        # Channel-specific parameters
        if channel == "ohlc" and interval:
            msg["subscription"]["interval"] = interval
        elif channel == "book" and depth:
            msg["subscription"]["depth"] = depth
        
        # Add snapshot for orderbook
        if channel == "book" and snapshot:
            msg["subscription"]["snapshot"] = True
            
        return msg
    
    @staticmethod
    def parse_channel_name(data: List) -> Tuple[str, str, Dict]:
        """
        Parse channel name and extract metadata
        Returns: (channel_type, pair, metadata)
        """
        if len(data) < 4:
            return None, None, {}
        
        channel_raw = data[2]
        pair = data[3]
        
        # Parse channel type and metadata
        if "-" in channel_raw:
            parts = channel_raw.split("-")
            channel_type = parts[0]
            metadata = {}
            
            if channel_type == "ohlc":
                metadata["interval"] = int(parts[1]) if len(parts) > 1 else 1
            elif channel_type == "book":
                metadata["depth"] = int(parts[1]) if len(parts) > 1 else 10
                
            return channel_type, pair, metadata
        
        return channel_raw, pair, {}


class TradingMetricsCalculator:
    """
    Calculate trading metrics and statistics
    Useful for dashboard displays
    """
    
    @staticmethod
    def calculate_pnl(entry_price: float, current_price: float, 
                      quantity: float, side: str = 'buy') -> Dict:
        """
        Calculate P&L for a position
        """
        if side == 'buy':
            pnl = (current_price - entry_price) * quantity
            pnl_percent = ((current_price - entry_price) / entry_price) * 100
        else:  # sell/short
            pnl = (entry_price - current_price) * quantity
            pnl_percent = ((entry_price - current_price) / entry_price) * 100
        
        return {
            'pnl': pnl,
            'pnl_percent': pnl_percent,
            'current_value': current_price * quantity
        }
    
    @staticmethod
    def calculate_order_size(balance: float, price: float, 
                           risk_percent: float = 1.0,
                           leverage: float = 1.0) -> Dict:
        """
        Calculate order size based on risk management rules
        """
        risk_amount = balance * (risk_percent / 100)
        base_size = risk_amount / price
        leveraged_size = base_size * leverage
        
        return {
            'base_size': base_size,
            'leveraged_size': leveraged_size,
            'risk_amount': risk_amount,
            'total_exposure': leveraged_size * price
        }
    
    @staticmethod
    def calculate_risk_metrics(trades: List[Dict]) -> Dict:
        """
        Calculate risk metrics from trade history
        """
        if not trades:
            return {}
        
        profits = [t['pnl'] for t in trades if t.get('pnl', 0) > 0]
        losses = [t['pnl'] for t in trades if t.get('pnl', 0) < 0]
        
        total_trades = len(trades)
        winning_trades = len(profits)
        losing_trades = len(losses)
        
        win_rate = (winning_trades / total_trades) * 100 if total_trades > 0 else 0
        
        avg_win = sum(profits) / len(profits) if profits else 0
        avg_loss = abs(sum(losses) / len(losses)) if losses else 0
        
        profit_factor = (sum(profits) / abs(sum(losses))) if losses else float('inf')
        
        return {
            'total_trades': total_trades,
            'winning_trades': winning_trades,
            'losing_trades': losing_trades,
            'win_rate': win_rate,
            'average_win': avg_win,
            'average_loss': avg_loss,
            'profit_factor': profit_factor,
            'total_pnl': sum(profits) + sum(losses)
        }