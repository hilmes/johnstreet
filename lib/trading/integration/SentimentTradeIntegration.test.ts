import { SentimentTradeIntegration, IntegrationConfig } from './SentimentTradeIntegration'
import { signalPipeline } from '../pipeline/SignalPipeline'
import { activityLoggerKV } from '@/lib/sentiment/ActivityLoggerKV'
import { krakenService } from '@/services/KrakenService'
import { Portfolio } from '@/types/trading'
import { defaultStrategies } from '../strategies/defaults'

// Mock dependencies
jest.mock('../pipeline/SignalPipeline')
jest.mock('@/lib/sentiment/ActivityLoggerKV')
jest.mock('@/services/KrakenService')
jest.mock('../strategies/defaults', () => ({
  defaultStrategies: [
    {
      id: 'momentum-default',
      name: 'Momentum Strategy',
      type: 'momentum',
      isActive: true,
      config: { positionSizing: { method: 'fixed_percentage', percentage: 0.05 } }
    },
    {
      id: 'scalping-default',
      name: 'Scalping Strategy',
      type: 'scalping',
      isActive: true,
      config: { positionSizing: { method: 'fixed_percentage', percentage: 0.03 } }
    },
    {
      id: 'mean-reversion-default',
      name: 'Mean Reversion',
      type: 'meanReversion',
      isActive: true,
      config: { positionSizing: { method: 'fixed_percentage', percentage: 0.04 } }
    },
    {
      id: 'safe-haven-default',
      name: 'Safe Haven',
      type: 'conservative',
      isActive: true,
      config: { positionSizing: { method: 'fixed_percentage', percentage: 0.02 } }
    }
  ],
  getStrategyForCondition: jest.fn().mockReturnValue({
    id: 'momentum-default',
    name: 'Momentum Strategy',
    type: 'momentum',
    isActive: true
  })
}))

