/**
 * Real-time Price Feed Manager for Kraken
 * Manages WebSocket connections and distributes live price updates
 */

import { EventEmitter } from 'events'
import { KrakenWebSocket, TickerData } from './websocket'

export interface PriceUpdate {
  symbol: string
  price: number
  bid: number
  ask: number
  volume24h: number
  high24h: number
  low24h: number
  change24h: number
  changePercent24h: number
  timestamp: number
}

export interface PriceFeedOptions {
  symbols: string[]
  reconnectOnError?: boolean
  maxReconnectAttempts?: number
}

export class PriceFeedManager extends EventEmitter {
  private ws: KrakenWebSocket
  private symbols: Set<string> = new Set()
  private lastPrices: Map<string, PriceUpdate> = new Map()
  private isRunning: boolean = false
  private updateInterval: NodeJS.Timeout | null = null
  private priceHistory: Map<string, number[]> = new Map() // Store last 100 prices for sparklines

  constructor() {
    super()
    this.ws = new KrakenWebSocket()
    this.setupWebSocketHandlers()
  }

  private setupWebSocketHandlers(): void {
    this.ws.on('connected', () => {
      console.log('Price feed WebSocket connected')
      this.emit('connected')
      
      // Subscribe to all tracked symbols
      if (this.symbols.size > 0) {
        this.subscribeToSymbols(Array.from(this.symbols))
      }
    })

    this.ws.on('disconnected', () => {
      console.log('Price feed WebSocket disconnected')
      this.emit('disconnected')
    })

    this.ws.on('error', (error) => {
      console.error('Price feed error:', error)
      this.emit('error', error)
    })

    this.ws.on('ticker', ({ pair, data }: { pair: string; data: TickerData }) => {
      this.handleTickerUpdate(pair, data)
    })

    this.ws.on('systemStatus', (data) => {
      console.log('Kraken system status:', data)
      this.emit('systemStatus', data)
    })

    this.ws.on('subscriptionStatus', (data) => {
      console.log('Subscription status:', data)
      if (data.status === 'subscribed') {
        this.emit('subscribed', data.pair)
      } else if (data.status === 'error') {
        this.emit('subscriptionError', data)
      }
    })
  }

  private handleTickerUpdate(pair: string, data: TickerData): void {
    // Convert Kraken pair format (e.g., "XBT/USD") to standard format (e.g., "BTC/USD")
    const symbol = this.normalizeSymbol(pair)
    
    const price = parseFloat(data.close[0])
    const bid = parseFloat(data.bid[0])
    const ask = parseFloat(data.ask[0])
    const volume24h = parseFloat(data.volume[1]) // 24h volume
    const high24h = parseFloat(data.high[1]) // 24h high
    const low24h = parseFloat(data.low[1]) // 24h low
    const open24h = parseFloat(data.open[1]) // 24h open
    
    const change24h = price - open24h
    const changePercent24h = open24h > 0 ? (change24h / open24h) * 100 : 0

    const update: PriceUpdate = {
      symbol,
      price,
      bid,
      ask,
      volume24h,
      high24h,
      low24h,
      change24h,
      changePercent24h,
      timestamp: Date.now()
    }

    // Store in last prices
    this.lastPrices.set(symbol, update)

    // Update price history for sparklines
    this.updatePriceHistory(symbol, price)

    // Emit the update
    this.emit('priceUpdate', update)
    this.emit(`price:${symbol}`, update)
  }

