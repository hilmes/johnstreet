'use client'

import React, { useMemo } from 'react'
import { Box } from '@mui/material'
import { DesignSystem } from '@/lib/design'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
  showDots?: boolean
  showArea?: boolean
  reference?: number // Reference line (e.g., zero line)
}

function Sparkline({
  data,
  width = 100,
  height = 20,
  color = DesignSystem.dataViz.sparkline.color,
  strokeWidth = DesignSystem.dataViz.sparkline.strokeWidth,
  showDots = false,
  showArea = false,
  reference
}: SparklineProps) {
  const { path, dots, area, referenceLine } = useMemo(() => {
    if (!data || data.length === 0) return { path: '', dots: [], area: '', referenceLine: null }

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const padding = 2

    // Calculate points
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * (width - 2 * padding) + padding
      const y = height - ((value - min) / range) * (height - 2 * padding) - padding
      return { x, y, value }
    })

    // Generate SVG path
    const pathData = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')

    // Generate area path
    const areaData = showArea
      ? `${pathData} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
      : ''

    // Calculate reference line position
    let refLine = null
    if (reference !== undefined) {
      const refY = height - ((reference - min) / range) * (height - 2 * padding) - padding
      refLine = { y: refY }
    }

    return { path: pathData, dots: points, area: areaData, referenceLine: refLine }
  }, [data, width, height, showArea, reference])

  if (!data || data.length === 0) return null

  return (
    <Box
      component="svg"
      width={width}
      height={height}
      sx={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* Area fill */}
      {showArea && area && (
        <path
          d={area}
          fill={color}
          fillOpacity={0.1}
          stroke="none"
        />
      )}

      {/* Reference line */}
      {referenceLine && (
        <line
          x1={0}
          y1={referenceLine.y}
          x2={width}
          y2={referenceLine.y}
          stroke={DesignSystem.colors.neutral[400]}
          strokeWidth={1}
          strokeDasharray="2,2"
          opacity={0.5}
        />
      )}

      {/* Main line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots */}
      {showDots && dots.map((dot, index) => (
        <circle
          key={index}
          cx={dot.x}
          cy={dot.y}
          r={1.5}
          fill={color}
        />
      ))}
    </Box>
  )
}

export default Sparkline

// Re-export variants
export { PriceSparkline, VolumeSparkline, TrendSparkline, MinimalSparkline } from './SparklineVariants'