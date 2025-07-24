import { CryptoSymbolExtractor, ExtractedSymbol } from './CryptoSymbolExtractor'
import { RedditScanner } from './RedditScanner'
import { TwitterScanner } from './TwitterScanner'

export interface SymbolHistoryRecord {
  symbol: string
  firstMention: number // timestamp
  platform: 'twitter' | 'reddit' | 'market_data'
  mentions: Array<{
    timestamp: number
    platform: 'twitter' | 'reddit' | 'market_data'
    source: string // subreddit, username, or exchange
    context: string
    confidence: number
  }>
  marketData?: {
    firstTraded?: number
    exchanges: string[]
    initialPrice?: number
    volume24h?: number
  }
  verified: boolean
  riskFlags: string[]
}

export interface NewSymbolAlert {
  symbol: string
  confidence: number // 0-1 how confident we are it's genuinely new
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  firstDetected: number
  platforms: string[]
  mentions: number
  historicalContext: {
    hasHistory: boolean
    firstHistoricalMention?: number
    daysSinceFirstMention?: number
    previousMentionCount: number
  }
  pumpIndicators: {
    suddenSpike: boolean
    coordinatedMentions: boolean
    suspiciousAccounts: boolean
    missingMarketData: boolean
  }
  recommendation: 'investigate' | 'monitor' | 'high_risk' | 'likely_pump'
}

export class HistoricalVerifier {
  private symbolHistory: Map<string, SymbolHistoryRecord> = new Map()
  private redditScanner: RedditScanner
  private twitterScanner: TwitterScanner
  private historicalLookbackDays: number = 30
  private newSymbolThresholdDays: number = 7

  constructor() {
    this.redditScanner = new RedditScanner()
    this.twitterScanner = new TwitterScanner()
  }

  async initialize(): Promise<void> {
    // Load existing historical data from storage/cache
    await this.loadHistoricalData()
    
    // Initialize social media scanners for public access
    await this.redditScanner.connectPublic()
    await this.twitterScanner.connectPublic()
  }

  async verifyNewSymbol(symbol: string): Promise<NewSymbolAlert> {
    const upperSymbol = symbol.toUpperCase()
    
    // Check if we have existing history for this symbol
    const existingHistory = this.symbolHistory.get(upperSymbol)
    
    // Perform historical lookup across platforms
    const historicalData = await this.performHistoricalLookup(upperSymbol)
    
    // Analyze current mentions vs historical patterns
    const currentMentions = await this.getCurrentMentions(upperSymbol)
    
    // Calculate newness confidence
    const confidence = this.calculateNewnessConfidence(
      upperSymbol,
      existingHistory,
      historicalData,
      currentMentions
    )
    
    // Detect pump indicators
    const pumpIndicators = await this.detectPumpIndicators(upperSymbol, currentMentions)
    
    // Determine risk level and recommendation
    const { riskLevel, recommendation } = this.assessRisk(confidence, pumpIndicators, historicalData)
    
    const alert: NewSymbolAlert = {
      symbol: upperSymbol,
      confidence,
      riskLevel,
      firstDetected: Date.now(),
      platforms: [...new Set(currentMentions.map(m => m.platform))],
      mentions: currentMentions.length,
      historicalContext: {
        hasHistory: !!existingHistory || historicalData.totalMentions > 0,
        firstHistoricalMention: existingHistory?.firstMention || historicalData.firstMention,
        daysSinceFirstMention: existingHistory ? 
          Math.floor((Date.now() - existingHistory.firstMention) / (1000 * 60 * 60 * 24)) : 
          undefined,
        previousMentionCount: historicalData.totalMentions
      },
      pumpIndicators,
      recommendation
    }
    
    // Update our historical records
    await this.updateSymbolHistory(upperSymbol, currentMentions)
    
    return alert
  }

