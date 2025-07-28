import { CrossPlatformSignal } from '@/lib/feeds/DataOrchestrator'

export interface NotificationChannel {
  type: 'websocket' | 'email' | 'sms' | 'dashboard' | 'webhook'
  enabled: boolean
  config?: Record<string, any>
}

export interface NotificationPayload {
  id: string
  timestamp: Date
  type: 'signal' | 'alert' | 'trade' | 'system'
  severity: 'info' | 'warning' | 'error' | 'critical'
  title: string
  message: string
  data?: any
  channels: NotificationChannel['type'][]
}

export interface NotificationConfig {
  channels: NotificationChannel[]
  filters: {
    minSeverity: NotificationPayload['severity']
    types: NotificationPayload['type'][]
    symbols?: string[]
  }
  throttle: {
    maxPerMinute: number
    maxPerHour: number
  }
}

export class NotificationService {
  private config: NotificationConfig
  private notificationHistory: Map<string, NotificationPayload[]> = new Map()
  private websocketClients: Set<WebSocket> = new Set()
  
  constructor(config?: Partial<NotificationConfig>) {
    this.config = {
      channels: [
        { type: 'websocket', enabled: true },
        { type: 'dashboard', enabled: true },
        { type: 'email', enabled: false },
        { type: 'sms', enabled: false },
        { type: 'webhook', enabled: false }
      ],
      filters: {
        minSeverity: 'warning',
        types: ['signal', 'alert', 'trade']
      },
      throttle: {
        maxPerMinute: 10,
        maxPerHour: 100
      },
      ...config
    }
  }

  async sendCrossPlatformSignalAlert(signal: CrossPlatformSignal): Promise<void> {
    const notification: NotificationPayload = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'signal',
      severity: this.mapRiskToSeverity(signal.riskLevel),
      title: `Cross-Platform Signal: ${signal.symbol}`,
      message: this.buildSignalMessage(signal),
      data: signal,
      channels: this.getEnabledChannels()
    }

    await this.send(notification)
  }

  async send(notification: NotificationPayload): Promise<void> {
    // Check throttling
    if (!this.checkThrottle(notification)) {
      console.warn('Notification throttled:', notification.id)
      return
    }

    // Check filters
    if (!this.passesFilters(notification)) {
      return
    }

    // Store in history
    this.addToHistory(notification)

    // Send to enabled channels
    const promises = notification.channels.map(channel => {
      const channelConfig = this.config.channels.find(c => c.type === channel)
      if (channelConfig?.enabled) {
        return this.sendToChannel(channel, notification)
      }
      return Promise.resolve()
    })

    await Promise.all(promises)
  }

  private async sendToChannel(
    channel: NotificationChannel['type'], 
    notification: NotificationPayload
  ): Promise<void> {
    switch (channel) {
      case 'websocket':
        await this.sendWebSocketNotification(notification)
        break
      
      case 'dashboard':
        await this.sendDashboardNotification(notification)
        break
      
      case 'email':
        await this.sendEmailNotification(notification)
        break
      
      case 'sms':
        await this.sendSmsNotification(notification)
        break
      
      case 'webhook':
        await this.sendWebhookNotification(notification)
        break
    }
  }

  private async sendWebSocketNotification(notification: NotificationPayload): Promise<void> {
    const message = JSON.stringify({
      type: 'notification',
      payload: notification
    })

    this.websocketClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  }

  private async sendDashboardNotification(notification: NotificationPayload): Promise<void> {
    // Store in database or cache for dashboard to fetch
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      })
      
      if (!response.ok) {
        console.error('Failed to send dashboard notification')
      }
    } catch (error) {
      console.error('Dashboard notification error:', error)
    }
  }

  private async sendEmailNotification(notification: NotificationPayload): Promise<void> {
    // Implementation would use email service (SendGrid, AWS SES, etc.)
    console.log('Email notification would be sent:', notification.title)
  }

  private async sendSmsNotification(notification: NotificationPayload): Promise<void> {
    // Implementation would use SMS service (Twilio, AWS SNS, etc.)
    console.log('SMS notification would be sent:', notification.title)
  }

  private async sendWebhookNotification(notification: NotificationPayload): Promise<void> {
    // Implementation would send to configured webhook URL
    const webhookUrl = this.config.channels
      .find(c => c.type === 'webhook')?.config?.url
    
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notification)
        })
      } catch (error) {
        console.error('Webhook notification error:', error)
      }
    }
  }

  // WebSocket management
  addWebSocketClient(ws: WebSocket): void {
    this.websocketClients.add(ws)
    
    ws.on('close', () => {
      this.websocketClients.delete(ws)
    })
  }

  removeWebSocketClient(ws: WebSocket): void {
    this.websocketClients.delete(ws)
  }

  // Helper methods
  private mapRiskToSeverity(riskLevel: string): NotificationPayload['severity'] {
    switch (riskLevel) {
      case 'critical': return 'critical'
      case 'high': return 'error'
      case 'medium': return 'warning'
      default: return 'info'
    }
  }

  private buildSignalMessage(signal: CrossPlatformSignal): string {
    const platforms = signal.platforms.join(', ')
    const strength = (signal.strength * 100).toFixed(0)
    const confidence = (signal.confidence * 100).toFixed(0)
    
    return `${signal.pattern} detected for ${signal.symbol} across ${platforms}. ` +
           `Strength: ${strength}%, Confidence: ${confidence}%. ` +
           `Related symbols: ${signal.relatedSymbols.join(', ')}`
  }

  private checkThrottle(notification: NotificationPayload): boolean {
    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000
    const oneHourAgo = now - 60 * 60 * 1000
    
    const userId = 'default' // In production, this would be per-user
    const history = this.notificationHistory.get(userId) || []
    
    const recentMinute = history.filter(n => n.timestamp.getTime() > oneMinuteAgo)
    const recentHour = history.filter(n => n.timestamp.getTime() > oneHourAgo)
    
    return recentMinute.length < this.config.throttle.maxPerMinute &&
           recentHour.length < this.config.throttle.maxPerHour
  }

  private passesFilters(notification: NotificationPayload): boolean {
    const severityOrder = ['info', 'warning', 'error', 'critical']
    const minSeverityIndex = severityOrder.indexOf(this.config.filters.minSeverity)
    const notificationSeverityIndex = severityOrder.indexOf(notification.severity)
    
    if (notificationSeverityIndex < minSeverityIndex) {
      return false
    }
    
    if (!this.config.filters.types.includes(notification.type)) {
      return false
    }
    
    if (this.config.filters.symbols && notification.data?.symbol) {
      if (!this.config.filters.symbols.includes(notification.data.symbol)) {
        return false
      }
    }
    
    return true
  }

  private addToHistory(notification: NotificationPayload): void {
    const userId = 'default' // In production, this would be per-user
    const history = this.notificationHistory.get(userId) || []
    
    history.push(notification)
    
    // Keep only last 1000 notifications
    if (history.length > 1000) {
      history.splice(0, history.length - 1000)
    }
    
    this.notificationHistory.set(userId, history)
  }

  private getEnabledChannels(): NotificationChannel['type'][] {
    return this.config.channels
      .filter(c => c.enabled)
      .map(c => c.type)
  }

  // Public methods for configuration
  updateConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getNotificationHistory(limit: number = 100): NotificationPayload[] {
    const userId = 'default'
    const history = this.notificationHistory.get(userId) || []
    return history.slice(-limit)
  }

  clearHistory(): void {
    this.notificationHistory.clear()
  }
}

// Export singleton instance
export const notificationService = new NotificationService()