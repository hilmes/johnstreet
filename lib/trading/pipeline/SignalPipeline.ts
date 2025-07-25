import { signalGenerator, TradingSignal, MarketData } from '../signals/SignalGenerator'
import { signalRouter } from '../signals/SignalRouter'
import { positionSizer } from '../risk/PositionSizer'
import { executionManager } from '../execution/ExecutionManager'
import { activityLoggerKV } from '@/lib/sentiment/ActivityLoggerKV'
import { SentimentScore } from '@/lib/sentiment/SentimentAnalyzer'
import { CrossPlatformSignal } from '@/lib/feeds/DataOrchestrator'
import { Strategy, Portfolio } from '@/types/trading'
import { UnifiedExchange } from '@/lib/exchanges/unified/UnifiedExchange'

export interface PipelineConfig {
  enabled: boolean
  mode: 'live' | 'paper' | 'backtest'
  exchanges: string[]
  strategies: Strategy[]
  filters: {
    minConfidence: number
    minStrength: number
    allowedSymbols?: string[]
    blockedSymbols?: string[]
    maxConcurrentSignals: number
  }
  monitoring: {
    logLevel: 'debug' | 'info' | 'warn' | 'error'
    metricsInterval: number // ms
    alertThresholds: {
      failureRate: number
      slippage: number
      drawdown: number
    }
  }
}

export interface PipelineMetrics {
  signalsGenerated: number
  signalsRouted: number
  signalsExecuted: number
  successRate: number
  totalPnL: number
  activePositions: number
  failureReasons: Record<string, number>
}

export interface SignalProcessingResult {
  signal: TradingSignal | null
  routed: boolean
  executed: boolean
  errors: string[]
  executionResult?: any
}

export class SignalPipeline {
  private config: PipelineConfig
  private isRunning: boolean = false
  private portfolio: Portfolio | null = null
  private exchange: UnifiedExchange | null = null
  private processingQueue: Array<{
    sentiment: SentimentScore
    marketData: MarketData
    crossPlatformSignal?: CrossPlatformSignal
  }> = []
  private metrics: PipelineMetrics = {
    signalsGenerated: 0,
    signalsRouted: 0,
    signalsExecuted: 0,
    successRate: 0,
    totalPnL: 0,
    activePositions: 0,
    failureReasons: {}
  }

  constructor(config: PipelineConfig) {
    this.config = config
    this.setupMonitoring()
  }

  async start(portfolio: Portfolio, exchange: UnifiedExchange): Promise<void> {
    if (this.isRunning) {
      throw new Error('Pipeline already running')
    }

    this.portfolio = portfolio
    this.exchange = exchange
    this.isRunning = true

    await activityLoggerKV.log({
      type: 'pipeline_start',
      platform: 'system',
      source: 'signal_pipeline',
      message: 'Signal pipeline started',
      data: {
        mode: this.config.mode,
        strategies: this.config.strategies.length,
        exchange: exchange.name
      }
    })

    // Start processing loop
    this.startProcessingLoop()
  }

  async stop(): Promise<void> {
    this.isRunning = false
    
    await activityLoggerKV.log({
      type: 'pipeline_stop',
      platform: 'system',
      source: 'signal_pipeline',
      message: 'Signal pipeline stopped',
      data: this.metrics
    })
  }

  // Main method to process sentiment into trades
  async processSentiment(
    sentiment: SentimentScore,
    marketData: MarketData,
    crossPlatformSignal?: CrossPlatformSignal
  ): Promise<SignalProcessingResult> {
    const result: SignalProcessingResult = {
      signal: null,
      routed: false,
      executed: false,
      errors: []
    }

    try {
      // Step 1: Generate trading signal
      const signal = await this.generateSignal(sentiment, marketData, crossPlatformSignal)
      if (!signal) {
        result.errors.push('No signal generated from sentiment')
        return result
      }
      result.signal = signal

      // Step 2: Apply filters
      if (!this.passesFilters(signal)) {
        result.errors.push('Signal filtered out')
        this.recordFailure('filtered')
        return result
      }

      // Step 3: Route to strategy
      const assignment = await this.routeSignal(signal)
      if (!assignment) {
        result.errors.push('No strategy available for signal')
        this.recordFailure('no_strategy')
        return result
      }
      result.routed = true

      // Step 4: Calculate position size
      const positionSize = await this.calculatePosition(signal, assignment.strategyId)
      if (!positionSize) {
        result.errors.push('Position size too small or risk limits exceeded')
        this.recordFailure('position_size')
        return result
      }

      // Step 5: Execute trade
      if (this.config.mode !== 'backtest') {
        const executionResult = await this.executeTrade(signal, positionSize, assignment.strategyId)
        if (executionResult.status === 'success') {
          result.executed = true
          result.executionResult = executionResult
          this.metrics.signalsExecuted++
        } else {
          result.errors.push(`Execution failed: ${executionResult.errors?.join(', ')}`)
          this.recordFailure('execution_failed')
        }
      }

      // Step 6: Log and monitor
      await this.logSignalProcessing(signal, assignment, result)

      return result

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
      this.recordFailure('exception')
      return result
    }
  }

