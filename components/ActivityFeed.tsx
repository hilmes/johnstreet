'use client'

import React from 'react'
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Chip,
  Divider,
  Paper,
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  PlayArrow,
  Pause,
  Warning,
  CheckCircle,
  Info,
  AttachMoney,
  ShowChart,
} from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'

interface ActivityItem {
  id: string
  type: 'trade_executed' | 'strategy_started' | 'strategy_stopped' | 'alert' | 'performance_update' | 'profit_target' | 'stop_loss'
  strategyName: string
  timestamp: Date
  details: {
    symbol?: string
    price?: number
    amount?: number
    pnl?: number
    message?: string
    side?: 'buy' | 'sell'
    winRate?: number
  }
  severity?: 'success' | 'warning' | 'error' | 'info'
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  maxHeight?: number | string
}

const getActivityIcon = (type: ActivityItem['type'], details?: ActivityItem['details']) => {
  switch (type) {
    case 'trade_executed':
      return details?.side === 'buy' ? (
        <TrendingUp sx={{ color: 'var(--retro-green)', fontSize: '16px' }} />
      ) : (
        <TrendingDown sx={{ color: 'var(--retro-red)', fontSize: '16px' }} />
      )
    case 'strategy_started':
      return <PlayArrow sx={{ color: 'var(--retro-cyan)', fontSize: '16px' }} />
    case 'strategy_stopped':
      return <Pause sx={{ color: 'var(--retro-orange)', fontSize: '16px' }} />
    case 'alert':
      return <Warning sx={{ color: 'var(--retro-yellow)', fontSize: '16px' }} />
    case 'performance_update':
      return <ShowChart sx={{ color: 'var(--retro-pink)', fontSize: '16px' }} />
    case 'profit_target':
      return <CheckCircle sx={{ color: 'var(--retro-green)', fontSize: '16px' }} />
    case 'stop_loss':
      return <Warning sx={{ color: 'var(--retro-red)', fontSize: '16px' }} />
    default:
      return <Info sx={{ color: 'var(--retro-gray)', fontSize: '16px' }} />
  }
}

const getActivityMessage = (activity: ActivityItem): string => {
  const { type, details, strategyName } = activity
  
  switch (type) {
    case 'trade_executed':
      return `${strategyName} executed ${details.side} order: ${details.amount} ${details.symbol} @ $${details.price?.toFixed(2)}`
    case 'strategy_started':
      return `${strategyName} has been activated`
    case 'strategy_stopped':
      return `${strategyName} has been paused`
    case 'alert':
      return details.message || `Alert from ${strategyName}`
    case 'performance_update':
      return `${strategyName} performance: ${details.winRate}% win rate, P&L: ${details.pnl && details.pnl >= 0 ? '+' : ''}${details.pnl?.toFixed(2)}%`
    case 'profit_target':
      return `${strategyName} hit profit target: +${details.pnl?.toFixed(2)}%`
    case 'stop_loss':
      return `${strategyName} triggered stop loss: ${details.pnl?.toFixed(2)}%`
    default:
      return details.message || 'Activity recorded'
  }
}

const getSeverityColor = (severity?: ActivityItem['severity']) => {
  switch (severity) {
    case 'success':
      return '#00CC66'
    case 'warning':
      return '#FFA500'
    case 'error':
      return '#FF4F00'
    case 'info':
    default:
      return '#6563FF'
  }
}

export default function ActivityFeed({ activities, maxHeight = 400 }: ActivityFeedProps) {
  return (
    <Paper
      elevation={0}
      className="retro-container animate-glow"
      sx={{
        background: 'linear-gradient(135deg, var(--retro-dark-blue), var(--retro-black))',
        border: '2px solid var(--retro-green)',
        borderRadius: 0,
        overflow: 'hidden',
        boxShadow: '4px 4px 0 var(--retro-cyan)',
      }}
    >
      <Box sx={{ 
        p: 2, 
        borderBottom: '2px solid var(--retro-green)',
        background: 'var(--retro-purple)'
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '10px',
            fontWeight: 600, 
            color: 'var(--retro-yellow)',
            textShadow: '1px 1px 0 var(--retro-red)'
          }}
        >
          &gt; ACTIVITY_FEED &lt;
        </Typography>
      </Box>
      
      <List
        dense
        sx={{
          maxHeight,
          overflow: 'auto',
          background: 'var(--retro-black)',
          '&::-webkit-scrollbar': {
            width: '12px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'var(--retro-dark-blue)',
            border: '1px solid var(--retro-cyan)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'var(--retro-cyan)',
            border: '1px solid var(--retro-green)',
            borderRadius: 0,
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'var(--retro-green)',
          },
        }}
      >
        {activities.length === 0 ? (
          <ListItem>
            <ListItemText
              primary={
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'var(--retro-gray)', 
                    textAlign: 'center',
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '8px'
                  }}
                >
                  NO_ACTIVITIES_YET
                </Typography>
              }
            />
          </ListItem>
        ) : (
          activities.map((activity, index) => (
            <React.Fragment key={activity.id}>
              <ListItem
                sx={{
                  py: 1.5,
                  border: '1px solid transparent',
                  '&:hover': {
                    backgroundColor: 'var(--retro-purple)',
                    border: '1px solid var(--retro-cyan)',
                  },
                  transition: 'all 0.1s ease',
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Box sx={{ 
                    p: 0.5, 
                    border: '1px solid var(--retro-cyan)', 
                    background: 'var(--retro-dark-blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getActivityIcon(activity.type, activity.details)}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'var(--retro-white)', 
                          flex: 1,
                          fontFamily: "'Press Start 2P', monospace",
                          fontSize: '7px',
                          lineHeight: 1.4
                        }}
                      >
                        {getActivityMessage(activity)}
                      </Typography>
                      {activity.details.pnl !== undefined && (
                        <Chip
                          label={`${activity.details.pnl >= 0 ? '+' : ''}${activity.details.pnl.toFixed(2)}%`}
                          size="small"
                          sx={{
                            backgroundColor: activity.details.pnl >= 0 ? 'var(--retro-green)' : 'var(--retro-red)',
                            color: 'var(--retro-black)',
                            border: `1px solid ${activity.details.pnl >= 0 ? 'var(--retro-green)' : 'var(--retro-red)'}`,
                            fontSize: '6px',
                            height: 16,
                            fontFamily: "'Press Start 2P', monospace",
                            borderRadius: 0
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'var(--retro-gray)',
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: '6px'
                      }}
                    >
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </Typography>
                  }
                />
              </ListItem>
              {index < activities.length - 1 && <Divider sx={{ borderColor: 'var(--retro-cyan)' }} />}
            </React.Fragment>
          ))
        )}
      </List>
    </Paper>
  )
}