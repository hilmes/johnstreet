import logging
import time
import numpy as np
from typing import List, Dict, Optional, Tuple
from collections import deque
from src.core.strategies import TradingStrategy

class VWAPStrategy(TradingStrategy):
    """
    VWAP (Volume Weighted Average Price) Strategy - Uses VWAP as a benchmark
    for fair value and trades based on price deviations from VWAP.
    """

    def __init__(self, pair: str, config: dict):
        super().__init__(pair, config)
        
        self.pair = pair
        self.vwap_period = config.get('vwap_period', 50)
        self.deviation_threshold = config.get('deviation_threshold', 0.005)  # 0.5%
        self.position_size = config.get('position_size', 0.01)
        self.stop_loss_percent = config.get('stop_loss_percent', 0.02)
        self.simulate = config.get('simulate', True)
        
        self.kraken_api = config.get('kraken_api')
        if not self.kraken_api:
            raise ValueError("kraken_api instance must be provided in config")
        
        self.price_history = deque(maxlen=self.vwap_period)
        self.volume_history = deque(maxlen=self.vwap_period)
        self.current_position = None
        self.entry_price = None
        self.position_type = None
        self.trades = []

    def calculate_vwap(self) -> Optional[float]:
        """Calculate Volume Weighted Average Price."""
        if len(self.price_history) < 10 or len(self.volume_history) < 10:
            return None
        
        prices = np.array(self.price_history)
        volumes = np.array(self.volume_history)
        
        # Avoid division by zero
        total_volume = np.sum(volumes)
        if total_volume == 0:
            return np.mean(prices)
        
        vwap = np.sum(prices * volumes) / total_volume
        return vwap

    def run_once(self) -> Dict:
        """Execute one iteration of the VWAP strategy."""
        try:
            # Fetch current price and volume
            ticker = self.kraken_api.get_ticker_details(self.pair)
            if not ticker or not ticker.get('last'):
                return {"status": "error", "message": "Failed to fetch price data"}
            
            current_price = ticker['last']
            volume = ticker.get('volume_24h', 0)
            
            self.price_history.append(current_price)
            self.volume_history.append(volume)
            
            # Calculate VWAP
            vwap = self.calculate_vwap()
            if vwap is None:
                return {
                    "status": "waiting",
                    "message": f"Collecting data: {len(self.price_history)}/10"
                }
            
            # Calculate deviation from VWAP
            deviation = (current_price - vwap) / vwap
            
            logging.info(
                f"[VWAP] {self.pair} - Price: {current_price:.2f}, "
                f"VWAP: {vwap:.2f}, Deviation: {deviation:.2%}"
            )
            
            # Check exit conditions
            if self.current_position:
                should_exit = False
                exit_reason = ""
                
                # Mean reversion to VWAP
                if abs(deviation) < self.deviation_threshold * 0.3:
                    should_exit = True
                    exit_reason = "vwap_reversion"
                
                # Stop loss
                elif self.position_type == 'long':
                    pnl_percent = (current_price - self.entry_price) / self.entry_price
                    if pnl_percent <= -self.stop_loss_percent:
                        should_exit = True
                        exit_reason = "stop_loss"
                
                elif self.position_type == 'short':
                    pnl_percent = (self.entry_price - current_price) / self.entry_price
                    if pnl_percent <= -self.stop_loss_percent:
                        should_exit = True
                        exit_reason = "stop_loss"
                
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
                        logging.info(f"[SIMULATION] VWAP exit {exit_side} {self.current_position:.6f} @ {current_price:.2f}")
                    
                    trade = {
                        "action": f"exit_{exit_reason}",
                        "side": exit_side,
                        "size": self.current_position,
                        "price": current_price,
                        "vwap": vwap,
                        "deviation": deviation,
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
                # Price significantly below VWAP - potential long
                if deviation <= -self.deviation_threshold:
                    side = 'buy'
                    self.position_type = 'long'
                    
                # Price significantly above VWAP - potential short
                elif deviation >= self.deviation_threshold:
                    side = 'sell'
                    self.position_type = 'short'
                
                else:
                    return {
                        "status": "monitoring",
                        "vwap": vwap,
                        "deviation": deviation,
                        "current_price": current_price
                    }
                
                # Execute entry
                if self.simulate:
                    logging.info(f"[SIMULATION] VWAP {side} {self.position_size:.6f} @ {current_price:.2f}")
                
                trade = {
                    "action": f"entry_{self.position_type}",
                    "side": side,
                    "size": self.position_size,
                    "price": current_price,
                    "vwap": vwap,
                    "deviation": deviation,
                    "timestamp": time.time()
                }
                
                self.current_position = self.position_size
                self.entry_price = current_price
                
                self.trades.append(trade)
                return {"status": "trade_executed", "trade": trade}
            
        except Exception as e:
            logging.error(f"Error in VWAP strategy: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}

    def on_candle(self, candle_data: dict = None):
        pass

    def on_tick(self, tick_data: dict):
        pass