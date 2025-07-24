/**
 * MetricCard Component - Swiss Design Inspired
 * 
 * Clean, minimal cards for displaying key financial metrics
 * Following principles of Josef Müller-Brockmann and Massimo Vignelli
 */

import React from 'react'
import { ds, layout } from '@/lib/design/TufteDesignSystem'
import { Typography } from './Typography'
import { PriceSparkline, VolumeSparkline, InlineSparkline } from './Sparkline'

interface BaseMetricCardProps {
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  loading?: boolean
}

// Primary Metric Card - For key P&L and performance metrics
export const PrimaryMetricCard: React.FC<BaseMetricCardProps & {
  title: string
  value: number
  currency?: string
  change?: number
  changeLabel?: string
  trend?: number[]
  subtitle?: string
}> = ({ 
  title, 
  value, 
  currency = 'USD',
  change,
  changeLabel = '24h',
  trend,
  subtitle,
  className = '',
  style = {},
  onClick,
  loading = false 
}) => (
  <div
    className={`metric-card primary ${className}`}
    style={{
      ...layout.card(),
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 150ms ease',
      ...style
    }}
    onClick={onClick}
    onMouseEnter={(e) => {
      if (onClick) {
        e.currentTarget.style.borderColor = ds.colors.semantic.active
        e.currentTarget.style.boxShadow = ds.shadows.subtle
      }
    }}
    onMouseLeave={(e) => {
      if (onClick) {
        e.currentTarget.style.borderColor = ds.colors.semantic.border
        e.currentTarget.style.boxShadow = ds.shadows.none
      }
    }}
  >
    {loading ? (
      <div style={{ 
        height: '80px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: ds.colors.neutral[400]
      }}>
        Loading...
      </div>
    ) : (
      <>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: ds.spacing.md
        }}>
          <div>
            <Typography.DataLabel>{title}</Typography.DataLabel>
            {subtitle && (
              <Typography.Body size="sm" muted style={{ marginTop: ds.spacing.xs }}>
                {subtitle}
              </Typography.Body>
            )}
          </div>
          {trend && (
            <PriceSparkline 
              prices={trend} 
              width={60} 
              height={20}
            />
          )}
        </div>

        {/* Value */}
        <div style={{ marginBottom: ds.spacing.sm }}>
          <Typography.CriticalMetric 
            value={value} 
            currency={currency}
          />
        </div>

        {/* Change indicator */}
        {change !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: ds.spacing.sm }}>
            <Typography.Body size="sm" muted>{changeLabel}:</Typography.Body>
            <span style={{
              fontSize: ds.typography.scale.sm,
              fontWeight: ds.typography.weights.medium,
              color: change >= 0 ? ds.colors.semantic.profit : ds.colors.semantic.loss
            }}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)}%
            </span>
          </div>
        )}
      </>
    )}
  </div>
)

// Secondary Metric Card - For supporting metrics
export const SecondaryMetricCard: React.FC<BaseMetricCardProps & {
  title: string
  value: string | number
  unit?: string
  change?: number
  status?: 'positive' | 'negative' | 'neutral' | 'warning'
  compact?: boolean
}> = ({ 
  title, 
  value, 
  unit,
  change,
  status,
  compact = false,
  className = '',
  style = {},
  onClick,
  loading = false 
}) => (
  <div
    className={`metric-card secondary ${className}`}
    style={{
      ...layout.card(),
      padding: compact ? ds.spacing.md : ds.spacing.lg,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 150ms ease',
      ...style
    }}
    onClick={onClick}
  >
    {loading ? (
      <div style={{ 
        height: compact ? '40px' : '60px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: ds.colors.neutral[400]
      }}>
        Loading...
      </div>
    ) : (
      <>
        <Typography.DataLabel style={{ marginBottom: ds.spacing.xs }}>
          {title}
        </Typography.DataLabel>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'baseline', 
          justifyContent: 'space-between',
          gap: ds.spacing.sm
        }}>
          <Typography.PrimaryMetric 
            value={value} 
            unit={unit}
          />
          
          {change !== undefined && (
            <span style={{
              fontSize: ds.typography.scale.sm,
              fontWeight: ds.typography.weights.medium,
              color: status === 'positive' || (status === undefined && change >= 0) ? 
                ds.colors.semantic.profit : 
                status === 'negative' || (status === undefined && change < 0) ?
                ds.colors.semantic.loss :
                status === 'warning' ?
                ds.colors.semantic.warning :
                ds.colors.neutral[400]
            }}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)}%
            </span>
          )}
        </div>
      </>
    )}
  </div>
)

