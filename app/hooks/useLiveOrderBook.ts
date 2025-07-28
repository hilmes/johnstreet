'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface OrderBookEntry {
  price: number
  size: number
  total: number
}

export interface OrderBookData {
  symbol: string
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
  timestamp: number
  spread: number
  spreadPercent: number
}

export interface UseLiveOrderBookOptions {
  symbol: string
  maxLevels?: number
}

export function useLiveOrderBook(options: UseLiveOrderBookOptions) {
  const { symbol, maxLevels = 15 } = options
  
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)

  // Process raw order book data from Kraken
  const processOrderBookData = useCallback((rawData: any): OrderBookData => {
    const bids: OrderBookEntry[] = []
    const asks: OrderBookEntry[] = []
    
    let bidTotal = 0
    let askTotal = 0

    // Process bids (buy orders) - sorted by price descending
    if (rawData.bs || rawData.b) {
      const bidData = rawData.bs || rawData.b || []
      const sortedBids = bidData
        .map(([price, volume]: [string, string]) => ({
          price: parseFloat(price),
          size: parseFloat(volume)
        }))
        .sort((a: any, b: any) => b.price - a.price) // Highest price first
        .slice(0, maxLevels)

      for (const bid of sortedBids) {
        bidTotal += bid.size
        bids.push({
          price: bid.price,
          size: bid.size,
          total: bidTotal
        })
      }
    }

    // Process asks (sell orders) - sorted by price ascending
    if (rawData.as || rawData.a) {
      const askData = rawData.as || rawData.a || []
      const sortedAsks = askData
        .map(([price, volume]: [string, string]) => ({
          price: parseFloat(price),
          size: parseFloat(volume)
        }))
        .sort((a: any, b: any) => a.price - b.price) // Lowest price first
        .slice(0, maxLevels)

      for (const ask of sortedAsks) {
        askTotal += ask.size
        asks.push({
          price: ask.price,
          size: ask.size,
          total: askTotal
        })
      }
    }

    // Calculate spread
    const bestBid = bids[0]?.price || 0
    const bestAsk = asks[0]?.price || 0
    const spread = bestAsk - bestBid
    const spreadPercent = bestAsk > 0 ? (spread / bestAsk) * 100 : 0

    return {
      symbol,
      bids,
      asks,
      timestamp: Date.now(),
      spread,
      spreadPercent
    }
  }, [symbol, maxLevels])

  // Initialize WebSocket connection
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      // Connect to our standalone WebSocket server
      let wsUrl: string
      
      if (process.env.NEXT_PUBLIC_WS_URL) {
        // Use configured WebSocket URL for production
        wsUrl = process.env.NEXT_PUBLIC_WS_URL
      } else {
        // Use local WebSocket server for development
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const host = window.location.hostname
        const port = process.env.NEXT_PUBLIC_WS_PORT || '3006'
        wsUrl = `${protocol}//${host}:${port}`
      }
      
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('Order book WebSocket connected')
        setIsConnected(true)
        setError(null)

        // Subscribe to order book feed
        ws.send(JSON.stringify({
          type: 'subscribe',
          symbols: [symbol]
        }))
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          if (message.type === 'orderbook' && message.symbol === symbol) {
            const processedData = processOrderBookData(message.data)
            setOrderBook(processedData)
          }
        } catch (err) {
          console.error('Failed to parse order book WebSocket message:', err)
        }
      }

      ws.onerror = (event) => {
        console.error('Order book WebSocket error:', event)
        setError(new Error('WebSocket connection error'))
      }

      ws.onclose = () => {
        console.log('Order book WebSocket disconnected')
        setIsConnected(false)
        wsRef.current = null

        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          connect()
        }, 5000)
      }
    } catch (err) {
      console.error('Failed to connect order book WebSocket:', err)
      setError(err as Error)
    }
  }, [symbol, processOrderBookData])

  // Connect on mount and symbol change
  useEffect(() => {
    connect()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [symbol, connect])

  return {
    orderBook,
    isConnected,
    error,
    bestBid: orderBook?.bids[0]?.price || null,
    bestAsk: orderBook?.asks[0]?.price || null,
    spread: orderBook?.spread || null,
    spreadPercent: orderBook?.spreadPercent || null
  }
}