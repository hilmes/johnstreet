import { GET, POST } from './route'
import { NextRequest } from 'next/server'
import { RedditScanner } from '@/lib/sentiment/RedditScanner'

// Mock RedditScanner
jest.mock('@/lib/sentiment/RedditScanner')

describe('/api/sentiment/reddit', () => {
  let mockRedditScanner: jest.Mocked<RedditScanner>

  beforeEach(() => {
    jest.clearAllMocks()
    mockRedditScanner = {
      connectPublic: jest.fn(),
      connect: jest.fn(),
      scanSubreddit: jest.fn(),
      scanMultipleSubreddits: jest.fn(),
      disconnect: jest.fn()
    } as any
    ;(RedditScanner as jest.MockedClass<typeof RedditScanner>).mockImplementation(() => mockRedditScanner)
  })

  describe('GET - Scan Subreddit', () => {
    const mockAnalysis = {
      subreddit: 'CryptoCurrency',
      timeframe: 'day',
      totalPosts: 50,
      analyzedPosts: 45,
      sentimentScore: 0.68,
      sentimentDistribution: {
        positive: 28,
        negative: 10,
        neutral: 7
      },
      pumpSignals: [
        {
          id: 'pump_1',
          symbol: 'DOGE',
          confidence: 0.85,
          riskLevel: 'high',
          indicators: ['rapid mentions', 'emoji spam', 'urgency language'],
          timestamp: new Date().toISOString()
        }
      ],
      metrics: {
        averageScore: 125.5,
        engagementRate: 0.78,
        velocityScore: 3.2,
        hotKeywords: ['moon', 'bullish', 'HODL', 'pump', 'rocket'],
        suspiciousPatterns: 12
      },
      topPosts: [
        {
          id: 'post_1',
          title: 'Bitcoin to 100k EOY!!!',
          score: 450,
          sentiment: 0.9,
          url: 'https://reddit.com/r/CryptoCurrency/...'
        }
      ]
    }

    it('should scan default subreddit with default parameters', async () => {
      mockRedditScanner.scanSubreddit.mockResolvedValueOnce(mockAnalysis)

      const request = new NextRequest('http://localhost:3000/api/sentiment/reddit')
      const response = await GET(request)
      const data = await response.json()

      expect(mockRedditScanner.connectPublic).toHaveBeenCalled()
      expect(mockRedditScanner.scanSubreddit).toHaveBeenCalledWith(
        'CryptoCurrency',
        'day',
        50,
        false
      )
      expect(data).toEqual({
        success: true,
        data: mockAnalysis
      })
      expect(response.status).toBe(200)
    })

    it('should scan specified subreddit', async () => {
      mockRedditScanner.scanSubreddit.mockResolvedValueOnce({
        ...mockAnalysis,
        subreddit: 'Bitcoin'
      })

      const request = new NextRequest('http://localhost:3000/api/sentiment/reddit?subreddit=Bitcoin')
      const response = await GET(request)
      const data = await response.json()

      expect(mockRedditScanner.scanSubreddit).toHaveBeenCalledWith(
        'Bitcoin',
        'day',
        50,
        false
      )
      expect(data.data.subreddit).toBe('Bitcoin')
    })

    it('should handle different timeframes', async () => {
      mockRedditScanner.scanSubreddit.mockResolvedValueOnce({
        ...mockAnalysis,
        timeframe: 'week'
      })

      const request = new NextRequest('http://localhost:3000/api/sentiment/reddit?timeframe=week')
      const response = await GET(request)
      const data = await response.json()

      expect(mockRedditScanner.scanSubreddit).toHaveBeenCalledWith(
        'CryptoCurrency',
        'week',
        50,
        false
      )
      expect(data.data.timeframe).toBe('week')
    })

    it('should respect limit parameter', async () => {
      mockRedditScanner.scanSubreddit.mockResolvedValueOnce(mockAnalysis)

      const request = new NextRequest('http://localhost:3000/api/sentiment/reddit?limit=100')
      const response = await GET(request)

      expect(mockRedditScanner.scanSubreddit).toHaveBeenCalledWith(
        'CryptoCurrency',
        'day',
        100,
        false
      )
    })

    it('should include comments when requested', async () => {
      mockRedditScanner.scanSubreddit.mockResolvedValueOnce({
        ...mockAnalysis,
        totalComments: 250,
        analyzedComments: 200
      })

      const request = new NextRequest('http://localhost:3000/api/sentiment/reddit?includeComments=true')
      const response = await GET(request)

      expect(mockRedditScanner.scanSubreddit).toHaveBeenCalledWith(
        'CryptoCurrency',
        'day',
        50,
        true
      )
    })

    it('should handle scanner connection errors', async () => {
      mockRedditScanner.connectPublic.mockRejectedValueOnce(new Error('Failed to connect to Reddit'))

      const request = new NextRequest('http://localhost:3000/api/sentiment/reddit')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual({
        success: false,
        error: 'Failed to analyze Reddit sentiment',
        details: 'Failed to connect to Reddit'
      })
      expect(response.status).toBe(500)
    })

    it('should handle scanner analysis errors', async () => {
      mockRedditScanner.scanSubreddit.mockRejectedValueOnce(new Error('Rate limit exceeded'))

      const request = new NextRequest('http://localhost:3000/api/sentiment/reddit')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual({
        success: false,
        error: 'Failed to analyze Reddit sentiment',
        details: 'Rate limit exceeded'
      })
      expect(response.status).toBe(500)
    })

    it('should handle invalid timeframe gracefully', async () => {
      mockRedditScanner.scanSubreddit.mockResolvedValueOnce(mockAnalysis)

      const request = new NextRequest('http://localhost:3000/api/sentiment/reddit?timeframe=invalid')
      const response = await GET(request)

      // Should default to 'day' for invalid timeframe
      expect(mockRedditScanner.scanSubreddit).toHaveBeenCalledWith(
        'CryptoCurrency',
        'day',
        50,
        false
      )
    })
  })

  describe('POST - Scan Multiple Subreddits', () => {
    const mockAnalyses = [
      {
        subreddit: 'CryptoCurrency',
        sentimentScore: 0.68,
        pumpSignals: [
          { id: '1', symbol: 'DOGE', confidence: 0.85, riskLevel: 'high' },
          { id: '2', symbol: 'SHIB', confidence: 0.7, riskLevel: 'medium' }
        ],
        metrics: { hotKeywords: ['moon', 'bullish', 'HODL'] }
      },
      {
        subreddit: 'Bitcoin',
        sentimentScore: 0.75,
        pumpSignals: [
          { id: '3', symbol: 'BTC', confidence: 0.9, riskLevel: 'critical' }
        ],
        metrics: { hotKeywords: ['institutional', 'adoption', 'HODL'] }
      },
      {
        subreddit: 'ethereum',
        sentimentScore: 0.62,
        pumpSignals: [],
        metrics: { hotKeywords: ['DeFi', 'gas', 'merge'] }
      }
    ]

    it('should scan multiple subreddits', async () => {
      mockRedditScanner.scanMultipleSubreddits.mockResolvedValueOnce(mockAnalyses)

      const request = new NextRequest('http://localhost:3000/api/sentiment/reddit', {
        method: 'POST',
        body: JSON.stringify({
          subreddits: ['CryptoCurrency', 'Bitcoin', 'ethereum'],
          timeframe: 'day'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(mockRedditScanner.connectPublic).toHaveBeenCalled()
      expect(mockRedditScanner.scanMultipleSubreddits).toHaveBeenCalledWith(
        ['CryptoCurrency', 'Bitcoin', 'ethereum'],
        'day'
      )
      
      expect(data.success).toBe(true)
      expect(data.data.totalSubreddits).toBe(3)
      expect(data.data.overallSentiment).toBeCloseTo(0.683, 2)
      expect(data.data.totalPumpSignals).toBe(3)
      expect(data.data.highRiskSignals).toHaveLength(2)
      expect(data.data.topKeywords).toContain('HODL')
      expect(data.data.subredditAnalyses).toHaveLength(3)
    })

    it('should use default timeframe when not specified', async () => {
      mockRedditScanner.scanMultipleSubreddits.mockResolvedValueOnce(mockAnalyses)

      const request = new NextRequest('http://localhost:3000/api/sentiment/reddit', {
        method: 'POST',
        body: JSON.stringify({
          subreddits: ['CryptoCurrency']
        })
      })

      const response = await POST(request)

      expect(mockRedditScanner.scanMultipleSubreddits).toHaveBeenCalledWith(
        ['CryptoCurrency'],
        'day'
      )
      expect(response.status).toBe(200)
    })

    it('should use authenticated connection when credentials provided', async () => {
      mockRedditScanner.scanMultipleSubreddits.mockResolvedValueOnce(mockAnalyses)

      const credentials = {
        clientId: 'test_client_id',
        clientSecret: 'test_secret',
        username: 'test_user',
        password: 'test_pass'
      }

      const request = new NextRequest('http://localhost:3000/api/sentiment/reddit', {
        method: 'POST',
        body: JSON.stringify({
          subreddits: ['CryptoCurrency'],
          credentials
        })
      })

      const response = await POST(request)

      expect(mockRedditScanner.connect).toHaveBeenCalledWith(credentials)
      expect(mockRedditScanner.connectPublic).not.toHaveBeenCalled()
      expect(response.status).toBe(200)
    })

    it('should aggregate top keywords correctly', async () => {
      mockRedditScanner.scanMultipleSubreddits.mockResolvedValueOnce(mockAnalyses)

      const request = new NextRequest('http://localhost:3000/api/sentiment/reddit', {
        method: 'POST',
        body: JSON.stringify({
          subreddits: ['CryptoCurrency', 'Bitcoin', 'ethereum']
        })
      })

      const response = await POST(request)
      const data = await response.json()

      // HODL appears in 2 subreddits, should be ranked first
      expect(data.data.topKeywords[0]).toBe('HODL')
      expect(data.data.topKeywords).toContain('moon')
      expect(data.data.topKeywords).toContain('DeFi')
    })

    it('should filter high risk signals correctly', async () => {
      mockRedditScanner.scanMultipleSubreddits.mockResolvedValueOnce(mockAnalyses)

      const request = new NextRequest('http://localhost:3000/api/sentiment/reddit', {
        method: 'POST',
        body: JSON.stringify({
          subreddits: ['CryptoCurrency', 'Bitcoin', 'ethereum']
        })
      })

      const response = await POST(request)
      const data = await response.json()

      const highRiskSignals = data.data.highRiskSignals
      expect(highRiskSignals).toHaveLength(2)
      expect(highRiskSignals.every((s: any) => s.riskLevel === 'high' || s.riskLevel === 'critical')).toBe(true)
    })

    it('should handle empty subreddit list', async () => {
      mockRedditScanner.scanMultipleSubreddits.mockResolvedValueOnce([])

      const request = new NextRequest('http://localhost:3000/api/sentiment/reddit', {
        method: 'POST',
        body: JSON.stringify({
          subreddits: []
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.data.totalSubreddits).toBe(0)
      expect(data.data.overallSentiment).toBe(NaN) // Division by zero
      expect(data.data.totalPumpSignals).toBe(0)
    })

    it('should handle scanner errors', async () => {
      mockRedditScanner.scanMultipleSubreddits.mockRejectedValueOnce(
        new Error('API rate limit exceeded')
      )

      const request = new NextRequest('http://localhost:3000/api/sentiment/reddit', {
        method: 'POST',
        body: JSON.stringify({
          subreddits: ['CryptoCurrency']
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({
        success: false,
        error: 'Failed to analyze multiple subreddits',
        details: 'API rate limit exceeded'
      })
      expect(response.status).toBe(500)
    })

    it('should handle connection errors with credentials', async () => {
      mockRedditScanner.connect.mockRejectedValueOnce(
        new Error('Invalid credentials')
      )

      const request = new NextRequest('http://localhost:3000/api/sentiment/reddit', {
        method: 'POST',
        body: JSON.stringify({
          subreddits: ['CryptoCurrency'],
          credentials: { clientId: 'invalid' }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.details).toBe('Invalid credentials')
      expect(response.status).toBe(500)
    })

    it('should handle JSON parsing errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/sentiment/reddit', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to analyze multiple subreddits')
      expect(response.status).toBe(500)
    })
  })
})