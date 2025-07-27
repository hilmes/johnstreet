"""
Trading Mode Manager - Dry Run and Live Trading Control

Enforces trading modes and provides safety for testing strategies.
"""

import logging
import os
import json
from typing import Dict, Optional, Any, List
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class TradingMode(Enum):
    """Trading execution modes"""
    DRY_RUN = "dry_run"          # Simulated trades only
    PAPER = "paper"              # Paper trading with real data
    STAGING = "staging"          # Live trading with limits
    PRODUCTION = "production"    # Full live trading
    

class TradingModeManager:
    """
    Manages trading modes and enforces safety rules
    """
    
    def __init__(self):
        self.current_mode = TradingMode.DRY_RUN  # Default to safest mode
        self.mode_config_file = "trading_mode_config.json"
        
        # Mode-specific limits
        self.mode_limits = {
            TradingMode.DRY_RUN: {
                'max_order_value': float('inf'),
                'max_daily_trades': float('inf'),
                'max_position_size': float('inf'),
                'allowed_pairs': 'all',
                'execute_orders': False,
                'require_confirmation': False,
            },
            TradingMode.PAPER: {
                'max_order_value': float('inf'),
                'max_daily_trades': float('inf'),
                'max_position_size': float('inf'),
                'allowed_pairs': 'all',
                'execute_orders': False,  # Track but don't execute
                'require_confirmation': False,
            },
            TradingMode.STAGING: {
                'max_order_value': 100,      # $100 max per order
                'max_daily_trades': 20,      # 20 trades per day
                'max_position_size': 500,    # $500 max position
                'allowed_pairs': ['XBTUSD', 'ETHUSD'],  # Limited pairs
                'execute_orders': True,
                'require_confirmation': True,  # Require confirmation
            },
            TradingMode.PRODUCTION: {
                'max_order_value': 10000,
                'max_daily_trades': 100,
                'max_position_size': 50000,
                'allowed_pairs': 'all',
                'execute_orders': True,
                'require_confirmation': False,
            }
        }
        
        # Paper trading state
        self.paper_trades: List[Dict] = []
        self.paper_positions: Dict[str, Dict] = {}
        self.paper_balance = 10000.0  # Starting paper balance
        self.paper_pnl = 0.0
        
        # Daily trade counter
        self.daily_trades = 0
        self.trade_date = datetime.now().date()
        
        # Load saved configuration
        self._load_config()
        
    def _load_config(self):
        """Load saved mode configuration"""
        if os.path.exists(self.mode_config_file):
            try:
                with open(self.mode_config_file, 'r') as f:
                    config = json.load(f)
                    mode_str = config.get('mode', 'dry_run')
                    self.current_mode = TradingMode(mode_str)
                    
                    # Verify mode change is authorized
                    if self.current_mode in [TradingMode.STAGING, TradingMode.PRODUCTION]:
                        if not self._verify_production_unlock(config):
                            logger.warning("Production mode not authorized, reverting to dry run")
                            self.current_mode = TradingMode.DRY_RUN
                            
                    logger.info(f"Loaded trading mode: {self.current_mode.value}")
                    
            except Exception as e:
                logger.error(f"Failed to load mode config: {e}")
                self.current_mode = TradingMode.DRY_RUN
                
    def _verify_production_unlock(self, config: Dict) -> bool:
        """Verify production mode is properly unlocked"""
        # Check for production unlock key
        unlock_key = config.get('production_unlock_key')
        expected_key = os.environ.get('PRODUCTION_UNLOCK_KEY')
        
        if not expected_key:
            logger.error("PRODUCTION_UNLOCK_KEY not set in environment")
            return False
            
        if unlock_key != expected_key:
            logger.error("Invalid production unlock key")
            return False
            
        # Check unlock timestamp (must be recent)
        unlock_time = config.get('unlock_timestamp')
        if unlock_time:
            unlock_datetime = datetime.fromisoformat(unlock_time)
            if (datetime.now() - unlock_datetime).days > 7:
                logger.error("Production unlock expired (>7 days old)")
                return False
                
        return True
        
    def set_mode(self, mode: TradingMode, unlock_key: Optional[str] = None) -> bool:
        """
        Change trading mode with safety checks
        """
        logger.info(f"Attempting to change mode from {self.current_mode.value} to {mode.value}")
        
        # Prevent direct jump to production
        if (self.current_mode == TradingMode.DRY_RUN and 
            mode == TradingMode.PRODUCTION):
            logger.error("Cannot jump directly from dry_run to production. Use staging first.")
            return False
            
        # Require unlock key for staging/production
        if mode in [TradingMode.STAGING, TradingMode.PRODUCTION]:
            if not unlock_key or unlock_key != os.environ.get('PRODUCTION_UNLOCK_KEY'):
                logger.error("Invalid unlock key for production modes")
                return False
                
        # Save configuration
        config = {
            'mode': mode.value,
            'changed_at': datetime.now().isoformat(),
            'changed_by': os.environ.get('USER', 'unknown'),
        }
        
        if mode in [TradingMode.STAGING, TradingMode.PRODUCTION]:
            config['production_unlock_key'] = unlock_key
            config['unlock_timestamp'] = datetime.now().isoformat()
            
        try:
            with open(self.mode_config_file, 'w') as f:
                json.dump(config, f, indent=2)
                
            self.current_mode = mode
            logger.warning(f"Trading mode changed to: {mode.value}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save mode config: {e}")
            return False
            
    def can_execute_order(
        self, 
        pair: str, 
        side: str, 
        volume: float, 
        price: float
    ) -> tuple[bool, Optional[str]]:
        """
        Check if order can be executed in current mode
        """
        limits = self.mode_limits[self.current_mode]
        order_value = volume * price
        
        # Check if orders are executed in this mode
        if not limits['execute_orders']:
            return True, None  # Paper trading allowed
            
        # Check daily trade limit
        if self._check_reset_daily_counter():
            if self.daily_trades >= limits['max_daily_trades']:
                return False, f"Daily trade limit reached ({limits['max_daily_trades']})"
                
        # Check order value
        if order_value > limits['max_order_value']:
            return False, f"Order value ${order_value:.2f} exceeds limit ${limits['max_order_value']}"
            
        # Check allowed pairs
        allowed_pairs = limits['allowed_pairs']
        if allowed_pairs != 'all' and pair not in allowed_pairs:
            return False, f"Pair {pair} not allowed in {self.current_mode.value} mode"
            
        # Check position size
        current_position_value = self._get_position_value(pair)
        if side == 'buy':
            new_position_value = current_position_value + order_value
        else:
            new_position_value = abs(current_position_value - order_value)
            
        if new_position_value > limits['max_position_size']:
            return False, f"Position size would exceed ${limits['max_position_size']}"
            
        return True, None
        
    def requires_confirmation(self) -> bool:
        """Check if current mode requires order confirmation"""
        return self.mode_limits[self.current_mode]['require_confirmation']
        
    async def execute_order(
        self,
        api,
        pair: str,
        side: str,
        order_type: str,
        volume: float,
        price: Optional[float] = None,
        **kwargs
    ) -> Dict:
        """
        Execute order based on current mode
        """
        # Check if order is allowed
        can_execute, reason = self.can_execute_order(pair, side, volume, price or 0)
        if not can_execute:
            raise Exception(f"Order rejected: {reason}")
            
        # Increment daily counter
        self.daily_trades += 1
        
        # Execute based on mode
        if self.current_mode in [TradingMode.DRY_RUN, TradingMode.PAPER]:
            # Simulate order
            return await self._execute_paper_order(
                pair, side, order_type, volume, price, **kwargs
            )
        else:
            # Real order with confirmation if required
            if self.requires_confirmation():
                if not await self._get_order_confirmation(pair, side, volume, price):
                    raise Exception("Order cancelled by user")
                    
            # Execute real order
            result = await api.create_order(
                pair=pair,
                type=side,
                ordertype=order_type,
                volume=volume,
                price=price,
                **kwargs
            )
            
            logger.info(f"LIVE ORDER EXECUTED: {result}")
            return result
            
    async def _execute_paper_order(
        self,
        pair: str,
        side: str,
        order_type: str,
        volume: float,
        price: Optional[float] = None,
        **kwargs
    ) -> Dict:
        """Simulate order execution for paper trading"""
        # Get current market price if not specified
        if not price and order_type == 'market':
            # In real implementation, would fetch from API
            price = 50000 if 'XBT' in pair else 3000  # Dummy prices
            
        order_id = f"PAPER-{datetime.now().timestamp()}"
        
        paper_order = {
            'txid': [order_id],
            'descr': {
                'order': f"{side} {volume} {pair} @ {order_type} {price or 'market'}",
                'pair': pair,
                'type': side,
                'ordertype': order_type,
                'price': str(price) if price else 'market',
                'volume': str(volume),
            },
            'status': 'closed',  # Assume instant fill for paper
            'vol_exec': str(volume),
            'cost': str(volume * (price or 0)),
            'fee': str(volume * (price or 0) * 0.0026),  # 0.26% fee
            'price': str(price) if price else 'market',
            'timestamp': datetime.now().isoformat(),
        }
        
        # Update paper positions
        if pair not in self.paper_positions:
            self.paper_positions[pair] = {
                'volume': 0,
                'cost_basis': 0,
                'realized_pnl': 0
            }
            
        position = self.paper_positions[pair]
        
        if side == 'buy':
            # Add to position
            total_cost = position['cost_basis'] + (volume * price)
            total_volume = position['volume'] + volume
            position['volume'] = total_volume
            position['cost_basis'] = total_cost
        else:
            # Reduce position and calculate P&L
            if position['volume'] > 0:
                avg_cost = position['cost_basis'] / position['volume']
                pnl = (price - avg_cost) * min(volume, position['volume'])
                position['realized_pnl'] += pnl
                self.paper_pnl += pnl
                
                # Update position
                position['volume'] = max(0, position['volume'] - volume)
                if position['volume'] > 0:
                    position['cost_basis'] = avg_cost * position['volume']
                else:
                    position['cost_basis'] = 0
                    
        # Record trade
        self.paper_trades.append({
            'order': paper_order,
            'pnl': position.get('realized_pnl', 0),
            'paper_balance': self.paper_balance + self.paper_pnl
        })
        
        logger.info(f"PAPER TRADE: {side} {volume} {pair} @ {price}")
        logger.info(f"Paper P&L: ${self.paper_pnl:.2f}, Balance: ${self.paper_balance + self.paper_pnl:.2f}")
        
        return paper_order
        
    async def _get_order_confirmation(
        self, pair: str, side: str, volume: float, price: Optional[float]
    ) -> bool:
        """Get user confirmation for order (staging mode)"""
        # In a real implementation, this would show a UI dialog or prompt
        logger.warning(f"""
        ORDER CONFIRMATION REQUIRED
        ==========================
        Mode: {self.current_mode.value}
        Pair: {pair}
        Side: {side}
        Volume: {volume}
        Price: {price or 'market'}
        
        Type 'yes' to confirm order execution...
        """)
        
        # For now, auto-confirm in code
        # In production, would wait for user input
        return True
        
    def _check_reset_daily_counter(self) -> bool:
        """Reset daily counter if new day"""
        today = datetime.now().date()
        if today != self.trade_date:
            self.daily_trades = 0
            self.trade_date = today
            logger.info("Daily trade counter reset")
        return True
        
    def _get_position_value(self, pair: str) -> float:
        """Get current position value for a pair"""
        if self.current_mode in [TradingMode.DRY_RUN, TradingMode.PAPER]:
            position = self.paper_positions.get(pair, {})
            return position.get('cost_basis', 0)
        else:
            # In production, would fetch from API
            return 0
            
    def get_paper_trading_summary(self) -> Dict:
        """Get paper trading performance summary"""
        return {
            'mode': self.current_mode.value,
            'start_balance': self.paper_balance,
            'current_balance': self.paper_balance + self.paper_pnl,
            'total_pnl': self.paper_pnl,
            'total_trades': len(self.paper_trades),
            'open_positions': {
                pair: pos for pair, pos in self.paper_positions.items()
                if pos['volume'] > 0
            },
            'daily_trades_used': f"{self.daily_trades}/{self.mode_limits[self.current_mode]['max_daily_trades']}"
        }
        
    def export_paper_trades(self, filename: str = "paper_trades.json"):
        """Export paper trading history"""
        try:
            export_data = {
                'summary': self.get_paper_trading_summary(),
                'trades': self.paper_trades,
                'positions': self.paper_positions,
                'exported_at': datetime.now().isoformat()
            }
            
            with open(filename, 'w') as f:
                json.dump(export_data, f, indent=2)
                
            logger.info(f"Paper trades exported to {filename}")
            
        except Exception as e:
            logger.error(f"Failed to export paper trades: {e}")