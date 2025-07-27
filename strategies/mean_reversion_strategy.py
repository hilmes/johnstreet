"""
Mean Reversion Trading Strategy

Buys when price is oversold and sells when overbought.
Works well in sideways/ranging markets.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class MeanReversionStrategy:
    """
    RSI-based mean reversion strategy
    
    Entry: When RSI indicates oversold/overbought conditions
    Exit: When price returns to mean or hits stop loss
    """
    
    def __init__(
        self,
        api,
        rsi_period: int = 14,
        oversold_threshold: float = 30,     # Buy when RSI < 30
        overbought_threshold: float = 70,   # Sell when RSI > 70
        bb_period: int = 20,                # Bollinger Bands period
        bb_std: float = 2.0,                # Bollinger Bands standard deviations
        stop_loss_pct: float = 0.02,        # 2% stop loss
        take_profit_pct: float = 0.04,      # 4% take profit
        position_size_pct: float = 0.10,    # 10% of capital per trade
        min_volume_ratio: float = 0.8       # Minimum volume vs average
    ):
        self.api = api
        self.rsi_period = rsi_period
        self.oversold_threshold = oversold_threshold
        self.overbought_threshold = overbought_threshold
        self.bb_period = bb_period
        self.bb_std = bb_std
        self.stop_loss_pct = stop_loss_pct
        self.take_profit_pct = take_profit_pct
        self.position_size_pct = position_size_pct
        self.min_volume_ratio = min_volume_ratio
        
        # State tracking
        self.positions = {}
        self.price_history = {}
        
    def analyze(self, market_data: Dict[str, pd.Series]) -> List[Dict]:
        """Analyze market data and generate trading signals"""
        signals = []
        
        for pair, current_price_data in market_data.items():
            try:
                # Update price history
                if pair not in self.price_history:
                    self.price_history[pair] = []
                    
                self.price_history[pair].append({
                    'timestamp': current_price_data.name,
                    'open': current_price_data['open'],
                    'high': current_price_data['high'],
                    'low': current_price_data['low'],
                    'close': current_price_data['close'],
                    'volume': current_price_data['volume']
                })
                
                # Keep reasonable history
                max_history = max(self.rsi_period, self.bb_period) * 3
                if len(self.price_history[pair]) > max_history:
                    self.price_history[pair] = self.price_history[pair][-max_history:]
                    
                # Need enough history for indicators
                min_history = max(self.rsi_period, self.bb_period) + 5
                if len(self.price_history[pair]) < min_history:
                    continue
                    
                # Convert to DataFrame
                df = pd.DataFrame(self.price_history[pair])
                
                # Generate signal
                signal = self._generate_signal(pair, df)
                if signal:
                    signals.append(signal)
                    
            except Exception as e:
                logger.error(f"Error analyzing {pair}: {e}")
                
        return signals
        
    def _generate_signal(self, pair: str, df: pd.DataFrame) -> Optional[Dict]:
        """Generate trading signal based on mean reversion"""
        
        current_price = df['close'].iloc[-1]
        current_volume = df['volume'].iloc[-1]
        
        # Calculate indicators
        rsi = self._calculate_rsi(df['close'])
        bb_upper, bb_middle, bb_lower = self._calculate_bollinger_bands(df['close'])
        avg_volume = df['volume'].tail(20).mean()
        
        if len(rsi) == 0 or len(bb_upper) == 0:
            return None
            
        current_rsi = rsi.iloc[-1]
        current_bb_upper = bb_upper.iloc[-1]
        current_bb_lower = bb_lower.iloc[-1]
        current_bb_middle = bb_middle.iloc[-1]
        
        # Volume filter
        volume_ok = current_volume >= avg_volume * self.min_volume_ratio
        
        # Check current position
        current_position = self.positions.get(pair, {})
        
        if not current_position:  # No position - look for entry
            
            # Oversold condition (buy signal)
            oversold_condition = (
                current_rsi < self.oversold_threshold and      # RSI oversold
                current_price < current_bb_lower and          # Below lower Bollinger Band
                volume_ok                                      # Sufficient volume
            )
            
            # Overbought condition (sell signal - for shorting, but we'll skip for now)
            # We focus on long-only mean reversion
            
            if oversold_condition:
                # Calculate position size
                account_balance = await self._get_account_balance()
                position_value = account_balance * self.position_size_pct
                volume = position_value / current_price
                
                # Record position
                self.positions[pair] = {
                    'entry_price': current_price,
                    'entry_time': df['timestamp'].iloc[-1],
                    'volume': volume,
                    'stop_loss': current_price * (1 - self.stop_loss_pct),
                    'take_profit': min(
                        current_price * (1 + self.take_profit_pct),
                        current_bb_middle  # Target mean reversion to middle band
                    ),
                    'entry_rsi': current_rsi
                }
                
                logger.info(f"🟢 MEAN REV BUY {pair}: ${current_price:.2f} "
                          f"(RSI: {current_rsi:.1f}, BB: {((current_price - current_bb_lower) / current_bb_lower):.1%})")
                
                return {
                    'action': 'buy',
                    'pair': pair,
                    'volume': volume,
                    'price': current_price,
                    'reason': f'oversold_rsi_{current_rsi:.1f}'
                }
                
        else:  # Have position - look for exit
            
            entry_price = current_position['entry_price']
            stop_loss = current_position['stop_loss']
            take_profit = current_position['take_profit']
            
            # Exit conditions
            stop_loss_hit = current_price <= stop_loss
            take_profit_hit = current_price >= take_profit
            mean_reversion_complete = (
                current_rsi > 50 and  # RSI back above neutral
                current_price > current_bb_middle  # Price above middle band
            )
            overbought_exit = current_rsi > self.overbought_threshold
            
            exit_reason = None
            if stop_loss_hit:
                exit_reason = f"stop_loss_{((current_price - entry_price) / entry_price):.1%}"
            elif take_profit_hit:
                exit_reason = f"take_profit_{((current_price - entry_price) / entry_price):.1%}"
            elif mean_reversion_complete:
                exit_reason = f"mean_reversion_{((current_price - entry_price) / entry_price):.1%}"
            elif overbought_exit:
                exit_reason = f"overbought_exit_rsi_{current_rsi:.1f}"
                
            if exit_reason:
                volume = current_position['volume']
                
                # Remove position
                del self.positions[pair]
                
                pnl = (current_price - entry_price) * volume
                pnl_pct = (current_price - entry_price) / entry_price
                
                logger.info(f"🔴 MEAN REV SELL {pair}: ${current_price:.2f} "
                          f"(P&L: ${pnl:.2f}, {pnl_pct:.1%}) - {exit_reason}")
                
                return {
                    'action': 'sell',
                    'pair': pair,
                    'volume': volume,
                    'price': current_price,
                    'reason': exit_reason
                }
                
        return None
        
    def _calculate_rsi(self, prices: pd.Series, period: Optional[int] = None) -> pd.Series:
        """Calculate RSI indicator"""
        if period is None:
            period = self.rsi_period
            
        if len(prices) < period + 1:
            return pd.Series(dtype=float)
            
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
        
    def _calculate_bollinger_bands(
        self, prices: pd.Series, period: Optional[int] = None, std: Optional[float] = None
    ) -> tuple:
        """Calculate Bollinger Bands"""
        if period is None:
            period = self.bb_period
        if std is None:
            std = self.bb_std
            
        if len(prices) < period:
            return pd.Series(dtype=float), pd.Series(dtype=float), pd.Series(dtype=float)
            
        sma = prices.rolling(window=period).mean()
        rolling_std = prices.rolling(window=period).std()
        
        upper_band = sma + (rolling_std * std)
        lower_band = sma - (rolling_std * std)
        
        return upper_band, sma, lower_band
        
    async def _get_account_balance(self) -> float:
        """Get account balance in USD"""
        try:
            balance = await self.api.get_account_balance()
            return float(balance.get('ZUSD', 10000))
        except:
            return 10000
            
    def get_strategy_info(self) -> Dict:
        """Get strategy information"""
        return {
            'name': 'Mean Reversion Strategy',
            'description': 'RSI + Bollinger Bands mean reversion trading',
            'parameters': {
                'rsi_period': self.rsi_period,
                'oversold_threshold': self.oversold_threshold,
                'overbought_threshold': self.overbought_threshold,
                'bb_period': self.bb_period,
                'bb_std': self.bb_std,
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
        self.price_history.clear()