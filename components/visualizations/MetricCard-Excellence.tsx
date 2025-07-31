'use client'

import React from 'react'
import clsx from 'clsx'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

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
  className?: string
}

/**
 * MetricCard - Following Design Excellence Principles
 * 
 * - Typography: Ellen Lupton's clear hierarchy
 * - Layout: Swiss grid system with precise spacing
 * - Data Display: Tufte's high data-ink ratio
 * - Aesthetics: Japanese Ma (negative space) and Kanso (simplicity)
 */
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
  className
}: MetricCardProps) {
  const formattedValue = format ? format(value) : value
  const hasChange = change !== undefined
  const isPositive = hasChange && change > 0
  const isNegative = hasChange && change < 0
  const isNeutral = hasChange && change === 0
  
  // Minimal Sparkline Component - Nicholas Felton Style
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null
    
    const width = dense ? 60 : 80
    const height = dense ? 20 : 28
    const padding = 2
    
    // Normalize data
    const min = Math.min(...sparklineData)
    const max = Math.max(...sparklineData)
    const range = max - min || 1
    
    // Generate path
    const points = sparklineData.map((value, index) => {
      const x = (index / (sparklineData.length - 1)) * (width - 2 * padding) + padding
      const y = height - ((value - min) / range) * (height - 2 * padding) - padding
      return `${x},${y}`
    }).join(' ')
    
    const path = `M ${points}`
    const areaPath = `${path} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`
    
    return (
      <svg
        width={width}
        height={height}
        className="sparkline"
        style={{ overflow: 'visible' }}
      >
        {/* Area under curve - subtle fill */}
        <path
          d={areaPath}
          fill={isPositive ? 'var(--color-profit)' : isNegative ? 'var(--color-loss)' : 'var(--color-neutral)'}
          fillOpacity={0.08}
        />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={isPositive ? 'var(--color-profit)' : isNegative ? 'var(--color-loss)' : 'var(--color-neutral)'}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Final point indicator */}
        <circle
          cx={width - padding}
          cy={height - ((sparklineData[sparklineData.length - 1] - min) / range) * (height - 2 * padding) - padding}
          r={2}
          fill={isPositive ? 'var(--color-profit)' : isNegative ? 'var(--color-loss)' : 'var(--color-neutral)'}
        />
      </svg>
    )
  }
  
  return (
    <div
      className={clsx(
        'surface metric-card',
        dense && 'metric-card--dense',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      style={{
        padding: dense ? 'var(--space-molecule)' : 'var(--space-cell)',
      }}
    >
      {/* Title - Typography Hierarchy */}
      <div className="metric-label type-caption">
        {title}
      </div>
      
      {/* Value & Visual - Data Display */}
      <div className="flex items-end justify-between gap-3 mt-2">
        <div className="metric-value type-metric">
          {formattedValue}
        </div>
        {sparklineData && (
          <div className="flex-shrink-0">
            {renderSparkline()}
          </div>
        )}
      </div>
      
      {/* Change Indicator or Subtitle - Semantic Information */}
      {(hasChange || subtitle) && (
        <div className="flex items-center gap-2 mt-2">
          {hasChange ? (
            <>
              {/* Trend Icon - Minimal, Functional */}
              <div className={clsx(
                'flex items-center justify-center w-4 h-4',
                isPositive && 'text-profit',
                isNegative && 'text-loss',
                isNeutral && 'text-neutral'
              )}>
                {isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                ) : isNegative ? (
                  <TrendingDown className="w-3.5 h-3.5" strokeWidth={2.5} />
                ) : (
                  <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                )}
              </div>
              
              {/* Change Value - Clear Data */}
              <span className={clsx(
                'metric-change type-metric text-sm font-medium',
                isPositive && 'positive',
                isNegative && 'negative',
                isNeutral && 'text-neutral'
              )}>
                {isPositive && '+'}
                {format ? format(change) : `${change.toFixed(2)}%`}
              </span>
              
              {/* Change Label - Context */}
              {changeLabel && (
                <span className="text-muted type-body-small">
                  {changeLabel}
                </span>
              )}
            </>
          ) : (
            <span className="text-secondary type-body-small">
              {subtitle}
            </span>
          )}
        </div>
      )}
      
      <style jsx>{`
        .metric-card {
          display: flex;
          flex-direction: column;
          transition: all var(--duration-fast) var(--easing-standard);
        }
        
        .metric-card:hover {
          transform: translateY(-1px);
        }
        
        .metric-card--dense .metric-value {
          font-size: var(--font-size-medium);
        }
        
        .metric-card--dense .metric-label {
          font-size: var(--font-size-nano);
        }
        
        /* Focus state for accessibility */
        .metric-card:focus-visible {
          outline: 2px solid var(--color-info);
          outline-offset: 2px;
        }
        
        /* Sparkline hover effect */
        .sparkline {
          transition: opacity var(--duration-fast) var(--easing-standard);
        }
        
        .metric-card:hover .sparkline {
          opacity: 0.85;
        }
      `}</style>
    </div>
  )
}