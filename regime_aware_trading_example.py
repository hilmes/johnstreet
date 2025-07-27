"""
Regime-Aware Trading Example

Demonstrates how to use market regime detection to improve trading strategies.
"""

import asyncio
import logging
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List

from market_regime_detector import MarketRegimeDetector, MarketRegime
from strategies.momentum_strategy import MomentumStrategy
from strategies.mean_reversion_strategy import MeanReversionStrategy
from historical_data_manager import HistoricalDataManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RegimeAwarePortfolio:
    """
    Portfolio that adapts strategy allocation based on market regime
    """
    
    def __init__(self, initial_capital: float = 10000):
        self.initial_capital = initial_capital
        self.regime_detector = MarketRegimeDetector()
        
        # Strategy instances (mock API for demo)
        self.strategies = {
            'momentum': MomentumStrategy(api=MockAPI(), use_regime_detection=True),
            'mean_reversion': MeanReversionStrategy(api=MockAPI())
        }
        
        # Portfolio allocation based on regime
        self.regime_allocations = {
            MarketRegime.TRENDING_UP: {'momentum': 0.7, 'mean_reversion': 0.1},
            MarketRegime.TRENDING_DOWN: {'momentum': 0.3, 'mean_reversion': 0.3},
            MarketRegime.RANGING: {'momentum': 0.2, 'mean_reversion': 0.6},
            MarketRegime.HIGH_VOLATILITY: {'momentum': 0.3, 'mean_reversion': 0.4},
            MarketRegime.LOW_VOLATILITY: {'momentum': 0.4, 'mean_reversion': 0.3},
            MarketRegime.BREAKOUT: {'momentum': 0.8, 'mean_reversion': 0.1},
            MarketRegime.UNKNOWN: {'momentum': 0.3, 'mean_reversion': 0.3}
        }
        
        self.current_regime = MarketRegime.UNKNOWN
        self.regime_history = []
        
    async def analyze_market_and_trade(self, price_data: pd.DataFrame) -> Dict:
        """
        Analyze market regime and generate trading signals
        """
        try:
            # Detect market regime
            regime_signal = self.regime_detector.analyze_regime(price_data)
            self.current_regime = regime_signal.regime
            self.regime_history.append(regime_signal)
            
            # Get regime summary
            regime_summary = self.regime_detector.get_regime_summary()
            
            # Get strategy recommendations
            momentum_rec = self.regime_detector.get_regime_for_strategy('momentum')
            mean_rev_rec = self.regime_detector.get_regime_for_strategy('mean_reversion')
            
            # Calculate optimal allocations
            optimal_allocations = self.regime_allocations.get(
                regime_signal.regime, 
                self.regime_allocations[MarketRegime.UNKNOWN]
            )
            
            # Adjust allocations based on regime confidence
            confidence_factor = regime_signal.confidence
            if confidence_factor < 0.6:
                # Reduce allocations when uncertain
                optimal_allocations = {k: v * 0.5 for k, v in optimal_allocations.items()}
                
            logger.info(f"📊 Market Regime: {regime_signal.regime.value}")
            logger.info(f"🎯 Confidence: {regime_signal.confidence:.2f}, Strength: {regime_signal.strength:.2f}")
            logger.info(f"💼 Optimal Allocations: {optimal_allocations}")
            
            return {
                'regime': regime_signal.regime.value,
                'confidence': regime_signal.confidence,
                'strength': regime_signal.strength,
                'duration': regime_signal.duration,
                'momentum_recommendation': momentum_rec,
                'mean_reversion_recommendation': mean_rev_rec,
                'optimal_allocations': optimal_allocations,
                'regime_summary': regime_summary
            }
            
        except Exception as e:
            logger.error(f"Error in regime analysis: {e}")
            return {'error': str(e)}
            
    def get_regime_trading_rules(self, regime: MarketRegime) -> Dict[str, str]:
        """
        Get trading rules for each regime
        """
        rules = {
            MarketRegime.TRENDING_UP: {
                'momentum': 'Increase position size, ride the trend',
                'mean_reversion': 'Reduce exposure, avoid counter-trend trades',
                'general': 'Focus on trend-following strategies'
            },
            MarketRegime.TRENDING_DOWN: {
                'momentum': 'Consider short positions, reduce long exposure', 
                'mean_reversion': 'Look for oversold bounces',
                'general': 'Defensive positioning, tight stops'
            },
            MarketRegime.RANGING: {
                'momentum': 'Avoid breakout trades, reduce position size',
                'mean_reversion': 'Optimal conditions, increase exposure',
                'general': 'Trade the range, sell highs, buy lows'
            },
            MarketRegime.HIGH_VOLATILITY: {
                'momentum': 'Reduce position size, wider stops',
                'mean_reversion': 'Good opportunities but manage risk',
                'general': 'Expect large price swings, manage risk carefully'
            },
            MarketRegime.LOW_VOLATILITY: {
                'momentum': 'Limited opportunities, be patient',
                'mean_reversion': 'Fewer extreme moves to exploit',
                'general': 'Prepare for potential volatility expansion'
            },
            MarketRegime.BREAKOUT: {
                'momentum': 'Excellent conditions, increase exposure',
                'mean_reversion': 'Avoid counter-trend trades',
                'general': 'Expect continued directional movement'
            }
        }
        
        return rules.get(regime, {
            'momentum': 'Monitor market conditions',
            'mean_reversion': 'Monitor market conditions', 
            'general': 'Uncertain conditions, reduce risk'
        })


