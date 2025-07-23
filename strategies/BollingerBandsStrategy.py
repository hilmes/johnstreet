import logging
import time
import numpy as np
from typing import List, Dict, Optional, Tuple
from collections import deque
from src.core.strategies import TradingStrategy

class BollingerBandsStrategy(TradingStrategy):
    """
    Bollinger Bands Strategy - A technical analysis strategy that uses volatility bands
    to identify overbought and oversold conditions.
    
    This strategy:
    1. Calculates a moving average (middle band)
    2. Calculates upper and lower bands using standard deviations
    3. Enters short when price touches upper band (overbought)
    4. Enters long when price touches lower band (oversold)
    5. Uses band width and volatility for position sizing
    """

    def __init__(self, pair: str, config: dict):
        super().__init__(pair, config)
        
        self.pair = pair
        self.period = config.get('period', 20)
        self.std_dev = config.get('std_dev', 2.0)
        self.position_size = config.get('position_size', 0.01)
        self.stop_loss_percent = config.get('stop_loss_percent', 0.02)
        self.take_profit_percent = config.get('take_profit_percent', 0.015)
        self.simulate = config.get('simulate', True)
        
        self.kraken_api = config.get('kraken_api')
        if not self.kraken_api:
            raise ValueError("kraken_api instance must be provided in config")
        
        self.price_history = deque(maxlen=self.period)
        self.current_position = None
        self.entry_price = None
        self.position_type = None
        self.trades = []

    def calculate_bollinger_bands(self) -> Optional[Tuple[float, float, float]]:
        """Calculate Bollinger Bands."""
        if len(self.price_history) < self.period:
            return None
        
        prices = np.array(self.price_history)
        sma = np.mean(prices)
        std = np.std(prices)
        
        upper_band = sma + (self.std_dev * std)
        lower_band = sma - (self.std_dev * std)
        
        return upper_band, sma, lower_band

    def run_once(self) -> Dict:
        """Execute one iteration of the Bollinger Bands strategy."""
        try:
            # Fetch current price
            ticker = self.kraken_api.get_ticker_details(self.pair)
            if not ticker or not ticker.get('last'):
                return {"status": "error", "message": "Failed to fetch price data"}
            
            current_price = ticker['last']
            self.price_history.append(current_price)
            
            # Calculate Bollinger Bands
            bands = self.calculate_bollinger_bands()
            if bands is None:
                return {
                    "status": "waiting",
                    "message": f"Collecting data: {len(self.price_history)}/{self.period}"
                }
            
            upper_band, middle_band, lower_band = bands
            
            # Calculate band position (0 = lower band, 1 = upper band)
            band_position = (current_price - lower_band) / (upper_band - lower_band)
            
            logging.info(
                f"[Bollinger] {self.pair} - Price: {current_price:.2f}, "
                f"Upper: {upper_band:.2f}, Lower: {lower_band:.2f}, Position: {band_position:.2f}"
            )
            
            # Check exit conditions
            if self.current_position:
                should_exit = False
                exit_reason = ""
                
                # Mean reversion exit
                if abs(band_position - 0.5) < 0.1:  # Near middle band
                    should_exit = True
                    exit_reason = "mean_reversion"
                
                # Stop loss / take profit
                elif self.position_type == 'long':
                    pnl_percent = (current_price - self.entry_price) / self.entry_price
                    if pnl_percent <= -self.stop_loss_percent:
                        should_exit = True
                        exit_reason = "stop_loss"
                    elif pnl_percent >= self.take_profit_percent:
                        should_exit = True
                        exit_reason = "take_profit"
                
                elif self.position_type == 'short':
                    pnl_percent = (self.entry_price - current_price) / self.entry_price
                    if pnl_percent <= -self.stop_loss_percent:
                        should_exit = True
                        exit_reason = "stop_loss"
                    elif pnl_percent >= self.take_profit_percent:
                        should_exit = True
                        exit_reason = "take_profit"
                
                if should_exit:
                    # Calculate P&L
                    if self.position_type == 'long':
                        pnl = (current_price - self.entry_price) * self.current_position
                        exit_side = 'sell'
                    else:
                        pnl = (self.entry_price - current_price) * self.current_position
                        exit_side = 'buy'
                    
                    # Execute exit
                    if self.simulate:
                        logging.info(f"[SIMULATION] Bollinger exit {exit_side} {self.current_position:.6f} @ {current_price:.2f}")
                    
                    trade = {
                        "action": f"exit_{exit_reason}",
                        "side": exit_side,
                        "size": self.current_position,
                        "price": current_price,
                        "pnl": pnl,
                        "timestamp": time.time()
                    }
                    
                    # Reset position
                    self.current_position = None
                    self.entry_price = None
                    self.position_type = None
                    
                    self.trades.append(trade)
                    return {"status": "trade_executed", "trade": trade}
            
            # Check entry conditions
            else:
                # Oversold - potential long entry
                if band_position <= 0.05:  # Near lower band
                    side = 'buy'
                    self.position_type = 'long'
                    
                # Overbought - potential short entry
                elif band_position >= 0.95:  # Near upper band
                    side = 'sell'
                    self.position_type = 'short'
                
                else:
                    return {
                        "status": "monitoring",
                        "band_position": band_position,
                        "upper_band": upper_band,
                        "lower_band": lower_band,
                        "current_price": current_price
                    }
                
                # Execute entry
                if self.simulate:
                    logging.info(f"[SIMULATION] Bollinger {side} {self.position_size:.6f} @ {current_price:.2f}")
                
                trade = {
                    "action": f"entry_{self.position_type}",
                    "side": side,
                    "size": self.position_size,
                    "price": current_price,
                    "band_position": band_position,
                    "timestamp": time.time()
                }
                
                self.current_position = self.position_size
                self.entry_price = current_price
                
                self.trades.append(trade)
                return {"status": "trade_executed", "trade": trade}
            
        except Exception as e:
            logging.error(f"Error in Bollinger Bands strategy: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}

    def on_candle(self, candle_data: dict = None):
        pass

    def on_tick(self, tick_data: dict):
        pass