'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { TradingSignal } from '@/lib/trading/signals/SignalGenerator'
import { ds } from '@/lib/design/TufteDesignSystem'

interface Position {
  id: string
  symbol: string
  side: 'long' | 'short'
  size: number
  avgPrice: number
  currentPrice: number
  unrealizedPnl: number
}

interface SimpleOrder {
  symbol: string
  side: 'buy' | 'sell'
  size: number
  type: 'market'
  riskAmount: number
  signalId: string
}

interface ExecutionPanelProps {
  signal: TradingSignal | null
  balance: number
  position?: Position
  onExecute: (order: SimpleOrder) => Promise<void>
  riskProfile: 'conservative' | 'moderate' | 'aggressive'
}

interface ExecutionState {
  calculatedSize: number
  riskAmount: number
  isExecuting: boolean
  requiresConfirmation: boolean
  showConfirmation: boolean
}

const RISK_PERCENTAGES = {
  conservative: 0.01, // 1% of balance
  moderate: 0.02,     // 2% of balance
  aggressive: 0.05    // 5% of balance
}

const CONFIRMATION_THRESHOLD = 1000 // Require confirmation for trades > $1000

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({
  signal,
  balance,
  position,
  onExecute,
  riskProfile
}) => {
  const [state, setState] = useState<ExecutionState>({
    calculatedSize: 0,
    riskAmount: 0,
    isExecuting: false,
    requiresConfirmation: false,
    showConfirmation: false
  })

  // Calculate position size based on risk profile
  const { calculatedSize, riskAmount, requiresConfirmation } = useMemo(() => {
    if (!signal) return { calculatedSize: 0, riskAmount: 0, requiresConfirmation: false }

    const riskPercentage = RISK_PERCENTAGES[riskProfile]
    const riskAmount = balance * riskPercentage
    
    // For crypto, assume current price from signal
    const estimatedPrice = signal.source.marketData.price
    const calculatedSize = riskAmount / estimatedPrice
    
    const requiresConfirmation = riskAmount > CONFIRMATION_THRESHOLD

    return { calculatedSize, riskAmount, requiresConfirmation }
  }, [signal, balance, riskProfile])

  // Update state when calculations change
  useEffect(() => {
    setState(prev => ({
      ...prev,
      calculatedSize,
      riskAmount,
      requiresConfirmation
    }))
  }, [calculatedSize, riskAmount, requiresConfirmation])

  const handleExecute = async () => {
    if (!signal) return

    if (requiresConfirmation && !state.showConfirmation) {
      setState(prev => ({ ...prev, showConfirmation: true }))
      return
    }

    setState(prev => ({ ...prev, isExecuting: true }))

    try {
      const order: SimpleOrder = {
        symbol: signal.symbol,
        side: signal.action.toLowerCase() as 'buy' | 'sell',
        size: calculatedSize,
        type: 'market',
        riskAmount,
        signalId: signal.id
      }

      await onExecute(order)
      setState(prev => ({ ...prev, showConfirmation: false }))
    } catch (error) {
      console.error('Failed to execute trade:', error)
    } finally {
      setState(prev => ({ ...prev, isExecuting: false }))
    }
  }

  const handleCancel = () => {
    setState(prev => ({ ...prev, showConfirmation: false }))
  }

  const getActionColor = () => {
    if (!signal) return ds.colors.neutral[400]
    return signal.action === 'BUY' ? ds.colors.semantic.profit : ds.colors.semantic.loss
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatCrypto = (amount: number, symbol: string) => {
    const decimals = amount < 1 ? 6 : 4
    return `${amount.toFixed(decimals)} ${symbol.split('/')[0]}`
  }

  if (!signal) {
    return (
      <div style={{
        backgroundColor: ds.colors.semantic.background,
        border: `1px solid ${ds.colors.semantic.border}`,
        borderRadius: ds.radius.lg,
        padding: ds.spacing.xl,
        textAlign: 'center',
        minHeight: '280px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        color: ds.colors.neutral[500]
      }}>
        <div style={{ fontSize: ds.typography.scale.lg, marginBottom: ds.spacing.md }}>
          No Signal to Execute
        </div>
        <div style={{ fontSize: ds.typography.scale.sm }}>
          Accept a trading signal to enable execution
        </div>
      </div>
    )
  }

  const actionColor = getActionColor()
  const canExecute = balance > riskAmount && !state.isExecuting

  // Confirmation Modal Overlay
  if (state.showConfirmation) {
    return (
      <div style={{
        backgroundColor: ds.colors.semantic.background,
        border: `2px solid ${ds.colors.semantic.warning}`,
        borderRadius: ds.radius.lg,
        padding: ds.spacing.xl,
        minHeight: '280px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: ds.typography.scale.xl,
          fontWeight: ds.typography.weights.bold,
          color: ds.colors.semantic.text,
          marginBottom: ds.spacing.lg
        }}>
          Confirm Trade
        </div>

        <div style={{
          backgroundColor: ds.colors.neutral[50],
          padding: ds.spacing.lg,
          borderRadius: ds.radius.md,
          marginBottom: ds.spacing.lg,
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: ds.spacing.md }}>
            <span>Action:</span>
            <span style={{ fontWeight: ds.typography.weights.semibold, color: actionColor }}>
              {signal.action} {signal.symbol}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: ds.spacing.md }}>
            <span>Size:</span>
            <span style={{ fontFamily: ds.typography.families.data }}>
              {formatCrypto(calculatedSize, signal.symbol)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: ds.spacing.md }}>
            <span>Risk Amount:</span>
            <span style={{ fontFamily: ds.typography.families.data }}>
              {formatCurrency(riskAmount)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Estimated Price:</span>
            <span style={{ fontFamily: ds.typography.families.data }}>
              {formatCurrency(signal.source.marketData.price)}
            </span>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: ds.spacing.md
        }}>
          <button
            onClick={handleCancel}
            style={{
              padding: ds.spacing.md,
              backgroundColor: 'transparent',
              border: `2px solid ${ds.colors.neutral[300]}`,
              borderRadius: ds.radius.md,
              color: ds.colors.neutral[600],
              fontSize: ds.typography.scale.base,
              fontWeight: ds.typography.weights.medium,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleExecute}
            disabled={state.isExecuting}
            style={{
              padding: ds.spacing.md,
              backgroundColor: actionColor,
              border: `2px solid ${actionColor}`,
              borderRadius: ds.radius.md,
              color: ds.colors.semantic.background,
              fontSize: ds.typography.scale.base,
              fontWeight: ds.typography.weights.semibold,
              cursor: state.isExecuting ? 'not-allowed' : 'pointer',
              opacity: state.isExecuting ? 0.7 : 1
            }}
          >
            {state.isExecuting ? 'Executing...' : 'Confirm Trade'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: ds.colors.semantic.background,
      border: `1px solid ${ds.colors.semantic.border}`,
      borderRadius: ds.radius.lg,
      padding: ds.spacing.xl,
      minHeight: '280px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: ds.spacing.lg
      }}>
        <div style={{
          fontSize: ds.typography.scale.lg,
          fontWeight: ds.typography.weights.bold,
          color: ds.colors.semantic.text
        }}>
          Execute Trade
        </div>
        
        <div style={{
          fontSize: ds.typography.scale.sm,
          color: ds.colors.neutral[600],
          backgroundColor: ds.colors.neutral[100],
          padding: `${ds.spacing.xs} ${ds.spacing.sm}`,
          borderRadius: ds.radius.sm
        }}>
          {riskProfile.toUpperCase()}
        </div>
      </div>

      {/* Position Summary */}
      <div style={{
        backgroundColor: ds.colors.neutral[50],
        padding: ds.spacing.md,
        borderRadius: ds.radius.md,
        marginBottom: ds.spacing.lg
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: ds.spacing.md,
          fontSize: ds.typography.scale.sm
        }}>
          <div>
            <div style={{ color: ds.colors.neutral[600] }}>Available Balance</div>
            <div style={{ 
              fontFamily: ds.typography.families.data,
              fontWeight: ds.typography.weights.semibold,
              color: ds.colors.semantic.text
            }}>
              {formatCurrency(balance)}
            </div>
          </div>
          
          <div>
            <div style={{ color: ds.colors.neutral[600] }}>Risk Amount</div>
            <div style={{ 
              fontFamily: ds.typography.families.data,
              fontWeight: ds.typography.weights.semibold,
              color: ds.colors.semantic.text
            }}>
              {formatCurrency(riskAmount)} ({(RISK_PERCENTAGES[riskProfile] * 100).toFixed(1)}%)
            </div>
          </div>
        </div>
      </div>

      {/* Trade Details */}
      <div style={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        textAlign: 'center',
        marginBottom: ds.spacing.lg
      }}>
        <div style={{
          fontSize: ds.typography.scale.xxl,
          fontWeight: ds.typography.weights.bold,
          color: actionColor,
          marginBottom: ds.spacing.md
        }}>
          {signal.action} {signal.symbol}
        </div>
        
        <div style={{
          fontSize: ds.typography.scale.lg,
          fontFamily: ds.typography.families.data,
          color: ds.colors.semantic.text,
          marginBottom: ds.spacing.sm
        }}>
          {formatCrypto(calculatedSize, signal.symbol)}
        </div>
        
        <div style={{
          fontSize: ds.typography.scale.sm,
          color: ds.colors.neutral[600]
        }}>
          Market Order • {formatCurrency(signal.source.marketData.price)}
        </div>
      </div>

      {/* Current Position Warning */}
      {position && (
        <div style={{
          backgroundColor: ds.colors.semantic.warning + '20',
          border: `1px solid ${ds.colors.semantic.warning}`,
          borderRadius: ds.radius.md,
          padding: ds.spacing.md,
          marginBottom: ds.spacing.lg,
          fontSize: ds.typography.scale.sm
        }}>
          <div style={{ fontWeight: ds.typography.weights.semibold, marginBottom: ds.spacing.xs }}>
            Existing Position
          </div>
          <div>
            {position.side.toUpperCase()} {formatCrypto(position.size, position.symbol)} • 
            P&L: {formatCurrency(position.unrealizedPnl)}
          </div>
        </div>
      )}

      {/* Execute Button */}
      <button
        onClick={handleExecute}
        disabled={!canExecute}
        style={{
          width: '100%',
          padding: ds.spacing.lg,
          backgroundColor: canExecute ? actionColor : ds.colors.neutral[300],
          border: 'none',
          borderRadius: ds.radius.md,
          color: canExecute ? ds.colors.semantic.background : ds.colors.neutral[500],
          fontSize: ds.typography.scale.lg,
          fontWeight: ds.typography.weights.bold,
          cursor: canExecute ? 'pointer' : 'not-allowed',
          opacity: state.isExecuting ? 0.7 : 1,
          transition: 'all 0.2s ease',
          transform: state.isExecuting ? 'scale(0.98)' : 'scale(1)'
        }}
        onMouseEnter={(e) => {
          if (canExecute && !state.isExecuting) {
            e.currentTarget.style.transform = 'scale(1.02)'
          }
        }}
        onMouseLeave={(e) => {
          if (!state.isExecuting) {
            e.currentTarget.style.transform = 'scale(1)'
          }
        }}
      >
        {state.isExecuting ? 'Executing Trade...' : 
         !canExecute && balance <= riskAmount ? 'Insufficient Balance' :
         requiresConfirmation ? `Execute ${formatCurrency(riskAmount)} Trade` :
         'Execute Trade Now'}
      </button>

      {/* Disclaimer */}
      <div style={{
        fontSize: ds.typography.scale.xs,
        color: ds.colors.neutral[500],
        textAlign: 'center',
        marginTop: ds.spacing.md
      }}>
        Market orders execute immediately at current market price
      </div>
    </div>
  )
}

export default ExecutionPanel