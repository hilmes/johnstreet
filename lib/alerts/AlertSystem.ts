import { EventEmitter } from 'events'
import cron from 'node-cron'
import { RedditScanner } from '../sentiment/RedditScanner'
import { UnifiedExchange } from '../exchanges/UnifiedExchange'
import { SentimentAnalyzer, CryptoPumpSignal } from '../sentiment/SentimentAnalyzer'

export interface Alert {
  id: string
  type: 'pump_signal' | 'volume_spike' | 'price_anomaly' | 'sentiment_spike' | 'coordinated_activity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  symbol: string
  message: string
  timestamp: number
  data: any
  acknowledged: boolean
}

export interface AlertConfig {
  enablePumpDetection: boolean
  enableVolumeAlerts: boolean
  enableSentimentAlerts: boolean
  volumeThreshold: number
  priceChangeThreshold: number
  sentimentThreshold: number
  monitoringInterval: number // minutes
  symbols: string[]
  exchanges: string[]
  subreddits: string[]
}

export class AlertSystem extends EventEmitter {
  private config: AlertConfig
  private alerts: Map<string, Alert> = new Map()
  private isRunning: boolean = false
  private cronJobs: cron.ScheduledTask[] = []
  private redditScanner: RedditScanner
  private exchanges: Map<string, UnifiedExchange> = new Map()
  private sentimentAnalyzer: SentimentAnalyzer

