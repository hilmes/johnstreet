import { NextRequest, NextResponse } from 'next/server'
import { BacktestEngine } from '@/lib/backtesting/BacktestEngine'
import { HistoricalDataSimulator, SyntheticDataGenerator } from '@/lib/backtesting/MarketDataSimulator'
import { RealisticExecutionModel } from '@/lib/backtesting/RealisticExecutionModel'
import { SimpleMovingAverageCrossover, RSIMeanReversionStrategy } from '@/lib/backtesting/strategies/SampleStrategies'
import { BacktestConfig, BaseStrategy } from '@/lib/backtesting/types'

interface OptimizationResult {
  parameters: Record<string, any>
  metrics: {
    totalReturn: number
    sharpeRatio: number
    maxDrawdown: number
    winRate: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      strategyName,
      parameterRanges,
      symbols = ['BTC'],
      startDate,
      endDate,
      initialCapital = 100000,
      commission = 0.001,
      slippage = 0.001,
      optimizationMetric = 'sharpeRatio',
      maxIterations = 50
    } = body

    if (!strategyName || !parameterRanges) {
      return NextResponse.json(
        { error: 'Strategy name and parameter ranges are required' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    // Generate market data once for all optimizations
    let marketData = []
    for (const symbol of symbols) {
      const symbolData = SyntheticDataGenerator.generateOHLCData(
        symbol,
        start,
        end,
        60, // 1 hour intervals
        100 + Math.random() * 50,
        0.02,
        0.0001
      )
      marketData.push(...symbolData)
    }

    // Generate parameter combinations
    const parameterCombinations = generateParameterCombinations(parameterRanges, maxIterations)
    const results: OptimizationResult[] = []

    for (let i = 0; i < parameterCombinations.length; i++) {
      const parameters = parameterCombinations[i]
      
      try {
        // Create strategy with current parameters
        const strategy = createOptimizationStrategy(strategyName, parameters)
        if (!strategy) continue

        const config: BacktestConfig = {
          startDate: start,
          endDate: end,
          initialCapital,
          symbols,
          commission,
          slippage,
          riskFreeRate: 0.02
        }

        const simulator = new HistoricalDataSimulator([...marketData]) // Clone data
        const executionModel = new RealisticExecutionModel(config)
        const engine = new BacktestEngine(config, strategy, simulator, executionModel)

        const result = await engine.run()

        results.push({
          parameters,
          metrics: {
            totalReturn: result.metrics.totalReturn,
            sharpeRatio: result.metrics.sharpeRatio,
            maxDrawdown: result.metrics.maxDrawdown,
            winRate: result.metrics.winRate
          }
        })

      } catch (error) {
        console.error(`Optimization iteration ${i} failed:`, error)
        continue
      }
    }

    // Sort results by optimization metric
    results.sort((a, b) => {
      const aValue = a.metrics[optimizationMetric as keyof typeof a.metrics]
      const bValue = b.metrics[optimizationMetric as keyof typeof b.metrics]
      return bValue - aValue // Descending order
    })

    const bestResult = results[0]
    const optimizationSummary = {
      totalCombinations: parameterCombinations.length,
      successfulRuns: results.length,
      bestParameters: bestResult?.parameters,
      bestMetrics: bestResult?.metrics,
      optimizationMetric,
      allResults: results.slice(0, 10) // Return top 10 results
    }

    return NextResponse.json({
      success: true,
      optimization: optimizationSummary
    })

  } catch (error) {
    console.error('Optimization error:', error)
    return NextResponse.json(
      { error: 'Failed to run optimization', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function generateParameterCombinations(ranges: Record<string, any>, maxCombinations: number): Record<string, any>[] {
  const parameterNames = Object.keys(ranges)
  const combinations: Record<string, any>[] = []

  // Generate grid search combinations
  function generateCombinations(
    index: number,
    currentCombination: Record<string, any>
  ): void {
    if (index === parameterNames.length) {
      combinations.push({ ...currentCombination })
      return
    }

    if (combinations.length >= maxCombinations) {
      return
    }

    const paramName = parameterNames[index]
    const range = ranges[paramName]

    if (range.type === 'range') {
      const { min, max, step = 1 } = range
      for (let value = min; value <= max; value += step) {
        currentCombination[paramName] = value
        generateCombinations(index + 1, currentCombination)
      }
    } else if (range.type === 'values') {
      for (const value of range.values) {
        currentCombination[paramName] = value
        generateCombinations(index + 1, currentCombination)
      }
    }
  }

  generateCombinations(0, {})

  // If we have too many combinations, sample randomly
  if (combinations.length > maxCombinations) {
    const sampled = []
    for (let i = 0; i < maxCombinations; i++) {
      const randomIndex = Math.floor(Math.random() * combinations.length)
      sampled.push(combinations[randomIndex])
      combinations.splice(randomIndex, 1)
    }
    return sampled
  }

  return combinations
}

function createOptimizationStrategy(strategyName: string, parameters: any): BaseStrategy | null {
  switch (strategyName.toLowerCase()) {
    case 'sma_crossover':
      return new SimpleMovingAverageCrossover(parameters)
    
    case 'rsi':
      return new RSIMeanReversionStrategy(parameters)
    
    default:
      return null
  }
}

export async function GET() {
  // Return supported optimization metrics and parameter types
  const supportedMetrics = [
    { key: 'sharpeRatio', name: 'Sharpe Ratio', description: 'Risk-adjusted return' },
    { key: 'totalReturn', name: 'Total Return', description: 'Absolute return' },
    { key: 'calmarRatio', name: 'Calmar Ratio', description: 'Return over max drawdown' },
    { key: 'winRate', name: 'Win Rate', description: 'Percentage of profitable trades' }
  ]

  const parameterTypes = [
    {
      type: 'range',
      description: 'Numeric range with min, max, and step',
      example: { type: 'range', min: 5, max: 50, step: 5 }
    },
    {
      type: 'values',
      description: 'List of specific values to test',
      example: { type: 'values', values: [10, 20, 30, 50] }
    }
  ]

  return NextResponse.json({
    supportedMetrics,
    parameterTypes,
    maxIterations: 100
  })
}