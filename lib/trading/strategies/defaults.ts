import { Strategy } from '@/types/strategy'

/**
 * Default trading strategies for the signal pipeline
 * Each strategy is designed for specific market conditions and trading styles
 */

/**
 * Momentum Strategy
 * - Follows trends and sentiment momentum
 * - Best for trending markets with strong directional sentiment
 * - Uses higher timeframes for trend confirmation
 */
export const MomentumStrategy: Strategy = {
  id: 'momentum-default',
  name: 'Momentum Trader',
  type: 'MOMENTUM',
  pair: 'BTC/USD', // Default pair, can be overridden
  isActive: false,
  config: {
    // Momentum-specific parameters
    indicators: ['RSI', 'MACD', 'EMA'],
    takeProfitPercentage: 3.5,
    stopLossPercentage: 1.5,
    
    // Trend following parameters
    trendStrength: 0.65, // Minimum trend strength required (0-1)
    momentumPeriod: 14, // Period for momentum calculation
    
    // Entry conditions
    rsiOverbought: 70,
    rsiOversold: 30,
    macdSignalCross: true,
    
    // Position sizing
    positionSizing: {
      method: 'kelly', // Use Kelly Criterion for optimal sizing
      maxRiskPerTrade: 0.02, // Max 2% risk per trade
      scaleFactor: 0.25 // Conservative Kelly factor
    },
    
    // Risk management
    maxOpenPositions: 3,
    maxDrawdown: 0.15, // 15% max drawdown
    trailingStop: true,
    trailingStopDistance: 0.02 // 2% trailing stop
  }
}

/**
 * Mean Reversion Strategy
 * - Trades oversold/overbought conditions
 * - Best for ranging markets and volatility spikes
 * - Uses shorter timeframes for quick entries/exits
 */
export const MeanReversionStrategy: Strategy = {
  id: 'mean-reversion-default',
  name: 'Mean Reversion Trader',
  type: 'CUSTOM',
  pair: 'ETH/USD',
  isActive: false,
  config: {
    indicators: ['RSI', 'BB', 'STOCH'], // Bollinger Bands, Stochastic
    takeProfitPercentage: 1.5,
    stopLossPercentage: 1.0,
    
    // Mean reversion parameters
    bbPeriod: 20,
    bbStdDev: 2,
    rsiPeriod: 14,
    rsiOversold: 25,
    rsiOverbought: 75,
    
    // Entry conditions
    entryZScore: 2.0, // Enter when price is 2 std devs from mean
    exitZScore: 0.5, // Exit when price returns to 0.5 std devs
    
    // Confirmation requirements
    volumeConfirmation: true,
    minVolumeRatio: 1.5, // Volume must be 1.5x average
    
    // Position sizing
    positionSizing: {
      method: 'fixed_percentage',
      percentage: 0.05, // 5% of portfolio per trade
      maxRiskPerTrade: 0.01 // Max 1% risk per trade
    },
    
    // Risk management
    maxOpenPositions: 5,
    maxCorrelation: 0.7, // Max correlation between positions
    timeStop: 48 // Exit after 48 hours if no profit
  }
}

/**
 * Scalping Strategy
 * - High-frequency, short-term trades
 * - Best for liquid markets with tight spreads
 * - Requires low latency and quick execution
 */
export const ScalpingStrategy: Strategy = {
  id: 'scalping-default',
  name: 'High-Frequency Scalper',
  type: 'CUSTOM',
  pair: 'BTC/USDT',
  isActive: false,
  config: {
    indicators: ['EMA', 'VWAP', 'OrderFlow'],
    takeProfitPercentage: 0.3, // Small profit targets
    stopLossPercentage: 0.2, // Tight stops
    
    // Scalping parameters
    timeframe: '1m',
    emaFast: 5,
    emaSlow: 13,
    
    // Entry conditions
    minSpreadRatio: 0.0005, // Max 0.05% spread
    minLiquidity: 100000, // Min $100k order book depth
    orderFlowImbalance: 0.6, // 60% buy/sell imbalance
    
    // Execution
    orderType: 'limit', // Always use limit orders
    aggressiveness: 0.8, // How aggressive to be with limit prices
    maxSlippage: 0.001, // Max 0.1% slippage allowed
    
    // Position sizing
    positionSizing: {
      method: 'fixed_amount',
      amount: 10000, // $10k per trade
      maxRiskPerTrade: 0.005 // Max 0.5% risk per trade
    },
    
    // Risk management
    maxOpenPositions: 10,
    maxDailyTrades: 100,
    maxDailyLoss: 0.02, // Stop trading after 2% daily loss
    coolingPeriod: 300 // 5 min cooldown between trades
  }
}

/**
 * Safe Haven Strategy
 * - Conservative, low-risk approach
 * - Focuses on capital preservation
 * - Best for uncertain market conditions
 */
export const SafeHavenStrategy: Strategy = {
  id: 'safe-haven-default',
  name: 'Conservative Safe Haven',
  type: 'CUSTOM',
  pair: 'USDC/USD',
  isActive: false,
  config: {
    indicators: ['SMA', 'ATR', 'VIX'],
    takeProfitPercentage: 2.0,
    stopLossPercentage: 0.5, // Very tight stops
    
    // Conservative parameters
    smaPeriod: 200, // Long-term moving average
    atrPeriod: 14,
    maxVolatility: 0.02, // Max 2% daily volatility
    
    // Entry conditions
    trendAlignment: true, // Only trade with major trend
    minTrendStrength: 0.7,
    maxMarketVolatility: 25, // VIX equivalent threshold
    
    // Asset allocation
    stablecoinsAllocation: 0.6, // 60% in stablecoins
    btcAllocation: 0.3, // 30% in BTC
    ethAllocation: 0.1, // 10% in ETH
    
    // Position sizing
    positionSizing: {
      method: 'volatility_adjusted',
      targetVolatility: 0.08, // 8% annual volatility target
      maxRiskPerTrade: 0.005, // Max 0.5% risk per trade
      rebalancePeriod: 86400 // Daily rebalancing
    },
    
    // Risk management
    maxOpenPositions: 2,
    maxDrawdown: 0.05, // 5% max drawdown
    emergencyExit: true, // Exit all on extreme events
    hedgeRatio: 0.3 // 30% hedge during uncertain times
  }
}

/**
 * Get all default strategies
 */
export const defaultStrategies: Strategy[] = [
  MomentumStrategy,
  MeanReversionStrategy,
  ScalpingStrategy,
  SafeHavenStrategy
]

/**
 * Get strategy by market condition
 */
export function getStrategyForCondition(
  volatility: number,
  trendStrength: number,
  marketSentiment: number
): Strategy {
  // High volatility + low trend = Mean Reversion
  if (volatility > 0.03 && trendStrength < 0.3) {
    return MeanReversionStrategy
  }
  
  // Low volatility + high liquidity = Scalping
  if (volatility < 0.015 && marketSentiment > 0.6) {
    return ScalpingStrategy
  }
  
  // Strong trend = Momentum
  if (trendStrength > 0.6 && marketSentiment > 0.5) {
    return MomentumStrategy
  }
  
  // Default to safe haven in uncertain conditions
  return SafeHavenStrategy
}

/**
 * Merge strategy with custom config
 */
export function createCustomStrategy(
  baseStrategy: Strategy,
  customConfig: Partial<Strategy['config']>
): Strategy {
  return {
    ...baseStrategy,
    id: `${baseStrategy.id}-custom-${Date.now()}`,
    config: {
      ...baseStrategy.config,
      ...customConfig
    }
  }
}