#!/usr/bin/env node

/**
 * WebSocket Server for Real-time Price Feeds
 * Run this alongside your Next.js app: `npm run ws-server`
 */

import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { getPriceFeedManager, PriceUpdate } from '../lib/kraken/PriceFeedManager'

const PORT = process.env.WS_PORT || 3006
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005',
  'http://localhost:3006',
  'http://localhost:4001',
  'https://johnstreet.johnhilmes.com',
  'https://johnstreet.vercel.app'
]

interface WSMessage {
  type: string
  channel?: string
  symbols?: string[]
  data?: any
}

class PriceWebSocketServer {
  private wss: WebSocketServer
  private clients: Map<WebSocket, Set<string>> = new Map()
  private priceFeed = getPriceFeedManager()
  private defaultSymbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'ADA/USD', 'DOT/USD']

  constructor(port: number) {
    const server = createServer()
    this.wss = new WebSocketServer({ server })

    this.setupWebSocketServer()
    this.setupPriceFeed()

    server.listen(port, () => {
      console.log(`WebSocket server running on port ${port}`)
    })
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const origin = req.headers.origin
      
      // CORS check
      if (origin && !ALLOWED_ORIGINS.includes(origin)) {
        console.log(`Rejected connection from unauthorized origin: ${origin}`)
        ws.close(1008, 'Unauthorized origin')
        return
      }

      console.log('New WebSocket client connected')
      this.clients.set(ws, new Set())

      // Send initial connection success
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to price feed',
        timestamp: Date.now()
      }))

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as WSMessage
          this.handleClientMessage(ws, message)
        } catch (error) {
          console.error('Failed to parse message:', error)
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }))
        }
      })

      ws.on('close', () => {
        console.log('Client disconnected')
        this.clients.delete(ws)
      })

      ws.on('error', (error) => {
        console.error('WebSocket error:', error)
        this.clients.delete(ws)
      })

      // Send ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping()
        } else {
          clearInterval(pingInterval)
        }
      }, 30000)
    })
  }

  private handleClientMessage(ws: WebSocket, message: WSMessage): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(ws, message.symbols || this.defaultSymbols)
        break
      
      case 'unsubscribe':
        this.handleUnsubscribe(ws, message.symbols || [])
        break
      
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
        break
      
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: `Unknown message type: ${message.type}`
        }))
    }
  }

  private handleSubscribe(ws: WebSocket, symbols: string[]): void {
    const clientSymbols = this.clients.get(ws) || new Set()
    
    // Add new symbols
    const newSymbols = symbols.filter(s => !clientSymbols.has(s))
    newSymbols.forEach(s => clientSymbols.add(s))
    
    // Update price feed subscriptions
    if (newSymbols.length > 0) {
      this.priceFeed.addSymbols(newSymbols)
    }

    ws.send(JSON.stringify({
      type: 'subscribed',
      symbols: Array.from(clientSymbols),
      timestamp: Date.now()
    }))

    // Send current prices for subscribed symbols
    symbols.forEach(symbol => {
      const price = this.priceFeed.getLatestPrice(symbol)
      if (price) {
        ws.send(JSON.stringify({
          type: 'price',
          data: price,
          sparkline: this.priceFeed.getPriceHistory(symbol).slice(-20)
        }))
      }
    })
  }

  private handleUnsubscribe(ws: WebSocket, symbols: string[]): void {
    const clientSymbols = this.clients.get(ws) || new Set()
    
    symbols.forEach(s => clientSymbols.delete(s))
    
    ws.send(JSON.stringify({
      type: 'unsubscribed',
      symbols,
      timestamp: Date.now()
    }))
  }

  private setupPriceFeed(): void {
    // Start price feed with default symbols
    this.priceFeed.start(this.defaultSymbols)

    // Forward price updates to subscribed clients
    this.priceFeed.on('priceUpdate', (update: PriceUpdate) => {
      this.broadcastPriceUpdate(update)
    })

    // Forward order book updates to subscribed clients
    this.priceFeed.on('orderbook', ({ pair, data }: { pair: string; data: any }) => {
      this.broadcastOrderBook(pair, data)
    })

    // Forward stats to all clients
    this.priceFeed.on('stats', (stats) => {
      this.broadcast({
        type: 'stats',
        data: stats,
        timestamp: Date.now()
      })
    })

    // Handle connection events
    this.priceFeed.on('connected', () => {
      console.log('Price feed connected to Kraken')
      this.broadcast({
        type: 'feed_connected',
        message: 'Price feed connected',
        timestamp: Date.now()
      })
    })

    this.priceFeed.on('disconnected', () => {
      console.log('Price feed disconnected from Kraken')
      this.broadcast({
        type: 'feed_disconnected',
        message: 'Price feed disconnected',
        timestamp: Date.now()
      })
    })

    this.priceFeed.on('error', (error) => {
      console.error('Price feed error:', error)
      this.broadcast({
        type: 'feed_error',
        message: error.message,
        timestamp: Date.now()
      })
    })
  }

  private broadcastPriceUpdate(update: PriceUpdate): void {
    this.clients.forEach((symbols, ws) => {
      if (symbols.has(update.symbol) && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'price',
          data: update,
          sparkline: this.priceFeed.getPriceHistory(update.symbol).slice(-20)
        }))
      }
    })
  }

  private broadcastOrderBook(pair: string, data: any): void {
    // Convert Kraken pair format to standard format
    const symbol = this.normalizeSymbol(pair)
    
    this.clients.forEach((symbols, ws) => {
      if (symbols.has(symbol) && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'orderbook',
          symbol,
          data
        }))
      }
    })
  }

  private normalizeSymbol(krakenPair: string): string {
    // Convert Kraken pair format (e.g., "XBT/USD") to standard format (e.g., "BTC/USD")
    const conversions: Record<string, string> = {
      'XBT': 'BTC',
      'XDG': 'DOGE'
    }

    const [base, quote] = krakenPair.split('/')
    const normalizedBase = conversions[base] || base
    return `${normalizedBase}/${quote}`
  }

  private broadcast(message: any): void {
    const data = JSON.stringify(message)
    this.clients.forEach((_, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
    })
  }
}

// Start the server
const server = new PriceWebSocketServer(Number(PORT))

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down WebSocket server...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\nShutting down WebSocket server...')
  process.exit(0)
})