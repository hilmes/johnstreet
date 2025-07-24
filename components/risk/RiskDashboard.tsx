'use client'

import React, { useState, useEffect } from 'react'
import { dieterRamsDesign as ds, designHelpers } from '@/lib/design/DieterRamsDesignSystem'

interface RiskMetrics {
  portfolioValue: number
  totalExposure: number
  leverage: number
  marginUsed: number
  availableMargin: number
  valueAtRisk: {
    daily95: number
    daily99: number
    weekly95: number
  }
  drawdown: {
    current: number
    maximum: number
    duration: number
  }
  sharpeRatio: number
  sortinoRatio: number
  beta: number
  correlation: {
    market: number
    btc: number
  }
  positionSizes: Array<{
    symbol: string
    exposure: number
    percentage: number
    risk: 'low' | 'medium' | 'high'
  }>
  riskLimits: {
    maxLeverage: number
    maxDrawdown: number
    maxPositionSize: number
    dailyLossLimit: number
  }
  volatilityMetrics: {
    portfolioVol: number
    realizedVol: number
    impliedVol: number
    volHistory: number[]
  }
}

const RiskGauge: React.FC<{
  value: number
  max: number
  label: string
  warningThreshold: number
  dangerThreshold: number
  unit?: string
}> = ({ value, max, label, warningThreshold, dangerThreshold, unit = '' }) => {
  const percentage = Math.min((value / max) * 100, 100)
  
  const getColor = () => {
    if (value >= dangerThreshold) return ds.colors.semantic.error
    if (value >= warningThreshold) return ds.colors.semantic.warning
    return ds.colors.semantic.success
  }

  const color = getColor()
  
  return (
    <div style={{ 
      padding: ds.spacing.medium,
      border: `1px solid ${ds.colors.grayscale[20]}`,
      borderRadius: ds.interactive.radius.medium,
      backgroundColor: ds.colors.semantic.background.secondary
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: ds.spacing.small
      }}>
        <span style={{
          fontSize: ds.typography.scale.small,
          color: ds.colors.grayscale[70],
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {label}
        </span>
        <span style={{ 
          fontSize: ds.typography.scale.medium,
          fontWeight: ds.typography.weights.semibold,
          fontFamily: ds.typography.families.data,
          color,
        }}>
          {value.toFixed(2)}{unit}
        </span>
      </div>
      
      <div style={{
        width: '100%',
        height: '6px',
        backgroundColor: ds.colors.grayscale[20],
        borderRadius: ds.interactive.radius.pill,
        overflow: 'hidden',
        marginBottom: ds.spacing.small
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          backgroundColor: color,
          transition: designHelpers.animate('width'),
        }} />
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        fontSize: ds.typography.scale.mini,
        color: ds.colors.grayscale[60],
      }}>
        <span>0{unit}</span>
        <span>{max.toFixed(1)}{unit}</span>
      </div>
    </div>
  )
}

