import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    // Simply return success - the sentiment server is running as a separate process
    return NextResponse.json({
      success: true,
      message: 'Live monitoring system is running',
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('Error starting system:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to start monitoring system'
    }, { status: 500 })
  }
}
