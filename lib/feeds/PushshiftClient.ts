import { activityLoggerKV } from '@/lib/sentiment/ActivityLoggerKV'
import { SentimentAnalyzer, SocialMediaPost } from '@/lib/sentiment/SentimentAnalyzer'
import { CryptoSymbolExtractor } from '@/lib/sentiment/CryptoSymbolExtractor'

export interface PushshiftConfig {
  baseUrl: string
  maxResults: number
  rateLimit: number // requests per minute
  retryAttempts: number
  retryDelay: number // seconds
  active: boolean
}

export interface PushshiftSubmission {
  author: string
  created_utc: number
  domain?: string
  full_link: string
  id: string
  is_self: boolean
  num_comments: number
  permalink: string
  score: number
  selftext: string
  subreddit: string
  title: string
  url: string
  upvote_ratio?: number
  distinguished?: string
  stickied: boolean
  over_18: boolean
  spoiler: boolean
  locked: boolean
  link_flair_text?: string
  author_flair_text?: string
}

export interface PushshiftComment {
  author: string
  body: string
  created_utc: number
  id: string
  link_id: string
  parent_id: string
  permalink: string
  score: number
  subreddit: string
  subreddit_id: string
  controversiality?: number
  distinguished?: string
  edited?: boolean | number
  gilded?: number
  is_submitter?: boolean
  stickied?: boolean
}

export interface ProcessedPushshiftData {
  submissions: Array<{
    submission: PushshiftSubmission
    sentiment: number
    symbols: string[]
    pumpIndicators: string[]
    riskScore: number
    processed: number
  }>
  comments: Array<{
    comment: PushshiftComment
    sentiment: number
    symbols: string[]
    pumpIndicators: string[]
    riskScore: number
    processed: number
  }>
}

export interface PushshiftResponse<T> {
  data: T[]
}

export interface HistoricalSearchParams {
  subreddit?: string
  author?: string
  q?: string // search query
  title?: string
  selftext?: string
  after?: number // timestamp
  before?: number // timestamp
  sort?: 'asc' | 'desc'
  sort_type?: 'score' | 'num_comments' | 'created_utc'
  size: number
}

export class PushshiftClient {
  private config: PushshiftConfig | null = null
  private sentimentAnalyzer: SentimentAnalyzer
  private requestQueue: Array<() => Promise<any>> = []
  private isProcessingQueue = false
  private requestCount = 0
  private requestResetTime = 0

  // Crypto-focused subreddits for historical analysis
  private cryptoSubreddits = [
    'CryptoCurrency',
    'Bitcoin',
    'ethereum',
    'CryptoMoonShots',
    'SatoshiStreetBets',
    'altcoin',
    'CryptoMarkets',
    'defi',
    'NFT',
    'CryptoCurrencyTrading',
    'ico',
    'cryptocurrency_news',
    'crypto_bets',
    'pennycrypto',
    'Crypto_General'
  ]

  constructor() {
    this.sentimentAnalyzer = new SentimentAnalyzer()
  }

  async initialize(config: PushshiftConfig): Promise<void> {
    this.config = config
    this.requestResetTime = Date.now() + 60000 // Reset every minute

    try {
      // Test API connection
      await this.testConnection()

      await activityLoggerKV.log({
        type: 'api_call',
        platform: 'pushshift',
        source: 'client',
        message: 'Pushshift API client initialized',
        data: { 
          maxResults: config.maxResults,
          rateLimit: config.rateLimit,
          cryptoSubreddits: this.cryptoSubreddits.length
        },
        severity: 'success'
      })

    } catch (error) {
      await activityLoggerKV.logError(
        'Pushshift Client',
        'Failed to initialize Pushshift API client',
        error
      )
      throw error
    }
  }

  private async testConnection(): Promise<void> {
    try {
      const url = this.buildApiUrl('submission/search', { size: 1 })
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'JohnStreet-Pushshift-Client/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`Pushshift API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Pushshift API connection successful')
    } catch (error) {
      throw new Error(`Failed to connect to Pushshift API: ${error}`)
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

  private async makeRateLimitedRequest<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestFunction = async () => {
        try {
          // Check rate limit
          const now = Date.now()
          if (now > this.requestResetTime) {
            this.requestCount = 0
            this.requestResetTime = now + 60000
          }

          if (this.requestCount >= this.config!.rateLimit) {
            const waitTime = this.requestResetTime - now
            await new Promise(resolve => setTimeout(resolve, waitTime))
            this.requestCount = 0
            this.requestResetTime = Date.now() + 60000
          }

          const response = await fetch(url, {
            headers: {
              'User-Agent': 'JohnStreet-Pushshift-Client/1.0'
            }
          })

          this.requestCount++

          if (!response.ok) {
            throw new Error(`Pushshift API error: ${response.status} ${response.statusText}`)
          }

          const data = await response.json()
          resolve(data)
        } catch (error) {
          reject(error)
        }
      }

      this.requestQueue.push(requestFunction)
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return

    this.isProcessingQueue = true

    while (this.requestQueue.length > 0) {
      const requestFunction = this.requestQueue.shift()!
      try {
        await requestFunction()
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error('Queue request failed:', error)
      }
    }

    this.isProcessingQueue = false
  }

