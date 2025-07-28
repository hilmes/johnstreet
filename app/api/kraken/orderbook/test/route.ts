import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol') || 'BTC/USD'
    
    // Convert symbol to Kraken format
    const krakenSymbol = symbol.replace('BTC', 'XBT')
    
    console.log(`Fetching order book for ${krakenSymbol}`)
    
    // Fetch from Kraken REST API
    const krakenUrl = `https://api.kraken.com/0/public/Depth?pair=${krakenSymbol}&count=10`
    
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

    // Extract order book data
    const pairKey = Object.keys(data.result).find(key => key !== 'last')
    if (!pairKey || !data.result[pairKey]) {
      throw new Error('No order book data returned from Kraken')
    }

    const orderBookData = data.result[pairKey]

    // Format the response to show we're getting real data
    const bids = orderBookData.bids.slice(0, 10).map(([price, volume, timestamp]: [string, string, number]) => ({
      price: parseFloat(price),
      volume: parseFloat(volume),
      timestamp
    }))

    const asks = orderBookData.asks.slice(0, 10).map(([price, volume, timestamp]: [string, string, number]) => ({
      price: parseFloat(price),
      volume: parseFloat(volume), 
      timestamp
    }))

    const bestBid = bids[0]?.price || 0
    const bestAsk = asks[0]?.price || 0
    const spread = bestAsk - bestBid

    return NextResponse.json({
      symbol,
      krakenSymbol,
      timestamp: new Date().toISOString(),
      source: 'Kraken REST API',
      bids,
      asks,
      bestBid,
      bestAsk,
      spread,
      spreadPercent: bestAsk > 0 ? ((spread / bestAsk) * 100) : 0,
      isLive: true
    })

  } catch (error) {
    console.error('Order book test API error:', error)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      source: 'Error fallback',
      isLive: false
    }, { status: 500 })
  }
}