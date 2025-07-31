/**
 * Control Center - Real Trading Dashboard
 * 
 * Updated to use real Kraken API data for portfolio monitoring
 */

'use client'

import React, { useState, useEffect } from 'react'
import { swissTrading, layout, typography } from '@/lib/design/SwissTradingDesignSystem'
import { usePortfolioData } from '@/app/hooks/usePortfolioData'

// Hero P&L Display Component
const HeroPnLDisplay: React.FC<{
  portfolioValue: number
  dailyPnL: number
  dailyPnLPercent: number
  tradingMode: string
}> = ({ portfolioValue, dailyPnL, dailyPnLPercent, tradingMode }) => (
  <div style={{
    ...layout.flex.between,
    alignItems: 'flex-end',
    marginBottom: swissTrading.spacing.xxl,
    padding: swissTrading.spacing.xl,
    backgroundColor: swissTrading.colors.surface.elevated,
    borderRadius: swissTrading.radii.md,
    border: `1px solid ${swissTrading.colors.surface.border}`
  }}>
    {/* Portfolio Value */}
    <div>
      <div style={{
        fontSize: swissTrading.typography.scale.critical,
        fontFamily: swissTrading.typography.fonts.data,
        fontWeight: swissTrading.typography.weights.light,
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

    {/* Daily P&L */}
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

    {/* Trading Mode Indicator */}
    <div style={{ textAlign: 'right' }}>
      <div style={{
        fontSize: swissTrading.typography.scale.body,
        color: swissTrading.colors.text.muted,
        fontFamily: swissTrading.typography.fonts.interface,
        marginBottom: swissTrading.spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        Trading Mode
      </div>
      <div style={{
        padding: `${swissTrading.spacing.xs} ${swissTrading.spacing.sm}`,
        backgroundColor: tradingMode === 'PAPER' 
          ? swissTrading.colors.semantic.info 
          : tradingMode === 'STAGING'
          ? swissTrading.colors.trading.warning
          : swissTrading.colors.trading.critical,
        color: swissTrading.colors.text.inverse,
        borderRadius: swissTrading.radii.sm,
        fontSize: swissTrading.typography.scale.metadata,
        fontFamily: swissTrading.typography.fonts.interface,
        fontWeight: swissTrading.typography.weights.semibold,
        textTransform: 'uppercase',
        letterSpacing: '0.1em'
      }}>
        {tradingMode}
      </div>
    </div>
  </div>
)

// Balance Table Component
const BalanceTable: React.FC<{ balances: any[] }> = ({ balances }) => (
  <div style={{
    backgroundColor: swissTrading.colors.surface.elevated,
    borderRadius: swissTrading.radii.md,
    border: `1px solid ${swissTrading.colors.surface.border}`,
    overflow: 'hidden'
  }}>
    <div style={{
      padding: swissTrading.spacing.lg,
      borderBottom: `1px solid ${swissTrading.colors.surface.border}`,
      backgroundColor: swissTrading.colors.surface.card
    }}>
      <h3 style={{
        fontSize: swissTrading.typography.scale.secondary,
        fontFamily: swissTrading.typography.fonts.interface,
        fontWeight: swissTrading.typography.weights.semibold,
        color: swissTrading.colors.text.primary,
        margin: 0
      }}>
        Account Balances
      </h3>
    </div>
    
    <div style={{ padding: swissTrading.spacing.lg }}>
      {balances.length === 0 ? (
        <div style={{
          textAlign: 'center',
          color: swissTrading.colors.text.muted,
          fontStyle: 'italic',
          padding: swissTrading.spacing.xl
        }}>
          No balances available
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{
                textAlign: 'left',
                padding: `${swissTrading.spacing.sm} 0`,
                fontSize: swissTrading.typography.scale.metadata,
                color: swissTrading.colors.text.muted,
                fontFamily: swissTrading.typography.fonts.interface,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: `1px solid ${swissTrading.colors.surface.border}`
              }}>
                Asset
              </th>
              <th style={{
                textAlign: 'right',
                padding: `${swissTrading.spacing.sm} 0`,
                fontSize: swissTrading.typography.scale.metadata,
                color: swissTrading.colors.text.muted,
                fontFamily: swissTrading.typography.fonts.interface,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: `1px solid ${swissTrading.colors.surface.border}`
              }}>
                Balance
              </th>
            </tr>
          </thead>
          <tbody>
            {balances.map((balance, index) => (
              <tr key={balance.asset}>
                <td style={{
                  padding: `${swissTrading.spacing.md} 0`,
                  fontSize: swissTrading.typography.scale.body,
                  color: swissTrading.colors.text.primary,
                  fontFamily: swissTrading.typography.fonts.interface,
                  borderBottom: index < balances.length - 1 ? `1px solid ${swissTrading.colors.surface.border}` : 'none'
                }}>
                  <strong>{balance.name}</strong>
                  <div style={{
                    fontSize: swissTrading.typography.scale.metadata,
                    color: swissTrading.colors.text.muted,
                    marginTop: swissTrading.spacing.xs
                  }}>
                    {balance.asset}
                  </div>
                </td>
                <td style={{
                  textAlign: 'right',
                  padding: `${swissTrading.spacing.md} 0`,
                  fontSize: swissTrading.typography.scale.body,
                  color: swissTrading.colors.text.primary,
                  fontFamily: swissTrading.typography.fonts.data,
                  borderBottom: index < balances.length - 1 ? `1px solid ${swissTrading.colors.surface.border}` : 'none',
                  ...typography.tabular
                }}>
                  {balance.balance.toFixed(8)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
)

// Safety Status Component
const SafetyStatus: React.FC<{ safetyStatus: any; onEmergencyStop: () => void }> = ({ 
  safetyStatus, 
  onEmergencyStop 
}) => (
  <div style={{
    backgroundColor: swissTrading.colors.surface.elevated,
    borderRadius: swissTrading.radii.md,
    border: `1px solid ${swissTrading.colors.surface.border}`,
    overflow: 'hidden'
  }}>
    <div style={{
      padding: swissTrading.spacing.lg,
      borderBottom: `1px solid ${swissTrading.colors.surface.border}`,
      backgroundColor: swissTrading.colors.surface.card
    }}>
      <div style={{ ...layout.flex.between, alignItems: 'center' }}>
        <h3 style={{
          fontSize: swissTrading.typography.scale.secondary,
          fontFamily: swissTrading.typography.fonts.interface,
          fontWeight: swissTrading.typography.weights.semibold,
          color: swissTrading.colors.text.primary,
          margin: 0
        }}>
          Safety Status
        </h3>
        
        <button
          onClick={onEmergencyStop}
          disabled={safetyStatus?.emergencyStopActive}
          style={{
            padding: `${swissTrading.spacing.sm} ${swissTrading.spacing.md}`,
            backgroundColor: safetyStatus?.emergencyStopActive 
              ? swissTrading.colors.text.muted 
              : swissTrading.colors.trading.critical,
            color: swissTrading.colors.text.inverse,
            border: 'none',
            borderRadius: swissTrading.radii.sm,
            fontSize: swissTrading.typography.scale.metadata,
            fontFamily: swissTrading.typography.fonts.interface,
            fontWeight: swissTrading.typography.weights.semibold,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            cursor: safetyStatus?.emergencyStopActive ? 'not-allowed' : 'pointer'
          }}
        >
          {safetyStatus?.emergencyStopActive ? 'STOPPED' : 'EMERGENCY STOP'}
        </button>
      </div>
    </div>
    
    <div style={{ padding: swissTrading.spacing.lg }}>
      {safetyStatus?.riskMetrics?.violations?.length > 0 && (
        <div style={{
          backgroundColor: swissTrading.colors.semantic.error + '20',
          border: `1px solid ${swissTrading.colors.semantic.error}`,
          borderRadius: swissTrading.radii.sm,
          padding: swissTrading.spacing.md,
          marginBottom: swissTrading.spacing.lg
        }}>
          <h4 style={{
            color: swissTrading.colors.semantic.error,
            fontSize: swissTrading.typography.scale.body,
            fontFamily: swissTrading.typography.fonts.interface,
            fontWeight: swissTrading.typography.weights.semibold,
            margin: `0 0 ${swissTrading.spacing.sm} 0`
          }}>
            Risk Violations
          </h4>
          {safetyStatus.riskMetrics.violations.map((violation: string, index: number) => (
            <div key={index} style={{
              color: swissTrading.colors.semantic.error,
              fontSize: swissTrading.typography.scale.metadata,
              fontFamily: swissTrading.typography.fonts.interface,
              marginBottom: swissTrading.spacing.xs
            }}>
              • {violation}
            </div>
          ))}
        </div>
      )}
      
      <div style={{ ...layout.grid({ columns: 2, gap: swissTrading.spacing.lg }) }}>
        <div>
          <div style={{
            fontSize: swissTrading.typography.scale.metadata,
            color: swissTrading.colors.text.muted,
            fontFamily: swissTrading.typography.fonts.interface,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: swissTrading.spacing.xs
          }}>
            Daily P&L
          </div>
          <div style={{
            fontSize: swissTrading.typography.scale.body,
            color: safetyStatus?.riskMetrics?.dailyPnLPct >= 0 
              ? swissTrading.colors.trading.profit 
              : swissTrading.colors.trading.loss,
            fontFamily: swissTrading.typography.fonts.data,
            fontWeight: swissTrading.typography.weights.semibold,
            ...typography.tabular
          }}>
            {safetyStatus?.riskMetrics?.dailyPnLPct?.toFixed(2) || '0.00'}%
          </div>
        </div>
        
        <div>
          <div style={{
            fontSize: swissTrading.typography.scale.metadata,
            color: swissTrading.colors.text.muted,
            fontFamily: swissTrading.typography.fonts.interface,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: swissTrading.spacing.xs
          }}>
            Position Size
          </div>
          <div style={{
            fontSize: swissTrading.typography.scale.body,
            color: swissTrading.colors.text.primary,
            fontFamily: swissTrading.typography.fonts.data,
            fontWeight: swissTrading.typography.weights.semibold,
            ...typography.tabular
          }}>
            {safetyStatus?.riskMetrics?.openPositionsPct?.toFixed(2) || '0.00'}%
          </div>
        </div>
      </div>
    </div>
  </div>
)

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

  // Update last update timestamp when data changes
  useEffect(() => {
    if (portfolioData || safetyStatus) {
      setLastUpdate(new Date())
    }
  }, [portfolioData, safetyStatus])

  const handleEmergencyStop = async () => {
    try {
      await triggerEmergencyStop('Manual emergency stop triggered from Control Center')
      alert('Emergency stop activated successfully')
    } catch (error) {
      alert(`Emergency stop failed: ${error}`)
    }
  }

  if (loading) {
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

  if (error) {
    return (
      <div style={{
        ...layout.container(),
        ...layout.flex.center,
        minHeight: '100vh',
        backgroundColor: swissTrading.colors.surface.background
      }}>
        <div style={{
          textAlign: 'center',
          padding: swissTrading.spacing.xl,
          backgroundColor: swissTrading.colors.surface.elevated,
          borderRadius: swissTrading.radii.md,
          border: `1px solid ${swissTrading.colors.semantic.error}`
        }}>
          <div style={{
            fontSize: swissTrading.typography.scale.secondary,
            color: swissTrading.colors.semantic.error,
            fontFamily: swissTrading.typography.fonts.interface,
            fontWeight: swissTrading.typography.weights.semibold,
            marginBottom: swissTrading.spacing.md
          }}>
            Error Loading Data
          </div>
          <div style={{
            fontSize: swissTrading.typography.scale.body,
            color: swissTrading.colors.text.muted,
            fontFamily: swissTrading.typography.fonts.interface,
            marginBottom: swissTrading.spacing.lg
          }}>
            {error}
          </div>
          <button
            onClick={refresh}
            style={{
              padding: `${swissTrading.spacing.sm} ${swissTrading.spacing.md}`,
              backgroundColor: swissTrading.colors.semantic.info,
              color: swissTrading.colors.text.inverse,
              border: 'none',
              borderRadius: swissTrading.radii.sm,
              fontSize: swissTrading.typography.scale.body,
              fontFamily: swissTrading.typography.fonts.interface,
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const portfolioValue = portfolioData?.totalUSD || 0
  const dailyPnL = safetyStatus?.riskMetrics?.dailyPnL || 0
  const dailyPnLPercent = safetyStatus?.riskMetrics?.dailyPnLPct || 0
  const tradingMode = safetyStatus?.tradingMode || 'PAPER'

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
            color: portfolioData ? swissTrading.colors.trading.profit : swissTrading.colors.text.muted,
            fontFamily: swissTrading.typography.fonts.interface,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            ● {portfolioData ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ paddingTop: '60px' }}>
          {/* Hero P&L Display */}
          <HeroPnLDisplay
            portfolioValue={portfolioValue}
            dailyPnL={dailyPnL}
            dailyPnLPercent={dailyPnLPercent}
            tradingMode={tradingMode}
          />

          {/* Grid Layout */}
          <div style={{ ...layout.grid({ columns: 2, gap: swissTrading.spacing.xl }) }}>
            {/* Left Column */}
            <div>
              <BalanceTable balances={portfolioData?.balances || []} />
            </div>

            {/* Right Column */}
            <div>
              <SafetyStatus safetyStatus={safetyStatus} onEmergencyStop={handleEmergencyStop} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}