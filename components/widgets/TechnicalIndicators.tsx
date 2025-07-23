'use client'

import React from 'react'
import { Box, Typography, Grid, LinearProgress, Chip } from '@mui/material'

interface TechnicalIndicatorsProps {
  symbol: string
}

interface Indicator {
  name: string
  value: number
  signal: 'buy' | 'sell' | 'neutral'
  strength: number
}

export function TechnicalIndicators({ symbol }: TechnicalIndicatorsProps) {
  // Mock technical indicators
  const indicators: Indicator[] = [
    { name: 'RSI (14)', value: 45.6, signal: 'neutral', strength: 50 },
    { name: 'MACD', value: -123.45, signal: 'sell', strength: 65 },
    { name: 'Stochastic', value: 78.9, signal: 'buy', strength: 80 },
    { name: 'ADX', value: 32.1, signal: 'buy', strength: 70 },
    { name: 'Bollinger Bands', value: 0.8, signal: 'neutral', strength: 40 },
    { name: 'ATR', value: 1250.5, signal: 'neutral', strength: 55 },
  ]

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'buy': return 'success'
      case 'sell': return 'error'
      default: return 'default'
    }
  }

  const overallSignal = indicators.reduce((acc, ind) => {
    if (ind.signal === 'buy') return acc + ind.strength
    if (ind.signal === 'sell') return acc - ind.strength
    return acc
  }, 0)

  const overallSignalText = overallSignal > 50 ? 'Strong Buy' : 
                           overallSignal > 20 ? 'Buy' :
                           overallSignal < -50 ? 'Strong Sell' :
                           overallSignal < -20 ? 'Sell' : 'Neutral'

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Overall Signal
        </Typography>
        <Chip 
          label={overallSignalText} 
          color={getSignalColor(overallSignal > 20 ? 'buy' : overallSignal < -20 ? 'sell' : 'neutral')}
          sx={{ mb: 1 }}
        />
      </Box>
      
      <Grid container spacing={2}>
        {indicators.map((indicator) => (
          <Grid item xs={12} key={indicator.name}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">{indicator.name}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">{indicator.value.toFixed(2)}</Typography>
                  <Chip 
                    label={indicator.signal.toUpperCase()} 
                    size="small"
                    color={getSignalColor(indicator.signal)}
                  />
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={indicator.strength} 
                sx={{ 
                  height: 6,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: indicator.signal === 'buy' ? 'success.main' : 
                            indicator.signal === 'sell' ? 'error.main' : 'text.secondary'
                  }
                }}
              />
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}