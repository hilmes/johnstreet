import { activityLoggerKV } from '@/lib/sentiment/ActivityLoggerKV'
import { SentimentAnalyzer, SocialMediaPost } from '@/lib/sentiment/SentimentAnalyzer'
import { CryptoSymbolExtractor } from '@/lib/sentiment/CryptoSymbolExtractor'

export interface LunarCrushConfig {
  apiKey: string
  baseUrl: string
  maxResults: number
  checkInterval: number // seconds
  active: boolean
}

export interface LunarCrushAsset {
  id: number
  symbol: string
  name: string
  price: number
  price_btc: number
  market_cap: number
  percent_change_24h: number
  volume_24h: number
  alt_rank: number
  alt_rank_30d_previous: number
  market_cap_rank: number
  galaxy_score: number
  volatility: number
  social_score: number
  average_sentiment: number
  news: number
  spam: number
  social_impact_score: number
  correlation_rank: number
  time_series?: Array<{
    time: number
    open: number
    close: number
    high: number
    low: number
    volume: number
    market_cap: number
    url_shares: number
    unique_url_shares: number
    reddit_posts: number
    reddit_posts_score: number
    reddit_comments: number
    reddit_comments_score: number
    tweets: number
    tweet_spam: number
    tweet_followers: number
    tweet_quotes: number
    tweet_retweets: number
    tweet_replies: number
    tweet_favorites: number
    tweet_sentiment1: number
    tweet_sentiment2: number
    tweet_sentiment3: number
    tweet_sentiment4: number
    tweet_sentiment5: number
    tweet_sentiment_impact1: number
    tweet_sentiment_impact2: number
    tweet_sentiment_impact3: number
    tweet_sentiment_impact4: number
    tweet_sentiment_impact5: number
    social_score: number
    average_sentiment: number
    sentiment_absolute: number
    sentiment_relative: number
    news: number
    price_score: number
    social_impact_score: number
    correlation_rank: number
    galaxy_score: number
    alt_rank: number
    alt_rank_hour_average: number
    market_cap_rank: number
    percent_change_24h: number
    volatility: number
    youtube: number
  }>
}

export interface LunarCrushInfluencer {
  id: number
  display_name: string
  screen_name: string
  followers: number
  interactions: number
  social_score: number
  influence_score: number
  platform: 'twitter' | 'reddit' | 'youtube'
  avatar_url?: string
  description?: string
}

export interface LunarCrushPost {
  id: string
  time: number
  tweet: string
  interactions: number
  sentiment: number
  spam: number
  influence_score: number
  user_name: string
  user_screen_name: string
  user_followers: number
  user_image?: string
  asset_id?: number
  symbol?: string
}

export interface ProcessedLunarCrushData {
  assets: Array<{
    asset: LunarCrushAsset
    sentiment: number
    symbols: string[]
    pumpIndicators: string[]
    riskScore: number
    processed: number
  }>
  posts: Array<{
    post: LunarCrushPost
    sentiment: number
    symbols: string[]
    pumpIndicators: string[]
    riskScore: number
    processed: number
  }>
  influencers: LunarCrushInfluencer[]
}

export interface LunarCrushResponse<T> {
  config: {
    id: string
    parameters: Record<string, any>
    execution_time: number
    credits_used: number
    credits_remaining: number
  }
  data: T[]
}

export class LunarCrushClient {
  private config: LunarCrushConfig | null = null
  private sentimentAnalyzer: SentimentAnalyzer
  private isRunning = false
  private monitoringInterval: NodeJS.Timeout | null = null
  private lastProcessedTime = 0
  private processedPostIds: Set<string> = new Set()

  // Top crypto assets to monitor
  private watchedSymbols = [
    'BTC', 'ETH', 'ADA', 'SOL', 'DOGE', 'SHIB', 'MATIC', 'DOT', 'AVAX', 'LINK',
    'UNI', 'ATOM', 'ALGO', 'XTZ', 'FTM', 'NEAR', 'MANA', 'SAND', 'AXS', 'ENJ'
  ]

