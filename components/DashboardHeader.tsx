'use client'

import React from 'react'
import {
  Paper,
  Typography,
  Card,
  CardContent,
  Box,
  Grid,
} from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import SpeedIcon from '@mui/icons-material/Speed'
import PieChartIcon from '@mui/icons-material/PieChart'
import AssessmentIcon from '@mui/icons-material/Assessment'
import TimelineIcon from '@mui/icons-material/Timeline'

interface MetricCardProps {
  title: string
  value: string
  icon: React.ReactNode
  change: string
  color: string
  delay?: number
}

function MetricCard({ title, value, icon, change, color, delay = 0 }: MetricCardProps) {
  return (
    <Card 
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
      style={{ animationDelay: `${delay}s` }}
    >
      <CardContent sx={{ padding: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ 
            p: 1, 
            border: '1px solid var(--retro-green)', 
            background: 'var(--retro-black)',
            color: 'var(--retro-green)'
          }}>
            {icon}
          </Box>
          <Typography 
            variant="caption" 
            sx={{ 
              background: change.startsWith('+') ? 'var(--retro-green)' : 'var(--retro-red)', 
              color: 'var(--retro-black)', 
              px: 1, 
              py: 0.5,
              border: '1px solid',
              borderColor: change.startsWith('+') ? 'var(--retro-green)' : 'var(--retro-red)',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '6px'
            }}
          >
            {change}
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
          {value}
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
          {title}
        </Typography>
      </CardContent>
    </Card>
  )
}

interface DashboardHeaderProps {
  strategies?: Array<{
    name: string
    pnl: number
    winRate: number
    trades: number
    status: string
  }>
}

export default function DashboardHeader({ strategies = [] }: DashboardHeaderProps) {
  // Calculate strategy performance metrics
  const activeStrategies = strategies.filter(s => s.status === 'active')
  const totalPnl = strategies.reduce((sum, s) => sum + s.pnl, 0)
  const avgWinRate = strategies.length > 0 
    ? Math.round(strategies.reduce((sum, s) => sum + s.winRate, 0) / strategies.length)
    : 0
  const totalTrades = strategies.reduce((sum, s) => sum + s.trades, 0)

  // All metrics in one place
  const allMetrics = [
    // Strategy Performance Metrics (First Row)
    {
      title: 'Total Strategy P&L',
      value: `$${totalPnl.toLocaleString()}`,
      icon: <TrendingUpIcon />,
      change: '+15.2%',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Avg Win Rate',
      value: `${avgWinRate}%`,
      icon: <ShowChartIcon />,
      change: '+3.1%',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Total Trades',
      value: totalTrades.toLocaleString(),
      icon: <AccountBalanceIcon />,
      change: '+89',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Active Strategies',
      value: activeStrategies.length.toString(),
      icon: <SpeedIcon />,
      change: '+2',
      color: 'from-orange-500 to-orange-600'
    },
    // Portfolio Metrics (Second Row)
    {
      title: '24h Volume',
      value: '$1.2M',
      icon: <TimelineIcon />,
      change: '+12.5%',
      color: 'from-cyan-500 to-cyan-600'
    },
    {
      title: 'Active Positions',
      value: '3',
      icon: <PieChartIcon />,
      change: '+1',
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      title: 'Total P&L',
      value: '+$5,234.21',
      icon: <AssessmentIcon />,
      change: '+8.3%',
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      title: 'Portfolio Value',
      value: '$25,432.10',
      icon: <AttachMoneyIcon />,
      change: '+2.1%',
      color: 'from-amber-500 to-amber-600'
    },
  ]

  return (
    <Box sx={{ mb: 4 }}>
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

      {/* Combined Performance Dashboard */}
      <Paper className="retro-container animate-glow" sx={{ mb: 3, p: 3 }}>
        <Typography variant="h5" sx={{ 
          color: 'var(--retro-yellow)', 
          marginBottom: 3,
          textShadow: '2px 2px 0 var(--retro-red)',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '14px',
          textAlign: 'center'
        }} className="retro-text-glow">
          &gt;&gt; SYSTEM PERFORMANCE METRICS &lt;&lt;
        </Typography>
        
        <Grid container spacing={2}>
          {allMetrics.map((metric, index) => (
            <Grid item xs={12} sm={6} md={3} key={`${metric.title}-${index}`}>
              <MetricCard
                title={metric.title}
                value={metric.value}
                icon={metric.icon}
                change={metric.change}
                color={metric.color}
                delay={index * 0.1}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  )
}