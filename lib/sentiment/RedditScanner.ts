import Snoowrap from 'snoowrap'
import { SocialMediaPost, SentimentAnalyzer, CryptoPumpSignal } from './SentimentAnalyzer'
import fetch from 'node-fetch'

export interface RedditCredentials {
  clientId: string
  clientSecret: string
  refreshToken: string
  userAgent: string
}

export interface RedditPost {
  id: string
  title: string
  selftext: string
  author: string
  created_utc: number
  score: number
  upvote_ratio: number
  num_comments: number
  subreddit: string
  url: string
  is_video: boolean
  over_18: boolean
  permalink: string
  domain: string
  flair_text?: string
}

export interface RedditComment {
  id: string
  body: string
  author: string
  created_utc: number
  score: number
  parent_id: string
  permalink: string
  subreddit: string
}

export interface SubredditAnalysis {
  subreddit: string
  posts: RedditPost[]
  comments: RedditComment[]
  sentimentScore: number
  pumpSignals: CryptoPumpSignal[]
  metrics: {
    totalPosts: number
    totalComments: number
    avgScore: number
    avgUpvoteRatio: number
    hotKeywords: string[]
    suspiciousActivity: boolean
  }
  timestamp: number
}

export class RedditScanner {
  private reddit: Snoowrap | null = null
  private sentimentAnalyzer: SentimentAnalyzer
  private isConnected: boolean = false
  
  // Popular crypto subreddits to monitor
  private cryptoSubreddits = [
    'CryptoCurrency',
    'Bitcoin',
    'ethereum',
    'dogecoin',
    'CryptoMoonShots',
    'satoshistreetbets',
    'altcoin',
    'defi',
    'NFT',
    'cardano',
    'solana',
    'binance',
    'coinbase',
    'crypto_bets',
    'pennycrypto',
    'cryptomarsshots',
    'shitcoinmoonshots'
  ]

  // Pump and dump indicators for Reddit
  private pumpSubreddits = new Set([
    'CryptoMoonShots',
    'satoshistreetbets',
    'crypto_bets',
    'pennycrypto',
    'cryptomarsshots',
    'shitcoinmoonshots'
  ])

  constructor() {
    this.sentimentAnalyzer = new SentimentAnalyzer()
  }

  async connect(credentials: RedditCredentials): Promise<void> {
    try {
      this.reddit = new Snoowrap({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        refreshToken: credentials.refreshToken,
        userAgent: credentials.userAgent
      })

      // Test connection
      await this.reddit.getMe()
      this.isConnected = true
      console.log('Connected to Reddit API')
    } catch (error) {
      this.isConnected = false
      throw new Error(`Failed to connect to Reddit: ${error}`)
    }
  }

  async connectPublic(): Promise<void> {
    // Use public Reddit API without authentication
    this.isConnected = true
    console.log('Using public Reddit API')
  }

  async scanSubreddit(
    subredditName: string, 
    timeframe: 'hour' | 'day' | 'week' | 'month' = 'day',
    limit: number = 100,
    includeComments: boolean = true
  ): Promise<SubredditAnalysis> {
    if (!this.isConnected) {
      await this.connectPublic()
    }

    try {
      let posts: RedditPost[] = []
      let comments: RedditComment[] = []

      if (this.reddit) {
        // Use authenticated API
        posts = await this.fetchAuthenticatedPosts(subredditName, timeframe, limit)
        if (includeComments) {
          comments = await this.fetchCommentsForPosts(posts.slice(0, 20)) // Limit comments to first 20 posts
        }
      } else {
        // Use public API
        posts = await this.fetchPublicPosts(subredditName, timeframe, limit)
        if (includeComments) {
          comments = await this.fetchPublicComments(posts.slice(0, 10)) // More limited for public API
        }
      }

      // Convert to SocialMediaPost format for sentiment analysis
      const socialPosts = this.convertToSocialPosts(posts, comments)

      // Analyze sentiment
      const sentimentResult = this.sentimentAnalyzer.analyzePostsBatch(socialPosts)

      // Detect pump signals for various symbols
      const pumpSignals = await this.detectPumpSignals(socialPosts, posts)

      // Calculate metrics
      const metrics = this.calculateSubredditMetrics(posts, comments, sentimentResult)

      return {
        subreddit: subredditName,
        posts,
        comments,
        sentimentScore: sentimentResult.overallSentiment.score,
        pumpSignals,
        metrics,
        timestamp: Date.now()
      }
    } catch (error) {
      throw new Error(`Failed to scan subreddit ${subredditName}: ${error}`)
    }
  }

