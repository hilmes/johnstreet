import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json' // json, csv, ndjson
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const symbols = searchParams.get('symbols')?.split(',')
    const includeRaw = searchParams.get('includeRaw') === 'true'
    
    // Get archive index
    const index = await kv.get<string[]>('archive:index') || []
    
    // Filter archives by date range
    let filteredKeys = index
    if (startDate || endDate) {
      filteredKeys = index.filter(key => {
        const dateMatch = key.match(/archive:(\d{4}-\d{2}-\d{2})/)
        if (!dateMatch) return false
        const archiveDate = dateMatch[1]
        
        if (startDate && archiveDate < startDate) return false
        if (endDate && archiveDate > endDate) return false
        return true
      })
    }
    
    // Collect data from archives
    const trainingData: any[] = []
    
    for (const key of filteredKeys.slice(-100)) { // Limit to last 100 archives
      const archive = await kv.get<any>(key)
      if (!archive) continue
      
      // Process each symbol in the archive
      for (const [symbol, metrics] of Object.entries(archive.symbolMetrics)) {
        if (symbols && !symbols.includes(symbol)) continue
        
        const entry = {
          timestamp: archive.timestamp,
          date: archive.date,
          symbol,
          metrics: metrics as any,
          platformDistribution: archive.platformMetrics,
          rank: archive.topSymbols.indexOf(symbol) + 1,
          isCritical: archive.criticalAlerts.some((a: any) => a.symbol === symbol)
        }
        
        if (includeRaw) {
          // Include raw activity data (for more detailed training)
          const dayKey = `activity:daily:${archive.date}`
          const dailyActivity = await kv.get<any[]>(dayKey) || []
          entry['rawActivities'] = dailyActivity.filter((a: any) => 
            a.data?.symbols?.includes(symbol)
          ).slice(0, 10) // Limit raw data per symbol
        }
        
        trainingData.push(entry)
      }
    }
    
    // Format response based on requested format
    if (format === 'csv') {
      const csv = convertToCSV(trainingData)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=crypto-sentiment-training-${Date.now()}.csv`
        }
      })
    } else if (format === 'ndjson') {
      const ndjson = trainingData.map(d => JSON.stringify(d)).join('\n')
      return new NextResponse(ndjson, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Content-Disposition': `attachment; filename=crypto-sentiment-training-${Date.now()}.ndjson`
        }
      })
    } else {
      return NextResponse.json({
        success: true,
        timestamp: Date.now(),
        metadata: {
          totalRecords: trainingData.length,
          dateRange: {
            start: startDate || 'all',
            end: endDate || 'all'
          },
          symbols: symbols || 'all',
          format
        },
        data: trainingData
      })
    }

  } catch (error) {
    console.error('Data export error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Export failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Get aggregated statistics for ML model evaluation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { operation = 'stats' } = body
    
    if (operation === 'stats') {
      // Get statistical summary for model training
      const index = await kv.get<string[]>('archive:index') || []
      const recentArchives = await Promise.all(
        index.slice(-30).map(key => kv.get<any>(key))
      )
      
      const stats = {
        totalArchives: index.length,
        dateRange: {
          start: index[0]?.match(/archive:(\d{4}-\d{2}-\d{2})/)?.[1],
          end: index[index.length - 1]?.match(/archive:(\d{4}-\d{2}-\d{2})/)?.[1]
        },
        symbolStats: {} as Record<string, any>,
        platformStats: {} as Record<string, any>,
        correlations: {} as Record<string, any>
      }
      
      // Aggregate statistics
      for (const archive of recentArchives) {
        if (!archive) continue
        
        for (const [symbol, metrics] of Object.entries(archive.symbolMetrics)) {
          if (!stats.symbolStats[symbol]) {
            stats.symbolStats[symbol] = {
              totalMentions: 0,
              avgSentiment: [],
              avgRisk: [],
              platformCount: new Set(),
              criticalEvents: 0
            }
          }
          
          const symbolStat = stats.symbolStats[symbol]
          symbolStat.totalMentions += (metrics as any).mentions
          symbolStat.avgSentiment.push((metrics as any).sentiment)
          symbolStat.avgRisk.push((metrics as any).riskScore)
          ;(metrics as any).platforms.forEach((p: string) => symbolStat.platformCount.add(p))
          
          if (archive.criticalAlerts.some((a: any) => a.symbol === symbol)) {
            symbolStat.criticalEvents += 1
          }
        }
      }
      
      // Calculate final statistics
      for (const [symbol, stat] of Object.entries(stats.symbolStats)) {
        const s = stat as any
        s.avgSentiment = s.avgSentiment.reduce((a: number, b: number) => a + b, 0) / s.avgSentiment.length
        s.avgRisk = s.avgRisk.reduce((a: number, b: number) => a + b, 0) / s.avgRisk.length
        s.platformCount = s.platformCount.size
        s.criticalRate = s.criticalEvents / recentArchives.length
      }
      
      return NextResponse.json({
        success: true,
        timestamp: Date.now(),
        stats
      })
      
    } else if (operation === 'correlation') {
      // Calculate symbol correlations for ML features
      const { symbols = [], window = 7 } = body
      
      // Implementation for correlation analysis
      // This would analyze how symbols move together
      
      return NextResponse.json({
        success: true,
        message: 'Correlation analysis not yet implemented',
        timestamp: Date.now()
      })
    }
    
    return NextResponse.json({ error: 'Invalid operation' }, { status: 400 })
    
  } catch (error) {
    console.error('Data stats error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Stats calculation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''
  
  // Flatten nested objects for CSV
  const flatData = data.map(d => ({
    timestamp: d.timestamp,
    date: d.date,
    symbol: d.symbol,
    mentions: d.metrics.mentions,
    sentiment: d.metrics.sentiment,
    riskScore: d.metrics.riskScore,
    engagement: d.metrics.engagement,
    platforms: d.metrics.platforms.join('|'),
    rank: d.rank,
    isCritical: d.isCritical
  }))
  
  const headers = Object.keys(flatData[0])
  const csv = [
    headers.join(','),
    ...flatData.map(row => 
      headers.map(header => {
        const value = row[header as keyof typeof row]
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value
      }).join(',')
    )
  ].join('\n')
  
  return csv
}