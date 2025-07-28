import { TradingSignal } from '../signals/SignalGenerator'
import { PositionSize } from '../risk/PositionSizer'
import { Order, OrderStatus, OrderType, TimeInForce } from '@/types/trading'
import { UnifiedExchange } from '@/lib/exchanges/unified/UnifiedExchange'

// Constants to replace magic numbers
const EXECUTION_CONSTANTS = {
  DEFAULT_SLIPPAGE_TOLERANCE: 0.01, // 1%
  DEFAULT_URGENCY_THRESHOLD: 0.8,
  DEFAULT_MAX_RETRIES: 3,
  DEFAULT_RETRY_DELAY: 1000, // ms
  DEFAULT_LIMIT_ORDER_TIMEOUT: 30000, // 30s
  DEFAULT_MARKET_ORDER_TIMEOUT: 5000, // 5s
  LIMIT_PRICE_BUFFER: 0.0005, // 0.05%
  PRICE_CHECK_INTERVAL: 1000, // 1s
  SHORT_TIMEFRAMES: ['1m', '5m'],
  PROGRESS_REPORT_INTERVAL: 1000 // Report every 1000 bars
} as const

export interface ExecutionConfig {
  slippageTolerance: number
  urgencyThreshold: number
  partialFillPolicy: 'accept' | 'cancel' | 'complete'
  maxRetries: number
  retryDelay: number
  orderTimeouts: {
    limit: number
    market: number
  }
}

export interface ExecutionResult {
  orderId: string
  status: 'success' | 'partial' | 'failed' | 'cancelled'
  filledAmount: number
  avgFillPrice: number
  totalCost: number
  fees: number
  slippage: number
  executionTime: number
  retries: number
  errors?: string[]
}

export interface ExecutionStatus {
  orderId: string
  filled: boolean
  fillPercentage: number
  status: string
  avgFillPrice?: number
  remainingAmount?: number
  fees?: number
  message?: string
}

export class ExecutionManager {
  private config: ExecutionConfig
  private activeOrders: Map<string, { order: Order; signal: TradingSignal }> = new Map()
  private executionHistory: ExecutionResult[] = []
  private exchange: UnifiedExchange | null = null

  constructor(config?: Partial<ExecutionConfig>) {
    this.config = this.createDefaultConfig(config)
  }

  private createDefaultConfig(overrides?: Partial<ExecutionConfig>): ExecutionConfig {
    return {
      slippageTolerance: EXECUTION_CONSTANTS.DEFAULT_SLIPPAGE_TOLERANCE,
      urgencyThreshold: EXECUTION_CONSTANTS.DEFAULT_URGENCY_THRESHOLD,
      partialFillPolicy: 'complete',
      maxRetries: EXECUTION_CONSTANTS.DEFAULT_MAX_RETRIES,
      retryDelay: EXECUTION_CONSTANTS.DEFAULT_RETRY_DELAY,
      orderTimeouts: {
        limit: EXECUTION_CONSTANTS.DEFAULT_LIMIT_ORDER_TIMEOUT,
        market: EXECUTION_CONSTANTS.DEFAULT_MARKET_ORDER_TIMEOUT
      },
      ...overrides
    }
  }

  async executeSignal(
    signal: TradingSignal,
    positionSize: PositionSize,
    exchange: UnifiedExchange
  ): Promise<ExecutionResult> {
    this.exchange = exchange
    const startTime = Date.now()
    
    try {
      const order = await this.prepareOrder(signal, positionSize)
      const result = await this.executeOrder(order, signal)
      
      return this.finalizeExecution(result, startTime)
    } catch (error) {
      return this.handleExecutionError(error, startTime)
    }
  }

  private async prepareOrder(
    signal: TradingSignal,
    positionSize: PositionSize
  ): Promise<Order> {
    const orderType = this.determineOrderType(signal)
    return this.createOrder(signal, positionSize, orderType)
  }

