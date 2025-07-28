'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PriceUpdate } from '@/lib/kraken/PriceFeedManager'

export interface LivePriceData extends PriceUpdate {
  sparkline?: number[]
}

export interface UseLivePricesOptions {
  symbols?: string[]
  onPriceUpdate?: (update: PriceUpdate) => void
  updateInterval?: number // How often to trigger re-renders (ms)
}

export function useLivePrices(options: UseLivePricesOptions = {}) {
  const { symbols = [], onPriceUpdate, updateInterval = 1000 } = options
  
  const [prices, setPrices] = useState<Map<string, LivePriceData>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const pricesRef = useRef<Map<string, LivePriceData>>(new Map())
  const wsRef = useRef<WebSocket | null>(null)
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null)

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
        console.log('Live price WebSocket connected')
        setIsConnected(true)
        setError(null)

        // Subscribe to price feed
        ws.send(JSON.stringify({
          type: 'subscribe',
          symbols: symbols.length > 0 ? symbols : ['BTC/USD', 'ETH/USD']
        }))
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          if (message.type === 'price') {
            const update = message.data as PriceUpdate
            
            // Update ref immediately
            pricesRef.current.set(update.symbol, {
              ...update,
              sparkline: message.sparkline
            })

            // Call callback if provided
            if (onPriceUpdate) {
              onPriceUpdate(update)
            }
          } else if (message.type === 'stats') {
            // Update all prices with sparklines
            message.data.prices.forEach((item: any) => {
              const existing = pricesRef.current.get(item.symbol)
              if (existing) {
                pricesRef.current.set(item.symbol, {
                  ...existing,
                  sparkline: item.sparkline
                })
              }
            })
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        setError(new Error('WebSocket connection error'))
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        wsRef.current = null

        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (symbols.length > 0) {
            connect()
          }
        }, 5000)
      }
    } catch (err) {
      console.error('Failed to connect WebSocket:', err)
      setError(err as Error)
    }
  }, [symbols, onPriceUpdate])

  // Subscribe to additional symbols
  const subscribe = useCallback((newSymbols: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        symbols: newSymbols
      }))
    }
  }, [])

  // Unsubscribe from symbols
  const unsubscribe = useCallback((removeSymbols: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        symbols: removeSymbols
      }))
    }
  }, [])

  // Setup periodic state updates
  useEffect(() => {
    // Update state periodically to trigger re-renders
    updateTimerRef.current = setInterval(() => {
      setPrices(new Map(pricesRef.current))
    }, updateInterval)

    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current)
      }
    }
  }, [updateInterval])

  // Connect on mount and manage subscriptions
  useEffect(() => {
    if (symbols.length > 0) {
      connect()
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current)
      }
    }
  }, []) // Only run on mount/unmount

  // Handle symbol changes
  useEffect(() => {
    if (isConnected && symbols.length > 0) {
      // Clear current prices for symbols we're not tracking anymore
      const currentSymbols = new Set(symbols)
      pricesRef.current.forEach((_, symbol) => {
        if (!currentSymbols.has(symbol)) {
          pricesRef.current.delete(symbol)
        }
      })

      // Subscribe to new symbols
      subscribe(symbols)
    }
  }, [symbols, isConnected, subscribe])

  return {
    prices,
    isConnected,
    error,
    subscribe,
    unsubscribe,
    getPrice: (symbol: string) => prices.get(symbol) || null,
    getAllPrices: () => Array.from(prices.values())
  }
}

// Hook for a single symbol
export function useLivePrice(symbol: string) {
  const { prices, isConnected, error } = useLivePrices({ symbols: [symbol] })
  return {
    price: prices.get(symbol) || null,
    isConnected,
    error
  }
}