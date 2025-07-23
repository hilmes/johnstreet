import ccxt from 'ccxt'
import { EventEmitter } from 'events'

export interface ExchangeConfig {
  apiKey?: string
  secret?: string
  password?: string
  sandbox?: boolean
  enableRateLimit?: boolean
}

export interface OrderBookData {
  bids: [number, number][]
  asks: [number, number][]
  timestamp: number
  datetime: string
  nonce?: number
}

export interface TickerData {
  symbol: string
  timestamp: number
  datetime: string
  high: number
  low: number
  bid: number
  ask: number
  last: number
  close: number
  baseVolume: number
  quoteVolume: number
  change: number
  percentage: number
  average: number
}

export interface TradeData {
  id: string
  timestamp: number
  datetime: string
  symbol: string
  side: 'buy' | 'sell'
  amount: number
  price: number
  cost: number
  fee?: {
    cost: number
    currency: string
  }
}

export interface OHLCVData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export class UnifiedExchange extends EventEmitter {
  private exchange: ccxt.Exchange
  private exchangeName: string
  private isConnected: boolean = false
  private rateLimitDelay: number = 1000

  constructor(exchangeName: string, config: ExchangeConfig = {}) {
    super()
    this.exchangeName = exchangeName.toLowerCase()
    
    // Create exchange instance
    const ExchangeClass = ccxt[this.exchangeName as keyof typeof ccxt] as new (config: any) => ccxt.Exchange
    
    if (!ExchangeClass) {
      throw new Error(`Exchange ${exchangeName} is not supported by ccxt`)
    }

    this.exchange = new ExchangeClass({
      apiKey: config.apiKey,
      secret: config.secret,
      password: config.password,
      sandbox: config.sandbox || false,
      enableRateLimit: config.enableRateLimit !== false,
      timeout: 30000,
      ...config
    })

    this.rateLimitDelay = this.exchange.rateLimit || 1000
  }

