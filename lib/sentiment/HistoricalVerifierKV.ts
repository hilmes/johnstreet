import { kv } from '@vercel/kv'
import { CryptoSymbolExtractor, ExtractedSymbol } from './CryptoSymbolExtractor'
import { RedditScanner } from './RedditScanner'
import { TwitterScanner } from './TwitterScanner'
import { ActivityLoggerKV } from './ActivityLoggerKV'
import { SymbolHistoryRecord, NewSymbolAlert } from './HistoricalVerifier'

const KV_KEYS = {
  // Symbol tracking
  symbolHistory: (symbol: string) => `symbol:history:${symbol}`,
  allSymbols: 'symbols:all',
  newSymbols: 'symbols:new', // Symbols detected in last 24h
  watchlist: 'symbols:watchlist', // High-priority symbols to monitor
  
  // Verification cache
  verificationCache: (symbol: string, days: number) => `verification:${symbol}:${days}`,
  
  // Historical data
  dailySummary: (date: string) => `summary:daily:${date}`, // YYYY-MM-DD
  trendsCache: (symbol: string) => `trends:${symbol}`,
  
  // Statistics
  stats: 'historical:stats',
  alertHistory: 'historical:alerts'
}

export interface SymbolSummary {
  symbol: string
  totalMentions: number
  platforms: string[]
  firstSeen: number
  lastSeen: number
  averageConfidence: number
  riskLevel: string
  alertsGenerated: number
}

export interface DailySummary {
  date: string
  symbolsDetected: number
  totalVerifications: number
  newSymbols: string[]
  highRiskSymbols: string[]
  avgConfidence: number
  platformBreakdown: Record<string, number>
}

export class HistoricalVerifierKV {
  private redditScanner: RedditScanner
  private twitterScanner: TwitterScanner
  private activityLogger: ActivityLoggerKV
  private historicalLookbackDays: number = 30
  private newSymbolThresholdDays: number = 7
  private verificationCacheTTL = 6 * 60 * 60 // 6 hours
  private trendsCache: Map<string, { data: any; expires: number }> = new Map()
  private trendsCacheTTL = 30 * 60 * 1000 // 30 minutes

  constructor() {
    this.redditScanner = new RedditScanner()
    this.twitterScanner = new TwitterScanner()
    this.activityLogger = ActivityLoggerKV.getInstance()
  }

