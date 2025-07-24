import { activityLoggerKV } from '@/lib/sentiment/ActivityLoggerKV'
import { historicalVerifierKV } from '@/lib/sentiment/HistoricalVerifierKV'
import { rssMonitor, RSSFeedConfig } from './RSSMonitor'
import { twitterStreamingClient, TwitterStreamConfig } from './TwitterStreamingClient'
import { cryptoPanicClient, CryptoPanicConfig } from './CryptoPanicClient'
import { lunarCrushClient, LunarCrushConfig } from './LunarCrushClient'
import { pushshiftClient, PushshiftConfig } from './PushshiftClient'

export interface DataOrchestratorConfig {
  rss: {
    enabled: boolean
    config?: Partial<RSSFeedConfig>
  }
  twitter: {
    enabled: boolean
    config?: TwitterStreamConfig
  }
  cryptopanic: {
    enabled: boolean
    config?: CryptoPanicConfig
  }
  lunarcrush: {
    enabled: boolean
    config?: LunarCrushConfig
  }
  pushshift: {
    enabled: boolean
    config?: PushshiftConfig
  }
  coordination: {
    symbolVerificationEnabled: boolean
    crossPlatformAnalysisEnabled: boolean
    realTimeAlertsEnabled: boolean
    historicalAnalysisEnabled: boolean
  }
}

export interface DataSourceStatus {
  name: string
  enabled: boolean
  isActive: boolean
  lastActivity: number
  totalProcessed: number
  errors: number
  performance: {
    avgResponseTime: number
    successRate: number
    requestsPerMinute: number
  }
}

export interface CrossPlatformSignal {
  symbol: string
  confidence: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  platforms: string[]
  sources: Array<{
    platform: string
    source: string
    timestamp: number
    sentiment: number
    pumpIndicators: string[]
    engagement: number
  }>
  correlation: {
    timeCluster: boolean // Multiple mentions within short time window
    crossPlatform: boolean // Mentions across different platforms
    sentimentAlignment: boolean // Similar sentiment across sources
    volumeSpike: boolean // Unusual volume of mentions
  }
  recommendation: 'monitor' | 'investigate' | 'alert' | 'urgent'
  firstDetected: number
  lastUpdated: number
}

export interface OrchestratorStats {
  totalDataSources: number
  activeDataSources: number
  totalSymbolsDetected: number
  crossPlatformSignals: number
  criticalAlerts: number
  dataSourceStatus: DataSourceStatus[]
  performance: {
    avgProcessingTime: number
    totalEventsProcessed: number
    eventsPerMinute: number
    errorRate: number
  }
}

export class DataOrchestrator {
  private config: DataOrchestratorConfig | null = null
  private isRunning = false
  private activeSignals: Map<string, CrossPlatformSignal> = new Map()
  private coordinationInterval: NodeJS.Timeout | null = null
  private stats: OrchestratorStats = {
    totalDataSources: 5,
    activeDataSources: 0,
    totalSymbolsDetected: 0,
    crossPlatformSignals: 0,
    criticalAlerts: 0,
    dataSourceStatus: [],
    performance: {
      avgProcessingTime: 0,
      totalEventsProcessed: 0,
      eventsPerMinute: 0,
      errorRate: 0
    }
  }

  constructor() {
    this.setupEventListeners()
  }

