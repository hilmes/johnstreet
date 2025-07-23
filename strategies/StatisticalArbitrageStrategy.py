import logging
import time
import numpy as np
from typing import List, Dict, Optional, Tuple
from collections import deque
from scipy import stats
from src.core.strategies import TradingStrategy

class StatisticalArbitrageStrategy(TradingStrategy):
    """
    Statistical Arbitrage Strategy - A sophisticated quantitative strategy that
    exploits price inefficiencies between correlated assets.
    
    This strategy:
    1. Identifies cointegrated cryptocurrency pairs
    2. Calculates the spread between pairs using hedge ratios
    3. Monitors z-score of the spread for trading signals
    4. Executes pair trades when spread deviates significantly
    5. Implements dynamic hedging and risk management
    
    Best suited for highly liquid pairs with historical correlation.
    """

    def __init__(self, pair: str, config: dict):
        """
        Initialize the Statistical Arbitrage strategy.
        
        :param pair: Primary trading pair (e.g. "XBT/USD")
        :param config: Configuration dictionary
        """
        super().__init__(pair, config)
        
        # Strategy parameters
        self.primary_pair = pair
        self.secondary_pair = config.get('secondary_pair', 'ETH/USD')
        self.lookback_period = config.get('lookback_period', 60)
        self.zscore_entry = config.get('zscore_entry', 2.0)
        self.zscore_exit = config.get('zscore_exit', 0.5)
        self.zscore_stop = config.get('zscore_stop', 3.5)
        self.hedge_ratio_period = config.get('hedge_ratio_period', 30)
        self.min_correlation = config.get('min_correlation', 0.7)
        self.position_size = config.get('position_size', 0.01)
        self.max_exposure = config.get('max_exposure', 10000)
        self.rebalance_threshold = config.get('rebalance_threshold', 0.1)
        self.simulate = config.get('simulate', True)
        
        # Get Kraken API from config
        self.kraken_api = config.get('kraken_api')
        if not self.kraken_api:
            raise ValueError("kraken_api instance must be provided in config")
        
        # Data storage
        self.primary_prices = deque(maxlen=self.lookback_period)
        self.secondary_prices = deque(maxlen=self.lookback_period)
        self.spread_history = deque(maxlen=self.lookback_period)
        
        # Statistical parameters
        self.hedge_ratio = None
        self.spread_mean = None
        self.spread_std = None
        self.correlation = None
        self.cointegration_pvalue = None
        
        # Position tracking
        self.position_open = False
        self.primary_position = 0
        self.secondary_position = 0
        self.primary_entry_price = None
        self.secondary_entry_price = None
        self.entry_zscore = None
        self.position_direction = None  # 'long_spread' or 'short_spread'
        
        # Performance tracking
        self.trades = []
        self.total_pnl = 0
        self.rebalance_count = 0

    def calculate_hedge_ratio(self) -> Optional[float]:
        """
        Calculate optimal hedge ratio using linear regression.
        
        :return: Hedge ratio or None if insufficient data
        """
        if len(self.primary_prices) < self.hedge_ratio_period:
            return None
        
        # Use recent data for hedge ratio calculation
        primary_data = np.array(list(self.primary_prices)[-self.hedge_ratio_period:])
        secondary_data = np.array(list(self.secondary_prices)[-self.hedge_ratio_period:])
        
        # Calculate log returns for more stable regression
        primary_returns = np.diff(np.log(primary_data))
        secondary_returns = np.diff(np.log(secondary_data))
        
        # Linear regression to find hedge ratio
        slope, intercept, r_value, p_value, std_err = stats.linregress(secondary_returns, primary_returns)
        
        # Store correlation
        self.correlation = r_value ** 2
        
        return slope

    def test_cointegration(self) -> bool:
        """
        Test for cointegration between the two price series.
        
        :return: True if cointegrated, False otherwise
        """
        if len(self.primary_prices) < self.lookback_period:
            return False
        
        primary_data = np.array(list(self.primary_prices))
        secondary_data = np.array(list(self.secondary_prices))
        
        # Augmented Dickey-Fuller test on the spread
        spread = primary_data - self.hedge_ratio * secondary_data
        
        # Simple stationarity check (more sophisticated tests can be added)
        # Check if spread mean-reverts
        adf_stat = self.calculate_adf_statistic(spread)
        self.cointegration_pvalue = self.get_adf_pvalue(adf_stat)
        
        return self.cointegration_pvalue < 0.05

    def calculate_adf_statistic(self, series: np.ndarray) -> float:
        """
        Simplified ADF statistic calculation.
        
        :param series: Time series data
        :return: ADF statistic
        """
        # This is a simplified version. In production, use statsmodels.tsa.stattools.adfuller
        y = series[1:]
        y_lag = series[:-1]
        y_diff = np.diff(series)
        
        # Regression: y_t - y_{t-1} = alpha + beta * y_{t-1} + error
        slope, intercept, r_value, p_value, std_err = stats.linregress(y_lag, y_diff)
        
        # t-statistic for beta (testing if beta = 0, which means unit root)
        t_stat = slope / std_err if std_err > 0 else 0
        
        return t_stat

    def get_adf_pvalue(self, adf_stat: float) -> float:
        """
        Get approximate p-value for ADF statistic.
        
        :param adf_stat: ADF statistic
        :return: Approximate p-value
        """
        # Simplified critical values (MacKinnon 1994)
        if adf_stat < -3.43:
            return 0.01
        elif adf_stat < -2.86:
            return 0.05
        elif adf_stat < -2.57:
            return 0.10
        else:
            return 0.20

    def calculate_spread_stats(self) -> Optional[Tuple[float, float, float]]:
        """
        Calculate spread statistics: current value, mean, and z-score.
        
        :return: Tuple of (spread, mean, zscore) or None
        """
        if len(self.spread_history) < 20:  # Minimum history for statistics
            return None
        
        spread_array = np.array(self.spread_history)
        spread_mean = np.mean(spread_array)
        spread_std = np.std(spread_array)
        
        if spread_std == 0:
            return None
        
        current_spread = spread_array[-1]
        zscore = (current_spread - spread_mean) / spread_std
        
        self.spread_mean = spread_mean
        self.spread_std = spread_std
        
        return current_spread, spread_mean, zscore

    def calculate_position_sizes(self, primary_price: float, secondary_price: float) -> Tuple[float, float]:
        """
        Calculate position sizes for both assets maintaining market neutrality.
        
        :return: Tuple of (primary_size, secondary_size)
        """
        # Calculate dollar-neutral position sizes
        total_capital = min(self.position_size * primary_price, self.max_exposure)
        
        # Allocate capital based on hedge ratio
        primary_allocation = total_capital / (1 + abs(self.hedge_ratio))
        secondary_allocation = total_capital - primary_allocation
        
        primary_size = primary_allocation / primary_price
        secondary_size = secondary_allocation / secondary_price
        
        return primary_size, secondary_size

    def should_open_position(self, zscore: float) -> Optional[str]:
        """
        Determine if a position should be opened.
        
        :return: 'long_spread', 'short_spread', or None
        """
        if self.position_open:
            return None
        
        # Check correlation threshold
        if self.correlation is None or self.correlation < self.min_correlation:
            logging.info(f"Correlation too low: {self.correlation:.2f}")
            return None
        
        # Check cointegration
        if not self.test_cointegration():
            logging.info(f"Pairs not cointegrated: p-value = {self.cointegration_pvalue:.3f}")
            return None
        
        # Trading signals based on z-score
        if zscore >= self.zscore_entry:
            return 'short_spread'  # Spread is too high, expect reversion down
        elif zscore <= -self.zscore_entry:
            return 'long_spread'   # Spread is too low, expect reversion up
        
        return None

    def should_close_position(self, zscore: float) -> bool:
        """
        Determine if current position should be closed.
        
        :return: True if should close
        """
        if not self.position_open:
            return False
        
        # Exit on mean reversion
        if abs(zscore) <= self.zscore_exit:
            logging.info(f"Mean reversion exit: z-score = {zscore:.2f}")
            return True
        
        # Stop loss on extreme deviation
        if abs(zscore) >= self.zscore_stop:
            logging.info(f"Stop loss exit: z-score = {zscore:.2f}")
            return True
        
        # Exit if correlation breaks down
        if self.correlation < self.min_correlation * 0.8:
            logging.info(f"Correlation breakdown exit: {self.correlation:.2f}")
            return True
        
        return False

    def should_rebalance(self, current_hedge_ratio: float) -> bool:
        """
        Check if positions need rebalancing due to hedge ratio change.
        
        :return: True if should rebalance
        """
        if not self.position_open or self.hedge_ratio is None:
            return False
        
        ratio_change = abs(current_hedge_ratio - self.hedge_ratio) / self.hedge_ratio
        return ratio_change > self.rebalance_threshold

    def execute_pair_trade(self, action: str, primary_size: float, secondary_size: float, 
                          primary_price: float, secondary_price: float) -> Dict:
        """
        Execute trades for both legs of the pair trade.
        
        :return: Trade result dictionary
        """
        trades = {}
        
        if action == 'open_long_spread':
            # Long primary, short secondary
            primary_side = 'buy'
            secondary_side = 'sell'
        elif action == 'open_short_spread':
            # Short primary, long secondary
            primary_side = 'sell'
            secondary_side = 'buy'
        elif action == 'close_long_spread':
            # Close long spread: sell primary, buy secondary
            primary_side = 'sell'
            secondary_side = 'buy'
        elif action == 'close_short_spread':
            # Close short spread: buy primary, sell secondary
            primary_side = 'buy'
            secondary_side = 'sell'
        else:
            return {"status": "error", "message": f"Unknown action: {action}"}
        
        # Execute primary trade
        primary_order = {
            "pair": self.primary_pair,
            "type": primary_side,
            "ordertype": "limit",
            "price": str(primary_price),
            "volume": str(primary_size)
        }
        
        # Execute secondary trade
        secondary_order = {
            "pair": self.secondary_pair,
            "type": secondary_side,
            "ordertype": "limit",
            "price": str(secondary_price),
            "volume": str(secondary_size)
        }
        
        if self.simulate:
            logging.info(
                f"[SIMULATION] StatArb {action}: "
                f"{primary_side} {primary_size:.6f} {self.primary_pair} @ {primary_price:.2f}, "
                f"{secondary_side} {secondary_size:.6f} {self.secondary_pair} @ {secondary_price:.2f}"
            )
            trades = {
                "primary": {**primary_order, "status": "simulated"},
                "secondary": {**secondary_order, "status": "simulated"},
                "timestamp": time.time()
            }
        else:
            # Execute real trades
            try:
                primary_response = self.kraken_api.create_order(**primary_order)
                secondary_response = self.kraken_api.create_order(**secondary_order)
                
                trades = {
                    "primary": {**primary_order, "status": "submitted", "response": primary_response},
                    "secondary": {**secondary_order, "status": "submitted", "response": secondary_response},
                    "timestamp": time.time()
                }
            except Exception as e:
                logging.error(f"Error executing pair trade: {e}")
                trades = {
                    "primary": {**primary_order, "status": "failed"},
                    "secondary": {**secondary_order, "status": "failed"},
                    "error": str(e),
                    "timestamp": time.time()
                }
        
        return trades

    def update_price_data(self) -> Optional[Dict]:
        """
        Fetch and update price data for both pairs.
        
        :return: Current prices or None on error
        """
        try:
            # Fetch both tickers
            primary_ticker = self.kraken_api.get_ticker_details(self.primary_pair)
            secondary_ticker = self.kraken_api.get_ticker_details(self.secondary_pair)
            
            if primary_ticker and secondary_ticker:
                primary_price = primary_ticker['last']
                secondary_price = secondary_ticker['last']
                
                self.primary_prices.append(primary_price)
                self.secondary_prices.append(secondary_price)
                
                # Update hedge ratio if enough data
                if len(self.primary_prices) >= self.hedge_ratio_period:
                    self.hedge_ratio = self.calculate_hedge_ratio()
                
                # Calculate and store spread
                if self.hedge_ratio is not None:
                    spread = primary_price - self.hedge_ratio * secondary_price
                    self.spread_history.append(spread)
                
                return {
                    'primary_price': primary_price,
                    'secondary_price': secondary_price,
                    'primary_bid': primary_ticker['bid'],
                    'primary_ask': primary_ticker['ask'],
                    'secondary_bid': secondary_ticker['bid'],
                    'secondary_ask': secondary_ticker['ask']
                }
        except Exception as e:
            logging.error(f"Error fetching price data: {e}")
        
        return None

    def calculate_position_pnl(self, primary_price: float, secondary_price: float) -> float:
        """
        Calculate current P&L of open position.
        
        :return: Total P&L
        """
        if not self.position_open:
            return 0
        
        primary_pnl = (primary_price - self.primary_entry_price) * self.primary_position
        secondary_pnl = (secondary_price - self.secondary_entry_price) * self.secondary_position
        
        # Note: secondary_position is negative for short positions
        total_pnl = primary_pnl + secondary_pnl
        
        return total_pnl

    def run_once(self) -> Dict:
        """
        Execute one iteration of the statistical arbitrage strategy.
        
        :return: Dictionary with strategy status and any trades executed
        """
        try:
            # Update price data
            prices = self.update_price_data()
            if prices is None:
                return {"status": "error", "message": "Failed to fetch price data"}
            
            primary_price = prices['primary_price']
            secondary_price = prices['secondary_price']
            
            # Calculate spread statistics
            spread_stats = self.calculate_spread_stats()
            if spread_stats is None or self.hedge_ratio is None:
                return {
                    "status": "waiting",
                    "message": f"Collecting data: {len(self.spread_history)}/{self.lookback_period}"
                }
            
            current_spread, spread_mean, zscore = spread_stats
            
            logging.info(
                f"[StatArb] {self.primary_pair}/{self.secondary_pair} - "
                f"Spread: {current_spread:.2f}, Z-score: {zscore:.2f}, "
                f"Correlation: {self.correlation:.3f}, Hedge Ratio: {self.hedge_ratio:.3f}"
            )
            
            # Check for position close
            if self.should_close_position(zscore):
                # Calculate final P&L
                total_pnl = self.calculate_position_pnl(primary_price, secondary_price)
                self.total_pnl += total_pnl
                
                # Execute closing trades
                action = f"close_{self.position_direction}"
                trades = self.execute_pair_trade(
                    action,
                    abs(self.primary_position),
                    abs(self.secondary_position),
                    primary_price,
                    secondary_price
                )
                
                trades['action'] = action
                trades['pnl'] = total_pnl
                trades['entry_zscore'] = self.entry_zscore
                trades['exit_zscore'] = zscore
                
                # Reset positions
                self.position_open = False
                self.primary_position = 0
                self.secondary_position = 0
                self.primary_entry_price = None
                self.secondary_entry_price = None
                self.entry_zscore = None
                self.position_direction = None
                
                self.trades.append(trades)
                return {
                    "status": "trade_executed",
                    "trades": trades,
                    "total_pnl": self.total_pnl
                }
            
            # Check for rebalancing
            elif self.position_open and self.should_rebalance(self.calculate_hedge_ratio()):
                self.rebalance_count += 1
                logging.info(f"Rebalancing positions - count: {self.rebalance_count}")
                # Implement rebalancing logic here
                return {
                    "status": "rebalancing",
                    "current_zscore": zscore,
                    "message": "Position rebalancing required"
                }
            
            # Check for position open
            else:
                position_signal = self.should_open_position(zscore)
                if position_signal:
                    # Calculate position sizes
                    primary_size, secondary_size = self.calculate_position_sizes(primary_price, secondary_price)
                    
                    # Adjust sizes based on signal direction
                    if position_signal == 'short_spread':
                        secondary_size = -secondary_size  # Short secondary
                    else:  # long_spread
                        primary_size = primary_size  # Long primary
                        secondary_size = -secondary_size  # Short secondary
                    
                    # Execute opening trades
                    action = f"open_{position_signal}"
                    trades = self.execute_pair_trade(
                        action,
                        abs(primary_size),
                        abs(secondary_size),
                        primary_price,
                        secondary_price
                    )
                    
                    trades['action'] = action
                    trades['zscore'] = zscore
                    trades['correlation'] = self.correlation
                    trades['hedge_ratio'] = self.hedge_ratio
                    
                    # Update positions
                    self.position_open = True
                    self.primary_position = primary_size
                    self.secondary_position = secondary_size
                    self.primary_entry_price = primary_price
                    self.secondary_entry_price = secondary_price
                    self.entry_zscore = zscore
                    self.position_direction = position_signal
                    
                    self.trades.append(trades)
                    return {
                        "status": "trade_executed",
                        "trades": trades,
                        "signal": position_signal
                    }
            
            # No action taken
            current_pnl = self.calculate_position_pnl(primary_price, secondary_price) if self.position_open else 0
            return {
                "status": "monitoring",
                "zscore": zscore,
                "correlation": self.correlation,
                "position_open": self.position_open,
                "current_pnl": current_pnl,
                "total_pnl": self.total_pnl
            }
            
        except Exception as e:
            logging.error(f"Error in statistical arbitrage strategy: {e}", exc_info=True)
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
                "sharpe_ratio": 0,
                "max_zscore": 0,
                "avg_holding_time": 0,
                "rebalance_count": 0
            }
        
        # Extract P&L from trades
        pnls = [t.get('pnl', 0) for t in self.trades if 'pnl' in t]
        winning_trades = sum(1 for pnl in pnls if pnl > 0)
        losing_trades = sum(1 for pnl in pnls if pnl < 0)
        
        # Calculate Sharpe ratio
        if len(pnls) > 1:
            returns = np.array(pnls)
            sharpe = (np.mean(returns) / np.std(returns) * np.sqrt(252)) if np.std(returns) > 0 else 0
        else:
            sharpe = 0
        
        # Calculate max z-score from trades
        max_zscore = max([abs(t.get('zscore', 0)) for t in self.trades] + [0])
        
        return {
            "total_trades": len([t for t in self.trades if 'pnl' in t]),
            "winning_trades": winning_trades,
            "losing_trades": losing_trades,
            "win_rate": winning_trades / len(pnls) if pnls else 0,
            "total_pnl": self.total_pnl,
            "sharpe_ratio": sharpe,
            "max_zscore": max_zscore,
            "avg_correlation": self.correlation or 0,
            "rebalance_count": self.rebalance_count
        }

    def on_candle(self, candle_data: dict = None):
        """Process new candle data."""
        pass

    def on_tick(self, tick_data: dict):
        """Process new tick data."""
        pass