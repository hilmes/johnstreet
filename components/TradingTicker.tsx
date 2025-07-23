'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  IconButton,
  Divider,
  Skeleton,
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Refresh,
} from '@mui/icons-material'

interface TickerData {
  ask: string[]
  bid: string[]
  last: string[]
  volume: string[]
  high: string[]
  low: string[]
  open: string[]
}

interface TickerItemProps {
  pair: string
  displayName: string
}

const formatPrice = (price: string) => {
  const num = parseFloat(price)
  if (num > 10000) return num.toFixed(0)
  if (num > 100) return num.toFixed(2)
  if (num > 1) return num.toFixed(4)
  return num.toFixed(6)
}

const formatVolume = (volume: string) => {
  const num = parseFloat(volume)
  if (num > 1000000) return `${(num / 1000000).toFixed(2)}M`
  if (num > 1000) return `${(num / 1000).toFixed(2)}K`
  return num.toFixed(2)
}

function TickerItem({ pair, displayName }: TickerItemProps) {
  const [ticker, setTicker] = useState<TickerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0)

  const fetchTicker = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/kraken/ticker?pair=${pair}`)
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
        return
      }
      
      const tickerData = data[pair] as TickerData
      if (tickerData) {
        setTicker(tickerData)
        
        // Calculate price change
        const last = parseFloat(tickerData.last[0])
        const open = parseFloat(tickerData.open[0])
        const change = last - open
        const changePercent = (change / open) * 100
        
        setPriceChange(change)
        setPriceChangePercent(changePercent)
      }
    } catch (err) {
      setError('Failed to fetch ticker')
      console.error('Ticker error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTicker()
    const interval = setInterval(fetchTicker, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [pair])

  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Skeleton variant="text" width="60%" height={30} />
        <Skeleton variant="text" width="80%" height={40} />
        <Skeleton variant="text" width="40%" height={20} />
      </Paper>
    )
  }

  if (error || !ticker) {
    return (
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error" variant="body2">
          {error || 'No data available'}
        </Typography>
      </Paper>
    )
  }

  const getTrendIcon = () => {
    if (priceChange > 0) return <TrendingUp sx={{ color: '#00CC66' }} />
    if (priceChange < 0) return <TrendingDown sx={{ color: '#FF4F00' }} />
    return <TrendingFlat sx={{ color: '#666666' }} />
  }

  const getPriceColor = () => {
    if (priceChange > 0) return '#00CC66'
    if (priceChange < 0) return '#FF4F00'
    return '#FFFFFF'
  }

  return (
    <Paper
      sx={{
        p: 2,
        background: '#111111',
        border: '1px solid #333333',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: '#6563FF',
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(101, 99, 255, 0.2)',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: '#CCCCCC' }}>
          {displayName}
        </Typography>
        {getTrendIcon()}
      </Box>
      
      <Typography variant="h5" sx={{ color: getPriceColor(), fontWeight: 700, mb: 1 }}>
        ${formatPrice(ticker.last[0])}
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Chip
          label={`${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}`}
          size="small"
          sx={{
            backgroundColor: priceChange >= 0 ? '#00CC6620' : '#FF4F0020',
            color: getPriceColor(),
            border: `1px solid ${getPriceColor()}`,
          }}
        />
        <Chip
          label={`${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%`}
          size="small"
          sx={{
            backgroundColor: priceChange >= 0 ? '#00CC6620' : '#FF4F0020',
            color: getPriceColor(),
            border: `1px solid ${getPriceColor()}`,
          }}
        />
      </Box>
      
      <Divider sx={{ my: 1, borderColor: '#333333' }} />
      
      <Grid container spacing={1}>
        <Grid item xs={6}>
          <Typography variant="caption" sx={{ color: '#666666' }}>
            24h High
          </Typography>
          <Typography variant="body2" sx={{ color: '#FFFFFF' }}>
            ${formatPrice(ticker.high[1])}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" sx={{ color: '#666666' }}>
            24h Low
          </Typography>
          <Typography variant="body2" sx={{ color: '#FFFFFF' }}>
            ${formatPrice(ticker.low[1])}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" sx={{ color: '#666666' }}>
            24h Volume
          </Typography>
          <Typography variant="body2" sx={{ color: '#FFFFFF' }}>
            {formatVolume(ticker.volume[1])}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" sx={{ color: '#666666' }}>
            Bid/Ask
          </Typography>
          <Typography variant="body2" sx={{ color: '#FFFFFF' }}>
            ${formatPrice(ticker.bid[0])} / ${formatPrice(ticker.ask[0])}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  )
}

export default function TradingTicker() {
  const [refreshKey, setRefreshKey] = useState(0)

  const tradingPairs = [
    { pair: 'XXBTZUSD', displayName: 'BTC/USD' },
    { pair: 'XETHZUSD', displayName: 'ETH/USD' },
    { pair: 'XLTCZUSD', displayName: 'LTC/USD' },
    { pair: 'XXRPZUSD', displayName: 'XRP/USD' },
    { pair: 'ADAUSD', displayName: 'ADA/USD' },
    { pair: 'SOLUSD', displayName: 'SOL/USD' },
  ]

  const handleRefreshAll = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Live Market Prices
        </Typography>
        <IconButton onClick={handleRefreshAll} sx={{ color: '#6563FF' }}>
          <Refresh />
        </IconButton>
      </Box>
      
      <Grid container spacing={2}>
        {tradingPairs.map(({ pair, displayName }) => (
          <Grid item xs={12} sm={6} md={4} key={`${pair}-${refreshKey}`}>
            <TickerItem pair={pair} displayName={displayName} />
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}