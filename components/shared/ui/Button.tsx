/**
 * Button Component
 * 
 * Reusable button component following AI-GUIDELINES.md standards:
 * - TypeScript-first with comprehensive props
 * - WCAG 2.1 AA accessibility compliance
 * - Performance optimized with React.memo
 * - Comprehensive error handling
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ButtonProps } from '../types'
import { Spinner } from './Spinner'

const buttonVariants = {
  solid: {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500',
    error: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    info: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-400',
    neutral: 'bg-gray-500 text-white hover:bg-gray-600 focus:ring-gray-400'
  },
  outline: {
    primary: 'border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
    secondary: 'border-gray-600 text-gray-600 hover:bg-gray-50 focus:ring-gray-500',
    success: 'border-green-600 text-green-600 hover:bg-green-50 focus:ring-green-500',
    warning: 'border-yellow-600 text-yellow-600 hover:bg-yellow-50 focus:ring-yellow-500',
    error: 'border-red-600 text-red-600 hover:bg-red-50 focus:ring-red-500',
    info: 'border-blue-500 text-blue-500 hover:bg-blue-50 focus:ring-blue-400',
    neutral: 'border-gray-500 text-gray-500 hover:bg-gray-50 focus:ring-gray-400'
  },
  ghost: {
    primary: 'text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
    secondary: 'text-gray-600 hover:bg-gray-50 focus:ring-gray-500',
    success: 'text-green-600 hover:bg-green-50 focus:ring-green-500',
    warning: 'text-yellow-600 hover:bg-yellow-50 focus:ring-yellow-500',
    error: 'text-red-600 hover:bg-red-50 focus:ring-red-500',
    info: 'text-blue-500 hover:bg-blue-50 focus:ring-blue-400',
    neutral: 'text-gray-500 hover:bg-gray-50 focus:ring-gray-400'
  },
  link: {
    primary: 'text-blue-600 hover:text-blue-700 underline-offset-4 hover:underline',
    secondary: 'text-gray-600 hover:text-gray-700 underline-offset-4 hover:underline',
    success: 'text-green-600 hover:text-green-700 underline-offset-4 hover:underline',
    warning: 'text-yellow-600 hover:text-yellow-700 underline-offset-4 hover:underline',
    error: 'text-red-600 hover:text-red-700 underline-offset-4 hover:underline',
    info: 'text-blue-500 hover:text-blue-600 underline-offset-4 hover:underline',
    neutral: 'text-gray-500 hover:text-gray-600 underline-offset-4 hover:underline'
  }
}

const sizeVariants = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
  xl: 'px-8 py-3 text-lg'
}

/**
 * Button component with comprehensive accessibility and performance features
 */
export const Button = React.memo<ButtonProps>(({
  children,
  variant = 'solid',
  size = 'md',
  color = 'primary',
  fullWidth = false,
  loading = false,
  loadingText,
  startIcon,
  endIcon,
  disabled,
  className,
  'data-testid': testId,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  onClick,
  ...props
}) => {
  const baseClasses = [
    'inline-flex items-center justify-center gap-2',
    'font-medium rounded-lg',
    'transition-all duration-200 ease-in-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
  ]

  const variantClasses = buttonVariants[variant]?.[color] || buttonVariants.solid.primary
  const sizeClasses = sizeVariants[size]

  const classes = cn(
    baseClasses,
    variantClasses,
    sizeClasses,
    {
      'w-full': fullWidth,
      'border': variant === 'outline',
      'cursor-not-allowed opacity-50': disabled || loading
    },
    className
  )

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }

  const iconSize = size === 'xs' || size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      onClick={handleClick}
      data-testid={testId}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size={size === 'xs' || size === 'sm' ? 'sm' : 'md'} />
          {loadingText || children}
        </>
      ) : (
        <>
          {startIcon && (
            <span className={cn('flex-shrink-0', iconSize)} aria-hidden="true">
              {startIcon}
            </span>
          )}
          {children}
          {endIcon && (
            <span className={cn('flex-shrink-0', iconSize)} aria-hidden="true">
              {endIcon}
            </span>
          )}
        </>
      )}
    </button>
  )
})

Button.displayName = 'Button'