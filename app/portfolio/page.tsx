'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
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

// Crypto-dark theme colors
const theme = {
  colors: {
    background: '#0d0e14',
    surface: '#1e222d',
    border: '#2a2e39',
    text: {
      primary: '#d1d4dc',
      secondary: '#787b86'
    },
    success: '#26a69a',
    danger: '#ef5350',
    // Additional semantic colors for trading
    buy: '#26a69a',
    sell: '#ef5350',
    primary: '#4a9eff',
    warning: '#ffa726'
  },
  spacing: {
    mini: '4px',
    small: '8px',
    medium: '16px',
    large: '24px',
    xlarge: '32px',
    xxlarge: '48px'
  },
  typography: {
    families: {
      interface: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      data: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", monospace'
    },
    sizes: {
      mini: '10px',
      small: '12px',
      medium: '14px',
      large: '16px',
      xlarge: '20px',
      xxlarge: '24px',
      xxxlarge: '32px'
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  radius: {
    small: '4px',
    medium: '6px',
    large: '8px',
    pill: '999px'
  }
}

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
        borderColor: theme.colors.primary,
        backgroundColor: `${theme.colors.primary}10`,
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
          backgroundColor: theme.colors.surface,
          titleColor: theme.colors.text.primary,
          bodyColor: theme.colors.text.primary,
          borderColor: theme.colors.border,
          borderWidth: 1,
          titleFont: {
            family: theme.typography.families.interface,
            size: 12,
          },
          bodyFont: {
            family: theme.typography.families.data,
            size: 11,
          },
          padding: 12,
          cornerRadius: 4,
        }
      },
      scales: {
        x: {
          ticks: {
            color: theme.colors.text.secondary,
            font: {
              family: theme.typography.families.data,
              size: 10,
            },
            maxRotation: 45,
            minRotation: 45,
          },
          grid: {
            color: theme.colors.border,
            drawBorder: false,
          }
        },
        y: {
          ticks: {
            color: theme.colors.text.secondary,
            font: {
              family: theme.typography.families.data,
              size: 10,
            },
            callback: function(value: any) {
              return '$' + value.toLocaleString()
            }
          },
          grid: {
            color: theme.colors.border,
            drawBorder: false,
          }
        }
      }
    }

    return (
      <div style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.medium,
        padding: theme.spacing.large,
        border: `1px solid ${theme.colors.border}`,
      }}>
        <h3 style={{
          fontSize: theme.typography.sizes.medium,
          fontWeight: theme.typography.weights.semibold,
          marginBottom: theme.spacing.large,
          color: theme.colors.text.primary,
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
          theme.colors.primary,
          theme.colors.success,
          theme.colors.warning,
          theme.colors.danger,
          '#8b5cf6',
          theme.colors.text.secondary,
        ],
        borderColor: theme.colors.surface,
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
            color: theme.colors.text.primary,
            font: {
              family: theme.typography.families.interface,
              size: 11,
            },
            padding: 10,
          }
        },
        tooltip: {
          backgroundColor: theme.colors.surface,
          titleColor: theme.colors.text.primary,
          bodyColor: theme.colors.text.primary,
          borderColor: theme.colors.border,
          borderWidth: 1,
          titleFont: {
            family: theme.typography.families.interface,
            size: 12,
          },
          bodyFont: {
            family: theme.typography.families.data,
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
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.medium,
        padding: theme.spacing.large,
        border: `1px solid ${theme.colors.border}`,
      }}>
        <h3 style={{
          fontSize: theme.typography.sizes.medium,
          fontWeight: theme.typography.weights.semibold,
          marginBottom: theme.spacing.large,
          color: theme.colors.text.primary,
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
      backgroundColor: theme.colors.background,
      color: theme.colors.text.primary,
      minHeight: '100vh',
      fontFamily: theme.typography.families.interface,
    }}>
      {/* Header */}
      <header style={{
        paddingLeft: theme.spacing.small, // Minimal left padding, sidebar offset handled by layout
        paddingRight: theme.spacing.large,
        paddingTop: theme.spacing.large,
        paddingBottom: theme.spacing.large,
        borderBottom: `1px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.surface,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: theme.spacing.large,
          }}>
            <div>
              <h1 style={{
                fontSize: theme.typography.sizes.xlarge,
                fontWeight: theme.typography.weights.semibold,
                margin: 0,
                marginBottom: theme.spacing.mini,
                color: theme.colors.text.primary,
              }}>
                Portfolio Overview
              </h1>
              <p style={{
                fontSize: theme.typography.sizes.small,
                color: theme.colors.text.secondary,
                margin: 0,
              }}>
                Track your investments and performance
              </p>
            </div>

            {/* Timeframe Selector */}
            <div style={{ display: 'flex', gap: theme.spacing.mini }}>
              {(['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const).map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  style={{
                    padding: `${theme.spacing.small} ${theme.spacing.medium}`,
                    backgroundColor: timeframe === tf ? theme.colors.primary : 'transparent',
                    color: timeframe === tf ? theme.colors.background : theme.colors.text.secondary,
                    border: `1px solid ${timeframe === tf ? theme.colors.primary : theme.colors.border}`,
                    borderRadius: theme.radius.medium,
                    fontSize: theme.typography.sizes.small,
                    fontWeight: theme.typography.weights.medium,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
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
              gap: theme.spacing.large,
            }}>
              <div>
                <div style={{
                  fontSize: theme.typography.sizes.small,
                  color: theme.colors.text.secondary,
                  marginBottom: theme.spacing.small,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Total Value
                </div>
                <div style={{
                  fontSize: theme.typography.sizes.xxlarge,
                  fontWeight: theme.typography.weights.semibold,
                  fontFamily: theme.typography.families.data,
                  color: theme.colors.text.primary,
                }}>
                  {formatCurrency(portfolioStats.totalValue)}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: theme.typography.sizes.small,
                  color: theme.colors.text.secondary,
                  marginBottom: theme.spacing.small,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Total P&L
                </div>
                <div style={{
                  fontSize: theme.typography.sizes.xxlarge,
                  fontWeight: theme.typography.weights.semibold,
                  fontFamily: theme.typography.families.data,
                  color: portfolioStats.totalPnL >= 0 ? theme.colors.success : theme.colors.danger,
                }}>
                  {portfolioStats.totalPnL >= 0 ? '+' : ''}{formatCurrency(portfolioStats.totalPnL)}
                  <span style={{
                    fontSize: theme.typography.sizes.medium,
                    marginLeft: theme.spacing.small,
                  }}>
                    ({portfolioStats.totalPnLPercent.toFixed(2)}%)
                  </span>
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: theme.typography.sizes.small,
                  color: theme.colors.text.secondary,
                  marginBottom: theme.spacing.small,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Day Change
                </div>
                <div style={{
                  fontSize: theme.typography.sizes.xxlarge,
                  fontWeight: theme.typography.weights.semibold,
                  fontFamily: theme.typography.families.data,
                  color: portfolioStats.dayChange >= 0 ? theme.colors.success : theme.colors.danger,
                }}>
                  {portfolioStats.dayChange >= 0 ? '+' : ''}{formatCurrency(portfolioStats.dayChange)}
                  <span style={{
                    fontSize: theme.typography.sizes.medium,
                    marginLeft: theme.spacing.small,
                  }}>
                    ({portfolioStats.dayChangePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: theme.typography.sizes.small,
                  color: theme.colors.text.secondary,
                  marginBottom: theme.spacing.small,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Sharpe Ratio
                </div>
                <div style={{
                  fontSize: theme.typography.sizes.xxlarge,
                  fontWeight: theme.typography.weights.semibold,
                  fontFamily: theme.typography.families.data,
                  color: portfolioStats.sharpeRatio > 1.5 ? theme.colors.success : 
                         portfolioStats.sharpeRatio > 0.5 ? theme.colors.warning :
                         theme.colors.danger,
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
        maxWidth: '1200px',
        margin: '0 auto',
        paddingLeft: theme.spacing.small, // Minimal left padding, sidebar offset handled by layout
        paddingRight: theme.spacing.large,
        paddingTop: theme.spacing.large,
        paddingBottom: theme.spacing.large,
      }}>
        {/* Charts */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: theme.spacing.large,
          marginBottom: theme.spacing.xlarge,
        }}>
          {renderPortfolioChart()}
          {renderAllocationChart()}
        </div>

        {/* Positions Table */}
        <section style={{ marginBottom: theme.spacing.xlarge }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.large,
          }}>
            <h2 style={{
              fontSize: theme.typography.sizes.large,
              fontWeight: theme.typography.weights.semibold,
              color: theme.colors.text.primary,
            }}>
              Current Positions
            </h2>
            <button
              onClick={() => setShowTransactions(!showTransactions)}
              style={{
                padding: `${theme.spacing.small} ${theme.spacing.medium}`,
                backgroundColor: 'transparent',
                color: theme.colors.primary,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.medium,
                fontSize: theme.typography.sizes.small,
                fontWeight: theme.typography.weights.medium,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {showTransactions ? 'Show Positions' : 'Show Transactions'}
            </button>
          </div>

          {!showTransactions ? (
            <div style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.medium,
              overflow: 'hidden',
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: theme.typography.sizes.small,
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: theme.colors.background,
                  }}>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'left',
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                    }}>
                      Asset
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'right',
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                    }}>
                      Amount
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'right',
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                    }}>
                      Avg Cost
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'right',
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                    }}>
                      Current Price
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'right',
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                    }}>
                      Value
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'right',
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                    }}>
                      P&L
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'right',
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                    }}>
                      Day Change
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'right',
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
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
                        transition: 'background-color 0.2s ease',
                      }}
                      onClick={() => setSelectedAsset(selectedAsset === position.id ? null : position.id)}
                    >
                      <td style={{
                        padding: theme.spacing.medium,
                        borderBottom: `1px solid ${theme.colors.border}`,
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing.small,
                        }}>
                          <div>
                            <div style={{
                              fontWeight: theme.typography.weights.medium,
                              color: theme.colors.text.primary,
                            }}>
                              {position.asset}
                            </div>
                            <div style={{
                              fontSize: theme.typography.sizes.mini,
                              color: theme.colors.text.secondary,
                            }}>
                              {position.symbol}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{
                        padding: theme.spacing.medium,
                        borderBottom: `1px solid ${theme.colors.border}`,
                        textAlign: 'right',
                        fontFamily: theme.typography.families.data,
                        color: theme.colors.text.primary,
                      }}>
                        {position.amount}
                      </td>
                      <td style={{
                        padding: theme.spacing.medium,
                        borderBottom: `1px solid ${theme.colors.border}`,
                        textAlign: 'right',
                        fontFamily: theme.typography.families.data,
                        color: theme.colors.text.primary,
                      }}>
                        {formatCurrency(position.avgCost)}
                      </td>
                      <td style={{
                        padding: theme.spacing.medium,
                        borderBottom: `1px solid ${theme.colors.border}`,
                        textAlign: 'right',
                        fontFamily: theme.typography.families.data,
                        color: theme.colors.text.primary,
                      }}>
                        {formatCurrency(position.currentPrice)}
                      </td>
                      <td style={{
                        padding: theme.spacing.medium,
                        borderBottom: `1px solid ${theme.colors.border}`,
                        textAlign: 'right',
                        fontFamily: theme.typography.families.data,
                        fontWeight: theme.typography.weights.medium,
                        color: theme.colors.text.primary,
                      }}>
                        {formatCurrency(position.value)}
                      </td>
                      <td style={{
                        padding: theme.spacing.medium,
                        borderBottom: `1px solid ${theme.colors.border}`,
                        textAlign: 'right',
                        fontFamily: theme.typography.families.data,
                        color: position.pnl >= 0 ? theme.colors.success : theme.colors.danger,
                        fontWeight: theme.typography.weights.medium,
                      }}>
                        {position.pnl >= 0 ? '+' : ''}{formatCurrency(position.pnl)}
                        <div style={{
                          fontSize: theme.typography.sizes.mini,
                        }}>
                          ({position.pnlPercent.toFixed(2)}%)
                        </div>
                      </td>
                      <td style={{
                        padding: theme.spacing.medium,
                        borderBottom: `1px solid ${theme.colors.border}`,
                        textAlign: 'right',
                        fontFamily: theme.typography.families.data,
                        color: position.dayChange >= 0 ? theme.colors.success : theme.colors.danger,
                      }}>
                        {position.dayChange >= 0 ? '+' : ''}{formatCurrency(position.dayChange)}
                        <div style={{
                          fontSize: theme.typography.sizes.mini,
                        }}>
                          ({position.dayChangePercent.toFixed(2)}%)
                        </div>
                      </td>
                      <td style={{
                        padding: theme.spacing.medium,
                        borderBottom: `1px solid ${theme.colors.border}`,
                        textAlign: 'right',
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: theme.spacing.small,
                        }}>
                          <div style={{
                            width: '60px',
                            height: '6px',
                            backgroundColor: theme.colors.border,
                            borderRadius: theme.radius.pill,
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${position.allocation}%`,
                              height: '100%',
                              backgroundColor: theme.colors.primary,
                            }} />
                          </div>
                          <span style={{
                            fontSize: theme.typography.sizes.small,
                            fontFamily: theme.typography.families.data,
                            minWidth: '45px',
                            color: theme.colors.text.primary,
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
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.medium,
              overflow: 'hidden',
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: theme.typography.sizes.small,
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: theme.colors.background,
                  }}>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'left',
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                    }}>
                      Date
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'left',
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                    }}>
                      Type
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'left',
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                    }}>
                      Asset
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'right',
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                    }}>
                      Amount
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'right',
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                    }}>
                      Price
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'right',
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                    }}>
                      Total
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'left',
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                    }}>
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td style={{
                        padding: theme.spacing.medium,
                        borderBottom: `1px solid ${theme.colors.border}`,
                        fontSize: theme.typography.sizes.small,
                        color: theme.colors.text.primary,
                      }}>
                        {formatTimestamp(transaction.timestamp)}
                      </td>
                      <td style={{
                        padding: theme.spacing.medium,
                        borderBottom: `1px solid ${theme.colors.border}`,
                      }}>
                        <span style={{
                          display: 'inline-block',
                          padding: `${theme.spacing.mini} ${theme.spacing.small}`,
                          backgroundColor: transaction.type === 'buy' || transaction.type === 'deposit' ? 
                            `${theme.colors.success}20` : 
                            transaction.type === 'sell' || transaction.type === 'withdrawal' ?
                            `${theme.colors.danger}20` :
                            `${theme.colors.primary}20`,
                          color: transaction.type === 'buy' || transaction.type === 'deposit' ? 
                            theme.colors.success : 
                            transaction.type === 'sell' || transaction.type === 'withdrawal' ?
                            theme.colors.danger :
                            theme.colors.primary,
                          borderRadius: theme.radius.small,
                          fontSize: theme.typography.sizes.mini,
                          fontWeight: theme.typography.weights.medium,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>
                          {transaction.type}
                        </span>
                      </td>
                      <td style={{
                        padding: theme.spacing.medium,
                        borderBottom: `1px solid ${theme.colors.border}`,
                        fontFamily: theme.typography.families.data,
                        fontWeight: theme.typography.weights.medium,
                        color: theme.colors.text.primary,
                      }}>
                        {transaction.asset || '-'}
                      </td>
                      <td style={{
                        padding: theme.spacing.medium,
                        borderBottom: `1px solid ${theme.colors.border}`,
                        textAlign: 'right',
                        fontFamily: theme.typography.families.data,
                        color: theme.colors.text.primary,
                      }}>
                        {transaction.amount}
                      </td>
                      <td style={{
                        padding: theme.spacing.medium,
                        borderBottom: `1px solid ${theme.colors.border}`,
                        textAlign: 'right',
                        fontFamily: theme.typography.families.data,
                        color: theme.colors.text.primary,
                      }}>
                        {transaction.price ? formatCurrency(transaction.price) : '-'}
                      </td>
                      <td style={{
                        padding: theme.spacing.medium,
                        borderBottom: `1px solid ${theme.colors.border}`,
                        textAlign: 'right',
                        fontFamily: theme.typography.families.data,
                        fontWeight: theme.typography.weights.medium,
                        color: theme.colors.text.primary,
                      }}>
                        {formatCurrency(transaction.total)}
                      </td>
                      <td style={{
                        padding: theme.spacing.medium,
                        borderBottom: `1px solid ${theme.colors.border}`,
                        fontSize: theme.typography.sizes.small,
                        color: theme.colors.text.secondary,
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
            fontSize: theme.typography.sizes.large,
            fontWeight: theme.typography.weights.semibold,
            marginBottom: theme.spacing.large,
            color: theme.colors.text.primary,
          }}>
            Quick Actions
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: theme.spacing.medium,
          }}>
            <button style={{
              padding: theme.spacing.large,
              backgroundColor: theme.colors.surface,
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.medium,
              fontSize: theme.typography.sizes.small,
              fontWeight: theme.typography.weights.medium,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: theme.typography.sizes.xlarge, marginBottom: theme.spacing.small }}>
                💰
              </div>
              Add Funds
            </button>
            
            <button style={{
              padding: theme.spacing.large,
              backgroundColor: theme.colors.surface,
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.medium,
              fontSize: theme.typography.sizes.small,
              fontWeight: theme.typography.weights.medium,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: theme.typography.sizes.xlarge, marginBottom: theme.spacing.small }}>
                🏦
              </div>
              Withdraw
            </button>
            
            <button style={{
              padding: theme.spacing.large,
              backgroundColor: theme.colors.surface,
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.medium,
              fontSize: theme.typography.sizes.small,
              fontWeight: theme.typography.weights.medium,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: theme.typography.sizes.xlarge, marginBottom: theme.spacing.small }}>
                ⚖️
              </div>
              Rebalance
            </button>
            
            <button style={{
              padding: theme.spacing.large,
              backgroundColor: theme.colors.surface,
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.medium,
              fontSize: theme.typography.sizes.small,
              fontWeight: theme.typography.weights.medium,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: theme.typography.sizes.xlarge, marginBottom: theme.spacing.small }}>
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