export interface ActivityLogEntry {
  id: string
  timestamp: number
  type: 'reddit_scan' | 'twitter_scan' | 'symbol_detection' | 'pump_alert' | 'new_symbol' | 'historical_check' | 'api_call' | 'error'
  platform: 'reddit' | 'twitter' | 'system' | 'api'
  source: string // subreddit name, username, API endpoint, etc.
  message: string
  data?: any
  duration?: number // milliseconds
  severity: 'info' | 'warning' | 'error' | 'critical' | 'success'
  symbols?: string[]
  metrics?: {
    posts?: number
    comments?: number
    mentions?: number
    sentiment?: number
    riskScore?: number
  }
}

export class ActivityLogger {
  private static instance: ActivityLogger | null = null
  private logs: ActivityLogEntry[] = []
  private maxLogs = 10000 // Keep last 10k entries
  private listeners: Set<(entry: ActivityLogEntry) => void> = new Set()

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger()
    }
    return ActivityLogger.instance
  }

  // Add a new log entry
  log(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>): ActivityLogEntry {
    const logEntry: ActivityLogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: Date.now()
    }

    // Add to logs array
    this.logs.unshift(logEntry)

    // Trim old logs if necessary
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(logEntry)
      } catch (error) {
        console.error('Error in activity log listener:', error)
      }
    })

    // Also log to console for debugging
    this.logToConsole(logEntry)

    return logEntry
  }

  // Convenience methods for different log types
  logRedditScan(subreddit: string, data: any, duration?: number): ActivityLogEntry {
    return this.log({
      type: 'reddit_scan',
      platform: 'reddit',
      source: `r/${subreddit}`,
      message: `Scanned r/${subreddit} - ${data.totalPosts || 0} posts, ${data.totalComments || 0} comments`,
      data,
      duration,
      severity: 'info',
      metrics: {
        posts: data.totalPosts,
        comments: data.totalComments,
        sentiment: data.avgSentiment
      }
    })
  }

  logTwitterScan(query: string, data: any, duration?: number): ActivityLogEntry {
    return this.log({
      type: 'twitter_scan',
      platform: 'twitter',
      source: query,
      message: `Twitter search "${query}" - ${data.result_count || 0} tweets`,
      data,
      duration,
      severity: 'info',
      metrics: {
        posts: data.result_count
      }
    })
  }

  logSymbolDetection(symbols: string[], source: string, data: any): ActivityLogEntry {
    return this.log({
      type: 'symbol_detection',
      platform: 'system',
      source,
      message: `Detected ${symbols.length} symbols: ${symbols.slice(0, 5).join(', ')}${symbols.length > 5 ? '...' : ''}`,
      data,
      severity: 'info',
      symbols,
      metrics: {
        mentions: symbols.length
      }
    })
  }

  logPumpAlert(symbol: string, riskLevel: string, confidence: number, source: string): ActivityLogEntry {
    return this.log({
      type: 'pump_alert',
      platform: 'system',
      source,
      message: `🚨 PUMP ALERT: ${symbol} (${riskLevel.toUpperCase()}) - ${Math.round(confidence * 100)}% confidence`,
      data: { symbol, riskLevel, confidence },
      severity: riskLevel === 'critical' ? 'critical' : riskLevel === 'high' ? 'error' : 'warning',
      symbols: [symbol],
      metrics: {
        riskScore: confidence
      }
    })
  }

  logNewSymbol(symbol: string, platforms: string[], mentions: number): ActivityLogEntry {
    return this.log({
      type: 'new_symbol',
      platform: 'system',
      source: platforms.join(', '),
      message: `🆕 NEW SYMBOL: ${symbol} detected on ${platforms.join(', ')} (${mentions} mentions)`,
      data: { symbol, platforms, mentions },
      severity: 'success',
      symbols: [symbol],
      metrics: {
        mentions
      }
    })
  }

  logHistoricalCheck(symbol: string, result: any, duration?: number): ActivityLogEntry {
    return this.log({
      type: 'historical_check',
      platform: 'system',
      source: 'historical_verifier',
      message: `Historical check for ${symbol} - ${result.hasHistory ? 'Found history' : 'No history'}`,
      data: result,
      duration,
      severity: 'info',
      symbols: [symbol]
    })
  }

  logApiCall(endpoint: string, method: string, duration?: number, error?: string): ActivityLogEntry {
    return this.log({
      type: 'api_call',
      platform: 'api',
      source: endpoint,
      message: `${method} ${endpoint}${duration ? ` (${duration}ms)` : ''}${error ? ` - ERROR: ${error}` : ''}`,
      duration,
      severity: error ? 'error' : 'info',
      data: { method, endpoint, error }
    })
  }

  logError(source: string, message: string, error: any): ActivityLogEntry {
    return this.log({
      type: 'error',
      platform: 'system',
      source,
      message: `ERROR: ${message}`,
      data: { error: error instanceof Error ? error.message : error },
      severity: 'error'
    })
  }

  // Subscribe to real-time updates
  subscribe(listener: (entry: ActivityLogEntry) => void): () => void {
    this.listeners.add(listener)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  // Get recent logs
  getRecentLogs(limit = 100, type?: ActivityLogEntry['type']): ActivityLogEntry[] {
    let logs = this.logs
    
    if (type) {
      logs = logs.filter(log => log.type === type)
    }
    
    return logs.slice(0, limit)
  }

  // Get logs by time range
  getLogsByTimeRange(startTime: number, endTime: number): ActivityLogEntry[] {
    return this.logs.filter(log => 
      log.timestamp >= startTime && log.timestamp <= endTime
    )
  }

  // Get logs by platform
  getLogsByPlatform(platform: ActivityLogEntry['platform']): ActivityLogEntry[] {
    return this.logs.filter(log => log.platform === platform)
  }

  // Get logs by severity
  getLogsBySeverity(severity: ActivityLogEntry['severity']): ActivityLogEntry[] {
    return this.logs.filter(log => log.severity === severity)
  }

  // Get activity statistics
  getStatistics(timeRangeMs = 60000): { // Default: last minute
    totalLogs: number
    byType: Record<string, number>
    byPlatform: Record<string, number>
    bySeverity: Record<string, number>
    avgDuration: number
    totalSymbols: number
    uniqueSymbols: number
    errorRate: number
  } {
    const cutoff = Date.now() - timeRangeMs
    const recentLogs = this.logs.filter(log => log.timestamp >= cutoff)
    
    const byType: Record<string, number> = {}
    const byPlatform: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}
    const allSymbols: string[] = []
    const durations: number[] = []
    let errorCount = 0

    for (const log of recentLogs) {
      byType[log.type] = (byType[log.type] || 0) + 1
      byPlatform[log.platform] = (byPlatform[log.platform] || 0) + 1
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1
      
      if (log.symbols) {
        allSymbols.push(...log.symbols)
      }
      
      if (log.duration) {
        durations.push(log.duration)
      }
      
      if (log.severity === 'error' || log.severity === 'critical') {
        errorCount++
      }
    }

    return {
      totalLogs: recentLogs.length,
      byType,
      byPlatform,
      bySeverity,
      avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      totalSymbols: allSymbols.length,
      uniqueSymbols: new Set(allSymbols).size,
      errorRate: recentLogs.length > 0 ? errorCount / recentLogs.length : 0
    }
  }

  // Clear all logs
  clearLogs(): void {
    this.logs = []
  }

  // Get all logs (for export)
  getAllLogs(): ActivityLogEntry[] {
    return [...this.logs]
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private logToConsole(entry: ActivityLogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString()
    const prefix = `[${timestamp}] [${entry.platform.toUpperCase()}] [${entry.type.toUpperCase()}]`
    
    switch (entry.severity) {
      case 'critical':
        console.error(`${prefix} 🔴 ${entry.message}`, entry.data)
        break
      case 'error':
        console.error(`${prefix} ❌ ${entry.message}`, entry.data)
        break
      case 'warning':
        console.warn(`${prefix} ⚠️ ${entry.message}`, entry.data)
        break
      case 'success':
        console.log(`${prefix} ✅ ${entry.message}`, entry.data)
        break
      default:
        console.log(`${prefix} ℹ️ ${entry.message}`, entry.data)
    }
  }

  // Performance monitoring
  startTimer(label: string): () => number {
    const startTime = performance.now()
    
    return () => {
      const duration = Math.round(performance.now() - startTime)
      return duration
    }
  }

  // Batch logging for high-frequency operations
  private batchBuffer: ActivityLogEntry[] = []
  private batchTimeout: NodeJS.Timeout | null = null

  logBatch(entries: Omit<ActivityLogEntry, 'id' | 'timestamp'>[]): void {
    const logEntries = entries.map(entry => ({
      ...entry,
      id: this.generateId(),
      timestamp: Date.now()
    }))

    this.batchBuffer.push(...logEntries)

    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
    }

    // Process batch after 100ms or when buffer reaches 50 entries
    if (this.batchBuffer.length >= 50) {
      this.processBatch()
    } else {
      this.batchTimeout = setTimeout(() => this.processBatch(), 100)
    }
  }

  private processBatch(): void {
    if (this.batchBuffer.length === 0) return

    const batch = [...this.batchBuffer]
    this.batchBuffer = []

    // Add to logs
    this.logs.unshift(...batch)

    // Trim if necessary
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // Notify listeners for each entry
    batch.forEach(entry => {
      this.listeners.forEach(listener => {
        try {
          listener(entry)
        } catch (error) {
          console.error('Error in batch activity log listener:', error)
        }
      })
    })
  }
}