const CorrelationMatrix: React.FC<{
  data: Array<{
    asset: string
    correlations: number[]
  }>
}> = ({ data }) => {
  const cellSize = 60
  
  return (
    <div style={{ 
      overflowX: 'auto',
      marginTop: ds.spacing.medium,
    }}>
      <div style={{ 
        display: 'inline-block',
        minWidth: 'fit-content',
      }}>
        {/* Header row */}
        <div style={{ 
          display: 'flex',
          marginLeft: cellSize,
          marginBottom: ds.spacing.mini,
        }}>
          {data.map((item, i) => (
            <div 
              key={i}
              style={{
                width: cellSize,
                textAlign: 'center',
                fontSize: ds.typography.scale.small,
                fontWeight: ds.typography.weights.medium,
                color: ds.colors.grayscale[70],
              }}
            >
              {item.asset}
            </div>
          ))}
        </div>
        
        {/* Data rows */}
        {data.map((row, i) => (
          <div key={i} style={{ display: 'flex', marginBottom: ds.spacing.mini }}>
            <div style={{
              width: cellSize,
              fontSize: ds.typography.scale.small,
              fontWeight: ds.typography.weights.medium,
              color: ds.colors.grayscale[70],
              display: 'flex',
              alignItems: 'center',
            }}>
              {row.asset}
            </div>
            {row.correlations.map((corr, j) => {
              const intensity = Math.abs(corr)
              const isPositive = corr >= 0
              const isDiagonal = i === j
              
              return (
                <div
                  key={j}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: isDiagonal ? ds.colors.grayscale[30] :
                      ds.colors.semantic.background.tertiary,
                    border: `1px solid ${ds.colors.grayscale[20]}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: ds.typography.scale.small,
                    fontFamily: ds.typography.families.data,
                    fontWeight: intensity > 0.7 ? ds.typography.weights.semibold : ds.typography.weights.regular,
                    color: isDiagonal ? ds.colors.grayscale[60] :
                           isPositive ? ds.colors.semantic.buy : ds.colors.semantic.sell,
                    opacity: isDiagonal ? 1 : 0.4 + (intensity * 0.6),
                  }}
                >
                  {corr.toFixed(2)}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export const RiskDashboard: React.FC = () => {
  const [riskData, setRiskData] = useState<RiskMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const mockData: RiskMetrics = {
      portfolioValue: 125430.50,
      totalExposure: 150516.60,
      leverage: 1.2,
      marginUsed: 25086.10,
      availableMargin: 100344.40,
      valueAtRisk: {
        daily95: -3250.50,
        daily99: -4890.75,
        weekly95: -8650.25
      },
      drawdown: {
        current: -2.8,
        maximum: -8.5,
        duration: 12
      },
      sharpeRatio: 1.85,
      sortinoRatio: 2.34,
      beta: 0.92,
      correlation: {
        market: 0.78,
        btc: 0.85
      },
      positionSizes: [
        { symbol: 'BTC/USD', exposure: 45230.25, percentage: 36.1, risk: 'medium' },
        { symbol: 'ETH/USD', exposure: 28750.80, percentage: 22.9, risk: 'low' },
        { symbol: 'ADA/USD', exposure: 15420.30, percentage: 12.3, risk: 'high' },
        { symbol: 'DOT/USD', exposure: 12850.60, percentage: 10.2, risk: 'medium' },
      ],
      riskLimits: {
        maxLeverage: 2.0,
        maxDrawdown: 15.0,
        maxPositionSize: 40.0,
        dailyLossLimit: 5000.00
      },
      volatilityMetrics: {
        portfolioVol: 18.5,
        realizedVol: 16.8,
        impliedVol: 22.3,
        volHistory: [15.2, 16.8, 18.1, 19.5, 18.5, 17.2, 18.5]
      }
    }

    setRiskData(mockData)
    setLoading(false)
  }, [])

  if (loading || !riskData) {
    return (
      <div style={{ 
        padding: ds.spacing.xlarge,
        color: ds.colors.grayscale[70],
        fontFamily: ds.typography.families.interface,
      }}>
        Loading risk metrics...
      </div>
    )
  }

  const correlationData = [
    { asset: 'BTC', correlations: [1.00, 0.85, 0.72, 0.68] },
    { asset: 'ETH', correlations: [0.85, 1.00, 0.78, 0.74] },
    { asset: 'ADA', correlations: [0.72, 0.78, 1.00, 0.65] },
    { asset: 'DOT', correlations: [0.68, 0.74, 0.65, 1.00] },
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const getRiskStatusColor = (risk: string) => {
    switch (risk) {
      case 'high': return ds.colors.semantic.error
      case 'medium': return ds.colors.semantic.warning
      case 'low': return ds.colors.semantic.success
      default: return ds.colors.semantic.neutral
    }
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
          <h1 style={{
            fontSize: ds.typography.scale.xlarge,
            fontWeight: ds.typography.weights.semibold,
            margin: 0,
            marginBottom: ds.spacing.large,
          }}>
            Risk Management Dashboard
          </h1>
          
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: ds.spacing.large,
          }}>
            <div>
              <div style={{
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.mini,
              }}>
                Portfolio Value
              </div>
              <div style={{
                fontSize: ds.typography.scale.large,
                fontWeight: ds.typography.weights.semibold,
                fontFamily: ds.typography.families.data,
              }}>
                {formatCurrency(riskData.portfolioValue)}
              </div>
            </div>
            
            <div>
              <div style={{
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.mini,
              }}>
                Total Exposure
              </div>
              <div style={{
                fontSize: ds.typography.scale.large,
                fontWeight: ds.typography.weights.semibold,
                fontFamily: ds.typography.families.data,
              }}>
                {formatCurrency(riskData.totalExposure)}
              </div>
            </div>
            
            <div>
              <div style={{
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.mini,
              }}>
                Current Leverage
              </div>
              <div style={{
                fontSize: ds.typography.scale.large,
                fontWeight: ds.typography.weights.semibold,
                fontFamily: ds.typography.families.data,
                color: riskData.leverage > 1.5 ? ds.colors.semantic.warning : ds.colors.semantic.success,
              }}>
                {riskData.leverage.toFixed(2)}x
              </div>
            </div>
            
            <div>
              <div style={{
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.mini,
              }}>
                Available Margin
              </div>
              <div style={{
                fontSize: ds.typography.scale.large,
                fontWeight: ds.typography.weights.semibold,
                fontFamily: ds.typography.families.data,
              }}>
                {formatCurrency(riskData.availableMargin)}
              </div>
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
        {/* Risk Gauges */}
        <section style={{ marginBottom: ds.spacing.xxlarge }}>
          <h2 style={{ 
            fontSize: ds.typography.scale.large,
            fontWeight: ds.typography.weights.semibold,
            marginBottom: ds.spacing.large,
          }}>
            Risk Limits
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: ds.spacing.large,
          }}>
            <RiskGauge
              value={riskData.leverage}
              max={riskData.riskLimits.maxLeverage}
              label="Leverage"
              warningThreshold={1.5}
              dangerThreshold={1.8}
              unit="x"
            />
            
            <RiskGauge
              value={Math.abs(riskData.drawdown.current)}
              max={riskData.riskLimits.maxDrawdown}
              label="Current Drawdown"
              warningThreshold={8}
              dangerThreshold={12}
              unit="%"
            />
            
            <RiskGauge
              value={Math.max(...riskData.positionSizes.map(p => p.percentage))}
              max={riskData.riskLimits.maxPositionSize}
              label="Largest Position"
              warningThreshold={30}
              dangerThreshold={35}
              unit="%"
            />
            
            <RiskGauge
              value={(riskData.marginUsed / (riskData.marginUsed + riskData.availableMargin)) * 100}
              max={100}
              label="Margin Usage"
              warningThreshold={70}
              dangerThreshold={85}
              unit="%"
            />
          </div>
        </section>

        {/* Main Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: ds.spacing.xlarge,
          marginBottom: ds.spacing.xxlarge,
        }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: ds.spacing.xlarge }}>
            {/* VaR Metrics */}
            <section>
              <h3 style={{
                fontSize: ds.typography.scale.medium,
                fontWeight: ds.typography.weights.semibold,
                marginBottom: ds.spacing.medium,
              }}>
                Value at Risk
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: ds.spacing.medium,
              }}>
                <div style={{
                  backgroundColor: ds.colors.semantic.background.secondary,
                  borderRadius: ds.interactive.radius.medium,
                  padding: ds.spacing.medium,
                  border: `1px solid ${ds.colors.grayscale[20]}`,
                }}>
                  <div style={{
                    fontSize: ds.typography.scale.small,
                    color: ds.colors.grayscale[70],
                    marginBottom: ds.spacing.small,
                  }}>
                    Daily VaR (95%)
                  </div>
                  <div style={{
                    fontSize: ds.typography.scale.large,
                    fontWeight: ds.typography.weights.semibold,
                    fontFamily: ds.typography.families.data,
                    color: ds.colors.semantic.sell,
                  }}>
                    -{formatCurrency(Math.abs(riskData.valueAtRisk.daily95))}
                  </div>
                </div>
                
                <div style={{
                  backgroundColor: ds.colors.semantic.background.secondary,
                  borderRadius: ds.interactive.radius.medium,
                  padding: ds.spacing.medium,
                  border: `1px solid ${ds.colors.grayscale[20]}`,
                }}>
                  <div style={{
                    fontSize: ds.typography.scale.small,
                    color: ds.colors.grayscale[70],
                    marginBottom: ds.spacing.small,
                  }}>
                    Daily VaR (99%)
                  </div>
                  <div style={{
                    fontSize: ds.typography.scale.large,
                    fontWeight: ds.typography.weights.semibold,
                    fontFamily: ds.typography.families.data,
                    color: ds.colors.semantic.sell,
                  }}>
                    -{formatCurrency(Math.abs(riskData.valueAtRisk.daily99))}
                  </div>
                </div>
                
                <div style={{
                  backgroundColor: ds.colors.semantic.background.secondary,
                  borderRadius: ds.interactive.radius.medium,
                  padding: ds.spacing.medium,
                  border: `1px solid ${ds.colors.grayscale[20]}`,
                }}>
                  <div style={{
                    fontSize: ds.typography.scale.small,
                    color: ds.colors.grayscale[70],
                    marginBottom: ds.spacing.small,
                  }}>
                    Weekly VaR (95%)
                  </div>
                  <div style={{
                    fontSize: ds.typography.scale.large,
                    fontWeight: ds.typography.weights.semibold,
                    fontFamily: ds.typography.families.data,
                    color: ds.colors.semantic.sell,
                  }}>
                    -{formatCurrency(Math.abs(riskData.valueAtRisk.weekly95))}
                  </div>
                </div>
              </div>
            </section>

            {/* Performance Metrics */}
            <section>
              <h3 style={{
                fontSize: ds.typography.scale.medium,
                fontWeight: ds.typography.weights.semibold,
                marginBottom: ds.spacing.medium,
              }}>
                Risk-Adjusted Performance
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: ds.spacing.medium,
              }}>
                <div style={{
                  backgroundColor: ds.colors.semantic.background.secondary,
                  borderRadius: ds.interactive.radius.medium,
                  padding: ds.spacing.medium,
                  border: `1px solid ${ds.colors.grayscale[20]}`,
                }}>
                  <div style={{
                    fontSize: ds.typography.scale.small,
                    color: ds.colors.grayscale[70],
                    marginBottom: ds.spacing.small,
                  }}>
                    Sharpe Ratio
                  </div>
                  <div style={{
                    fontSize: ds.typography.scale.large,
                    fontWeight: ds.typography.weights.semibold,
                    fontFamily: ds.typography.families.data,
                    color: riskData.sharpeRatio > 1.5 ? ds.colors.semantic.success : ds.colors.semantic.warning,
                  }}>
                    {riskData.sharpeRatio.toFixed(2)}
                  </div>
                </div>
                
                <div style={{
                  backgroundColor: ds.colors.semantic.background.secondary,
                  borderRadius: ds.interactive.radius.medium,
                  padding: ds.spacing.medium,
                  border: `1px solid ${ds.colors.grayscale[20]}`,
                }}>
                  <div style={{
                    fontSize: ds.typography.scale.small,
                    color: ds.colors.grayscale[70],
                    marginBottom: ds.spacing.small,
                  }}>
                    Sortino Ratio
                  </div>
                  <div style={{
                    fontSize: ds.typography.scale.large,
                    fontWeight: ds.typography.weights.semibold,
                    fontFamily: ds.typography.families.data,
                    color: riskData.sortinoRatio > 2 ? ds.colors.semantic.success : ds.colors.semantic.warning,
                  }}>
                    {riskData.sortinoRatio.toFixed(2)}
                  </div>
                </div>
                
                <div style={{
                  backgroundColor: ds.colors.semantic.background.secondary,
                  borderRadius: ds.interactive.radius.medium,
                  padding: ds.spacing.medium,
                  border: `1px solid ${ds.colors.grayscale[20]}`,
                }}>
                  <div style={{
                    fontSize: ds.typography.scale.small,
                    color: ds.colors.grayscale[70],
                    marginBottom: ds.spacing.small,
                  }}>
                    Beta
                  </div>
                  <div style={{
                    fontSize: ds.typography.scale.large,
                    fontWeight: ds.typography.weights.semibold,
                    fontFamily: ds.typography.families.data,
                  }}>
                    {riskData.beta.toFixed(2)}
                  </div>
                </div>
                
                <div style={{
                  backgroundColor: ds.colors.semantic.background.secondary,
                  borderRadius: ds.interactive.radius.medium,
                  padding: ds.spacing.medium,
                  border: `1px solid ${ds.colors.grayscale[20]}`,
                }}>
                  <div style={{
                    fontSize: ds.typography.scale.small,
                    color: ds.colors.grayscale[70],
                    marginBottom: ds.spacing.small,
                  }}>
                    Portfolio Vol
                  </div>
                  <div style={{
                    fontSize: ds.typography.scale.large,
                    fontWeight: ds.typography.weights.semibold,
                    fontFamily: ds.typography.families.data,
                  }}>
                    {riskData.volatilityMetrics.portfolioVol.toFixed(1)}%
                  </div>
                </div>
              </div>
            </section>

            {/* Position Concentrations */}
            <section>
              <h3 style={{
                fontSize: ds.typography.scale.medium,
                fontWeight: ds.typography.weights.semibold,
                marginBottom: ds.spacing.medium,
              }}>
                Position Concentrations
              </h3>
              
              <div style={{
                backgroundColor: ds.colors.semantic.background.secondary,
                borderRadius: ds.interactive.radius.medium,
                overflow: 'hidden',
              }}>
                {riskData.positionSizes.map((position, index) => (
                  <div 
                    key={index}
                    style={{ 
                      display: 'grid',
                      gridTemplateColumns: '150px 1fr 120px 100px',
                      gap: ds.spacing.medium,
                      padding: ds.spacing.medium,
                      borderBottom: index < riskData.positionSizes.length - 1 ? 
                        `1px solid ${ds.colors.grayscale[20]}` : 'none',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{
                      fontFamily: ds.typography.families.data,
                      fontWeight: ds.typography.weights.medium,
                    }}>
                      {position.symbol}
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: ds.spacing.small,
                    }}>
                      <div style={{
                        flex: 1,
                        height: '6px',
                        backgroundColor: ds.colors.grayscale[20],
                        borderRadius: ds.interactive.radius.pill,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${position.percentage}%`,
                          height: '100%',
                          backgroundColor: getRiskStatusColor(position.risk),
                          opacity: 0.8,
                        }} />
                      </div>
                      <span style={{
                        fontSize: ds.typography.scale.small,
                        fontFamily: ds.typography.families.data,
                        color: ds.colors.grayscale[70],
                      }}>
                        {position.percentage.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div style={{ 
                      textAlign: 'right',
                      fontSize: ds.typography.scale.small,
                      fontFamily: ds.typography.families.data,
                    }}>
                      {formatCurrency(position.exposure)}
                    </div>
                    
                    <div style={{ 
                      textAlign: 'right',
                    }}>
                      <span style={{
                        display: 'inline-block',
                        padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                        backgroundColor: `${getRiskStatusColor(position.risk)}20`,
                        color: getRiskStatusColor(position.risk),
                        borderRadius: ds.interactive.radius.small,
                        fontSize: ds.typography.scale.mini,
                        fontWeight: ds.typography.weights.medium,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        {position.risk}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: ds.spacing.large }}>
            {/* Risk Status */}
            <div style={{
              backgroundColor: riskData.drawdown.current > -5 ? 
                `${ds.colors.semantic.success}10` : 
                `${ds.colors.semantic.warning}10`,
              border: `1px solid ${riskData.drawdown.current > -5 ? 
                ds.colors.semantic.success : 
                ds.colors.semantic.warning}`,
              borderRadius: ds.interactive.radius.medium,
              padding: ds.spacing.large,
            }}>
              <h3 style={{
                fontSize: ds.typography.scale.medium,
                fontWeight: ds.typography.weights.semibold,
                marginBottom: ds.spacing.small,
                color: riskData.drawdown.current > -5 ? 
                  ds.colors.semantic.success : 
                  ds.colors.semantic.warning,
              }}>
                Overall Risk Level
              </h3>
              <div style={{
                fontSize: ds.typography.scale.small,
                marginBottom: ds.spacing.small,
              }}>
                Current drawdown: {riskData.drawdown.current}%
              </div>
              <div style={{
                fontSize: ds.typography.scale.mini,
                color: ds.colors.grayscale[70],
              }}>
                Max historical: {riskData.drawdown.maximum}% | Duration: {riskData.drawdown.duration} days
              </div>
            </div>

            {/* Volatility Trend */}
            <div style={{
              backgroundColor: ds.colors.semantic.background.secondary,
              borderRadius: ds.interactive.radius.medium,
              padding: ds.spacing.large,
              border: `1px solid ${ds.colors.grayscale[20]}`,
            }}>
              <h3 style={{
                fontSize: ds.typography.scale.medium,
                fontWeight: ds.typography.weights.semibold,
                marginBottom: ds.spacing.medium,
              }}>
                Volatility Trend
              </h3>
              
              <div style={{ 
                fontSize: ds.typography.scale.xlarge,
                fontWeight: ds.typography.weights.semibold,
                fontFamily: ds.typography.families.data,
                marginBottom: ds.spacing.medium,
              }}>
                {riskData.volatilityMetrics.portfolioVol}%
              </div>
              
              {/* Mini sparkline */}
              <div style={{
                height: '40px',
                display: 'flex',
                alignItems: 'flex-end',
                gap: '2px',
                marginBottom: ds.spacing.medium,
              }}>
                {riskData.volatilityMetrics.volHistory.map((vol, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${(vol / 25) * 100}%`,
                      backgroundColor: i === riskData.volatilityMetrics.volHistory.length - 1 ?
                        ds.colors.semantic.primary :
                        ds.colors.grayscale[40],
                      borderRadius: '2px',
                    }}
                  />
                ))}
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
                    marginBottom: ds.spacing.mini,
                  }}>
                    Realized
                  </div>
                  <div style={{
                    fontSize: ds.typography.scale.small,
                    fontFamily: ds.typography.families.data,
                  }}>
                    {riskData.volatilityMetrics.realizedVol}%
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: ds.typography.scale.mini,
                    color: ds.colors.grayscale[70],
                    marginBottom: ds.spacing.mini,
                  }}>
                    Implied
                  </div>
                  <div style={{
                    fontSize: ds.typography.scale.small,
                    fontFamily: ds.typography.families.data,
                  }}>
                    {riskData.volatilityMetrics.impliedVol}%
                  </div>
                </div>
              </div>
            </div>

            {/* Correlation Analysis */}
            <div style={{
              backgroundColor: ds.colors.semantic.background.secondary,
              borderRadius: ds.interactive.radius.medium,
              padding: ds.spacing.large,
              border: `1px solid ${ds.colors.grayscale[20]}`,
            }}>
              <h3 style={{
                fontSize: ds.typography.scale.medium,
                fontWeight: ds.typography.weights.semibold,
                marginBottom: ds.spacing.medium,
              }}>
                Asset Correlations
              </h3>
              
              <CorrelationMatrix data={correlationData} />
              
              <div style={{ 
                marginTop: ds.spacing.large,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: ds.spacing.medium,
                paddingTop: ds.spacing.medium,
                borderTop: `1px solid ${ds.colors.grayscale[20]}`,
              }}>
                <div>
                  <div style={{
                    fontSize: ds.typography.scale.mini,
                    color: ds.colors.grayscale[70],
                    marginBottom: ds.spacing.mini,
                  }}>
                    Market Beta
                  </div>
                  <div style={{
                    fontSize: ds.typography.scale.medium,
                    fontFamily: ds.typography.families.data,
                    fontWeight: ds.typography.weights.semibold,
                  }}>
                    {riskData.beta.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: ds.typography.scale.mini,
                    color: ds.colors.grayscale[70],
                    marginBottom: ds.spacing.mini,
                  }}>
                    BTC Correlation
                  </div>
                  <div style={{
                    fontSize: ds.typography.scale.medium,
                    fontFamily: ds.typography.families.data,
                    fontWeight: ds.typography.weights.semibold,
                  }}>
                    {riskData.correlation.btc.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default RiskDashboard