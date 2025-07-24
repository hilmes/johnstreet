'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { dieterRamsDesign as ds, designHelpers } from '@/lib/design/DieterRamsDesignSystem'
import { OrderForm } from '@/components/trading/OrderForm'
import { OrderBook } from '@/components/trading/OrderBook'
import { PriceChart } from '@/components/trading/PriceChart'
import { PositionsTable } from '@/components/trading/PositionsTable'
import { TradeHistory } from '@/components/trading/TradeHistory'
import { MarketDepth } from '@/components/trading/MarketDepth'
import { RiskCalculator } from '@/components/trading/RiskCalculator'

// Types
interface Position {
  id: string
  symbol: string
  side: 'long' | 'short'
  size: number
  entry: number
  current: number
  pnl: number
  pnlPercent: number
  stopLoss?: number
  takeProfit?: number
}

interface Order {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit' | 'stop'
  price: number
  size: number
  filled: number
  status: 'pending' | 'partial' | 'filled' | 'cancelled'
  timestamp: Date
}

interface Trade {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  price: number
  size: number
  fee: number
  timestamp: Date
}

interface MarketData {
  symbol: string
  bid: number
  ask: number
  last: number
  change24h: number
  volume24h: number
  high24h: number
  low24h: number
}

// Main Trading Interface Component
export default function LiveTradingPage() {
  // State management
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USD')
  const [positions, setPositions] = useState<Position[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [accountBalance, setAccountBalance] = useState(100000)
  const [isLoading, setIsLoading] = useState(true)
  
  // Refs for real-time updates
  const wsRef = useRef<WebSocket | null>(null)
  const chartRef = useRef<any>(null)

  // Mock data for demonstration
  useEffect(() => {
    // Initialize with mock data
    setPositions([
      {
        id: '1',
        symbol: 'BTC/USD',
        side: 'long',
        size: 0.5,
        entry: 67500,
        current: 68200,
        pnl: 350,
        pnlPercent: 1.04,
        stopLoss: 66000,
        takeProfit: 70000,
      },
      {
        id: '2',
        symbol: 'ETH/USD',
        side: 'short',
        size: 5,
        entry: 3850,
        current: 3820,
        pnl: 150,
        pnlPercent: 0.78,
        stopLoss: 3900,
        takeProfit: 3700,
      },
    ])

    setMarketData({
      symbol: 'BTC/USD',
      bid: 68195,
      ask: 68205,
      last: 68200,
      change24h: 2.45,
      volume24h: 45230.5,
      high24h: 68900,
      low24h: 66200,
    })

    setIsLoading(false)
  }, [])

  // WebSocket connection for real-time data
  useEffect(() => {
    // Connect to WebSocket for real-time updates
    // wsRef.current = new WebSocket('wss://api.trading.com/stream')
    // Implement WebSocket handlers...

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  // Calculate portfolio metrics
  const portfolioMetrics = {
    totalValue: accountBalance + positions.reduce((sum, p) => sum + (p.size * p.current), 0),
    totalPnL: positions.reduce((sum, p) => sum + p.pnl, 0),
    totalPnLPercent: (positions.reduce((sum, p) => sum + p.pnl, 0) / accountBalance) * 100,
    availableBalance: accountBalance - positions.reduce((sum, p) => sum + (p.size * p.entry), 0),
    marginUsed: positions.reduce((sum, p) => sum + (p.size * p.entry), 0),
  }

  return (
    <div style={{
      backgroundColor: ds.colors.semantic.background.primary,
      color: ds.colors.grayscale[90],
      minHeight: '100vh',
      fontFamily: ds.typography.families.interface,
    }}>
      {/* Header Section - Portfolio Overview */}
      <header style={{
        padding: ds.spacing.large,
        borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
        backgroundColor: ds.colors.semantic.background.secondary,
      }}>
        <div style={{
          maxWidth: ds.grid.maxWidth,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: ds.spacing.large,
        }}>
          {/* Portfolio Value */}
          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.micro,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Portfolio Value
            </div>
            <div style={{
              fontSize: ds.typography.scale.xlarge,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              lineHeight: ds.typography.lineHeights.data,
            }}>
              ${portfolioMetrics.totalValue.toLocaleString()}
            </div>
          </div>

          {/* Daily P&L */}
          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.micro,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Daily P&L
            </div>
            <div style={{
              fontSize: ds.typography.scale.xlarge,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              color: portfolioMetrics.totalPnL >= 0 ? ds.colors.semantic.buy : ds.colors.semantic.sell,
              lineHeight: ds.typography.lineHeights.data,
            }}>
              {portfolioMetrics.totalPnL >= 0 ? '+' : ''}${portfolioMetrics.totalPnL.toLocaleString()}
              <span style={{
                fontSize: ds.typography.scale.medium,
                marginLeft: ds.spacing.small,
              }}>
                ({portfolioMetrics.totalPnLPercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Available Balance */}
          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.micro,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Available
            </div>
            <div style={{
              fontSize: ds.typography.scale.xlarge,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              lineHeight: ds.typography.lineHeights.data,
            }}>
              ${portfolioMetrics.availableBalance.toLocaleString()}
            </div>
          </div>

          {/* Margin Used */}
          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.micro,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Margin Used
            </div>
            <div style={{
              fontSize: ds.typography.scale.xlarge,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              lineHeight: ds.typography.lineHeights.data,
            }}>
              ${portfolioMetrics.marginUsed.toLocaleString()}
            </div>
          </div>

          {/* Account Health */}
          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.micro,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Account Health
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: ds.spacing.small,
            }}>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: ds.colors.grayscale[20],
                borderRadius: ds.interactive.radius.pill,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(portfolioMetrics.availableBalance / accountBalance) * 100}%`,
                  height: '100%',
                  backgroundColor: ds.colors.semantic.success,
                  transition: designHelpers.animate('width', ds.animation.durations.normal),
                }} />
              </div>
              <span style={{
                fontSize: ds.typography.scale.small,
                fontWeight: ds.typography.weights.medium,
              }}>
                {((portfolioMetrics.availableBalance / accountBalance) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Trading Grid */}
      <main style={{
        maxWidth: ds.grid.maxWidth,
        margin: '0 auto',
        padding: ds.spacing.large,
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gridTemplateRows: 'auto 1fr auto',
        gap: ds.spacing.large,
        minHeight: 'calc(100vh - 120px)',
      }}>
        {/* Market Selector & Info Bar */}
        <div style={{
          gridColumn: '1 / -1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: ds.spacing.medium,
          backgroundColor: ds.colors.semantic.background.secondary,
          borderRadius: ds.interactive.radius.medium,
        }}>
          {/* Symbol Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: ds.spacing.medium }}>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              style={{
                backgroundColor: ds.colors.semantic.background.tertiary,
                color: ds.colors.grayscale[90],
                border: `1px solid ${ds.colors.grayscale[30]}`,
                borderRadius: ds.interactive.radius.medium,
                padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                fontSize: ds.typography.scale.base,
                fontWeight: ds.typography.weights.medium,
                cursor: 'pointer',
                transition: designHelpers.animate('all', ds.animation.durations.fast),
              }}
            >
              <option value="BTC/USD">BTC/USD</option>
              <option value="ETH/USD">ETH/USD</option>
              <option value="SOL/USD">SOL/USD</option>
            </select>

            {marketData && (
              <div style={{ display: 'flex', gap: ds.spacing.xlarge }}>
                {/* Last Price */}
                <div>
                  <span style={{
                    fontSize: ds.typography.scale.small,
                    color: ds.colors.grayscale[70],
                    marginRight: ds.spacing.small,
                  }}>Last</span>
                  <span style={{
                    fontSize: ds.typography.scale.large,
                    fontWeight: ds.typography.weights.semibold,
                    fontFamily: ds.typography.families.data,
                  }}>
                    ${marketData.last.toLocaleString()}
                  </span>
                </div>

                {/* 24h Change */}
                <div>
                  <span style={{
                    fontSize: ds.typography.scale.small,
                    color: ds.colors.grayscale[70],
                    marginRight: ds.spacing.small,
                  }}>24h</span>
                  <span style={{
                    fontSize: ds.typography.scale.large,
                    fontWeight: ds.typography.weights.semibold,
                    color: marketData.change24h >= 0 ? ds.colors.semantic.buy : ds.colors.semantic.sell,
                  }}>
                    {marketData.change24h >= 0 ? '+' : ''}{marketData.change24h.toFixed(2)}%
                  </span>
                </div>

                {/* Volume */}
                <div>
                  <span style={{
                    fontSize: ds.typography.scale.small,
                    color: ds.colors.grayscale[70],
                    marginRight: ds.spacing.small,
                  }}>Vol</span>
                  <span style={{
                    fontSize: ds.typography.scale.large,
                    fontWeight: ds.typography.weights.medium,
                    fontFamily: ds.typography.families.data,
                  }}>
                    {marketData.volume24h.toLocaleString()}
                  </span>
                </div>

                {/* Spread */}
                <div>
                  <span style={{
                    fontSize: ds.typography.scale.small,
                    color: ds.colors.grayscale[70],
                    marginRight: ds.spacing.small,
                  }}>Spread</span>
                  <span style={{
                    fontSize: ds.typography.scale.large,
                    fontWeight: ds.typography.weights.medium,
                    fontFamily: ds.typography.families.data,
                  }}>
                    ${(marketData.ask - marketData.bid).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: ds.spacing.small }}>
            <button style={{
              backgroundColor: ds.colors.semantic.background.tertiary,
              color: ds.colors.grayscale[90],
              border: `1px solid ${ds.colors.grayscale[30]}`,
              borderRadius: ds.interactive.radius.medium,
              padding: `${ds.spacing.small} ${ds.spacing.medium}`,
              fontSize: ds.typography.scale.small,
              fontWeight: ds.typography.weights.medium,
              cursor: 'pointer',
              transition: designHelpers.animate('all', ds.animation.durations.fast),
            }}>
              Watchlist
            </button>
            <button style={{
              backgroundColor: ds.colors.semantic.background.tertiary,
              color: ds.colors.grayscale[90],
              border: `1px solid ${ds.colors.grayscale[30]}`,
              borderRadius: ds.interactive.radius.medium,
              padding: `${ds.spacing.small} ${ds.spacing.medium}`,
              fontSize: ds.typography.scale.small,
              fontWeight: ds.typography.weights.medium,
              cursor: 'pointer',
              transition: designHelpers.animate('all', ds.animation.durations.fast),
            }}>
              Alerts
            </button>
          </div>
        </div>

        {/* Chart & Market Depth */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: ds.spacing.large,
        }}>
          {/* Price Chart */}
          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            height: '500px',
          }}>
            <PriceChart symbol={selectedSymbol} />
          </div>

          {/* Market Depth */}
          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            flex: 1,
          }}>
            <MarketDepth symbol={selectedSymbol} />
          </div>
        </div>

        {/* Order Form & Order Book */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: ds.spacing.large,
        }}>
          {/* Order Form */}
          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
          }}>
            <OrderForm
              symbol={selectedSymbol}
              marketData={marketData}
              availableBalance={portfolioMetrics.availableBalance}
            />
          </div>

          {/* Order Book */}
          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            flex: 1,
          }}>
            <OrderBook symbol={selectedSymbol} />
          </div>
        </div>

        {/* Bottom Section - Positions & Orders */}
        <div style={{
          gridColumn: '1 / -1',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: ds.spacing.large,
        }}>
          {/* Open Positions */}
          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
          }}>
            <h3 style={{
              fontSize: ds.typography.scale.medium,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.medium,
            }}>
              Open Positions
            </h3>
            <PositionsTable positions={positions} />
          </div>

          {/* Trade History */}
          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
          }}>
            <h3 style={{
              fontSize: ds.typography.scale.medium,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.medium,
            }}>
              Recent Trades
            </h3>
            <TradeHistory trades={trades} />
          </div>
        </div>
      </main>

      {/* Risk Calculator Modal - Can be toggled */}
      <RiskCalculator
        accountBalance={portfolioMetrics.availableBalance}
        symbol={selectedSymbol}
      />
    </div>
  )
}