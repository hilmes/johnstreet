'use client'

import React, { useState, useMemo } from 'react'
import { dieterRamsDesign as ds, designHelpers } from '@/lib/design/DieterRamsDesignSystem'

// Types
interface Position {
  asset: string
  amount: number
  avgEntryPrice: number
  currentPrice: number
  value: number
  pnl: number
  pnlPercent: number
  allocation: number
  risk: number
}

interface PerformanceMetric {
  period: string
  return: number
  volatility: number
  sharpe: number
  maxDrawdown: number
  winRate: number
}

interface RiskMetric {
  name: string
  value: number
  status: 'good' | 'warning' | 'danger'
  threshold: number
}

interface AllocationSector {
  name: string
  value: number
  target: number
  deviation: number
}

// Portfolio Analytics Page Component
export default function PortfolioAnalyticsPage() {
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M')
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview')

  // Mock portfolio data
  const portfolioValue = 125430.50
  const totalPnL = 25430.50
  const totalPnLPercent = 25.43

  const positions: Position[] = [
    {
      asset: 'BTC',
      amount: 1.5,
      avgEntryPrice: 45000,
      currentPrice: 69400,
      value: 104100,
      pnl: 36600,
      pnlPercent: 54.22,
      allocation: 82.9,
      risk: 0.65,
    },
    {
      asset: 'ETH',
      amount: 5.2,
      avgEntryPrice: 2500,
      currentPrice: 3485,
      value: 18122,
      pnl: 5122,
      pnlPercent: 39.40,
      allocation: 14.4,
      risk: 0.72,
    },
    {
      asset: 'SOL',
      amount: 25,
      avgEntryPrice: 95,
      currentPrice: 128.32,
      value: 3208,
      pnl: 833,
      pnlPercent: 35.07,
      allocation: 2.6,
      risk: 0.85,
    },
  ]

  const performanceMetrics: PerformanceMetric[] = [
    { period: '24h', return: 2.5, volatility: 12.3, sharpe: 1.8, maxDrawdown: -3.2, winRate: 65 },
    { period: '7d', return: 8.2, volatility: 18.5, sharpe: 2.1, maxDrawdown: -5.8, winRate: 71 },
    { period: '30d', return: 25.4, volatility: 22.1, sharpe: 2.5, maxDrawdown: -8.3, winRate: 68 },
    { period: '90d', return: 45.2, volatility: 28.5, sharpe: 2.2, maxDrawdown: -12.5, winRate: 66 },
    { period: '1y', return: 125.8, volatility: 35.2, sharpe: 2.8, maxDrawdown: -18.2, winRate: 72 },
  ]

  const riskMetrics: RiskMetric[] = [
    { name: 'Portfolio Beta', value: 1.15, status: 'warning', threshold: 1.0 },
    { name: 'Value at Risk (95%)', value: 8.5, status: 'good', threshold: 10 },
    { name: 'Correlation Risk', value: 0.82, status: 'warning', threshold: 0.75 },
    { name: 'Concentration Risk', value: 82.9, status: 'danger', threshold: 50 },
    { name: 'Liquidity Risk', value: 0.15, status: 'good', threshold: 0.3 },
  ]

  const allocationSectors: AllocationSector[] = [
    { name: 'Layer 1', value: 97.3, target: 70, deviation: 27.3 },
    { name: 'DeFi', value: 0, target: 15, deviation: -15 },
    { name: 'Layer 2', value: 2.6, target: 10, deviation: -7.4 },
    { name: 'Stablecoins', value: 0, target: 5, deviation: -5 },
  ]

  // Calculate portfolio metrics
  const portfolioMetrics = useMemo(() => {
    const avgVolatility = performanceMetrics.find(m => m.period === '30d')?.volatility || 0
    const sharpeRatio = performanceMetrics.find(m => m.period === '30d')?.sharpe || 0
    const maxDrawdown = Math.min(...performanceMetrics.map(m => m.maxDrawdown))
    
    return {
      avgVolatility,
      sharpeRatio,
      maxDrawdown,
      diversificationScore: 100 - (positions[0]?.allocation || 0),
    }
  }, [performanceMetrics, positions])

  // Helper functions
  const getRiskColor = (status: string) => {
    switch (status) {
      case 'good': return ds.colors.semantic.success
      case 'warning': return ds.colors.semantic.warning
      case 'danger': return ds.colors.semantic.error
      default: return ds.colors.semantic.neutral
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
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
              Portfolio Analytics
            </h1>
            <p style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              margin: 0,
            }}>
              Comprehensive portfolio performance and risk analysis
            </p>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: ds.spacing.medium }}>
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

            {/* View Mode Toggle */}
            <button
              onClick={() => setViewMode(viewMode === 'overview' ? 'detailed' : 'overview')}
              style={{
                padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                backgroundColor: ds.colors.semantic.background.tertiary,
                color: ds.colors.grayscale[90],
                border: `1px solid ${ds.colors.grayscale[30]}`,
                borderRadius: ds.interactive.radius.medium,
                fontSize: ds.typography.scale.small,
                fontWeight: ds.typography.weights.medium,
                cursor: 'pointer',
                transition: designHelpers.animate('all', ds.animation.durations.fast),
              }}
            >
              {viewMode === 'overview' ? 'Detailed View' : 'Overview'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: ds.grid.maxWidth,
        margin: '0 auto',
        padding: ds.spacing.large,
      }}>
        {/* Portfolio Summary */}
        <section style={{ marginBottom: ds.spacing.xxlarge }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: ds.spacing.large,
          }}>
            {/* Total Value */}
            <div style={{
              backgroundColor: ds.colors.semantic.background.secondary,
              borderRadius: ds.interactive.radius.medium,
              padding: ds.spacing.large,
              border: `1px solid ${ds.colors.grayscale[20]}`,
            }}>
              <div style={{
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.small,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Total Portfolio Value
              </div>
              <div style={{
                fontSize: ds.typography.scale.xlarge,
                fontWeight: ds.typography.weights.semibold,
                fontFamily: ds.typography.families.data,
              }}>
                {formatCurrency(portfolioValue)}
              </div>
              <div style={{
                fontSize: ds.typography.scale.small,
                color: totalPnL >= 0 ? ds.colors.semantic.buy : ds.colors.semantic.sell,
                marginTop: ds.spacing.mini,
              }}>
                {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)} ({totalPnLPercent.toFixed(2)}%)
              </div>
            </div>

            {/* Sharpe Ratio */}
            <div style={{
              backgroundColor: ds.colors.semantic.background.secondary,
              borderRadius: ds.interactive.radius.medium,
              padding: ds.spacing.large,
              border: `1px solid ${ds.colors.grayscale[20]}`,
            }}>
              <div style={{
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.small,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Sharpe Ratio (30d)
              </div>
              <div style={{
                fontSize: ds.typography.scale.xlarge,
                fontWeight: ds.typography.weights.semibold,
                fontFamily: ds.typography.families.data,
                color: portfolioMetrics.sharpeRatio > 2 ? ds.colors.semantic.success :
                       portfolioMetrics.sharpeRatio > 1 ? ds.colors.semantic.info :
                       ds.colors.semantic.warning,
              }}>
                {portfolioMetrics.sharpeRatio.toFixed(2)}
              </div>
              <div style={{
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginTop: ds.spacing.mini,
              }}>
                Risk-adjusted returns
              </div>
            </div>

            {/* Volatility */}
            <div style={{
              backgroundColor: ds.colors.semantic.background.secondary,
              borderRadius: ds.interactive.radius.medium,
              padding: ds.spacing.large,
              border: `1px solid ${ds.colors.grayscale[20]}`,
            }}>
              <div style={{
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.small,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Volatility (30d)
              </div>
              <div style={{
                fontSize: ds.typography.scale.xlarge,
                fontWeight: ds.typography.weights.semibold,
                fontFamily: ds.typography.families.data,
              }}>
                {portfolioMetrics.avgVolatility.toFixed(1)}%
              </div>
              <div style={{
                width: '100%',
                height: '4px',
                backgroundColor: ds.colors.grayscale[20],
                borderRadius: ds.interactive.radius.pill,
                marginTop: ds.spacing.small,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${Math.min(portfolioMetrics.avgVolatility * 2, 100)}%`,
                  height: '100%',
                  backgroundColor: portfolioMetrics.avgVolatility > 30 ? ds.colors.semantic.warning :
                                   portfolioMetrics.avgVolatility > 20 ? ds.colors.semantic.info :
                                   ds.colors.semantic.success,
                  transition: designHelpers.animate('width'),
                }} />
              </div>
            </div>

            {/* Max Drawdown */}
            <div style={{
              backgroundColor: ds.colors.semantic.background.secondary,
              borderRadius: ds.interactive.radius.medium,
              padding: ds.spacing.large,
              border: `1px solid ${ds.colors.grayscale[20]}`,
            }}>
              <div style={{
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.small,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Max Drawdown
              </div>
              <div style={{
                fontSize: ds.typography.scale.xlarge,
                fontWeight: ds.typography.weights.semibold,
                fontFamily: ds.typography.families.data,
                color: ds.colors.semantic.sell,
              }}>
                {portfolioMetrics.maxDrawdown.toFixed(1)}%
              </div>
              <div style={{
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginTop: ds.spacing.mini,
              }}>
                Worst peak-to-trough
              </div>
            </div>
          </div>
        </section>

        {/* Current Positions */}
        <section style={{ marginBottom: ds.spacing.xxlarge }}>
          <h2 style={{
            fontSize: ds.typography.scale.large,
            fontWeight: ds.typography.weights.semibold,
            marginBottom: ds.spacing.large,
          }}>
            Current Positions
          </h2>

          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            overflow: 'hidden',
          }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr 120px 120px 120px 100px 80px',
              gap: ds.spacing.medium,
              padding: ds.spacing.medium,
              backgroundColor: ds.colors.semantic.background.tertiary,
              fontSize: ds.typography.scale.small,
              fontWeight: ds.typography.weights.medium,
              color: ds.colors.grayscale[70],
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <div>Asset</div>
              <div>Amount</div>
              <div style={{ textAlign: 'right' }}>Entry Price</div>
              <div style={{ textAlign: 'right' }}>Current</div>
              <div style={{ textAlign: 'right' }}>Value</div>
              <div style={{ textAlign: 'right' }}>P&L</div>
              <div style={{ textAlign: 'right' }}>Alloc</div>
            </div>

            {/* Table Body */}
            {positions.map((position, index) => (
              <div
                key={position.asset}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr 120px 120px 120px 100px 80px',
                  gap: ds.spacing.medium,
                  padding: ds.spacing.medium,
                  borderBottom: index < positions.length - 1 ? `1px solid ${ds.colors.grayscale[20]}` : 'none',
                  alignItems: 'center',
                }}
              >
                <div style={{
                  fontWeight: ds.typography.weights.medium,
                  fontFamily: ds.typography.families.data,
                }}>
                  {position.asset}
                </div>
                
                <div style={{
                  fontFamily: ds.typography.families.data,
                  fontSize: ds.typography.scale.small,
                }}>
                  {position.amount}
                </div>
                
                <div style={{
                  textAlign: 'right',
                  fontFamily: ds.typography.families.data,
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                }}>
                  {formatCurrency(position.avgEntryPrice)}
                </div>
                
                <div style={{
                  textAlign: 'right',
                  fontFamily: ds.typography.families.data,
                  fontSize: ds.typography.scale.small,
                }}>
                  {formatCurrency(position.currentPrice)}
                </div>
                
                <div style={{
                  textAlign: 'right',
                  fontFamily: ds.typography.families.data,
                  fontSize: ds.typography.scale.small,
                  fontWeight: ds.typography.weights.medium,
                }}>
                  {formatCurrency(position.value)}
                </div>
                
                <div style={{
                  textAlign: 'right',
                  fontFamily: ds.typography.families.data,
                  fontSize: ds.typography.scale.small,
                  color: position.pnl >= 0 ? ds.colors.semantic.buy : ds.colors.semantic.sell,
                  fontWeight: ds.typography.weights.medium,
                }}>
                  {position.pnl >= 0 ? '+' : ''}{position.pnlPercent.toFixed(1)}%
                </div>
                
                <div style={{
                  textAlign: 'right',
                  fontSize: ds.typography.scale.small,
                }}>
                  <div style={{
                    display: 'inline-block',
                    padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                    backgroundColor: position.allocation > 50 ? 
                      `${ds.colors.semantic.warning}20` : 
                      `${ds.colors.semantic.info}20`,
                    color: position.allocation > 50 ? 
                      ds.colors.semantic.warning : 
                      ds.colors.semantic.info,
                    borderRadius: ds.interactive.radius.small,
                    fontFamily: ds.typography.families.data,
                  }}>
                    {position.allocation.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Performance Metrics */}
        {viewMode === 'detailed' && (
          <section style={{ marginBottom: ds.spacing.xxlarge }}>
            <h2 style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.large,
            }}>
              Performance Metrics
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: ds.spacing.medium,
            }}>
              {performanceMetrics.map((metric, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: ds.colors.semantic.background.secondary,
                    borderRadius: ds.interactive.radius.medium,
                    padding: ds.spacing.large,
                    border: `1px solid ${ds.colors.grayscale[20]}`,
                  }}
                >
                  <div style={{
                    fontSize: ds.typography.scale.base,
                    fontWeight: ds.typography.weights.medium,
                    marginBottom: ds.spacing.medium,
                    textTransform: 'uppercase',
                  }}>
                    {metric.period}
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: ds.spacing.medium,
                  }}>
                    <div>
                      <div style={{
                        fontSize: ds.typography.scale.mini,
                        color: ds.colors.grayscale[70],
                        marginBottom: ds.spacing.micro,
                      }}>
                        Return
                      </div>
                      <div style={{
                        fontSize: ds.typography.scale.medium,
                        fontWeight: ds.typography.weights.semibold,
                        fontFamily: ds.typography.families.data,
                        color: metric.return >= 0 ? ds.colors.semantic.buy : ds.colors.semantic.sell,
                      }}>
                        {metric.return >= 0 ? '+' : ''}{metric.return}%
                      </div>
                    </div>
                    
                    <div>
                      <div style={{
                        fontSize: ds.typography.scale.mini,
                        color: ds.colors.grayscale[70],
                        marginBottom: ds.spacing.micro,
                      }}>
                        Volatility
                      </div>
                      <div style={{
                        fontSize: ds.typography.scale.medium,
                        fontWeight: ds.typography.weights.semibold,
                        fontFamily: ds.typography.families.data,
                      }}>
                        {metric.volatility}%
                      </div>
                    </div>
                    
                    <div>
                      <div style={{
                        fontSize: ds.typography.scale.mini,
                        color: ds.colors.grayscale[70],
                        marginBottom: ds.spacing.micro,
                      }}>
                        Sharpe
                      </div>
                      <div style={{
                        fontSize: ds.typography.scale.medium,
                        fontWeight: ds.typography.weights.semibold,
                        fontFamily: ds.typography.families.data,
                      }}>
                        {metric.sharpe}
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
                        {metric.winRate}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Risk Analysis */}
        <section style={{ marginBottom: ds.spacing.xxlarge }}>
          <h2 style={{
            fontSize: ds.typography.scale.large,
            fontWeight: ds.typography.weights.semibold,
            marginBottom: ds.spacing.large,
          }}>
            Risk Analysis
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: ds.spacing.medium,
          }}>
            {riskMetrics.map((metric, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: ds.colors.semantic.background.secondary,
                  borderRadius: ds.interactive.radius.medium,
                  padding: ds.spacing.medium,
                  border: `1px solid ${ds.colors.grayscale[20]}`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: ds.spacing.small,
                }}>
                  <div style={{
                    fontSize: ds.typography.scale.small,
                    color: ds.colors.grayscale[70],
                  }}>
                    {metric.name}
                  </div>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: getRiskColor(metric.status),
                  }} />
                </div>
                
                <div style={{
                  fontSize: ds.typography.scale.large,
                  fontWeight: ds.typography.weights.semibold,
                  fontFamily: ds.typography.families.data,
                  marginBottom: ds.spacing.small,
                }}>
                  {metric.name.includes('%') ? `${metric.value}%` : metric.value.toFixed(2)}
                </div>
                
                <div style={{
                  fontSize: ds.typography.scale.mini,
                  color: ds.colors.grayscale[70],
                }}>
                  Threshold: {metric.threshold}
                </div>
                
                {/* Progress bar */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  backgroundColor: ds.colors.grayscale[10],
                }}>
                  <div style={{
                    width: `${(metric.value / metric.threshold) * 100}%`,
                    maxWidth: '100%',
                    height: '100%',
                    backgroundColor: getRiskColor(metric.status),
                    opacity: 0.8,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Allocation Analysis */}
        {viewMode === 'detailed' && (
          <section>
            <h2 style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.large,
            }}>
              Sector Allocation
            </h2>

            <div style={{
              backgroundColor: ds.colors.semantic.background.secondary,
              borderRadius: ds.interactive.radius.medium,
              padding: ds.spacing.large,
            }}>
              {allocationSectors.map((sector, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: index < allocationSectors.length - 1 ? ds.spacing.large : 0,
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: ds.spacing.small,
                  }}>
                    <div style={{
                      fontSize: ds.typography.scale.base,
                      fontWeight: ds.typography.weights.medium,
                    }}>
                      {sector.name}
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: ds.spacing.medium,
                      alignItems: 'center',
                      fontSize: ds.typography.scale.small,
                    }}>
                      <span style={{ color: ds.colors.grayscale[70] }}>
                        Target: {sector.target}%
                      </span>
                      <span style={{
                        fontWeight: ds.typography.weights.medium,
                        color: Math.abs(sector.deviation) > 10 ? ds.colors.semantic.warning : ds.colors.semantic.success,
                      }}>
                        Current: {sector.value}%
                      </span>
                      <span style={{
                        color: sector.deviation >= 0 ? ds.colors.semantic.info : ds.colors.semantic.warning,
                      }}>
                        ({sector.deviation >= 0 ? '+' : ''}{sector.deviation}%)
                      </span>
                    </div>
                  </div>
                  
                  <div style={{
                    position: 'relative',
                    height: '8px',
                    backgroundColor: ds.colors.grayscale[20],
                    borderRadius: ds.interactive.radius.pill,
                    overflow: 'hidden',
                  }}>
                    {/* Target indicator */}
                    <div style={{
                      position: 'absolute',
                      left: `${sector.target}%`,
                      top: '-2px',
                      bottom: '-2px',
                      width: '2px',
                      backgroundColor: ds.colors.grayscale[50],
                      zIndex: 2,
                    }} />
                    
                    {/* Actual value */}
                    <div style={{
                      width: `${sector.value}%`,
                      height: '100%',
                      backgroundColor: Math.abs(sector.deviation) > 10 ? 
                        ds.colors.semantic.warning : 
                        ds.colors.semantic.success,
                      transition: designHelpers.animate('width'),
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}