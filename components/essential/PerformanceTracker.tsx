'use client'

import React, { useState, useMemo } from 'react'
import { ds } from '@/lib/design/TufteDesignSystem'

interface Position {
  id: string
  symbol: string
  side: 'long' | 'short'
  size: number
  avgPrice: number
  currentPrice: number
  unrealizedPnl: number
  change: number
}

interface PerformanceData {
  dailyPnL: number
  totalPortfolioValue: number
  openPositions: Position[]
  chartData: number[]
  stats: {
    winRate: number
    bestTrade: number
    worstTrade: number
    totalTrades: number
  }
}

interface PerformanceTrackerProps {
  data: PerformanceData
  onClosePosition?: (positionId: string) => Promise<void>
}

interface PerformanceState {
  isClosingPosition: string | null
  expandedView: boolean
}

export const PerformanceTracker: React.FC<PerformanceTrackerProps> = ({
  data,
  onClosePosition
}) => {
  const [state, setState] = useState<PerformanceState>({
    isClosingPosition: null,
    expandedView: false
  })

  // Calculate performance metrics
  const performanceColor = useMemo(() => {
    if (data.dailyPnL > 0) return ds.colors.semantic.profit
    if (data.dailyPnL < 0) return ds.colors.semantic.loss
    return ds.colors.neutral[500]
  }, [data.dailyPnL])

  const totalUnrealizedPnL = useMemo(() => {
    return data.openPositions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0)
  }, [data.openPositions])

  const handleClosePosition = async (positionId: string) => {
    if (!onClosePosition) return
    
    setState(prev => ({ ...prev, isClosingPosition: positionId }))
    try {
      await onClosePosition(positionId)
    } catch (error) {
      console.error('Failed to close position:', error)
    } finally {
      setState(prev => ({ ...prev, isClosingPosition: null }))
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const renderSparkline = () => {
    if (!data.chartData || data.chartData.length < 2) return null

    const width = 120
    const height = 40
    const padding = 4

    const min = Math.min(...data.chartData)
    const max = Math.max(...data.chartData)
    const range = max - min || 1

    const points = data.chartData.map((value, index) => {
      const x = padding + (index / (data.chartData.length - 1)) * (width - padding * 2)
      const y = padding + ((max - value) / range) * (height - padding * 2)
      return `${x},${y}`
    }).join(' ')

    const isPositiveTrend = data.chartData[data.chartData.length - 1] >= data.chartData[0]

    return (
      <svg width={width} height={height} style={{ display: 'block' }}>
        <polyline
          points={points}
          fill="none"
          stroke={isPositiveTrend ? ds.colors.semantic.profit : ds.colors.semantic.loss}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={points.split(' ').pop()?.split(',')[0] || 0}
          cy={points.split(' ').pop()?.split(',')[1] || 0}
          r="3"
          fill={isPositiveTrend ? ds.colors.semantic.profit : ds.colors.semantic.loss}
        />
      </svg>
    )
  }

  return (
    <div style={{
      backgroundColor: ds.colors.semantic.background,
      border: `1px solid ${ds.colors.semantic.border}`,
      borderRadius: ds.radius.lg,
      padding: ds.spacing.xl,
      minHeight: '280px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: ds.spacing.lg
      }}>
        <div style={{
          fontSize: ds.typography.scale.lg,
          fontWeight: ds.typography.weights.bold,
          color: ds.colors.semantic.text
        }}>
          Performance
        </div>
        
        <button
          onClick={() => setState(prev => ({ ...prev, expandedView: !prev.expandedView }))}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: ds.typography.scale.sm,
            color: ds.colors.neutral[600],
            cursor: 'pointer'
          }}
        >
          {state.expandedView ? 'Less' : 'More'}
        </button>
      </div>

      {/* Daily P&L */}
      <div style={{
        textAlign: 'center',
        marginBottom: ds.spacing.xl
      }}>
        <div style={{
          fontSize: ds.typography.scale.xxxl,
          fontWeight: ds.typography.weights.bold,
          color: performanceColor,
          fontFamily: ds.typography.families.data,
          marginBottom: ds.spacing.xs
        }}>
          {formatCurrency(data.dailyPnL)}
        </div>
        
        <div style={{
          fontSize: ds.typography.scale.sm,
          color: ds.colors.neutral[600],
          marginBottom: ds.spacing.md
        }}>
          Today's P&L
        </div>

        {/* Portfolio Value */}
        <div style={{
          fontSize: ds.typography.scale.base,
          fontFamily: ds.typography.families.data,
          color: ds.colors.semantic.text,
          marginBottom: ds.spacing.sm
        }}>
          {formatCurrency(data.totalPortfolioValue)}
        </div>
        
        <div style={{
          fontSize: ds.typography.scale.xs,
          color: ds.colors.neutral[600]
        }}>
          Total Portfolio Value
        </div>
      </div>

      {/* Chart */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: ds.spacing.lg
      }}>
        {renderSparkline()}
      </div>

      {/* Open Positions */}
      <div style={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: ds.spacing.md
        }}>
          <div style={{
            fontSize: ds.typography.scale.base,
            fontWeight: ds.typography.weights.semibold,
            color: ds.colors.semantic.text
          }}>
            Open Positions ({data.openPositions.length})
          </div>
          
          {totalUnrealizedPnL !== 0 && (
            <div style={{
              fontSize: ds.typography.scale.sm,
              fontFamily: ds.typography.families.data,
              color: totalUnrealizedPnL >= 0 ? ds.colors.semantic.profit : ds.colors.semantic.loss
            }}>
              {formatCurrency(totalUnrealizedPnL)}
            </div>
          )}
        </div>

        {data.openPositions.length === 0 ? (
          <div style={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: ds.colors.neutral[500],
            fontSize: ds.typography.scale.sm
          }}>
            No open positions
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: ds.spacing.sm,
            maxHeight: state.expandedView ? 'none' : '120px',
            overflowY: state.expandedView ? 'visible' : 'auto'
          }}>
            {data.openPositions.map((position) => (
              <div
                key={position.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: ds.spacing.sm,
                  backgroundColor: ds.colors.neutral[50],
                  borderRadius: ds.radius.sm,
                  border: `1px solid ${ds.colors.neutral[200]}`
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: ds.spacing.xs,
                    marginBottom: ds.spacing.xs
                  }}>
                    <span style={{
                      fontSize: ds.typography.scale.sm,
                      fontWeight: ds.typography.weights.semibold,
                      color: ds.colors.semantic.text
                    }}>
                      {position.symbol}
                    </span>
                    
                    <span style={{
                      fontSize: ds.typography.scale.xs,
                      backgroundColor: position.side === 'long' ? ds.colors.semantic.profit : ds.colors.semantic.loss,
                      color: ds.colors.semantic.background,
                      padding: `2px ${ds.spacing.xs}`,
                      borderRadius: ds.radius.xs
                    }}>
                      {position.side.toUpperCase()}
                    </span>
                  </div>
                  
                  <div style={{
                    fontSize: ds.typography.scale.xs,
                    color: ds.colors.neutral[600],
                    fontFamily: ds.typography.families.data
                  }}>
                    {position.size.toFixed(4)} @ {formatCurrency(position.avgPrice)}
                  </div>
                </div>

                <div style={{
                  textAlign: 'right',
                  marginRight: ds.spacing.sm
                }}>
                  <div style={{
                    fontSize: ds.typography.scale.sm,
                    fontFamily: ds.typography.families.data,
                    color: position.unrealizedPnl >= 0 ? ds.colors.semantic.profit : ds.colors.semantic.loss,
                    fontWeight: ds.typography.weights.semibold
                  }}>
                    {formatCurrency(position.unrealizedPnl)}
                  </div>
                  
                  <div style={{
                    fontSize: ds.typography.scale.xs,
                    color: position.change >= 0 ? ds.colors.semantic.profit : ds.colors.semantic.loss
                  }}>
                    {formatPercent(position.change)}
                  </div>
                </div>

                {onClosePosition && (
                  <button
                    onClick={() => handleClosePosition(position.id)}
                    disabled={state.isClosingPosition === position.id}
                    style={{
                      padding: `${ds.spacing.xs} ${ds.spacing.sm}`,
                      backgroundColor: 'transparent',
                      border: `1px solid ${ds.colors.neutral[300]}`,
                      borderRadius: ds.radius.xs,
                      fontSize: ds.typography.scale.xs,
                      color: ds.colors.neutral[600],
                      cursor: state.isClosingPosition === position.id ? 'not-allowed' : 'pointer',
                      opacity: state.isClosingPosition === position.id ? 0.5 : 1
                    }}
                  >
                    {state.isClosingPosition === position.id ? '...' : 'Close'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {state.expandedView && (
        <div style={{
          marginTop: ds.spacing.lg,
          paddingTop: ds.spacing.md,
          borderTop: `1px solid ${ds.colors.neutral[200]}`,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: ds.spacing.md,
          fontSize: ds.typography.scale.xs
        }}>
          <div>
            <div style={{ color: ds.colors.neutral[600] }}>Win Rate</div>
            <div style={{ 
              fontFamily: ds.typography.families.data,
              fontWeight: ds.typography.weights.semibold,
              color: ds.colors.semantic.text
            }}>
              {data.stats.winRate.toFixed(1)}%
            </div>
          </div>
          
          <div>
            <div style={{ color: ds.colors.neutral[600] }}>Total Trades</div>
            <div style={{ 
              fontFamily: ds.typography.families.data,
              fontWeight: ds.typography.weights.semibold,
              color: ds.colors.semantic.text
            }}>
              {data.stats.totalTrades}
            </div>
          </div>
          
          <div>
            <div style={{ color: ds.colors.neutral[600] }}>Best Trade</div>
            <div style={{ 
              fontFamily: ds.typography.families.data,
              fontWeight: ds.typography.weights.semibold,
              color: ds.colors.semantic.profit
            }}>
              {formatCurrency(data.stats.bestTrade)}
            </div>
          </div>
          
          <div>
            <div style={{ color: ds.colors.neutral[600] }}>Worst Trade</div>
            <div style={{ 
              fontFamily: ds.typography.families.data,
              fontWeight: ds.typography.weights.semibold,
              color: ds.colors.semantic.loss
            }}>
              {formatCurrency(data.stats.worstTrade)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PerformanceTracker