'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Chip,
  LinearProgress,
} from '@mui/material'
import { formatPrice, formatSize } from '@/lib/utils/formatters'

interface OrderBookProps {
  symbol: string
  depth?: number
}

interface OrderLevel {
  price: string
  size: string
  total?: string
}

interface OrderBookData {
  bids: OrderLevel[]
  asks: OrderLevel[]
  spread: number
  spreadPercent: number
}

export function OrderBook({ symbol, depth = 10 }: OrderBookProps) {
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Convert symbol to Kraken format
  const getKrakenPair = (symbol: string) => {
    const conversions: Record<string, string> = {
      'BTC/USD': 'XXBTZUSD',
      'BTCUSD': 'XXBTZUSD',
      'ETH/USD': 'XETHZUSD',
      'ETHUSD': 'XETHZUSD',
    }
    return conversions[symbol] || symbol
  }

  useEffect(() => {
    const fetchOrderBook = async () => {
      try {
        setLoading(true)
        setError(null)
        const krakenPair = getKrakenPair(symbol)
        const response = await fetch(`/api/kraken/orderbook?pair=${krakenPair}&count=${depth}`)
        const data = await response.json()
        
        if (data.error) {
          setError(data.error)
          return
        }

        // Process order book data
        const bids = data.bids?.slice(0, depth).map((bid: string[]) => ({
          price: bid[0],
          size: bid[1],
          total: bid[2] || '0'
        })) || []

        const asks = data.asks?.slice(0, depth).map((ask: string[]) => ({
          price: ask[0],
          size: ask[1],
          total: ask[2] || '0'
        })) || []

        // Calculate spread
        const topBid = parseFloat(bids[0]?.price || '0')
        const topAsk = parseFloat(asks[0]?.price || '0')
        const spread = topAsk - topBid
        const spreadPercent = topAsk > 0 ? (spread / topAsk) * 100 : 0

        setOrderBook({
          bids,
          asks,
          spread,
          spreadPercent
        })
      } catch (err) {
        setError('Failed to fetch order book')
        console.error('Order book error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrderBook()
    const interval = setInterval(fetchOrderBook, 2000) // Update every 2 seconds
    
    return () => clearInterval(interval)
  }, [symbol, depth])

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width="60%" height={30} />
        <Box sx={{ mt: 2 }}>
          {Array.from({ length: depth }).map((_, index) => (
            <Skeleton key={index} variant="rectangular" height={30} sx={{ mb: 0.5 }} />
          ))}
        </Box>
      </Box>
    )
  }

  if (error || !orderBook) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="error">{error || 'No order book data available'}</Typography>
      </Box>
    )
  }

  // Calculate max total for volume visualization
  const maxBidTotal = Math.max(...orderBook.bids.map(b => parseFloat(b.total || b.size)))
  const maxAskTotal = Math.max(...orderBook.asks.map(a => parseFloat(a.total || a.size)))
  const maxTotal = Math.max(maxBidTotal, maxAskTotal)

  return (
    <Box>
      {/* Spread Info */}
      <Box sx={{ mb: 2, p: 1, backgroundColor: '#1A1A1A', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: '#666666' }}>
            Spread
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={`$${orderBook.spread.toFixed(2)}`}
              size="small"
              sx={{
                backgroundColor: '#333333',
                color: '#FFFFFF',
                height: 20,
              }}
            />
            <Chip
              label={`${orderBook.spreadPercent.toFixed(3)}%`}
              size="small"
              sx={{
                backgroundColor: '#333333',
                color: '#FFFFFF',
                height: 20,
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Order Book Table */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: '#666666', py: 0.5 }}>Price</TableCell>
              <TableCell align="right" sx={{ color: '#666666', py: 0.5 }}>Size</TableCell>
              <TableCell align="right" sx={{ color: '#666666', py: 0.5 }}>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Asks (reversed to show lowest first) */}
            {[...orderBook.asks].reverse().map((ask, index) => {
              const totalPercent = maxTotal > 0 ? (parseFloat(ask.total || ask.size) / maxTotal) * 100 : 0
              return (
                <TableRow key={`ask-${index}`} sx={{ '&:hover': { backgroundColor: '#1A1A1A' } }}>
                  <TableCell sx={{ position: 'relative', py: 0.5 }}>
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: `${100 - totalPercent}%`,
                        backgroundColor: '#FF4F0020',
                        zIndex: 0,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ color: '#FF4F00', position: 'relative', zIndex: 1 }}
                    >
                      {formatPrice(ask.price)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    <Typography variant="body2">{formatSize(ask.size)}</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    <Typography variant="body2" sx={{ color: '#666666' }}>
                      {formatSize(ask.total || ask.size)}
                    </Typography>
                  </TableCell>
                </TableRow>
              )
            })}

            {/* Spread Row */}
            <TableRow>
              <TableCell colSpan={3} sx={{ py: 1, backgroundColor: '#0A0A0A' }}>
                <LinearProgress
                  variant="determinate"
                  value={50}
                  sx={{
                    height: 2,
                    backgroundColor: '#333333',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#6563FF',
                    },
                  }}
                />
              </TableCell>
            </TableRow>

            {/* Bids */}
            {orderBook.bids.map((bid, index) => {
              const totalPercent = maxTotal > 0 ? (parseFloat(bid.total || bid.size) / maxTotal) * 100 : 0
              return (
                <TableRow key={`bid-${index}`} sx={{ '&:hover': { backgroundColor: '#1A1A1A' } }}>
                  <TableCell sx={{ position: 'relative', py: 0.5 }}>
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: `${100 - totalPercent}%`,
                        backgroundColor: '#00CC6620',
                        zIndex: 0,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ color: '#00CC66', position: 'relative', zIndex: 1 }}
                    >
                      {formatPrice(bid.price)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    <Typography variant="body2">{formatSize(bid.size)}</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    <Typography variant="body2" sx={{ color: '#666666' }}>
                      {formatSize(bid.total || bid.size)}
                    </Typography>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}