'use client'

import React, { useState } from 'react'
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Divider,
} from '@mui/material'
import {
  ExpandLess,
  ExpandMore,
  TrendingUp as StrategyIcon,
  PlayArrow as RunIcon,
  Stop as StopIcon,
  CheckCircle as SuccessIcon,
  Cancel as FailedIcon,
  AccessTime as RunningIcon,
  ShowChart as ChartIcon,
} from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'

interface StrategyRun {
  id: string
  runId: string
  startTime: Date
  endTime?: Date
  status: 'running' | 'completed' | 'failed' | 'stopped'
  pnl?: number
  trades?: number
  winRate?: number
  sharpeRatio?: number
}

interface Strategy {
  id: string
  name: string
  type: 'momentum' | 'mean_reversion' | 'scalping' | 'market_making' | 'ai_generated'
  active: boolean
  totalRuns: number
  successfulRuns: number
  totalPnl: number
  lastRun?: Date
  runs: StrategyRun[]
}

interface ExpandableStrategyListProps {
  strategies: Strategy[]
  onRunClick?: (strategyId: string, runId: string) => void
  onStrategyClick?: (strategyId: string) => void
  onStartStrategy?: (strategyId: string) => void
  onStopStrategy?: (strategyId: string) => void
}

export default function ExpandableStrategyList({
  strategies,
  onRunClick,
  onStrategyClick,
  onStartStrategy,
  onStopStrategy,
}: ExpandableStrategyListProps) {
  const [expandedStrategies, setExpandedStrategies] = useState<string[]>([])

  const toggleStrategy = (strategyId: string) => {
    setExpandedStrategies(prev =>
      prev.includes(strategyId)
        ? prev.filter(id => id !== strategyId)
        : [...prev, strategyId]
    )
  }

  const getStatusIcon = (status: StrategyRun['status']) => {
    switch (status) {
      case 'running':
        return <RunningIcon sx={{ color: '#00ffff' }} />
      case 'completed':
        return <SuccessIcon sx={{ color: '#00ff00' }} />
      case 'failed':
        return <FailedIcon sx={{ color: '#ff0066' }} />
      case 'stopped':
        return <StopIcon sx={{ color: '#ffcc00' }} />
    }
  }

  const getStrategyTypeColor = (type: Strategy['type']) => {
    switch (type) {
      case 'momentum':
        return '#00ff00'
      case 'mean_reversion':
        return '#00ffff'
      case 'scalping':
        return '#ff00ff'
      case 'market_making':
        return '#ffcc00'
      case 'ai_generated':
        return '#ff0066'
    }
  }

  return (
    <Paper
      sx={{
        background: 'rgba(0, 20, 40, 0.9)',
        border: '1px solid var(--retro-cyan)',
        boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
        p: 2,
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '14px',
          color: 'var(--retro-cyan)',
          mb: 2,
          textShadow: '0 0 10px currentColor',
        }}
      >
        TRADING STRATEGIES
      </Typography>

      <List sx={{ width: '100%' }}>
        {strategies.map((strategy, index) => (
          <React.Fragment key={strategy.id}>
            <ListItem
              sx={{
                display: 'block',
                p: 0,
                mb: 1,
              }}
            >
              <ListItemButton
                onClick={() => toggleStrategy(strategy.id)}
                sx={{
                  borderRadius: 0,
                  border: '1px solid',
                  borderColor: strategy.active ? 'var(--retro-green)' : 'var(--retro-gray)',
                  backgroundColor: 'rgba(0, 40, 80, 0.5)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 60, 120, 0.7)',
                    borderColor: 'var(--retro-cyan)',
                  },
                }}
              >
                <ListItemIcon>
                  <StrategyIcon sx={{ color: getStrategyTypeColor(strategy.type) }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '14px',
                          fontWeight: 'bold',
                        }}
                      >
                        {strategy.name}
                      </Typography>
                      {strategy.active && (
                        <Chip
                          label="ACTIVE"
                          size="small"
                          sx={{
                            backgroundColor: 'var(--retro-green)',
                            color: 'black',
                            fontFamily: 'monospace',
                            fontSize: '10px',
                            height: '20px',
                            animation: 'pulse 1.5s infinite',
                            '@keyframes pulse': {
                              '0%': { opacity: 1 },
                              '50%': { opacity: 0.6 },
                              '100%': { opacity: 1 },
                            },
                          }}
                        />
                      )}
                      <Chip
                        label={strategy.type.toUpperCase().replace('_', ' ')}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          color: getStrategyTypeColor(strategy.type),
                          border: `1px solid ${getStrategyTypeColor(strategy.type)}`,
                          fontFamily: 'monospace',
                          fontSize: '10px',
                          height: '20px',
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: strategy.totalPnl >= 0 ? 'var(--retro-green)' : 'var(--retro-red)',
                          fontFamily: 'monospace',
                        }}
                      >
                        P&L: ${strategy.totalPnl.toLocaleString()}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: 'var(--retro-gray)', fontFamily: 'monospace' }}
                      >
                        Runs: {strategy.successfulRuns}/{strategy.totalRuns}
                      </Typography>
                      {strategy.lastRun && (
                        <Typography
                          variant="caption"
                          sx={{ color: 'var(--retro-gray)', fontFamily: 'monospace' }}
                        >
                          Last: {formatDistanceToNow(strategy.lastRun, { addSuffix: true })}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <Box sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
                  {strategy.active ? (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        onStopStrategy?.(strategy.id)
                      }}
                      sx={{
                        color: 'var(--retro-red)',
                        '&:hover': { backgroundColor: 'rgba(255, 0, 0, 0.1)' },
                      }}
                    >
                      <StopIcon />
                    </IconButton>
                  ) : (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        onStartStrategy?.(strategy.id)
                      }}
                      sx={{
                        color: 'var(--retro-green)',
                        '&:hover': { backgroundColor: 'rgba(0, 255, 0, 0.1)' },
                      }}
                    >
                      <RunIcon />
                    </IconButton>
                  )}
                  <IconButton size="small">
                    {expandedStrategies.includes(strategy.id) ? (
                      <ExpandLess sx={{ color: 'var(--retro-cyan)' }} />
                    ) : (
                      <ExpandMore sx={{ color: 'var(--retro-cyan)' }} />
                    )}
                  </IconButton>
                </Box>
              </ListItemButton>

              <Collapse in={expandedStrategies.includes(strategy.id)} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 4, pr: 2, pt: 1 }}>
                  {strategy.runs.length === 0 ? (
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'var(--retro-gray)',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        py: 2,
                        textAlign: 'center',
                      }}
                    >
                      No runs yet
                    </Typography>
                  ) : (
                    strategy.runs.map((run) => (
                      <ListItemButton
                        key={run.id}
                        onClick={() => onRunClick?.(strategy.id, run.runId)}
                        sx={{
                          borderRadius: 0,
                          border: '1px solid var(--retro-gray)',
                          borderColor: 'rgba(128, 128, 128, 0.3)',
                          backgroundColor: 'rgba(0, 20, 40, 0.5)',
                          mb: 0.5,
                          py: 1,
                          '&:hover': {
                            backgroundColor: 'rgba(0, 40, 80, 0.5)',
                            borderColor: 'var(--retro-cyan)',
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {getStatusIcon(run.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography
                                sx={{
                                  fontFamily: 'monospace',
                                  fontSize: '12px',
                                  color: 'var(--retro-cyan)',
                                }}
                              >
                                Run #{run.runId.slice(0, 8)}
                              </Typography>
                              <Typography
                                sx={{
                                  fontFamily: 'monospace',
                                  fontSize: '11px',
                                  color: 'var(--retro-gray)',
                                }}
                              >
                                {formatDistanceToNow(run.startTime, { addSuffix: true })}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
                              {run.pnl !== undefined && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: run.pnl >= 0 ? 'var(--retro-green)' : 'var(--retro-red)',
                                    fontFamily: 'monospace',
                                    fontSize: '11px',
                                  }}
                                >
                                  P&L: ${run.pnl.toLocaleString()}
                                </Typography>
                              )}
                              {run.trades !== undefined && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'var(--retro-gray)',
                                    fontFamily: 'monospace',
                                    fontSize: '11px',
                                  }}
                                >
                                  Trades: {run.trades}
                                </Typography>
                              )}
                              {run.winRate !== undefined && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'var(--retro-gray)',
                                    fontFamily: 'monospace',
                                    fontSize: '11px',
                                  }}
                                >
                                  Win: {(run.winRate * 100).toFixed(1)}%
                                </Typography>
                              )}
                              {run.sharpeRatio !== undefined && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'var(--retro-gray)',
                                    fontFamily: 'monospace',
                                    fontSize: '11px',
                                  }}
                                >
                                  Sharpe: {run.sharpeRatio.toFixed(2)}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        <IconButton size="small" sx={{ color: 'var(--retro-cyan)' }}>
                          <ChartIcon fontSize="small" />
                        </IconButton>
                      </ListItemButton>
                    ))
                  )}
                </List>
              </Collapse>
            </ListItem>
            {index < strategies.length - 1 && (
              <Divider sx={{ borderColor: 'rgba(128, 128, 128, 0.2)', my: 0.5 }} />
            )}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  )
}