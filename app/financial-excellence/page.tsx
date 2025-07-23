'use client'

import React from 'react'
import { Box } from '@mui/material'
import { SwissGrid, SwissGridItem, PageSection, MetricsGrid } from '@/components/layout/SwissGrid'
import ZenCard, { InfoCard } from '@/components/layout/ZenCard'
import Typography, { PageTitle } from '@/components/typography/Typography'
import MetricCard from '@/components/visualizations/MetricCard'
import MarketIndicator, { MarketTicker } from '@/components/visualizations/MarketIndicator'
import RiskGauge from '@/components/visualizations/RiskGauge'
import RiskMetrics from '@/components/visualizations/RiskMetrics'
import PortfolioAllocation from '@/components/visualizations/PortfolioAllocation'
import ExecutionAnalytics, { ExecutionTimeline } from '@/components/visualizations/ExecutionAnalytics'
import DataTable from '@/components/visualizations/DataTable'
import { DesignSystem } from '@/lib/design/DesignSystem'
import { DesignSystemDark } from '@/lib/design/DesignSystemDark'
import { useTheme } from '@/contexts/ThemeContext'

// Sample data for demonstration
const marketData = {
  btc: { symbol: 'BTC', name: 'Bitcoin', price: 43250.50, change: 850.25, changePercent: 2.01 },
  eth: { symbol: 'ETH', name: 'Ethereum', price: 2280.75, change: -45.30, changePercent: -1.95 },
  sol: { symbol: 'SOL', name: 'Solana', price: 98.45, change: 3.20, changePercent: 3.36 },
  ada: { symbol: 'ADA', name: 'Cardano', price: 0.5842, change: 0.0123, changePercent: 2.15 },
}

const portfolioMetrics = {
  totalValue: 125430.25,
  dayChange: 2340.15,
  dayChangePercent: 1.87,
  weekChange: -1250.80,
  weekChangePercent: -0.99,
  monthChange: 15230.40,
  monthChangePercent: 13.82,
  sparkline: [120000, 118500, 121000, 119800, 122500, 121000, 123500, 125430.25]
}

const riskMetrics = [
  { name: 'Value at Risk (VaR)', value: 8.5, threshold: 15, unit: '%', description: '95% confidence, 1-day horizon' },
  { name: 'Sharpe Ratio', value: 1.8, threshold: 2.5, description: 'Risk-adjusted returns' },
  { name: 'Max Drawdown', value: 12.3, threshold: 20, unit: '%', description: 'Maximum peak-to-trough decline' },
  { name: 'Beta', value: 1.15, threshold: 1.5, description: 'Market correlation' },
]

const allocations = [
  { symbol: 'BTC', name: 'Bitcoin', value: 50172.10, percentage: 40 },
  { symbol: 'ETH', name: 'Ethereum', value: 37629.08, percentage: 30 },
  { symbol: 'SOL', name: 'Solana', value: 18814.54, percentage: 15 },
  { symbol: 'USDC', name: 'USD Coin', value: 12543.03, percentage: 10 },
  { symbol: 'Others', value: 6271.51, percentage: 5 },
]

const executionStats = {
  totalOrders: 342,
  successRate: 97.8,
  avgExecutionTime: 125,
  avgSlippage: 0.023,
  bestExecution: -0.045,
  worstExecution: 0.082,
  recentExecutions: [96, 98, 97, 99, 95, 98, 97, 98, 96, 99]
}

const recentExecutions = [
  {
    id: '1',
    timestamp: new Date('2024-01-23T10:30:00'),
    symbol: 'BTC/USD',
    side: 'buy' as const,
    quantity: 0.5,
    price: 43200,
    executionPrice: 43208.50,
    executionTime: 89,
    slippage: 0.020
  },
  {
    id: '2',
    timestamp: new Date('2024-01-23T09:45:00'),
    symbol: 'ETH/USD',
    side: 'sell' as const,
    quantity: 5,
    price: 2285.00,
    executionPrice: 2283.80,
    executionTime: 156,
    slippage: -0.052
  },
]

const positions = [
  { symbol: 'BTC/USD', entry: 41500, current: 43250.50, quantity: 1.2, pnl: 2100.60, pnlPercent: 4.22, sparkline: [41500, 42000, 41800, 42500, 43000, 43250.50] },
  { symbol: 'ETH/USD', entry: 2350, current: 2280.75, quantity: 16.5, pnl: -1143.38, pnlPercent: -2.95, sparkline: [2350, 2320, 2300, 2290, 2285, 2280.75] },
  { symbol: 'SOL/USD', entry: 85.20, current: 98.45, quantity: 191, pnl: 2530.75, pnlPercent: 15.54, sparkline: [85.20, 88, 92, 95, 97, 98.45] },
]

