'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { TradingSignal } from '@/lib/trading/signals/SignalGenerator'
import { ds } from '@/lib/design/TufteDesignSystem'
import SignalIndicator from './SignalIndicator'
import ExecutionPanel from './ExecutionPanel'
import PerformanceTracker from './PerformanceTracker'

interface Position {
  id: string
  symbol: string
  side: 'long' | 'short'
  size: number
  avgPrice: number
  currentPrice: number
  unrealizedPnl: number
  change: number
}

interface PerformanceData {
  dailyPnL: number
  totalPortfolioValue: number
  openPositions: Position[]
  chartData: number[]
  stats: {
    winRate: number
    bestTrade: number
    worstTrade: number
    totalTrades: number
  }
}

interface SimpleOrder {
  symbol: string
  side: 'buy' | 'sell'
  size: number
  type: 'market'
  riskAmount: number
  signalId: string
}

interface TradingSettings {
  riskProfile: 'conservative' | 'moderate' | 'aggressive'
  autoExecute: boolean
  maxDailyLoss: number
}

interface UnifiedDashboardProps {
  signals: TradingSignal[]
  portfolio: PerformanceData
  settings: TradingSettings
  balance: number
  onAcceptSignal?: (signal: TradingSignal) => Promise<void>
  onDismissSignal?: (signalId: string) => Promise<void>
  onExecuteTrade?: (order: SimpleOrder) => Promise<void>
  onClosePosition?: (positionId: string) => Promise<void>
  onUpdateSettings?: (settings: Partial<TradingSettings>) => Promise<void>
}

interface DashboardState {
  currentSignal: TradingSignal | null
  connectionStatus: 'connected' | 'disconnected' | 'error'
  lastUpdate: Date
  focusMode: boolean
}

