import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { activityLoggerKV } = await import('@/lib/sentiment/ActivityLoggerKV')
    
    // Get archive index
    const archiveIndex = await kv.get<string[]>('archive:index') || []
    
    // Get recent cron logs
    const recentActivity = await activityLoggerKV.getRecentActivity(24 * 60 * 60 * 1000) // Last 24 hours
    const cronLogs = recentActivity.filter(a => 
      a.type === 'cron_heartbeat' || 
      a.type === 'cron_complete' || 
      a.type === 'archive_complete'
    )
    
    // Get today's daily summary
    const today = new Date().toISOString().split('T')[0]
    const dailySummary = await kv.get<any>(`archive:daily:${today}`)
    
    // Calculate collection statistics
    const stats = {
      archiveCount: archiveIndex.length,
      oldestArchive: archiveIndex[0]?.match(/archive:(\d{4}-\d{2}-\d{2})/)?.[1],
      newestArchive: archiveIndex[archiveIndex.length - 1]?.match(/archive:(\d{4}-\d{2}-\d{2})/)?.[1],
      lastCronRun: cronLogs.find(log => log.type === 'cron_complete')?.timestamp,
      lastArchive: cronLogs.find(log => log.type === 'archive_complete')?.timestamp,
      todayStats: dailySummary ? {
        totalEvents: dailySummary.totalEvents,
        uniqueSymbols: dailySummary.uniqueSymbols?.length || 0,
        hourlySummaries: dailySummary.hourlySummaries
      } : null,
      recentCronRuns: cronLogs.slice(0, 10).map(log => ({
        timestamp: log.timestamp,
        type: log.type,
        data: log.data
      }))
    }
    
    // Get storage usage estimate
    const storageKeys = await kv.keys('*')
    const storageEstimate = {
      totalKeys: storageKeys.length,
      archiveKeys: storageKeys.filter(k => k.startsWith('archive:')).length,
      activityKeys: storageKeys.filter(k => k.startsWith('activity:')).length,
      otherKeys: storageKeys.filter(k => !k.startsWith('archive:') && !k.startsWith('activity:')).length
    }
    
    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      collectionStatus: {
        isActive: Date.now() - (stats.lastCronRun || 0) < 10 * 60 * 1000, // Active if run in last 10 minutes
        lastUpdate: stats.lastCronRun,
        nextScheduledRun: stats.lastCronRun ? stats.lastCronRun + (5 * 60 * 1000) : null
      },
      archiveStatus: {
        totalArchives: stats.archiveCount,
        dateRange: {
          start: stats.oldestArchive,
          end: stats.newestArchive
        },
        lastArchive: stats.lastArchive,
        nextScheduledArchive: stats.lastArchive ? stats.lastArchive + (6 * 60 * 60 * 1000) : null
      },
      todayStats: stats.todayStats,
      storage: storageEstimate,
      recentActivity: stats.recentCronRuns
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Status check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}