/**
 * Trading Dashboard - Redesigned with Design Excellence
 * 
 * Following principles from:
 * - Edward Tufte: Maximum data-ink ratio, clear information hierarchy
 * - Swiss Design: Grid-based layout, systematic typography
 * - Japanese Aesthetics: Ma (negative space), functional simplicity
 * - Ellen Lupton: Clear typographic hierarchy
 */

'use client'

import React, { useState, useEffect } from 'react'
import { ds, layout } from '@/lib/design/TufteDesignSystem'
import { Typography } from '@/components/core/Typography'
import { PrimaryMetricCard, SecondaryMetricCard, StatusCard, ChartCard } from '@/components/core/MetricCard'
import { DataTable, TradesTable, PositionsTable } from '@/components/core/DataTable'
import { PriceSparkline } from '@/components/core/Sparkline'

interface DashboardData {
  portfolioValue: number
  dailyPnL: number
  positions: Array<{
    symbol: string
    side: 'long' | 'short'
    size: number
    avgPrice: number
    currentPrice: number
    unrealizedPnl: number
    change: number
    priceHistory: number[]
  }>
  recentTrades: Array<{
    symbol: string
    side: 'buy' | 'sell'
    quantity: number
    price: number
    timestamp: string
    pnl?: number
  }>
  marketData: {
    [symbol: string]: {
      price: number
      change: number
      volume: number
      priceHistory: number[]
    }
  }
  riskMetrics: {
    maxDrawdown: number
    sharpeRatio: number
    var95: number
    leverageRatio: number
  }
  systemStatus: {
    tradingEnabled: boolean
    circuitBreakerStatus: 'closed' | 'open' | 'half_open'
    lastUpdate: string
  }
}

