import { EventEmitter } from 'events'

interface PaperOrder {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit' | 'stop-loss'
  amount: number
  price?: number
  stopPrice?: number
  status: 'pending' | 'filled' | 'cancelled' | 'rejected'
  createdAt: number
  filledAt?: number
  filledPrice?: number
  filledAmount?: number
  remainingAmount: number
}

interface PaperPosition {
  symbol: string
  side: 'long' | 'short'
  amount: number
  averagePrice: number
  currentPrice: number
  unrealizedPnL: number
  realizedPnL: number
  openedAt: number
}

interface PaperBalance {
  currency: string
  available: number
  locked: number
  total: number
}

interface MarketData {
  symbol: string
  price: number
  bid: number
  ask: number
  timestamp: number
}

export class PaperTradingEngine extends EventEmitter {
  private orders: Map<string, PaperOrder> = new Map()
  private positions: Map<string, PaperPosition> = new Map()
  private balances: Map<string, PaperBalance> = new Map()
  private marketData: Map<string, MarketData> = new Map()
  private isEnabled: boolean = false
  private slippagePercent: number = 0.05 // 0.05% slippage simulation
  private latencyMs: number = 100 // 100ms execution latency simulation

  constructor(initialBalance: number = 100000) {
    super()
    this.initializeBalances(initialBalance)
  }

  private initializeBalances(usdBalance: number): void {
    this.balances.set('USD', {
      currency: 'USD',
      available: usdBalance,
      locked: 0,
      total: usdBalance
    })

    // Initialize common crypto balances
    const cryptos = ['BTC', 'ETH', 'ADA', 'DOT', 'LINK', 'XRP']
    cryptos.forEach(crypto => {
      this.balances.set(crypto, {
        currency: crypto,
        available: 0,
        locked: 0,
        total: 0
      })
    })
  }

  enablePaperTrading(): void {
    this.isEnabled = true
    this.emit('paper_trading_enabled')
    console.log('Paper trading mode enabled')
  }

  disablePaperTrading(): void {
    this.isEnabled = false
    this.emit('paper_trading_disabled')
    console.log('Paper trading mode disabled')
  }

  isPaperTradingEnabled(): boolean {
    return this.isEnabled
  }

  updateMarketData(symbol: string, data: MarketData): void {
    this.marketData.set(symbol, data)
    this.processOrdersForSymbol(symbol)
    this.updatePositionsForSymbol(symbol)
  }

