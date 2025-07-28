import { CircuitBreaker } from './CircuitBreaker'

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000, // 1 second for faster tests
      monitoringPeriod: 100, // 100ms for faster tests
      maxDailyLoss: 1000,
      maxDrawdown: 10,
      maxConsecutiveLosses: 3,
      enableAutoHalt: true
    })
  })

  afterEach(() => {
    circuitBreaker.destroy()
  })

  describe('initialization', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe('closed')
      expect(circuitBreaker.isOperational()).toBe(true)
    })

    it('should initialize with default config', () => {
      const defaultBreaker = new CircuitBreaker()
      const config = defaultBreaker.getConfig()
      expect(config.failureThreshold).toBe(5)
      expect(config.resetTimeout).toBe(300000)
      expect(config.enableAutoHalt).toBe(true)
      defaultBreaker.destroy()
    })

    it('should accept custom config', () => {
      const config = circuitBreaker.getConfig()
      expect(config.failureThreshold).toBe(3)
      expect(config.resetTimeout).toBe(1000)
    })
  })

  describe('execute operations', () => {
    it('should execute successful operations when closed', async () => {
      const result = await circuitBreaker.execute(async () => 'success')
      expect(result).toBe('success')
    })

    it('should emit success event on successful operation', (done) => {
      circuitBreaker.on('operation_success', (event) => {
        expect(event.operationType).toBe('test')
        expect(event.state).toBe('closed')
        done()
      })

      circuitBreaker.execute(async () => 'success', 'test')
    })

    it('should handle failed operations', async () => {
      const error = new Error('Test failure')
      
      await expect(
        circuitBreaker.execute(async () => {
          throw error
        })
      ).rejects.toThrow('Test failure')
    })

    it('should record failures', async () => {
      const error = new Error('API error')
      
      try {
        await circuitBreaker.execute(async () => {
          throw error
        })
      } catch {}

      const failures = circuitBreaker.getFailures()
      expect(failures.length).toBe(1)
      expect(failures[0].error).toBe('API error')
      expect(failures[0].type).toBe('api_error')
    })
  })

  describe('circuit breaking', () => {
    it('should open circuit after threshold failures', async () => {
      const error = new Error('API error')
      
      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(async () => {
            throw error
          })
        } catch {}
      }

      expect(circuitBreaker.getState()).toBe('open')
      expect(circuitBreaker.isOperational()).toBe(false)
    })

    it('should block operations when open', async () => {
      circuitBreaker.forceOpen('Test reason')
      
      await expect(
        circuitBreaker.execute(async () => 'should not execute')
      ).rejects.toThrow('Circuit breaker is OPEN - trading is halted')
    })

    it('should emit circuit opened event', (done) => {
      circuitBreaker.on('circuit_opened', (event) => {
        expect(event.reason).toContain('Too many failures')
        expect(event.timestamp).toBeDefined()
        done()
      })

      // Trigger failures
      const triggerFailures = async () => {
        for (let i = 0; i < 3; i++) {
          try {
            await circuitBreaker.execute(async () => {
              throw new Error('Test failure')
            })
          } catch {}
        }
      }

      triggerFailures()
    })

    it('should transition to half-open after reset timeout', (done) => {
      circuitBreaker.on('circuit_half_open', () => {
        expect(circuitBreaker.getState()).toBe('half_open')
        done()
      })

      circuitBreaker.forceOpen('Test')
    })

    it('should close circuit after successful operation in half-open state', async () => {
      circuitBreaker.forceOpen('Test')
      
      // Wait for half-open state
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      expect(circuitBreaker.getState()).toBe('half_open')
      
      // Execute successful operation
      await circuitBreaker.execute(async () => 'success')
      
      expect(circuitBreaker.getState()).toBe('closed')
    })
  })

  describe('trading metrics', () => {
    it('should update daily PnL', () => {
      circuitBreaker.updateDailyPnL(-500)
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.dailyPnL).toBe(-500)
    })

    it('should open circuit on max daily loss', (done) => {
      circuitBreaker.on('circuit_opened', (event) => {
        expect(event.reason).toBe('Daily loss limit exceeded')
        done()
      })

      circuitBreaker.updateDailyPnL(-1001)
    })

    it('should update drawdown', () => {
      circuitBreaker.updateDrawdown(5)
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.drawdown).toBe(5)
    })

    it('should open circuit on max drawdown', (done) => {
      circuitBreaker.on('circuit_opened', (event) => {
        expect(event.reason).toBe('Maximum drawdown exceeded')
        done()
      })

      circuitBreaker.updateDrawdown(11)
    })

    it('should track consecutive losses', () => {
      circuitBreaker.recordTrade(-100)
      circuitBreaker.recordTrade(-200)
      
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.consecutiveLosses).toBe(2)
    })

    it('should reset consecutive losses on win', () => {
      circuitBreaker.recordTrade(-100)
      circuitBreaker.recordTrade(-200)
      circuitBreaker.recordTrade(100)
      
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.consecutiveLosses).toBe(0)
    })

    it('should open circuit on max consecutive losses', (done) => {
      circuitBreaker.on('circuit_opened', (event) => {
        expect(event.reason).toBe('Maximum consecutive losses exceeded')
        done()
      })

      circuitBreaker.recordTrade(-100)
      circuitBreaker.recordTrade(-200)
      circuitBreaker.recordTrade(-300)
    })
  })

  describe('error categorization', () => {
    it('should categorize API errors correctly', async () => {
      try {
        await circuitBreaker.execute(async () => {
          throw new Error('API timeout')
        })
      } catch {}

      const failures = circuitBreaker.getFailures()
      expect(failures[0].type).toBe('api_error')
    })

    it('should categorize trade loss errors', async () => {
      try {
        await circuitBreaker.execute(async () => {
          throw new Error('Trade loss exceeded')
        })
      } catch {}

      const failures = circuitBreaker.getFailures()
      expect(failures[0].type).toBe('trade_loss')
    })

    it('should categorize drawdown errors', async () => {
      try {
        await circuitBreaker.execute(async () => {
          throw new Error('Drawdown limit reached')
        })
      } catch {}

      const failures = circuitBreaker.getFailures()
      expect(failures[0].type).toBe('drawdown')
    })
  })

  describe('manual controls', () => {
    it('should force open circuit', (done) => {
      circuitBreaker.on('trading_halted', (event) => {
        expect(event.reason).toBe('Manual halt: Emergency')
        done()
      })

      circuitBreaker.forceOpen('Emergency')
      expect(circuitBreaker.getState()).toBe('open')
    })

    it('should force close circuit', () => {
      circuitBreaker.forceOpen('Test')
      circuitBreaker.forceClose()
      expect(circuitBreaker.getState()).toBe('closed')
    })

    it('should handle emergency stop', (done) => {
      circuitBreaker.on('emergency_stop', (event) => {
        expect(event.reason).toBe('System failure')
        expect(circuitBreaker.getState()).toBe('open')
        done()
      })

      circuitBreaker.emergencyStop('System failure')
    })
  })

  describe('configuration', () => {
    it('should update configuration', (done) => {
      circuitBreaker.on('config_updated', (config) => {
        expect(config.maxDailyLoss).toBe(2000)
        done()
      })

      circuitBreaker.updateConfig({ maxDailyLoss: 2000 })
    })

    it('should not override other config values when updating', () => {
      const originalConfig = circuitBreaker.getConfig()
      circuitBreaker.updateConfig({ maxDailyLoss: 2000 })
      
      const newConfig = circuitBreaker.getConfig()
      expect(newConfig.maxDailyLoss).toBe(2000)
      expect(newConfig.failureThreshold).toBe(originalConfig.failureThreshold)
    })
  })

  describe('daily reset', () => {
    it('should reset daily metrics', () => {
      circuitBreaker.updateDailyPnL(-500)
      circuitBreaker.recordTrade(-100)
      circuitBreaker.recordTrade(-200)
      
      circuitBreaker.resetDailyMetrics()
      
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.dailyPnL).toBe(0)
      expect(metrics.consecutiveLosses).toBe(0)
    })

    it('should emit daily reset event', (done) => {
      circuitBreaker.on('daily_reset', () => {
        done()
      })

      circuitBreaker.resetDailyMetrics()
    })
  })

  describe('failure cleanup', () => {
    it('should cleanup old failures', async () => {
      // Add some failures
      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreaker.execute(async () => {
            throw new Error('Test failure')
          })
        } catch {}
      }

      expect(circuitBreaker.getFailures().length).toBe(2)

      // Wait for cleanup (monitoring period is 100ms)
      await new Promise(resolve => setTimeout(resolve, 150))

      // Failures should still be there (less than 24 hours old)
      expect(circuitBreaker.getFailures().length).toBe(2)
    })

    it('should count only recent failures for threshold', async () => {
      // Create a custom breaker with longer monitoring period
      const customBreaker = new CircuitBreaker({
        failureThreshold: 3,
        monitoringPeriod: 100
      })

      // Add 2 failures
      for (let i = 0; i < 2; i++) {
        try {
          await customBreaker.execute(async () => {
            throw new Error('Test failure')
          })
        } catch {}
      }

      // Wait for them to become "old"
      await new Promise(resolve => setTimeout(resolve, 150))

      // Add 2 more failures - should not trip the breaker
      for (let i = 0; i < 2; i++) {
        try {
          await customBreaker.execute(async () => {
            throw new Error('Test failure')
          })
        } catch {}
      }

      // Only recent failures count
      expect(customBreaker.getRecentFailureCount()).toBeLessThan(3)
      expect(customBreaker.getState()).toBe('closed')

      customBreaker.destroy()
    })
  })

  describe('auto halt', () => {
    it('should not auto-halt when disabled', () => {
      const noHaltBreaker = new CircuitBreaker({
        enableAutoHalt: false,
        maxDailyLoss: 1000
      })

      noHaltBreaker.updateDailyPnL(-2000)
      expect(noHaltBreaker.getState()).toBe('closed')

      noHaltBreaker.destroy()
    })
  })

  describe('events', () => {
    it('should emit all expected events', async () => {
      const events: string[] = []
      
      const eventNames = [
        'operation_success',
        'operation_failure',
        'failure_recorded',
        'circuit_opened',
        'trading_halted',
        'trade_recorded'
      ]

      eventNames.forEach(event => {
        circuitBreaker.on(event, () => {
          events.push(event)
        })
      })

      // Trigger various events
      await circuitBreaker.execute(async () => 'success')
      
      try {
        await circuitBreaker.execute(async () => {
          throw new Error('Failure')
        })
      } catch {}

      circuitBreaker.recordTrade(-100)

      // Should have recorded several events
      expect(events).toContain('operation_success')
      expect(events).toContain('operation_failure')
      expect(events).toContain('failure_recorded')
      expect(events).toContain('trade_recorded')
    })
  })
})