  constructor(config: AlertConfig) {
    super()
    this.config = config
    this.redditScanner = new RedditScanner()
    this.sentimentAnalyzer = new SentimentAnalyzer()
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Reddit scanner
      await this.redditScanner.connectPublic()
      
      // Initialize exchanges
      for (const exchangeName of this.config.exchanges) {
        const exchange = new UnifiedExchange(exchangeName)
        await exchange.connect()
        this.exchanges.set(exchangeName, exchange)
      }
      
      console.log('Alert system initialized successfully')
    } catch (error) {
      console.error('Failed to initialize alert system:', error)
      throw error
    }
  }

  start(): void {
    if (this.isRunning) {
      console.log('Alert system is already running')
      return
    }

    this.isRunning = true
    
    // Schedule monitoring tasks
    this.scheduleMonitoring()
    
    console.log('Alert system started')
    this.emit('started')
  }

  stop(): void {
    if (!this.isRunning) {
      console.log('Alert system is not running')
      return
    }

    // Stop all cron jobs
    this.cronJobs.forEach(job => job.stop())
    this.cronJobs = []
    
    this.isRunning = false
    
    console.log('Alert system stopped')
    this.emit('stopped')
  }

  private scheduleMonitoring(): void {
    // Schedule pump detection every X minutes
    if (this.config.enablePumpDetection) {
      const pumpDetectionJob = cron.schedule(`*/${this.config.monitoringInterval} * * * *`, () => {
        this.runPumpDetection()
      }, { scheduled: false })
      
      pumpDetectionJob.start()
      this.cronJobs.push(pumpDetectionJob)
    }

    // Schedule volume monitoring every minute
    if (this.config.enableVolumeAlerts) {
      const volumeJob = cron.schedule('* * * * *', () => {
        this.monitorVolumeSpikes()
      }, { scheduled: false })
      
      volumeJob.start()
      this.cronJobs.push(volumeJob)
    }

    // Schedule sentiment monitoring every 5 minutes
    if (this.config.enableSentimentAlerts) {
      const sentimentJob = cron.schedule('*/5 * * * *', () => {
        this.monitorSentiment()
      }, { scheduled: false })
      
      sentimentJob.start()
      this.cronJobs.push(sentimentJob)
    }
  }

  private async runPumpDetection(): Promise<void> {
    try {
      console.log('Running pump detection...')
      
      for (const symbol of this.config.symbols) {
        for (const [exchangeName, exchange] of this.exchanges) {
          try {
            // Get social media data
            const subredditAnalyses = await this.redditScanner.scanMultipleSubreddits(
              this.config.subreddits,
              'hour'
            )
            
            const allPumpSignals = subredditAnalyses.flatMap(analysis => analysis.pumpSignals)
            const symbolSignals = allPumpSignals.filter(signal => 
              signal.symbol.toLowerCase() === symbol.toLowerCase()
            )

            // Get market data
            const volumeSpike = await exchange.detectVolumeSpike(symbol, '1m', 50)
            const priceAnomaly = await exchange.detectPriceAnomaly(symbol, '1m', 50)

            // Detect pump signals
            if (symbolSignals.length > 0) {
              for (const signal of symbolSignals) {
                if (signal.riskLevel === 'high' || signal.riskLevel === 'critical') {
                  await this.createAlert({
                    type: 'pump_signal',
                    severity: signal.riskLevel === 'critical' ? 'critical' : 'high',
                    symbol,
                    message: `Potential pump detected for ${symbol} (${Math.round(signal.confidence * 100)}% confidence)`,
                    data: {
                      signal,
                      exchange: exchangeName,
                      volumeSpike: volumeSpike.isSpike,
                      priceAnomaly: priceAnomaly.isAnomaly
                    }
                  })
                }
              }
            }

            // Volume spike alerts
            if (volumeSpike.isSpike && volumeSpike.volumeSpike > this.config.volumeThreshold) {
              await this.createAlert({
                type: 'volume_spike',
                severity: volumeSpike.volumeSpike > 5 ? 'high' : 'medium',
                symbol,
                message: `${symbol} volume spike: ${volumeSpike.volumeSpike.toFixed(1)}x normal volume`,
                data: {
                  volumeSpike,
                  exchange: exchangeName
                }
              })
            }

            // Price anomaly alerts
            if (priceAnomaly.isAnomaly && Math.abs(priceAnomaly.percentChange) > this.config.priceChangeThreshold) {
              await this.createAlert({
                type: 'price_anomaly',
                severity: Math.abs(priceAnomaly.percentChange) > 15 ? 'high' : 'medium',
                symbol,
                message: `${symbol} price anomaly: ${priceAnomaly.percentChange.toFixed(2)}% change`,
                data: {
                  priceAnomaly,
                  exchange: exchangeName
                }
              })
            }

          } catch (error) {
            console.error(`Error monitoring ${symbol} on ${exchangeName}:`, error)
          }
        }
      }
    } catch (error) {
      console.error('Pump detection error:', error)
    }
  }

  private async monitorVolumeSpikes(): Promise<void> {
    try {
      for (const symbol of this.config.symbols) {
        for (const [exchangeName, exchange] of this.exchanges) {
          try {
            const volumeSpike = await exchange.detectVolumeSpike(symbol, '1m', 20)
            
            if (volumeSpike.isSpike && volumeSpike.volumeSpike > this.config.volumeThreshold) {
              await this.createAlert({
                type: 'volume_spike',
                severity: volumeSpike.volumeSpike > 5 ? 'high' : 'medium',
                symbol,
                message: `Volume spike detected: ${volumeSpike.volumeSpike.toFixed(1)}x normal`,
                data: { volumeSpike, exchange: exchangeName }
              })
            }
          } catch (error) {
            console.error(`Volume monitoring error for ${symbol}:`, error)
          }
        }
      }
    } catch (error) {
      console.error('Volume monitoring error:', error)
    }
  }

  private async monitorSentiment(): Promise<void> {
    try {
      const subredditAnalyses = await this.redditScanner.scanMultipleSubreddits(
        this.config.subreddits,
        'hour'
      )

      for (const analysis of subredditAnalyses) {
        if (Math.abs(analysis.sentimentScore) > this.config.sentimentThreshold) {
          const sentiment = analysis.sentimentScore > 0 ? 'bullish' : 'bearish'
          const severity = Math.abs(analysis.sentimentScore) > 0.8 ? 'high' : 'medium'
          
          await this.createAlert({
            type: 'sentiment_spike',
            severity,
            symbol: 'GENERAL',
            message: `Strong ${sentiment} sentiment in r/${analysis.subreddit} (${analysis.sentimentScore.toFixed(2)})`,
            data: { analysis }
          })
        }

        // Check for coordinated activity
        if (analysis.metrics.suspiciousActivity) {
          await this.createAlert({
            type: 'coordinated_activity',
            severity: 'high',
            symbol: 'GENERAL',
            message: `Suspicious coordinated activity detected in r/${analysis.subreddit}`,
            data: { analysis }
          })
        }
      }
    } catch (error) {
      console.error('Sentiment monitoring error:', error)
    }
  }

  private async createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): Promise<Alert> {
    const alert: Alert = {
      id: `${alertData.type}_${alertData.symbol}_${Date.now()}`,
      timestamp: Date.now(),
      acknowledged: false,
      ...alertData
    }

    // Check for duplicate alerts (same type/symbol within 10 minutes)
    const isDuplicate = Array.from(this.alerts.values()).some(existingAlert => 
      existingAlert.type === alert.type &&
      existingAlert.symbol === alert.symbol &&
      !existingAlert.acknowledged &&
      (alert.timestamp - existingAlert.timestamp) < 10 * 60 * 1000
    )

    if (!isDuplicate) {
      this.alerts.set(alert.id, alert)
      
      console.log(`New alert: ${alert.message}`)
      this.emit('alert', alert)
      
      // Auto-acknowledge low severity alerts after 30 minutes
      if (alert.severity === 'low') {
        setTimeout(() => {
          this.acknowledgeAlert(alert.id)
        }, 30 * 60 * 1000)
      }
    }

    return alert
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId)
    if (alert) {
      alert.acknowledged = true
      this.emit('alertAcknowledged', alert)
      return true
    }
    return false
  }

  getAlerts(unacknowledgedOnly: boolean = false): Alert[] {
    const alerts = Array.from(this.alerts.values())
    
    if (unacknowledgedOnly) {
      return alerts.filter(alert => !alert.acknowledged)
    }
    
    return alerts.sort((a, b) => b.timestamp - a.timestamp)
  }

  getAlertsBySymbol(symbol: string): Alert[] {
    return Array.from(this.alerts.values())
      .filter(alert => alert.symbol === symbol)
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  clearAcknowledgedAlerts(): number {
    const before = this.alerts.size
    
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.acknowledged) {
        this.alerts.delete(id)
      }
    }
    
    const cleared = before - this.alerts.size
    console.log(`Cleared ${cleared} acknowledged alerts`)
    
    return cleared
  }

  updateConfig(newConfig: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (this.isRunning) {
      this.stop()
      this.start()
    }
    
    this.emit('configUpdated', this.config)
  }

  getConfig(): AlertConfig {
    return { ...this.config }
  }

  isSystemRunning(): boolean {
    return this.isRunning
  }

  getStats(): {
    totalAlerts: number
    unacknowledgedAlerts: number
    alertsByType: Record<string, number>
    alertsBySeverity: Record<string, number>
  } {
    const alerts = this.getAlerts()
    const unacknowledged = alerts.filter(a => !a.acknowledged)
    
    const byType: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}
    
    for (const alert of alerts) {
      byType[alert.type] = (byType[alert.type] || 0) + 1
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1
    }
    
    return {
      totalAlerts: alerts.length,
      unacknowledgedAlerts: unacknowledged.length,
      alertsByType: byType,
      alertsBySeverity: bySeverity
    }
  }
}