'use client'

import React from 'react'
import { Box, Divider } from '@mui/material'
import { DesignSystem } from '@/lib/design/DesignSystem'
import Typography from '../typography/Typography'
import ZenCard, { InfoCard } from '../layout/ZenCard'
import Sparkline from './Sparkline'
import { Speed, Timer, TrendingUp, CheckCircle } from '@mui/icons-material'

interface ExecutionStats {
  totalOrders: number
  successRate: number
  avgExecutionTime: number // milliseconds
  avgSlippage: number // percentage
  bestExecution: number // price improvement
  worstExecution: number // price deterioration
  recentExecutions: number[] // execution quality scores
}

interface ExecutionAnalyticsProps {
  stats: ExecutionStats
  timeframe: '1H' | '24H' | '7D' | '30D'
}

export default function ExecutionAnalytics({ stats, timeframe }: ExecutionAnalyticsProps) {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatPercentage = (value: number) => {
    const prefix = value > 0 ? '+' : ''
    return `${prefix}${value.toFixed(3)}%`
  }

  const executionQuality = stats.successRate
  const qualityColor = executionQuality >= 95 
    ? DesignSystem.colors.market.up 
    : executionQuality >= 85 
    ? DesignSystem.colors.market.warning 
    : DesignSystem.colors.market.down

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ marginBottom: 1 }}>
          Execution Analytics
        </Typography>
        <Typography variant="body2" color="muted" sx={{ marginBottom: 0 }}>
          Order execution performance over {timeframe}
        </Typography>
      </Box>

      {/* Key Metrics */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 4 }}>
        {/* Execution Quality Score */}
        <ZenCard>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircle sx={{ fontSize: 20, color: qualityColor }} />
                <Typography variant="label">Execution Quality</Typography>
              </Box>
              <Typography 
                variant="h3" 
                sx={{ 
                  marginBottom: 1, 
                  color: qualityColor,
                  fontWeight: DesignSystem.typography.primary.weights.semibold 
                }}
              >
                {stats.successRate.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="muted" sx={{ marginBottom: 0 }}>
                {stats.totalOrders} orders executed
              </Typography>
            </Box>
            <Box>
              <Sparkline
                data={stats.recentExecutions}
                width={100}
                height={40}
                color={qualityColor}
                showArea
                reference={85}
              />
            </Box>
          </Box>
        </ZenCard>

        {/* Average Execution Time */}
        <ZenCard>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Timer sx={{ fontSize: 20, color: DesignSystem.colors.primary[500] }} />
                <Typography variant="label">Avg Execution Time</Typography>
              </Box>
              <Typography 
                variant="h3" 
                sx={{ 
                  marginBottom: 1,
                  fontWeight: DesignSystem.typography.primary.weights.semibold 
                }}
              >
                {formatTime(stats.avgExecutionTime)}
              </Typography>
              <Typography variant="caption" color="muted" sx={{ marginBottom: 0 }}>
                Median: {formatTime(stats.avgExecutionTime * 0.85)}
              </Typography>
            </Box>
            <Speed sx={{ fontSize: 40, color: DesignSystem.colors.neutral[300] }} />
          </Box>
        </ZenCard>
      </Box>

      {/* Slippage Analysis */}
      <ZenCard
        title="Slippage Analysis"
        subtitle="Price movement during execution"
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
          <Box sx={{ 
            pr: 3, 
            borderRight: `1px solid ${DesignSystem.colors.neutral[200]}`,
            textAlign: 'center' 
          }}>
            <Typography variant="label" sx={{ mb: 1 }}>Average Slippage</Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                marginBottom: 0,
                color: stats.avgSlippage > 0 ? DesignSystem.colors.market.down : DesignSystem.colors.market.up,
                fontFamily: DesignSystem.typography.secondary.fontFamily,
              }}
            >
              {formatPercentage(stats.avgSlippage)}
            </Typography>
          </Box>
          
          <Box sx={{ 
            px: 3, 
            borderRight: `1px solid ${DesignSystem.colors.neutral[200]}`,
            textAlign: 'center' 
          }}>
            <Typography variant="label" sx={{ mb: 1 }}>Best Execution</Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                marginBottom: 0,
                color: DesignSystem.colors.market.up,
                fontFamily: DesignSystem.typography.secondary.fontFamily,
              }}
            >
              {formatPercentage(stats.bestExecution)}
            </Typography>
          </Box>
          
          <Box sx={{ pl: 3, textAlign: 'center' }}>
            <Typography variant="label" sx={{ mb: 1 }}>Worst Execution</Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                marginBottom: 0,
                color: DesignSystem.colors.market.down,
                fontFamily: DesignSystem.typography.secondary.fontFamily,
              }}
            >
              {formatPercentage(stats.worstExecution)}
            </Typography>
          </Box>
        </Box>
      </ZenCard>
    </Box>
  )
}

