/**
 * Next.js App Router Error Page
 * Enhanced with comprehensive error handling and reporting
 */
'use client'

import React, { useEffect } from 'react'
import { dieterRamsDesign as ds } from '@/lib/design/DieterRamsDesignSystem'
import { useErrorHandler } from './hooks/useErrorHandler'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Enhanced error page with comprehensive error handling
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const { handleError } = useErrorHandler()

  useEffect(() => {
    // Handle the error with our centralized error handling system
    handleError(error, {
      component: 'ErrorPage',
      action: 'page_error',
      additionalData: {
        digest: error.digest,
        url: typeof window !== 'undefined' ? window.location.href : undefined
      }
    }, {
      showToast: false, // Don't show toast on error page
      logToConsole: true,
      reportToService: true
    })
  }, [error, handleError])

  const handleRetry = () => {
    try {
      reset()
    } catch (retryError) {
      handleError(retryError as Error, {
        component: 'ErrorPage',
        action: 'retry_failed'
      })
    }
  }

  const handleGoHome = () => {
    try {
      window.location.href = '/'
    } catch (navError) {
      handleError(navError as Error, {
        component: 'ErrorPage', 
        action: 'navigation_failed'
      })
    }
  }

  const copyErrorDetails = async () => {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      alert('Error details copied to clipboard')
    } catch (clipboardError) {
      console.error('Failed to copy error details:', clipboardError)
      // Fallback: show error details in alert
      alert(`Error Details:\n\n${JSON.stringify(errorDetails, null, 2)}`)
    }
  }

  return (
    <div style={{
      ...ds.containers.page,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: ds.spacing.lg
    }}>
      <div style={{
        ...ds.containers.card,
        maxWidth: '600px',
        width: '100%',
        textAlign: 'center',
        padding: ds.spacing.xl
      }}>
        {/* Error Icon */}
        <div style={{
          fontSize: '64px',
          marginBottom: ds.spacing.lg,
          color: ds.colors.error
        }}>
          ⚠️
        </div>

        {/* Error Title */}
        <h1 style={{
          ...ds.typography.h1,
          color: ds.colors.error,
          marginBottom: ds.spacing.md
        }}>
          Something went wrong
        </h1>

        {/* Error Description */}
        <p style={{
          ...ds.typography.body,
          color: ds.colors.text.secondary,
          marginBottom: ds.spacing.lg,
          lineHeight: 1.6
        }}>
          We apologize for the inconvenience. An unexpected error occurred while loading this page. 
          Our team has been automatically notified and is working to resolve the issue.
        </p>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: ds.spacing.md,
          justifyContent: 'center',
          marginBottom: ds.spacing.lg,
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handleRetry}
            style={{
              ...ds.buttons.primary,
              minWidth: '120px'
            }}
          >
            Try Again
          </button>
          
          <button
            onClick={handleGoHome}
            style={{
              ...ds.buttons.secondary,
              minWidth: '120px'
            }}
          >
            Go Home
          </button>
          
          <button
            onClick={() => window.location.reload()}
            style={{
              ...ds.buttons.secondary,
              minWidth: '120px'
            }}
          >
            Reload Page
          </button>
        </div>

        {/* Development Details */}
        {process.env.NODE_ENV === 'development' && (
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
              marginBottom: ds.spacing.sm,
              color: ds.colors.error
            }}>
              Development Error Details
            </summary>
            
            <div style={{
              fontFamily: 'Monaco, "Courier New", monospace',
              fontSize: '0.85rem',
              whiteSpace: 'pre-wrap',
              color: ds.colors.text.secondary,
              marginBottom: ds.spacing.sm
            }}>
              <strong>Message:</strong> {error.message}
              <br />
              {error.digest && (
                <>
                  <strong>Digest:</strong> {error.digest}
                  <br />
                </>
              )}
              {error.stack && (
                <>
                  <br />
                  <strong>Stack Trace:</strong><br />
                  {error.stack}
                </>
              )}
            </div>

            <button
              onClick={copyErrorDetails}
              style={{
                ...ds.buttons.secondary,
                fontSize: '0.85rem',
                padding: `${ds.spacing.sm} ${ds.spacing.md}`
              }}
            >
              Copy Error Details
            </button>
          </details>
        )}

        {/* Support Information */}
        <div style={{
          marginTop: ds.spacing.lg,
          padding: ds.spacing.md,
          backgroundColor: ds.colors.background.secondary,
          borderRadius: ds.borderRadius.small,
          border: `1px solid ${ds.colors.border}`
        }}>
          <p style={{
            ...ds.typography.caption,
            color: ds.colors.text.secondary,
            margin: 0
          }}>
            If this problem persists, please contact our support team with the error details above.
            <br />
            Error ID: {error.digest || 'N/A'} • Timestamp: {new Date().toISOString()}
          </p>
        </div>
      </div>
    </div>
  )
}