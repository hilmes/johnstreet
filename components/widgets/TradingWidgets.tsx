/**
 * Trading Widgets - Swiss Design Components
 * 
 * High-density, professional trading widgets following Swiss design principles:
 * - Maximum data density with clarity
 * - Risk-first information hierarchy
 * - Real-time optimized for sub-second updates
 * - Tabular formatting for scannable data
 */

'use client'

import React from 'react'
import { swissTrading, layout, typography } from '@/lib/design/SwissTradingDesignSystem'

// Types for trading data
interface Position {
  id: string
  symbol: string
  side: 'long' | 'short'
  size: number
  avgPrice: number
  currentPrice: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
  dayChange: number
  priceHistory: number[]
}

interface TradingSignal {
  id: string
  symbol: string
  action: 'BUY' | 'SELL'
  strength: number
  timestamp: string
  status: 'active' | 'expired' | 'executed'
  confidence?: number
}

interface RiskMetric {
  label: string
  value: number
  max: number
  unit: string
  status: 'safe' | 'warning' | 'critical'
}

// Utility components
const Sparkline: React.FC<{ data: number[]; width?: number; height?: number; color?: string }> = ({ 
  data, width = 60, height = 20, color 
}) => {
  if (!data.length) return null
  
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(' ')
  
  const strokeColor = color || (data[data.length - 1] >= data[0] 
    ? swissTrading.colors.trading.profit 
    : swissTrading.colors.trading.loss)
  
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        opacity={0.8}
      />
    </svg>
  )
}

// Positions Widget - Dense table view of all positions
export const PositionsWidget: React.FC<{ positions: Position[] }> = ({ positions }) => (
  <div style={layout.card()}>
    <div style={{ ...layout.flex.between, marginBottom: swissTrading.spacing.lg }}>
      <h3 style={{
        margin: 0,
        fontSize: swissTrading.typography.scale.secondary,
        fontWeight: swissTrading.typography.weights.semibold,
        color: swissTrading.colors.text.primary,
        fontFamily: swissTrading.typography.fonts.interface
      }}>
        Active Positions
      </h3>
      <div style={{
        fontSize: swissTrading.typography.scale.body,
        color: swissTrading.colors.text.muted,
        fontFamily: swissTrading.typography.fonts.data
      }}>
        {positions.length} positions
      </div>
    </div>
    
    <div style={{ overflowX: 'auto' }}>
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse',
        fontSize: swissTrading.typography.scale.body,
        fontFamily: swissTrading.typography.fonts.data
      }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${swissTrading.colors.surface.border}` }}>
            {['Symbol', 'Side', 'Size', 'Entry', 'Current', 'P&L', 'Day %', 'Trend'].map(header => (
              <th key={header} style={{
                textAlign: 'left',
                padding: `${swissTrading.spacing.sm} ${swissTrading.spacing.md}`,
                fontSize: swissTrading.typography.scale.metadata,
                color: swissTrading.colors.text.muted,
                fontWeight: swissTrading.typography.weights.semibold,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => (
            <tr 
              key={position.id} 
              style={{ 
                borderBottom: `1px solid ${swissTrading.colors.surface.border}`,
                transition: `background-color ${swissTrading.animations.fast}`,
                ':hover': {
                  backgroundColor: `${swissTrading.colors.surface.overlay}50`
                }
              }}
            >
              <td style={{ 
                padding: `${swissTrading.spacing.md}`, 
                fontWeight: swissTrading.typography.weights.semibold,
                color: swissTrading.colors.text.primary
              }}>
                {position.symbol}
              </td>
              <td style={{ 
                padding: `${swissTrading.spacing.md}`,
                color: position.side === 'long' 
                  ? swissTrading.colors.trading.profit 
                  : swissTrading.colors.trading.loss,
                fontWeight: swissTrading.typography.weights.medium
              }}>
                {position.side.toUpperCase()}
              </td>
              <td style={{ 
                padding: `${swissTrading.spacing.md}`,
                ...typography.tabular,
                color: swissTrading.colors.text.primary
              }}>
                {position.size.toFixed(4)}
              </td>
              <td style={{ 
                padding: `${swissTrading.spacing.md}`,
                ...typography.tabular,
                color: swissTrading.colors.text.secondary
              }}>
                {typography.currency(position.avgPrice)}
              </td>
              <td style={{ 
                padding: `${swissTrading.spacing.md}`,
                ...typography.tabular,
                color: swissTrading.colors.text.primary,
                fontWeight: swissTrading.typography.weights.medium
              }}>
                {typography.currency(position.currentPrice)}
              </td>
              <td style={{ 
                padding: `${swissTrading.spacing.md}`,
                ...typography.tabular,
                color: position.unrealizedPnl >= 0 
                  ? swissTrading.colors.trading.profit 
                  : swissTrading.colors.trading.loss,
                fontWeight: swissTrading.typography.weights.medium
              }}>
                {position.unrealizedPnl >= 0 ? '+' : ''}{typography.currency(position.unrealizedPnl)}
              </td>
              <td style={{ 
                padding: `${swissTrading.spacing.md}`,
                ...typography.tabular,
                color: position.dayChange >= 0 
                  ? swissTrading.colors.trading.profit 
                  : swissTrading.colors.trading.loss,
                fontWeight: swissTrading.typography.weights.medium
              }}>
                {position.dayChange >= 0 ? '+' : ''}{position.dayChange.toFixed(2)}%
              </td>
              <td style={{ padding: `${swissTrading.spacing.md}` }}>
                <Sparkline data={position.priceHistory} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

// Risk Gauge Widget - Visual risk level monitoring
export const RiskGaugeWidget: React.FC<{ metrics: RiskMetric[] }> = ({ metrics }) => (
  <div style={layout.card()}>
    <h3 style={{
      margin: `0 0 ${swissTrading.spacing.lg} 0`,
      fontSize: swissTrading.typography.scale.secondary,
      fontWeight: swissTrading.typography.weights.semibold,
      color: swissTrading.colors.text.primary,
      fontFamily: swissTrading.typography.fonts.interface
    }}>
      Risk Monitor
    </h3>
    
    {metrics.map((metric) => {
      const percentage = (metric.value / metric.max) * 100
      const getStatusColor = () => {
        switch (metric.status) {
          case 'critical': return swissTrading.colors.trading.critical
          case 'warning': return swissTrading.colors.trading.warning
          default: return swissTrading.colors.trading.profit
        }
      }
      
      return (
        <div key={metric.label} style={{ marginBottom: swissTrading.spacing.lg }}>
          <div style={{
            ...layout.flex.between,
            marginBottom: swissTrading.spacing.xs
          }}>
            <span style={{
              fontSize: swissTrading.typography.scale.body,
              color: swissTrading.colors.text.secondary,
              fontFamily: swissTrading.typography.fonts.interface
            }}>
              {metric.label}
            </span>
            <span style={{
              fontSize: swissTrading.typography.scale.body,
              color: swissTrading.colors.text.primary,
              fontFamily: swissTrading.typography.fonts.data,
              fontWeight: swissTrading.typography.weights.medium
            }}>
              {metric.value.toFixed(1)}{metric.unit}
            </span>
          </div>
          
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: swissTrading.colors.surface.border,
            borderRadius: swissTrading.radii.sm,
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(percentage, 100)}%`,
              height: '100%',
              backgroundColor: getStatusColor(),
              transition: `width ${swissTrading.animations.normal}`,
              borderRadius: swissTrading.radii.sm
            }} />
          </div>
        </div>
      )
    })}
  </div>
)

