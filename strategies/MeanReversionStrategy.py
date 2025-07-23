import logging
import time
import numpy as np
from typing import List, Dict, Optional, Tuple
from collections import deque
from src.core.strategies import TradingStrategy

class MeanReversionStrategy(TradingStrategy):
    """
    Mean Reversion Strategy - A quantitative trading strategy that profits from 
    price movements reverting to their historical average.
    
    This strategy:
    1. Calculates a moving average (mean) of recent prices
    2. Measures standard deviations to find oversold/overbought conditions
    3. Enters long when price is significantly below mean (oversold)
    4. Enters short when price is significantly above mean (overbought)
    5. Exits when price reverts to mean or hits stop loss
    
    Best suited for ranging markets and highly liquid pairs.
    """

    def __init__(self, pair: str, config: dict):
        """
        Initialize the Mean Reversion strategy.
        
        :param pair: Trading pair (e.g. "XBT/USD")
        :param config: Configuration dictionary
        """
        super().__init__(pair, config)
        
        # Strategy parameters
        self.pair = pair
        self.lookback_period = config.get('lookback_period', 20)
        self.entry_threshold = config.get('entry_threshold', 2.0)  # Standard deviations
        self.exit_threshold = config.get('exit_threshold', 0.5)   # Standard deviations
        self.position_size = config.get('position_size', 0.01)
        self.max_position_value = config.get('max_position_value', 10000)
        self.stop_loss_percent = config.get('stop_loss_percent', 0.02)
        self.take_profit_percent = config.get('take_profit_percent', 0.015)
        self.min_volume_filter = config.get('min_volume_filter', 100000)
        self.simulate = config.get('simulate', True)
        
        # Get Kraken API from config
        self.kraken_api = config.get('kraken_api')
        if not self.kraken_api:
            raise ValueError("kraken_api instance must be provided in config")
        
        # Data storage
        self.price_history = deque(maxlen=self.lookback_period)
        self.volume_history = deque(maxlen=self.lookback_period)
        
        # Position tracking
        self.current_position = None
        self.entry_price = None
        self.position_type = None  # 'long' or 'short'
        
        # Performance tracking
        self.trades = []
        self.pnl = 0.0

    def calculate_statistics(self) -> Optional[Tuple[float, float, float]]:
        """
        Calculate mean, standard deviation, and z-score of price history.
        
        :return: Tuple of (mean, std_dev, z_score) or None if insufficient data
        """
        if len(self.price_history) < self.lookback_period:
            logging.info(f"Insufficient data: {len(self.price_history)}/{self.lookback_period}")
            return None
        
        prices = np.array(self.price_history)
        mean = np.mean(prices)
        std_dev = np.std(prices)
        
        if std_dev == 0:
            logging.warning("Zero standard deviation detected")
            return None
        
        current_price = prices[-1]
        z_score = (current_price - mean) / std_dev
        
        return mean, std_dev, z_score

    def check_volume_filter(self) -> bool:
        """
        Check if recent volume meets minimum requirements.
        
        :return: True if volume is sufficient, False otherwise
        """
        if len(self.volume_history) == 0:
            return False
        
        avg_volume = np.mean(self.volume_history)
        return avg_volume >= self.min_volume_filter

    def calculate_position_size(self, current_price: float) -> float:
        """
        Calculate position size based on risk parameters.
        
        :param current_price: Current market price
        :return: Position size to trade
        """
        # Calculate position value
        position_value = min(
            self.position_size * current_price,
            self.max_position_value
        )
        
        # Convert back to position size
        return position_value / current_price

    def should_enter_long(self, z_score: float) -> bool:
        """
        Check if conditions are met for entering a long position.
        
        :param z_score: Current z-score
        :return: True if should enter long
        """
        return (
            z_score <= -self.entry_threshold and
            self.current_position is None and
            self.check_volume_filter()
        )

    def should_enter_short(self, z_score: float) -> bool:
        """
        Check if conditions are met for entering a short position.
        
        :param z_score: Current z-score
        :return: True if should enter short
        """
        return (
            z_score >= self.entry_threshold and
            self.current_position is None and
            self.check_volume_filter()
        )

    def should_exit_position(self, z_score: float, current_price: float) -> bool:
        """
        Check if current position should be closed.
        
        :param z_score: Current z-score
        :param current_price: Current market price
        :return: True if should exit position
        """
        if self.current_position is None:
            return False
        
        # Check mean reversion exit
        if abs(z_score) <= self.exit_threshold:
            logging.info(f"Mean reversion exit triggered: z-score = {z_score:.2f}")
            return True
        
        # Check stop loss
        if self.position_type == 'long':
            pnl_percent = (current_price - self.entry_price) / self.entry_price
            if pnl_percent <= -self.stop_loss_percent:
                logging.info(f"Stop loss triggered: {pnl_percent:.2%}")
                return True
            if pnl_percent >= self.take_profit_percent:
                logging.info(f"Take profit triggered: {pnl_percent:.2%}")
                return True
        
        elif self.position_type == 'short':
            pnl_percent = (self.entry_price - current_price) / self.entry_price
            if pnl_percent <= -self.stop_loss_percent:
                logging.info(f"Stop loss triggered: {pnl_percent:.2%}")
                return True
            if pnl_percent >= self.take_profit_percent:
                logging.info(f"Take profit triggered: {pnl_percent:.2%}")
                return True
        
        return False

    def execute_trade(self, side: str, size: float, price: float) -> Dict:
        """
        Execute a trade (simulated or real).
        
        :param side: 'buy' or 'sell'
        :param size: Position size
        :param price: Limit price
        :return: Trade result dictionary
        """
        order_params = {
            "pair": self.pair,
            "type": side,
            "ordertype": "limit",
            "price": str(price),
            "volume": str(size)
        }
        
        if self.simulate:
            logging.info(
                f"[SIMULATION] Mean Reversion {side} {size:.6f} @ {price:.2f}"
            )
            return {
                **order_params,
                "status": "simulated",
                "timestamp": time.time()
            }
        else:
            logging.info(f"Executing REAL {side} order: {size:.6f} @ {price:.2f}")
            try:
                response = self.kraken_api.create_order(**order_params)
                return {
                    **order_params,
                    "status": "submitted",
                    "exchange_response": response,
                    "timestamp": time.time()
                }
            except Exception as e:
                logging.error(f"Error executing trade: {e}")
                return {
                    **order_params,
                    "status": "failed",
                    "error": str(e),
                    "timestamp": time.time()
                }

    def update_price_data(self) -> Optional[float]:
        """
        Fetch and update price and volume data.
        
        :return: Current price or None on error
        """
        try:
            ticker = self.kraken_api.get_ticker_details(self.pair)
            if ticker and ticker.get('last'):
                current_price = ticker['last']
                volume = ticker.get('volume_24h', 0)
                
                self.price_history.append(current_price)
                self.volume_history.append(volume)
                
                return current_price
        except Exception as e:
            logging.error(f"Error fetching price data: {e}")
        
        return None

    def run_once(self) -> Dict:
        """
        Execute one iteration of the mean reversion strategy.
        
        :return: Dictionary with strategy status and any trades executed
        """
        try:
            # Update price data
            current_price = self.update_price_data()
            if current_price is None:
                return {"status": "error", "message": "Failed to fetch price data"}
            
            # Calculate statistics
            stats = self.calculate_statistics()
            if stats is None:
                return {
                    "status": "waiting",
                    "message": f"Collecting data: {len(self.price_history)}/{self.lookback_period}"
                }
            
            mean, std_dev, z_score = stats
            
            logging.info(
                f"[Mean Reversion] {self.pair} - Price: {current_price:.2f}, "
                f"Mean: {mean:.2f}, Z-score: {z_score:.2f}"
            )
            
            # Check for exit conditions first
            if self.should_exit_position(z_score, current_price):
                # Calculate P&L
                if self.position_type == 'long':
                    pnl = (current_price - self.entry_price) * self.current_position
                    exit_side = 'sell'
                else:
                    pnl = (self.entry_price - current_price) * self.current_position
                    exit_side = 'buy'
                
                self.pnl += pnl
                
                # Execute exit trade
                trade = self.execute_trade(exit_side, self.current_position, current_price)
                trade['action'] = 'exit'
                trade['pnl'] = pnl
                
                # Reset position
                self.current_position = None
                self.entry_price = None
                self.position_type = None
                
                self.trades.append(trade)
                return {
                    "status": "trade_executed",
                    "trade": trade,
                    "total_pnl": self.pnl
                }
            
            # Check for entry conditions
            elif self.should_enter_long(z_score):
                position_size = self.calculate_position_size(current_price)
                
                # Execute entry trade
                trade = self.execute_trade('buy', position_size, current_price)
                trade['action'] = 'entry_long'
                
                # Update position tracking
                self.current_position = position_size
                self.entry_price = current_price
                self.position_type = 'long'
                
                self.trades.append(trade)
                return {
                    "status": "trade_executed",
                    "trade": trade,
                    "z_score": z_score
                }
            
            elif self.should_enter_short(z_score):
                position_size = self.calculate_position_size(current_price)
                
                # Execute entry trade
                trade = self.execute_trade('sell', position_size, current_price)
                trade['action'] = 'entry_short'
                
                # Update position tracking
                self.current_position = position_size
                self.entry_price = current_price
                self.position_type = 'short'
                
                self.trades.append(trade)
                return {
                    "status": "trade_executed",
                    "trade": trade,
                    "z_score": z_score
                }
            
            # No action taken
            return {
                "status": "monitoring",
                "z_score": z_score,
                "position": self.position_type,
                "current_price": current_price,
                "mean": mean
            }
            
        except Exception as e:
            logging.error(f"Error in mean reversion strategy: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}

    def get_performance_metrics(self) -> Dict:
        """
        Calculate and return performance metrics.
        
        :return: Dictionary of performance metrics
        """
        if not self.trades:
            return {
                "total_trades": 0,
                "winning_trades": 0,
                "losing_trades": 0,
                "win_rate": 0,
                "total_pnl": 0,
                "avg_pnl": 0,
                "sharpe_ratio": 0
            }
        
        # Count winning and losing trades
        winning_trades = sum(1 for t in self.trades if t.get('pnl', 0) > 0)
        losing_trades = sum(1 for t in self.trades if t.get('pnl', 0) < 0)
        
        # Calculate average P&L
        pnls = [t.get('pnl', 0) for t in self.trades if 'pnl' in t]
        avg_pnl = np.mean(pnls) if pnls else 0
        
        # Calculate Sharpe ratio (simplified)
        if len(pnls) > 1:
            pnl_std = np.std(pnls)
            sharpe = (avg_pnl / pnl_std * np.sqrt(252)) if pnl_std > 0 else 0
        else:
            sharpe = 0
        
        return {
            "total_trades": len(self.trades),
            "winning_trades": winning_trades,
            "losing_trades": losing_trades,
            "win_rate": winning_trades / len(self.trades) if self.trades else 0,
            "total_pnl": self.pnl,
            "avg_pnl": avg_pnl,
            "sharpe_ratio": sharpe
        }

    def on_candle(self, candle_data: dict = None):
        """Process new candle data."""
        pass

    def on_tick(self, tick_data: dict):
        """Process new tick data."""
        pass