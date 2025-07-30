/**
 * Sign In Page
 * 
 * Following AI-GUIDELINES.md standards:
 * - WCAG 2.1 AA accessibility compliance
 * - TypeScript-first approach
 * - Comprehensive error handling
 */

'use client'

import { signIn, getProviders } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/shared'
import { Card } from '@/components/shared'

interface Provider {
  id: string
  name: string
  type: string
  signinUrl: string
  callbackUrl: string
}

export default function SignInPage() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const errorParam = searchParams.get('error')

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const res = await getProviders()
        setProviders(res)
      } catch (err) {
        setError('Failed to load authentication providers')
        console.error('Provider loading error:', err)
      }
    }
    
    loadProviders()
  }, [])

  useEffect(() => {
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        OAuthSignin: 'Error in OAuth sign in',
        OAuthCallback: 'Error in OAuth callback',
        OAuthCreateAccount: 'Could not create OAuth account',
        EmailCreateAccount: 'Could not create email account',
        Callback: 'Error in callback',
        OAuthAccountNotLinked: 'OAuth account not linked',
        EmailSignin: 'Check your email for a sign in link',
        CredentialsSignin: 'Invalid credentials',
        SessionRequired: 'Please sign in to access this page',
        default: 'An error occurred during authentication'
      }
      
      setError(errorMessages[errorParam] || errorMessages.default)
    }
  }, [errorParam])

  const handleSignIn = async (providerId: string) => {
    try {
      setLoading(providerId)
      setError(null)
      
      const result = await signIn(providerId, {
        callbackUrl,
        redirect: false
      })
      
      if (result?.error) {
        setError('Authentication failed. Please try again.')
      } else if (result?.url) {
        router.push(result.url)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Sign in error:', err)
    } finally {
      setLoading(null)
    }
  }

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'github':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
          </svg>
        )
      case 'google':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access your trading dashboard and strategies
          </p>
        </div>
        
        <Card className="space-y-6">
          {error && (
            <div 
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
              role="alert"
              aria-live="polite"
            >
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          <div className="space-y-3">
            {providers && Object.values(providers).map((provider) => (
              <Button
                key={provider.name}
                variant="outline"
                size="lg"
                fullWidth
                loading={loading === provider.id}
                loadingText={`Signing in with ${provider.name}...`}
                startIcon={getProviderIcon(provider.id)}
                onClick={() => handleSignIn(provider.id)}
                data-testid={`signin-${provider.id}`}
                aria-label={`Sign in with ${provider.name}`}
              >
                Sign in with {provider.name}
              </Button>
            ))}
            
            {!providers && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading sign in options...</p>
              </div>
            )}
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our terms of service and privacy policy
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}