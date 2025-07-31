/**
 * Control Center - Primary Trading Dashboard
 * 
 * The main hub for portfolio monitoring, risk management, and trading oversight.
 * Implements Swiss design principles with high data density and clear hierarchy.
 * 
 * Key Features:
 * - Real-time portfolio value and P&L
 * - High-density positions table
 * - Risk monitoring with visual gauges
 * - Active signals feed
 * - Quick order execution
 * - Critical alerts banner
 */

'use client'

import React, { useState, useEffect } from 'react'
import { swissTrading, layout, typography } from '@/lib/design/SwissTradingDesignSystem'
import { PositionsWidget, RiskGaugeWidget, SignalsWidget, QuickOrderWidget } from '@/components/widgets/TradingWidgets'
import { usePortfolioData } from '@/app/hooks/usePortfolioData'

// Mock data types
interface PortfolioData {
  totalValue: number
  dailyPnL: number
  dailyPnLPercent: number
  positions: Position[]
  signals: TradingSignal[]
  riskMetrics: RiskMetric[]
  alerts: Alert[]
}

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
}

interface RiskMetric {
  label: string
  value: number
  max: number
  unit: string
  status: 'safe' | 'warning' | 'critical'
}

interface Alert {
  id: string
  type: 'info' | 'warning' | 'critical'
  message: string
  timestamp: string
}

