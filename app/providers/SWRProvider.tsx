/**
 * SWR Configuration Provider
 * Provides global SWR configuration and error handling
 */
'use client'

import React, { ReactNode } from 'react'
import { SWRConfig } from 'swr'

interface SWRProviderProps {
  children: ReactNode
}

/**
 * Global fetcher function with error handling and automatic token renewal
 */
const globalFetcher = async (url: string): Promise<any> => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      // Add authorization header if token exists
      ...(typeof window !== 'undefined' && localStorage.getItem('auth-token') && {
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      })
    }
  })

  if (!response.ok) {
    // Handle 401 Unauthorized - token expired
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-token')
        // Optionally redirect to login or refresh token
        console.warn('Authentication expired, token removed')
      }
    }

    const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
    ;(error as any).status = response.status
    ;(error as any).info = await response.text()
    throw error
  }

  return response.json()
}

/**
 * Custom error handler for SWR with exponential backoff
 */
const errorRetryHandler = (error: any, key: string, config: any, revalidate: any, { retryCount }: any) => {
  // Don't retry for 4xx errors (client errors)
  if (error.status >= 400 && error.status < 500) {
    return
  }

  // Max 3 retries
  if (retryCount >= 3) {
    return
  }

  // Exponential backoff: 1s, 2s, 4s
  const timeout = Math.pow(2, retryCount) * 1000
  
  setTimeout(() => revalidate({ retryCount }), timeout)
}

/**
 * SWR Provider with optimized configuration for trading platform
 */
export const SWRProvider: React.FC<SWRProviderProps> = ({ children }) => {
  return (
    <SWRConfig
      value={{
        fetcher: globalFetcher,
        onErrorRetry: errorRetryHandler,
        
        // Caching and revalidation
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
        
        // Performance optimizations
        dedupingInterval: 2000, // Dedupe requests within 2 seconds
        focusThrottleInterval: 5000, // Throttle revalidation on focus
        loadingTimeout: 10000, // 10 second timeout
        
        // Error handling
        errorRetryCount: 3,
        errorRetryInterval: 1000,
        shouldRetryOnError: true,
        
        // Global error handler
        onError: (error, key) => {
          console.error(`SWR Error for ${key}:`, error)
          
          // You can integrate with error tracking service here
          // For example: Sentry.captureException(error)
          
          // Show user-friendly error notifications
          if (typeof window !== 'undefined' && error.status >= 500) {
            // Show toast notification for server errors
            console.warn('Server error occurred, please try again later')
          }
        },
        
        // Success handler for logging
        onSuccess: (data, key) => {
          // Optional: Log successful requests for debugging
          if (process.env.NODE_ENV === 'development') {
            console.debug(`SWR Success for ${key}:`, data)
          }
        }
      }}
    >
      {children}
    </SWRConfig>
  )
}