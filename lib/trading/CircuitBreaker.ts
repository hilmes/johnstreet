import { EventEmitter } from 'events'

interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeout: number // milliseconds
  monitoringPeriod: number // milliseconds
  maxDailyLoss: number // USD
  maxDrawdown: number // percentage
  maxConsecutiveLosses: number
  enableAutoHalt: boolean
}

interface TradingMetrics {
  dailyPnL: number
  totalPnL: number
  drawdown: number
  consecutiveLosses: number
  totalTrades: number
  failedTrades: number
  lastTradeTime: number
}

enum CircuitBreakerState {
  CLOSED = 'closed',    // Normal operation
  OPEN = 'open',        // Trading halted
  HALF_OPEN = 'half_open' // Testing if trading can resume
}

interface FailureRecord {
  timestamp: number
  error: string
  type: 'api_error' | 'trade_loss' | 'drawdown' | 'consecutive_losses'
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED
  private config: CircuitBreakerConfig
  private metrics: TradingMetrics
  private failures: FailureRecord[] = []
  private lastFailureTime: number = 0
  private resetTimer: NodeJS.Timeout | null = null
  private monitoringTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    super()
    
    this.config = {
      failureThreshold: 5,
      resetTimeout: 300000, // 5 minutes
      monitoringPeriod: 60000, // 1 minute
      maxDailyLoss: 1000, // $1000
      maxDrawdown: 10, // 10%
      maxConsecutiveLosses: 3,
      enableAutoHalt: true,
      ...config
    }

    this.metrics = {
      dailyPnL: 0,
      totalPnL: 0,
      drawdown: 0,
      consecutiveLosses: 0,
      totalTrades: 0,
      failedTrades: 0,
      lastTradeTime: 0
    }

