import { NextRequest, NextResponse } from 'next/server'
import { activityLoggerKV } from '@/lib/sentiment/ActivityLoggerKV'

// Note: Uses Node.js runtime due to sentiment analysis dependencies

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action') || 'recent'
  const limit = parseInt(searchParams.get('limit') || '100')
  const type = searchParams.get('type')
  const platform = searchParams.get('platform')
  const severity = searchParams.get('severity')
  const startTime = searchParams.get('start_time')
  const endTime = searchParams.get('end_time')

  try {
    switch (action) {
      case 'recent': {
        const logs = await activityLoggerKV.getRecentLogs(limit, type as any)
        return NextResponse.json({
          success: true,
          data: logs
        })
      }

      case 'range': {
        if (!startTime || !endTime) {
          return NextResponse.json(
            { success: false, error: 'start_time and end_time are required for range query' },
            { status: 400 }
          )
        }

        const logs = await activityLoggerKV.getLogsByTimeRange(parseInt(startTime), parseInt(endTime))
        return NextResponse.json({
          success: true,
          data: logs
        })
      }

      case 'platform': {
        if (!platform) {
          return NextResponse.json(
            { success: false, error: 'platform parameter is required' },
            { status: 400 }
          )
        }

        const logs = await activityLoggerKV.getRecentLogs(1000)
        const filteredLogs = logs.filter(log => log.platform === platform)
        return NextResponse.json({
          success: true,
          data: filteredLogs.slice(0, limit)
        })
      }

      case 'severity': {
        if (!severity) {
          return NextResponse.json(
            { success: false, error: 'severity parameter is required' },
            { status: 400 }
          )
        }

        const logs = await activityLoggerKV.getRecentLogs(1000)
        const filteredLogs = logs.filter(log => log.severity === severity)
        return NextResponse.json({
          success: true,
          data: filteredLogs.slice(0, limit)
        })
      }

      case 'stats': {
        const timeRange = parseInt(searchParams.get('time_range') || '60000') // Default: 1 minute
        const timeRangeType = timeRange <= 3600000 ? 'hour' : timeRange <= 86400000 ? 'day' : 'week'
        const stats = await activityLoggerKV.getStatistics(timeRangeType)
        return NextResponse.json({
          success: true,
          data: stats
        })
      }

      case 'stream': {
        // Server-sent events for real-time streaming
        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder()
            
            // Send initial connection message
            const initialMessage = `data: ${JSON.stringify({
              type: 'connection',
              timestamp: Date.now(),
              message: 'Connected to activity stream'
            })}\n\n`
            controller.enqueue(encoder.encode(initialMessage))

            // Subscribe to new log entries
            const unsubscribe = activityLoggerKV.subscribe((entry) => {
              const message = `data: ${JSON.stringify({
                type: 'log',
                ...entry
              })}\n\n`
              controller.enqueue(encoder.encode(message))
            })

            // Send heartbeat every 30 seconds
            const heartbeat = setInterval(() => {
              const heartbeatMessage = `data: ${JSON.stringify({
                type: 'heartbeat',
                timestamp: Date.now()
              })}\n\n`
              controller.enqueue(encoder.encode(heartbeatMessage))
            }, 30000)

            // Cleanup on close
            const cleanup = () => {
              unsubscribe()
              clearInterval(heartbeat)
            }

            // Store cleanup function for later use
            ;(controller as any).cleanup = cleanup
          },
          cancel() {
            if ((this as any).cleanup) {
              (this as any).cleanup()
            }
          }
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
          }
        })
      }

      case 'export': {
        const logs = await activityLoggerKV.getRecentLogs(10000) // Get up to 10k logs for export
        return NextResponse.json({
          success: true,
          data: {
            export_time: Date.now(),
            total_logs: logs.length,
            logs
          }
        })
      }

      default: {
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
      }
    }
  } catch (error) {
    console.error('Activity API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process activity request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, logs, entry } = body

    switch (action) {
      case 'log': {
        if (!entry) {
          return NextResponse.json(
            { success: false, error: 'entry is required' },
            { status: 400 }
          )
        }

        const logEntry = await activityLoggerKV.log(entry)
        return NextResponse.json({
          success: true,
          data: logEntry
        })
      }

      case 'batch': {
        if (!logs || !Array.isArray(logs)) {
          return NextResponse.json(
            { success: false, error: 'logs array is required' },
            { status: 400 }
          )
        }

        // KV version handles one at a time for consistency
        const logEntries = []
        for (const entry of logs) {
          const logEntry = await activityLoggerKV.log(entry)
          logEntries.push(logEntry)
        }
        return NextResponse.json({
          success: true,
          data: { message: `Logged ${logs.length} entries`, entries: logEntries }
        })
      }

      case 'clear': {
        // KV version doesn't support clearing all logs for data integrity
        // Instead, return recent activity summary
        return NextResponse.json({
          success: true,
          data: { message: 'Clear operation not supported in persistent storage', summary: await activityLoggerKV.getActivitySummary() }
        })
      }

      default: {
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
      }
    }
  } catch (error) {
    console.error('Activity POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process activity request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}