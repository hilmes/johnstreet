import { NextResponse } from 'next/server'

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(error: unknown, context?: string): NextResponse {
  const errorContext = context ? `${context}: ` : ''
  
  // Log the error with stack trace
  if (error instanceof Error) {
    console.error(`${errorContext}${error.message}`, error.stack)
  } else {
    console.error(`${errorContext}Unknown error`, error)
  }

  // Handle different error types
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details,
        timestamp: new Date().toISOString()
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof Error) {
    // Parse common error types
    if (error.message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        {
          error: 'Service unavailable',
          details: 'Unable to connect to backend service',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }

    if (error.message.includes('timeout')) {
      return NextResponse.json(
        {
          error: 'Request timeout',
          details: 'The operation took too long to complete',
          timestamp: new Date().toISOString()
        },
        { status: 504 }
      )
    }

    // Default error response
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }

  // Unknown error type
  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    },
    { status: 500 }
  )
}

export function createApiResponse<T>(
  data: T,
  options?: {
    status?: number
    headers?: HeadersInit
  }
): NextResponse {
  return NextResponse.json(data, {
    status: options?.status || 200,
    headers: options?.headers
  })
}

export function validateRequiredParams(
  params: Record<string, any>,
  required: string[]
): void {
  const missing = required.filter(param => !params[param])
  if (missing.length > 0) {
    throw new ApiError(
      `Missing required parameters: ${missing.join(', ')}`,
      400
    )
  }
}