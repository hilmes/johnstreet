import { NextRequest, NextResponse } from 'next/server'
import { GeneratedStrategy } from '@/lib/anthropic/client'
import { StrategyExecutor, OHLCV } from '@/lib/backtest/StrategyExecutor'
import { getHistoricalData } from '@/lib/kraken/historical'

export const runtime = 'edge'

export interface BacktestRequest {
  strategy: GeneratedStrategy
  symbol: string
  startDate: string
  endDate: string
  initialBalance?: number
}

export async function POST(request: NextRequest) {
  try {
    const body: BacktestRequest = await request.json()
    const { strategy, symbol, startDate, endDate, initialBalance = 10000 } = body
    
    // Fetch historical data
    const historicalData = await getHistoricalData({
      symbol,
      timeframe: strategy.timeframe,
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    })
    
    if (!historicalData || historicalData.length === 0) {
      return NextResponse.json(
        { error: 'No historical data available for the specified period' },
        { status: 404 }
      )
    }
    
    // Convert to OHLCV format
    const ohlcvData: OHLCV[] = historicalData.map(candle => ({
      timestamp: new Date(candle.time * 1000),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume
    }))
    
    // Run backtest
    const executor = new StrategyExecutor(strategy, ohlcvData, initialBalance)
    const results = await executor.runBacktest()
    
    return NextResponse.json(results)
  } catch (error) {
    console.error('Backtest error:', error)
    return NextResponse.json(
      { error: 'Failed to run backtest', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Mock historical data endpoint for testing
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol') || 'BTC/USD'
  const days = parseInt(searchParams.get('days') || '30')
  
  // Generate mock historical data
  const mockData: OHLCV[] = []
  const now = Date.now()
  let basePrice = symbol.includes('BTC') ? 40000 : symbol.includes('ETH') ? 2500 : 100
  
  for (let i = days * 24; i >= 0; i--) {
    const timestamp = new Date(now - i * 60 * 60 * 1000)
    const randomWalk = (Math.random() - 0.5) * 0.02 // 2% random walk
    const trend = Math.sin(i / 24) * 0.01 // Daily cycle
    const volatility = basePrice * 0.01
    
    const open = basePrice * (1 + randomWalk + trend)
    const close = open * (1 + (Math.random() - 0.5) * 0.01)
    const high = Math.max(open, close) * (1 + Math.random() * 0.005)
    const low = Math.min(open, close) * (1 - Math.random() * 0.005)
    const volume = Math.random() * 1000000
    
    mockData.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume
    })
    
    // Update base price for next iteration
    basePrice = close
  }
  
  return NextResponse.json(mockData)
}