// Hero P&L Display Component
const HeroPnLDisplay: React.FC<{ 
  portfolioValue: number
  dailyPnL: number
  dailyPnLPercent: number
}> = ({ portfolioValue, dailyPnL, dailyPnLPercent }) => (
  <div style={{
    ...layout.flex.between,
    padding: `${swissTrading.spacing.xl} 0`,
    borderBottom: `2px solid ${swissTrading.colors.surface.border}`,
    marginBottom: swissTrading.spacing.xl
  }}>
    <div>
      <div style={{
        fontSize: swissTrading.typography.scale.critical,
        fontFamily: swissTrading.typography.fonts.data,
        fontWeight: swissTrading.typography.weights.bold,
        color: swissTrading.colors.text.primary,
        lineHeight: swissTrading.typography.lineHeights.tight,
        ...typography.tabular
      }}>
        {typography.currency(portfolioValue)}
      </div>
      <div style={{
        fontSize: swissTrading.typography.scale.body,
        color: swissTrading.colors.text.muted,
        fontFamily: swissTrading.typography.fonts.interface,
        marginTop: swissTrading.spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        Total Portfolio Value
      </div>
    </div>
    
    <div style={{ textAlign: 'right' }}>
      <div style={{
        fontSize: swissTrading.typography.scale.primary,
        fontFamily: swissTrading.typography.fonts.data,
        fontWeight: swissTrading.typography.weights.semibold,
        color: dailyPnL >= 0 ? swissTrading.colors.trading.profit : swissTrading.colors.trading.loss,
        lineHeight: swissTrading.typography.lineHeights.tight,
        ...typography.tabular
      }}>
        {dailyPnL >= 0 ? '+' : ''}{typography.currency(dailyPnL)}
      </div>
      <div style={{
        fontSize: swissTrading.typography.scale.secondary,
        fontFamily: swissTrading.typography.fonts.data,
        color: dailyPnL >= 0 ? swissTrading.colors.trading.profit : swissTrading.colors.trading.loss,
        marginTop: swissTrading.spacing.xs,
        ...typography.tabular
      }}>
        {dailyPnLPercent >= 0 ? '+' : ''}{dailyPnLPercent.toFixed(2)}%
      </div>
      <div style={{
        fontSize: swissTrading.typography.scale.body,
        color: swissTrading.colors.text.muted,
        fontFamily: swissTrading.typography.fonts.interface,
        marginTop: swissTrading.spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        Today's P&L
      </div>
    </div>
    
    {/* Risk Level Indicator */}
    <div style={{ textAlign: 'right' }}>
      <div style={{
        fontSize: swissTrading.typography.scale.body,
        color: swissTrading.colors.text.muted,
        fontFamily: swissTrading.typography.fonts.interface,
        marginBottom: swissTrading.spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        Risk Level
      </div>
      <div style={{ display: 'flex', gap: swissTrading.spacing.xs, justifyContent: 'flex-end' }}>
        {[1, 2, 3, 4, 5].map(dot => (
          <div
            key={dot}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: dot <= 2 
                ? swissTrading.colors.trading.profit 
                : swissTrading.colors.surface.border,
              transition: `background-color ${swissTrading.animations.fast}`
            }}
          />
        ))}
      </div>
    </div>
  </div>
)

// Critical Alerts Banner
const AlertsBanner: React.FC<{ alerts: Alert[] }> = ({ alerts }) => {
  if (!alerts.length) return null
  
  const criticalAlerts = alerts.filter(alert => alert.type === 'critical')
  const warningAlerts = alerts.filter(alert => alert.type === 'warning')
  
  return (
    <div style={{
      marginBottom: swissTrading.spacing.xl,
      padding: swissTrading.spacing.lg,
      backgroundColor: criticalAlerts.length > 0 
        ? `${swissTrading.colors.trading.critical}10`
        : `${swissTrading.colors.trading.warning}10`,
      border: `1px solid ${criticalAlerts.length > 0 
        ? swissTrading.colors.trading.critical
        : swissTrading.colors.trading.warning}`,
      borderRadius: swissTrading.radii.md
    }}>
      <div style={{ ...layout.flex.row(swissTrading.spacing.lg) }}>
        {criticalAlerts.map(alert => (
          <div key={alert.id} style={{
            color: swissTrading.colors.trading.critical,
            fontSize: swissTrading.typography.scale.body,
            fontWeight: swissTrading.typography.weights.semibold,
            fontFamily: swissTrading.typography.fonts.interface
          }}>
            🚨 {alert.message}
          </div>
        ))}
        {warningAlerts.slice(0, 2).map(alert => (
          <div key={alert.id} style={{
            color: swissTrading.colors.trading.warning,
            fontSize: swissTrading.typography.scale.body,
            fontFamily: swissTrading.typography.fonts.interface
          }}>
            ⚠️ {alert.message}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ControlCenterPage() {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  
  // Use real portfolio data
  const {
    portfolioData,
    safetyStatus,
    depositHistory,
    loading,
    error,
    refresh,
    triggerEmergencyStop,
    resetEmergencyStop
  } = usePortfolioData(10000) // Refresh every 10 seconds

  // Get mock data for widgets that don't have real data yet
  const getMockPositions = () => [
    const mockData: PortfolioData = {
      totalValue: 1234567.89,
      dailyPnL: 12345.67,
      dailyPnLPercent: 1.02,
      positions: [
        {
          id: '1',
          symbol: 'BTC-USD',
          side: 'long',
          size: 0.5234,
          avgPrice: 67432,
          currentPrice: 68123,
          unrealizedPnl: 361.3,
          unrealizedPnlPercent: 1.02,
          dayChange: 1.8,
          priceHistory: [67400, 67500, 67650, 67800, 68000, 68123]
        },
        {
          id: '2',
          symbol: 'ETH-USD',
          side: 'short',
          size: 2.1847,
          avgPrice: 3567,
          currentPrice: 3445,
          unrealizedPnl: 266.7,
          unrealizedPnlPercent: 3.42,
          dayChange: -2.1,
          priceHistory: [3600, 3580, 3550, 3520, 3480, 3445]
        },
        {
          id: '3',
          symbol: 'SOL-USD',
          side: 'long',
          size: 15.234,
          avgPrice: 124.50,
          currentPrice: 130.25,
          unrealizedPnl: 87.5,
          unrealizedPnlPercent: 4.62,
          dayChange: 4.6,
          priceHistory: [124, 125, 126, 127, 128, 130]
        }
      ],
      signals: [
        {
          id: '1',
          symbol: 'ADA-USD',
          action: 'BUY',
          strength: 87,
          timestamp: '2 min ago',
          status: 'active'
        },
        {
          id: '2',
          symbol: 'MATIC-USD',
          action: 'SELL',
          strength: 72,
          timestamp: '5 min ago',
          status: 'active'
        },
        {
          id: '3',
          symbol: 'LINK-USD',
          action: 'BUY',
          strength: 65,
          timestamp: '8 min ago',
          status: 'executed'
        }
      ],
      riskMetrics: [
        { label: 'Value at Risk', value: 2.1, max: 5, unit: '%', status: 'safe' },
        { label: 'Max Drawdown', value: 0.8, max: 10, unit: '%', status: 'safe' },
        { label: 'Position Concentration', value: 45.2, max: 100, unit: '%', status: 'warning' },
        { label: 'Portfolio Beta', value: 1.23, max: 2, unit: '', status: 'safe' }
      ],
      alerts: [
        {
          id: '1',
          type: 'warning',
          message: 'BTC position approaching stop loss',
          timestamp: '3 min ago'
        }
      ]
    }
    
    setPortfolioData(mockData)
    setLoading(false)
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      setLastUpdate(new Date())
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])
  
  const handleOrderSubmit = (order: any) => {
    console.log('Order submitted:', order)
    // In real implementation, send to trading API
  }
  
  if (loading || !portfolioData) {
    return (
      <div style={{
        ...layout.container(),
        ...layout.flex.center,
        minHeight: '100vh',
        backgroundColor: swissTrading.colors.surface.background
      }}>
        <div style={{
          fontSize: swissTrading.typography.scale.body,
          color: swissTrading.colors.text.muted,
          fontFamily: swissTrading.typography.fonts.interface
        }}>
          Loading Control Center...
        </div>
      </div>
    )
  }
  
  return (
    <div style={{
      backgroundColor: swissTrading.colors.surface.background,
      minHeight: '100vh',
      color: swissTrading.colors.text.primary
    }}>
      <div style={{
        ...layout.container(),
        padding: swissTrading.spacing.xl
      }}>
        {/* Status Bar */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: swissTrading.colors.surface.elevated,
          borderBottom: `1px solid ${swissTrading.colors.surface.border}`,
          padding: `${swissTrading.spacing.sm} ${swissTrading.spacing.xl}`,
          zIndex: 100,
          ...layout.flex.between
        }}>
          <div style={{
            fontSize: swissTrading.typography.scale.metadata,
            color: swissTrading.colors.text.muted,
            fontFamily: swissTrading.typography.fonts.data
          }}>
            Last Update: {lastUpdate.toLocaleTimeString()}
          </div>
          <div style={{
            fontSize: swissTrading.typography.scale.metadata,
            color: swissTrading.colors.trading.profit,
            fontFamily: swissTrading.typography.fonts.interface,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            ● LIVE
          </div>
        </div>
        
        {/* Main Content with top margin for status bar */}
        <div style={{ marginTop: '60px' }}>
          {/* Hero P&L Display */}
          <HeroPnLDisplay 
            portfolioValue={portfolioData.totalValue}
            dailyPnL={portfolioData.dailyPnL}
            dailyPnLPercent={portfolioData.dailyPnLPercent}
          />
          
          {/* Critical Alerts */}
          <AlertsBanner alerts={portfolioData.alerts} />
          
          {/* Main Grid Layout */}
          <div style={{
            ...layout.grid(12, swissTrading.spacing.xl),
            marginBottom: swissTrading.spacing.xl
          }}>
            {/* Left Column - Positions (8 columns) */}
            <div style={{ gridColumn: 'span 8' }}>
              <PositionsWidget positions={portfolioData.positions} />
            </div>
            
            {/* Right Column - Risk & Controls (4 columns) */}
            <div style={{ 
              gridColumn: 'span 4',
              ...layout.flex.col(swissTrading.spacing.xl)
            }}>
              <RiskGaugeWidget metrics={portfolioData.riskMetrics} />
              <QuickOrderWidget onSubmitOrder={handleOrderSubmit} />
            </div>
          </div>
          
          {/* Bottom Row - Signals */}
          <div style={{
            ...layout.grid(12, swissTrading.spacing.xl)
          }}>
            <div style={{ gridColumn: 'span 12' }}>
              <SignalsWidget signals={portfolioData.signals} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}