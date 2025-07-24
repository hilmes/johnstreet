import { NextRequest, NextResponse } from 'next/server'
import { HistoricalVerifier } from '@/lib/sentiment/HistoricalVerifier'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action') || 'verify'
  const symbol = searchParams.get('symbol')
  const hours = parseInt(searchParams.get('hours') || '24')

  try {
    const verifier = new HistoricalVerifier()
    await verifier.initialize()

    switch (action) {
      case 'verify': {
        if (!symbol) {
          return NextResponse.json(
            { success: false, error: 'symbol parameter is required for verification' },
            { status: 400 }
          )
        }

        const alert = await verifier.verifyNewSymbol(symbol)
        return NextResponse.json({
          success: true,
          data: alert
        })
      }

      case 'history': {
        if (!symbol) {
          return NextResponse.json(
            { success: false, error: 'symbol parameter is required for history' },
            { status: 400 }
          )
        }

        const history = await verifier.getSymbolHistory(symbol)
        return NextResponse.json({
          success: true,
          data: history || null
        })
      }

      case 'tracked': {
        const trackedSymbols = await verifier.getAllTrackedSymbols()
        return NextResponse.json({
          success: true,
          data: trackedSymbols
        })
      }

      case 'recent': {
        const recentSymbols = await verifier.getRecentlyDetectedSymbols(hours)
        return NextResponse.json({
          success: true,
          data: recentSymbols
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
    console.error('Historical verification error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process historical verification request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, symbols, hours = 24 } = body

    const verifier = new HistoricalVerifier()
    await verifier.initialize()

    switch (action) {
      case 'bulk_verify': {
        if (!symbols || !Array.isArray(symbols)) {
          return NextResponse.json(
            { success: false, error: 'symbols array is required' },
            { status: 400 }
          )
        }

        const results = []
        for (const symbol of symbols) {
          try {
            const alert = await verifier.verifyNewSymbol(symbol)
            results.push(alert)
          } catch (error) {
            console.error(`Error verifying symbol ${symbol}:`, error)
            results.push({
              symbol,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }

        // Sort by risk level and confidence
        results.sort((a, b) => {
          const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          const aRisk = riskOrder[a.riskLevel as keyof typeof riskOrder] || 0
          const bRisk = riskOrder[b.riskLevel as keyof typeof riskOrder] || 0
          
          if (aRisk !== bRisk) return bRisk - aRisk
          return (b.confidence || 0) - (a.confidence || 0)
        })

        return NextResponse.json({
          success: true,
          data: {
            totalSymbols: symbols.length,
            verifiedSymbols: results.length,
            highRiskCount: results.filter(r => r.riskLevel === 'high' || r.riskLevel === 'critical').length,
            newSymbolCount: results.filter(r => !r.historicalContext?.hasHistory).length,
            results
          }
        })
      }

      case 'scan_new_symbols': {
        // Scan for new symbols across social media platforms
        const recentSymbols = await verifier.getRecentlyDetectedSymbols(hours)
        
        return NextResponse.json({
          success: true,
          data: {
            scanTime: new Date().toISOString(),
            timeRange: `${hours} hours`,
            newSymbols: recentSymbols
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
    console.error('Historical verification bulk operation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process bulk historical verification request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}