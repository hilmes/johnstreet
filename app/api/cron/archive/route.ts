import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { kv } from '@vercel/kv'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max execution time

interface ArchiveEntry {
  timestamp: number
  date: string
  symbolMetrics: Record<string, {
    mentions: number
    sentiment: number
    riskScore: number
    platforms: string[]
    engagement: number
  }>
  platformMetrics: Record<string, {
    events: number
    symbols: string[]
    avgSentiment: number
  }>
  topSymbols: string[]
  criticalAlerts: any[]
  totalEvents: number
}

export async function GET(request: NextRequest) {
  try {
    // Verify this is a Vercel Cron job
    const authHeader = headers().get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { activityLoggerKV } = await import('@/lib/sentiment/ActivityLoggerKV')
    
    // Get data from the last 6 hours
    const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000)
    const recentActivity = await activityLoggerKV.getRecentActivity(6 * 60 * 60 * 1000)
    
    // Filter for relevant activity types
    const relevantActivity = recentActivity.filter(activity => 
      activity.type === 'symbol_detection' || 
      activity.type === 'twitter_scan' || 
      activity.type === 'reddit_scan' ||
      activity.type === 'news_scan' ||
      activity.type === 'social_scan' ||
      activity.type === 'cross_platform_signal'
    )

    // Aggregate metrics by symbol
    const symbolMetrics: Record<string, any> = {}
    const platformMetrics: Record<string, any> = {}
    const criticalAlerts: any[] = []

    for (const activity of relevantActivity) {
      // Symbol metrics
      if (activity.data?.symbols) {
        for (const symbol of activity.data.symbols) {
          if (!symbolMetrics[symbol]) {
            symbolMetrics[symbol] = {
              mentions: 0,
              sentiment: 0,
              riskScore: 0,
              platforms: new Set(),
              engagement: 0,
              firstSeen: activity.timestamp,
              lastSeen: activity.timestamp
            }
          }
          
          symbolMetrics[symbol].mentions += 1
          symbolMetrics[symbol].sentiment += activity.data.sentiment || 0
          symbolMetrics[symbol].riskScore += activity.data.riskScore || 0
          symbolMetrics[symbol].platforms.add(activity.platform)
          symbolMetrics[symbol].engagement += activity.data.engagement || 0
          symbolMetrics[symbol].lastSeen = activity.timestamp
        }
      }

      // Platform metrics
      if (!platformMetrics[activity.platform]) {
        platformMetrics[activity.platform] = {
          events: 0,
          symbols: new Set(),
          totalSentiment: 0
        }
      }
      
      platformMetrics[activity.platform].events += 1
      if (activity.data?.symbols) {
        activity.data.symbols.forEach((s: string) => platformMetrics[activity.platform].symbols.add(s))
      }
      platformMetrics[activity.platform].totalSentiment += activity.data?.sentiment || 0

      // Collect critical alerts
      if (activity.data?.riskScore > 0.8 || activity.type === 'cross_platform_signal') {
        criticalAlerts.push({
          timestamp: activity.timestamp,
          type: activity.type,
          symbol: activity.data?.symbols?.[0],
          riskScore: activity.data?.riskScore,
          platform: activity.platform,
          message: activity.message
        })
      }
    }

    // Normalize metrics
    const normalizedSymbolMetrics: Record<string, any> = {}
    for (const [symbol, metrics] of Object.entries(symbolMetrics)) {
      normalizedSymbolMetrics[symbol] = {
        mentions: metrics.mentions,
        sentiment: metrics.mentions > 0 ? metrics.sentiment / metrics.mentions : 0,
        riskScore: metrics.mentions > 0 ? metrics.riskScore / metrics.mentions : 0,
        platforms: Array.from(metrics.platforms),
        engagement: metrics.engagement,
        duration: metrics.lastSeen - metrics.firstSeen
      }
    }

    const normalizedPlatformMetrics: Record<string, any> = {}
    for (const [platform, metrics] of Object.entries(platformMetrics)) {
      normalizedPlatformMetrics[platform] = {
        events: metrics.events,
        symbols: Array.from(metrics.symbols),
        avgSentiment: metrics.events > 0 ? metrics.totalSentiment / metrics.events : 0
      }
    }

    // Create archive entry
    const archiveEntry: ArchiveEntry = {
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      symbolMetrics: normalizedSymbolMetrics,
      platformMetrics: normalizedPlatformMetrics,
      topSymbols: Object.entries(normalizedSymbolMetrics)
        .sort((a, b) => b[1].mentions - a[1].mentions)
        .slice(0, 20)
        .map(([symbol]) => symbol),
      criticalAlerts: criticalAlerts.slice(-50), // Keep last 50 alerts
      totalEvents: relevantActivity.length
    }

    // Store in archive
    const archiveKey = `archive:${archiveEntry.date}:${Math.floor(Date.now() / 1000)}`
    await kv.set(archiveKey, archiveEntry, { ex: 90 * 24 * 60 * 60 }) // Keep for 90 days
    
    // Update archive index
    const indexKey = 'archive:index'
    const index = await kv.get<string[]>(indexKey) || []
    index.push(archiveKey)
    // Keep only last 1000 entries in index
    if (index.length > 1000) {
      index.splice(0, index.length - 1000)
    }
    await kv.set(indexKey, index)

    // Store daily summary
    const dailyKey = `archive:daily:${archiveEntry.date}`
    const existingDaily = await kv.get<any>(dailyKey) || {
      date: archiveEntry.date,
      totalEvents: 0,
      uniqueSymbols: new Set(),
      platforms: {},
      hourlySummaries: []
    }
    
    existingDaily.totalEvents += archiveEntry.totalEvents
    Object.keys(archiveEntry.symbolMetrics).forEach(s => existingDaily.uniqueSymbols.add(s))
    existingDaily.hourlySummaries.push({
      hour: new Date().getHours(),
      events: archiveEntry.totalEvents,
      topSymbols: archiveEntry.topSymbols.slice(0, 5)
    })
    
    await kv.set(dailyKey, {
      ...existingDaily,
      uniqueSymbols: Array.from(existingDaily.uniqueSymbols)
    }, { ex: 180 * 24 * 60 * 60 }) // Keep daily summaries for 6 months

    // Log archive completion
    await activityLoggerKV.log({
      type: 'archive_complete',
      platform: 'system',
      source: 'cron_archive',
      message: 'Data archive completed',
      data: {
        archiveKey,
        eventsArchived: archiveEntry.totalEvents,
        symbolsTracked: Object.keys(archiveEntry.symbolMetrics).length,
        criticalAlerts: criticalAlerts.length
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Archive completed successfully',
      timestamp: Date.now(),
      archive: {
        key: archiveKey,
        eventsArchived: archiveEntry.totalEvents,
        symbolsTracked: Object.keys(archiveEntry.symbolMetrics).length,
        topSymbols: archiveEntry.topSymbols.slice(0, 10),
        criticalAlerts: criticalAlerts.length
      }
    })

  } catch (error) {
    console.error('Cron archive error:', error)
    
    const { activityLoggerKV } = await import('@/lib/sentiment/ActivityLoggerKV')
    await activityLoggerKV.logError(
      'cron_archive',
      error instanceof Error ? error : new Error('Unknown error'),
      { timestamp: Date.now() }
    )
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Archive failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}