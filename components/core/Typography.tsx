/**
 * Typography System - Ellen Lupton Inspired
 * 
 * Clear hierarchy for financial data with semantic meaning
 * Following "Thinking with Type" principles
 */

import React from 'react'
import { typography, ds } from '@/lib/design/TufteDesignSystem'

// Base typography component with semantic variants
interface TypographyProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  as?: keyof JSX.IntrinsicElements
}

// Critical P&L Display - Highest hierarchy
export const CriticalMetric: React.FC<TypographyProps & { 
  value: number
  currency?: string 
}> = ({ 
  value, 
  currency = 'USD', 
  className = '', 
  style = {},
  as: Component = 'div' 
}) => {
  const isPositive = value >= 0
  const formatValue = (val: number) => {
    const formatted = Math.abs(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    return `${val < 0 ? '-' : '+'}${currency === 'USD' ? '$' : ''}${formatted}${currency !== 'USD' ? ` ${currency}` : ''}`
  }

  return (
    <Component
      className={`critical-metric ${className}`}
      style={{
        ...typography.display('critical'),
        color: isPositive ? ds.colors.semantic.profit : ds.colors.semantic.loss,
        ...style
      }}
    >
      {formatValue(value)}
    </Component>
  )
}

// Primary Metric Display - For key trading metrics
export const PrimaryMetric: React.FC<TypographyProps & { 
  value: string | number
  label?: string
  unit?: string
}> = ({ 
  value, 
  label, 
  unit, 
  className = '', 
  style = {},
  as: Component = 'div' 
}) => (
  <Component className={`primary-metric ${className}`}>
    {label && (
      <div style={{
        ...typography.label(),
        color: ds.colors.neutral[400],
        marginBottom: ds.spacing.xs
      }}>
        {label}
      </div>
    )}
    <div style={{
      ...typography.metric('primary'),
      color: ds.colors.neutral[900],
      ...style
    }}>
      {typeof value === 'number' ? value.toLocaleString() : value}
      {unit && <span style={{ color: ds.colors.neutral[400] }}> {unit}</span>}
    </div>
  </Component>
)

// Secondary Metric - Supporting data
export const SecondaryMetric: React.FC<TypographyProps & { 
  value: string | number
  label?: string
  change?: number
}> = ({ 
  value, 
  label, 
  change, 
  className = '', 
  style = {},
  as: Component = 'div' 
}) => (
  <Component className={`secondary-metric ${className}`}>
    {label && (
      <div style={{
        ...typography.label(),
        color: ds.colors.neutral[400],
        marginBottom: ds.spacing.xs
      }}>
        {label}
      </div>
    )}
    <div style={{ display: 'flex', alignItems: 'baseline', gap: ds.spacing.sm }}>
      <span style={{
        ...typography.metric('secondary'),
        color: ds.colors.neutral[900],
        ...style
      }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      {change !== undefined && (
        <span style={{
          ...typography.body('sm'),
          color: change >= 0 ? ds.colors.semantic.profit : ds.colors.semantic.loss,
          fontWeight: ds.typography.weights.medium
        }}>
          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
        </span>
      )}
    </div>
  </Component>
)

// Data Label - For table headers and form labels
export const DataLabel: React.FC<TypographyProps> = ({ 
  children, 
  className = '', 
  style = {},
  as: Component = 'label' 
}) => (
  <Component
    className={`data-label ${className}`}
    style={{
      ...typography.label(),
      color: ds.colors.neutral[400],
      ...style
    }}
  >
    {children}
  </Component>
)

// Body Text - Standard text content
export const Body: React.FC<TypographyProps & { 
  size?: 'sm' | 'base' | 'lg'
  muted?: boolean
}> = ({ 
  children, 
  size = 'base',
  muted = false,
  className = '', 
  style = {},
  as: Component = 'p' 
}) => (
  <Component
    className={`body-text ${className}`}
    style={{
      ...typography.body(size),
      color: muted ? ds.colors.neutral[400] : ds.colors.neutral[900],
      ...style
    }}
  >
    {children}
  </Component>
)

// Inline Code - For symbols, IDs, technical values
export const InlineCode: React.FC<TypographyProps> = ({ 
  children, 
  className = '', 
  style = {},
  as: Component = 'code' 
}) => (
  <Component
    className={`inline-code ${className}`}
    style={{
      fontFamily: ds.typography.secondary,
      fontSize: ds.typography.scale.sm,
      fontWeight: ds.typography.weights.medium,
      color: ds.colors.neutral[900],
      backgroundColor: ds.colors.neutral[50],
      padding: `${ds.spacing.xs} ${ds.spacing.sm}`,
      borderRadius: ds.radius.sm,
      border: `1px solid ${ds.colors.semantic.border}`,
      ...style
    }}
  >
    {children}
  </Component>
)

// Status Indicator - For order status, system state
export const StatusText: React.FC<TypographyProps & { 
  status: 'active' | 'inactive' | 'warning' | 'critical' | 'success'
}> = ({ 
  children, 
  status,
  className = '', 
  style = {},
  as: Component = 'span' 
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'active': return ds.colors.semantic.active
      case 'success': return ds.colors.semantic.profit
      case 'warning': return ds.colors.semantic.warning
      case 'critical': return ds.colors.semantic.critical
      case 'inactive': return ds.colors.semantic.inactive
      default: return ds.colors.neutral[400]
    }
  }

  return (
    <Component
      className={`status-text ${className}`}
      style={{
        ...typography.body('sm'),
        fontWeight: ds.typography.weights.medium,
        color: getStatusColor(),
        ...style
      }}
    >
      {children}
    </Component>
  )
}

// Price Display - Specialized for financial values
export const Price: React.FC<{
  value: number
  currency?: string
  change?: number
  size?: 'sm' | 'base' | 'lg'
  className?: string
  style?: React.CSSProperties
}> = ({ 
  value, 
  currency = 'USD',
  change,
  size = 'base',
  className = '', 
  style = {} 
}) => {
  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: currency === 'BTC' ? 8 : 2
    })
  }

  return (
    <div className={`price-display ${className}`} style={style}>
      <span style={{
        ...typography.metric(size === 'lg' ? 'primary' : 'secondary'),
        color: ds.colors.neutral[900],
        fontFeatureSettings: '"tnum" 1', // Tabular numbers for alignment
      }}>
        {currency === 'USD' && '$'}{formatPrice(value)}{currency !== 'USD' && ` ${currency}`}
      </span>
      {change !== undefined && (
        <span style={{
          ...typography.body('sm'),
          color: change >= 0 ? ds.colors.semantic.profit : ds.colors.semantic.loss,
          fontWeight: ds.typography.weights.medium,
          marginLeft: ds.spacing.sm
        }}>
          ({change >= 0 ? '+' : ''}{change.toFixed(2)}%)
        </span>
      )}
    </div>
  )
}

