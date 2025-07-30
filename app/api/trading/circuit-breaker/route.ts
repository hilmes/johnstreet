import { NextRequest, NextResponse } from 'next/server'
import { CircuitBreaker } from '@/lib/trading/CircuitBreaker'

export const runtime = 'edge'

// Global circuit breaker instance
let circuitBreaker: CircuitBreaker | null = null

function getCircuitBreaker(): CircuitBreaker {
  if (!circuitBreaker) {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 300000, // 5 minutes
      monitoringPeriod: 60000, // 1 minute
      maxDailyLoss: 1000, // $1000
      maxDrawdown: 10, // 10%
      maxConsecutiveLosses: 3,
      enableAutoHalt: true
    })

    // Set up event listeners
    circuitBreaker.on('circuit_opened', (event) => {
      console.log('⚠️  TRADING HALTED:', event.reason)
    })

    circuitBreaker.on('circuit_closed', (event) => {
      console.log('✅ TRADING RESUMED')
    })

    circuitBreaker.on('emergency_stop', (event) => {
      console.log('🚨 EMERGENCY STOP:', event.reason)
    })

    circuitBreaker.on('failure_recorded', (failure) => {
      console.log('❌ Failure recorded:', failure.type, failure.error)
    })
  }
  
  return circuitBreaker
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { action } = body

    const breaker = getCircuitBreaker()

    switch (action) {
      case 'force_open': {
        const { reason } = body
        if (!reason) {
          return NextResponse.json({
            success: false,
            error: 'Reason is required for force_open'
          }, { status: 400 })
        }

        breaker.forceOpen(reason)
        
        return NextResponse.json({
          success: true,
          message: `Circuit breaker opened: ${reason}`,
          state: breaker.getState()
        })
      }

      case 'force_close': {
        breaker.forceClose()
        
        return NextResponse.json({
          success: true,
          message: 'Circuit breaker closed manually',
          state: breaker.getState()
        })
      }

      case 'emergency_stop': {
        const { reason } = body
        if (!reason) {
          return NextResponse.json({
            success: false,
            error: 'Reason is required for emergency_stop'
          }, { status: 400 })
        }

        breaker.emergencyStop(reason)
        
        return NextResponse.json({
          success: true,
          message: `Emergency stop activated: ${reason}`,
          state: breaker.getState()
        })
      }

      case 'update_metrics': {
        const { dailyPnL, totalPnL, drawdown, tradePnL } = body
        
        if (dailyPnL !== undefined) {
          breaker.updateDailyPnL(dailyPnL)
        }
        
        if (totalPnL !== undefined) {
          breaker.updateTotalPnL(totalPnL)
        }
        
        if (drawdown !== undefined) {
          breaker.updateDrawdown(drawdown)
        }
        
        if (tradePnL !== undefined) {
          breaker.recordTrade(tradePnL)
        }
        
        return NextResponse.json({
          success: true,
          message: 'Metrics updated',
          metrics: breaker.getMetrics(),
          state: breaker.getState()
        })
      }

      case 'update_config': {
        const { 
          failureThreshold, 
          resetTimeout, 
          monitoringPeriod, 
          maxDailyLoss, 
          maxDrawdown, 
          maxConsecutiveLosses, 
          enableAutoHalt 
        } = body
        
        const config: any = {}
        if (failureThreshold !== undefined) config.failureThreshold = failureThreshold
        if (resetTimeout !== undefined) config.resetTimeout = resetTimeout
        if (monitoringPeriod !== undefined) config.monitoringPeriod = monitoringPeriod
        if (maxDailyLoss !== undefined) config.maxDailyLoss = maxDailyLoss
        if (maxDrawdown !== undefined) config.maxDrawdown = maxDrawdown
        if (maxConsecutiveLosses !== undefined) config.maxConsecutiveLosses = maxConsecutiveLosses
        if (enableAutoHalt !== undefined) config.enableAutoHalt = enableAutoHalt
        
        breaker.updateConfig(config)
        
        return NextResponse.json({
          success: true,
          message: 'Configuration updated',
          config: breaker.getConfig()
        })
      }

      case 'reset_daily_metrics': {
        breaker.resetDailyMetrics()
        
        return NextResponse.json({
          success: true,
          message: 'Daily metrics reset',
          metrics: breaker.getMetrics()
        })
      }

      case 'test_operation': {
        // Test the circuit breaker with a simulated operation
        const { shouldFail } = body
        
        try {
          await breaker.execute(async () => {
            if (shouldFail) {
              throw new Error('Simulated operation failure')
            }
            return 'Operation succeeded'
          }, 'test_operation')
          
          return NextResponse.json({
            success: true,
            message: 'Test operation succeeded',
            state: breaker.getState()
          })
        } catch (error: any) {
          return NextResponse.json({
            success: false,
            message: `Test operation failed: ${error.message}`,
            state: breaker.getState()
          })
        }
      }

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Circuit breaker API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Circuit breaker operation failed'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    const breaker = getCircuitBreaker()

    switch (action) {
      case 'status': {
        return NextResponse.json({
          success: true,
          state: breaker.getState(),
          operational: breaker.isOperational(),
          metrics: breaker.getMetrics(),
          recentFailures: breaker.getRecentFailureCount()
        })
      }

      case 'metrics': {
        return NextResponse.json({
          success: true,
          metrics: breaker.getMetrics()
        })
      }

      case 'failures': {
        return NextResponse.json({
          success: true,
          failures: breaker.getFailures(),
          recentCount: breaker.getRecentFailureCount()
        })
      }

      case 'config': {
        return NextResponse.json({
          success: true,
          config: breaker.getConfig()
        })
      }

      case 'health': {
        const metrics = breaker.getMetrics()
        const config = breaker.getConfig()
        
        const health = {
          operational: breaker.isOperational(),
          state: breaker.getState(),
          riskLevel: 'low', // Default
          checks: {
            dailyLossOk: metrics.dailyPnL > -config.maxDailyLoss,
            drawdownOk: metrics.drawdown < config.maxDrawdown,
            consecutiveLossesOk: metrics.consecutiveLosses < config.maxConsecutiveLosses,
            recentFailuresOk: breaker.getRecentFailureCount() < config.failureThreshold
          }
        }
        
        // Determine risk level
        const failedChecks = Object.values(health.checks).filter(check => !check).length
        if (failedChecks >= 3) {
          health.riskLevel = 'high'
        } else if (failedChecks >= 1) {
          health.riskLevel = 'medium'
        }
        
        return NextResponse.json({
          success: true,
          health
        })
      }

      case 'dashboard': {
        return NextResponse.json({
          success: true,
          dashboard: {
            state: breaker.getState(),
            operational: breaker.isOperational(),
            metrics: breaker.getMetrics(),
            config: breaker.getConfig(),
            recentFailures: breaker.getRecentFailureCount(),
            failures: breaker.getFailures().slice(-10), // Last 10 failures
            uptime: Date.now() - (breaker.getMetrics().lastTradeTime || Date.now())
          }
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Action parameter is required. Valid actions: status, metrics, failures, config, health, dashboard'
        }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Circuit breaker GET error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get circuit breaker data'
    }, { status: 500 })
  }
}