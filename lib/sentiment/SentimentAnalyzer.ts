import { Sentiment } from 'sentiment'
import { WordTokenizer, SentimentAnalyzer as NaturalSentiment, PorterStemmer } from 'natural'
import fetch from 'node-fetch'
import { CryptoSymbolExtractor, ExtractedSymbol } from './CryptoSymbolExtractor'

export interface SentimentScore {
  score: number // -1 to 1 (negative to positive)
  magnitude: number // 0 to 1 (neutral to strong)
  classification: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive'
  confidence: number // 0 to 1
  keywords: string[]
  symbols?: ExtractedSymbol[] // Extracted cryptocurrency symbols
}

export interface SocialMediaPost {
  id: string
  text: string
  author: string
  timestamp: number
  platform: 'twitter' | 'reddit' | 'telegram' | 'discord'
  engagement: {
    likes?: number
    retweets?: number
    comments?: number
    upvotes?: number
  }
  metadata?: any
}

export interface CryptoPumpSignal {
  symbol: string
  confidence: number // 0 to 1
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  indicators: {
    sentimentSpike: boolean
    volumeAnomaly: boolean
    priceAnomaly: boolean
    socialMediaBuzz: boolean
    influencerActivity: boolean
    coordinated: boolean
  }
  socialMetrics: {
    mentionCount: number
    sentimentScore: number
    engagementRate: number
    accountQuality: number
  }
  relatedSymbols?: string[] // Other symbols mentioned alongside
  timestamp: number
}

export class SentimentAnalyzer {
  private sentiment: Sentiment
  private naturalSentiment: NaturalSentiment
  private tokenizer: WordTokenizer
  private cryptoKeywords: Set<string>
  private pumpDumpKeywords: Set<string>
  private positiveModifiers: Set<string>
  private negativeModifiers: Set<string>

  constructor() {
    this.sentiment = new Sentiment()
    this.naturalSentiment = new NaturalSentiment('English', PorterStemmer.tokenizeAndStem, ['buy', 'pump', 'moon'])
    this.tokenizer = new WordTokenizer()
    
    // Initialize keyword sets
    this.initializeKeywords()
  }

  private initializeKeywords(): void {
    this.cryptoKeywords = new Set([
      'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency',
      'blockchain', 'defi', 'nft', 'altcoin', 'hodl', 'lambo',
      'satoshi', 'wei', 'gwei', 'dapp', 'smart contract', 'yield farming'
    ])

    this.pumpDumpKeywords = new Set([
      'pump', 'dump', 'moon', 'rocket', 'lambo', 'diamond hands',
      'paper hands', 'ape in', 'fomo', 'buy the dip', 'to the moon',
      'hold the line', 'diamond💎', '🚀', '🌙', 'buy now', 'all in',
      'easy money', 'quick profit', 'guaranteed', 'sure thing',
      'insider', 'whale alert', 'massive pump', 'next gem'
    ])

    this.positiveModifiers = new Set([
      'bullish', 'moon', 'pump', 'surge', 'rally', 'breakout',
      'explosive', 'massive', 'huge', 'incredible', 'amazing'
    ])

    this.negativeModifiers = new Set([
      'bearish', 'dump', 'crash', 'collapse', 'plummet', 'tank',
      'disaster', 'scam', 'rug pull', 'dead', 'worthless'
    ])
  }

