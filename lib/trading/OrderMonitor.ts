import { EventEmitter } from 'events'
import { KrakenService } from '@/services/KrakenService'

interface OrderStatus {
  txid: string
  symbol: string
  side: 'buy' | 'sell'
  type: string
  amount: number
  price?: number
  status: string
  filledAmount?: number
  averagePrice?: number
  lastUpdate: number
  fills: OrderFill[]
}

interface OrderFill {
  txid: string
  ordertxid: string
  pair: string
  time: number
  type: 'buy' | 'sell'
  ordertype: string
  price: number
  cost: number
  fee: number
  vol: number
  margin?: number
  misc?: string
  trade_id?: string
}

interface MonitorConfig {
  pollInterval: number // milliseconds
  maxRetries: number
  enableNotifications: boolean
}

export class OrderMonitor extends EventEmitter {
  private krakenService: KrakenService
  private monitoredOrders: Map<string, OrderStatus> = new Map()
  private config: MonitorConfig
  private isRunning: boolean = false
  private intervalId: NodeJS.Timeout | null = null

  constructor(config: Partial<MonitorConfig> = {}) {
    super()
    this.krakenService = new KrakenService()
    this.config = {
      pollInterval: 5000, // 5 seconds
      maxRetries: 3,
      enableNotifications: true,
      ...config
    }
  }

  startMonitoring(): void {
    if (this.isRunning) {
      console.log('Order monitor is already running')
      return
    }

    this.isRunning = true
    this.intervalId = setInterval(() => {
      this.checkOrderUpdates()
    }, this.config.pollInterval)

    console.log(`Order monitor started with ${this.config.pollInterval}ms interval`)
    this.emit('monitor_started')
  }

  stopMonitoring(): void {
    if (!this.isRunning) {
      console.log('Order monitor is not running')
      return
    }

    this.isRunning = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    console.log('Order monitor stopped')
    this.emit('monitor_stopped')
  }

  addOrder(txid: string, orderData: {
    symbol: string
    side: 'buy' | 'sell'
    type: string
    amount: number
    price?: number
  }): void {
    const orderStatus: OrderStatus = {
      txid,
      symbol: orderData.symbol,
      side: orderData.side,
      type: orderData.type,
      amount: orderData.amount,
      price: orderData.price,
      status: 'pending',
      lastUpdate: Date.now(),
      fills: []
    }

    this.monitoredOrders.set(txid, orderStatus)
    console.log(`Added order ${txid} to monitoring`)
    
    // Immediately check status
    this.checkSingleOrder(txid)
  }

  removeOrder(txid: string): boolean {
    const removed = this.monitoredOrders.delete(txid)
    if (removed) {
      console.log(`Removed order ${txid} from monitoring`)
      this.emit('order_removed', txid)
    }
    return removed
  }

  getOrderStatus(txid: string): OrderStatus | null {
    return this.monitoredOrders.get(txid) || null
  }

  getAllOrders(): OrderStatus[] {
    return Array.from(this.monitoredOrders.values())
  }

  getActiveOrders(): OrderStatus[] {
    return Array.from(this.monitoredOrders.values())
      .filter(order => ['pending', 'open', 'partial'].includes(order.status))
  }

  private async checkOrderUpdates(): Promise<void> {
    if (this.monitoredOrders.size === 0) return

    try {
      // Get all monitored order IDs
      const txids = Array.from(this.monitoredOrders.keys())
      
      // Query orders in batches to avoid API limits
      const batchSize = 20
      for (let i = 0; i < txids.length; i += batchSize) {
        const batch = txids.slice(i, i + batchSize)
        await this.checkOrderBatch(batch)
      }

    } catch (error) {
      console.error('Error checking order updates:', error)
      this.emit('monitor_error', error)
    }
  }

  private async checkOrderBatch(txids: string[]): Promise<void> {
    try {
      // Query order information
      const orderInfo = await this.krakenService.queryOrders(txids, true)
      
      // Query trade history for fills
      const tradeHistory = await this.krakenService.getTradesHistory({
        type: 'all',
        trades: true
      })

      for (const txid of txids) {
        const krakenOrder = orderInfo[txid]
        const monitoredOrder = this.monitoredOrders.get(txid)
        
        if (krakenOrder && monitoredOrder) {
          this.updateOrderStatus(monitoredOrder, krakenOrder, tradeHistory.trades)
        }
      }

    } catch (error) {
      console.error('Error checking order batch:', error)
      this.emit('batch_error', { txids, error })
    }
  }

