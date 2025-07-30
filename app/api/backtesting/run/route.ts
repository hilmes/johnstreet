import { NextRequest, NextResponse } from 'next/server'
import { BacktestEngine } from '@/lib/backtesting/BacktestEngine'
import { HistoricalDataSimulator, SyntheticDataGenerator } from '@/lib/backtesting/MarketDataSimulator'
import { RealisticExecutionModel, AdvancedExecutionModel } from '@/lib/backtesting/RealisticExecutionModel'
import { 
  BuyAndHoldStrategy,
  SimpleMovingAverageCrossover,
  RSIMeanReversionStrategy,
  MomentumStrategy,
  BollingerBandsStrategy,
  MultiFactorStrategy
} from '@/lib/backtesting/strategies/SampleStrategies'
import { BacktestConfig, BaseStrategy } from '@/lib/backtesting/types'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      strategyName,
      strategyParameters = {},
      symbols = ['BTC'],
      startDate,
      endDate,
      initialCapital = 100000,
      commission = 0.001,
      slippage = 0.001,
      useAdvancedExecution = false,
      useSyntheticData = true
    } = body

    // Validate inputs
    if (!strategyName) {
      return NextResponse.json({ error: 'Strategy name is required' }, { status: 400 })
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start >= end) {
      return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 })
    }

    // Create strategy instance
    const strategy = createStrategy(strategyName, strategyParameters)
    if (!strategy) {
      return NextResponse.json({ error: `Unknown strategy: ${strategyName}` }, { status: 400 })
    }

    // Create config
    const config: BacktestConfig = {
      startDate: start,
      endDate: end,
      initialCapital,
      symbols,
      commission,
      slippage,
      riskFreeRate: 0.02
    }

    // Generate or load market data
    let marketData
    if (useSyntheticData) {
      marketData = []
      for (const symbol of symbols) {
        const symbolData = SyntheticDataGenerator.generateOHLCData(
          symbol,
          start,
          end,
          60, // 1 hour intervals
          100 + Math.random() * 50, // Random initial price
          0.02 + Math.random() * 0.02, // Random volatility
          0.0001 + Math.random() * 0.0003 // Random trend
        )
        marketData.push(...symbolData)
      }
    } else {
      // In a real implementation, load historical data from database
      return NextResponse.json({ error: 'Historical data loading not implemented' }, { status: 501 })
    }

    const simulator = new HistoricalDataSimulator(marketData)
    const executionModel = useAdvancedExecution 
      ? new AdvancedExecutionModel(config)
      : new RealisticExecutionModel(config)

    const engine = new BacktestEngine(config, strategy, simulator, executionModel)

    // Set up event listeners for progress updates
    const progressUpdates: any[] = []
    
    engine.on('progress', (data) => {
      progressUpdates.push({
        type: 'progress',
        timestamp: new Date(),
        data
      })
    })

    engine.on('trade', (trade) => {
      progressUpdates.push({
        type: 'trade',
        timestamp: new Date(),
        data: trade
      })
    })

    // Run backtest
    const result = await engine.run()

    return NextResponse.json({
      success: true,
      result,
      progressUpdates: progressUpdates.slice(-10) // Return last 10 updates
    })

  } catch (error) {
    console.error('Backtest error:', error)
    return NextResponse.json(
      { error: 'Failed to run backtest', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function createStrategy(strategyName: string, parameters: any): BaseStrategy | null {
  switch (strategyName.toLowerCase()) {
    case 'buyandhold':
    case 'buy_and_hold':
      return new BuyAndHoldStrategy(parameters)
    
    case 'sma_crossover':
    case 'movingaverage':
      return new SimpleMovingAverageCrossover(parameters)
    
    case 'rsi':
    case 'rsi_meanreversion':
      return new RSIMeanReversionStrategy(parameters)
    
    case 'momentum':
      return new MomentumStrategy(parameters)
    
    case 'bollinger':
    case 'bollinger_bands':
      return new BollingerBandsStrategy(parameters)
    
    case 'multifactor':
    case 'multi_factor':
      return new MultiFactorStrategy(parameters)
    
    default:
      return null
  }
}

export async function GET(request: NextRequest) {
  // Return available strategies and their parameters
  const strategies = [
    {
      name: 'buyandhold',
      displayName: 'Buy and Hold',
      description: 'Simple buy and hold strategy',
      parameters: {
        symbol: { type: 'string', default: 'BTC', description: 'Symbol to hold' }
      }
    },
    {
      name: 'sma_crossover',
      displayName: 'SMA Crossover',
      description: 'Moving average crossover strategy',
      parameters: {
        shortPeriod: { type: 'number', default: 10, description: 'Short MA period' },
        longPeriod: { type: 'number', default: 30, description: 'Long MA period' }
      }
    },
    {
      name: 'rsi',
      displayName: 'RSI Mean Reversion',
      description: 'RSI-based mean reversion strategy',
      parameters: {
        period: { type: 'number', default: 14, description: 'RSI calculation period' },
        oversoldThreshold: { type: 'number', default: 30, description: 'Oversold threshold' },
        overboughtThreshold: { type: 'number', default: 70, description: 'Overbought threshold' }
      }
    },
    {
      name: 'momentum',
      displayName: 'Momentum',
      description: 'Price momentum strategy',
      parameters: {
        lookbackPeriod: { type: 'number', default: 20, description: 'Momentum lookback period' },
        momentumThreshold: { type: 'number', default: 0.05, description: 'Momentum threshold' }
      }
    },
    {
      name: 'bollinger_bands',
      displayName: 'Bollinger Bands',
      description: 'Bollinger Bands mean reversion',
      parameters: {
        period: { type: 'number', default: 20, description: 'Moving average period' },
        stdMultiplier: { type: 'number', default: 2, description: 'Standard deviation multiplier' }
      }
    },
    {
      name: 'multifactor',
      displayName: 'Multi-Factor',
      description: 'Combines multiple strategies with voting',
      parameters: {}
    }
  ]

  return NextResponse.json({ strategies })
}