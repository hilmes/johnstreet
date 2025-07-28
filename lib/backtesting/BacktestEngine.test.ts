import { BacktestEngine } from './BacktestEngine'
import {
  BacktestConfig,
  BaseStrategy,
  MarketData,
  Signal,
  MarketSimulator,
  ExecutionModel
} from './types'
import { PerformanceAnalyzer } from './PerformanceAnalyzer'
import { RealisticExecutionModel } from './RealisticExecutionModel'

// Mock dependencies
jest.mock('./PerformanceAnalyzer')
jest.mock('./RealisticExecutionModel')

// Mock strategy implementation
class MockStrategy implements BaseStrategy {
  name = 'MockStrategy'
  description = 'Test strategy'
  parameters = { period: 20 }
  
  init = jest.fn()
  evaluate = jest.fn().mockReturnValue({
    type: 'NEUTRAL',
    strength: 0,
    confidence: 0
  } as Signal)
  onTrade = jest.fn()
  reset = jest.fn()
}

// Mock market simulator
class MockMarketSimulator implements MarketSimulator {
  async hasNext(): Promise<boolean> {
    return true
  }
  
  async next(): Promise<MarketData> {
    return {
      timestamp: new Date(),
      open: 100,
      high: 105,
      low: 95,
      close: 102,
      volume: 1000,
      symbol: 'BTC/USD'
    }
  }
  
  reset(): void {}
}