export const TradingDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1d' | '7d' | '30d'>('1d')

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // TODO: Replace with actual API calls
        const mockData: DashboardData = {
          portfolioValue: 125430.50,
          dailyPnL: 2340.75,
          positions: [
            {
              symbol: 'BTC/USD',
              side: 'long',
              size: 0.5,
              avgPrice: 43250.00,
              currentPrice: 44100.00,
              unrealizedPnl: 425.00,
              change: 1.97,
              priceHistory: [43250, 43400, 43800, 44200, 44100, 44300, 44100]
            },
            {
              symbol: 'ETH/USD',
              side: 'short',
              size: 2.0,
              avgPrice: 2650.00,
              currentPrice: 2580.00,
              unrealizedPnl: 140.00,
              change: -2.64,
              priceHistory: [2650, 2620, 2580, 2590, 2580, 2570, 2580]
            }
          ],
          recentTrades: [
            {
              symbol: 'BTC/USD',
              side: 'buy',
              quantity: 0.1,
              price: 44100.00,
              timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
              pnl: 45.00
            },
            {
              symbol: 'ETH/USD',
              side: 'sell',
              quantity: 0.5,
              price: 2580.00,
              timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
              pnl: -25.50
            }
          ],
          marketData: {
            'BTC/USD': {
              price: 44100.00,
              change: 1.97,
              volume: 15420000,
              priceHistory: [43000, 43500, 44000, 44500, 44100, 44300, 44100]
            },
            'ETH/USD': {
              price: 2580.00,
              change: -2.64,
              volume: 8750000,
              priceHistory: [2650, 2620, 2580, 2590, 2580, 2570, 2580]
            }
          },
          riskMetrics: {
            maxDrawdown: -5.2,
            sharpeRatio: 1.85,
            var95: -2450.00,
            leverageRatio: 1.2
          },
          systemStatus: {
            tradingEnabled: true,
            circuitBreakerStatus: 'closed',
            lastUpdate: new Date().toISOString()
          }
        }

        setData(mockData)
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  if (loading || !data) {
    return (
      <div style={{
        ...layout.container(),
        padding: ds.spacing.xl,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Typography.Body>Loading dashboard...</Typography.Body>
      </div>
    )
  }

  return (
    <div style={{
      ...layout.container(),
      backgroundColor: ds.colors.semantic.background,
      minHeight: '100vh',
      padding: `${ds.spacing.xl} ${ds.spacing.lg}`
    }}>
      {/* Dashboard Header */}
      <header style={{ 
        marginBottom: ds.spacing.xxl,
        borderBottom: `1px solid ${ds.colors.semantic.border}`,
        paddingBottom: ds.spacing.lg
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-end',
          marginBottom: ds.spacing.md
        }}>
          <div>
            <Typography.CriticalMetric value={data.portfolioValue} />
            <Typography.Body size="sm" muted style={{ marginTop: ds.spacing.xs }}>
              Total Portfolio Value
            </Typography.Body>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <Typography.Price 
              value={data.dailyPnL} 
              change={(data.dailyPnL / (data.portfolioValue - data.dailyPnL)) * 100}
              size="lg"
            />
            <Typography.Body size="sm" muted style={{ marginTop: ds.spacing.xs }}>
              Today's P&L
            </Typography.Body>
          </div>
        </div>

        {/* System Status */}
        <div style={{ display: 'flex', gap: ds.spacing.lg, alignItems: 'center' }}>
          <Typography.StatusText 
            status={data.systemStatus.tradingEnabled ? 'success' : 'critical'}
          >
            Trading {data.systemStatus.tradingEnabled ? 'Active' : 'Disabled'}
          </Typography.StatusText>
          
          <Typography.StatusText 
            status={data.systemStatus.circuitBreakerStatus === 'closed' ? 'success' : 'warning'}
          >
            Circuit Breaker: {data.systemStatus.circuitBreakerStatus.replace('_', ' ').toUpperCase()}
          </Typography.StatusText>
          
          <Typography.Timestamp 
            date={data.systemStatus.lastUpdate} 
            format="relative"
          />
        </div>
      </header>

      {/* Main Dashboard Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: ds.spacing.xl,
        marginBottom: ds.spacing.xxl
      }}>
        {/* Left Column - Primary Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: ds.spacing.lg }}>
          {/* Key Metrics Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: ds.spacing.lg
          }}>
            <SecondaryMetricCard
              title="Unrealized P&L"
              value={data.positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0)}
              unit="USD"
              change={2.34}
              compact
            />
            
            <SecondaryMetricCard
              title="Open Positions"
              value={data.positions.length}
              change={0}
              compact
            />
            
            <SecondaryMetricCard
              title="Today's Trades"
              value={data.recentTrades.length}
              change={15.4}
              compact
            />
          </div>

          {/* Positions Table */}
          <ChartCard
            title="Open Positions"
            subtitle={`${data.positions.length} active positions`}
          >
            <PositionsTable 
              positions={data.positions}
              onPositionClick={(position) => {
                console.log('Position clicked:', position)
              }}
            />
          </ChartCard>
        </div>

        {/* Right Column - Risk & Market Data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: ds.spacing.lg }}>
          {/* Risk Metrics */}
          <StatusCard
            title="Risk Management"
            status={data.riskMetrics.maxDrawdown > -10 ? 'success' : 'warning'}
            message={`Max Drawdown: ${data.riskMetrics.maxDrawdown}%`}
            details={`Sharpe: ${data.riskMetrics.sharpeRatio} | VaR 95%: $${Math.abs(data.riskMetrics.var95).toLocaleString()}`}
          />

          {/* Market Data */}
          <ChartCard
            title="Market Overview"
            subtitle="Major pairs"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: ds.spacing.md }}>
              {Object.entries(data.marketData).map(([symbol, market]) => (
                <div 
                  key={symbol}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: ds.spacing.sm,
                    borderBottom: `1px solid ${ds.colors.semantic.border}`
                  }}
                >
                  <div>
                    <Typography.InlineCode>{symbol}</Typography.InlineCode>
                    <Typography.Price 
                      value={market.price} 
                      change={market.change}
                      size="sm"
                      style={{ marginTop: ds.spacing.xs }}
                    />
                  </div>
                  
                  <PriceSparkline 
                    prices={market.priceHistory}
                    width={60}
                    height={20}
                  />
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Recent Trades Section */}
      <section>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: ds.spacing.lg
        }}>
          <Typography.DataLabel style={{ fontSize: ds.typography.scale.base }}>
            Recent Trades
          </Typography.DataLabel>
          
          {/* Timeframe Selector */}
          <div style={{ 
            display: 'flex', 
            gap: ds.spacing.xs,
            border: `1px solid ${ds.colors.semantic.border}`,
            borderRadius: ds.radius.sm,
            padding: ds.spacing.xs
          }}>
            {(['1d', '7d', '30d'] as const).map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                style={{
                  background: selectedTimeframe === timeframe ? ds.colors.semantic.active : 'transparent',
                  color: selectedTimeframe === timeframe ? ds.colors.semantic.background : ds.colors.neutral[400],
                  border: 'none',
                  padding: `${ds.spacing.xs} ${ds.spacing.sm}`,
                  borderRadius: ds.radius.sm,
                  fontSize: ds.typography.scale.sm,
                  fontWeight: ds.typography.weights.medium,
                  cursor: 'pointer',
                  transition: 'all 150ms ease'
                }}
              >
                {timeframe}
              </button>
            ))}
          </div>
        </div>

        <TradesTable 
          trades={data.recentTrades}
          onTradeClick={(trade) => {
            console.log('Trade clicked:', trade)
          }}
        />
      </section>
    </div>
  )
}

export default TradingDashboard