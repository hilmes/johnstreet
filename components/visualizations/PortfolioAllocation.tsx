'use client'

import React from 'react'
import { Box, Tooltip } from '@mui/material'
import { DesignSystem } from '@/lib/design/DesignSystem'
import Typography from '../typography/Typography'

interface AllocationItem {
  symbol: string
  name?: string
  value: number
  percentage: number
  color?: string
}

interface PortfolioAllocationProps {
  allocations: AllocationItem[]
  total: number
  showLegend?: boolean
  height?: number
}

export default function PortfolioAllocation({
  allocations,
  total,
  showLegend = true,
  height = 40
}: PortfolioAllocationProps) {
  // Sort by percentage and assign colors if not provided
  const sortedAllocations = [...allocations].sort((a, b) => b.percentage - a.percentage)
  const colors = [
    DesignSystem.colors.primary[500],
    DesignSystem.colors.primary[400],
    DesignSystem.colors.primary[600],
    DesignSystem.colors.neutral[600],
    DesignSystem.colors.neutral[500],
    DesignSystem.colors.neutral[400],
  ]

  const processedAllocations = sortedAllocations.map((item, index) => ({
    ...item,
    color: item.color || colors[index % colors.length]
  }))

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <Box>
      {/* Allocation Bar */}
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          height,
          borderRadius: DesignSystem.radius.base,
          overflow: 'hidden',
          backgroundColor: DesignSystem.colors.neutral[200],
        }}
      >
        {processedAllocations.map((item, index) => (
          <Tooltip
            key={item.symbol}
            title={
              <Box sx={{ p: 1 }}>
                <Typography variant="body2" weight="semibold" sx={{ marginBottom: 0, color: 'white' }}>
                  {item.symbol} {item.name && `(${item.name})`}
                </Typography>
                <Typography variant="caption" sx={{ marginBottom: 0, color: 'white' }}>
                  {formatValue(item.value)} ({item.percentage.toFixed(1)}%)
                </Typography>
              </Box>
            }
          >
            <Box
              sx={{
                width: `${item.percentage}%`,
                height: '100%',
                backgroundColor: item.color,
                transition: 'all 200ms ease',
                cursor: 'pointer',
                borderRight: index < processedAllocations.length - 1 ? `1px solid ${DesignSystem.colors.background.primary}` : 'none',
                '&:hover': {
                  opacity: 0.8,
                },
              }}
            />
          </Tooltip>
        ))}
      </Box>

      {/* Legend */}
      {showLegend && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {processedAllocations.map((item) => (
              <Box key={item.symbol} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: DesignSystem.radius.sm,
                    backgroundColor: item.color,
                  }}
                />
                <Typography variant="body2" sx={{ marginBottom: 0 }}>
                  {item.symbol}
                </Typography>
                <Typography variant="mono" weight="medium" sx={{ marginBottom: 0 }}>
                  {item.percentage.toFixed(1)}%
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Total Value */}
      <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${DesignSystem.colors.neutral[200]}` }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography variant="label">Total Portfolio Value</Typography>
          <Typography variant="h5" weight="semibold" sx={{ marginBottom: 0 }}>
            {formatValue(total)}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

// Simplified allocation display for cards
interface AllocationBadgeProps {
  allocations: Array<{
    symbol: string
    percentage: number
    color?: string
  }>
  size?: 'small' | 'medium'
}

export function AllocationBadge({ allocations, size = 'medium' }: AllocationBadgeProps) {
  const height = size === 'small' ? 4 : 6
  const colors = [
    DesignSystem.colors.primary[500],
    DesignSystem.colors.primary[400],
    DesignSystem.colors.primary[600],
  ]

  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {allocations.slice(0, 3).map((item, index) => (
        <Tooltip key={item.symbol} title={`${item.symbol}: ${item.percentage.toFixed(1)}%`}>
          <Box
            sx={{
              width: `${item.percentage}px`,
              maxWidth: 60,
              height,
              backgroundColor: item.color || colors[index],
              borderRadius: height / 2,
            }}
          />
        </Tooltip>
      ))}
      {allocations.length > 3 && (
        <Typography variant="caption" color="muted" sx={{ marginBottom: 0, ml: 0.5 }}>
          +{allocations.length - 3}
        </Typography>
      )}
    </Box>
  )
}