  private async performHistoricalLookup(symbol: string): Promise<{
    totalMentions: number
    firstMention?: number
    platformBreakdown: Record<string, number>
    timelineAnalysis: Array<{ date: string; mentions: number }>
  }> {
    const results = {
      totalMentions: 0,
      firstMention: undefined as number | undefined,
      platformBreakdown: {} as Record<string, number>,
      timelineAnalysis: [] as Array<{ date: string; mentions: number }>
    }

    try {
      // Search Reddit history (limited by API rate limits)
      const redditHistory = await this.searchRedditHistory(symbol)
      results.totalMentions += redditHistory.mentions
      results.platformBreakdown['reddit'] = redditHistory.mentions
      
      if (redditHistory.firstMention && (!results.firstMention || redditHistory.firstMention < results.firstMention)) {
        results.firstMention = redditHistory.firstMention
      }

      // Search Twitter history (if credentials available)
      try {
        const twitterHistory = await this.searchTwitterHistory(symbol)
        results.totalMentions += twitterHistory.mentions
        results.platformBreakdown['twitter'] = twitterHistory.mentions
        
        if (twitterHistory.firstMention && (!results.firstMention || twitterHistory.firstMention < results.firstMention)) {
          results.firstMention = twitterHistory.firstMention
        }
      } catch (error) {
        console.log('Twitter historical search not available:', error)
      }

      // Check market data APIs for historical trading data
      const marketHistory = await this.searchMarketHistory(symbol)
      if (marketHistory.firstTraded) {
        results.platformBreakdown['market'] = 1
        if (!results.firstMention || marketHistory.firstTraded < results.firstMention) {
          results.firstMention = marketHistory.firstTraded
        }
      }

    } catch (error) {
      console.error('Error performing historical lookup:', error)
    }

    return results
  }

