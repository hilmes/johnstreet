/**
 * MetricCard Component
 * 
 * Reusable metric display card following AI-GUIDELINES.md standards:
 * - TypeScript-first with comprehensive error handling
 * - Performance optimized with React.memo and useMemo
 * - Swiss design principles with clear data presentation
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { MetricCardProps } from '../types'
import { Card } from '../ui/Card'
import { Spinner } from '../ui/Spinner'

/**
 * Performance-optimized metric card with trend indicators
 */
export const MetricCard = React.memo<MetricCardProps>(({
  title,
  value,
  change,
  changeType = 'percentage',
  trend,
  description,
  loading = false,
  className,
  'data-testid': testId,
  children,
  ...props
}) => {
  const formattedValue = React.useMemo(() => {
    if (loading) return null
    
    if (typeof value === 'number') {
      return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
      }).format(value)
    }
    
    return value
  }, [value, loading])

  const formattedChange = React.useMemo(() => {
    if (!change || loading) return null
    
    const prefix = change > 0 ? '+' : ''
    const suffix = changeType === 'percentage' ? '%' : ''
    
    return `${prefix}${change.toFixed(2)}${suffix}`
  }, [change, changeType, loading])

  const trendColor = React.useMemo(() => {
    if (!trend || loading) return 'text-gray-500'
    
    switch (trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-500'
    }
  }, [trend, loading])

  const trendIcon = React.useMemo(() => {
    if (!trend || loading) return null
    
    switch (trend) {
      case 'up':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        )
      case 'down':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        )
    }
  }, [trend, loading])

  return (
    <Card
      className={cn('relative', className)}
      data-testid={testId}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
          <Spinner size="md" />
        </div>
      )}
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-600 truncate">
          {title}
        </h3>
        
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold text-gray-900">
            {formattedValue}
          </span>
          
          {formattedChange && (
            <div className={cn('flex items-center space-x-1 text-sm font-medium', trendColor)}>
              {trendIcon}
              <span>{formattedChange}</span>
            </div>
          )}
        </div>
        
        {description && (
          <p className="text-xs text-gray-500">
            {description}
          </p>
        )}
        
        {children}
      </div>
    </Card>
  )
})

MetricCard.displayName = 'MetricCard'