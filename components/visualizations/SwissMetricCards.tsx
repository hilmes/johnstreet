/**
 * Swiss Trading MetricCard - Excellence Edition
 * 
 * High-density metric cards optimized for trading interfaces
 * - Risk-first information hierarchy
 * - Swiss typography discipline
 * - Dark theme optimized
 * - Dense data presentation
 * - Real-time update animations
 */

'use client'

import React, { useState, useEffect } from 'react'
import { swissTrading as ds } from '@/lib/design'

interface BaseMetricCardProps {
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  loading?: boolean
  animated?: boolean
  realtime?: boolean
}

// Hero P&L Card - For critical portfolio metrics
export const HeroPnLCard: React.FC<BaseMetricCardProps & {
  value: number
  previousValue?: number
  currency?: string
  timeframe: string
  breakdown?: {
    realized: number
    unrealized: number
  }
  trend?: number[]
}> = ({ 
  value, 
  previousValue,
  currency = 'USD',
  timeframe,
  breakdown,
  trend,
  className = '',
  style = {},
  onClick,
  loading = false,
  animated = true,
  realtime = false
}) => {
  const [displayValue, setDisplayValue] = useState(value)
  const change = previousValue !== undefined ? value - previousValue : 0
  const changePercent = previousValue !== undefined && previousValue !== 0 ? 
    ((value - previousValue) / Math.abs(previousValue)) * 100 : 0

  // Animate value changes
  useEffect(() => {
    if (animated && !loading) {
      const steps = 30
      const stepValue = (value - displayValue) / steps
      let currentStep = 0
      
      const interval = setInterval(() => {
        currentStep++
        if (currentStep >= steps) {
          setDisplayValue(value)
          clearInterval(interval)
        } else {
          setDisplayValue(prev => prev + stepValue)
        }
      }, 16) // ~60fps
      
      return () => clearInterval(interval)
    } else {
      setDisplayValue(value)
    }
  }, [value, animated, loading])

  return (
    <div
      className={`hero-pnl-card ${className}`}
      style={{
        backgroundColor: ds.colors.surface.elevated,
        border: `1px solid ${ds.colors.surface.border}`,
        borderRadius: ds.radii.md,
        padding: ds.spacing.xl,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 300ms ease',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
      onClick={onClick}
    >
      {/* Realtime indicator */}
      {realtime && (
        <div style={{
          position: 'absolute',
          top: ds.spacing.sm,
          right: ds.spacing.sm,
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: ds.colors.trading.profit,
          animation: 'pulse 2s infinite',
        }} />
      )}

      {loading ? (
        <div style={{
          height: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: ds.colors.text.secondary,
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: `3px solid ${ds.colors.surface.border}`,
            borderTop: `3px solid ${ds.colors.trading.profit}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
        </div>
      ) : (
        <>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: ds.spacing.lg,
          }}>
            <div>
              <div style={{
                fontSize: ds.typography.scale.metadata,
                color: ds.colors.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: ds.typography.weights.medium,
                marginBottom: ds.spacing.xs,
              }}>
                Portfolio P&L
              </div>
              <div style={{
                fontSize: ds.typography.scale.metadata,
                color: ds.colors.text.secondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {timeframe}
              </div>
            </div>

            {/* Mini trend sparkline */}
            {trend && trend.length > 0 && (
              <div style={{
                width: '80px',
                height: '20px',
                position: 'relative',
              }}>
                <svg width="80" height="20" style={{ overflow: 'visible' }}>
                  <polyline
                    points={trend.map((value, index) => 
                      `${(index / (trend.length - 1)) * 76 + 2},${18 - ((value - Math.min(...trend)) / (Math.max(...trend) - Math.min(...trend))) * 16}`
                    ).join(' ')}
                    fill="none"
                    stroke={value >= (trend[0] || 0) ? ds.colors.trading.profit : ds.colors.trading.loss}
                    strokeWidth="1.5"
                    opacity={0.8}
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Main Value */}
          <div style={{
            marginBottom: ds.spacing.md,
          }}>
            <div style={{
              fontSize: ds.typography.scale.critical,
              fontWeight: ds.typography.weights.bold,
              fontFamily: ds.typography.fonts.data,
              color: displayValue >= 0 ? ds.colors.trading.profit : ds.colors.trading.loss,
              lineHeight: 0.9,
              marginBottom: ds.spacing.xs,
              filter: displayValue !== value ? 'blur(0.5px)' : 'none',
              transition: 'filter 150ms ease',
            }}>
              {displayValue >= 0 ? '+' : ''}${Math.abs(displayValue).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </div>

            {/* Change indicator */}
            {change !== 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: ds.spacing.sm,
              }}>
                <span style={{
                  fontSize: ds.typography.scale.body,
                  fontWeight: ds.typography.weights.semibold,
                  fontFamily: ds.typography.fonts.data,
                  color: change >= 0 ? ds.colors.trading.profit : ds.colors.trading.loss,
                }}>
                  {change >= 0 ? '+' : ''}${change.toFixed(2)}
                </span>
                <span style={{
                  fontSize: ds.typography.scale.body,
                  fontWeight: ds.typography.weights.medium,
                  color: ds.colors.text.muted,
                }}>
                  ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>

          {/* Breakdown */}
          {breakdown && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: ds.spacing.lg,
              paddingTop: ds.spacing.md,
              borderTop: `1px solid ${ds.colors.surface.border}`,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: ds.typography.scale.metadata,
                  color: ds.colors.text.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: ds.spacing.xs,
                }}>
                  Realized
                </div>
                <div style={{
                  fontSize: ds.typography.scale.secondary,
                  fontWeight: ds.typography.weights.semibold,
                  fontFamily: ds.typography.fonts.data,
                  color: breakdown.realized >= 0 ? ds.colors.trading.profit : ds.colors.trading.loss,
                }}>
                  {breakdown.realized >= 0 ? '+' : ''}${breakdown.realized.toFixed(2)}
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: ds.typography.scale.metadata,
                  color: ds.colors.text.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: ds.spacing.xs,
                }}>
                  Unrealized
                </div>
                <div style={{
                  fontSize: ds.typography.scale.secondary,
                  fontWeight: ds.typography.weights.semibold,
                  fontFamily: ds.typography.fonts.data,
                  color: breakdown.unrealized >= 0 ? ds.colors.trading.profit : ds.colors.trading.loss,
                }}>
                  {breakdown.unrealized >= 0 ? '+' : ''}${breakdown.unrealized.toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// Dense Metric Grid - For displaying multiple related metrics
export const DenseMetricGrid: React.FC<BaseMetricCardProps & {
  title: string
  metrics: Array<{
    label: string
    value: string | number
    unit?: string
    status?: 'profit' | 'loss' | 'neutral' | 'warning' | 'critical'
    change?: number
    precision?: number
  }>
  columns?: number
}> = ({ 
  title,
  metrics,
  columns = 4,
  className = '',
  style = {},
  onClick,
  loading = false
}) => (
  <div
    className={`dense-metric-grid ${className}`}
    style={{
      backgroundColor: ds.colors.surface.elevated,
      border: `1px solid ${ds.colors.surface.border}`,
      borderRadius: ds.radii.md,
      padding: ds.spacing.lg,
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }}
    onClick={onClick}
  >
    {/* Header */}
    <div style={{
      marginBottom: ds.spacing.lg,
      paddingBottom: ds.spacing.sm,
      borderBottom: `1px solid ${ds.colors.surface.border}`,
    }}>
      <h3 style={{
        margin: 0,
        fontSize: ds.typography.scale.body,
        fontWeight: ds.typography.weights.semibold,
        color: ds.colors.text.primary,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {title}
      </h3>
    </div>

    {loading ? (
      <div style={{
        height: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: ds.colors.text.muted,
      }}>
        Loading metrics...
      </div>
    ) : (
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: ds.spacing.lg,
      }}>
        {metrics.map((metric, index) => {
          const statusColor = metric.status === 'profit' ? ds.colors.trading.profit :
                            metric.status === 'loss' ? ds.colors.trading.loss :
                            metric.status === 'warning' ? ds.colors.trading.warning :
                            metric.status === 'critical' ? ds.colors.trading.critical :
                            ds.colors.text.primary

          return (
            <div key={index} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: ds.typography.scale.secondary,
                fontWeight: ds.typography.weights.semibold,
                fontFamily: ds.typography.fonts.data,
                color: statusColor,
                lineHeight: 1,
                marginBottom: ds.spacing.xs,
              }}>
                {typeof metric.value === 'number' ? 
                  metric.value.toFixed(metric.precision || 2) : 
                  metric.value}
                {metric.unit && (
                  <span style={{
                    fontSize: ds.typography.scale.metadata,
                    marginLeft: ds.spacing.xs,
                    opacity: 0.8,
                  }}>
                    {metric.unit}
                  </span>
                )}
              </div>
              
              <div style={{
                fontSize: ds.typography.scale.metadata,
                color: ds.colors.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: ds.spacing.xs,
              }}>
                {metric.label}
              </div>
              
              {metric.change !== undefined && (
                <div style={{
                  fontSize: ds.typography.scale.metadata,
                  color: metric.change >= 0 ? ds.colors.trading.profit : ds.colors.trading.loss,
                  fontWeight: ds.typography.weights.medium,
                }}>
                  {metric.change >= 0 ? '+' : ''}{metric.change.toFixed(2)}%
                </div>
              )}
            </div>
          )
        })}
      </div>
    )}
  </div>
)

export default {
  HeroPnLCard,
  DenseMetricGrid,
}