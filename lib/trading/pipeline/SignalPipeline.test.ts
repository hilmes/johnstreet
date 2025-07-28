import { SignalPipeline, PipelineConfig, SignalProcessingResult } from './SignalPipeline'
import { signalGenerator, TradingSignal, MarketData } from '../signals/SignalGenerator'
import { signalRouter } from '../signals/SignalRouter'
import { positionSizer } from '../risk/PositionSizer'
import { executionManager } from '../execution/ExecutionManager'
import { activityLoggerKV } from '@/lib/sentiment/ActivityLoggerKV'
import { SentimentScore } from '@/lib/sentiment/SentimentAnalyzer'
import { UnifiedExchange } from '@/lib/exchanges/unified/UnifiedExchange'
import { Portfolio } from '@/types/trading'
import { defaultStrategies } from '../strategies/defaults'

// Mock dependencies
jest.mock('../signals/SignalGenerator')
jest.mock('../signals/SignalRouter')
jest.mock('../risk/PositionSizer')
jest.mock('../execution/ExecutionManager')
jest.mock('@/lib/sentiment/ActivityLoggerKV')
jest.mock('@/lib/exchanges/unified/UnifiedExchange')

describe('SignalPipeline', () => {
  let pipeline: SignalPipeline
  let mockConfig: PipelineConfig
  let mockPortfolio: Portfolio
  let mockExchange: UnifiedExchange

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    mockConfig = {
      enabled: true,
      mode: 'paper',
      exchanges: ['kraken'],
      strategies: defaultStrategies,
      filters: {
        minConfidence: 0.6,
        minStrength: 0.5,
        maxConcurrentSignals: 10,
        allowedSymbols: ['BTC/USD', 'ETH/USD'],
        blockedSymbols: ['DOGE/USD']
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
    }

    mockPortfolio = {
      totalBalance: 10000,
      availableBalance: 8000,
      positions: [],
      performance: {
        totalPnL: 0,
        totalPnLPercent: 0,
        dailyPnL: 0,
        dailyPnLPercent: 0,
        weeklyPnL: 0,
        weeklyPnLPercent: 0,
        monthlyPnL: 0,
        monthlyPnLPercent: 0
      }
    }

    mockExchange = {
      name: 'kraken',
      fetchTicker: jest.fn().mockResolvedValue({ last: 50000 })
    } as any

    pipeline = new SignalPipeline(mockConfig)

    // Mock logger
    ;(activityLoggerKV.log as jest.Mock).mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(pipeline).toBeDefined()
      expect(pipeline.isActive()).toBe(false)
    })

    it('should setup monitoring interval', () => {
      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        mockConfig.monitoring.metricsInterval
      )
    })
  })

  describe('start', () => {
    it('should start the pipeline successfully', async () => {
      await pipeline.start(mockPortfolio, mockExchange)

      expect(pipeline.isActive()).toBe(true)
      expect(activityLoggerKV.log).toHaveBeenCalledWith({
        type: 'pipeline_start',
        platform: 'system',
        source: 'signal_pipeline',
        message: 'Signal pipeline started',
        data: {
          mode: 'paper',
          strategies: defaultStrategies.length,
          exchange: 'kraken'
        }
      })
    })

    it('should throw error if already running', async () => {
      await pipeline.start(mockPortfolio, mockExchange)
      
      await expect(pipeline.start(mockPortfolio, mockExchange)).rejects.toThrow(
        'Pipeline already running'
      )
    })

    it('should start processing loop', async () => {
      await pipeline.start(mockPortfolio, mockExchange)

      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 1000)
    })
  })

  describe('stop', () => {
    it('should stop the pipeline and log metrics', async () => {
      await pipeline.start(mockPortfolio, mockExchange)
      await pipeline.stop()

      expect(pipeline.isActive()).toBe(false)
      expect(activityLoggerKV.log).toHaveBeenCalledWith({
        type: 'pipeline_stop',
        platform: 'system',
        source: 'signal_pipeline',
        message: 'Signal pipeline stopped',
        data: expect.any(Object)
      })
    })
  })

  describe('processSentiment', () => {
    const mockSentiment: SentimentScore = {
      symbol: 'BTC/USD',
      timestamp: new Date().toISOString(),
      score: 0.8,
      confidence: 0.9,
      volume: 100,
      signals: ['bullish_trend', 'high_volume']
    }

    const mockMarketData: MarketData = {
      symbol: 'BTC/USD',
      price: 50000,
      volume: 1000000,
      timestamp: Date.now(),
      bid: 49900,
      ask: 50100,
      high: 51000,
      low: 49000,
      open: 49500,
      close: 50000,
      change: 500,
      changePercent: 1.01
    }

    const mockSignal: TradingSignal = {
      id: 'sig-123',
      symbol: 'BTC/USD',
      action: 'buy',
      strength: 0.8,
      confidence: 0.9,
      timestamp: Date.now(),
      source: 'sentiment',
      metadata: {
        sentimentScore: 0.8,
        volumeProfile: 'high',
        pricePosition: 'oversold',
        riskLevel: 'medium',
        indicators: {
          rsi: 35,
          macd: { signal: 0.5, histogram: 0.2 },
          volume: { ratio: 1.5, trend: 'increasing' }
        }
      }
    }

    beforeEach(async () => {
      await pipeline.start(mockPortfolio, mockExchange)
    })

    it('should process sentiment successfully', async () => {
      ;(signalGenerator.generateFromSentiment as jest.Mock).mockResolvedValue(mockSignal)
      ;(signalRouter.routeToStrategy as jest.Mock).mockResolvedValue({
        strategyId: 'momentum-strategy',
        priority: 1,
        reason: 'Best match for signal'
      })
      ;(positionSizer.calculatePositionSize as jest.Mock).mockReturnValue({
        baseAmount: 0.1,
        quoteAmount: 5000,
        percentage: 5,
        metadata: { method: 'kelly', adjustments: [] }
      })
      ;(executionManager.executeSignal as jest.Mock).mockResolvedValue({
        status: 'success',
        avgFillPrice: 50000,
        slippage: 0.001,
        fees: 10
      })

      const result = await pipeline.processSentiment(mockSentiment, mockMarketData)

      expect(result).toMatchObject({
        signal: mockSignal,
        routed: true,
        executed: true,
        errors: []
      })

      expect(signalGenerator.generateFromSentiment).toHaveBeenCalledWith(
        mockSentiment,
        mockMarketData,
        undefined
      )
      expect(signalRouter.routeToStrategy).toHaveBeenCalledWith(
        mockSignal,
        defaultStrategies
      )
      expect(positionSizer.calculatePositionSize).toHaveBeenCalled()
      expect(executionManager.executeSignal).toHaveBeenCalled()
    })

    it('should handle no signal generated', async () => {
      ;(signalGenerator.generateFromSentiment as jest.Mock).mockResolvedValue(null)

      const result = await pipeline.processSentiment(mockSentiment, mockMarketData)

      expect(result).toMatchObject({
        signal: null,
        routed: false,
        executed: false,
        errors: ['No signal generated from sentiment']
      })
    })

    it('should filter out low confidence signals', async () => {
      const lowConfSignal = { ...mockSignal, confidence: 0.4 }
      ;(signalGenerator.generateFromSentiment as jest.Mock).mockResolvedValue(lowConfSignal)

      const result = await pipeline.processSentiment(mockSentiment, mockMarketData)

      expect(result).toMatchObject({
        signal: lowConfSignal,
        routed: false,
        executed: false,
        errors: ['Signal filtered out']
      })
    })

    it('should filter out blocked symbols', async () => {
      const blockedSignal = { ...mockSignal, symbol: 'DOGE/USD' }
      ;(signalGenerator.generateFromSentiment as jest.Mock).mockResolvedValue(blockedSignal)

      const result = await pipeline.processSentiment(mockSentiment, mockMarketData)

      expect(result).toMatchObject({
        signal: blockedSignal,
        routed: false,
        executed: false,
        errors: ['Signal filtered out']
      })
    })

    it('should handle no strategy available', async () => {
      ;(signalGenerator.generateFromSentiment as jest.Mock).mockResolvedValue(mockSignal)
      ;(signalRouter.routeToStrategy as jest.Mock).mockResolvedValue(null)

      const result = await pipeline.processSentiment(mockSentiment, mockMarketData)

      expect(result).toMatchObject({
        signal: mockSignal,
        routed: false,
        executed: false,
        errors: ['No strategy available for signal']
      })
    })

    it('should handle position size calculation failure', async () => {
      ;(signalGenerator.generateFromSentiment as jest.Mock).mockResolvedValue(mockSignal)
      ;(signalRouter.routeToStrategy as jest.Mock).mockResolvedValue({
        strategyId: 'momentum-strategy',
        priority: 1
      })
      ;(positionSizer.calculatePositionSize as jest.Mock).mockReturnValue(null)

      const result = await pipeline.processSentiment(mockSentiment, mockMarketData)

      expect(result).toMatchObject({
        signal: mockSignal,
        routed: true,
        executed: false,
        errors: ['Position size too small or risk limits exceeded']
      })
    })

    it('should handle execution failure', async () => {
      ;(signalGenerator.generateFromSentiment as jest.Mock).mockResolvedValue(mockSignal)
      ;(signalRouter.routeToStrategy as jest.Mock).mockResolvedValue({
        strategyId: 'momentum-strategy',
        priority: 1
      })
      ;(positionSizer.calculatePositionSize as jest.Mock).mockReturnValue({
        baseAmount: 0.1,
        quoteAmount: 5000,
        percentage: 5,
        metadata: { method: 'kelly', adjustments: [] }
      })
      ;(executionManager.executeSignal as jest.Mock).mockResolvedValue({
        status: 'failed',
        errors: ['Insufficient balance']
      })

      const result = await pipeline.processSentiment(mockSentiment, mockMarketData)

      expect(result).toMatchObject({
        signal: mockSignal,
        routed: true,
        executed: false,
        errors: ['Execution failed: Insufficient balance']
      })
    })

    it('should skip execution in backtest mode', async () => {
      pipeline.updateConfig({ mode: 'backtest' })

      ;(signalGenerator.generateFromSentiment as jest.Mock).mockResolvedValue(mockSignal)
      ;(signalRouter.routeToStrategy as jest.Mock).mockResolvedValue({
        strategyId: 'momentum-strategy'
      })
      ;(positionSizer.calculatePositionSize as jest.Mock).mockReturnValue({
        baseAmount: 0.1
      })

      const result = await pipeline.processSentiment(mockSentiment, mockMarketData)

      expect(executionManager.executeSignal).not.toHaveBeenCalled()
      expect(result.executed).toBe(false)
    })

    it('should handle exceptions gracefully', async () => {
      ;(signalGenerator.generateFromSentiment as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      const result = await pipeline.processSentiment(mockSentiment, mockMarketData)

      expect(result).toMatchObject({
        signal: null,
        routed: false,
        executed: false,
        errors: ['Network error']
      })
    })
  })

  describe('queueSentiment', () => {
    it('should queue sentiment when pipeline is running', async () => {
      await pipeline.start(mockPortfolio, mockExchange)

      const sentiment = {} as SentimentScore
      const marketData = {} as MarketData

      pipeline.queueSentiment(sentiment, marketData)

      // Advance timers to trigger processing loop
      jest.advanceTimersByTime(1000)
    })

    it('should not queue sentiment when pipeline is stopped', () => {
      const sentiment = {} as SentimentScore
      const marketData = {} as MarketData

      pipeline.queueSentiment(sentiment, marketData)

      // Queue should remain empty since pipeline is not running
      expect(pipeline.getMetrics().signalsGenerated).toBe(0)
    })
  })

  describe('getMetrics', () => {
    it('should return current metrics', async () => {
      await pipeline.start(mockPortfolio, mockExchange)

      const metrics = pipeline.getMetrics()

      expect(metrics).toMatchObject({
        signalsGenerated: 0,
        signalsRouted: 0,
        signalsExecuted: 0,
        successRate: 0,
        totalPnL: 0,
        activePositions: 0,
        failureReasons: {}
      })
    })

    it('should update metrics during processing', async () => {
      await pipeline.start(mockPortfolio, mockExchange)

      ;(signalGenerator.generateFromSentiment as jest.Mock).mockResolvedValue({
        id: 'sig-123',
        symbol: 'BTC/USD',
        action: 'buy',
        strength: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: 'sentiment',
        metadata: { riskLevel: 'medium' }
      })

      await pipeline.processSentiment(
        {} as SentimentScore,
        {} as MarketData
      )

      const metrics = pipeline.getMetrics()
      expect(metrics.signalsGenerated).toBe(1)
      expect(metrics.failureReasons.filtered).toBe(1)
    })
  })

  describe('updateConfig', () => {
    it('should update configuration', () => {
      pipeline.updateConfig({
        mode: 'live',
        filters: {
          minConfidence: 0.8,
          minStrength: 0.7,
          maxConcurrentSignals: 5
        }
      })

      // Test by processing a signal that would pass new filters
      const highConfSignal = {
        confidence: 0.85,
        strength: 0.75,
        symbol: 'BTC/USD'
      } as TradingSignal

      // Signal should pass updated filters
      expect(pipeline['passesFilters'](highConfSignal)).toBe(true)
    })
  })

  describe('monitoring and alerts', () => {
    beforeEach(async () => {
      await pipeline.start(mockPortfolio, mockExchange)
      ;(executionManager.getExecutionMetrics as jest.Mock).mockReturnValue({
        successRate: 0.2,
        avgSlippage: 0.03,
        totalExecutions: 100
      })
    })

    it('should send alert for high failure rate', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Trigger monitoring check
      jest.advanceTimersByTime(mockConfig.monitoring.metricsInterval)

      expect(activityLoggerKV.log).toHaveBeenCalledWith({
        type: 'pipeline_alert',
        platform: 'system',
        source: 'signal_pipeline',
        message: 'High failure rate detected',
        data: {
          currentRate: 0.2,
          threshold: 0.3
        },
        severity: 'error'
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        'ALERT: High failure rate detected',
        expect.any(Object)
      )

      consoleSpy.mockRestore()
    })

    it('should send alert for high slippage', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Trigger monitoring check
      jest.advanceTimersByTime(mockConfig.monitoring.metricsInterval)

      expect(activityLoggerKV.log).toHaveBeenCalledWith({
        type: 'pipeline_alert',
        platform: 'system',
        source: 'signal_pipeline',
        message: 'High slippage detected',
        data: {
          avgSlippage: 0.03,
          threshold: 0.02
        },
        severity: 'error'
      })

      consoleSpy.mockRestore()
    })

    it('should update success rate metric', () => {
      // Simulate successful executions
      pipeline['metrics'].signalsGenerated = 10
      pipeline['metrics'].signalsExecuted = 7

      // Trigger monitoring update
      jest.advanceTimersByTime(mockConfig.monitoring.metricsInterval)

      expect(pipeline.getMetrics().successRate).toBe(0.7)
    })
  })

  describe('filter validation', () => {
    const createSignal = (overrides: Partial<TradingSignal> = {}): TradingSignal => ({
      id: 'test-signal',
      symbol: 'BTC/USD',
      action: 'buy',
      strength: 0.7,
      confidence: 0.8,
      timestamp: Date.now(),
      source: 'sentiment',
      metadata: { riskLevel: 'medium' },
      ...overrides
    })

    it('should pass signal meeting all criteria', () => {
      const signal = createSignal()
      expect(pipeline['passesFilters'](signal)).toBe(true)
    })

    it('should reject signal with low confidence', () => {
      const signal = createSignal({ confidence: 0.4 })
      expect(pipeline['passesFilters'](signal)).toBe(false)
    })

    it('should reject signal with low strength', () => {
      const signal = createSignal({ strength: 0.3 })
      expect(pipeline['passesFilters'](signal)).toBe(false)
    })

    it('should reject signal not in allowed symbols', () => {
      const signal = createSignal({ symbol: 'ADA/USD' })
      expect(pipeline['passesFilters'](signal)).toBe(false)
    })

    it('should reject blocked symbols', () => {
      const signal = createSignal({ symbol: 'DOGE/USD' })
      expect(pipeline['passesFilters'](signal)).toBe(false)
    })

    it('should respect concurrent signals limit', () => {
      ;(signalGenerator.getActiveSignals as jest.Mock).mockReturnValue(
        new Array(10).fill({})
      )

      const signal = createSignal()
      expect(pipeline['passesFilters'](signal)).toBe(false)
    })
  })

  describe('error handling', () => {
    beforeEach(async () => {
      await pipeline.start(mockPortfolio, mockExchange)
    })

    it('should handle exchange ticker fetch errors', async () => {
      ;(signalGenerator.generateFromSentiment as jest.Mock).mockResolvedValue({
        id: 'sig-123',
        symbol: 'BTC/USD',
        action: 'buy',
        strength: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: 'sentiment',
        metadata: { riskLevel: 'medium' }
      })
      ;(signalRouter.routeToStrategy as jest.Mock).mockResolvedValue({
        strategyId: 'momentum-strategy'
      })
      ;(mockExchange.fetchTicker as jest.Mock).mockRejectedValue(
        new Error('Exchange API error')
      )

      const result = await pipeline.processSentiment(
        {} as SentimentScore,
        {} as MarketData
      )

      expect(result.errors).toContain('Position size too small or risk limits exceeded')
    })

    it('should handle missing strategy in position calculation', async () => {
      ;(signalGenerator.generateFromSentiment as jest.Mock).mockResolvedValue({
        id: 'sig-123',
        symbol: 'BTC/USD',
        action: 'buy',
        strength: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: 'sentiment',
        metadata: { riskLevel: 'medium' }
      })
      ;(signalRouter.routeToStrategy as jest.Mock).mockResolvedValue({
        strategyId: 'non-existent-strategy'
      })

      const result = await pipeline.processSentiment(
        {} as SentimentScore,
        {} as MarketData
      )

      expect(result.errors).toContain('Position size too small or risk limits exceeded')
    })
  })
})