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
import { swissTradingDesignSystem as ds, tradingTheme } from '@/lib/design/SwissTradingDesignSystem'

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
        ...tradingTheme.tradingCard(true),
        padding: ds.trading.spacing.xl,
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
          top: ds.trading.spacing.sm,
          right: ds.trading.spacing.sm,
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: ds.trading.colors.profit,
          animation: 'pulse 2s infinite',
        }} />
      )}

      {loading ? (
        <div style={{
          height: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: ds.trading.colors.textMuted,
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: `3px solid ${ds.trading.colors.border}`,
            borderTop: `3px solid ${ds.trading.colors.profit}`,
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
            marginBottom: ds.trading.spacing.lg,
          }}>
            <div>
              <div style={{
                fontSize: ds.trading.typography.scale.xs,
                color: ds.trading.colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: ds.trading.typography.weights.medium,
                marginBottom: ds.trading.spacing.xxs,
              }}>
                Portfolio P&L
              </div>
              <div style={{
                fontSize: ds.trading.typography.scale.xxs,
                color: ds.trading.colors.textSubtle,
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
                    stroke={value >= (trend[0] || 0) ? ds.trading.colors.profit : ds.trading.colors.loss}
                    strokeWidth="1.5"
                    opacity={0.8}
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Main Value */}
          <div style={{
            marginBottom: ds.trading.spacing.md,
          }}>
            <div style={{
              fontSize: ds.trading.typography.scale.hero,
              fontWeight: ds.trading.typography.weights.black,
              fontFamily: ds.trading.typography.trading,
              color: displayValue >= 0 ? ds.trading.colors.profit : ds.trading.colors.loss,
              lineHeight: 0.9,
              marginBottom: ds.trading.spacing.xs,
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
                gap: ds.trading.spacing.sm,
              }}>
                <span style={{
                  fontSize: ds.trading.typography.scale.sm,
                  fontWeight: ds.trading.typography.weights.semibold,
                  fontFamily: ds.trading.typography.trading,
                  color: change >= 0 ? ds.trading.colors.profit : ds.trading.colors.loss,
                }}>
                  {change >= 0 ? '+' : ''}${change.toFixed(2)}
                </span>
                <span style={{
                  fontSize: ds.trading.typography.scale.sm,
                  fontWeight: ds.trading.typography.weights.medium,
                  color: ds.trading.colors.textMuted,
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
              gap: ds.trading.spacing.lg,
              paddingTop: ds.trading.spacing.md,
              borderTop: `1px solid ${ds.trading.colors.border}`,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: ds.trading.typography.scale.xs,
                  color: ds.trading.colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: ds.trading.spacing.xxs,
                }}>
                  Realized
                </div>
                <div style={{
                  fontSize: ds.trading.typography.scale.lg,
                  fontWeight: ds.trading.typography.weights.semibold,
                  fontFamily: ds.trading.typography.trading,
                  color: breakdown.realized >= 0 ? ds.trading.colors.profit : ds.trading.colors.loss,
                }}>
                  {breakdown.realized >= 0 ? '+' : ''}${breakdown.realized.toFixed(2)}
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: ds.trading.typography.scale.xs,
                  color: ds.trading.colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: ds.trading.spacing.xxs,
                }}>
                  Unrealized
                </div>
                <div style={{
                  fontSize: ds.trading.typography.scale.lg,
                  fontWeight: ds.trading.typography.weights.semibold,
                  fontFamily: ds.trading.typography.trading,
                  color: breakdown.unrealized >= 0 ? ds.trading.colors.profit : ds.trading.colors.loss,
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
      ...tradingTheme.tradingCard(false),
      padding: ds.trading.spacing.lg,
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }}
    onClick={onClick}
  >
    {/* Header */}
    <div style={{
      marginBottom: ds.trading.spacing.lg,
      paddingBottom: ds.trading.spacing.sm,
      borderBottom: `1px solid ${ds.trading.colors.border}`,
    }}>
      <h3 style={{
        margin: 0,
        fontSize: ds.trading.typography.scale.base,
        fontWeight: ds.trading.typography.weights.semibold,
        color: ds.trading.colors.textPrimary,
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
        color: ds.trading.colors.textMuted,
      }}>
        Loading metrics...
      </div>
    ) : (
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: ds.trading.spacing.lg,
      }}>
        {metrics.map((metric, index) => {
          const statusColor = metric.status === 'profit' ? ds.trading.colors.profit :
                            metric.status === 'loss' ? ds.trading.colors.loss :
                            metric.status === 'warning' ? ds.trading.colors.warning :
                            metric.status === 'critical' ? ds.trading.colors.critical :
                            ds.trading.colors.textPrimary

          return (
            <div key={index} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: ds.trading.typography.scale.lg,
                fontWeight: ds.trading.typography.weights.semibold,
                fontFamily: ds.trading.typography.trading,
                color: statusColor,
                lineHeight: 1,
                marginBottom: ds.trading.spacing.xs,
              }}>
                {typeof metric.value === 'number' ? 
                  metric.value.toFixed(metric.precision || 2) : 
                  metric.value}
                {metric.unit && (
                  <span style={{
                    fontSize: ds.trading.typography.scale.xs,
                    marginLeft: ds.trading.spacing.xxs,
                    opacity: 0.8,
                  }}>
                    {metric.unit}
                  </span>
                )}
              </div>
              
              <div style={{
                fontSize: ds.trading.typography.scale.xs,
                color: ds.trading.colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: ds.trading.spacing.xxs,
              }}>
                {metric.label}
              </div>
              
              {metric.change !== undefined && (
                <div style={{
                  fontSize: ds.trading.typography.scale.xxs,
                  color: metric.change >= 0 ? ds.trading.colors.profit : ds.trading.colors.loss,
                  fontWeight: ds.trading.typography.weights.medium,
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

// Risk Status Card - For displaying risk levels with visual indicators
export const RiskStatusCard: React.FC<BaseMetricCardProps & {
  title: string
  riskLevel: number // 0-100
  riskCategory: 'safe' | 'caution' | 'danger' | 'critical'
  details: {
    currentDrawdown: number
    maxDrawdown: number
    positionCount: number
    exposure: number
  }
  alerts?: Array<{
    message: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }>
}> = ({ 
  title,
  riskLevel,
  riskCategory,
  details,
  alerts = [],
  className = '',
  style = {},
  onClick,
  loading = false
}) => {
  const riskStyle = tradingTheme.riskStyle(riskCategory)
  
  return (
    <div
      className={`risk-status-card ${className}`}
      style={{
        ...tradingTheme.tradingCard(false),
        padding: ds.trading.spacing.lg,
        borderLeft: `4px solid ${riskStyle.color}`,
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: ds.trading.spacing.lg,
      }}>
        <h3 style={{
          margin: 0,
          fontSize: ds.trading.typography.scale.base,
          fontWeight: ds.trading.typography.weights.semibold,
          color: ds.trading.colors.textPrimary,
        }}>
          {title}
        </h3>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: ds.trading.spacing.xs,
        }}>
          <span style={tradingTheme.statusIndicator(
            riskCategory === 'critical' ? 'error' : 
            riskCategory === 'danger' ? 'maintenance' : 'online'
          )} />
          <span style={{
            fontSize: ds.trading.typography.scale.xs,
            fontWeight: ds.trading.typography.weights.bold,
            color: riskStyle.color,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {riskCategory}
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{
          height: '100px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: ds.trading.colors.textMuted,
        }}>
          Loading risk data...
        </div>
      ) : (
        <>
          {/* Risk Level Gauge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: ds.trading.spacing.lg,
            marginBottom: ds.trading.spacing.lg,
          }}>
            <div style={{
              flex: 1,
              height: '8px',
              backgroundColor: ds.trading.colors.border,
              borderRadius: '4px',
              overflow: 'hidden',
              position: 'relative',
            }}>
              <div style={{
                width: `${riskLevel}%`,
                height: '100%',
                backgroundColor: riskStyle.color,
                transition: 'width 500ms ease',
              }} />
            </div>
            
            <div style={{
              fontSize: ds.trading.typography.scale.lg,
              fontWeight: ds.trading.typography.weights.bold,
              color: riskStyle.color,
              fontFamily: ds.trading.typography.trading,
              minWidth: '60px',
              textAlign: 'right',
            }}>
              {riskLevel}%
            </div>
          </div>

          {/* Risk Details Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: ds.trading.spacing.lg,
            marginBottom: ds.trading.spacing.lg,
          }}>
            <div>
              <div style={{
                fontSize: ds.trading.typography.scale.xs,
                color: ds.trading.colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: ds.trading.spacing.xxs,
              }}>
                Current DD
              </div>
              <div style={{
                fontSize: ds.trading.typography.scale.sm,
                fontWeight: ds.trading.typography.weights.semibold,
                color: details.currentDrawdown > 0.05 ? ds.trading.colors.loss : ds.trading.colors.textPrimary,
                fontFamily: ds.trading.typography.trading,
              }}>
                {(details.currentDrawdown * 100).toFixed(2)}%
              </div>
            </div>
            
            <div>
              <div style={{
                fontSize: ds.trading.typography.scale.xs,
                color: ds.trading.colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: ds.trading.spacing.xxs,
              }}>
                Max DD
              </div>
              <div style={{
                fontSize: ds.trading.typography.scale.sm,
                fontWeight: ds.trading.typography.weights.semibold,
                color: details.maxDrawdown > 0.1 ? ds.trading.colors.loss : ds.trading.colors.textPrimary,
                fontFamily: ds.trading.typography.trading,
              }}>
                {(details.maxDrawdown * 100).toFixed(2)}%
              </div>
            </div>
            
            <div>
              <div style={{
                fontSize: ds.trading.typography.scale.xs,
                color: ds.trading.colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: ds.trading.spacing.xxs,
              }}>
                Positions
              </div>
              <div style={{
                fontSize: ds.trading.typography.scale.sm,
                fontWeight: ds.trading.typography.weights.semibold,
                color: ds.trading.colors.textPrimary,
                fontFamily: ds.trading.typography.trading,
              }}>
                {details.positionCount}
              </div>
            </div>
            
            <div>
              <div style={{
                fontSize: ds.trading.typography.scale.xs,
                color: ds.trading.colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: ds.trading.spacing.xxs,
              }}>
                Exposure
              </div>
              <div style={{
                fontSize: ds.trading.typography.scale.sm,
                fontWeight: ds.trading.typography.weights.semibold,
                color: ds.trading.colors.textPrimary,
                fontFamily: ds.trading.typography.trading,
              }}>
                ${details.exposure.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div style={{
              paddingTop: ds.trading.spacing.sm,
              borderTop: `1px solid ${ds.trading.colors.border}`,
            }}>
              {alerts.slice(0, 3).map((alert, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: ds.trading.spacing.sm,
                    marginBottom: index < alerts.length - 1 ? ds.trading.spacing.xs : 0,
                  }}
                >
                  <div style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    backgroundColor: alert.severity === 'critical' ? ds.trading.colors.critical :
                                   alert.severity === 'high' ? ds.trading.colors.loss :
                                   alert.severity === 'medium' ? ds.trading.colors.warning :
                                   ds.trading.colors.textMuted,
                  }} />
                  <span style={{
                    fontSize: ds.trading.typography.scale.xs,
                    color: ds.trading.colors.textSecondary,
                    flex: 1,
                  }}>
                    {alert.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default {
  HeroPnLCard,
  DenseMetricGrid,
  RiskStatusCard,
}