  async initialize(): Promise<void> {
    // Initialize scanners for public access
    await this.redditScanner.connectPublic()
    await this.twitterScanner.connectPublic()
    
    // Initialize daily cleanup
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.dailyCleanup(), 24 * 60 * 60 * 1000) // Daily
    }
  }

  async verifyNewSymbol(symbol: string): Promise<NewSymbolAlert> {
    const upperSymbol = symbol.toUpperCase()
    const timer = this.activityLogger.startTimer(`Historical verification: ${upperSymbol}`)
    
    try {
      await this.activityLogger.log({
        type: 'historical_check',
        platform: 'system',
        source: 'historical_verifier',
        message: `Starting verification for symbol: ${upperSymbol}`,
        data: { symbol: upperSymbol },
        severity: 'info'
      })
      
      // Check cache first
      const cacheKey = KV_KEYS.verificationCache(upperSymbol, this.historicalLookbackDays)
      const cached = await kv.get(cacheKey) as NewSymbolAlert
      
      if (cached && Date.now() - cached.firstDetected < this.verificationCacheTTL * 1000) {
        await this.activityLogger.log({
          type: 'api_call',
          platform: 'system',
          source: 'verification_cache',
          message: `Cache hit for ${upperSymbol}`,
          data: { symbol: upperSymbol, cached: true },
          severity: 'info'
        })
        return cached
      }
      
      // Check if we have existing history for this symbol
      const existingHistory = await this.getSymbolHistory(upperSymbol)
      
      // Perform historical lookup across platforms
      const historicalData = await this.performHistoricalLookup(upperSymbol)
      
      // Analyze current mentions vs historical patterns
      const currentMentions = await this.getCurrentMentions(upperSymbol)
      
      // Check Google Trends data with caching
      const trendsData = await this.getGoogleTrendsData(upperSymbol)
      
      // Calculate newness confidence
      const confidence = this.calculateNewnessConfidence(
        upperSymbol,
        existingHistory,
        historicalData,
        currentMentions,
        trendsData
      )
      
      // Detect pump indicators
      const pumpIndicators = await this.detectPumpIndicators(upperSymbol, currentMentions, trendsData)
      
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
      
      // Store in cache
      await kv.set(cacheKey, alert, { ex: this.verificationCacheTTL })
      
      // Update our historical records
      await this.updateSymbolHistory(upperSymbol, currentMentions, alert)
      
      // Track new symbols
      if (confidence > 0.7 && !existingHistory) {
        await this.trackNewSymbol(upperSymbol, alert)
      }
      
      // Update daily statistics
      await this.updateDailyStats(alert)
      
      const duration = timer()
      await this.activityLogger.log({
        type: 'historical_check',
        platform: 'system',
        source: 'historical_verifier',
        message: `Completed verification for ${upperSymbol}`,
        data: { 
          symbol: upperSymbol, 
          confidence: alert.confidence,
          riskLevel: alert.riskLevel,
          mentions: alert.mentions,
          duration
        },
        severity: 'success'
      })
      
      return alert
    } catch (error) {
      await this.activityLogger.logError(`Historical verification: ${upperSymbol}`, 'Failed to verify symbol', error)
      throw error
    }
  }

  // Get symbol history from KV
  async getSymbolHistory(symbol: string): Promise<SymbolHistoryRecord | undefined> {
    try {
      return await kv.get(KV_KEYS.symbolHistory(symbol)) as SymbolHistoryRecord | undefined
    } catch (error) {
      console.error('Error getting symbol history:', error)
      return undefined
    }
  }

  // Update symbol history in KV
  async updateSymbolHistory(
    symbol: string,
    mentions: any[],
    alert?: NewSymbolAlert
  ): Promise<void> {
    try {
      const existing = await this.getSymbolHistory(symbol)
      
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
        
        // Update metadata
        if (alert) {
          existing.riskFlags = existing.riskFlags || []
          if (alert.riskLevel === 'high' || alert.riskLevel === 'critical') {
            existing.riskFlags.push(`${alert.riskLevel}_risk_${Date.now()}`)
          }
        }
      } else {
        // Create new record
        const record: SymbolHistoryRecord = {
          symbol,
          firstMention: mentions.length > 0 ? Math.min(...mentions.map(m => m.timestamp)) : Date.now(),
          platform: mentions[0]?.platform || 'system',
          mentions: mentions.map(m => ({
            timestamp: m.timestamp,
            platform: m.platform,
            source: m.source,
            context: m.context,
            confidence: 0.8
          })),
          verified: alert ? alert.confidence > 0.7 : false,
          riskFlags: alert && (alert.riskLevel === 'high' || alert.riskLevel === 'critical') 
            ? [`${alert.riskLevel}_risk_${Date.now()}`] 
            : []
        }
        
        // Add to all symbols list
        const allSymbols = await kv.get(KV_KEYS.allSymbols) as string[] || []
        if (!allSymbols.includes(symbol)) {
          allSymbols.push(symbol)
          await kv.set(KV_KEYS.allSymbols, allSymbols)
        }
      }
      
      // Store updated history
      await kv.set(KV_KEYS.symbolHistory(symbol), existing || record, { ex: 30 * 24 * 60 * 60 }) // 30 days
      
    } catch (error) {
      console.error('Error updating symbol history:', error)
    }
  }

  // Track new symbols
  async trackNewSymbol(symbol: string, alert: NewSymbolAlert): Promise<void> {
    try {
      const newSymbols = await kv.get(KV_KEYS.newSymbols) as Record<string, NewSymbolAlert> || {}
      newSymbols[symbol] = alert
      await kv.set(KV_KEYS.newSymbols, newSymbols, { ex: 24 * 60 * 60 }) // 24 hours
      
      // Log new symbol detection
      await this.activityLogger.logNewSymbol(
        symbol,
        alert.platforms,
        alert.mentions
      )
    } catch (error) {
      console.error('Error tracking new symbol:', error)
    }
  }

  // Get Google Trends data with caching
  async getGoogleTrendsData(symbol: string): Promise<{
    searchVolume: number[]
    peakInterest: number
    sustainedInterest: boolean
    relatedQueries: string[]
    geoDistribution: Record<string, number>
    firstSignificantInterest?: number
  }> {
    const cacheKey = symbol
    const cached = this.trendsCache.get(cacheKey)
    
    if (cached && cached.expires > Date.now()) {
      return cached.data
    }
    
    const timer = this.activityLogger.startTimer(`Google Trends: ${symbol}`)
    
    try {
      // Check KV cache first
      const kvCached = await kv.get(KV_KEYS.trendsCache(symbol))
      if (kvCached) {
        this.trendsCache.set(cacheKey, {
          data: kvCached,
          expires: Date.now() + this.trendsCacheTTL
        })
        return kvCached as any
      }
      
      await this.activityLogger.log({
        type: 'api_call',
        platform: 'api',
        source: 'google_trends',
        message: `Fetching trends data for ${symbol}`,
        data: { symbol },
        severity: 'info'
      })

      // Simulated trends data (in production, integrate with actual Google Trends API)
      const trendsData = {
        searchVolume: [0, 0, 0, 5, 15, 45, 80, 100, 65, 30],
        peakInterest: 100,
        sustainedInterest: false,
        relatedQueries: [`${symbol} price`, `${symbol} pump`, `buy ${symbol}`, `${symbol} moon`],
        geoDistribution: { 'US': 45, 'IN': 25, 'GB': 15, 'CA': 10, 'AU': 5 },
        firstSignificantInterest: Date.now() - (7 * 24 * 60 * 60 * 1000) // 7 days ago
      }

      // Cache in both memory and KV
      this.trendsCache.set(cacheKey, {
        data: trendsData,
        expires: Date.now() + this.trendsCacheTTL
      })
      
      await kv.set(KV_KEYS.trendsCache(symbol), trendsData, { ex: 30 * 60 }) // 30 minutes

      const duration = timer()
      await this.activityLogger.log({
        type: 'api_call',
        platform: 'api',
        source: 'google_trends',
        message: `Retrieved trends data for ${symbol}`,
        data: { 
          symbol, 
          peakInterest: trendsData.peakInterest,
          sustainedInterest: trendsData.sustainedInterest,
          relatedQueriesCount: trendsData.relatedQueries.length,
          duration
        },
        severity: 'success'
      })

      return trendsData
    } catch (error) {
      await this.activityLogger.logError(`Google Trends: ${symbol}`, 'Failed to fetch trends data', error)
      
      // Return empty data on error
      return {
        searchVolume: [],
        peakInterest: 0,
        sustainedInterest: false,
        relatedQueries: [],
        geoDistribution: {},
        firstSignificantInterest: undefined
      }
    }
  }

  // Update daily statistics
  async updateDailyStats(alert: NewSymbolAlert): Promise<void> {
    try {
      const date = new Date().toISOString().split('T')[0]
      const existing = await kv.get(KV_KEYS.dailySummary(date)) as DailySummary || {
        date,
        symbolsDetected: 0,
        totalVerifications: 0,
        newSymbols: [],
        highRiskSymbols: [],
        avgConfidence: 0,
        platformBreakdown: {}
      }
      
      existing.totalVerifications++
      
      if (alert.confidence > 0.7) {
        existing.symbolsDetected++
        if (!existing.newSymbols.includes(alert.symbol)) {
          existing.newSymbols.push(alert.symbol)
        }
      }
      
      if (alert.riskLevel === 'high' || alert.riskLevel === 'critical') {
        if (!existing.highRiskSymbols.includes(alert.symbol)) {
          existing.highRiskSymbols.push(alert.symbol)
        }
      }
      
      // Update platform breakdown
      for (const platform of alert.platforms) {
        existing.platformBreakdown[platform] = (existing.platformBreakdown[platform] || 0) + 1
      }
      
      // Update running average confidence
      const totalConfidence = existing.avgConfidence * (existing.totalVerifications - 1) + alert.confidence
      existing.avgConfidence = totalConfidence / existing.totalVerifications
      
      await kv.set(KV_KEYS.dailySummary(date), existing, { ex: 7 * 24 * 60 * 60 }) // 7 days
    } catch (error) {
      console.error('Error updating daily stats:', error)
    }
  }

  // Get all tracked symbols
  async getAllTrackedSymbols(): Promise<string[]> {
    try {
      return await kv.get(KV_KEYS.allSymbols) as string[] || []
    } catch (error) {
      console.error('Error getting tracked symbols:', error)
      return []
    }
  }

  // Get recently detected symbols
  async getRecentlyDetectedSymbols(hours: number = 24): Promise<NewSymbolAlert[]> {
    try {
      const newSymbols = await kv.get(KV_KEYS.newSymbols) as Record<string, NewSymbolAlert> || {}
      const cutoff = Date.now() - (hours * 60 * 60 * 1000)
      
      return Object.values(newSymbols)
        .filter(alert => alert.firstDetected > cutoff)
        .sort((a, b) => b.confidence - a.confidence)
    } catch (error) {
      console.error('Error getting recently detected symbols:', error)
      return []
    }
  }

  // Get symbol summaries
  async getSymbolSummaries(limit = 50): Promise<SymbolSummary[]> {
    try {
      const symbols = await this.getAllTrackedSymbols()
      const summaries: SymbolSummary[] = []
      
      for (const symbol of symbols.slice(0, limit)) {
        const history = await this.getSymbolHistory(symbol)
        if (history) {
          const platforms = [...new Set(history.mentions.map(m => m.platform))]
          const avgConfidence = history.mentions.reduce((sum, m) => sum + m.confidence, 0) / history.mentions.length
          
          summaries.push({
            symbol,
            totalMentions: history.mentions.length,
            platforms,
            firstSeen: history.firstMention,
            lastSeen: Math.max(...history.mentions.map(m => m.timestamp)),
            averageConfidence: avgConfidence,
            riskLevel: history.riskFlags.length > 0 ? 'high' : 'low',
            alertsGenerated: history.riskFlags.length
          })
        }
      }
      
      return summaries.sort((a, b) => b.lastSeen - a.lastSeen)
    } catch (error) {
      console.error('Error getting symbol summaries:', error)
      return []
    }
  }

  // Get daily summary
  async getDailySummary(date?: string): Promise<DailySummary | null> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0]
      return await kv.get(KV_KEYS.dailySummary(targetDate)) as DailySummary || null
    } catch (error) {
      console.error('Error getting daily summary:', error)
      return null
    }
  }

  // Add symbol to watchlist
  async addToWatchlist(symbol: string, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<void> {
    try {
      const watchlist = await kv.get(KV_KEYS.watchlist) as Record<string, { priority: string; added: number }> || {}
      watchlist[symbol] = { priority, added: Date.now() }
      await kv.set(KV_KEYS.watchlist, watchlist)
    } catch (error) {
      console.error('Error adding to watchlist:', error)
    }
  }

  // Get watchlist
  async getWatchlist(): Promise<Record<string, { priority: string; added: number }>> {
    try {
      return await kv.get(KV_KEYS.watchlist) as Record<string, { priority: string; added: number }> || {}
    } catch (error) {
      console.error('Error getting watchlist:', error)
      return {}
    }
  }

  // Daily cleanup
  private async dailyCleanup(): Promise<void> {
    try {
      // Clean up old verification cache entries
      console.log('Starting daily cleanup of historical verifier data')
      
      // Clean trends cache
      this.trendsCache.clear()
      
      // In a real implementation, we'd clean up expired KV keys
      // For now, we rely on TTL expiration
    } catch (error) {
      console.error('Error during daily cleanup:', error)
    }
  }

  // Private methods (keeping the original logic but with KV integration)
  private async performHistoricalLookup(symbol: string): Promise<{
    totalMentions: number
    firstMention?: number
    platformBreakdown: Record<string, number>
    timelineAnalysis: Array<{ date: string; mentions: number }>
  }> {
    // Keep existing implementation but add KV caching
    const results = {
      totalMentions: 0,
      firstMention: undefined as number | undefined,
      platformBreakdown: {} as Record<string, number>,
      timelineAnalysis: [] as Array<{ date: string; mentions: number }>
    }

    try {
      // Check if we have cached historical data
      const history = await this.getSymbolHistory(symbol)
      if (history) {
        results.totalMentions = history.mentions.length
        results.firstMention = history.firstMention
        
        // Calculate platform breakdown
        for (const mention of history.mentions) {
          results.platformBreakdown[mention.platform] = (results.platformBreakdown[mention.platform] || 0) + 1
        }
        
        return results
      }

      // Perform fresh lookup (existing logic)
      const redditHistory = await this.searchRedditHistory(symbol)
      results.totalMentions += redditHistory.mentions
      results.platformBreakdown['reddit'] = redditHistory.mentions
      
      if (redditHistory.firstMention && (!results.firstMention || redditHistory.firstMention < results.firstMention)) {
        results.firstMention = redditHistory.firstMention
      }

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

  // Keep existing private methods but add activity logging
  private async searchRedditHistory(symbol: string): Promise<{
    mentions: number
    firstMention?: number
    posts: Array<{ timestamp: number; subreddit: string; context: string }>
  }> {
    const timer = this.activityLogger.startTimer(`Reddit history: ${symbol}`)
    
    const results = {
      mentions: 0,
      firstMention: undefined as number | undefined,
      posts: [] as Array<{ timestamp: number; subreddit: string; context: string }>
    }

    try {
      const cryptoSubreddits = this.redditScanner.getCryptoSubreddits()
      
      for (const subreddit of cryptoSubreddits.slice(0, 5)) {
        try {
          const analysis = await this.redditScanner.scanSubreddit(subreddit, 'month', 50, false)
          
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
          
          await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (error) {
          console.error(`Error searching ${subreddit}:`, error)
        }
      }
      
      const duration = timer()
      await this.activityLogger.log({
        type: 'reddit_scan',
        platform: 'reddit',
        source: 'historical_search',
        message: `Historical Reddit search for ${symbol} found ${results.mentions} mentions`,
        data: { symbol, mentions: results.mentions },
        duration,
        severity: 'info'
      })
      
    } catch (error) {
      await this.activityLogger.logError(`Reddit history: ${symbol}`, 'Failed to search Reddit history', error)
    }

    return results
  }

  private async searchTwitterHistory(symbol: string): Promise<{
    mentions: number
    firstMention?: number
    tweets: Array<{ timestamp: number; author: string; context: string }>
  }> {
    const timer = this.activityLogger.startTimer(`Twitter history: ${symbol}`)
    
    const results = {
      mentions: 0,
      firstMention: undefined as number | undefined,
      tweets: [] as Array<{ timestamp: number; author: string; context: string }>
    }

    try {
      const searchResult = await this.twitterScanner.searchTweets(
        `$${symbol} OR #${symbol} lang:en -is:retweet`,
        100,
        24 * this.historicalLookbackDays
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
      
      const duration = timer()
      await this.activityLogger.log({
        type: 'twitter_scan',
        platform: 'twitter',
        source: 'historical_search',
        message: `Historical Twitter search for ${symbol} found ${results.mentions} mentions`,
        data: { symbol, mentions: results.mentions },
        duration,
        severity: 'info'
      })
      
    } catch (error) {
      await this.activityLogger.logError(`Twitter history: ${symbol}`, 'Failed to search Twitter history', error)
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
      const knownCrypto = CryptoSymbolExtractor.getSymbolInfo(symbol)
      if (knownCrypto.isKnown) {
        results.hasMarketData = true
        results.exchanges = ['coinbase', 'binance', 'kraken']
        results.firstTraded = Date.now() - (30 * 24 * 60 * 60 * 1000)
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
      const redditMentions = await this.getRecentRedditMentions(symbol)
      mentions.push(...redditMentions)

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
        1
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

  // Keep existing confidence calculation and risk assessment methods
  private calculateNewnessConfidence(
    symbol: string,
    existingHistory: SymbolHistoryRecord | undefined,
    historicalData: any,
    currentMentions: any[],
    trendsData?: any
  ): number {
    let confidence = 0.5

    if (!existingHistory && historicalData.totalMentions === 0) {
      confidence += 0.3
    }

    if (historicalData.firstMention) {
      const daysSinceFirst = (Date.now() - historicalData.firstMention) / (1000 * 60 * 60 * 24)
      if (daysSinceFirst <= this.newSymbolThresholdDays) {
        confidence += 0.2
      } else {
        confidence -= 0.3
      }
    }

    const knownCrypto = CryptoSymbolExtractor.getSymbolInfo(symbol)
    if (!knownCrypto.isKnown) {
      confidence += 0.2
    } else {
      confidence -= 0.4
    }

    if (currentMentions.length > 10 && historicalData.totalMentions < 5) {
      confidence += 0.1
    }

    if (symbol.length < 3 || symbol.length > 6) {
      confidence -= 0.2
    }

    // Google Trends validation
    if (trendsData) {
      if (trendsData.searchVolume.every(v => v === 0)) {
        confidence += 0.15
      }
      
      if (trendsData.firstSignificantInterest) {
        const daysSinceFirstInterest = (Date.now() - trendsData.firstSignificantInterest) / (1000 * 60 * 60 * 24)
        if (daysSinceFirstInterest <= this.newSymbolThresholdDays) {
          confidence += 0.2
        }
      }
      
      if (!trendsData.sustainedInterest && trendsData.peakInterest > 50) {
        confidence += 0.1
      }
      
      const pumpRelatedQueries = trendsData.relatedQueries?.filter((q: string) => 
        /pump|moon|rocket|buy|price|crypto/i.test(q)
      ).length || 0
      
      if (pumpRelatedQueries > trendsData.relatedQueries?.length * 0.6) {
        confidence -= 0.1
      }
    }

    return Math.max(0, Math.min(1, confidence))
  }

  private async detectPumpIndicators(
    symbol: string,
    currentMentions: any[],
    trendsData?: any
  ): Promise<NewSymbolAlert['pumpIndicators']> {
    const indicators = {
      suddenSpike: false,
      coordinatedMentions: false,
      suspiciousAccounts: false,
      missingMarketData: false
    }

    const recentMentions = currentMentions.filter(
      m => m.timestamp > Date.now() - (60 * 60 * 1000)
    )
    indicators.suddenSpike = recentMentions.length > 20

    if (trendsData) {
      const recentTrendsSpike = trendsData.searchVolume.length > 2 && 
        trendsData.searchVolume[trendsData.searchVolume.length - 1] > 
        trendsData.searchVolume[trendsData.searchVolume.length - 3] * 3
      
      indicators.suddenSpike = indicators.suddenSpike || recentTrendsSpike
    }

    const authors = new Map<string, number>()
    const timeGroups = new Map<number, number>()
    
    for (const mention of currentMentions) {
      authors.set(mention.source, (authors.get(mention.source) || 0) + 1)
      
      const timeSlot = Math.floor(mention.timestamp / (5 * 60 * 1000))
      timeGroups.set(timeSlot, (timeGroups.get(timeSlot) || 0) + 1)
    }
    
    const maxMentionsPerAuthor = Math.max(...authors.values())
    const maxMentionsPerTimeSlot = Math.max(...timeGroups.values())
    
    indicators.coordinatedMentions = maxMentionsPerAuthor > 5 || maxMentionsPerTimeSlot > 15

    if (trendsData?.geoDistribution) {
      const topGeoPercentage = Math.max(...Object.values(trendsData.geoDistribution))
      indicators.coordinatedMentions = indicators.coordinatedMentions || topGeoPercentage > 70
    }

    const lowEngagementMentions = currentMentions.filter(m => m.engagement < 5)
    indicators.suspiciousAccounts = lowEngagementMentions.length > currentMentions.length * 0.7

    const marketData = await this.searchMarketHistory(symbol)
    indicators.missingMarketData = !marketData.hasMarketData

    if (trendsData?.relatedQueries) {
      const pumpQueries = trendsData.relatedQueries.filter(q => 
        /pump|moon|rocket|diamond|100x|1000x/i.test(q)
      )
      if (pumpQueries.length > trendsData.relatedQueries.length * 0.5) {
        indicators.coordinatedMentions = true
      }
    }

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
}

// Export singleton instance
export const historicalVerifierKV = new HistoricalVerifierKV()