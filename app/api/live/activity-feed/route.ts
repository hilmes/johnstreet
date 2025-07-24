import { NextRequest, NextResponse } from 'next/server'
import { activityLoggerKV } from '@/lib/sentiment/ActivityLoggerKV'
import { dataOrchestrator } from '@/lib/feeds/DataOrchestrator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lastTimestamp = parseInt(searchParams.get('since') || '0')
  const limit = parseInt(searchParams.get('limit') || '50')

  try {
    // Get recent activity since the last timestamp
    const timeSince = lastTimestamp > 0 ? Date.now() - lastTimestamp : 5 * 60 * 1000 // Default: last 5 minutes
    const recentActivity = await activityLoggerKV.getRecentActivity(timeSince)
    
    // Filter for symbol detection activities and transform to live detection format
    const symbolDetections = recentActivity
      .filter(activity => 
        activity.type === 'symbol_detection' || 
        activity.type === 'twitter_scan' || 
        activity.type === 'reddit_scan' ||
        activity.type === 'news_scan' ||
        activity.type === 'social_scan'
      )
      .slice(0, limit)
      .map(activity => ({
        symbol: activity.data?.symbols?.[0] || 'UNKNOWN',
        timestamp: activity.timestamp,
        platform: activity.platform,
        source: activity.source,
        sentiment: activity.data?.sentiment || 0,
        confidence: activity.data?.confidence || 0.8,
        pumpIndicators: activity.data?.pumpIndicators || [],
        engagement: activity.data?.engagement || 0,
        riskScore: activity.data?.riskScore || 0,
        isNew: activity.data?.isNew || false
      }))

    // Get cross-platform signals
    const crossPlatformSignals = dataOrchestrator.getActiveSignals()

    // Get orchestrator stats
    const orchestratorStats = dataOrchestrator.getStats()

    // Calculate summary metrics
    const totalSymbolsDetected = new Set(symbolDetections.map(d => d.symbol)).size
    const totalMentionsToday = symbolDetections.length
    const avgSentiment = symbolDetections.length > 0 
      ? symbolDetections.reduce((sum, d) => sum + d.sentiment, 0) / symbolDetections.length 
      : 0
    const criticalAlerts = crossPlatformSignals.filter(s => s.riskLevel === 'critical').length

    // Get top symbols by mention count
    const symbolCounts = new Map<string, number>()
    symbolDetections.forEach(d => {
      symbolCounts.set(d.symbol, (symbolCounts.get(d.symbol) || 0) + 1)
    })

    const topSymbols = Array.from(symbolCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([symbol, count]) => ({
        symbol,
        totalMentions: count,
        platforms: [...new Set(symbolDetections.filter(d => d.symbol === symbol).map(d => d.platform))],
        avgSentiment: symbolDetections
          .filter(d => d.symbol === symbol)
          .reduce((sum, d) => sum + d.sentiment, 0) / count,
        avgRiskScore: symbolDetections
          .filter(d => d.symbol === symbol)
          .reduce((sum, d) => sum + d.riskScore, 0) / count,
        firstSeen: Math.min(...symbolDetections.filter(d => d.symbol === symbol).map(d => d.timestamp)),
        lastSeen: Math.max(...symbolDetections.filter(d => d.symbol === symbol).map(d => d.timestamp)),
        totalEngagement: symbolDetections
          .filter(d => d.symbol === symbol)
          .reduce((sum, d) => sum + d.engagement, 0),
        crossPlatformSignal: crossPlatformSignals.some(s => s.symbol === symbol)
      }))

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      data: {
        detections: symbolDetections,
        crossPlatformSignals,
        topSymbols,
        metrics: {
          totalSymbolsDetected,
          totalMentionsToday,
          avgSentiment,
          criticalAlerts,
          orchestratorStats
        },
        dataSourceStatus: orchestratorStats.dataSourceStatus || []
      }
    })

  } catch (error) {
    console.error('Error fetching activity feed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity feed' },
      { status: 500 }
    )
  }
}

// Server-Sent Events endpoint for real-time streaming
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialData = {
        type: 'connection',
        message: 'Connected to live crypto sentiment feed',
        timestamp: Date.now()
      }
      
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`)
      )

      // Set up interval to send updates every second
      const interval = setInterval(async () => {
        try {
          // Get recent activity (last 2 seconds to catch new events)
          const recentActivity = await activityLoggerKV.getRecentActivity(2000)
          
          if (recentActivity.length > 0) {
            const liveUpdate = {
              type: 'symbol_detection',
              timestamp: Date.now(),
              detections: recentActivity
                .filter(activity => 
                  activity.type === 'symbol_detection' || 
                  activity.type === 'twitter_scan' || 
                  activity.type === 'reddit_scan' ||
                  activity.type === 'news_scan' ||
                  activity.type === 'social_scan'
                )
                .slice(0, 5) // Limit to prevent overwhelming the client
                .map(activity => ({
                  symbol: activity.data?.symbols?.[0] || 'UNKNOWN',
                  timestamp: activity.timestamp,
                  platform: activity.platform,
                  source: activity.source,
                  sentiment: activity.data?.sentiment || 0,
                  confidence: activity.data?.confidence || 0.8,
                  pumpIndicators: activity.data?.pumpIndicators || [],
                  engagement: activity.data?.engagement || 0,
                  riskScore: activity.data?.riskScore || 0,
                  isNew: activity.data?.isNew || false
                }))
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(liveUpdate)}\n\n`)
            )
          }

          // Send heartbeat every 30 seconds
          if (Date.now() % 30000 < 1000) {
            const heartbeat = {
              type: 'heartbeat',
              timestamp: Date.now(),
              status: 'alive'
            }
            
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`)
            )
          }

        } catch (error) {
          console.error('Error in SSE stream:', error)
          const errorData = {
            type: 'error',
            message: 'Stream error occurred',
            timestamp: Date.now()
          }
          
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`)
          )
        }
      }, 1000) // Update every second

      // Clean up interval when stream closes
      return () => {
        clearInterval(interval)
      }
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}