import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

interface KrakenOHLCData {
  time: number
  open: string
  high: string
  low: string
  close: string
  vwap: string
  volume: string
  count: number
}

interface HistoricalDataPoint {
  time: number
  price: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol') || 'BTC/USD'
    const interval = searchParams.get('interval') || '1m'
    const count = parseInt(searchParams.get('count') || '50')

    // Convert symbol to Kraken format
    const krakenSymbol = symbol.replace('BTC', 'XBT')

    // Map intervals to Kraken format
    const intervalMap: Record<string, number> = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '4h': 240,
      '1d': 1440
    }

    const krakenInterval = intervalMap[interval] || 1

    // Calculate since parameter (24 hours ago)
    const since = Math.floor((Date.now() - (24 * 60 * 60 * 1000)) / 1000)

    // Fetch from Kraken REST API
    const krakenUrl = `https://api.kraken.com/0/public/OHLC?pair=${krakenSymbol}&interval=${krakenInterval}&since=${since}`
    
    console.log('Fetching from Kraken:', krakenUrl)
    
    const response = await fetch(krakenUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'JohnStreet Trading Platform',
      },
    })

    if (!response.ok) {
      throw new Error(`Kraken API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken API error: ${data.error.join(', ')}`)
    }

    // Extract OHLC data
    const pairKey = Object.keys(data.result).find(key => key !== 'last')
    if (!pairKey || !data.result[pairKey]) {
      throw new Error('No data returned from Kraken')
    }

    const ohlcData = data.result[pairKey] as Array<[number, string, string, string, string, string, string, number]>

    // Convert to our format
    const history: HistoricalDataPoint[] = ohlcData
      .slice(-count) // Take last N points
      .map(([time, open, high, low, close, vwap, volume, count]) => ({
        time: time * 1000, // Convert to milliseconds
        price: parseFloat(close),
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
        volume: parseFloat(volume)
      }))

    return NextResponse.json({
      symbol,
      interval,
      count: history.length,
      history
    })

  } catch (error) {
    console.error('Historical data API error:', error)
    
    // Return mock data if Kraken API fails
    const mockHistory: HistoricalDataPoint[] = []
    const basePrice = symbol.includes('BTC') ? 45000 : 2800
    const now = Date.now()
    
    for (let i = 50; i >= 0; i--) {
      const time = now - (i * 60 * 1000) // 1 minute intervals
      const randomChange = (Math.random() - 0.5) * 0.02 // ±1% random change
      const price = basePrice * (1 + randomChange)
      
      mockHistory.push({
        time,
        price,
        open: price * 0.999,
        high: price * 1.001,
        low: price * 0.998,
        close: price,
        volume: Math.random() * 100
      })
    }

    return NextResponse.json({
      symbol: symbol || 'BTC/USD',
      interval: 'mock',
      count: mockHistory.length,
      history: mockHistory,
      error: 'Using mock data due to API error'
    })
  }
}