  private async executeOrder(order: Order, signal: TradingSignal): Promise<ExecutionResult> {
    const result = await this.placeOrderWithRetry(order, signal)
    
    if (this.shouldHandlePartialFill(result)) {
      await this.handlePartialFill(order, result)
    }
    
    return result
  }

  private shouldHandlePartialFill(result: ExecutionResult): boolean {
    return result.status === 'partial' && this.config.partialFillPolicy !== 'accept'
  }

  private finalizeExecution(result: ExecutionResult, startTime: number): ExecutionResult {
    result.executionTime = Date.now() - startTime
    this.executionHistory.push(result)
    return result
  }

  private handleExecutionError(error: unknown, startTime: number): ExecutionResult {
    const errorResult = this.createErrorResult(error, startTime)
    this.executionHistory.push(errorResult)
    return errorResult
  }

  private createErrorResult(error: unknown, startTime: number): ExecutionResult {
    return {
      orderId: '',
      status: 'failed',
      filledAmount: 0,
      avgFillPrice: 0,
      totalCost: 0,
      fees: 0,
      slippage: 0,
      executionTime: Date.now() - startTime,
      retries: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }

  private determineOrderType(signal: TradingSignal): OrderType {
    return signal.strength > this.config.urgencyThreshold ? 'market' : 'limit'
  }

  private async createOrder(
    signal: TradingSignal,
    positionSize: PositionSize,
    orderType: OrderType
  ): Promise<Order> {
    const price = orderType === 'limit' 
      ? await this.calculateLimitPrice(signal) 
      : signal.source.marketData.price

    return {
      id: '',
      symbol: signal.symbol,
      side: signal.action.toLowerCase() as 'buy' | 'sell',
      type: orderType,
      price,
      amount: positionSize.baseAmount,
      cost: positionSize.quoteAmount,
      status: 'open',
      filled: 0,
      remaining: positionSize.quoteAmount,
      average: 0,
      timestamp: Date.now(),
      timeInForce: this.determineTimeInForce(signal, orderType),
      stopLoss: positionSize.stopLoss,
      takeProfit: positionSize.takeProfit,
      metadata: {
        signalId: signal.id,
        positionSize: positionSize.baseAmount,
        leverage: positionSize.leverage
      }
    }
  }

  private async calculateLimitPrice(signal: TradingSignal): Promise<number> {
    if (!this.exchange) throw new Error('Exchange not connected')
    
    const orderBook = await this.exchange.fetchOrderBook(signal.symbol)
    const isBuyOrder = signal.action === 'BUY'
    
    return this.adjustPriceForLimitOrder(orderBook, signal, isBuyOrder)
  }

  private adjustPriceForLimitOrder(
    orderBook: any,
    signal: TradingSignal,
    isBuyOrder: boolean
  ): number {
    if (isBuyOrder) {
      const bestBid = orderBook.bids[0]?.[0] || signal.source.marketData.bid
      return bestBid * (1 + EXECUTION_CONSTANTS.LIMIT_PRICE_BUFFER)
    } else {
      const bestAsk = orderBook.asks[0]?.[0] || signal.source.marketData.ask
      return bestAsk * (1 - EXECUTION_CONSTANTS.LIMIT_PRICE_BUFFER)
    }
  }

  private determineTimeInForce(signal: TradingSignal, orderType: OrderType): TimeInForce {
    if (orderType === 'market') return 'IOC'
    
    return EXECUTION_CONSTANTS.SHORT_TIMEFRAMES.includes(signal.timeframe) ? 'IOC' : 'GTC'
  }

  private async placeOrderWithRetry(order: Order, signal: TradingSignal): Promise<ExecutionResult> {
    let lastError: Error | null = null
    
    for (let retry = 0; retry <= this.config.maxRetries; retry++) {
      try {
        return await this.attemptOrderPlacement(order, signal, retry)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (retry < this.config.maxRetries) {
          await this.waitWithBackoff(retry)
        }
      }
    }
    
    throw lastError || new Error('Max retries exceeded')
  }

  private async attemptOrderPlacement(
    order: Order,
    signal: TradingSignal,
    retryCount: number
  ): Promise<ExecutionResult> {
    const exchangeOrder = await this.placeOrderOnExchange(order)
    this.trackActiveOrder(order, exchangeOrder, signal)
    
    const filledOrder = await this.waitForFill(order, signal)
    return this.createExecutionResult(filledOrder, signal, retryCount)
  }

  private async placeOrderOnExchange(order: Order): Promise<any> {
    if (!this.exchange) throw new Error('Exchange not connected')
    
    return this.exchange.createOrder(
      order.symbol,
      order.type,
      order.side,
      order.amount,
      order.price
    )
  }

  private trackActiveOrder(order: Order, exchangeOrder: any, signal: TradingSignal): void {
    order.id = exchangeOrder.id
    order.status = exchangeOrder.status
    this.activeOrders.set(order.id, { order, signal })
  }

  private createExecutionResult(
    filledOrder: Order,
    signal: TradingSignal,
    retryCount: number
  ): ExecutionResult {
    const slippage = this.calculateSlippage(
      filledOrder.average || 0,
      signal.source.marketData.price,
      filledOrder.side
    )
    
    return {
      orderId: filledOrder.id,
      status: filledOrder.filled === filledOrder.amount ? 'success' : 'partial',
      filledAmount: filledOrder.filled,
      avgFillPrice: filledOrder.average || 0,
      totalCost: filledOrder.cost || 0,
      fees: filledOrder.fee?.cost || 0,
      slippage,
      executionTime: 0, // Set by caller
      retries: retryCount
    }
  }

  private async waitWithBackoff(retryCount: number): Promise<void> {
    const delay = this.config.retryDelay * Math.pow(2, retryCount)
    await this.delay(delay)
  }

  private calculateSlippage(fillPrice: number, expectedPrice: number, side: 'buy' | 'sell'): number {
    if (side === 'buy') {
      return (fillPrice - expectedPrice) / expectedPrice
    } else {
      return (expectedPrice - fillPrice) / expectedPrice
    }
  }

  private async waitForFill(order: Order, signal: TradingSignal): Promise<Order> {
    const timeout = this.getOrderTimeout(order.type)
    const startTime = Date.now()
    
    while (!this.isTimeout(startTime, timeout)) {
      const status = await this.checkOrderStatus(order, signal)
      
      if (status.completed) {
        return status.order
      }
      
      await this.delay(EXECUTION_CONSTANTS.PRICE_CHECK_INTERVAL)
    }
    
    return this.handleOrderTimeout(order)
  }

  private getOrderTimeout(orderType: OrderType): number {
    return orderType === 'market' 
      ? this.config.orderTimeouts.market 
      : this.config.orderTimeouts.limit
  }

  private isTimeout(startTime: number, timeout: number): boolean {
    return Date.now() - startTime >= timeout
  }

  private async checkOrderStatus(
    order: Order,
    signal: TradingSignal
  ): Promise<{ completed: boolean; order: Order }> {
    const status = await this.monitorExecution(order.id)
    
    if (status.filled || status.status === 'canceled') {
      return { completed: true, order: this.activeOrders.get(order.id)?.order || order }
    }
    
    if (order.type === 'limit' && await this.shouldCancelDueToPrice(order, signal)) {
      await this.cancelOrder(order.id)
      throw new Error('Order cancelled due to adverse price movement')
    }
    
    return { completed: false, order }
  }

  private async handleOrderTimeout(order: Order): Promise<Order> {
    if (order.type === 'limit' && order.filled === 0) {
      await this.cancelOrder(order.id)
      throw new Error('Order timeout - no fills')
    }
    
    return order
  }

  async monitorExecution(orderId: string): Promise<ExecutionStatus> {
    const orderData = this.activeOrders.get(orderId)
    
    if (!orderData || !this.exchange) {
      return this.createUnknownOrderStatus(orderId)
    }
    
    try {
      const exchangeOrder = await this.exchange.getOrder(orderId)
      return this.createExecutionStatus(orderData, exchangeOrder)
    } catch (error) {
      return this.createErrorStatus(orderId, error)
    }
  }

  private createUnknownOrderStatus(orderId: string): ExecutionStatus {
    return {
      orderId,
      filled: false,
      fillPercentage: 0,
      status: 'unknown',
      message: 'Order not found'
    }
  }

  private createExecutionStatus(
    orderData: { order: Order; signal: TradingSignal },
    exchangeOrder: any
  ): ExecutionStatus {
    orderData.order.status = exchangeOrder.status
    orderData.order.filled = exchangeOrder.filled
    
    const status: ExecutionStatus = {
      orderId: orderData.order.id,
      filled: exchangeOrder.status === 'closed',
      fillPercentage: (exchangeOrder.filled / exchangeOrder.amount) * 100,
      status: exchangeOrder.status,
      avgFillPrice: exchangeOrder.average,
      remainingAmount: exchangeOrder.remaining,
      fees: exchangeOrder.fee?.cost
    }
    
    if (status.filled || exchangeOrder.status === 'canceled') {
      this.activeOrders.delete(orderData.order.id)
    }
    
    return status
  }

  private createErrorStatus(orderId: string, error: unknown): ExecutionStatus {
    return {
      orderId,
      filled: false,
      fillPercentage: 0,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  private async shouldCancelDueToPrice(order: Order, signal: TradingSignal): Promise<boolean> {
    if (!this.exchange) return false
    
    const ticker = await this.exchange.fetchTicker(order.symbol)
    const currentPrice = ticker.last
    const originalPrice = signal.source.marketData.price
    
    const priceMovement = this.calculatePriceMovement(currentPrice, originalPrice, order.side)
    return priceMovement > this.config.slippageTolerance
  }

  private calculatePriceMovement(currentPrice: number, originalPrice: number, side: 'buy' | 'sell'): number {
    if (side === 'buy') {
      return (currentPrice - originalPrice) / originalPrice
    } else {
      return (originalPrice - currentPrice) / originalPrice
    }
  }

  private async cancelOrder(orderId: string): Promise<void> {
    if (!this.exchange) return
    
    try {
      await this.exchange.cancelOrder(orderId)
      this.activeOrders.delete(orderId)
    } catch (error) {
      console.error(`Failed to cancel order ${orderId}:`, error)
    }
  }

  private async handlePartialFill(order: Order, result: ExecutionResult): Promise<void> {
    if (this.config.partialFillPolicy === 'cancel') {
      await this.cancelOrder(order.id)
    } else if (this.config.partialFillPolicy === 'complete') {
      // Implement logic to complete the remaining fill
      // This might involve placing a new order for the remaining amount
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getMetrics(): ExecutionMetrics {
    const totalOrders = this.executionHistory.length
    const successful = this.executionHistory.filter(r => r.status === 'success').length
    const partial = this.executionHistory.filter(r => r.status === 'partial').length
    const failed = this.executionHistory.filter(r => r.status === 'failed').length
    
    const avgSlippage = this.executionHistory
      .filter(r => r.status === 'success')
      .reduce((sum, r) => sum + Math.abs(r.slippage), 0) / (successful || 1)
    
    const avgExecutionTime = this.executionHistory
      .reduce((sum, r) => sum + r.executionTime, 0) / (totalOrders || 1)
    
    const totalFees = this.executionHistory
      .reduce((sum, r) => sum + r.fees, 0)
    
    return {
      totalOrders,
      successRate: totalOrders > 0 ? successful / totalOrders : 0,
      avgSlippage,
      avgExecutionTime,
      partialFills: partial,
      failures: failed,
      totalFees
    }
  }
}

interface ExecutionMetrics {
  totalOrders: number
  successRate: number
  avgSlippage: number
  avgExecutionTime: number
  partialFills: number
  failures: number
  totalFees: number
}