export const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({
  signals,
  portfolio,
  settings,
  balance,
  onAcceptSignal,
  onDismissSignal,
  onExecuteTrade,
  onClosePosition,
  onUpdateSettings
}) => {
  const [state, setState] = useState<DashboardState>({
    currentSignal: signals[0] || null,
    connectionStatus: 'connected',
    lastUpdate: new Date(),
    focusMode: false
  })

  // Update current signal when signals change
  useEffect(() => {
    const topSignal = signals.find(s => s.expiresAt > Date.now()) || null
    setState(prev => ({ 
      ...prev, 
      currentSignal: topSignal,
      lastUpdate: new Date()
    }))
  }, [signals])

  // Handle signal acceptance
  const handleAcceptSignal = useCallback(async (signal: TradingSignal) => {
    if (onAcceptSignal) {
      await onAcceptSignal(signal)
    }
    
    // Auto-execute if enabled
    if (settings.autoExecute && onExecuteTrade) {
      const order: SimpleOrder = {
        symbol: signal.symbol,
        side: signal.action.toLowerCase() as 'buy' | 'sell',
        size: 0, // Will be calculated in ExecutionPanel
        type: 'market',
        riskAmount: 0, // Will be calculated in ExecutionPanel
        signalId: signal.id
      }
      await onExecuteTrade(order)
    }
  }, [onAcceptSignal, onExecuteTrade, settings.autoExecute])

  // Handle signal dismissal
  const handleDismissSignal = useCallback(async (signalId: string) => {
    if (onDismissSignal) {
      await onDismissSignal(signalId)
    }
  }, [onDismissSignal])

  // Handle trade execution
  const handleExecuteTrade = useCallback(async (order: SimpleOrder) => {
    if (onExecuteTrade) {
      await onExecuteTrade(order)
    }
  }, [onExecuteTrade])

  // Handle position closing
  const handleClosePosition = useCallback(async (positionId: string) => {
    if (onClosePosition) {
      await onClosePosition(positionId)
    }
  }, [onClosePosition])

  // Connection status indicator
  const ConnectionStatus = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: ds.spacing.sm,
      fontSize: ds.typography.scale.sm,
      color: ds.colors.neutral[600]
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: state.connectionStatus === 'connected' ? ds.colors.semantic.profit :
                        state.connectionStatus === 'disconnected' ? ds.colors.neutral[400] :
                        ds.colors.semantic.loss
      }} />
      <span>
        {state.connectionStatus === 'connected' ? 'Live' : 
         state.connectionStatus === 'disconnected' ? 'Disconnected' : 'Error'}
      </span>
      <span>•</span>
      <span>Updated {state.lastUpdate.toLocaleTimeString()}</span>
    </div>
  )

  // Settings panel
  const SettingsPanel = () => (
    <div style={{
      position: 'absolute',
      top: '60px',
      right: 0,
      backgroundColor: ds.colors.semantic.background,
      border: `1px solid ${ds.colors.semantic.border}`,
      borderRadius: ds.radius.md,
      padding: ds.spacing.lg,
      boxShadow: ds.shadows.subtle,
      zIndex: 1000,
      minWidth: '250px'
    }}>
      <div style={{
        fontSize: ds.typography.scale.base,
        fontWeight: ds.typography.weights.semibold,
        marginBottom: ds.spacing.md,
        color: ds.colors.semantic.text
      }}>
        Trading Settings
      </div>

      <div style={{ marginBottom: ds.spacing.md }}>
        <label style={{
          display: 'block',
          fontSize: ds.typography.scale.sm,
          color: ds.colors.neutral[600],
          marginBottom: ds.spacing.xs
        }}>
          Risk Profile
        </label>
        <select
          value={settings.riskProfile}
          onChange={(e) => onUpdateSettings?.({ 
            riskProfile: e.target.value as TradingSettings['riskProfile'] 
          })}
          style={{
            width: '100%',
            padding: ds.spacing.sm,
            border: `1px solid ${ds.colors.semantic.border}`,
            borderRadius: ds.radius.sm,
            fontSize: ds.typography.scale.sm
          }}
        >
          <option value="conservative">Conservative (1%)</option>
          <option value="moderate">Moderate (2%)</option>
          <option value="aggressive">Aggressive (5%)</option>
        </select>
      </div>

      <div style={{ marginBottom: ds.spacing.md }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: ds.spacing.sm,
          fontSize: ds.typography.scale.sm,
          color: ds.colors.neutral[600],
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={settings.autoExecute}
            onChange={(e) => onUpdateSettings?.({ autoExecute: e.target.checked })}
          />
          Auto-execute accepted signals
        </label>
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: ds.typography.scale.sm,
          color: ds.colors.neutral[600],
          marginBottom: ds.spacing.xs
        }}>
          Max Daily Loss
        </label>
        <input
          type="number"
          value={settings.maxDailyLoss}
          onChange={(e) => onUpdateSettings?.({ maxDailyLoss: Number(e.target.value) })}
          style={{
            width: '100%',
            padding: ds.spacing.sm,
            border: `1px solid ${ds.colors.semantic.border}`,
            borderRadius: ds.radius.sm,
            fontSize: ds.typography.scale.sm
          }}
        />
      </div>
    </div>
  )

  const [showSettings, setShowSettings] = useState(false)

  return (
    <div style={{
      backgroundColor: ds.colors.neutral[25],
      minHeight: '100vh',
      padding: ds.spacing.lg
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: ds.spacing.xl,
        backgroundColor: ds.colors.semantic.background,
        padding: ds.spacing.lg,
        borderRadius: ds.radius.lg,
        border: `1px solid ${ds.colors.semantic.border}`
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: ds.spacing.lg
        }}>
          <div style={{
            fontSize: ds.typography.scale.xl,
            fontWeight: ds.typography.weights.bold,
            color: ds.colors.semantic.text
          }}>
            Trading Dashboard
          </div>
          
          <ConnectionStatus />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: ds.spacing.md,
          position: 'relative'
        }}>
          <button
            onClick={() => setState(prev => ({ ...prev, focusMode: !prev.focusMode }))}
            style={{
              padding: `${ds.spacing.sm} ${ds.spacing.md}`,
              backgroundColor: state.focusMode ? ds.colors.semantic.active : 'transparent',
              border: `1px solid ${ds.colors.semantic.border}`,
              borderRadius: ds.radius.sm,
              fontSize: ds.typography.scale.sm,
              color: state.focusMode ? ds.colors.semantic.background : ds.colors.neutral[600],
              cursor: 'pointer'
            }}
          >
            Focus Mode
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              padding: `${ds.spacing.sm} ${ds.spacing.md}`,
              backgroundColor: 'transparent',
              border: `1px solid ${ds.colors.semantic.border}`,
              borderRadius: ds.radius.sm,
              fontSize: ds.typography.scale.sm,
              color: ds.colors.neutral[600],
              cursor: 'pointer'
            }}
          >
            Settings
          </button>

          {showSettings && <SettingsPanel />}
        </div>
      </header>

      {/* Main Dashboard Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: ds.spacing.xl,
        maxWidth: '1400px',
        margin: '0 auto',
        opacity: state.focusMode ? 0.95 : 1,
        transition: 'opacity 0.3s ease'
      }}>
        {/* Signal Indicator - Top Left */}
        <div style={{
          opacity: state.focusMode && !state.currentSignal ? 0.3 : 1,
          transition: 'opacity 0.3s ease'
        }}>
          <SignalIndicator
            signal={state.currentSignal}
            onAccept={handleAcceptSignal}
            onDismiss={handleDismissSignal}
            showDetails={!state.focusMode}
          />
        </div>

        {/* Performance Tracker - Top Right */}
        <div style={{
          opacity: state.focusMode ? 0.7 : 1,
          transition: 'opacity 0.3s ease'
        }}>
          <PerformanceTracker
            data={portfolio}
            onClosePosition={handleClosePosition}
          />
        </div>

        {/* Execution Panel - Bottom Left */}
        <div style={{
          opacity: state.focusMode && !state.currentSignal ? 0.3 : 1,
          transition: 'opacity 0.3s ease'
        }}>
          <ExecutionPanel
            signal={state.currentSignal}
            balance={balance}
            position={portfolio.openPositions.find(p => p.symbol === state.currentSignal?.symbol)}
            onExecute={handleExecuteTrade}
            riskProfile={settings.riskProfile}
          />
        </div>

        {/* Quick Actions - Bottom Right */}
        <div style={{
          backgroundColor: ds.colors.semantic.background,
          border: `1px solid ${ds.colors.semantic.border}`,
          borderRadius: ds.radius.lg,
          padding: ds.spacing.xl,
          display: 'flex',
          flexDirection: 'column',
          opacity: state.focusMode ? 0.5 : 1,
          transition: 'opacity 0.3s ease'
        }}>
          <div style={{
            fontSize: ds.typography.scale.lg,
            fontWeight: ds.typography.weights.bold,
            color: ds.colors.semantic.text,
            marginBottom: ds.spacing.lg
          }}>
            Quick Actions
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: ds.spacing.md,
            flexGrow: 1
          }}>
            {/* Emergency Stop */}
            <button
              onClick={() => {
                // Close all positions
                portfolio.openPositions.forEach(pos => {
                  handleClosePosition(pos.id)
                })
              }}
              style={{
                padding: ds.spacing.md,
                backgroundColor: ds.colors.semantic.critical,
                border: 'none',
                borderRadius: ds.radius.md,
                color: ds.colors.semantic.background,
                fontSize: ds.typography.scale.base,
                fontWeight: ds.typography.weights.semibold,
                cursor: 'pointer'
              }}
            >
              Emergency Close All
            </button>

            {/* Risk Summary */}
            <div style={{
              backgroundColor: ds.colors.neutral[50],
              padding: ds.spacing.md,
              borderRadius: ds.radius.md,
              flexGrow: 1
            }}>
              <div style={{
                fontSize: ds.typography.scale.sm,
                color: ds.colors.neutral[600],
                marginBottom: ds.spacing.sm
              }}>
                Risk Summary
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: ds.spacing.xs,
                fontSize: ds.typography.scale.sm
              }}>
                <span>Daily P&L:</span>
                <span style={{
                  color: portfolio.dailyPnL >= 0 ? ds.colors.semantic.profit : ds.colors.semantic.loss,
                  fontFamily: ds.typography.families.data
                }}>
                  ${portfolio.dailyPnL.toFixed(2)}
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: ds.spacing.xs,
                fontSize: ds.typography.scale.sm
              }}>
                <span>Max Loss:</span>
                <span style={{
                  color: ds.colors.semantic.loss,
                  fontFamily: ds.typography.families.data
                }}>
                  ${settings.maxDailyLoss.toFixed(2)}
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: ds.typography.scale.sm
              }}>
                <span>Remaining:</span>
                <span style={{
                  color: ds.colors.semantic.text,
                  fontFamily: ds.typography.families.data
                }}>
                  ${(settings.maxDailyLoss + portfolio.dailyPnL).toFixed(2)}
                </span>
              </div>
            </div>

            {/* System Status */}
            <div style={{
              fontSize: ds.typography.scale.xs,
              color: ds.colors.neutral[500],
              textAlign: 'center'
            }}>
              System Status: {state.connectionStatus === 'connected' ? 'All systems operational' : 'Connection issues detected'}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Responsive Breakpoint */}
      <style jsx>{`
        @media (max-width: 768px) {
          .unified-dashboard-grid {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto !important;
          }
        }
      `}</style>
    </div>
  )
}

export default UnifiedDashboard