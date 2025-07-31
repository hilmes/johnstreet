'use client'

import React from 'react'
import { Box, LinearProgress, Chip } from '@mui/material'
import { DesignSystem } from '@/lib/design'
import { Typography as MuiTypography } from '@mui/material'
import { Warning, CheckCircle, Error } from '@mui/icons-material'

interface RiskMetric {
  name: string
  value: number
  threshold: number
  unit?: string
  description?: string
}

interface RiskMetricsProps {
  metrics: RiskMetric[]
  overallRisk: 'low' | 'medium' | 'high'
  riskScore: number
}

export default function RiskMetrics({ metrics, overallRisk, riskScore }: RiskMetricsProps) {
  const getRiskColor = (value: number, threshold: number) => {
    const ratio = value / threshold
    if (ratio <= 0.5) return DesignSystem.colors.market.up
    if (ratio <= 0.8) return DesignSystem.colors.market.warning
    return DesignSystem.colors.market.down
  }

  const getRiskIcon = (value: number, threshold: number) => {
    const ratio = value / threshold
    if (ratio <= 0.5) return <CheckCircle sx={{ fontSize: 16 }} />
    if (ratio <= 0.8) return <Warning sx={{ fontSize: 16 }} />
    return <Error sx={{ fontSize: 16 }} />
  }

  const overallRiskConfig = {
    low: {
      color: DesignSystem.colors.market.up,
      backgroundColor: `${DesignSystem.colors.market.up}20`,
      label: 'Low Risk',
    },
    medium: {
      color: DesignSystem.colors.market.warning,
      backgroundColor: `${DesignSystem.colors.market.warning}20`,
      label: 'Medium Risk',
    },
    high: {
      color: DesignSystem.colors.market.down,
      backgroundColor: `${DesignSystem.colors.market.down}20`,
      label: 'High Risk',
    },
  }

  const config = overallRiskConfig[overallRisk]

  return (
    <Box>
      {/* Overall Risk Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 4,
        pb: 3,
        borderBottom: `1px solid ${DesignSystem.colors.neutral[200]}`
      }}>
        <Box>
          <MuiTypography variant="h5" sx={{ marginBottom: 1 }}>
            Risk Assessment
          </MuiTypography>
          <MuiTypography variant="body2" sx={{ marginBottom: 0, color: DesignSystem.colors.text.muted }}>
            Real-time portfolio risk analysis
          </MuiTypography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={config.label}
            sx={{
              backgroundColor: config.backgroundColor,
              color: config.color,
              fontWeight: DesignSystem.typography.weights.medium,
              fontSize: DesignSystem.typography.scale.sm,
            }}
          />
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="label">Risk Score</Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                marginBottom: 0,
                color: config.color,
                fontWeight: DesignSystem.typography.weights.semibold
              }}
            >
              {riskScore}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Individual Metrics */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {metrics.map((metric) => {
          const color = getRiskColor(metric.value, metric.threshold)
          const icon = getRiskIcon(metric.value, metric.threshold)
          const progress = Math.min((metric.value / metric.threshold) * 100, 100)

          return (
            <Box key={metric.name}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ color }}>{icon}</Box>
                  <Typography variant="body1" weight="medium" sx={{ marginBottom: 0 }}>
                    {metric.name}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography 
                    variant="mono" 
                    weight="medium" 
                    sx={{ marginBottom: 0, color }}
                  >
                    {metric.value.toFixed(2)}{metric.unit || ''}
                  </Typography>
                  <Typography variant="caption" color="muted" sx={{ marginBottom: 0 }}>
                    / {metric.threshold}{metric.unit || ''}
                  </Typography>
                </Box>
              </Box>
              
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: DesignSystem.colors.neutral[200],
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: color,
                    borderRadius: 3,
                  },
                }}
              />
              
              {metric.description && (
                <Typography variant="caption" color="muted" sx={{ mt: 0.5, marginBottom: 0 }}>
                  {metric.description}
                </Typography>
              )}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

// Compact risk indicator for dashboards
interface RiskIndicatorProps {
  label: string
  value: number
  max: number
  status: 'safe' | 'warning' | 'danger'
  compact?: boolean
}

export function RiskIndicator({ label, value, max, status, compact = false }: RiskIndicatorProps) {
  const statusConfig = {
    safe: {
      color: DesignSystem.colors.market.up,
      icon: <CheckCircle sx={{ fontSize: compact ? 14 : 16 }} />,
    },
    warning: {
      color: DesignSystem.colors.market.warning,
      icon: <Warning sx={{ fontSize: compact ? 14 : 16 }} />,
    },
    danger: {
      color: DesignSystem.colors.market.down,
      icon: <Error sx={{ fontSize: compact ? 14 : 16 }} />,
    },
  }

  const config = statusConfig[status]
  const percentage = (value / max) * 100

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ color: config.color }}>{config.icon}</Box>
        <Typography variant="caption" sx={{ marginBottom: 0 }}>
          {label}
        </Typography>
        <Typography 
          variant="mono" 
          sx={{ 
            marginBottom: 0, 
            color: config.color,
            fontSize: DesignSystem.typography.scale.xs,
            fontWeight: DesignSystem.typography.weights.medium
          }}
        >
          {value.toFixed(1)}
        </Typography>
      </Box>
    )
  }

  return (
    <ZenCard>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color: config.color }}>{config.icon}</Box>
          <Typography variant="body2" weight="medium" sx={{ marginBottom: 0 }}>
            {label}
          </Typography>
        </Box>
        <Typography 
          variant="mono" 
          weight="medium" 
          sx={{ marginBottom: 0, color: config.color }}
        >
          {value.toFixed(2)} / {max}
        </Typography>
      </Box>
      
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: DesignSystem.colors.neutral[200],
          '& .MuiLinearProgress-bar': {
            backgroundColor: config.color,
            borderRadius: 4,
          },
        }}
      />
    </ZenCard>
  )
}