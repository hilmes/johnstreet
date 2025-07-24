import { TwitterApi, ETwitterStreamEvent, TweetV2SingleStreamResult } from 'twitter-api-v2'
import { activityLoggerKV } from '@/lib/sentiment/ActivityLoggerKV'
import { SentimentAnalyzer, SocialMediaPost } from '@/lib/sentiment/SentimentAnalyzer'
import { CryptoSymbolExtractor } from '@/lib/sentiment/CryptoSymbolExtractor'

export interface TwitterStreamConfig {
  bearerToken: string
  keywords: string[]
  userIds?: string[] // Crypto influencers to track
  active: boolean
  maxTweetsPerMinute: number
  retryAttempts: number
  retryDelay: number // seconds
}

export interface StreamedTweet {
  id: string
  text: string
  author_id: string
  author_username?: string
  created_at: string
  public_metrics: {
    like_count: number
    retweet_count: number
    reply_count: number
    quote_count: number
  }
  context_annotations?: any[]
  entities?: {
    hashtags?: Array<{ tag: string }>
    cashtags?: Array<{ tag: string }>
    mentions?: Array<{ username: string }>
    urls?: Array<{ expanded_url: string }>
  }
}

export interface ProcessedTweet extends StreamedTweet {
  sentiment: number
  symbols: string[]
  pumpIndicators: string[]
  riskScore: number
  processed: number
}

export class TwitterStreamingClient {
  private client: TwitterApi | null = null
  private stream: any = null
  private sentimentAnalyzer: SentimentAnalyzer
  private config: TwitterStreamConfig | null = null
  private isStreaming = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private tweetsThisMinute = 0
  private minuteResetTimer: NodeJS.Timeout | null = null
  private streamRules: any[] = []

  // High-profile crypto influencers to track
  private cryptoInfluencers = [
    'elonmusk', 'VitalikButerin', 'cz_binance', 'SBF_FTX', 'brian_armstrong',
    'justinsuntron', 'erikvoorhees', 'barrysilbert', 'novogratz', 'naval',
    'balajis', 'APompliano', 'documentingbtc', 'WhalePanda', 'PlanB_99',
    'RyanSAdams', 'lawmaster', 'MMCrypto', 'TheCryptoDog', 'CryptoCobain'
  ]

  // Default crypto-related keywords for streaming
  private defaultKeywords = [
    'bitcoin', 'BTC', 'ethereum', 'ETH', 'crypto', 'cryptocurrency',
    'blockchain', 'DeFi', 'NFT', 'altcoin', 'pump', 'moon', 'rocket',
    '$BTC', '$ETH', '$ADA', '$SOL', '$DOGE', '$SHIB', '$MATIC',
    'pump and dump', 'moonshot', 'diamond hands', 'HODL', 'to the moon',
    'crypto gem', 'hidden gem', 'new coin', 'presale', 'IDO', 'ICO'
  ]

  constructor() {
    this.sentimentAnalyzer = new SentimentAnalyzer()
  }

  async initialize(config: TwitterStreamConfig): Promise<void> {
    this.config = config

    try {
      this.client = new TwitterApi(config.bearerToken)
      
      // Test connection
      await this.client.v2.me()
      
      await activityLoggerKV.log({
        type: 'api_call',
        platform: 'twitter',
        source: 'streaming_client',
        message: 'Twitter Streaming API client initialized',
        data: { 
          keywordCount: config.keywords.length,
          userIdCount: config.userIds?.length || 0,
          maxTweetsPerMinute: config.maxTweetsPerMinute
        },
        severity: 'success'
      })

    } catch (error) {
      await activityLoggerKV.logError(
        'Twitter Streaming Client',
        'Failed to initialize Twitter API client',
        error
      )
      throw error
    }
  }

