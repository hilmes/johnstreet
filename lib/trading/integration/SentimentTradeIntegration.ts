import { signalPipeline } from '../pipeline/SignalPipeline'
import { dataOrchestrator } from '@/lib/feeds/DataOrchestrator'
import { activityLoggerKV } from '@/lib/sentiment/ActivityLoggerKV'
import { sentimentAnalyzer } from '@/lib/sentiment/SentimentAnalyzer'
import { krakenService } from '@/lib/exchanges/kraken/KrakenService'
import { Portfolio } from '@/types/trading'
import { MarketData } from '../signals/SignalGenerator'
import { defaultStrategies, getStrategyForCondition } from '../strategies/defaults'
import { Strategy } from '@/types/strategy'

export interface IntegrationConfig {
  enabled: boolean
  symbolWhitelist: string[]
  minActivityThreshold: number // Min mentions per hour to consider
  priceUpdateInterval: number // How often to fetch prices (ms)
  sentimentAggregationWindow: number // Time window for sentiment aggregation (ms)
}

interface SymbolActivity {
  symbol: string
  lastSentimentUpdate: number
  recentSentiments: Array<{
    score: number
    timestamp: number
    platform: string
  }>
  lastPrice: number
  lastPriceUpdate: number
  mentionsPerHour: number
}

export class SentimentTradeIntegration {
  private config: IntegrationConfig
  private symbolActivities: Map<string, SymbolActivity> = new Map()
  private priceUpdateInterval: NodeJS.Timeout | null = null
  private strategyUpdateInterval: NodeJS.Timeout | null = null
  private isRunning: boolean = false
  private portfolio: Portfolio | null = null

  constructor(config?: Partial<IntegrationConfig>) {
    this.config = {
      enabled: false,
      symbolWhitelist: ['BTC', 'ETH', 'DOGE', 'SHIB', 'PEPE', 'BONK'],
      minActivityThreshold: 5, // At least 5 mentions per hour
      priceUpdateInterval: 30000, // Update prices every 30 seconds
      sentimentAggregationWindow: 5 * 60 * 1000, // 5 minute window
      ...config
    }

    this.setupActivityListener()
  }

  async start(portfolio: Portfolio): Promise<void> {
    if (this.isRunning) return

    this.portfolio = portfolio
    this.isRunning = true

    // Configure pipeline with appropriate strategies based on current market conditions
    await this.configurePipelineStrategies()

    // Start the signal pipeline
    await signalPipeline.start(portfolio, krakenService)

    // Start price updates
    this.startPriceUpdates()

    // Start periodic strategy updates (every 5 minutes)
    this.startStrategyUpdates()

    await activityLoggerKV.log({
      type: 'integration_start',
      platform: 'system',
      source: 'sentiment_trade_integration',
      message: 'Sentiment-to-trade integration started',
      data: {
        symbols: this.config.symbolWhitelist,
        portfolio: portfolio.totalValue,
        strategies: signalPipeline.getMetrics()
      }
    })
  }

