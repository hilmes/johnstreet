'use client'

import React from 'react'
import {
  Paper,
  Typography,
} from '@mui/material'
import { AppProvider, useAppContext } from '@/contexts/AppContext'
import { MarketDataWidget } from '@/components/widgets/MarketDataWidget'
import { OrderBook } from '@/components/widgets/OrderBook'
import { TradeHistory } from '@/components/widgets/TradeHistory'
import { PortfolioBalance } from '@/components/widgets/PortfolioBalance'
import { CandlestickChart } from '@/components/widgets/CandlestickChart'
import { TechnicalIndicators } from '@/components/widgets/TechnicalIndicators'
import ActivityFeed from '@/components/ActivityFeed'
import DashboardHeader from '@/components/DashboardHeader'

function DashboardContent() {
  const { state } = useAppContext()
  const { selectedPair } = state

  // Mock activity data
  const mockActivities = React.useMemo(() => [
    {
      id: '1',
      type: 'strategy_started' as const,
      strategyName: 'EMA Trend Follow',
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      details: {},
      severity: 'info' as const,
    },
    {
      id: '2',
      type: 'trade_executed' as const,
      strategyName: 'EMA Trend Follow',
      timestamp: new Date(Date.now() - 1000 * 60 * 12), // 12 minutes ago
      details: {
        symbol: 'BTC/USD',
        price: 68500,
        amount: 0.05,
        side: 'buy' as const,
      },
      severity: 'success' as const,
    },
    {
      id: '3',
      type: 'profit_target' as const,
      strategyName: 'RSI Oversold Bounce',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      details: {
        pnl: 3.2,
      },
      severity: 'success' as const,
    },
    {
      id: '4',
      type: 'performance_update' as const,
      strategyName: 'MACD Crossover',
      timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
      details: {
        winRate: 65,
        pnl: 12.5,
      },
      severity: 'info' as const,
    },
    {
      id: '5',
      type: 'alert' as const,
      strategyName: 'Support Level Break',
      timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      details: {
        message: 'Approaching key support level at $67,000',
      },
      severity: 'warning' as const,
    },
    {
      id: '6',
      type: 'trade_executed' as const,
      strategyName: 'RSI Oversold Bounce',
      timestamp: new Date(Date.now() - 1000 * 60 * 90), // 1.5 hours ago
      details: {
        symbol: 'ETH/USD',
        price: 3850,
        amount: 0.5,
        side: 'sell' as const,
      },
      severity: 'success' as const,
    },
    {
      id: '7',
      type: 'stop_loss' as const,
      strategyName: 'Support Level Break',
      timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
      details: {
        pnl: -2.1,
      },
      severity: 'error' as const,
    },
    {
      id: '8',
      type: 'strategy_stopped' as const,
      strategyName: 'MACD Crossover',
      timestamp: new Date(Date.now() - 1000 * 60 * 180), // 3 hours ago
      details: {},
      severity: 'warning' as const,
    },
  ], [])

  // Mock data for candlestick chart
  const mockChartData = React.useMemo(() => {
    const now = new Date()
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000)
      const basePrice = 40000
      const volatility = 1000
      const open = basePrice + (Math.random() - 0.5) * volatility
      const close = basePrice + (Math.random() - 0.5) * volatility
      const high = Math.max(open, close) + Math.random() * volatility * 0.5
      const low = Math.min(open, close) - Math.random() * volatility * 0.5
      return {
        date,
        open,
        high,
        low,
        close,
        volume: Math.random() * 1000,
      }
    })
  }, [])

  // Mock strategies data for the header
  const mockStrategies = [
    { name: 'Mean Reversion', pnl: 12840, winRate: 78, trades: 156, status: 'active' },
    { name: 'Momentum Trading', pnl: 18760, winRate: 73, trades: 89, status: 'active' },
    { name: 'Statistical Arbitrage', pnl: 9435, winRate: 68, trades: 234, status: 'active' },
    { name: 'Market Making', pnl: 15220, winRate: 85, trades: 1247, status: 'active' },
    { name: 'Bollinger Bands', pnl: 4680, winRate: 71, trades: 67, status: 'testing' },
    { name: 'RSI Divergence', pnl: 3120, winRate: 64, trades: 42, status: 'paused' },
    { name: 'VWAP Trading', pnl: 7290, winRate: 69, trades: 98, status: 'active' },
    { name: 'Pairs Trading', pnl: 5560, winRate: 76, trades: 58, status: 'testing' },
    { name: 'Grid Trading', pnl: 6840, winRate: 82, trades: 312, status: 'active' },
  ]

  return (
    <div className="px-2 sm:px-3 md:px-4 lg:px-5 py-4 space-y-4 min-h-screen retro-scanline w-full">
      {/* Dashboard Header with all metrics */}
      <DashboardHeader strategies={mockStrategies} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Chart Section - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Paper className="p-4 h-full">
            <Typography variant="h6" className="font-semibold mb-4">
              {selectedPair} Price Chart
            </Typography>
            <div className="h-96">
              <CandlestickChart symbol={selectedPair} data={mockChartData} />
            </div>
          </Paper>
        </div>

        {/* Order Book & Trade History - Takes 1 column */}
        <div className="space-y-3">
          <Paper className="p-4">
            <Typography variant="h6" className="font-semibold mb-4">
              Order Book
            </Typography>
            <OrderBook symbol={selectedPair} />
          </Paper>
          
          <Paper className="p-4">
            <Typography variant="h6" className="font-semibold mb-4">
              Recent Trades
            </Typography>
            <TradeHistory symbol={selectedPair} maxTrades={10} />
          </Paper>
        </div>

        {/* Activity Feed - Takes 1 column */}
        <div className="lg:col-span-1">
          <ActivityFeed activities={mockActivities} maxHeight={600} />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Technical Analysis */}
        <Paper className="p-4">
          <Typography variant="h6" className="font-semibold mb-4">
            Technical Indicators
          </Typography>
          <TechnicalIndicators symbol={selectedPair} />
        </Paper>

        {/* Portfolio Summary */}
        <Paper className="p-4">
          <Typography variant="h6" className="font-semibold mb-4">
            Portfolio Balance
          </Typography>
          <PortfolioBalance />
        </Paper>
      </div>

      {/* Market Data */}
      <Paper className="p-4">
        <Typography variant="h6" className="font-semibold mb-4">
          Market Data
        </Typography>
        <MarketDataWidget symbol={selectedPair} />
      </Paper>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AppProvider>
      <DashboardContent />
    </AppProvider>
  )
}