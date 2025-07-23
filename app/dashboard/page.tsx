'use client'

import React from 'react'
import {
  Paper,
  Typography,
  Card,
  CardContent,
  Box,
} from '@mui/material'
import { AppProvider, useAppContext } from '@/contexts/AppContext'
import { MarketDataWidget } from '@/components/widgets/MarketDataWidget'
import { OrderBook } from '@/components/widgets/OrderBook'
import { TradeHistory } from '@/components/widgets/TradeHistory'
import { PortfolioBalance } from '@/components/widgets/PortfolioBalance'
import { CandlestickChart } from '@/components/widgets/CandlestickChart'
import { TechnicalIndicators } from '@/components/widgets/TechnicalIndicators'
import ActivityFeed from '@/components/ActivityFeed'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'

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

  // Mock strategies data for performance summary
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

  const performanceStats = [
    {
      title: 'Total Strategy P&L',
      value: `$${mockStrategies.reduce((sum, s) => sum + s.pnl, 0).toLocaleString()}`,
      icon: <TrendingUpIcon />,
      change: '+15.2%',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Avg Win Rate',
      value: `${Math.round(mockStrategies.reduce((sum, s) => sum + s.winRate, 0) / mockStrategies.length)}%`,
      icon: <ShowChartIcon />,
      change: '+3.1%',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Total Trades',
      value: mockStrategies.reduce((sum, s) => sum + s.trades, 0).toLocaleString(),
      icon: <AccountBalanceIcon />,
      change: '+89',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Active Strategies',
      value: mockStrategies.filter(s => s.status === 'active').length.toString(),
      icon: <AttachMoneyIcon />,
      change: '+2',
      color: 'from-orange-500 to-orange-600'
    },
  ]

  const stats = [
    { 
      title: '24h Volume', 
      value: '$1.2M', 
      icon: <ShowChartIcon />, 
      change: '+12.5%',
      color: 'from-blue-500 to-blue-600' 
    },
    { 
      title: 'Active Positions', 
      value: '3', 
      icon: <AccountBalanceIcon />, 
      change: '+1',
      color: 'from-purple-500 to-purple-600' 
    },
    { 
      title: 'Total P&L', 
      value: '+$5,234.21', 
      icon: <TrendingUpIcon />, 
      change: '+8.3%',
      color: 'from-green-500 to-green-600' 
    },
    { 
      title: 'Portfolio Value', 
      value: '$25,432.10', 
      icon: <AttachMoneyIcon />, 
      change: '+2.1%',
      color: 'from-orange-500 to-orange-600' 
    },
  ]

  return (
    <div className="px-2 sm:px-3 md:px-4 lg:px-5 py-4 space-y-4 min-h-screen retro-scanline w-full">
      {/* ASCII Logo Banner */}
      <Paper className="retro-container animate-glow" sx={{ 
        background: 'linear-gradient(45deg, var(--retro-dark-blue), var(--retro-purple), var(--retro-blue))',
        border: '3px solid var(--retro-cyan)',
        marginBottom: 3
      }}>
        <Box sx={{ 
          color: 'var(--retro-green)', 
          fontFamily: "'Press Start 2P', monospace", 
          fontSize: '0.6rem', 
          fontWeight: 700, 
          lineHeight: 1.2,
          textAlign: 'center',
          textShadow: '0 0 10px var(--retro-green), 0 0 20px var(--retro-green)'
        }} className="animate-pulse">
          <pre style={{ margin: 0, color: 'inherit' }}>{`
     ██╗ ██████╗ ██╗  ██╗███╗   ██╗    ███████╗████████╗██████╗ ███████╗███████╗████████╗
     ██║██╔═══██╗██║  ██║████╗  ██║    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██╔════╝╚══██╔══╝
     ██║██║   ██║███████║██╔██╗ ██║    ███████╗   ██║   ██████╔╝█████╗  █████╗     ██║   
██   ██║██║   ██║██╔══██║██║╚██╗██║    ╚════██║   ██║   ██╔══██╗██╔══╝  ██╔══╝     ██║   
╚█████╔╝╚██████╔╝██║  ██║██║ ╚████║    ███████║   ██║   ██║  ██║███████╗███████╗   ██║   
 ╚════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝    ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝   ╚═╝   
                                                                                           
        ▓▓▓▓▓▓▓▓▓▓▓▓▓ CRYPTOCURRENCY ALGORITHMIC TRADING PLATFORM ▓▓▓▓▓▓▓▓▓▓▓▓▓
          `}</pre>
        </Box>
      </Paper>


      {/* Strategy Performance Summary */}
      <Paper className="retro-container animate-glow" sx={{ marginBottom: 3 }}>
        <Typography variant="h5" sx={{ 
          color: 'var(--retro-yellow)', 
          marginBottom: 2,
          textShadow: '2px 2px 0 var(--retro-red)'
        }} className="retro-text-glow">
          &gt; STRATEGY_PERFORMANCE_SUMMARY &lt;
        </Typography>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {performanceStats.map((stat, index) => (
            <Card 
              key={stat.title} 
              className="retro-container animate-pixel-dance" 
              sx={{ 
                background: `linear-gradient(135deg, var(--retro-dark-blue), var(--retro-purple))`,
                border: '2px solid var(--retro-cyan)',
                boxShadow: '3px 3px 0 var(--retro-pink)',
                '&:hover': {
                  boxShadow: '5px 5px 0 var(--retro-pink), 0 0 20px var(--retro-cyan)',
                  transform: 'translate(-1px, -1px)'
                }
              }}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent sx={{ padding: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ 
                    p: 1, 
                    border: '1px solid var(--retro-green)', 
                    background: 'var(--retro-black)',
                    color: 'var(--retro-green)'
                  }}>
                    {stat.icon}
                  </Box>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      background: 'var(--retro-green)', 
                      color: 'var(--retro-black)', 
                      px: 1, 
                      py: 0.5,
                      border: '1px solid var(--retro-green)',
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: '6px'
                    }}
                  >
                    {stat.change}
                  </Typography>
                </Box>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    color: 'var(--retro-cyan)', 
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '12px',
                    textShadow: '1px 1px 0 var(--retro-blue)',
                    mb: 1
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'var(--retro-white)',
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '7px',
                    lineHeight: 1.4
                  }}
                >
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </div>
      </Paper>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {stats.map((stat, index) => (
          <Card 
            key={stat.title} 
            className="retro-container animate-glow" 
            sx={{ 
              background: 'linear-gradient(135deg, var(--retro-purple), var(--retro-blue))',
              border: '2px solid var(--retro-pink)',
              boxShadow: '3px 3px 0 var(--retro-cyan)',
              '&:hover': {
                boxShadow: '5px 5px 0 var(--retro-cyan), 0 0 15px var(--retro-pink)',
                transform: 'translate(-1px, -1px)'
              }
            }}
            style={{ animationDelay: `${index * 0.15}s` }}
          >
            <CardContent sx={{ padding: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ 
                  p: 1, 
                  border: '1px solid var(--retro-pink)', 
                  background: 'var(--retro-black)',
                  color: 'var(--retro-pink)'
                }}>
                  {stat.icon}
                </Box>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    background: 'var(--retro-pink)', 
                    color: 'var(--retro-black)', 
                    px: 1, 
                    py: 0.5,
                    border: '1px solid var(--retro-pink)',
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '6px'
                  }}
                >
                  {stat.change}
                </Typography>
              </Box>
              <Typography 
                variant="h5" 
                sx={{ 
                  color: 'var(--retro-yellow)', 
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '12px',
                  textShadow: '1px 1px 0 var(--retro-red)',
                  mb: 1
                }}
              >
                {stat.value}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'var(--retro-white)',
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '7px',
                  lineHeight: 1.4
                }}
              >
                {stat.title}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </div>

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