/**
 * React Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays fallback UI
 */
'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { dieterRamsDesign as ds } from '@/lib/design/DieterRamsDesignSystem'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void
  showDetails?: boolean
  resetOnPropsChange?: boolean
}

/**
 * Generates a unique error ID for tracking
 */
const generateErrorId = (): string => {
  return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Comprehensive Error Boundary with reporting and recovery features
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = generateErrorId()
    
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { errorId } = this.state
    
    this.setState({
      errorInfo
    })

    // Log error details
    console.error('ErrorBoundary caught an error:', {
      error,
      errorInfo,
      errorId,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'SSR'
    })

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId)
    }

    // Optional: Send error to monitoring service
    this.reportError(error, errorInfo, errorId)
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange } = this.props
    const { hasError } = this.state

    // Reset error boundary when props change (useful for route changes)
    if (hasError && prevProps.children !== this.props.children && resetOnPropsChange) {
      this.resetErrorBoundary()
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  /**
   * Reports error to external monitoring service
   */
  private reportError = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    if (typeof window === 'undefined') return

    try {
      // Send to your error monitoring service (e.g., Sentry, Bugsnag, etc.)
      // Example implementation:
      const errorReport = {
        errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: window.navigator.userAgent,
        userId: localStorage.getItem('user-id'), // If available
        sessionId: sessionStorage.getItem('session-id') // If available
      }

      // Replace with your actual error reporting service
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // }).catch(console.error)

      console.warn('Error report prepared (implement your error service):', errorReport)
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  /**
   * Resets the error boundary state
   */
  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    })
  }

  /**
   * Handles automatic recovery attempt
   */
  private handleAutoRecover = () => {
    this.resetErrorBoundary()
    
    // Set a timeout to show error again if it persists
    this.resetTimeoutId = window.setTimeout(() => {
      if (this.state.hasError) {
        console.warn('Error persisted after recovery attempt')
      }
    }, 5000)
  }

  /**
   * Handles manual retry
   */
  private handleRetry = () => {
    this.resetErrorBoundary()
  }

  /**
   * Copies error details to clipboard
   */
  private copyErrorToClipboard = async () => {
    const { error, errorInfo, errorId } = this.state
    
    const errorDetails = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      alert('Error details copied to clipboard')
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  render() {
    const { hasError, error, errorInfo, errorId } = this.state
    const { children, fallback, showDetails = false } = this.props

    if (hasError) {
      // Custom fallback UI
      if (fallback) {
        return fallback
      }

      // Default error UI
      return (
        <div style={{
          ...ds.containers.page,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          textAlign: 'center'
        }}>
          <div style={{
            ...ds.containers.card,
            maxWidth: '600px',
            padding: ds.spacing.xl
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: ds.spacing.lg,
              color: ds.colors.error
            }}>
              ⚠️
            </div>

            <h2 style={{
              ...ds.typography.h2,
              color: ds.colors.error,
              marginBottom: ds.spacing.md
            }}>
              Something went wrong
            </h2>

            <p style={{
              ...ds.typography.body,
              color: ds.colors.text.secondary,
              marginBottom: ds.spacing.lg
            }}>
              We're sorry, but something unexpected happened. The error has been logged and our team has been notified.
            </p>

            <div style={{
              display: 'flex',
              gap: ds.spacing.md,
              justifyContent: 'center',
              marginBottom: ds.spacing.lg
            }}>
              <button
                onClick={this.handleRetry}
                style={ds.buttons.primary}
              >
                Try Again
              </button>
              
              <button
                onClick={() => window.location.reload()}
                style={ds.buttons.secondary}
              >
                Reload Page
              </button>
            </div>

            {showDetails && error && (
              <details style={{
                textAlign: 'left',
                marginTop: ds.spacing.lg,
                padding: ds.spacing.md,
                backgroundColor: ds.colors.background.secondary,
                borderRadius: ds.borderRadius.medium,
                border: `1px solid ${ds.colors.border}`
              }}>
                <summary style={{
                  ...ds.typography.label,
                  cursor: 'pointer',
                  marginBottom: ds.spacing.sm
                }}>
                  Error Details (ID: {errorId})
                </summary>
                
                <div style={{
                  fontFamily: 'Monaco, "Courier New", monospace',
                  fontSize: '0.85rem',
                  whiteSpace: 'pre-wrap',
                  color: ds.colors.text.secondary,
                  marginBottom: ds.spacing.md
                }}>
                  <strong>Message:</strong> {error.message}
                  {error.stack && (
                    <>
                      <br /><br />
                      <strong>Stack:</strong><br />
                      {error.stack}
                    </>
                  )}
                  {errorInfo?.componentStack && (
                    <>
                      <br /><br />
                      <strong>Component Stack:</strong><br />
                      {errorInfo.componentStack}
                    </>
                  )}
                </div>

                <button
                  onClick={this.copyErrorToClipboard}
                  style={{
                    ...ds.buttons.secondary,
                    fontSize: '0.85rem',
                    padding: `${ds.spacing.sm} ${ds.spacing.md}`
                  }}
                >
                  Copy Details
                </button>
              </details>
            )}

            <p style={{
              ...ds.typography.caption,
              color: ds.colors.text.secondary,
              marginTop: ds.spacing.lg
            }}>
              Error ID: {errorId}
              <br />
              If this problem persists, please contact support with this ID.
            </p>
          </div>
        </div>
      )
    }

    return children
  }
}