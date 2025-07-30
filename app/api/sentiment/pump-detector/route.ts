import { NextRequest, NextResponse } from 'next/server'
import { RedditScanner } from '@/lib/sentiment/RedditScanner'
import { UnifiedExchange } from '@/lib/exchanges/UnifiedExchange'
import { SentimentAnalyzer } from '@/lib/sentiment/SentimentAnalyzer'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol')
  const exchange = searchParams.get('exchange') || 'kraken'
  const timeframe = searchParams.get('timeframe') as 'hour' | 'day' || 'hour'
  
  try {
    const results = {
      symbol,
      timestamp: Date.now(),
      riskLevel: 'low' as 'low' | 'medium' | 'high' | 'critical',
      confidence: 0,
      alerts: [] as any[],
      data: {
        social: null as any,
        market: null as any,
        combined: null as any
      }
    }

    // 1. Social Media Analysis
    const redditScanner = new RedditScanner()
    await redditScanner.connectPublic()
    
    const pumpSubreddits = redditScanner.getPumpSubreddits()
    const socialAnalyses = await redditScanner.scanMultipleSubreddits(pumpSubreddits, timeframe)
    
    // Aggregate social signals
    const allPumpSignals = socialAnalyses.flatMap(analysis => analysis.pumpSignals)
    const symbolSignals = symbol ? 
      allPumpSignals.filter(signal => signal.symbol.toLowerCase() === symbol.toLowerCase()) :
      allPumpSignals

    // Extract mentioned symbols from all analyses
    const mentionedSymbols = new Map<string, number>()
    for (const analysis of socialAnalyses) {
      if (analysis.sentiment?.symbols) {
        for (const symbolData of analysis.sentiment.symbols) {
          const count = mentionedSymbols.get(symbolData.symbol) || 0
          mentionedSymbols.set(symbolData.symbol, count + symbolData.mentions)
        }
      }
    }
    
    // Sort symbols by mention frequency
    const topMentioned = Array.from(mentionedSymbols.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([symbol, mentions]) => ({ symbol, mentions }))
    
    results.data.social = {
      totalSignals: allPumpSignals.length,
      symbolSignals: symbolSignals.length,
      highRiskSignals: symbolSignals.filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical'),
      avgConfidence: symbolSignals.length > 0 ? 
        symbolSignals.reduce((sum, s) => sum + s.confidence, 0) / symbolSignals.length : 0,
      mentionedSymbols: topMentioned
    }

    // 2. Market Data Analysis (if symbol provided)
    if (symbol) {
      try {
        const exchangeClient = new UnifiedExchange(exchange)
        await exchangeClient.connect()
        
        // Check for volume and price anomalies
        const volumeSpike = await exchangeClient.detectVolumeSpike(symbol, '1m', 100)
        const priceAnomaly = await exchangeClient.detectPriceAnomaly(symbol, '1m', 100)
        
        results.data.market = {
          volumeSpike: volumeSpike.isSpike,
          volumeMultiplier: volumeSpike.volumeSpike,
          priceAnomaly: priceAnomaly.isAnomaly,
          priceChange: priceAnomaly.percentChange,
          volatility: priceAnomaly.volatility
        }

        // Combine social and market signals for enhanced detection
        if (symbolSignals.length > 0) {
          const analyzer = new SentimentAnalyzer()
          const mockPosts = [] // In real implementation, collect actual social posts
          
          const combinedSignal = analyzer.detectPumpSignal(
            mockPosts, 
            symbol, 
            volumeSpike.volumeSpike, 
            priceAnomaly.percentChange
          )
          
          results.data.combined = combinedSignal
          results.confidence = combinedSignal.confidence
          results.riskLevel = combinedSignal.riskLevel
        }
      } catch (error) {
        console.error('Market data analysis error:', error)
        results.data.market = { error: 'Failed to fetch market data' }
      }
    }

    // 3. Generate Alerts
    if (results.data.social.highRiskSignals.length > 0) {
      results.alerts.push({
        type: 'high_risk_social_signal',
        message: `${results.data.social.highRiskSignals.length} high-risk pump signals detected`,
        severity: 'warning'
      })
    }

    if (results.data.market?.volumeSpike && results.data.market?.priceAnomaly) {
      results.alerts.push({
        type: 'market_anomaly',
        message: 'Unusual volume and price activity detected',
        severity: 'critical'
      })
    }

    // Determine overall risk level
    if (results.alerts.some(a => a.severity === 'critical')) {
      results.riskLevel = 'critical'
    } else if (results.alerts.some(a => a.severity === 'warning')) {
      results.riskLevel = results.data.social.highRiskSignals.length > 2 ? 'high' : 'medium'
    }

    return NextResponse.json({
      success: true,
      data: results
    })
  } catch (error) {
    console.error('Pump detection error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to detect pump signals',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbols, exchanges = ['kraken'], timeframe = 'hour' } = body

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        { success: false, error: 'symbols array is required' },
        { status: 400 }
      )
    }

    const results = []

    for (const symbol of symbols) {
      for (const exchange of exchanges) {
        try {
          // Use the GET logic for each symbol/exchange combination
          const url = new URL(`${request.url}?symbol=${symbol}&exchange=${exchange}&timeframe=${timeframe}`)
          const response = await fetch(url.toString())
          const result = await response.json()
          
          if (result.success) {
            results.push(result.data)
          }
        } catch (error) {
          console.error(`Error analyzing ${symbol} on ${exchange}:`, error)
        }
      }
    }

    // Sort by risk level and confidence
    results.sort((a, b) => {
      const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const aRisk = riskOrder[a.riskLevel as keyof typeof riskOrder] || 0
      const bRisk = riskOrder[b.riskLevel as keyof typeof riskOrder] || 0
      
      if (aRisk !== bRisk) return bRisk - aRisk
      return b.confidence - a.confidence
    })

    return NextResponse.json({
      success: true,
      data: {
        totalAnalyzed: results.length,
        highRiskCount: results.filter(r => r.riskLevel === 'high' || r.riskLevel === 'critical').length,
        results: results.slice(0, 50) // Limit response size
      }
    })
  } catch (error) {
    console.error('Bulk pump detection error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to analyze multiple symbols',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}