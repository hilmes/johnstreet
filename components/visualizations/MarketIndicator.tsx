'use client'

import React from 'react'
import { Box, Tooltip } from '@mui/material'
import { DesignSystem } from '@/lib/design/DesignSystem'
import Typography from '../typography/Typography'
import Sparkline from './Sparkline'
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material'

interface MarketIndicatorProps {
  symbol: string
  name?: string
  price: number
  change: number
  changePercent: number
  volume?: number
  sparklineData?: number[]
  high24h?: number
  low24h?: number
  onClick?: () => void
  dense?: boolean
}

export default function MarketIndicator({
  symbol,
  name,
  price,
  change,
  changePercent,
  volume,
  sparklineData,
  high24h,
  low24h,
  onClick,
  dense = false
}: MarketIndicatorProps) {
  const isPositive = change > 0
  const isNegative = change < 0
  const color = isPositive ? DesignSystem.colors.market.up : isNegative ? DesignSystem.colors.market.down : DesignSystem.colors.neutral[600]

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: value < 1 ? 6 : 2,
    }).format(value)
  }

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
    return `$${value.toFixed(2)}`
  }

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        padding: dense ? DesignSystem.spacing[2] : DesignSystem.spacing[3],
        borderRadius: DesignSystem.radius.base,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 200ms ease',
        '&:hover': onClick ? {
          backgroundColor: DesignSystem.colors.neutral[100],
        } : {},
      }}
    >
      {/* Symbol and Name */}
      <Box sx={{ flex: '0 0 auto', minWidth: dense ? 80 : 120 }}>
        <Typography variant="body1" weight="semibold" sx={{ marginBottom: 0 }}>
          {symbol}
        </Typography>
        {name && !dense && (
          <Typography variant="caption" color="muted" sx={{ marginBottom: 0 }}>
            {name}
          </Typography>
        )}
      </Box>

      {/* Sparkline */}
      {sparklineData && (
        <Box sx={{ flex: '0 0 auto', mx: 2 }}>
          <Sparkline
            data={sparklineData}
            width={dense ? 60 : 80}
            height={dense ? 24 : 32}
            color={color}
            showArea
          />
        </Box>
      )}

      {/* Price and Change */}
      <Box sx={{ flex: '1 1 auto', textAlign: 'right' }}>
        <Typography variant="mono" weight="medium" sx={{ marginBottom: 0 }}>
          {formatPrice(price)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
          {isPositive && <TrendingUp sx={{ fontSize: 14, color }} />}
          {isNegative && <TrendingDown sx={{ fontSize: 14, color }} />}
          {!isPositive && !isNegative && <TrendingFlat sx={{ fontSize: 14, color }} />}
          <Typography 
            variant="caption" 
            sx={{ 
              color,
              fontWeight: DesignSystem.typography.primary.weights.medium,
              marginBottom: 0
            }}
          >
            {isPositive && '+'}{formatPrice(Math.abs(change))} ({isPositive && '+'}{changePercent.toFixed(2)}%)
          </Typography>
        </Box>
      </Box>

      {/* Volume and 24h Range */}
      {(volume || (high24h && low24h)) && !dense && (
        <Box sx={{ flex: '0 0 auto', ml: 3, textAlign: 'right' }}>
          {volume && (
            <>
              <Typography variant="label" sx={{ marginBottom: 0 }}>
                VOL
              </Typography>
              <Typography variant="mono" sx={{ marginBottom: 0 }}>
                {formatVolume(volume)}
              </Typography>
            </>
          )}
          {high24h && low24h && (
            <Tooltip title={`24h Range: ${formatPrice(low24h)} - ${formatPrice(high24h)}`}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <Box
                  sx={{
                    width: 60,
                    height: 4,
                    backgroundColor: DesignSystem.colors.neutral[200],
                    borderRadius: 2,
                    position: 'relative',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      left: `${((price - low24h) / (high24h - low24h)) * 100}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 8,
                      height: 8,
                      backgroundColor: color,
                      borderRadius: '50%',
                    }}
                  />
                </Box>
              </Box>
            </Tooltip>
          )}
        </Box>
      )}
    </Box>
  )
}

// Compact ticker for displaying in headers
interface TickerProps {
  items: Array<{
    symbol: string
    price: number
    changePercent: number
  }>
}

export function MarketTicker({ items }: TickerProps) {
  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 3,
      alignItems: 'center',
      overflowX: 'auto',
      '&::-webkit-scrollbar': { display: 'none' },
      scrollbarWidth: 'none',
    }}>
      {items.map((item) => {
        const isPositive = item.changePercent > 0
        const color = isPositive ? DesignSystem.colors.market.up : DesignSystem.colors.market.down

        return (
          <Box key={item.symbol} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <Typography variant="body2" weight="medium" sx={{ marginBottom: 0 }}>
              {item.symbol}
            </Typography>
            <Typography variant="mono" sx={{ marginBottom: 0 }}>
              ${item.price.toFixed(2)}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color,
                fontWeight: DesignSystem.typography.primary.weights.medium,
                marginBottom: 0
              }}
            >
              {isPositive && '+'}{item.changePercent.toFixed(2)}%
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}