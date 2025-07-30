/**
 * Spinner Component
 * 
 * Loading spinner component following AI-GUIDELINES.md standards:
 * - WCAG 2.1 AA accessibility with proper ARIA attributes
 * - Performance optimized with React.memo
 * - TypeScript-first with comprehensive props
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { BaseComponentProps, Size } from '../types'

interface SpinnerProps extends BaseComponentProps {
  size?: Size
  color?: string
}

const sizeVariants = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
}

/**
 * Accessible loading spinner component
 */
export const Spinner = React.memo<SpinnerProps>(({
  size = 'md',
  color = 'currentColor',
  className,
  'data-testid': testId,
  ...props
}) => {
  const sizeClass = sizeVariants[size]

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-transparent',
        'border-t-current border-r-current',
        sizeClass,
        className
      )}
      style={{ color }}
      role="status"
      aria-label="Loading"
      data-testid={testId}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
})

Spinner.displayName = 'Spinner'