  private updatePriceHistory(symbol: string, price: number): void {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, [])
    }
    
    const history = this.priceHistory.get(symbol)!
    history.push(price)
    
    // Keep only last 100 prices
    if (history.length > 100) {
      history.shift()
    }
  }

  private normalizeSymbol(krakenPair: string): string {
    // Kraken uses XBT for Bitcoin instead of BTC
    const conversions: Record<string, string> = {
      'XBT': 'BTC',
      'XDG': 'DOGE'
    }

    const [base, quote] = krakenPair.split('/')
    const normalizedBase = conversions[base] || base
    return `${normalizedBase}/${quote}`
  }

  private denormalizeSymbol(symbol: string): string {
    // Convert standard symbols back to Kraken format
    const conversions: Record<string, string> = {
      'BTC': 'XBT',
      'DOGE': 'XDG'
    }

    const [base, quote] = symbol.split('/')
    const krakenBase = conversions[base] || base
    return `${krakenBase}/${quote}`
  }

  /**
   * Start the price feed with specified symbols
   */
  async start(symbols: string[]): Promise<void> {
    if (this.isRunning) {
      console.log('Price feed already running')
      return
    }

    this.isRunning = true
    symbols.forEach(symbol => this.symbols.add(symbol))

    // Connect WebSocket
    this.ws.connect()

    // Start periodic stats emission
    this.startStatsEmitter()
  }

  /**
   * Add symbols to the price feed
   */
  addSymbols(symbols: string[]): void {
    const newSymbols = symbols.filter(s => !this.symbols.has(s))
    if (newSymbols.length === 0) return

    newSymbols.forEach(symbol => this.symbols.add(symbol))
    
    if (this.ws.isConnected()) {
      this.subscribeToSymbols(newSymbols)
    }
  }

  /**
   * Remove symbols from the price feed
   */
  removeSymbols(symbols: string[]): void {
    const symbolsToRemove = symbols.filter(s => this.symbols.has(s))
    if (symbolsToRemove.length === 0) return

    symbolsToRemove.forEach(symbol => {
      this.symbols.delete(symbol)
      this.lastPrices.delete(symbol)
      this.priceHistory.delete(symbol)
    })

    if (this.ws.isConnected()) {
      this.unsubscribeFromSymbols(symbolsToRemove)
    }
  }

  private subscribeToSymbols(symbols: string[]): void {
    // Convert to Kraken format and subscribe
    const krakenPairs = symbols.map(s => this.denormalizeSymbol(s))
    this.ws.subscribe('ticker', krakenPairs)
  }

  private unsubscribeFromSymbols(symbols: string[]): void {
    // Convert to Kraken format and unsubscribe
    const krakenPairs = symbols.map(s => this.denormalizeSymbol(s))
    this.ws.unsubscribe('ticker', krakenPairs)
  }

  /**
   * Get the latest price for a symbol
   */
  getLatestPrice(symbol: string): PriceUpdate | null {
    return this.lastPrices.get(symbol) || null
  }

  /**
   * Get all latest prices
   */
  getAllPrices(): Map<string, PriceUpdate> {
    return new Map(this.lastPrices)
  }

  /**
   * Get price history for sparklines
   */
  getPriceHistory(symbol: string): number[] {
    return this.priceHistory.get(symbol) || []
  }

  /**
   * Start emitting aggregated stats periodically
   */
  private startStatsEmitter(): void {
    this.updateInterval = setInterval(() => {
      const stats = {
        connectedSymbols: this.symbols.size,
        lastUpdateCount: this.lastPrices.size,
        prices: Array.from(this.lastPrices.entries()).map(([symbol, data]) => ({
          symbol,
          price: data.price,
          change24h: data.changePercent24h,
          volume24h: data.volume24h,
          sparkline: this.getPriceHistory(symbol).slice(-20) // Last 20 prices
        }))
      }
      
      this.emit('stats', stats)
    }, 1000) // Emit stats every second
  }

  /**
   * Stop the price feed
   */
  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }

    this.ws.disconnect()
    this.symbols.clear()
    this.lastPrices.clear()
    this.priceHistory.clear()
  }

  /**
   * Check if price feed is running
   */
  isActive(): boolean {
    return this.isRunning && this.ws.isConnected()
  }
}

// Singleton instance for global price feed
let priceFeedInstance: PriceFeedManager | null = null

export function getPriceFeedManager(): PriceFeedManager {
  if (!priceFeedInstance) {
    priceFeedInstance = new PriceFeedManager()
  }
  return priceFeedInstance
}