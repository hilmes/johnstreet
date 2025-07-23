import logging
import time
import numpy as np
from typing import List, Dict, Optional, Tuple
from collections import deque
from src.core.strategies import TradingStrategy

class RSIDivergenceStrategy(TradingStrategy):
    """
    RSI Divergence Strategy - Identifies divergences between price and RSI momentum
    to detect potential trend reversals.
    """

    def __init__(self, pair: str, config: dict):
        super().__init__(pair, config)
        
        self.pair = pair
        self.rsi_period = config.get('rsi_period', 14)
        self.lookback_period = config.get('lookback_period', 50)
        self.oversold_threshold = config.get('oversold_threshold', 30)
        self.overbought_threshold = config.get('overbought_threshold', 70)
        self.position_size = config.get('position_size', 0.01)
        self.simulate = config.get('simulate', True)
        
        self.kraken_api = config.get('kraken_api')
        if not self.kraken_api:
            raise ValueError("kraken_api instance must be provided in config")
        
        self.price_history = deque(maxlen=self.lookback_period)
        self.rsi_history = deque(maxlen=self.lookback_period)
        self.current_position = None
        self.trades = []

    def calculate_rsi(self) -> Optional[float]:
        """Calculate RSI."""
        if len(self.price_history) < self.rsi_period + 1:
            return None
        
        prices = np.array(list(self.price_history)[-self.rsi_period-1:])
        deltas = np.diff(prices)
        
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        
        avg_gain = np.mean(gains)
        avg_loss = np.mean(losses)
        
        if avg_loss == 0:
            return 100
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi

    def detect_divergence(self) -> Optional[str]:
        """Detect bullish or bearish divergence."""
        if len(self.price_history) < 20 or len(self.rsi_history) < 20:
            return None
        
        # Look for divergence patterns in recent data
        recent_prices = list(self.price_history)[-20:]
        recent_rsi = list(self.rsi_history)[-20:]
        
        # Find local peaks and troughs
        price_trend = recent_prices[-1] - recent_prices[-10]
        rsi_trend = recent_rsi[-1] - recent_rsi[-10]
        
        # Bullish divergence: price making lower lows, RSI making higher lows
        if price_trend < 0 and rsi_trend > 0 and recent_rsi[-1] < self.oversold_threshold:
            return "bullish_divergence"
        
        # Bearish divergence: price making higher highs, RSI making lower highs
        if price_trend > 0 and rsi_trend < 0 and recent_rsi[-1] > self.overbought_threshold:
            return "bearish_divergence"
        
        return None

    def run_once(self) -> Dict:
        """Execute one iteration of the RSI Divergence strategy."""
        try:
            # Fetch current price
            ticker = self.kraken_api.get_ticker_details(self.pair)
            if not ticker or not ticker.get('last'):
                return {"status": "error", "message": "Failed to fetch price data"}
            
            current_price = ticker['last']
            self.price_history.append(current_price)
            
            # Calculate RSI
            rsi = self.calculate_rsi()
            if rsi is None:
                return {
                    "status": "waiting",
                    "message": f"Collecting data: {len(self.price_history)}/{self.rsi_period + 1}"
                }
            
            self.rsi_history.append(rsi)
            
            # Detect divergence
            divergence = self.detect_divergence()
            
            logging.info(
                f"[RSI Divergence] {self.pair} - Price: {current_price:.2f}, "
                f"RSI: {rsi:.1f}, Divergence: {divergence or 'None'}"
            )
            
            # Trading logic
            if divergence == "bullish_divergence" and not self.current_position:
                # Enter long
                if self.simulate:
                    logging.info(f"[SIMULATION] RSI Divergence buy {self.position_size:.6f} @ {current_price:.2f}")
                
                trade = {
                    "action": "entry_long",
                    "side": "buy",
                    "size": self.position_size,
                    "price": current_price,
                    "rsi": rsi,
                    "divergence": divergence,
                    "timestamp": time.time()
                }
                
                self.current_position = "long"
                self.trades.append(trade)
                return {"status": "trade_executed", "trade": trade}
            
            elif divergence == "bearish_divergence" and not self.current_position:
                # Enter short
                if self.simulate:
                    logging.info(f"[SIMULATION] RSI Divergence sell {self.position_size:.6f} @ {current_price:.2f}")
                
                trade = {
                    "action": "entry_short",
                    "side": "sell",
                    "size": self.position_size,
                    "price": current_price,
                    "rsi": rsi,
                    "divergence": divergence,
                    "timestamp": time.time()
                }
                
                self.current_position = "short"
                self.trades.append(trade)
                return {"status": "trade_executed", "trade": trade}
            
            # Exit conditions
            elif self.current_position:
                should_exit = False
                
                if self.current_position == "long" and rsi > 70:
                    should_exit = True
                elif self.current_position == "short" and rsi < 30:
                    should_exit = True
                
                if should_exit:
                    side = "sell" if self.current_position == "long" else "buy"
                    
                    if self.simulate:
                        logging.info(f"[SIMULATION] RSI Divergence {side} {self.position_size:.6f} @ {current_price:.2f}")
                    
                    trade = {
                        "action": f"exit_{self.current_position}",
                        "side": side,
                        "size": self.position_size,
                        "price": current_price,
                        "rsi": rsi,
                        "timestamp": time.time()
                    }
                    
                    self.current_position = None
                    self.trades.append(trade)
                    return {"status": "trade_executed", "trade": trade}
            
            return {
                "status": "monitoring",
                "rsi": rsi,
                "divergence": divergence,
                "position": self.current_position
            }
            
        except Exception as e:
            logging.error(f"Error in RSI Divergence strategy: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}

    def on_candle(self, candle_data: dict = None):
        pass

    def on_tick(self, tick_data: dict):
        pass