  private async searchRedditHistory(symbol: string): Promise<{
    mentions: number
    firstMention?: number
    posts: Array<{ timestamp: number; subreddit: string; context: string }>
  }> {
    const results = {
      mentions: 0,
      firstMention: undefined as number | undefined,
      posts: [] as Array<{ timestamp: number; subreddit: string; context: string }>
    }

    try {
      // Search across crypto subreddits for historical mentions
      const cryptoSubreddits = this.redditScanner.getCryptoSubreddits()
      
      for (const subreddit of cryptoSubreddits.slice(0, 5)) { // Limit to avoid rate limits
        try {
          const analysis = await this.redditScanner.scanSubreddit(subreddit, 'month', 50, false)
          
          // Look for symbol mentions in posts
          for (const post of analysis.posts) {
            const postText = `${post.title} ${post.selftext}`.toLowerCase()
            if (postText.includes(`$${symbol.toLowerCase()}`) || 
                postText.includes(symbol.toLowerCase())) {
              
              const timestamp = post.created_utc * 1000
              results.mentions++
              results.posts.push({
                timestamp,
                subreddit: post.subreddit,
                context: post.title.substring(0, 100)
              })
              
              if (!results.firstMention || timestamp < results.firstMention) {
                results.firstMention = timestamp
              }
            }
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (error) {
          console.error(`Error searching ${subreddit}:`, error)
        }
      }
    } catch (error) {
      console.error('Error searching Reddit history:', error)
    }

    return results
  }

  private async searchTwitterHistory(symbol: string): Promise<{
    mentions: number
    firstMention?: number
    tweets: Array<{ timestamp: number; author: string; context: string }>
  }> {
    const results = {
      mentions: 0,
      firstMention: undefined as number | undefined,
      tweets: [] as Array<{ timestamp: number; author: string; context: string }>
    }

    try {
      // Search for historical tweets (limited to recent due to API restrictions)
      const searchResult = await this.twitterScanner.searchTweets(
        `$${symbol} OR #${symbol} lang:en -is:retweet`,
        100,
        24 * this.historicalLookbackDays // Convert days to hours
      )

      if (searchResult.data) {
        for (const tweet of searchResult.data) {
          const timestamp = new Date(tweet.created_at).getTime()
          results.mentions++
          results.tweets.push({
            timestamp,
            author: tweet.author,
            context: tweet.text.substring(0, 100)
          })
          
          if (!results.firstMention || timestamp < results.firstMention) {
            results.firstMention = timestamp
          }
        }
      }
    } catch (error) {
      console.error('Error searching Twitter history:', error)
    }

    return results
  }

  private async searchMarketHistory(symbol: string): Promise<{
    firstTraded?: number
    exchanges: string[]
    hasMarketData: boolean
  }> {
    const results = {
      firstTraded: undefined as number | undefined,
      exchanges: [] as string[],
      hasMarketData: false
    }

    try {
      // Check major exchanges for historical trading data
      // This would typically involve calling exchange APIs or market data providers
      // For now, we'll simulate by checking if it's a known cryptocurrency
      
      const knownCrypto = CryptoSymbolExtractor.getSymbolInfo(symbol)
      if (knownCrypto.isKnown) {
        results.hasMarketData = true
        results.exchanges = ['coinbase', 'binance', 'kraken'] // Simulated
        results.firstTraded = Date.now() - (30 * 24 * 60 * 60 * 1000) // 30 days ago, simulated
      }
    } catch (error) {
      console.error('Error searching market history:', error)
    }

    return results
  }

  private async getCurrentMentions(symbol: string): Promise<Array<{
    timestamp: number
    platform: 'twitter' | 'reddit'
    source: string
    context: string
    engagement: number
  }>> {
    const mentions = []

    try {
      // Get recent Reddit mentions
      const redditMentions = await this.getRecentRedditMentions(symbol)
      mentions.push(...redditMentions)

      // Get recent Twitter mentions
      const twitterMentions = await this.getRecentTwitterMentions(symbol)
      mentions.push(...twitterMentions)
    } catch (error) {
      console.error('Error getting current mentions:', error)
    }

    return mentions.sort((a, b) => b.timestamp - a.timestamp)
  }

  private async getRecentRedditMentions(symbol: string): Promise<Array<{
    timestamp: number
    platform: 'reddit'
    source: string
    context: string
    engagement: number
  }>> {
    const mentions = []

    try {
      const analysis = await this.redditScanner.scanSubreddit('CryptoCurrency', 'hour', 50, false)
      
      for (const post of analysis.posts) {
        const postText = `${post.title} ${post.selftext}`.toLowerCase()
        if (postText.includes(`$${symbol.toLowerCase()}`) || 
            postText.includes(symbol.toLowerCase())) {
          
          mentions.push({
            timestamp: post.created_utc * 1000,
            platform: 'reddit' as const,
            source: `r/${post.subreddit}`,
            context: post.title.substring(0, 150),
            engagement: post.score + post.num_comments
          })
        }
      }
    } catch (error) {
      console.error('Error getting Reddit mentions:', error)
    }

    return mentions
  }

  private async getRecentTwitterMentions(symbol: string): Promise<Array<{
    timestamp: number
    platform: 'twitter'
    source: string
    context: string
    engagement: number
  }>> {
    const mentions = []

    try {
      const searchResult = await this.twitterScanner.searchTweets(
        `$${symbol} OR #${symbol} lang:en -is:retweet`,
        50,
        1 // Last hour
      )

      if (searchResult.data) {
        for (const tweet of searchResult.data) {
          mentions.push({
            timestamp: new Date(tweet.created_at).getTime(),
            platform: 'twitter' as const,
            source: `@${tweet.author}`,
            context: tweet.text.substring(0, 150),
            engagement: tweet.public_metrics.like_count + tweet.public_metrics.retweet_count
          })
        }
      }
    } catch (error) {
      console.error('Error getting Twitter mentions:', error)
    }

    return mentions
  }

  private calculateNewnessConfidence(
    symbol: string,
    existingHistory: SymbolHistoryRecord | undefined,
    historicalData: any,
    currentMentions: any[]
  ): number {
    let confidence = 0.5 // Base confidence

    // Factor 1: No historical record = higher confidence it's new
    if (!existingHistory && historicalData.totalMentions === 0) {
      confidence += 0.3
    }

    // Factor 2: Recent first mention = higher confidence
    if (historicalData.firstMention) {
      const daysSinceFirst = (Date.now() - historicalData.firstMention) / (1000 * 60 * 60 * 24)
      if (daysSinceFirst <= this.newSymbolThresholdDays) {
        confidence += 0.2
      } else {
        confidence -= 0.3 // Reduce confidence if it has older history
      }
    }

    // Factor 3: Not in known crypto list = higher confidence it's new
    const knownCrypto = CryptoSymbolExtractor.getSymbolInfo(symbol)
    if (!knownCrypto.isKnown) {
      confidence += 0.2
    } else {
      confidence -= 0.4 // Well-known cryptos are not new
    }

    // Factor 4: Sudden spike in mentions = suspicious
    if (currentMentions.length > 10 && historicalData.totalMentions < 5) {
      confidence += 0.1 // Could be genuinely new and trending
    }

    // Factor 5: Check symbol format validity
    if (symbol.length < 3 || symbol.length > 6) {
      confidence -= 0.2 // Unusual symbol format
    }

    return Math.max(0, Math.min(1, confidence))
  }

  private async detectPumpIndicators(
    symbol: string,
    currentMentions: any[]
  ): Promise<NewSymbolAlert['pumpIndicators']> {
    const indicators = {
      suddenSpike: false,
      coordinatedMentions: false,
      suspiciousAccounts: false,
      missingMarketData: false
    }

    // Sudden spike detection
    const recentMentions = currentMentions.filter(
      m => m.timestamp > Date.now() - (60 * 60 * 1000) // Last hour
    )
    indicators.suddenSpike = recentMentions.length > 20

    // Coordinated mentions detection
    const authors = new Map<string, number>()
    const timeGroups = new Map<number, number>()
    
    for (const mention of currentMentions) {
      authors.set(mention.source, (authors.get(mention.source) || 0) + 1)
      
      const timeSlot = Math.floor(mention.timestamp / (5 * 60 * 1000)) // 5-minute buckets
      timeGroups.set(timeSlot, (timeGroups.get(timeSlot) || 0) + 1)
    }
    
    const maxMentionsPerAuthor = Math.max(...authors.values())
    const maxMentionsPerTimeSlot = Math.max(...timeGroups.values())
    
    indicators.coordinatedMentions = maxMentionsPerAuthor > 5 || maxMentionsPerTimeSlot > 15

    // Suspicious accounts detection (simplified)
    const lowEngagementMentions = currentMentions.filter(m => m.engagement < 5)
    indicators.suspiciousAccounts = lowEngagementMentions.length > currentMentions.length * 0.7

    // Missing market data
    const marketData = await this.searchMarketHistory(symbol)
    indicators.missingMarketData = !marketData.hasMarketData

    return indicators
  }

  private assessRisk(
    confidence: number,
    pumpIndicators: NewSymbolAlert['pumpIndicators'],
    historicalData: any
  ): { riskLevel: NewSymbolAlert['riskLevel']; recommendation: NewSymbolAlert['recommendation'] } {
    let riskLevel: NewSymbolAlert['riskLevel'] = 'low'
    let recommendation: NewSymbolAlert['recommendation'] = 'monitor'

    const suspiciousCount = Object.values(pumpIndicators).filter(Boolean).length

    if (suspiciousCount >= 3) {
      riskLevel = 'critical'
      recommendation = 'likely_pump'
    } else if (suspiciousCount >= 2) {
      riskLevel = 'high'
      recommendation = 'high_risk'
    } else if (confidence > 0.7 && suspiciousCount >= 1) {
      riskLevel = 'medium'
      recommendation = 'investigate'
    } else if (confidence > 0.8) {
      riskLevel = 'low'
      recommendation = 'monitor'
    }

    return { riskLevel, recommendation }
  }

  private async updateSymbolHistory(
    symbol: string,
    mentions: any[]
  ): Promise<void> {
    const existing = this.symbolHistory.get(symbol)
    
    if (existing) {
      // Update existing record
      for (const mention of mentions) {
        existing.mentions.push({
          timestamp: mention.timestamp,
          platform: mention.platform,
          source: mention.source,
          context: mention.context,
          confidence: 0.8 // Default confidence
        })
      }
    } else {
      // Create new record
      const record: SymbolHistoryRecord = {
        symbol,
        firstMention: mentions.length > 0 ? Math.min(...mentions.map(m => m.timestamp)) : Date.now(),
        platform: mentions[0]?.platform || 'reddit',
        mentions: mentions.map(m => ({
          timestamp: m.timestamp,
          platform: m.platform,
          source: m.source,
          context: m.context,
          confidence: 0.8
        })),
        verified: false,
        riskFlags: []
      }
      
      this.symbolHistory.set(symbol, record)
    }

    // Persist to storage (implement based on your storage solution)
    await this.saveHistoricalData()
  }

  private async loadHistoricalData(): Promise<void> {
    // Implement loading from your storage solution (database, file, etc.)
    // For now, we'll start with an empty history
    console.log('Loading historical symbol data...')
  }

  private async saveHistoricalData(): Promise<void> {
    // Implement saving to your storage solution (database, file, etc.)
    console.log('Saving historical symbol data...')
  }

  async getSymbolHistory(symbol: string): Promise<SymbolHistoryRecord | undefined> {
    return this.symbolHistory.get(symbol.toUpperCase())
  }

  async getAllTrackedSymbols(): Promise<string[]> {
    return Array.from(this.symbolHistory.keys())
  }

  async getRecentlyDetectedSymbols(hours: number = 24): Promise<NewSymbolAlert[]> {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    const recentSymbols = []

    for (const [symbol, record] of this.symbolHistory) {
      if (record.firstMention > cutoff) {
        const alert = await this.verifyNewSymbol(symbol)
        recentSymbols.push(alert)
      }
    }

    return recentSymbols.sort((a, b) => b.confidence - a.confidence)
  }
}