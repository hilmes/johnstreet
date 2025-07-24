'use client'

import React, { useState, useEffect } from 'react'
import { dieterRamsDesign as ds, designHelpers } from '@/lib/design/DieterRamsDesignSystem'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
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

interface Position {
  id: string
  asset: string
  symbol: string
  amount: number
  avgCost: number
  currentPrice: number
  value: number
  pnl: number
  pnlPercent: number
  allocation: number
  dayChange: number
  dayChangePercent: number
  sector: string
}

interface Transaction {
  id: string
  type: 'buy' | 'sell' | 'deposit' | 'withdrawal' | 'dividend' | 'fee'
  asset?: string
  amount: number
  price?: number
  total: number
  timestamp: number
  description: string
}

interface PortfolioStats {
  totalValue: number
  totalCost: number
  totalPnL: number
  totalPnLPercent: number
  dayChange: number
  dayChangePercent: number
  weekChange: number
  weekChangePercent: number
  monthChange: number
  monthChangePercent: number
  yearChange: number
  yearChangePercent: number
  allTimeHigh: number
  allTimeLow: number
  sharpeRatio: number
  volatility: number
  beta: number
}

interface AllocationData {
  byAsset: Array<{ name: string; value: number; percentage: number }>
  bySector: Array<{ name: string; value: number; percentage: number }>
  byType: Array<{ name: string; value: number; percentage: number }>
}

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats | null>(null)
  const [allocationData, setAllocationData] = useState<AllocationData | null>(null)
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M')
  const [showTransactions, setShowTransactions] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)

  // Mock data
  useEffect(() => {
    const mockPositions: Position[] = [
      {
        id: '1',
        asset: 'Bitcoin',
        symbol: 'BTC',
        amount: 1.5,
        avgCost: 45000,
        currentPrice: 69400,
        value: 104100,
        pnl: 36600,
        pnlPercent: 54.22,
        allocation: 62.5,
        dayChange: 1500,
        dayChangePercent: 1.46,
        sector: 'Cryptocurrency',
      },
      {
        id: '2',
        asset: 'Ethereum',
        symbol: 'ETH',
        amount: 10.5,
        avgCost: 2500,
        currentPrice: 3485,
        value: 36592.5,
        pnl: 10342.5,
        pnlPercent: 39.40,
        allocation: 22.0,
        dayChange: -450,
        dayChangePercent: -1.21,
        sector: 'Cryptocurrency',
      },
      {
        id: '3',
        asset: 'Solana',
        symbol: 'SOL',
        amount: 50,
        avgCost: 95,
        currentPrice: 178.32,
        value: 8916,
        pnl: 4166,
        pnlPercent: 87.75,
        allocation: 5.4,
        dayChange: 420,
        dayChangePercent: 4.94,
        sector: 'Cryptocurrency',
      },
      {
        id: '4',
        asset: 'Chainlink',
        symbol: 'LINK',
        amount: 200,
        avgCost: 15,
        currentPrice: 22.45,
        value: 4490,
        pnl: 1490,
        pnlPercent: 49.67,
        allocation: 2.7,
        dayChange: 80,
        dayChangePercent: 1.81,
        sector: 'DeFi',
      },
      {
        id: '5',
        asset: 'Polygon',
        symbol: 'MATIC',
        amount: 3000,
        avgCost: 0.85,
        currentPrice: 1.12,
        value: 3360,
        pnl: 810,
        pnlPercent: 31.76,
        allocation: 2.0,
        dayChange: -60,
        dayChangePercent: -1.75,
        sector: 'Layer 2',
      },
      {
        id: '6',
        asset: 'USD Cash',
        symbol: 'USD',
        amount: 8892.5,
        avgCost: 1,
        currentPrice: 1,
        value: 8892.5,
        pnl: 0,
        pnlPercent: 0,
        allocation: 5.3,
        dayChange: 0,
        dayChangePercent: 0,
        sector: 'Cash',
      }
    ]

    const mockStats: PortfolioStats = {
      totalValue: 166351,
      totalCost: 112742.5,
      totalPnL: 53608.5,
      totalPnLPercent: 47.55,
      dayChange: 1790,
      dayChangePercent: 1.09,
      weekChange: 8250,
      weekChangePercent: 5.22,
      monthChange: 22450,
      monthChangePercent: 15.61,
      yearChange: 85420,
      yearChangePercent: 105.52,
      allTimeHigh: 172500,
      allTimeLow: 85000,
      sharpeRatio: 2.15,
      volatility: 28.5,
      beta: 1.12,
    }

    const mockTransactions: Transaction[] = [
      {
        id: '1',
        type: 'buy',
        asset: 'BTC',
        amount: 0.5,
        price: 68500,
        total: 34250,
        timestamp: Date.now() - 86400000,
        description: 'Market buy order',
      },
      {
        id: '2',
        type: 'sell',
        asset: 'ETH',
        amount: 2,
        price: 3520,
        total: 7040,
        timestamp: Date.now() - 172800000,
        description: 'Partial position close',
      },
      {
        id: '3',
        type: 'deposit',
        amount: 10000,
        total: 10000,
        timestamp: Date.now() - 604800000,
        description: 'Bank transfer',
      },
      {
        id: '4',
        type: 'dividend',
        asset: 'USDC',
        amount: 125.50,
        total: 125.50,
        timestamp: Date.now() - 1209600000,
        description: 'Staking rewards',
      },
    ]

    const mockAllocation: AllocationData = {
      byAsset: mockPositions.map(p => ({
        name: p.symbol,
        value: p.value,
        percentage: p.allocation,
      })),
      bySector: [
        { name: 'Cryptocurrency', value: 149608.5, percentage: 90.0 },
        { name: 'DeFi', value: 4490, percentage: 2.7 },
        { name: 'Layer 2', value: 3360, percentage: 2.0 },
        { name: 'Cash', value: 8892.5, percentage: 5.3 },
      ],
      byType: [
        { name: 'Large Cap', value: 140692.5, percentage: 84.5 },
        { name: 'Mid Cap', value: 16766, percentage: 10.1 },
        { name: 'Small Cap', value: 0, percentage: 0 },
        { name: 'Cash', value: 8892.5, percentage: 5.4 },
      ],
    }

    setPositions(mockPositions)
    setPortfolioStats(mockStats)
    setTransactions(mockTransactions)
    setAllocationData(mockAllocation)
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString()
  }

  const renderPortfolioChart = () => {
    const dates = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      return date.toLocaleDateString()
    })

    const values = dates.map((_, i) => {
      const base = 120000
      const trend = i * 1500
      const noise = Math.random() * 5000 - 2500
      return base + trend + noise
    })

    const chartData = {
      labels: dates,
      datasets: [{
        label: 'Portfolio Value',
        data: values,
        borderColor: ds.colors.semantic.primary,
        backgroundColor: `${ds.colors.semantic.primary}10`,
        fill: true,
        tension: 0.1,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      }]
    }

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
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
      }}>
        <h3 style={{
          fontSize: ds.typography.scale.medium,
          fontWeight: ds.typography.weights.semibold,
          marginBottom: ds.spacing.large,
        }}>
          Portfolio Performance
        </h3>
        <div style={{ height: '300px' }}>
          <Line data={chartData} options={options} />
        </div>
      </div>
    )
  }

  const renderAllocationChart = () => {
    if (!allocationData) return null

    const chartData = {
      labels: allocationData.byAsset.map(a => a.name),
      datasets: [{
        data: allocationData.byAsset.map(a => a.value),
        backgroundColor: [
          ds.colors.semantic.primary,
          ds.colors.semantic.info,
          ds.colors.semantic.success,
          ds.colors.semantic.warning,
          ds.colors.semantic.error,
          ds.colors.grayscale[60],
        ],
        borderColor: ds.colors.semantic.background.secondary,
        borderWidth: 2,
      }]
    }

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right' as const,
          labels: {
            color: ds.colors.grayscale[90],
            font: {
              family: ds.typography.families.interface,
              size: 11,
            },
            padding: 10,
          }
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
          callbacks: {
            label: function(context: any) {
              const value = context.parsed
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
              const percentage = ((value / total) * 100).toFixed(1)
              return `${context.label}: $${value.toLocaleString()} (${percentage}%)`
            }
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
      }}>
        <h3 style={{
          fontSize: ds.typography.scale.medium,
          fontWeight: ds.typography.weights.semibold,
          marginBottom: ds.spacing.large,
        }}>
          Asset Allocation
        </h3>
        <div style={{ height: '300px' }}>
          <Doughnut data={chartData} options={options} />
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
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: ds.spacing.large,
          }}>
            <div>
              <h1 style={{
                fontSize: ds.typography.scale.xlarge,
                fontWeight: ds.typography.weights.semibold,
                margin: 0,
                marginBottom: ds.spacing.mini,
              }}>
                Portfolio Overview
              </h1>
              <p style={{
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                margin: 0,
              }}>
                Track your investments and performance
              </p>
            </div>

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

          {/* Portfolio Summary */}
          {portfolioStats && (
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
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Total Value
                </div>
                <div style={{
                  fontSize: ds.typography.scale.xxlarge,
                  fontWeight: ds.typography.weights.semibold,
                  fontFamily: ds.typography.families.data,
                }}>
                  {formatCurrency(portfolioStats.totalValue)}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                  marginBottom: ds.spacing.small,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Total P&L
                </div>
                <div style={{
                  fontSize: ds.typography.scale.xxlarge,
                  fontWeight: ds.typography.weights.semibold,
                  fontFamily: ds.typography.families.data,
                  color: portfolioStats.totalPnL >= 0 ? ds.colors.semantic.buy : ds.colors.semantic.sell,
                }}>
                  {portfolioStats.totalPnL >= 0 ? '+' : ''}{formatCurrency(portfolioStats.totalPnL)}
                  <span style={{
                    fontSize: ds.typography.scale.medium,
                    marginLeft: ds.spacing.small,
                  }}>
                    ({portfolioStats.totalPnLPercent.toFixed(2)}%)
                  </span>
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                  marginBottom: ds.spacing.small,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Day Change
                </div>
                <div style={{
                  fontSize: ds.typography.scale.xxlarge,
                  fontWeight: ds.typography.weights.semibold,
                  fontFamily: ds.typography.families.data,
                  color: portfolioStats.dayChange >= 0 ? ds.colors.semantic.buy : ds.colors.semantic.sell,
                }}>
                  {portfolioStats.dayChange >= 0 ? '+' : ''}{formatCurrency(portfolioStats.dayChange)}
                  <span style={{
                    fontSize: ds.typography.scale.medium,
                    marginLeft: ds.spacing.small,
                  }}>
                    ({portfolioStats.dayChangePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                  marginBottom: ds.spacing.small,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Sharpe Ratio
                </div>
                <div style={{
                  fontSize: ds.typography.scale.xxlarge,
                  fontWeight: ds.typography.weights.semibold,
                  fontFamily: ds.typography.families.data,
                  color: portfolioStats.sharpeRatio > 1.5 ? ds.colors.semantic.success : 
                         portfolioStats.sharpeRatio > 0.5 ? ds.colors.semantic.warning :
                         ds.colors.semantic.error,
                }}>
                  {portfolioStats.sharpeRatio.toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: ds.grid.maxWidth,
        margin: '0 auto',
        padding: ds.spacing.large,
      }}>
        {/* Charts */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: ds.spacing.large,
          marginBottom: ds.spacing.xlarge,
        }}>
          {renderPortfolioChart()}
          {renderAllocationChart()}
        </div>

        {/* Positions Table */}
        <section style={{ marginBottom: ds.spacing.xlarge }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: ds.spacing.large,
          }}>
            <h2 style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
            }}>
              Current Positions
            </h2>
            <button
              onClick={() => setShowTransactions(!showTransactions)}
              style={{
                padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                backgroundColor: 'transparent',
                color: ds.colors.semantic.primary,
                border: `1px solid ${ds.colors.grayscale[30]}`,
                borderRadius: ds.interactive.radius.medium,
                fontSize: ds.typography.scale.small,
                fontWeight: ds.typography.weights.medium,
                cursor: 'pointer',
                transition: designHelpers.animate('all', ds.animation.durations.fast),
              }}
            >
              {showTransactions ? 'Show Positions' : 'Show Transactions'}
            </button>
          </div>

          {!showTransactions ? (
            <div style={{
              backgroundColor: ds.colors.semantic.background.secondary,
              borderRadius: ds.interactive.radius.medium,
              overflow: 'hidden',
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: ds.typography.scale.small,
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: ds.colors.semantic.background.tertiary,
                  }}>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                    }}>
                      Asset
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'right',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                    }}>
                      Amount
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'right',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                    }}>
                      Avg Cost
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'right',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                    }}>
                      Current Price
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'right',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                    }}>
                      Value
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'right',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                    }}>
                      P&L
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'right',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                    }}>
                      Day Change
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'right',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                    }}>
                      Allocation
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr 
                      key={position.id}
                      style={{
                        cursor: 'pointer',
                        transition: designHelpers.animate('background-color', ds.animation.durations.fast),
                      }}
                      onClick={() => setSelectedAsset(selectedAsset === position.id ? null : position.id)}
                    >
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: ds.spacing.small,
                        }}>
                          <div>
                            <div style={{
                              fontWeight: ds.typography.weights.medium,
                            }}>
                              {position.asset}
                            </div>
                            <div style={{
                              fontSize: ds.typography.scale.mini,
                              color: ds.colors.grayscale[60],
                            }}>
                              {position.symbol}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                        textAlign: 'right',
                        fontFamily: ds.typography.families.data,
                      }}>
                        {position.amount}
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                        textAlign: 'right',
                        fontFamily: ds.typography.families.data,
                      }}>
                        {formatCurrency(position.avgCost)}
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                        textAlign: 'right',
                        fontFamily: ds.typography.families.data,
                      }}>
                        {formatCurrency(position.currentPrice)}
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                        textAlign: 'right',
                        fontFamily: ds.typography.families.data,
                        fontWeight: ds.typography.weights.medium,
                      }}>
                        {formatCurrency(position.value)}
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                        textAlign: 'right',
                        fontFamily: ds.typography.families.data,
                        color: position.pnl >= 0 ? ds.colors.semantic.buy : ds.colors.semantic.sell,
                        fontWeight: ds.typography.weights.medium,
                      }}>
                        {position.pnl >= 0 ? '+' : ''}{formatCurrency(position.pnl)}
                        <div style={{
                          fontSize: ds.typography.scale.mini,
                        }}>
                          ({position.pnlPercent.toFixed(2)}%)
                        </div>
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                        textAlign: 'right',
                        fontFamily: ds.typography.families.data,
                        color: position.dayChange >= 0 ? ds.colors.semantic.buy : ds.colors.semantic.sell,
                      }}>
                        {position.dayChange >= 0 ? '+' : ''}{formatCurrency(position.dayChange)}
                        <div style={{
                          fontSize: ds.typography.scale.mini,
                        }}>
                          ({position.dayChangePercent.toFixed(2)}%)
                        </div>
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                        textAlign: 'right',
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: ds.spacing.small,
                        }}>
                          <div style={{
                            width: '60px',
                            height: '6px',
                            backgroundColor: ds.colors.grayscale[20],
                            borderRadius: ds.interactive.radius.pill,
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${position.allocation}%`,
                              height: '100%',
                              backgroundColor: ds.colors.semantic.primary,
                            }} />
                          </div>
                          <span style={{
                            fontSize: ds.typography.scale.small,
                            fontFamily: ds.typography.families.data,
                            minWidth: '45px',
                          }}>
                            {position.allocation.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Transactions Table
            <div style={{
              backgroundColor: ds.colors.semantic.background.secondary,
              borderRadius: ds.interactive.radius.medium,
              overflow: 'hidden',
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: ds.typography.scale.small,
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: ds.colors.semantic.background.tertiary,
                  }}>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                    }}>
                      Date
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                    }}>
                      Type
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                    }}>
                      Asset
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'right',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                    }}>
                      Amount
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'right',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                    }}>
                      Price
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'right',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                    }}>
                      Total
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                    }}>
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                        fontSize: ds.typography.scale.small,
                      }}>
                        {formatTimestamp(transaction.timestamp)}
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        <span style={{
                          display: 'inline-block',
                          padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                          backgroundColor: transaction.type === 'buy' || transaction.type === 'deposit' ? 
                            `${ds.colors.semantic.buy}20` : 
                            transaction.type === 'sell' || transaction.type === 'withdrawal' ?
                            `${ds.colors.semantic.sell}20` :
                            `${ds.colors.semantic.info}20`,
                          color: transaction.type === 'buy' || transaction.type === 'deposit' ? 
                            ds.colors.semantic.buy : 
                            transaction.type === 'sell' || transaction.type === 'withdrawal' ?
                            ds.colors.semantic.sell :
                            ds.colors.semantic.info,
                          borderRadius: ds.interactive.radius.small,
                          fontSize: ds.typography.scale.mini,
                          fontWeight: ds.typography.weights.medium,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>
                          {transaction.type}
                        </span>
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                        fontFamily: ds.typography.families.data,
                        fontWeight: ds.typography.weights.medium,
                      }}>
                        {transaction.asset || '-'}
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                        textAlign: 'right',
                        fontFamily: ds.typography.families.data,
                      }}>
                        {transaction.amount}
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                        textAlign: 'right',
                        fontFamily: ds.typography.families.data,
                      }}>
                        {transaction.price ? formatCurrency(transaction.price) : '-'}
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                        textAlign: 'right',
                        fontFamily: ds.typography.families.data,
                        fontWeight: ds.typography.weights.medium,
                      }}>
                        {formatCurrency(transaction.total)}
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                        fontSize: ds.typography.scale.small,
                        color: ds.colors.grayscale[70],
                      }}>
                        {transaction.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <h2 style={{
            fontSize: ds.typography.scale.large,
            fontWeight: ds.typography.weights.semibold,
            marginBottom: ds.spacing.large,
          }}>
            Quick Actions
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: ds.spacing.medium,
          }}>
            <button style={{
              padding: ds.spacing.large,
              backgroundColor: ds.colors.semantic.background.secondary,
              color: ds.colors.grayscale[90],
              border: `1px solid ${ds.colors.grayscale[20]}`,
              borderRadius: ds.interactive.radius.medium,
              fontSize: ds.typography.scale.small,
              fontWeight: ds.typography.weights.medium,
              cursor: 'pointer',
              transition: designHelpers.animate('all', ds.animation.durations.fast),
              textAlign: 'center',
            }}>
              <div style={{ fontSize: ds.typography.scale.xlarge, marginBottom: ds.spacing.small }}>
                💰
              </div>
              Add Funds
            </button>
            
            <button style={{
              padding: ds.spacing.large,
              backgroundColor: ds.colors.semantic.background.secondary,
              color: ds.colors.grayscale[90],
              border: `1px solid ${ds.colors.grayscale[20]}`,
              borderRadius: ds.interactive.radius.medium,
              fontSize: ds.typography.scale.small,
              fontWeight: ds.typography.weights.medium,
              cursor: 'pointer',
              transition: designHelpers.animate('all', ds.animation.durations.fast),
              textAlign: 'center',
            }}>
              <div style={{ fontSize: ds.typography.scale.xlarge, marginBottom: ds.spacing.small }}>
                🏦
              </div>
              Withdraw
            </button>
            
            <button style={{
              padding: ds.spacing.large,
              backgroundColor: ds.colors.semantic.background.secondary,
              color: ds.colors.grayscale[90],
              border: `1px solid ${ds.colors.grayscale[20]}`,
              borderRadius: ds.interactive.radius.medium,
              fontSize: ds.typography.scale.small,
              fontWeight: ds.typography.weights.medium,
              cursor: 'pointer',
              transition: designHelpers.animate('all', ds.animation.durations.fast),
              textAlign: 'center',
            }}>
              <div style={{ fontSize: ds.typography.scale.xlarge, marginBottom: ds.spacing.small }}>
                ⚖️
              </div>
              Rebalance
            </button>
            
            <button style={{
              padding: ds.spacing.large,
              backgroundColor: ds.colors.semantic.background.secondary,
              color: ds.colors.grayscale[90],
              border: `1px solid ${ds.colors.grayscale[20]}`,
              borderRadius: ds.interactive.radius.medium,
              fontSize: ds.typography.scale.small,
              fontWeight: ds.typography.weights.medium,
              cursor: 'pointer',
              transition: designHelpers.animate('all', ds.animation.durations.fast),
              textAlign: 'center',
            }}>
              <div style={{ fontSize: ds.typography.scale.xlarge, marginBottom: ds.spacing.small }}>
                📊
              </div>
              Export Report
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}