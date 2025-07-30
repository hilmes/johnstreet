/**
 * Auth Error Page
 * 
 * Following AI-GUIDELINES.md standards:
 * - Comprehensive error handling
 * - WCAG 2.1 AA accessibility compliance
 */

'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button, Card } from '@/components/shared'

const errorMessages: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: 'Server Error',
    description: 'There is a problem with the server configuration.'
  },
  AccessDenied: {
    title: 'Access Denied',
    description: 'You do not have permission to sign in.'
  },
  Verification: {
    title: 'Verification Error',
    description: 'The token has expired or has already been used.'
  },
  Default: {
    title: 'Authentication Error',
    description: 'An error occurred during authentication.'
  }
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'Default'
  
  const errorInfo = errorMessages[error] || errorMessages.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {errorInfo.title}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {errorInfo.description}
          </p>
        </div>
        
        <Card className="text-center space-y-4">
          <p className="text-sm text-gray-500">
            If this problem persists, please contact support.
          </p>
          
          <div className="space-y-2">
            <Button
              variant="solid"
              color="primary"
              fullWidth
              asChild
            >
              <Link href="/auth/signin">
                Try Again
              </Link>
            </Button>
            
            <Button
              variant="ghost"
              color="neutral"
              fullWidth
              asChild
            >
              <Link href="/">
                Go Home
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}