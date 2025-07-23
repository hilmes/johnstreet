import { EventEmitter } from 'events'
import {
  BacktestConfig,
  BacktestResult,
  BaseStrategy,
  MarketData,
  Portfolio,
  Position,
  Trade,
  Signal,
  MarketSimulator,
  ExecutionModel,
  PerformanceMetrics
} from './types'
import { PerformanceAnalyzer } from './PerformanceAnalyzer'
import { RealisticExecutionModel } from './RealisticExecutionModel'

export class BacktestEngine extends EventEmitter {
  private config: BacktestConfig
  private portfolio: Portfolio
  private strategy: BaseStrategy
  private marketSimulator: MarketSimulator
  private executionModel: ExecutionModel
  private performanceAnalyzer: PerformanceAnalyzer
  private equityCurve: Array<{ timestamp: Date; value: number; drawdown: number }> = []
  private positionHistory: Array<{ timestamp: Date; positions: Position[] }> = []
  private currentTimestamp: Date
  private isRunning: boolean = false
  private isPaused: boolean = false

  constructor(
    config: BacktestConfig,
    strategy: BaseStrategy,
    marketSimulator: MarketSimulator,
    executionModel?: ExecutionModel
  ) {
    super()
    this.config = config
    this.strategy = strategy
    this.marketSimulator = marketSimulator
    this.executionModel = executionModel || new RealisticExecutionModel(config)
    this.performanceAnalyzer = new PerformanceAnalyzer()
    this.currentTimestamp = config.startDate
    
    this.initializePortfolio()
  }

  private initializePortfolio(): void {
    this.portfolio = {
      cash: this.config.initialCapital,
      positions: new Map<string, Position>(),
      totalValue: this.config.initialCapital,
      totalPnL: 0,
      trades: []
    }
  }

  async run(): Promise<BacktestResult> {
    this.isRunning = true
    this.isPaused = false
    
    this.emit('started', {
      config: this.config,
      startTime: new Date()
    })

    try {
      // Initialize strategy
      if (this.strategy.initialize) {
        await this.strategy.initialize(this.config.symbols)
      }

      let barCount = 0
      this.marketSimulator.reset()

      // Main backtesting loop
      while (this.marketSimulator.hasMoreData() && this.isRunning) {
        if (this.isPaused) {
          await this.waitForResume()
          continue
        }

        const marketData = this.marketSimulator.getNextBar()
        if (!marketData) break

        this.currentTimestamp = marketData.timestamp

        // Skip bars outside our date range
        if (marketData.timestamp < this.config.startDate || 
            marketData.timestamp > this.config.endDate) {
          continue
        }

        // Update portfolio value with current market prices
        this.updatePortfolioValue(marketData)

        // Get signals from strategy
        const signals = await this.strategy.onBar(marketData, this.portfolio)

        // Execute signals
        for (const signal of signals) {
          const trade = this.executionModel.executeSignal(signal, marketData, this.portfolio)
          if (trade) {
            this.executeTrade(trade)
            
            // Notify strategy of trade execution
            if (this.strategy.onTrade) {
              await this.strategy.onTrade(trade, this.portfolio)
            }
          }
        }

        // Record equity curve and positions
        this.recordEquityPoint()
        this.recordPositions()

        barCount++
        
        // Emit progress
        if (barCount % 1000 === 0) {
          this.emit('progress', {
            barsProcessed: barCount,
            currentTimestamp: this.currentTimestamp,
            portfolioValue: this.portfolio.totalValue,
            totalPnL: this.portfolio.totalPnL
          })
        }
      }

      // Finalize strategy
      if (this.strategy.finalize) {
        await this.strategy.finalize(this.portfolio)
      }

      const result = this.generateResult()
      
      this.emit('completed', {
        result,
        endTime: new Date(),
        barsProcessed: barCount
      })

      return result

    } catch (error) {
      this.emit('error', error)
      throw error
    } finally {
      this.isRunning = false
    }
  }

  pause(): void {
    this.isPaused = true
    this.emit('paused')
  }

  resume(): void {
    this.isPaused = false
    this.emit('resumed')
  }

  stop(): void {
    this.isRunning = false
    this.emit('stopped')
  }

  private async waitForResume(): Promise<void> {
    return new Promise((resolve) => {
      const checkResume = () => {
        if (!this.isPaused) {
          resolve()
        } else {
          setTimeout(checkResume, 100)
        }
      }
      checkResume()
    })
  }

