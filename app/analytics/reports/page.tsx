'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ArcElement,
  Filler
} from 'chart.js'
import { Line, Bar, Doughnut, Scatter } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ArcElement,
  Filler
)

// Types
interface TradeRecord {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  price: number
  size: number
  fee: number
  pnl: number
  timestamp: Date
  strategy?: string
}

interface PerformanceMetrics {
  totalPnL: number
  totalVolume: number
  winRate: number
  avgTradeDuration: number
  maxDrawdown: number
  sharpeRatio: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  largestWin: number
  largestLoss: number
  avgWinSize: number
  avgLossSize: number
  profitFactor: number
}

interface AssetPerformance {
  symbol: string
  pnl: number
  volume: number
  trades: number
  winRate: number
  avgReturn: number
}

// Mock data for demonstration
const mockTrades: TradeRecord[] = [
  { id: '1', symbol: 'BTC/USD', side: 'buy', price: 67500, size: 0.5, fee: 33.75, pnl: 1250, timestamp: new Date('2024-01-15'), strategy: 'Momentum' },
  { id: '2', symbol: 'ETH/USD', side: 'sell', price: 3850, size: 2, fee: 15.4, pnl: -180, timestamp: new Date('2024-01-16'), strategy: 'Mean Reversion' },
  { id: '3', symbol: 'BTC/USD', side: 'buy', price: 68200, size: 0.3, fee: 20.46, pnl: 890, timestamp: new Date('2024-01-17'), strategy: 'Breakout' },
  { id: '4', symbol: 'SOL/USD', side: 'buy', price: 185, size: 10, fee: 18.5, pnl: 420, timestamp: new Date('2024-01-18'), strategy: 'Momentum' },
  { id: '5', symbol: 'ETH/USD', side: 'sell', price: 3920, size: 1.5, fee: 11.76, pnl: -95, timestamp: new Date('2024-01-19'), strategy: 'Scalping' },
]

const mockMetrics: PerformanceMetrics = {
  totalPnL: 2285,
  totalVolume: 156420,
  winRate: 0.68,
  avgTradeDuration: 4.2,
  maxDrawdown: -850,
  sharpeRatio: 1.85,
  totalTrades: 47,
  winningTrades: 32,
  losingTrades: 15,
  largestWin: 1250,
  largestLoss: -180,
  avgWinSize: 425,
  avgLossSize: -120,
  profitFactor: 2.4
}

