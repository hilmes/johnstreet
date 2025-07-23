'use client'

import React from 'react'
import { Box, Typography, Card } from '@mui/material'
import { DesignSystem } from '@/lib/design/DesignSystem'
import Sparkline from './Sparkline'
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material'

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  sparklineData?: number[]
  format?: (value: any) => string
  subtitle?: string
  dense?: boolean
  onClick?: () => void
}

export default function MetricCard({
  title,
  value,
  change,
  changeLabel,
  sparklineData,
  format,
  subtitle,
  dense = false,
  onClick
}: MetricCardProps) {
  const formattedValue = format ? format(value) : value
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0
  const isNeutral = change === 0

  const getTrendIcon = () => {
    if (change === undefined) return null
    if (isPositive) return <TrendingUp sx={{ fontSize: 16 }} />
    if (isNegative) return <TrendingDown sx={{ fontSize: 16 }} />
    return <TrendingFlat sx={{ fontSize: 16 }} />
  }

  const getChangeColor = () => {
    if (isPositive) return DesignSystem.colors.market.up
    if (isNegative) return DesignSystem.colors.market.down
    return DesignSystem.colors.neutral[600]
  }

  return (
    <Card
      onClick={onClick}
      sx={{
        padding: dense ? DesignSystem.spacing[3] : DesignSystem.spacing[4],
        backgroundColor: DesignSystem.colors.background.secondary,
        border: `1px solid ${DesignSystem.colors.neutral[300]}`,
        borderRadius: DesignSystem.radius.base,
        boxShadow: 'none',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 200ms ease',
        '&:hover': onClick ? {
          boxShadow: DesignSystem.shadows.sm,
          borderColor: DesignSystem.colors.neutral[400],
        } : {},
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* Title */}
        <Typography
          variant="caption"
          sx={{
            color: DesignSystem.colors.neutral[600],
            fontSize: DesignSystem.typography.scale.xs,
            fontWeight: DesignSystem.typography.primary.weights.medium,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {title}
        </Typography>

        {/* Value and sparkline */}
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
          <Typography
            variant={dense ? 'h5' : 'h4'}
            sx={{
              color: DesignSystem.colors.neutral.black,
              fontWeight: DesignSystem.typography.primary.weights.semibold,
              fontSize: dense ? DesignSystem.typography.scale.lg : DesignSystem.typography.scale.xl,
              lineHeight: 1,
              fontFamily: DesignSystem.typography.secondary.fontFamily,
              letterSpacing: '-0.02em',
            }}
          >
            {formattedValue}
          </Typography>
          {sparklineData && (
            <Box sx={{ ml: 'auto' }}>
              <Sparkline
                data={sparklineData}
                width={dense ? 60 : 80}
                height={dense ? 20 : 24}
                color={getChangeColor()}
                showArea
              />
            </Box>
          )}
        </Box>

        {/* Subtitle or change */}
        {(subtitle || change !== undefined) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {change !== undefined ? (
              <>
                {getTrendIcon()}
                <Typography
                  variant="body2"
                  sx={{
                    color: getChangeColor(),
                    fontSize: DesignSystem.typography.scale.sm,
                    fontWeight: DesignSystem.typography.primary.weights.medium,
                    fontFamily: DesignSystem.typography.secondary.fontFamily,
                  }}
                >
                  {isPositive && '+'}
                  {format ? format(change) : `${change}%`}
                </Typography>
                {changeLabel && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: DesignSystem.colors.neutral[600],
                      fontSize: DesignSystem.typography.scale.sm,
                      ml: 0.5,
                    }}
                  >
                    {changeLabel}
                  </Typography>
                )}
              </>
            ) : (
              <Typography
                variant="body2"
                sx={{
                  color: DesignSystem.colors.neutral[600],
                  fontSize: DesignSystem.typography.scale.sm,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Card>
  )
}