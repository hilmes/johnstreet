'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { dieterRamsDesign as ds, designHelpers } from '@/lib/design/DieterRamsDesignSystem'

// Types
interface MarketMetrics {
  trend: 'bullish' | 'bearish' | 'neutral'
  volatility: number
  volume: number
  momentum: number
  sentiment: number
  correlations: {
    btc: number
    eth: number
    sp500: number
    gold: number
  }
}

interface TechnicalIndicator {
  name: string
  value: number
  signal: 'buy' | 'sell' | 'neutral'
  strength: number
}

interface MarketSector {
  name: string
  change24h: number
  volume: number
  leaders: string[]
  laggards: string[]
}

// Market Analysis Page Component
export default function MarketAnalysisPage() {
  const [timeframe, setTimeframe] = useState<'1H' | '4H' | '1D' | '1W' | '1M'>('1D')
  const [selectedMarket, setSelectedMarket] = useState<'crypto' | 'traditional' | 'all'>('crypto')
  const [analysisDepth, setAnalysisDepth] = useState<'basic' | 'advanced'>('basic')

  // Mock market data
  const marketMetrics: MarketMetrics = {
    trend: 'bullish',
    volatility: 18.5,
    volume: 45230500000,
    momentum: 72,
    sentiment: 65,
    correlations: {
      btc: 1.0,
      eth: 0.85,
      sp500: 0.42,
      gold: -0.28,
    }
  }

  // Technical indicators
  const technicalIndicators: TechnicalIndicator[] = [
    { name: 'RSI (14)', value: 58.3, signal: 'neutral', strength: 0.6 },
    { name: 'MACD', value: 125.4, signal: 'buy', strength: 0.8 },
    { name: 'BB %B', value: 0.72, signal: 'buy', strength: 0.7 },
    { name: 'Stochastic', value: 78.5, signal: 'sell', strength: 0.5 },
    { name: 'ADX', value: 32.1, signal: 'neutral', strength: 0.9 },
    { name: 'OBV', value: 2.3, signal: 'buy', strength: 0.7 },
  ]

  // Market sectors performance
  const marketSectors: MarketSector[] = [
    {
      name: 'DeFi',
      change24h: 5.2,
      volume: 8230000000,
      leaders: ['UNI', 'AAVE', 'COMP'],
      laggards: ['CRV', 'BAL', 'YFI'],
    },
    {
      name: 'Layer 1',
      change24h: 3.8,
      volume: 12450000000,
      leaders: ['SOL', 'AVAX', 'NEAR'],
      laggards: ['ADA', 'DOT', 'ATOM'],
    },
    {
      name: 'Layer 2',
      change24h: 7.1,
      volume: 3210000000,
      leaders: ['MATIC', 'ARB', 'OP'],
      laggards: ['LRC', 'BOBA', 'ZKS'],
    },
    {
      name: 'Memecoins',
      change24h: -2.4,
      volume: 5670000000,
      leaders: ['PEPE', 'WOJAK'],
      laggards: ['DOGE', 'SHIB', 'FLOKI'],
    },
  ]

  // Calculate overall market signal
  const overallSignal = useMemo(() => {
    const buySignals = technicalIndicators.filter(i => i.signal === 'buy').length
    const sellSignals = technicalIndicators.filter(i => i.signal === 'sell').length
    const total = technicalIndicators.length
    
    if (buySignals / total > 0.6) return 'Strong Buy'
    if (buySignals / total > 0.4) return 'Buy'
    if (sellSignals / total > 0.6) return 'Strong Sell'
    if (sellSignals / total > 0.4) return 'Sell'
    return 'Neutral'
  }, [technicalIndicators])

  // Market trend chart data
  const trendData = [
    { time: '00:00', price: 67800, volume: 1234 },
    { time: '04:00', price: 68200, volume: 1456 },
    { time: '08:00', price: 68500, volume: 2234 },
    { time: '12:00', price: 68900, volume: 3456 },
    { time: '16:00', price: 68700, volume: 2890 },
    { time: '20:00', price: 69200, volume: 2123 },
    { time: '24:00', price: 69400, volume: 1890 },
  ]

  // Helper function to get signal color
  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'buy':
      case 'Strong Buy':
        return ds.colors.semantic.buy
      case 'sell':
      case 'Strong Sell':
        return ds.colors.semantic.sell
      default:
        return ds.colors.semantic.neutral
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
              Market Analysis
            </h1>
            <p style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              margin: 0,
            }}>
              Real-time market intelligence and technical analysis
            </p>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: ds.spacing.medium }}>
            {/* Timeframe Selector */}
            <div style={{ display: 'flex', gap: ds.spacing.mini }}>
              {(['1H', '4H', '1D', '1W', '1M'] as const).map(tf => (
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

            {/* Analysis Depth Toggle */}
            <button
              onClick={() => setAnalysisDepth(analysisDepth === 'basic' ? 'advanced' : 'basic')}
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
              {analysisDepth === 'basic' ? 'Advanced View' : 'Basic View'}
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
        {/* Market Overview */}
        <section style={{ marginBottom: ds.spacing.xxlarge }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: ds.spacing.large,
            marginBottom: ds.spacing.xlarge,
          }}>
            {/* Market Trend */}
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
                Market Trend
              </div>
              <div style={{
                fontSize: ds.typography.scale.xlarge,
                fontWeight: ds.typography.weights.semibold,
                color: marketMetrics.trend === 'bullish' ? ds.colors.semantic.buy : 
                       marketMetrics.trend === 'bearish' ? ds.colors.semantic.sell : 
                       ds.colors.semantic.neutral,
                textTransform: 'capitalize',
              }}>
                {marketMetrics.trend}
              </div>
              <div style={{
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginTop: ds.spacing.mini,
              }}>
                Based on {timeframe} analysis
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
                Volatility Index
              </div>
              <div style={{
                fontSize: ds.typography.scale.xlarge,
                fontWeight: ds.typography.weights.semibold,
                fontFamily: ds.typography.families.data,
              }}>
                {marketMetrics.volatility.toFixed(1)}%
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
                  width: `${Math.min(marketMetrics.volatility * 2, 100)}%`,
                  height: '100%',
                  backgroundColor: marketMetrics.volatility > 30 ? ds.colors.semantic.warning :
                                   marketMetrics.volatility > 20 ? ds.colors.semantic.info :
                                   ds.colors.semantic.success,
                  transition: designHelpers.animate('width'),
                }} />
              </div>
            </div>

            {/* Volume */}
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
                24h Volume
              </div>
              <div style={{
                fontSize: ds.typography.scale.xlarge,
                fontWeight: ds.typography.weights.semibold,
                fontFamily: ds.typography.families.data,
              }}>
                ${(marketMetrics.volume / 1000000000).toFixed(1)}B
              </div>
              <div style={{
                fontSize: ds.typography.scale.small,
                color: ds.colors.semantic.buy,
                marginTop: ds.spacing.mini,
              }}>
                +12.5% from average
              </div>
            </div>

            {/* Market Signal */}
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
                Overall Signal
              </div>
              <div style={{
                fontSize: ds.typography.scale.xlarge,
                fontWeight: ds.typography.weights.semibold,
                color: getSignalColor(overallSignal),
              }}>
                {overallSignal}
              </div>
              <div style={{
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginTop: ds.spacing.mini,
              }}>
                {technicalIndicators.filter(i => i.signal === 'buy').length}/{technicalIndicators.length} indicators bullish
              </div>
            </div>
          </div>
        </section>

        {/* Technical Indicators Grid */}
        {analysisDepth === 'advanced' && (
          <section style={{ marginBottom: ds.spacing.xxlarge }}>
            <h2 style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.large,
            }}>
              Technical Indicators
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: ds.spacing.medium,
            }}>
              {technicalIndicators.map((indicator, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: ds.colors.semantic.background.secondary,
                    borderRadius: ds.interactive.radius.medium,
                    padding: ds.spacing.medium,
                    border: `1px solid ${ds.colors.grayscale[20]}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: ds.typography.scale.small,
                      color: ds.colors.grayscale[70],
                      marginBottom: ds.spacing.micro,
                    }}>
                      {indicator.name}
                    </div>
                    <div style={{
                      fontSize: ds.typography.scale.medium,
                      fontWeight: ds.typography.weights.semibold,
                      fontFamily: ds.typography.families.data,
                    }}>
                      {indicator.value.toFixed(2)}
                    </div>
                  </div>
                  
                  <div style={{
                    textAlign: 'right',
                  }}>
                    <div style={{
                      fontSize: ds.typography.scale.small,
                      fontWeight: ds.typography.weights.medium,
                      color: getSignalColor(indicator.signal),
                      marginBottom: ds.spacing.micro,
                      textTransform: 'uppercase',
                    }}>
                      {indicator.signal}
                    </div>
                    <div style={{
                      width: '60px',
                      height: '4px',
                      backgroundColor: ds.colors.grayscale[20],
                      borderRadius: ds.interactive.radius.pill,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${indicator.strength * 100}%`,
                        height: '100%',
                        backgroundColor: getSignalColor(indicator.signal),
                        opacity: 0.8,
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Market Sectors */}
        <section style={{ marginBottom: ds.spacing.xxlarge }}>
          <h2 style={{
            fontSize: ds.typography.scale.large,
            fontWeight: ds.typography.weights.semibold,
            marginBottom: ds.spacing.large,
          }}>
            Sector Performance
          </h2>

          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            overflow: 'hidden',
          }}>
            {marketSectors.map((sector, index) => (
              <div
                key={index}
                style={{
                  padding: ds.spacing.large,
                  borderBottom: index < marketSectors.length - 1 ? `1px solid ${ds.colors.grayscale[20]}` : 'none',
                  display: 'grid',
                  gridTemplateColumns: '200px 1fr 1fr 150px',
                  gap: ds.spacing.large,
                  alignItems: 'center',
                }}
              >
                {/* Sector Name & Performance */}
                <div>
                  <div style={{
                    fontSize: ds.typography.scale.base,
                    fontWeight: ds.typography.weights.medium,
                    marginBottom: ds.spacing.mini,
                  }}>
                    {sector.name}
                  </div>
                  <div style={{
                    fontSize: ds.typography.scale.large,
                    fontWeight: ds.typography.weights.semibold,
                    color: sector.change24h >= 0 ? ds.colors.semantic.buy : ds.colors.semantic.sell,
                  }}>
                    {sector.change24h >= 0 ? '+' : ''}{sector.change24h}%
                  </div>
                </div>

                {/* Leaders */}
                <div>
                  <div style={{
                    fontSize: ds.typography.scale.mini,
                    color: ds.colors.grayscale[70],
                    marginBottom: ds.spacing.mini,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Top Performers
                  </div>
                  <div style={{ display: 'flex', gap: ds.spacing.small }}>
                    {sector.leaders.map(leader => (
                      <span
                        key={leader}
                        style={{
                          padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                          backgroundColor: ds.colors.semantic.background.tertiary,
                          borderRadius: ds.interactive.radius.small,
                          fontSize: ds.typography.scale.small,
                          fontFamily: ds.typography.families.data,
                          color: ds.colors.semantic.buy,
                        }}
                      >
                        {leader}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Laggards */}
                <div>
                  <div style={{
                    fontSize: ds.typography.scale.mini,
                    color: ds.colors.grayscale[70],
                    marginBottom: ds.spacing.mini,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Underperformers
                  </div>
                  <div style={{ display: 'flex', gap: ds.spacing.small }}>
                    {sector.laggards.map(laggard => (
                      <span
                        key={laggard}
                        style={{
                          padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                          backgroundColor: ds.colors.semantic.background.tertiary,
                          borderRadius: ds.interactive.radius.small,
                          fontSize: ds.typography.scale.small,
                          fontFamily: ds.typography.families.data,
                          color: ds.colors.semantic.sell,
                        }}
                      >
                        {laggard}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Volume */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: ds.typography.scale.mini,
                    color: ds.colors.grayscale[70],
                    marginBottom: ds.spacing.mini,
                  }}>
                    24h Volume
                  </div>
                  <div style={{
                    fontSize: ds.typography.scale.base,
                    fontFamily: ds.typography.families.data,
                  }}>
                    ${(sector.volume / 1000000000).toFixed(1)}B
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Market Correlations */}
        {analysisDepth === 'advanced' && (
          <section>
            <h2 style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.large,
            }}>
              Market Correlations
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: ds.spacing.medium,
            }}>
              {Object.entries(marketMetrics.correlations).map(([asset, correlation]) => (
                <div
                  key={asset}
                  style={{
                    backgroundColor: ds.colors.semantic.background.secondary,
                    borderRadius: ds.interactive.radius.medium,
                    padding: ds.spacing.large,
                    border: `1px solid ${ds.colors.grayscale[20]}`,
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    fontSize: ds.typography.scale.base,
                    fontWeight: ds.typography.weights.medium,
                    textTransform: 'uppercase',
                    marginBottom: ds.spacing.small,
                  }}>
                    {asset}
                  </div>
                  <div style={{
                    fontSize: ds.typography.scale.xlarge,
                    fontWeight: ds.typography.weights.semibold,
                    fontFamily: ds.typography.families.data,
                    color: correlation > 0.5 ? ds.colors.semantic.buy :
                           correlation < -0.5 ? ds.colors.semantic.sell :
                           ds.colors.semantic.neutral,
                  }}>
                    {correlation.toFixed(2)}
                  </div>
                  <div style={{
                    fontSize: ds.typography.scale.mini,
                    color: ds.colors.grayscale[70],
                    marginTop: ds.spacing.mini,
                  }}>
                    {Math.abs(correlation) > 0.7 ? 'Strong' :
                     Math.abs(correlation) > 0.4 ? 'Moderate' :
                     'Weak'} {correlation > 0 ? 'Positive' : 'Negative'}
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