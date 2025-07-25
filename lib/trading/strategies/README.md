# Trading Strategies

This directory contains pre-configured trading strategies for the JohnStreet platform.

## Available Strategies

### 1. Momentum Strategy
- **Best for**: Trending markets with strong directional sentiment
- **Type**: `MOMENTUM`
- **Risk Level**: Medium
- **Key Features**:
  - Follows market trends and sentiment momentum
  - Uses RSI, MACD, and EMA indicators
  - Kelly Criterion position sizing
  - Trailing stop loss for profit protection

### 2. Mean Reversion Strategy
- **Best for**: Ranging markets and volatility spikes
- **Type**: `CUSTOM`
- **Risk Level**: Medium-Low
- **Key Features**:
  - Trades oversold/overbought conditions
  - Uses Bollinger Bands and RSI
  - Fixed percentage position sizing
  - Time-based exit after 48 hours

### 3. Scalping Strategy
- **Best for**: High-liquidity markets with tight spreads
- **Type**: `CUSTOM`
- **Risk Level**: High
- **Key Features**:
  - High-frequency, short-term trades
  - 1-minute timeframe
  - Requires low latency execution
  - Fixed amount position sizing

### 4. Safe Haven Strategy
- **Best for**: Uncertain market conditions
- **Type**: `CUSTOM`
- **Risk Level**: Low
- **Key Features**:
  - Conservative approach focused on capital preservation
  - Diversified across stablecoins, BTC, and ETH
  - Volatility-adjusted position sizing
  - Emergency exit mechanism

## Usage Example

```typescript
import { defaultStrategies, getStrategyForCondition } from '@/lib/trading/strategies'
import { signalPipeline } from '@/lib/trading/pipeline/SignalPipeline'

// Use all default strategies
signalPipeline.updateConfig({
  strategies: defaultStrategies
})

// Or select strategy based on market conditions
const currentVolatility = 0.025 // 2.5%
const trendStrength = 0.7 // Strong trend
const marketSentiment = 0.65 // Bullish

const optimalStrategy = getStrategyForCondition(
  currentVolatility,
  trendStrength,
  marketSentiment
)

signalPipeline.updateConfig({
  strategies: [optimalStrategy]
})
```

## Custom Strategy Configuration

```typescript
import { createCustomStrategy, MomentumStrategy } from '@/lib/trading/strategies'

// Create a custom momentum strategy with different parameters
const customMomentum = createCustomStrategy(MomentumStrategy, {
  takeProfitPercentage: 5.0, // More aggressive profit target
  stopLossPercentage: 2.0, // Wider stop loss
  maxOpenPositions: 5, // Allow more positions
  positionSizing: {
    method: 'fixed_percentage',
    percentage: 0.03, // 3% per trade
    maxRiskPerTrade: 0.015 // 1.5% max risk
  }
})
```

## Strategy Selection Logic

The `getStrategyForCondition()` function automatically selects the most appropriate strategy based on:

1. **Market Volatility**: High volatility favors mean reversion
2. **Trend Strength**: Strong trends favor momentum strategies
3. **Market Sentiment**: Positive sentiment with low volatility favors scalping
4. **Default**: Safe haven strategy for uncertain conditions

## Integration with Signal Pipeline

The strategies are designed to work seamlessly with the signal pipeline:

1. Signals are generated from sentiment analysis
2. The router assigns signals to appropriate strategies
3. Position sizing is calculated based on strategy config
4. Orders are executed with strategy-specific parameters

## Risk Management

Each strategy includes built-in risk management:

- **Position Sizing**: Kelly Criterion, fixed percentage, or volatility-adjusted
- **Stop Loss**: All strategies have predefined stop loss levels
- **Max Drawdown**: Strategies stop trading when drawdown limits are hit
- **Max Positions**: Limits concurrent positions to manage exposure
- **Correlation Checks**: Some strategies check position correlation