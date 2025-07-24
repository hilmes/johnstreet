'use client'

import React, { useState, useEffect } from 'react'
import { dieterRamsDesign as ds, designHelpers } from '@/lib/design/DieterRamsDesignSystem'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  Title,
  Tooltip,
  Legend,
  Filler
)

interface BacktestResult {
  config: any
  portfolio: any
  metrics: any
  equityCurve: Array<{ timestamp: string; value: number; drawdown: number }>
  trades: any[]
  strategyReturns: number[]
}

interface Strategy {
  name: string
  displayName: string
  description: string
  parameters: Record<string, any>
}

export default function BacktestingPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState('')
  const [strategyParameters, setStrategyParameters] = useState<Record<string, any>>({})
  const [backtestConfig, setBacktestConfig] = useState({
    symbols: ['BTC'],
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    initialCapital: 100000,
    commission: 0.001,
    slippage: 0.001,
    useAdvancedExecution: false,
    useSyntheticData: true
  })
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedParams, setExpandedParams] = useState(false)

  useEffect(() => {
    fetchStrategies()
  }, [])

  const fetchStrategies = async () => {
    try {
      const response = await fetch('/api/backtesting/run')
      const data = await response.json()
      setStrategies(data.strategies)
    } catch (error) {
      console.error('Failed to fetch strategies:', error)
    }
  }

  const handleStrategyChange = (strategyName: string) => {
    setSelectedStrategy(strategyName)
    const strategy = strategies.find(s => s.name === strategyName)
    if (strategy) {
      const defaultParams: Record<string, any> = {}
      Object.entries(strategy.parameters).forEach(([key, param]: [string, any]) => {
        defaultParams[key] = param.default
      })
      setStrategyParameters(defaultParams)
    }
  }

  const handleParameterChange = (paramName: string, value: any) => {
    setStrategyParameters(prev => ({
      ...prev,
      [paramName]: value
    }))
  }

  const runBacktest = async () => {
    if (!selectedStrategy) {
      setError('Please select a strategy')
      return
    }

    setIsRunning(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/backtesting/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          strategyName: selectedStrategy,
          strategyParameters,
          ...backtestConfig
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setResult(data.result)
      } else {
        setError(data.error || 'Backtest failed')
      }
    } catch (error) {
      setError('Failed to run backtest')
      console.error('Backtest error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const renderPerformanceMetrics = () => {
    if (!result) return null

    const metrics = result.metrics
    
    const metricsData = [
      {
        label: 'Total Return',
        value: `${(metrics.totalReturn * 100).toFixed(2)}%`,
        color: metrics.totalReturn >= 0 ? ds.colors.semantic.buy : ds.colors.semantic.sell,
        icon: '📈'
      },
      {
        label: 'Sharpe Ratio',
        value: metrics.sharpeRatio.toFixed(2),
        color: metrics.sharpeRatio > 1.5 ? ds.colors.semantic.success : 
               metrics.sharpeRatio > 0.5 ? ds.colors.semantic.warning :
               ds.colors.semantic.error,
        icon: '⚡'
      },
      {
        label: 'Max Drawdown',
        value: `${(metrics.maxDrawdown * 100).toFixed(2)}%`,
        color: ds.colors.semantic.sell,
        icon: '📉'
      },
      {
        label: 'Win Rate',
        value: `${(metrics.winRate * 100).toFixed(1)}%`,
        color: metrics.winRate > 0.5 ? ds.colors.semantic.success : ds.colors.semantic.warning,
        icon: '🎯'
      }
    ]
    
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: ds.spacing.medium,
        marginBottom: ds.spacing.xlarge,
      }}>
        {metricsData.map((metric, index) => (
          <div
            key={index}
            style={{
              backgroundColor: ds.colors.semantic.background.secondary,
              borderRadius: ds.interactive.radius.medium,
              padding: ds.spacing.large,
              border: `1px solid ${ds.colors.grayscale[20]}`,
              textAlign: 'center',
            }}
          >
            <div style={{
              fontSize: ds.typography.scale.xlarge,
              marginBottom: ds.spacing.small,
            }}>
              {metric.icon}
            </div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {metric.label}
            </div>
            <div style={{
              fontSize: ds.typography.scale.xlarge,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              color: metric.color,
            }}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderEquityCurve = () => {
    if (!result) return null

    const chartData = {
      labels: result.equityCurve.map(point => new Date(point.timestamp).toLocaleDateString()),
      datasets: [
        {
          label: 'Portfolio Value',
          data: result.equityCurve.map(point => point.value),
          borderColor: ds.colors.semantic.primary,
          backgroundColor: `${ds.colors.semantic.primary}20`,
          fill: true,
          tension: 0.1,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
        }
      ]
    }

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
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
          Equity Curve
        </h3>
        <div style={{ height: '400px' }}>
          <Line data={chartData} options={options} />
        </div>
      </div>
    )
  }

  const renderTradesTable = () => {
    if (!result || !result.trades.length) return null

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
          Trade History
        </h3>
        <div style={{ 
          maxHeight: '400px', 
          overflowY: 'auto',
          overflowX: 'auto',
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
                  borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                  position: 'sticky',
                  top: 0,
                  backgroundColor: ds.colors.semantic.background.tertiary,
                }}>
                  Date
                </th>
                <th style={{
                  padding: ds.spacing.medium,
                  textAlign: 'left',
                  fontWeight: ds.typography.weights.medium,
                  color: ds.colors.grayscale[70],
                  borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                  position: 'sticky',
                  top: 0,
                  backgroundColor: ds.colors.semantic.background.tertiary,
                }}>
                  Symbol
                </th>
                <th style={{
                  padding: ds.spacing.medium,
                  textAlign: 'left',
                  fontWeight: ds.typography.weights.medium,
                  color: ds.colors.grayscale[70],
                  borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                  position: 'sticky',
                  top: 0,
                  backgroundColor: ds.colors.semantic.background.tertiary,
                }}>
                  Side
                </th>
                <th style={{
                  padding: ds.spacing.medium,
                  textAlign: 'right',
                  fontWeight: ds.typography.weights.medium,
                  color: ds.colors.grayscale[70],
                  borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                  position: 'sticky',
                  top: 0,
                  backgroundColor: ds.colors.semantic.background.tertiary,
                }}>
                  Quantity
                </th>
                <th style={{
                  padding: ds.spacing.medium,
                  textAlign: 'right',
                  fontWeight: ds.typography.weights.medium,
                  color: ds.colors.grayscale[70],
                  borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                  position: 'sticky',
                  top: 0,
                  backgroundColor: ds.colors.semantic.background.tertiary,
                }}>
                  Price
                </th>
                <th style={{
                  padding: ds.spacing.medium,
                  textAlign: 'right',
                  fontWeight: ds.typography.weights.medium,
                  color: ds.colors.grayscale[70],
                  borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                  position: 'sticky',
                  top: 0,
                  backgroundColor: ds.colors.semantic.background.tertiary,
                }}>
                  Commission
                </th>
              </tr>
            </thead>
            <tbody>
              {result.trades.slice(-20).map((trade, index) => (
                <tr key={index}>
                  <td style={{
                    padding: ds.spacing.medium,
                    borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                    fontFamily: ds.typography.families.data,
                  }}>
                    {new Date(trade.timestamp).toLocaleDateString()}
                  </td>
                  <td style={{
                    padding: ds.spacing.medium,
                    borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                    fontFamily: ds.typography.families.data,
                    fontWeight: ds.typography.weights.medium,
                  }}>
                    {trade.symbol}
                  </td>
                  <td style={{
                    padding: ds.spacing.medium,
                    borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                  }}>
                    <span style={{
                      display: 'inline-block',
                      padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                      backgroundColor: trade.side === 'buy' ? 
                        `${ds.colors.semantic.buy}20` : 
                        `${ds.colors.semantic.sell}20`,
                      color: trade.side === 'buy' ? 
                        ds.colors.semantic.buy : 
                        ds.colors.semantic.sell,
                      borderRadius: ds.interactive.radius.small,
                      fontSize: ds.typography.scale.mini,
                      fontWeight: ds.typography.weights.medium,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {trade.side}
                    </span>
                  </td>
                  <td style={{
                    padding: ds.spacing.medium,
                    borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                    textAlign: 'right',
                    fontFamily: ds.typography.families.data,
                  }}>
                    {trade.quantity.toFixed(4)}
                  </td>
                  <td style={{
                    padding: ds.spacing.medium,
                    borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                    textAlign: 'right',
                    fontFamily: ds.typography.families.data,
                  }}>
                    ${trade.price.toFixed(2)}
                  </td>
                  <td style={{
                    padding: ds.spacing.medium,
                    borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                    textAlign: 'right',
                    fontFamily: ds.typography.families.data,
                    color: ds.colors.grayscale[70],
                  }}>
                    ${trade.commission.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              Strategy Backtesting
            </h1>
            <p style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              margin: 0,
            }}>
              Test your trading strategies on historical data
            </p>
          </div>

          <button
            onClick={runBacktest}
            disabled={isRunning || !selectedStrategy}
            style={{
              padding: `${ds.spacing.small} ${ds.spacing.large}`,
              backgroundColor: isRunning || !selectedStrategy ? 
                ds.colors.grayscale[30] : ds.colors.semantic.primary,
              color: isRunning || !selectedStrategy ? 
                ds.colors.grayscale[60] : ds.colors.grayscale[5],
              border: 'none',
              borderRadius: ds.interactive.radius.medium,
              fontSize: ds.typography.scale.small,
              fontWeight: ds.typography.weights.medium,
              cursor: isRunning || !selectedStrategy ? 'not-allowed' : 'pointer',
              transition: designHelpers.animate('all', ds.animation.durations.fast),
              display: 'flex',
              alignItems: 'center',
              gap: ds.spacing.small,
            }}
          >
            <span style={{ fontSize: ds.typography.scale.base }}>▶</span>
            {isRunning ? 'Running...' : 'Run Backtest'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: ds.grid.maxWidth,
        margin: '0 auto',
        padding: ds.spacing.large,
        display: 'grid',
        gridTemplateColumns: '350px 1fr',
        gap: ds.spacing.xlarge,
      }}>
        {/* Configuration Panel */}
        <div>
          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            border: `1px solid ${ds.colors.grayscale[20]}`,
            position: 'sticky',
            top: ds.spacing.large,
          }}>
            <h2 style={{
              fontSize: ds.typography.scale.medium,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.large,
            }}>
              Configuration
            </h2>

            {/* Strategy Selection */}
            <div style={{ marginBottom: ds.spacing.large }}>
              <label style={{
                display: 'block',
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.small,
              }}>
                Strategy
              </label>
              <select
                value={selectedStrategy}
                onChange={(e) => handleStrategyChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: ds.spacing.small,
                  backgroundColor: ds.colors.semantic.background.primary,
                  color: ds.colors.grayscale[90],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.small,
                  fontSize: ds.typography.scale.small,
                  cursor: 'pointer',
                }}
              >
                <option value="">Select a strategy</option>
                {strategies.map((strategy) => (
                  <option key={strategy.name} value={strategy.name}>
                    {strategy.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* Strategy Parameters */}
            {selectedStrategy && (
              <div style={{
                marginBottom: ds.spacing.large,
                padding: ds.spacing.medium,
                backgroundColor: ds.colors.semantic.background.tertiary,
                borderRadius: ds.interactive.radius.small,
                border: `1px solid ${ds.colors.grayscale[20]}`,
              }}>
                <button
                  onClick={() => setExpandedParams(!expandedParams)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 0,
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: ds.typography.scale.small,
                    fontWeight: ds.typography.weights.medium,
                    color: ds.colors.semantic.primary,
                  }}
                >
                  Strategy Parameters
                  <span style={{
                    transform: expandedParams ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: designHelpers.animate('transform', ds.animation.durations.fast),
                  }}>
                    ▼
                  </span>
                </button>
                {expandedParams && (
                  <div style={{ marginTop: ds.spacing.medium }}>
                    {Object.entries(strategies.find(s => s.name === selectedStrategy)?.parameters || {}).map(([key, param]: [string, any]) => (
                      <div key={key} style={{ marginBottom: ds.spacing.small }}>
                        <label style={{
                          display: 'block',
                          fontSize: ds.typography.scale.mini,
                          color: ds.colors.grayscale[70],
                          marginBottom: ds.spacing.mini,
                        }}>
                          {param.description || key}
                        </label>
                        <input
                          type={param.type === 'number' ? 'number' : 'text'}
                          value={strategyParameters[key] || param.default}
                          onChange={(e) => handleParameterChange(key, param.type === 'number' ? Number(e.target.value) : e.target.value)}
                          style={{
                            width: '100%',
                            padding: ds.spacing.mini,
                            backgroundColor: ds.colors.semantic.background.primary,
                            color: ds.colors.grayscale[90],
                            border: `1px solid ${ds.colors.grayscale[30]}`,
                            borderRadius: ds.interactive.radius.small,
                            fontSize: ds.typography.scale.small,
                            fontFamily: ds.typography.families.data,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Symbols */}
            <div style={{ marginBottom: ds.spacing.medium }}>
              <label style={{
                display: 'block',
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.small,
              }}>
                Symbols (comma-separated)
              </label>
              <input
                type="text"
                value={backtestConfig.symbols.join(', ')}
                onChange={(e) => setBacktestConfig(prev => ({ 
                  ...prev, 
                  symbols: e.target.value.split(',').map(s => s.trim()) 
                }))}
                style={{
                  width: '100%',
                  padding: ds.spacing.small,
                  backgroundColor: ds.colors.semantic.background.primary,
                  color: ds.colors.grayscale[90],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.small,
                  fontSize: ds.typography.scale.small,
                  fontFamily: ds.typography.families.data,
                }}
              />
            </div>

            {/* Date Range */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: ds.spacing.medium,
              marginBottom: ds.spacing.medium,
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                  marginBottom: ds.spacing.small,
                }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={backtestConfig.startDate}
                  onChange={(e) => setBacktestConfig(prev => ({ ...prev, startDate: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: ds.spacing.small,
                    backgroundColor: ds.colors.semantic.background.primary,
                    color: ds.colors.grayscale[90],
                    border: `1px solid ${ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.small,
                    fontSize: ds.typography.scale.small,
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                  marginBottom: ds.spacing.small,
                }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={backtestConfig.endDate}
                  onChange={(e) => setBacktestConfig(prev => ({ ...prev, endDate: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: ds.spacing.small,
                    backgroundColor: ds.colors.semantic.background.primary,
                    color: ds.colors.grayscale[90],
                    border: `1px solid ${ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.small,
                    fontSize: ds.typography.scale.small,
                  }}
                />
              </div>
            </div>

            {/* Initial Capital */}
            <div style={{ marginBottom: ds.spacing.medium }}>
              <label style={{
                display: 'block',
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.small,
              }}>
                Initial Capital
              </label>
              <input
                type="number"
                value={backtestConfig.initialCapital}
                onChange={(e) => setBacktestConfig(prev => ({ ...prev, initialCapital: Number(e.target.value) }))}
                style={{
                  width: '100%',
                  padding: ds.spacing.small,
                  backgroundColor: ds.colors.semantic.background.primary,
                  color: ds.colors.grayscale[90],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.small,
                  fontSize: ds.typography.scale.small,
                  fontFamily: ds.typography.families.data,
                }}
              />
            </div>

            {/* Commission & Slippage */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: ds.spacing.medium,
              marginBottom: ds.spacing.medium,
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                  marginBottom: ds.spacing.small,
                }}>
                  Commission
                </label>
                <input
                  type="number"
                  value={backtestConfig.commission}
                  onChange={(e) => setBacktestConfig(prev => ({ ...prev, commission: Number(e.target.value) }))}
                  step="0.0001"
                  style={{
                    width: '100%',
                    padding: ds.spacing.small,
                    backgroundColor: ds.colors.semantic.background.primary,
                    color: ds.colors.grayscale[90],
                    border: `1px solid ${ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.small,
                    fontSize: ds.typography.scale.small,
                    fontFamily: ds.typography.families.data,
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                  marginBottom: ds.spacing.small,
                }}>
                  Slippage
                </label>
                <input
                  type="number"
                  value={backtestConfig.slippage}
                  onChange={(e) => setBacktestConfig(prev => ({ ...prev, slippage: Number(e.target.value) }))}
                  step="0.0001"
                  style={{
                    width: '100%',
                    padding: ds.spacing.small,
                    backgroundColor: ds.colors.semantic.background.primary,
                    color: ds.colors.grayscale[90],
                    border: `1px solid ${ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.small,
                    fontSize: ds.typography.scale.small,
                    fontFamily: ds.typography.families.data,
                  }}
                />
              </div>
            </div>

            {/* Advanced Execution Toggle */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: ds.spacing.small,
              fontSize: ds.typography.scale.small,
              cursor: 'pointer',
              marginBottom: ds.spacing.large,
            }}>
              <input
                type="checkbox"
                checked={backtestConfig.useAdvancedExecution}
                onChange={(e) => setBacktestConfig(prev => ({ ...prev, useAdvancedExecution: e.target.checked }))}
                style={{ cursor: 'pointer' }}
              />
              Advanced Execution
            </label>

            {/* Run Button (Secondary) */}
            <button
              onClick={runBacktest}
              disabled={isRunning || !selectedStrategy}
              style={{
                width: '100%',
                padding: `${ds.spacing.medium} ${ds.spacing.large}`,
                backgroundColor: 'transparent',
                color: ds.colors.semantic.primary,
                border: `1px solid ${ds.colors.semantic.primary}`,
                borderRadius: ds.interactive.radius.medium,
                fontSize: ds.typography.scale.small,
                fontWeight: ds.typography.weights.medium,
                cursor: isRunning || !selectedStrategy ? 'not-allowed' : 'pointer',
                opacity: isRunning || !selectedStrategy ? 0.5 : 1,
                transition: designHelpers.animate('all', ds.animation.durations.fast),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: ds.spacing.small,
              }}
            >
              <span style={{ fontSize: ds.typography.scale.base }}>▶</span>
              {isRunning ? 'Running...' : 'Run Backtest'}
            </button>

            {isRunning && (
              <div style={{ marginTop: ds.spacing.medium }}>
                <div style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: ds.colors.grayscale[20],
                  borderRadius: ds.interactive.radius.pill,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: ds.colors.semantic.primary,
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                </div>
                <p style={{
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                  marginTop: ds.spacing.small,
                  margin: 0,
                }}>
                  Processing backtest...
                </p>
              </div>
            )}

            {error && (
              <div style={{
                marginTop: ds.spacing.medium,
                padding: ds.spacing.medium,
                backgroundColor: `${ds.colors.semantic.error}10`,
                border: `1px solid ${ds.colors.semantic.error}`,
                borderRadius: ds.interactive.radius.small,
              }}>
                <p style={{
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.semantic.error,
                  margin: 0,
                }}>
                  {error}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Results Panel */}
        <div>
          {result ? (
            <>
              {renderPerformanceMetrics()}
              {renderEquityCurve()}
              {renderTradesTable()}
            </>
          ) : (
            <div style={{
              backgroundColor: ds.colors.semantic.background.secondary,
              borderRadius: ds.interactive.radius.medium,
              padding: ds.spacing.xxlarge,
              border: `1px solid ${ds.colors.grayscale[20]}`,
              textAlign: 'center',
              minHeight: '300px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <p style={{
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[60],
                margin: 0,
              }}>
                Configure and run a backtest to see results
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Add pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            opacity: 0.3;
            transform: translateX(-100%);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.3;
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  )
}