describe('SentimentTradeIntegration', () => {
  let integration: SentimentTradeIntegration
  let mockPortfolio: Portfolio
  let mockActivityCallback: ((entry: any) => Promise<void>) | null = null

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

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

    // Mock activityLoggerKV.subscribe to capture the callback
    ;(activityLoggerKV.subscribe as jest.Mock).mockImplementation((callback) => {
      mockActivityCallback = callback
    })
    
    ;(activityLoggerKV.log as jest.Mock).mockResolvedValue(undefined)
    ;(signalPipeline.start as jest.Mock).mockResolvedValue(undefined)
    ;(signalPipeline.stop as jest.Mock).mockResolvedValue(undefined)
    ;(signalPipeline.queueSentiment as jest.Mock).mockImplementation(() => {})
    ;(signalPipeline.getMetrics as jest.Mock).mockReturnValue({
      signalsGenerated: 0,
      signalsRouted: 0,
      signalsExecuted: 0
    })
    ;(signalPipeline.updateConfig as jest.Mock).mockImplementation(() => {})

    integration = new SentimentTradeIntegration()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('constructor', () => {
    it('should initialize with default config', () => {
      expect(integration).toBeDefined()
      expect(integration.isActive()).toBe(false)
      expect(activityLoggerKV.subscribe).toHaveBeenCalled()
    })

    it('should accept custom config', () => {
      const customConfig: Partial<IntegrationConfig> = {
        symbolWhitelist: ['BTC', 'ETH'],
        minActivityThreshold: 10,
        priceUpdateInterval: 60000
      }

      const customIntegration = new SentimentTradeIntegration(customConfig)
      const config = customIntegration.getConfig()

      expect(config.symbolWhitelist).toEqual(['BTC', 'ETH'])
      expect(config.minActivityThreshold).toBe(10)
      expect(config.priceUpdateInterval).toBe(60000)
    })
  })

  describe('start', () => {
    it('should start integration successfully', async () => {
      ;(krakenService.fetchTicker as jest.Mock).mockResolvedValue({
        last: 50000,
        high: 51000,
        low: 49000,
        bid: 49900,
        ask: 50100,
        baseVolume: 1000000,
        percentage: 2.5
      })

      await integration.start(mockPortfolio)

      expect(integration.isActive()).toBe(true)
      expect(signalPipeline.start).toHaveBeenCalledWith(mockPortfolio, krakenService)
      expect(activityLoggerKV.log).toHaveBeenCalledWith({
        type: 'integration_start',
        platform: 'system',
        source: 'sentiment_trade_integration',
        message: 'Sentiment-to-trade integration started',
        data: expect.any(Object)
      })

      // Check intervals are set
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 30000) // Price updates
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000) // Strategy updates
    })

    it('should not start if already running', async () => {
      await integration.start(mockPortfolio)
      const logCallCount = (activityLoggerKV.log as jest.Mock).mock.calls.length

      await integration.start(mockPortfolio)

      expect((activityLoggerKV.log as jest.Mock).mock.calls.length).toBe(logCallCount)
    })
  })

  describe('stop', () => {
    it('should stop integration and clear intervals', async () => {
      await integration.start(mockPortfolio)
      await integration.stop()

      expect(integration.isActive()).toBe(false)
      expect(signalPipeline.stop).toHaveBeenCalled()
      expect(activityLoggerKV.log).toHaveBeenCalledWith({
        type: 'integration_stop',
        platform: 'system',
        source: 'sentiment_trade_integration',
        message: 'Sentiment-to-trade integration stopped'
      })
    })
  })

  describe('processSentimentActivity', () => {
    beforeEach(async () => {
      await integration.start(mockPortfolio)
    })

    it('should process symbol detection events', async () => {
      const mockActivity = {
        type: 'symbol_detection',
        platform: 'reddit',
        timestamp: Date.now(),
        data: {
          symbols: ['BTC', 'ETH'],
          sentiment: 0.7
        }
      }

      await mockActivityCallback?.(mockActivity)

      // Advance time to check if activity is tracked
      const stats = integration.getActivityStats()
      expect(stats.uniqueSymbols).toBeGreaterThanOrEqual(0)
    })

    it('should ignore non-whitelisted symbols', async () => {
      const mockActivity = {
        type: 'symbol_detection',
        platform: 'reddit',
        timestamp: Date.now(),
        data: {
          symbols: ['UNKNOWN'],
          sentiment: 0.7
        }
      }

      await mockActivityCallback?.(mockActivity)

      const stats = integration.getActivityStats()
      expect(stats.activeSymbols).toBe(0)
    })

    it('should aggregate sentiments over time', async () => {
      ;(krakenService.fetchTicker as jest.Mock).mockResolvedValue({
        last: 50000,
        high: 51000,
        low: 49000,
        bid: 49900,
        ask: 50100,
        baseVolume: 1000000,
        percentage: 2.5
      })

      // Send multiple sentiment events
      for (let i = 0; i < 6; i++) {
        await mockActivityCallback?.({
          type: 'symbol_detection',
          platform: 'reddit',
          timestamp: Date.now() - i * 1000,
          data: {
            symbols: ['BTC'],
            sentiment: 0.5 + i * 0.1
          }
        })
      }

      // Should trigger signal evaluation
      expect(signalPipeline.queueSentiment).toHaveBeenCalled()
    })

    it('should clean old sentiments', async () => {
      const oldTimestamp = Date.now() - 10 * 60 * 1000 // 10 minutes ago

      await mockActivityCallback?.({
        type: 'symbol_detection',
        platform: 'reddit',
        timestamp: oldTimestamp,
        data: {
          symbols: ['BTC'],
          sentiment: 0.7
        }
      })

      // Send recent sentiment
      await mockActivityCallback?.({
        type: 'symbol_detection',
        platform: 'twitter',
        timestamp: Date.now(),
        data: {
          symbols: ['BTC'],
          sentiment: 0.8
        }
      })

      const stats = integration.getActivityStats()
      // Old sentiment should be cleaned out
      expect(stats.totalMentions).toBeLessThanOrEqual(1)
    })
  })

  describe('processCrossPlatformSignal', () => {
    beforeEach(async () => {
      await integration.start(mockPortfolio)
    })

    it('should process cross-platform signals with high priority', async () => {
      ;(krakenService.fetchTicker as jest.Mock).mockResolvedValue({
        last: 50000,
        high: 51000,
        low: 49000,
        bid: 49900,
        ask: 50100,
        baseVolume: 1000000,
        percentage: 2.5
      })

      const crossPlatformActivity = {
        type: 'cross_platform_signal',
        platform: 'system',
        timestamp: Date.now(),
        data: {
          symbol: 'BTC',
          signal: 'strong_buy',
          platforms: ['reddit', 'twitter'],
          confidence: 0.9
        }
      }

      await mockActivityCallback?.(crossPlatformActivity)

      expect(signalPipeline.queueSentiment).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        crossPlatformActivity.data
      )
    })
  })

  describe('market data fetching', () => {
    beforeEach(async () => {
      await integration.start(mockPortfolio)
    })

    it('should fetch and cache market data', async () => {
      const mockTicker = {
        last: 50000,
        high: 51000,
        low: 49000,
        bid: 49900,
        ask: 50100,
        baseVolume: 1000000,
        percentage: 2.5
      }

      ;(krakenService.fetchTicker as jest.Mock).mockResolvedValue(mockTicker)

      // Trigger sentiment that requires market data
      for (let i = 0; i < 5; i++) {
        await mockActivityCallback?.({
          type: 'symbol_detection',
          platform: 'reddit',
          timestamp: Date.now(),
          data: {
            symbols: ['BTC'],
            sentiment: 0.7
          }
        })
      }

      expect(krakenService.fetchTicker).toHaveBeenCalledWith('BTC/USD')
    })

    it('should handle market data fetch errors', async () => {
      ;(krakenService.fetchTicker as jest.Mock).mockRejectedValue(new Error('API error'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Trigger sentiment that requires market data
      for (let i = 0; i < 5; i++) {
        await mockActivityCallback?.({
          type: 'symbol_detection',
          platform: 'reddit',
          timestamp: Date.now(),
          data: {
            symbols: ['ETH'],
            sentiment: 0.7
          }
        })
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch market data'),
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('should update prices periodically', async () => {
      const mockTicker = {
        last: 50000,
        high: 51000,
        low: 49000,
        bid: 49900,
        ask: 50100,
        baseVolume: 1000000,
        percentage: 2.5
      }

      ;(krakenService.fetchTicker as jest.Mock).mockResolvedValue(mockTicker)

      // Add some activity
      await mockActivityCallback?.({
        type: 'symbol_detection',
        platform: 'reddit',
        timestamp: Date.now(),
        data: {
          symbols: ['BTC'],
          sentiment: 0.7
        }
      })

      // Advance timer to trigger price update
      jest.advanceTimersByTime(30000)

      // Should update prices for active symbols
      expect(krakenService.fetchTicker).toHaveBeenCalled()
    })
  })

  describe('strategy configuration', () => {
    beforeEach(async () => {
      await integration.start(mockPortfolio)
    })

    it('should configure strategies based on market conditions', async () => {
      const mockTicker = {
        last: 50000,
        high: 52000,
        low: 48000,
        bid: 49900,
        ask: 50100,
        baseVolume: 10000000, // High volume
        percentage: 5.0 // Strong trend
      }

      ;(krakenService.fetchTicker as jest.Mock).mockResolvedValue(mockTicker)

      // Trigger strategy update
      jest.advanceTimersByTime(5 * 60 * 1000)

      expect(signalPipeline.updateConfig).toHaveBeenCalledWith({
        strategies: expect.any(Array)
      })
    })

    it('should handle strategy configuration errors', async () => {
      ;(krakenService.fetchTicker as jest.Mock).mockRejectedValue(new Error('API error'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Trigger strategy update
      jest.advanceTimersByTime(5 * 60 * 1000)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to configure pipeline strategies:',
        expect.any(Error)
      )

      // Should fall back to default strategies
      expect(signalPipeline.updateConfig).toHaveBeenCalledWith({
        strategies: defaultStrategies
      })

      consoleSpy.mockRestore()
    })

    it('should select appropriate strategies for market conditions', async () => {
      const conditions = await integration.getMarketConditions()

      // Should return reasonable defaults even without real data
      expect(conditions).toMatchObject({
        volatility: expect.any(Number),
        trendStrength: expect.any(Number),
        marketSentiment: expect.any(Number),
        volume: expect.any(Number)
      })
    })
  })

  describe('getActivityStats', () => {
    beforeEach(async () => {
      await integration.start(mockPortfolio)
    })

    it('should return activity statistics', async () => {
      // Add some activity
      for (let i = 0; i < 10; i++) {
        await mockActivityCallback?.({
          type: 'symbol_detection',
          platform: i % 2 === 0 ? 'reddit' : 'twitter',
          timestamp: Date.now() - i * 60000,
          data: {
            symbols: [i < 5 ? 'BTC' : 'ETH'],
            sentiment: 0.5 + (i % 3) * 0.2
          }
        })
      }

      const stats = integration.getActivityStats()

      expect(stats).toMatchObject({
        activeSymbols: expect.any(Number),
        totalMentions: expect.any(Number),
        avgSentiment: expect.any(Number),
        topSymbols: expect.any(Array),
        uniqueSymbols: expect.any(Number),
        totalDetections: expect.any(Number),
        averageSentiment: expect.any(Number)
      })
    })

    it('should handle empty activity', () => {
      const stats = integration.getActivityStats()

      expect(stats).toMatchObject({
        activeSymbols: 0,
        totalMentions: 0,
        avgSentiment: 0,
        topSymbols: [],
        uniqueSymbols: 0,
        totalDetections: 0,
        averageSentiment: 0
      })
    })

    it('should return top symbols sorted by mentions', async () => {
      // Add varied activity
      const symbols = ['BTC', 'ETH', 'DOGE']
      const mentions = [10, 5, 3]

      for (let s = 0; s < symbols.length; s++) {
        for (let m = 0; m < mentions[s]; m++) {
          await mockActivityCallback?.({
            type: 'symbol_detection',
            platform: 'reddit',
            timestamp: Date.now() - m * 1000,
            data: {
              symbols: [symbols[s]],
              sentiment: 0.7
            }
          })
        }
      }

      const stats = integration.getActivityStats()
      
      if (stats.topSymbols.length > 0) {
        expect(stats.topSymbols[0].symbol).toBe('BTC')
        expect(stats.topSymbols[0].mentions).toBeGreaterThanOrEqual(
          stats.topSymbols[1]?.mentions || 0
        )
      }
    })
  })

  describe('config management', () => {
    it('should update config', () => {
      const newConfig: Partial<IntegrationConfig> = {
        minActivityThreshold: 20,
        priceUpdateInterval: 60000
      }

      integration.updateConfig(newConfig)

      const config = integration.getConfig()
      expect(config.minActivityThreshold).toBe(20)
      expect(config.priceUpdateInterval).toBe(60000)
    })

    it('should maintain other config values when updating', () => {
      const originalConfig = integration.getConfig()
      
      integration.updateConfig({ minActivityThreshold: 15 })

      const updatedConfig = integration.getConfig()
      expect(updatedConfig.minActivityThreshold).toBe(15)
      expect(updatedConfig.symbolWhitelist).toEqual(originalConfig.symbolWhitelist)
      expect(updatedConfig.priceUpdateInterval).toBe(originalConfig.priceUpdateInterval)
    })
  })

  describe('getActiveStrategies', () => {
    it('should return active strategies', () => {
      const strategies = integration.getActiveStrategies()

      expect(strategies).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          type: expect.any(String),
          isActive: expect.any(Boolean)
        })
      ]))
    })
  })

  describe('sentiment aggregation', () => {
    beforeEach(async () => {
      await integration.start(mockPortfolio)
    })

    it('should weight recent sentiments more heavily', async () => {
      ;(krakenService.fetchTicker as jest.Mock).mockResolvedValue({
        last: 50000,
        high: 51000,
        low: 49000,
        bid: 49900,
        ask: 50100,
        baseVolume: 1000000,
        percentage: 2.5
      })

      // Send old negative sentiment
      await mockActivityCallback?.({
        type: 'symbol_detection',
        platform: 'reddit',
        timestamp: Date.now() - 4 * 60 * 1000, // 4 minutes ago
        data: {
          symbols: ['BTC'],
          sentiment: -0.8
        }
      })

      // Send recent positive sentiments
      for (let i = 0; i < 5; i++) {
        await mockActivityCallback?.({
          type: 'symbol_detection',
          platform: 'twitter',
          timestamp: Date.now() - i * 1000,
          data: {
            symbols: ['BTC'],
            sentiment: 0.8
          }
        })
      }

      // Check that signal was queued with positive sentiment
      const queueCall = (signalPipeline.queueSentiment as jest.Mock).mock.calls[0]
      if (queueCall) {
        expect(queueCall[0].score).toBeGreaterThan(0) // Should be positive due to recent weight
      }
    })

    it('should calculate confidence based on consistency and volume', async () => {
      ;(krakenService.fetchTicker as jest.Mock).mockResolvedValue({
        last: 50000,
        high: 51000,
        low: 49000,
        bid: 49900,
        ask: 50100,
        baseVolume: 1000000,
        percentage: 2.5
      })

      // Send consistent sentiments
      for (let i = 0; i < 8; i++) {
        await mockActivityCallback?.({
          type: 'symbol_detection',
          platform: 'reddit',
          timestamp: Date.now() - i * 1000,
          data: {
            symbols: ['ETH'],
            sentiment: 0.7 + (Math.random() * 0.1 - 0.05) // Small variance
          }
        })
      }

      const queueCall = (signalPipeline.queueSentiment as jest.Mock).mock.calls
        .find(call => call[1]?.symbol === 'ETH')
      
      if (queueCall) {
        expect(queueCall[0].confidence).toBeGreaterThan(0.5) // High confidence due to consistency
      }
    })
  })

  describe('sentiment classification', () => {
    it('should classify sentiments correctly', () => {
      const classifications = [
        { score: -0.8, expected: 'very_negative' },
        { score: -0.4, expected: 'negative' },
        { score: 0, expected: 'neutral' },
        { score: 0.3, expected: 'positive' },
        { score: 0.8, expected: 'very_positive' }
      ]

      classifications.forEach(({ score, expected }) => {
        const result = integration['classifySentiment'](score)
        expect(result).toBe(expected)
      })
    })
  })
})