import { NextRequest, NextResponse } from 'next/server'
import { SentimentAnalyzer } from '@/lib/sentiment/SentimentAnalyzer'

// Note: Uses Node.js runtime due to natural language processing dependencies

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, symbol, posts } = body

    const analyzer = new SentimentAnalyzer()

    if (text) {
      // Single text analysis
      const sentiment = analyzer.analyzeSentiment(text, symbol)
      return NextResponse.json({
        success: true,
        data: sentiment
      })
    } else if (posts && Array.isArray(posts)) {
      // Batch analysis
      const analysis = analyzer.analyzePostsBatch(posts, symbol)
      return NextResponse.json({
        success: true,
        data: analysis
      })
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Either text or posts array is required' 
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Sentiment analysis error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to analyze sentiment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint
  return NextResponse.json({
    success: true,
    message: 'Sentiment analysis API is running',
    endpoints: {
      'POST /api/sentiment/analyze': 'Analyze text or posts sentiment',
      'GET /api/sentiment/reddit': 'Scan Reddit subreddit',
      'POST /api/sentiment/reddit': 'Bulk scan multiple subreddits',
      'GET /api/sentiment/pump-detector': 'Detect pump and dump signals'
    }
  })
}