// Status Card - For system states and alerts
export const StatusCard: React.FC<BaseMetricCardProps & {
  title: string
  status: 'active' | 'inactive' | 'warning' | 'critical' | 'success'
  message: string
  details?: string
  actionLabel?: string
  onAction?: () => void
}> = ({ 
  title, 
  status,
  message,
  details,
  actionLabel,
  onAction,
  className = '',
  style = {},
  onClick,
  loading = false 
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'active':
      case 'success': return ds.colors.semantic.profit
      case 'warning': return ds.colors.semantic.warning
      case 'critical': return ds.colors.semantic.critical
      case 'inactive': return ds.colors.semantic.inactive
      default: return ds.colors.neutral[400]
    }
  }

  const statusColor = getStatusColor()

  return (
    <div
      className={`metric-card status ${className}`}
      style={{
        ...layout.card(),
        borderLeft: `4px solid ${statusColor}`,
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      onClick={onClick}
    >
      {loading ? (
        <div style={{ 
          height: '60px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: ds.colors.neutral[400]
        }}>
          Loading...
        </div>
      ) : (
        <>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            marginBottom: ds.spacing.sm
          }}>
            <Typography.DataLabel>{title}</Typography.DataLabel>
            <Typography.StatusText status={status}>
              {status.toUpperCase()}
            </Typography.StatusText>
          </div>

          <Typography.Body style={{ marginBottom: ds.spacing.sm }}>
            {message}
          </Typography.Body>

          {details && (
            <Typography.Body size="sm" muted style={{ marginBottom: ds.spacing.sm }}>
              {details}
            </Typography.Body>
          )}

          {actionLabel && onAction && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAction()
              }}
              style={{
                background: 'none',
                border: `1px solid ${statusColor}`,
                color: statusColor,
                padding: `${ds.spacing.xs} ${ds.spacing.sm}`,
                borderRadius: ds.radius.sm,
                fontSize: ds.typography.scale.sm,
                fontWeight: ds.typography.weights.medium,
                cursor: 'pointer',
                transition: 'all 150ms ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = statusColor
                e.currentTarget.style.color = ds.colors.semantic.background
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = statusColor
              }}
            >
              {actionLabel}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// Comparison Card - For comparing two metrics
export const ComparisonCard: React.FC<BaseMetricCardProps & {
  title: string
  primary: {
    label: string
    value: number
    currency?: string
  }
  secondary: {
    label: string
    value: number
    currency?: string
  }
  trend?: number[]
}> = ({ 
  title, 
  primary,
  secondary,
  trend,
  className = '',
  style = {},
  onClick,
  loading = false 
}) => (
  <div
    className={`metric-card comparison ${className}`}
    style={{
      ...layout.card(),
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }}
    onClick={onClick}
  >
    {loading ? (
      <div style={{ 
        height: '80px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: ds.colors.neutral[400]
      }}>
        Loading...
      </div>
    ) : (
      <>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: ds.spacing.lg
        }}>
          <Typography.DataLabel>{title}</Typography.DataLabel>
          {trend && (
            <InlineSparkline data={trend} />
          )}
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gap: ds.spacing.lg
        }}>
          <div>
            <Typography.Body size="sm" muted style={{ marginBottom: ds.spacing.xs }}>
              {primary.label}
            </Typography.Body>
            <Typography.Price 
              value={primary.value} 
              currency={primary.currency}
              size="lg"
            />
          </div>
          
          <div>
            <Typography.Body size="sm" muted style={{ marginBottom: ds.spacing.xs }}>
              {secondary.label}
            </Typography.Body>
            <Typography.Price 
              value={secondary.value} 
              currency={secondary.currency}
              size="lg"
            />
          </div>
        </div>
      </>
    )}
  </div>
)

// Chart Card - For embedding small visualizations
export const ChartCard: React.FC<BaseMetricCardProps & {
  title: string
  subtitle?: string
  children: React.ReactNode
  actions?: React.ReactNode
}> = ({ 
  title, 
  subtitle,
  children,
  actions,
  className = '',
  style = {},
  onClick,
  loading = false 
}) => (
  <div
    className={`metric-card chart ${className}`}
    style={{
      ...layout.card(),
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }}
    onClick={onClick}
  >
    {/* Header */}
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start',
      marginBottom: ds.spacing.lg
    }}>
      <div>
        <Typography.DataLabel>{title}</Typography.DataLabel>
        {subtitle && (
          <Typography.Body size="sm" muted style={{ marginTop: ds.spacing.xs }}>
            {subtitle}
          </Typography.Body>
        )}
      </div>
      {actions}
    </div>

    {/* Chart Content */}
    {loading ? (
      <div style={{ 
        height: '120px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: ds.colors.neutral[400]
      }}>
        Loading chart...
      </div>
    ) : (
      children
    )}
  </div>
)

export default {
  PrimaryMetricCard,
  SecondaryMetricCard,
  StatusCard,
  ComparisonCard,
  ChartCard
}