import { kv } from '@vercel/kv'
import { ActivityLogEntry } from './ActivityLogger'

const KV_KEYS = {
  // Store logs by day for efficient querying
  logsByDay: (date: string) => `activity:logs:${date}`, // YYYY-MM-DD
  recentLogs: 'activity:logs:recent', // Last 1000 entries for real-time
  statistics: (timeRange: string) => `activity:stats:${timeRange}`, // hour, day, week
  symbols: 'activity:symbols:tracked', // All tracked symbols
  alerts: 'activity:alerts:recent', // Recent pump alerts
  errors: 'activity:errors:recent', // Recent errors
  performance: 'activity:performance:metrics' // Performance metrics
}

export interface ActivityStats {
  totalLogs: number
  byType: Record<string, number>
  byPlatform: Record<string, number>
  bySeverity: Record<string, number>
  avgDuration: number
  totalSymbols: number
  uniqueSymbols: number
  errorRate: number
  lastUpdated: number
}

export interface PerformanceMetrics {
  avgResponseTime: number
  totalRequests: number
  errorCount: number
  uptime: number
  lastReset: number
}

export class ActivityLoggerKV {
  private static instance: ActivityLoggerKV | null = null
  private listeners: Set<(entry: ActivityLogEntry) => void> = new Set()
  private maxRecentLogs = 1000 // Keep last 1k for real-time
  private maxDailyLogs = 50000 // Keep 50k logs per day
  private statsCache: Map<string, { data: ActivityStats; expires: number }> = new Map()
  private statsCacheTTL = 60000 // 1 minute cache

