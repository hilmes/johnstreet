import { AlertSystem, AlertConfig, Alert } from './AlertSystem'
import { RedditScanner } from '../sentiment/RedditScanner'
import { UnifiedExchange } from '../exchanges/UnifiedExchange'
import { EventEmitter } from 'events'
import cron from 'node-cron'

jest.mock('../sentiment/RedditScanner')
jest.mock('../exchanges/UnifiedExchange')
jest.mock('node-cron')

describe('AlertSystem', () => {
  let alertSystem: AlertSystem
  let mockConfig: AlertConfig
  let mockRedditScanner: jest.Mocked<RedditScanner>
  let mockExchange: jest.Mocked<UnifiedExchange>
  let mockSchedule: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockConfig = {
      enablePumpDetection: true,
      enableVolumeAlerts: true,
      enableSentimentAlerts: true,
      volumeThreshold: 3,
      priceChangeThreshold: 10,
      sentimentThreshold: 0.7,
      monitoringInterval: 5,
      symbols: ['BTC', 'ETH'],
      exchanges: ['binance'],
      subreddits: ['CryptoCurrency', 'Bitcoin']
    }

    mockSchedule = jest.fn().mockReturnValue({
      start: jest.fn(),
      stop: jest.fn()
    })
    ;(cron.schedule as jest.Mock) = mockSchedule

    alertSystem = new AlertSystem(mockConfig)
    
    mockRedditScanner = (alertSystem as any).redditScanner
    mockRedditScanner.connectPublic = jest.fn().mockResolvedValue(undefined)
    mockRedditScanner.scanMultipleSubreddits = jest.fn()
  })

  describe('initialization', () => {
    it('should initialize successfully with valid config', async () => {
      const mockExchangeInstance = {
        connect: jest.fn().mockResolvedValue(undefined)
      }
      ;(UnifiedExchange as jest.Mock).mockImplementation(() => mockExchangeInstance)

      await alertSystem.initialize()

      expect(mockRedditScanner.connectPublic).toHaveBeenCalled()
      expect(UnifiedExchange).toHaveBeenCalledWith('binance')
      expect(mockExchangeInstance.connect).toHaveBeenCalled()
    })

    it('should throw error if initialization fails', async () => {
      const error = new Error('Connection failed')
      mockRedditScanner.connectPublic = jest.fn().mockRejectedValue(error)

      await expect(alertSystem.initialize()).rejects.toThrow('Connection failed')
    })
  })

  describe('start/stop functionality', () => {
    beforeEach(async () => {
      const mockExchangeInstance = {
        connect: jest.fn().mockResolvedValue(undefined)
      }
      ;(UnifiedExchange as jest.Mock).mockImplementation(() => mockExchangeInstance)
      await alertSystem.initialize()
    })

    it('should start monitoring when start() is called', () => {
      const startedListener = jest.fn()
      alertSystem.on('started', startedListener)

      alertSystem.start()

      expect(mockSchedule).toHaveBeenCalledTimes(3) // pump, volume, sentiment
      expect(startedListener).toHaveBeenCalled()
      expect(alertSystem.isSystemRunning()).toBe(true)
    })

    it('should not start if already running', () => {
      alertSystem.start()
      const initialCallCount = mockSchedule.mock.calls.length
      
      alertSystem.start()
      
      expect(mockSchedule).toHaveBeenCalledTimes(initialCallCount)
    })

    it('should stop monitoring when stop() is called', () => {
      const stoppedListener = jest.fn()
      alertSystem.on('stopped', stoppedListener)
      
      alertSystem.start()
      alertSystem.stop()

      expect(stoppedListener).toHaveBeenCalled()
      expect(alertSystem.isSystemRunning()).toBe(false)
    })

    it('should not stop if not running', () => {
      const stoppedListener = jest.fn()
      alertSystem.on('stopped', stoppedListener)
      
      alertSystem.stop()
      
      expect(stoppedListener).not.toHaveBeenCalled()
    })
  })

  describe('alert creation and management', () => {
    it('should create alert with correct properties', async () => {
      const alertListener = jest.fn()
      alertSystem.on('alert', alertListener)

      const alert = await (alertSystem as any).createAlert({
        type: 'volume_spike',
        severity: 'high',
        symbol: 'BTC',
        message: 'Test alert',
        data: { test: true }
      })

      expect(alert).toMatchObject({
        type: 'volume_spike',
        severity: 'high',
        symbol: 'BTC',
        message: 'Test alert',
        acknowledged: false
      })
      expect(alert.id).toBeDefined()
      expect(alert.timestamp).toBeDefined()
      expect(alertListener).toHaveBeenCalledWith(alert)
    })

    it('should not create duplicate alerts within 10 minutes', async () => {
      const alertListener = jest.fn()
      alertSystem.on('alert', alertListener)

      await (alertSystem as any).createAlert({
        type: 'volume_spike',
        severity: 'high',
        symbol: 'BTC',
        message: 'Test alert',
        data: {}
      })

      await (alertSystem as any).createAlert({
        type: 'volume_spike',
        severity: 'high',
        symbol: 'BTC',
        message: 'Test alert 2',
        data: {}
      })

      expect(alertListener).toHaveBeenCalledTimes(1)
    })

    it('should auto-acknowledge low severity alerts after 30 minutes', async () => {
      jest.useFakeTimers()
      
      const alert = await (alertSystem as any).createAlert({
        type: 'volume_spike',
        severity: 'low',
        symbol: 'BTC',
        message: 'Low severity alert',
        data: {}
      })

      expect(alert.acknowledged).toBe(false)
      
      jest.advanceTimersByTime(30 * 60 * 1000)
      
      const alerts = alertSystem.getAlerts()
      const updatedAlert = alerts.find(a => a.id === alert.id)
      expect(updatedAlert?.acknowledged).toBe(true)
      
      jest.useRealTimers()
    })
  })

  describe('alert retrieval', () => {
    beforeEach(async () => {
      await (alertSystem as any).createAlert({
        type: 'volume_spike',
        severity: 'high',
        symbol: 'BTC',
        message: 'BTC alert',
        data: {}
      })
      
      await (alertSystem as any).createAlert({
        type: 'price_anomaly',
        severity: 'medium',
        symbol: 'ETH',
        message: 'ETH alert',
        data: {}
      })
    })

    it('should get all alerts sorted by timestamp', () => {
      const alerts = alertSystem.getAlerts()
      
      expect(alerts).toHaveLength(2)
      expect(alerts[0].timestamp).toBeGreaterThanOrEqual(alerts[1].timestamp)
    })

    it('should get unacknowledged alerts only when requested', () => {
      const alerts = alertSystem.getAlerts()
      alertSystem.acknowledgeAlert(alerts[0].id)
      
      const unacknowledged = alertSystem.getAlerts(true)
      
      expect(unacknowledged).toHaveLength(1)
      expect(unacknowledged[0].acknowledged).toBe(false)
    })

    it('should get alerts by symbol', () => {
      const btcAlerts = alertSystem.getAlertsBySymbol('BTC')
      
      expect(btcAlerts).toHaveLength(1)
      expect(btcAlerts[0].symbol).toBe('BTC')
    })
  })

  describe('alert acknowledgment', () => {
    it('should acknowledge alert successfully', async () => {
      const acknowledgedListener = jest.fn()
      alertSystem.on('alertAcknowledged', acknowledgedListener)
      
      const alert = await (alertSystem as any).createAlert({
        type: 'volume_spike',
        severity: 'high',
        symbol: 'BTC',
        message: 'Test alert',
        data: {}
      })

      const result = alertSystem.acknowledgeAlert(alert.id)
      
      expect(result).toBe(true)
      expect(acknowledgedListener).toHaveBeenCalledWith(expect.objectContaining({
        id: alert.id,
        acknowledged: true
      }))
    })

    it('should return false for non-existent alert', () => {
      const result = alertSystem.acknowledgeAlert('non-existent-id')
      expect(result).toBe(false)
    })
  })

  describe('alert cleanup', () => {
    it('should clear acknowledged alerts', async () => {
      const alert1 = await (alertSystem as any).createAlert({
        type: 'volume_spike',
        severity: 'high',
        symbol: 'BTC',
        message: 'Alert 1',
        data: {}
      })
      
      const alert2 = await (alertSystem as any).createAlert({
        type: 'price_anomaly',
        severity: 'medium',
        symbol: 'ETH',
        message: 'Alert 2',
        data: {}
      })

      alertSystem.acknowledgeAlert(alert1.id)
      
      const cleared = alertSystem.clearAcknowledgedAlerts()
      
      expect(cleared).toBe(1)
      expect(alertSystem.getAlerts()).toHaveLength(1)
      expect(alertSystem.getAlerts()[0].id).toBe(alert2.id)
    })
  })

  describe('configuration', () => {
    it('should update config and restart if running', () => {
      alertSystem.start()
      
      const configUpdatedListener = jest.fn()
      alertSystem.on('configUpdated', configUpdatedListener)
      
      const newConfig = { volumeThreshold: 5 }
      alertSystem.updateConfig(newConfig)
      
      expect(configUpdatedListener).toHaveBeenCalledWith(
        expect.objectContaining({ volumeThreshold: 5 })
      )
      expect(alertSystem.isSystemRunning()).toBe(true)
    })

    it('should get current config', () => {
      const config = alertSystem.getConfig()
      expect(config).toEqual(mockConfig)
    })
  })

  describe('statistics', () => {
    it('should return correct statistics', async () => {
      await (alertSystem as any).createAlert({
        type: 'volume_spike',
        severity: 'high',
        symbol: 'BTC',
        message: 'Alert 1',
        data: {}
      })
      
      await (alertSystem as any).createAlert({
        type: 'volume_spike',
        severity: 'medium',
        symbol: 'ETH',
        message: 'Alert 2',
        data: {}
      })
      
      await (alertSystem as any).createAlert({
        type: 'price_anomaly',
        severity: 'high',
        symbol: 'BTC',
        message: 'Alert 3',
        data: {}
      })

      const alerts = alertSystem.getAlerts()
      alertSystem.acknowledgeAlert(alerts[0].id)
      
      const stats = alertSystem.getStats()
      
      expect(stats).toEqual({
        totalAlerts: 3,
        unacknowledgedAlerts: 2,
        alertsByType: {
          volume_spike: 2,
          price_anomaly: 1
        },
        alertsBySeverity: {
          high: 2,
          medium: 1
        }
      })
    })
  })

  describe('monitoring functions', () => {
    let mockExchangeInstance: any

    beforeEach(async () => {
      mockExchangeInstance = {
        connect: jest.fn().mockResolvedValue(undefined),
        detectVolumeSpike: jest.fn(),
        detectPriceAnomaly: jest.fn()
      }
      ;(UnifiedExchange as jest.Mock).mockImplementation(() => mockExchangeInstance)
      await alertSystem.initialize()
    })

    it('should detect volume spikes', async () => {
      mockExchangeInstance.detectVolumeSpike.mockResolvedValue({
        isSpike: true,
        volumeSpike: 5.5,
        currentVolume: 1000,
        averageVolume: 180
      })

      await (alertSystem as any).monitorVolumeSpikes()

      expect(mockExchangeInstance.detectVolumeSpike).toHaveBeenCalledWith('BTC', '1m', 20)
      expect(mockExchangeInstance.detectVolumeSpike).toHaveBeenCalledWith('ETH', '1m', 20)
      
      const alerts = alertSystem.getAlerts()
      expect(alerts).toHaveLength(2)
      expect(alerts[0].type).toBe('volume_spike')
      expect(alerts[0].severity).toBe('high')
    })

    it('should monitor sentiment', async () => {
      mockRedditScanner.scanMultipleSubreddits.mockResolvedValue([
        {
          subreddit: 'CryptoCurrency',
          sentimentScore: 0.85,
          metrics: {
            suspiciousActivity: false,
            posts: 10,
            bullishPosts: 8,
            bearishPosts: 2
          },
          pumpSignals: []
        }
      ])

      await (alertSystem as any).monitorSentiment()

      const alerts = alertSystem.getAlerts()
      expect(alerts).toHaveLength(1)
      expect(alerts[0].type).toBe('sentiment_spike')
      expect(alerts[0].severity).toBe('high')
      expect(alerts[0].message).toContain('bullish')
    })

    it('should detect coordinated activity', async () => {
      mockRedditScanner.scanMultipleSubreddits.mockResolvedValue([
        {
          subreddit: 'Bitcoin',
          sentimentScore: 0.5,
          metrics: {
            suspiciousActivity: true,
            posts: 20,
            bullishPosts: 10,
            bearishPosts: 10
          },
          pumpSignals: []
        }
      ])

      await (alertSystem as any).monitorSentiment()

      const alerts = alertSystem.getAlerts()
      expect(alerts).toHaveLength(1)
      expect(alerts[0].type).toBe('coordinated_activity')
      expect(alerts[0].severity).toBe('high')
    })

    it('should run pump detection', async () => {
      mockRedditScanner.scanMultipleSubreddits.mockResolvedValue([
        {
          subreddit: 'CryptoCurrency',
          sentimentScore: 0.7,
          metrics: { suspiciousActivity: false },
          pumpSignals: [{
            symbol: 'BTC',
            confidence: 0.9,
            riskLevel: 'critical',
            redditActivity: { posts: 50, comments: 200 },
            marketData: { volumeIncrease: 500, priceChange: 20 },
            timestamp: Date.now()
          }]
        }
      ])

      mockExchangeInstance.detectVolumeSpike.mockResolvedValue({
        isSpike: true,
        volumeSpike: 6,
        currentVolume: 1200,
        averageVolume: 200
      })

      mockExchangeInstance.detectPriceAnomaly.mockResolvedValue({
        isAnomaly: true,
        percentChange: 15,
        standardDeviations: 3
      })

      await (alertSystem as any).runPumpDetection()

      const alerts = alertSystem.getAlerts()
      const pumpAlert = alerts.find(a => a.type === 'pump_signal')
      expect(pumpAlert).toBeDefined()
      expect(pumpAlert?.severity).toBe('critical')
      expect(pumpAlert?.message).toContain('90% confidence')
    })
  })
})