  async startStreaming(): Promise<void> {
    if (!this.client || !this.config) {
      throw new Error('Twitter client not initialized')
    }

    if (this.isStreaming) {
      await activityLoggerKV.log({
        type: 'api_call',
        platform: 'twitter',
        source: 'streaming_client',
        message: 'Twitter stream already active',
        severity: 'warning'
      })
      return
    }

    try {
      // Set up stream rules
      await this.setupStreamRules()

      // Start the stream
      this.stream = await this.client.v2.searchStream({
        'tweet.fields': [
          'created_at', 'author_id', 'public_metrics', 'context_annotations', 
          'entities', 'lang', 'possibly_sensitive', 'referenced_tweets'
        ],
        'user.fields': ['username', 'name', 'verified', 'public_metrics'],
        'expansions': ['author_id']
      })

      this.isStreaming = true
      this.reconnectAttempts = 0

      // Set up rate limiting
      this.setupRateLimiting()

      // Handle stream events
      this.stream.on(ETwitterStreamEvent.Data, async (tweet: TweetV2SingleStreamResult) => {
        await this.processTweet(tweet)
      })

      this.stream.on(ETwitterStreamEvent.DataError, async (error: any) => {
        await activityLoggerKV.logError(
          'Twitter Stream',
          'Data processing error',
          error
        )
      })

      this.stream.on(ETwitterStreamEvent.ConnectionError, async (error: any) => {
        await activityLoggerKV.logError(
          'Twitter Stream',
          'Connection error',
          error
        )
        await this.handleReconnection()
      })

      this.stream.on(ETwitterStreamEvent.ConnectionClosed, async () => {
        this.isStreaming = false
        await activityLoggerKV.log({
          type: 'api_call',
          platform: 'twitter',
          source: 'streaming_client',
          message: 'Twitter stream connection closed',
          severity: 'warning'
        })
        
        if (this.config?.active) {
          await this.handleReconnection()
        }
      })

      await activityLoggerKV.log({
        type: 'api_call',
        platform: 'twitter',
        source: 'streaming_client',
        message: 'Twitter streaming started successfully',
        data: { 
          rulesCount: this.streamRules.length,
          keywords: this.config.keywords.slice(0, 10) // First 10 keywords
        },
        severity: 'success'
      })

    } catch (error) {
      this.isStreaming = false
      await activityLoggerKV.logError(
        'Twitter Streaming Client',
        'Failed to start Twitter stream',
        error
      )
      throw error
    }
  }