  private constructor() {
    // Initialize cleanup interval - runs every hour
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 60 * 60 * 1000)
    }
  }

  static getInstance(): ActivityLoggerKV {
    if (!ActivityLoggerKV.instance) {
      ActivityLoggerKV.instance = new ActivityLoggerKV()
    }
    return ActivityLoggerKV.instance
  }

  // Add a new log entry with KV persistence
  async log(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>): Promise<ActivityLogEntry> {
    const logEntry: ActivityLogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: Date.now()
    }

    // Store in multiple locations for efficient querying
    await Promise.all([
      this.storeInRecent(logEntry),
      this.storeInDaily(logEntry),
      this.updateStatistics(logEntry),
      this.trackSymbols(logEntry),
      this.storeAlerts(logEntry),
      this.storeErrors(logEntry)
    ])

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

  // Store in recent logs (capped list for real-time)
  private async storeInRecent(entry: ActivityLogEntry): Promise<void> {
    try {
      // Get current recent logs
      const recentLogs = await kv.lrange(KV_KEYS.recentLogs, 0, -1) as ActivityLogEntry[]
      
      // Add new entry to the front
      await kv.lpush(KV_KEYS.recentLogs, JSON.stringify(entry))
      
      // Trim to max size
      await kv.ltrim(KV_KEYS.recentLogs, 0, this.maxRecentLogs - 1)
    } catch (error) {
      console.error('Error storing recent log:', error)
    }
  }

  // Store in daily logs
  private async storeInDaily(entry: ActivityLogEntry): Promise<void> {
    try {
      const date = new Date(entry.timestamp).toISOString().split('T')[0] // YYYY-MM-DD
      const dayKey = KV_KEYS.logsByDay(date)
      
      // Add to daily logs
      await kv.lpush(dayKey, JSON.stringify(entry))
      
      // Set expiry for daily logs (30 days)
      await kv.expire(dayKey, 30 * 24 * 60 * 60)
      
      // Trim daily logs if too large
      const count = await kv.llen(dayKey)
      if (count > this.maxDailyLogs) {
        await kv.ltrim(dayKey, 0, this.maxDailyLogs - 1)
      }
    } catch (error) {
      console.error('Error storing daily log:', error)
    }
  }

  // Update running statistics
  private async updateStatistics(entry: ActivityLogEntry): Promise<void> {
    try {
      const timeRanges = ['hour', 'day', 'week']
      
      for (const range of timeRanges) {
        const statsKey = KV_KEYS.statistics(range)
        const existing = await kv.get(statsKey) as ActivityStats || this.getEmptyStats()
        
        // Update statistics
        existing.totalLogs++
        existing.byType[entry.type] = (existing.byType[entry.type] || 0) + 1
        existing.byPlatform[entry.platform] = (existing.byPlatform[entry.platform] || 0) + 1
        existing.bySeverity[entry.severity] = (existing.bySeverity[entry.severity] || 0) + 1
        
        if (entry.symbols) {
          existing.totalSymbols += entry.symbols.length
          // We'll calculate unique symbols separately
        }
        
        if (entry.duration) {
          // Update running average
          const currentTotal = existing.avgDuration * (existing.totalLogs - 1)
          existing.avgDuration = (currentTotal + entry.duration) / existing.totalLogs
        }
        
        if (entry.severity === 'error' || entry.severity === 'critical') {
          const errorCount = (existing.bySeverity.error || 0) + (existing.bySeverity.critical || 0)
          existing.errorRate = errorCount / existing.totalLogs
        }
        
        existing.lastUpdated = Date.now()
        
        // Store updated stats
        await kv.set(statsKey, existing, { ex: this.getStatsTTL(range) })
      }
      
      // Clear cache
      this.statsCache.clear()
    } catch (error) {
      console.error('Error updating statistics:', error)
    }
  }

  // Track symbols mentioned
  private async trackSymbols(entry: ActivityLogEntry): Promise<void> {
    if (!entry.symbols || entry.symbols.length === 0) return
    
    try {
      const existing = await kv.get(KV_KEYS.symbols) as Record<string, {
        count: number
        firstSeen: number
        lastSeen: number
        platforms: Set<string>
      }> || {}
      
      for (const symbol of entry.symbols) {
        if (!existing[symbol]) {
          existing[symbol] = {
            count: 0,
            firstSeen: entry.timestamp,
            lastSeen: entry.timestamp,
            platforms: new Set()
          }
        }
        
        existing[symbol].count++
        existing[symbol].lastSeen = entry.timestamp
        existing[symbol].platforms.add(entry.platform)
      }
      
      // Convert Sets to arrays for JSON storage
      const serializable = Object.fromEntries(
        Object.entries(existing).map(([symbol, data]) => [
          symbol,
          { ...data, platforms: Array.from(data.platforms) }
        ])
      )
      
      await kv.set(KV_KEYS.symbols, serializable, { ex: 7 * 24 * 60 * 60 }) // 7 days
    } catch (error) {
      console.error('Error tracking symbols:', error)
    }
  }

  // Store pump alerts separately for quick access
  private async storeAlerts(entry: ActivityLogEntry): Promise<void> {
    if (entry.type !== 'pump_alert') return
    
    try {
      await kv.lpush(KV_KEYS.alerts, JSON.stringify(entry))
      await kv.ltrim(KV_KEYS.alerts, 0, 99) // Keep last 100 alerts
      await kv.expire(KV_KEYS.alerts, 24 * 60 * 60) // 24 hours
    } catch (error) {
      console.error('Error storing alert:', error)
    }
  }

  // Store errors separately for monitoring
  private async storeErrors(entry: ActivityLogEntry): Promise<void> {
    if (entry.severity !== 'error' && entry.severity !== 'critical') return
    
    try {
      await kv.lpush(KV_KEYS.errors, JSON.stringify(entry))
      await kv.ltrim(KV_KEYS.errors, 0, 199) // Keep last 200 errors
      await kv.expire(KV_KEYS.errors, 7 * 24 * 60 * 60) // 7 days
    } catch (error) {
      console.error('Error storing error:', error)
    }
  }

  // Convenience methods for different log types
  async logRedditScan(subreddit: string, data: any, duration?: number): Promise<ActivityLogEntry> {
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

  async logTwitterScan(query: string, data: any, duration?: number): Promise<ActivityLogEntry> {
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

  async logSymbolDetection(symbols: string[], source: string, data: any): Promise<ActivityLogEntry> {
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

  async logPumpAlert(symbol: string, riskLevel: string, confidence: number, source: string): Promise<ActivityLogEntry> {
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

  async logNewSymbol(symbol: string, platforms: string[], mentions: number): Promise<ActivityLogEntry> {
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

  async logError(source: string, message: string, error: any): Promise<ActivityLogEntry> {
    return this.log({
      type: 'error',
      platform: 'system',
      source,
      message: `ERROR: ${message}`,
      data: { error: error instanceof Error ? error.message : error },
      severity: 'error'
    })
  }

  // Get recent logs from KV
  async getRecentLogs(limit = 100, type?: ActivityLogEntry['type']): Promise<ActivityLogEntry[]> {
    try {
      const logs = await kv.lrange(KV_KEYS.recentLogs, 0, limit - 1) as string[]
      const parsed = logs.map(log => JSON.parse(log) as ActivityLogEntry)
      
      if (type) {
        return parsed.filter(log => log.type === type)
      }
      
      return parsed
    } catch (error) {
      console.error('Error getting recent logs:', error)
      return []
    }
  }

  // Get logs by date range
  async getLogsByDateRange(startDate: string, endDate: string): Promise<ActivityLogEntry[]> {
    try {
      const logs: ActivityLogEntry[] = []
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      // Iterate through each day
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        const dayLogs = await kv.lrange(KV_KEYS.logsByDay(dateStr), 0, -1) as string[]
        const parsed = dayLogs.map(log => JSON.parse(log) as ActivityLogEntry)
        logs.push(...parsed)
      }
      
      return logs.sort((a, b) => b.timestamp - a.timestamp)
    } catch (error) {
      console.error('Error getting logs by date range:', error)
      return []
    }
  }

  // Get logs by time range (milliseconds)
  async getLogsByTimeRange(startTime: number, endTime: number): Promise<ActivityLogEntry[]> {
    const recentLogs = await this.getRecentLogs(1000)
    return recentLogs.filter(log => 
      log.timestamp >= startTime && log.timestamp <= endTime
    )
  }

  // Get statistics with caching
  async getStatistics(timeRange: 'hour' | 'day' | 'week' = 'hour'): Promise<ActivityStats> {
    const cacheKey = `stats-${timeRange}`
    const cached = this.statsCache.get(cacheKey)
    
    if (cached && cached.expires > Date.now()) {
      return cached.data
    }
    
    try {
      const stats = await kv.get(KV_KEYS.statistics(timeRange)) as ActivityStats
      if (stats) {
        // Cache the result
        this.statsCache.set(cacheKey, {
          data: stats,
          expires: Date.now() + this.statsCacheTTL
        })
        return stats
      }
    } catch (error) {
      console.error('Error getting statistics:', error)
    }
    
    return this.getEmptyStats()
  }

  // Get recent pump alerts
  async getRecentAlerts(limit = 50): Promise<ActivityLogEntry[]> {
    try {
      const alerts = await kv.lrange(KV_KEYS.alerts, 0, limit - 1) as string[]
      return alerts.map(alert => JSON.parse(alert) as ActivityLogEntry)
    } catch (error) {
      console.error('Error getting recent alerts:', error)
      return []
    }
  }

  // Get recent errors
  async getRecentErrors(limit = 50): Promise<ActivityLogEntry[]> {
    try {
      const errors = await kv.lrange(KV_KEYS.errors, 0, limit - 1) as string[]
      return errors.map(error => JSON.parse(error) as ActivityLogEntry)
    } catch (error) {
      console.error('Error getting recent errors:', error)
      return []
    }
  }

  // Get tracked symbols
  async getTrackedSymbols(): Promise<Record<string, {
    count: number
    firstSeen: number
    lastSeen: number
    platforms: string[]
  }>> {
    try {
      return await kv.get(KV_KEYS.symbols) || {}
    } catch (error) {
      console.error('Error getting tracked symbols:', error)
      return {}
    }
  }

  // Update performance metrics
  async updatePerformanceMetrics(responseTime: number, isError = false): Promise<void> {
    try {
      const existing = await kv.get(KV_KEYS.performance) as PerformanceMetrics || {
        avgResponseTime: 0,
        totalRequests: 0,
        errorCount: 0,
        uptime: Date.now(),
        lastReset: Date.now()
      }
      
      existing.totalRequests++
      if (isError) existing.errorCount++
      
      // Update running average
      const currentTotal = existing.avgResponseTime * (existing.totalRequests - 1)
      existing.avgResponseTime = (currentTotal + responseTime) / existing.totalRequests
      
      await kv.set(KV_KEYS.performance, existing, { ex: 24 * 60 * 60 }) // 24 hours
    } catch (error) {
      console.error('Error updating performance metrics:', error)
    }
  }

  // Get performance metrics
  async getPerformanceMetrics(): Promise<PerformanceMetrics | null> {
    try {
      return await kv.get(KV_KEYS.performance) as PerformanceMetrics
    } catch (error) {
      console.error('Error getting performance metrics:', error)
      return null
    }
  }

  // Subscribe to real-time updates
  subscribe(listener: (entry: ActivityLogEntry) => void): () => void {
    this.listeners.add(listener)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  // Clean up old data
  private async cleanup(): Promise<void> {
    try {
      // Get all daily log keys and remove old ones (older than 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0]
      
      // This would require scanning all keys, which is expensive in Redis
      // In practice, we rely on the expiry we set when creating the keys
      console.log('Cleanup process ran - relying on KV expiry for old data')
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }

  // Utility methods
  private getEmptyStats(): ActivityStats {
    return {
      totalLogs: 0,
      byType: {},
      byPlatform: {},
      bySeverity: {},
      avgDuration: 0,
      totalSymbols: 0,
      uniqueSymbols: 0,
      errorRate: 0,
      lastUpdated: Date.now()
    }
  }

  private getStatsTTL(range: string): number {
    switch (range) {
      case 'hour': return 60 * 60 // 1 hour
      case 'day': return 24 * 60 * 60 // 24 hours
      case 'week': return 7 * 24 * 60 * 60 // 7 days
      default: return 60 * 60
    }
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

  // Export data for analysis
  async exportLogs(startDate: string, endDate: string): Promise<string> {
    const logs = await this.getLogsByDateRange(startDate, endDate)
    return JSON.stringify(logs, null, 2)
  }

  // Get activity summary
  async getActivitySummary(): Promise<{
    recentLogsCount: number
    totalErrors: number
    totalAlerts: number
    trackedSymbolsCount: number
    performance: PerformanceMetrics | null
    lastActivity: number
  }> {
    try {
      const [recentLogs, errors, alerts, symbols, performance] = await Promise.all([
        this.getRecentLogs(1),
        this.getRecentErrors(1),
        this.getRecentAlerts(1),
        this.getTrackedSymbols(),
        this.getPerformanceMetrics()
      ])

      return {
        recentLogsCount: (await kv.llen(KV_KEYS.recentLogs)) || 0,
        totalErrors: (await kv.llen(KV_KEYS.errors)) || 0,
        totalAlerts: (await kv.llen(KV_KEYS.alerts)) || 0,
        trackedSymbolsCount: Object.keys(symbols).length,
        performance,
        lastActivity: recentLogs[0]?.timestamp || 0
      }
    } catch (error) {
      console.error('Error getting activity summary:', error)
      return {
        recentLogsCount: 0,
        totalErrors: 0,
        totalAlerts: 0,
        trackedSymbolsCount: 0,
        performance: null,
        lastActivity: 0
      }
    }
  }
}

// Export singleton instance
export const activityLoggerKV = new ActivityLoggerKV()