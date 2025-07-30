import { NextRequest, NextResponse } from 'next/server'
import { sentimentTradeIntegration } from '@/lib/trading/integration/SentimentTradeIntegration'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    // Check if not running
    if (!sentimentTradeIntegration.isActive()) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Integration is not running' 
        },
        { status: 400 }
      )
    }

    // Get final stats before stopping
    const finalStats = sentimentTradeIntegration.getActivityStats()
    const config = sentimentTradeIntegration.getConfig()

    // Stop the integration
    await sentimentTradeIntegration.stop()

    return NextResponse.json({
      success: true,
      data: {
        enabled: config.enabled || false,
        running: false,
        config: {
          sentimentThreshold: 0.6,
          mentionThreshold: config.minActivityThreshold || 10,
          maxPositions: 5,
          riskLimit: 0.1,
          enableAutoTrading: false
        },
        stats: {
          activeSymbols: finalStats.uniqueSymbols || 0,
          totalMentions: finalStats.totalDetections || 0,
          avgSentiment: finalStats.averageSentiment || 0,
          lastUpdate: Date.now()
        },
        finalStats
      }
    })
  } catch (error) {
    console.error('Error stopping integration:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to stop integration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}