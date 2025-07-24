/**
 * DataTable Component - Tufte Inspired
 * 
 * Following Tufte's principles:
 * - Maximize data-ink ratio
 * - Clear hierarchy through typography
 * - Minimal visual elements that don't compete with data
 * - Precise alignment for rapid scanning
 */

import React, { useMemo, useState } from 'react'
import { ds, typography } from '@/lib/design/TufteDesignSystem'
import { Typography } from './Typography'
import { InlineSparkline } from './Sparkline'

interface Column<T> {
  key: keyof T | string
  label: string
  width?: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  render?: (value: any, row: T, index: number) => React.ReactNode
  type?: 'text' | 'number' | 'currency' | 'percentage' | 'change' | 'sparkline' | 'timestamp'
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  className?: string
  style?: React.CSSProperties
  sortable?: boolean
  striped?: boolean
  condensed?: boolean
  onRowClick?: (row: T, index: number) => void
  emptyMessage?: string
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  className = '',
  style = {},
  sortable = false,
  striped = false,
  condensed = false,
  onRowClick,
  emptyMessage = 'No data available'
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  } | null>(null)

  // Sort data based on current sort configuration
  const sortedData = useMemo(() => {
    if (!sortConfig) return data

    return [...data].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key)
      const bValue = getNestedValue(b, sortConfig.key)

      if (aValue === bValue) return 0

      const comparison = aValue < bValue ? -1 : 1
      return sortConfig.direction === 'desc' ? comparison * -1 : comparison
    })
  }, [data, sortConfig])

  // Handle column sorting
  const handleSort = (key: string) => {
    if (!sortable) return

    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' }
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' }
      }
      return null // Reset to no sort
    })
  }

  // Get nested object value by string path
  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  // Render cell content based on type
  const renderCell = (column: Column<T>, value: any, row: T, index: number) => {
    // Custom render function takes precedence
    if (column.render) {
      return column.render(value, row, index)
    }

    // Handle different data types
    switch (column.type) {
      case 'number':
        return (
          <span style={{ fontFamily: ds.typography.secondary }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
        )

      case 'currency':
        return (
          <Typography.Price 
            value={typeof value === 'number' ? value : parseFloat(value) || 0}
            size="sm"
          />
        )

      case 'percentage':
        const numValue = typeof value === 'number' ? value : parseFloat(value) || 0
        return (
          <span style={{
            fontFamily: ds.typography.secondary,
            color: numValue >= 0 ? ds.colors.semantic.profit : ds.colors.semantic.loss,
            fontWeight: ds.typography.weights.medium
          }}>
            {numValue >= 0 ? '+' : ''}{numValue.toFixed(2)}%
          </span>
        )

      case 'change':
        const changeValue = typeof value === 'number' ? value : parseFloat(value) || 0
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: ds.spacing.xs }}>
            <span style={{
              fontFamily: ds.typography.secondary,
              color: changeValue >= 0 ? ds.colors.semantic.profit : ds.colors.semantic.loss,
              fontWeight: ds.typography.weights.medium
            }}>
              {changeValue >= 0 ? '+' : ''}{changeValue.toFixed(2)}%
            </span>
            {/* Optional: Add trend arrow */}
            <span style={{ 
              color: changeValue >= 0 ? ds.colors.semantic.profit : ds.colors.semantic.loss,
              fontSize: ds.typography.scale.xs
            }}>
              {changeValue >= 0 ? '↗' : '↘'}
            </span>
          </div>
        )

      case 'sparkline':
        return Array.isArray(value) ? (
          <InlineSparkline data={value} />
        ) : null

      case 'timestamp':
        return (
          <Typography.Timestamp 
            date={value} 
            format="short"
          />
        )

      default:
        return value
    }
  }

  if (data.length === 0) {
    return (
      <div 
        className={`data-table-empty ${className}`}
        style={{
          padding: ds.spacing.xl,
          textAlign: 'center',
          color: ds.colors.neutral[400],
          ...style
        }}
      >
        <Typography.Body muted>{emptyMessage}</Typography.Body>
      </div>
    )
  }

  const rowHeight = condensed ? '32px' : '48px'
  const cellPadding = condensed ? ds.spacing.sm : ds.spacing.md

  return (
    <div 
      className={`data-table ${className}`}
      style={{
        overflow: 'auto',
        border: `1px solid ${ds.colors.semantic.border}`,
        borderRadius: ds.radius.md,
        backgroundColor: ds.colors.semantic.background,
        ...style
      }}
    >
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: ds.typography.scale.sm,
        lineHeight: 1.2
      }}>
        {/* Table Header */}
        <thead>
          <tr style={{
            backgroundColor: ds.colors.neutral[50],
            borderBottom: `2px solid ${ds.colors.semantic.border}`
          }}>
            {columns.map((column, index) => (
              <th
                key={String(column.key)}
                onClick={() => (sortable && column.sortable !== false) ? handleSort(String(column.key)) : undefined}
                style={{
                  ...typography.label(),
                  textAlign: column.align || 'left',
                  padding: cellPadding,
                  cursor: (sortable && column.sortable !== false) ? 'pointer' : 'default',
                  userSelect: 'none',
                  width: column.width,
                  position: 'sticky',
                  top: 0,
                  backgroundColor: ds.colors.neutral[50],
                  zIndex: 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: ds.spacing.xs }}>
                  {column.label}
                  {sortable && column.sortable !== false && sortConfig?.key === String(column.key) && (
                    <span style={{ 
                      fontSize: ds.typography.scale.xs,
                      color: ds.colors.semantic.active
                    }}>
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* Table Body */}
        <tbody>
          {sortedData.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              onClick={() => onRowClick?.(row, rowIndex)}
              style={{
                height: rowHeight,
                backgroundColor: striped && rowIndex % 2 === 1 ? ds.colors.neutral[50] : 'transparent',
                borderBottom: `1px solid ${ds.colors.semantic.border}`,
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background-color 150ms ease'
              }}
              onMouseEnter={(e) => {
                if (onRowClick) {
                  e.currentTarget.style.backgroundColor = ds.colors.neutral[100]
                }
              }}
              onMouseLeave={(e) => {
                if (onRowClick) {
                  e.currentTarget.style.backgroundColor = 
                    striped && rowIndex % 2 === 1 ? ds.colors.neutral[50] : 'transparent'
                }
              }}
            >
              {columns.map((column, columnIndex) => {
                const value = getNestedValue(row, String(column.key))
                
                return (
                  <td
                    key={columnIndex}
                    style={{
                      padding: cellPadding,
                      textAlign: column.align || 'left',
                      verticalAlign: 'middle',
                      color: ds.colors.neutral[900],
                      fontSize: ds.typography.scale.sm,
                      fontWeight: ds.typography.weights.regular
                    }}
                  >
                    {renderCell(column, value, row, rowIndex)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Specialized tables for financial data
export const TradesTable: React.FC<{
  trades: Array<{
    symbol: string
    side: 'buy' | 'sell'
    quantity: number
    price: number
    timestamp: string | Date
    pnl?: number
  }>
  onTradeClick?: (trade: any) => void
}> = ({ trades, onTradeClick }) => {
  const columns: Column<any>[] = [
    { key: 'timestamp', label: 'Time', type: 'timestamp', width: '120px' },
    { key: 'symbol', label: 'Symbol', width: '80px' },
    { 
      key: 'side', 
      label: 'Side', 
      width: '60px',
      render: (value) => (
        <Typography.StatusText status={value === 'buy' ? 'success' : 'critical'}>
          {value.toUpperCase()}
        </Typography.StatusText>
      )
    },
    { key: 'quantity', label: 'Qty', type: 'number', align: 'right', width: '100px' },
    { key: 'price', label: 'Price', type: 'currency', align: 'right', width: '120px' },
    { 
      key: 'pnl', 
      label: 'P&L', 
      type: 'currency', 
      align: 'right', 
      width: '100px',
      render: (value) => value !== undefined ? (
        <Typography.Price value={value} size="sm" />
      ) : null
    }
  ]

  return (
    <DataTable
      data={trades}
      columns={columns}
      onRowClick={onTradeClick}
      condensed
      striped
    />
  )
}

export const PositionsTable: React.FC<{
  positions: Array<{
    symbol: string
    side: 'long' | 'short'
    size: number
    avgPrice: number
    currentPrice: number
    unrealizedPnl: number
    change: number
    priceHistory?: number[]
  }>
  onPositionClick?: (position: any) => void
}> = ({ positions, onPositionClick }) => {
  const columns: Column<any>[] = [
    { key: 'symbol', label: 'Symbol', width: '100px' },
    { 
      key: 'side', 
      label: 'Side', 
      width: '60px',
      render: (value) => (
        <Typography.StatusText status={value === 'long' ? 'success' : 'warning'}>
          {value.toUpperCase()}
        </Typography.StatusText>
      )
    },
    { key: 'size', label: 'Size', type: 'number', align: 'right', width: '100px' },
    { key: 'avgPrice', label: 'Avg Price', type: 'currency', align: 'right', width: '120px' },
    { key: 'currentPrice', label: 'Current', type: 'currency', align: 'right', width: '120px' },
    { key: 'change', label: 'Change', type: 'change', align: 'right', width: '100px' },
    { key: 'unrealizedPnl', label: 'Unrealized P&L', type: 'currency', align: 'right', width: '120px' },
    { 
      key: 'priceHistory', 
      label: 'Trend', 
      type: 'sparkline', 
      align: 'center', 
      width: '80px',
      sortable: false
    }
  ]

  return (
    <DataTable
      data={positions}
      columns={columns}
      onRowClick={onPositionClick}
      sortable
    />
  )
}

export default DataTable