  async searchHistoricalPosts(params: HistoricalSearchParams): Promise<ProcessedPushshiftData> {
    if (!this.config) {
      throw new Error('Pushshift client not initialized')
    }

    const timer = activityLoggerKV.startTimer(`Pushshift historical search`)

    try {
      const searchParams = {
        ...params,
        size: Math.min(params.size, this.config.maxResults)
      }

      // Search submissions
      const submissionsUrl = this.buildApiUrl('submission/search', searchParams)
      const submissionsResponse = await this.makeRateLimitedRequest<PushshiftResponse<PushshiftSubmission>>(submissionsUrl)

      // Search comments (if needed)
      const commentsUrl = this.buildApiUrl('comment/search', {
        ...searchParams,
        size: Math.min(50, searchParams.size) // Limit comments to avoid overwhelming data
      })
      const commentsResponse = await this.makeRateLimitedRequest<PushshiftResponse<PushshiftComment>>(commentsUrl)

      // Process the data
      const processedData = await this.processHistoricalData(
        submissionsResponse.data,
        commentsResponse.data
      )

      const duration = timer()
      await activityLoggerKV.log({
        type: 'reddit_scan',
        platform: 'pushshift',
        source: 'historical_search',
        message: `Historical search completed`,
        data: { 
          submissions: processedData.submissions.length,
          comments: processedData.comments.length,
          searchParams: {
            subreddit: params.subreddit,
            query: params.q,
            timeRange: params.after && params.before ? 
              `${new Date(params.after * 1000).toISOString()} to ${new Date(params.before * 1000).toISOString()}` : 
              'unspecified'
          }
        },
        duration,
        severity: 'success'
      })

      return processedData

    } catch (error) {
      await activityLoggerKV.logError(
        'Pushshift Client',
        'Failed to perform historical search',
        error
      )
      throw error
    }
  }

