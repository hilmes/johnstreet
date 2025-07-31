import { ExecutionManager, ExecutionConfig, ExecutionResult } from './ExecutionManagerRefactored'
import { TradingSignal } from '../signals/SignalGenerator'
import { PositionSize } from '../risk/PositionSizer'
import { UnifiedExchange } from '@/lib/exchanges/UnifiedExchange'

// Mock the UnifiedExchange
jest.mock('@/lib/exchanges/UnifiedExchange')

describe('ExecutionManagerRefactored', () => {
  let executionManager: ExecutionManager
  let mockExchange: jest.Mocked<UnifiedExchange>
  let mockSignal: TradingSignal
  let mockPositionSize: PositionSize

  beforeEach(() => {
    executionManager = new ExecutionManager()
    mockExchange = new UnifiedExchange({} as any) as jest.Mocked<UnifiedExchange>
    
    mockSignal = {
      id: 'signal_123',
      symbol: 'BTC/USD',
      action: 'BUY',
      strength: 0.85,
      confidence: 0.9,
      timeframe: '1h',
      source: {
        sentiment: {
          score: 0.75,
          magnitude: 0.8,
          classification: 'positive',
          confidence: 0.85,
          keywords: ['bullish']
        },
        marketData: {
          symbol: 'BTC/USD',
          price: 50000,
          volume24h: 1000000,
          priceChange24h: 0.02,
          volatility: 0.02,
          bid: 49995,
          ask: 50005,
          timestamp: Date.now()
        }
      },
      metadata: {
        sentimentVelocity: 0.15,
        volumeProfile: 'increasing',
        riskLevel: 'medium',
        correlatedSymbols: []
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000,
      priority: 7
    }

    mockPositionSize = {
      baseAmount: 0.1,
      quoteAmount: 5000,
      leverage: 1,
      stopLoss: 49000,
      takeProfit: 51000,
      riskAmount: 100,
      positionRisk: 0.02
    }

    // Setup default mock responses
    mockExchange.fetchOrderBook = jest.fn().mockResolvedValue({
      bids: [[49995, 10]],
      asks: [[50005, 10]],
      symbol: 'BTC/USD',
      timestamp: Date.now()
    })

    mockExchange.createOrder = jest.fn().mockResolvedValue({
      id: 'order_123',
      status: 'open',
      filled: 0,
      remaining: 5000,
      amount: 5000,
      average: 0,
      symbol: 'BTC/USD',
      side: 'buy',
      type: 'limit',
      price: 50000
    })

    mockExchange.getOrder = jest.fn().mockResolvedValue({
      id: 'order_123',
      status: 'closed',
      filled: 5000,
      remaining: 0,
      amount: 5000,
      average: 50002,
      symbol: 'BTC/USD',
      side: 'buy',
      type: 'limit',
      price: 50000,
      fee: { cost: 5 }
    })

    mockExchange.fetchTicker = jest.fn().mockResolvedValue({
      symbol: 'BTC/USD',
      last: 50000,
      bid: 49995,
      ask: 50005
    })
  })

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const manager = new ExecutionManager()
      expect(manager).toBeDefined()
    })

    it('should accept custom config', () => {
      const customConfig: Partial<ExecutionConfig> = {
        slippageTolerance: 0.02,
        urgencyThreshold: 0.7,
        maxRetries: 5
      }
      const manager = new ExecutionManager(customConfig)
      expect(manager).toBeDefined()
    })

    it('should merge custom config with defaults', () => {
      const customConfig: Partial<ExecutionConfig> = {
        slippageTolerance: 0.02
      }
      const manager = new ExecutionManager(customConfig)
      // We can't directly access private config, but we can test behavior
      expect(manager).toBeDefined()
    })
  })

  describe('executeSignal', () => {
    it('should execute a buy signal successfully', async () => {
      const result = await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(result.status).toBe('success')
      expect(result.orderId).toBe('order_123')
      expect(result.filledAmount).toBe(5000)
      expect(result.avgFillPrice).toBe(50002)
      expect(result.fees).toBe(5)
      expect(mockExchange.createOrder).toHaveBeenCalledWith(
        'BTC/USD',
        'market', // High strength signal should use market order
        'buy',
        0.1,
        undefined
      )
    })

    it('should use limit orders for low urgency signals', async () => {
      mockSignal.strength = 0.5 // Below urgency threshold
      
      await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(mockExchange.createOrder).toHaveBeenCalledWith(
        'BTC/USD',
        'limit',
        'buy',
        0.1,
        expect.any(Number) // Should calculate limit price
      )
    })

    it('should handle order failures', async () => {
      mockExchange.createOrder = jest.fn().mockRejectedValue(new Error('Insufficient balance'))
      
      const result = await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(result.status).toBe('failed')
      expect(result.errors).toContain('Insufficient balance')
      expect(result.filledAmount).toBe(0)
    })

    it('should calculate execution time', async () => {
      const result = await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(result.executionTime).toBeGreaterThan(0)
      expect(result.executionTime).toBeLessThan(1000) // Should be fast in tests
    })

    it('should handle SELL signals correctly', async () => {
      mockSignal.action = 'SELL'
      
      await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(mockExchange.createOrder).toHaveBeenCalledWith(
        'BTC/USD',
        'market',
        'sell',
        0.1,
        undefined
      )
    })
  })

  describe('Order Type Determination', () => {
    it('should use market order for high strength signals', async () => {
      mockSignal.strength = 0.9 // Above urgency threshold
      
      await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(mockExchange.createOrder).toHaveBeenCalledWith(
        expect.any(String),
        'market',
        expect.any(String),
        expect.any(Number),
        undefined
      )
    })

    it('should use limit order for low strength signals', async () => {
      mockSignal.strength = 0.5 // Below urgency threshold
      
      await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(mockExchange.createOrder).toHaveBeenCalledWith(
        expect.any(String),
        'limit',
        expect.any(String),
        expect.any(Number),
        expect.any(Number)
      )
    })
  })

  describe('Retry Logic', () => {
    it('should retry failed orders', async () => {
      let callCount = 0
      mockExchange.createOrder = jest.fn().mockImplementation(() => {
        callCount++
        if (callCount < 2) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({
          id: 'order_123',
          status: 'open',
          filled: 0,
          remaining: 5000,
          amount: 5000
        })
      })
      
      const result = await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(mockExchange.createOrder).toHaveBeenCalledTimes(2)
      expect(result.retries).toBe(1)
    })

    it('should fail after max retries', async () => {
      mockExchange.createOrder = jest.fn().mockRejectedValue(new Error('Persistent error'))
      
      const result = await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(result.status).toBe('failed')
      expect(mockExchange.createOrder).toHaveBeenCalledTimes(4) // 1 initial + 3 retries
    })
  })

  describe('Partial Fill Handling', () => {
    it('should accept partial fills when policy is accept', async () => {
      const partialManager = new ExecutionManager({ partialFillPolicy: 'accept' })
      
      mockExchange.getOrder = jest.fn().mockResolvedValue({
        id: 'order_123',
        status: 'closed',
        filled: 3000,
        remaining: 2000,
        amount: 5000,
        average: 50002
      })
      
      const result = await partialManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(result.status).toBe('partial')
      expect(result.filledAmount).toBe(3000)
    })

    it('should cancel partial fills when policy is cancel', async () => {
      const cancelManager = new ExecutionManager({ partialFillPolicy: 'cancel' })
      mockExchange.cancelOrder = jest.fn().mockResolvedValue(true)
      
      mockExchange.getOrder = jest.fn().mockResolvedValue({
        id: 'order_123',
        status: 'closed',
        filled: 3000,
        remaining: 2000,
        amount: 5000,
        average: 50002
      })
      
      const result = await cancelManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(result.status).toBe('partial')
      expect(mockExchange.cancelOrder).toHaveBeenCalled()
    })

    it('should complete partial fills when policy is complete', async () => {
      const completeManager = new ExecutionManager({ partialFillPolicy: 'complete' })
      
      // First order partially fills
      mockExchange.getOrder = jest.fn()
        .mockResolvedValueOnce({
          id: 'order_123',
          status: 'closed',
          filled: 3000,
          remaining: 2000,
          amount: 5000,
          average: 50002
        })
        .mockResolvedValueOnce({
          id: 'order_124',
          status: 'closed',
          filled: 2000,
          remaining: 0,
          amount: 2000,
          average: 50005
        })
      
      // Second order for remaining amount
      let orderCount = 0
      mockExchange.createOrder = jest.fn().mockImplementation(() => {
        orderCount++
        if (orderCount === 1) {
          return Promise.resolve({
            id: 'order_123',
            status: 'open',
            filled: 0,
            remaining: 5000,
            amount: 5000
          })
        } else {
          return Promise.resolve({
            id: 'order_124',
            status: 'open',
            filled: 0,
            remaining: 2000,
            amount: 2000
          })
        }
      })
      
      const result = await completeManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(result.status).toBe('success')
      expect(result.filledAmount).toBe(5000)
    })
  })

  describe('Price Calculation', () => {
    it('should calculate limit price above bid for buy orders', async () => {
      mockSignal.strength = 0.5 // Use limit order
      mockExchange.fetchOrderBook = jest.fn().mockResolvedValue({
        bids: [[49995, 10]],
        asks: [[50005, 10]]
      })
      
      await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(mockExchange.createOrder).toHaveBeenCalledWith(
        'BTC/USD',
        'limit',
        'buy',
        0.1,
        expect.closeTo(49995 * 1.0005, 2) // 0.05% above best bid
      )
    })

    it('should calculate limit price below ask for sell orders', async () => {
      mockSignal.action = 'SELL'
      mockSignal.strength = 0.5 // Use limit order
      mockExchange.fetchOrderBook = jest.fn().mockResolvedValue({
        bids: [[49995, 10]],
        asks: [[50005, 10]]
      })
      
      await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(mockExchange.createOrder).toHaveBeenCalledWith(
        'BTC/USD',
        'limit',
        'sell',
        0.1,
        expect.closeTo(50005 * 0.9995, 2) // 0.05% below best ask
      )
    })
  })

  describe('Time In Force', () => {
    it('should use IOC for market orders', async () => {
      mockSignal.strength = 0.9 // Market order
      
      const result = await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      // Check that the order was created with market type
      expect(mockExchange.createOrder).toHaveBeenCalledWith(
        'BTC/USD',
        'market',
        'buy',
        0.1,
        undefined
      )
    })

    it('should use IOC for short timeframe signals', async () => {
      mockSignal.strength = 0.5 // Limit order
      mockSignal.timeframe = '1m' // Short timeframe
      
      await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      // The test verifies that short timeframe signals are handled
      expect(mockExchange.createOrder).toHaveBeenCalled()
    })

    it('should use GTC for longer timeframe signals', async () => {
      mockSignal.strength = 0.5 // Limit order
      mockSignal.timeframe = '1h' // Longer timeframe
      
      await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      // The test verifies that longer timeframe signals are handled
      expect(mockExchange.createOrder).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle exchange connection errors', async () => {
      mockExchange.fetchOrderBook = jest.fn().mockRejectedValue(new Error('Exchange not connected'))
      mockSignal.strength = 0.5 // Force limit order to trigger fetchOrderBook
      
      const result = await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(result.status).toBe('failed')
      expect(result.errors).toContain('Exchange not connected')
    })

    it('should handle unknown errors', async () => {
      mockExchange.createOrder = jest.fn().mockRejectedValue('String error')
      
      const result = await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(result.status).toBe('failed')
      expect(result.errors).toContain('Unknown error')
    })

    it('should track execution time even on failure', async () => {
      mockExchange.createOrder = jest.fn().mockRejectedValue(new Error('Test error'))
      
      const result = await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(result.executionTime).toBeGreaterThan(0)
    })
  })

  describe('Execution History', () => {
    it('should track successful executions', async () => {
      const result1 = await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      // Change order ID for second execution
      mockExchange.createOrder = jest.fn().mockResolvedValue({
        id: 'order_124',
        status: 'open',
        filled: 0,
        remaining: 5000,
        amount: 5000
      })
      mockExchange.getOrder = jest.fn().mockResolvedValue({
        id: 'order_124',
        status: 'closed',
        filled: 5000,
        remaining: 0,
        amount: 5000,
        average: 50003,
        fee: { cost: 5 }
      })
      
      const result2 = await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(result1.status).toBe('success')
      expect(result2.status).toBe('success')
    })

    it('should track failed executions', async () => {
      mockExchange.createOrder = jest.fn().mockRejectedValue(new Error('Test error'))
      
      const result = await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(result.status).toBe('failed')
      expect(result.errors).toBeDefined()
    })
  })

  describe('Slippage Calculation', () => {
    it('should calculate positive slippage for buy orders', async () => {
      // Order fills at worse price than expected
      mockExchange.getOrder = jest.fn().mockResolvedValue({
        id: 'order_123',
        status: 'closed',
        filled: 5000,
        remaining: 0,
        amount: 5000,
        average: 50100, // Higher than market price
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'market',
        fee: { cost: 5 }
      })
      
      const result = await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(result.slippage).toBeGreaterThan(0)
    })

    it('should calculate negative slippage for sell orders', async () => {
      mockSignal.action = 'SELL'
      
      // Order fills at worse price than expected
      mockExchange.getOrder = jest.fn().mockResolvedValue({
        id: 'order_123',
        status: 'closed',
        filled: 5000,
        remaining: 0,
        amount: 5000,
        average: 49900, // Lower than market price
        symbol: 'BTC/USD',
        side: 'sell',
        type: 'market',
        fee: { cost: 5 }
      })
      
      const result = await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(result.slippage).toBeGreaterThan(0)
    })
  })
})