"""
Grid Trading Strategy

Places buy and sell orders at regular intervals around current price.
Works well in sideways/choppy markets with regular oscillations.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class GridTradingStrategy:
    """
    Automated grid trading strategy
    
    Creates a grid of buy/sell orders around current price.
    Profits from price oscillations within a range.
    """
    
    def __init__(
        self,
        api,
        grid_spacing_pct: float = 0.01,     # 1% spacing between grid levels
        num_grid_levels: int = 10,          # 5 levels above, 5 below current price
        position_size_pct: float = 0.02,    # 2% of capital per grid level
        max_position_pct: float = 0.20,     # Maximum 20% of capital in one pair
        rebalance_threshold: float = 0.05,  # Rebalance grid if price moves 5%
        volatility_lookback: int = 50,      # Periods for volatility calculation
        min_spread_pct: float = 0.005,      # Minimum 0.5% spread
        max_spread_pct: float = 0.03        # Maximum 3% spread
    ):
        self.api = api
        self.grid_spacing_pct = grid_spacing_pct
        self.num_grid_levels = num_grid_levels
        self.position_size_pct = position_size_pct
        self.max_position_pct = max_position_pct
        self.rebalance_threshold = rebalance_threshold
        self.volatility_lookback = volatility_lookback
        self.min_spread_pct = min_spread_pct
        self.max_spread_pct = max_spread_pct
        
        # State tracking
        self.grids = {}  # pair -> grid state
        self.positions = {}  # pair -> position info
        self.price_history = {}
        
    def analyze(self, market_data: Dict[str, pd.Series]) -> List[Dict]:
        """Analyze market data and generate grid trading signals"""
        signals = []
        
        for pair, current_price_data in market_data.items():
            try:
                # Update price history
                if pair not in self.price_history:
                    self.price_history[pair] = []
                    
                self.price_history[pair].append({
                    'timestamp': current_price_data.name,
                    'close': current_price_data['close'],
                    'volume': current_price_data['volume']
                })
                
                # Keep reasonable history
                if len(self.price_history[pair]) > self.volatility_lookback * 2:
                    self.price_history[pair] = self.price_history[pair][-self.volatility_lookback * 2:]
                    
                # Need enough history for volatility calculation
                if len(self.price_history[pair]) < self.volatility_lookback:
                    continue
                    
                # Convert to DataFrame
                df = pd.DataFrame(self.price_history[pair])
                
                # Generate grid signals
                pair_signals = self._manage_grid(pair, df)
                signals.extend(pair_signals)
                
            except Exception as e:
                logger.error(f"Error managing grid for {pair}: {e}")
                
        return signals
        
    def _manage_grid(self, pair: str, df: pd.DataFrame) -> List[Dict]:
        """Manage grid for a specific pair"""
        signals = []
        current_price = df['close'].iloc[-1]
        
        # Initialize or check if grid needs rebalancing
        if pair not in self.grids or self._should_rebalance_grid(pair, current_price):
            # Calculate optimal grid parameters
            volatility = self._calculate_volatility(df['close'])
            grid_spacing = self._calculate_optimal_spacing(volatility)
            
            # Create new grid
            new_grid = self._create_grid(pair, current_price, grid_spacing)
            
            if pair in self.grids:
                logger.info(f"🔄 Rebalancing grid for {pair} at ${current_price:.2f}")
            else:
                logger.info(f"🎯 Creating new grid for {pair} at ${current_price:.2f}")
                
            self.grids[pair] = new_grid
            
        # Check for grid level triggers
        grid = self.grids[pair]
        triggered_signals = self._check_grid_triggers(pair, current_price, grid)
        signals.extend(triggered_signals)
        
        return signals
        
    def _create_grid(self, pair: str, center_price: float, spacing: float) -> Dict:
        """Create a new trading grid"""
        grid = {
            'center_price': center_price,
            'spacing': spacing,
            'buy_levels': [],
            'sell_levels': [],
            'filled_levels': set(),
            'created_at': datetime.now()
        }
        
        # Create buy levels (below current price)
        for i in range(1, self.num_grid_levels // 2 + 1):
            buy_price = center_price * (1 - spacing * i)
            grid['buy_levels'].append({
                'price': buy_price,
                'level': -i,
                'status': 'pending'
            })
            
        # Create sell levels (above current price)
        for i in range(1, self.num_grid_levels // 2 + 1):
            sell_price = center_price * (1 + spacing * i)
            grid['sell_levels'].append({
                'price': sell_price,
                'level': i,
                'status': 'pending'
            })
            
        return grid
        
    def _should_rebalance_grid(self, pair: str, current_price: float) -> bool:
        """Check if grid should be rebalanced"""
        if pair not in self.grids:
            return True
            
        grid = self.grids[pair]
        center_price = grid['center_price']
        
        # Rebalance if price moved significantly from center
        price_change = abs(current_price - center_price) / center_price
        return price_change > self.rebalance_threshold
        
    def _check_grid_triggers(self, pair: str, current_price: float, grid: Dict) -> List[Dict]:
        """Check if any grid levels are triggered"""
        signals = []
        
        # Check buy levels
        for level in grid['buy_levels']:
            if level['status'] == 'pending' and current_price <= level['price']:
                # Trigger buy order
                signal = self._create_grid_buy_signal(pair, level, current_price)
                if signal:
                    signals.append(signal)
                    level['status'] = 'filled'
                    grid['filled_levels'].add(level['level'])
                    
        # Check sell levels
        for level in grid['sell_levels']:
            if level['status'] == 'pending' and current_price >= level['price']:
                # Trigger sell order (only if we have position)
                signal = self._create_grid_sell_signal(pair, level, current_price)
                if signal:
                    signals.append(signal)
                    level['status'] = 'filled'
                    grid['filled_levels'].add(level['level'])
                    
        return signals
        
    def _create_grid_buy_signal(self, pair: str, level: Dict, current_price: float) -> Optional[Dict]:
        """Create buy signal for grid level"""
        try:
            # Calculate position size
            account_balance = await self._get_account_balance()
            position_value = account_balance * self.position_size_pct
            volume = position_value / current_price
            
            # Check maximum position limit
            current_exposure = self._get_current_exposure(pair)
            if current_exposure + position_value > account_balance * self.max_position_pct:
                logger.warning(f"Grid buy skipped for {pair}: position limit reached")
                return None
                
            # Update position tracking
            if pair not in self.positions:
                self.positions[pair] = {
                    'total_volume': 0,
                    'avg_price': 0,
                    'grid_levels': []
                }
                
            pos = self.positions[pair]
            new_total_volume = pos['total_volume'] + volume
            new_avg_price = (pos['avg_price'] * pos['total_volume'] + current_price * volume) / new_total_volume
            
            pos['total_volume'] = new_total_volume
            pos['avg_price'] = new_avg_price
            pos['grid_levels'].append(level['level'])
            
            logger.info(f"🟢 GRID BUY {pair}: ${current_price:.2f} (Level {level['level']}, "
                       f"Volume: {volume:.6f})")
            
            return {
                'action': 'buy',
                'pair': pair,
                'volume': volume,
                'price': current_price,
                'reason': f'grid_level_{level["level"]}'
            }
            
        except Exception as e:
            logger.error(f"Error creating grid buy signal: {e}")
            return None
            
    def _create_grid_sell_signal(self, pair: str, level: Dict, current_price: float) -> Optional[Dict]:
        """Create sell signal for grid level"""
        try:
            # Only sell if we have a position
            if pair not in self.positions or self.positions[pair]['total_volume'] <= 0:
                return None
                
            pos = self.positions[pair]
            
            # Calculate volume to sell (proportional to grid level)
            sell_ratio = self.position_size_pct  # Sell same proportion as we buy
            volume = pos['total_volume'] * sell_ratio
            
            # Don't sell more than we have
            volume = min(volume, pos['total_volume'])
            
            if volume <= 0:
                return None
                
            # Update position
            pos['total_volume'] -= volume
            if level['level'] in pos['grid_levels']:
                pos['grid_levels'].remove(level['level'])
                
            # Calculate P&L
            pnl = (current_price - pos['avg_price']) * volume
            pnl_pct = (current_price - pos['avg_price']) / pos['avg_price']
            
            logger.info(f"🔴 GRID SELL {pair}: ${current_price:.2f} (Level {level['level']}, "
                       f"Volume: {volume:.6f}, P&L: ${pnl:.2f}, {pnl_pct:.1%})")
            
            return {
                'action': 'sell',
                'pair': pair,
                'volume': volume,
                'price': current_price,
                'reason': f'grid_level_{level["level"]}'
            }
            
        except Exception as e:
            logger.error(f"Error creating grid sell signal: {e}")
            return None
            
    def _calculate_volatility(self, prices: pd.Series) -> float:
        """Calculate price volatility"""
        if len(prices) < 2:
            return 0.02  # Default 2%
            
        returns = prices.pct_change().dropna()
        return returns.std() if len(returns) > 0 else 0.02
        
    def _calculate_optimal_spacing(self, volatility: float) -> float:
        """Calculate optimal grid spacing based on volatility"""
        # Base spacing on volatility but within limits
        optimal_spacing = max(volatility * 2, self.min_spread_pct)
        optimal_spacing = min(optimal_spacing, self.max_spread_pct)
        
        return optimal_spacing
        
    def _get_current_exposure(self, pair: str) -> float:
        """Get current exposure for a pair"""
        if pair not in self.positions:
            return 0
            
        pos = self.positions[pair]
        return pos['total_volume'] * pos['avg_price']
        
    async def _get_account_balance(self) -> float:
        """Get account balance"""
        try:
            balance = await self.api.get_account_balance()
            return float(balance.get('ZUSD', 10000))
        except:
            return 10000
            
    def get_strategy_info(self) -> Dict:
        """Get strategy information"""
        total_pairs = len(self.grids)
        total_positions = len([p for p in self.positions.values() if p['total_volume'] > 0])
        
        return {
            'name': 'Grid Trading Strategy',
            'description': 'Automated grid trading with dynamic rebalancing',
            'parameters': {
                'grid_spacing': f"{self.grid_spacing_pct:.1%}",
                'grid_levels': self.num_grid_levels,
                'position_size': f"{self.position_size_pct:.1%}",
                'max_position': f"{self.max_position_pct:.1%}",
                'rebalance_threshold': f"{self.rebalance_threshold:.1%}"
            },
            'active_grids': total_pairs,
            'active_positions': total_positions,
            'grid_status': {
                pair: {
                    'center_price': grid['center_price'],
                    'spacing': f"{grid['spacing']:.1%}",
                    'filled_levels': len(grid['filled_levels'])
                }
                for pair, grid in self.grids.items()
            }
        }
        
    def reset(self):
        """Reset strategy state"""
        self.grids.clear()
        self.positions.clear()
        self.price_history.clear()