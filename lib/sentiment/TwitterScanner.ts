import fetch from 'node-fetch'
import { SocialMediaPost, SentimentAnalyzer, CryptoPumpSignal } from './SentimentAnalyzer'
import { CryptoSymbolExtractor } from './CryptoSymbolExtractor'
import { activityLoggerKV } from './ActivityLoggerKV'

export interface TwitterCredentials {
  bearerToken?: string
  apiKey?: string
  apiSecret?: string
  accessToken?: string
  accessTokenSecret?: string
}

export interface TwitterPost {
  id: string
  text: string
  author: string
  author_id: string
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
  lang?: string
  possibly_sensitive?: boolean
  referenced_tweets?: Array<{ type: string; id: string }>
}

export interface TwitterSearchResult {
  data: TwitterPost[]
  meta: {
    newest_id?: string
    oldest_id?: string
    result_count: number
    next_token?: string
  }
  includes?: {
    users?: Array<{
      id: string
      username: string
      name: string
      verified?: boolean
      public_metrics?: {
        followers_count: number
        following_count: number
        tweet_count: number
      }
    }>
  }
}

export interface TwitterAnalysis {
  query: string
  posts: TwitterPost[]
  sentimentScore: number
  pumpSignals: CryptoPumpSignal[]
  metrics: {
    totalPosts: number
    totalEngagement: number
    avgEngagement: number
    uniqueAuthors: number
    verifiedAuthors: number
    hotHashtags: string[]
    suspiciousActivity: boolean
    influencerActivity: boolean
  }
  timestamp: number
}

export class TwitterScanner {
  private credentials: TwitterCredentials | null = null
  private sentimentAnalyzer: SentimentAnalyzer
  private isConnected: boolean = false
  private baseUrl = 'https://api.twitter.com/2'
  
  // Crypto-related search terms for Twitter
  private cryptoQueries = [
    '($BTC OR $ETH OR $ADA OR $SOL OR $DOGE) lang:en -is:retweet',
    '(crypto OR cryptocurrency OR bitcoin OR ethereum) lang:en -is:retweet',
    '(pump OR moon OR rocket OR diamond hands) (crypto OR $) lang:en -is:retweet',
    '(DeFi OR NFT OR Web3) lang:en -is:retweet',
    '(altcoin OR shitcoin OR memecoin) lang:en -is:retweet'
  ]

  // High-volume crypto influencer usernames (for tracking)
  private cryptoInfluencers = new Set([
    'elonmusk',
    'VitalikButerin',
    'cz_binance',
    'SBF_FTX',
    'brian_armstrong',
    'justinsuntron',
    'erikvoorhees',
    'barrysilbert',
    'novogratz',
    'naval',
    'balajis',
    'APompliano',
    'documentingbtc',
    'WhalePanda',
    'PlanB_99',
    'RyanSAdams',
    'lawmaster',
    'MMCrypto',
    'TheCryptoDog',
    'CryptoCobain'
  ])

  constructor() {
    this.sentimentAnalyzer = new SentimentAnalyzer()
  }

