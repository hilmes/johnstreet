import { ExecutionManager, ExecutionConfig, ExecutionResult } from './ExecutionManager'
import { TradingSignal } from '../signals/SignalGenerator'
import { PositionSize } from '../risk/PositionSizer'
import { UnifiedExchange } from '@/lib/exchanges/UnifiedExchange'

// Mock the UnifiedExchange
jest.mock('@/lib/exchanges/UnifiedExchange')

describe('ExecutionManager', () => {
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
        5000,
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
        5000,
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

    it('should handle partial fills according to policy', async () => {
      const partialManager = new ExecutionManager({ partialFillPolicy: 'complete' })
      
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
      
      const result = await partialManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      expect(result.status).toBe('partial')
      expect(result.filledAmount).toBe(3000)
    })
  })

  describe('monitorExecution', () => {
    it('should monitor order status', async () => {
      // First execute an order
      await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      // Then monitor it
      const status = await executionManager.monitorExecution('order_123')
      
      expect(status.filled).toBe(true)
      expect(status.fillPercentage).toBe(100)
      expect(status.avgFillPrice).toBe(50002)
      expect(status.fees).toBe(5)
    })

    it('should return unknown status for non-existent orders', async () => {
      const status = await executionManager.monitorExecution('non_existent')
      
      expect(status.status).toBe('unknown')
      expect(status.filled).toBe(false)
    })

    it('should handle monitoring errors gracefully', async () => {
      await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      mockExchange.getOrder = jest.fn().mockRejectedValue(new Error('API error'))
      
      const status = await executionManager.monitorExecution('order_123')
      
      expect(status.status).toBe('error')
      expect(status.message).toBe('API error')
    })
  })

  describe('cancelOrder', () => {
    it('should cancel orders successfully', async () => {
      mockExchange.cancelOrder = jest.fn().mockResolvedValue(true)
      await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      const result = await executionManager.cancelOrder('order_123')
      
      expect(result).toBe(true)
      expect(mockExchange.cancelOrder).toHaveBeenCalledWith('order_123')
    })

    it('should handle cancel errors', async () => {
      mockExchange.cancelOrder = jest.fn().mockRejectedValue(new Error('Cannot cancel filled order'))
      
      const result = await executionManager.cancelOrder('order_123')
      
      expect(result).toBe(false)
    })
  })

  describe('getExecutionMetrics', () => {
    it('should return empty metrics when no executions', () => {
      const metrics = executionManager.getExecutionMetrics()
      
      expect(metrics.totalOrders).toBe(0)
      expect(metrics.successRate).toBe(0)
      expect(metrics.avgSlippage).toBe(0)
    })

    it('should calculate metrics correctly', async () => {
      // Execute multiple orders
      await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      // Add a failed execution
      mockExchange.createOrder = jest.fn().mockRejectedValue(new Error('Failed'))
      await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      const metrics = executionManager.getExecutionMetrics()
      
      expect(metrics.totalOrders).toBe(2)
      expect(metrics.successRate).toBe(0.5)
      expect(metrics.failures).toBe(1)
      expect(metrics.totalFees).toBeGreaterThan(0)
    })
  })

  describe('getRecentExecutions', () => {
    it('should return recent executions', async () => {
      await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      
      const recent = executionManager.getRecentExecutions(5)
      
      expect(recent).toHaveLength(1)
      expect(recent[0].orderId).toBe('order_123')
    })

    it('should limit results to requested count', async () => {
      // Execute multiple orders
      for (let i = 0; i < 15; i++) {
        mockExchange.createOrder = jest.fn().mockResolvedValue({
          id: `order_${i}`,
          status: 'closed',
          filled: 5000,
          amount: 5000
        })
        mockExchange.getOrder = jest.fn().mockResolvedValue({
          id: `order_${i}`,
          status: 'closed',
          filled: 5000,
          amount: 5000,
          average: 50000
        })
        await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      }
      
      const recent = executionManager.getRecentExecutions(10)
      
      expect(recent).toHaveLength(10)
    })
  })

  describe('clearHistory', () => {
    it('should clear execution history', async () => {
      await executionManager.executeSignal(mockSignal, mockPositionSize, mockExchange)
      expect(executionManager.getRecentExecutions()).toHaveLength(1)
      
      executionManager.clearHistory()
      
      expect(executionManager.getRecentExecutions()).toHaveLength(0)
    })
  })
})