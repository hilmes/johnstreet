'use client'

import React, { useState } from 'react'
import { Box, Typography, Card } from '@mui/material'
import { DesignSystem } from '@/lib/design/DesignSystem'
import Sparkline from './Sparkline'
import { TrendingUp, TrendingDown, TrendingFlat, ErrorOutline, CheckCircleOutline } from '@mui/icons-material'

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
  loading?: boolean
  error?: string
  priority?: 'high' | 'medium' | 'low'
  status?: 'normal' | 'warning' | 'critical' | 'success'
  context?: string
  interactive?: boolean
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
  onClick,
  loading = false,
  error,
  priority = 'medium',
  status = 'normal',
  context,
  interactive = true
}: MetricCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  
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

  const getStatusColor = () => {
    switch (status) {
      case 'critical': return DesignSystem.colors.semantic?.critical || '#dc2626'
      case 'warning': return DesignSystem.colors.semantic?.warning || '#f59e0b'
      case 'success': return DesignSystem.colors.semantic?.success || '#10b981'
      default: return 'transparent'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'critical':
      case 'warning':
        return <ErrorOutline sx={{ fontSize: 16, color: getStatusColor() }} />
      case 'success':
        return <CheckCircleOutline sx={{ fontSize: 16, color: getStatusColor() }} />
      default:
        return null
    }
  }

  const getPriorityElevation = () => {
    switch (priority) {
      case 'high': return 2
      case 'medium': return 1
      case 'low': return 0
      default: return 1
    }
  }

  // Loading state
  if (loading) {
    return (
      <Card
        sx={{
          padding: dense ? DesignSystem.spacing[3] : DesignSystem.spacing[4],
          backgroundColor: DesignSystem.colors.background.secondary,
          border: `1px solid ${DesignSystem.colors.neutral[300]}`,
          borderRadius: DesignSystem.radius.base,
          boxShadow: 'none',
          minHeight: dense ? '100px' : '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              border: `2px solid ${DesignSystem.colors.neutral[300]}`,
              borderTop: `2px solid ${DesignSystem.colors.primary[500] || '#3b82f6'}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' },
              },
            }}
          />
          <Typography
            variant="body2"
            sx={{
              color: DesignSystem.colors.neutral[600],
              fontSize: DesignSystem.typography.scale.xs,
            }}
          >
            Loading...
          </Typography>
        </Box>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card
        sx={{
          padding: dense ? DesignSystem.spacing[3] : DesignSystem.spacing[4],
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: DesignSystem.radius.base,
          borderLeft: '4px solid #dc2626',
          boxShadow: 'none',
          minHeight: dense ? '100px' : '120px',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ErrorOutline sx={{ fontSize: 16, color: '#dc2626' }} />
            <Typography
              variant="caption"
              sx={{
                color: '#dc2626',
                fontSize: DesignSystem.typography.scale.xs,
                fontWeight: DesignSystem.typography.primary.weights.medium,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Error Loading {title}
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{
              color: '#dc2626',
              fontSize: DesignSystem.typography.scale.sm,
            }}
          >
            {error}
          </Typography>
        </Box>
      </Card>
    )
  }

  return (
    <Card
      onClick={interactive && onClick ? onClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      tabIndex={interactive && onClick ? 0 : -1}
      sx={{
        padding: dense ? DesignSystem.spacing[3] : DesignSystem.spacing[4],
        backgroundColor: status !== 'normal' ? 
          `${getStatusColor()}08` : DesignSystem.colors.background.secondary,
        border: `1px solid ${
          status !== 'normal' ? getStatusColor() : DesignSystem.colors.neutral[300]
        }`,
        borderLeft: status !== 'normal' ? `4px solid ${getStatusColor()}` : undefined,
        borderRadius: DesignSystem.radius.base,
        boxShadow: getPriorityElevation() > 0 ? DesignSystem.shadows.sm : 'none',
        cursor: interactive && onClick ? 'pointer' : 'default',
        transition: 'all 200ms ease-out',
        position: 'relative',
        overflow: 'hidden',
        transform: (isHovered || isFocused) && interactive && onClick ? 
          'translateY(-2px)' : 'translateY(0)',
        '&:hover': interactive && onClick ? {
          boxShadow: DesignSystem.shadows.md,
          borderColor: status !== 'normal' ? getStatusColor() : DesignSystem.colors.primary[400] || '#60a5fa',
        } : {},
        '&:focus': {
          outline: `2px solid ${DesignSystem.colors.primary[500] || '#3b82f6'}`,
          outlineOffset: '2px',
        },
        '&:active': interactive && onClick ? {
          transform: 'translateY(0)',
          boxShadow: DesignSystem.shadows.sm,
        } : {},
      }}
      role={interactive && onClick ? 'button' : undefined}
      aria-label={interactive && onClick ? `${title}: ${formattedValue}` : undefined}
    >
      {/* Priority indicator */}
      {priority === 'high' && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 0,
            height: 0,
            borderLeft: '16px solid transparent',
            borderTop: `16px solid ${DesignSystem.colors.warning || '#f59e0b'}`,
          }}
        />
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* Enhanced Title with Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          {getStatusIcon()}
        </Box>

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

        {/* Enhanced Subtitle or change with context */}
        {(subtitle || change !== undefined || context) && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {change !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
              </Box>
            )}
            
            {subtitle && !change && (
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
            
            {context && (
              <Typography
                variant="body2"
                sx={{
                  color: DesignSystem.colors.neutral[500],
                  fontSize: DesignSystem.typography.scale.xs,
                  fontStyle: 'italic',
                  opacity: 0.8,
                }}
              >
                {context}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Interactive indicator */}
      {interactive && onClick && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: DesignSystem.colors.neutral[400],
            opacity: isHovered ? 0.8 : 0.4,
            transition: 'opacity 150ms ease',
          }}
        />
      )}
    </Card>
  )
}