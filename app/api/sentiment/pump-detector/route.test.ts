import { GET, POST } from './route'
import { NextRequest } from 'next/server'
import { RedditScanner } from '@/lib/sentiment/RedditScanner'
import { UnifiedExchange } from '@/lib/exchanges/UnifiedExchange'
import { SentimentAnalyzer } from '@/lib/sentiment/SentimentAnalyzer'

// Mock dependencies
jest.mock('@/lib/sentiment/RedditScanner')
jest.mock('@/lib/exchanges/UnifiedExchange')
jest.mock('@/lib/sentiment/SentimentAnalyzer')

// Mock fetch for internal API calls
global.fetch = jest.fn()

describe('/api/sentiment/pump-detector', () => {
  let mockRedditScanner: jest.Mocked<RedditScanner>
  let mockExchange: jest.Mocked<UnifiedExchange>
  let mockSentimentAnalyzer: jest.Mocked<SentimentAnalyzer>

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup RedditScanner mock
    mockRedditScanner = {
      connectPublic: jest.fn(),
      getPumpSubreddits: jest.fn().mockReturnValue(['CryptoMoonShots', 'SatoshiStreetBets', 'AltStreetBets']),
      scanMultipleSubreddits: jest.fn(),
      disconnect: jest.fn()
    } as any
    ;(RedditScanner as jest.MockedClass<typeof RedditScanner>).mockImplementation(() => mockRedditScanner)

    // Setup UnifiedExchange mock
    mockExchange = {
      connect: jest.fn(),
      detectVolumeSpike: jest.fn(),
      detectPriceAnomaly: jest.fn(),
      disconnect: jest.fn()
    } as any
    ;(UnifiedExchange as jest.MockedClass<typeof UnifiedExchange>).mockImplementation(() => mockExchange)

    // Setup SentimentAnalyzer mock
    mockSentimentAnalyzer = {
      detectPumpSignal: jest.fn()
    } as any
    ;(SentimentAnalyzer as jest.MockedClass<typeof SentimentAnalyzer>).mockImplementation(() => mockSentimentAnalyzer)
  })

  describe('GET - Detect Pump Signals', () => {
    const mockSocialAnalyses = [
      {
        subreddit: 'CryptoMoonShots',
        pumpSignals: [
          { id: '1', symbol: 'DOGE', confidence: 0.85, riskLevel: 'high', indicators: ['rapid mentions'] },
          { id: '2', symbol: 'SHIB', confidence: 0.7, riskLevel: 'medium', indicators: ['emoji spam'] }
        ],
        sentiment: {
          symbols: [
            { symbol: 'DOGE', mentions: 150 },
            { symbol: 'SHIB', mentions: 80 }
          ]
        }
      },
      {
        subreddit: 'SatoshiStreetBets',
        pumpSignals: [
          { id: '3', symbol: 'DOGE', confidence: 0.9, riskLevel: 'critical', indicators: ['coordinated posts'] }
        ],
        sentiment: {
          symbols: [
            { symbol: 'DOGE', mentions: 200 },
            { symbol: 'BTC', mentions: 50 }
          ]
        }
      }
    ]

    it('should detect pump signals without specific symbol', async () => {
      mockRedditScanner.scanMultipleSubreddits.mockResolvedValueOnce(mockSocialAnalyses)

      const request = new NextRequest('http://localhost:3000/api/sentiment/pump-detector')
      const response = await GET(request)
      const data = await response.json()

      expect(mockRedditScanner.connectPublic).toHaveBeenCalled()
      expect(mockRedditScanner.getPumpSubreddits).toHaveBeenCalled()
      expect(mockRedditScanner.scanMultipleSubreddits).toHaveBeenCalledWith(
        ['CryptoMoonShots', 'SatoshiStreetBets', 'AltStreetBets'],
        'hour'
      )

      expect(data.success).toBe(true)
      expect(data.data.data.social.totalSignals).toBe(3)
      expect(data.data.data.social.mentionedSymbols[0]).toEqual({ symbol: 'DOGE', mentions: 350 })
      expect(data.data.riskLevel).toBe('low') // No specific symbol analyzed
    })

    it('should detect pump signals for specific symbol', async () => {
      mockRedditScanner.scanMultipleSubreddits.mockResolvedValueOnce(mockSocialAnalyses)
      mockExchange.detectVolumeSpike.mockResolvedValueOnce({
        isSpike: true,
        volumeSpike: 3.5,
        currentVolume: 1000000,
        averageVolume: 285714
      })
      mockExchange.detectPriceAnomaly.mockResolvedValueOnce({
        isAnomaly: true,
        percentChange: 15.5,
        volatility: 2.8,
        standardDeviations: 3.2
      })
      mockSentimentAnalyzer.detectPumpSignal.mockReturnValueOnce({
        confidence: 0.88,
        riskLevel: 'high',
        indicators: ['social surge', 'volume spike', 'price anomaly']
      })

      const request = new NextRequest('http://localhost:3000/api/sentiment/pump-detector?symbol=DOGE')
      const response = await GET(request)
      const data = await response.json()

      expect(mockExchange.connect).toHaveBeenCalled()
      expect(mockExchange.detectVolumeSpike).toHaveBeenCalledWith('DOGE', '1m', 100)
      expect(mockExchange.detectPriceAnomaly).toHaveBeenCalledWith('DOGE', '1m', 100)
      expect(mockSentimentAnalyzer.detectPumpSignal).toHaveBeenCalledWith([], 'DOGE', 3.5, 15.5)

      expect(data.data.symbol).toBe('DOGE')
      expect(data.data.data.social.symbolSignals).toBe(2) // 2 DOGE signals
      expect(data.data.data.social.highRiskSignals).toHaveLength(2) // high + critical
      expect(data.data.data.market.volumeSpike).toBe(true)
      expect(data.data.data.market.priceAnomaly).toBe(true)
      expect(data.data.confidence).toBe(0.88)
      expect(data.data.riskLevel).toBe('high')
    })

    it('should handle different exchanges', async () => {
      mockRedditScanner.scanMultipleSubreddits.mockResolvedValueOnce(mockSocialAnalyses)
      mockExchange.detectVolumeSpike.mockResolvedValueOnce({ isSpike: false, volumeSpike: 1.2 })
      mockExchange.detectPriceAnomaly.mockResolvedValueOnce({ isAnomaly: false, percentChange: 2.1 })

      const request = new NextRequest('http://localhost:3000/api/sentiment/pump-detector?symbol=BTC&exchange=binance')
      const response = await GET(request)

      expect(UnifiedExchange).toHaveBeenCalledWith('binance')
      expect(response.status).toBe(200)
    })

    it('should handle different timeframes', async () => {
      mockRedditScanner.scanMultipleSubreddits.mockResolvedValueOnce([])

      const request = new NextRequest('http://localhost:3000/api/sentiment/pump-detector?timeframe=day')
      const response = await GET(request)

      expect(mockRedditScanner.scanMultipleSubreddits).toHaveBeenCalledWith(
        expect.any(Array),
        'day'
      )
    })

    it('should generate alerts for high-risk signals', async () => {
      mockRedditScanner.scanMultipleSubreddits.mockResolvedValueOnce(mockSocialAnalyses)
      mockExchange.detectVolumeSpike.mockResolvedValueOnce({ isSpike: true, volumeSpike: 5 })
      mockExchange.detectPriceAnomaly.mockResolvedValueOnce({ isAnomaly: true, percentChange: 25 })

      const request = new NextRequest('http://localhost:3000/api/sentiment/pump-detector?symbol=DOGE')
      const response = await GET(request)
      const data = await response.json()

      expect(data.data.alerts).toContainEqual({
        type: 'high_risk_social_signal',
        message: '2 high-risk pump signals detected',
        severity: 'warning'
      })
      expect(data.data.alerts).toContainEqual({
        type: 'market_anomaly',
        message: 'Unusual volume and price activity detected',
        severity: 'critical'
      })
      expect(data.data.riskLevel).toBe('critical')
    })

    it('should handle market data errors gracefully', async () => {
      mockRedditScanner.scanMultipleSubreddits.mockResolvedValueOnce(mockSocialAnalyses)
      mockExchange.connect.mockRejectedValueOnce(new Error('Exchange API error'))

      const request = new NextRequest('http://localhost:3000/api/sentiment/pump-detector?symbol=DOGE')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.data.market).toEqual({ error: 'Failed to fetch market data' })
      expect(data.data.data.social).toBeDefined()
    })

    it('should handle Reddit scanner errors', async () => {
      mockRedditScanner.connectPublic.mockRejectedValueOnce(new Error('Reddit API error'))

      const request = new NextRequest('http://localhost:3000/api/sentiment/pump-detector')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual({
        success: false,
        error: 'Failed to detect pump signals',
        details: 'Reddit API error'
      })
      expect(response.status).toBe(500)
    })

    it('should calculate average confidence correctly', async () => {
      const analyses = [{
        pumpSignals: [
          { symbol: 'TEST', confidence: 0.8, riskLevel: 'medium' },
          { symbol: 'TEST', confidence: 0.6, riskLevel: 'low' },
          { symbol: 'TEST', confidence: 0.9, riskLevel: 'high' }
        ],
        sentiment: { symbols: [] }
      }]
      mockRedditScanner.scanMultipleSubreddits.mockResolvedValueOnce(analyses)

      const request = new NextRequest('http://localhost:3000/api/sentiment/pump-detector?symbol=TEST')
      const response = await GET(request)
      const data = await response.json()

      expect(data.data.data.social.avgConfidence).toBeCloseTo(0.766, 2)
    })
  })

  describe('POST - Bulk Pump Detection', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
        const urlObj = new URL(url)
        const symbol = urlObj.searchParams.get('symbol')
        
        return Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            data: {
              symbol,
              timestamp: Date.now(),
              riskLevel: symbol === 'DOGE' ? 'high' : 'low',
              confidence: symbol === 'DOGE' ? 0.85 : 0.3,
              alerts: [],
              data: {
                social: { totalSignals: 1 },
                market: { volumeSpike: false },
                combined: null
              }
            }
          })
        })
      })
    })

    it('should analyze multiple symbols', async () => {
      const request = new NextRequest('http://localhost:3000/api/sentiment/pump-detector', {
        method: 'POST',
        body: JSON.stringify({
          symbols: ['BTC', 'ETH', 'DOGE'],
          exchanges: ['kraken'],
          timeframe: 'hour'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.totalAnalyzed).toBe(3)
      expect(data.data.highRiskCount).toBe(1) // Only DOGE is high risk
      expect(data.data.results).toHaveLength(3)
      expect(data.data.results[0].symbol).toBe('DOGE') // Sorted by risk level
    })

    it('should analyze multiple exchanges per symbol', async () => {
      const request = new NextRequest('http://localhost:3000/api/sentiment/pump-detector', {
        method: 'POST',
        body: JSON.stringify({
          symbols: ['BTC'],
          exchanges: ['kraken', 'binance', 'coinbase'],
          timeframe: 'hour'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.data.totalAnalyzed).toBe(3) // 1 symbol × 3 exchanges
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    it('should use default values when not provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/sentiment/pump-detector', {
        method: 'POST',
        body: JSON.stringify({
          symbols: ['BTC']
        })
      })

      const response = await POST(request)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('exchange=kraken&timeframe=hour')
      )
    })

    it('should validate symbols input', async () => {
      const request = new NextRequest('http://localhost:3000/api/sentiment/pump-detector', {
        method: 'POST',
        body: JSON.stringify({
          symbols: 'not-an-array'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({
        success: false,
        error: 'symbols array is required'
      })
      expect(response.status).toBe(400)
    })

    it('should handle missing symbols', async () => {
      const request = new NextRequest('http://localhost:3000/api/sentiment/pump-detector', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(response.status).toBe(400)
    })

    it('should sort results by risk level and confidence', async () => {
      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
        const urlObj = new URL(url)
        const symbol = urlObj.searchParams.get('symbol')
        
        const mockData = {
          'HIGH': { riskLevel: 'critical', confidence: 0.9 },
          'MED1': { riskLevel: 'medium', confidence: 0.8 },
          'MED2': { riskLevel: 'medium', confidence: 0.6 },
          'LOW': { riskLevel: 'low', confidence: 0.9 }
        }
        
        return Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            data: {
              symbol,
              ...mockData[symbol as keyof typeof mockData],
              timestamp: Date.now(),
              alerts: [],
              data: {}
            }
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/sentiment/pump-detector', {
        method: 'POST',
        body: JSON.stringify({
          symbols: ['LOW', 'MED1', 'MED2', 'HIGH']
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.data.results[0].symbol).toBe('HIGH') // Critical risk
      expect(data.data.results[1].symbol).toBe('MED1') // Medium risk, higher confidence
      expect(data.data.results[2].symbol).toBe('MED2') // Medium risk, lower confidence
      expect(data.data.results[3].symbol).toBe('LOW')  // Low risk
    })

    it('should limit results to 50', async () => {
      const symbols = Array(100).fill(null).map((_, i) => `SYM${i}`)
      
      const request = new NextRequest('http://localhost:3000/api/sentiment/pump-detector', {
        method: 'POST',
        body: JSON.stringify({ symbols })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.data.totalAnalyzed).toBe(100)
      expect(data.data.results).toHaveLength(50)
    })

    it('should handle individual symbol errors gracefully', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, data: { symbol: 'BTC', riskLevel: 'low' } })
        })
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, data: { symbol: 'ETH', riskLevel: 'medium' } })
        })

      const request = new NextRequest('http://localhost:3000/api/sentiment/pump-detector', {
        method: 'POST',
        body: JSON.stringify({
          symbols: ['BTC', 'FAIL', 'ETH']
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.totalAnalyzed).toBe(2) // Only successful ones
      expect(data.data.results).toHaveLength(2)
    })

    it('should handle JSON parsing errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/sentiment/pump-detector', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to analyze multiple symbols')
      expect(response.status).toBe(500)
    })
  })
})