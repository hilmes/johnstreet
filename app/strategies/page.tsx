'use client'

import React, { useState, useRef, useEffect } from 'react'
import { dieterRamsDesign as ds, designHelpers } from '@/lib/design/DieterRamsDesignSystem'

interface Strategy {
  id: string
  name: string
  description: string
  type: 'momentum' | 'mean_reversion' | 'scalping' | 'market_making' | 'ai_generated'
  status: 'active' | 'paused' | 'stopped' | 'testing'
  performance: {
    totalPnl: number
    dailyPnl: number
    winRate: number
    sharpeRatio: number
    maxDrawdown: number
    totalTrades: number
    avgTradeSize: number
  }
  riskMetrics: {
    volatility: number
    valueAtRisk: number
    beta: number
  }
  lastActive: Date
  createdAt: Date
  timeframe: string
  symbols: string[]
  code?: string
  language?: string
}

// Mock data with enhanced structure
const mockStrategies: Strategy[] = [
  {
    id: '1',
    name: 'Adaptive Mean Reversion',
    description: 'AI-powered mean reversion strategy that adapts to market volatility and uses dynamic RSI thresholds',
    type: 'ai_generated',
    status: 'active',
    performance: {
      totalPnl: 18740,
      dailyPnl: 1250,
      winRate: 0.74,
      sharpeRatio: 2.3,
      maxDrawdown: 0.08,
      totalTrades: 156,
      avgTradeSize: 2400
    },
    riskMetrics: {
      volatility: 0.12,
      valueAtRisk: 0.045,
      beta: 0.8
    },
    lastActive: new Date(Date.now() - 30 * 60 * 1000),
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    timeframe: '5m',
    symbols: ['BTC/USD', 'ETH/USD'],
    language: 'python',
    code: `# Adaptive Mean Reversion Strategy
import pandas as pd
import numpy as np

class AdaptiveMeanReversionStrategy:
    def __init__(self):
        self.rsi_period = 14
        self.threshold_multiplier = 1.2
        
    def generate_signals(self, df):
        # Calculate RSI
        rsi = self.calculate_rsi(df['close'], self.rsi_period)
        
        # Adaptive thresholds based on volatility
        volatility = df['close'].rolling(20).std()
        upper_threshold = 70 + (volatility.rolling(10).mean() * self.threshold_multiplier)
        lower_threshold = 30 - (volatility.rolling(10).mean() * self.threshold_multiplier)
        
        # Generate signals
        buy_signal = (rsi < lower_threshold) & (rsi.shift(1) >= lower_threshold)
        sell_signal = (rsi > upper_threshold) & (rsi.shift(1) <= upper_threshold)
        
        return buy_signal, sell_signal`
  },
  {
    id: '2',
    name: 'Momentum Breakout Pro',
    description: 'Multi-timeframe momentum strategy with volume confirmation and dynamic stop losses',
    type: 'momentum',
    status: 'active',
    performance: {
      totalPnl: 24580,
      dailyPnl: 890,
      winRate: 0.68,
      sharpeRatio: 1.95,
      maxDrawdown: 0.12,
      totalTrades: 89,
      avgTradeSize: 3200
    },
    riskMetrics: {
      volatility: 0.15,
      valueAtRisk: 0.062,
      beta: 1.2
    },
    lastActive: new Date(Date.now() - 5 * 60 * 1000),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    timeframe: '15m',
    symbols: ['BTC/USD', 'ETH/USD', 'SOL/USD']
  },
  {
    id: '3',
    name: 'Smart Scalping Engine',
    description: 'High-frequency scalping with machine learning price prediction and risk management',
    type: 'scalping',
    status: 'testing',
    performance: {
      totalPnl: 5240,
      dailyPnl: 420,
      winRate: 0.82,
      sharpeRatio: 1.65,
      maxDrawdown: 0.04,
      totalTrades: 487,
      avgTradeSize: 850
    },
    riskMetrics: {
      volatility: 0.08,
      valueAtRisk: 0.028,
      beta: 0.6
    },
    lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    timeframe: '1m',
    symbols: ['BTC/USD']
  },
  {
    id: '4',
    name: 'Grid Trading Master',
    description: 'Automated grid trading strategy optimized for sideways markets with dynamic grid spacing',
    type: 'market_making',
    status: 'paused',
    performance: {
      totalPnl: 12860,
      dailyPnl: -180,
      winRate: 0.71,
      sharpeRatio: 1.45,
      maxDrawdown: 0.09,
      totalTrades: 234,
      avgTradeSize: 1800
    },
    riskMetrics: {
      volatility: 0.11,
      valueAtRisk: 0.039,
      beta: 0.9
    },
    lastActive: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    timeframe: '30m',
    symbols: ['ETH/USD', 'ADA/USD']
  },
  {
    id: '5',
    name: 'Volatility Arbitrage',
    description: 'Cross-exchange arbitrage strategy leveraging volatility differences and funding rates',
    type: 'ai_generated',
    status: 'stopped',
    performance: {
      totalPnl: -3420,
      dailyPnl: -120,
      winRate: 0.45,
      sharpeRatio: -0.32,
      maxDrawdown: 0.18,
      totalTrades: 67,
      avgTradeSize: 4200
    },
    riskMetrics: {
      volatility: 0.22,
      valueAtRisk: 0.085,
      beta: 1.5
    },
    lastActive: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    timeframe: '1h',
    symbols: ['BTC/USD', 'ETH/USD', 'SOL/USD']
  }
]

