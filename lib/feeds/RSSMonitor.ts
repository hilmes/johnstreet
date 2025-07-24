import Parser from 'rss-parser'
import { activityLoggerKV } from '@/lib/sentiment/ActivityLoggerKV'
import { subredditManagerKV } from '@/lib/sentiment/SubredditManagerKV'
import { SentimentAnalyzer, SocialMediaPost } from '@/lib/sentiment/SentimentAnalyzer'
import { CryptoSymbolExtractor } from '@/lib/sentiment/CryptoSymbolExtractor'

export interface RSSFeedConfig {
  url: string
  name: string
  platform: 'reddit' | 'twitter' | 'generic'
  subreddit?: string
  active: boolean
  checkInterval: number // seconds
  lastChecked?: number
  totalItems?: number
  errorCount?: number
}

export interface RSSItem {
  id: string
  title: string
  description?: string
  link: string
  pubDate: string
  author?: string
  source: string
  platform: 'reddit' | 'twitter' | 'generic'
}

export interface ProcessedRSSItem extends RSSItem {
  sentiment: number
  symbols: string[]
  pumpIndicators: string[]
  processed: number
}

export class RSSMonitor {
  private parser: Parser
  private sentimentAnalyzer: SentimentAnalyzer
  private feeds: Map<string, RSSFeedConfig> = new Map()
  private isRunning = false
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private lastItemIds: Map<string, Set<string>> = new Map() // Track processed items

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      maxRedirects: 3,
      headers: {
        'User-Agent': 'JohnStreet-RSS-Monitor/1.0 (Crypto Sentiment Analysis)'
      }
    })
    this.sentimentAnalyzer = new SentimentAnalyzer()
    this.initializeDefaultFeeds()
  }

  private initializeDefaultFeeds(): void {
    const defaultFeeds: RSSFeedConfig[] = [
      // Main crypto subreddits
      {
        url: 'https://www.reddit.com/r/CryptoCurrency/new/.rss',
        name: 'r/CryptoCurrency New',
        platform: 'reddit',
        subreddit: 'CryptoCurrency',
        active: true,
        checkInterval: 30, // 30 seconds
        totalItems: 0,
        errorCount: 0
      },
      {
        url: 'https://www.reddit.com/r/CryptoCurrency/hot/.rss',
        name: 'r/CryptoCurrency Hot',
        platform: 'reddit',
        subreddit: 'CryptoCurrency',
        active: true,
        checkInterval: 60, // 1 minute
        totalItems: 0,
        errorCount: 0
      },
      
      // High-risk pump subreddits  
      {
        url: 'https://www.reddit.com/r/CryptoMoonShots/new/.rss',
        name: 'r/CryptoMoonShots New',
        platform: 'reddit',
        subreddit: 'CryptoMoonShots',
        active: true,
        checkInterval: 15, // 15 seconds (high priority)
        totalItems: 0,
        errorCount: 0
      },
      {
        url: 'https://www.reddit.com/r/SatoshiStreetBets/new/.rss',
        name: 'r/SatoshiStreetBets New',
        platform: 'reddit',
        subreddit: 'SatoshiStreetBets',
        active: true,
        checkInterval: 20, // 20 seconds
        totalItems: 0,
        errorCount: 0
      },
      {
        url: 'https://www.reddit.com/r/crypto_bets/new/.rss',
        name: 'r/crypto_bets New',
        platform: 'reddit',
        subreddit: 'crypto_bets',
        active: true,
        checkInterval: 30,
        totalItems: 0,
        errorCount: 0
      },
      {
        url: 'https://www.reddit.com/r/pennycrypto/new/.rss',
        name: 'r/pennycrypto New',
        platform: 'reddit',
        subreddit: 'pennycrypto',
        active: true,
        checkInterval: 45,
        totalItems: 0,
        errorCount: 0
      },
      
      // Additional subreddits
      {
        url: 'https://www.reddit.com/r/Bitcoin/new/.rss',
        name: 'r/Bitcoin New',
        platform: 'reddit',
        subreddit: 'Bitcoin',
        active: true,
        checkInterval: 60,
        totalItems: 0,
        errorCount: 0
      },
      {
        url: 'https://www.reddit.com/r/ethereum/new/.rss',
        name: 'r/ethereum New',
        platform: 'reddit',
        subreddit: 'ethereum',
        active: true,
        checkInterval: 60,
        totalItems: 0,
        errorCount: 0
      },
      {
        url: 'https://www.reddit.com/r/defi/new/.rss',
        name: 'r/defi New',
        platform: 'reddit',
        subreddit: 'defi',
        active: true,
        checkInterval: 120,
        totalItems: 0,
        errorCount: 0
      },
      {
        url: 'https://www.reddit.com/r/altcoin/new/.rss',
        name: 'r/altcoin New',
        platform: 'reddit',
        subreddit: 'altcoin',
        active: true,
        checkInterval: 90,
        totalItems: 0,
        errorCount: 0
      }
    ]

    for (const feed of defaultFeeds) {
      this.feeds.set(feed.url, feed)
      this.lastItemIds.set(feed.url, new Set())
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      await activityLoggerKV.log({
        type: 'api_call',
        platform: 'system',
        source: 'rss_monitor',
        message: 'RSS Monitor already running',
        severity: 'warning'
      })
      return
    }

    this.isRunning = true
    
    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'system',
      source: 'rss_monitor',
      message: `Starting RSS Monitor with ${this.feeds.size} feeds`,
      data: { feedCount: this.feeds.size },
      severity: 'info'
    })

    // Start monitoring each active feed
    for (const [url, config] of this.feeds) {
      if (config.active) {
        await this.startFeedMonitoring(url, config)
      }
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return

    this.isRunning = false
    
    // Clear all intervals
    for (const [url, interval] of this.intervals) {
      clearInterval(interval)
    }
    this.intervals.clear()

    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'system',
      source: 'rss_monitor',
      message: 'RSS Monitor stopped',
      severity: 'info'
    })
  }

  private async startFeedMonitoring(url: string, config: RSSFeedConfig): Promise<void> {
    // Do initial check
    await this.checkFeed(url, config)

    // Set up interval for continuous monitoring
    const interval = setInterval(async () => {
      await this.checkFeed(url, config)
    }, config.checkInterval * 1000)

    this.intervals.set(url, interval)

    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'system',
      source: 'rss_monitor',
      message: `Started monitoring ${config.name}`,
      data: { url, interval: config.checkInterval },
      severity: 'info'
    })
  }

  private async checkFeed(url: string, config: RSSFeedConfig): Promise<void> {
    const timer = activityLoggerKV.startTimer(`RSS check: ${config.name}`)
    
    try {
      const feed = await this.parser.parseURL(url)
      const newItems: RSSItem[] = []
      const processedItems = this.lastItemIds.get(url) || new Set()

      // Process new items
      for (const item of feed.items) {
        const itemId = this.generateItemId(item)
        
        if (!processedItems.has(itemId)) {
          const rssItem: RSSItem = {
            id: itemId,
            title: item.title || '',
            description: item.content || item.contentSnippet || '',
            link: item.link || '',
            pubDate: item.pubDate || new Date().toISOString(),
            author: item.creator || item.author || 'unknown',
            source: config.subreddit || config.name,
            platform: config.platform
          }
          
          newItems.push(rssItem)
          processedItems.add(itemId)
        }
      }

      // Update processed items (keep last 1000 to prevent memory bloat)
      if (processedItems.size > 1000) {
        const itemsArray = Array.from(processedItems)
        const keepItems = itemsArray.slice(-500) // Keep most recent 500
        this.lastItemIds.set(url, new Set(keepItems))
      } else {
        this.lastItemIds.set(url, processedItems)
      }

      // Process new items
      if (newItems.length > 0) {
        await this.processNewItems(newItems, config)
      }

      // Update feed stats
      config.lastChecked = Date.now()
      config.totalItems = (config.totalItems || 0) + newItems.length
      config.errorCount = 0 // Reset error count on success

      const duration = timer()
      if (newItems.length > 0) {
        await activityLoggerKV.log({
          type: 'reddit_scan',
          platform: 'reddit',
          source: config.subreddit || config.name,
          message: `RSS feed processed ${newItems.length} new items from ${config.name}`,
          data: { 
            feedUrl: url,
            newItems: newItems.length,
            totalItems: feed.items.length
          },
          duration,
          severity: 'success'
        })
      }

    } catch (error) {
      config.errorCount = (config.errorCount || 0) + 1
      
      await activityLoggerKV.logError(
        `RSS Monitor: ${config.name}`,
        `Failed to fetch RSS feed (error #${config.errorCount})`,
        error
      )

      // Disable feed after 5 consecutive errors
      if (config.errorCount >= 5) {
        config.active = false
        const interval = this.intervals.get(url)
        if (interval) {
          clearInterval(interval)
          this.intervals.delete(url)
        }

        await activityLoggerKV.log({
          type: 'error',
          platform: 'system',
          source: 'rss_monitor',
          message: `Disabled RSS feed ${config.name} after ${config.errorCount} consecutive errors`,
          data: { url, errorCount: config.errorCount },
          severity: 'error'
        })
      }
    }
  }

  private async processNewItems(items: RSSItem[], config: RSSFeedConfig): Promise<void> {
    const processedItems: ProcessedRSSItem[] = []

    for (const item of items) {
      try {
        // Convert to social media post format for sentiment analysis
        const socialPost: SocialMediaPost = {
          id: item.id,
          text: `${item.title} ${item.description || ''}`,
          author: item.author || 'unknown',
          timestamp: new Date(item.pubDate).getTime(),
          platform: 'reddit',
          engagement: { likes: 0, retweets: 0, comments: 0 }, // RSS doesn't provide engagement data
          metadata: {
            subreddit: config.subreddit,
            url: item.link,
            source: 'rss'
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

        const processedItem: ProcessedRSSItem = {
          ...item,
          sentiment: sentimentResult.overallSentiment.score,
          symbols,
          pumpIndicators,
          processed: Date.now()
        }

        processedItems.push(processedItem)

        // Log symbol detections
        if (symbols.length > 0) {
          await activityLoggerKV.logSymbolDetection(
            symbols,
            `${config.subreddit || config.name} (RSS)`,
            {
              totalMentions: symbols.length,
              sentiment: processedItem.sentiment,
              pumpIndicators: pumpIndicators.length
            }
          )
        }

        // Log pump alerts for high-risk subreddits
        if (config.subreddit && ['CryptoMoonShots', 'SatoshiStreetBets', 'crypto_bets'].includes(config.subreddit)) {
          if (pumpIndicators.length >= 2 && symbols.length > 0) {
            for (const symbol of symbols) {
              await activityLoggerKV.logPumpAlert(
                symbol,
                'medium',
                0.6 + (pumpIndicators.length * 0.1),
                `${config.subreddit} (RSS)`
              )
            }
          }
        }

      } catch (error) {
        await activityLoggerKV.logError(
          `RSS Processing: ${config.name}`,
          `Failed to process RSS item: ${item.title}`,
          error
        )
      }
    }

    // Store processed items for potential future use
    // In a production system, you might want to store these in KV or a database
    if (processedItems.length > 0) {
      await activityLoggerKV.log({
        type: 'reddit_scan',
        platform: 'reddit',
        source: config.subreddit || config.name,
        message: `Processed ${processedItems.length} RSS items with sentiment analysis`,
        data: {
          processedCount: processedItems.length,
          avgSentiment: processedItems.reduce((sum, item) => sum + item.sentiment, 0) / processedItems.length,
          totalSymbols: processedItems.reduce((sum, item) => sum + item.symbols.length, 0),
          totalPumpIndicators: processedItems.reduce((sum, item) => sum + item.pumpIndicators.length, 0)
        },
        severity: 'success'
      })
    }
  }

  private generateItemId(item: any): string {
    // Create unique ID from RSS item
    return `${item.link || item.guid || item.title || ''}_${item.pubDate || Date.now()}`
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 100)
  }

  // Feed management methods
  async addFeed(config: RSSFeedConfig): Promise<boolean> {
    if (this.feeds.has(config.url)) {
      return false
    }

    this.feeds.set(config.url, config)
    this.lastItemIds.set(config.url, new Set())

    if (config.active && this.isRunning) {
      await this.startFeedMonitoring(config.url, config)
    }

    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'system',
      source: 'rss_monitor',
      message: `Added RSS feed: ${config.name}`,
      data: { url: config.url, name: config.name },
      severity: 'success'
    })

    return true
  }

  async removeFeed(url: string): Promise<boolean> {
    const config = this.feeds.get(url)
    if (!config) return false

    // Stop monitoring
    const interval = this.intervals.get(url)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(url)
    }

    this.feeds.delete(url)
    this.lastItemIds.delete(url)

    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'system',
      source: 'rss_monitor',
      message: `Removed RSS feed: ${config.name}`,
      data: { url, name: config.name },
      severity: 'info'
    })

    return true
  }

  async toggleFeed(url: string): Promise<boolean> {
    const config = this.feeds.get(url)
    if (!config) return false

    config.active = !config.active

    if (config.active && this.isRunning) {
      await this.startFeedMonitoring(url, config)
    } else {
      const interval = this.intervals.get(url)
      if (interval) {
        clearInterval(interval)
        this.intervals.delete(url)
      }
    }

    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'system',
      source: 'rss_monitor',
      message: `${config.active ? 'Enabled' : 'Disabled'} RSS feed: ${config.name}`,
      data: { url, name: config.name, active: config.active },
      severity: 'info'
    })

    return true
  }

  // Getters
  getAllFeeds(): RSSFeedConfig[] {
    return Array.from(this.feeds.values())
  }

  getActiveFeeds(): RSSFeedConfig[] {
    return Array.from(this.feeds.values()).filter(feed => feed.active)
  }

  getFeedStats(): {
    total: number
    active: number
    totalItems: number
    totalErrors: number
    lastChecked: number
  } {
    const feeds = Array.from(this.feeds.values())
    return {
      total: feeds.length,
      active: feeds.filter(f => f.active).length,
      totalItems: feeds.reduce((sum, f) => sum + (f.totalItems || 0), 0),
      totalErrors: feeds.reduce((sum, f) => sum + (f.errorCount || 0), 0),
      lastChecked: Math.max(...feeds.map(f => f.lastChecked || 0))
    }
  }

  isMonitoring(): boolean {
    return this.isRunning
  }
}

// Export singleton instance
export const rssMonitor = new RSSMonitor()