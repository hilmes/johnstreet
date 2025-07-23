import { EventEmitter } from 'events'

// Handle both browser and Node.js environments
const WebSocketImpl = typeof WebSocket !== 'undefined' ? WebSocket : require('ws').WebSocket

export interface KrakenWebSocketMessage {
  channelID?: number
  channelName?: string
  event?: string
  pair?: string
  status?: string
  subscription?: {
    name: string
  }
  errorMessage?: string
}

export interface TickerData {
  ask: [string, string, string]
  bid: [string, string, string]
  close: [string, string]
  volume: [string, string]
  high: [string, string]
  low: [string, string]
  open: [string, string]
}

export interface OrderBookData {
  asks: Array<[string, string, string]>
  bids: Array<[string, string, string]>
}

export interface TradeData {
  price: string
  volume: string
  time: string
  side: string
  orderType: string
  misc: string
}

export class KrakenWebSocket extends EventEmitter {
  private ws: any | null = null
  private url: string
  private reconnectInterval: number = 5000
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 10
  private isConnecting: boolean = false
  private subscriptions: Set<string> = new Set()
  private pingInterval: NodeJS.Timeout | null = null

  constructor(url: string = 'wss://ws.kraken.com') {
    super()
    this.url = url
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocketImpl.CONNECTING || this.ws.readyState === WebSocketImpl.OPEN)) {
      console.log('WebSocket already connected or connecting')
      return
    }

    if (this.isConnecting) {
      console.log('Connection already in progress')
      return
    }

    this.isConnecting = true
    this.ws = new WebSocketImpl(this.url)

    this.ws.onopen = () => {
      console.log('Kraken WebSocket connected')
      this.isConnecting = false
      this.reconnectAttempts = 0
      this.emit('connected')
      
      // Start ping interval
      this.startPing()
      
      // Resubscribe to previous subscriptions
      this.subscriptions.forEach(sub => {
        const [event, pair] = sub.split(':')
        this.subscribe(event, [pair])
      })
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handleMessage(data)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.emit('error', error)
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.isConnecting = false
      this.stopPing()
      this.emit('disconnected')
      this.attemptReconnect()
    }
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocketImpl.OPEN) {
        this.ws.send(JSON.stringify({ event: 'ping' }))
      }
    }, 30000) // Ping every 30 seconds
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      this.emit('maxReconnectAttemptsReached')
      return
    }

    this.reconnectAttempts++
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
    
    setTimeout(() => {
      this.connect()
    }, this.reconnectInterval)
  }

  private handleMessage(data: any): void {
    // Handle different message types
    if (data.event === 'heartbeat') {
      this.emit('heartbeat')
      return
    }

    if (data.event === 'pong') {
      this.emit('pong')
      return
    }

    if (data.event === 'systemStatus') {
      this.emit('systemStatus', data)
      return
    }

    if (data.event === 'subscriptionStatus') {
      this.emit('subscriptionStatus', data)
      return
    }

    if (data.event === 'error') {
      console.error('Kraken WebSocket error:', data.errorMessage)
      this.emit('error', new Error(data.errorMessage))
      return
    }

    // Handle channel data
    if (Array.isArray(data) && data.length >= 4) {
      const [channelID, channelData, channelName, pair] = data
      
      switch (channelName) {
        case 'ticker':
          this.emit('ticker', { pair, data: this.parseTicker(channelData) })
          break
        case 'book-10':
        case 'book-25':
        case 'book-100':
        case 'book-500':
        case 'book-1000':
          this.emit('orderbook', { pair, data: this.parseOrderBook(channelData) })
          break
        case 'trade':
          this.emit('trade', { pair, data: this.parseTrades(channelData) })
          break
        case 'ohlc-1':
        case 'ohlc-5':
        case 'ohlc-15':
        case 'ohlc-30':
        case 'ohlc-60':
        case 'ohlc-240':
        case 'ohlc-1440':
        case 'ohlc-10080':
        case 'ohlc-21600':
          this.emit('ohlc', { pair, data: channelData, interval: channelName.split('-')[1] })
          break
        default:
          console.log('Unknown channel:', channelName)
      }
    }
  }

  private parseTicker(data: any): TickerData {
    return {
      ask: data.a,
      bid: data.b,
      close: data.c,
      volume: data.v,
      high: data.h,
      low: data.l,
      open: data.o
    }
  }

  private parseOrderBook(data: any): OrderBookData {
    if (data.as && data.bs) {
      // Snapshot
      return {
        asks: data.as,
        bids: data.bs
      }
    } else {
      // Update
      return {
        asks: data.a || [],
        bids: data.b || []
      }
    }
  }

  private parseTrades(data: any[]): TradeData[] {
    return data.map(trade => ({
      price: trade[0],
      volume: trade[1],
      time: trade[2],
      side: trade[3],
      orderType: trade[4],
      misc: trade[5]
    }))
  }

  subscribe(channel: string, pairs: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocketImpl.OPEN) {
      console.error('WebSocket not connected')
      return
    }

    const subscription = {
      event: 'subscribe',
      pair: pairs,
      subscription: {
        name: channel
      }
    }

    // Store subscriptions for reconnection
    pairs.forEach(pair => {
      this.subscriptions.add(`${channel}:${pair}`)
    })

    this.ws.send(JSON.stringify(subscription))
  }

  unsubscribe(channel: string, pairs: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocketImpl.OPEN) {
      console.error('WebSocket not connected')
      return
    }

    const subscription = {
      event: 'unsubscribe',
      pair: pairs,
      subscription: {
        name: channel
      }
    }

    // Remove from stored subscriptions
    pairs.forEach(pair => {
      this.subscriptions.delete(`${channel}:${pair}`)
    })

    this.ws.send(JSON.stringify(subscription))
  }

  disconnect(): void {
    this.stopPing()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.subscriptions.clear()
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocketImpl.OPEN
  }
}