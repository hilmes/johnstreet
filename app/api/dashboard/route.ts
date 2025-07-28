import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Portfolio, Position } from '@/types/trading'

export interface DashboardData {
  portfolioValue: number
  dailyPnL: number
  positions: Array<{
    symbol: string
    side: 'long' | 'short'
    size: number
    avgPrice: number
    currentPrice: number
    unrealizedPnl: number
    change: number
    priceHistory: number[]
  }>
  recentSignals: Array<{
    id: string
    symbol: string
    action: 'BUY' | 'SELL'
    strength: number
    timestamp: string
    status: 'active' | 'expired' | 'executed'
  }>
  performanceChart: Array<{
    time: string
    value: number
  }>
  alerts: Array<{
    id: string
    type: 'info' | 'warning' | 'error' | 'success'
    message: string
    timestamp: string
  }>
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get timeframe from query params
    const searchParams = request.nextUrl.searchParams
    const timeframe = searchParams.get('timeframe') || '1d'

    // Fetch portfolio data (in production, this would come from database)
    const portfolioData = await fetchPortfolioData(session.user?.id)
    
    // Fetch market prices for positions
    const currentPrices = await fetchCurrentPrices(portfolioData.positions.map(p => p.symbol))
    
    // Calculate metrics
    const positions = portfolioData.positions.map(position => {
      const currentPrice = currentPrices[position.symbol] || position.averagePrice
      const unrealizedPnl = (currentPrice - position.averagePrice) * position.amount
      const change = ((currentPrice - position.averagePrice) / position.averagePrice) * 100
      
      return {
        symbol: position.symbol,
        side: position.amount > 0 ? 'long' as const : 'short' as const,
        size: Math.abs(position.amount),
        avgPrice: position.averagePrice,
        currentPrice,
        unrealizedPnl,
        change,
        priceHistory: generatePriceHistory(position.averagePrice, currentPrice, timeframe)
      }
    })

    // Fetch recent signals
    const recentSignals = await fetchRecentSignals(session.user?.id, timeframe)
    
    // Generate performance chart data
    const performanceChart = generatePerformanceChart(portfolioData, timeframe)
    
    // Fetch alerts
    const alerts = await fetchAlerts(session.user?.id)

    const dashboardData: DashboardData = {
      portfolioValue: portfolioData.totalValue,
      dailyPnL: portfolioData.performance.dailyReturn * portfolioData.totalValue,
      positions,
      recentSignals,
      performanceChart,
      alerts
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

// Helper functions (in production, these would be proper database queries)
async function fetchPortfolioData(userId?: string): Promise<Portfolio> {
  // Simulated portfolio data
  return {
    id: 'portfolio_' + userId,
    userId: userId || '',
    totalValue: 125430.50,
    cash: 50000,
    positions: [
      {
        symbol: 'BTC/USD',
        amount: 0.5,
        averagePrice: 43250.00,
        currentPrice: 44100.00,
        value: 22050.00,
        unrealizedPnL: 425.00,
        realizedPnL: 0
      },
      {
        symbol: 'ETH/USD',
        amount: 10,
        averagePrice: 2850.00,
        currentPrice: 2920.00,
        value: 29200.00,
        unrealizedPnL: 700.00,
        realizedPnL: 0
      }
    ],
    performance: {
      totalReturn: 0.0254,
      dailyReturn: 0.0187,
      weeklyReturn: 0.0324,
      monthlyReturn: 0.0254,
      yearlyReturn: 0,
      sharpeRatio: 1.35,
      maxDrawdown: -0.0523,
      winRate: 0.625
    },
    risk: {
      portfolioVolatility: 0.18,
      valueAtRisk: -3762.91,
      beta: 1.12,
      correlation: 0.87
    },
    updatedAt: Date.now()
  }
}

async function fetchCurrentPrices(symbols: string[]): Promise<Record<string, number>> {
  // In production, this would fetch from exchange APIs
  return {
    'BTC/USD': 44100.00,
    'ETH/USD': 2920.00,
    'SOL/USD': 98.50
  }
}

async function fetchRecentSignals(userId?: string, timeframe: string) {
  // Simulated signals
  const signals = [
    {
      id: 'sig_1',
      symbol: 'BTC/USD',
      action: 'BUY' as const,
      strength: 0.82,
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      status: 'active' as const
    },
    {
      id: 'sig_2',
      symbol: 'ETH/USD',
      action: 'SELL' as const,
      strength: 0.65,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'expired' as const
    }
  ]
  
  return signals
}

function generatePriceHistory(startPrice: number, currentPrice: number, timeframe: string): number[] {
  const points = timeframe === '1d' ? 24 : timeframe === '7d' ? 7 : 30
  const history: number[] = []
  const priceRange = currentPrice - startPrice
  
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1)
    const noise = (Math.random() - 0.5) * 0.02 * startPrice
    history.push(startPrice + priceRange * progress + noise)
  }
  
  history[history.length - 1] = currentPrice // Ensure last point matches current
  return history
}

function generatePerformanceChart(portfolio: Portfolio, timeframe: string) {
  const points = timeframe === '1d' ? 24 : timeframe === '7d' ? 7 : 30
  const chart: Array<{ time: string; value: number }> = []
  const baseValue = portfolio.totalValue / (1 + portfolio.performance.dailyReturn)
  
  for (let i = 0; i < points; i++) {
    const time = new Date(Date.now() - (points - i - 1) * (timeframe === '1d' ? 60 : timeframe === '7d' ? 24 * 60 : 24 * 60) * 60 * 1000)
    const progress = i / (points - 1)
    const noise = (Math.random() - 0.5) * 0.005 * baseValue
    const value = baseValue + (portfolio.totalValue - baseValue) * progress + noise
    
    chart.push({
      time: timeframe === '1d' ? time.toLocaleTimeString() : time.toLocaleDateString(),
      value: Math.round(value * 100) / 100
    })
  }
  
  return chart
}

async function fetchAlerts(userId?: string) {
  return [
    {
      id: 'alert_1',
      type: 'success' as const,
      message: 'BTC/USD position hit take profit target',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
    },
    {
      id: 'alert_2',
      type: 'info' as const,
      message: 'New sentiment signal detected for ETH',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString()
    }
  ]
}