import { activityLoggerKV } from '@/lib/sentiment/ActivityLoggerKV'
import { SentimentAnalyzer, SocialMediaPost } from '@/lib/sentiment/SentimentAnalyzer'
import { CryptoSymbolExtractor } from '@/lib/sentiment/CryptoSymbolExtractor'

export interface CryptoPanicConfig {
  apiKey?: string
  baseUrl: string
  region: string // 'en' for English, 'de' for German, etc.
  maxResults: number
  checkInterval: number // seconds
  active: boolean
}

export interface CryptoPanicPost {
  id: number
  kind: 'news' | 'media'
  domain: string
  title: string
  published_at: string
  slug: string
  url: string
  created_at: string
  votes: {
    negative: number
    positive: number
    important: number
    liked: number
    disliked: number
    lol: number
    toxic: number
    saved: number
    comments: number
  }
  source: {
    domain: string
    title: string
    region: string
    path?: string
  }
  currencies?: Array<{
    code: string
    title: string
    slug: string
    url: string
  }>
  metadata?: {
    description?: string
    twitter?: {
      account_name: string
      account_id: string
    }
  }
}

export interface ProcessedCryptoPanicPost extends CryptoPanicPost {
  sentiment: number
  symbols: string[]
  pumpIndicators: string[]
  riskScore: number
  processed: number
}

export interface CryptoPanicResponse {
  count: number
  next?: string
  previous?: string
  results: CryptoPanicPost[]
}

export class CryptoPanicClient {
  private config: CryptoPanicConfig | null = null
  private sentimentAnalyzer: SentimentAnalyzer
  private isRunning = false
  private monitoringInterval: NodeJS.Timeout | null = null
  private lastProcessedId = 0
  private processedPostIds: Set<number> = new Set()

  constructor() {
    this.sentimentAnalyzer = new SentimentAnalyzer()
  }

  async initialize(config: CryptoPanicConfig): Promise<void> {
    this.config = config

    try {
      // Test API connection
      await this.testConnection()

      await activityLoggerKV.log({
        type: 'api_call',
        platform: 'cryptopanic',
        source: 'client',
        message: 'CryptoPanic API client initialized',
        data: { 
          region: config.region,
          maxResults: config.maxResults,
          checkInterval: config.checkInterval
        },
        severity: 'success'
      })

    } catch (error) {
      await activityLoggerKV.logError(
        'CryptoPanic Client',
        'Failed to initialize CryptoPanic API client',
        error
      )
      throw error
    }
  }

