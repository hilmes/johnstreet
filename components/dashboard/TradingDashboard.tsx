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
  recentSignals: Array<{
    id: string
    symbol: string
    action: 'BUY' | 'SELL'
    strength: number
    timestamp: string
    status: 'active' | 'expired' | 'executed'
  }>
  performanceChart: Array<{
    time: string
    value: number
  }>
  alerts: Array<{
    id: string
    type: 'info' | 'warning' | 'error' | 'success'
    message: string
    timestamp: string
  }>
}

export const TradingDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1d' | '7d' | '30d'>('1d')

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch data from API
        const response = await fetch(`/api/dashboard?timeframe=${selectedTimeframe}`)
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        const data: DashboardData = await response.json()
        setDashboardData(data)
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [selectedTimeframe])

  if (loading || !dashboardData) {
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
      backgroundColor: ds.colors.semantic.background,
      minHeight: '100vh',
      padding: `${ds.spacing.xl} ${ds.spacing.lg}`,
      maxWidth: ds.grid.maxWidth,
      margin: '0 auto'
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
            <Typography.CriticalMetric value={dashboardData.portfolioValue} />
            <Typography.Body size="sm" muted style={{ marginTop: ds.spacing.xs }}>
              Total Portfolio Value
            </Typography.Body>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <Typography.Price 
              value={dashboardData.dailyPnL} 
              change={(dashboardData.dailyPnL / (dashboardData.portfolioValue - dashboardData.dailyPnL)) * 100}
              size="lg"
            />
            <Typography.Body size="sm" muted style={{ marginTop: ds.spacing.xs }}>
              Today's P&L
            </Typography.Body>
          </div>
        </div>

        {/* Recent Alerts */}
        {dashboardData.alerts.length > 0 && (
          <div style={{ display: 'flex', gap: ds.spacing.lg, alignItems: 'center' }}>
            {dashboardData.alerts.slice(0, 2).map((alert) => (
              <Typography.StatusText 
                key={alert.id}
                status={alert.type === 'success' ? 'success' : alert.type === 'error' ? 'critical' : 'warning'}
              >
                {alert.message}
              </Typography.StatusText>
            ))}
          </div>
        )}
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
              value={dashboardData.positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0)}
              unit="USD"
              change={2.34}
              compact
            />
            
            <SecondaryMetricCard
              title="Open Positions"
              value={dashboardData.positions.length}
              change={0}
              compact
            />
            
            <SecondaryMetricCard
              title="Active Signals"
              value={dashboardData.recentSignals.filter(s => s.status === 'active').length}
              change={0}
              compact
            />
          </div>

          {/* Positions Table */}
          <ChartCard
            title="Open Positions"
            subtitle={`${dashboardData.positions.length} active positions`}
          >
            <PositionsTable 
              positions={dashboardData.positions}
              onPositionClick={(position) => {
                console.log('Position clicked:', position)
              }}
            />
          </ChartCard>
        </div>

        {/* Right Column - Signals & Performance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: ds.spacing.lg }}>
          {/* Recent Signals */}
          <ChartCard
            title="Recent Signals"
            subtitle={`${dashboardData.recentSignals.length} signals`}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: ds.spacing.md }}>
              {dashboardData.recentSignals.slice(0, 5).map((signal) => (
                <div 
                  key={signal.id}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: ds.spacing.sm,
                    borderBottom: `1px solid ${ds.colors.semantic.border}`
                  }}
                >
                  <div>
                    <Typography.InlineCode>{signal.symbol}</Typography.InlineCode>
                    <Typography.StatusText 
                      status={signal.action === 'BUY' ? 'success' : 'critical'}
                      style={{ marginTop: ds.spacing.xs }}
                    >
                      {signal.action} • {(signal.strength * 100).toFixed(0)}%
                    </Typography.StatusText>
                  </div>
                  
                  <Typography.Body size="sm" muted>
                    {signal.status}
                  </Typography.Body>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Performance Chart */}
          <ChartCard
            title="Portfolio Performance"
            subtitle={selectedTimeframe}
          >
            <div style={{ height: 200, position: 'relative' }}>
              <PriceSparkline 
                prices={dashboardData.performanceChart.map(p => p.value)}
                width={300}
                height={180}
              />
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Alerts Section */}
      {dashboardData.alerts.length > 0 && (
        <section>
          <Typography.DataLabel style={{ fontSize: ds.typography.scale.base, marginBottom: ds.spacing.lg }}>
            Recent Alerts
          </Typography.DataLabel>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: ds.spacing.sm }}>
            {dashboardData.alerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  padding: ds.spacing.md,
                  backgroundColor: alert.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 
                                 alert.type === 'success' ? 'rgba(34, 197, 94, 0.1)' :
                                 alert.type === 'warning' ? 'rgba(251, 191, 36, 0.1)' :
                                 'rgba(99, 102, 241, 0.1)',
                  border: `1px solid ${alert.type === 'error' ? ds.colors.semantic.critical : 
                                      alert.type === 'success' ? ds.colors.semantic.success :
                                      alert.type === 'warning' ? ds.colors.semantic.warning :
                                      ds.colors.semantic.info}`,
                  borderRadius: ds.radius.sm,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Typography.Body>{alert.message}</Typography.Body>
                <Typography.Timestamp date={alert.timestamp} format="relative" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default TradingDashboard