  private async checkSingleOrder(txid: string): Promise<void> {
    try {
      const orderInfo = await this.krakenService.queryOrders([txid], true)
      const tradeHistory = await this.krakenService.getTradesHistory({
        type: 'all',
        trades: true
      })

      const krakenOrder = orderInfo[txid]
      const monitoredOrder = this.monitoredOrders.get(txid)

      if (krakenOrder && monitoredOrder) {
        this.updateOrderStatus(monitoredOrder, krakenOrder, tradeHistory.trades)
      }

    } catch (error) {
      console.error(`Error checking single order ${txid}:`, error)
      this.emit('order_error', { txid, error })
    }
  }

  private updateOrderStatus(
    monitoredOrder: OrderStatus, 
    krakenOrder: any, 
    tradeHistory: any
  ): void {
    const previousStatus = monitoredOrder.status
    const newStatus = krakenOrder.status
    
    // Update basic order information
    monitoredOrder.status = newStatus
    monitoredOrder.filledAmount = parseFloat(krakenOrder.vol_exec || '0')
    monitoredOrder.averagePrice = parseFloat(krakenOrder.price || '0')
    monitoredOrder.lastUpdate = Date.now()

    // Check for fills
    const newFills = this.extractOrderFills(monitoredOrder.txid, tradeHistory)
    const previousFillCount = monitoredOrder.fills.length
    
    if (newFills.length > previousFillCount) {
      // New fills detected
      const latestFills = newFills.slice(previousFillCount)
      monitoredOrder.fills = newFills
      
      for (const fill of latestFills) {
        this.emit('order_fill', {
          order: monitoredOrder,
          fill,
          isPartial: monitoredOrder.status === 'partial'
        })
        
        console.log(`Order ${monitoredOrder.txid} filled: ${fill.vol} at $${fill.price}`)
      }
    }

    // Emit status change events
    if (previousStatus !== newStatus) {
      this.emit('status_change', {
        txid: monitoredOrder.txid,
        previousStatus,
        newStatus,
        order: monitoredOrder
      })

      console.log(`Order ${monitoredOrder.txid} status: ${previousStatus} -> ${newStatus}`)

      // Emit specific status events
      switch (newStatus) {
        case 'closed':
          this.emit('order_completed', monitoredOrder)
          // Remove completed orders after a delay
          setTimeout(() => this.removeOrder(monitoredOrder.txid), 30000)
          break
        case 'canceled':
          this.emit('order_cancelled', monitoredOrder)
          setTimeout(() => this.removeOrder(monitoredOrder.txid), 10000)
          break
        case 'expired':
          this.emit('order_expired', monitoredOrder)
          setTimeout(() => this.removeOrder(monitoredOrder.txid), 10000)
          break
      }
    }

    // Send notifications if enabled
    if (this.config.enableNotifications) {
      this.sendNotification(monitoredOrder, previousStatus, newStatus)
    }
  }

  private extractOrderFills(ordertxid: string, tradeHistory: any): OrderFill[] {
    const fills: OrderFill[] = []
    
    if (tradeHistory && tradeHistory.trades) {
      for (const [txid, trade] of Object.entries(tradeHistory.trades)) {
        const tradeData = trade as any
        
        if (tradeData.ordertxid === ordertxid) {
          fills.push({
            txid,
            ordertxid: tradeData.ordertxid,
            pair: tradeData.pair,
            time: tradeData.time,
            type: tradeData.type,
            ordertype: tradeData.ordertype,
            price: parseFloat(tradeData.price),
            cost: parseFloat(tradeData.cost),
            fee: parseFloat(tradeData.fee),
            vol: parseFloat(tradeData.vol),
            margin: tradeData.margin ? parseFloat(tradeData.margin) : undefined,
            misc: tradeData.misc,
            trade_id: tradeData.trade_id
          })
        }
      }
    }
    
    // Sort fills by time
    return fills.sort((a, b) => a.time - b.time)
  }

  private sendNotification(order: OrderStatus, previousStatus: string, newStatus: string): void {
    // This could be extended to send email, push notifications, etc.
    const notification = {
      type: 'order_update',
      orderId: order.txid,
      symbol: order.symbol,
      side: order.side,
      amount: order.amount,
      previousStatus,
      newStatus,
      timestamp: Date.now()
    }

    this.emit('notification', notification)
  }

  // Utility methods
  isMonitoring(): boolean {
    return this.isRunning
  }

  getMonitoredOrderCount(): number {
    return this.monitoredOrders.size
  }

  getActiveOrderCount(): number {
    return this.getActiveOrders().length
  }

  updateConfig(newConfig: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Restart monitoring with new interval if it's running
    if (this.isRunning && newConfig.pollInterval) {
      this.stopMonitoring()
      this.startMonitoring()
    }
  }

  // Clear all monitored orders
  clearAll(): void {
    const count = this.monitoredOrders.size
    this.monitoredOrders.clear()
    console.log(`Cleared ${count} monitored orders`)
    this.emit('cleared', count)
  }
}