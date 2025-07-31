'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { dieterRamsDesign as ds, designHelpers } from '@/lib/design/DieterRamsDesignSystem'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface Strategy {
  id: string
  name: string
  type: string
  status: 'active' | 'paused' | 'stopped'
  totalReturn: number
  monthlyReturn: number
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  totalTrades: number
  profitFactor: number
  avgWin: number
  avgLoss: number
  currentPositions: number
  allocation: number
}

interface PerformanceData {
  dates: string[]
  returns: number[]
  equity: number[]
  drawdown: number[]
  volume: number[]
}

interface TradeStats {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  avgHoldTime: number
  bestTrade: { symbol: string; return: number; date: string }
  worstTrade: { symbol: string; return: number; date: string }
  consecutiveWins: number
  consecutiveLosses: number
  largestWin: number
  largestLoss: number
}

export default function StrategyPerformancePage() {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('all')
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M')
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null)
  const [tradeStats, setTradeStats] = useState<TradeStats | null>(null)
  const [comparisonMode, setComparisonMode] = useState(false)
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([])

  useEffect(() => {
    // Mock data
    const mockStrategies: Strategy[] = [
      {
        id: 's1',
        name: 'Momentum Alpha',
        type: 'Momentum',
        status: 'active',
        totalReturn: 45.2,
        monthlyReturn: 3.8,
        sharpeRatio: 2.1,
        maxDrawdown: -12.5,
        winRate: 68,
        totalTrades: 342,
        profitFactor: 2.3,
        avgWin: 2.5,
        avgLoss: -1.1,
        currentPositions: 5,
        allocation: 40,
      },
      {
        id: 's2',
        name: 'Mean Reversion Pro',
        type: 'Mean Reversion',
        status: 'active',
        totalReturn: 32.1,
        monthlyReturn: 2.9,
        sharpeRatio: 1.8,
        maxDrawdown: -8.3,
        winRate: 72,
        totalTrades: 523,
        profitFactor: 1.9,
        avgWin: 1.8,
        avgLoss: -0.9,
        currentPositions: 3,
        allocation: 30,
      },
      {
        id: 's3',
        name: 'Arbitrage Bot',
        type: 'Arbitrage',
        status: 'paused',
        totalReturn: 28.5,
        monthlyReturn: 2.5,
        sharpeRatio: 3.2,
        maxDrawdown: -4.2,
        winRate: 85,
        totalTrades: 1243,
        profitFactor: 3.5,
        avgWin: 0.8,
        avgLoss: -0.2,
        currentPositions: 0,
        allocation: 20,
      },
      {
        id: 's4',
        name: 'Trend Following',
        type: 'Trend',
        status: 'active',
        totalReturn: 15.8,
        monthlyReturn: 1.4,
        sharpeRatio: 1.2,
        maxDrawdown: -18.5,
        winRate: 45,
        totalTrades: 89,
        profitFactor: 1.5,
        avgWin: 5.2,
        avgLoss: -2.3,
        currentPositions: 2,
        allocation: 10,
      },
    ]

    // Mock performance data
    const dates = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      return date.toLocaleDateString()
    })

    const mockPerformanceData: PerformanceData = {
      dates,
      returns: dates.map(() => Math.random() * 4 - 1),
      equity: dates.map((_, i) => 100000 + i * 1500 + Math.random() * 5000),
      drawdown: dates.map(() => -Math.random() * 5),
      volume: dates.map(() => Math.floor(Math.random() * 50) + 10),
    }

    const mockTradeStats: TradeStats = {
      totalTrades: 342,
      winningTrades: 232,
      losingTrades: 110,
      avgHoldTime: 3.5,
      bestTrade: { symbol: 'BTC', return: 15.2, date: '2024-01-15' },
      worstTrade: { symbol: 'ETH', return: -8.5, date: '2024-01-22' },
      consecutiveWins: 8,
      consecutiveLosses: 3,
      largestWin: 15.2,
      largestLoss: -8.5,
    }

    setStrategies(mockStrategies)
    setPerformanceData(mockPerformanceData)
    setTradeStats(mockTradeStats)
  }, [timeframe, selectedStrategy])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return ds.colors.semantic.success
      case 'paused': return ds.colors.semantic.warning
      case 'stopped': return ds.colors.semantic.error
      default: return ds.colors.semantic.neutral
    }
  }

  const toggleStrategySelection = (strategyId: string) => {
    setSelectedStrategies(prev => 
      prev.includes(strategyId) 
        ? prev.filter(id => id !== strategyId)
        : [...prev, strategyId]
    )
  }

  const renderPerformanceChart = () => {
    if (!performanceData) return null

    const chartData = {
      labels: performanceData.dates,
      datasets: [
        {
          label: 'Equity Curve',
          data: performanceData.equity,
          borderColor: ds.colors.semantic.primary,
          backgroundColor: `${ds.colors.semantic.primary}10`,
          fill: true,
          tension: 0.1,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ]
    }

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: ds.colors.semantic.background.secondary,
          titleColor: ds.colors.grayscale[90],
          bodyColor: ds.colors.grayscale[90],
          borderColor: ds.colors.grayscale[30],
          borderWidth: 1,
          titleFont: {
            family: ds.typography.families.interface,
            size: 12,
          },
          bodyFont: {
            family: ds.typography.families.data,
            size: 11,
          },
          padding: 12,
          cornerRadius: 4,
        }
      },
      scales: {
        x: {
          ticks: {
            color: ds.colors.grayscale[70],
            font: {
              family: ds.typography.families.data,
              size: 10,
            },
            maxRotation: 45,
            minRotation: 45,
          },
          grid: {
            color: ds.colors.grayscale[20],
            drawBorder: false,
          }
        },
        y: {
          ticks: {
            color: ds.colors.grayscale[70],
            font: {
              family: ds.typography.families.data,
              size: 10,
            },
            callback: function(value: any) {
              return '$' + value.toLocaleString()
            }
          },
          grid: {
            color: ds.colors.grayscale[20],
            drawBorder: false,
          }
        }
      }
    }

    return (
      <div style={{
        backgroundColor: ds.colors.semantic.background.secondary,
        borderRadius: ds.interactive.radius.medium,
        padding: ds.spacing.large,
        border: `1px solid ${ds.colors.grayscale[20]}`,
        marginBottom: ds.spacing.xlarge,
      }}>
        <h3 style={{
          fontSize: ds.typography.scale.medium,
          fontWeight: ds.typography.weights.semibold,
          marginBottom: ds.spacing.large,
        }}>
          Performance Overview
        </h3>
        <div style={{ height: '400px' }}>
          <Line data={chartData} options={options} />
        </div>
      </div>
    )
  }

  const renderStrategyCard = (strategy: Strategy) => {
    const isSelected = selectedStrategies.includes(strategy.id)
    
    return (
      <div
        key={strategy.id}
        style={{
          backgroundColor: ds.colors.semantic.background.secondary,
          borderRadius: ds.interactive.radius.medium,
          padding: ds.spacing.large,
          border: `2px solid ${isSelected ? ds.colors.semantic.primary : ds.colors.grayscale[20]}`,
          cursor: comparisonMode ? 'pointer' : 'default',
          transition: designHelpers.animate('all', ds.animation.durations.fast),
        }}
        onClick={() => comparisonMode && toggleStrategySelection(strategy.id)}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: ds.spacing.medium,
        }}>
          <div>
            <h3 style={{
              fontSize: ds.typography.scale.base,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.mini,
            }}>
              {strategy.name}
            </h3>
            <span style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
            }}>
              {strategy.type}
            </span>
          </div>
          <span style={{
            display: 'inline-block',
            padding: `${ds.spacing.mini} ${ds.spacing.small}`,
            backgroundColor: `${getStatusColor(strategy.status)}20`,
            color: getStatusColor(strategy.status),
            borderRadius: ds.interactive.radius.small,
            fontSize: ds.typography.scale.mini,
            fontWeight: ds.typography.weights.medium,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {strategy.status}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: ds.spacing.medium,
          marginBottom: ds.spacing.medium,
        }}>
          <div>
            <div style={{
              fontSize: ds.typography.scale.mini,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.micro,
            }}>
              Total Return
            </div>
            <div style={{
              fontSize: ds.typography.scale.medium,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              color: strategy.totalReturn >= 0 ? ds.colors.semantic.buy : ds.colors.semantic.sell,
            }}>
              {strategy.totalReturn >= 0 ? '+' : ''}{strategy.totalReturn}%
            </div>
          </div>
          
          <div>
            <div style={{
              fontSize: ds.typography.scale.mini,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.micro,
            }}>
              Sharpe Ratio
            </div>
            <div style={{
              fontSize: ds.typography.scale.medium,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
            }}>
              {strategy.sharpeRatio}
            </div>
          </div>
          
          <div>
            <div style={{
              fontSize: ds.typography.scale.mini,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.micro,
            }}>
              Win Rate
            </div>
            <div style={{
              fontSize: ds.typography.scale.medium,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
            }}>
              {strategy.winRate}%
            </div>
          </div>
          
          <div>
            <div style={{
              fontSize: ds.typography.scale.mini,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.micro,
            }}>
              Max Drawdown
            </div>
            <div style={{
              fontSize: ds.typography.scale.medium,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              color: ds.colors.semantic.sell,
            }}>
              {strategy.maxDrawdown}%
            </div>
          </div>
        </div>

        <div style={{
          paddingTop: ds.spacing.medium,
          borderTop: `1px solid ${ds.colors.grayscale[20]}`,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: ds.typography.scale.small,
        }}>
          <span style={{ color: ds.colors.grayscale[70] }}>
            {strategy.totalTrades} trades
          </span>
          <span style={{ fontFamily: ds.typography.families.data }}>
            {strategy.allocation}% allocation
          </span>
        </div>
      </div>
    )
  }

  const renderTradeStats = () => {
    if (!tradeStats) return null

    return (
      <div style={{
        backgroundColor: ds.colors.semantic.background.secondary,
        borderRadius: ds.interactive.radius.medium,
        padding: ds.spacing.large,
        border: `1px solid ${ds.colors.grayscale[20]}`,
      }}>
        <h3 style={{
          fontSize: ds.typography.scale.medium,
          fontWeight: ds.typography.weights.semibold,
          marginBottom: ds.spacing.large,
        }}>
          Trade Statistics
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: ds.spacing.large,
        }}>
          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
            }}>
              Win/Loss Distribution
            </div>
            <div style={{
              display: 'flex',
              gap: ds.spacing.small,
              alignItems: 'center',
            }}>
              <div style={{
                flex: 1,
                height: '8px',
                backgroundColor: ds.colors.grayscale[20],
                borderRadius: ds.interactive.radius.pill,
                overflow: 'hidden',
                display: 'flex',
              }}>
                <div style={{
                  width: `${(tradeStats.winningTrades / tradeStats.totalTrades) * 100}%`,
                  height: '100%',
                  backgroundColor: ds.colors.semantic.buy,
                }} />
                <div style={{
                  flex: 1,
                  height: '100%',
                  backgroundColor: ds.colors.semantic.sell,
                }} />
              </div>
              <span style={{
                fontSize: ds.typography.scale.small,
                fontFamily: ds.typography.families.data,
              }}>
                {Math.round((tradeStats.winningTrades / tradeStats.totalTrades) * 100)}%
              </span>
            </div>
          </div>

          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
            }}>
              Average Hold Time
            </div>
            <div style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
            }}>
              {tradeStats.avgHoldTime} days
            </div>
          </div>

          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
            }}>
              Consecutive Wins
            </div>
            <div style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              color: ds.colors.semantic.success,
            }}>
              {tradeStats.consecutiveWins}
            </div>
          </div>

          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
            }}>
              Consecutive Losses
            </div>
            <div style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              color: ds.colors.semantic.error,
            }}>
              {tradeStats.consecutiveLosses}
            </div>
          </div>
        </div>

        <div style={{
          marginTop: ds.spacing.large,
          paddingTop: ds.spacing.large,
          borderTop: `1px solid ${ds.colors.grayscale[20]}`,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: ds.spacing.large,
        }}>
          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
            }}>
              Best Trade
            </div>
            <div style={{
              padding: ds.spacing.medium,
              backgroundColor: `${ds.colors.semantic.buy}10`,
              borderRadius: ds.interactive.radius.small,
              border: `1px solid ${ds.colors.semantic.buy}30`,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{
                  fontFamily: ds.typography.families.data,
                  fontWeight: ds.typography.weights.medium,
                }}>
                  {tradeStats.bestTrade.symbol}
                </span>
                <span style={{
                  color: ds.colors.semantic.buy,
                  fontWeight: ds.typography.weights.semibold,
                }}>
                  +{tradeStats.bestTrade.return}%
                </span>
              </div>
              <div style={{
                fontSize: ds.typography.scale.mini,
                color: ds.colors.grayscale[70],
                marginTop: ds.spacing.mini,
              }}>
                {tradeStats.bestTrade.date}
              </div>
            </div>
          </div>

          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
            }}>
              Worst Trade
            </div>
            <div style={{
              padding: ds.spacing.medium,
              backgroundColor: `${ds.colors.semantic.sell}10`,
              borderRadius: ds.interactive.radius.small,
              border: `1px solid ${ds.colors.semantic.sell}30`,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{
                  fontFamily: ds.typography.families.data,
                  fontWeight: ds.typography.weights.medium,
                }}>
                  {tradeStats.worstTrade.symbol}
                </span>
                <span style={{
                  color: ds.colors.semantic.sell,
                  fontWeight: ds.typography.weights.semibold,
                }}>
                  {tradeStats.worstTrade.return}%
                </span>
              </div>
              <div style={{
                fontSize: ds.typography.scale.mini,
                color: ds.colors.grayscale[70],
                marginTop: ds.spacing.mini,
              }}>
                {tradeStats.worstTrade.date}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: ds.colors.semantic.background.primary,
      color: ds.colors.grayscale[90],
      minHeight: '100vh',
      fontFamily: ds.typography.families.interface,
    }}>
      {/* Header */}
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
              fontSize: ds.typography.scale.xlarge,
              fontWeight: ds.typography.weights.semibold,
              margin: 0,
              marginBottom: ds.spacing.mini,
            }}>
              Strategy Performance
            </h1>
            <p style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              margin: 0,
            }}>
              Monitor and analyze your trading strategies
            </p>
          </div>

          <div style={{ display: 'flex', gap: ds.spacing.medium, alignItems: 'center' }}>
            {/* Comparison Mode Toggle */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: ds.spacing.small,
              fontSize: ds.typography.scale.small,
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={comparisonMode}
                onChange={(e) => {
                  setComparisonMode(e.target.checked)
                  if (!e.target.checked) setSelectedStrategies([])
                }}
                style={{ cursor: 'pointer' }}
              />
              Compare Strategies
            </label>

            {/* Timeframe Selector */}
            <div style={{ display: 'flex', gap: ds.spacing.mini }}>
              {(['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const).map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  style={{
                    padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                    backgroundColor: timeframe === tf ? ds.colors.semantic.primary : 'transparent',
                    color: timeframe === tf ? ds.colors.grayscale[5] : ds.colors.grayscale[70],
                    border: `1px solid ${timeframe === tf ? ds.colors.semantic.primary : ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.medium,
                    fontSize: ds.typography.scale.small,
                    fontWeight: ds.typography.weights.medium,
                    cursor: 'pointer',
                    transition: designHelpers.animate('all', ds.animation.durations.fast),
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: ds.grid.maxWidth,
        margin: '0 auto',
        padding: ds.spacing.large,
      }}>
        {/* Performance Chart */}
        {renderPerformanceChart()}

        {/* Strategy Cards */}
        <section style={{ marginBottom: ds.spacing.xxlarge }}>
          <h2 style={{
            fontSize: ds.typography.scale.large,
            fontWeight: ds.typography.weights.semibold,
            marginBottom: ds.spacing.large,
          }}>
            Active Strategies
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: ds.spacing.medium,
          }}>
            {strategies.map(strategy => renderStrategyCard(strategy))}
          </div>
        </section>

        {/* Trade Statistics */}
        {renderTradeStats()}
      </main>
    </div>
  )
}