  async initialize(config: DataOrchestratorConfig): Promise<void> {
    this.config = config

    try {
      await activityLoggerKV.log({
        type: 'api_call',
        platform: 'system',
        source: 'data_orchestrator',
        message: 'Initializing Data Orchestrator',
        data: { 
          enabledSources: Object.entries(config).filter(([key, value]) => 
            typeof value === 'object' && value.enabled
          ).map(([key]) => key)
        },
        severity: 'info'
      })

      // Initialize RSS Monitor
      if (config.rss.enabled) {
        await this.initializeRSSMonitor()
      }

      // Initialize Twitter Streaming
      if (config.twitter.enabled && config.twitter.config) {
        await this.initializeTwitterStreaming(config.twitter.config)
      }

      // Initialize CryptoPanic
      if (config.cryptopanic.enabled && config.cryptopanic.config) {
        await this.initializeCryptoPanic(config.cryptopanic.config)
      }

      // Initialize LunarCrush
      if (config.lunarcrush.enabled && config.lunarcrush.config) {
        await this.initializeLunarCrush(config.lunarcrush.config)
      }

      // Initialize Pushshift
      if (config.pushshift.enabled && config.pushshift.config) {
        await this.initializePushshift(config.pushshift.config)
      }

      await activityLoggerKV.log({
        type: 'api_call',
        platform: 'system',
        source: 'data_orchestrator',
        message: 'Data Orchestrator initialized successfully',
        data: { 
          configuredSources: this.getActiveSourceCount(),
          coordinationEnabled: config.coordination.crossPlatformAnalysisEnabled
        },
        severity: 'success'
      })

    } catch (error) {
      await activityLoggerKV.logError(
        'Data Orchestrator',
        'Failed to initialize Data Orchestrator',
        error
      )
      throw error
    }
  }

