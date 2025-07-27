"""
Backtesting Engine for Trading Strategies

Provides intuitive backtesting with realistic market simulation.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
import json
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)


@dataclass
class Trade:
    """Represents a single trade in backtesting"""
    timestamp: datetime
    pair: str
    side: str  # 'buy' or 'sell'
    price: float
    volume: float
    fee: float
    order_type: str = 'market'
    trade_id: str = ''
    pnl: float = 0.0
    

@dataclass
class Position:
    """Tracks position during backtesting"""
    pair: str
    volume: float
    entry_price: float
    entry_time: datetime
    current_price: float
    unrealized_pnl: float = 0.0
    fees_paid: float = 0.0
    

@dataclass
class BacktestResult:
    """Complete backtest results with analytics"""
    # Summary metrics
    total_return: float
    total_return_pct: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown: float
    max_drawdown_pct: float
    win_rate: float
    profit_factor: float
    
    # Trade statistics
    total_trades: int
    winning_trades: int
    losing_trades: int
    avg_win: float
    avg_loss: float
    largest_win: float
    largest_loss: float
    avg_trade_duration: timedelta
    
    # Risk metrics
    volatility: float
    var_95: float  # Value at Risk
    cvar_95: float  # Conditional VaR
    calmar_ratio: float
    
    # Time series data
    equity_curve: pd.DataFrame
    trades: List[Trade]
    daily_returns: pd.Series
    
    # Additional info
    start_date: datetime
    end_date: datetime
    initial_capital: float
    final_capital: float
    trading_days: int
    

class BacktestingEngine:
    """
    Robust backtesting engine with realistic market simulation
    """
    
    def __init__(
        self,
        initial_capital: float = 10000,
        fee_rate: float = 0.0026,  # Kraken's default fee
        slippage_pct: float = 0.001,  # 0.1% slippage
        risk_free_rate: float = 0.02  # 2% annual risk-free rate
    ):
        self.initial_capital = initial_capital
        self.current_capital = initial_capital
        self.fee_rate = fee_rate
        self.slippage_pct = slippage_pct
        self.risk_free_rate = risk_free_rate
        
        # State tracking
        self.positions: Dict[str, Position] = {}
        self.trades: List[Trade] = []
        self.equity_curve: List[Dict] = []
        self.pending_orders: Dict[str, Dict] = {}
        
        # Historical data cache
        self.data_cache: Dict[str, pd.DataFrame] = {}
        
    def load_historical_data(
        self, 
        pair: str, 
        start_date: datetime,
        end_date: datetime,
        interval: str = '5m'
    ) -> pd.DataFrame:
        """Load historical OHLCV data for backtesting"""
        # In production, this would fetch from database or API
        # For now, generate realistic sample data
        
        cache_key = f"{pair}_{start_date}_{end_date}_{interval}"
        if cache_key in self.data_cache:
            return self.data_cache[cache_key]
            
        # Generate sample data (replace with real data source)
        date_range = pd.date_range(start=start_date, end=end_date, freq=interval)
        
        # Simulate realistic price movement
        np.random.seed(42)  # For reproducibility
        base_price = 50000 if 'XBT' in pair else 3000
        returns = np.random.normal(0.0001, 0.02, len(date_range))
        prices = base_price * np.exp(np.cumsum(returns))
        
        df = pd.DataFrame({
            'timestamp': date_range,
            'open': prices * (1 + np.random.uniform(-0.001, 0.001, len(prices))),
            'high': prices * (1 + np.random.uniform(0, 0.005, len(prices))),
            'low': prices * (1 - np.random.uniform(0, 0.005, len(prices))),
            'close': prices,
            'volume': np.random.uniform(10, 100, len(prices))
        })
        
        df.set_index('timestamp', inplace=True)
        self.data_cache[cache_key] = df
        return df
        
    def backtest_strategy(
        self,
        strategy_class,
        pairs: List[str],
        start_date: datetime,
        end_date: datetime,
        **strategy_params
    ) -> BacktestResult:
        """Run backtest for a strategy"""
        logger.info(f"Starting backtest from {start_date} to {end_date}")
        
        # Reset state
        self.current_capital = self.initial_capital
        self.positions.clear()
        self.trades.clear()
        self.equity_curve.clear()
        
        # Load data for all pairs
        data = {}
        for pair in pairs:
            data[pair] = self.load_historical_data(pair, start_date, end_date)
            
        # Create strategy instance with mock API
        strategy = strategy_class(
            api=self,  # BacktestingEngine acts as mock API
            **strategy_params
        )
        
        # Get all timestamps
        all_timestamps = sorted(set(
            ts for df in data.values() for ts in df.index
        ))
        
        # Simulate trading
        for timestamp in all_timestamps:
            current_data = {}
            
            # Get current prices for all pairs
            for pair, df in data.items():
                if timestamp in df.index:
                    current_data[pair] = df.loc[timestamp]
                    
            if not current_data:
                continue
                
            # Update positions with current prices
            self._update_positions(current_data)
            
            # Record equity
            equity = self._calculate_equity()
            self.equity_curve.append({
                'timestamp': timestamp,
                'equity': equity,
                'cash': self.current_capital,
                'positions_value': equity - self.current_capital
            })
            
            # Execute strategy
            try:
                # Simulate strategy decision making
                self.current_prices = current_data
                strategy.current_timestamp = timestamp
                
                # Call strategy's analyze method if it exists
                if hasattr(strategy, 'analyze'):
                    signals = strategy.analyze(current_data)
                    
                    # Execute trades based on signals
                    for signal in signals:
                        if signal['action'] == 'buy':
                            self.create_order(
                                pair=signal['pair'],
                                side='buy',
                                order_type='market',
                                volume=signal['volume']
                            )
                        elif signal['action'] == 'sell':
                            self.create_order(
                                pair=signal['pair'],
                                side='sell',
                                order_type='market',
                                volume=signal['volume']
                            )
                            
            except Exception as e:
                logger.error(f"Strategy error at {timestamp}: {e}")
                
        # Calculate final results
        return self._calculate_results(start_date, end_date)
        
    def create_order(
        self,
        pair: str,
        side: str,
        order_type: str,
        volume: float,
        price: Optional[float] = None,
        **kwargs
    ) -> Dict:
        """Simulate order creation"""
        # Get current market price
        if not hasattr(self, 'current_prices') or pair not in self.current_prices:
            raise Exception(f"No price data for {pair}")
            
        market_price = float(self.current_prices[pair]['close'])
        
        # Apply slippage
        if side == 'buy':
            execution_price = market_price * (1 + self.slippage_pct)
        else:
            execution_price = market_price * (1 - self.slippage_pct)
            
        # Calculate fees
        order_value = volume * execution_price
        fee = order_value * self.fee_rate
        
        # Check if we have enough capital
        if side == 'buy':
            required_capital = order_value + fee
            if required_capital > self.current_capital:
                raise Exception(f"Insufficient capital: need {required_capital}, have {self.current_capital}")
                
        # Execute trade
        trade = Trade(
            timestamp=self.current_prices[pair].name,
            pair=pair,
            side=side,
            price=execution_price,
            volume=volume,
            fee=fee,
            order_type=order_type,
            trade_id=f"BT-{len(self.trades)}"
        )
        
        # Update positions and capital
        self._execute_trade(trade)
        
        return {
            'txid': [trade.trade_id],
            'descr': {'order': f"{side} {volume} {pair} @ {execution_price}"}
        }
        
    def _execute_trade(self, trade: Trade):
        """Execute a trade and update positions"""
        self.trades.append(trade)
        
        if trade.side == 'buy':
            # Deduct capital
            self.current_capital -= (trade.volume * trade.price + trade.fee)
            
            # Update or create position
            if trade.pair in self.positions:
                pos = self.positions[trade.pair]
                # Average entry price
                total_volume = pos.volume + trade.volume
                pos.entry_price = (
                    (pos.volume * pos.entry_price + trade.volume * trade.price) / 
                    total_volume
                )
                pos.volume = total_volume
                pos.fees_paid += trade.fee
            else:
                self.positions[trade.pair] = Position(
                    pair=trade.pair,
                    volume=trade.volume,
                    entry_price=trade.price,
                    entry_time=trade.timestamp,
                    current_price=trade.price,
                    fees_paid=trade.fee
                )
                
        else:  # sell
            if trade.pair not in self.positions:
                logger.warning(f"Selling {trade.pair} without position")
                return
                
            pos = self.positions[trade.pair]
            
            # Calculate realized P&L
            pnl = (trade.price - pos.entry_price) * trade.volume - trade.fee
            trade.pnl = pnl
            
            # Add capital
            self.current_capital += (trade.volume * trade.price - trade.fee)
            
            # Update or close position
            pos.volume -= trade.volume
            pos.fees_paid += trade.fee
            
            if pos.volume <= 0:
                del self.positions[trade.pair]
                
    def _update_positions(self, current_data: Dict):
        """Update position values with current prices"""
        for pair, position in self.positions.items():
            if pair in current_data:
                position.current_price = float(current_data[pair]['close'])
                position.unrealized_pnl = (
                    (position.current_price - position.entry_price) * position.volume
                    - position.fees_paid
                )
                
    def _calculate_equity(self) -> float:
        """Calculate current total equity"""
        positions_value = sum(
            pos.volume * pos.current_price 
            for pos in self.positions.values()
        )
        return self.current_capital + positions_value
        
    def _calculate_results(self, start_date: datetime, end_date: datetime) -> BacktestResult:
        """Calculate comprehensive backtest results"""
        # Convert equity curve to DataFrame
        equity_df = pd.DataFrame(self.equity_curve)
        equity_df.set_index('timestamp', inplace=True)
        
        # Calculate returns
        equity_df['returns'] = equity_df['equity'].pct_change()
        daily_returns = equity_df['returns'].resample('D').sum()
        
        # Basic metrics
        total_return = equity_df['equity'].iloc[-1] - self.initial_capital
        total_return_pct = total_return / self.initial_capital
        
        # Trade analysis
        winning_trades = [t for t in self.trades if t.pnl > 0]
        losing_trades = [t for t in self.trades if t.pnl < 0]
        
        # Risk metrics
        volatility = daily_returns.std() * np.sqrt(252)  # Annualized
        sharpe_ratio = self._calculate_sharpe_ratio(daily_returns)
        sortino_ratio = self._calculate_sortino_ratio(daily_returns)
        max_dd, max_dd_pct = self._calculate_max_drawdown(equity_df['equity'])
        
        # VaR and CVaR
        var_95 = np.percentile(daily_returns.dropna(), 5)
        cvar_95 = daily_returns[daily_returns <= var_95].mean()
        
        # Trade statistics
        avg_win = np.mean([t.pnl for t in winning_trades]) if winning_trades else 0
        avg_loss = np.mean([t.pnl for t in losing_trades]) if losing_trades else 0
        
        # Profit factor
        gross_profits = sum(t.pnl for t in winning_trades)
        gross_losses = abs(sum(t.pnl for t in losing_trades))
        profit_factor = gross_profits / gross_losses if gross_losses > 0 else float('inf')
        
        return BacktestResult(
            total_return=total_return,
            total_return_pct=total_return_pct,
            sharpe_ratio=sharpe_ratio,
            sortino_ratio=sortino_ratio,
            max_drawdown=max_dd,
            max_drawdown_pct=max_dd_pct,
            win_rate=len(winning_trades) / len(self.trades) if self.trades else 0,
            profit_factor=profit_factor,
            total_trades=len(self.trades),
            winning_trades=len(winning_trades),
            losing_trades=len(losing_trades),
            avg_win=avg_win,
            avg_loss=avg_loss,
            largest_win=max([t.pnl for t in winning_trades]) if winning_trades else 0,
            largest_loss=min([t.pnl for t in losing_trades]) if losing_trades else 0,
            avg_trade_duration=self._calculate_avg_trade_duration(),
            volatility=volatility,
            var_95=var_95,
            cvar_95=cvar_95,
            calmar_ratio=total_return_pct / max_dd_pct if max_dd_pct > 0 else 0,
            equity_curve=equity_df,
            trades=self.trades,
            daily_returns=daily_returns,
            start_date=start_date,
            end_date=end_date,
            initial_capital=self.initial_capital,
            final_capital=equity_df['equity'].iloc[-1],
            trading_days=len(daily_returns)
        )
        
    def _calculate_sharpe_ratio(self, returns: pd.Series) -> float:
        """Calculate Sharpe ratio"""
        excess_returns = returns - self.risk_free_rate / 252
        if returns.std() == 0:
            return 0
        return np.sqrt(252) * excess_returns.mean() / returns.std()
        
    def _calculate_sortino_ratio(self, returns: pd.Series) -> float:
        """Calculate Sortino ratio (downside deviation)"""
        excess_returns = returns - self.risk_free_rate / 252
        downside_returns = returns[returns < 0]
        
        if len(downside_returns) == 0 or downside_returns.std() == 0:
            return 0
            
        return np.sqrt(252) * excess_returns.mean() / downside_returns.std()
        
    def _calculate_max_drawdown(self, equity_curve: pd.Series) -> Tuple[float, float]:
        """Calculate maximum drawdown"""
        cumulative = equity_curve.cummax()
        drawdown = equity_curve - cumulative
        
        max_dd = drawdown.min()
        max_dd_pct = (drawdown / cumulative).min()
        
        return abs(max_dd), abs(max_dd_pct)
        
    def _calculate_avg_trade_duration(self) -> timedelta:
        """Calculate average trade duration"""
        if not self.trades:
            return timedelta(0)
            
        # Group trades by pair to match entries and exits
        durations = []
        positions = defaultdict(list)
        
        for trade in self.trades:
            if trade.side == 'buy':
                positions[trade.pair].append(trade)
            elif trade.side == 'sell' and positions[trade.pair]:
                entry = positions[trade.pair].pop(0)
                duration = trade.timestamp - entry.timestamp
                durations.append(duration)
                
        if not durations:
            return timedelta(0)
            
        avg_seconds = np.mean([d.total_seconds() for d in durations])
        return timedelta(seconds=avg_seconds)
        
    # Mock API methods for strategy compatibility
    async def get_ticker(self, pair: str) -> Dict:
        """Mock ticker data"""
        if hasattr(self, 'current_prices') and pair in self.current_prices:
            price = float(self.current_prices[pair]['close'])
            return {
                pair: {
                    'a': [str(price * 1.001), '1', '1.000'],  # ask
                    'b': [str(price * 0.999), '1', '1.000'],  # bid
                    'c': [str(price), '1.000'],  # last trade
                    'h': [str(price * 1.01), str(price * 1.01)],  # high
                    'l': [str(price * 0.99), str(price * 0.99)],  # low
                }
            }
        return {}
        
    async def get_account_balance(self) -> Dict:
        """Mock account balance"""
        return {
            'ZUSD': str(self.current_capital),
            'XXBT': str(self.positions.get('XBTUSD', Position('', 0, 0, datetime.now(), 0)).volume),
            'XETH': str(self.positions.get('ETHUSD', Position('', 0, 0, datetime.now(), 0)).volume),
        }
        
    async def close(self):
        """Cleanup method"""
        if self.data_manager:
            await self.data_manager.cleanup()