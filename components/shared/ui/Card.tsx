/**
 * Card Component
 * 
 * Reusable card component following AI-GUIDELINES.md standards:
 * - TypeScript-first with comprehensive props
 * - Performance optimized with React.memo
 * - Swiss design principles with clean aesthetics
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { CardProps } from '../types'

const variantClasses = {
  elevated: 'bg-white shadow-lg border-0',
  outlined: 'bg-white border border-gray-200 shadow-sm',
  filled: 'bg-gray-50 border-0 shadow-sm'
}

const paddingClasses = {
  xs: 'p-2',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8'
}

/**
 * Versatile card component with hover effects and accessibility
 */
export const Card = React.memo<CardProps>(({
  children,
  variant = 'elevated',
  padding = 'md',
  hover = false,
  className,
  'data-testid': testId,
  ...props
}) => {
  const baseClasses = [
    'rounded-lg transition-all duration-200 ease-in-out'
  ]

  const variantClass = variantClasses[variant]
  const paddingClass = paddingClasses[padding]

  const classes = cn(
    baseClasses,
    variantClass,
    paddingClass,
    {
      'hover:shadow-xl hover:scale-[1.02] cursor-pointer': hover && variant === 'elevated',
      'hover:border-gray-300 hover:shadow-md': hover && variant === 'outlined',
      'hover:bg-gray-100': hover && variant === 'filled'
    },
    className
  )

  return (
    <div
      className={classes}
      data-testid={testId}
      {...props}
    >
      {children}
    </div>
  )
})

Card.displayName = 'Card'