export default function StrategiesPage() {
  // Core state management
  const [strategies, setStrategies] = useState(mockStrategies)
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null)
  const [viewMode, setViewMode] = useState<'dashboard' | 'create' | 'manage'>('dashboard')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused' | 'stopped' | 'testing'>('all')
  const [sortBy, setSortBy] = useState<'performance' | 'created' | 'name'>('performance')
  
  // AI Strategy Builder
  const [aiPrompt, setAiPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [tempApiKey, setTempApiKey] = useState('')
  
  // Performance analytics
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d' | '90d'>('30d')
  
  // Strategy builder form
  const [strategyForm, setStrategyForm] = useState({
    name: '',
    description: '',
    type: 'momentum' as Strategy['type'],
    timeframe: '15m',
    symbols: ['BTC/USD'],
    code: '',
    language: 'python'
  })

  // Load API key on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('anthropic_api_key')
    if (savedKey) setApiKey(savedKey)
  }, [])

  // Utility functions
  const getStatusColor = (status: Strategy['status']) => {
    switch (status) {
      case 'active': return ds.colors.semantic.success
      case 'testing': return ds.colors.semantic.warning
      case 'paused': return ds.colors.semantic.info
      case 'stopped': return ds.colors.semantic.error
      default: return ds.colors.grayscale[50]
    }
  }

  const getTypeIcon = (type: Strategy['type']) => {
    switch (type) {
      case 'momentum': return '📈'
      case 'mean_reversion': return '↩️'
      case 'scalping': return '⚡'
      case 'market_making': return '🏭'
      case 'ai_generated': return '🤖'
      default: return '📊'
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  // Handler functions
  const handleStatusToggle = (strategyId: string, newStatus: Strategy['status']) => {
    setStrategies(prev => 
      prev.map(s => 
        s.id === strategyId ? { ...s, status: newStatus } : s
      )
    )
  }

  const handleDeleteStrategy = (strategyId: string) => {
    setStrategies(prev => prev.filter(s => s.id !== strategyId))
    if (selectedStrategy?.id === strategyId) {
      setSelectedStrategy(null)
    }
  }

  const handleSaveApiKey = () => {
    setApiKey(tempApiKey)
    setShowApiKeyDialog(false)
    localStorage.setItem('anthropic_api_key', tempApiKey)
  }

  const handleGenerateStrategy = async () => {
    if (!aiPrompt.trim() || !apiKey) return
    
    setIsGenerating(true)
    try {
      // Simulate AI generation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const newStrategy: Strategy = {
        id: Date.now().toString(),
        name: `AI Strategy ${strategies.length + 1}`,
        description: aiPrompt.trim(),
        type: 'ai_generated',
        status: 'testing',
        performance: {
          totalPnl: 0,
          dailyPnl: 0,
          winRate: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          totalTrades: 0,
          avgTradeSize: 0
        },
        riskMetrics: {
          volatility: 0,
          valueAtRisk: 0,
          beta: 0
        },
        lastActive: new Date(),
        createdAt: new Date(),
        timeframe: '15m',
        symbols: ['BTC/USD'],
        code: '# Generated strategy code will appear here',
        language: 'python'
      }
      
      setStrategies(prev => [newStrategy, ...prev])
      setSelectedStrategy(newStrategy)
      setAiPrompt('')
    } catch (error) {
      console.error('Strategy generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Filtered and sorted strategies
  const filteredStrategies = strategies
    .filter(s => filterStatus === 'all' || s.status === filterStatus)
    .sort((a, b) => {
      switch (sortBy) {
        case 'performance':
          return b.performance.totalPnl - a.performance.totalPnl
        case 'created':
          return b.createdAt.getTime() - a.createdAt.getTime()
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

  // Portfolio overview calculations
  const portfolioMetrics = {
    totalPnL: strategies.reduce((sum, s) => sum + s.performance.totalPnl, 0),
    activeStrategies: strategies.filter(s => s.status === 'active').length,
    totalStrategies: strategies.length,
    avgWinRate: strategies.reduce((sum, s) => sum + s.performance.winRate, 0) / strategies.length,
    bestPerformer: strategies.reduce((best, current) => 
      current.performance.totalPnl > best.performance.totalPnl ? current : best
    , strategies[0])
  }

  return (
    <div style={{
      backgroundColor: ds.colors.semantic.background.primary,
      color: ds.colors.grayscale[90],
      minHeight: '100vh',
      fontFamily: ds.typography.families.interface,
    }}>
      {/* Header with Navigation */}
      <header style={{
        padding: ds.spacing.large,
        borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
        backgroundColor: ds.colors.semantic.background.secondary,
      }}>
        <div style={{
          maxWidth: ds.grid.maxWidth,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h1 style={{
              fontSize: ds.typography.scale.xxlarge,
              fontWeight: ds.typography.weights.bold,
              margin: 0,
              marginBottom: ds.spacing.small,
            }}>
              Strategy Hub
            </h1>
            <p style={{
              fontSize: ds.typography.scale.medium,
              color: ds.colors.grayscale[70],
              margin: 0,
            }}>
              Create, test, and manage your algorithmic trading strategies
            </p>
          </div>

          <div style={{ display: 'flex', gap: ds.spacing.medium, alignItems: 'center' }}>
            {/* View Mode Toggle */}
            <div style={{
              display: 'flex',
              backgroundColor: ds.colors.semantic.background.tertiary,
              borderRadius: ds.interactive.radius.medium,
              padding: ds.spacing.micro,
            }}>
              {(['dashboard', 'create', 'manage'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: `${ds.spacing.small} ${ds.spacing.large}`,
                    backgroundColor: viewMode === mode ? ds.colors.semantic.accent : 'transparent',
                    color: viewMode === mode ? ds.colors.grayscale[10] : ds.colors.grayscale[70],
                    border: 'none',
                    borderRadius: ds.interactive.radius.small,
                    fontSize: ds.typography.scale.small,
                    fontWeight: ds.typography.weights.medium,
                    cursor: 'pointer',
                    transition: designHelpers.animate('all', ds.animation.durations.fast),
                    textTransform: 'capitalize',
                  }}
                >
                  {mode === 'dashboard' && '📊'} {mode === 'create' && '🤖'} {mode === 'manage' && '⚙️'} {mode}
                </button>
              ))}
            </div>

            {/* API Key Button */}
            <button
              onClick={() => setShowApiKeyDialog(true)}
              style={{
                padding: `${ds.spacing.small} ${ds.spacing.large}`,
                backgroundColor: apiKey ? ds.colors.semantic.success : 'transparent',
                color: apiKey ? ds.colors.grayscale[10] : ds.colors.semantic.accent,
                border: `1px solid ${apiKey ? ds.colors.semantic.success : ds.colors.semantic.accent}`,
                borderRadius: ds.interactive.radius.medium,
                fontSize: ds.typography.scale.small,
                fontWeight: ds.typography.weights.medium,
                cursor: 'pointer',
                transition: designHelpers.animate('all', ds.animation.durations.fast),
              }}
            >
              🔑 {apiKey ? 'API Connected' : 'Set API Key'}
            </button>
          </div>
        </div>
      </header>

      <main style={{
        maxWidth: ds.grid.maxWidth,
        margin: '0 auto',
        padding: ds.spacing.large,
      }}>
        {/* Dashboard View */}
        {viewMode === 'dashboard' && (
          <>
            {/* Portfolio Metrics Overview */}
            <section style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: ds.spacing.large,
              marginBottom: ds.spacing.xlarge,
            }}>
              <div style={{
                backgroundColor: ds.colors.semantic.background.secondary,
                borderRadius: ds.interactive.radius.medium,
                padding: ds.spacing.large,
                border: `1px solid ${ds.colors.grayscale[20]}`,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: ds.spacing.medium,
                }}>
                  <span style={{ fontSize: '32px' }}>💼</span>
                  <span style={{
                    fontSize: ds.typography.scale.small,
                    color: ds.colors.grayscale[70],
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Total P&L
                  </span>
                </div>
                <div style={{
                  fontSize: ds.typography.scale.xxxlarge,
                  fontWeight: ds.typography.weights.bold,
                  fontFamily: ds.typography.families.data,
                  color: portfolioMetrics.totalPnL >= 0 ? ds.colors.semantic.success : ds.colors.semantic.error,
                  marginBottom: ds.spacing.small,
                }}>
                  {formatCurrency(portfolioMetrics.totalPnL)}
                </div>
                <div style={{
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                }}>
                  Across {portfolioMetrics.totalStrategies} strategies
                </div>
              </div>

              <div style={{
                backgroundColor: ds.colors.semantic.background.secondary,
                borderRadius: ds.interactive.radius.medium,
                padding: ds.spacing.large,
                border: `1px solid ${ds.colors.grayscale[20]}`,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: ds.spacing.medium,
                }}>
                  <span style={{ fontSize: '32px' }}>⚡</span>
                  <span style={{
                    fontSize: ds.typography.scale.small,
                    color: ds.colors.grayscale[70],
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Active Strategies
                  </span>
                </div>
                <div style={{
                  fontSize: ds.typography.scale.xxxlarge,
                  fontWeight: ds.typography.weights.bold,
                  fontFamily: ds.typography.families.data,
                  color: ds.colors.semantic.accent,
                  marginBottom: ds.spacing.small,
                }}>
                  {portfolioMetrics.activeStrategies}
                </div>
                <div style={{
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                }}>
                  {((portfolioMetrics.activeStrategies / portfolioMetrics.totalStrategies) * 100).toFixed(0)}% deployment rate
                </div>
              </div>

              <div style={{
                backgroundColor: ds.colors.semantic.background.secondary,
                borderRadius: ds.interactive.radius.medium,
                padding: ds.spacing.large,
                border: `1px solid ${ds.colors.grayscale[20]}`,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: ds.spacing.medium,
                }}>
                  <span style={{ fontSize: '32px' }}>🎯</span>
                  <span style={{
                    fontSize: ds.typography.scale.small,
                    color: ds.colors.grayscale[70],
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Avg Win Rate
                  </span>
                </div>
                <div style={{
                  fontSize: ds.typography.scale.xxxlarge,
                  fontWeight: ds.typography.weights.bold,
                  fontFamily: ds.typography.families.data,
                  color: ds.colors.semantic.info,
                  marginBottom: ds.spacing.small,
                }}>
                  {formatPercentage(portfolioMetrics.avgWinRate)}
                </div>
                <div style={{
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                }}>
                  Portfolio average
                </div>
              </div>

              <div style={{
                backgroundColor: ds.colors.semantic.background.secondary,
                borderRadius: ds.interactive.radius.medium,
                padding: ds.spacing.large,
                border: `1px solid ${ds.colors.grayscale[20]}`,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: ds.spacing.medium,
                }}>
                  <span style={{ fontSize: '32px' }}>🏆</span>
                  <span style={{
                    fontSize: ds.typography.scale.small,
                    color: ds.colors.grayscale[70],
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Best Performer
                  </span>
                </div>
                <div style={{
                  fontSize: ds.typography.scale.large,
                  fontWeight: ds.typography.weights.semibold,
                  marginBottom: ds.spacing.small,
                }}>
                  {portfolioMetrics.bestPerformer?.name}
                </div>
                <div style={{
                  fontSize: ds.typography.scale.medium,
                  fontFamily: ds.typography.families.data,
                  color: ds.colors.semantic.success,
                }}>
                  {formatCurrency(portfolioMetrics.bestPerformer?.performance.totalPnl || 0)}
                </div>
              </div>
            </section>

            {/* Strategy Cards Grid */}
            <section>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: ds.spacing.large,
              }}>
                <h2 style={{
                  fontSize: ds.typography.scale.large,
                  fontWeight: ds.typography.weights.semibold,
                  margin: 0,
                }}>
                  Strategy Performance
                </h2>
                
                <div style={{ display: 'flex', gap: ds.spacing.medium, alignItems: 'center' }}>
                  {/* Status Filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    style={{
                      padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                      backgroundColor: ds.colors.semantic.background.tertiary,
                      color: ds.colors.grayscale[90],
                      border: `1px solid ${ds.colors.grayscale[30]}`,
                      borderRadius: ds.interactive.radius.medium,
                      fontSize: ds.typography.scale.small,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="testing">Testing</option>
                    <option value="paused">Paused</option>
                    <option value="stopped">Stopped</option>
                  </select>

                  {/* Sort By */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    style={{
                      padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                      backgroundColor: ds.colors.semantic.background.tertiary,
                      color: ds.colors.grayscale[90],
                      border: `1px solid ${ds.colors.grayscale[30]}`,
                      borderRadius: ds.interactive.radius.medium,
                      fontSize: ds.typography.scale.small,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="performance">Sort by Performance</option>
                    <option value="created">Sort by Created</option>
                    <option value="name">Sort by Name</option>
                  </select>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
                gap: ds.spacing.large,
              }}>
                {filteredStrategies.map((strategy) => (
                  <div
                    key={strategy.id}
                    onClick={() => setSelectedStrategy(strategy)}
                    style={{
                      backgroundColor: ds.colors.semantic.background.secondary,
                      borderRadius: ds.interactive.radius.medium,
                      padding: ds.spacing.large,
                      border: `1px solid ${selectedStrategy?.id === strategy.id ? ds.colors.semantic.accent : ds.colors.grayscale[20]}`,
                      cursor: 'pointer',
                      transition: designHelpers.animate('all', ds.animation.durations.fast),
                      position: 'relative',
                    }}
                  >
                    {/* Strategy Header */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: ds.spacing.medium,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: ds.spacing.small,
                          marginBottom: ds.spacing.small,
                        }}>
                          <span style={{ fontSize: ds.typography.scale.large }}>
                            {getTypeIcon(strategy.type)}
                          </span>
                          <h3 style={{
                            fontSize: ds.typography.scale.medium,
                            fontWeight: ds.typography.weights.semibold,
                            margin: 0,
                          }}>
                            {strategy.name}
                          </h3>
                        </div>
                        <p style={{
                          fontSize: ds.typography.scale.small,
                          color: ds.colors.grayscale[70],
                          margin: 0,
                          marginBottom: ds.spacing.small,
                        }}>
                          {strategy.description}
                        </p>
                      </div>

                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: ds.spacing.small,
                      }}>
                        <span style={{
                          padding: `${ds.spacing.micro} ${ds.spacing.small}`,
                          backgroundColor: `${getStatusColor(strategy.status)}20`,
                          color: getStatusColor(strategy.status),
                          borderRadius: ds.interactive.radius.small,
                          fontSize: ds.typography.scale.mini,
                          fontWeight: ds.typography.weights.medium,
                          textTransform: 'uppercase',
                        }}>
                          {strategy.status}
                        </span>
                        <span style={{
                          fontSize: ds.typography.scale.mini,
                          color: ds.colors.grayscale[60],
                        }}>
                          {strategy.timeframe} • {strategy.symbols.join(', ')}
                        </span>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: ds.spacing.medium,
                      marginBottom: ds.spacing.medium,
                    }}>
                      <div style={{
                        textAlign: 'center',
                        padding: ds.spacing.small,
                        backgroundColor: ds.colors.semantic.background.primary,
                        borderRadius: ds.interactive.radius.small,
                      }}>
                        <div style={{
                          fontSize: ds.typography.scale.large,
                          fontWeight: ds.typography.weights.bold,
                          fontFamily: ds.typography.families.data,
                          color: strategy.performance.totalPnl >= 0 ? ds.colors.semantic.success : ds.colors.semantic.error,
                          marginBottom: ds.spacing.micro,
                        }}>
                          {formatCurrency(strategy.performance.totalPnl)}
                        </div>
                        <div style={{
                          fontSize: ds.typography.scale.mini,
                          color: ds.colors.grayscale[70],
                          textTransform: 'uppercase',
                        }}>
                          Total P&L
                        </div>
                      </div>

                      <div style={{
                        textAlign: 'center',
                        padding: ds.spacing.small,
                        backgroundColor: ds.colors.semantic.background.primary,
                        borderRadius: ds.interactive.radius.small,
                      }}>
                        <div style={{
                          fontSize: ds.typography.scale.large,
                          fontWeight: ds.typography.weights.bold,
                          fontFamily: ds.typography.families.data,
                          color: ds.colors.semantic.info,
                          marginBottom: ds.spacing.micro,
                        }}>
                          {formatPercentage(strategy.performance.winRate)}
                        </div>
                        <div style={{
                          fontSize: ds.typography.scale.mini,
                          color: ds.colors.grayscale[70],
                          textTransform: 'uppercase',
                        }}>
                          Win Rate
                        </div>
                      </div>

                      <div style={{
                        textAlign: 'center',
                        padding: ds.spacing.small,
                        backgroundColor: ds.colors.semantic.background.primary,
                        borderRadius: ds.interactive.radius.small,
                      }}>
                        <div style={{
                          fontSize: ds.typography.scale.large,
                          fontWeight: ds.typography.weights.bold,
                          fontFamily: ds.typography.families.data,
                          color: ds.colors.semantic.accent,
                          marginBottom: ds.spacing.micro,
                        }}>
                          {strategy.performance.sharpeRatio.toFixed(2)}
                        </div>
                        <div style={{
                          fontSize: ds.typography.scale.mini,
                          color: ds.colors.grayscale[70],
                          textTransform: 'uppercase',
                        }}>
                          Sharpe Ratio
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                      display: 'flex',
                      gap: ds.spacing.small,
                      justifyContent: 'flex-end',
                    }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const newStatus = strategy.status === 'active' ? 'paused' : 'active'
                          handleStatusToggle(strategy.id, newStatus)
                        }}
                        style={{
                          padding: ds.spacing.small,
                          backgroundColor: strategy.status === 'active' ? 
                            `${ds.colors.semantic.warning}20` : 
                            `${ds.colors.semantic.success}20`,
                          color: strategy.status === 'active' ? 
                            ds.colors.semantic.warning : 
                            ds.colors.semantic.success,
                          border: 'none',
                          borderRadius: ds.interactive.radius.small,
                          cursor: 'pointer',
                          fontSize: ds.typography.scale.small,
                        }}
                      >
                        {strategy.status === 'active' ? '⏸️' : '▶️'}
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteStrategy(strategy.id)
                        }}
                        style={{
                          padding: ds.spacing.small,
                          backgroundColor: `${ds.colors.semantic.error}20`,
                          color: ds.colors.semantic.error,
                          border: 'none',
                          borderRadius: ds.interactive.radius.small,
                          cursor: 'pointer',
                          fontSize: ds.typography.scale.small,
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Create View - AI Strategy Builder */}
        {viewMode === 'create' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: ds.spacing.xlarge,
            minHeight: '600px',
          }}>
            {/* AI Chat Interface */}
            <div style={{
              backgroundColor: ds.colors.semantic.background.secondary,
              borderRadius: ds.interactive.radius.medium,
              padding: ds.spacing.large,
              border: `1px solid ${ds.colors.grayscale[20]}`,
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: ds.spacing.small,
                marginBottom: ds.spacing.large,
              }}>
                <span style={{ fontSize: '32px' }}>🤖</span>
                <h2 style={{
                  fontSize: ds.typography.scale.large,
                  fontWeight: ds.typography.weights.semibold,
                  margin: 0,
                }}>
                  AI Strategy Builder
                </h2>
              </div>

              {!apiKey && (
                <div style={{
                  padding: ds.spacing.large,
                  backgroundColor: ds.colors.semantic.warning.background,
                  border: `1px solid ${ds.colors.semantic.warning.border}`,
                  borderRadius: ds.interactive.radius.medium,
                  marginBottom: ds.spacing.large,
                  textAlign: 'center',
                }}>
                  <p style={{
                    fontSize: ds.typography.scale.base,
                    color: ds.colors.semantic.warning.text,
                    margin: 0,
                    marginBottom: ds.spacing.medium,
                  }}>
                    🔑 API Key Required
                  </p>
                  <p style={{
                    fontSize: ds.typography.scale.small,
                    color: ds.colors.semantic.warning.text,
                    margin: 0,
                    marginBottom: ds.spacing.medium,
                  }}>
                    Connect your Anthropic API key to generate custom trading strategies with AI
                  </p>
                  <button
                    onClick={() => setShowApiKeyDialog(true)}
                    style={{
                      padding: `${ds.spacing.small} ${ds.spacing.large}`,
                      backgroundColor: ds.colors.semantic.accent,
                      color: ds.colors.grayscale[10],
                      border: 'none',
                      borderRadius: ds.interactive.radius.medium,
                      fontSize: ds.typography.scale.small,
                      fontWeight: ds.typography.weights.medium,
                      cursor: 'pointer',
                    }}
                  >
                    Set API Key
                  </button>
                </div>
              )}

              {/* Quick Prompts */}
              <div style={{ marginBottom: ds.spacing.large }}>
                <h3 style={{
                  fontSize: ds.typography.scale.medium,
                  fontWeight: ds.typography.weights.medium,
                  marginBottom: ds.spacing.medium,
                  color: ds.colors.grayscale[80],
                }}>
                  Quick Start Ideas
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: ds.spacing.small,
                }}>
                  {[
                    { icon: '📈', title: 'Momentum Strategy', prompt: 'Create a momentum trading strategy using RSI and moving averages' },
                    { icon: '↩️', title: 'Mean Reversion', prompt: 'Build a mean reversion strategy for oversold/overbought conditions' },
                    { icon: '⚡', title: 'Scalping Bot', prompt: 'Generate a high-frequency scalping strategy with tight stops' },
                    { icon: '🛡️', title: 'Risk-First', prompt: 'Create a conservative strategy focused on capital preservation' },
                  ].map((idea, index) => (
                    <button
                      key={index}
                      onClick={() => setAiPrompt(idea.prompt)}
                      disabled={!apiKey}
                      style={{
                        padding: ds.spacing.medium,
                        backgroundColor: ds.colors.semantic.background.tertiary,
                        border: `1px solid ${ds.colors.grayscale[30]}`,
                        borderRadius: ds.interactive.radius.medium,
                        cursor: apiKey ? 'pointer' : 'not-allowed',
                        opacity: apiKey ? 1 : 0.5,
                        textAlign: 'left',
                        transition: designHelpers.animate('all', ds.animation.durations.fast),
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: ds.spacing.small,
                        marginBottom: ds.spacing.small,
                      }}>
                        <span style={{ fontSize: ds.typography.scale.medium }}>{idea.icon}</span>
                        <span style={{
                          fontSize: ds.typography.scale.small,
                          fontWeight: ds.typography.weights.medium,
                        }}>
                          {idea.title}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Input */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe your trading strategy idea in detail... 

Examples:
• Create a momentum strategy that trades breakouts with volume confirmation
• Build a mean reversion bot for crypto markets using Bollinger Bands
• Generate a scalping strategy with machine learning price prediction"
                  disabled={!apiKey}
                  style={{
                    flex: 1,
                    minHeight: '200px',
                    padding: ds.spacing.medium,
                    backgroundColor: ds.colors.semantic.background.primary,
                    color: ds.colors.grayscale[90],
                    border: `1px solid ${ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.medium,
                    fontSize: ds.typography.scale.base,
                    resize: 'none',
                    marginBottom: ds.spacing.medium,
                  }}
                />
                
                <button
                  onClick={handleGenerateStrategy}
                  disabled={!apiKey || !aiPrompt.trim() || isGenerating}
                  style={{
                    padding: `${ds.spacing.medium} ${ds.spacing.large}`,
                    backgroundColor: ds.colors.semantic.accent,
                    color: ds.colors.grayscale[10],
                    border: 'none',
                    borderRadius: ds.interactive.radius.medium,
                    fontSize: ds.typography.scale.base,
                    fontWeight: ds.typography.weights.semibold,
                    cursor: (!apiKey || !aiPrompt.trim() || isGenerating) ? 'not-allowed' : 'pointer',
                    opacity: (!apiKey || !aiPrompt.trim() || isGenerating) ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: ds.spacing.small,
                  }}
                >
                  {isGenerating ? '⏳ Generating...' : '🤖 Generate Strategy'}
                </button>
              </div>
            </div>

            {/* Strategy Preview */}
            <div style={{
              backgroundColor: ds.colors.semantic.background.secondary,
              borderRadius: ds.interactive.radius.medium,
              padding: ds.spacing.large,
              border: `1px solid ${ds.colors.grayscale[20]}`,
              display: 'flex',
              flexDirection: 'column',
            }}>
              {selectedStrategy ? (
                <>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: ds.spacing.large,
                  }}>
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: ds.spacing.small,
                        marginBottom: ds.spacing.small,
                      }}>
                        <span style={{ fontSize: ds.typography.scale.large }}>
                          {getTypeIcon(selectedStrategy.type)}
                        </span>
                        <h3 style={{
                          fontSize: ds.typography.scale.large,
                          fontWeight: ds.typography.weights.semibold,
                          margin: 0,
                        }}>
                          {selectedStrategy.name}
                        </h3>
                      </div>
                      <p style={{
                        fontSize: ds.typography.scale.base,
                        color: ds.colors.grayscale[70],
                        margin: 0,
                      }}>
                        {selectedStrategy.description}
                      </p>
                    </div>

                    <span style={{
                      padding: `${ds.spacing.micro} ${ds.spacing.small}`,
                      backgroundColor: `${getStatusColor(selectedStrategy.status)}20`,
                      color: getStatusColor(selectedStrategy.status),
                      borderRadius: ds.interactive.radius.small,
                      fontSize: ds.typography.scale.mini,
                      fontWeight: ds.typography.weights.medium,
                      textTransform: 'uppercase',
                    }}>
                      {selectedStrategy.status}
                    </span>
                  </div>

                  {/* Strategy Details */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: ds.spacing.medium,
                    marginBottom: ds.spacing.large,
                  }}>
                    <div style={{
                      padding: ds.spacing.medium,
                      backgroundColor: ds.colors.semantic.background.primary,
                      borderRadius: ds.interactive.radius.medium,
                    }}>
                      <div style={{
                        fontSize: ds.typography.scale.small,
                        color: ds.colors.grayscale[70],
                        marginBottom: ds.spacing.small,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        Timeframe
                      </div>
                      <div style={{
                        fontSize: ds.typography.scale.medium,
                        fontWeight: ds.typography.weights.semibold,
                        fontFamily: ds.typography.families.data,
                      }}>
                        {selectedStrategy.timeframe}
                      </div>
                    </div>

                    <div style={{
                      padding: ds.spacing.medium,
                      backgroundColor: ds.colors.semantic.background.primary,
                      borderRadius: ds.interactive.radius.medium,
                    }}>
                      <div style={{
                        fontSize: ds.typography.scale.small,
                        color: ds.colors.grayscale[70],
                        marginBottom: ds.spacing.small,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        Symbols
                      </div>
                      <div style={{
                        fontSize: ds.typography.scale.medium,
                        fontWeight: ds.typography.weights.semibold,
                        fontFamily: ds.typography.families.data,
                      }}>
                        {selectedStrategy.symbols.join(', ')}
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: ds.spacing.small,
                    marginBottom: ds.spacing.large,
                  }}>
                    {[
                      { label: 'Total P&L', value: formatCurrency(selectedStrategy.performance.totalPnl), color: selectedStrategy.performance.totalPnl >= 0 ? ds.colors.semantic.success : ds.colors.semantic.error },
                      { label: 'Win Rate', value: formatPercentage(selectedStrategy.performance.winRate), color: ds.colors.semantic.info },
                      { label: 'Sharpe Ratio', value: selectedStrategy.performance.sharpeRatio.toFixed(2), color: ds.colors.semantic.accent },
                      { label: 'Max Drawdown', value: formatPercentage(selectedStrategy.performance.maxDrawdown), color: ds.colors.semantic.warning },
                    ].map((metric, index) => (
                      <div
                        key={index}
                        style={{
                          padding: ds.spacing.small,
                          backgroundColor: ds.colors.semantic.background.primary,
                          borderRadius: ds.interactive.radius.small,
                          textAlign: 'center',
                        }}
                      >
                        <div style={{
                          fontSize: ds.typography.scale.mini,
                          color: ds.colors.grayscale[70],
                          marginBottom: ds.spacing.micro,
                          textTransform: 'uppercase',
                        }}>
                          {metric.label}
                        </div>
                        <div style={{
                          fontSize: ds.typography.scale.base,
                          fontWeight: ds.typography.weights.semibold,
                          fontFamily: ds.typography.families.data,
                          color: metric.color,
                        }}>
                          {metric.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: ds.spacing.medium,
                    marginTop: 'auto',
                  }}>
                    <button
                      onClick={() => {
                        // Add to strategies and switch to dashboard
                        setStrategies(prev => [selectedStrategy, ...prev])
                        setViewMode('dashboard')
                        setSelectedStrategy(null)
                      }}
                      style={{
                        flex: 1,
                        padding: `${ds.spacing.medium} ${ds.spacing.large}`,
                        backgroundColor: ds.colors.semantic.success,
                        color: ds.colors.grayscale[10],
                        border: 'none',
                        borderRadius: ds.interactive.radius.medium,
                        fontSize: ds.typography.scale.base,
                        fontWeight: ds.typography.weights.semibold,
                        cursor: 'pointer',
                      }}
                    >
                      💾 Save Strategy
                    </button>
                    
                    <button
                      onClick={() => {
                        handleStatusToggle(selectedStrategy.id, 'testing')
                        setStrategies(prev => [selectedStrategy, ...prev])
                        setViewMode('dashboard')
                        setSelectedStrategy(null)
                      }}
                      style={{
                        flex: 1,
                        padding: `${ds.spacing.medium} ${ds.spacing.large}`,
                        backgroundColor: ds.colors.semantic.accent,
                        color: ds.colors.grayscale[10],
                        border: 'none',
                        borderRadius: ds.interactive.radius.medium,
                        fontSize: ds.typography.scale.base,
                        fontWeight: ds.typography.weights.semibold,
                        cursor: 'pointer',
                      }}
                    >
                      🧪 Test Strategy
                    </button>
                  </div>
                </>
              ) : (
                <div style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: ds.colors.grayscale[70],
                }}>
                  <span style={{ fontSize: '64px', marginBottom: ds.spacing.large }}>🤖</span>
                  <h3 style={{
                    fontSize: ds.typography.scale.large,
                    fontWeight: ds.typography.weights.medium,
                    marginBottom: ds.spacing.medium,
                  }}>
                    AI Strategy Preview
                  </h3>
                  <p style={{
                    fontSize: ds.typography.scale.base,
                    maxWidth: '300px',
                    lineHeight: 1.6,
                  }}>
                    Describe your trading strategy idea and I'll generate a complete implementation with code, risk metrics, and backtesting parameters.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manage View - Detailed Strategy Management */}
        {viewMode === 'manage' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: ds.spacing.large,
            }}>
              <h2 style={{
                fontSize: ds.typography.scale.large,
                fontWeight: ds.typography.weights.semibold,
                margin: 0,
              }}>
                Strategy Management
              </h2>
              
              <button
                onClick={() => setViewMode('create')}
                style={{
                  padding: `${ds.spacing.medium} ${ds.spacing.large}`,
                  backgroundColor: ds.colors.semantic.accent,
                  color: ds.colors.grayscale[10],
                  border: 'none',
                  borderRadius: ds.interactive.radius.medium,
                  fontSize: ds.typography.scale.base,
                  fontWeight: ds.typography.weights.semibold,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: ds.spacing.small,
                }}
              >
                🤖 Create New Strategy
              </button>
            </div>

            {/* Management Table */}
            <div style={{
              backgroundColor: ds.colors.semantic.background.secondary,
              borderRadius: ds.interactive.radius.medium,
              overflow: 'hidden',
              border: `1px solid ${ds.colors.grayscale[20]}`,
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: ds.colors.semantic.background.tertiary,
                  }}>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontSize: ds.typography.scale.small,
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Strategy
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'center',
                      fontSize: ds.typography.scale.small,
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Status
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'right',
                      fontSize: ds.typography.scale.small,
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Total P&L
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'right',
                      fontSize: ds.typography.scale.small,
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Win Rate
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'right',
                      fontSize: ds.typography.scale.small,
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Sharpe Ratio
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'center',
                      fontSize: ds.typography.scale.small,
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStrategies.map((strategy) => (
                    <tr key={strategy.id}>
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: ds.spacing.small,
                        }}>
                          <span style={{ fontSize: ds.typography.scale.medium }}>
                            {getTypeIcon(strategy.type)}
                          </span>
                          <div>
                            <div style={{
                              fontSize: ds.typography.scale.base,
                              fontWeight: ds.typography.weights.medium,
                              marginBottom: ds.spacing.micro,
                            }}>
                              {strategy.name}
                            </div>
                            <div style={{
                              fontSize: ds.typography.scale.small,
                              color: ds.colors.grayscale[70],
                            }}>
                              {strategy.timeframe} • {strategy.symbols.join(', ')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        textAlign: 'center',
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        <span style={{
                          padding: `${ds.spacing.micro} ${ds.spacing.small}`,
                          backgroundColor: `${getStatusColor(strategy.status)}20`,
                          color: getStatusColor(strategy.status),
                          borderRadius: ds.interactive.radius.small,
                          fontSize: ds.typography.scale.small,
                          fontWeight: ds.typography.weights.medium,
                          textTransform: 'uppercase',
                        }}>
                          {strategy.status}
                        </span>
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        textAlign: 'right',
                        fontSize: ds.typography.scale.base,
                        fontFamily: ds.typography.families.data,
                        fontWeight: ds.typography.weights.semibold,
                        color: strategy.performance.totalPnl >= 0 ? ds.colors.semantic.success : ds.colors.semantic.error,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        {formatCurrency(strategy.performance.totalPnl)}
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        textAlign: 'right',
                        fontSize: ds.typography.scale.base,
                        fontFamily: ds.typography.families.data,
                        fontWeight: ds.typography.weights.semibold,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        {formatPercentage(strategy.performance.winRate)}
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        textAlign: 'right',
                        fontSize: ds.typography.scale.base,
                        fontFamily: ds.typography.families.data,
                        fontWeight: ds.typography.weights.semibold,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        {strategy.performance.sharpeRatio.toFixed(2)}
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        textAlign: 'center',
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: ds.spacing.small }}>
                          <button
                            onClick={() => {
                              const newStatus = strategy.status === 'active' ? 'paused' : 'active'
                              handleStatusToggle(strategy.id, newStatus)
                            }}
                            style={{
                              padding: ds.spacing.small,
                              backgroundColor: strategy.status === 'active' ? 
                                `${ds.colors.semantic.warning}20` : 
                                `${ds.colors.semantic.success}20`,
                              color: strategy.status === 'active' ? 
                                ds.colors.semantic.warning : 
                                ds.colors.semantic.success,
                              border: 'none',
                              borderRadius: ds.interactive.radius.small,
                              cursor: 'pointer',
                              fontSize: ds.typography.scale.small,
                            }}
                          >
                            {strategy.status === 'active' ? '⏸️' : '▶️'}
                          </button>
                          
                          <button
                            onClick={() => setSelectedStrategy(strategy)}
                            style={{
                              padding: ds.spacing.small,
                              backgroundColor: `${ds.colors.semantic.info}20`,
                              color: ds.colors.semantic.info,
                              border: 'none',
                              borderRadius: ds.interactive.radius.small,
                              cursor: 'pointer',
                              fontSize: ds.typography.scale.small,
                            }}
                          >
                            👁️
                          </button>
                          
                          <button
                            onClick={() => handleDeleteStrategy(strategy.id)}
                            style={{
                              padding: ds.spacing.small,
                              backgroundColor: `${ds.colors.semantic.error}20`,
                              color: ds.colors.semantic.error,
                              border: 'none',
                              borderRadius: ds.interactive.radius.small,
                              cursor: 'pointer',
                              fontSize: ds.typography.scale.small,
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* API Key Dialog */}
      {showApiKeyDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: ds.colors.semantic.background.primary,
            borderRadius: ds.interactive.radius.large,
            padding: ds.spacing.xlarge,
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}>
            <h2 style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.medium,
            }}>
              Connect Anthropic API
            </h2>
            
            <div style={{
              padding: ds.spacing.medium,
              backgroundColor: ds.colors.semantic.info.background,
              border: `1px solid ${ds.colors.semantic.info.border}`,
              borderRadius: ds.interactive.radius.medium,
              marginBottom: ds.spacing.large,
            }}>
              <p style={{
                fontSize: ds.typography.scale.small,
                color: ds.colors.semantic.info.text,
                margin: 0,
              }}>
                Your API key is stored locally and only used to generate strategies. Get your key from{' '}
                <a 
                  href="https://console.anthropic.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: ds.colors.semantic.accent }}
                >
                  console.anthropic.com
                </a>
              </p>
            </div>
            
            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              style={{
                width: '100%',
                padding: ds.spacing.medium,
                backgroundColor: ds.colors.semantic.background.secondary,
                color: ds.colors.grayscale[90],
                border: `1px solid ${ds.colors.grayscale[30]}`,
                borderRadius: ds.interactive.radius.medium,
                fontSize: ds.typography.scale.base,
                marginBottom: ds.spacing.large,
                fontFamily: ds.typography.families.data,
              }}
            />
            
            <div style={{
              display: 'flex',
              gap: ds.spacing.medium,
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => {
                  setShowApiKeyDialog(false)
                  setTempApiKey('')
                }}
                style={{
                  padding: `${ds.spacing.medium} ${ds.spacing.large}`,
                  backgroundColor: 'transparent',
                  color: ds.colors.grayscale[70],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.medium,
                  fontSize: ds.typography.scale.base,
                  fontWeight: ds.typography.weights.medium,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                disabled={!tempApiKey.trim()}
                style={{
                  padding: `${ds.spacing.medium} ${ds.spacing.large}`,
                  backgroundColor: ds.colors.semantic.accent,
                  color: ds.colors.grayscale[10],
                  border: 'none',
                  borderRadius: ds.interactive.radius.medium,
                  fontSize: ds.typography.scale.base,
                  fontWeight: ds.typography.weights.semibold,
                  cursor: tempApiKey.trim() ? 'pointer' : 'not-allowed',
                  opacity: tempApiKey.trim() ? 1 : 0.5,
                }}
              >
                Save API Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}