class MockAPI:
    """Mock API for demonstration"""
    
    async def get_account_balance(self):
        return {'ZUSD': 10000}
        
    async def create_order(self, *args, **kwargs):
        return {'txid': ['mock_order_123']}


async def demonstrate_regime_aware_trading():
    """
    Demonstrate regime-aware trading with historical data
    """
    logger.info("🚀 Starting Regime-Aware Trading Demonstration")
    
    # Create sample data with different market conditions
    portfolio = RegimeAwarePortfolio()
    
    # Test with different market scenarios
    scenarios = {
        'trending_up': create_trending_data(100, trend=0.02, volatility=0.01),
        'trending_down': create_trending_data(100, trend=-0.015, volatility=0.012),
        'ranging': create_ranging_data(100, volatility=0.008),
        'high_volatility': create_trending_data(100, trend=0.005, volatility=0.03),
        'breakout': create_breakout_data(100)
    }
    
    results = {}
    
    for scenario_name, data in scenarios.items():
        logger.info(f"\n📈 Testing scenario: {scenario_name.upper()}")
        logger.info("-" * 50)
        
        analysis = await portfolio.analyze_market_and_trade(data)
        results[scenario_name] = analysis
        
        if 'error' not in analysis:
            # Get trading rules for detected regime
            regime = MarketRegime(analysis['regime'])
            rules = portfolio.get_regime_trading_rules(regime)
            
            logger.info(f"📋 Trading Rules for {regime.value}:")
            for strategy, rule in rules.items():
                logger.info(f"  {strategy}: {rule}")
                
        await asyncio.sleep(0.1)  # Small delay for readability
        
    # Summary
    logger.info(f"\n🎯 REGIME DETECTION SUMMARY")
    logger.info("=" * 60)
    
    for scenario, result in results.items():
        if 'error' not in result:
            logger.info(f"{scenario:15} -> {result['regime']:15} "
                       f"(confidence: {result['confidence']:.2f})")
    
    logger.info(f"\n💡 Key Insights:")
    logger.info("• Market regime detection helps adapt strategy allocation")
    logger.info("• Higher confidence regimes allow for more aggressive positioning")
    logger.info("• Strategies perform better when matched to appropriate regimes")
    logger.info("• Risk management improves with regime awareness")


def create_trending_data(periods: int, trend: float = 0.01, volatility: float = 0.02) -> pd.DataFrame:
    """Create trending market data"""
    np.random.seed(42)
    
    dates = pd.date_range(start='2024-01-01', periods=periods, freq='1H')
    base_price = 100
    
    # Generate trending prices with noise
    trend_component = np.cumsum(np.full(periods, trend))
    noise_component = np.random.normal(0, volatility, periods)
    prices = base_price * (1 + trend_component + noise_component)
    
    # Create OHLCV data
    data = pd.DataFrame({
        'timestamp': dates,
        'open': prices * (1 + np.random.normal(0, 0.001, periods)),
        'high': prices * (1 + np.abs(np.random.normal(0, 0.005, periods))),
        'low': prices * (1 - np.abs(np.random.normal(0, 0.005, periods))),
        'close': prices,
        'volume': np.random.uniform(1000, 5000, periods)
    })
    
    return data


def create_ranging_data(periods: int, volatility: float = 0.01) -> pd.DataFrame:
    """Create ranging/sideways market data"""
    np.random.seed(123)
    
    dates = pd.date_range(start='2024-01-01', periods=periods, freq='1H')
    base_price = 100
    
    # Create oscillating prices around mean
    oscillation = np.sin(np.linspace(0, 4*np.pi, periods)) * 0.02
    noise = np.random.normal(0, volatility, periods)
    prices = base_price * (1 + oscillation + noise)
    
    data = pd.DataFrame({
        'timestamp': dates,
        'open': prices * (1 + np.random.normal(0, 0.001, periods)),
        'high': prices * (1 + np.abs(np.random.normal(0, 0.003, periods))),
        'low': prices * (1 - np.abs(np.random.normal(0, 0.003, periods))),
        'close': prices,
        'volume': np.random.uniform(800, 3000, periods)
    })
    
    return data


def create_breakout_data(periods: int) -> pd.DataFrame:
    """Create breakout market data"""
    np.random.seed(456)
    
    dates = pd.date_range(start='2024-01-01', periods=periods, freq='1H')
    base_price = 100
    
    # Create ranging then breakout pattern
    ranging_periods = periods // 2
    breakout_periods = periods - ranging_periods
    
    # Ranging phase
    ranging_prices = base_price * (1 + np.random.normal(0, 0.005, ranging_periods))
    
    # Breakout phase with high volume
    breakout_trend = np.cumsum(np.full(breakout_periods, 0.03))
    breakout_noise = np.random.normal(0, 0.02, breakout_periods)
    breakout_prices = ranging_prices[-1] * (1 + breakout_trend + breakout_noise)
    
    prices = np.concatenate([ranging_prices, breakout_prices])
    
    # Higher volume during breakout
    volume = np.concatenate([
        np.random.uniform(1000, 2000, ranging_periods),
        np.random.uniform(3000, 8000, breakout_periods)
    ])
    
    data = pd.DataFrame({
        'timestamp': dates,
        'open': prices * (1 + np.random.normal(0, 0.001, periods)),
        'high': prices * (1 + np.abs(np.random.normal(0, 0.008, periods))),
        'low': prices * (1 - np.abs(np.random.normal(0, 0.008, periods))),
        'close': prices,
        'volume': volume
    })
    
    return data


if __name__ == "__main__":
    asyncio.run(demonstrate_regime_aware_trading())