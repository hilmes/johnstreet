"""
Portfolio Manager - Run multiple strategies simultaneously

Manages risk allocation across multiple strategies and trading pairs.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
import json

logger = logging.getLogger(__name__)


@dataclass
class StrategyAllocation:
    """Strategy allocation configuration"""
    strategy_name: str
    strategy_class: Any
    allocation_pct: float  # Percentage of total capital
    pairs: List[str]
    parameters: Dict[str, Any] = field(default_factory=dict)
    max_positions: int = 3
    enabled: bool = True
    

@dataclass
class PortfolioMetrics:
    """Portfolio performance metrics"""
    total_capital: float
    allocated_capital: float
    available_capital: float
    total_pnl: float
    total_pnl_pct: float
    daily_pnl: float
    active_strategies: int
    total_positions: int
    strategy_performance: Dict[str, Dict] = field(default_factory=dict)
    

class PortfolioManager:
    """
    Manages multiple trading strategies as a portfolio
    """
    
    def __init__(
        self,
        api,
        total_capital: float,
        max_total_exposure: float = 0.8,  # Max 80% of capital deployed
        max_strategy_exposure: float = 0.3,  # Max 30% per strategy
        rebalance_frequency: int = 3600,  # Rebalance every hour
        risk_manager=None
    ):
        self.api = api
        self.total_capital = total_capital
        self.max_total_exposure = max_total_exposure
        self.max_strategy_exposure = max_strategy_exposure
        self.rebalance_frequency = rebalance_frequency
        self.risk_manager = risk_manager
        
        # Strategy management
        self.strategies: Dict[str, StrategyAllocation] = {}
        self.strategy_instances: Dict[str, Any] = {}
        self.strategy_capital: Dict[str, float] = {}
        
        # Performance tracking
        self.start_time = datetime.now()
        self.last_rebalance = datetime.now()
        self.portfolio_history = []
        
        # Position tracking
        self.strategy_positions: Dict[str, List[Dict]] = {}
        
    def add_strategy(
        self,
        name: str,
        strategy_class: Any,
        allocation_pct: float,
        pairs: List[str],
        **parameters
    ) -> bool:
        """Add a strategy to the portfolio"""
        
        if allocation_pct <= 0 or allocation_pct > self.max_strategy_exposure:
            logger.error(f"Invalid allocation {allocation_pct:.1%} for {name}")
            return False
            
        # Check total allocation doesn't exceed limit
        total_allocation = sum(s.allocation_pct for s in self.strategies.values())
        if total_allocation + allocation_pct > self.max_total_exposure:
            logger.error(f"Total allocation would exceed {self.max_total_exposure:.1%}")
            return False
            
        allocation = StrategyAllocation(
            strategy_name=name,
            strategy_class=strategy_class,
            allocation_pct=allocation_pct,
            pairs=pairs,
            parameters=parameters
        )
        
        self.strategies[name] = allocation
        self.strategy_positions[name] = []
        
        # Calculate allocated capital
        self.strategy_capital[name] = self.total_capital * allocation_pct
        
        logger.info(f"Added strategy {name}: {allocation_pct:.1%} allocation "
                   f"(${self.strategy_capital[name]:,.2f})")
        
        return True
        
    def remove_strategy(self, name: str) -> bool:
        """Remove a strategy from portfolio"""
        if name not in self.strategies:
            return False
            
        # Close any open positions for this strategy
        if name in self.strategy_instances:
            strategy = self.strategy_instances[name]
            if hasattr(strategy, 'reset'):
                strategy.reset()
                
        # Remove from tracking
        del self.strategies[name]
        del self.strategy_capital[name]
        if name in self.strategy_instances:
            del self.strategy_instances[name]
        if name in self.strategy_positions:
            del self.strategy_positions[name]
            
        logger.info(f"Removed strategy {name}")
        return True
        
    def enable_strategy(self, name: str, enabled: bool = True):
        """Enable or disable a strategy"""
        if name in self.strategies:
            self.strategies[name].enabled = enabled
            logger.info(f"Strategy {name} {'enabled' if enabled else 'disabled'}")
            
    async def initialize_strategies(self):
        """Initialize all strategy instances"""
        for name, allocation in self.strategies.items():
            if allocation.enabled:
                try:
                    # Create strategy instance with allocated capital
                    strategy = allocation.strategy_class(
                        api=self._create_strategy_api_wrapper(name),
                        **allocation.parameters
                    )
                    
                    self.strategy_instances[name] = strategy
                    logger.info(f"Initialized strategy: {name}")
                    
                except Exception as e:
                    logger.error(f"Failed to initialize {name}: {e}")
                    allocation.enabled = False
                    
    def _create_strategy_api_wrapper(self, strategy_name: str):
        """Create API wrapper that tracks positions for a strategy"""
        
        class StrategyAPIWrapper:
            def __init__(self, base_api, portfolio_manager, strategy_name):
                self.base_api = base_api
                self.portfolio_manager = portfolio_manager
                self.strategy_name = strategy_name
                
            async def create_order(self, pair: str, side: str, order_type: str, 
                                 volume: float, price: float = None, **kwargs):
                """Create order with portfolio tracking"""
                
                # Check if strategy can trade this pair
                allocation = self.portfolio_manager.strategies[self.strategy_name]
                if pair not in allocation.pairs:
                    raise Exception(f"Strategy {self.strategy_name} not allowed to trade {pair}")
                    
                # Check position limits
                current_positions = len(self.portfolio_manager.strategy_positions[self.strategy_name])
                if current_positions >= allocation.max_positions and side == 'buy':
                    raise Exception(f"Strategy {self.strategy_name} at max positions ({allocation.max_positions})")
                    
                # Check capital allocation
                order_value = volume * (price or await self._get_current_price(pair))
                allocated_capital = self.portfolio_manager.strategy_capital[self.strategy_name]
                
                if order_value > allocated_capital * 0.5:  # Max 50% of allocated capital per trade
                    raise Exception(f"Order too large for {self.strategy_name} allocation")
                    
                # Execute order through base API
                result = await self.base_api.create_order(pair, side, order_type, volume, price, **kwargs)
                
                # Track position
                if side == 'buy':
                    position = {
                        'pair': pair,
                        'volume': volume,
                        'entry_price': price or await self._get_current_price(pair),
                        'entry_time': datetime.now(),
                        'order_id': result.get('txid', ['unknown'])[0]
                    }
                    self.portfolio_manager.strategy_positions[self.strategy_name].append(position)
                    
                elif side == 'sell':
                    # Remove or reduce position
                    positions = self.portfolio_manager.strategy_positions[self.strategy_name]
                    for i, pos in enumerate(positions):
                        if pos['pair'] == pair:
                            if pos['volume'] <= volume:
                                positions.pop(i)
                                break
                            else:
                                pos['volume'] -= volume
                                break
                                
                return result
                
            async def _get_current_price(self, pair: str) -> float:
                """Get current price for a pair"""
                ticker = await self.base_api.get_ticker(pair)
                return float(ticker[pair]['c'][0])
                
            # Delegate other API calls to base API
            def __getattr__(self, name):
                return getattr(self.base_api, name)
                
        return StrategyAPIWrapper(self.api, self, strategy_name)
        
    async def run_portfolio(self):
        """Main portfolio management loop"""
        logger.info("🚀 Starting portfolio management")
        
        await self.initialize_strategies()
        
        try:
            while True:
                # Generate signals from all strategies
                all_signals = []
                
                # Get current market data
                market_data = await self._get_market_data()
                
                for name, strategy in self.strategy_instances.items():
                    if self.strategies[name].enabled:
                        try:
                            # Get signals from strategy
                            signals = strategy.analyze(market_data)
                            
                            # Add strategy name to signals
                            for signal in signals:
                                signal['strategy'] = name
                                all_signals.append(signal)
                                
                        except Exception as e:
                            logger.error(f"Error in strategy {name}: {e}")
                            
                # Execute signals with portfolio risk management
                await self._execute_portfolio_signals(all_signals)
                
                # Check if rebalancing is needed
                if self._should_rebalance():
                    await self._rebalance_portfolio()
                    
                # Update portfolio metrics
                await self._update_portfolio_metrics()
                
                # Wait before next iteration
                await asyncio.sleep(60)  # Check every minute
                
        except Exception as e:
            logger.error(f"Portfolio management error: {e}")
            
    async def _get_market_data(self) -> Dict[str, Any]:
        """Get current market data for all pairs"""
        market_data = {}
        
        # Get all unique pairs from strategies
        all_pairs = set()
        for allocation in self.strategies.values():
            all_pairs.update(allocation.pairs)
            
        # Fetch current data for each pair
        for pair in all_pairs:
            try:
                ticker = await self.api.get_ticker(pair)
                # Create mock price data for strategy analysis
                market_data[pair] = {
                    'open': float(ticker[pair]['c'][0]) * 0.999,
                    'high': float(ticker[pair]['h'][0]),
                    'low': float(ticker[pair]['l'][0]),
                    'close': float(ticker[pair]['c'][0]),
                    'volume': float(ticker[pair]['v'][0])
                }
            except Exception as e:
                logger.error(f"Failed to get data for {pair}: {e}")
                
        return market_data
        
    async def _execute_portfolio_signals(self, signals: List[Dict]):
        """Execute signals with portfolio-level risk management"""
        
        if not signals:
            return
            
        # Sort signals by priority/confidence if available
        signals.sort(key=lambda x: x.get('confidence', 0.5), reverse=True)
        
        # Portfolio-level risk checks
        total_exposure = await self._calculate_total_exposure()
        
        for signal in signals:
            try:
                strategy_name = signal['strategy']
                
                # Check if strategy is still enabled
                if not self.strategies[strategy_name].enabled:
                    continue
                    
                # Check portfolio exposure limits
                if signal['action'] == 'buy':
                    order_value = signal['volume'] * signal.get('price', 0)
                    
                    if total_exposure + order_value > self.total_capital * self.max_total_exposure:
                        logger.warning(f"Skipping {strategy_name} buy: portfolio exposure limit")
                        continue
                        
                # Execute signal through strategy API wrapper
                strategy_api = self._create_strategy_api_wrapper(strategy_name)
                
                await strategy_api.create_order(
                    pair=signal['pair'],
                    side=signal['action'],
                    order_type='market',
                    volume=signal['volume'],
                    price=signal.get('price')
                )
                
                logger.info(f"Executed {strategy_name} signal: {signal['action']} {signal['pair']}")
                
            except Exception as e:
                logger.error(f"Failed to execute signal: {e}")
                
    async def _calculate_total_exposure(self) -> float:
        """Calculate total portfolio exposure"""
        total_exposure = 0
        
        for strategy_name, positions in self.strategy_positions.items():
            for position in positions:
                # Get current price
                try:
                    ticker = await self.api.get_ticker(position['pair'])
                    current_price = float(ticker[position['pair']]['c'][0])
                    exposure = position['volume'] * current_price
                    total_exposure += exposure
                except:
                    # Use entry price if current price unavailable
                    exposure = position['volume'] * position['entry_price']
                    total_exposure += exposure
                    
        return total_exposure
        
    def _should_rebalance(self) -> bool:
        """Check if portfolio should be rebalanced"""
        time_since_rebalance = datetime.now() - self.last_rebalance
        return time_since_rebalance.total_seconds() > self.rebalance_frequency
        
    async def _rebalance_portfolio(self):
        """Rebalance portfolio allocations"""
        logger.info("🔄 Rebalancing portfolio...")
        
        # Update capital allocations based on performance
        total_allocation = sum(s.allocation_pct for s in self.strategies.values() if s.enabled)
        
        if total_allocation > 0:
            for name, allocation in self.strategies.items():
                if allocation.enabled:
                    self.strategy_capital[name] = self.total_capital * allocation.allocation_pct
                    
        self.last_rebalance = datetime.now()
        logger.info("Portfolio rebalanced")
        
    async def _update_portfolio_metrics(self):
        """Update portfolio performance metrics"""
        try:
            # Get current account balance
            balance = await self.api.get_account_balance()
            current_capital = float(balance.get('ZUSD', self.total_capital))
            
            # Calculate total P&L
            total_pnl = current_capital - self.total_capital
            total_pnl_pct = total_pnl / self.total_capital
            
            # Calculate strategy performance
            strategy_performance = {}
            for name in self.strategies.keys():
                positions = self.strategy_positions.get(name, [])
                strategy_performance[name] = {
                    'active_positions': len(positions),
                    'allocated_capital': self.strategy_capital.get(name, 0),
                    'enabled': self.strategies[name].enabled
                }
                
            # Create metrics object
            metrics = PortfolioMetrics(
                total_capital=self.total_capital,
                allocated_capital=sum(self.strategy_capital.values()),
                available_capital=current_capital - await self._calculate_total_exposure(),
                total_pnl=total_pnl,
                total_pnl_pct=total_pnl_pct,
                daily_pnl=self._calculate_daily_pnl(),
                active_strategies=len([s for s in self.strategies.values() if s.enabled]),
                total_positions=sum(len(positions) for positions in self.strategy_positions.values()),
                strategy_performance=strategy_performance
            )
            
            # Store historical data
            self.portfolio_history.append({
                'timestamp': datetime.now(),
                'metrics': metrics
            })
            
            # Keep only recent history
            if len(self.portfolio_history) > 1440:  # 24 hours at 1-minute intervals
                self.portfolio_history = self.portfolio_history[-1440:]
                
        except Exception as e:
            logger.error(f"Error updating portfolio metrics: {e}")
            
    def _calculate_daily_pnl(self) -> float:
        """Calculate P&L for current day"""
        today = datetime.now().date()
        
        daily_history = [
            h for h in self.portfolio_history 
            if h['timestamp'].date() == today
        ]
        
        if len(daily_history) < 2:
            return 0.0
            
        start_capital = daily_history[0]['metrics'].total_capital
        current_capital = daily_history[-1]['metrics'].total_capital + daily_history[-1]['metrics'].total_pnl
        
        return current_capital - start_capital
        
    def get_portfolio_status(self) -> Dict:
        """Get current portfolio status"""
        if not self.portfolio_history:
            return {'status': 'No data available'}
            
        latest_metrics = self.portfolio_history[-1]['metrics']
        
        return {
            'portfolio_metrics': {
                'total_capital': latest_metrics.total_capital,
                'current_value': latest_metrics.total_capital + latest_metrics.total_pnl,
                'total_pnl': latest_metrics.total_pnl,
                'total_pnl_pct': latest_metrics.total_pnl_pct,
                'daily_pnl': latest_metrics.daily_pnl,
                'allocated_capital': latest_metrics.allocated_capital,
                'available_capital': latest_metrics.available_capital,
                'active_strategies': latest_metrics.active_strategies,
                'total_positions': latest_metrics.total_positions
            },
            'strategy_breakdown': latest_metrics.strategy_performance,
            'uptime': str(datetime.now() - self.start_time),
            'last_update': self.portfolio_history[-1]['timestamp'].isoformat()
        }
        
    async def shutdown(self):
        """Shutdown portfolio manager"""
        logger.info("Shutting down portfolio manager...")
        
        # Reset all strategies
        for strategy in self.strategy_instances.values():
            if hasattr(strategy, 'reset'):
                strategy.reset()
                
        # Export final metrics
        self._export_portfolio_report()
        
    def _export_portfolio_report(self):
        """Export portfolio performance report"""
        try:
            report = {
                'portfolio_summary': self.get_portfolio_status(),
                'strategy_allocations': {
                    name: {
                        'allocation_pct': alloc.allocation_pct,
                        'pairs': alloc.pairs,
                        'enabled': alloc.enabled
                    }
                    for name, alloc in self.strategies.items()
                },
                'exported_at': datetime.now().isoformat()
            }
            
            filename = f"portfolio_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(filename, 'w') as f:
                json.dump(report, f, indent=2)
                
            logger.info(f"Portfolio report exported to {filename}")
            
        except Exception as e:
            logger.error(f"Failed to export portfolio report: {e}")