  private updatePortfolioValue(marketData: MarketData): void {
    let totalValue = this.portfolio.cash

    // Update position values
    for (const [symbol, position] of this.portfolio.positions.entries()) {
      if (symbol === marketData.symbol) {
        const previousValue = position.marketValue
        position.marketValue = position.quantity * marketData.close
        position.unrealizedPnL = position.marketValue - (position.quantity * position.averagePrice)
        
        totalValue += position.marketValue
      } else {
        totalValue += position.marketValue
      }
    }

    this.portfolio.totalValue = totalValue
    this.portfolio.totalPnL = totalValue - this.config.initialCapital
  }

  private executeTrade(trade: Trade): void {
    const position = this.portfolio.positions.get(trade.symbol)
    
    if (trade.side === 'buy') {
      const totalCost = (trade.quantity * trade.price) + trade.commission + trade.slippage
      
      if (totalCost > this.portfolio.cash) {
        // Insufficient funds - adjust quantity
        const maxQuantity = Math.floor((this.portfolio.cash - trade.commission) / (trade.price + trade.slippage / trade.quantity))
        if (maxQuantity <= 0) return
        
        trade.quantity = maxQuantity
        const adjustedCost = (trade.quantity * trade.price) + trade.commission + trade.slippage
        this.portfolio.cash -= adjustedCost
      } else {
        this.portfolio.cash -= totalCost
      }

      if (position) {
        // Update existing position
        const totalQuantity = position.quantity + trade.quantity
        const totalCost = (position.quantity * position.averagePrice) + (trade.quantity * trade.price)
        position.averagePrice = totalCost / totalQuantity
        position.quantity = totalQuantity
        position.marketValue = totalQuantity * trade.price
        position.unrealizedPnL = position.marketValue - totalCost
      } else {
        // Create new position
        const newPosition: Position = {
          symbol: trade.symbol,
          quantity: trade.quantity,
          averagePrice: trade.price,
          marketValue: trade.quantity * trade.price,
          unrealizedPnL: 0,
          realizedPnL: 0
        }
        this.portfolio.positions.set(trade.symbol, newPosition)
      }
    } else { // sell
      if (!position || position.quantity < trade.quantity) {
        // Insufficient shares - adjust quantity or skip
        if (!position) return
        trade.quantity = Math.min(trade.quantity, position.quantity)
      }

      const proceeds = (trade.quantity * trade.price) - trade.commission - trade.slippage
      this.portfolio.cash += proceeds

      // Calculate realized P&L
      const realizedPnL = (trade.price - position.averagePrice) * trade.quantity
      position.realizedPnL += realizedPnL

      // Update position
      position.quantity -= trade.quantity
      position.marketValue = position.quantity * trade.price
      position.unrealizedPnL = position.marketValue - (position.quantity * position.averagePrice)

      // Remove position if quantity is zero
      if (position.quantity === 0) {
        this.portfolio.positions.delete(trade.symbol)
      }
    }

    this.portfolio.trades.push(trade)
    
    this.emit('trade', trade)
  }

  private recordEquityPoint(): void {
    const previousHigh = this.equityCurve.length > 0 
      ? Math.max(...this.equityCurve.map(p => p.value))
      : this.config.initialCapital

    const currentHigh = Math.max(previousHigh, this.portfolio.totalValue)
    const drawdown = (currentHigh - this.portfolio.totalValue) / currentHigh

    this.equityCurve.push({
      timestamp: new Date(this.currentTimestamp),
      value: this.portfolio.totalValue,
      drawdown
    })
  }

  private recordPositions(): void {
    const positions = Array.from(this.portfolio.positions.values()).map(pos => ({ ...pos }))
    this.positionHistory.push({
      timestamp: new Date(this.currentTimestamp),
      positions
    })
  }

  private generateResult(): BacktestResult {
    const metrics = this.performanceAnalyzer.calculateMetrics(
      this.equityCurve,
      this.portfolio.trades,
      this.config
    )

    const strategyReturns = this.performanceAnalyzer.calculateReturns(this.equityCurve)

    return {
      config: this.config,
      portfolio: this.portfolio,
      metrics,
      equityCurve: this.equityCurve,
      trades: this.portfolio.trades,
      positions: this.positionHistory,
      strategyReturns
    }
  }

  getProgress(): { timestamp: Date; portfolioValue: number; totalPnL: number } {
    return {
      timestamp: this.currentTimestamp,
      portfolioValue: this.portfolio.totalValue,
      totalPnL: this.portfolio.totalPnL
    }
  }
}