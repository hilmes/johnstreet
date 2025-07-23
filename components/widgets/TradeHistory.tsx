'use client'

import React from 'react'
import { Box, Typography, List, ListItem } from '@mui/material'

interface TradeHistoryProps {
  symbol: string
  maxTrades?: number
}

interface Trade {
  id: string
  price: number
  amount: number
  time: string
  side: 'buy' | 'sell'
}

export function TradeHistory({ symbol, maxTrades = 10 }: TradeHistoryProps) {
  // Mock trade history data
  const trades: Trade[] = [
    { id: '1', price: 42195, amount: 0.25, time: '14:32:15', side: 'buy' },
    { id: '2', price: 42193, amount: 0.50, time: '14:32:12', side: 'sell' },
    { id: '3', price: 42198, amount: 0.10, time: '14:32:08', side: 'buy' },
    { id: '4', price: 42190, amount: 1.20, time: '14:31:58', side: 'sell' },
    { id: '5', price: 42201, amount: 0.75, time: '14:31:45', side: 'buy' },
  ].slice(0, maxTrades)

  return (
    <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
      <List dense sx={{ py: 0 }}>
        {trades.map((trade) => (
          <ListItem 
            key={trade.id} 
            sx={{ 
              px: 0, 
              py: 0.5,
              display: 'flex',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
              <Typography 
                variant="body2" 
                color={trade.side === 'buy' ? 'success.main' : 'error.main'}
                sx={{ minWidth: 40 }}
              >
                {trade.side.toUpperCase()}
              </Typography>
              <Typography variant="body2">{trade.price}</Typography>
              <Typography variant="body2" color="text.secondary">
                {trade.amount}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {trade.time}
            </Typography>
          </ListItem>
        ))}
      </List>
    </Box>
  )
}