import { POST, GET } from './route'
import { NextRequest } from 'next/server'
import { SentimentAnalyzer } from '@/lib/sentiment/SentimentAnalyzer'

// Mock the SentimentAnalyzer
jest.mock('@/lib/sentiment/SentimentAnalyzer')

describe('/api/sentiment/analyze', () => {
  let mockSentimentAnalyzer: jest.Mocked<SentimentAnalyzer>

  beforeEach(() => {
    jest.clearAllMocks()
    mockSentimentAnalyzer = {
      analyzeSentiment: jest.fn(),
      analyzePostsBatch: jest.fn()
    } as any
    ;(SentimentAnalyzer as jest.MockedClass<typeof SentimentAnalyzer>).mockImplementation(() => mockSentimentAnalyzer)
  })

  describe('POST - Analyze Sentiment', () => {
    it('should analyze single text sentiment', async () => {
      const mockSentiment = {
        score: 0.8,
        comparative: 0.16,
        sentiment: 'positive',
        confidence: 0.9,
        tokens: ['bitcoin', 'bullish', 'moon'],
        positive: ['bullish', 'moon'],
        negative: []
      }
      mockSentimentAnalyzer.analyzeSentiment.mockReturnValueOnce(mockSentiment)

      const request = new NextRequest('http://localhost:3000/api/sentiment/analyze', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Bitcoin is looking bullish, to the moon!',
          symbol: 'BTC'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(mockSentimentAnalyzer.analyzeSentiment).toHaveBeenCalledWith(
        'Bitcoin is looking bullish, to the moon!',
        'BTC'
      )
      expect(data).toEqual({
        success: true,
        data: mockSentiment
      })
      expect(response.status).toBe(200)
    })

    it('should analyze batch of posts', async () => {
      const mockBatchAnalysis = {
        aggregateSentiment: {
          score: 0.5,
          comparative: 0.1,
          sentiment: 'positive',
          confidence: 0.75
        },
        posts: [
          {
            id: '1',
            sentiment: { score: 0.8, sentiment: 'positive' },
            timestamp: '2024-01-01T00:00:00Z'
          },
          {
            id: '2',
            sentiment: { score: 0.2, sentiment: 'neutral' },
            timestamp: '2024-01-01T01:00:00Z'
          }
        ],
        summary: {
          totalPosts: 2,
          positivePosts: 1,
          negativePosts: 0,
          neutralPosts: 1
        }
      }
      mockSentimentAnalyzer.analyzePostsBatch.mockReturnValueOnce(mockBatchAnalysis)

      const posts = [
        { id: '1', text: 'BTC to the moon!', timestamp: '2024-01-01T00:00:00Z' },
        { id: '2', text: 'Bitcoin is stable', timestamp: '2024-01-01T01:00:00Z' }
      ]

      const request = new NextRequest('http://localhost:3000/api/sentiment/analyze', {
        method: 'POST',
        body: JSON.stringify({
          posts,
          symbol: 'BTC'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(mockSentimentAnalyzer.analyzePostsBatch).toHaveBeenCalledWith(posts, 'BTC')
      expect(data).toEqual({
        success: true,
        data: mockBatchAnalysis
      })
      expect(response.status).toBe(200)
    })

    it('should analyze text without symbol', async () => {
      const mockSentiment = {
        score: -0.5,
        comparative: -0.125,
        sentiment: 'negative',
        confidence: 0.7,
        tokens: ['crypto', 'crash', 'bearish'],
        positive: [],
        negative: ['crash', 'bearish']
      }
      mockSentimentAnalyzer.analyzeSentiment.mockReturnValueOnce(mockSentiment)

      const request = new NextRequest('http://localhost:3000/api/sentiment/analyze', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Crypto market crash looks bearish'
          // No symbol provided
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(mockSentimentAnalyzer.analyzeSentiment).toHaveBeenCalledWith(
        'Crypto market crash looks bearish',
        undefined
      )
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockSentiment)
    })

    it('should handle missing text and posts', async () => {
      const request = new NextRequest('http://localhost:3000/api/sentiment/analyze', {
        method: 'POST',
        body: JSON.stringify({
          symbol: 'BTC'
          // No text or posts
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({
        success: false,
        error: 'Either text or posts array is required'
      })
      expect(response.status).toBe(400)
      expect(mockSentimentAnalyzer.analyzeSentiment).not.toHaveBeenCalled()
      expect(mockSentimentAnalyzer.analyzePostsBatch).not.toHaveBeenCalled()
    })

    it('should handle empty posts array', async () => {
      const request = new NextRequest('http://localhost:3000/api/sentiment/analyze', {
        method: 'POST',
        body: JSON.stringify({
          posts: [],
          symbol: 'BTC'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      // Should still call analyzePostsBatch with empty array
      expect(mockSentimentAnalyzer.analyzePostsBatch).toHaveBeenCalledWith([], 'BTC')
    })

    it('should handle analyzer errors', async () => {
      mockSentimentAnalyzer.analyzeSentiment.mockImplementationOnce(() => {
        throw new Error('Analyzer failed')
      })

      const request = new NextRequest('http://localhost:3000/api/sentiment/analyze', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Test text',
          symbol: 'BTC'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({
        success: false,
        error: 'Failed to analyze sentiment',
        details: 'Analyzer failed'
      })
      expect(response.status).toBe(500)
    })

    it('should handle JSON parsing errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/sentiment/analyze', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'content-type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to analyze sentiment')
      expect(response.status).toBe(500)
    })

    it('should handle posts with various formats', async () => {
      const mockBatchAnalysis = {
        aggregateSentiment: { score: 0.6, sentiment: 'positive' },
        posts: [],
        summary: { totalPosts: 3 }
      }
      mockSentimentAnalyzer.analyzePostsBatch.mockReturnValueOnce(mockBatchAnalysis)

      const posts = [
        { id: '1', text: 'BTC bullish', timestamp: new Date().toISOString() },
        { id: '2', content: 'ETH bearish', created_at: Date.now() }, // Different field names
        { text: 'Crypto moon' } // Missing id
      ]

      const request = new NextRequest('http://localhost:3000/api/sentiment/analyze', {
        method: 'POST',
        body: JSON.stringify({
          posts,
          symbol: 'CRYPTO'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(mockSentimentAnalyzer.analyzePostsBatch).toHaveBeenCalledWith(posts, 'CRYPTO')
      expect(data.success).toBe(true)
    })
  })

  describe('GET - Health Check', () => {
    it('should return API health status and endpoints', async () => {
      const request = new NextRequest('http://localhost:3000/api/sentiment/analyze')

      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual({
        success: true,
        message: 'Sentiment analysis API is running',
        endpoints: {
          'POST /api/sentiment/analyze': 'Analyze text or posts sentiment',
          'GET /api/sentiment/reddit': 'Scan Reddit subreddit',
          'POST /api/sentiment/reddit': 'Bulk scan multiple subreddits',
          'GET /api/sentiment/pump-detector': 'Detect pump and dump signals'
        }
      })
      expect(response.status).toBe(200)
    })
  })
})