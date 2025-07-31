'use client'

import React from 'react'

// Design system tokens based on our new vision
const designTokens = {
  colors: {
    profit: '#10B981',
    loss: '#EF4444', 
    neutral: '#9CA3AF',
    warning: '#F59E0B',
    critical: '#DC2626',
    background: '#0A0A0A',
    surface: '#1A1A1A',
    border: '#2A2A2A',
    text: '#E0E0E0',
    textMuted: '#888888'
  },
  typography: {
    critical: '4.236rem',
    primary: '2.618rem', 
    secondary: '1.618rem',
    body: '1rem',
    metadata: '0.618rem'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  grid: {
    columns: 12,
    gutter: 24,
    margin: 48,
    maxWidth: 1440
  }
}

// Mock data for preview
const mockData = {
  portfolioValue: 1234567.89,
  dailyPnL: 12345.67,
  positions: [
    { symbol: 'BTC-USD', side: 'Long', size: 0.5234, avgPrice: 67432, currentPrice: 68123, pnl: 361.3, change: 1.02, sparkline: [67400, 67500, 67800, 68000, 68123] },
    { symbol: 'ETH-USD', side: 'Short', size: 2.1847, avgPrice: 3567, currentPrice: 3445, pnl: 266.7, change: -3.42, sparkline: [3600, 3580, 3520, 3480, 3445] },
    { symbol: 'SOL-USD', side: 'Long', size: 15.234, avgPrice: 124.50, currentPrice: 130.25, pnl: 87.5, change: 4.62, sparkline: [124, 125, 127, 128, 130] }
  ],
  signals: [
    { symbol: 'ADA-USD', action: 'BUY', strength: 87, timestamp: '2 min ago', status: 'active' },
    { symbol: 'MATIC-USD', action: 'SELL', strength: 72, timestamp: '5 min ago', status: 'active' },
    { symbol: 'LINK-USD', action: 'BUY', strength: 65, timestamp: '8 min ago', status: 'executed' }
  ],
  riskMetrics: {
    var: 2.1,
    drawdown: 0.8,
    concentration: 45.2,
    correlation: 0.67
  }
}

// Utility components
const MetricCard = ({ title, value, change, size = 'primary', prefix = '$' }: {
  title: string
  value: number
  change?: number
  size?: 'critical' | 'primary' | 'secondary'
  prefix?: string
}) => (
  <div style={{
    backgroundColor: designTokens.colors.surface,
    border: `1px solid ${designTokens.colors.border}`,
    borderRadius: '8px',
    padding: designTokens.spacing.lg,
    minHeight: size === 'critical' ? '120px' : '80px'
  }}>
    <div style={{
      fontSize: designTokens.typography[size],
      fontFamily: 'IBM Plex Mono, monospace',
      color: designTokens.colors.text,
      fontWeight: 600,
      marginBottom: designTokens.spacing.sm
    }}>
      {prefix}{value.toLocaleString()}
    </div>
    {change !== undefined && (
      <div style={{
        fontSize: designTokens.typography.body,
        color: change >= 0 ? designTokens.colors.profit : designTokens.colors.loss,
        display: 'flex',
        alignItems: 'center',
        gap: designTokens.spacing.sm
      }}>
        {change >= 0 ? '↗' : '↘'} {prefix}{Math.abs(change).toLocaleString()} ({change >= 0 ? '+' : ''}{((change / (value - change)) * 100).toFixed(2)}%)
      </div>
    )}
    <div style={{
      fontSize: designTokens.typography.metadata,
      color: designTokens.colors.textMuted,
      marginTop: designTokens.spacing.xs
    }}>
      {title}
    </div>
  </div>
)

const RiskGauge = ({ label, value, max, suffix = '%' }: {
  label: string
  value: number
  max: number
  suffix?: string
}) => {
  const percentage = (value / max) * 100
  const color = percentage > 80 ? designTokens.colors.critical : 
                percentage > 60 ? designTokens.colors.warning : 
                designTokens.colors.profit
                
  return (
    <div style={{ marginBottom: designTokens.spacing.md }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: designTokens.spacing.xs,
        fontSize: designTokens.typography.metadata,
        color: designTokens.colors.textMuted
      }}>
        <span>{label}</span>
        <span>{value}{suffix}</span>
      </div>
      <div style={{
        width: '100%',
        height: '4px',
        backgroundColor: designTokens.colors.border,
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          backgroundColor: color,
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  )
}

const PositionTable = ({ positions }: { positions: typeof mockData.positions }) => (
  <div style={{
    backgroundColor: designTokens.colors.surface,
    border: `1px solid ${designTokens.colors.border}`,
    borderRadius: '8px',
    padding: designTokens.spacing.lg
  }}>
    <h3 style={{
      fontSize: designTokens.typography.secondary,
      color: designTokens.colors.text,
      margin: `0 0 ${designTokens.spacing.lg} 0`,
      fontWeight: 600
    }}>
      Active Positions
    </h3>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${designTokens.colors.border}` }}>
            {['Symbol', 'Side', 'Size', 'Entry', 'Current', 'P&L', 'Change', 'Trend'].map(header => (
              <th key={header} style={{
                textAlign: 'left',
                padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`,
                fontSize: designTokens.typography.metadata,
                color: designTokens.colors.textMuted,
                fontWeight: 600
              }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map((position, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${designTokens.colors.border}` }}>
              <td style={{ padding: `${designTokens.spacing.md}`, fontWeight: 600, color: designTokens.colors.text }}>
                {position.symbol}
              </td>
              <td style={{ 
                padding: `${designTokens.spacing.md}`,
                color: position.side === 'Long' ? designTokens.colors.profit : designTokens.colors.loss
              }}>
                {position.side}
              </td>
              <td style={{ padding: `${designTokens.spacing.md}`, fontFamily: 'IBM Plex Mono, monospace' }}>
                {position.size}
              </td>
              <td style={{ padding: `${designTokens.spacing.md}`, fontFamily: 'IBM Plex Mono, monospace' }}>
                ${position.avgPrice.toLocaleString()}
              </td>
              <td style={{ padding: `${designTokens.spacing.md}`, fontFamily: 'IBM Plex Mono, monospace' }}>
                ${position.currentPrice.toLocaleString()}
              </td>
              <td style={{ 
                padding: `${designTokens.spacing.md}`,
                color: position.pnl >= 0 ? designTokens.colors.profit : designTokens.colors.loss,
                fontFamily: 'IBM Plex Mono, monospace'
              }}>
                ${position.pnl >= 0 ? '+' : ''}{position.pnl}
              </td>
              <td style={{ 
                padding: `${designTokens.spacing.md}`,
                color: position.change >= 0 ? designTokens.colors.profit : designTokens.colors.loss
              }}>
                {position.change >= 0 ? '+' : ''}{position.change}%
              </td>
              <td style={{ padding: `${designTokens.spacing.md}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                  {position.sparkline.map((value, idx) => {
                    const height = Math.max(2, (value / Math.max(...position.sparkline)) * 20)
                    return (
                      <div
                        key={idx}
                        style={{
                          width: '3px',
                          height: `${height}px`,
                          backgroundColor: position.change >= 0 ? designTokens.colors.profit : designTokens.colors.loss,
                          opacity: 0.8
                        }}
                      />
                    )
                  })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

const SignalCard = ({ signals }: { signals: typeof mockData.signals }) => (
  <div style={{
    backgroundColor: designTokens.colors.surface,
    border: `1px solid ${designTokens.colors.border}`,
    borderRadius: '8px',
    padding: designTokens.spacing.lg,
    height: 'fit-content'
  }}>
    <h3 style={{
      fontSize: designTokens.typography.secondary,
      color: designTokens.colors.text,
      margin: `0 0 ${designTokens.spacing.lg} 0`,
      fontWeight: 600
    }}>
      Active Signals
    </h3>
    {signals.map((signal, i) => (
      <div key={i} style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${designTokens.spacing.md} 0`,
        borderBottom: i < signals.length - 1 ? `1px solid ${designTokens.colors.border}` : 'none'
      }}>
        <div>
          <div style={{ fontWeight: 600, color: designTokens.colors.text }}>
            {signal.symbol} {signal.action}
          </div>
          <div style={{ 
            fontSize: designTokens.typography.metadata,
            color: designTokens.colors.textMuted 
          }}>
            {signal.timestamp}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: designTokens.typography.body,
            fontWeight: 600,
            color: signal.strength > 80 ? designTokens.colors.profit : 
                   signal.strength > 60 ? designTokens.colors.warning : 
                   designTokens.colors.neutral
          }}>
            {signal.strength}%
          </div>
          <div style={{
            fontSize: designTokens.typography.metadata,
            color: signal.status === 'active' ? designTokens.colors.profit : 
                   signal.status === 'executed' ? designTokens.colors.neutral :
                   designTokens.colors.textMuted
          }}>
            {signal.status}
          </div>
        </div>
      </div>
    ))}
  </div>
)

export default function PreviewPage() {
  return (
    <div style={{
      backgroundColor: designTokens.colors.background,
      minHeight: '100vh',
      color: designTokens.colors.text,
      fontFamily: 'IBM Plex Sans, sans-serif'
    }}>
      {/* Navigation Bar */}
      <nav style={{
        borderBottom: `1px solid ${designTokens.colors.border}`,
        padding: `${designTokens.spacing.md} ${designTokens.spacing.xxl}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ 
          fontSize: designTokens.typography.primary,
          fontWeight: 700,
          color: designTokens.colors.text
        }}>
          JohnStreet
        </div>
        <div style={{ display: 'flex', gap: designTokens.spacing.xl }}>
          {['Control', 'Execute', 'Lab', 'Risk', 'Intel'].map((item, i) => (
            <button
              key={item}
              style={{
                background: i === 0 ? designTokens.colors.surface : 'transparent',
                border: `1px solid ${designTokens.colors.border}`,
                color: designTokens.colors.text,
                padding: `${designTokens.spacing.sm} ${designTokens.spacing.lg}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: designTokens.typography.body
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <div style={{
        maxWidth: designTokens.grid.maxWidth,
        margin: '0 auto',
        padding: `${designTokens.spacing.xxl} ${designTokens.spacing.xxl}`
      }}>
        {/* Critical Status Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: designTokens.spacing.xxl,
          padding: `${designTokens.spacing.lg} 0`,
          borderBottom: `1px solid ${designTokens.colors.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.xl }}>
            <div>
              <div style={{
                fontSize: designTokens.typography.critical,
                fontFamily: 'IBM Plex Mono, monospace',
                fontWeight: 600,
                color: designTokens.colors.text
              }}>
                ${mockData.portfolioValue.toLocaleString()}
              </div>
              <div style={{
                fontSize: designTokens.typography.body,
                color: designTokens.colors.textMuted
              }}>
                Total Portfolio Value
              </div>
            </div>
            <div>
              <div style={{
                fontSize: designTokens.typography.primary,
                fontFamily: 'IBM Plex Mono, monospace',
                color: mockData.dailyPnL >= 0 ? designTokens.colors.profit : designTokens.colors.loss,
                fontWeight: 600
              }}>
                {mockData.dailyPnL >= 0 ? '+' : ''}${mockData.dailyPnL.toLocaleString()}
              </div>
              <div style={{
                fontSize: designTokens.typography.body,
                color: designTokens.colors.textMuted
              }}>
                Today's P&L
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.md }}>
            <div style={{ fontSize: designTokens.typography.body, color: designTokens.colors.textMuted }}>
              Risk Level:
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3, 4, 5].map(dot => (
                <div
                  key={dot}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: dot <= 2 ? designTokens.colors.profit : designTokens.colors.border
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: designTokens.spacing.xl,
          marginBottom: designTokens.spacing.xl
        }}>
          {/* Left Column - Positions */}
          <PositionTable positions={mockData.positions} />
          
          {/* Right Column - Risk & Signals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: designTokens.spacing.lg }}>
            {/* Risk Metrics */}
            <div style={{
              backgroundColor: designTokens.colors.surface,
              border: `1px solid ${designTokens.colors.border}`,
              borderRadius: '8px',
              padding: designTokens.spacing.lg
            }}>
              <h3 style={{
                fontSize: designTokens.typography.secondary,
                color: designTokens.colors.text,
                margin: `0 0 ${designTokens.spacing.lg} 0`,
                fontWeight: 600
              }}>
                Risk Metrics
              </h3>
              <RiskGauge label="Value at Risk" value={mockData.riskMetrics.var} max={5} />
              <RiskGauge label="Drawdown" value={mockData.riskMetrics.drawdown} max={10} />
              <RiskGauge label="Concentration" value={mockData.riskMetrics.concentration} max={100} />
              <RiskGauge label="Correlation" value={mockData.riskMetrics.correlation * 100} max={100} />
            </div>
            
            {/* Signals */}
            <SignalCard signals={mockData.signals} />
          </div>
        </div>

        {/* Bottom Notice */}
        <div style={{
          backgroundColor: designTokens.colors.surface,
          border: `2px solid ${designTokens.colors.warning}`,
          borderRadius: '8px',
          padding: designTokens.spacing.lg,
          textAlign: 'center'
        }}>
          <h2 style={{
            color: designTokens.colors.warning,
            margin: `0 0 ${designTokens.spacing.md} 0`,
            fontSize: designTokens.typography.secondary
          }}>
            🚀 Design Preview
          </h2>
          <p style={{
            color: designTokens.colors.text,
            margin: 0,
            fontSize: designTokens.typography.body
          }}>
            This is a preview of the new "Control Center" design - the first view in our redesigned 5-view architecture.
            <br />
            <strong>Key Features:</strong> Swiss design grid • High data density • Real-time updates • Risk-first approach
          </p>
        </div>
      </div>
    </div>
  )
}