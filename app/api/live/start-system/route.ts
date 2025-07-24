import { NextRequest, NextResponse } from 'next/server'
import { dataOrchestrator } from '@/lib/feeds/DataOrchestrator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Initialize the data orchestrator with default configuration
    const config = {
      rss: {
        enabled: true
      },
      twitter: {
        enabled: false, // Disabled by default - requires API keys
        config: undefined
      },
      cryptopanic: {
        enabled: false, // Disabled by default - requires API key
        config: undefined
      },
      lunarcrush: {
        enabled: false, // Disabled by default - requires API key
        config: undefined
      },
      pushshift: {
        enabled: true,
        config: {
          baseUrl: 'https://api.pushshift.io/reddit/search',
          maxResults: 100,
          rateLimit: 60, // 60 requests per minute
          retryAttempts: 3,
          retryDelay: 5,
          active: true
        }
      },
      coordination: {
        symbolVerificationEnabled: true,
        crossPlatformAnalysisEnabled: true,
        realTimeAlertsEnabled: true,
        historicalAnalysisEnabled: true
      }
    }

    // Initialize and start the data orchestrator
    await dataOrchestrator.initialize(config)
    await dataOrchestrator.start()

    const stats = dataOrchestrator.getStats()

    return NextResponse.json({
      success: true,
      message: 'Live crypto sentiment monitoring system started',
      timestamp: Date.now(),
      config: {
        enabledSources: Object.entries(config)
          .filter(([key, value]) => typeof value === 'object' && value.enabled)
          .map(([key]) => key),
        activeDataSources: stats.activeDataSources,
        totalDataSources: stats.totalDataSources
      },
      stats: stats
    })

  } catch (error) {
    console.error('Error starting system:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to start monitoring system',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const isActive = dataOrchestrator.isActive()
    const stats = dataOrchestrator.getStats()
    const config = dataOrchestrator.getConfig()

    return NextResponse.json({
      success: true,
      isActive,
      stats,
      config: config ? {
        enabledSources: Object.entries(config)
          .filter(([key, value]) => typeof value === 'object' && value.enabled)
          .map(([key]) => key)
      } : null
    })

  } catch (error) {
    console.error('Error getting system status:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get system status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dataOrchestrator.stop()

    return NextResponse.json({
      success: true,
      message: 'Live crypto sentiment monitoring system stopped',
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Error stopping system:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to stop monitoring system',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}