// Timestamp - For showing time data
export const Timestamp: React.FC<{
  date: Date | string | number
  format?: 'short' | 'long' | 'time' | 'relative'
  className?: string
  style?: React.CSSProperties
}> = ({ 
  date, 
  format = 'short',
  className = '', 
  style = {} 
}) => {
  const formatDate = (d: Date | string | number) => {
    const dateObj = new Date(d)
    
    switch (format) {
      case 'short':
        return dateObj.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      case 'long':
        return dateObj.toLocaleDateString('en-US', { 
          year: 'numeric',
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      case 'time':
        return dateObj.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      case 'relative':
        const now = new Date()
        const diff = now.getTime() - dateObj.getTime()
        const minutes = Math.floor(diff / 60000)
        if (minutes < 1) return 'Just now'
        if (minutes < 60) return `${minutes}m ago`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours}h ago`
        const days = Math.floor(hours / 24)
        return `${days}d ago`
      default:
        return dateObj.toISOString()
    }
  }

  return (
    <time
      className={`timestamp ${className}`}
      dateTime={new Date(date).toISOString()}
      style={{
        ...typography.body('sm'),
        color: ds.colors.neutral[400],
        fontFamily: ds.typography.secondary, // Monospace for consistent width
        ...style
      }}
    >
      {formatDate(date)}
    </time>
  )
}

// Export all components for easy importing
export const Typography = {
  CriticalMetric,
  PrimaryMetric,
  SecondaryMetric,
  DataLabel,
  Body,
  InlineCode,
  StatusText,
  Price,
  Timestamp,
}