  async stop(): Promise<void> {
    this.isRunning = false

    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval)
      this.priceUpdateInterval = null
    }

    if (this.strategyUpdateInterval) {
      clearInterval(this.strategyUpdateInterval)
      this.strategyUpdateInterval = null
    }

    await signalPipeline.stop()

    await activityLoggerKV.log({
      type: 'integration_stop',
      platform: 'system',
      source: 'sentiment_trade_integration',
      message: 'Sentiment-to-trade integration stopped'
    })
  }

  private setupActivityListener(): void {
    // Subscribe to activity logger for sentiment events
    activityLoggerKV.subscribe(async (entry) => {
      if (!this.isRunning) return

      // Process symbol detection events
      if (entry.type === 'symbol_detection' && entry.data?.symbols) {
        for (const symbol of entry.data.symbols) {
          await this.processSentimentActivity(symbol, entry)
        }
      }

      // Process cross-platform signals
      if (entry.type === 'cross_platform_signal' && entry.data?.symbol) {
        await this.processCrossPlatformSignal(entry.data)
      }
    })
  }

  private async processSentimentActivity(symbol: string, activity: any): Promise<void> {
    // Check if symbol is whitelisted
    if (!this.config.symbolWhitelist.includes(symbol)) return

    // Update symbol activity
    if (!this.symbolActivities.has(symbol)) {
      this.symbolActivities.set(symbol, {
        symbol,
        lastSentimentUpdate: Date.now(),
        recentSentiments: [],
        lastPrice: 0,
        lastPriceUpdate: 0,
        mentionsPerHour: 0
      })
    }

    const symbolActivity = this.symbolActivities.get(symbol)!

    // Add sentiment data
    symbolActivity.recentSentiments.push({
      score: activity.data.sentiment || 0,
      timestamp: activity.timestamp,
      platform: activity.platform
    })

    // Clean old sentiments
    const cutoff = Date.now() - this.config.sentimentAggregationWindow
    symbolActivity.recentSentiments = symbolActivity.recentSentiments.filter(
      s => s.timestamp > cutoff
    )

    // Update mentions per hour
    const hourAgo = Date.now() - (60 * 60 * 1000)
    const recentMentions = symbolActivity.recentSentiments.filter(
      s => s.timestamp > hourAgo
    ).length
    symbolActivity.mentionsPerHour = recentMentions

    // Check if we should generate a signal
    if (symbolActivity.mentionsPerHour >= this.config.minActivityThreshold) {
      await this.evaluateSignal(symbol)
    }
  }

  private async processCrossPlatformSignal(signalData: any): Promise<void> {
    const symbol = signalData.symbol
    if (!this.config.symbolWhitelist.includes(symbol)) return

    // Cross-platform signals are high priority
    await this.evaluateSignal(symbol, signalData)
  }

  private async evaluateSignal(symbol: string, crossPlatformSignal?: any): Promise<void> {
    const activity = this.symbolActivities.get(symbol)
    if (!activity || activity.recentSentiments.length === 0) return

    // Aggregate recent sentiments
    const aggregatedSentiment = this.aggregateSentiments(activity.recentSentiments)

    // Get or update market data
    const marketData = await this.getMarketData(symbol)
    if (!marketData) return

    // Create sentiment score object
    const sentimentScore = {
      score: aggregatedSentiment.score,
      magnitude: Math.abs(aggregatedSentiment.score),
      classification: this.classifySentiment(aggregatedSentiment.score),
      confidence: aggregatedSentiment.confidence,
      keywords: this.extractKeywords(activity.recentSentiments),
      symbols: [{ symbol, mentions: activity.mentionsPerHour, contexts: [] }]
    }

    // Queue for processing
    signalPipeline.queueSentiment(
      sentimentScore,
      marketData,
      crossPlatformSignal
    )

    await activityLoggerKV.log({
      type: 'signal_queued',
      platform: 'system',
      source: 'sentiment_trade_integration',
      message: `Signal queued for ${symbol}`,
      data: {
        symbol,
        sentiment: aggregatedSentiment.score,
        confidence: aggregatedSentiment.confidence,
        mentions: activity.mentionsPerHour,
        hasCrossPlatform: !!crossPlatformSignal
      }
    })
  }

  private aggregateSentiments(sentiments: Array<{ score: number; timestamp: number; platform: string }>): {
    score: number
    confidence: number
  } {
    if (sentiments.length === 0) {
      return { score: 0, confidence: 0 }
    }

    // Weight recent sentiments more heavily
    const now = Date.now()
    let weightedSum = 0
    let totalWeight = 0

    for (const sentiment of sentiments) {
      // Exponential decay based on age
      const age = now - sentiment.timestamp
      const weight = Math.exp(-age / (this.config.sentimentAggregationWindow / 2))
      
      weightedSum += sentiment.score * weight
      totalWeight += weight
    }

    const avgScore = totalWeight > 0 ? weightedSum / totalWeight : 0

    // Confidence based on number of sentiments and their consistency
    const variance = sentiments.reduce((sum, s) => sum + Math.pow(s.score - avgScore, 2), 0) / sentiments.length
    const consistency = 1 - Math.min(variance, 1)
    const volumeConfidence = Math.min(sentiments.length / 10, 1) // Max confidence at 10+ sentiments

    return {
      score: avgScore,
      confidence: (consistency + volumeConfidence) / 2
    }
  }

  private async getMarketData(symbol: string): Promise<MarketData | null> {
    const activity = this.symbolActivities.get(symbol)
    if (!activity) return null

    // Check if we need to update price
    const needsPriceUpdate = Date.now() - activity.lastPriceUpdate > this.config.priceUpdateInterval

    if (needsPriceUpdate || activity.lastPrice === 0) {
      try {
        const ticker = await krakenService.fetchTicker(`${symbol}/USD`)
        
        activity.lastPrice = ticker.last
        activity.lastPriceUpdate = Date.now()

        // Calculate volatility (simplified - uses 24h high/low)
        const volatility = (ticker.high - ticker.low) / ticker.last

        return {
          symbol,
          price: ticker.last,
          volume24h: ticker.baseVolume,
          priceChange24h: ticker.percentage / 100,
          volatility,
          bid: ticker.bid,
          ask: ticker.ask,
          timestamp: Date.now()
        }
      } catch (error) {
        console.error(`Failed to fetch market data for ${symbol}:`, error)
        return null
      }
    }

    // Use cached price
    return {
      symbol,
      price: activity.lastPrice,
      volume24h: 0, // Would need to cache this too
      priceChange24h: 0,
      volatility: 0.1, // Default
      bid: activity.lastPrice * 0.999,
      ask: activity.lastPrice * 1.001,
      timestamp: activity.lastPriceUpdate
    }
  }

  private startPriceUpdates(): void {
    this.priceUpdateInterval = setInterval(async () => {
      if (!this.isRunning) return

      // Update prices for active symbols
      for (const [symbol, activity] of this.symbolActivities) {
        if (activity.mentionsPerHour > 0) {
          await this.getMarketData(symbol)
        }
      }
    }, this.config.priceUpdateInterval)
  }

  private startStrategyUpdates(): void {
    // Update strategies every 5 minutes to adapt to market conditions
    this.strategyUpdateInterval = setInterval(async () => {
      if (!this.isRunning) return

      try {
        await this.configurePipelineStrategies()
        
        await activityLoggerKV.log({
          type: 'strategy_update',
          platform: 'system',
          source: 'sentiment_trade_integration',
          message: 'Pipeline strategies updated based on market conditions',
          data: {
            metrics: signalPipeline.getMetrics()
          }
        })
      } catch (error) {
        console.error('Failed to update strategies:', error)
      }
    }, 5 * 60 * 1000) // 5 minutes
  }

  private classifySentiment(score: number): 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive' {
    if (score <= -0.6) return 'very_negative'
    if (score <= -0.2) return 'negative'
    if (score >= 0.6) return 'very_positive'
    if (score >= 0.2) return 'positive'
    return 'neutral'
  }

  private extractKeywords(sentiments: Array<{ score: number; timestamp: number; platform: string }>): string[] {
    // In a real implementation, this would extract actual keywords from the sentiment data
    // For now, return platform indicators
    const platforms = [...new Set(sentiments.map(s => s.platform))]
    return platforms
  }

  private async configurePipelineStrategies(): Promise<void> {
    try {
      // Get current market conditions
      const marketConditions = await this.analyzeMarketConditions()
      
      // Select appropriate strategies based on conditions
      const activeStrategies = this.selectStrategiesForConditions(marketConditions)
      
      // Update pipeline configuration
      signalPipeline.updateConfig({
        strategies: activeStrategies
      })

      await activityLoggerKV.log({
        type: 'strategy_configuration',
        platform: 'system',
        source: 'sentiment_trade_integration',
        message: 'Pipeline strategies configured',
        data: {
          marketConditions,
          activeStrategies: activeStrategies.map(s => ({
            id: s.id,
            name: s.name,
            type: s.type
          }))
        }
      })
    } catch (error) {
      console.error('Failed to configure pipeline strategies:', error)
      // Fall back to default strategies
      signalPipeline.updateConfig({
        strategies: defaultStrategies
      })
    }
  }

  private async analyzeMarketConditions(): Promise<{
    volatility: number
    trendStrength: number
    marketSentiment: number
    volume: number
  }> {
    try {
      // Get BTC as market indicator
      const btcTicker = await krakenService.fetchTicker('BTC/USD')
      
      // Calculate volatility from 24h high/low
      const volatility = (btcTicker.high - btcTicker.low) / btcTicker.last
      
      // Calculate trend strength from price change
      const trendStrength = Math.abs(btcTicker.percentage / 100)
      
      // Get overall market sentiment from active symbols
      const activeSymbols = Array.from(this.symbolActivities.values())
        .filter(a => a.mentionsPerHour > 0)
      
      let marketSentiment = 0.5 // neutral default
      if (activeSymbols.length > 0) {
        const totalSentiment = activeSymbols.reduce((sum, a) => {
          const avgSent = a.recentSentiments.reduce((s, sent) => s + sent.score, 0) / a.recentSentiments.length
          return sum + avgSent
        }, 0)
        marketSentiment = (totalSentiment / activeSymbols.length + 1) / 2 // Normalize to 0-1
      }
      
      return {
        volatility,
        trendStrength,
        marketSentiment,
        volume: btcTicker.baseVolume
      }
    } catch (error) {
      console.error('Failed to analyze market conditions:', error)
      // Return default conditions
      return {
        volatility: 0.02,
        trendStrength: 0.3,
        marketSentiment: 0.5,
        volume: 1000000
      }
    }
  }

  private selectStrategiesForConditions(conditions: {
    volatility: number
    trendStrength: number
    marketSentiment: number
    volume: number
  }): Strategy[] {
    const strategies: Strategy[] = []
    
    // Always include the condition-based strategy
    const primaryStrategy = getStrategyForCondition(
      conditions.volatility,
      conditions.trendStrength,
      conditions.marketSentiment
    )
    strategies.push(primaryStrategy)
    
    // Add complementary strategies based on specific conditions
    
    // High volume + good sentiment = add scalping
    if (conditions.volume > 5000000 && conditions.marketSentiment > 0.6) {
      const scalpingStrategy = defaultStrategies.find(s => s.id === 'scalping-default')
      if (scalpingStrategy && scalpingStrategy.id !== primaryStrategy.id) {
        strategies.push(scalpingStrategy)
      }
    }
    
    // Strong trend = add momentum if not already primary
    if (conditions.trendStrength > 0.6 && conditions.marketSentiment > 0.5) {
      const momentumStrategy = defaultStrategies.find(s => s.id === 'momentum-default')
      if (momentumStrategy && momentumStrategy.id !== primaryStrategy.id) {
        strategies.push(momentumStrategy)
      }
    }
    
    // High volatility = add mean reversion if not already primary
    if (conditions.volatility > 0.03) {
      const meanReversionStrategy = defaultStrategies.find(s => s.id === 'mean-reversion-default')
      if (meanReversionStrategy && meanReversionStrategy.id !== primaryStrategy.id) {
        strategies.push(meanReversionStrategy)
      }
    }
    
    // Always have safe haven as backup
    const safeHavenStrategy = defaultStrategies.find(s => s.id === 'safe-haven-default')
    if (safeHavenStrategy && !strategies.find(s => s.id === safeHavenStrategy.id)) {
      // Set it to lower allocation as a hedge
      const hedgeStrategy = {
        ...safeHavenStrategy,
        config: {
          ...safeHavenStrategy.config,
          positionSizing: {
            method: 'fixed_percentage',
            percentage: 0.02, // Only 2% for hedging
            maxRiskPerTrade: 0.005
          }
        }
      }
      strategies.push(hedgeStrategy)
    }
    
    return strategies
  }

  // Public methods
  getActivityStats(): {
    activeSymbols: number
    totalMentions: number
    avgSentiment: number
    topSymbols: Array<{ symbol: string; mentions: number; sentiment: number }>
    uniqueSymbols: number
    totalDetections: number
    averageSentiment: number
  } {
    const activeSymbols = Array.from(this.symbolActivities.values())
      .filter(a => a.mentionsPerHour > 0)

    const totalMentions = activeSymbols.reduce((sum, a) => sum + a.mentionsPerHour, 0)
    
    const avgSentiment = activeSymbols.length > 0
      ? activeSymbols.reduce((sum, a) => {
          const sentiments = a.recentSentiments
          const avg = sentiments.reduce((s, sent) => s + sent.score, 0) / sentiments.length
          return sum + avg
        }, 0) / activeSymbols.length
      : 0

    const topSymbols = activeSymbols
      .sort((a, b) => b.mentionsPerHour - a.mentionsPerHour)
      .slice(0, 5)
      .map(a => {
        const sentiments = a.recentSentiments
        const avgSent = sentiments.reduce((s, sent) => s + sent.score, 0) / sentiments.length
        return {
          symbol: a.symbol,
          mentions: a.mentionsPerHour,
          sentiment: avgSent
        }
      })

    return {
      activeSymbols: activeSymbols.length,
      totalMentions,
      avgSentiment,
      topSymbols,
      // Additional fields for dashboard compatibility
      uniqueSymbols: activeSymbols.length,
      totalDetections: totalMentions,
      averageSentiment: avgSentiment
    }
  }

  isActive(): boolean {
    return this.isRunning
  }

  updateConfig(config: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): IntegrationConfig {
    return { ...this.config }
  }

  getActiveStrategies(): Array<{
    id: string
    name: string
    type: string
    isActive: boolean
  }> {
    const pipelineConfig = signalPipeline.getMetrics()
    // Get strategies from pipeline config
    // For now, return a simplified view
    return defaultStrategies.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      isActive: s.isActive
    }))
  }

  async getMarketConditions(): Promise<{
    volatility: number
    trendStrength: number
    marketSentiment: number
    volume: number
  }> {
    return await this.analyzeMarketConditions()
  }
}

// Export singleton instance
export const sentimentTradeIntegration = new SentimentTradeIntegration()