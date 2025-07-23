import logging
import pandas as pd
from typing import Optional, Dict
from src.core.strategies import TradingStrategy

class RangeTradingStrategy(TradingStrategy):
    """
    A mean-reversion (range) trading strategy that:
    1. Fetches OHLC data for the trading pair
    2. Computes rolling min/max over a lookback period
    3. Generates buy signals near support levels
    4. Generates exit signals near resistance levels
    """

    def __init__(self, pair: str, config: dict):
        """
        Initialize the range trading strategy.
        
        :param pair: Trading pair (e.g. "XBT/USD")
        :param config: Configuration dictionary
        """
        super().__init__(pair, config)
        
        # Strategy parameters
        self.pair = pair
        self.lookback = config.get('lookback', 14)
        self.support_threshold = config.get('support_threshold', 0.01)
        self.resistance_threshold = config.get('resistance_threshold', 0.01)
        self.interval = config.get('interval', 60)  # 60 minutes default
        self.trade_quantity = config.get('trade_quantity', 0.001)
        self.simulate = config.get('simulate', True)
        
        # Get Kraken API from config
        self.kraken_api = config.get('kraken_api')
        if not self.kraken_api:
            raise ValueError("kraken_api instance must be provided in config")

    def fetch_and_process_ohlc(self) -> Optional[pd.DataFrame]:
        """
        Fetch and process OHLC data from Kraken.
        
        :return: Processed DataFrame or None on error
        """
        try:
            # Fetch OHLC data
            ohlc_response = self.kraken_api.get_ohlc_data(self.pair, interval=self.interval)
            if not ohlc_response:
                logging.error("No OHLC data returned by Kraken.")
                return None

            # Get validated pair data
            validated_pair = self.kraken_api.validate_pair_name(self.pair)
            ohlc_data = ohlc_response.get(validated_pair, [])
            if not ohlc_data:
                logging.error(f"No OHLC data found for validated pair: {validated_pair}")
                return None

            # Create and process DataFrame
            df = pd.DataFrame(ohlc_data, columns=[
                "time", "open", "high", "low", "close", 
                "vwap", "volume", "trades"
            ])
            
            # Convert numeric columns
            numeric_cols = ["open", "high", "low", "close", "vwap", "volume", "trades"]
            for col in numeric_cols:
                df[col] = pd.to_numeric(df[col], errors='coerce')
                
            # Process time index
            df["time"] = pd.to_datetime(df["time"], unit='s')
            df.set_index("time", inplace=True)
            df.sort_index(inplace=True)

            return df

        except Exception as e:
            logging.error(f"Error processing OHLC data: {e}", exc_info=True)
            return None

    def calculate_range_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate range trading indicators.
        
        :param df: Input DataFrame with OHLC data
        :return: DataFrame with added indicators
        """
        df["rolling_min"] = df["close"].rolling(window=self.lookback).min()
        df["rolling_max"] = df["close"].rolling(window=self.lookback).max()
        return df.dropna()

    def execute_trade(self, order_type: str) -> Optional[Dict]:
        """
        Execute a trade order.
        
        :param order_type: Type of order ('buy' or 'sell')
        :return: Order response or None on error/simulation
        """
        if self.simulate:
            logging.info(f"[SIMULATION] Would place {order_type.upper()} order of {self.trade_quantity}")
            return None

        try:
            order_params = {
                "pair": self.pair,
                "type": order_type,
                "ordertype": "market",
                "volume": str(self.trade_quantity)
            }
            
            order_response = self.kraken_api.create_order(**order_params)
            logging.info(f"Order placed: {order_response}")
            return order_response

        except Exception as e:
            logging.error(f"Error placing {order_type} order: {e}", exc_info=True)
            return None

    def run_once(self) -> Optional[float]:
        """
        Execute one iteration of the range trading strategy.
        
        :return: Current closing price if successful, None on error
        """
        try:
            # 1. Fetch and process OHLC data
            df = self.fetch_and_process_ohlc()
            if df is None or df.empty:
                return None

            # 2. Calculate indicators
            df = self.calculate_range_indicators(df)
            if df.empty:
                logging.error("Not enough data to compute rolling statistics.")
                return None

            # 3. Get latest values
            latest = df.iloc[-1]
            current_close = latest["close"]
            current_min = latest["rolling_min"]
            current_max = latest["rolling_max"]

            # Log current state
            logging.info(f"[Range Strategy] Pair: {self.pair}, Interval: {self.interval}m")
            logging.info(
                f"Current close: {current_close:.2f}, "
                f"RollingMin: {current_min:.2f}, "
                f"RollingMax: {current_max:.2f}"
            )

            # 4. Generate and act on signals
            if current_close <= current_min:
                logging.info("Signal => BUY (price at/near support)")
                self.execute_trade("buy")
                
            elif current_close >= current_max:
                logging.info("Signal => EXIT / SELL (price at/near resistance)")
                self.execute_trade("sell")
                
            else:
                logging.info("No action (price is within the range)")

            return float(current_close)

        except Exception as e:
            logging.error(f"Error in range trading strategy: {e}", exc_info=True)
            return None

    def on_candle(self, candle_data: dict = None):
        """
        Process new candle data.
        
        :param candle_data: New candle data or None to fetch fresh data
        """
        self.run_once()

    def on_tick(self, tick_data: dict):
        """
        Process new tick data (not primary execution method for this strategy).
        
        :param tick_data: New tick data
        """
        pass  # Range trading primarily uses candle data, not ticks

    def run_forever(self, sleep_time: int = 60):
        """
        Run the strategy continuously.
        
        :param sleep_time: Time to sleep between iterations in seconds
        """
        while True:
            self.run_once()
            time.sleep(sleep_time)