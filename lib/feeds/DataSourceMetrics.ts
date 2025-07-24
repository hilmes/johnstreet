import { kv } from '@vercel/kv'

export interface DataSourceMetrics {
  name: string
  totalEvents: number
  totalErrors: number
  firstSeen: number
  lastActivity: number
  lastError?: {
    timestamp: number
    message: string
  }
  dailyEvents: Record<string, number> // date -> count
  hourlyRate: number[]  // Last 24 hours
}

export class DataSourceMetricsTracker {
  private static instance: DataSourceMetricsTracker
  private metrics: Map<string, DataSourceMetrics> = new Map()
  private updateQueue: Map<string, DataSourceMetrics> = new Map()
  private flushInterval: NodeJS.Timeout | null = null
  private isInitialized: boolean = false

  private constructor() {}

  static getInstance(): DataSourceMetricsTracker {
    if (!DataSourceMetricsTracker.instance) {
      DataSourceMetricsTracker.instance = new DataSourceMetricsTracker()
    }
    return DataSourceMetricsTracker.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Check if KV is available
      if (!kv) {
        console.warn('Vercel KV not available, using in-memory metrics only')
        this.initializeInMemoryMetrics()
        this.isInitialized = true
        return
      }

      // Load all data source metrics from KV
      const sources = ['rss_monitor', 'twitter_stream', 'cryptopanic', 'lunarcrush', 'pushshift']
      
      for (const source of sources) {
        const key = `metrics:datasource:${source}`
        try {
          const stored = await kv.get<DataSourceMetrics>(key)
          
          if (stored) {
            this.metrics.set(source, stored)
          } else {
            // Initialize new metrics
            this.metrics.set(source, {
              name: source,
              totalEvents: 0,
              totalErrors: 0,
              firstSeen: Date.now(),
              lastActivity: Date.now(),
              dailyEvents: {},
              hourlyRate: new Array(24).fill(0)
            })
          }
        } catch (error) {
          console.warn(`Failed to load metrics for ${source}, initializing fresh:`, error)
          this.metrics.set(source, {
            name: source,
            totalEvents: 0,
            totalErrors: 0,
            firstSeen: Date.now(),
            lastActivity: Date.now(),
            dailyEvents: {},
            hourlyRate: new Array(24).fill(0)
          })
        }
      }

      // Start flush interval - persist updates every 30 seconds
      this.flushInterval = setInterval(() => {
        this.flushMetrics()
      }, 30000)

      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize DataSourceMetricsTracker:', error)
      // Fall back to in-memory only
      this.initializeInMemoryMetrics()
      this.isInitialized = true
    }
  }

  private initializeInMemoryMetrics(): void {
    const sources = ['rss_monitor', 'twitter_stream', 'cryptopanic', 'lunarcrush', 'pushshift']
    for (const source of sources) {
      this.metrics.set(source, {
        name: source,
        totalEvents: 0,
        totalErrors: 0,
        firstSeen: Date.now(),
        lastActivity: Date.now(),
        dailyEvents: {},
        hourlyRate: new Array(24).fill(0)
      })
    }
  }

  async recordEvent(sourceName: string, count: number = 1): Promise<void> {
    await this.ensureInitialized()
    
    const metrics = this.metrics.get(sourceName) || {
      name: sourceName,
      totalEvents: 0,
      totalErrors: 0,
      firstSeen: Date.now(),
      lastActivity: Date.now(),
      dailyEvents: {},
      hourlyRate: new Array(24).fill(0)
    }

    // Update metrics
    metrics.totalEvents += count
    metrics.lastActivity = Date.now()

    // Update daily count
    const today = new Date().toISOString().split('T')[0]
    metrics.dailyEvents[today] = (metrics.dailyEvents[today] || 0) + count

    // Update hourly rate (rolling 24-hour window)
    const currentHour = new Date().getHours()
    metrics.hourlyRate[currentHour] = (metrics.hourlyRate[currentHour] || 0) + count

    this.metrics.set(sourceName, metrics)
    this.updateQueue.set(sourceName, metrics)
  }

  async recordError(sourceName: string, error: Error): Promise<void> {
    await this.ensureInitialized()
    
    const metrics = this.metrics.get(sourceName) || {
      name: sourceName,
      totalEvents: 0,
      totalErrors: 0,
      firstSeen: Date.now(),
      lastActivity: Date.now(),
      dailyEvents: {},
      hourlyRate: new Array(24).fill(0)
    }

    metrics.totalErrors += 1
    metrics.lastError = {
      timestamp: Date.now(),
      message: error.message
    }

    this.metrics.set(sourceName, metrics)
    this.updateQueue.set(sourceName, metrics)
  }

  async getMetrics(sourceName?: string): Promise<DataSourceMetrics | DataSourceMetrics[] | null> {
    await this.ensureInitialized()
    
    if (sourceName) {
      return this.metrics.get(sourceName) || null
    }
    
    return Array.from(this.metrics.values())
  }

  async getAggregatedStats(): Promise<{
    totalEvents: number
    totalErrors: number
    activeSources: number
    eventsPerSecond: number
    topSources: { name: string; events: number }[]
  }> {
    await this.ensureInitialized()
    
    const allMetrics = Array.from(this.metrics.values())
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)
    
    const activeSources = allMetrics.filter(m => m.lastActivity > oneHourAgo).length
    
    // Calculate events per second based on last hour
    const currentHour = new Date().getHours()
    const eventsLastHour = allMetrics.reduce((sum, m) => 
      sum + (m.hourlyRate[currentHour] || 0), 0
    )
    const eventsPerSecond = eventsLastHour / 3600

    return {
      totalEvents: allMetrics.reduce((sum, m) => sum + m.totalEvents, 0),
      totalErrors: allMetrics.reduce((sum, m) => sum + m.totalErrors, 0),
      activeSources,
      eventsPerSecond,
      topSources: allMetrics
        .sort((a, b) => b.totalEvents - a.totalEvents)
        .slice(0, 5)
        .map(m => ({ name: m.name, events: m.totalEvents }))
    }
  }

  private async flushMetrics(): Promise<void> {
    if (this.updateQueue.size === 0) return
    
    // Skip if KV is not available
    if (!kv) return

    try {
      // Persist all queued updates
      const updates = Array.from(this.updateQueue.entries())
      
      await Promise.all(
        updates.map(([sourceName, metrics]) => 
          kv.set(`metrics:datasource:${sourceName}`, metrics, {
            ex: 30 * 24 * 60 * 60 // 30 days expiration
          }).catch(error => {
            console.warn(`Failed to persist metrics for ${sourceName}:`, error)
          })
        )
      )

      // Also update aggregate stats
      const stats = await this.getAggregatedStats()
      await kv.set('metrics:datasource:aggregate', {
        ...stats,
        lastUpdated: Date.now()
      }, { ex: 30 * 24 * 60 * 60 }).catch(error => {
        console.warn('Failed to persist aggregate stats:', error)
      })

      // Clear the update queue
      this.updateQueue.clear()
    } catch (error) {
      console.error('Failed to flush metrics:', error)
      // Don't clear queue on error, retry next time
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }

  async cleanup(): Promise<void> {
    // Flush any pending updates
    await this.flushMetrics()
    
    // Clear interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
  }
}

// Export singleton instance
export const dataSourceMetrics = DataSourceMetricsTracker.getInstance()