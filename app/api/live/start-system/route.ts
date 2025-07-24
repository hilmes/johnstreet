import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Dynamic import to avoid build-time issues
    const { dataOrchestrator } = await import('@/lib/feeds/DataOrchestrator')
    
    // Check if orchestrator is already running
    if (dataOrchestrator.isActive()) {
      return NextResponse.json({
        success: true,
        message: 'Live crypto sentiment monitoring system already running',
        timestamp: Date.now(),
        stats: await dataOrchestrator.getStats()
      })
    }
    
    // Initialize the data orchestrator with default configuration
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
          filter: 'rising|hot|bullish', // Focus on trending/bullish posts
          currencies: 'BTC,ETH,DOGE,SHIB,PEPE', // Major cryptos + memecoins
          kind: 'news,media', // News and media posts
          public: true
        } : undefined
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

    const stats = await dataOrchestrator.getStats()

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
    // Dynamic import to avoid build-time issues
    const { dataOrchestrator } = await import('@/lib/feeds/DataOrchestrator')
    
    const isActive = dataOrchestrator.isActive()
    const stats = await dataOrchestrator.getStats()
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
    // Dynamic import to avoid build-time issues
    const { dataOrchestrator } = await import('@/lib/feeds/DataOrchestrator')
    
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