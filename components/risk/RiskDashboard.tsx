/**
 * Risk Management Dashboard - Design Excellence
 * 
 * Following Tufte's principles for displaying risk data:
 * - Clear visual hierarchy for critical risk metrics
 * - Immediate visibility of danger zones
 * - Comparative displays for risk assessment
 * - Small multiples for portfolio-wide risk view
 */

'use client'

import React, { useState, useEffect } from 'react'
import { ds, layout } from '@/lib/design/TufteDesignSystem'
import { Typography } from '@/components/core/Typography'
import { PrimaryMetricCard, SecondaryMetricCard, StatusCard } from '@/components/core/MetricCard'
import { InlineSparkline } from '@/components/core/Sparkline'

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
    duration: number // days
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
    if (value >= dangerThreshold) return ds.colors.semantic.critical
    if (value >= warningThreshold) return ds.colors.semantic.warning
    return ds.colors.semantic.profit
  }

  const color = getColor()
  
  return (
    <div style={{ 
      padding: ds.spacing.md,
      border: `1px solid ${ds.colors.semantic.border}`,
      borderRadius: ds.radius.md,
      backgroundColor: ds.colors.semantic.surface
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: ds.spacing.sm
      }}>
        <Typography.DataLabel>{label}</Typography.DataLabel>
        <Typography.Body 
          size="sm" 
          style={{ 
            color,
            fontWeight: ds.typography.weights.semibold 
          }}
        >
          {value.toFixed(2)}{unit}
        </Typography.Body>
      </div>
      
      {/* Gauge Bar */}
      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: ds.colors.neutral[100],
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: ds.spacing.sm
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          backgroundColor: color,
          transition: 'width 300ms ease'
        }} />
      </div>
      
      {/* Threshold markers */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography.Body size="sm" muted>
          0{unit}
        </Typography.Body>
        <Typography.Body size="sm" muted>
          {max.toFixed(1)}{unit}
        </Typography.Body>
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
  const cellSize = 40
  
  return (
    <div style={{ overflow: 'auto' }}>
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: `80px repeat(${data.length}, ${cellSize}px)`,
        gap: '1px',
        backgroundColor: ds.colors.semantic.border
      }}>
        {/* Header row */}
        <div />
        {data.map((item, i) => (
          <div 
            key={i}
            style={{
              height: `${cellSize}px`,
              backgroundColor: ds.colors.neutral[50],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: ds.typography.scale.xs,
              fontWeight: ds.typography.weights.medium,
              transform: 'rotate(-45deg)'
            }}
          >
            {item.asset}
          </div>
        ))}
        
        {/* Data rows */}
        {data.map((row, i) => (
          <React.Fragment key={i}>
            <div style={{
              height: `${cellSize}px`,
              backgroundColor: ds.colors.neutral[50],
              display: 'flex',
              alignItems: 'center',
              paddingLeft: ds.spacing.sm,
              fontSize: ds.typography.scale.xs,
              fontWeight: ds.typography.weights.medium
            }}>
              {row.asset}
            </div>
            {row.correlations.map((corr, j) => {
              const intensity = Math.abs(corr)
              const isPositive = corr >= 0
              
              return (
                <div
                  key={j}
                  style={{
                    height: `${cellSize}px`,
                    backgroundColor: i === j ? ds.colors.neutral[200] :
                      isPositive ? 
                        `rgba(5, 150, 105, ${intensity})` :
                        `rgba(220, 38, 38, ${intensity})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: ds.typography.scale.xs,
                    fontWeight: ds.typography.weights.medium,
                    color: intensity > 0.5 ? ds.colors.semantic.background : ds.colors.neutral[900]
                  }}
                >
                  {corr.toFixed(2)}
                </div>
              )
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export const RiskDashboard: React.FC = () => {
  const [riskData, setRiskData] = useState<RiskMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data - replace with actual API calls
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
      <div style={{ ...layout.container(), padding: ds.spacing.xl }}>
        <Typography.Body>Loading risk metrics...</Typography.Body>
      </div>
    )
  }

  // Mock correlation data
  const correlationData = [
    { asset: 'BTC', correlations: [1.00, 0.85, 0.72, 0.68] },
    { asset: 'ETH', correlations: [0.85, 1.00, 0.78, 0.74] },
    { asset: 'ADA', correlations: [0.72, 0.78, 1.00, 0.65] },
    { asset: 'DOT', correlations: [0.68, 0.74, 0.65, 1.00] },
  ]

  return (
    <div style={{
      ...layout.container(),
      backgroundColor: ds.colors.semantic.background,
      minHeight: '100vh',
      padding: `${ds.spacing.xl} ${ds.spacing.lg}`
    }}>
      {/* Header */}
      <header style={{ 
        marginBottom: ds.spacing.xxl,
        borderBottom: `1px solid ${ds.colors.semantic.border}`,
        paddingBottom: ds.spacing.lg
      }}>
        <Typography.DataLabel style={{ fontSize: ds.typography.scale.lg, marginBottom: ds.spacing.md }}>
          Risk Management Dashboard
        </Typography.DataLabel>
        
        <div style={{ display: 'flex', gap: ds.spacing.xl, alignItems: 'center' }}>
          <div>
            <Typography.Body size="sm" muted>Portfolio Value</Typography.Body>
            <Typography.Price value={riskData.portfolioValue} size="lg" />
          </div>
          <div>
            <Typography.Body size="sm" muted>Total Exposure</Typography.Body>
            <Typography.Price value={riskData.totalExposure} size="lg" />
          </div>
          <div>
            <Typography.Body size="sm" muted>Leverage</Typography.Body>
            <Typography.PrimaryMetric 
              value={`${riskData.leverage.toFixed(2)}x`}
            />
          </div>
        </div>
      </header>

      {/* Risk Gauges */}
      <section style={{ marginBottom: ds.spacing.xxl }}>
        <Typography.DataLabel style={{ 
          fontSize: ds.typography.scale.base, 
          marginBottom: ds.spacing.lg 
        }}>
          Risk Limits
        </Typography.DataLabel>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: ds.spacing.lg
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

      {/* Main Risk Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: ds.spacing.xl,
        marginBottom: ds.spacing.xxl
      }}>
        {/* Left Column - Key Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: ds.spacing.lg }}>
          {/* VaR Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: ds.spacing.lg
          }}>
            <SecondaryMetricCard
              title="Daily VaR (95%)"
              value={Math.abs(riskData.valueAtRisk.daily95)}
              unit="USD"
              status="negative"
              compact
            />
            
            <SecondaryMetricCard
              title="Daily VaR (99%)"
              value={Math.abs(riskData.valueAtRisk.daily99)}
              unit="USD"
              status="negative"
              compact
            />
            
            <SecondaryMetricCard
              title="Weekly VaR (95%)"
              value={Math.abs(riskData.valueAtRisk.weekly95)}
              unit="USD"
              status="negative"
              compact
            />
          </div>

          {/* Performance Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: ds.spacing.lg
          }}>
            <SecondaryMetricCard
              title="Sharpe Ratio"
              value={riskData.sharpeRatio.toFixed(2)}
              status="positive"
              compact
            />
            
            <SecondaryMetricCard
              title="Sortino Ratio"
              value={riskData.sortinoRatio.toFixed(2)}
              status="positive"
              compact
            />
            
            <SecondaryMetricCard
              title="Beta"
              value={riskData.beta.toFixed(2)}
              status="neutral"
              compact
            />
            
            <SecondaryMetricCard
              title="Portfolio Vol"
              value={riskData.volatilityMetrics.portfolioVol.toFixed(1)}
              unit="%"
              status="neutral"
              compact
            />
          </div>

          {/* Position Concentrations */}
          <div style={{
            padding: ds.spacing.lg,
            border: `1px solid ${ds.colors.semantic.border}`,
            borderRadius: ds.radius.md,
            backgroundColor: ds.colors.semantic.surface
          }}>
            <Typography.DataLabel style={{ marginBottom: ds.spacing.lg }}>
              Position Concentrations
            </Typography.DataLabel>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: ds.spacing.md }}>
              {riskData.positionSizes.map((position, index) => (
                <div 
                  key={index}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: ds.spacing.sm,
                    borderBottom: index < riskData.positionSizes.length - 1 ? 
                      `1px solid ${ds.colors.semantic.border}` : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: ds.spacing.sm }}>
                    <Typography.InlineCode>{position.symbol}</Typography.InlineCode>
                    <Typography.StatusText 
                      status={
                        position.risk === 'high' ? 'critical' : 
                        position.risk === 'medium' ? 'warning' : 'success'
                      }
                    >
                      {position.risk.toUpperCase()}
                    </Typography.StatusText>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <Typography.Price value={position.exposure} size="sm" />
                    <Typography.Body size="sm" muted>
                      {position.percentage.toFixed(1)}%
                    </Typography.Body>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Risk Alerts & Analysis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: ds.spacing.lg }}>
          {/* Risk Status */}
          <StatusCard
            title="Overall Risk Level"
            status={riskData.drawdown.current > -5 ? 'success' : 'warning'}
            message={`Current drawdown: ${riskData.drawdown.current}%`}
            details={`Max historical: ${riskData.drawdown.maximum}% | Duration: ${riskData.drawdown.duration} days`}
          />

          {/* Volatility Trend */}
          <div style={{
            padding: ds.spacing.lg,
            border: `1px solid ${ds.colors.semantic.border}`,
            borderRadius: ds.radius.md,
            backgroundColor: ds.colors.semantic.surface
          }}>
            <Typography.DataLabel style={{ marginBottom: ds.spacing.md }}>
              Volatility Trend
            </Typography.DataLabel>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: ds.spacing.md,
              marginBottom: ds.spacing.md
            }}>
              <Typography.PrimaryMetric 
                value={`${riskData.volatilityMetrics.portfolioVol}%`}
                label="Current"
              />
              <InlineSparkline data={riskData.volatilityMetrics.volHistory} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <Typography.Body size="sm" muted>Realized</Typography.Body>
                <Typography.Body size="sm">{riskData.volatilityMetrics.realizedVol}%</Typography.Body>
              </div>
              <div>
                <Typography.Body size="sm" muted>Implied</Typography.Body>
                <Typography.Body size="sm">{riskData.volatilityMetrics.impliedVol}%</Typography.Body>
              </div>
            </div>
          </div>

          {/* Correlation Analysis */}
          <div style={{
            padding: ds.spacing.lg,
            border: `1px solid ${ds.colors.semantic.border}`,
            borderRadius: ds.radius.md,
            backgroundColor: ds.colors.semantic.surface
          }}>
            <Typography.DataLabel style={{ marginBottom: ds.spacing.md }}>
              Asset Correlations
            </Typography.DataLabel>
            
            <CorrelationMatrix data={correlationData} />
            
            <div style={{ 
              marginTop: ds.spacing.md,
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <div>
                <Typography.Body size="sm" muted>Market Beta</Typography.Body>
                <Typography.Body size="sm">{riskData.beta.toFixed(2)}</Typography.Body>
              </div>
              <div>
                <Typography.Body size="sm" muted>BTC Correlation</Typography.Body>
                <Typography.Body size="sm">{riskData.correlation.btc.toFixed(2)}</Typography.Body>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RiskDashboard