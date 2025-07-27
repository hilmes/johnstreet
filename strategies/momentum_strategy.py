"""
Momentum Trading Strategy

Buys when price shows strong upward momentum, sells on reversal.
Works well in trending markets.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging
import sys
from pathlib import Path

# Add parent directory for regime detector
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from market_regime_detector import MarketRegimeDetector, MarketRegime
except ImportError:
    # Fallback if regime detector not available
    MarketRegimeDetector = None
    MarketRegime = None

logger = logging.getLogger(__name__)


class MomentumStrategy:
    """
    Simple but effective momentum strategy
    
    Entry: When price breaks above recent high with volume confirmation
    Exit: When momentum reverses or stop loss hit
    """
    
    def __init__(
        self,
        api,
        lookback_period: int = 20,
        momentum_threshold: float = 0.02,  # 2% price move
        volume_threshold: float = 1.5,     # 50% above average volume
        stop_loss_pct: float = 0.03,       # 3% stop loss
        take_profit_pct: float = 0.06,     # 6% take profit
        position_size_pct: float = 0.10,   # 10% of capital per trade
        cooldown_periods: int = 5,          # Wait 5 periods between trades
        use_regime_detection: bool = True   # Use market regime detection
    ):
        self.api = api
        self.lookback_period = lookback_period
        self.momentum_threshold = momentum_threshold
        self.volume_threshold = volume_threshold
        self.stop_loss_pct = stop_loss_pct
        self.take_profit_pct = take_profit_pct
        self.position_size_pct = position_size_pct
        self.cooldown_periods = cooldown_periods
        self.use_regime_detection = use_regime_detection
        
        # Market regime detector
        self.regime_detector = None
        if self.use_regime_detection and MarketRegimeDetector is not None:
            self.regime_detector = MarketRegimeDetector(lookback_periods=lookback_period)
        
        # State tracking
        self.positions = {}
        self.last_trade_time = {}
        self.price_history = {}
        
    def analyze(self, market_data: Dict[str, pd.Series]) -> List[Dict]:
        """
        Analyze market data and generate trading signals
        """
        signals = []
        
        for pair, current_price_data in market_data.items():
            try:
                # Update price history
                if pair not in self.price_history:
                    self.price_history[pair] = []
                    
                # Add current price data
                self.price_history[pair].append({
                    'timestamp': current_price_data.name,
                    'open': current_price_data['open'],
                    'high': current_price_data['high'],
                    'low': current_price_data['low'],
                    'close': current_price_data['close'],
                    'volume': current_price_data['volume']
                })
                
                # Keep only recent history
                if len(self.price_history[pair]) > self.lookback_period * 2:
                    self.price_history[pair] = self.price_history[pair][-self.lookback_period * 2:]
                    
                # Need enough history to analyze
                if len(self.price_history[pair]) < self.lookback_period:
                    continue
                    
                # Convert to DataFrame for analysis
                df = pd.DataFrame(self.price_history[pair])
                
                # Generate signals
                signal = self._generate_signal(pair, df)
                if signal:
                    signals.append(signal)
                    
            except Exception as e:
                logger.error(f"Error analyzing {pair}: {e}")
                
        return signals
        
    def _generate_signal(self, pair: str, df: pd.DataFrame) -> Optional[Dict]:
        """Generate trading signal for a pair"""
        
        current_price = df['close'].iloc[-1]
        current_volume = df['volume'].iloc[-1]
        current_time = df['timestamp'].iloc[-1]
        
        # Check market regime if available
        regime_info = None
        if self.regime_detector is not None:
            try:
                # Prepare data for regime analysis
                regime_data = df[['open', 'high', 'low', 'close', 'volume']].copy()
                regime_signal = self.regime_detector.analyze_regime(regime_data)
                regime_info = self.regime_detector.get_regime_for_strategy('momentum')
                
                # Apply regime-based adjustments
                if regime_info['recommendation'] == 'reduce_exposure':
                    # Reduce position size in unfavorable regimes
                    self.position_size_pct = min(self.position_size_pct, 0.05)
                elif regime_info['recommendation'] == 'increase_exposure':
                    # Increase position size in favorable regimes  
                    self.position_size_pct = min(self.position_size_pct * 1.5, 0.15)
                    
                logger.info(f"Regime for {pair}: {regime_info['regime'].value} "
                          f"(confidence: {regime_info['confidence']:.2f}, "
                          f"recommendation: {regime_info['recommendation']})")
                          
            except Exception as e:
                logger.warning(f"Regime detection failed for {pair}: {e}")
        
        # Check cooldown
        if pair in self.last_trade_time:
            time_since_trade = len(df) - self.last_trade_time[pair]
            if time_since_trade < self.cooldown_periods:
                return None
                
        # Calculate indicators
        recent_high = df['high'].tail(self.lookback_period).max()
        recent_low = df['low'].tail(self.lookback_period).min()
        avg_volume = df['volume'].tail(self.lookback_period).mean()
        
        # Calculate momentum
        price_change = (current_price - df['close'].iloc[-self.lookback_period]) / df['close'].iloc[-self.lookback_period]
        
        # Check if we have a position
        current_position = self.positions.get(pair, {})
        
        if not current_position:  # No position - look for entry
            
            # Momentum breakout conditions
            breakout_condition = (
                current_price > recent_high * (1 + self.momentum_threshold/2) and  # Price breakout
                price_change > self.momentum_threshold and                          # Strong momentum
                current_volume > avg_volume * self.volume_threshold                 # Volume confirmation
            )
            
            # Apply regime-based filters
            if regime_info and self.regime_detector:
                # Don't take momentum trades in ranging markets
                if regime_info['regime'] == MarketRegime.RANGING and regime_info['confidence'] > 0.7:
                    logger.info(f"Skipping momentum trade in ranging market for {pair}")
                    return None
                # Don't trade against strong opposite trends
                elif (regime_info['regime'] == MarketRegime.TRENDING_DOWN and 
                      regime_info['confidence'] > 0.8):
                    logger.info(f"Skipping long momentum trade in strong downtrend for {pair}")
                    return None
            
            if breakout_condition:
                # Calculate position size
                account_balance = await self._get_account_balance()
                position_value = account_balance * self.position_size_pct
                volume = position_value / current_price
                
                # Record position
                self.positions[pair] = {
                    'entry_price': current_price,
                    'entry_time': current_time,
                    'volume': volume,
                    'stop_loss': current_price * (1 - self.stop_loss_pct),
                    'take_profit': current_price * (1 + self.take_profit_pct)
                }
                
                self.last_trade_time[pair] = len(df) - 1
                
                logger.info(f"🟢 MOMENTUM BUY {pair}: ${current_price:.2f} (momentum: {price_change:.1%})")
                
                return {
                    'action': 'buy',
                    'pair': pair,
                    'volume': volume,
                    'price': current_price,
                    'reason': f'momentum_breakout_{price_change:.1%}'
                }
                
        else:  # Have position - look for exit
            
            entry_price = current_position['entry_price']
            stop_loss = current_position['stop_loss']
            take_profit = current_position['take_profit']
            
            # Exit conditions
            stop_loss_hit = current_price <= stop_loss
            take_profit_hit = current_price >= take_profit
            momentum_reversal = self._check_momentum_reversal(df)
            
            exit_reason = None
            if stop_loss_hit:
                exit_reason = f"stop_loss_{((current_price - entry_price) / entry_price):.1%}"
            elif take_profit_hit:
                exit_reason = f"take_profit_{((current_price - entry_price) / entry_price):.1%}"
            elif momentum_reversal:
                exit_reason = f"momentum_reversal_{((current_price - entry_price) / entry_price):.1%}"
                
            if exit_reason:
                volume = current_position['volume']
                
                # Remove position
                del self.positions[pair]
                self.last_trade_time[pair] = len(df) - 1
                
                pnl = (current_price - entry_price) * volume
                pnl_pct = (current_price - entry_price) / entry_price
                
                logger.info(f"🔴 MOMENTUM SELL {pair}: ${current_price:.2f} "
                          f"(P&L: ${pnl:.2f}, {pnl_pct:.1%}) - {exit_reason}")
                
                return {
                    'action': 'sell',
                    'pair': pair,
                    'volume': volume,
                    'price': current_price,
                    'reason': exit_reason
                }
                
        return None
        
    def _check_momentum_reversal(self, df: pd.DataFrame) -> bool:
        """Check if momentum is reversing"""
        if len(df) < 5:
            return False
            
        # Calculate recent price momentum
        recent_prices = df['close'].tail(5)
        
        # Check for consecutive declining closes
        declining_periods = 0
        for i in range(len(recent_prices) - 1):
            if recent_prices.iloc[i + 1] < recent_prices.iloc[i]:
                declining_periods += 1
            else:
                break
                
        # Consider momentum reversal if 3+ declining periods
        return declining_periods >= 3
        
    async def _get_account_balance(self) -> float:
        """Get account balance in USD"""
        try:
            balance = await self.api.get_account_balance()
            return float(balance.get('ZUSD', 10000))  # Default for backtesting
        except:
            return 10000  # Default for backtesting
            
    def get_strategy_info(self) -> Dict:
        """Get strategy information and current state"""
        return {
            'name': 'Momentum Strategy',
            'description': 'Buys on momentum breakouts with volume confirmation',
            'parameters': {
                'lookback_period': self.lookback_period,
                'momentum_threshold': f"{self.momentum_threshold:.1%}",
                'volume_threshold': f"{self.volume_threshold:.1f}x",
                'stop_loss': f"{self.stop_loss_pct:.1%}",
                'take_profit': f"{self.take_profit_pct:.1%}",
                'position_size': f"{self.position_size_pct:.1%}"
            },
            'current_positions': len(self.positions),
            'active_pairs': list(self.positions.keys())
        }
        
    def reset(self):
        """Reset strategy state"""
        self.positions.clear()
        self.last_trade_time.clear()
        self.price_history.clear()