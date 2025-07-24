import { NextRequest, NextResponse } from 'next/server'
import { ActivityLogger } from '@/lib/sentiment/ActivityLogger'

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
    const logger = ActivityLogger.getInstance()

    switch (action) {
      case 'recent': {
        const logs = logger.getRecentLogs(limit, type as any)
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

        const logs = logger.getLogsByTimeRange(parseInt(startTime), parseInt(endTime))
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

        const logs = logger.getLogsByPlatform(platform as any)
        return NextResponse.json({
          success: true,
          data: logs.slice(0, limit)
        })
      }

      case 'severity': {
        if (!severity) {
          return NextResponse.json(
            { success: false, error: 'severity parameter is required' },
            { status: 400 }
          )
        }

        const logs = logger.getLogsBySeverity(severity as any)
        return NextResponse.json({
          success: true,
          data: logs.slice(0, limit)
        })
      }

      case 'stats': {
        const timeRange = parseInt(searchParams.get('time_range') || '60000') // Default: 1 minute
        const stats = logger.getStatistics(timeRange)
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
            const unsubscribe = logger.subscribe((entry) => {
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
        const logs = logger.getAllLogs()
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

    const logger = ActivityLogger.getInstance()

    switch (action) {
      case 'log': {
        if (!entry) {
          return NextResponse.json(
            { success: false, error: 'entry is required' },
            { status: 400 }
          )
        }

        const logEntry = logger.log(entry)
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

        logger.logBatch(logs)
        return NextResponse.json({
          success: true,
          data: { message: `Logged ${logs.length} entries` }
        })
      }

      case 'clear': {
        logger.clearLogs()
        return NextResponse.json({
          success: true,
          data: { message: 'All logs cleared' }
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