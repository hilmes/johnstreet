import { OrderMonitor } from './OrderMonitor'

// Mock KrakenService
jest.mock('@/services/KrakenService', () => {
  return {
    KrakenService: jest.fn().mockImplementation(() => {
      return {
        queryOrders: jest.fn(),
        getTradesHistory: jest.fn()
      }
    })
  }
})

describe('OrderMonitor', () => {
  let orderMonitor: OrderMonitor
  let mockKrakenService: any

  beforeEach(() => {
    orderMonitor = new OrderMonitor({
      pollInterval: 100, // 100ms for faster tests
      maxRetries: 3,
      enableNotifications: true
    })
    
    // Access the mocked KrakenService instance
    mockKrakenService = (orderMonitor as any).krakenService
  })

  afterEach(() => {
    orderMonitor.stopMonitoring()
  })

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const defaultMonitor = new OrderMonitor()
      expect(defaultMonitor.isMonitoring()).toBe(false)
      expect(defaultMonitor.getMonitoredOrderCount()).toBe(0)
    })

    it('should accept custom config', () => {
      expect(orderMonitor.isMonitoring()).toBe(false)
    })
  })

  describe('monitoring control', () => {
    it('should start monitoring', (done) => {
      orderMonitor.on('monitor_started', () => {
        expect(orderMonitor.isMonitoring()).toBe(true)
        done()
      })

      orderMonitor.startMonitoring()
    })

    it('should not start monitoring twice', () => {
      orderMonitor.startMonitoring()
      const consoleSpy = jest.spyOn(console, 'log')
      orderMonitor.startMonitoring()
      
      expect(consoleSpy).toHaveBeenCalledWith('Order monitor is already running')
      consoleSpy.mockRestore()
    })

    it('should stop monitoring', (done) => {
      orderMonitor.startMonitoring()
      
      orderMonitor.on('monitor_stopped', () => {
        expect(orderMonitor.isMonitoring()).toBe(false)
        done()
      })

      orderMonitor.stopMonitoring()
    })

    it('should not stop monitoring if not running', () => {
      const consoleSpy = jest.spyOn(console, 'log')
      orderMonitor.stopMonitoring()
      
      expect(consoleSpy).toHaveBeenCalledWith('Order monitor is not running')
      consoleSpy.mockRestore()
    })
  })

  describe('order management', () => {
    const testOrder = {
      symbol: 'BTC/USD',
      side: 'buy' as const,
      type: 'limit',
      amount: 0.1,
      price: 50000
    }

    it('should add order for monitoring', () => {
      orderMonitor.addOrder('TEST123', testOrder)
      
      expect(orderMonitor.getMonitoredOrderCount()).toBe(1)
      expect(orderMonitor.getOrderStatus('TEST123')).toBeDefined()
    })

    it('should check order status immediately when added', () => {
      mockKrakenService.queryOrders.mockResolvedValue({})
      mockKrakenService.getTradesHistory.mockResolvedValue({ trades: {} })
      
      orderMonitor.addOrder('TEST123', testOrder)
      
      expect(mockKrakenService.queryOrders).toHaveBeenCalledWith(['TEST123'], true)
    })

    it('should remove order', (done) => {
      orderMonitor.addOrder('TEST123', testOrder)
      
      orderMonitor.on('order_removed', (txid) => {
        expect(txid).toBe('TEST123')
        expect(orderMonitor.getOrderStatus('TEST123')).toBeNull()
        done()
      })

      const removed = orderMonitor.removeOrder('TEST123')
      expect(removed).toBe(true)
    })

    it('should return false when removing non-existent order', () => {
      const removed = orderMonitor.removeOrder('NONEXISTENT')
      expect(removed).toBe(false)
    })

    it('should get all orders', () => {
      orderMonitor.addOrder('TEST1', testOrder)
      orderMonitor.addOrder('TEST2', { ...testOrder, side: 'sell' })
      
      const allOrders = orderMonitor.getAllOrders()
      expect(allOrders.length).toBe(2)
    })

    it('should get active orders only', () => {
      orderMonitor.addOrder('TEST1', testOrder)
      orderMonitor.addOrder('TEST2', testOrder)
      
      // Manually update one order status
      const order1 = orderMonitor.getOrderStatus('TEST1')
      if (order1) order1.status = 'closed'
      
      const activeOrders = orderMonitor.getActiveOrders()
      expect(activeOrders.length).toBe(1)
      expect(activeOrders[0].txid).toBe('TEST2')
    })
  })

  describe('order status updates', () => {
    beforeEach(() => {
      orderMonitor.addOrder('TEST123', {
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'limit',
        amount: 0.1,
        price: 50000
      })
    })

    it('should update order status from Kraken response', async () => {
      const krakenOrderData = {
        TEST123: {
          status: 'closed',
          vol_exec: '0.1',
          price: '50000'
        }
      }
      
      mockKrakenService.queryOrders.mockResolvedValue(krakenOrderData)
      mockKrakenService.getTradesHistory.mockResolvedValue({ trades: {} })
      
      orderMonitor.startMonitoring()
      
      // Wait for first update cycle
      await new Promise(resolve => setTimeout(resolve, 150))
      
      const order = orderMonitor.getOrderStatus('TEST123')
      expect(order?.status).toBe('closed')
      expect(order?.filledAmount).toBe(0.1)
      expect(order?.averagePrice).toBe(50000)
    })

    it('should emit status change event', (done) => {
      const krakenOrderData = {
        TEST123: {
          status: 'open',
          vol_exec: '0',
          price: '0'
        }
      }
      
      mockKrakenService.queryOrders.mockResolvedValue(krakenOrderData)
      mockKrakenService.getTradesHistory.mockResolvedValue({ trades: {} })
      
      orderMonitor.on('status_change', (event) => {
        expect(event.txid).toBe('TEST123')
        expect(event.previousStatus).toBe('pending')
        expect(event.newStatus).toBe('open')
        done()
      })
      
      orderMonitor.startMonitoring()
    })

    it('should emit order completed event', (done) => {
      const krakenOrderData = {
        TEST123: {
          status: 'closed',
          vol_exec: '0.1',
          price: '50000'
        }
      }
      
      mockKrakenService.queryOrders.mockResolvedValue(krakenOrderData)
      mockKrakenService.getTradesHistory.mockResolvedValue({ trades: {} })
      
      orderMonitor.on('order_completed', (order) => {
        expect(order.txid).toBe('TEST123')
        expect(order.status).toBe('closed')
        done()
      })
      
      orderMonitor.startMonitoring()
    })

    it('should emit order cancelled event', (done) => {
      const krakenOrderData = {
        TEST123: {
          status: 'canceled',
          vol_exec: '0',
          price: '0'
        }
      }
      
      mockKrakenService.queryOrders.mockResolvedValue(krakenOrderData)
      mockKrakenService.getTradesHistory.mockResolvedValue({ trades: {} })
      
      orderMonitor.on('order_cancelled', (order) => {
        expect(order.txid).toBe('TEST123')
        expect(order.status).toBe('canceled')
        done()
      })
      
      orderMonitor.startMonitoring()
    })
  })

  describe('order fills', () => {
    it('should detect and emit fill events', (done) => {
      orderMonitor.addOrder('TEST123', {
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'market',
        amount: 0.1
      })

      const krakenOrderData = {
        TEST123: {
          status: 'closed',
          vol_exec: '0.1',
          price: '50000'
        }
      }
      
      const tradeData = {
        trades: {
          TRADE1: {
            ordertxid: 'TEST123',
            pair: 'XBTUSD',
            time: Date.now() / 1000,
            type: 'buy',
            ordertype: 'market',
            price: '50000',
            cost: '5000',
            fee: '5',
            vol: '0.1'
          }
        }
      }
      
      mockKrakenService.queryOrders.mockResolvedValue(krakenOrderData)
      mockKrakenService.getTradesHistory.mockResolvedValue(tradeData)
      
      orderMonitor.on('order_fill', (event) => {
        expect(event.order.txid).toBe('TEST123')
        expect(event.fill.vol).toBe(0.1)
        expect(event.fill.price).toBe(50000)
        expect(event.isPartial).toBe(false)
        done()
      })
      
      orderMonitor.startMonitoring()
    })

    it('should handle partial fills', (done) => {
      orderMonitor.addOrder('TEST123', {
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'limit',
        amount: 1,
        price: 50000
      })

      const krakenOrderData = {
        TEST123: {
          status: 'partial',
          vol_exec: '0.5',
          price: '50000'
        }
      }
      
      const tradeData = {
        trades: {
          TRADE1: {
            ordertxid: 'TEST123',
            pair: 'XBTUSD',
            time: Date.now() / 1000,
            type: 'buy',
            ordertype: 'limit',
            price: '50000',
            cost: '25000',
            fee: '25',
            vol: '0.5'
          }
        }
      }
      
      mockKrakenService.queryOrders.mockResolvedValue(krakenOrderData)
      mockKrakenService.getTradesHistory.mockResolvedValue(tradeData)
      
      orderMonitor.on('order_fill', (event) => {
        expect(event.isPartial).toBe(true)
        expect(event.fill.vol).toBe(0.5)
        done()
      })
      
      orderMonitor.startMonitoring()
    })
  })

  describe('error handling', () => {
    it('should emit monitor error on API failure', (done) => {
      orderMonitor.addOrder('TEST123', {
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'limit',
        amount: 0.1
      })

      const error = new Error('API Error')
      mockKrakenService.queryOrders.mockRejectedValue(error)
      
      orderMonitor.on('monitor_error', (err) => {
        expect(err).toBe(error)
        done()
      })
      
      orderMonitor.startMonitoring()
    })

    it('should emit batch error on batch failure', (done) => {
      // Add multiple orders
      for (let i = 0; i < 3; i++) {
        orderMonitor.addOrder(`TEST${i}`, {
          symbol: 'BTC/USD',
          side: 'buy',
          type: 'limit',
          amount: 0.1
        })
      }

      const error = new Error('Batch API Error')
      mockKrakenService.queryOrders.mockRejectedValue(error)
      
      orderMonitor.on('batch_error', (event) => {
        expect(event.error).toBe(error)
        expect(event.txids.length).toBeGreaterThan(0)
        done()
      })
      
      orderMonitor.startMonitoring()
    })
  })

  describe('notifications', () => {
    it('should send notifications when enabled', (done) => {
      orderMonitor.addOrder('TEST123', {
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'limit',
        amount: 0.1
      })

      const krakenOrderData = {
        TEST123: {
          status: 'open',
          vol_exec: '0',
          price: '0'
        }
      }
      
      mockKrakenService.queryOrders.mockResolvedValue(krakenOrderData)
      mockKrakenService.getTradesHistory.mockResolvedValue({ trades: {} })
      
      orderMonitor.on('notification', (notification) => {
        expect(notification.type).toBe('order_update')
        expect(notification.orderId).toBe('TEST123')
        expect(notification.previousStatus).toBe('pending')
        expect(notification.newStatus).toBe('open')
        done()
      })
      
      orderMonitor.startMonitoring()
    })

    it('should not send notifications when disabled', async () => {
      const noNotifyMonitor = new OrderMonitor({
        pollInterval: 100,
        enableNotifications: false
      })
      
      const notificationSpy = jest.fn()
      noNotifyMonitor.on('notification', notificationSpy)
      
      noNotifyMonitor.addOrder('TEST123', {
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'limit',
        amount: 0.1
      })

      const krakenOrderData = {
        TEST123: {
          status: 'open',
          vol_exec: '0',
          price: '0'
        }
      }
      
      mockKrakenService.queryOrders.mockResolvedValue(krakenOrderData)
      mockKrakenService.getTradesHistory.mockResolvedValue({ trades: {} })
      
      noNotifyMonitor.startMonitoring()
      
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(notificationSpy).not.toHaveBeenCalled()
      
      noNotifyMonitor.stopMonitoring()
    })
  })

  describe('batch processing', () => {
    it('should process orders in batches', async () => {
      // Add 25 orders (more than batch size of 20)
      for (let i = 0; i < 25; i++) {
        orderMonitor.addOrder(`TEST${i}`, {
          symbol: 'BTC/USD',
          side: 'buy',
          type: 'limit',
          amount: 0.1
        })
      }

      mockKrakenService.queryOrders.mockResolvedValue({})
      mockKrakenService.getTradesHistory.mockResolvedValue({ trades: {} })
      
      orderMonitor.startMonitoring()
      
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Should have been called at least twice (2 batches)
      expect(mockKrakenService.queryOrders.mock.calls.length).toBeGreaterThanOrEqual(2)
      
      // First batch should have 20 orders
      expect(mockKrakenService.queryOrders.mock.calls[0][0].length).toBeLessThanOrEqual(20)
    })
  })

  describe('configuration updates', () => {
    it('should update configuration', () => {
      orderMonitor.updateConfig({ pollInterval: 200 })
      // Config is private, but we can verify through restart behavior
    })

    it('should restart monitoring with new interval', () => {
      orderMonitor.startMonitoring()
      const stopSpy = jest.spyOn(orderMonitor, 'stopMonitoring')
      const startSpy = jest.spyOn(orderMonitor, 'startMonitoring')
      
      orderMonitor.updateConfig({ pollInterval: 200 })
      
      expect(stopSpy).toHaveBeenCalled()
      expect(startSpy).toHaveBeenCalled()
    })
  })

  describe('utility methods', () => {
    it('should clear all orders', (done) => {
      orderMonitor.addOrder('TEST1', {
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'limit',
        amount: 0.1
      })
      orderMonitor.addOrder('TEST2', {
        symbol: 'ETH/USD',
        side: 'sell',
        type: 'market',
        amount: 1
      })

      orderMonitor.on('cleared', (count) => {
        expect(count).toBe(2)
        expect(orderMonitor.getMonitoredOrderCount()).toBe(0)
        done()
      })

      orderMonitor.clearAll()
    })

    it('should get active order count', () => {
      orderMonitor.addOrder('TEST1', {
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'limit',
        amount: 0.1
      })
      orderMonitor.addOrder('TEST2', {
        symbol: 'ETH/USD',
        side: 'sell',
        type: 'market',
        amount: 1
      })

      expect(orderMonitor.getActiveOrderCount()).toBe(2)
      
      // Manually close one order
      const order1 = orderMonitor.getOrderStatus('TEST1')
      if (order1) order1.status = 'closed'
      
      expect(orderMonitor.getActiveOrderCount()).toBe(1)
    })
  })

  describe('auto-removal of completed orders', () => {
    it('should auto-remove completed orders after delay', async () => {
      jest.useFakeTimers()
      
      orderMonitor.addOrder('TEST123', {
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'market',
        amount: 0.1
      })

      const krakenOrderData = {
        TEST123: {
          status: 'closed',
          vol_exec: '0.1',
          price: '50000'
        }
      }
      
      mockKrakenService.queryOrders.mockResolvedValue(krakenOrderData)
      mockKrakenService.getTradesHistory.mockResolvedValue({ trades: {} })
      
      orderMonitor.startMonitoring()
      
      // Wait for order update
      await Promise.resolve()
      jest.advanceTimersByTime(150)
      
      expect(orderMonitor.getOrderStatus('TEST123')).toBeDefined()
      
      // Advance time to trigger auto-removal (30 seconds for completed orders)
      jest.advanceTimersByTime(30000)
      
      expect(orderMonitor.getOrderStatus('TEST123')).toBeNull()
      
      jest.useRealTimers()
    })
  })
})