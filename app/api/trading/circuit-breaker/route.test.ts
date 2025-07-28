import { POST, GET } from './route'
import { NextRequest } from 'next/server'
import { CircuitBreaker } from '@/lib/trading/CircuitBreaker'

// Mock the CircuitBreaker
jest.mock('@/lib/trading/CircuitBreaker')

describe('/api/trading/circuit-breaker', () => {
  let mockCircuitBreaker: jest.Mocked<CircuitBreaker>

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Create mock instance
    mockCircuitBreaker = {
      forceOpen: jest.fn(),
      forceClose: jest.fn(),
      emergencyStop: jest.fn(),
      updateDailyPnL: jest.fn(),
      updateTotalPnL: jest.fn(),
      updateDrawdown: jest.fn(),
      recordTrade: jest.fn(),
      updateConfig: jest.fn(),
      resetDailyMetrics: jest.fn(),
      execute: jest.fn(),
      getState: jest.fn().mockReturnValue('closed'),
      isOperational: jest.fn().mockReturnValue(true),
      getMetrics: jest.fn().mockReturnValue({
        dailyPnL: 0,
        totalPnL: 0,
        drawdown: 0,
        consecutiveLosses: 0,
        lastTradeTime: Date.now(),
        consecutiveWins: 0
      }),
      getConfig: jest.fn().mockReturnValue({
        failureThreshold: 5,
        resetTimeout: 300000,
        monitoringPeriod: 60000,
        maxDailyLoss: 1000,
        maxDrawdown: 10,
        maxConsecutiveLosses: 3,
        enableAutoHalt: true
      }),
      getRecentFailureCount: jest.fn().mockReturnValue(0),
      getFailures: jest.fn().mockReturnValue([]),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    } as any

    // Mock the constructor
    ;(CircuitBreaker as jest.MockedClass<typeof CircuitBreaker>).mockImplementation(() => mockCircuitBreaker)
  })

  describe('POST - Circuit Breaker Actions', () => {
    describe('force_open action', () => {
      it('should force open the circuit breaker', async () => {
        mockCircuitBreaker.getState.mockReturnValue('open')

        const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker', {
          method: 'POST',
          body: JSON.stringify({
            action: 'force_open',
            reason: 'Manual intervention required'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(mockCircuitBreaker.forceOpen).toHaveBeenCalledWith('Manual intervention required')
        expect(data).toEqual({
          success: true,
          message: 'Circuit breaker opened: Manual intervention required',
          state: 'open'
        })
        expect(response.status).toBe(200)
      })

      it('should require reason for force_open', async () => {
        const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker', {
          method: 'POST',
          body: JSON.stringify({
            action: 'force_open'
            // Missing reason
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data).toEqual({
          success: false,
          error: 'Reason is required for force_open'
        })
        expect(response.status).toBe(400)
        expect(mockCircuitBreaker.forceOpen).not.toHaveBeenCalled()
      })
    })

    describe('force_close action', () => {
      it('should force close the circuit breaker', async () => {
        mockCircuitBreaker.getState.mockReturnValue('closed')

        const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker', {
          method: 'POST',
          body: JSON.stringify({
            action: 'force_close'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(mockCircuitBreaker.forceClose).toHaveBeenCalled()
        expect(data).toEqual({
          success: true,
          message: 'Circuit breaker closed manually',
          state: 'closed'
        })
      })
    })

    describe('emergency_stop action', () => {
      it('should activate emergency stop', async () => {
        mockCircuitBreaker.getState.mockReturnValue('emergency_stop')

        const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker', {
          method: 'POST',
          body: JSON.stringify({
            action: 'emergency_stop',
            reason: 'Critical market conditions'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(mockCircuitBreaker.emergencyStop).toHaveBeenCalledWith('Critical market conditions')
        expect(data).toEqual({
          success: true,
          message: 'Emergency stop activated: Critical market conditions',
          state: 'emergency_stop'
        })
      })

      it('should require reason for emergency_stop', async () => {
        const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker', {
          method: 'POST',
          body: JSON.stringify({
            action: 'emergency_stop'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data).toEqual({
          success: false,
          error: 'Reason is required for emergency_stop'
        })
        expect(response.status).toBe(400)
      })
    })

    describe('update_metrics action', () => {
      it('should update all metrics', async () => {
        const updatedMetrics = {
          dailyPnL: -500,
          totalPnL: 1500,
          drawdown: 8.5,
          consecutiveLosses: 2,
          lastTradeTime: Date.now(),
          consecutiveWins: 0
        }
        mockCircuitBreaker.getMetrics.mockReturnValue(updatedMetrics)

        const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker', {
          method: 'POST',
          body: JSON.stringify({
            action: 'update_metrics',
            dailyPnL: -500,
            totalPnL: 1500,
            drawdown: 8.5,
            tradePnL: -100
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(mockCircuitBreaker.updateDailyPnL).toHaveBeenCalledWith(-500)
        expect(mockCircuitBreaker.updateTotalPnL).toHaveBeenCalledWith(1500)
        expect(mockCircuitBreaker.updateDrawdown).toHaveBeenCalledWith(8.5)
        expect(mockCircuitBreaker.recordTrade).toHaveBeenCalledWith(-100)
        expect(data).toEqual({
          success: true,
          message: 'Metrics updated',
          metrics: updatedMetrics,
          state: 'closed'
        })
      })

      it('should update partial metrics', async () => {
        const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker', {
          method: 'POST',
          body: JSON.stringify({
            action: 'update_metrics',
            dailyPnL: -200
            // Only updating dailyPnL
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(mockCircuitBreaker.updateDailyPnL).toHaveBeenCalledWith(-200)
        expect(mockCircuitBreaker.updateTotalPnL).not.toHaveBeenCalled()
        expect(mockCircuitBreaker.updateDrawdown).not.toHaveBeenCalled()
        expect(mockCircuitBreaker.recordTrade).not.toHaveBeenCalled()
        expect(data.success).toBe(true)
      })
    })

    describe('update_config action', () => {
      it('should update configuration', async () => {
        const newConfig = {
          failureThreshold: 10,
          resetTimeout: 600000,
          monitoringPeriod: 120000,
          maxDailyLoss: 2000,
          maxDrawdown: 15,
          maxConsecutiveLosses: 5,
          enableAutoHalt: false
        }
        mockCircuitBreaker.getConfig.mockReturnValue(newConfig)

        const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker', {
          method: 'POST',
          body: JSON.stringify({
            action: 'update_config',
            ...newConfig
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(mockCircuitBreaker.updateConfig).toHaveBeenCalledWith(newConfig)
        expect(data).toEqual({
          success: true,
          message: 'Configuration updated',
          config: newConfig
        })
      })

      it('should update partial configuration', async () => {
        const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker', {
          method: 'POST',
          body: JSON.stringify({
            action: 'update_config',
            maxDailyLoss: 5000,
            enableAutoHalt: false
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(mockCircuitBreaker.updateConfig).toHaveBeenCalledWith({
          maxDailyLoss: 5000,
          enableAutoHalt: false
        })
        expect(data.success).toBe(true)
      })
    })

    describe('reset_daily_metrics action', () => {
      it('should reset daily metrics', async () => {
        const resetMetrics = {
          dailyPnL: 0,
          totalPnL: 1500,
          drawdown: 0,
          consecutiveLosses: 0,
          lastTradeTime: Date.now(),
          consecutiveWins: 0
        }
        mockCircuitBreaker.getMetrics.mockReturnValue(resetMetrics)

        const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker', {
          method: 'POST',
          body: JSON.stringify({
            action: 'reset_daily_metrics'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(mockCircuitBreaker.resetDailyMetrics).toHaveBeenCalled()
        expect(data).toEqual({
          success: true,
          message: 'Daily metrics reset',
          metrics: resetMetrics
        })
      })
    })

    describe('test_operation action', () => {
      it('should execute successful test operation', async () => {
        mockCircuitBreaker.execute.mockResolvedValueOnce('Operation succeeded')

        const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker', {
          method: 'POST',
          body: JSON.stringify({
            action: 'test_operation',
            shouldFail: false
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(mockCircuitBreaker.execute).toHaveBeenCalledWith(
          expect.any(Function),
          'test_operation'
        )
        expect(data).toEqual({
          success: true,
          message: 'Test operation succeeded',
          state: 'closed'
        })
      })

      it('should handle failed test operation', async () => {
        mockCircuitBreaker.execute.mockRejectedValueOnce(new Error('Simulated operation failure'))

        const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker', {
          method: 'POST',
          body: JSON.stringify({
            action: 'test_operation',
            shouldFail: true
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data).toEqual({
          success: false,
          message: 'Test operation failed: Simulated operation failure',
          state: 'closed'
        })
      })
    })

    it('should handle unknown action', async () => {
      const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker', {
        method: 'POST',
        body: JSON.stringify({
          action: 'invalid_action'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({
        success: false,
        error: 'Unknown action: invalid_action'
      })
      expect(response.status).toBe(400)
    })

    it('should handle JSON parsing errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(response.status).toBe(500)
    })
  })

  describe('GET - Circuit Breaker Information', () => {
    it('should get status', async () => {
      const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker?action=status')

      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual({
        success: true,
        state: 'closed',
        operational: true,
        metrics: expect.any(Object),
        recentFailures: 0
      })
    })

    it('should get metrics', async () => {
      const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker?action=metrics')

      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual({
        success: true,
        metrics: expect.any(Object)
      })
    })

    it('should get failures', async () => {
      const mockFailures = [
        { timestamp: Date.now() - 60000, type: 'network', error: 'Connection timeout' },
        { timestamp: Date.now() - 30000, type: 'api', error: 'Rate limit exceeded' }
      ]
      mockCircuitBreaker.getFailures.mockReturnValue(mockFailures)
      mockCircuitBreaker.getRecentFailureCount.mockReturnValue(2)

      const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker?action=failures')

      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual({
        success: true,
        failures: mockFailures,
        recentCount: 2
      })
    })

    it('should get configuration', async () => {
      const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker?action=config')

      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual({
        success: true,
        config: expect.any(Object)
      })
    })

    it('should get health status', async () => {
      mockCircuitBreaker.getMetrics.mockReturnValue({
        dailyPnL: -500,
        totalPnL: 1000,
        drawdown: 5,
        consecutiveLosses: 1,
        lastTradeTime: Date.now(),
        consecutiveWins: 0
      })
      mockCircuitBreaker.getRecentFailureCount.mockReturnValue(2)

      const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker?action=health')

      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.health).toHaveProperty('operational', true)
      expect(data.health).toHaveProperty('state', 'closed')
      expect(data.health).toHaveProperty('riskLevel')
      expect(data.health.checks).toEqual({
        dailyLossOk: true,
        drawdownOk: true,
        consecutiveLossesOk: true,
        recentFailuresOk: true
      })
    })

    it('should get dashboard data', async () => {
      const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker?action=dashboard')

      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.dashboard).toHaveProperty('state')
      expect(data.dashboard).toHaveProperty('operational')
      expect(data.dashboard).toHaveProperty('metrics')
      expect(data.dashboard).toHaveProperty('config')
      expect(data.dashboard).toHaveProperty('recentFailures')
      expect(data.dashboard).toHaveProperty('failures')
      expect(data.dashboard).toHaveProperty('uptime')
    })

    it('should require action parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker')

      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual({
        success: false,
        error: 'Action parameter is required. Valid actions: status, metrics, failures, config, health, dashboard'
      })
      expect(response.status).toBe(400)
    })

    it('should handle errors', async () => {
      mockCircuitBreaker.getState.mockImplementationOnce(() => {
        throw new Error('Internal error')
      })

      const request = new NextRequest('http://localhost:3000/api/trading/circuit-breaker?action=status')

      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual({
        success: false,
        error: 'Internal error'
      })
      expect(response.status).toBe(500)
    })
  })
})