describe('BacktestEngine', () => {
  let engine: BacktestEngine
  let mockStrategy: MockStrategy
  let mockSimulator: MockMarketSimulator
  let config: BacktestConfig
  
  beforeEach(() => {
    config = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      initialCapital: 10000,
      maxPositions: 3,
      maxPositionSize: 0.3,
      riskPerTrade: 0.02,
      commissionRate: 0.001,
      slippageModel: 'percentage',
      slippageRate: 0.001,
      symbol: 'BTC/USD',
      timeframe: '1h'
    }
    
    mockStrategy = new MockStrategy()
    mockSimulator = new MockMarketSimulator()
    engine = new BacktestEngine(config, mockStrategy, mockSimulator)
  })
  
  afterEach(() => {
    jest.clearAllMocks()
  })
  
  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      expect(engine).toBeDefined()
      expect(mockStrategy.init).toHaveBeenCalled()
    })
    
    it('should use default execution model if not provided', () => {
      expect(RealisticExecutionModel).toHaveBeenCalledWith(config)
    })
    
    it('should use custom execution model if provided', () => {
      const customExecution: ExecutionModel = {
        executeSignal: jest.fn(),
        calculateSlippage: jest.fn(),
        calculateCommission: jest.fn()
      }
      
      const customEngine = new BacktestEngine(
        config,
        mockStrategy,
        mockSimulator,
        customExecution
      )
      
      expect(customEngine).toBeDefined()
    })
  })
  
  describe('run', () => {
    it('should complete backtest successfully', async () => {
      let iterations = 0
      mockSimulator.hasNext = jest.fn().mockImplementation(async () => {
        iterations++
        return iterations <= 5 // Run for 5 iterations
      })
      
      const result = await engine.run()
      
      expect(result).toBeDefined()
      expect(result.trades).toBeDefined()
      expect(result.portfolio).toBeDefined()
      expect(result.performance).toBeDefined()
      expect(mockStrategy.evaluate).toHaveBeenCalledTimes(5)
    })
    
    it('should emit progress events during backtest', async () => {
      const progressHandler = jest.fn()
      engine.on('progress', progressHandler)
      
      let iterations = 0
      mockSimulator.hasNext = jest.fn().mockImplementation(async () => {
        iterations++
        return iterations <= 10
      })
      
      await engine.run()
      
      expect(progressHandler).toHaveBeenCalled()
      expect(progressHandler.mock.calls[0][0]).toHaveProperty('progress')
      expect(progressHandler.mock.calls[0][0]).toHaveProperty('currentDate')
    })
    
    it('should handle buy signals', async () => {
      mockStrategy.evaluate = jest.fn().mockReturnValueOnce({
        type: 'BUY',
        strength: 0.8,
        confidence: 0.9,
        stopLoss: 95,
        takeProfit: 110
      })
      
      let iterations = 0
      mockSimulator.hasNext = jest.fn().mockImplementation(async () => {
        iterations++
        return iterations <= 2
      })
      
      const result = await engine.run()
      
      expect(result.trades.length).toBeGreaterThan(0)
      expect(result.trades[0].type).toBe('BUY')
    })
    
    it('should handle sell signals', async () => {
      // First create a position with a buy
      mockStrategy.evaluate = jest.fn()
        .mockReturnValueOnce({
          type: 'BUY',
          strength: 0.8,
          confidence: 0.9
        })
        .mockReturnValueOnce({
          type: 'SELL',
          strength: 0.8,
          confidence: 0.9
        })
      
      let iterations = 0
      mockSimulator.hasNext = jest.fn().mockImplementation(async () => {
        iterations++
        return iterations <= 3
      })
      
      const result = await engine.run()
      
      expect(result.trades.length).toBe(2)
      expect(result.trades[1].type).toBe('SELL')
    })
    
    it('should respect max positions limit', async () => {
      config.maxPositions = 1
      engine = new BacktestEngine(config, mockStrategy, mockSimulator)
      
      // Try to generate multiple buy signals
      mockStrategy.evaluate = jest.fn().mockReturnValue({
        type: 'BUY',
        strength: 0.8,
        confidence: 0.9
      })
      
      let iterations = 0
      mockSimulator.hasNext = jest.fn().mockImplementation(async () => {
        iterations++
        return iterations <= 5
      })
      
      const result = await engine.run()
      
      // Should only have 1 position due to limit
      expect(result.portfolio.positions.length).toBeLessThanOrEqual(1)
    })
    
    it('should handle errors gracefully', async () => {
      mockSimulator.next = jest.fn().mockRejectedValue(new Error('Market data error'))
      
      await expect(engine.run()).rejects.toThrow('Market data error')
    })
  })
  
  describe('pause and resume', () => {
    it('should pause and resume execution', async () => {
      let iterations = 0
      let pausedAt = 0
      
      mockSimulator.hasNext = jest.fn().mockImplementation(async () => {
        iterations++
        
        // Pause after 3 iterations
        if (iterations === 3 && pausedAt === 0) {
          pausedAt = iterations
          engine.pause()
          
          // Resume after a delay
          setTimeout(() => engine.resume(), 100)
        }
        
        return iterations <= 10
      })
      
      const result = await engine.run()
      
      expect(pausedAt).toBe(3)
      expect(result).toBeDefined()
    })
  })
  
  describe('stop', () => {
    it('should stop execution when requested', async () => {
      let iterations = 0
      
      mockSimulator.hasNext = jest.fn().mockImplementation(async () => {
        iterations++
        
        // Stop after 5 iterations
        if (iterations === 5) {
          engine.stop()
        }
        
        return iterations <= 100 // Would run longer without stop
      })
      
      const result = await engine.run()
      
      expect(iterations).toBeLessThanOrEqual(6) // May process one more before stopping
      expect(result).toBeDefined()
    })
  })
  
  describe('getProgress', () => {
    it('should return current progress', () => {
      const progress = engine.getProgress()
      
      expect(progress).toHaveProperty('startDate')
      expect(progress).toHaveProperty('endDate')
      expect(progress).toHaveProperty('currentDate')
      expect(progress).toHaveProperty('progress')
      expect(progress.progress).toBeGreaterThanOrEqual(0)
      expect(progress.progress).toBeLessThanOrEqual(1)
    })
  })
  
  describe('getPortfolioSnapshot', () => {
    it('should return current portfolio state', () => {
      const snapshot = engine.getPortfolioSnapshot()
      
      expect(snapshot).toHaveProperty('cash')
      expect(snapshot).toHaveProperty('positions')
      expect(snapshot).toHaveProperty('totalValue')
      expect(snapshot.cash).toBe(config.initialCapital)
    })
  })
  
  describe('event handling', () => {
    it('should emit trade events', async () => {
      const tradeHandler = jest.fn()
      engine.on('trade', tradeHandler)
      
      mockStrategy.evaluate = jest.fn().mockReturnValueOnce({
        type: 'BUY',
        strength: 0.8,
        confidence: 0.9
      })
      
      let iterations = 0
      mockSimulator.hasNext = jest.fn().mockImplementation(async () => {
        iterations++
        return iterations <= 2
      })
      
      await engine.run()
      
      expect(tradeHandler).toHaveBeenCalled()
      expect(tradeHandler.mock.calls[0][0]).toHaveProperty('trade')
    })
    
    it('should emit error events', async () => {
      const errorHandler = jest.fn()
      engine.on('error', errorHandler)
      
      mockSimulator.next = jest.fn().mockRejectedValue(new Error('Test error'))
      
      try {
        await engine.run()
      } catch (e) {
        // Expected error
      }
      
      expect(errorHandler).toHaveBeenCalled()
      expect(errorHandler.mock.calls[0][0]).toHaveProperty('error')
    })
  })
  
  describe('reset', () => {
    it('should reset engine state', async () => {
      // Run a backtest first
      let iterations = 0
      mockSimulator.hasNext = jest.fn().mockImplementation(async () => {
        iterations++
        return iterations <= 5
      })
      
      await engine.run()
      
      // Reset and check state
      engine.reset()
      
      expect(mockStrategy.reset).toHaveBeenCalled()
      expect(mockSimulator.reset).toHaveBeenCalled()
      
      const snapshot = engine.getPortfolioSnapshot()
      expect(snapshot.cash).toBe(config.initialCapital)
      expect(snapshot.positions).toHaveLength(0)
    })
  })
})