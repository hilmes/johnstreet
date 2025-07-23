import logging
import time
import numpy as np
from typing import List, Dict, Optional, Tuple
from collections import deque
from src.core.strategies import TradingStrategy

class MomentumStrategy(TradingStrategy):
    """
    Momentum Trading Strategy - A quantitative strategy that capitalizes on 
    the continuation of existing trends in market prices.
    
    This strategy:
    1. Identifies strong price momentum using rate of change and moving averages
    2. Uses multiple timeframes to confirm trend strength
    3. Enters positions in the direction of momentum
    4. Uses dynamic position sizing based on momentum strength
    5. Implements trailing stops to protect profits
    
    Best suited for trending markets and during high volatility periods.
    """

    def __init__(self, pair: str, config: dict):
        """
        Initialize the Momentum strategy.
        
        :param pair: Trading pair (e.g. "XBT/USD")
        :param config: Configuration dictionary
        """
        super().__init__(pair, config)
        
        # Strategy parameters
        self.pair = pair
        self.fast_period = config.get('fast_period', 10)
        self.slow_period = config.get('slow_period', 30)
        self.momentum_period = config.get('momentum_period', 14)
        self.volume_period = config.get('volume_period', 20)
        self.momentum_threshold = config.get('momentum_threshold', 0.02)  # 2% minimum momentum
        self.volume_multiplier = config.get('volume_multiplier', 1.5)
        self.base_position_size = config.get('base_position_size', 0.01)
        self.max_position_size = config.get('max_position_size', 0.05)
        self.stop_loss_percent = config.get('stop_loss_percent', 0.015)
        self.trailing_stop_percent = config.get('trailing_stop_percent', 0.01)
        self.take_profit_multiplier = config.get('take_profit_multiplier', 3.0)
        self.simulate = config.get('simulate', True)
        
        # Get Kraken API from config
        self.kraken_api = config.get('kraken_api')
        if not self.kraken_api:
            raise ValueError("kraken_api instance must be provided in config")
        
        # Data storage
        self.price_history = deque(maxlen=max(self.slow_period, self.momentum_period))
        self.volume_history = deque(maxlen=self.volume_period)
        self.high_history = deque(maxlen=self.momentum_period)
        self.low_history = deque(maxlen=self.momentum_period)
        
        # Position tracking
        self.current_position = None
        self.entry_price = None
        self.highest_price = None  # For trailing stop
        self.lowest_price = None   # For trailing stop (short)
        self.position_type = None  # 'long' or 'short'
        self.stop_loss_price = None
        self.take_profit_price = None
        
        # Performance tracking
        self.trades = []
        self.consecutive_wins = 0
        self.consecutive_losses = 0

    def calculate_moving_averages(self) -> Optional[Tuple[float, float]]:
        """
        Calculate fast and slow moving averages.
        
        :return: Tuple of (fast_ma, slow_ma) or None if insufficient data
        """
        if len(self.price_history) < self.slow_period:
            return None
        
        prices = list(self.price_history)
        fast_ma = np.mean(prices[-self.fast_period:])
        slow_ma = np.mean(prices[-self.slow_period:])
        
        return fast_ma, slow_ma

    def calculate_momentum(self) -> Optional[float]:
        """
        Calculate price momentum (rate of change).
        
        :return: Momentum value or None if insufficient data
        """
        if len(self.price_history) < self.momentum_period:
            return None
        
        prices = list(self.price_history)
        current_price = prices[-1]
        past_price = prices[-self.momentum_period]
        
        if past_price == 0:
            return None
        
        momentum = (current_price - past_price) / past_price
        return momentum

    def calculate_volume_ratio(self) -> float:
        """
        Calculate current volume relative to average.
        
        :return: Volume ratio
        """
        if len(self.volume_history) < 2:
            return 1.0
        
        current_volume = self.volume_history[-1]
        avg_volume = np.mean(list(self.volume_history)[:-1])
        
        if avg_volume == 0:
            return 1.0
        
        return current_volume / avg_volume

    def calculate_atr(self) -> Optional[float]:
        """
        Calculate Average True Range for dynamic stops.
        
        :return: ATR value or None if insufficient data
        """
        if len(self.high_history) < 14 or len(self.low_history) < 14:
            return None
        
        # Simple ATR calculation
        ranges = []
        for i in range(1, 14):
            high = self.high_history[-i]
            low = self.low_history[-i]
            prev_close = self.price_history[-i-1] if i < len(self.price_history)-1 else low
            
            true_range = max(
                high - low,
                abs(high - prev_close),
                abs(low - prev_close)
            )
            ranges.append(true_range)
        
        return np.mean(ranges)

    def calculate_position_size(self, momentum_strength: float) -> float:
        """
        Calculate dynamic position size based on momentum strength.
        
        :param momentum_strength: Absolute momentum value
        :return: Position size to trade
        """
        # Scale position size with momentum strength
        momentum_factor = min(abs(momentum_strength) / self.momentum_threshold, 3.0)
        position_size = self.base_position_size * momentum_factor
        
        # Apply maximum position size limit
        return min(position_size, self.max_position_size)

    def should_enter_long(self, fast_ma: float, slow_ma: float, momentum: float, volume_ratio: float) -> bool:
        """
        Check if conditions are met for entering a long position.
        
        :return: True if should enter long
        """
        return (
            self.current_position is None and
            fast_ma > slow_ma and  # Uptrend
            momentum > self.momentum_threshold and  # Positive momentum
            volume_ratio > self.volume_multiplier  # Volume confirmation
        )

    def should_enter_short(self, fast_ma: float, slow_ma: float, momentum: float, volume_ratio: float) -> bool:
        """
        Check if conditions are met for entering a short position.
        
        :return: True if should enter short
        """
        return (
            self.current_position is None and
            fast_ma < slow_ma and  # Downtrend
            momentum < -self.momentum_threshold and  # Negative momentum
            volume_ratio > self.volume_multiplier  # Volume confirmation
        )

    def update_trailing_stop(self, current_price: float):
        """
        Update trailing stop based on favorable price movement.
        
        :param current_price: Current market price
        """
        if self.position_type == 'long' and self.highest_price is not None:
            if current_price > self.highest_price:
                self.highest_price = current_price
                # Update trailing stop
                new_stop = current_price * (1 - self.trailing_stop_percent)
                if self.stop_loss_price is None or new_stop > self.stop_loss_price:
                    self.stop_loss_price = new_stop
                    logging.info(f"Updated trailing stop to {self.stop_loss_price:.2f}")
        
        elif self.position_type == 'short' and self.lowest_price is not None:
            if current_price < self.lowest_price:
                self.lowest_price = current_price
                # Update trailing stop
                new_stop = current_price * (1 + self.trailing_stop_percent)
                if self.stop_loss_price is None or new_stop < self.stop_loss_price:
                    self.stop_loss_price = new_stop
                    logging.info(f"Updated trailing stop to {self.stop_loss_price:.2f}")

    def should_exit_position(self, current_price: float, fast_ma: float, slow_ma: float) -> Tuple[bool, str]:
        """
        Check if current position should be closed.
        
        :return: Tuple of (should_exit, reason)
        """
        if self.current_position is None:
            return False, ""
        
        # Update trailing stop
        self.update_trailing_stop(current_price)
        
        # Check stop loss
        if self.position_type == 'long' and current_price <= self.stop_loss_price:
            return True, "stop_loss"
        elif self.position_type == 'short' and current_price >= self.stop_loss_price:
            return True, "stop_loss"
        
        # Check take profit
        if self.position_type == 'long' and current_price >= self.take_profit_price:
            return True, "take_profit"
        elif self.position_type == 'short' and current_price <= self.take_profit_price:
            return True, "take_profit"
        
        # Check momentum reversal
        if self.position_type == 'long' and fast_ma < slow_ma:
            return True, "momentum_reversal"
        elif self.position_type == 'short' and fast_ma > slow_ma:
            return True, "momentum_reversal"
        
        return False, ""

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
                f"[SIMULATION] Momentum {side} {size:.6f} @ {price:.2f}"
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

    def update_market_data(self) -> Optional[Dict]:
        """
        Fetch and update all market data.
        
        :return: Current market data or None on error
        """
        try:
            ticker = self.kraken_api.get_ticker_details(self.pair)
            ohlc = self.kraken_api.get_ohlc_data(self.pair, interval=5)  # 5-minute candles
            
            if ticker and ticker.get('last'):
                current_price = ticker['last']
                volume = ticker.get('volume_24h', 0)
                
                self.price_history.append(current_price)
                self.volume_history.append(volume)
                
                # Update high/low from OHLC data
                if ohlc and self.pair in ohlc:
                    candles = ohlc[self.pair]
                    if candles:
                        latest_candle = candles[-1]
                        self.high_history.append(float(latest_candle[2]))  # High
                        self.low_history.append(float(latest_candle[3]))   # Low
                
                return {
                    'price': current_price,
                    'volume': volume,
                    'bid': ticker.get('bid'),
                    'ask': ticker.get('ask')
                }
        except Exception as e:
            logging.error(f"Error fetching market data: {e}")
        
        return None

    def run_once(self) -> Dict:
        """
        Execute one iteration of the momentum strategy.
        
        :return: Dictionary with strategy status and any trades executed
        """
        try:
            # Update market data
            market_data = self.update_market_data()
            if market_data is None:
                return {"status": "error", "message": "Failed to fetch market data"}
            
            current_price = market_data['price']
            
            # Calculate indicators
            ma_result = self.calculate_moving_averages()
            momentum = self.calculate_momentum()
            volume_ratio = self.calculate_volume_ratio()
            atr = self.calculate_atr()
            
            if ma_result is None or momentum is None:
                return {
                    "status": "waiting",
                    "message": f"Collecting data: {len(self.price_history)}/{self.slow_period}"
                }
            
            fast_ma, slow_ma = ma_result
            
            logging.info(
                f"[Momentum] {self.pair} - Price: {current_price:.2f}, "
                f"Fast MA: {fast_ma:.2f}, Slow MA: {slow_ma:.2f}, "
                f"Momentum: {momentum:.2%}, Volume Ratio: {volume_ratio:.2f}"
            )
            
            # Check for exit conditions first
            should_exit, exit_reason = self.should_exit_position(current_price, fast_ma, slow_ma)
            if should_exit:
                # Calculate P&L
                if self.position_type == 'long':
                    pnl = (current_price - self.entry_price) * self.current_position
                    exit_side = 'sell'
                else:
                    pnl = (self.entry_price - current_price) * self.current_position
                    exit_side = 'buy'
                
                # Update consecutive wins/losses
                if pnl > 0:
                    self.consecutive_wins += 1
                    self.consecutive_losses = 0
                else:
                    self.consecutive_losses += 1
                    self.consecutive_wins = 0
                
                # Execute exit trade
                trade = self.execute_trade(exit_side, self.current_position, current_price)
                trade['action'] = f'exit_{exit_reason}'
                trade['pnl'] = pnl
                
                # Reset position
                self.current_position = None
                self.entry_price = None
                self.highest_price = None
                self.lowest_price = None
                self.position_type = None
                self.stop_loss_price = None
                self.take_profit_price = None
                
                self.trades.append(trade)
                return {
                    "status": "trade_executed",
                    "trade": trade,
                    "exit_reason": exit_reason
                }
            
            # Check for entry conditions
            elif self.should_enter_long(fast_ma, slow_ma, momentum, volume_ratio):
                position_size = self.calculate_position_size(momentum)
                
                # Set initial stops
                if atr:
                    self.stop_loss_price = current_price - (2 * atr)
                    self.take_profit_price = current_price + (self.take_profit_multiplier * 2 * atr)
                else:
                    self.stop_loss_price = current_price * (1 - self.stop_loss_percent)
                    self.take_profit_price = current_price * (1 + self.stop_loss_percent * self.take_profit_multiplier)
                
                # Execute entry trade
                trade = self.execute_trade('buy', position_size, current_price)
                trade['action'] = 'entry_long'
                trade['momentum'] = momentum
                
                # Update position tracking
                self.current_position = position_size
                self.entry_price = current_price
                self.highest_price = current_price
                self.position_type = 'long'
                
                self.trades.append(trade)
                return {
                    "status": "trade_executed",
                    "trade": trade,
                    "momentum": momentum,
                    "stop_loss": self.stop_loss_price,
                    "take_profit": self.take_profit_price
                }
            
            elif self.should_enter_short(fast_ma, slow_ma, momentum, volume_ratio):
                position_size = self.calculate_position_size(momentum)
                
                # Set initial stops
                if atr:
                    self.stop_loss_price = current_price + (2 * atr)
                    self.take_profit_price = current_price - (self.take_profit_multiplier * 2 * atr)
                else:
                    self.stop_loss_price = current_price * (1 + self.stop_loss_percent)
                    self.take_profit_price = current_price * (1 - self.stop_loss_percent * self.take_profit_multiplier)
                
                # Execute entry trade
                trade = self.execute_trade('sell', position_size, current_price)
                trade['action'] = 'entry_short'
                trade['momentum'] = momentum
                
                # Update position tracking
                self.current_position = position_size
                self.entry_price = current_price
                self.lowest_price = current_price
                self.position_type = 'short'
                
                self.trades.append(trade)
                return {
                    "status": "trade_executed",
                    "trade": trade,
                    "momentum": momentum,
                    "stop_loss": self.stop_loss_price,
                    "take_profit": self.take_profit_price
                }
            
            # No action taken
            return {
                "status": "monitoring",
                "momentum": momentum,
                "trend": "up" if fast_ma > slow_ma else "down",
                "position": self.position_type,
                "current_price": current_price
            }
            
        except Exception as e:
            logging.error(f"Error in momentum strategy: {e}", exc_info=True)
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
                "profit_factor": 0,
                "max_consecutive_wins": 0,
                "max_consecutive_losses": 0,
                "avg_winner": 0,
                "avg_loser": 0
            }
        
        # Separate winners and losers
        winners = [t.get('pnl', 0) for t in self.trades if t.get('pnl', 0) > 0]
        losers = [t.get('pnl', 0) for t in self.trades if t.get('pnl', 0) < 0]
        
        # Calculate profit factor
        gross_profit = sum(winners) if winners else 0
        gross_loss = abs(sum(losers)) if losers else 1  # Avoid division by zero
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else 0
        
        return {
            "total_trades": len(self.trades),
            "winning_trades": len(winners),
            "losing_trades": len(losers),
            "win_rate": len(winners) / len(self.trades) if self.trades else 0,
            "profit_factor": profit_factor,
            "max_consecutive_wins": self.consecutive_wins,
            "max_consecutive_losses": self.consecutive_losses,
            "avg_winner": np.mean(winners) if winners else 0,
            "avg_loser": np.mean(losers) if losers else 0
        }

    def on_candle(self, candle_data: dict = None):
        """Process new candle data."""
        pass

    def on_tick(self, tick_data: dict):
        """Process new tick data."""
        pass