// Signals Widget - Active trading signals
export const SignalsWidget: React.FC<{ signals: TradingSignal[] }> = ({ signals }) => (
  <div style={layout.card()}>
    <div style={{ ...layout.flex.between, marginBottom: swissTrading.spacing.lg }}>
      <h3 style={{
        margin: 0,
        fontSize: swissTrading.typography.scale.secondary,
        fontWeight: swissTrading.typography.weights.semibold,
        color: swissTrading.colors.text.primary,
        fontFamily: swissTrading.typography.fonts.interface
      }}>
        Active Signals
      </h3>
      <div style={{
        fontSize: swissTrading.typography.scale.metadata,
        color: swissTrading.colors.text.muted,
        fontFamily: swissTrading.typography.fonts.data,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {signals.filter(s => s.status === 'active').length} active
      </div>
    </div>
    
    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
      {signals.map((signal) => (
        <div 
          key={signal.id} 
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: `${swissTrading.spacing.md} 0`,
            borderBottom: `1px solid ${swissTrading.colors.surface.border}`,
            ':last-child': {
              borderBottom: 'none'
            }
          }}
        >
          <div>
            <div style={{
              fontWeight: swissTrading.typography.weights.semibold,
              color: swissTrading.colors.text.primary,
              fontFamily: swissTrading.typography.fonts.data,
              marginBottom: swissTrading.spacing.xs
            }}>
              {signal.symbol} {signal.action}
            </div>
            <div style={{
              fontSize: swissTrading.typography.scale.metadata,
              color: swissTrading.colors.text.muted,
              fontFamily: swissTrading.typography.fonts.interface
            }}>
              {signal.timestamp}
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: swissTrading.typography.scale.body,
              fontWeight: swissTrading.typography.weights.semibold,
              color: signal.strength >= 80 
                ? swissTrading.colors.trading.profit
                : signal.strength >= 60 
                ? swissTrading.colors.trading.warning
                : swissTrading.colors.text.secondary,
              fontFamily: swissTrading.typography.fonts.data,
              marginBottom: swissTrading.spacing.xs
            }}>
              {signal.strength}%
            </div>
            <div style={{
              fontSize: swissTrading.typography.scale.metadata,
              color: signal.status === 'active' 
                ? swissTrading.colors.trading.profit
                : signal.status === 'executed'
                ? swissTrading.colors.text.secondary
                : swissTrading.colors.text.muted,
              fontFamily: swissTrading.typography.fonts.interface,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {signal.status}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

// Quick Order Widget - Rapid order entry
export const QuickOrderWidget: React.FC<{ onSubmitOrder?: (order: any) => void }> = ({ onSubmitOrder }) => {
  const [symbol, setSymbol] = React.useState('BTC-USD')
  const [side, setSide] = React.useState<'buy' | 'sell'>('buy')
  const [size, setSize] = React.useState('')
  const [orderType, setOrderType] = React.useState<'market' | 'limit'>('market')
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSubmitOrder) {
      onSubmitOrder({
        symbol,
        side,
        size: parseFloat(size),
        type: orderType,
        timestamp: new Date().toISOString()
      })
    }
    setSize('')
  }
  
  return (
    <div style={layout.card()}>
      <h3 style={{
        margin: `0 0 ${swissTrading.spacing.lg} 0`,
        fontSize: swissTrading.typography.scale.secondary,
        fontWeight: swissTrading.typography.weights.semibold,
        color: swissTrading.colors.text.primary,
        fontFamily: swissTrading.typography.fonts.interface
      }}>
        Quick Order
      </h3>
      
      <form onSubmit={handleSubmit} style={{ ...layout.flex.col(swissTrading.spacing.md) }}>
        <div style={layout.flex.row(swissTrading.spacing.md)}>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            style={{
              flex: 1,
              padding: swissTrading.spacing.sm,
              backgroundColor: swissTrading.colors.surface.background,
              border: `1px solid ${swissTrading.colors.surface.border}`,
              borderRadius: swissTrading.radii.sm,
              color: swissTrading.colors.text.primary,
              fontFamily: swissTrading.typography.fonts.data,
              fontSize: swissTrading.typography.scale.body
            }}
          >
            <option value="BTC-USD">BTC-USD</option>
            <option value="ETH-USD">ETH-USD</option>
            <option value="SOL-USD">SOL-USD</option>
          </select>
          
          <div style={layout.flex.row('0')}>
            <button
              type="button"
              onClick={() => setSide('buy')}
              style={{
                padding: `${swissTrading.spacing.sm} ${swissTrading.spacing.md}`,
                backgroundColor: side === 'buy' 
                  ? swissTrading.colors.trading.profit 
                  : swissTrading.colors.surface.background,
                border: `1px solid ${side === 'buy' 
                  ? swissTrading.colors.trading.profit 
                  : swissTrading.colors.surface.border}`,
                borderTopLeftRadius: swissTrading.radii.sm,
                borderBottomLeftRadius: swissTrading.radii.sm,
                borderRight: 'none',
                color: side === 'buy' 
                  ? swissTrading.colors.text.inverse 
                  : swissTrading.colors.text.primary,
                cursor: 'pointer',
                fontFamily: swissTrading.typography.fonts.interface,
                fontSize: swissTrading.typography.scale.body,
                fontWeight: swissTrading.typography.weights.medium
              }}
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => setSide('sell')}
              style={{
                padding: `${swissTrading.spacing.sm} ${swissTrading.spacing.md}`,
                backgroundColor: side === 'sell' 
                  ? swissTrading.colors.trading.loss 
                  : swissTrading.colors.surface.background,
                border: `1px solid ${side === 'sell' 
                  ? swissTrading.colors.trading.loss 
                  : swissTrading.colors.surface.border}`,
                borderTopRightRadius: swissTrading.radii.sm,
                borderBottomRightRadius: swissTrading.radii.sm,
                color: side === 'sell' 
                  ? swissTrading.colors.text.inverse 
                  : swissTrading.colors.text.primary,
                cursor: 'pointer',
                fontFamily: swissTrading.typography.fonts.interface,
                fontSize: swissTrading.typography.scale.body,
                fontWeight: swissTrading.typography.weights.medium
              }}
            >
              SELL
            </button>
          </div>
        </div>
        
        <input
          type="number"
          placeholder="Size"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          step="0.0001"
          style={{
            padding: swissTrading.spacing.sm,
            backgroundColor: swissTrading.colors.surface.background,
            border: `1px solid ${swissTrading.colors.surface.border}`,
            borderRadius: swissTrading.radii.sm,
            color: swissTrading.colors.text.primary,
            fontFamily: swissTrading.typography.fonts.data,
            fontSize: swissTrading.typography.scale.body
          }}
        />
        
        <button
          type="submit"
          disabled={!size}
          style={{
            padding: swissTrading.spacing.md,
            backgroundColor: side === 'buy' 
              ? swissTrading.colors.trading.profit 
              : swissTrading.colors.trading.loss,
            border: 'none',
            borderRadius: swissTrading.radii.sm,
            color: swissTrading.colors.text.inverse,
            cursor: size ? 'pointer' : 'not-allowed',
            fontFamily: swissTrading.typography.fonts.interface,
            fontSize: swissTrading.typography.scale.body,
            fontWeight: swissTrading.typography.weights.semibold,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            opacity: size ? 1 : 0.5,
            transition: `all ${swissTrading.animations.fast}`
          }}
        >
          {side.toUpperCase()} {symbol}
        </button>
      </form>
    </div>
  )
}

export default {
  PositionsWidget,
  RiskGaugeWidget,
  SignalsWidget,
  QuickOrderWidget
}