  private async fetchAuthenticatedPosts(
    subredditName: string, 
    timeframe: string, 
    limit: number
  ): Promise<RedditPost[]> {
    if (!this.reddit) throw new Error('Reddit client not initialized')

    const subreddit = this.reddit.getSubreddit(subredditName)
    const listing = await subreddit.getTop({ time: timeframe, limit })

    return listing.map((submission: any) => ({
      id: submission.id,
      title: submission.title,
      selftext: submission.selftext || '',
      author: submission.author.name,
      created_utc: submission.created_utc,
      score: submission.score,
      upvote_ratio: submission.upvote_ratio,
      num_comments: submission.num_comments,
      subreddit: submission.subreddit.display_name,
      url: submission.url,
      is_video: submission.is_video,
      over_18: submission.over_18,
      permalink: submission.permalink,
      domain: submission.domain,
      flair_text: submission.link_flair_text
    }))
  }

  private async fetchPublicPosts(
    subredditName: string, 
    timeframe: string, 
    limit: number
  ): Promise<RedditPost[]> {
    const url = `https://www.reddit.com/r/${subredditName}/top.json?t=${timeframe}&limit=${limit}`
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'JohnStreet-Sentiment-Scanner/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status}`)
      }

      const data = await response.json()
      
      return data.data.children.map((child: any) => ({
        id: child.data.id,
        title: child.data.title,
        selftext: child.data.selftext || '',
        author: child.data.author,
        created_utc: child.data.created_utc,
        score: child.data.score,
        upvote_ratio: child.data.upvote_ratio,
        num_comments: child.data.num_comments,
        subreddit: child.data.subreddit,
        url: child.data.url,
        is_video: child.data.is_video,
        over_18: child.data.over_18,
        permalink: child.data.permalink,
        domain: child.data.domain,
        flair_text: child.data.link_flair_text
      }))
    } catch (error) {
      throw new Error(`Failed to fetch public posts: ${error}`)
    }
  }

  private async fetchCommentsForPosts(posts: RedditPost[]): Promise<RedditComment[]> {
    if (!this.reddit) return []

    const allComments: RedditComment[] = []

    for (const post of posts.slice(0, 10)) { // Limit to avoid rate limits
      try {
        const submission = await this.reddit.getSubmission(post.id)
        await submission.expandReplies({ limit: 20, depth: 2 })
        
        const comments = submission.comments
        for (const comment of comments) {
          if (comment.body && comment.body !== '[deleted]' && comment.body !== '[removed]') {
            allComments.push({
              id: comment.id,
              body: comment.body,
              author: comment.author.name,
              created_utc: comment.created_utc,
              score: comment.score,
              parent_id: comment.parent_id,
              permalink: comment.permalink,
              subreddit: post.subreddit
            })
          }
        }
      } catch (error) {
        console.error(`Error fetching comments for post ${post.id}:`, error)
      }
    }

    return allComments
  }

  private async fetchPublicComments(posts: RedditPost[]): Promise<RedditComment[]> {
    const allComments: RedditComment[] = []

    for (const post of posts.slice(0, 5)) { // Very limited for public API
      try {
        const url = `https://www.reddit.com/r/${post.subreddit}/comments/${post.id}.json?limit=50`
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'JohnStreet-Sentiment-Scanner/1.0'
          }
        })

        if (response.ok) {
          const data = await response.json()
          const commentListing = data[1] // Comments are in the second listing
          
          if (commentListing && commentListing.data && commentListing.data.children) {
            for (const child of commentListing.data.children) {
              if (child.data && child.data.body && child.data.body !== '[deleted]') {
                allComments.push({
                  id: child.data.id,
                  body: child.data.body,
                  author: child.data.author,
                  created_utc: child.data.created_utc,
                  score: child.data.score,
                  parent_id: child.data.parent_id,
                  permalink: child.data.permalink,
                  subreddit: post.subreddit
                })
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching public comments for post ${post.id}:`, error)
      }
    }

    return allComments
  }

  private convertToSocialPosts(posts: RedditPost[], comments: RedditComment[]): SocialMediaPost[] {
    const socialPosts: SocialMediaPost[] = []

    // Convert posts
    for (const post of posts) {
      socialPosts.push({
        id: post.id,
        text: `${post.title} ${post.selftext}`.trim(),
        author: post.author,
        timestamp: post.created_utc * 1000,
        platform: 'reddit',
        engagement: {
          upvotes: post.score,
          comments: post.num_comments
        },
        metadata: {
          subreddit: post.subreddit,
          upvote_ratio: post.upvote_ratio,
          flair: post.flair_text,
          type: 'post'
        }
      })
    }

    // Convert comments
    for (const comment of comments) {
      socialPosts.push({
        id: comment.id,
        text: comment.body,
        author: comment.author,
        timestamp: comment.created_utc * 1000,
        platform: 'reddit',
        engagement: {
          upvotes: comment.score
        },
        metadata: {
          subreddit: comment.subreddit,
          parent_id: comment.parent_id,
          type: 'comment'
        }
      })
    }

    return socialPosts
  }

  private async detectPumpSignals(socialPosts: SocialMediaPost[], posts: RedditPost[]): Promise<CryptoPumpSignal[]> {
    const signals: CryptoPumpSignal[] = []
    
    // Extract mentioned symbols
    const symbols = this.extractCryptoSymbols(socialPosts)
    
    for (const symbol of symbols) {
      // Filter posts mentioning this symbol
      const symbolPosts = socialPosts.filter(post => 
        post.text.toLowerCase().includes(symbol.toLowerCase())
      )

      if (symbolPosts.length >= 3) { // Minimum threshold
        const signal = this.sentimentAnalyzer.detectPumpSignal(symbolPosts, symbol)
        
        // Add Reddit-specific enhancements
        signal.indicators.coordinated = this.detectRedditCoordination(symbolPosts, posts)
        signal.indicators.influencerActivity = this.detectRedditInfluencers(symbolPosts)
        
        // Boost confidence for pump-focused subreddits
        const pumpSubredditPosts = symbolPosts.filter(post => 
          post.metadata?.subreddit && this.pumpSubreddits.has(post.metadata.subreddit)
        )
        
        if (pumpSubredditPosts.length > 0) {
          signal.confidence = Math.min(1, signal.confidence * 1.3)
          if (signal.riskLevel === 'medium') signal.riskLevel = 'high'
          if (signal.riskLevel === 'high') signal.riskLevel = 'critical'
        }

        signals.push(signal)
      }
    }

    return signals.sort((a, b) => b.confidence - a.confidence)
  }

  private extractCryptoSymbols(posts: SocialMediaPost[]): string[] {
    const symbols = new Set<string>()
    const cryptoPattern = /\b(?:BTC|ETH|ADA|SOL|DOT|AVAX|MATIC|DOGE|SHIB|XRP|LTC|BCH|LINK|UNI|AAVE|COMP|MKR|SNX|YFI|SUSHI|CRV|BAL|1INCH|ALPHA|BADGER|BNT|CREAM|DPI|FEI|FORTH|GTC|INDEX|LDO|LOOKS|MASK|MLN|NMR|OMG|OXT|PERP|RAD|RBN|REN|REP|RLC|SPELL|STORJ|TORN|TRIBE|TRU|UMA|WBTC|ZRX)\b/gi

    for (const post of posts) {
      const matches = post.text.match(cryptoPattern)
      if (matches) {
        matches.forEach(match => symbols.add(match.toUpperCase()))
      }

      // Also look for $SYMBOL pattern
      const dollarPattern = /\$([A-Z]{3,6})\b/g
      const dollarMatches = post.text.match(dollarPattern)
      if (dollarMatches) {
        dollarMatches.forEach(match => symbols.add(match.substring(1)))
      }
    }

    return Array.from(symbols)
  }

  private detectRedditCoordination(symbolPosts: SocialMediaPost[], allPosts: RedditPost[]): boolean {
    // Check for coordinated posting patterns
    const postsByAuthor = new Map<string, number>()
    
    for (const post of symbolPosts) {
      postsByAuthor.set(post.author, (postsByAuthor.get(post.author) || 0) + 1)
    }

    // Suspicious if few authors posting many times
    const suspiciousAuthors = Array.from(postsByAuthor.entries())
      .filter(([author, count]) => count > 3)
    
    return suspiciousAuthors.length > 0 && suspiciousAuthors.length < symbolPosts.length * 0.3
  }

  private detectRedditInfluencers(symbolPosts: SocialMediaPost[]): boolean {
    // Look for high-engagement posts or posts from pump subreddits
    return symbolPosts.some(post => {
      const upvotes = post.engagement.upvotes || 0
      const comments = post.engagement.comments || 0
      const isPumpSubreddit = post.metadata?.subreddit && this.pumpSubreddits.has(post.metadata.subreddit)
      
      return upvotes > 100 || comments > 50 || isPumpSubreddit
    })
  }

  private calculateSubredditMetrics(
    posts: RedditPost[], 
    comments: RedditComment[], 
    sentimentResult: any
  ): any {
    const avgScore = posts.reduce((sum, post) => sum + post.score, 0) / posts.length
    const avgUpvoteRatio = posts.reduce((sum, post) => sum + post.upvote_ratio, 0) / posts.length
    
    // Extract hot keywords
    const allKeywords = sentimentResult.postSentiments.flatMap((s: any) => s.keywords)
    const keywordCount = new Map<string, number>()
    
    for (const keyword of allKeywords) {
      keywordCount.set(keyword, (keywordCount.get(keyword) || 0) + 1)
    }
    
    const hotKeywords = Array.from(keywordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword]) => keyword)

    // Detect suspicious activity
    const suspiciousActivity = this.detectSuspiciousActivity(posts)

    return {
      totalPosts: posts.length,
      totalComments: comments.length,
      avgScore,
      avgUpvoteRatio,
      hotKeywords,
      suspiciousActivity
    }
  }

  private detectSuspiciousActivity(posts: RedditPost[]): boolean {
    // Check for spam patterns, coordinated posting, etc.
    const authorCounts = new Map<string, number>()
    const similarTitles = new Map<string, number>()
    
    for (const post of posts) {
      authorCounts.set(post.author, (authorCounts.get(post.author) || 0) + 1)
      
      // Simple title similarity check
      const titleWords = post.title.toLowerCase().split(' ').filter(word => word.length > 4)
      const titleKey = titleWords.sort().join(' ')
      similarTitles.set(titleKey, (similarTitles.get(titleKey) || 0) + 1)
    }

    // Suspicious if many posts from few authors or many similar titles
    const maxPostsByAuthor = Math.max(...Array.from(authorCounts.values()))
    const maxSimilarTitles = Math.max(...Array.from(similarTitles.values()))
    
    return maxPostsByAuthor > 5 || maxSimilarTitles > 3
  }

  async scanMultipleSubreddits(
    subreddits: string[] = this.cryptoSubreddits,
    timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<SubredditAnalysis[]> {
    const analyses: SubredditAnalysis[] = []
    
    for (const subreddit of subreddits) {
      try {
        const analysis = await this.scanSubreddit(subreddit, timeframe, 50, false) // Reduced limits for bulk scanning
        analyses.push(analysis)
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`Failed to scan r/${subreddit}:`, error)
      }
    }

    return analyses
  }

  getCryptoSubreddits(): string[] {
    return [...this.cryptoSubreddits]
  }

  getPumpSubreddits(): string[] {
    return Array.from(this.pumpSubreddits)
  }
}