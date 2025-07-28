import { SentimentAnalyzer, SentimentScore, SocialMediaPost, CryptoPumpSignal } from './SentimentAnalyzer'
import { CryptoSymbolExtractor, ExtractedSymbol } from './CryptoSymbolExtractor'
import Sentiment from 'sentiment'

// Mock dependencies
jest.mock('sentiment')
jest.mock('natural')
jest.mock('node-fetch')
jest.mock('./CryptoSymbolExtractor')

describe('SentimentAnalyzer', () => {
  let analyzer: SentimentAnalyzer
  let mockSentiment: jest.Mocked<Sentiment>
  let mockSymbolExtractor: jest.Mocked<CryptoSymbolExtractor>
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Setup mock sentiment
    mockSentiment = new Sentiment() as jest.Mocked<Sentiment>
    mockSentiment.analyze = jest.fn().mockReturnValue({
      score: 5,
      comparative: 0.5,
      calculation: [],
      tokens: ['great', 'opportunity'],
      words: ['great'],
      positive: ['great'],
      negative: []
    })
    
    // Setup mock symbol extractor
    mockSymbolExtractor = new CryptoSymbolExtractor() as jest.Mocked<CryptoSymbolExtractor>
    mockSymbolExtractor.extract = jest.fn().mockReturnValue([
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        confidence: 0.9,
        context: 'price',
        position: 10
      }
    ] as ExtractedSymbol[])
    
    analyzer = new SentimentAnalyzer()
    ;(analyzer as any).sentiment = mockSentiment
    ;(analyzer as any).symbolExtractor = mockSymbolExtractor
  })
  
  describe('analyzeSentiment', () => {
    it('should analyze positive sentiment correctly', async () => {
      const text = 'Bitcoin is showing great momentum! Buy now!'
      const result = await analyzer.analyzeSentiment(text)
      
      expect(result.score).toBeGreaterThan(0)
      expect(result.classification).toBe('positive')
      expect(result.symbols).toBeDefined()
      expect(result.symbols?.[0].symbol).toBe('BTC')
      expect(mockSentiment.analyze).toHaveBeenCalledWith(text)
    })
    
    it('should analyze negative sentiment correctly', async () => {
      mockSentiment.analyze.mockReturnValue({
        score: -8,
        comparative: -0.8,
        calculation: [],
        tokens: ['crash', 'terrible', 'loss'],
        words: ['crash', 'terrible', 'loss'],
        positive: [],
        negative: ['crash', 'terrible', 'loss']
      })
      
      const text = 'Bitcoin crash is terrible, massive loss incoming'
      const result = await analyzer.analyzeSentiment(text)
      
      expect(result.score).toBeLessThan(0)
      expect(result.classification).toBe('very_negative')
      expect(result.confidence).toBeGreaterThan(0.5)
    })
    
    it('should analyze neutral sentiment correctly', async () => {
      mockSentiment.analyze.mockReturnValue({
        score: 0,
        comparative: 0,
        calculation: [],
        tokens: ['bitcoin', 'trading', 'sideways'],
        words: [],
        positive: [],
        negative: []
      })
      
      const text = 'Bitcoin trading sideways today'
      const result = await analyzer.analyzeSentiment(text)
      
      expect(result.score).toBe(0)
      expect(result.classification).toBe('neutral')
      expect(result.magnitude).toBeLessThan(0.5)
    })
    
    it('should extract keywords from text', async () => {
      const text = 'Bitcoin moon rocket bullish breakout'
      const result = await analyzer.analyzeSentiment(text)
      
      expect(result.keywords).toBeDefined()
      expect(result.keywords.length).toBeGreaterThan(0)
    })
    
    it('should handle empty text', async () => {
      const result = await analyzer.analyzeSentiment('')
      
      expect(result.score).toBe(0)
      expect(result.classification).toBe('neutral')
      expect(result.confidence).toBe(0)
    })
    
    it('should handle very long text', async () => {
      const longText = 'Bitcoin is great! '.repeat(100)
      const result = await analyzer.analyzeSentiment(longText)
      
      expect(result).toBeDefined()
      expect(result.score).toBeGreaterThan(0)
    })
  })
  
  describe('analyzeSocialMediaPost', () => {
    const mockPost: SocialMediaPost = {
      id: 'post123',
      text: 'Bitcoin to the moon! 🚀 Buy now!',
      author: 'cryptotrader',
      timestamp: Date.now(),
      platform: 'twitter',
      engagement: {
        likes: 100,
        retweets: 50,
        comments: 20
      }
    }
    
    it('should analyze social media post with engagement weighting', async () => {
      const result = await analyzer.analyzeSocialMediaPost(mockPost)
      
      expect(result).toBeDefined()
      expect(result.score).toBeGreaterThan(0)
      expect(result.symbols).toBeDefined()
      expect(mockSentiment.analyze).toHaveBeenCalledWith(mockPost.text)
    })
    
    it('should boost score for high engagement posts', async () => {
      const highEngagementPost = {
        ...mockPost,
        engagement: {
          likes: 10000,
          retweets: 5000,
          comments: 2000
        }
      }
      
      const normalResult = await analyzer.analyzeSocialMediaPost(mockPost)
      const highEngagementResult = await analyzer.analyzeSocialMediaPost(highEngagementPost)
      
      expect(highEngagementResult.magnitude).toBeGreaterThan(normalResult.magnitude)
    })
    
    it('should handle posts without engagement data', async () => {
      const noEngagementPost = {
        ...mockPost,
        engagement: {}
      }
      
      const result = await analyzer.analyzeSocialMediaPost(noEngagementPost)
      
      expect(result).toBeDefined()
      expect(result.score).toBeDefined()
    })
    
    it('should handle different platforms appropriately', async () => {
      const redditPost: SocialMediaPost = {
        ...mockPost,
        platform: 'reddit',
        engagement: {
          upvotes: 500,
          comments: 100
        }
      }
      
      const result = await analyzer.analyzeSocialMediaPost(redditPost)
      
      expect(result).toBeDefined()
      expect(result.score).toBeDefined()
    })
  })
  
  describe('detectPumpSignals', () => {
    const mockPosts: SocialMediaPost[] = [
      {
        id: '1',
        text: 'BTC MOON NOW!!! 🚀🚀🚀 BUY BUY BUY!!!',
        author: 'pumper1',
        timestamp: Date.now(),
        platform: 'twitter',
        engagement: { likes: 50, retweets: 100 }
      },
      {
        id: '2',
        text: 'Bitcoin breaking out! Get in before too late! 🔥',
        author: 'pumper2',
        timestamp: Date.now() - 60000,
        platform: 'twitter',
        engagement: { likes: 75, retweets: 150 }
      },
      {
        id: '3',
        text: 'BTC TO 100K!!! This is not a drill!!!',
        author: 'pumper3',
        timestamp: Date.now() - 120000,
        platform: 'twitter',
        engagement: { likes: 100, retweets: 200 }
      }
    ]
    
    it('should detect pump signals from coordinated posts', async () => {
      const signals = await analyzer.detectPumpSignals(mockPosts)
      
      expect(signals).toBeDefined()
      expect(signals.length).toBeGreaterThan(0)
      expect(signals[0].symbol).toBe('BTC')
      expect(signals[0].indicators.socialMediaBuzz).toBe(true)
    })
    
    it('should calculate risk level based on indicators', async () => {
      const signals = await analyzer.detectPumpSignals(mockPosts)
      
      expect(signals[0].riskLevel).toBeDefined()
      expect(['low', 'medium', 'high', 'critical']).toContain(signals[0].riskLevel)
    })
    
    it('should detect coordinated activity', async () => {
      const coordinatedPosts = mockPosts.map((post, index) => ({
        ...post,
        timestamp: Date.now() - index * 5000, // Posts within 15 seconds
        text: 'BUY BTC NOW!!! MOON IMMINENT!!!' // Same message
      }))
      
      const signals = await analyzer.detectPumpSignals(coordinatedPosts)
      
      expect(signals[0].indicators.coordinated).toBe(true)
      expect(signals[0].riskLevel).toBe('critical')
    })
    
    it('should aggregate social metrics', async () => {
      const signals = await analyzer.detectPumpSignals(mockPosts)
      
      expect(signals[0].socialMetrics).toBeDefined()
      expect(signals[0].socialMetrics.mentionCount).toBe(3)
      expect(signals[0].socialMetrics.engagementRate).toBeGreaterThan(0)
    })
    
    it('should handle empty post array', async () => {
      const signals = await analyzer.detectPumpSignals([])
      
      expect(signals).toEqual([])
    })
    
    it('should filter out low confidence signals', async () => {
      const normalPosts: SocialMediaPost[] = [
        {
          id: '1',
          text: 'Just bought some Bitcoin for long term hold',
          author: 'investor1',
          timestamp: Date.now(),
          platform: 'twitter',
          engagement: { likes: 5, retweets: 1 }
        }
      ]
      
      const signals = await analyzer.detectPumpSignals(normalPosts)
      
      expect(signals.length).toBe(0)
    })
  })
  
  describe('getKeyPhrases', () => {
    it('should extract key phrases from text', () => {
      const text = 'Bitcoin bull run starting! Ethereum following closely. Altcoin season incoming!'
      const phrases = analyzer.getKeyPhrases(text)
      
      expect(phrases).toBeDefined()
      expect(phrases.length).toBeGreaterThan(0)
      expect(phrases).toContain('bitcoin')
    })
    
    it('should filter out stop words', () => {
      const text = 'The Bitcoin is a great investment for the future'
      const phrases = analyzer.getKeyPhrases(text)
      
      expect(phrases).not.toContain('the')
      expect(phrases).not.toContain('is')
      expect(phrases).not.toContain('a')
      expect(phrases).not.toContain('for')
    })
    
    it('should handle empty text', () => {
      const phrases = analyzer.getKeyPhrases('')
      
      expect(phrases).toEqual([])
    })
  })
  
  describe('calculateConfidence', () => {
    it('should calculate high confidence for strong signals', () => {
      const score: SentimentScore = {
        score: 0.9,
        magnitude: 0.8,
        classification: 'very_positive',
        confidence: 0,
        keywords: ['moon', 'bullish', 'breakout']
      }
      
      const confidence = analyzer.calculateConfidence(score)
      
      expect(confidence).toBeGreaterThan(0.7)
    })
    
    it('should calculate low confidence for weak signals', () => {
      const score: SentimentScore = {
        score: 0.1,
        magnitude: 0.2,
        classification: 'neutral',
        confidence: 0,
        keywords: ['maybe', 'perhaps']
      }
      
      const confidence = analyzer.calculateConfidence(score)
      
      expect(confidence).toBeLessThan(0.5)
    })
  })
  
  describe('error handling', () => {
    it('should handle sentiment analysis errors gracefully', async () => {
      mockSentiment.analyze.mockImplementation(() => {
        throw new Error('Analysis failed')
      })
      
      const result = await analyzer.analyzeSentiment('Some text')
      
      expect(result.score).toBe(0)
      expect(result.classification).toBe('neutral')
      expect(result.confidence).toBe(0)
    })
    
    it('should handle symbol extraction errors gracefully', async () => {
      mockSymbolExtractor.extract.mockImplementation(() => {
        throw new Error('Extraction failed')
      })
      
      const result = await analyzer.analyzeSentiment('Bitcoin is great')
      
      expect(result).toBeDefined()
      expect(result.symbols).toBeUndefined()
    })
  })
})