  async start(): Promise<void> {
    if (!this.config) {
      throw new Error('Data Orchestrator not initialized')
    }

    if (this.isRunning) {
      await activityLoggerKV.log({
        type: 'api_call',
        platform: 'system',
        source: 'data_orchestrator',
        message: 'Data Orchestrator already running',
        severity: 'warning'
      })
      return
    }

    this.isRunning = true

    try {
      // Start all enabled data sources
      await this.startDataSources()

      // Start coordination and analysis
      if (this.config.coordination.crossPlatformAnalysisEnabled) {
        this.startCrossPlatformAnalysis()
      }

      await activityLoggerKV.log({
        type: 'api_call',
        platform: 'system',
        source: 'data_orchestrator',
        message: 'Data Orchestrator started successfully',
        data: { 
          activeDataSources: this.getActiveSourceCount(),
          coordinationEnabled: this.config.coordination.crossPlatformAnalysisEnabled
        },
        severity: 'success'
      })

    } catch (error) {
      this.isRunning = false
      await activityLoggerKV.logError(
        'Data Orchestrator',
        'Failed to start Data Orchestrator',
        error
      )
      throw error
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return

    this.isRunning = false

    try {
      // Stop coordination
      if (this.coordinationInterval) {
        clearInterval(this.coordinationInterval)
        this.coordinationInterval = null
      }

      // Stop all data sources
      await this.stopDataSources()

      await activityLoggerKV.log({
        type: 'api_call',
        platform: 'system',
        source: 'data_orchestrator',
        message: 'Data Orchestrator stopped',
        severity: 'info'
      })

    } catch (error) {
      await activityLoggerKV.logError(
        'Data Orchestrator',
        'Error stopping Data Orchestrator',
        error
      )
    }
  }

  private async initializeRSSMonitor(): Promise<void> {
    // RSS Monitor is initialized by default with built-in feeds
    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'system',
      source: 'data_orchestrator',
      message: 'RSS Monitor ready (built-in configuration)',
      severity: 'success'
    })
  }

  private async initializeTwitterStreaming(config: TwitterStreamConfig): Promise<void> {
    await twitterStreamingClient.initialize(config)
  }

  private async initializeCryptoPanic(config: CryptoPanicConfig): Promise<void> {
    await cryptoPanicClient.initialize(config)
  }

  private async initializeLunarCrush(config: LunarCrushConfig): Promise<void> {
    await lunarCrushClient.initialize(config)
  }

  private async initializePushshift(config: PushshiftConfig): Promise<void> {
    await pushshiftClient.initialize(config)
  }

  private async startDataSources(): Promise<void> {
    const promises = []

    if (this.config!.rss.enabled) {
      promises.push(rssMonitor.start())
    }

    if (this.config!.twitter.enabled) {
      promises.push(twitterStreamingClient.startStreaming())
    }

    if (this.config!.cryptopanic.enabled) {
      promises.push(cryptoPanicClient.startMonitoring())
    }

    if (this.config!.lunarcrush.enabled) {
      promises.push(lunarCrushClient.startMonitoring())
    }

    // Note: Pushshift is used for historical analysis, not continuous monitoring

    await Promise.allSettled(promises)
  }

  private async stopDataSources(): Promise<void> {
    const promises = []

    if (rssMonitor.isMonitoring()) {
      promises.push(rssMonitor.stop())
    }

    if (twitterStreamingClient.isActive()) {
      promises.push(twitterStreamingClient.stopStreaming())
    }

    if (cryptoPanicClient.isActive()) {
      promises.push(cryptoPanicClient.stopMonitoring())
    }

    if (lunarCrushClient.isActive()) {
      promises.push(lunarCrushClient.stopMonitoring())
    }

    await Promise.allSettled(promises)
  }

  private startCrossPlatformAnalysis(): void {
    // Run cross-platform analysis every 30 seconds
    this.coordinationInterval = setInterval(async () => {
      await this.performCrossPlatformAnalysis()
    }, 30000)
  }

  private async performCrossPlatformAnalysis(): Promise<void> {
    try {
      const timer = activityLoggerKV.startTimer('Cross-platform analysis')

      // Get recent activity from the activity logger
      const recentActivity = await activityLoggerKV.getRecentActivity(5 * 60 * 1000) // Last 5 minutes
      
      // Group by symbol
      const symbolGroups = new Map<string, any[]>()
      
      for (const activity of recentActivity) {
        if (activity.type === 'symbol_detection' && activity.data?.symbols) {
          const symbols = Array.isArray(activity.data.symbols) ? activity.data.symbols : [activity.data.symbols]
          
          for (const symbol of symbols) {
            if (!symbolGroups.has(symbol)) {
              symbolGroups.set(symbol, [])
            }
            symbolGroups.get(symbol)!.push(activity)
          }
        }
      }

      // Analyze each symbol group for cross-platform signals
      for (const [symbol, activities] of symbolGroups) {
        if (activities.length >= 2) { // At least 2 mentions to be considered
          await this.analyzeSymbolActivities(symbol, activities)
        }
      }

      // Update performance stats
      const duration = timer()
      this.stats.performance.avgProcessingTime = duration
      this.stats.performance.totalEventsProcessed += recentActivity.length

      if (symbolGroups.size > 0) {
        await activityLoggerKV.log({
          type: 'api_call',
          platform: 'system',
          source: 'cross_platform_analysis',
          message: `Analyzed ${symbolGroups.size} symbols across platforms`,
          data: {
            symbolsAnalyzed: symbolGroups.size,
            totalActivities: recentActivity.length,
            activeSignals: this.activeSignals.size
          },
          duration,
          severity: 'info'
        })
      }

    } catch (error) {
      await activityLoggerKV.logError(
        'Cross-Platform Analysis',
        'Failed to perform cross-platform analysis',
        error
      )
    }
  }

  private async analyzeSymbolActivities(symbol: string, activities: any[]): Promise<void> {
    // Get unique platforms
    const platforms = [...new Set(activities.map(a => a.platform))]
    
    // Calculate correlation factors
    const timeCluster = this.detectTimeCluster(activities)
    const crossPlatform = platforms.length >= 2
    const sentimentAlignment = this.analyzeSentimentAlignment(activities)
    const volumeSpike = activities.length >= 5 // 5+ mentions in 5 minutes

    // Calculate overall confidence
    let confidence = 0.5 // Base confidence
    
    if (timeCluster) confidence += 0.2
    if (crossPlatform) confidence += 0.3
    if (sentimentAlignment) confidence += 0.2
    if (volumeSpike) confidence += 0.25
    
    confidence = Math.min(1, confidence)

    // Determine risk level
    let riskLevel: CrossPlatformSignal['riskLevel'] = 'low'
    const totalPumpIndicators = activities.reduce((sum, a) => 
      sum + (a.data?.pumpIndicators || 0), 0
    )
    
    if (confidence > 0.8 && totalPumpIndicators > 5) {
      riskLevel = 'critical'
    } else if (confidence > 0.7 && totalPumpIndicators > 3) {
      riskLevel = 'high'
    } else if (confidence > 0.6 && totalPumpIndicators > 1) {
      riskLevel = 'medium'
    }

    // Create or update signal
    const existingSignal = this.activeSignals.get(symbol)
    const now = Date.now()

    const signal: CrossPlatformSignal = {
      symbol,
      confidence,
      riskLevel,
      platforms,
      sources: activities.map(a => ({
        platform: a.platform,
        source: a.source,
        timestamp: a.timestamp,
        sentiment: a.data?.sentiment || 0,
        pumpIndicators: a.data?.pumpIndicators || [],
        engagement: a.data?.engagement || 0
      })),
      correlation: {
        timeCluster,
        crossPlatform,
        sentimentAlignment,
        volumeSpike
      },
      recommendation: this.determineRecommendation(confidence, riskLevel, totalPumpIndicators),
      firstDetected: existingSignal?.firstDetected || now,
      lastUpdated: now
    }

    this.activeSignals.set(symbol, signal)

    // Log significant signals
    if (confidence > 0.6 || riskLevel !== 'low') {
      await activityLoggerKV.log({
        type: 'cross_platform_signal',
        platform: 'system',
        source: 'data_orchestrator',
        message: `${riskLevel.toUpperCase()} RISK: Cross-platform signal detected for ${symbol}`,
        data: {
          symbol,
          confidence,
          riskLevel,
          platforms,
          mentions: activities.length,
          totalPumpIndicators,
          correlation: signal.correlation,
          recommendation: signal.recommendation
        },
        severity: riskLevel === 'critical' ? 'error' : riskLevel === 'high' ? 'warning' : 'info'
      })

      // Trigger historical verification for new symbols
      if (this.config!.coordination.symbolVerificationEnabled && !existingSignal) {
        await this.triggerHistoricalVerification(symbol, signal)
      }

      // Send real-time alert for critical signals
      if (this.config!.coordination.realTimeAlertsEnabled && riskLevel === 'critical') {
        await this.sendCriticalAlert(signal)
      }
    }

    // Update stats
    this.stats.crossPlatformSignals = this.activeSignals.size
    if (riskLevel === 'critical') {
      this.stats.criticalAlerts++
    }
  }

  private detectTimeCluster(activities: any[]): boolean {
    // Sort by timestamp
    const sorted = activities.sort((a, b) => a.timestamp - b.timestamp)
    
    // Check if most activities happened within a 2-minute window
    const windowSize = 2 * 60 * 1000 // 2 minutes
    let maxCluster = 0
    
    for (let i = 0; i < sorted.length; i++) {
      let clusterSize = 1
      const startTime = sorted[i].timestamp
      
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].timestamp - startTime <= windowSize) {
          clusterSize++
        } else {
          break
        }
      }
      
      maxCluster = Math.max(maxCluster, clusterSize)
    }
    
    return maxCluster >= Math.ceil(activities.length * 0.7) // 70% in same window
  }

  private analyzeSentimentAlignment(activities: any[]): boolean {
    const sentiments = activities
      .map(a => a.data?.sentiment)
      .filter(s => s !== undefined && s !== null)
    
    if (sentiments.length < 2) return false
    
    // Calculate standard deviation
    const mean = sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length
    const variance = sentiments.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / sentiments.length
    const stdDev = Math.sqrt(variance)
    
    // Low standard deviation indicates alignment
    return stdDev < 0.3 // Threshold for sentiment alignment
  }

  private determineRecommendation(
    confidence: number, 
    riskLevel: CrossPlatformSignal['riskLevel'], 
    pumpIndicators: number
  ): CrossPlatformSignal['recommendation'] {
    if (riskLevel === 'critical' || (confidence > 0.8 && pumpIndicators > 5)) {
      return 'urgent'
    } else if (riskLevel === 'high' || (confidence > 0.7 && pumpIndicators > 3)) {
      return 'alert'
    } else if (riskLevel === 'medium' || confidence > 0.6) {
      return 'investigate'
    } else {
      return 'monitor'
    }
  }

  private async triggerHistoricalVerification(symbol: string, signal: CrossPlatformSignal): Promise<void> {
    try {
      const verification = await historicalVerifierKV.verifyNewSymbol(symbol)
      
      await activityLoggerKV.log({
        type: 'historical_verification',
        platform: 'system',
        source: 'data_orchestrator',
        message: `Historical verification completed for ${symbol}`,
        data: {
          symbol,
          verification: {
            confidence: verification.confidence,
            riskLevel: verification.riskLevel,
            recommendation: verification.recommendation,
            hasHistory: verification.historicalContext.hasHistory
          },
          crossPlatformSignal: {
            confidence: signal.confidence,
            platforms: signal.platforms.length
          }
        },
        severity: verification.riskLevel === 'critical' ? 'error' : 'info'
      })
    } catch (error) {
      await activityLoggerKV.logError(
        'Historical Verification',
        `Failed to verify symbol ${symbol}`,
        error
      )
    }
  }

  private async sendCriticalAlert(signal: CrossPlatformSignal): Promise<void> {
    await activityLoggerKV.log({
      type: 'critical_alert',
      platform: 'system',
      source: 'data_orchestrator',
      message: `🚨 CRITICAL ALERT: ${signal.symbol} - High pump risk detected across ${signal.platforms.length} platforms`,
      data: {
        symbol: signal.symbol,
        confidence: signal.confidence,
        platforms: signal.platforms,
        sources: signal.sources.length,
        recommendation: signal.recommendation,
        correlation: signal.correlation
      },
      severity: 'error'
    })

    // TODO: In production, this would trigger:
    // - WebSocket push notifications
    // - Email/SMS alerts
    // - Dashboard notifications
    // - Integration with trading systems
  }

  private setupEventListeners(): void {
    // Clean up old signals every 10 minutes
    setInterval(() => {
      this.cleanupOldSignals()
    }, 10 * 60 * 1000)

    // Update stats every minute
    setInterval(() => {
      this.updateStats()
    }, 60 * 1000)
  }

  private cleanupOldSignals(): void {
    const cutoff = Date.now() - (30 * 60 * 1000) // 30 minutes ago
    let cleaned = 0

    for (const [symbol, signal] of this.activeSignals) {
      if (signal.lastUpdated < cutoff) {
        this.activeSignals.delete(symbol)
        cleaned++
      }
    }

    if (cleaned > 0) {
      activityLoggerKV.log({
        type: 'api_call',
        platform: 'system',
        source: 'data_orchestrator',
        message: `Cleaned up ${cleaned} old cross-platform signals`,
        data: { cleaned, activeSignals: this.activeSignals.size },
        severity: 'info'
      })
    }
  }

  private updateStats(): void {
    this.stats.activeDataSources = this.getActiveSourceCount()
    this.stats.dataSourceStatus = this.getDataSourceStatus()
    
    // Update performance metrics (simplified)
    const eventsPerMinute = this.stats.performance.totalEventsProcessed / 60
    this.stats.performance.eventsPerMinute = eventsPerMinute
  }

  private getActiveSourceCount(): number {
    let count = 0
    if (rssMonitor.isMonitoring()) count++
    if (twitterStreamingClient.isActive()) count++
    if (cryptoPanicClient.isActive()) count++
    if (lunarCrushClient.isActive()) count++
    // Pushshift is not continuously active
    return count
  }

  private getDataSourceStatus(): DataSourceStatus[] {
    const status: DataSourceStatus[] = []

    // RSS Monitor Status
    status.push({
      name: 'RSS Monitor',
      enabled: this.config?.rss.enabled || false,
      isActive: rssMonitor.isMonitoring(),
      lastActivity: Date.now(), // Simplified
      totalProcessed: rssMonitor.getFeedStats().totalItems,
      errors: rssMonitor.getFeedStats().totalErrors,
      performance: {
        avgResponseTime: 1000, // Simplified
        successRate: 0.95, // Simplified
        requestsPerMinute: 2 // Simplified
      }
    })

    // Twitter Streaming Status
    const twitterStats = twitterStreamingClient.getStats()
    status.push({
      name: 'Twitter Streaming',
      enabled: this.config?.twitter.enabled || false,
      isActive: twitterStats.isStreaming,
      lastActivity: Date.now(),
      totalProcessed: 0, // Would need to track this
      errors: twitterStats.reconnectAttempts,
      performance: {
        avgResponseTime: 500,
        successRate: 0.98,
        requestsPerMinute: twitterStats.tweetsThisMinute
      }
    })

    // CryptoPanic Status
    const cryptoPanicStats = cryptoPanicClient.getStats()
    status.push({
      name: 'CryptoPanic',
      enabled: this.config?.cryptopanic.enabled || false,
      isActive: cryptoPanicStats.isRunning,
      lastActivity: Date.now(),
      totalProcessed: cryptoPanicStats.processedPostsCount,
      errors: 0, // Would need to track this
      performance: {
        avgResponseTime: 1500,
        successRate: 0.92,
        requestsPerMinute: 1
      }
    })

    // LunarCrush Status
    const lunarCrushStats = lunarCrushClient.getStats()
    status.push({
      name: 'LunarCrush',
      enabled: this.config?.lunarcrush.enabled || false,
      isActive: lunarCrushStats.isRunning,
      lastActivity: lunarCrushStats.lastProcessedTime,
      totalProcessed: lunarCrushStats.processedPostsCount,
      errors: 0, // Would need to track this
      performance: {
        avgResponseTime: 2000,
        successRate: 0.90,
        requestsPerMinute: 0.5
      }
    })

    // Pushshift Status
    const pushshiftStats = pushshiftClient.getRequestStats()
    status.push({
      name: 'Pushshift',
      enabled: this.config?.pushshift.enabled || false,
      isActive: pushshiftStats.isProcessingQueue,
      lastActivity: Date.now(),
      totalProcessed: 0, // Historical, not continuous
      errors: 0,
      performance: {
        avgResponseTime: 3000,
        successRate: 0.85,
        requestsPerMinute: pushshiftStats.requestCount
      }
    })

    return status
  }

  // Public API methods
  getActiveSignals(): CrossPlatformSignal[] {
    return Array.from(this.activeSignals.values())
      .sort((a, b) => b.confidence - a.confidence)
  }

  getSignalForSymbol(symbol: string): CrossPlatformSignal | null {
    return this.activeSignals.get(symbol.toUpperCase()) || null
  }

  getStats(): OrchestratorStats {
    return { ...this.stats }
  }

  isActive(): boolean {
    return this.isRunning
  }

  getConfig(): DataOrchestratorConfig | null {
    return this.config
  }

  // Historical analysis methods
  async performHistoricalAnalysis(symbol: string, daysBack: number = 7): Promise<any> {
    if (!this.config?.pushshift.enabled) {
      throw new Error('Pushshift not enabled for historical analysis')
    }

    try {
      const results = await pushshiftClient.searchSymbolHistory(symbol, daysBack, 100)
      
      await activityLoggerKV.log({
        type: 'historical_analysis',
        platform: 'system',
        source: 'data_orchestrator',
        message: `Historical analysis completed for ${symbol}`,
        data: {
          symbol,
          daysBack,
          submissions: results.submissions.length,
          comments: results.comments.length
        },
        severity: 'success'
      })

      return results
    } catch (error) {
      await activityLoggerKV.logError(
        'Historical Analysis',
        `Failed to perform historical analysis for ${symbol}`,
        error
      )
      throw error
    }
  }

  async getTrendingDiscussions(hours: number = 6): Promise<any> {
    if (!this.config?.pushshift.enabled) {
      throw new Error('Pushshift not enabled for trending analysis')
    }

    try {
      return await pushshiftClient.getTrendingCryptoDiscussions(hours, 10)
    } catch (error) {
      await activityLoggerKV.logError(
        'Trending Analysis',
        'Failed to get trending discussions',
        error
      )
      throw error
    }
  }

  // Configuration updates
  async updateConfig(newConfig: Partial<DataOrchestratorConfig>): Promise<void> {
    if (!this.config) return

    this.config = { ...this.config, ...newConfig }

    await activityLoggerKV.log({
      type: 'api_call',
      platform: 'system',
      source: 'data_orchestrator',
      message: 'Data Orchestrator configuration updated',
      data: { updatedFields: Object.keys(newConfig) },
      severity: 'info'
    })

    // Restart if running to apply new configuration
    if (this.isRunning) {
      await this.stop()
      await this.start()
    }
  }
}

// Export singleton instance
export const dataOrchestrator = new DataOrchestrator()