  async stopStreaming(): Promise<void> {
    if (!this.isStreaming) return

    this.isStreaming = false
    this.config!.active = false

    if (this.stream) {
      this.stream.close()
      this.stream = null
    }

    if (this.minuteResetTimer) {
      clearInterval(this.minuteResetTimer)
      this.minuteResetTimer = null
    }

    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'twitter',
      source: 'streaming_client',
      message: 'Twitter streaming stopped',
      severity: 'info'
    })
  }

  private async setupStreamRules(): Promise<void> {
    if (!this.client || !this.config) return

    try {
      // Delete existing rules
      const existingRules = await this.client.v2.streamRules()
      if (existingRules.data?.length) {
        const ruleIds = existingRules.data.map(rule => rule.id)
        await this.client.v2.updateStreamRules({
          delete: { ids: ruleIds }
        })
      }

      // Create new rules
      const rules = []

      // Add keyword rules (combine keywords to reduce rule count)
      const keywordBatches = this.chunkArray(this.config.keywords, 10) // Max 10 keywords per rule
      for (let i = 0; i < keywordBatches.length; i++) {
        const keywords = keywordBatches[i]
        rules.push({
          value: `(${keywords.join(' OR ')}) lang:en -is:retweet`,
          tag: `crypto_keywords_${i + 1}`
        })
      }

      // Add influencer rules
      if (this.config.userIds && this.config.userIds.length > 0) {
        const userBatches = this.chunkArray(this.config.userIds, 20) // Max 20 users per rule
        for (let i = 0; i < userBatches.length; i++) {
          const users = userBatches[i]
          rules.push({
            value: `from:${users.join(' OR from:')} -is:retweet`,
            tag: `crypto_influencers_${i + 1}`
          })
        }
      }

      // Add default crypto tracking rules
      rules.push({
        value: '(#bitcoin OR #ethereum OR #crypto OR #cryptocurrency) lang:en -is:retweet',
        tag: 'crypto_hashtags'
      })

      rules.push({
        value: '($BTC OR $ETH OR $ADA OR $SOL OR $DOGE) lang:en -is:retweet',
        tag: 'crypto_cashtags'
      })

      // High-risk pump terms
      rules.push({
        value: '(pump OR moon OR rocket OR "diamond hands" OR "to the moon") (crypto OR bitcoin OR coin) lang:en -is:retweet',
        tag: 'pump_indicators'
      })

      // Apply rules (Twitter allows max 25 rules)
      const rulesToApply = rules.slice(0, 25)
      const result = await this.client.v2.updateStreamRules({
        add: rulesToApply
      })

      this.streamRules = result.data || []

      await activityLoggerKV.log({
        type: 'api_call',
        platform: 'twitter',
        source: 'streaming_client',
        message: `Set up ${this.streamRules.length} Twitter stream rules`,
        data: { 
          rulesCount: this.streamRules.length,
          rulesApplied: rulesToApply.length
        },
        severity: 'success'
      })

    } catch (error) {
      await activityLoggerKV.logError(
        'Twitter Stream Rules',
        'Failed to setup stream rules',
        error
      )
      throw error
    }
  }

  private setupRateLimiting(): void {
    this.tweetsThisMinute = 0
    this.minuteResetTimer = setInterval(() => {
      this.tweetsThisMinute = 0
    }, 60000) // Reset every minute
  }

  private async processTweet(tweetData: TweetV2SingleStreamResult): Promise<void> {
    // Rate limiting check
    if (this.tweetsThisMinute >= this.config!.maxTweetsPerMinute) {
      return // Skip processing if rate limit reached
    }

    this.tweetsThisMinute++

    try {
      const tweet = tweetData.data
      const includes = tweetData.includes

      // Get author info
      const author = includes?.users?.find(user => user.id === tweet.author_id)

      const streamedTweet: StreamedTweet = {
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author_id,
        author_username: author?.username,
        created_at: tweet.created_at || new Date().toISOString(),
        public_metrics: tweet.public_metrics,
        context_annotations: tweet.context_annotations,
        entities: tweet.entities
      }

      // Convert to social media post format
      const socialPost: SocialMediaPost = {
        id: tweet.id,
        text: tweet.text,
        author: author?.username || tweet.author_id,
        timestamp: new Date(tweet.created_at || Date.now()).getTime(),
        platform: 'twitter',
        engagement: {
          likes: tweet.public_metrics.like_count,
          retweets: tweet.public_metrics.retweet_count,
          comments: tweet.public_metrics.reply_count
        },
        metadata: {
          author_id: tweet.author_id,
          quote_count: tweet.public_metrics.quote_count,
          hashtags: tweet.entities?.hashtags?.map(h => h.tag) || [],
          cashtags: tweet.entities?.cashtags?.map(c => c.tag) || [],
          mentions: tweet.entities?.mentions?.map(m => m.username) || [],
          verified: author?.verified || false,
          followers: author?.public_metrics?.followers_count || 0
        }
      }

      // Analyze sentiment
      const sentimentResult = this.sentimentAnalyzer.analyzePosts([socialPost])
      
      // Extract crypto symbols
      const extractedSymbols = CryptoSymbolExtractor.extractSymbols(socialPost.text)
      const symbols = extractedSymbols.map(s => s.symbol)

      // Detect pump indicators
      const pumpKeywords = [
        'moon', 'moonshot', 'rocket', 'pump', '100x', '1000x', 'diamond hands',
        'ape in', 'yolo', 'to the moon', 'lambo', 'get rich', 'easy money',
        'gem', 'hidden gem', 'new project', 'just launched', 'presale'
      ]
      
      const pumpIndicators = pumpKeywords.filter(keyword => 
        socialPost.text.toLowerCase().includes(keyword)
      )

      // Calculate risk score
      let riskScore = 0
      riskScore += pumpIndicators.length * 0.2
      riskScore += (extractedSymbols.length > 3) ? 0.3 : 0
      riskScore += (tweet.public_metrics.retweet_count > 100) ? 0.2 : 0
      riskScore += (author?.verified) ? -0.1 : 0.1
      riskScore += (socialPost.text.includes('🚀') || socialPost.text.includes('💎')) ? 0.15 : 0
      riskScore = Math.max(0, Math.min(1, riskScore))

      const processedTweet: ProcessedTweet = {
        ...streamedTweet,
        sentiment: sentimentResult.overallSentiment.score,
        symbols,
        pumpIndicators,
        riskScore,
        processed: Date.now()
      }

      // Log tweet processing
      await activityLoggerKV.log({
        type: 'twitter_scan',
        platform: 'twitter',
        source: author?.username || 'stream',
        message: `Processed tweet: ${tweet.text.substring(0, 100)}${tweet.text.length > 100 ? '...' : ''}`,
        data: {
          tweetId: tweet.id,
          author: author?.username,
          sentiment: processedTweet.sentiment,
          symbols: symbols.length,
          pumpIndicators: pumpIndicators.length,
          riskScore: riskScore,
          engagement: tweet.public_metrics.like_count + tweet.public_metrics.retweet_count
        },
        severity: 'info'
      })

      // Log symbol detections
      if (symbols.length > 0) {
        await activityLoggerKV.logSymbolDetection(
          symbols,
          `@${author?.username || 'unknown'} (Stream)`,
          {
            totalMentions: symbols.length,
            sentiment: processedTweet.sentiment,
            pumpIndicators: pumpIndicators.length,
            engagement: tweet.public_metrics.like_count + tweet.public_metrics.retweet_count
          }
        )
      }

      // Log pump alerts for high-risk tweets
      if (riskScore > 0.6 && symbols.length > 0) {
        for (const symbol of symbols) {
          await activityLoggerKV.logPumpAlert(
            symbol,
            riskScore > 0.8 ? 'high' : 'medium',
            riskScore,
            `@${author?.username || 'unknown'} (Stream)`
          )
        }
      }

      // Special handling for crypto influencers
      if (author?.username && this.cryptoInfluencers.includes(author.username.toLowerCase())) {
        await activityLoggerKV.log({
          type: 'twitter_scan',
          platform: 'twitter',
          source: 'crypto_influencer',
          message: `🌟 INFLUENCER ALERT: @${author.username} tweeted about crypto`,
          data: {
            influencer: author.username,
            followers: author.public_metrics?.followers_count,
            text: tweet.text,
            symbols,
            sentiment: processedTweet.sentiment
          },
          severity: 'warning'
        })
      }

    } catch (error) {
      await activityLoggerKV.logError(
        'Twitter Stream Processing',
        'Failed to process streamed tweet',
        error
      )
    }
  }

  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      await activityLoggerKV.log({
        type: 'error',
        platform: 'twitter',
        source: 'streaming_client',
        message: `Max reconnection attempts (${this.maxReconnectAttempts}) reached. Stopping stream.`,
        severity: 'error'
      })
      this.config!.active = false
      return
    }

    this.reconnectAttempts++
    const delay = this.config!.retryDelay * this.reconnectAttempts * 1000

    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'twitter',
      source: 'streaming_client',
      message: `Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay/1000}s`,
      data: { attempt: this.reconnectAttempts, delay: delay/1000 },
      severity: 'warning'
    })

    setTimeout(async () => {
      try {
        await this.startStreaming()
      } catch (error) {
        await activityLoggerKV.logError(
          'Twitter Stream Reconnection',
          `Reconnection attempt ${this.reconnectAttempts} failed`,
          error
        )
        await this.handleReconnection()
      }
    }, delay)
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  // Status methods
  isActive(): boolean {
    return this.isStreaming
  }

  getConfig(): TwitterStreamConfig | null {
    return this.config
  }

  getStreamRules(): any[] {
    return this.streamRules
  }

  getStats(): {
    isStreaming: boolean
    reconnectAttempts: number
    tweetsThisMinute: number
    rulesCount: number
    config: TwitterStreamConfig | null
  } {
    return {
      isStreaming: this.isStreaming,
      reconnectAttempts: this.reconnectAttempts,
      tweetsThisMinute: this.tweetsThisMinute,
      rulesCount: this.streamRules.length,
      config: this.config
    }
  }

  // Configuration updates
  async updateKeywords(keywords: string[]): Promise<void> {
    if (!this.config) return

    this.config.keywords = keywords
    
    if (this.isStreaming) {
      await this.stopStreaming()
      await this.startStreaming()
    }

    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'twitter',
      source: 'streaming_client',
      message: `Updated Twitter stream keywords`,
      data: { keywordCount: keywords.length },
      severity: 'info'
    })
  }

  async updateInfluencers(userIds: string[]): Promise<void> {
    if (!this.config) return

    this.config.userIds = userIds
    
    if (this.isStreaming) {
      await this.stopStreaming()
      await this.startStreaming()
    }

    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'twitter',
      source: 'streaming_client',
      message: `Updated Twitter stream influencers`,
      data: { influencerCount: userIds.length },
      severity: 'info'
    })
  }
}

// Export singleton instance
export const twitterStreamingClient = new TwitterStreamingClient()