  async startMonitoring(): Promise<void> {
    if (!this.config) {
      throw new Error('CryptoPanic client not initialized')
    }

    if (this.isRunning) {
      await activityLoggerKV.log({
        type: 'api_call',
        platform: 'cryptopanic',
        source: 'client',
        message: 'CryptoPanic monitoring already active',
        severity: 'warning'
      })
      return
    }

    this.isRunning = true

    // Initial fetch
    await this.fetchAndProcessPosts()

    // Set up interval monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.fetchAndProcessPosts()
    }, this.config.checkInterval * 1000)

    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'cryptopanic',
      source: 'client',
      message: 'CryptoPanic monitoring started',
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
      platform: 'cryptopanic',
      source: 'client',
      message: 'CryptoPanic monitoring stopped',
      severity: 'info'
    })
  }

  private async testConnection(): Promise<void> {
    try {
      const url = this.buildApiUrl('posts/', { results: 1 })
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'JohnStreet-CryptoPanic-Client/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`CryptoPanic API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json() as CryptoPanicResponse
      console.log('CryptoPanic API connection successful')
    } catch (error) {
      throw new Error(`Failed to connect to CryptoPanic API: ${error}`)
    }
  }

  private buildApiUrl(endpoint: string, params: Record<string, any> = {}): string {
    const { baseUrl, apiKey, region } = this.config!
    
    const defaultParams = {
      regions: region,
      filter: 'hot', // Get trending news
      public: apiKey ? undefined : 'true' // Use public API if no key
    }

    if (apiKey) {
      defaultParams['auth_token'] = apiKey
    }

    const allParams = { ...defaultParams, ...params }
    const searchParams = new URLSearchParams()

    for (const [key, value] of Object.entries(allParams)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString())
      }
    }

    return `${baseUrl}/${endpoint}?${searchParams.toString()}`
  }

  private async fetchAndProcessPosts(): Promise<void> {
    const timer = activityLoggerKV.startTimer('CryptoPanic fetch')

    try {
      const params = {
        results: this.config!.maxResults,
        kind: 'news,media',
        currencies: 'BTC,ETH,ADA,SOL,DOGE,SHIB,MATIC,DOT,AVAX,LINK', // Major cryptos
        since: this.lastProcessedId || undefined
      }

      const url = this.buildApiUrl('posts/', params)
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'JohnStreet-CryptoPanic-Client/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`CryptoPanic API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json() as CryptoPanicResponse
      const newPosts = data.results.filter(post => !this.processedPostIds.has(post.id))

      if (newPosts.length > 0) {
        await this.processNewPosts(newPosts)
        
        // Update tracking
        const maxId = Math.max(...newPosts.map(post => post.id))
        if (maxId > this.lastProcessedId) {
          this.lastProcessedId = maxId
        }

        // Add to processed set (keep last 5000 to prevent memory bloat)
        for (const post of newPosts) {
          this.processedPostIds.add(post.id)
        }
        
        if (this.processedPostIds.size > 5000) {
          const idsArray = Array.from(this.processedPostIds).sort((a, b) => b - a)
          this.processedPostIds = new Set(idsArray.slice(0, 2500))
        }
      }

      const duration = timer()
      await activityLoggerKV.log({
        type: 'api_call',
        platform: 'cryptopanic',
        source: 'client',
        message: `Fetched ${newPosts.length} new posts from CryptoPanic`,
        data: { 
          totalPosts: data.count,
          newPosts: newPosts.length,
          lastProcessedId: this.lastProcessedId
        },
        duration,
        severity: newPosts.length > 0 ? 'success' : 'info'
      })

    } catch (error) {
      await activityLoggerKV.logError(
        'CryptoPanic Client',
        'Failed to fetch posts from CryptoPanic',
        error
      )
    }
  }

  private async processNewPosts(posts: CryptoPanicPost[]): Promise<void> {
    const processedPosts: ProcessedCryptoPanicPost[] = []

    for (const post of posts) {
      try {
        // Convert to social media post format for sentiment analysis
        const socialPost: SocialMediaPost = {
          id: post.id.toString(),
          text: `${post.title} ${post.metadata?.description || ''}`,
          author: post.source.title,
          timestamp: new Date(post.published_at).getTime(),
          platform: 'cryptopanic',
          engagement: {
            likes: post.votes.positive + post.votes.liked,
            retweets: post.votes.important,
            comments: post.votes.comments
          },
          metadata: {
            domain: post.domain,
            url: post.url,
            kind: post.kind,
            region: post.source.region,
            currencies: post.currencies?.map(c => c.code) || [],
            votes: post.votes
          }
        }

        // Analyze sentiment
        const sentimentResult = this.sentimentAnalyzer.analyzePosts([socialPost])
        
        // Extract crypto symbols
        const extractedSymbols = CryptoSymbolExtractor.extractSymbols(socialPost.text)
        const symbols = extractedSymbols.map(s => s.symbol)

        // Add currencies from CryptoPanic metadata
        if (post.currencies) {
          for (const currency of post.currencies) {
            if (!symbols.includes(currency.code)) {
              symbols.push(currency.code)
            }
          }
        }

        // Detect pump indicators
        const pumpKeywords = [
          'surge', 'rally', 'breakout', 'moon', 'rocket', 'pump', 'explosion',
          'massive gains', 'skyrocket', 'bull run', 'breakthrough', 'parabolic',
          'new high', 'all-time high', 'ATH', 'massive move', 'explodes'
        ]
        
        const pumpIndicators = pumpKeywords.filter(keyword => 
          socialPost.text.toLowerCase().includes(keyword)
        )

        // Calculate risk score based on various factors
        let riskScore = 0
        riskScore += pumpIndicators.length * 0.15
        riskScore += (post.votes.negative > post.votes.positive * 2) ? 0.3 : 0
        riskScore += (post.kind === 'media' && post.domain.includes('twitter')) ? 0.2 : 0
        riskScore += (symbols.length > 5) ? 0.25 : 0
        riskScore += (post.votes.toxic > 0) ? 0.2 : 0
        
        // Reduce risk for reputable sources
        const reputableSources = ['coindesk', 'cointelegraph', 'reuters', 'bloomberg', 'forbes']
        if (reputableSources.some(source => post.domain.includes(source))) {
          riskScore -= 0.3
        }
        
        riskScore = Math.max(0, Math.min(1, riskScore))

        const processedPost: ProcessedCryptoPanicPost = {
          ...post,
          sentiment: sentimentResult.overallSentiment.score,
          symbols,
          pumpIndicators,
          riskScore,
          processed: Date.now()
        }

        processedPosts.push(processedPost)

        // Log post processing
        await activityLoggerKV.log({
          type: 'news_scan',
          platform: 'cryptopanic',
          source: post.source.title,
          message: `Processed CryptoPanic post: ${post.title.substring(0, 100)}${post.title.length > 100 ? '...' : ''}`,
          data: {
            postId: post.id,
            domain: post.domain,
            sentiment: processedPost.sentiment,
            symbols: symbols.length,
            pumpIndicators: pumpIndicators.length,
            riskScore: riskScore,
            votes: post.votes.positive - post.votes.negative
          },
          severity: 'info'
        })

        // Log symbol detections
        if (symbols.length > 0) {
          await activityLoggerKV.logSymbolDetection(
            symbols,
            `${post.source.title} (CryptoPanic)`,
            {
              totalMentions: symbols.length,
              sentiment: processedPost.sentiment,
              pumpIndicators: pumpIndicators.length,
              engagement: post.votes.positive + post.votes.liked + post.votes.important
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
              `${post.source.title} (CryptoPanic)`
            )
          }
        }

        // Special handling for high-engagement posts
        if (post.votes.positive > 50 || post.votes.important > 10) {
          await activityLoggerKV.log({
            type: 'news_scan',
            platform: 'cryptopanic',
            source: 'high_engagement',
            message: `🔥 HIGH ENGAGEMENT: ${post.title}`,
            data: {
              title: post.title,
              url: post.url,
              positive: post.votes.positive,
              important: post.votes.important,
              symbols,
              sentiment: processedPost.sentiment
            },
            severity: 'warning'
          })
        }

      } catch (error) {
        await activityLoggerKV.logError(
          'CryptoPanic Processing',
          `Failed to process CryptoPanic post: ${post.title}`,
          error
        )
      }
    }

    // Log batch processing summary
    if (processedPosts.length > 0) {
      await activityLoggerKV.log({
        type: 'news_scan',
        platform: 'cryptopanic',
        source: 'batch_processor',
        message: `Processed ${processedPosts.length} CryptoPanic posts with sentiment analysis`,
        data: {
          processedCount: processedPosts.length,
          avgSentiment: processedPosts.reduce((sum, post) => sum + post.sentiment, 0) / processedPosts.length,
          totalSymbols: processedPosts.reduce((sum, post) => sum + post.symbols.length, 0),
          totalPumpIndicators: processedPosts.reduce((sum, post) => sum + post.pumpIndicators.length, 0),
          highRiskPosts: processedPosts.filter(post => post.riskScore > 0.6).length
        },
        severity: 'success'
      })
    }
  }

  // Public API methods
  async getLatestPosts(limit: number = 50): Promise<CryptoPanicPost[]> {
    if (!this.config) {
      throw new Error('CryptoPanic client not initialized')
    }

    try {
      const url = this.buildApiUrl('posts/', { results: limit })
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'JohnStreet-CryptoPanic-Client/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`CryptoPanic API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json() as CryptoPanicResponse
      return data.results
    } catch (error) {
      await activityLoggerKV.logError(
        'CryptoPanic Client',
        'Failed to fetch latest posts',
        error
      )
      throw error
    }
  }

  async getPostsBySymbol(symbol: string, limit: number = 20): Promise<CryptoPanicPost[]> {
    if (!this.config) {
      throw new Error('CryptoPanic client not initialized')
    }

    try {
      const url = this.buildApiUrl('posts/', { 
        results: limit,
        currencies: symbol.toUpperCase()
      })
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'JohnStreet-CryptoPanic-Client/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`CryptoPanic API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json() as CryptoPanicResponse
      return data.results
    } catch (error) {
      await activityLoggerKV.logError(
        'CryptoPanic Client',
        `Failed to fetch posts for symbol ${symbol}`,
        error
      )
      throw error
    }
  }

  // Status methods
  isActive(): boolean {
    return this.isRunning
  }

  getConfig(): CryptoPanicConfig | null {
    return this.config
  }

  getStats(): {
    isRunning: boolean
    lastProcessedId: number
    processedPostsCount: number
    config: CryptoPanicConfig | null
  } {
    return {
      isRunning: this.isRunning,
      lastProcessedId: this.lastProcessedId,
      processedPostsCount: this.processedPostIds.size,
      config: this.config
    }
  }

  // Configuration updates
  async updateRegion(region: string): Promise<void> {
    if (!this.config) return

    this.config.region = region
    
    if (this.isRunning) {
      await this.stopMonitoring()
      await this.startMonitoring()
    }

    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'cryptopanic',
      source: 'client',
      message: `Updated CryptoPanic region to ${region}`,
      data: { region },
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
      platform: 'cryptopanic',
      source: 'client',
      message: `Updated CryptoPanic check interval to ${intervalSeconds}s`,
      data: { interval: intervalSeconds },
      severity: 'info'
    })
  }
}

// Export singleton instance
export const cryptoPanicClient = new CryptoPanicClient()