  async connect(): Promise<void> {
    try {
      // Test connection by fetching markets
      await this.exchange.loadMarkets()
      this.isConnected = true
      this.emit('connected', this.exchangeName)
      console.log(`Connected to ${this.exchangeName}`)
    } catch (error) {
      this.isConnected = false
      this.emit('error', error)
      throw new Error(`Failed to connect to ${this.exchangeName}: ${error}`)
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false
    this.emit('disconnected', this.exchangeName)
  }

  getExchangeInfo(): any {
    return {
      name: this.exchange.name,
      countries: this.exchange.countries,
      urls: this.exchange.urls,
      version: this.exchange.version,
      certified: this.exchange.certified,
      has: this.exchange.has,
      timeframes: this.exchange.timeframes,
      markets: Object.keys(this.exchange.markets || {}),
      currencies: Object.keys(this.exchange.currencies || {})
    }
  }

  async getMarkets(): Promise<any> {
    if (!this.isConnected) await this.connect()
    return this.exchange.markets
  }

  async getTicker(symbol: string): Promise<TickerData> {
    if (!this.isConnected) await this.connect()
    
    try {
      const ticker = await this.exchange.fetchTicker(symbol)
      return {
        symbol: ticker.symbol,
        timestamp: ticker.timestamp || Date.now(),
        datetime: ticker.datetime || new Date().toISOString(),
        high: ticker.high || 0,
        low: ticker.low || 0,
        bid: ticker.bid || 0,
        ask: ticker.ask || 0,
        last: ticker.last || 0,
        close: ticker.close || 0,
        baseVolume: ticker.baseVolume || 0,
        quoteVolume: ticker.quoteVolume || 0,
        change: ticker.change || 0,
        percentage: ticker.percentage || 0,
        average: ticker.average || 0
      }
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  async getOrderBook(symbol: string, limit: number = 100): Promise<OrderBookData> {
    if (!this.isConnected) await this.connect()
    
    try {
      const orderbook = await this.exchange.fetchOrderBook(symbol, limit)
      return {
        bids: orderbook.bids.map(([price, amount]) => [price, amount]),
        asks: orderbook.asks.map(([price, amount]) => [price, amount]),
        timestamp: orderbook.timestamp || Date.now(),
        datetime: orderbook.datetime || new Date().toISOString(),
        nonce: orderbook.nonce
      }
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  async getTrades(symbol: string, limit: number = 100): Promise<TradeData[]> {
    if (!this.isConnected) await this.connect()
    
    try {
      const trades = await this.exchange.fetchTrades(symbol, undefined, limit)
      return trades.map(trade => ({
        id: trade.id || '',
        timestamp: trade.timestamp || Date.now(),
        datetime: trade.datetime || new Date().toISOString(),
        symbol: trade.symbol,
        side: trade.side as 'buy' | 'sell',
        amount: trade.amount,
        price: trade.price,
        cost: trade.cost,
        fee: trade.fee ? {
          cost: trade.fee.cost,
          currency: trade.fee.currency
        } : undefined
      }))
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  async getOHLCV(symbol: string, timeframe: string = '1m', limit: number = 100): Promise<OHLCVData[]> {
    if (!this.isConnected) await this.connect()
    
    try {
      const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, undefined, limit)
      return ohlcv.map(([timestamp, open, high, low, close, volume]) => ({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      }))
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  async getBalance(): Promise<any> {
    if (!this.isConnected) await this.connect()
    
    try {
      return await this.exchange.fetchBalance()
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  async createOrder(symbol: string, type: string, side: string, amount: number, price?: number, params?: any): Promise<any> {
    if (!this.isConnected) await this.connect()
    
    try {
      return await this.exchange.createOrder(symbol, type, side, amount, price, params)
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  async cancelOrder(id: string, symbol?: string): Promise<any> {
    if (!this.isConnected) await this.connect()
    
    try {
      return await this.exchange.cancelOrder(id, symbol)
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  async getOpenOrders(symbol?: string): Promise<any[]> {
    if (!this.isConnected) await this.connect()
    
    try {
      return await this.exchange.fetchOpenOrders(symbol)
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  async getOrderHistory(symbol?: string, limit?: number): Promise<any[]> {
    if (!this.isConnected) await this.connect()
    
    try {
      return await this.exchange.fetchOrders(symbol, undefined, limit)
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  // Pump and dump detection helpers
  async detectVolumeSpike(symbol: string, timeframe: string = '1m', lookback: number = 100): Promise<{
    currentVolume: number
    averageVolume: number
    volumeSpike: number
    isSpike: boolean
  }> {
    const ohlcv = await this.getOHLCV(symbol, timeframe, lookback)
    
    if (ohlcv.length < 2) {
      throw new Error('Insufficient data for volume spike detection')
    }

    const volumes = ohlcv.map(bar => bar.volume)
    const currentVolume = volumes[volumes.length - 1]
    const historicalVolumes = volumes.slice(0, -1)
    const averageVolume = historicalVolumes.reduce((sum, vol) => sum + vol, 0) / historicalVolumes.length
    
    const volumeSpike = currentVolume / averageVolume
    const isSpike = volumeSpike > 3.0 // 3x normal volume

    return {
      currentVolume,
      averageVolume,
      volumeSpike,
      isSpike
    }
  }

  async detectPriceAnomaly(symbol: string, timeframe: string = '1m', lookback: number = 100): Promise<{
    currentPrice: number
    priceChange: number
    percentChange: number
    volatility: number
    isAnomaly: boolean
  }> {
    const ohlcv = await this.getOHLCV(symbol, timeframe, lookback)
    
    if (ohlcv.length < 2) {
      throw new Error('Insufficient data for price anomaly detection')
    }

    const prices = ohlcv.map(bar => bar.close)
    const currentPrice = prices[prices.length - 1]
    const previousPrice = prices[prices.length - 2]
    
    const priceChange = currentPrice - previousPrice
    const percentChange = (priceChange / previousPrice) * 100
    
    // Calculate volatility (standard deviation of returns)
    const returns = prices.slice(1).map((price, i) => (price - prices[i]) / prices[i])
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
    const volatility = Math.sqrt(variance) * 100

    // Anomaly detection: price change > 3 standard deviations
    const isAnomaly = Math.abs(percentChange) > (volatility * 3)

    return {
      currentPrice,
      priceChange,
      percentChange,
      volatility,
      isAnomaly
    }
  }

  // Rate limiting helper
  async rateLimit(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.rateLimitDelay))
  }

  isExchangeConnected(): boolean {
    return this.isConnected
  }

  getExchangeName(): string {
    return this.exchangeName
  }
}