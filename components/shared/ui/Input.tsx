/**
 * Input Component
 * 
 * Reusable input component following AI-GUIDELINES.md standards:
 * - TypeScript-first with comprehensive error handling
 * - WCAG 2.1 AA accessibility compliance
 * - Performance optimized with React.memo
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { InputProps } from '../types'

const variantClasses = {
  outline: 'border border-gray-300 bg-white focus:border-blue-500',
  filled: 'border-0 bg-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-500',
  underline: 'border-0 border-b-2 border-gray-300 bg-transparent focus:border-blue-500 rounded-none'
}

const sizeClasses = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-2.5 text-base',
  xl: 'px-4 py-3 text-lg'
}

/**
 * Accessible input component with comprehensive error handling
 */
export const Input = React.memo<InputProps>(({
  variant = 'outline',
  size = 'md',
  error = false,
  helperText,
  startAdornment,
  endAdornment,
  className,
  'data-testid': testId,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  disabled,
  ...props
}) => {
  const baseClasses = [
    'w-full rounded-lg transition-all duration-200',
    'focus:outline-none focus:ring-1 focus:ring-blue-500',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  ]

  const variantClass = variantClasses[variant]
  const sizeClass = sizeClasses[size]

  const inputClasses = cn(
    baseClasses,
    variantClass,
    sizeClass,
    {
      'border-red-500 focus:border-red-500 focus:ring-red-500': error,
      'pl-10': startAdornment,
      'pr-10': endAdornment
    },
    className
  )

  const helperId = helperText ? `${props.id || 'input'}-helper` : undefined
  const describedBy = [ariaDescribedBy, helperId].filter(Boolean).join(' ') || undefined

  return (
    <div className="relative">
      {startAdornment && (
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
          {startAdornment}
        </div>
      )}
      
      <input
        className={inputClasses}
        disabled={disabled}
        data-testid={testId}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={error}
        {...props}
      />
      
      {endAdornment && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
          {endAdornment}
        </div>
      )}
      
      {helperText && (
        <p
          id={helperId}
          className={cn(
            'mt-1 text-xs',
            error ? 'text-red-600' : 'text-gray-500'
          )}
        >
          {helperText}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'