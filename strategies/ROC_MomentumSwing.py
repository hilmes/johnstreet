import os
import time
import ccxt
import pandas as pd
import numpy as np
from dotenv import load_dotenv

from src.core.strategies import TradingStrategy

# --------------------------------------------------
# Load ENV Variables
# --------------------------------------------------
load_dotenv()
API_KEY = os.getenv("KRAKEN_API_KEY")
API_SECRET = os.getenv("KRAKEN_API_SECRET")

# --------------------------------------------------
# Configuration
# --------------------------------------------------
"""
DISCLAIMER:
This script is for educational purposes only and
does not constitute financial or investment advice.
Trading cryptocurrencies is highly speculative and
risky; you can lose all your money.
"""

class ROC_MomentumSwing(TradingStrategy):
    """
    A strategy class for rate-of-change (ROC) momentum swings using Kraken via ccxt.

    Usage (pseudo-code in your Textual or other manager):
        strategy = ROC_MomentumSwing("BTC/USD", config_dict)
        strategy.on_candle()  # or however you feed data
    """

    # Default parameters (could also read them from config)
    TRADING_PAIR = 'BTC/USD'
    TIMEFRAME = '15m'
    LOOKBACK_CANDLES = 100
    MOMENTUM_PERIOD = 10
    UPPER_MOMENTUM_THRESHOLD = 2.0
    LOWER_MOMENTUM_THRESHOLD = -2.0
    TRADE_AMOUNT = 0.001
    USE_STOP_LOSS = True
    STOP_LOSS_PERCENTAGE = 2.0

    def __init__(self, pair: str, config: dict):
        """
        :param pair: Trading pair, e.g. "BTC/USD"
        :param config: Additional config dict from your app
        """
        super().__init__(pair, config)

        # Override defaults if provided in config
        self.TRADING_PAIR = pair or self.TRADING_PAIR
        self.TIMEFRAME = config.get("timeframe", self.TIMEFRAME)
        self.LOOKBACK_CANDLES = config.get("lookback_candles", self.LOOKBACK_CANDLES)
        self.MOMENTUM_PERIOD = config.get("momentum_period", self.MOMENTUM_PERIOD)
        self.UPPER_MOMENTUM_THRESHOLD = config.get("upper_momentum_threshold", self.UPPER_MOMENTUM_THRESHOLD)
        self.LOWER_MOMENTUM_THRESHOLD = config.get("lower_momentum_threshold", self.LOWER_MOMENTUM_THRESHOLD)
        self.TRADE_AMOUNT = config.get("trade_amount", self.TRADE_AMOUNT)
        self.USE_STOP_LOSS = config.get("use_stop_loss", self.USE_STOP_LOSS)
        self.STOP_LOSS_PERCENTAGE = config.get("stop_loss_percentage", self.STOP_LOSS_PERCENTAGE)

        # Initialize ccxt exchange
        self.exchange = ccxt.kraken({
            'apiKey': API_KEY,
            'secret': API_SECRET,
            'enableRateLimit': True
        })

        # Track current position and entry price in memory
        self.current_position = 'flat'
        self.entry_price = None

    # --------------------------------------------------
    # Core Methods
    # --------------------------------------------------
    def fetch_ohlcv(self, symbol: str, timeframe: str, limit: int = 100) -> pd.DataFrame:
        """
        Fetch OHLCV data from Kraken using ccxt. Returns a pandas DataFrame.
        """
        data = self.exchange.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)
        df = pd.DataFrame(data, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        return df

    def calculate_roc(self, df: pd.DataFrame, period: int) -> pd.DataFrame:
        """
        Calculate Rate of Change (ROC).
        ROC = [(Close_t - Close_(t-period)) / Close_(t-period)] * 100
        """
        df['roc'] = ((df['close'] - df['close'].shift(period)) / df['close'].shift(period)) * 100
        return df

    def place_market_buy(self, symbol: str, amount: float):
        """
        Places a market buy order on Kraken.
        """
        try:
            print(f"Placing market BUY order for {amount} {symbol}...")
            order = self.exchange.create_market_buy_order(symbol, amount)
            print("Order placed:", order)
            return order
        except Exception as e:
            print("Error placing market BUY order:", e)
            return None

    def place_market_sell(self, symbol: str, amount: float):
        """
        Places a market sell order on Kraken.
        """
        try:
            print(f"Placing market SELL order for {amount} {symbol}...")
            order = self.exchange.create_market_sell_order(symbol, amount)
            print("Order placed:", order)
            return order
        except Exception as e:
            print("Error placing market SELL order:", e)
            return None

    def set_stop_loss(self, order_price: float, is_long: bool = True):
        """
        Pseudocode for setting a stop-loss order. In a real environment,
        you'd place a conditional order with your broker/exchange.
        """
        if is_long:
            stop_loss_price = order_price * (1 - self.STOP_LOSS_PERCENTAGE / 100)
            print(f"[Mock] Setting stop-loss at {stop_loss_price:.2f} (LONG position).")
        else:
            stop_loss_price = order_price * (1 + self.STOP_LOSS_PERCENTAGE / 100)
            print(f"[Mock] Setting stop-loss at {stop_loss_price:.2f} (SHORT position).")

    # --------------------------------------------------
    # Strategy Lifecycle
    # --------------------------------------------------
    def on_candle(self, candle_data: dict = None):
        """
        Example method to be called whenever a new candle arrives.
        You might integrate this with your TUI event loop or 
        a scheduled job that fetches the latest data.
        
        :param candle_data: (Optional) A new candle, or None to refetch data.
        """
        try:
            # 1. Fetch the latest OHLCV data from the exchange
            df = self.fetch_ohlcv(self.TRADING_PAIR, self.TIMEFRAME, limit=self.LOOKBACK_CANDLES)

            # 2. Calculate Rate of Change (ROC)
            df = self.calculate_roc(df, period=self.MOMENTUM_PERIOD)

            # 3. Get the latest ROC value and price
            recent_roc = df['roc'].iloc[-1]
            last_close = df['close'].iloc[-1]

            # 4. Determine signal
            if recent_roc > self.UPPER_MOMENTUM_THRESHOLD:
                signal = 'bullish'
            elif recent_roc < self.LOWER_MOMENTUM_THRESHOLD:
                signal = 'bearish'
            else:
                signal = 'neutral'

            # 5. Check current position & place trades
            if self.current_position == 'flat':
                if signal == 'bullish':
                    buy_order = self.place_market_buy(self.TRADING_PAIR, self.TRADE_AMOUNT)
                    if buy_order:
                        self.current_position = 'long'
                        self.entry_price = last_close
                        if self.USE_STOP_LOSS:
                            self.set_stop_loss(self.entry_price, is_long=True)
                elif signal == 'bearish':
                    # Spot shorting might require margin/futures. If not available, do nothing.
                    print("Bearish signal, but (spot) shorting may not be supported. Doing nothing.")

            elif self.current_position == 'long':
                # If we are long and a bearish signal emerges, close the long.
                if signal == 'bearish':
                    sell_order = self.place_market_sell(self.TRADING_PAIR, self.TRADE_AMOUNT)
                    if sell_order:
                        self.current_position = 'flat'
                        self.entry_price = None
                    # If margin/futures is available, you could open a short here.
            
            # Additional logic for short positions goes here if margin/futures is used.

        except Exception as e:
            print("[ERROR] on_candle encountered an error:", e)

    def on_tick(self, tick_data: dict):
        """
        If your app streams real-time ticks, you can integrate them here.
        For demonstration, we simply call on_candle() once a new candle forms.
        """
        pass  # For the moment, do nothing—or call self.on_candle() if you want.

    def run_once(self):
        """
        Example method to run the strategy logic one time, 
        e.g., from a scheduler or an external loop.
        """
        self.on_candle()

    def run_forever(self, sleep_time: int = 60):
        """
        (Optional) Indefinite loop for a standalone script approach. 
        Caution: This blocks the thread and won't play nicely with 
        asynchronous frameworks or Textual TUI unless run in a separate thread.
        """
        while True:
            self.run_once()
            time.sleep(sleep_time)