    this.startMonitoring()
  }

  private startMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer)
    }

    this.monitoringTimer = setInterval(() => {
      this.cleanupOldFailures()
      this.checkMetrics()
    }, this.config.monitoringPeriod)
  }

  private cleanupOldFailures(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000) // 24 hours
    this.failures = this.failures.filter(failure => failure.timestamp > cutoffTime)
  }

  private checkMetrics(): void {
    if (!this.config.enableAutoHalt) return

    // Check daily loss limit
    if (this.metrics.dailyPnL < -this.config.maxDailyLoss) {
      this.recordFailure('Daily loss limit exceeded', 'trade_loss')
      this.openCircuit('Daily loss limit exceeded')
      return
    }

    // Check drawdown limit
    if (this.metrics.drawdown > this.config.maxDrawdown) {
      this.recordFailure('Maximum drawdown exceeded', 'drawdown')
      this.openCircuit('Maximum drawdown exceeded')
      return
    }

    // Check consecutive losses
    if (this.metrics.consecutiveLosses >= this.config.maxConsecutiveLosses) {
      this.recordFailure('Maximum consecutive losses exceeded', 'consecutive_losses')
      this.openCircuit('Maximum consecutive losses exceeded')
      return
    }
  }

  async execute<T>(operation: () => Promise<T>, operationType: string = 'trade'): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      const error = new Error('Circuit breaker is OPEN - trading is halted')
      this.emit('execution_blocked', { operationType, reason: 'circuit_open' })
      throw error
    }

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Allow limited testing in half-open state
      console.log('Circuit breaker is HALF_OPEN - testing operation')
    }

    try {
      const result = await operation()
      this.onSuccess(operationType)
      return result
    } catch (error: any) {
      this.onFailure(error, operationType)
      throw error
    }
  }

  private onSuccess(operationType: string): void {
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      console.log('Operation succeeded in HALF_OPEN state - closing circuit')
      this.closeCircuit()
    }

    this.emit('operation_success', { operationType, state: this.state })
  }

  private onFailure(error: Error, operationType: string): void {
    const failureType = this.categorizeError(error)
    this.recordFailure(error.message, failureType)

    const recentFailures = this.getRecentFailures()
    
    if (recentFailures.length >= this.config.failureThreshold) {
      this.openCircuit(`Too many failures: ${recentFailures.length}`)
    }

    this.emit('operation_failure', { 
      operationType, 
      error: error.message, 
      failureType,
      state: this.state 
    })
  }

  private categorizeError(error: Error): FailureRecord['type'] {
    const message = error.message.toLowerCase()
    
    if (message.includes('api') || message.includes('network') || message.includes('timeout')) {
      return 'api_error'
    }
    
    if (message.includes('loss') || message.includes('pnl')) {
      return 'trade_loss'
    }
    
    if (message.includes('drawdown')) {
      return 'drawdown'
    }
    
    return 'api_error' // default
  }

  private recordFailure(error: string, type: FailureRecord['type']): void {
    const failure: FailureRecord = {
      timestamp: Date.now(),
      error,
      type
    }

    this.failures.push(failure)
    this.lastFailureTime = Date.now()
    this.metrics.failedTrades++

    console.log(`Circuit breaker recorded failure: ${type} - ${error}`)
    this.emit('failure_recorded', failure)
  }

  private getRecentFailures(): FailureRecord[] {
    const cutoffTime = Date.now() - this.config.monitoringPeriod
    return this.failures.filter(failure => failure.timestamp > cutoffTime)
  }

  private openCircuit(reason: string): void {
    if (this.state === CircuitBreakerState.OPEN) return

    console.log(`Circuit breaker OPENED: ${reason}`)
    this.state = CircuitBreakerState.OPEN
    
    // Set timer to attempt reset
    this.scheduleReset()
    
    this.emit('circuit_opened', { reason, timestamp: Date.now() })
    this.emit('trading_halted', { reason })
  }

  private scheduleReset(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
    }

    this.resetTimer = setTimeout(() => {
      this.attemptReset()
    }, this.config.resetTimeout)
  }

  private attemptReset(): void {
    if (this.state !== CircuitBreakerState.OPEN) return

    console.log('Circuit breaker attempting reset to HALF_OPEN')
    this.state = CircuitBreakerState.HALF_OPEN
    
    this.emit('circuit_half_open', { timestamp: Date.now() })
    
    // If no operations occur within the monitoring period, close the circuit
    setTimeout(() => {
      if (this.state === CircuitBreakerState.HALF_OPEN) {
        console.log('No operations in HALF_OPEN state - closing circuit')
        this.closeCircuit()
      }
    }, this.config.monitoringPeriod)
  }

  private closeCircuit(): void {
    console.log('Circuit breaker CLOSED - normal operation resumed')
    this.state = CircuitBreakerState.CLOSED
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
      this.resetTimer = null
    }
    
    this.emit('circuit_closed', { timestamp: Date.now() })
    this.emit('trading_resumed')
  }

  // Public methods for updating trading metrics
  updateDailyPnL(pnl: number): void {
    this.metrics.dailyPnL = pnl
    this.checkMetrics()
  }

  updateTotalPnL(pnl: number): void {
    this.metrics.totalPnL = pnl
  }

  updateDrawdown(drawdown: number): void {
    this.metrics.drawdown = drawdown
    this.checkMetrics()
  }

  recordTrade(pnl: number): void {
    this.metrics.totalTrades++
    this.metrics.lastTradeTime = Date.now()

    if (pnl < 0) {
      this.metrics.consecutiveLosses++
    } else {
      this.metrics.consecutiveLosses = 0
    }

    this.checkMetrics()
    this.emit('trade_recorded', { pnl, consecutiveLosses: this.metrics.consecutiveLosses })
  }

  // Manual control methods
  forceOpen(reason: string): void {
    this.openCircuit(`Manual halt: ${reason}`)
  }

  forceClose(): void {
    if (this.state !== CircuitBreakerState.CLOSED) {
      console.log('Circuit breaker manually closed')
      this.closeCircuit()
    }
  }

  // Status and configuration methods
  getState(): CircuitBreakerState {
    return this.state
  }

  getMetrics(): TradingMetrics {
    return { ...this.metrics }
  }

  getFailures(): FailureRecord[] {
    return [...this.failures]
  }

  getRecentFailureCount(): number {
    return this.getRecentFailures().length
  }

  isOperational(): boolean {
    return this.state === CircuitBreakerState.CLOSED
  }

  updateConfig(newConfig: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('Circuit breaker configuration updated:', newConfig)
    this.emit('config_updated', this.config)
  }

  getConfig(): CircuitBreakerConfig {
    return { ...this.config }
  }

  // Reset metrics (typically called at start of new trading day)
  resetDailyMetrics(): void {
    this.metrics.dailyPnL = 0
    this.metrics.consecutiveLosses = 0
    console.log('Daily trading metrics reset')
    this.emit('daily_reset')
  }

  // Emergency stop - immediately halt all trading
  emergencyStop(reason: string): void {
    console.log(`EMERGENCY STOP: ${reason}`)
    this.state = CircuitBreakerState.OPEN
    
    // Clear any reset timers
    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
      this.resetTimer = null
    }
    
    this.emit('emergency_stop', { reason, timestamp: Date.now() })
    this.emit('trading_halted', { reason: `EMERGENCY: ${reason}` })
  }

  // Cleanup
  destroy(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
    }
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer)
    }
    
    this.removeAllListeners()
    console.log('Circuit breaker destroyed')
  }
}