  analyzeSentiment(text: string, symbol?: string): SentimentScore {
    // Clean and preprocess text
    const cleanText = this.preprocessText(text)
    
    // Get base sentiment using sentiment library
    const baseSentiment = this.sentiment.analyze(cleanText)
    
    // Enhance with crypto-specific analysis
    const cryptoScore = this.analyzeCryptoSentiment(cleanText, symbol)
    
    // Combine scores
    const combinedScore = this.combineSentimentScores(baseSentiment, cryptoScore)
    
    // Extract keywords
    const keywords = this.extractKeywords(cleanText, symbol)
    
    // Extract cryptocurrency symbols
    const symbols = CryptoSymbolExtractor.extractSymbols(text)
    
    // Calculate final metrics
    const normalizedScore = Math.max(-1, Math.min(1, combinedScore.score / 10))
    const magnitude = Math.abs(normalizedScore)
    const confidence = this.calculateConfidence(baseSentiment, cryptoScore, cleanText.length)
    
    return {
      score: normalizedScore,
      magnitude,
      classification: this.classifySentiment(normalizedScore),
      confidence,
      keywords,
      symbols
    }
  }

  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s#@$]/g, ' ') // Keep # @ $ symbols
      .replace(/\s+/g, ' ')
      .trim()
  }

  private analyzeCryptoSentiment(text: string, symbol?: string): any {
    let score = 0
    let tokens = this.tokenizer.tokenize(text) || []
    
    // Symbol-specific analysis
    if (symbol) {
      const symbolRegex = new RegExp(`\\b${symbol.toLowerCase()}\\b`, 'g')
      const symbolMentions = (text.match(symbolRegex) || []).length
      score += symbolMentions * 2 // Boost for direct symbol mentions
    }

    // Pump/dump keyword analysis
    for (const token of tokens) {
      if (this.pumpDumpKeywords.has(token)) {
        if (this.positiveModifiers.has(token)) {
          score += 3
        } else if (this.negativeModifiers.has(token)) {
          score -= 3
        } else {
          score += 1 // Neutral pump/dump keywords get slight positive
        }
      }
    }

    // Emoji analysis
    const rocketEmojis = (text.match(/🚀/g) || []).length
    const moonEmojis = (text.match(/🌙|🌝/g) || []).length
    const diamondEmojis = (text.match(/💎/g) || []).length
    const fireEmojis = (text.match(/🔥/g) || []).length
    
    score += (rocketEmojis * 2) + (moonEmojis * 2) + (diamondEmojis * 1.5) + (fireEmojis * 1.5)

    // Urgency indicators
    const urgencyWords = ['now', 'quick', 'fast', 'urgent', 'before', 'limited time']
    for (const word of urgencyWords) {
      if (text.includes(word)) score += 1
    }

    return { score, tokens }
  }

  private combineSentimentScores(baseSentiment: any, cryptoScore: any): any {
    return {
      score: baseSentiment.score + cryptoScore.score,
      comparative: baseSentiment.comparative,
      tokens: cryptoScore.tokens
    }
  }

  private extractKeywords(text: string, symbol?: string): string[] {
    const tokens = this.tokenizer.tokenize(text) || []
    const keywords: string[] = []

    // Add symbol if mentioned
    if (symbol && text.toLowerCase().includes(symbol.toLowerCase())) {
      keywords.push(symbol.toUpperCase())
    }

    // Add crypto keywords
    for (const token of tokens) {
      if (this.cryptoKeywords.has(token) || this.pumpDumpKeywords.has(token)) {
        keywords.push(token)
      }
    }

    // Add hashtags and cashtags
    const hashtags = text.match(/#\w+/g) || []
    const cashtags = text.match(/\$\w+/g) || []
    
    keywords.push(...hashtags, ...cashtags)

    return [...new Set(keywords)] // Remove duplicates
  }

  private calculateConfidence(baseSentiment: any, cryptoScore: any, textLength: number): number {
    let confidence = 0.5 // Base confidence

    // Length factor (longer text = higher confidence)
    confidence += Math.min(0.3, textLength / 1000)

    // Token count factor
    if (baseSentiment.tokens && baseSentiment.tokens.length > 0) {
      confidence += Math.min(0.2, baseSentiment.tokens.length / 50)
    }

    // Crypto-specific keywords boost confidence
    if (cryptoScore.score !== 0) {
      confidence += 0.2
    }

    return Math.min(1, confidence)
  }

  private classifySentiment(score: number): 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive' {
    if (score <= -0.6) return 'very_negative'
    if (score <= -0.2) return 'negative'
    if (score >= 0.6) return 'very_positive'
    if (score >= 0.2) return 'positive'
    return 'neutral'
  }

  // Analyze multiple posts for aggregate sentiment
  analyzePostsBatch(posts: SocialMediaPost[], symbol?: string): {
    overallSentiment: SentimentScore
    postSentiments: (SentimentScore & { postId: string })[]
    metrics: {
      totalPosts: number
      positiveRatio: number
      engagementWeightedSentiment: number
      timeDecayedSentiment: number
    }
  } {
    const postSentiments = posts.map(post => ({
      ...this.analyzeSentiment(post.text, symbol),
      postId: post.id
    }))

    // Calculate overall sentiment
    const overallScore = postSentiments.reduce((sum, s) => sum + s.score, 0) / postSentiments.length
    const overallMagnitude = postSentiments.reduce((sum, s) => sum + s.magnitude, 0) / postSentiments.length
    const avgConfidence = postSentiments.reduce((sum, s) => sum + s.confidence, 0) / postSentiments.length

    // Aggregate symbols from all posts
    const allSymbols = postSentiments.flatMap(s => s.symbols || [])
    const symbolFrequency = new Map<string, ExtractedSymbol>()
    
    for (const symbol of allSymbols) {
      if (symbolFrequency.has(symbol.symbol)) {
        const existing = symbolFrequency.get(symbol.symbol)!
        existing.mentions += symbol.mentions
        existing.contexts = [...new Set([...existing.contexts, ...symbol.contexts])]
      } else {
        symbolFrequency.set(symbol.symbol, { ...symbol })
      }
    }
    
    const overallSentiment: SentimentScore = {
      score: overallScore,
      magnitude: overallMagnitude,
      classification: this.classifySentiment(overallScore),
      confidence: avgConfidence,
      keywords: [...new Set(postSentiments.flatMap(s => s.keywords))],
      symbols: Array.from(symbolFrequency.values()).sort((a, b) => b.mentions - a.mentions)
    }

    // Calculate metrics
    const positiveCount = postSentiments.filter(s => s.score > 0).length
    const positiveRatio = positiveCount / postSentiments.length

    // Engagement-weighted sentiment
    const engagementWeightedSentiment = posts.reduce((sum, post, i) => {
      const engagement = (post.engagement.likes || 0) + (post.engagement.retweets || 0) + 
                        (post.engagement.comments || 0) + (post.engagement.upvotes || 0)
      return sum + (postSentiments[i].score * Math.log(engagement + 1))
    }, 0) / posts.length

    // Time-decayed sentiment (recent posts weighted more)
    const now = Date.now()
    const timeDecayedSentiment = posts.reduce((sum, post, i) => {
      const ageHours = (now - post.timestamp) / (1000 * 60 * 60)
      const decayFactor = Math.exp(-ageHours / 24) // Decay over 24 hours
      return sum + (postSentiments[i].score * decayFactor)
    }, 0) / posts.length

    return {
      overallSentiment,
      postSentiments,
      metrics: {
        totalPosts: posts.length,
        positiveRatio,
        engagementWeightedSentiment,
        timeDecayedSentiment
      }
    }
  }

  // Detect potential pump and dump signals
  detectPumpSignal(
    posts: SocialMediaPost[], 
    symbol: string,
    volumeSpike?: number,
    priceChange?: number
  ): CryptoPumpSignal {
    const sentimentAnalysis = this.analyzePostsBatch(posts, symbol)
    
    // Calculate social media buzz metrics
    const symbolMentions = posts.filter(post => 
      post.text.toLowerCase().includes(symbol.toLowerCase())
    ).length

    const totalEngagement = posts.reduce((sum, post) => {
      return sum + (post.engagement.likes || 0) + (post.engagement.retweets || 0) + 
             (post.engagement.comments || 0) + (post.engagement.upvotes || 0)
    }, 0)

    const avgEngagement = totalEngagement / posts.length
    const engagementRate = avgEngagement / Math.max(posts.length, 1)

    // Account quality assessment (simplified)
    const accountQuality = this.assessAccountQuality(posts)

    // Pump indicators
    const indicators = {
      sentimentSpike: sentimentAnalysis.overallSentiment.score > 0.5 && 
                     sentimentAnalysis.overallSentiment.confidence > 0.7,
      volumeAnomaly: volumeSpike ? volumeSpike > 3.0 : false,
      priceAnomaly: priceChange ? Math.abs(priceChange) > 10 : false,
      socialMediaBuzz: symbolMentions > 10 && sentimentAnalysis.metrics.positiveRatio > 0.7,
      influencerActivity: this.detectInfluencerActivity(posts),
      coordinated: this.detectCoordinatedActivity(posts)
    }

    // Calculate overall confidence
    const indicatorCount = Object.values(indicators).filter(Boolean).length
    const confidence = Math.min(1, indicatorCount / 6)

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (confidence > 0.8 && indicators.coordinated) riskLevel = 'critical'
    else if (confidence > 0.6) riskLevel = 'high'
    else if (confidence > 0.4) riskLevel = 'medium'

    // Extract related symbols from sentiment analysis
    const relatedSymbols = sentimentAnalysis.overallSentiment.symbols
      ?.filter(s => s.symbol !== symbol.toUpperCase())
      .map(s => s.symbol)
      .slice(0, 10) || []

    return {
      symbol,
      confidence,
      riskLevel,
      indicators,
      socialMetrics: {
        mentionCount: symbolMentions,
        sentimentScore: sentimentAnalysis.overallSentiment.score,
        engagementRate,
        accountQuality
      },
      relatedSymbols,
      timestamp: Date.now()
    }
  }

  private assessAccountQuality(posts: SocialMediaPost[]): number {
    // Simplified account quality scoring
    const uniqueAuthors = new Set(posts.map(p => p.author)).size
    const avgPostsPerAuthor = posts.length / uniqueAuthors
    
    // Suspicious if few accounts posting a lot
    if (avgPostsPerAuthor > 5 && uniqueAuthors < 5) return 0.2
    if (avgPostsPerAuthor > 3 && uniqueAuthors < 10) return 0.4
    
    return Math.min(1, uniqueAuthors / 20) // Higher score for more diverse authors
  }

  private detectInfluencerActivity(posts: SocialMediaPost[]): boolean {
    // Look for high-engagement posts (potential influencers)
    return posts.some(post => {
      const engagement = (post.engagement.likes || 0) + (post.engagement.retweets || 0)
      return engagement > 1000 // Simplified threshold
    })
  }

  private detectCoordinatedActivity(posts: SocialMediaPost[]): boolean {
    // Check for suspiciously similar timing or content
    const timestamps = posts.map(p => p.timestamp).sort()
    const timeClusters = []
    
    for (let i = 0; i < timestamps.length - 1; i++) {
      const timeDiff = timestamps[i + 1] - timestamps[i]
      if (timeDiff < 60000) { // Posts within 1 minute
        timeClusters.push(timeDiff)
      }
    }
    
    // Suspicious if many posts in short time periods
    return timeClusters.length > posts.length * 0.3
  }
}