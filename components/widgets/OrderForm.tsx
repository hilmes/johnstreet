'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Button,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Alert,
  Chip,
  Paper,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  AccountBalance,
  Info,
  Calculate,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material'

interface OrderFormProps {
  symbol: string
}

interface PriceData {
  bid: number
  ask: number
  last: number
}

export function OrderForm({ symbol }: OrderFormProps) {
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop-loss'>('limit')
  const [price, setPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [total, setTotal] = useState('0.00')
  const [priceData, setPriceData] = useState<PriceData | null>(null)
  const [balance, setBalance] = useState({ USD: 10000, BTC: 1.5 }) // Mock balance

  // Get Kraken pair format
  const getKrakenPair = (symbol: string) => {
    const conversions: Record<string, string> = {
      'BTC/USD': 'XXBTZUSD',
      'BTCUSD': 'XXBTZUSD',
      'ETH/USD': 'XETHZUSD',
      'ETHUSD': 'XETHZUSD',
    }
    return conversions[symbol] || symbol
  }

  // Fetch current prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const krakenPair = getKrakenPair(symbol)
        const response = await fetch(`/api/kraken/ticker?pair=${krakenPair}`)
        const data = await response.json()
        
        if (data[krakenPair]) {
          const ticker = data[krakenPair]
          setPriceData({
            bid: parseFloat(ticker.b[0]),
            ask: parseFloat(ticker.a[0]),
            last: parseFloat(ticker.c[0]),
          })
          
          // Set initial price based on order side
          if (!price && orderType === 'limit') {
            setPrice(orderSide === 'buy' ? ticker.b[0] : ticker.a[0])
          }
        }
      } catch (error) {
        console.error('Error fetching prices:', error)
      }
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 5000)
    
    return () => clearInterval(interval)
  }, [symbol, orderSide, orderType, price])

  // Calculate total
  useEffect(() => {
    if (price && amount) {
      const priceNum = parseFloat(price)
      const amountNum = parseFloat(amount)
      if (!isNaN(priceNum) && !isNaN(amountNum)) {
        setTotal((priceNum * amountNum).toFixed(2))
      }
    } else {
      setTotal('0.00')
    }
  }, [price, amount])

  const handleOrderSubmit = () => {
    // TODO: Implement order submission
    console.log('Order submitted:', {
      symbol,
      side: orderSide,
      type: orderType,
      price: orderType === 'market' ? 'market' : price,
      stopPrice: orderType === 'stop-loss' ? stopPrice : null,
      amount,
      total,
    })
  }

  const setPercentAmount = (percent: number) => {
    const availableBalance = orderSide === 'buy' ? balance.USD : balance.BTC
    const priceNum = orderType === 'market' 
      ? (priceData ? (orderSide === 'buy' ? priceData.ask : priceData.bid) : 0)
      : parseFloat(price) || 0
    
    if (priceNum > 0) {
      const maxAmount = orderSide === 'buy' 
        ? (availableBalance * percent / 100) / priceNum
        : (availableBalance * percent / 100)
      
      setAmount(maxAmount.toFixed(8))
    }
  }

  return (
    <Box>
      {/* Order Side Selection */}
      <ToggleButtonGroup
        value={orderSide}
        exclusive
        onChange={(e, value) => value && setOrderSide(value)}
        fullWidth
        sx={{ mb: 2 }}
      >
        <ToggleButton
          value="buy"
          sx={{
            '&.Mui-selected': {
              backgroundColor: '#00CC6620',
              borderColor: '#00CC66',
              color: '#00CC66',
              '&:hover': {
                backgroundColor: '#00CC6630',
              },
            },
          }}
        >
          <TrendingUp sx={{ mr: 1 }} />
          Buy
        </ToggleButton>
        <ToggleButton
          value="sell"
          sx={{
            '&.Mui-selected': {
              backgroundColor: '#FF4F0020',
              borderColor: '#FF4F00',
              color: '#FF4F00',
              '&:hover': {
                backgroundColor: '#FF4F0030',
              },
            },
          }}
        >
          <TrendingDown sx={{ mr: 1 }} />
          Sell
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Order Type Selection */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Order Type</InputLabel>
        <Select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value as any)}
          label="Order Type"
        >
          <MenuItem value="market">Market</MenuItem>
          <MenuItem value="limit">Limit</MenuItem>
          <MenuItem value="stop-loss">Stop Loss</MenuItem>
        </Select>
      </FormControl>

      {/* Price Info */}
      {priceData && (
        <Paper sx={{ p: 1.5, mb: 2, backgroundColor: '#1A1A1A' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: '#666666' }}>
              Market Price
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={`Bid: $${priceData.bid.toFixed(2)}`}
                size="small"
                sx={{ backgroundColor: '#00CC6620', color: '#00CC66' }}
              />
              <Chip
                label={`Ask: $${priceData.ask.toFixed(2)}`}
                size="small"
                sx={{ backgroundColor: '#FF4F0020', color: '#FF4F00' }}
              />
            </Box>
          </Box>
        </Paper>
      )}

      {/* Price Input */}
      {orderType !== 'market' && (
        <TextField
          label="Price"
          type="number"
          fullWidth
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
            endAdornment: priceData && (
              <InputAdornment position="end">
                <Tooltip title="Set to current market price">
                  <IconButton
                    size="small"
                    onClick={() => setPrice(
                      orderSide === 'buy' 
                        ? priceData.bid.toString() 
                        : priceData.ask.toString()
                    )}
                  >
                    <TrendingUp fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
      )}

      {/* Stop Price Input */}
      {orderType === 'stop-loss' && (
        <TextField
          label="Stop Price"
          type="number"
          fullWidth
          value={stopPrice}
          onChange={(e) => setStopPrice(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
          sx={{ mb: 2 }}
        />
      )}

      {/* Amount Input */}
      <TextField
        label="Amount"
        type="number"
        fullWidth
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        InputProps={{
          endAdornment: <InputAdornment position="end">BTC</InputAdornment>,
        }}
        sx={{ mb: 1 }}
      />

      {/* Quick Amount Buttons */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        {[25, 50, 75, 100].map((percent) => (
          <Button
            key={percent}
            size="small"
            variant="outlined"
            onClick={() => setPercentAmount(percent)}
            sx={{
              flex: 1,
              borderColor: '#333333',
              color: '#CCCCCC',
              '&:hover': {
                borderColor: '#6563FF',
                backgroundColor: '#6563FF20',
              },
            }}
          >
            {percent}%
          </Button>
        ))}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Order Summary */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ color: '#666666' }}>
            Total
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            ${total}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ color: '#666666' }}>
            Available Balance
          </Typography>
          <Typography variant="body2">
            {orderSide === 'buy' 
              ? `$${balance.USD.toFixed(2)}` 
              : `${balance.BTC.toFixed(8)} BTC`}
          </Typography>
        </Box>
      </Box>

      {/* Submit Button */}
      <Button
        variant="contained"
        fullWidth
        onClick={handleOrderSubmit}
        disabled={!amount || (orderType !== 'market' && !price)}
        sx={{
          backgroundColor: orderSide === 'buy' ? '#00CC66' : '#FF4F00',
          '&:hover': {
            backgroundColor: orderSide === 'buy' ? '#00AA55' : '#DD3D00',
          },
          '&:disabled': {
            backgroundColor: '#333333',
          },
        }}
      >
        {orderSide === 'buy' ? 'Buy' : 'Sell'} {symbol}
      </Button>

      {/* Warning for market orders */}
      {orderType === 'market' && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="caption">
            Market orders execute immediately at the best available price
          </Typography>
        </Alert>
      )}
    </Box>
  )
}