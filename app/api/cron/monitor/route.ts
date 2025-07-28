import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max execution time

export async function GET(request: NextRequest) {
  try {
    // Verify this is a Vercel Cron job
    const authHeader = headers().get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Dynamic imports
    const { dataOrchestrator } = await import('@/lib/feeds/DataOrchestrator')
    const { activityLoggerKV } = await import('@/lib/sentiment/ActivityLoggerKV')
    
    // Check if system is already running
    const isActive = dataOrchestrator.isActive()
    
    if (!isActive) {
      // Initialize with all data sources enabled (if API keys are available)
      const config = {
        rss: {
          enabled: true
        },
        twitter: {
          enabled: !!process.env.TWITTER_BEARER_TOKEN,
          config: process.env.TWITTER_BEARER_TOKEN ? {
            bearerToken: process.env.TWITTER_BEARER_TOKEN,
            maxResults: 100,
            streamRules: [
              { value: '(bitcoin OR ethereum OR crypto OR memecoin OR $PEPE OR $SHIB OR $DOGE OR $BONK) lang:en -is:retweet', tag: 'crypto_keywords' },
              { value: 'from:elonmusk (doge OR crypto)', tag: 'influencer_musk' },
              { value: '#memecoin OR #memecoins OR #1000x', tag: 'memecoin_tags' }
            ]
          } : undefined
        },
        cryptopanic: {
          enabled: !!process.env.CRYPTOPANIC_API_KEY,
          config: process.env.CRYPTOPANIC_API_KEY ? {
            apiKey: process.env.CRYPTOPANIC_API_KEY,
            baseUrl: 'https://cryptopanic.com/api/developer/v2',
            region: 'en',
            maxResults: 50,
            checkInterval: 120,
            active: true
          } : undefined
        },
        lunarcrush: {
          enabled: !!process.env.LUNARCRUSH_API_KEY,
          config: process.env.LUNARCRUSH_API_KEY ? {
            apiKey: process.env.LUNARCRUSH_API_KEY,
            interval: '1h',
            limit: 100
          } : undefined
        },
        pushshift: {
          enabled: true,
          config: {
            baseUrl: 'https://api.pushshift.io/reddit/search',
            maxResults: 100,
            rateLimit: 60,
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

      await dataOrchestrator.initialize(config)
      await dataOrchestrator.start()
    }

    // Run for 4.5 minutes (leaving buffer for cleanup)
    const startTime = Date.now()
    const runDuration = 4.5 * 60 * 1000 // 4.5 minutes
    
    // Collect data for the duration
    while (Date.now() - startTime < runDuration) {
      await new Promise(resolve => setTimeout(resolve, 5000)) // Check every 5 seconds
      
      // Log stats periodically
      if ((Date.now() - startTime) % 30000 < 5000) { // Every 30 seconds
        const stats = dataOrchestrator.getStats()
        await activityLoggerKV.log({
          type: 'cron_heartbeat',
          platform: 'system',
          source: 'cron_monitor',
          message: 'Monitoring service heartbeat',
          data: {
            runtime: Math.floor((Date.now() - startTime) / 1000),
            stats: stats,
            memory: process.memoryUsage()
          }
        })
      }
    }

    // Get final stats
    const finalStats = dataOrchestrator.getStats()
    const recentActivity = await activityLoggerKV.getRecentActivity(5 * 60 * 1000) // Last 5 minutes
    
    // Log completion
    await activityLoggerKV.log({
      type: 'cron_complete',
      platform: 'system',
      source: 'cron_monitor',
      message: 'Monitoring cycle completed',
      data: {
        duration: Math.floor((Date.now() - startTime) / 1000),
        eventsCollected: recentActivity.length,
        finalStats: finalStats
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Monitoring cycle completed',
      timestamp: Date.now(),
      stats: {
        duration: Math.floor((Date.now() - startTime) / 1000),
        eventsCollected: recentActivity.length,
        dataSourcesActive: finalStats.activeDataSources,
        totalEvents: finalStats.totalEvents
      }
    })

  } catch (error) {
    console.error('Cron monitor error:', error)
    
    // Log error
    const { activityLoggerKV } = await import('@/lib/sentiment/ActivityLoggerKV')
    await activityLoggerKV.logError(
      'cron_monitor',
      error instanceof Error ? error : new Error('Unknown error'),
      { timestamp: Date.now() }
    )
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Monitoring cycle failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}