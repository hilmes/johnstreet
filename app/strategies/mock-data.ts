/**
 * Mock data for development and testing
 */
import { Strategy } from './types'

export const mockStrategies: Strategy[] = [
  {
    id: '1',
    name: 'Adaptive Mean Reversion',
    description: 'AI-powered mean reversion strategy that adapts to market volatility and uses dynamic RSI thresholds',
    type: 'ai_generated',
    status: 'active',
    performance: {
      totalPnl: 18740,
      dailyPnl: 1250,
      winRate: 0.74,
      sharpeRatio: 2.3,
      maxDrawdown: 0.08,
      totalTrades: 156,
      avgTradeSize: 2400
    },
    riskMetrics: {
      volatility: 0.12,
      valueAtRisk: 0.045,
      beta: 0.8
    },
    lastActive: new Date(Date.now() - 30 * 60 * 1000),
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    timeframe: '5m',
    symbols: ['BTC/USD', 'ETH/USD'],
    language: 'python',
    code: `# Adaptive Mean Reversion Strategy
import pandas as pd
import numpy as np

class AdaptiveMeanReversionStrategy:
    def __init__(self):
        self.rsi_period = 14
        self.threshold_multiplier = 1.2
        
    def generate_signals(self, df):
        # Calculate RSI
        rsi = self.calculate_rsi(df['close'], self.rsi_period)
        
        # Adaptive thresholds based on volatility
        volatility = df['close'].rolling(20).std()
        upper_threshold = 70 + (volatility.rolling(10).mean() * self.threshold_multiplier)
        lower_threshold = 30 - (volatility.rolling(10).mean() * self.threshold_multiplier)
        
        # Generate signals
        buy_signal = (rsi < lower_threshold) & (rsi.shift(1) >= lower_threshold)
        sell_signal = (rsi > upper_threshold) & (rsi.shift(1) <= upper_threshold)
        
        return buy_signal, sell_signal`
  },
  {
    id: '2',
    name: 'Momentum Breakout Pro',
    description: 'Multi-timeframe momentum strategy with volume confirmation and dynamic stop losses',
    type: 'momentum',
    status: 'active',
    performance: {
      totalPnl: 24580,
      dailyPnl: 890,
      winRate: 0.68,
      sharpeRatio: 1.95,
      maxDrawdown: 0.12,
      totalTrades: 89,
      avgTradeSize: 3200
    },
    riskMetrics: {
      volatility: 0.15,
      valueAtRisk: 0.06,
      beta: 1.2
    },
    lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    timeframe: '15m',
    symbols: ['BTC/USD', 'ETH/USD', 'SOL/USD'],
    language: 'typescript',
    code: `// Momentum Breakout Strategy
interface BreakoutSignal {
  symbol: string
  action: 'buy' | 'sell'
  confidence: number
}

class MomentumBreakoutStrategy {
  private volumeThreshold = 1.5
  private momentumPeriod = 20
  
  detectBreakout(data: OHLCV[]): BreakoutSignal | null {
    const momentum = this.calculateMomentum(data)
    const volumeRatio = this.getVolumeRatio(data)
    
    if (momentum > 0.02 && volumeRatio > this.volumeThreshold) {
      return {
        symbol: data[0].symbol,
        action: 'buy',
        confidence: Math.min(momentum * 50, 1)
      }
    }
    return null
  }
}`
  },
  {
    id: '3',
    name: 'High-Frequency Scalper',
    description: 'Sub-second scalping strategy using order book imbalances and microstructure patterns',
    type: 'scalping',
    status: 'testing',
    performance: {
      totalPnl: 8920,
      dailyPnl: 420,
      winRate: 0.82,
      sharpeRatio: 3.1,
      maxDrawdown: 0.04,
      totalTrades: 1240,
      avgTradeSize: 800
    },
    riskMetrics: {
      volatility: 0.08,
      valueAtRisk: 0.02,
      beta: 0.5
    },
    lastActive: new Date(Date.now() - 45 * 60 * 1000),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    timeframe: '1s',
    symbols: ['BTC/USD'],
    language: 'rust',
    code: `// High-Frequency Scalping Strategy
use orderbook::{OrderBook, Side};

struct ScalpingStrategy {
    min_spread: f64,
    imbalance_threshold: f64,
}

impl ScalpingStrategy {
    fn analyze_microstructure(&self, book: &OrderBook) -> Option<Trade> {
        let spread = book.best_ask()? - book.best_bid()?;
        let imbalance = self.calculate_imbalance(book);
        
        if spread > self.min_spread && imbalance.abs() > self.imbalance_threshold {
            Some(Trade {
                side: if imbalance > 0 { Side::Buy } else { Side::Sell },
                size: self.calculate_position_size(spread, imbalance),
            })
        } else {
            None
        }
    }
}`
  }
]