  constructor() {
    this.sentimentAnalyzer = new SentimentAnalyzer()
  }

  async initialize(config: LunarCrushConfig): Promise<void> {
    this.config = config

    try {
      // Test API connection
      await this.testConnection()

      await activityLoggerKV.log({
        type: 'api_call',
        platform: 'lunarcrush',
        source: 'client',
        message: 'LunarCrush API client initialized',
        data: { 
          maxResults: config.maxResults,
          checkInterval: config.checkInterval,
          watchedSymbols: this.watchedSymbols.length
        },
        severity: 'success'
      })

    } catch (error) {
      await activityLoggerKV.logError(
        'LunarCrush Client',
        'Failed to initialize LunarCrush API client',
        error
      )
      throw error
    }
  }

  async startMonitoring(): Promise<void> {
    if (!this.config) {
      throw new Error('LunarCrush client not initialized')
    }

    if (this.isRunning) {
      await activityLoggerKV.log({
        type: 'api_call',
        platform: 'lunarcrush',
        source: 'client',
        message: 'LunarCrush monitoring already active',
        severity: 'warning'
      })
      return
    }

    this.isRunning = true
    this.lastProcessedTime = Date.now()

    // Initial data fetch
    await this.fetchAndProcessData()

    // Set up interval monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.fetchAndProcessData()
    }, this.config.checkInterval * 1000)

    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'lunarcrush',
      source: 'client',
      message: 'LunarCrush monitoring started',
      data: { interval: this.config.checkInterval },
      severity: 'success'
    })
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isRunning) return

    this.isRunning = false

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'lunarcrush',
      source: 'client',
      message: 'LunarCrush monitoring stopped',
      severity: 'info'
    })
  }

  private async testConnection(): Promise<void> {
    try {
      const url = this.buildApiUrl('assets', { limit: 1 })
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config!.apiKey}`,
          'User-Agent': 'JohnStreet-LunarCrush-Client/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`LunarCrush API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      if (data.config.credits_remaining <= 0) {
        throw new Error('LunarCrush API credits exhausted')
      }

      console.log(`LunarCrush API connection successful. Credits remaining: ${data.config.credits_remaining}`)
    } catch (error) {
      throw new Error(`Failed to connect to LunarCrush API: ${error}`)
    }
  }

  private buildApiUrl(endpoint: string, params: Record<string, any> = {}): string {
    const { baseUrl } = this.config!
    
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString())
      }
    }

    return `${baseUrl}/${endpoint}?${searchParams.toString()}`
  }

  private async fetchAndProcessData(): Promise<void> {
    const timer = activityLoggerKV.startTimer('LunarCrush fetch')

    try {
      // Fetch asset data with social metrics
      const assetsData = await this.fetchAssets()
      
      // Fetch recent social posts
      const postsData = await this.fetchRecentPosts()
      
      // Fetch influencer data
      const influencersData = await this.fetchInfluencers()

      // Process all data
      const processedData = await this.processData(assetsData, postsData, influencersData)

      const duration = timer()
      await activityLoggerKV.log({
        type: 'api_call',
        platform: 'lunarcrush',
        source: 'client',
        message: `Fetched and processed LunarCrush data`,
        data: { 
          assets: processedData.assets.length,
          posts: processedData.posts.length,
          influencers: processedData.influencers.length,
          creditsUsed: assetsData.config?.credits_used || 0
        },
        duration,
        severity: 'success'
      })

    } catch (error) {
      await activityLoggerKV.logError(
        'LunarCrush Client',
        'Failed to fetch data from LunarCrush',
        error
      )
    }
  }

  private async fetchAssets(): Promise<LunarCrushResponse<LunarCrushAsset>> {
    const url = this.buildApiUrl('assets', {
      symbol: this.watchedSymbols.join(','),
      data_points: 1,
      interval: 'hour',
      limit: this.watchedSymbols.length
    })

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.config!.apiKey}`,
        'User-Agent': 'JohnStreet-LunarCrush-Client/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`LunarCrush assets API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  private async fetchRecentPosts(): Promise<LunarCrushResponse<LunarCrushPost>> {
    const hoursBack = Math.ceil(this.config!.checkInterval / 3600) + 1 // Add buffer
    const startTime = Math.floor((Date.now() - hoursBack * 60 * 60 * 1000) / 1000)

    const url = this.buildApiUrl('posts', {
      symbol: this.watchedSymbols.slice(0, 10).join(','), // Limit to avoid API limits
      start: startTime,
      limit: this.config!.maxResults
    })

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.config!.apiKey}`,
        'User-Agent': 'JohnStreet-LunarCrush-Client/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`LunarCrush posts API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  private async fetchInfluencers(): Promise<LunarCrushResponse<LunarCrushInfluencer>> {
    const url = this.buildApiUrl('influencers', {
      symbol: this.watchedSymbols.slice(0, 5).join(','), // Top 5 symbols only for influencers
      limit: 20
    })

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.config!.apiKey}`,
        'User-Agent': 'JohnStreet-LunarCrush-Client/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`LunarCrush influencers API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  private async processData(
    assetsResponse: LunarCrushResponse<LunarCrushAsset>,
    postsResponse: LunarCrushResponse<LunarCrushPost>,
    influencersResponse: LunarCrushResponse<LunarCrushInfluencer>
  ): Promise<ProcessedLunarCrushData> {
    const processedAssets = []
    const processedPosts = []

    // Process assets with social sentiment data
    for (const asset of assetsResponse.data) {
      try {
        const processedAsset = await this.processAsset(asset)
        processedAssets.push(processedAsset)
      } catch (error) {
        await activityLoggerKV.logError(
          'LunarCrush Asset Processing',
          `Failed to process asset ${asset.symbol}`,
          error
        )
      }
    }

    // Process social posts
    for (const post of postsResponse.data) {
      try {
        // Skip if already processed
        if (this.processedPostIds.has(post.id)) continue

        const processedPost = await this.processPost(post)
        processedPosts.push(processedPost)
        this.processedPostIds.add(post.id)
      } catch (error) {
        await activityLoggerKV.logError(
          'LunarCrush Post Processing',
          `Failed to process post ${post.id}`,
          error
        )
      }
    }

    // Clean up processed posts cache (keep last 2000)
    if (this.processedPostIds.size > 2000) {
      const idsArray = Array.from(this.processedPostIds)
      this.processedPostIds = new Set(idsArray.slice(-1000))
    }

    // Log batch processing summary
    if (processedAssets.length > 0 || processedPosts.length > 0) {
      await activityLoggerKV.log({
        type: 'social_scan',
        platform: 'lunarcrush',
        source: 'batch_processor',
        message: `Processed ${processedAssets.length} assets and ${processedPosts.length} posts from LunarCrush`,
        data: {
          assetsProcessed: processedAssets.length,
          postsProcessed: processedPosts.length,
          influencersCount: influencersResponse.data.length,
          avgAssetSentiment: processedAssets.length > 0 ? 
            processedAssets.reduce((sum, a) => sum + a.sentiment, 0) / processedAssets.length : 0,
          totalSymbols: processedAssets.reduce((sum, a) => sum + a.symbols.length, 0) + 
                       processedPosts.reduce((sum, p) => sum + p.symbols.length, 0)
        },
        severity: 'success'
      })
    }

    return {
      assets: processedAssets,
      posts: processedPosts,
      influencers: influencersResponse.data
    }
  }

  private async processAsset(asset: LunarCrushAsset): Promise<ProcessedLunarCrushData['assets'][0]> {
    // Create a text representation for sentiment analysis
    const assetText = `${asset.name} (${asset.symbol}) price ${asset.percent_change_24h > 0 ? 'up' : 'down'} ${Math.abs(asset.percent_change_24h).toFixed(2)}% with ${asset.news} news mentions and social score ${asset.social_score}`

    const socialPost: SocialMediaPost = {
      id: `asset_${asset.id}`,
      text: assetText,
      author: 'lunarcrush_data',
      timestamp: Date.now(),
      platform: 'lunarcrush',
      engagement: {
        likes: Math.floor(asset.social_score * 10),
        retweets: asset.news,
        comments: 0
      },
      metadata: {
        symbol: asset.symbol,
        price: asset.price,
        market_cap: asset.market_cap,
        galaxy_score: asset.galaxy_score,
        alt_rank: asset.alt_rank,
        social_impact_score: asset.social_impact_score
      }
    }

    // Use LunarCrush's sentiment data but also run our own analysis
    const sentimentResult = this.sentimentAnalyzer.analyzePosts([socialPost])
    const ourSentiment = sentimentResult.overallSentiment.score
    
    // Combine LunarCrush sentiment with our analysis (weighted average)
    const combinedSentiment = (asset.average_sentiment * 0.6) + (ourSentiment * 0.4)

    const symbols = [asset.symbol]
    
    // Detect pump indicators based on LunarCrush metrics
    const pumpIndicators = []
    
    if (asset.alt_rank < asset.alt_rank_30d_previous - 10) {
      pumpIndicators.push('rank_improvement')
    }
    
    if (asset.percent_change_24h > 20) {
      pumpIndicators.push('price_surge')
    }
    
    if (asset.social_score > 80) {
      pumpIndicators.push('high_social_activity')
    }
    
    if (asset.galaxy_score > 75) {
      pumpIndicators.push('high_galaxy_score')
    }
    
    if (asset.news > 50) {
      pumpIndicators.push('news_spike')
    }

    // Calculate risk score
    let riskScore = 0
    riskScore += (asset.percent_change_24h > 50) ? 0.4 : 0
    riskScore += (asset.volatility > 0.8) ? 0.3 : 0
    riskScore += (asset.spam > 10) ? 0.2 : 0
    riskScore += (asset.social_impact_score > 1000 && asset.alt_rank > 100) ? 0.3 : 0
    riskScore += (pumpIndicators.length > 3) ? 0.2 : 0
    
    // Reduce risk for established coins
    if (asset.market_cap_rank <= 20) {
      riskScore -= 0.3
    }
    
    riskScore = Math.max(0, Math.min(1, riskScore))

    // Log asset analysis
    await activityLoggerKV.log({
      type: 'social_scan',
      platform: 'lunarcrush',
      source: 'asset_analysis',
      message: `Analyzed ${asset.symbol}: ${asset.percent_change_24h.toFixed(2)}% change, social score ${asset.social_score}`,
      data: {
        symbol: asset.symbol,
        price: asset.price,
        change24h: asset.percent_change_24h,
        socialScore: asset.social_score,
        galaxyScore: asset.galaxy_score,
        altRank: asset.alt_rank,
        sentiment: combinedSentiment,
        pumpIndicators: pumpIndicators.length,
        riskScore
      },
      severity: 'info'
    })

    // Log symbol detection
    await activityLoggerKV.logSymbolDetection(
      symbols,
      'LunarCrush (Asset Data)',
      {
        totalMentions: 1,
        sentiment: combinedSentiment,
        pumpIndicators: pumpIndicators.length,
        engagement: asset.social_score
      }
    )

    // Log pump alerts for high-risk assets
    if (riskScore > 0.6) {
      await activityLoggerKV.logPumpAlert(
        asset.symbol,
        riskScore > 0.8 ? 'high' : 'medium',
        riskScore,
        'LunarCrush (Asset Data)'
      )
    }

    return {
      asset,
      sentiment: combinedSentiment,
      symbols,
      pumpIndicators,
      riskScore,
      processed: Date.now()
    }
  }

  private async processPost(post: LunarCrushPost): Promise<ProcessedLunarCrushData['posts'][0]> {
    const socialPost: SocialMediaPost = {
      id: post.id,
      text: post.tweet,
      author: post.user_screen_name,
      timestamp: post.time * 1000,
      platform: 'twitter', // LunarCrush posts are typically from Twitter
      engagement: {
        likes: Math.floor(post.interactions * 0.6),
        retweets: Math.floor(post.interactions * 0.3),
        comments: Math.floor(post.interactions * 0.1)
      },
      metadata: {
        lunarcrush_sentiment: post.sentiment,
        influence_score: post.influence_score,
        spam_score: post.spam,
        followers: post.user_followers,
        symbol: post.symbol
      }
    }

    // Analyze sentiment with our analyzer
    const sentimentResult = this.sentimentAnalyzer.analyzePosts([socialPost])
    
    // Combine LunarCrush sentiment with our analysis
    const combinedSentiment = (post.sentiment * 0.6) + (sentimentResult.overallSentiment.score * 0.4)

    // Extract symbols
    const extractedSymbols = CryptoSymbolExtractor.extractSymbols(post.tweet)
    const symbols = extractedSymbols.map(s => s.symbol)
    
    // Add symbol from LunarCrush metadata if present
    if (post.symbol && !symbols.includes(post.symbol)) {
      symbols.push(post.symbol)
    }

    // Detect pump indicators
    const pumpKeywords = [
      'moon', 'rocket', 'pump', '100x', '1000x', 'diamond hands',
      'ape in', 'yolo', 'to the moon', 'lambo', 'easy money',
      'gem', 'hidden gem', 'breakout', 'surge', 'bullish'
    ]
    
    const pumpIndicators = pumpKeywords.filter(keyword => 
      post.tweet.toLowerCase().includes(keyword)
    )

    // Calculate risk score
    let riskScore = 0
    riskScore += pumpIndicators.length * 0.15
    riskScore += (post.spam > 0.5) ? 0.3 : 0
    riskScore += (post.influence_score > 80 && post.user_followers < 1000) ? 0.4 : 0
    riskScore += (symbols.length > 3) ? 0.2 : 0
    riskScore += (post.interactions > 1000 && post.user_followers < 10000) ? 0.3 : 0
    
    // Reduce risk for verified/established accounts
    if (post.user_followers > 100000) {
      riskScore -= 0.2
    }
    
    if (post.influence_score > 70 && post.spam < 0.1) {
      riskScore -= 0.15
    }
    
    riskScore = Math.max(0, Math.min(1, riskScore))

    // Log post processing
    await activityLoggerKV.log({
      type: 'social_scan',
      platform: 'lunarcrush',
      source: post.user_screen_name,
      message: `Processed LunarCrush post: ${post.tweet.substring(0, 100)}${post.tweet.length > 100 ? '...' : ''}`,
      data: {
        postId: post.id,
        author: post.user_screen_name,
        followers: post.user_followers,
        interactions: post.interactions,
        sentiment: combinedSentiment,
        symbols: symbols.length,
        pumpIndicators: pumpIndicators.length,
        riskScore,
        spam: post.spam,
        influence: post.influence_score
      },
      severity: 'info'
    })

    // Log symbol detections
    if (symbols.length > 0) {
      await activityLoggerKV.logSymbolDetection(
        symbols,
        `@${post.user_screen_name} (LunarCrush)`,
        {
          totalMentions: symbols.length,
          sentiment: combinedSentiment,
          pumpIndicators: pumpIndicators.length,
          engagement: post.interactions
        }
      )
    }

    // Log pump alerts for high-risk posts
    if (riskScore > 0.6 && symbols.length > 0) {
      for (const symbol of symbols) {
        await activityLoggerKV.logPumpAlert(
          symbol,
          riskScore > 0.8 ? 'high' : 'medium',
          riskScore,
          `@${post.user_screen_name} (LunarCrush)`
        )
      }
    }

    // Special handling for high-influence posts
    if (post.influence_score > 80 || post.interactions > 1000) {
      await activityLoggerKV.log({
        type: 'social_scan',
        platform: 'lunarcrush',
        source: 'high_influence',
        message: `🌟 HIGH INFLUENCE: @${post.user_screen_name} (${post.influence_score} score, ${post.interactions} interactions)`,
        data: {
          text: post.tweet,
          author: post.user_screen_name,
          followers: post.user_followers,
          influence: post.influence_score,
          interactions: post.interactions,
          symbols,
          sentiment: combinedSentiment
        },
        severity: 'warning'
      })
    }

    return {
      post,
      sentiment: combinedSentiment,
      symbols,
      pumpIndicators,
      riskScore,
      processed: Date.now()
    }
  }

  // Public API methods
  async getAssetMetrics(symbol: string): Promise<LunarCrushAsset | null> {
    if (!this.config) {
      throw new Error('LunarCrush client not initialized')
    }

    try {
      const url = this.buildApiUrl('assets', { symbol: symbol.toUpperCase() })
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'User-Agent': 'JohnStreet-LunarCrush-Client/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`LunarCrush API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json() as LunarCrushResponse<LunarCrushAsset>
      return data.data[0] || null
    } catch (error) {
      await activityLoggerKV.logError(
        'LunarCrush Client',
        `Failed to fetch asset metrics for ${symbol}`,
        error
      )
      throw error
    }
  }

  async getInfluencersForSymbol(symbol: string): Promise<LunarCrushInfluencer[]> {
    if (!this.config) {
      throw new Error('LunarCrush client not initialized')
    }

    try {
      const url = this.buildApiUrl('influencers', { 
        symbol: symbol.toUpperCase(),
        limit: 20
      })
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'User-Agent': 'JohnStreet-LunarCrush-Client/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`LunarCrush API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json() as LunarCrushResponse<LunarCrushInfluencer>
      return data.data
    } catch (error) {
      await activityLoggerKV.logError(
        'LunarCrush Client',
        `Failed to fetch influencers for symbol ${symbol}`,
        error
      )
      throw error
    }
  }

  // Status methods
  isActive(): boolean {
    return this.isRunning
  }

  getConfig(): LunarCrushConfig | null {
    return this.config
  }

  getWatchedSymbols(): string[] {
    return [...this.watchedSymbols]
  }

  getStats(): {
    isRunning: boolean
    lastProcessedTime: number
    processedPostsCount: number
    watchedSymbols: number
    config: LunarCrushConfig | null
  } {
    return {
      isRunning: this.isRunning,
      lastProcessedTime: this.lastProcessedTime,
      processedPostsCount: this.processedPostIds.size,
      watchedSymbols: this.watchedSymbols.length,
      config: this.config
    }
  }

  // Configuration updates
  async updateWatchedSymbols(symbols: string[]): Promise<void> {
    this.watchedSymbols = symbols.map(s => s.toUpperCase())

    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'lunarcrush',
      source: 'client',
      message: `Updated LunarCrush watched symbols`,
      data: { symbolCount: symbols.length, symbols: symbols.slice(0, 10) },
      severity: 'info'
    })
  }

  async updateInterval(intervalSeconds: number): Promise<void> {
    if (!this.config) return

    this.config.checkInterval = intervalSeconds
    
    if (this.isRunning) {
      await this.stopMonitoring()
      await this.startMonitoring()
    }

    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'lunarcrush',
      source: 'client',
      message: `Updated LunarCrush check interval to ${intervalSeconds}s`,
      data: { interval: intervalSeconds },
      severity: 'info'
    })
  }
}

// Export singleton instance
export const lunarCrushClient = new LunarCrushClient()