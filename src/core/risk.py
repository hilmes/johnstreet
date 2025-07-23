from dataclasses import dataclass
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import logging
import pandas as pd
import numpy as np

@dataclass
class RiskLimits:
    max_position_size: float
    max_leverage: int
    max_daily_loss: float
    max_drawdown: float
    max_open_positions: int
    min_margin_level: float
    position_limits: Dict[str, float]
    
class RiskManager:
    """Comprehensive risk management system"""
    
    def __init__(self, config, db_manager):
        self.config = config
        self.db = db_manager
        self.risk_limits = RiskLimits(
            max_position_size=config.MAX_POSITION_SIZE,
            max_leverage=config.MAX_LEVERAGE,
            max_daily_loss=config.MAX_DAILY_LOSS,  # 2% of account
            max_drawdown=getattr(config, 'MAX_DRAWDOWN', 0.10),  # 10% max drawdown
            max_open_positions=getattr(config, 'MAX_OPEN_POSITIONS', 5),
            min_margin_level=getattr(config, 'MIN_MARGIN_LEVEL', 2.0),
            position_limits=getattr(config, 'POSITION_LIMITS', {
                'XBT/USD': 1.0,
                'ETH/USD': 5.0,
                'default': 0.5
            })
        )
        self.reset_daily_metrics()
    
    def reset_daily_metrics(self):
        """Reset daily tracking metrics"""
        self.daily_trades = 0
        self.daily_pnl = 0.0
        self.daily_volume = 0.0
        self.last_reset = datetime.now()
    
    def check_trade(self, trade_signal: Dict) -> bool:
        """Validate trade against all risk parameters"""
        try:
            # Check if we need to reset daily metrics
            if datetime.now() - self.last_reset > timedelta(days=1):
                self.reset_daily_metrics()
            
            # Get current portfolio state
            portfolio = self._get_portfolio_state()
            
            # Run all risk checks
            checks = [
                self._check_position_size(trade_signal, portfolio),
                self._check_leverage(trade_signal, portfolio),
                self._check_daily_limits(trade_signal),
                self._check_drawdown(trade_signal),
                self._check_margin_level(portfolio),
                self._check_correlation_risk(trade_signal, portfolio)
            ]
            
            return all(checks)
            
        except Exception as e:
            logging.error(f"Error in risk check: {e}")
            return False
    
    def _get_portfolio_state(self) -> Dict:
        """Get current portfolio state"""
        try:
            # Get open positions from database
            positions = self.db.get_open_positions()
            
            # Calculate portfolio metrics
            total_exposure = sum(pos['volume'] * pos['price'] for pos in positions)
            used_margin = total_exposure / self.risk_limits.max_leverage
            available_margin = self.config['ACCOUNT_SIZE'] - used_margin
            
            return {
                'positions': positions,
                'total_exposure': total_exposure,
                'used_margin': used_margin,
                'available_margin': available_margin,
                'position_count': len(positions)
            }
        except Exception as e:
            logging.error(f"Error getting portfolio state: {e}")
            return {}
    
    def _check_position_size(self, trade_signal: Dict, portfolio: Dict) -> bool:
        """Check if position size is within limits"""
        pair = trade_signal.get('pair', '')
        size = trade_signal.get('position_size', 0)
        
        # Get pair-specific limit
        max_size = self.risk_limits.position_limits.get(
            pair,
            self.risk_limits.position_limits['default']
        )
        
        # Check absolute size
        if size > max_size:
            logging.warning(f"Position size {size} exceeds limit {max_size}")
            return False
        
        # Check total exposure
        new_exposure = portfolio['total_exposure'] + (size * trade_signal.get('price', 0))
        if new_exposure > self.config['ACCOUNT_SIZE'] * self.risk_limits.max_position_size:
            logging.warning("Total exposure would exceed account limits")
            return False
        
        return True
    
    def _check_leverage(self, trade_signal: Dict, portfolio: Dict) -> bool:
        """Check leverage limits"""
        if trade_signal.get('leverage', 1) > self.risk_limits.max_leverage:
            logging.warning("Leverage exceeds maximum allowed")
            return False
        
        new_exposure = portfolio['total_exposure'] + (
            trade_signal.get('position_size', 0) * 
            trade_signal.get('price', 0) * 
            trade_signal.get('leverage', 1)
        )
        
        if new_exposure > self.config['ACCOUNT_SIZE'] * self.risk_limits.max_leverage:
            logging.warning("Total leveraged exposure would exceed limits")
            return False
        
        return True
    
    def _check_daily_limits(self, trade_signal: Dict) -> bool:
        """Check daily trading limits"""
        # Check max daily loss
        if self.daily_pnl < -self.config['ACCOUNT_SIZE'] * self.risk_limits.max_daily_loss:
            logging.warning("Daily loss limit reached")
            return False
        
        # Check volume limits
        if self.daily_volume > self.config['ACCOUNT_SIZE'] * 3:  # 3x account size daily volume limit
            logging.warning("Daily volume limit reached")
            return False
        
        return True
    
    def _check_drawdown(self, trade_signal: Dict) -> bool:
        """Check drawdown limits"""
        try:
            # Get historical equity curve
            equity_data = self.db.get_equity_curve()
            if equity_data.empty:
                return True
            
            # Calculate current drawdown
            peak = equity_data['equity'].cummax()
            drawdown = (equity_data['equity'] - peak) / peak
            current_dd = drawdown.iloc[-1]
            
            if abs(current_dd) > self.risk_limits.max_drawdown:
                logging.warning(f"Max drawdown limit reached: {current_dd:.2%}")
                return False
            
            return True
            
        except Exception as e:
            logging.error(f"Error checking drawdown: {e}")
            return False
    
    def _check_margin_level(self, portfolio: Dict) -> bool:
        """Check margin levels"""
        if portfolio.get('used_margin', 0) == 0:
            return True
            
        margin_level = portfolio.get('available_margin', 0) / portfolio.get('used_margin', 1)
        if margin_level < self.risk_limits.min_margin_level:
            logging.warning(f"Margin level too low: {margin_level:.2f}")
            return False
        
        return True
    
    def _check_correlation_risk(self, trade_signal: Dict, portfolio: Dict) -> bool:
        """Check portfolio correlation risk"""
        try:
            # Get correlation matrix of current positions
            positions = portfolio.get('positions', [])
            if not positions:
                return True
            
            pairs = [pos['pair'] for pos in positions] + [trade_signal['pair']]
            
            # Get historical price data
            prices = self._get_historical_prices(pairs)
            if prices.empty:
                return True
            
            # Calculate correlation matrix
            corr_matrix = prices.pct_change().corr()
            
            # Check if any correlation is too high (e.g., > 0.8)
            high_corr = (corr_matrix > 0.8).sum().sum() - len(pairs)  # Subtract diagonal
            if high_corr > 0:
                logging.warning("High correlation detected in portfolio")
                return False
            
            return True
            
        except Exception as e:
            logging.error(f"Error checking correlation: {e}")
            return True  # Default to allowing trade on error
    
    def _get_historical_prices(self, pairs: List[str]) -> pd.DataFrame:
        """Get historical price data for correlation analysis"""
        try:
            # Get last 30 days of closing prices
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            prices = pd.DataFrame()
            for pair in pairs:
                pair_data = self.db.get_historical_prices(
                    pair,
                    start_date,
                    end_date
                )
                if not pair_data.empty:
                    prices[pair] = pair_data['close']
            
            return prices
            
        except Exception as e:
            logging.error(f"Error getting historical prices: {e}")
            return pd.DataFrame()