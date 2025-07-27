"""
Emergency Kill Switch and Safety System for Live Trading

This module provides critical safety mechanisms to immediately halt trading
and close positions in emergency situations.
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set
from enum import Enum
import json
import os

logger = logging.getLogger(__name__)


class TradingState(Enum):
    """Trading system states"""
    ACTIVE = "active"
    PAUSED = "paused"
    EMERGENCY_STOP = "emergency_stop"
    SHUTDOWN = "shutdown"


class KillSwitch:
    """
    Emergency trading kill switch with multiple trigger conditions
    """
    
    def __init__(self, kraken_api, risk_manager):
        self.api = kraken_api
        self.risk_manager = risk_manager
        self.state = TradingState.ACTIVE
        self.triggered_at: Optional[datetime] = None
        self.trigger_reason: Optional[str] = None
        
        # Safety thresholds
        self.max_daily_loss_pct = 0.05  # 5% daily loss triggers kill switch
        self.max_consecutive_losses = 5
        self.max_api_errors = 10
        self.max_order_failures = 5
        
        # Tracking
        self.daily_pnl = 0.0
        self.consecutive_losses = 0
        self.api_error_count = 0
        self.order_failure_count = 0
        self.start_balance = 0.0
        
        # State persistence
        self.state_file = "trading_state.json"
        self._load_state()
        
    def _load_state(self):
        """Load persisted kill switch state"""
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, 'r') as f:
                    data = json.load(f)
                    self.state = TradingState(data.get('state', 'active'))
                    if data.get('triggered_at'):
                        self.triggered_at = datetime.fromisoformat(data['triggered_at'])
                    self.trigger_reason = data.get('trigger_reason')
                    logger.warning(f"Loaded kill switch state: {self.state.value}")
            except Exception as e:
                logger.error(f"Failed to load kill switch state: {e}")
    
    def _save_state(self):
        """Persist kill switch state"""
        try:
            data = {
                'state': self.state.value,
                'triggered_at': self.triggered_at.isoformat() if self.triggered_at else None,
                'trigger_reason': self.trigger_reason,
                'timestamp': datetime.now().isoformat()
            }
            with open(self.state_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save kill switch state: {e}")
    
    async def check_conditions(self) -> bool:
        """
        Check all kill switch conditions
        Returns True if kill switch should be triggered
        """
        if self.state == TradingState.EMERGENCY_STOP:
            return True
            
        # Check daily loss
        if self.start_balance > 0:
            current_balance = await self._get_account_balance()
            daily_loss_pct = (self.start_balance - current_balance) / self.start_balance
            
            if daily_loss_pct >= self.max_daily_loss_pct:
                await self.trigger(f"Daily loss exceeded: {daily_loss_pct:.1%}")
                return True
        
        # Check consecutive losses
        if self.consecutive_losses >= self.max_consecutive_losses:
            await self.trigger(f"Consecutive losses: {self.consecutive_losses}")
            return True
            
        # Check API errors
        if self.api_error_count >= self.max_api_errors:
            await self.trigger(f"API errors exceeded: {self.api_error_count}")
            return True
            
        # Check order failures
        if self.order_failure_count >= self.max_order_failures:
            await self.trigger(f"Order failures exceeded: {self.order_failure_count}")
            return True
            
        # Check risk manager limits
        if self.risk_manager.is_max_drawdown_exceeded():
            await self.trigger("Maximum drawdown exceeded")
            return True
            
        return False
    
    async def trigger(self, reason: str):
        """Activate kill switch"""
        logger.critical(f"KILL SWITCH ACTIVATED: {reason}")
        self.state = TradingState.EMERGENCY_STOP
        self.triggered_at = datetime.now()
        self.trigger_reason = reason
        self._save_state()
        
        # Attempt to close all positions
        try:
            await self.emergency_close_all_positions()
        except Exception as e:
            logger.error(f"Failed to close positions during kill switch: {e}")
    
    async def emergency_close_all_positions(self):
        """Close all open positions immediately at market price"""
        logger.warning("EMERGENCY: Closing all positions")
        
        try:
            # Get all open orders and cancel them
            open_orders = await self.api.get_open_orders()
            for order_id in open_orders:
                try:
                    await self.api.cancel_order(order_id)
                    logger.info(f"Cancelled order: {order_id}")
                except Exception as e:
                    logger.error(f"Failed to cancel order {order_id}: {e}")
            
            # Get current positions
            positions = await self.api.get_open_positions()
            
            for position in positions:
                try:
                    # Market sell/close position
                    pair = position['pair']
                    volume = abs(float(position['vol']))
                    side = 'sell' if float(position['vol']) > 0 else 'buy'
                    
                    order = await self.api.create_order(
                        pair=pair,
                        type='market',
                        ordertype='market',
                        volume=volume,
                        trading_agreement='agree'  # Skip confirmations in emergency
                    )
                    
                    logger.warning(f"Emergency close order placed: {order}")
                    
                except Exception as e:
                    logger.error(f"Failed to close position {position}: {e}")
                    
        except Exception as e:
            logger.critical(f"Critical error during emergency close: {e}")
            
    async def _get_account_balance(self) -> float:
        """Get total account balance in USD"""
        try:
            balance = await self.api.get_account_balance()
            # Convert all to USD equivalent (simplified)
            total_usd = float(balance.get('ZUSD', 0))
            # Add other currency conversions here
            return total_usd
        except Exception:
            return 0.0
    
    def record_trade_result(self, pnl: float):
        """Record trade result for monitoring"""
        self.daily_pnl += pnl
        
        if pnl < 0:
            self.consecutive_losses += 1
        else:
            self.consecutive_losses = 0
            
    def record_api_error(self):
        """Record API error"""
        self.api_error_count += 1
        
    def record_order_failure(self):
        """Record order failure"""
        self.order_failure_count += 1
        
    def reset_daily_counters(self):
        """Reset daily tracking counters"""
        self.daily_pnl = 0.0
        self.api_error_count = 0
        self.order_failure_count = 0
        asyncio.create_task(self._update_start_balance())
        
    async def _update_start_balance(self):
        """Update start of day balance"""
        self.start_balance = await self._get_account_balance()
        
    def can_trade(self) -> bool:
        """Check if trading is allowed"""
        return self.state == TradingState.ACTIVE
        
    def pause_trading(self, reason: str = "Manual pause"):
        """Pause trading (can be resumed)"""
        logger.warning(f"Trading paused: {reason}")
        self.state = TradingState.PAUSED
        self._save_state()
        
    def resume_trading(self):
        """Resume trading after pause"""
        if self.state == TradingState.PAUSED:
            logger.info("Trading resumed")
            self.state = TradingState.ACTIVE
            self._save_state()
        else:
            logger.warning(f"Cannot resume from state: {self.state}")
            
    def reset_kill_switch(self, admin_key: str):
        """Reset kill switch (requires admin key)"""
        # In production, verify admin_key against secure storage
        if admin_key == os.environ.get('KILL_SWITCH_RESET_KEY'):
            logger.warning("Kill switch reset by admin")
            self.state = TradingState.ACTIVE
            self.triggered_at = None
            self.trigger_reason = None
            self.consecutive_losses = 0
            self._save_state()
        else:
            logger.error("Invalid admin key for kill switch reset")