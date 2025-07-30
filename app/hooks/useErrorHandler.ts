/**
 * Custom hook for centralized error handling
 */
'use client'

import { useCallback } from 'react'

export interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  additionalData?: Record<string, any>
}

export interface ErrorHandlingOptions {
  showToast?: boolean
  logToConsole?: boolean
  reportToService?: boolean
  fallbackMessage?: string
}

/**
 * Centralized error handling hook with logging, reporting, and user feedback
 */
export const useErrorHandler = () => {
  /**
   * Handles errors with consistent logging and user feedback
   */
  const handleError = useCallback((
    error: Error | string,
    context?: ErrorContext,
    options: ErrorHandlingOptions = {}
  ) => {
    const {
      showToast = true,
      logToConsole = true,
      reportToService = true,
      fallbackMessage = 'An unexpected error occurred. Please try again.'
    } = options

    // Normalize error
    const normalizedError = typeof error === 'string' ? new Error(error) : error
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Enhanced error object
    const errorDetails = {
      id: errorId,
      message: normalizedError.message,
      stack: normalizedError.stack,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      context: context || {},
      severity: getSeverityLevel(normalizedError)
    }

    // Log to console
    if (logToConsole) {
      console.error('Error handled:', errorDetails)
    }

    // Show user-friendly toast notification
    if (showToast && typeof window !== 'undefined') {
      showErrorToast(getUserFriendlyMessage(normalizedError, fallbackMessage))
    }

    // Report to external service
    if (reportToService) {
      reportErrorToService(errorDetails).catch(reportError => {
        console.error('Failed to report error to service:', reportError)
      })
    }

    return errorId
  }, [])

  /**
   * Handles async operations with automatic error handling
   */
  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: ErrorContext,
    options?: ErrorHandlingOptions
  ): Promise<T | null> => {
    try {
      return await operation()
    } catch (error) {
      handleError(error as Error, context, options)
      return null
    }
  }, [handleError])

  /**
   * Creates an error handler for specific contexts
   */
  const createContextualHandler = useCallback((
    defaultContext: ErrorContext,
    defaultOptions?: ErrorHandlingOptions
  ) => {
    return (
      error: Error | string,
      additionalContext?: Partial<ErrorContext>,
      options?: ErrorHandlingOptions
    ) => {
      const mergedContext = { ...defaultContext, ...additionalContext }
      const mergedOptions = { ...defaultOptions, ...options }
      return handleError(error, mergedContext, mergedOptions)
    }
  }, [handleError])

  return {
    handleError,
    handleAsyncOperation,
    createContextualHandler
  }
}

/**
 * Determines error severity level
 */
function getSeverityLevel(error: Error): 'low' | 'medium' | 'high' | 'critical' {
  const message = error.message.toLowerCase()
  const stack = error.stack?.toLowerCase() || ''

  // Critical errors
  if (
    message.includes('network error') ||
    message.includes('failed to fetch') ||
    message.includes('authentication') ||
    stack.includes('uncaught')
  ) {
    return 'critical'
  }

  // High severity errors
  if (
    message.includes('permission denied') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('server error')
  ) {
    return 'high'
  }

  // Medium severity errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('not found')
  ) {
    return 'medium'
  }

  return 'low'
}

/**
 * Converts technical errors to user-friendly messages
 */
function getUserFriendlyMessage(error: Error, fallback: string): string {
  const message = error.message.toLowerCase()

  // Network errors
  if (message.includes('network error') || message.includes('failed to fetch')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.'
  }

  // Authentication errors
  if (message.includes('unauthorized') || message.includes('authentication')) {
    return 'Your session has expired. Please log in again.'
  }

  // Permission errors
  if (message.includes('forbidden') || message.includes('permission denied')) {
    return 'You don\'t have permission to perform this action.'
  }

  // Server errors
  if (message.includes('server error') || message.includes('internal server error')) {
    return 'Our servers are experiencing issues. Please try again in a few minutes.'
  }

  // Validation errors
  if (message.includes('validation') || message.includes('invalid')) {
    return 'Please check your input and try again.'
  }

  // Not found errors
  if (message.includes('not found')) {
    return 'The requested resource was not found.'
  }

  return fallback
}

/**
 * Shows error toast notification
 */
function showErrorToast(message: string) {
  // Integration with notification system (e.g., notistack, react-toastify)
  // For now, using console.warn as placeholder
  console.warn('Error Toast:', message)
  
  // You can replace this with your preferred notification system:
  // enqueueSnackbar(message, { variant: 'error' })
  // toast.error(message)
}

/**
 * Reports error to external monitoring service
 */
async function reportErrorToService(errorDetails: any): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    // Replace with your actual error reporting service
    // Examples: Sentry, Bugsnag, LogRocket, etc.
    
    // Sentry example:
    // Sentry.captureException(new Error(errorDetails.message), {
    //   extra: errorDetails,
    //   tags: {
    //     component: errorDetails.context.component,
    //     severity: errorDetails.severity
    //   }
    // })

    // Custom API example:
    // await fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorDetails)
    // })

    console.info('Error reporting prepared (implement your service):', errorDetails)
  } catch (error) {
    console.error('Failed to report error:', error)
  }
}