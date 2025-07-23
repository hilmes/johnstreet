'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import { DesignSystem } from '@/lib/design/DesignSystem'

interface RiskGaugeProps {
  value: number // 0-100
  label?: string
  size?: number
  thresholds?: {
    low: number
    medium: number
    high: number
  }
  showValue?: boolean
  format?: (value: number) => string
}

export default function RiskGauge({
  value,
  label,
  size = 120,
  thresholds = { low: 30, medium: 60, high: 80 },
  showValue = true,
  format
}: RiskGaugeProps) {
  const clampedValue = Math.max(0, Math.min(100, value))
  
  // Calculate angle (180 degree arc)
  const angle = (clampedValue / 100) * 180
  const angleRadians = (angle - 90) * (Math.PI / 180)
  
  // Calculate position on arc
  const radius = size / 2 - 10
  const x = size / 2 + radius * Math.cos(angleRadians)
  const y = size / 2 + radius * Math.sin(angleRadians)

  // Determine color based on thresholds
  const getColor = () => {
    if (clampedValue <= thresholds.low) return DesignSystem.colors.market.up
    if (clampedValue <= thresholds.medium) return DesignSystem.colors.market.warning
    if (clampedValue <= thresholds.high) return DesignSystem.colors.market.down
    return DesignSystem.colors.market.down
  }

  const color = getColor()

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: 1
    }}>
      <Box
        component="svg"
        width={size}
        height={size / 2 + 20}
        viewBox={`0 0 ${size} ${size / 2 + 20}`}
      >
        {/* Background arc */}
        <path
          d={`M ${10} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
          fill="none"
          stroke={DesignSystem.colors.neutral[200]}
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Risk zones */}
        <path
          d={`M ${10} ${size / 2} A ${radius} ${radius} 0 0 1 ${size / 2 + radius * Math.cos((thresholds.low * 1.8 - 90) * Math.PI / 180)} ${size / 2 + radius * Math.sin((thresholds.low * 1.8 - 90) * Math.PI / 180)}`}
          fill="none"
          stroke={DesignSystem.colors.market.up}
          strokeWidth="8"
          strokeLinecap="round"
          opacity={0.3}
        />
        
        <path
          d={`M ${size / 2 + radius * Math.cos((thresholds.low * 1.8 - 90) * Math.PI / 180)} ${size / 2 + radius * Math.sin((thresholds.low * 1.8 - 90) * Math.PI / 180)} A ${radius} ${radius} 0 0 1 ${size / 2 + radius * Math.cos((thresholds.medium * 1.8 - 90) * Math.PI / 180)} ${size / 2 + radius * Math.sin((thresholds.medium * 1.8 - 90) * Math.PI / 180)}`}
          fill="none"
          stroke={DesignSystem.colors.market.warning}
          strokeWidth="8"
          opacity={0.3}
        />
        
        <path
          d={`M ${size / 2 + radius * Math.cos((thresholds.medium * 1.8 - 90) * Math.PI / 180)} ${size / 2 + radius * Math.sin((thresholds.medium * 1.8 - 90) * Math.PI / 180)} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
          fill="none"
          stroke={DesignSystem.colors.market.down}
          strokeWidth="8"
          strokeLinecap="round"
          opacity={0.3}
        />

        {/* Value arc */}
        <path
          d={`M ${10} ${size / 2} A ${radius} ${radius} 0 ${angle > 180 ? 1 : 0} 1 ${x} ${y}`}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Needle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r="4"
          fill={DesignSystem.colors.neutral[700]}
        />
        <line
          x1={size / 2}
          y1={size / 2}
          x2={x}
          y2={y}
          stroke={DesignSystem.colors.neutral[700]}
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Value text */}
        {showValue && (
          <>
            <text
              x={size / 2}
              y={size / 2 - 10}
              textAnchor="middle"
              fontSize={DesignSystem.typography.scale.xl}
              fontWeight={DesignSystem.typography.primary.weights.semibold}
              fill={DesignSystem.colors.neutral.black}
              fontFamily={DesignSystem.typography.secondary.fontFamily}
            >
              {format ? format(clampedValue) : Math.round(clampedValue)}
            </text>
            <text
              x={size / 2}
              y={size / 2 + 8}
              textAnchor="middle"
              fontSize={DesignSystem.typography.scale.xs}
              fill={DesignSystem.colors.neutral[600]}
              fontFamily={DesignSystem.typography.primary.fontFamily}
            >
              RISK SCORE
            </text>
          </>
        )}

        {/* Labels */}
        <text
          x={10}
          y={size / 2 + 15}
          textAnchor="start"
          fontSize="10"
          fill={DesignSystem.colors.neutral[600]}
          fontFamily={DesignSystem.typography.primary.fontFamily}
        >
          LOW
        </text>
        <text
          x={size - 10}
          y={size / 2 + 15}
          textAnchor="end"
          fontSize="10"
          fill={DesignSystem.colors.neutral[600]}
          fontFamily={DesignSystem.typography.primary.fontFamily}
        >
          HIGH
        </text>
      </Box>

      {label && (
        <Typography
          variant="caption"
          sx={{
            color: DesignSystem.colors.neutral[600],
            fontSize: DesignSystem.typography.scale.sm,
            textAlign: 'center',
          }}
        >
          {label}
        </Typography>
      )}
    </Box>
  )
}