import { NotificationService, NotificationPayload, NotificationConfig } from './NotificationService'
import { CrossPlatformSignal } from '@/lib/feeds/DataOrchestrator'

// Mock fetch globally
global.fetch = jest.fn()

// Mock WebSocket
const mockWebSocket = {
  OPEN: 1,
  send: jest.fn(),
  on: jest.fn(),
  readyState: 1
}

global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket) as any
global.WebSocket.OPEN = 1

describe('NotificationService', () => {
  let notificationService: NotificationService
  let mockFetch: jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    jest.clearAllMocks()
    notificationService = new NotificationService()
    mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValue({ ok: true } as Response)
  })

  describe('constructor and configuration', () => {
    it('should initialize with default config', () => {
      const service = new NotificationService()
      const config = (service as any).config
      
      expect(config.channels).toHaveLength(5)
      expect(config.filters.minSeverity).toBe('warning')
      expect(config.throttle.maxPerMinute).toBe(10)
    })

    it('should merge custom config with defaults', () => {
      const customConfig: Partial<NotificationConfig> = {
        filters: {
          minSeverity: 'error',
          types: ['alert'],
          symbols: ['BTC', 'ETH']
        }
      }
      
      const service = new NotificationService(customConfig)
      const config = (service as any).config
      
      expect(config.filters.minSeverity).toBe('error')
      expect(config.filters.types).toEqual(['alert'])
      expect(config.filters.symbols).toEqual(['BTC', 'ETH'])
      expect(config.throttle.maxPerMinute).toBe(10) // default preserved
    })
  })

  describe('sendCrossPlatformSignalAlert', () => {
    it('should create and send notification from cross-platform signal', async () => {
      const signal: CrossPlatformSignal = {
        id: 'signal-123',
        timestamp: new Date(),
        symbol: 'BTC',
        pattern: 'pump_coordinated',
        platforms: ['reddit', 'twitter'],
        strength: 0.85,
        confidence: 0.9,
        riskLevel: 'high',
        relatedSymbols: ['ETH', 'DOGE'],
        metadata: {}
      }

      const sendSpy = jest.spyOn(notificationService, 'send')
      await notificationService.sendCrossPlatformSignalAlert(signal)

      expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'signal',
        severity: 'error', // high risk maps to error
        title: 'Cross-Platform Signal: BTC',
        message: expect.stringContaining('pump_coordinated detected for BTC'),
        data: signal
      }))
    })
  })

  describe('send notification', () => {
    it('should send notification to enabled channels', async () => {
      const notification: NotificationPayload = {
        id: 'test-123',
        timestamp: new Date(),
        type: 'alert',
        severity: 'warning',
        title: 'Test Alert',
        message: 'Test message',
        channels: ['websocket', 'dashboard']
      }

      await notificationService.send(notification)

      expect(mockFetch).toHaveBeenCalledWith('/api/notifications', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      }))
    })

    it('should not send if throttle limit exceeded', async () => {
      const notification: NotificationPayload = {
        id: 'test-123',
        timestamp: new Date(),
        type: 'alert',
        severity: 'warning',
        title: 'Test Alert',
        message: 'Test message',
        channels: ['websocket']
      }

      // Send max notifications per minute
      for (let i = 0; i < 10; i++) {
        await notificationService.send({ ...notification, id: `test-${i}` })
      }

      // This should be throttled
      await notificationService.send({ ...notification, id: 'test-throttled' })
      
      // Only 10 notifications should have been sent
      const history = notificationService.getNotificationHistory()
      expect(history).toHaveLength(10)
    })

    it('should filter by severity', async () => {
      notificationService.updateConfig({
        filters: { minSeverity: 'error', types: ['alert'] }
      })

      const lowSeverityNotification: NotificationPayload = {
        id: 'test-1',
        timestamp: new Date(),
        type: 'alert',
        severity: 'warning',
        title: 'Low Severity',
        message: 'Should be filtered',
        channels: ['dashboard']
      }

      const highSeverityNotification: NotificationPayload = {
        id: 'test-2',
        timestamp: new Date(),
        type: 'alert',
        severity: 'error',
        title: 'High Severity',
        message: 'Should pass',
        channels: ['dashboard']
      }

      await notificationService.send(lowSeverityNotification)
      await notificationService.send(highSeverityNotification)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith('/api/notifications', expect.objectContaining({
        body: expect.stringContaining('High Severity')
      }))
    })

    it('should filter by type', async () => {
      notificationService.updateConfig({
        filters: { minSeverity: 'info', types: ['trade'] }
      })

      const alertNotification: NotificationPayload = {
        id: 'test-1',
        timestamp: new Date(),
        type: 'alert',
        severity: 'warning',
        title: 'Alert',
        message: 'Should be filtered',
        channels: ['dashboard']
      }

      const tradeNotification: NotificationPayload = {
        id: 'test-2',
        timestamp: new Date(),
        type: 'trade',
        severity: 'warning',
        title: 'Trade',
        message: 'Should pass',
        channels: ['dashboard']
      }

      await notificationService.send(alertNotification)
      await notificationService.send(tradeNotification)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith('/api/notifications', expect.objectContaining({
        body: expect.stringContaining('Trade')
      }))
    })

    it('should filter by symbol', async () => {
      notificationService.updateConfig({
        filters: { 
          minSeverity: 'info', 
          types: ['signal'],
          symbols: ['BTC', 'ETH']
        }
      })

      const btcNotification: NotificationPayload = {
        id: 'test-1',
        timestamp: new Date(),
        type: 'signal',
        severity: 'warning',
        title: 'BTC Signal',
        message: 'Should pass',
        data: { symbol: 'BTC' },
        channels: ['dashboard']
      }

      const dogeNotification: NotificationPayload = {
        id: 'test-2',
        timestamp: new Date(),
        type: 'signal',
        severity: 'warning',
        title: 'DOGE Signal',
        message: 'Should be filtered',
        data: { symbol: 'DOGE' },
        channels: ['dashboard']
      }

      await notificationService.send(btcNotification)
      await notificationService.send(dogeNotification)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith('/api/notifications', expect.objectContaining({
        body: expect.stringContaining('BTC Signal')
      }))
    })
  })

  describe('WebSocket management', () => {
    it('should add and remove WebSocket clients', () => {
      const ws1 = { ...mockWebSocket, id: 1 }
      const ws2 = { ...mockWebSocket, id: 2 }

      notificationService.addWebSocketClient(ws1 as any)
      notificationService.addWebSocketClient(ws2 as any)

      expect((notificationService as any).websocketClients.size).toBe(2)

      notificationService.removeWebSocketClient(ws1 as any)
      expect((notificationService as any).websocketClients.size).toBe(1)
    })

    it('should send to all connected WebSocket clients', async () => {
      const ws1 = { ...mockWebSocket, send: jest.fn(), readyState: WebSocket.OPEN }
      const ws2 = { ...mockWebSocket, send: jest.fn(), readyState: WebSocket.OPEN }
      const ws3 = { ...mockWebSocket, send: jest.fn(), readyState: 0 } // CONNECTING

      notificationService.addWebSocketClient(ws1 as any)
      notificationService.addWebSocketClient(ws2 as any)
      notificationService.addWebSocketClient(ws3 as any)

      const notification: NotificationPayload = {
        id: 'test-123',
        timestamp: new Date(),
        type: 'alert',
        severity: 'warning',
        title: 'Test',
        message: 'Test message',
        channels: ['websocket']
      }

      await notificationService.send(notification)

      expect(ws1.send).toHaveBeenCalled()
      expect(ws2.send).toHaveBeenCalled()
      expect(ws3.send).not.toHaveBeenCalled() // Not OPEN
    })
  })

  describe('channel-specific sending', () => {
    it('should send webhook notification to configured URL', async () => {
      notificationService.updateConfig({
        channels: [
          { type: 'webhook', enabled: true, config: { url: 'https://example.com/webhook' } },
          { type: 'websocket', enabled: false },
          { type: 'dashboard', enabled: false }
        ]
      })

      const notification: NotificationPayload = {
        id: 'test-123',
        timestamp: new Date(),
        type: 'alert',
        severity: 'warning',
        title: 'Webhook Test',
        message: 'Test webhook',
        channels: ['webhook']
      }

      await notificationService.send(notification)

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/webhook', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      }))
    })

    it('should handle channel errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const notification: NotificationPayload = {
        id: 'test-123',
        timestamp: new Date(),
        type: 'alert',
        severity: 'warning',
        title: 'Test',
        message: 'Test message',
        channels: ['dashboard']
      }

      // Should not throw
      await expect(notificationService.send(notification)).resolves.not.toThrow()
    })
  })

  describe('notification history', () => {
    it('should maintain notification history', async () => {
      const notifications = Array.from({ length: 5 }, (_, i) => ({
        id: `test-${i}`,
        timestamp: new Date(),
        type: 'alert' as const,
        severity: 'warning' as const,
        title: `Alert ${i}`,
        message: `Message ${i}`,
        channels: ['dashboard' as const]
      }))

      for (const notification of notifications) {
        await notificationService.send(notification)
      }

      const history = notificationService.getNotificationHistory()
      expect(history).toHaveLength(5)
      expect(history[4].id).toBe('test-4')
    })

    it('should limit history to 1000 notifications', async () => {
      // Add 1005 notifications
      for (let i = 0; i < 1005; i++) {
        (notificationService as any).addToHistory({
          id: `test-${i}`,
          timestamp: new Date(),
          type: 'alert',
          severity: 'info',
          title: `Alert ${i}`,
          message: `Message ${i}`,
          channels: []
        })
      }

      const history = notificationService.getNotificationHistory(2000)
      expect(history).toHaveLength(1000)
      expect(history[0].id).toBe('test-5') // First 5 should be removed
    })

    it('should clear history', () => {
      notificationService.clearHistory()
      const history = notificationService.getNotificationHistory()
      expect(history).toHaveLength(0)
    })
  })

  describe('helper methods', () => {
    it('should map risk levels to severity correctly', () => {
      const service = notificationService as any
      
      expect(service.mapRiskToSeverity('critical')).toBe('critical')
      expect(service.mapRiskToSeverity('high')).toBe('error')
      expect(service.mapRiskToSeverity('medium')).toBe('warning')
      expect(service.mapRiskToSeverity('low')).toBe('info')
      expect(service.mapRiskToSeverity('unknown')).toBe('info')
    })

    it('should build signal message correctly', () => {
      const signal: CrossPlatformSignal = {
        id: 'signal-123',
        timestamp: new Date(),
        symbol: 'BTC',
        pattern: 'volume_spike',
        platforms: ['reddit', 'twitter'],
        strength: 0.856,
        confidence: 0.923,
        riskLevel: 'high',
        relatedSymbols: ['ETH', 'LTC'],
        metadata: {}
      }

      const message = (notificationService as any).buildSignalMessage(signal)
      
      expect(message).toContain('volume_spike detected for BTC')
      expect(message).toContain('reddit, twitter')
      expect(message).toContain('Strength: 86%')
      expect(message).toContain('Confidence: 92%')
      expect(message).toContain('ETH, LTC')
    })
  })

  describe('configuration updates', () => {
    it('should update configuration', () => {
      const newConfig: Partial<NotificationConfig> = {
        throttle: {
          maxPerMinute: 20,
          maxPerHour: 200
        }
      }

      notificationService.updateConfig(newConfig)
      const config = (notificationService as any).config
      
      expect(config.throttle.maxPerMinute).toBe(20)
      expect(config.throttle.maxPerHour).toBe(200)
    })
  })
})