  private async generateSignal(
    sentiment: SentimentScore,
    marketData: MarketData,
    crossPlatformSignal?: CrossPlatformSignal
  ): Promise<TradingSignal | null> {
    try {
      const signal = await signalGenerator.generateFromSentiment(
        sentiment,
        marketData,
        crossPlatformSignal
      )

      if (signal) {
        this.metrics.signalsGenerated++
        
        await activityLoggerKV.log({
          type: 'signal_generated',
          platform: 'system',
          source: 'signal_pipeline',
          message: `Signal generated for ${signal.symbol}`,
          data: {
            symbol: signal.symbol,
            action: signal.action,
            strength: signal.strength,
            confidence: signal.confidence,
            riskLevel: signal.metadata.riskLevel
          }
        })
      }

      return signal

    } catch (error) {
      console.error('Signal generation error:', error)
      return null
    }
  }

  private passesFilters(signal: TradingSignal): boolean {
    const { filters } = this.config

    // Confidence filter
    if (signal.confidence < filters.minConfidence) return false

    // Strength filter
    if (signal.strength < filters.minStrength) return false

    // Symbol whitelist
    if (filters.allowedSymbols && !filters.allowedSymbols.includes(signal.symbol)) return false

    // Symbol blacklist
    if (filters.blockedSymbols && filters.blockedSymbols.includes(signal.symbol)) return false

    // Concurrent signals limit
    const activeSignals = signalGenerator.getActiveSignals().length
    if (activeSignals >= filters.maxConcurrentSignals) return false

    return true
  }

  private async routeSignal(signal: TradingSignal): Promise<any> {
    try {
      const assignment = await signalRouter.routeToStrategy(signal, this.config.strategies)
      
      if (assignment) {
        this.metrics.signalsRouted++
        
        await activityLoggerKV.log({
          type: 'signal_routed',
          platform: 'system',
          source: 'signal_pipeline',
          message: `Signal routed to strategy ${assignment.strategyId}`,
          data: {
            signalId: signal.id,
            strategyId: assignment.strategyId,
            priority: assignment.priority,
            reason: assignment.reason
          }
        })
      }

      return assignment

    } catch (error) {
      console.error('Signal routing error:', error)
      return null
    }
  }

  private async calculatePosition(signal: TradingSignal, strategyId: string): Promise<any> {
    if (!this.portfolio || !this.exchange) return null

    try {
      // Get current market price
      const ticker = await this.exchange.fetchTicker(signal.symbol)
      const currentPrice = ticker.last

      // Get strategy config
      const strategy = this.config.strategies.find(s => s.id === strategyId)
      if (!strategy) return null

      // Calculate position size
      const positionSize = positionSizer.calculatePositionSize(
        signal,
        currentPrice,
        this.portfolio,
        strategy.config?.positionSizing
      )

      if (positionSize) {
        await activityLoggerKV.log({
          type: 'position_calculated',
          platform: 'system',
          source: 'signal_pipeline',
          message: `Position size calculated for ${signal.symbol}`,
          data: {
            symbol: signal.symbol,
            baseAmount: positionSize.baseAmount,
            percentage: positionSize.percentage,
            method: positionSize.metadata.method,
            adjustments: positionSize.metadata.adjustments
          }
        })
      }

      return positionSize

    } catch (error) {
      console.error('Position calculation error:', error)
      return null
    }
  }

