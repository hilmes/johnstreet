import axios from 'axios'

export interface HistoricalDataRequest {
  symbol: string
  timeframe: string
  startDate: Date
  endDate: Date
}

export interface KrakenOHLC {
  time: number
  open: number
  high: number
  low: number
  close: number
  vwap: number
  volume: number
  count: number
}

const timeframeMap: Record<string, number> = {
  '1m': 1,
  '5m': 5,
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '4h': 240,
  '1d': 1440,
  '1w': 10080,
  '2w': 21600
}

export async function getHistoricalData(request: HistoricalDataRequest): Promise<KrakenOHLC[]> {
  try {
    // Convert symbol format (BTC/USD -> XBTUSD)
    const pair = request.symbol
      .replace('BTC', 'XBT')
      .replace('/', '')
    
    const interval = timeframeMap[request.timeframe] || 60
    const since = Math.floor(request.startDate.getTime() / 1000)
    
    const response = await axios.get('https://api.kraken.com/0/public/OHLC', {
      params: {
        pair,
        interval,
        since
      }
    })
    
    if (response.data.error && response.data.error.length > 0) {
      throw new Error(response.data.error[0])
    }
    
    const data = response.data.result[Object.keys(response.data.result)[0]]
    
    // Convert Kraken format to our format
    const ohlcData: KrakenOHLC[] = data.map((candle: any[]) => ({
      time: candle[0],
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      vwap: parseFloat(candle[5]),
      volume: parseFloat(candle[6]),
      count: candle[7]
    }))
    
    // Filter by end date
    const endTime = request.endDate.getTime() / 1000
    return ohlcData.filter(candle => candle.time <= endTime)
  } catch (error) {
    console.error('Error fetching historical data:', error)
    
    // Return mock data for development/testing
    return generateMockHistoricalData(request)
  }
}

function generateMockHistoricalData(request: HistoricalDataRequest): KrakenOHLC[] {
  const data: KrakenOHLC[] = []
  const interval = timeframeMap[request.timeframe] || 60
  const intervalMs = interval * 60 * 1000
  
  let currentTime = request.startDate.getTime()
  const endTime = request.endDate.getTime()
  
  // Base price based on symbol
  let basePrice = 40000
  if (request.symbol.includes('ETH')) basePrice = 2500
  else if (request.symbol.includes('SOL')) basePrice = 100
  else if (request.symbol.includes('ADA')) basePrice = 0.5
  
  while (currentTime <= endTime) {
    const volatility = basePrice * 0.002 // 0.2% volatility per candle
    const trend = Math.sin(currentTime / (24 * 60 * 60 * 1000)) * basePrice * 0.01 // Daily cycle
    
    const open = basePrice + (Math.random() - 0.5) * volatility + trend
    const close = open + (Math.random() - 0.5) * volatility
    const high = Math.max(open, close) + Math.random() * volatility
    const low = Math.min(open, close) - Math.random() * volatility
    const volume = 100 + Math.random() * 1000
    
    data.push({
      time: Math.floor(currentTime / 1000),
      open,
      high,
      low,
      close,
      vwap: (open + close) / 2,
      volume,
      count: Math.floor(Math.random() * 100)
    })
    
    basePrice = close
    currentTime += intervalMs
  }
  
  return data
}