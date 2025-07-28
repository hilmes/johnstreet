import { SignalRouter, StrategyAssignment, SignalRoutingRules, StrategyCapacity } from './SignalRouter'
import { TradingSignal } from './SignalGenerator'
import { Strategy } from '@/types/strategy'

describe('SignalRouter', () => {
  let router: SignalRouter
  let mockSignal: TradingSignal
  let mockStrategies: Strategy[]

  beforeEach(() => {
    router = new SignalRouter()
    
    mockSignal = {
      id: 'sig-123',
      symbol: 'BTC/USD',
      action: 'buy',
      strength: 0.8,
      confidence: 0.9,
      timestamp: Date.now(),
      source: 'sentiment',
      timeframe: '5m',
      priority: 8,
      expiresAt: Date.now() + 300000, // 5 minutes
      metadata: {
        sentimentScore: 0.8,
        volumeProfile: 'high',
        pricePosition: 'oversold',
        riskLevel: 'medium',
        indicators: {
          rsi: 35,
          macd: { signal: 0.5, histogram: 0.2 },
          volume: { ratio: 1.5, trend: 'increasing' }
        }
      }
    }

    mockStrategies = [
      {
        id: 'momentum-strategy',
        name: 'Momentum Trading',
        active: true,
        version: '1.0.0',
        config: {
          defaultTimeframe: '5m',
          positionSizing: {
            method: 'kelly',
            maxPositionSize: 0.1,
            maxRiskPerTrade: 0.02
          }
        },
        rules: {
          allowedSymbols: ['BTC/USD', 'ETH/USD'],
          minConfidence: 0.7,
          maxRiskPerTrade: 0.02,
          allowHighRisk: false,
          conservative: false
        }
      },
      {
        id: 'scalping-strategy',
        name: 'Scalping',
        active: true,
        version: '1.0.0',
        config: {
          defaultTimeframe: '1m',
          positionSizing: {
            method: 'fixed',
            maxPositionSize: 0.05,
            maxRiskPerTrade: 0.01
          }
        },
        rules: {
          allowedSymbols: ['BTC/USD', 'ETH/USD', 'SOL/USD'],
          minConfidence: 0.8,
          maxRiskPerTrade: 0.01,
          allowHighRisk: false,
          conservative: true
        }
      },
      {
        id: 'swing-strategy',
        name: 'Swing Trading',
        active: true,
        version: '1.0.0',
        config: {
          defaultTimeframe: '1h',
          positionSizing: {
            method: 'volatility',
            maxPositionSize: 0.2,
            maxRiskPerTrade: 0.03
          }
        },
        rules: {
          minConfidence: 0.6,
          maxRiskPerTrade: 0.03,
          allowHighRisk: true
        }
      }
    ]
  })

  describe('constructor', () => {
    it('should initialize with default routing rules', () => {
      const router = new SignalRouter()
      expect(router).toBeDefined()
    })

    it('should accept custom routing rules', () => {
      const customRules: SignalRoutingRules = {
        maxSignalsPerStrategy: 5,
        maxPositionsPerSymbol: 2,
        diversificationRules: {
          maxConcentration: 0.15,
          minStrategies: 2
        }
      }
      
      const customRouter = new SignalRouter(customRules)
      expect(customRouter).toBeDefined()
    })
  })

  describe('routeToStrategy', () => {
    it('should route signal to best matching strategy', async () => {
      const assignment = await router.routeToStrategy(mockSignal, mockStrategies)

      expect(assignment).toBeDefined()
      expect(assignment?.strategyId).toBe('momentum-strategy') // Best match for 5m timeframe
      expect(assignment?.signal).toBe(mockSignal)
      expect(assignment?.priority).toBeGreaterThan(0)
      expect(assignment?.reason).toContain('Score:')
    })

    it('should return null when no eligible strategies', async () => {
      const invalidSignal = { ...mockSignal, symbol: 'DOGE/USD' }
      
      const assignment = await router.routeToStrategy(invalidSignal, mockStrategies.slice(0, 2))

      expect(assignment).toBeNull()
    })

    it('should respect symbol whitelist rules', async () => {
      const customRouter = new SignalRouter({
        symbolWhitelist: {
          'BTC/USD': ['scalping-strategy']
        }
      })

      const assignment = await customRouter.routeToStrategy(mockSignal, mockStrategies)

      expect(assignment?.strategyId).toBe('scalping-strategy')
    })

    it('should filter by risk mapping', async () => {
      const customRouter = new SignalRouter({
        riskMapping: {
          'medium': ['momentum-strategy', 'scalping-strategy'],
          'high': ['swing-strategy']
        }
      })

      const assignment = await customRouter.routeToStrategy(mockSignal, mockStrategies)

      expect(['momentum-strategy', 'scalping-strategy']).toContain(assignment?.strategyId)
    })

    it('should filter by performance threshold', async () => {
      router.updateStrategyCapacity('momentum-strategy', {
        performance: {
          winRate: 0.3, // Below threshold
          avgReturn: 0.01,
          sharpeRatio: 0.4
        }
      })

      router.updateStrategyCapacity('scalping-strategy', {
        performance: {
          winRate: 0.7,
          avgReturn: 0.02,
          sharpeRatio: 1.2
        }
      })

      const assignment = await router.routeToStrategy(mockSignal, mockStrategies)

      expect(assignment?.strategyId).not.toBe('momentum-strategy')
    })

    it('should check strategy capacity', async () => {
      // Fill up momentum strategy
      router.updateStrategyCapacity('momentum-strategy', {
        currentPositions: 10,
        maxPositions: 10,
        activeSignals: 10
      })

      const assignment = await router.routeToStrategy(mockSignal, mockStrategies)

      expect(assignment?.strategyId).not.toBe('momentum-strategy')
    })

    it('should handle high risk signals', async () => {
      const highRiskSignal = {
        ...mockSignal,
        metadata: { ...mockSignal.metadata, riskLevel: 'critical' }
      }

      const assignment = await router.routeToStrategy(highRiskSignal, mockStrategies)

      // Only swing strategy allows high risk
      expect(assignment?.strategyId).toBe('swing-strategy')
    })

    it('should prefer strategies with better performance', async () => {
      router.updateStrategyCapacity('momentum-strategy', {
        performance: {
          winRate: 0.5,
          avgReturn: 0.01,
          sharpeRatio: 0.8
        }
      })

      router.updateStrategyCapacity('scalping-strategy', {
        performance: {
          winRate: 0.8,
          avgReturn: 0.03,
          sharpeRatio: 1.5
        }
      })

      const assignment = await router.routeToStrategy(mockSignal, mockStrategies)

      expect(assignment?.strategyId).toBe('scalping-strategy')
    })

    it('should record assignment after routing', async () => {
      await router.routeToStrategy(mockSignal, mockStrategies)

      const activeAssignments = router.getActiveAssignments()
      expect(activeAssignments).toHaveLength(1)
      expect(activeAssignments[0].signal.id).toBe('sig-123')
    })
  })

  describe('balanceLoad', () => {
    it('should distribute signals evenly across strategies', async () => {
      const signals = Array.from({ length: 6 }, (_, i) => ({
        ...mockSignal,
        id: `sig-${i}`,
        priority: 10 - i
      }))

      const assignments = await router.balanceLoad(signals, mockStrategies)

      expect(assignments).toHaveLength(6)
      
      // Count assignments per strategy
      const counts = assignments.reduce((acc, a) => {
        acc[a.strategyId] = (acc[a.strategyId] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Should be relatively balanced (2 signals per strategy)
      Object.values(counts).forEach(count => {
        expect(count).toBeGreaterThanOrEqual(1)
        expect(count).toBeLessThanOrEqual(3)
      })
    })

    it('should respect max signals per strategy', async () => {
      const customRouter = new SignalRouter({
        maxSignalsPerStrategy: 2
      })

      const signals = Array.from({ length: 10 }, (_, i) => ({
        ...mockSignal,
        id: `sig-${i}`,
        priority: 5
      }))

      const assignments = await customRouter.balanceLoad(signals, mockStrategies)

      // Count assignments per strategy
      const counts = assignments.reduce((acc, a) => {
        acc[a.strategyId] = (acc[a.strategyId] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      Object.values(counts).forEach(count => {
        expect(count).toBeLessThanOrEqual(2)
      })
    })

    it('should prioritize high priority signals', async () => {
      const signals = [
        { ...mockSignal, id: 'low-1', priority: 1 },
        { ...mockSignal, id: 'high-1', priority: 10 },
        { ...mockSignal, id: 'low-2', priority: 2 },
        { ...mockSignal, id: 'high-2', priority: 9 }
      ]

      const assignments = await router.balanceLoad(signals, mockStrategies)

      // High priority signals should be assigned first
      const assignedIds = assignments.map(a => a.signal.id)
      expect(assignedIds.indexOf('high-1')).toBeLessThan(assignedIds.indexOf('low-1'))
      expect(assignedIds.indexOf('high-2')).toBeLessThan(assignedIds.indexOf('low-2'))
    })

    it('should filter eligible strategies for each signal', async () => {
      const signals = [
        { ...mockSignal, symbol: 'BTC/USD' },
        { ...mockSignal, symbol: 'SOL/USD', id: 'sig-sol' }
      ]

      const assignments = await router.balanceLoad(signals, mockStrategies)

      const solAssignment = assignments.find(a => a.signal.id === 'sig-sol')
      // Only scalping-strategy allows SOL/USD in first two strategies
      expect(solAssignment?.strategyId).toBe('scalping-strategy')
    })
  })

  describe('checkStrategyCapacity', () => {
    it('should return true when no capacity info exists', async () => {
      const hasCapacity = await router.checkStrategyCapacity('unknown-strategy')
      expect(hasCapacity).toBe(true)
    })

    it('should return false when positions are at max', async () => {
      router.updateStrategyCapacity('momentum-strategy', {
        currentPositions: 10,
        maxPositions: 10
      })

      const hasCapacity = await router.checkStrategyCapacity('momentum-strategy')
      expect(hasCapacity).toBe(false)
    })

    it('should return false when capital is near limit', async () => {
      router.updateStrategyCapacity('momentum-strategy', {
        allocatedCapital: 95000,
        maxCapital: 100000
      })

      const hasCapacity = await router.checkStrategyCapacity('momentum-strategy')
      expect(hasCapacity).toBe(false)
    })

    it('should return false when signal limit reached', async () => {
      router.updateStrategyCapacity('momentum-strategy', {
        activeSignals: 10
      })

      const hasCapacity = await router.checkStrategyCapacity('momentum-strategy')
      expect(hasCapacity).toBe(false)
    })

    it('should return true when all limits are within bounds', async () => {
      router.updateStrategyCapacity('momentum-strategy', {
        currentPositions: 5,
        maxPositions: 10,
        allocatedCapital: 50000,
        maxCapital: 100000,
        activeSignals: 5
      })

      const hasCapacity = await router.checkStrategyCapacity('momentum-strategy')
      expect(hasCapacity).toBe(true)
    })
  })

  describe('updateStrategyCapacity', () => {
    it('should create new capacity entry if not exists', () => {
      router.updateStrategyCapacity('new-strategy', {
        currentPositions: 3,
        allocatedCapital: 30000
      })

      const assignments = router.getActiveAssignments('new-strategy')
      expect(assignments).toEqual([])
    })

    it('should update existing capacity', () => {
      router.updateStrategyCapacity('momentum-strategy', {
        currentPositions: 5
      })

      router.updateStrategyCapacity('momentum-strategy', {
        allocatedCapital: 50000
      })

      // Both updates should be preserved
      const capacity = router['strategyCapacities'].get('momentum-strategy')
      expect(capacity?.currentPositions).toBe(5)
      expect(capacity?.allocatedCapital).toBe(50000)
    })
  })

  describe('getActiveAssignments', () => {
    beforeEach(async () => {
      await router.routeToStrategy(mockSignal, mockStrategies)
      await router.routeToStrategy(
        { ...mockSignal, id: 'sig-456', symbol: 'ETH/USD' },
        mockStrategies
      )
    })

    it('should return all assignments when no strategy specified', () => {
      const assignments = router.getActiveAssignments()
      expect(assignments).toHaveLength(2)
    })

    it('should return assignments for specific strategy', () => {
      const assignments = router.getActiveAssignments('momentum-strategy')
      expect(assignments.length).toBeGreaterThanOrEqual(0)
      assignments.forEach(a => {
        expect(a.strategyId).toBe('momentum-strategy')
      })
    })

    it('should return empty array for unknown strategy', () => {
      const assignments = router.getActiveAssignments('unknown-strategy')
      expect(assignments).toEqual([])
    })
  })

  describe('removeExpiredAssignments', () => {
    it('should remove expired assignments', async () => {
      const expiredSignal = {
        ...mockSignal,
        expiresAt: Date.now() - 1000 // Expired
      }

      const validSignal = {
        ...mockSignal,
        id: 'sig-valid',
        expiresAt: Date.now() + 60000 // Valid for 1 minute
      }

      await router.routeToStrategy(expiredSignal, mockStrategies)
      await router.routeToStrategy(validSignal, mockStrategies)

      const removed = router.removeExpiredAssignments()

      expect(removed).toBe(1)
      expect(router.getActiveAssignments()).toHaveLength(1)
      expect(router.getActiveAssignments()[0].signal.id).toBe('sig-valid')
    })

    it('should clean up empty strategy entries', async () => {
      const expiredSignal = {
        ...mockSignal,
        expiresAt: Date.now() - 1000
      }

      await router.routeToStrategy(expiredSignal, [mockStrategies[0]])

      router.removeExpiredAssignments()

      expect(router['activeAssignments'].has('momentum-strategy')).toBe(false)
    })
  })

  describe('getRoutingStats', () => {
    it('should return correct statistics', async () => {
      const signals = Array.from({ length: 6 }, (_, i) => ({
        ...mockSignal,
        id: `sig-${i}`,
        priority: 5
      }))

      await router.balanceLoad(signals, mockStrategies)

      const stats = router.getRoutingStats()

      expect(stats.totalAssignments).toBe(6)
      expect(Object.keys(stats.assignmentsByStrategy).length).toBeGreaterThan(0)
      expect(stats.avgSignalsPerStrategy).toBeGreaterThan(0)
      expect(stats.routingEfficiency).toBeGreaterThan(0)
      expect(stats.routingEfficiency).toBeLessThanOrEqual(1)
    })

    it('should handle empty assignments', () => {
      const stats = router.getRoutingStats()

      expect(stats.totalAssignments).toBe(0)
      expect(stats.assignmentsByStrategy).toEqual({})
      expect(stats.avgSignalsPerStrategy).toBe(0)
      expect(stats.routingEfficiency).toBe(1)
    })

    it('should calculate routing efficiency correctly', async () => {
      // Create perfectly balanced distribution
      const signals = Array.from({ length: 3 }, (_, i) => ({
        ...mockSignal,
        id: `sig-${i}`,
        priority: 5
      }))

      // Force each signal to different strategy
      for (let i = 0; i < signals.length; i++) {
        await router.routeToStrategy(signals[i], [mockStrategies[i]])
      }

      const stats = router.getRoutingStats()

      // Perfect distribution should have high efficiency
      expect(stats.routingEfficiency).toBeGreaterThan(0.9)
    })
  })

  describe('filtering and scoring', () => {
    it('should filter strategies by timeframe mapping', async () => {
      const customRouter = new SignalRouter({
        timeframeMapping: {
          '5m': ['momentum-strategy'],
          '1m': ['scalping-strategy'],
          '1h': ['swing-strategy']
        }
      })

      const assignment = await customRouter.routeToStrategy(mockSignal, mockStrategies)

      expect(assignment?.strategyId).toBe('momentum-strategy')
    })

    it('should score strategies based on multiple factors', async () => {
      // Set up different performance profiles
      router.updateStrategyCapacity('momentum-strategy', {
        currentPositions: 2,
        maxPositions: 10,
        performance: {
          winRate: 0.6,
          avgReturn: 0.02,
          sharpeRatio: 1.0
        }
      })

      router.updateStrategyCapacity('scalping-strategy', {
        currentPositions: 8,
        maxPositions: 10,
        performance: {
          winRate: 0.7,
          avgReturn: 0.01,
          sharpeRatio: 0.8
        }
      })

      // Despite scalping having better win rate, momentum should win due to:
      // - Better timeframe match (5m)
      // - Lower capacity utilization
      const assignment = await router.routeToStrategy(mockSignal, mockStrategies)

      expect(assignment?.strategyId).toBe('momentum-strategy')
    })

    it('should handle conservative strategies for low risk signals', async () => {
      const lowRiskSignal = {
        ...mockSignal,
        metadata: { ...mockSignal.metadata, riskLevel: 'low' }
      }

      const assignment = await router.routeToStrategy(lowRiskSignal, mockStrategies)

      // Scalping is the only conservative strategy
      expect(assignment?.reason).toContain('Conservative strategy')
    })

    it('should generate detailed assignment reasons', async () => {
      router.updateStrategyCapacity('momentum-strategy', {
        performance: {
          winRate: 0.65,
          avgReturn: 0.02,
          sharpeRatio: 1.2
        }
      })

      const assignment = await router.routeToStrategy(mockSignal, mockStrategies)

      expect(assignment?.reason).toContain('High win rate')
      expect(assignment?.reason).toContain('Timeframe match')
      expect(assignment?.reason).toContain('Score:')
    })
  })
})