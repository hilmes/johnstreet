import { TradingSignal } from '../signals/SignalGenerator'
import { PositionSize } from '../risk/PositionSizer'
import { Order, OrderStatus, OrderType, TimeInForce } from '@/types/trading'
import { UnifiedExchange } from '@/lib/exchanges/unified/UnifiedExchange'

export interface ExecutionConfig {
  slippageTolerance: number // Max acceptable slippage %
  urgencyThreshold: number // Signal strength above which to use market orders
  partialFillPolicy: 'accept' | 'cancel' | 'complete'
  maxRetries: number
  retryDelay: number // milliseconds
  orderTimeouts: {
    limit: number // timeout for limit orders
    market: number // timeout for market orders
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
  executionTime: number // milliseconds
  retries: number
  errors?: string[]
}

export interface ExecutionMetrics {
  totalOrders: number
  successRate: number
  avgSlippage: number
  avgExecutionTime: number
  partialFills: number
  failures: number
  totalFees: number
}

export class ExecutionManager {
  private config: ExecutionConfig
  private activeOrders: Map<string, { order: Order; signal: TradingSignal }> = new Map()
  private executionHistory: ExecutionResult[] = []
  private exchange: UnifiedExchange | null = null

  constructor(config?: Partial<ExecutionConfig>) {
    this.config = {
      slippageTolerance: 0.01, // 1% default
      urgencyThreshold: 0.8, // Use market orders for signals > 0.8 strength
      partialFillPolicy: 'complete',
      maxRetries: 3,
      retryDelay: 1000,
      orderTimeouts: {
        limit: 30000, // 30 seconds
        market: 5000 // 5 seconds
      },
      ...config
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
      // Determine order type based on signal urgency
      const orderType = this.determineOrderType(signal)
      
      // Create order
      const order = await this.createOrder(signal, positionSize, orderType)
      
      // Place order with retry logic
      const result = await this.placeOrderWithRetry(order, signal)
      
      // Handle partial fills if needed
      if (result.status === 'partial' && this.config.partialFillPolicy !== 'accept') {
        await this.handlePartialFill(order, result)
      }
      
      // Record execution
      result.executionTime = Date.now() - startTime
      this.executionHistory.push(result)
      
      return result
      
    } catch (error) {
      const errorResult: ExecutionResult = {
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
      
      this.executionHistory.push(errorResult)
      return errorResult
    }
  }

  async monitorExecution(orderId: string): Promise<ExecutionStatus> {
    const orderData = this.activeOrders.get(orderId)
    if (!orderData || !this.exchange) {
      return {
        orderId,
        filled: false,
        fillPercentage: 0,
        status: 'unknown',
        message: 'Order not found'
      }
    }
    
    try {
      // Get order status from exchange
      const exchangeOrder = await this.exchange.getOrder(orderId)
      
      // Update local order status
      orderData.order.status = exchangeOrder.status
      orderData.order.filled = exchangeOrder.filled
      
      // Create execution status
      const status: ExecutionStatus = {
        orderId,
        filled: exchangeOrder.status === 'closed',
        fillPercentage: (exchangeOrder.filled / exchangeOrder.amount) * 100,
        status: exchangeOrder.status,
        avgFillPrice: exchangeOrder.average,
        remainingAmount: exchangeOrder.remaining,
        fees: exchangeOrder.fee?.cost
      }
      
      // Remove from active if complete
      if (status.filled || exchangeOrder.status === 'canceled') {
        this.activeOrders.delete(orderId)
      }
      
      return status
      
    } catch (error) {
      return {
        orderId,
        filled: false,
        fillPercentage: 0,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.exchange) return false
    
    try {
      await this.exchange.cancelOrder(orderId)
      this.activeOrders.delete(orderId)
      return true
    } catch (error) {
      console.error('Failed to cancel order:', error)
      return false
    }
  }

  private determineOrderType(signal: TradingSignal): OrderType {
    // Use market orders for urgent signals
    if (signal.strength >= this.config.urgencyThreshold) {
      return 'market'
    }
    
    // Use market orders for critical risk (exit quickly)
    if (signal.metadata.riskLevel === 'critical' && signal.action === 'SELL') {
      return 'market'
    }
    
    // Default to limit orders
    return 'limit'
  }

  private async createOrder(
    signal: TradingSignal,
    positionSize: PositionSize,
    orderType: OrderType
  ): Promise<Order> {
    const order: Order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: signal.symbol,
      side: signal.action === 'BUY' ? 'buy' : 'sell',
      type: orderType,
      amount: positionSize.quoteAmount,
      price: orderType === 'limit' ? await this.calculateLimitPrice(signal) : undefined,
      status: 'pending',
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
    
    return order
  }

  private async calculateLimitPrice(signal: TradingSignal): Promise<number> {
    if (!this.exchange) throw new Error('Exchange not connected')
    
    // Get current order book
    const orderBook = await this.exchange.fetchOrderBook(signal.symbol)
    
    if (signal.action === 'BUY') {
      // Place limit slightly above best bid for better fill probability
      const bestBid = orderBook.bids[0]?.[0] || signal.source.marketData.bid
      return bestBid * 1.0005 // 0.05% above best bid
    } else {
      // Place limit slightly below best ask
      const bestAsk = orderBook.asks[0]?.[0] || signal.source.marketData.ask
      return bestAsk * 0.9995 // 0.05% below best ask
    }
  }

  private determineTimeInForce(signal: TradingSignal, orderType: OrderType): TimeInForce {
    if (orderType === 'market') return 'IOC' // Immediate or cancel
    
    // Short timeframe signals need quick fills
    if (['1m', '5m'].includes(signal.timeframe)) {
      return 'IOC'
    }
    
    // Default to good till cancelled for longer timeframes
    return 'GTC'
  }

  private async placeOrderWithRetry(order: Order, signal: TradingSignal): Promise<ExecutionResult> {
    let retries = 0
    let lastError: Error | null = null
    
    while (retries <= this.config.maxRetries) {
      try {
        // Place order
        const exchangeOrder = await this.exchange!.createOrder(
          order.symbol,
          order.type,
          order.side,
          order.amount,
          order.price
        )
        
        // Store in active orders
        order.id = exchangeOrder.id
        order.status = exchangeOrder.status
        this.activeOrders.set(order.id, { order, signal })
        
        // Wait for fill or timeout
        const filledOrder = await this.waitForFill(order, signal)
        
        // Calculate execution metrics
        const slippage = this.calculateSlippage(
          filledOrder.average || 0,
          signal.source.marketData.price,
          order.side
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
          retries
        }
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        retries++
        
        if (retries <= this.config.maxRetries) {
          await this.delay(this.config.retryDelay * retries) // Exponential backoff
        }
      }
    }
    
    throw lastError || new Error('Max retries exceeded')
  }

  private async waitForFill(order: Order, signal: TradingSignal): Promise<Order> {
    const timeout = order.type === 'market' 
      ? this.config.orderTimeouts.market 
      : this.config.orderTimeouts.limit
    
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      const status = await this.monitorExecution(order.id)
      
      if (status.filled || status.status === 'canceled') {
        return this.activeOrders.get(order.id)?.order || order
      }
      
      // Check if we should cancel due to price movement
      if (order.type === 'limit' && await this.shouldCancelDueToPrice(order, signal)) {
        await this.cancelOrder(order.id)
        throw new Error('Order cancelled due to adverse price movement')
      }
      
      await this.delay(1000) // Check every second
    }
    
    // Timeout reached
    if (order.type === 'limit' && order.filled === 0) {
      await this.cancelOrder(order.id)
      throw new Error('Order timeout - no fills')
    }
    
    return order
  }

  private async shouldCancelDueToPrice(order: Order, signal: TradingSignal): Promise<boolean> {
    if (!this.exchange) return false
    
    const ticker = await this.exchange.fetchTicker(order.symbol)
    const currentPrice = ticker.last
    
    if (order.side === 'buy') {
      // Cancel if price has moved up beyond slippage tolerance
      const priceIncrease = (currentPrice - signal.source.marketData.price) / signal.source.marketData.price
      return priceIncrease > this.config.slippageTolerance
    } else {
      // Cancel if price has moved down beyond slippage tolerance
      const priceDecrease = (signal.source.marketData.price - currentPrice) / signal.source.marketData.price
      return priceDecrease > this.config.slippageTolerance
    }
  }

  private async handlePartialFill(order: Order, result: ExecutionResult): Promise<void> {
    if (this.config.partialFillPolicy === 'cancel') {
      // Cancel remaining
      await this.cancelOrder(order.id)
      result.status = 'partial'
    } else if (this.config.partialFillPolicy === 'complete') {
      // Try to complete with market order
      const remainingAmount = order.amount - order.filled
      const marketOrder = {
        ...order,
        type: 'market' as OrderType,
        amount: remainingAmount,
        price: undefined
      }
      
      try {
        const completionResult = await this.placeOrderWithRetry(marketOrder, {} as TradingSignal)
        
        // Combine results
        result.filledAmount += completionResult.filledAmount
        result.totalCost += completionResult.totalCost
        result.fees += completionResult.fees
        result.avgFillPrice = result.totalCost / result.filledAmount
        result.status = 'success'
      } catch (error) {
        result.errors = result.errors || []
        result.errors.push('Failed to complete partial fill')
      }
    }
  }

  private calculateSlippage(fillPrice: number, expectedPrice: number, side: 'buy' | 'sell'): number {
    if (side === 'buy') {
      return (fillPrice - expectedPrice) / expectedPrice
    } else {
      return (expectedPrice - fillPrice) / expectedPrice
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Analytics methods
  getExecutionMetrics(): ExecutionMetrics {
    if (this.executionHistory.length === 0) {
      return {
        totalOrders: 0,
        successRate: 0,
        avgSlippage: 0,
        avgExecutionTime: 0,
        partialFills: 0,
        failures: 0,
        totalFees: 0
      }
    }
    
    const successful = this.executionHistory.filter(r => r.status === 'success').length
    const partial = this.executionHistory.filter(r => r.status === 'partial').length
    const failed = this.executionHistory.filter(r => r.status === 'failed').length
    
    const totalSlippage = this.executionHistory.reduce((sum, r) => sum + Math.abs(r.slippage), 0)
    const totalExecutionTime = this.executionHistory.reduce((sum, r) => sum + r.executionTime, 0)
    const totalFees = this.executionHistory.reduce((sum, r) => sum + r.fees, 0)
    
    return {
      totalOrders: this.executionHistory.length,
      successRate: successful / this.executionHistory.length,
      avgSlippage: totalSlippage / this.executionHistory.length,
      avgExecutionTime: totalExecutionTime / this.executionHistory.length,
      partialFills: partial,
      failures: failed,
      totalFees
    }
  }

  getRecentExecutions(limit: number = 10): ExecutionResult[] {
    return this.executionHistory.slice(-limit)
  }

  clearHistory(): void {
    this.executionHistory = []
  }
}

// Export singleton instance
export const executionManager = new ExecutionManager()