  async placeOrder(orderRequest: {
    symbol: string
    side: 'buy' | 'sell'
    type: 'market' | 'limit' | 'stop-loss'
    amount: number
    price?: number
    stopPrice?: number
  }): Promise<{ success: boolean; orderId?: string; error?: string }> {
    
    if (!this.isEnabled) {
      return { success: false, error: 'Paper trading is not enabled' }
    }

    try {
      const orderId = this.generateOrderId()
      const marketData = this.marketData.get(orderRequest.symbol)

      if (!marketData) {
        return { success: false, error: 'No market data available for symbol' }
      }

      // Validate balance
      const hasBalance = this.validateBalance(orderRequest)
      if (!hasBalance) {
        return { success: false, error: 'Insufficient balance' }
      }

      const order: PaperOrder = {
        id: orderId,
        symbol: orderRequest.symbol,
        side: orderRequest.side,
        type: orderRequest.type,
        amount: orderRequest.amount,
        price: orderRequest.price,
        stopPrice: orderRequest.stopPrice,
        status: 'pending',
        createdAt: Date.now(),
        remainingAmount: orderRequest.amount
      }

      this.orders.set(orderId, order)

      // Lock funds for the order
      this.lockFundsForOrder(order)

      // Simulate execution latency
      setTimeout(() => {
        this.processOrder(orderId)
      }, this.latencyMs)

      this.emit('order_placed', order)
      return { success: true, orderId }

    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    const order = this.orders.get(orderId)
    
    if (!order) {
      return { success: false, error: 'Order not found' }
    }

    if (order.status === 'filled') {
      return { success: false, error: 'Cannot cancel filled order' }
    }

    if (order.status === 'cancelled') {
      return { success: false, error: 'Order already cancelled' }
    }

    order.status = 'cancelled'
    this.unlockFundsForOrder(order)
    
    this.emit('order_cancelled', order)
    return { success: true }
  }

  private processOrder(orderId: string): void {
    const order = this.orders.get(orderId)
    if (!order || order.status !== 'pending') return

    const marketData = this.marketData.get(order.symbol)
    if (!marketData) {
      order.status = 'rejected'
      this.emit('order_rejected', order)
      return
    }

    let executionPrice: number

    switch (order.type) {
      case 'market':
        executionPrice = order.side === 'buy' ? marketData.ask : marketData.bid
        executionPrice = this.applySlippage(executionPrice, order.side)
        this.executeOrder(order, executionPrice)
        break

      case 'limit':
        if (order.price) {
          const canExecute = order.side === 'buy' 
            ? marketData.ask <= order.price
            : marketData.bid >= order.price
          
          if (canExecute) {
            executionPrice = order.price
            this.executeOrder(order, executionPrice)
          }
        }
        break

      case 'stop-loss':
        if (order.stopPrice) {
          const shouldTrigger = order.side === 'buy'
            ? marketData.ask >= order.stopPrice
            : marketData.bid <= order.stopPrice
          
          if (shouldTrigger) {
            executionPrice = order.side === 'buy' ? marketData.ask : marketData.bid
            executionPrice = this.applySlippage(executionPrice, order.side)
            this.executeOrder(order, executionPrice)
          }
        }
        break
    }
  }

  private executeOrder(order: PaperOrder, executionPrice: number): void {
    order.status = 'filled'
    order.filledAt = Date.now()
    order.filledPrice = executionPrice
    order.filledAmount = order.amount
    order.remainingAmount = 0

    // Update balances
    this.updateBalancesAfterExecution(order, executionPrice)

    // Update positions
    this.updatePositions(order, executionPrice)

    this.emit('order_filled', order)
    console.log(`Paper order filled: ${order.side} ${order.amount} ${order.symbol} at $${executionPrice}`)
  }

  private applySlippage(price: number, side: 'buy' | 'sell'): number {
    const slippage = price * (this.slippagePercent / 100)
    return side === 'buy' ? price + slippage : price - slippage
  }

  private validateBalance(orderRequest: any): boolean {
    if (orderRequest.side === 'buy') {
      // Check USD balance for buy orders
      const usdBalance = this.balances.get('USD')
      if (!usdBalance) return false

      const marketData = this.marketData.get(orderRequest.symbol)
      if (!marketData) return false

      const requiredAmount = orderRequest.type === 'market' 
        ? orderRequest.amount * marketData.ask
        : orderRequest.amount * (orderRequest.price || marketData.ask)

      return usdBalance.available >= requiredAmount
    } else {
      // Check crypto balance for sell orders
      const [base] = orderRequest.symbol.split('/')
      const cryptoBalance = this.balances.get(base)
      if (!cryptoBalance) return false

      return cryptoBalance.available >= orderRequest.amount
    }
  }

  private lockFundsForOrder(order: PaperOrder): void {
    if (order.side === 'buy') {
      const usdBalance = this.balances.get('USD')!
      const marketData = this.marketData.get(order.symbol)!
      
      const lockAmount = order.type === 'market'
        ? order.amount * marketData.ask
        : order.amount * (order.price || marketData.ask)

      usdBalance.available -= lockAmount
      usdBalance.locked += lockAmount
    } else {
      const [base] = order.symbol.split('/')
      const cryptoBalance = this.balances.get(base)!
      
      cryptoBalance.available -= order.amount
      cryptoBalance.locked += order.amount
    }
  }

  private unlockFundsForOrder(order: PaperOrder): void {
    if (order.side === 'buy') {
      const usdBalance = this.balances.get('USD')!
      const marketData = this.marketData.get(order.symbol)!
      
      const lockAmount = order.type === 'market'
        ? order.amount * marketData.ask
        : order.amount * (order.price || marketData.ask)

      usdBalance.available += lockAmount
      usdBalance.locked -= lockAmount
    } else {
      const [base] = order.symbol.split('/')
      const cryptoBalance = this.balances.get(base)!
      
      cryptoBalance.available += order.amount
      cryptoBalance.locked -= order.amount
    }
  }

  private updateBalancesAfterExecution(order: PaperOrder, executionPrice: number): void {
    const [base, quote] = order.symbol.split('/')
    const cost = order.amount * executionPrice

    if (order.side === 'buy') {
      // Deduct USD, add crypto
      const usdBalance = this.balances.get(quote)!
      const cryptoBalance = this.balances.get(base)!

      usdBalance.locked -= cost
      usdBalance.total -= cost
      
      cryptoBalance.available += order.amount
      cryptoBalance.total += order.amount
    } else {
      // Deduct crypto, add USD
      const usdBalance = this.balances.get(quote)!
      const cryptoBalance = this.balances.get(base)!

      cryptoBalance.locked -= order.amount
      cryptoBalance.total -= order.amount
      
      usdBalance.available += cost
      usdBalance.total += cost
    }
  }

  private updatePositions(order: PaperOrder, executionPrice: number): void {
    const positionKey = `${order.symbol}_${order.side === 'buy' ? 'long' : 'short'}`
    let position = this.positions.get(positionKey)

    if (!position) {
      position = {
        symbol: order.symbol,
        side: order.side === 'buy' ? 'long' : 'short',
        amount: order.amount,
        averagePrice: executionPrice,
        currentPrice: executionPrice,
        unrealizedPnL: 0,
        realizedPnL: 0,
        openedAt: Date.now()
      }
    } else {
      // Update average price
      const totalCost = (position.amount * position.averagePrice) + (order.amount * executionPrice)
      position.amount += order.amount
      position.averagePrice = totalCost / position.amount
    }

    this.positions.set(positionKey, position)
    this.emit('position_updated', position)
  }

  private processOrdersForSymbol(symbol: string): void {
    for (const [orderId, order] of this.orders.entries()) {
      if (order.symbol === symbol && order.status === 'pending') {
        this.processOrder(orderId)
      }
    }
  }

  private updatePositionsForSymbol(symbol: string): void {
    const marketData = this.marketData.get(symbol)
    if (!marketData) return

    for (const [key, position] of this.positions.entries()) {
      if (position.symbol === symbol) {
        position.currentPrice = marketData.price
        
        // Calculate unrealized PnL
        const priceDiff = position.currentPrice - position.averagePrice
        position.unrealizedPnL = position.side === 'long' 
          ? priceDiff * position.amount
          : -priceDiff * position.amount

        this.emit('position_updated', position)
      }
    }
  }

  private generateOrderId(): string {
    return `paper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Public getters
  getOrders(): PaperOrder[] {
    return Array.from(this.orders.values())
  }

  getOpenOrders(): PaperOrder[] {
    return Array.from(this.orders.values()).filter(order => order.status === 'pending')
  }

  getPositions(): PaperPosition[] {
    return Array.from(this.positions.values()).filter(pos => pos.amount > 0)
  }

  getBalances(): PaperBalance[] {
    return Array.from(this.balances.values())
  }

  getBalance(currency: string): PaperBalance | undefined {
    return this.balances.get(currency)
  }

  getTotalPortfolioValue(): number {
    let totalValue = this.balances.get('USD')?.total || 0

    // Add crypto values at current market prices
    for (const [currency, balance] of this.balances.entries()) {
      if (currency !== 'USD' && balance.total > 0) {
        const marketData = this.marketData.get(`${currency}/USD`)
        if (marketData) {
          totalValue += balance.total * marketData.price
        }
      }
    }

    return totalValue
  }

  reset(initialBalance: number = 100000): void {
    this.orders.clear()
    this.positions.clear()
    this.balances.clear()
    this.initializeBalances(initialBalance)
    this.emit('reset')
    console.log('Paper trading engine reset')
  }
}