export default function AnalyticsReportsPage() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'ytd' | 'all'>('30d')
  const [selectedAsset, setSelectedAsset] = useState<string>('all')
  const [selectedStrategy, setSelectedStrategy] = useState<string>('all')
  const [isExporting, setIsExporting] = useState(false)
  const [trades, setTrades] = useState<TradeRecord[]>(mockTrades)
  const [metrics, setMetrics] = useState<PerformanceMetrics>(mockMetrics)

  // Chart configurations with crypto-dark theme
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#d1d4dc',
          font: {
            family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: '#1e222d',
        titleColor: '#d1d4dc',
        bodyColor: '#d1d4dc',
        borderColor: '#2a2e39',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          color: '#2a2e39',
          drawBorder: false
        },
        ticks: {
          color: '#787b86',
          font: {
            family: 'JetBrains Mono, Monaco, Consolas, monospace',
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: '#2a2e39',
          drawBorder: false
        },
        ticks: {
          color: '#787b86',
          font: {
            family: 'JetBrains Mono, Monaco, Consolas, monospace',
            size: 11
          }
        }
      }
    }
  }

  // P&L over time chart data
  const pnlChartData = {
    labels: trades.map(t => t.timestamp.toLocaleDateString()),
    datasets: [{
      label: 'Cumulative P&L',
      data: trades.reduce((acc, trade, index) => {
        const cumulative = index === 0 ? trade.pnl : acc[index - 1] + trade.pnl
        acc.push(cumulative)
        return acc
      }, [] as number[]),
      borderColor: '#26a69a',
      backgroundColor: '#26a69a20',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#26a69a',
      pointBorderColor: '#0d0e14',
      pointBorderWidth: 2
    }]
  }

  // Trading volume by asset
  const assetVolumeData = {
    labels: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'ADA/USD', 'DOT/USD'],
    datasets: [{
      label: 'Volume ($)',
      data: [75420, 42680, 18500, 12450, 7370],
      backgroundColor: [
        '#26a69a',
        '#4a9eff',
        '#ffa726',
        '#ef5350',
        '#787b86'
      ],
      borderColor: '#0d0e14',
      borderWidth: 2
    }]
  }

  // Win/Loss distribution
  const winLossData = {
    labels: ['Winning Trades', 'Losing Trades'],
    datasets: [{
      data: [metrics.winningTrades, metrics.losingTrades],
      backgroundColor: ['#26a69a', '#ef5350'],
      borderColor: '#0d0e14',
      borderWidth: 2
    }]
  }

  // Strategy performance
  const strategyPerformanceData = {
    labels: ['Momentum', 'Mean Reversion', 'Breakout', 'Scalping', 'Arbitrage'],
    datasets: [{
      label: 'P&L ($)',
      data: [1850, -320, 1200, 450, -895],
      backgroundColor: (ctx: any) => {
        const value = ctx.parsed.y
        return value >= 0 ? '#26a69a' : '#ef5350'
      },
      borderColor: '#0d0e14',
      borderWidth: 1
    }]
  }

  // Export functions
  const exportToPDF = useCallback(async () => {
    setIsExporting(true)
    // Simulate PDF generation
    await new Promise(resolve => setTimeout(resolve, 2000))
    console.log('Exporting to PDF...')
    setIsExporting(false)
  }, [])

  const exportToCSV = useCallback(() => {
    const csvContent = [
      'ID,Symbol,Side,Price,Size,Fee,PnL,Timestamp,Strategy',
      ...trades.map(trade => 
        `${trade.id},${trade.symbol},${trade.side},${trade.price},${trade.size},${trade.fee},${trade.pnl},${trade.timestamp.toISOString()},${trade.strategy || ''}`
      )
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trading-report-${dateRange}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }, [trades, dateRange])

  const generateTaxReport = useCallback(async () => {
    setIsExporting(true)
    // Simulate tax report generation
    await new Promise(resolve => setTimeout(resolve, 1500))
    console.log('Generating tax report...')
    setIsExporting(false)
  }, [])

  return (
    <div style={{
      backgroundColor: '#0d0e14',
      color: '#d1d4dc',
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        paddingLeft: '16px',
        paddingRight: '32px',
        paddingTop: '32px',
        paddingBottom: '32px',
        borderBottom: '1px solid #2a2e39',
        backgroundColor: '#1e222d',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '600',
              margin: 0,
              marginBottom: '8px',
            }}>
              Analytics & Reports
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#787b86',
              margin: 0,
            }}>
              Comprehensive trading performance analysis and reporting
            </p>
          </div>

          {/* Export Controls */}
          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
          }}>
            {/* Date Range Selector */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              style={{
                backgroundColor: '#1e222d',
                color: '#d1d4dc',
                border: '1px solid #2a2e39',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="ytd">Year to Date</option>
              <option value="all">All Time</option>
            </select>

            {/* Export Buttons */}
            <button
              onClick={exportToCSV}
              style={{
                backgroundColor: '#1e222d',
                color: '#d1d4dc',
                border: '1px solid #2a2e39',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Export CSV
            </button>

            <button
              onClick={exportToPDF}
              disabled={isExporting}
              style={{
                backgroundColor: '#4a9eff',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isExporting ? 'not-allowed' : 'pointer',
                opacity: isExporting ? 0.6 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              {isExporting ? 'Generating...' : 'Export PDF'}
            </button>

            <button
              onClick={generateTaxReport}
              disabled={isExporting}
              style={{
                backgroundColor: '#ffa726',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isExporting ? 'not-allowed' : 'pointer',
                opacity: isExporting ? 0.6 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              Tax Report
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        paddingLeft: '16px',
        paddingRight: '32px',
        paddingTop: '32px',
        paddingBottom: '32px',
      }}>
        {/* Performance Overview */}
        <section style={{ marginBottom: '64px' }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '32px',
            color: '#d1d4dc',
          }}>
            Performance Overview
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '32px',
            marginBottom: '32px',
          }}>
            {/* Total P&L */}
            <div style={{
              backgroundColor: '#1e222d',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #2a2e39',
            }}>
              <div style={{
                fontSize: '12px',
                color: '#787b86',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Total P&L
              </div>
              <div style={{
                fontSize: '28px',
                fontWeight: '600',
                fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
                color: metrics.totalPnL >= 0 ? '#26a69a' : '#ef5350',
                lineHeight: '1.2',
              }}>
                {metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL.toLocaleString()}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#787b86',
                marginTop: '8px',
              }}>
                {((metrics.totalPnL / 100000) * 100).toFixed(2)}% portfolio return
              </div>
            </div>

            {/* Win Rate */}
            <div style={{
              backgroundColor: '#1e222d',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #2a2e39',
            }}>
              <div style={{
                fontSize: '12px',
                color: '#787b86',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Win Rate
              </div>
              <div style={{
                fontSize: '28px',
                fontWeight: '600',
                fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
                color: '#26a69a',
                lineHeight: '1.2',
              }}>
                {(metrics.winRate * 100).toFixed(1)}%
              </div>
              <div style={{
                fontSize: '12px',
                color: '#787b86',
                marginTop: '8px',
              }}>
                {metrics.winningTrades} of {metrics.totalTrades} trades
              </div>
            </div>

            {/* Average Trade Duration */}
            <div style={{
              backgroundColor: '#1e222d',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #2a2e39',
            }}>
              <div style={{
                fontSize: '12px',
                color: '#787b86',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Avg Duration
              </div>
              <div style={{
                fontSize: '28px',
                fontWeight: '600',
                fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
                color: '#d1d4dc',
                lineHeight: '1.2',
              }}>
                {metrics.avgTradeDuration.toFixed(1)}h
              </div>
              <div style={{
                fontSize: '12px',
                color: '#787b86',
                marginTop: '8px',
              }}>
                Average hold time
              </div>
            </div>

            {/* Sharpe Ratio */}
            <div style={{
              backgroundColor: '#1e222d',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #2a2e39',
            }}>
              <div style={{
                fontSize: '12px',
                color: '#787b86',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Sharpe Ratio
              </div>
              <div style={{
                fontSize: '28px',
                fontWeight: '600',
                fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
                color: metrics.sharpeRatio >= 1 ? '#26a69a' : '#ffa726',
                lineHeight: '1.2',
              }}>
                {metrics.sharpeRatio.toFixed(2)}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#787b86',
                marginTop: '8px',
              }}>
                Risk-adjusted return
              </div>
            </div>
          </div>

          {/* P&L Chart */}
          <div style={{
            backgroundColor: '#1e222d',
            borderRadius: '8px',
            padding: '24px',
            border: '1px solid #2a2e39',
            height: '400px',
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#d1d4dc',
            }}>
              Cumulative P&L Over Time
            </h3>
            <div style={{ height: 'calc(100% - 60px)' }}>
              <Line data={pnlChartData} options={chartOptions} />
            </div>
          </div>
        </section>

        {/* Trading Statistics */}
        <section style={{ marginBottom: '64px' }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '32px',
            color: '#d1d4dc',
          }}>
            Trading Statistics
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '32px',
            marginBottom: '32px',
          }}>
            {/* Volume by Asset */}
            <div style={{
              backgroundColor: '#1e222d',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #2a2e39',
              height: '350px',
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '16px',
                color: '#d1d4dc',
              }}>
                Volume by Asset
              </h3>
              <div style={{ height: 'calc(100% - 60px)' }}>
                <Doughnut data={assetVolumeData} options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      ...chartOptions.plugins.legend,
                      position: 'bottom' as const,
                    }
                  }
                }} />
              </div>
            </div>

            {/* Win/Loss Distribution */}
            <div style={{
              backgroundColor: '#1e222d',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #2a2e39',
              height: '350px',
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '16px',
                color: '#d1d4dc',
              }}>
                Win/Loss Distribution
              </h3>
              <div style={{ height: 'calc(100% - 60px)' }}>
                <Doughnut data={winLossData} options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      ...chartOptions.plugins.legend,
                      position: 'bottom' as const,
                    }
                  }
                }} />
              </div>
            </div>

            {/* Additional Metrics */}
            <div style={{
              backgroundColor: '#1e222d',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #2a2e39',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#d1d4dc',
              }}>
                Key Statistics
              </h3>

              {[
                { label: 'Total Trades', value: metrics.totalTrades, suffix: '' },
                { label: 'Total Volume', value: `$${(metrics.totalVolume / 1000).toFixed(0)}K`, suffix: '' },
                { label: 'Largest Win', value: `$${metrics.largestWin}`, suffix: '', color: '#26a69a' },
                { label: 'Largest Loss', value: `$${metrics.largestLoss}`, suffix: '', color: '#ef5350' },
                { label: 'Profit Factor', value: metrics.profitFactor.toFixed(2), suffix: '' },
                { label: 'Max Drawdown', value: `$${metrics.maxDrawdown}`, suffix: '', color: '#ef5350' },
              ].map((stat, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: index < 5 ? '1px solid #2a2e39' : 'none',
                }}>
                  <span style={{
                    fontSize: '14px',
                    color: '#787b86',
                  }}>
                    {stat.label}
                  </span>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
                    color: stat.color || '#d1d4dc',
                  }}>
                    {stat.value}{stat.suffix}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Strategy Performance */}
        <section style={{ marginBottom: '64px' }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '32px',
            color: '#d1d4dc',
          }}>
            Strategy Performance Comparison
          </h2>

          <div style={{
            backgroundColor: '#1e222d',
            borderRadius: '8px',
            padding: '24px',
            border: '1px solid #2a2e39',
            height: '400px',
          }}>
            <div style={{ height: '100%' }}>
              <Bar data={strategyPerformanceData} options={chartOptions} />
            </div>
          </div>
        </section>

        {/* Detailed Trade History */}
        <section>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#d1d4dc',
              margin: 0,
            }}>
              Trade History
            </h2>

            <div style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
            }}>
              {/* Asset Filter */}
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
                style={{
                  backgroundColor: '#1e222d',
                  color: '#d1d4dc',
                  border: '1px solid #2a2e39',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Assets</option>
                <option value="BTC/USD">BTC/USD</option>
                <option value="ETH/USD">ETH/USD</option>
                <option value="SOL/USD">SOL/USD</option>
              </select>

              {/* Strategy Filter */}
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
                style={{
                  backgroundColor: '#1e222d',
                  color: '#d1d4dc',
                  border: '1px solid #2a2e39',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Strategies</option>
                <option value="Momentum">Momentum</option>
                <option value="Mean Reversion">Mean Reversion</option>
                <option value="Breakout">Breakout</option>
                <option value="Scalping">Scalping</option>
              </select>
            </div>
          </div>

          {/* Trade Table */}
          <div style={{
            backgroundColor: '#1e222d',
            borderRadius: '8px',
            border: '1px solid #2a2e39',
            overflow: 'hidden',
          }}>
            <div style={{
              overflowX: 'auto',
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: '#0d0e14',
                  }}>
                    {['Symbol', 'Side', 'Price', 'Size', 'Fee', 'P&L', 'Strategy', 'Date'].map((header) => (
                      <th key={header} style={{
                        padding: '16px 24px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#787b86',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderBottom: '1px solid #2a2e39',
                      }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades
                    .filter(trade => selectedAsset === 'all' || trade.symbol === selectedAsset)
                    .filter(trade => selectedStrategy === 'all' || trade.strategy === selectedStrategy)
                    .map((trade) => (
                    <tr key={trade.id} style={{
                      borderBottom: '1px solid #2a2e39',
                      transition: 'background-color 0.2s ease',
                    }}>
                      <td style={{
                        padding: '16px 24px',
                        fontSize: '16px',
                        fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
                        color: '#d1d4dc',
                      }}>
                        {trade.symbol}
                      </td>
                      <td style={{
                        padding: '16px 24px',
                        fontSize: '16px',
                        fontWeight: '500',
                        color: trade.side === 'buy' ? '#26a69a' : '#ef5350',
                      }}>
                        {trade.side.toUpperCase()}
                      </td>
                      <td style={{
                        padding: '16px 24px',
                        fontSize: '16px',
                        fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
                        color: '#d1d4dc',
                      }}>
                        ${trade.price.toLocaleString()}
                      </td>
                      <td style={{
                        padding: '16px 24px',
                        fontSize: '16px',
                        fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
                        color: '#d1d4dc',
                      }}>
                        {trade.size}
                      </td>
                      <td style={{
                        padding: '16px 24px',
                        fontSize: '16px',
                        fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
                        color: '#787b86',
                      }}>
                        ${trade.fee.toFixed(2)}
                      </td>
                      <td style={{
                        padding: '16px 24px',
                        fontSize: '16px',
                        fontWeight: '500',
                        fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
                        color: trade.pnl >= 0 ? '#26a69a' : '#ef5350',
                      }}>
                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toLocaleString()}
                      </td>
                      <td style={{
                        padding: '16px 24px',
                        fontSize: '16px',
                        color: '#787b86',
                      }}>
                        {trade.strategy || '-'}
                      </td>
                      <td style={{
                        padding: '16px 24px',
                        fontSize: '14px',
                        fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
                        color: '#787b86',
                      }}>
                        {trade.timestamp.toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}