export default function FinancialExcellencePage() {
  const { currentTheme } = useTheme()
  const isDarkTheme = currentTheme.name === 'financial-excellence-dark'
  const DS = isDarkTheme ? DesignSystemDark : DesignSystem
  
  return (
    <div className="px-2 sm:px-3 md:px-4 lg:px-5 py-4 min-h-screen w-full" style={{ backgroundColor: DS.colors.background.primary }}>
      <PageSection spacing="md">
        <PageTitle 
          title="Financial Excellence Dashboard"
          subtitle="A demonstration of Tufte, Swiss Design, and Japanese aesthetic principles"
        />

        {/* Market Ticker */}
        <Box sx={{ mb: 4, p: 2, backgroundColor: DS.colors.background.secondary, borderRadius: DS.radius.base }}>
          <MarketTicker items={Object.values(marketData)} />
        </Box>

        {/* Main Metrics */}
        <MetricsGrid>
          <MetricCard
            title="Portfolio Value"
            value={portfolioMetrics.totalValue}
            change={portfolioMetrics.dayChangePercent}
            changeLabel="24h"
            sparklineData={portfolioMetrics.sparkline}
            format={(v) => `$${v.toLocaleString()}`}
          />
          <MetricCard
            title="Day P&L"
            value={portfolioMetrics.dayChange}
            change={portfolioMetrics.dayChangePercent}
            format={(v) => `${v >= 0 ? '+' : ''}$${v.toLocaleString()}`}
          />
          <MetricCard
            title="Week P&L"
            value={portfolioMetrics.weekChange}
            change={portfolioMetrics.weekChangePercent}
            format={(v) => `${v >= 0 ? '+' : ''}$${v.toLocaleString()}`}
          />
          <MetricCard
            title="Month P&L"
            value={portfolioMetrics.monthChange}
            change={portfolioMetrics.monthChangePercent}
            format={(v) => `${v >= 0 ? '+' : ''}$${v.toLocaleString()}`}
          />
        </MetricsGrid>
      </PageSection>

      <PageSection spacing="lg">
        <SwissGrid spacing={24}>
          {/* Portfolio Allocation */}
          <SwissGridItem xs={12} lg={6}>
            <ZenCard title="Portfolio Allocation">
              <PortfolioAllocation
                allocations={allocations}
                total={portfolioMetrics.totalValue}
              />
            </ZenCard>
          </SwissGridItem>

          {/* Risk Overview */}
          <SwissGridItem xs={12} lg={6}>
            <ZenCard>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <RiskMetrics
                  metrics={riskMetrics}
                  overallRisk="medium"
                  riskScore={68}
                />
                <Box sx={{ ml: 4 }}>
                  <RiskGauge value={68} label="Overall Risk Score" />
                </Box>
              </Box>
            </ZenCard>
          </SwissGridItem>
        </SwissGrid>
      </PageSection>

      <PageSection spacing="lg">
        {/* Positions Table */}
        <ZenCard title="Open Positions" subtitle="Real-time position tracking with P&L">
          <DataTable
            columns={[
              { id: 'symbol', label: 'Symbol', width: 120 },
              { id: 'entry', label: 'Entry', align: 'right', format: (v) => `$${v.toLocaleString()}` },
              { id: 'current', label: 'Current', align: 'right', format: (v) => `$${v.toLocaleString()}` },
              { id: 'quantity', label: 'Quantity', align: 'right' },
              { id: 'sparkline', label: 'Trend', align: 'center', sparkline: true, width: 120 },
              { 
                id: 'pnl', 
                label: 'P&L', 
                align: 'right', 
                format: (v) => (
                  <Typography 
                    variant="mono" 
                    sx={{ 
                      color: v >= 0 ? DesignSystem.colors.market.up : DesignSystem.colors.market.down,
                      fontWeight: DesignSystem.typography.primary.weights.medium,
                      marginBottom: 0
                    }}
                  >
                    {v >= 0 ? '+' : ''}${v.toLocaleString()}
                  </Typography>
                )
              },
              { 
                id: 'pnlPercent', 
                label: 'P&L %', 
                align: 'right',
                format: (v) => (
                  <Typography 
                    variant="mono" 
                    sx={{ 
                      color: v >= 0 ? DesignSystem.colors.market.up : DesignSystem.colors.market.down,
                      fontWeight: DesignSystem.typography.primary.weights.medium,
                      marginBottom: 0
                    }}
                  >
                    {v >= 0 ? '+' : ''}{v.toFixed(2)}%
                  </Typography>
                )
              },
            ]}
            data={positions}
          />
        </ZenCard>
      </PageSection>

      <PageSection spacing="lg">
        <SwissGrid spacing={24}>
          {/* Execution Analytics */}
          <SwissGridItem xs={12} lg={6}>
            <ExecutionAnalytics stats={executionStats} timeframe="24H" />
          </SwissGridItem>

          {/* Recent Executions */}
          <SwissGridItem xs={12} lg={6}>
            <ExecutionTimeline executions={recentExecutions} />
          </SwissGridItem>
        </SwissGrid>
      </PageSection>

      <PageSection spacing="lg">
        {/* Market Overview */}
        <ZenCard title="Market Overview" subtitle="Top cryptocurrencies by market cap">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {Object.values(marketData).map((market) => (
              <MarketIndicator
                key={market.symbol}
                {...market}
                sparklineData={[
                  market.price * 0.98,
                  market.price * 0.99,
                  market.price * 0.985,
                  market.price * 1.01,
                  market.price * 0.995,
                  market.price
                ]}
                volume={Math.random() * 1000000000}
                high24h={market.price * 1.05}
                low24h={market.price * 0.95}
              />
            ))}
          </Box>
        </ZenCard>
      </PageSection>
    </div>
  )
}