// Order execution timeline
interface ExecutionTimelineProps {
  executions: Array<{
    id: string
    timestamp: Date
    symbol: string
    side: 'buy' | 'sell'
    quantity: number
    price: number
    executionPrice: number
    executionTime: number
    slippage: number
  }>
}

export function ExecutionTimeline({ executions }: ExecutionTimelineProps) {
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value)
  }

  return (
    <ZenCard title="Recent Executions" noPadding>
      <Box sx={{ p: 0 }}>
        {executions.map((execution, index) => {
          const slippageColor = execution.slippage > 0 
            ? DesignSystem.colors.market.down 
            : execution.slippage < 0 
            ? DesignSystem.colors.market.up 
            : DesignSystem.colors.neutral[600]

          return (
            <Box key={execution.id}>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body1" weight="semibold" sx={{ marginBottom: 0 }}>
                        {execution.symbol}
                      </Typography>
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: DesignSystem.radius.base,
                          backgroundColor: execution.side === 'buy' 
                            ? `${DesignSystem.colors.market.up}20` 
                            : `${DesignSystem.colors.market.down}20`,
                          color: execution.side === 'buy' 
                            ? DesignSystem.colors.market.up 
                            : DesignSystem.colors.market.down,
                        }}
                      >
                        <Typography variant="caption" weight="medium" sx={{ marginBottom: 0 }}>
                          {execution.side.toUpperCase()}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="muted" sx={{ marginBottom: 0 }}>
                      {execution.timestamp.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="mono" sx={{ marginBottom: 0 }}>
                      {execution.quantity} @ {formatPrice(execution.executionPrice)}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        marginBottom: 0,
                        color: slippageColor,
                        fontWeight: DesignSystem.typography.primary.weights.medium
                      }}
                    >
                      Slippage: {execution.slippage > 0 ? '+' : ''}{execution.slippage.toFixed(3)}%
                    </Typography>
                  </Box>
                </Box>
                
                {/* Execution Details */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: 2,
                  p: 2,
                  backgroundColor: DesignSystem.colors.neutral[100],
                  borderRadius: DesignSystem.radius.base,
                }}>
                  <Box>
                    <Typography variant="caption" color="muted" sx={{ marginBottom: 0 }}>
                      Order Price
                    </Typography>
                    <Typography variant="mono" sx={{ marginBottom: 0 }}>
                      {formatPrice(execution.price)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="muted" sx={{ marginBottom: 0 }}>
                      Execution Price
                    </Typography>
                    <Typography variant="mono" sx={{ marginBottom: 0 }}>
                      {formatPrice(execution.executionPrice)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="muted" sx={{ marginBottom: 0 }}>
                      Time to Fill
                    </Typography>
                    <Typography variant="mono" sx={{ marginBottom: 0 }}>
                      {execution.executionTime}ms
                    </Typography>
                  </Box>
                </Box>
              </Box>
              {index < executions.length - 1 && <Divider />}
            </Box>
          )
        })}
      </Box>
    </ZenCard>
  )
}