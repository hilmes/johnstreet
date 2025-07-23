import logging
import time
import numpy as np
from typing import List, Dict, Optional, Tuple
from collections import deque
from src.core.strategies import TradingStrategy

class PairsTradingStrategy(TradingStrategy):
    """
    Pairs Trading Strategy - A market-neutral strategy that trades the relative
    performance between two correlated assets.
    """

    def __init__(self, pair: str, config: dict):
        super().__init__(pair, config)
        
        self.primary_pair = pair
        self.secondary_pair = config.get('secondary_pair', 'ETH/USD')
        self.lookback_period = config.get('lookback_period', 30)
        self.zscore_entry = config.get('zscore_entry', 2.0)
        self.zscore_exit = config.get('zscore_exit', 0.5)
        self.position_size = config.get('position_size', 0.01)
        self.min_correlation = config.get('min_correlation', 0.7)
        self.simulate = config.get('simulate', True)
        
        self.kraken_api = config.get('kraken_api')
        if not self.kraken_api:
            raise ValueError("kraken_api instance must be provided in config")
        
        self.primary_prices = deque(maxlen=self.lookback_period)
        self.secondary_prices = deque(maxlen=self.lookback_period)
        self.ratio_history = deque(maxlen=self.lookback_period)
        
        self.position_open = False
        self.primary_position = 0
        self.secondary_position = 0
        self.trades = []

    def calculate_correlation(self) -> Optional[float]:
        """Calculate correlation between the two assets."""
        if len(self.primary_prices) < 20 or len(self.secondary_prices) < 20:
            return None
        
        primary_returns = np.diff(np.log(list(self.primary_prices)))
        secondary_returns = np.diff(np.log(list(self.secondary_prices)))
        
        correlation = np.corrcoef(primary_returns, secondary_returns)[0, 1]
        return correlation

    def calculate_zscore(self) -> Optional[float]:
        """Calculate z-score of the price ratio."""
        if len(self.ratio_history) < 20:
            return None
        
        ratios = np.array(self.ratio_history)
        mean_ratio = np.mean(ratios)
        std_ratio = np.std(ratios)
        
        if std_ratio == 0:
            return None
        
        current_ratio = ratios[-1]
        zscore = (current_ratio - mean_ratio) / std_ratio
        
        return zscore

    def run_once(self) -> Dict:
        """Execute one iteration of the pairs trading strategy."""
        try:
            # Fetch prices for both pairs
            primary_ticker = self.kraken_api.get_ticker_details(self.primary_pair)
            secondary_ticker = self.kraken_api.get_ticker_details(self.secondary_pair)
            
            if not primary_ticker or not secondary_ticker:
                return {"status": "error", "message": "Failed to fetch price data"}
            
            primary_price = primary_ticker['last']
            secondary_price = secondary_ticker['last']
            
            self.primary_prices.append(primary_price)
            self.secondary_prices.append(secondary_price)
            
            # Calculate price ratio
            ratio = primary_price / secondary_price
            self.ratio_history.append(ratio)
            
            # Calculate correlation and z-score
            correlation = self.calculate_correlation()
            zscore = self.calculate_zscore()
            
            if correlation is None or zscore is None:
                return {
                    "status": "waiting",
                    "message": f"Collecting data: {len(self.primary_prices)}/{self.lookback_period}"
                }
            
            logging.info(
                f"[Pairs Trading] {self.primary_pair}/{self.secondary_pair} - "
                f"Ratio: {ratio:.3f}, Z-score: {zscore:.2f}, Correlation: {correlation:.3f}"
            )
            
            # Check if correlation is sufficient
            if abs(correlation) < self.min_correlation:
                if self.position_open:
                    # Close position due to correlation breakdown
                    self.close_position(primary_price, secondary_price, "correlation_breakdown")
                return {
                    "status": "monitoring",
                    "message": f"Correlation too low: {correlation:.3f}"
                }
            
            # Check exit conditions
            if self.position_open and abs(zscore) <= self.zscore_exit:
                return self.close_position(primary_price, secondary_price, "mean_reversion")
            
            # Check entry conditions
            elif not self.position_open:
                if zscore >= self.zscore_entry:
                    # Ratio is high - short primary, long secondary
                    return self.open_position(primary_price, secondary_price, "short_spread", zscore)
                
                elif zscore <= -self.zscore_entry:
                    # Ratio is low - long primary, short secondary  
                    return self.open_position(primary_price, secondary_price, "long_spread", zscore)
            
            return {
                "status": "monitoring",
                "zscore": zscore,
                "correlation": correlation,
                "ratio": ratio,
                "position_open": self.position_open
            }
            
        except Exception as e:
            logging.error(f"Error in pairs trading strategy: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}

    def open_position(self, primary_price: float, secondary_price: float, 
                     direction: str, zscore: float) -> Dict:
        """Open a pairs trading position."""
        if direction == "long_spread":
            # Long primary, short secondary
            primary_side = "buy"
            secondary_side = "sell"
            self.primary_position = self.position_size
            self.secondary_position = -self.position_size
        else:  # short_spread
            # Short primary, long secondary
            primary_side = "sell"
            secondary_side = "buy"
            self.primary_position = -self.position_size
            self.secondary_position = self.position_size
        
        if self.simulate:
            logging.info(
                f"[SIMULATION] Pairs {direction}: "
                f"{primary_side} {abs(self.primary_position):.6f} {self.primary_pair} @ {primary_price:.2f}, "
                f"{secondary_side} {abs(self.secondary_position):.6f} {self.secondary_pair} @ {secondary_price:.2f}"
            )
        
        trade = {
            "action": f"open_{direction}",
            "primary_side": primary_side,
            "secondary_side": secondary_side,
            "primary_price": primary_price,
            "secondary_price": secondary_price,
            "zscore": zscore,
            "timestamp": time.time()
        }
        
        self.position_open = True
        self.trades.append(trade)
        
        return {"status": "trade_executed", "trade": trade}

    def close_position(self, primary_price: float, secondary_price: float, reason: str) -> Dict:
        """Close the current pairs trading position."""
        # Reverse the original trades
        if self.primary_position > 0:
            primary_side = "sell"
        else:
            primary_side = "buy"
        
        if self.secondary_position > 0:
            secondary_side = "sell"
        else:
            secondary_side = "buy"
        
        if self.simulate:
            logging.info(
                f"[SIMULATION] Pairs close ({reason}): "
                f"{primary_side} {abs(self.primary_position):.6f} {self.primary_pair} @ {primary_price:.2f}, "
                f"{secondary_side} {abs(self.secondary_position):.6f} {self.secondary_pair} @ {secondary_price:.2f}"
            )
        
        trade = {
            "action": f"close_{reason}",
            "primary_side": primary_side,
            "secondary_side": secondary_side,
            "primary_price": primary_price,
            "secondary_price": secondary_price,
            "timestamp": time.time()
        }
        
        # Reset positions
        self.position_open = False
        self.primary_position = 0
        self.secondary_position = 0
        
        self.trades.append(trade)
        
        return {"status": "trade_executed", "trade": trade}

    def on_candle(self, candle_data: dict = None):
        pass

    def on_tick(self, tick_data: dict):
        pass