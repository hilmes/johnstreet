/**
 * Strategy card component for displaying individual strategy information
 */
'use client'

import React, { memo } from 'react'
import { Strategy } from '../types'
import { dieterRamsDesign as ds } from '@/lib/design/DieterRamsDesignSystem'

interface StrategyCardProps {
  strategy: Strategy
  onSelect?: (strategy: Strategy) => void
  onEdit?: (strategy: Strategy) => void
  onDelete?: (strategyId: string) => void
}

/**
 * Displays a strategy card with performance metrics and actions
 */
export const StrategyCard = memo<StrategyCardProps>(({ 
  strategy, 
  onSelect, 
  onEdit, 
  onDelete 
}) => {
  const getStatusColor = (status: Strategy['status']) => {
    switch (status) {
      case 'active': return ds.colors.success
      case 'paused': return ds.colors.warning
      case 'stopped': return ds.colors.error
      case 'testing': return ds.colors.info
      default: return ds.colors.text.secondary
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  return (
    <div
      style={{
        ...ds.containers.card,
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
      onClick={() => onSelect?.(strategy)}
      onMouseEnter={(e) => {
        if (onSelect) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = ds.shadows.medium
        }
      }}
      onMouseLeave={(e) => {
        if (onSelect) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = ds.shadows.subtle
        }
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: ds.spacing.md 
      }}>
        <div>
          <h3 style={{ 
            ...ds.typography.h3, 
            margin: 0,
            marginBottom: ds.spacing.xs 
          }}>
            {strategy.name}
          </h3>
          <p style={{ 
            ...ds.typography.body, 
            color: ds.colors.text.secondary,
            margin: 0,
            fontSize: '0.9rem'
          }}>
            {strategy.description}
          </p>
        </div>
        <div style={{
          display: 'flex',
          gap: ds.spacing.xs,
          alignItems: 'center'
        }}>
          <span
            style={{
              ...ds.typography.caption,
              backgroundColor: getStatusColor(strategy.status),
              color: ds.colors.background.primary,
              padding: `${ds.spacing.xs} ${ds.spacing.sm}`,
              borderRadius: ds.borderRadius.small,
              textTransform: 'uppercase',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}
          >
            {strategy.status}
          </span>
        </div>
      </div>

      {/* Performance Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: ds.spacing.md,
        marginBottom: ds.spacing.lg
      }}>
        <div>
          <div style={{ ...ds.typography.caption, color: ds.colors.text.secondary }}>
            Total P&L
          </div>
          <div style={{ 
            ...ds.typography.h4, 
            color: strategy.performance.totalPnl >= 0 ? ds.colors.success : ds.colors.error,
            margin: 0
          }}>
            {formatCurrency(strategy.performance.totalPnl)}
          </div>
        </div>
        <div>
          <div style={{ ...ds.typography.caption, color: ds.colors.text.secondary }}>
            Win Rate
          </div>
          <div style={{ ...ds.typography.h4, margin: 0 }}>
            {formatPercentage(strategy.performance.winRate)}
          </div>
        </div>
        <div>
          <div style={{ ...ds.typography.caption, color: ds.colors.text.secondary }}>
            Sharpe Ratio
          </div>
          <div style={{ ...ds.typography.h4, margin: 0 }}>
            {strategy.performance.sharpeRatio.toFixed(2)}
          </div>
        </div>
        <div>
          <div style={{ ...ds.typography.caption, color: ds.colors.text.secondary }}>
            Max Drawdown
          </div>
          <div style={{ ...ds.typography.h4, margin: 0 }}>
            {formatPercentage(strategy.performance.maxDrawdown)}
          </div>
        </div>
      </div>

      {/* Meta Information */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.85rem',
        color: ds.colors.text.secondary,
        borderTop: `1px solid ${ds.colors.border}`,
        paddingTop: ds.spacing.sm
      }}>
        <span>
          {strategy.timeframe} • {strategy.symbols.join(', ')}
        </span>
        <span>
          {strategy.performance.totalTrades} trades
        </span>
      </div>

      {/* Actions */}
      {(onEdit || onDelete) && (
        <div style={{
          display: 'flex',
          gap: ds.spacing.sm,
          marginTop: ds.spacing.md,
          paddingTop: ds.spacing.sm,
          borderTop: `1px solid ${ds.colors.border}`
        }}>
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(strategy)
              }}
              style={{
                ...ds.buttons.secondary,
                flex: 1,
                fontSize: '0.85rem'
              }}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Delete strategy "${strategy.name}"?`)) {
                  onDelete(strategy.id)
                }
              }}
              style={{
                ...ds.buttons.danger,
                flex: 1,
                fontSize: '0.85rem'
              }}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
})

StrategyCard.displayName = 'StrategyCard'