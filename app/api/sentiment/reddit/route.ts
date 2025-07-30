import { NextRequest, NextResponse } from 'next/server'
import { RedditScanner } from '@/lib/sentiment/RedditScanner'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const subreddit = searchParams.get('subreddit') || 'CryptoCurrency'
  const timeframe = searchParams.get('timeframe') as 'hour' | 'day' | 'week' | 'month' || 'day'
  const limit = parseInt(searchParams.get('limit') || '50')
  const includeComments = searchParams.get('includeComments') === 'true'

  try {
    const scanner = new RedditScanner()
    
    // Connect using public API (no authentication required)
    await scanner.connectPublic()
    
    const analysis = await scanner.scanSubreddit(subreddit, timeframe, limit, includeComments)
    
    return NextResponse.json({
      success: true,
      data: analysis
    })
  } catch (error) {
    console.error('Reddit sentiment analysis error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to analyze Reddit sentiment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subreddits, timeframe = 'day', credentials } = body

    const scanner = new RedditScanner()
    
    if (credentials) {
      await scanner.connect(credentials)
    } else {
      await scanner.connectPublic()
    }
    
    const analyses = await scanner.scanMultipleSubreddits(subreddits, timeframe)
    
    // Aggregate results
    const aggregated = {
      totalSubreddits: analyses.length,
      overallSentiment: analyses.reduce((sum, analysis) => sum + analysis.sentimentScore, 0) / analyses.length,
      totalPumpSignals: analyses.reduce((sum, analysis) => sum + analysis.pumpSignals.length, 0),
      highRiskSignals: analyses.flatMap(analysis => 
        analysis.pumpSignals.filter(signal => signal.riskLevel === 'high' || signal.riskLevel === 'critical')
      ),
      topKeywords: getTopKeywords(analyses),
      subredditAnalyses: analyses
    }
    
    return NextResponse.json({
      success: true,
      data: aggregated
    })
  } catch (error) {
    console.error('Bulk Reddit analysis error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to analyze multiple subreddits',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function getTopKeywords(analyses: any[]): string[] {
  const keywordCount = new Map<string, number>()
  
  for (const analysis of analyses) {
    for (const keyword of analysis.metrics.hotKeywords) {
      keywordCount.set(keyword, (keywordCount.get(keyword) || 0) + 1)
    }
  }
  
  return Array.from(keywordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([keyword]) => keyword)
}