  async searchSymbolHistory(
    symbol: string, 
    daysBack: number = 30, 
    maxResults: number = 100
  ): Promise<ProcessedPushshiftData> {
    const before = Math.floor(Date.now() / 1000) // Current time in seconds
    const after = before - (daysBack * 24 * 60 * 60) // Days back in seconds

    const searchTerms = [
      `$${symbol.toUpperCase()}`,
      symbol.toUpperCase(),
      `${symbol.toLowerCase()} coin`,
      `${symbol.toLowerCase()} crypto`
    ]

    const allResults: ProcessedPushshiftData = {
      submissions: [],
      comments: []
    }

    // Search each crypto subreddit for the symbol
    for (const subreddit of this.cryptoSubreddits.slice(0, 5)) { // Limit to top 5 to avoid rate limits
      for (const term of searchTerms.slice(0, 2)) { // Limit search terms
        try {
          const results = await this.searchHistoricalPosts({
            subreddit,
            q: term,
            after,
            before,
            size: Math.min(20, maxResults), // Limit per search
            sort: 'desc',
            sort_type: 'created_utc'
          })

          allResults.submissions.push(...results.submissions)
          allResults.comments.push(...results.comments)

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (error) {
          console.error(`Failed to search ${subreddit} for ${term}:`, error)
        }
      }
    }

    // Remove duplicates and sort by timestamp
    const uniqueSubmissions = Array.from(
      new Map(allResults.submissions.map(s => [s.submission.id, s])).values()
    ).sort((a, b) => b.submission.created_utc - a.submission.created_utc)

    const uniqueComments = Array.from(
      new Map(allResults.comments.map(c => [c.comment.id, c])).values()
    ).sort((a, b) => b.comment.created_utc - a.comment.created_utc)

    await activityLoggerKV.log({
      type: 'reddit_scan',
      platform: 'pushshift',
      source: 'symbol_history',
      message: `Symbol history search for ${symbol} completed`,
      data: {
        symbol,
        daysBack,
        uniqueSubmissions: uniqueSubmissions.length,
        uniqueComments: uniqueComments.length,
        timeRange: `${new Date(after * 1000).toISOString()} to ${new Date(before * 1000).toISOString()}`
      },
      severity: 'success'
    })

    return {
      submissions: uniqueSubmissions,
      comments: uniqueComments
    }
  }

  async getTrendingCryptoDiscussions(
    hours: number = 24,
    minScore: number = 10
  ): Promise<ProcessedPushshiftData> {
    const after = Math.floor((Date.now() - hours * 60 * 60 * 1000) / 1000)

    const cryptoKeywords = [
      'bitcoin', 'ethereum', 'crypto', 'cryptocurrency', 'DeFi', 'NFT',
      'pump', 'moon', 'altcoin', 'shitcoin', 'memecoin', 'HODL'
    ]

    const allResults: ProcessedPushshiftData = {
      submissions: [],
      comments: []
    }

    // Search high-activity crypto subreddits
    const highActivitySubreddits = ['CryptoCurrency', 'CryptoMoonShots', 'SatoshiStreetBets']

    for (const subreddit of highActivitySubreddits) {
      for (const keyword of cryptoKeywords.slice(0, 3)) { // Limit keywords per subreddit
        try {
          const results = await this.searchHistoricalPosts({
            subreddit,
            q: keyword,
            after,
            size: 25,
            sort: 'desc',
            sort_type: 'score'
          })

          // Filter by minimum score
          const filteredSubmissions = results.submissions.filter(
            s => s.submission.score >= minScore
          )
          const filteredComments = results.comments.filter(
            c => c.comment.score >= Math.floor(minScore / 2)
          )

          allResults.submissions.push(...filteredSubmissions)
          allResults.comments.push(...filteredComments)

          await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (error) {
          console.error(`Failed to search trending discussions in ${subreddit}:`, error)
        }
      }
    }

    // Sort by score and limit results
    allResults.submissions.sort((a, b) => b.submission.score - a.submission.score)
    allResults.comments.sort((a, b) => b.comment.score - a.comment.score)

    allResults.submissions = allResults.submissions.slice(0, 50)
    allResults.comments = allResults.comments.slice(0, 100)

    await activityLoggerKV.log({
      type: 'reddit_scan',
      platform: 'pushshift',
      source: 'trending_discussions',
      message: `Trending crypto discussions search completed`,
      data: {
        hours,
        minScore,
        submissions: allResults.submissions.length,
        comments: allResults.comments.length,
        avgSubmissionScore: allResults.submissions.length > 0 ?
          allResults.submissions.reduce((sum, s) => sum + s.submission.score, 0) / allResults.submissions.length : 0
      },
      severity: 'success'
    })

    return allResults
  }

  private async processHistoricalData(
    submissions: PushshiftSubmission[],
    comments: PushshiftComment[]
  ): Promise<ProcessedPushshiftData> {
    const processedSubmissions = []
    const processedComments = []

    // Process submissions
    for (const submission of submissions) {
      try {
        const processedSubmission = await this.processSubmission(submission)
        processedSubmissions.push(processedSubmission)
      } catch (error) {
        await activityLoggerKV.logError(
          'Pushshift Submission Processing',
          `Failed to process submission ${submission.id}`,
          error
        )
      }
    }

    // Process comments
    for (const comment of comments) {
      try {
        const processedComment = await this.processComment(comment)
        processedComments.push(processedComment)
      } catch (error) {
        await activityLoggerKV.logError(
          'Pushshift Comment Processing',
          `Failed to process comment ${comment.id}`,
          error
        )
      }
    }

    // Log batch processing summary
    if (processedSubmissions.length > 0 || processedComments.length > 0) {
      await activityLoggerKV.log({
        type: 'reddit_scan',
        platform: 'pushshift',
        source: 'batch_processor',
        message: `Processed ${processedSubmissions.length} submissions and ${processedComments.length} comments`,
        data: {
          submissionsProcessed: processedSubmissions.length,
          commentsProcessed: processedComments.length,
          avgSubmissionSentiment: processedSubmissions.length > 0 ?
            processedSubmissions.reduce((sum, s) => sum + s.sentiment, 0) / processedSubmissions.length : 0,
          totalSymbols: processedSubmissions.reduce((sum, s) => sum + s.symbols.length, 0) +
                       processedComments.reduce((sum, c) => sum + c.symbols.length, 0)
        },
        severity: 'success'
      })
    }

    return {
      submissions: processedSubmissions,
      comments: processedComments
    }
  }

  private async processSubmission(submission: PushshiftSubmission): Promise<ProcessedPushshiftData['submissions'][0]> {
    const socialPost: SocialMediaPost = {
      id: submission.id,
      text: `${submission.title} ${submission.selftext || ''}`,
      author: submission.author,
      timestamp: submission.created_utc * 1000,
      platform: 'reddit',
      engagement: {
        likes: submission.score,
        retweets: 0, // Not applicable for Reddit
        comments: submission.num_comments
      },
      metadata: {
        subreddit: submission.subreddit,
        url: submission.url,
        upvote_ratio: submission.upvote_ratio,
        is_self: submission.is_self,
        over_18: submission.over_18,
        link_flair_text: submission.link_flair_text,
        author_flair_text: submission.author_flair_text,
        stickied: submission.stickied,
        locked: submission.locked
      }
    }

    // Analyze sentiment
    const sentimentResult = this.sentimentAnalyzer.analyzePosts([socialPost])
    
    // Extract crypto symbols
    const extractedSymbols = CryptoSymbolExtractor.extractSymbols(socialPost.text)
    const symbols = extractedSymbols.map(s => s.symbol)

    // Detect pump indicators
    const pumpKeywords = [
      'pump', 'moon', 'rocket', '100x', '1000x', 'diamond hands', 'ape in',
      'yolo', 'to the moon', 'lambo', 'easy money', 'gem', 'hidden gem',
      'moonshot', 'breakout', 'surge', 'bullish', 'bull run', 'parabolic'
    ]
    
    const pumpIndicators = pumpKeywords.filter(keyword => 
      socialPost.text.toLowerCase().includes(keyword)
    )

    // Calculate risk score
    let riskScore = 0
    riskScore += pumpIndicators.length * 0.15
    riskScore += (submission.subreddit === 'CryptoMoonShots') ? 0.4 : 0
    riskScore += (submission.subreddit === 'SatoshiStreetBets') ? 0.3 : 0
    riskScore += (symbols.length > 5) ? 0.3 : 0
    riskScore += (submission.score < 5 && pumpIndicators.length > 2) ? 0.4 : 0
    riskScore += (submission.over_18) ? 0.2 : 0
    
    // Reduce risk for high-quality posts
    if (submission.score > 100 && submission.num_comments > 50) {
      riskScore -= 0.2
    }
    
    if (submission.upvote_ratio && submission.upvote_ratio > 0.8) {
      riskScore -= 0.1
    }
    
    riskScore = Math.max(0, Math.min(1, riskScore))

    // Log submission processing
    await activityLoggerKV.log({
      type: 'reddit_scan',
      platform: 'pushshift',
      source: `r/${submission.subreddit}`,
      message: `Processed historical submission: ${submission.title.substring(0, 100)}${submission.title.length > 100 ? '...' : ''}`,
      data: {
        submissionId: submission.id,
        author: submission.author,
        subreddit: submission.subreddit,
        score: submission.score,
        comments: submission.num_comments,
        sentiment: sentimentResult.overallSentiment.score,
        symbols: symbols.length,
        pumpIndicators: pumpIndicators.length,
        riskScore,
        age: Math.floor((Date.now() - submission.created_utc * 1000) / (1000 * 60 * 60 * 24)) // days old
      },
      severity: 'info'
    })

    // Log symbol detections
    if (symbols.length > 0) {
      await activityLoggerKV.logSymbolDetection(
        symbols,
        `r/${submission.subreddit} (Historical)`,
        {
          totalMentions: symbols.length,
          sentiment: sentimentResult.overallSentiment.score,
          pumpIndicators: pumpIndicators.length,
          engagement: submission.score + submission.num_comments
        }
      )
    }

    // Log pump alerts for high-risk historical posts
    if (riskScore > 0.7 && symbols.length > 0) {
      for (const symbol of symbols) {
        await activityLoggerKV.logPumpAlert(
          symbol,
          riskScore > 0.85 ? 'high' : 'medium',
          riskScore,
          `r/${submission.subreddit} (Historical)`
        )
      }
    }

    return {
      submission,
      sentiment: sentimentResult.overallSentiment.score,
      symbols,
      pumpIndicators,
      riskScore,
      processed: Date.now()
    }
  }

  private async processComment(comment: PushshiftComment): Promise<ProcessedPushshiftData['comments'][0]> {
    const socialPost: SocialMediaPost = {
      id: comment.id,
      text: comment.body,
      author: comment.author,
      timestamp: comment.created_utc * 1000,
      platform: 'reddit',
      engagement: {
        likes: comment.score,
        retweets: 0,
        comments: 0
      },
      metadata: {
        subreddit: comment.subreddit,
        link_id: comment.link_id,
        parent_id: comment.parent_id,
        controversiality: comment.controversiality,
        distinguished: comment.distinguished,
        is_submitter: comment.is_submitter,
        stickied: comment.stickied
      }
    }

    // Analyze sentiment
    const sentimentResult = this.sentimentAnalyzer.analyzePosts([socialPost])
    
    // Extract crypto symbols
    const extractedSymbols = CryptoSymbolExtractor.extractSymbols(socialPost.text)
    const symbols = extractedSymbols.map(s => s.symbol)

    // Detect pump indicators
    const pumpKeywords = [
      'pump', 'moon', 'rocket', '100x', '1000x', 'diamond hands', 'ape in',
      'yolo', 'to the moon', 'lambo', 'easy money', 'gem', 'hidden gem'
    ]
    
    const pumpIndicators = pumpKeywords.filter(keyword => 
      socialPost.text.toLowerCase().includes(keyword)
    )

    // Calculate risk score
    let riskScore = 0
    riskScore += pumpIndicators.length * 0.2
    riskScore += (comment.subreddit === 'CryptoMoonShots') ? 0.4 : 0
    riskScore += (comment.subreddit === 'SatoshiStreetBets') ? 0.3 : 0
    riskScore += (symbols.length > 3) ? 0.25 : 0
    riskScore += (comment.score < 0) ? 0.3 : 0
    riskScore += (comment.controversiality && comment.controversiality > 0) ? 0.2 : 0
    
    // Reduce risk for quality comments
    if (comment.score > 10) {
      riskScore -= 0.15
    }
    
    riskScore = Math.max(0, Math.min(1, riskScore))

    // Only log high-value comments to avoid spam
    if (symbols.length > 0 || pumpIndicators.length > 0 || comment.score > 5) {
      await activityLoggerKV.log({
        type: 'reddit_scan',
        platform: 'pushshift',
        source: `r/${comment.subreddit}`,
        message: `Processed historical comment: ${comment.body.substring(0, 100)}${comment.body.length > 100 ? '...' : ''}`,
        data: {
          commentId: comment.id,
          author: comment.author,
          subreddit: comment.subreddit,
          score: comment.score,
          sentiment: sentimentResult.overallSentiment.score,
          symbols: symbols.length,
          pumpIndicators: pumpIndicators.length,
          riskScore,
          controversiality: comment.controversiality
        },
        severity: 'info'
      })

      // Log symbol detections
      if (symbols.length > 0) {
        await activityLoggerKV.logSymbolDetection(
          symbols,
          `r/${comment.subreddit} (Historical Comment)`,
          {
            totalMentions: symbols.length,
            sentiment: sentimentResult.overallSentiment.score,
            pumpIndicators: pumpIndicators.length,
            engagement: comment.score
          }
        )
      }
    }

    return {
      comment,
      sentiment: sentimentResult.overallSentiment.score,
      symbols,
      pumpIndicators,
      riskScore,
      processed: Date.now()
    }
  }

  // Public API methods
  getCryptoSubreddits(): string[] {
    return [...this.cryptoSubreddits]
  }

  // Status methods
  getConfig(): PushshiftConfig | null {
    return this.config
  }

  getRequestStats(): {
    requestCount: number
    requestResetTime: number
    queueLength: number
    isProcessingQueue: boolean
  } {
    return {
      requestCount: this.requestCount,
      requestResetTime: this.requestResetTime,
      queueLength: this.requestQueue.length,
      isProcessingQueue: this.isProcessingQueue
    }
  }

  // Configuration updates
  async updateSubreddits(subreddits: string[]): Promise<void> {
    this.cryptoSubreddits = subreddits

    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'pushshift',
      source: 'client',
      message: `Updated Pushshift monitored subreddits`,
      data: { subredditCount: subreddits.length, subreddits: subreddits.slice(0, 10) },
      severity: 'info'
    })
  }

  async updateRateLimit(requestsPerMinute: number): Promise<void> {
    if (!this.config) return

    this.config.rateLimit = requestsPerMinute
    this.requestCount = 0 // Reset current count
    this.requestResetTime = Date.now() + 60000

    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'pushshift',
      source: 'client',
      message: `Updated Pushshift rate limit to ${requestsPerMinute} requests/minute`,
      data: { rateLimit: requestsPerMinute },
      severity: 'info'
    })
  }
}

// Export singleton instance
export const pushshiftClient = new PushshiftClient()