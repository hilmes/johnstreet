/**
 * Sparkline Component - Edward Tufte Inspired
 * 
 * "A sparkline is a small intense, simple, word-sized graphic with typographic resolution"
 * - Edward Tufte
 * 
 * Designed to be embedded inline with text, showing data trends at a glance
 */

import React, { useMemo } from 'react'
import { ds, dataviz } from '@/lib/design/TufteDesignSystem'
import { useLivePrice } from '@/app/hooks/useLivePrices'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  className?: string
  style?: React.CSSProperties
  showDots?: boolean
  showArea?: boolean
  strokeWidth?: number
  type?: 'line' | 'area' | 'bar'
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = ds.dataviz.charts.sparkline.width,
  height = ds.dataviz.charts.sparkline.height,
  color,
  className = '',
  style = {},
  showDots = false,
  showArea = false,
  strokeWidth = 1.5,
  type = 'line'
}) => {
  const sparklineData = useMemo(() => {
    if (!data || data.length === 0) return null

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1 // Avoid division by zero

    // Calculate points
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return { x, y, value }
    })

    // Create SVG path
    const pathData = points.reduce((path, point, index) => {
      const command = index === 0 ? 'M' : 'L'
      return `${path} ${command} ${point.x} ${point.y}`
    }, '').trim()

    // Create area path if needed
    const areaPath = showArea ? 
      `${pathData} L ${width} ${height} L 0 ${height} Z` : ''

    return {
      points,
      pathData,
      areaPath,
      min,
      max,
      range,
      isPositiveTrend: data[data.length - 1] >= data[0]
    }
  }, [data, width, height, showArea])

  if (!sparklineData) return null

  // Determine color based on trend if not specified
  const lineColor = color || (
    sparklineData.isPositiveTrend ? 
    ds.colors.semantic.profit : 
    ds.colors.semantic.loss
  )

  const areaColor = `${lineColor}20` // 20% opacity

  if (type === 'bar') {
    return (
      <svg
        width={width}
        height={height}
        className={`sparkline-bars ${className}`}
        style={style}
        viewBox={`0 0 ${width} ${height}`}
      >
        {sparklineData.points.map((point, index) => {
          const barWidth = width / data.length * 0.8
          const barHeight = Math.max(1, (point.value - sparklineData.min) / sparklineData.range * height)
          const barX = point.x - barWidth / 2
          const barY = height - barHeight

          return (
            <rect
              key={index}
              x={barX}
              y={barY}
              width={barWidth}
              height={barHeight}
              fill={lineColor}
              opacity={0.7}
            />
          )
        })}
      </svg>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      className={`sparkline ${className}`}
      style={style}
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Area fill */}
      {showArea && (
        <path
          d={sparklineData.areaPath}
          fill={areaColor}
          stroke="none"
        />
      )}
      
      {/* Main line */}
      <path
        d={sparklineData.pathData}
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Data points */}
      {showDots && sparklineData.points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={1.5}
          fill={lineColor}
          stroke={ds.colors.semantic.background}
          strokeWidth={0.5}
        />
      ))}
      
      {/* First and last point highlights */}
      {data.length > 1 && (
        <>
          <circle
            cx={sparklineData.points[0].x}
            cy={sparklineData.points[0].y}
            r={1}
            fill={ds.colors.neutral[400]}
          />
          <circle
            cx={sparklineData.points[sparklineData.points.length - 1].x}
            cy={sparklineData.points[sparklineData.points.length - 1].y}
            r={1.5}
            fill={lineColor}
            stroke={ds.colors.semantic.background}
            strokeWidth={1}
          />
        </>
      )}
    </svg>
  )
}

// Specialized sparklines for financial data
export const PriceSparkline: React.FC<{
  prices: number[]
  width?: number
  height?: number
  className?: string
  style?: React.CSSProperties
}> = ({ prices, ...props }) => {
  const trend = prices.length > 1 ? 
    (prices[prices.length - 1] - prices[0]) / prices[0] : 0

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: ds.spacing.xs }}>
      <Sparkline
        data={prices}
        showArea={true}
        strokeWidth={1}
        {...props}
      />
      <span style={{
        fontSize: ds.typography.scale.xs,
        color: trend >= 0 ? ds.colors.semantic.profit : ds.colors.semantic.loss,
        fontWeight: ds.typography.weights.medium,
        fontFamily: ds.typography.secondary
      }}>
        {trend >= 0 ? '+' : ''}{(trend * 100).toFixed(1)}%
      </span>
    </div>
  )
}

export const VolumeSparkline: React.FC<{
  volumes: number[]
  width?: number
  height?: number
  className?: string
  style?: React.CSSProperties
}> = ({ volumes, ...props }) => (
  <Sparkline
    data={volumes}
    type="bar"
    color={ds.colors.semantic.volume}
    {...props}
  />
)

// Inline sparkline for embedding in text
export const InlineSparkline: React.FC<{
  data: number[]
  color?: string
}> = ({ data, color }) => (
  <Sparkline
    data={data}
    width={60}
    height={16}
    color={color}
    strokeWidth={1}
    style={{ 
      verticalAlign: 'middle',
      marginLeft: ds.spacing.xs,
      marginRight: ds.spacing.xs
    }}
  />
)

// Live sparkline that connects to WebSocket feed
export const LivePriceSparkline: React.FC<{
  symbol: string
  width?: number
  height?: number
  className?: string
  style?: React.CSSProperties
  showChange?: boolean
  maxPoints?: number
}> = ({ 
  symbol, 
  showChange = true, 
  maxPoints = 20,
  ...props 
}) => {
  // Use live price data if available, otherwise use initial prices
  const { priceHistory } = useLivePrice(symbol)
  const displayPrices = priceHistory?.length > 0 ? priceHistory.slice(-maxPoints) : prices

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: ds.spacing.xs }}>
      <PriceSparkline prices={displayPrices} {...props} />
      {showChange && (
        <span style={{
          fontSize: ds.typography.scale.xs,
          color: ds.colors.neutral[400],
          fontFamily: ds.typography.secondary
        }}>
          {symbol}
        </span>
      )}
    </div>
  )
}

export default Sparkline