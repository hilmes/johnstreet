import { NextRequest, NextResponse } from 'next/server'
import { TwitterScanner } from '@/lib/sentiment/TwitterScanner'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action') || 'search'
  const query = searchParams.get('query')
  const symbol = searchParams.get('symbol')
  const username = searchParams.get('username')
  const hours = parseInt(searchParams.get('hours') || '24')
  const maxResults = parseInt(searchParams.get('max_results') || '100')

  try {
    const scanner = new TwitterScanner()
    
    // Try to connect with credentials from environment
    try {
      if (process.env.TWITTER_BEARER_TOKEN) {
        await scanner.connect({
          bearerToken: process.env.TWITTER_BEARER_TOKEN
        })
      } else {
        await scanner.connectPublic()
      }
    } catch (error) {
      console.warn('Twitter API connection failed, using public mode:', error)
      await scanner.connectPublic()
    }

    switch (action) {
      case 'search': {
        if (!query) {
          return NextResponse.json(
            { success: false, error: 'query parameter is required for search' },
            { status: 400 }
          )
        }

        const searchResult = await scanner.searchTweets(query, maxResults, hours)
        return NextResponse.json({
          success: true,
          data: searchResult
        })
      }

      case 'symbol': {
        if (!symbol) {
          return NextResponse.json(
            { success: false, error: 'symbol parameter is required' },
            { status: 400 }
          )
        }

        const analyses = await scanner.searchCryptoSymbols([symbol], hours, maxResults)
        return NextResponse.json({
          success: true,
          data: analyses[0] || null
        })
      }

      case 'symbols': {
        const symbols = searchParams.get('symbols')?.split(',') || []
        if (symbols.length === 0) {
          return NextResponse.json(
            { success: false, error: 'symbols parameter is required (comma-separated)' },
            { status: 400 }
          )
        }

        const analyses = await scanner.searchCryptoSymbols(symbols, hours, maxResults)
        return NextResponse.json({
          success: true,
          data: analyses
        })
      }

      case 'monitor': {
        const analyses = await scanner.monitorCryptoMentions(hours)
        return NextResponse.json({
          success: true,
          data: analyses
        })
      }

      case 'user': {
        if (!username) {
          return NextResponse.json(
            { success: false, error: 'username parameter is required' },
            { status: 400 }
          )
        }

        const tweets = await scanner.getUserTweets(username, maxResults, hours)
        return NextResponse.json({
          success: true,
          data: tweets
        })
      }

      case 'influencers': {
        const influencers = scanner.getCryptoInfluencers()
        return NextResponse.json({
          success: true,
          data: influencers
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
    console.error('Twitter API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process Twitter request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, symbols, queries, usernames, hours = 24, maxResults = 100 } = body

    const scanner = new TwitterScanner()
    
    // Try to connect with credentials
    try {
      if (process.env.TWITTER_BEARER_TOKEN) {
        await scanner.connect({
          bearerToken: process.env.TWITTER_BEARER_TOKEN
        })
      } else {
        await scanner.connectPublic()
      }
    } catch (error) {
      console.warn('Twitter API connection failed, using public mode:', error)
      await scanner.connectPublic()
    }

    switch (action) {
      case 'bulk_symbol_search': {
        if (!symbols || !Array.isArray(symbols)) {
          return NextResponse.json(
            { success: false, error: 'symbols array is required' },
            { status: 400 }
          )
        }

        const analyses = await scanner.searchCryptoSymbols(symbols, hours, maxResults)
        return NextResponse.json({
          success: true,
          data: {
            totalSymbols: symbols.length,
            analyzedSymbols: analyses.length,
            analyses
          }
        })
      }

      case 'bulk_query_search': {
        if (!queries || !Array.isArray(queries)) {
          return NextResponse.json(
            { success: false, error: 'queries array is required' },
            { status: 400 }
          )
        }

        const results = []
        for (const query of queries) {
          try {
            const searchResult = await scanner.searchTweets(query, maxResults, hours)
            results.push({
              query,
              result: searchResult
            })
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000))
          } catch (error) {
            console.error(`Error searching query "${query}":`, error)
            results.push({
              query,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            totalQueries: queries.length,
            results
          }
        })
      }

      case 'bulk_user_analysis': {
        if (!usernames || !Array.isArray(usernames)) {
          return NextResponse.json(
            { success: false, error: 'usernames array is required' },
            { status: 400 }
          )
        }

        const results = []
        for (const username of usernames) {
          try {
            const tweets = await scanner.getUserTweets(username, maxResults, hours)
            results.push({
              username,
              tweets,
              tweetCount: tweets.length
            })
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000))
          } catch (error) {
            console.error(`Error analyzing user ${username}:`, error)
            results.push({
              username,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            totalUsers: usernames.length,
            results
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
    console.error('Twitter bulk operation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process bulk Twitter request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}