  private async executeTrade(signal: TradingSignal, positionSize: any, strategyId: string): Promise<any> {
    if (!this.exchange) {
      throw new Error('Exchange not connected')
    }

    try {
      const executionResult = await executionManager.executeSignal(
        signal,
        positionSize,
        this.exchange
      )

      // Update metrics
      if (executionResult.status === 'success') {
        this.metrics.activePositions++
      }

      // Update strategy capacity
      signalRouter.updateStrategyCapacity(strategyId, {
        currentPositions: this.metrics.activePositions,
        allocatedCapital: positionSize.baseAmount
      })

      await activityLoggerKV.log({
        type: 'trade_executed',
        platform: 'system',
        source: 'signal_pipeline',
        message: `Trade executed for ${signal.symbol}`,
        data: {
          symbol: signal.symbol,
          action: signal.action,
          amount: positionSize.quoteAmount,
          price: executionResult.avgFillPrice,
          status: executionResult.status,
          slippage: executionResult.slippage,
          fees: executionResult.fees
        }
      })

      return executionResult

    } catch (error) {
      console.error('Trade execution error:', error)
      throw error
    }
  }

  private async logSignalProcessing(signal: TradingSignal, assignment: any, result: SignalProcessingResult): Promise<void> {
    await activityLoggerKV.log({
      type: 'signal_processed',
      platform: 'system',
      source: 'signal_pipeline',
      message: `Signal processing completed for ${signal.symbol}`,
      data: {
        signalId: signal.id,
        symbol: signal.symbol,
        routed: result.routed,
        executed: result.executed,
        errors: result.errors,
        strategyId: assignment?.strategyId
      },
      severity: result.executed ? 'success' : result.errors.length > 0 ? 'error' : 'info'
    })
  }

  private recordFailure(reason: string): void {
    this.metrics.failureReasons[reason] = (this.metrics.failureReasons[reason] || 0) + 1
  }

  private startProcessingLoop(): void {
    setInterval(async () => {
      if (!this.isRunning) return

      // Process queued items
      while (this.processingQueue.length > 0 && this.isRunning) {
        const item = this.processingQueue.shift()
        if (item) {
          await this.processSentiment(
            item.sentiment,
            item.marketData,
            item.crossPlatformSignal
          )
        }
      }
    }, 1000) // Process every second
  }

  private setupMonitoring(): void {
    // Update metrics periodically
    setInterval(() => {
      if (this.metrics.signalsExecuted > 0) {
        this.metrics.successRate = this.metrics.signalsExecuted / this.metrics.signalsGenerated
      }

      // Check alert thresholds
      const executionMetrics = executionManager.getExecutionMetrics()
      
      if (executionMetrics.successRate < this.config.monitoring.alertThresholds.failureRate) {
        this.sendAlert('High failure rate detected', {
          currentRate: executionMetrics.successRate,
          threshold: this.config.monitoring.alertThresholds.failureRate
        })
      }

      if (executionMetrics.avgSlippage > this.config.monitoring.alertThresholds.slippage) {
        this.sendAlert('High slippage detected', {
          avgSlippage: executionMetrics.avgSlippage,
          threshold: this.config.monitoring.alertThresholds.slippage
        })
      }

    }, this.config.monitoring.metricsInterval)
  }

  private async sendAlert(message: string, data: any): Promise<void> {
    await activityLoggerKV.log({
      type: 'pipeline_alert',
      platform: 'system',
      source: 'signal_pipeline',
      message,
      data,
      severity: 'error'
    })

    // In production, this would send notifications via email/SMS/etc
    console.error(`ALERT: ${message}`, data)
  }

  // Public methods
  queueSentiment(
    sentiment: SentimentScore,
    marketData: MarketData,
    crossPlatformSignal?: CrossPlatformSignal
  ): void {
    if (this.isRunning) {
      this.processingQueue.push({ sentiment, marketData, crossPlatformSignal })
    }
  }

  getMetrics(): PipelineMetrics {
    return { ...this.metrics }
  }

  updateConfig(config: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...config }
  }

  isActive(): boolean {
    return this.isRunning
  }
}

// Export singleton instance
export const signalPipeline = new SignalPipeline({
  enabled: false,
  mode: 'paper',
  exchanges: ['kraken'],
  strategies: [],
  filters: {
    minConfidence: 0.6,
    minStrength: 0.5,
    maxConcurrentSignals: 10
  },
  monitoring: {
    logLevel: 'info',
    metricsInterval: 60000,
    alertThresholds: {
      failureRate: 0.3,
      slippage: 0.02,
      drawdown: 0.1
    }
  }
})