  async connect(credentials: TwitterCredentials): Promise<void> {
    if (!credentials.bearerToken) {
      throw new Error('Bearer token is required for Twitter API v2')
    }

    this.credentials = credentials
    
    try {
      // Test connection with a simple API call
      const response = await fetch(`${this.baseUrl}/users/me`, {
        headers: {
          'Authorization': `Bearer ${credentials.bearerToken}`,
          'User-Agent': 'JohnStreet-Sentiment-Scanner/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.status} ${response.statusText}`)
      }

      this.isConnected = true
      console.log('Connected to Twitter API v2')
    } catch (error) {
      this.isConnected = false
      throw new Error(`Failed to connect to Twitter: ${error}`)
    }
  }

  async connectPublic(): Promise<void> {
    // For public access, we'll use web scraping fallback (limited functionality)
    this.isConnected = false
    console.log('Public Twitter access - limited functionality available')
  }

  async searchTweets(
    query: string,
    maxResults: number = 100,
    hours: number = 24
  ): Promise<TwitterSearchResult> {
    const timer = activityLoggerKV.startTimer(`Twitter search: ${query}`)
    
    if (!this.credentials?.bearerToken) {
      throw new Error('Twitter credentials not configured')
    }

    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    
    const params = new URLSearchParams({
      query: query,
      max_results: Math.min(maxResults, 100).toString(),
      'tweet.fields': 'created_at,author_id,public_metrics,context_annotations,entities,lang,possibly_sensitive,referenced_tweets',
      'user.fields': 'username,name,verified,public_metrics',
      'expansions': 'author_id',
      'start_time': startTime
    })

    try {
      const response = await fetch(`${this.baseUrl}/tweets/search/recent?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.credentials.bearerToken}`,
          'User-Agent': 'JohnStreet-Sentiment-Scanner/1.0'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Twitter API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json() as TwitterSearchResult
      
      // Enhance posts with author information
      this.enhancePostsWithAuthors(data)

      // Log successful search
      const duration = timer()
      await activityLoggerKV.logTwitterScan(query, {
        result_count: data.meta.result_count,
        newest_id: data.meta.newest_id,
        oldest_id: data.meta.oldest_id,
        maxResults,
        hours
      }, duration)
      
      return data
    } catch (error) {
      // Log error
      await activityLoggerKV.logError(`Twitter search: ${query}`, 'Failed to search tweets', error)
      throw new Error(`Failed to search tweets: ${error}`)
    }
  }

  async searchCryptoSymbols(
    symbols: string[],
    hours: number = 24,
    maxResults: number = 100
  ): Promise<TwitterAnalysis[]> {
    const analyses: TwitterAnalysis[] = []

    for (const symbol of symbols) {
      try {
        const query = `$${symbol} OR #${symbol} lang:en -is:retweet`
        const searchResult = await this.searchTweets(query, maxResults, hours)
        
        if (searchResult.data && searchResult.data.length > 0) {
          const analysis = await this.analyzeTweets(searchResult, query)
          analyses.push(analysis)
        }

        // Rate limiting - Twitter API v2 allows 300 requests per 15 minutes
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Failed to search for symbol ${symbol}:`, error)
      }
    }

    return analyses
  }

  async monitorCryptoMentions(hours: number = 1): Promise<TwitterAnalysis[]> {
    const analyses: TwitterAnalysis[] = []

    for (const query of this.cryptoQueries) {
      try {
        const searchResult = await this.searchTweets(query, 100, hours)
        
        if (searchResult.data && searchResult.data.length > 0) {
          const analysis = await this.analyzeTweets(searchResult, query)
          analyses.push(analysis)
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`Failed to monitor query "${query}":`, error)
      }
    }

    return analyses
  }

  private enhancePostsWithAuthors(searchResult: TwitterSearchResult): void {
    if (!searchResult.includes?.users) return

    const userMap = new Map()
    for (const user of searchResult.includes.users) {
      userMap.set(user.id, user)
    }

    for (const post of searchResult.data) {
      const user = userMap.get(post.author_id)
      if (user) {
        post.author = user.username
      }
    }
  }

  private async analyzeTweets(
    searchResult: TwitterSearchResult,
    query: string
  ): Promise<TwitterAnalysis> {
    const posts = searchResult.data
    
    // Convert to SocialMediaPost format
    const socialPosts = this.convertToSocialPosts(posts)
    
    // Analyze sentiment
    const sentimentResult = this.sentimentAnalyzer.analyzePostsBatch(socialPosts)
    
    // Extract symbols and detect pump signals
    const symbols = this.extractCryptoSymbols(socialPosts)
    const pumpSignals: CryptoPumpSignal[] = []
    
    for (const symbol of symbols) {
      const symbolPosts = socialPosts.filter(post => 
        post.text.toLowerCase().includes(symbol.toLowerCase())
      )
      
      if (symbolPosts.length >= 3) {
        const signal = this.sentimentAnalyzer.detectPumpSignal(symbolPosts, symbol)
        
        // Add Twitter-specific enhancements
        signal.indicators.influencerActivity = this.detectTwitterInfluencers(symbolPosts)
        signal.indicators.coordinated = this.detectTwitterCoordination(posts)
        
        // Boost confidence for verified accounts or high engagement
        const highEngagementPosts = symbolPosts.filter(post => {
          const engagement = (post.engagement.likes || 0) + (post.engagement.retweets || 0)
          return engagement > 100
        })
        
        if (highEngagementPosts.length > 0) {
          signal.confidence = Math.min(1, signal.confidence * 1.2)
        }
        
        pumpSignals.push(signal)
      }
    }
    
    // Calculate metrics
    const metrics = this.calculateTwitterMetrics(posts, searchResult.includes?.users || [])
    
    return {
      query,
      posts,
      sentimentScore: sentimentResult.overallSentiment.score,
      pumpSignals: pumpSignals.sort((a, b) => b.confidence - a.confidence),
      metrics,
      timestamp: Date.now()
    }
  }

  private convertToSocialPosts(posts: TwitterPost[]): SocialMediaPost[] {
    return posts.map(post => ({
      id: post.id,
      text: post.text,
      author: post.author || post.author_id,
      timestamp: new Date(post.created_at).getTime(),
      platform: 'twitter' as const,
      engagement: {
        likes: post.public_metrics.like_count,
        retweets: post.public_metrics.retweet_count,
        comments: post.public_metrics.reply_count
      },
      metadata: {
        author_id: post.author_id,
        quote_count: post.public_metrics.quote_count,
        hashtags: post.entities?.hashtags?.map(h => h.tag) || [],
        cashtags: post.entities?.cashtags?.map(c => c.tag) || [],
        mentions: post.entities?.mentions?.map(m => m.username) || [],
        lang: post.lang,
        possibly_sensitive: post.possibly_sensitive,
        is_retweet: post.referenced_tweets?.some(ref => ref.type === 'retweeted') || false
      }
    }))
  }

  private extractCryptoSymbols(posts: SocialMediaPost[]): string[] {
    const symbols = new Set<string>()
    
    for (const post of posts) {
      const extractedSymbols = CryptoSymbolExtractor.extractSymbols(post.text)
      for (const symbol of extractedSymbols) {
        symbols.add(symbol.symbol)
      }
    }
    
    return Array.from(symbols)
  }

  private detectTwitterInfluencers(posts: SocialMediaPost[]): boolean {
    return posts.some(post => {
      // Check if author is a known crypto influencer
      if (this.cryptoInfluencers.has(post.author.toLowerCase())) {
        return true
      }
      
      // Check for high engagement (potential influencer)
      const engagement = (post.engagement.likes || 0) + (post.engagement.retweets || 0)
      return engagement > 500
    })
  }

  private detectTwitterCoordination(posts: TwitterPost[]): boolean {
    // Check for coordinated posting patterns
    const textSimilarity = new Map<string, number>()
    const authorFrequency = new Map<string, number>()
    
    for (const post of posts) {
      // Count similar text patterns (simplified)
      const normalizedText = post.text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      
      const words = normalizedText.split(' ')
      if (words.length > 5) {
        const key = words.slice(0, 5).join(' ')
        textSimilarity.set(key, (textSimilarity.get(key) || 0) + 1)
      }
      
      // Count posts per author
      authorFrequency.set(post.author, (authorFrequency.get(post.author) || 0) + 1)
    }
    
    // Suspicious if many similar texts or few authors posting frequently
    const maxSimilar = Math.max(...Array.from(textSimilarity.values()))
    const maxAuthorPosts = Math.max(...Array.from(authorFrequency.values()))
    
    return maxSimilar > 3 || maxAuthorPosts > 5
  }

  private calculateTwitterMetrics(
    posts: TwitterPost[],
    users: Array<{ id: string; username: string; verified?: boolean }>
  ): TwitterAnalysis['metrics'] {
    const userMap = new Map(users.map(u => [u.id, u]))
    
    const totalEngagement = posts.reduce((sum, post) => {
      return sum + post.public_metrics.like_count + 
             post.public_metrics.retweet_count + 
             post.public_metrics.reply_count + 
             post.public_metrics.quote_count
    }, 0)
    
    const uniqueAuthors = new Set(posts.map(p => p.author_id)).size
    const verifiedAuthors = posts.filter(p => {
      const user = userMap.get(p.author_id)
      return user?.verified
    }).length
    
    // Extract hashtags
    const allHashtags = posts.flatMap(p => p.entities?.hashtags?.map(h => h.tag) || [])
    const hashtagCount = new Map<string, number>()
    
    for (const tag of allHashtags) {
      hashtagCount.set(tag.toLowerCase(), (hashtagCount.get(tag.toLowerCase()) || 0) + 1)
    }
    
    const hotHashtags = Array.from(hashtagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag)
    
    // Detect suspicious activity
    const authorCounts = new Map<string, number>()
    for (const post of posts) {
      authorCounts.set(post.author, (authorCounts.get(post.author) || 0) + 1)
    }
    
    const maxPostsByAuthor = Math.max(...Array.from(authorCounts.values()))
    const suspiciousActivity = maxPostsByAuthor > 5 || uniqueAuthors < posts.length * 0.3
    
    // Detect influencer activity
    const influencerActivity = posts.some(post => {
      const user = userMap.get(post.author_id)
      const engagement = post.public_metrics.like_count + post.public_metrics.retweet_count
      return user?.verified || engagement > 100 || this.cryptoInfluencers.has(post.author.toLowerCase())
    })
    
    return {
      totalPosts: posts.length,
      totalEngagement,
      avgEngagement: totalEngagement / posts.length,
      uniqueAuthors,
      verifiedAuthors,
      hotHashtags,
      suspiciousActivity,
      influencerActivity
    }
  }

  async getUserTweets(
    username: string,
    maxResults: number = 100,
    hours: number = 24
  ): Promise<TwitterPost[]> {
    if (!this.credentials?.bearerToken) {
      throw new Error('Twitter credentials not configured')
    }

    try {
      // First, get user ID
      const userResponse = await fetch(`${this.baseUrl}/users/by/username/${username}`, {
        headers: {
          'Authorization': `Bearer ${this.credentials.bearerToken}`,
          'User-Agent': 'JohnStreet-Sentiment-Scanner/1.0'
        }
      })

      if (!userResponse.ok) {
        throw new Error(`Failed to get user ID for ${username}`)
      }

      const userData = await userResponse.json()
      const userId = userData.data.id

      // Get user tweets
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      
      const params = new URLSearchParams({
        max_results: Math.min(maxResults, 100).toString(),
        'tweet.fields': 'created_at,author_id,public_metrics,context_annotations,entities,lang,possibly_sensitive,referenced_tweets',
        'start_time': startTime,
        exclude: 'retweets,replies'
      })

      const tweetsResponse = await fetch(`${this.baseUrl}/users/${userId}/tweets?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.credentials.bearerToken}`,
          'User-Agent': 'JohnStreet-Sentiment-Scanner/1.0'
        }
      })

      if (!tweetsResponse.ok) {
        throw new Error(`Failed to get tweets for ${username}`)
      }

      const tweetsData = await tweetsResponse.json()
      return tweetsData.data || []
    } catch (error) {
      throw new Error(`Failed to get user tweets: ${error}`)
    }
  }

  getCryptoInfluencers(): string[] {
    return Array.from(this.cryptoInfluencers)
  }

  getCryptoQueries(): string[] {
    return [...this.cryptoQueries]
  }
}