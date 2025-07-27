"""
Market Regime Detection

Detects different market conditions (trending, ranging, volatile) to help strategies adapt.
"""

import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import asyncio

logger = logging.getLogger(__name__)


class MarketRegime(Enum):
    """Market regime types"""
    TRENDING_UP = "trending_up"
    TRENDING_DOWN = "trending_down"
    RANGING = "ranging"
    HIGH_VOLATILITY = "high_volatility"
    LOW_VOLATILITY = "low_volatility"
    BREAKOUT = "breakout"
    UNKNOWN = "unknown"


@dataclass
class RegimeSignal:
    """Market regime detection signal"""
    regime: MarketRegime
    confidence: float  # 0.0 to 1.0
    strength: float    # How strong the regime is
    duration: int      # How many periods this regime has been active
    indicators: Dict[str, float]  # Supporting indicators
    timestamp: datetime
    

class MarketRegimeDetector:
    """
    Detects market regimes using multiple technical indicators
    """
    
    def __init__(
        self,
        lookback_periods: int = 50,
        trend_threshold: float = 0.02,  # 2% for trend detection
        volatility_threshold: float = 0.015,  # 1.5% for volatility detection
        confidence_threshold: float = 0.6
    ):
        self.lookback_periods = lookback_periods
        self.trend_threshold = trend_threshold
        self.volatility_threshold = volatility_threshold
        self.confidence_threshold = confidence_threshold
        
        # State tracking
        self.current_regime = MarketRegime.UNKNOWN
        self.regime_history: List[RegimeSignal] = []
        self.last_analysis_time = None
        
    def analyze_regime(self, price_data: pd.DataFrame) -> RegimeSignal:
        """
        Analyze current market regime based on price data
        
        Args:
            price_data: DataFrame with OHLCV data
            
        Returns:
            RegimeSignal with detected regime
        """
        try:
            if len(price_data) < self.lookback_periods:
                logger.warning(f"Insufficient data for regime analysis: {len(price_data)} < {self.lookback_periods}")
                return self._create_unknown_signal()
                
            # Calculate technical indicators
            indicators = self._calculate_regime_indicators(price_data)
            
            # Detect regime using multiple methods
            regimes = {
                'trend': self._detect_trend_regime(indicators),
                'volatility': self._detect_volatility_regime(indicators),
                'momentum': self._detect_momentum_regime(indicators),
                'breakout': self._detect_breakout_regime(indicators)
            }
            
            # Combine regime signals
            final_regime, confidence = self._combine_regime_signals(regimes, indicators)
            
            # Calculate regime strength and duration
            strength = self._calculate_regime_strength(indicators, final_regime)
            duration = self._calculate_regime_duration(final_regime)
            
            # Create regime signal
            signal = RegimeSignal(
                regime=final_regime,
                confidence=confidence,
                strength=strength,
                duration=duration,
                indicators=indicators,
                timestamp=datetime.now()
            )
            
            # Update state
            self._update_regime_state(signal)
            
            logger.info(f"📊 Market regime: {final_regime.value} (confidence: {confidence:.2f}, strength: {strength:.2f})")
            
            return signal
            
        except Exception as e:
            logger.error(f"Error in regime analysis: {e}")
            return self._create_unknown_signal()
            
    def _calculate_regime_indicators(self, data: pd.DataFrame) -> Dict[str, float]:
        """Calculate technical indicators for regime detection"""
        
        close = data['close'].values
        high = data['high'].values
        low = data['low'].values
        volume = data['volume'].values
        
        indicators = {}
        
        # Trend indicators
        indicators['sma_20'] = np.mean(close[-20:])
        indicators['sma_50'] = np.mean(close[-50:]) if len(close) >= 50 else np.mean(close)
        indicators['price_vs_sma20'] = (close[-1] - indicators['sma_20']) / indicators['sma_20']
        indicators['price_vs_sma50'] = (close[-1] - indicators['sma_50']) / indicators['sma_50']
        indicators['sma_slope_20'] = (indicators['sma_20'] - np.mean(close[-40:-20])) / np.mean(close[-40:-20]) if len(close) >= 40 else 0
        
        # Volatility indicators
        returns = np.diff(close) / close[:-1]
        indicators['volatility_20'] = np.std(returns[-20:]) if len(returns) >= 20 else np.std(returns)
        indicators['volatility_5'] = np.std(returns[-5:]) if len(returns) >= 5 else np.std(returns)
        indicators['volatility_ratio'] = indicators['volatility_5'] / indicators['volatility_20'] if indicators['volatility_20'] > 0 else 1
        
        # ATR (Average True Range)
        tr_values = []
        for i in range(1, min(21, len(close))):
            tr = max(
                high[-i] - low[-i],
                abs(high[-i] - close[-i-1]),
                abs(low[-i] - close[-i-1])
            )
            tr_values.append(tr)
        indicators['atr'] = np.mean(tr_values) if tr_values else 0
        indicators['atr_ratio'] = indicators['atr'] / close[-1] if close[-1] > 0 else 0
        
        # Momentum indicators
        if len(close) >= 14:
            roc_14 = (close[-1] - close[-15]) / close[-15]
            indicators['roc_14'] = roc_14
        else:
            indicators['roc_14'] = 0
            
        if len(close) >= 7:
            roc_7 = (close[-1] - close[-8]) / close[-8]
            indicators['roc_7'] = roc_7
        else:
            indicators['roc_7'] = 0
            
        # RSI approximation
        gains = []
        losses = []
        for i in range(1, min(15, len(returns))):
            if returns[-i] > 0:
                gains.append(returns[-i])
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(returns[-i]))
                
        avg_gain = np.mean(gains) if gains else 0
        avg_loss = np.mean(losses) if losses else 0
        rs = avg_gain / avg_loss if avg_loss > 0 else 100
        indicators['rsi'] = 100 - (100 / (1 + rs))
        
        # Range indicators
        price_range_20 = np.max(high[-20:]) - np.min(low[-20:]) if len(high) >= 20 else np.max(high) - np.min(low)
        indicators['range_position'] = (close[-1] - np.min(low[-20:])) / price_range_20 if price_range_20 > 0 else 0.5
        
        # Bollinger Band position
        sma_20 = indicators['sma_20']
        std_20 = np.std(close[-20:]) if len(close) >= 20 else np.std(close)
        bb_upper = sma_20 + (2 * std_20)
        bb_lower = sma_20 - (2 * std_20)
        indicators['bb_position'] = (close[-1] - bb_lower) / (bb_upper - bb_lower) if bb_upper != bb_lower else 0.5
        
        # Volume indicators
        avg_volume_20 = np.mean(volume[-20:]) if len(volume) >= 20 else np.mean(volume)
        indicators['volume_ratio'] = volume[-1] / avg_volume_20 if avg_volume_20 > 0 else 1
        
        return indicators
        
    def _detect_trend_regime(self, indicators: Dict[str, float]) -> Tuple[MarketRegime, float]:
        """Detect trending regimes"""
        
        trend_signals = []
        
        # Price vs moving averages
        if indicators['price_vs_sma20'] > self.trend_threshold:
            trend_signals.append(('up', abs(indicators['price_vs_sma20'])))
        elif indicators['price_vs_sma20'] < -self.trend_threshold:
            trend_signals.append(('down', abs(indicators['price_vs_sma20'])))
            
        if indicators['price_vs_sma50'] > self.trend_threshold:
            trend_signals.append(('up', abs(indicators['price_vs_sma50'])))
        elif indicators['price_vs_sma50'] < -self.trend_threshold:
            trend_signals.append(('down', abs(indicators['price_vs_sma50'])))
            
        # Moving average slope
        if indicators['sma_slope_20'] > self.trend_threshold:
            trend_signals.append(('up', abs(indicators['sma_slope_20'])))
        elif indicators['sma_slope_20'] < -self.trend_threshold:
            trend_signals.append(('down', abs(indicators['sma_slope_20'])))
            
        # ROC momentum
        if indicators['roc_14'] > self.trend_threshold:
            trend_signals.append(('up', abs(indicators['roc_14'])))
        elif indicators['roc_14'] < -self.trend_threshold:
            trend_signals.append(('down', abs(indicators['roc_14'])))
            
        if not trend_signals:
            return MarketRegime.RANGING, 0.3
            
        # Count signals
        up_signals = [s for s in trend_signals if s[0] == 'up']
        down_signals = [s for s in trend_signals if s[0] == 'down']
        
        if len(up_signals) > len(down_signals):
            avg_strength = np.mean([s[1] for s in up_signals])
            confidence = len(up_signals) / len(trend_signals)
            return MarketRegime.TRENDING_UP, min(confidence + avg_strength, 1.0)
        elif len(down_signals) > len(up_signals):
            avg_strength = np.mean([s[1] for s in down_signals])
            confidence = len(down_signals) / len(trend_signals)
            return MarketRegime.TRENDING_DOWN, min(confidence + avg_strength, 1.0)
        else:
            return MarketRegime.RANGING, 0.4
            
    def _detect_volatility_regime(self, indicators: Dict[str, float]) -> Tuple[MarketRegime, float]:
        """Detect volatility regimes"""
        
        volatility_level = indicators['volatility_20']
        atr_ratio = indicators['atr_ratio']
        volatility_ratio = indicators['volatility_ratio']
        
        # High volatility signals
        high_vol_signals = 0
        if volatility_level > self.volatility_threshold:
            high_vol_signals += 1
        if atr_ratio > self.volatility_threshold:
            high_vol_signals += 1
        if volatility_ratio > 1.5:  # Recent vol > average vol
            high_vol_signals += 1
            
        # Low volatility signals
        low_vol_signals = 0
        if volatility_level < self.volatility_threshold * 0.5:
            low_vol_signals += 1
        if atr_ratio < self.volatility_threshold * 0.5:
            low_vol_signals += 1
        if volatility_ratio < 0.7:  # Recent vol < average vol
            low_vol_signals += 1
            
        if high_vol_signals >= 2:
            confidence = high_vol_signals / 3 + volatility_level
            return MarketRegime.HIGH_VOLATILITY, min(confidence, 1.0)
        elif low_vol_signals >= 2:
            confidence = low_vol_signals / 3 + (1 - volatility_level)
            return MarketRegime.LOW_VOLATILITY, min(confidence, 1.0)
        else:
            return MarketRegime.UNKNOWN, 0.2
            
    def _detect_momentum_regime(self, indicators: Dict[str, float]) -> Tuple[MarketRegime, float]:
        """Detect momentum-based regimes"""
        
        rsi = indicators['rsi']
        roc_7 = indicators['roc_7']
        roc_14 = indicators['roc_14']
        
        # Strong momentum signals
        if rsi > 70 and roc_7 > 0.01 and roc_14 > 0.02:
            return MarketRegime.TRENDING_UP, 0.8
        elif rsi < 30 and roc_7 < -0.01 and roc_14 < -0.02:
            return MarketRegime.TRENDING_DOWN, 0.8
        elif 40 < rsi < 60 and abs(roc_7) < 0.005:
            return MarketRegime.RANGING, 0.6
        else:
            return MarketRegime.UNKNOWN, 0.3
            
    def _detect_breakout_regime(self, indicators: Dict[str, float]) -> Tuple[MarketRegime, float]:
        """Detect breakout conditions"""
        
        bb_position = indicators['bb_position']
        volume_ratio = indicators['volume_ratio']
        volatility_ratio = indicators['volatility_ratio']
        range_position = indicators['range_position']
        
        # Breakout signals
        breakout_signals = 0
        
        # Price near bollinger band extremes with volume
        if (bb_position > 0.8 or bb_position < 0.2) and volume_ratio > 1.5:
            breakout_signals += 1
            
        # High range position with volume
        if (range_position > 0.9 or range_position < 0.1) and volume_ratio > 1.2:
            breakout_signals += 1
            
        # Volatility expansion
        if volatility_ratio > 1.8:
            breakout_signals += 1
            
        if breakout_signals >= 2:
            confidence = breakout_signals / 3 + volume_ratio * 0.1
            return MarketRegime.BREAKOUT, min(confidence, 1.0)
        else:
            return MarketRegime.UNKNOWN, 0.2
            
    def _combine_regime_signals(
        self, 
        regimes: Dict[str, Tuple[MarketRegime, float]], 
        indicators: Dict[str, float]
    ) -> Tuple[MarketRegime, float]:
        """Combine multiple regime detection methods"""
        
        # Weight different detection methods
        weights = {
            'trend': 0.4,
            'volatility': 0.25,
            'momentum': 0.25,
            'breakout': 0.1
        }
        
        # Score each regime type
        regime_scores = {}
        
        for method, (regime, confidence) in regimes.items():
            weight = weights.get(method, 0.2)
            weighted_score = confidence * weight
            
            if regime not in regime_scores:
                regime_scores[regime] = 0
            regime_scores[regime] += weighted_score
            
        # Find best regime
        if not regime_scores:
            return MarketRegime.UNKNOWN, 0.1
            
        best_regime = max(regime_scores.keys(), key=lambda r: regime_scores[r])
        best_score = regime_scores[best_regime]
        
        # Normalize confidence
        total_possible_score = sum(weights.values())
        normalized_confidence = best_score / total_possible_score
        
        # Apply minimum confidence threshold
        if normalized_confidence < self.confidence_threshold:
            return MarketRegime.UNKNOWN, normalized_confidence
            
        return best_regime, normalized_confidence
        
    def _calculate_regime_strength(self, indicators: Dict[str, float], regime: MarketRegime) -> float:
        """Calculate how strong the current regime is"""
        
        if regime == MarketRegime.TRENDING_UP:
            return min(
                abs(indicators['price_vs_sma20']) + abs(indicators['roc_14']) + (indicators['rsi'] - 50) / 50,
                1.0
            )
        elif regime == MarketRegime.TRENDING_DOWN:
            return min(
                abs(indicators['price_vs_sma20']) + abs(indicators['roc_14']) + (50 - indicators['rsi']) / 50,
                1.0
            )
        elif regime == MarketRegime.HIGH_VOLATILITY:
            return min(indicators['volatility_20'] * 10 + indicators['volatility_ratio'], 1.0)
        elif regime == MarketRegime.LOW_VOLATILITY:
            return min(1.0 - indicators['volatility_20'] * 10, 1.0)
        elif regime == MarketRegime.RANGING:
            return min(1.0 - abs(indicators['price_vs_sma20']) * 5, 1.0)
        elif regime == MarketRegime.BREAKOUT:
            return min(indicators['volume_ratio'] * 0.3 + indicators['volatility_ratio'] * 0.2, 1.0)
        else:
            return 0.1
            
    def _calculate_regime_duration(self, current_regime: MarketRegime) -> int:
        """Calculate how long the current regime has been active"""
        
        if not self.regime_history:
            return 1
            
        duration = 1
        for signal in reversed(self.regime_history[-10:]):  # Check last 10 signals
            if signal.regime == current_regime:
                duration += 1
            else:
                break
                
        return duration
        
    def _update_regime_state(self, signal: RegimeSignal):
        """Update internal regime state"""
        
        self.current_regime = signal.regime
        self.regime_history.append(signal)
        self.last_analysis_time = signal.timestamp
        
        # Keep only recent history
        if len(self.regime_history) > 100:
            self.regime_history = self.regime_history[-100:]
            
    def _create_unknown_signal(self) -> RegimeSignal:
        """Create unknown regime signal"""
        return RegimeSignal(
            regime=MarketRegime.UNKNOWN,
            confidence=0.0,
            strength=0.0,
            duration=0,
            indicators={},
            timestamp=datetime.now()
        )
        
    def get_regime_for_strategy(self, strategy_type: str) -> Dict[str, any]:
        """
        Get regime information relevant for a specific strategy type
        
        Args:
            strategy_type: 'momentum', 'mean_reversion', 'grid', etc.
            
        Returns:
            Dict with regime info and strategy recommendations
        """
        
        if not self.regime_history:
            return {
                'regime': MarketRegime.UNKNOWN,
                'confidence': 0.0,
                'recommendation': 'insufficient_data',
                'risk_level': 'unknown'
            }
            
        current_signal = self.regime_history[-1]
        regime = current_signal.regime
        confidence = current_signal.confidence
        
        # Strategy-specific recommendations
        recommendations = {
            'momentum': {
                MarketRegime.TRENDING_UP: {'action': 'long_bias', 'risk': 'medium'},
                MarketRegime.TRENDING_DOWN: {'action': 'short_bias', 'risk': 'medium'},
                MarketRegime.RANGING: {'action': 'reduce_exposure', 'risk': 'high'},
                MarketRegime.HIGH_VOLATILITY: {'action': 'reduce_position_size', 'risk': 'high'},
                MarketRegime.BREAKOUT: {'action': 'increase_exposure', 'risk': 'medium'},
            },
            'mean_reversion': {
                MarketRegime.TRENDING_UP: {'action': 'reduce_exposure', 'risk': 'high'},
                MarketRegime.TRENDING_DOWN: {'action': 'reduce_exposure', 'risk': 'high'},
                MarketRegime.RANGING: {'action': 'increase_exposure', 'risk': 'low'},
                MarketRegime.HIGH_VOLATILITY: {'action': 'increase_exposure', 'risk': 'medium'},
                MarketRegime.LOW_VOLATILITY: {'action': 'reduce_exposure', 'risk': 'medium'},
            },
            'grid': {
                MarketRegime.RANGING: {'action': 'optimal_conditions', 'risk': 'low'},
                MarketRegime.LOW_VOLATILITY: {'action': 'good_conditions', 'risk': 'low'},
                MarketRegime.TRENDING_UP: {'action': 'adjust_grid_up', 'risk': 'medium'},
                MarketRegime.TRENDING_DOWN: {'action': 'adjust_grid_down', 'risk': 'medium'},
                MarketRegime.HIGH_VOLATILITY: {'action': 'widen_grid', 'risk': 'high'},
            }
        }
        
        strategy_rec = recommendations.get(strategy_type, {})
        regime_rec = strategy_rec.get(regime, {'action': 'monitor', 'risk': 'unknown'})
        
        return {
            'regime': regime,
            'confidence': confidence,
            'strength': current_signal.strength,
            'duration': current_signal.duration,
            'recommendation': regime_rec['action'],
            'risk_level': regime_rec['risk'],
            'indicators': current_signal.indicators
        }
        
    def get_regime_summary(self) -> Dict[str, any]:
        """Get summary of current market regime"""
        
        if not self.regime_history:
            return {'status': 'No regime data available'}
            
        current = self.regime_history[-1]
        
        # Calculate regime stability (how often it changes)
        recent_regimes = [s.regime for s in self.regime_history[-10:]]
        stability = len(set(recent_regimes)) / len(recent_regimes) if recent_regimes else 0
        stability_score = 1.0 - stability  # Higher = more stable
        
        return {
            'current_regime': current.regime.value,
            'confidence': current.confidence,
            'strength': current.strength,
            'duration': current.duration,
            'stability_score': stability_score,
            'last_update': current.timestamp.isoformat(),
            'key_indicators': {
                'volatility': current.indicators.get('volatility_20', 0),
                'trend_strength': current.indicators.get('price_vs_sma20', 0),
                'momentum': current.indicators.get('roc_14', 0),
                'rsi': current.indicators.get('rsi', 50)
            }
        }


async def main():
    """Test market regime detection"""
    
    # Create sample data
    np.random.seed(42)
    dates = pd.date_range(start='2024-01-01', periods=100, freq='1H')
    
    # Simulate trending market
    trend = np.linspace(100, 120, 100)
    noise = np.random.normal(0, 2, 100)
    close_prices = trend + noise
    
    sample_data = pd.DataFrame({
        'timestamp': dates,
        'open': close_prices * 0.999,
        'high': close_prices * 1.002,
        'low': close_prices * 0.998,
        'close': close_prices,
        'volume': np.random.uniform(1000, 5000, 100)
    })
    
    # Test regime detector
    detector = MarketRegimeDetector()
    signal = detector.analyze_regime(sample_data)
    
    print(f"Detected regime: {signal.regime.value}")
    print(f"Confidence: {signal.confidence:.2f}")
    print(f"Strength: {signal.strength:.2f}")
    
    # Test strategy recommendations
    momentum_rec = detector.get_regime_for_strategy('momentum')
    print(f"Momentum strategy recommendation: {momentum_rec}")
    
    # Get regime summary
    summary = detector.get_regime_summary()
    print(f"Regime summary: {summary}")


if __name__ == "__main__":
    asyncio.run(main())