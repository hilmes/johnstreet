'use client'

import React, { useState, useEffect } from 'react'
import { TradingSignal } from '@/lib/trading/signals/SignalGenerator'
import { ds } from '@/lib/design/TufteDesignSystem'

interface SignalIndicatorProps {
  signal: TradingSignal | null
  onAccept: (signal: TradingSignal) => void
  onDismiss: (signalId: string) => void
  showDetails?: boolean
}

interface SignalState {
  currentSignal: TradingSignal | null
  isAccepting: boolean
  isDismissing: boolean
  timeRemaining: number
}

export const SignalIndicator: React.FC<SignalIndicatorProps> = ({
  signal,
  onAccept,
  onDismiss,
  showDetails = false
}) => {
  const [state, setState] = useState<SignalState>({
    currentSignal: signal,
    isAccepting: false,
    isDismissing: false,
    timeRemaining: 0
  })

  // Update time remaining
  useEffect(() => {
    if (!signal) return

    const updateTimeRemaining = () => {
      const remaining = Math.max(0, signal.expiresAt - Date.now())
      setState(prev => ({ ...prev, timeRemaining: remaining }))
    }

    updateTimeRemaining()
    const interval = setInterval(updateTimeRemaining, 1000)
    return () => clearInterval(interval)
  }, [signal])

  // Update current signal
  useEffect(() => {
    setState(prev => ({ ...prev, currentSignal: signal }))
  }, [signal])

  const handleAccept = async () => {
    if (!signal) return
    
    setState(prev => ({ ...prev, isAccepting: true }))
    try {
      await onAccept(signal)
    } catch (error) {
      console.error('Failed to accept signal:', error)
    } finally {
      setState(prev => ({ ...prev, isAccepting: false }))
    }
  }

  const handleDismiss = async () => {
    if (!signal) return
    
    setState(prev => ({ ...prev, isDismissing: true }))
    try {
      await onDismiss(signal.id)
    } catch (error) {
      console.error('Failed to dismiss signal:', error)
    } finally {
      setState(prev => ({ ...prev, isDismissing: false }))
    }
  }

  const getSignalColor = () => {
    if (!signal) return ds.colors.neutral[400]
    
    switch (signal.action) {
      case 'BUY': return ds.colors.semantic.profit
      case 'SELL': return ds.colors.semantic.loss
      default: return ds.colors.semantic.warning
    }
  }

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getConfidenceWidth = () => {
    return signal ? `${signal.confidence * 100}%` : '0%'
  }

  if (!signal) {
    return (
      <div style={{
        backgroundColor: ds.colors.semantic.background,
        border: `1px solid ${ds.colors.semantic.border}`,
        borderRadius: ds.radius.lg,
        padding: ds.spacing.xxl,
        textAlign: 'center',
        minHeight: '280px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{
          fontSize: ds.typography.scale.xl,
          color: ds.colors.neutral[400],
          marginBottom: ds.spacing.md
        }}>
          No Active Signals
        </div>
        <div style={{
          fontSize: ds.typography.scale.sm,
          color: ds.colors.neutral[500]
        }}>
          Monitoring markets for opportunities...
        </div>
      </div>
    )
  }

  const signalColor = getSignalColor()
  const isExpired = state.timeRemaining <= 0

  return (
    <div style={{
      backgroundColor: ds.colors.semantic.background,
      border: `2px solid ${signalColor}`,
      borderRadius: ds.radius.lg,
      padding: ds.spacing.xl,
      position: 'relative',
      minHeight: '280px',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.3s ease',
      opacity: isExpired ? 0.6 : 1
    }}>
      {/* Signal Header */}
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
          {signal.symbol}
        </div>
        
        <div style={{
          backgroundColor: signalColor,
          color: ds.colors.semantic.background,
          padding: `${ds.spacing.xs} ${ds.spacing.sm}`,
          borderRadius: ds.radius.sm,
          fontSize: ds.typography.scale.sm,
          fontWeight: ds.typography.weights.semibold
        }}>
          {signal.action}
        </div>
      </div>

      {/* Signal Strength */}
      <div style={{
        textAlign: 'center',
        marginBottom: ds.spacing.xl,
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <div style={{
          fontSize: ds.typography.scale.xxxl,
          fontWeight: ds.typography.weights.bold,
          color: signalColor,
          marginBottom: ds.spacing.md,
          fontFamily: ds.typography.families.data
        }}>
          {Math.round(signal.strength * 100)}%
        </div>
        
        <div style={{
          color: ds.colors.neutral[600],
          fontSize: ds.typography.scale.base,
          marginBottom: ds.spacing.lg
        }}>
          Signal Strength
        </div>

        {/* Confidence Bar */}
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: ds.colors.neutral[200],
          borderRadius: ds.radius.sm,
          overflow: 'hidden',
          marginBottom: ds.spacing.md
        }}>
          <div style={{
            width: getConfidenceWidth(),
            height: '100%',
            backgroundColor: signalColor,
            transition: 'width 0.3s ease'
          }} />
        </div>
        
        <div style={{
          color: ds.colors.neutral[600],
          fontSize: ds.typography.scale.sm
        }}>
          {Math.round(signal.confidence * 100)}% Confidence
        </div>
      </div>

      {/* Time Remaining */}
      <div style={{
        textAlign: 'center',
        marginBottom: ds.spacing.lg,
        color: state.timeRemaining < 60000 ? ds.colors.semantic.warning : ds.colors.neutral[600],
        fontSize: ds.typography.scale.base,
        fontFamily: ds.typography.families.data
      }}>
        {isExpired ? 'EXPIRED' : formatTimeRemaining(state.timeRemaining)}
      </div>

      {/* Details Section */}
      {showDetails && (
        <div style={{
          backgroundColor: ds.colors.neutral[50],
          padding: ds.spacing.md,
          borderRadius: ds.radius.md,
          marginBottom: ds.spacing.lg,
          fontSize: ds.typography.scale.sm
        }}>
          <div style={{ marginBottom: ds.spacing.xs }}>
            <strong>Timeframe:</strong> {signal.timeframe}
          </div>
          <div style={{ marginBottom: ds.spacing.xs }}>
            <strong>Risk Level:</strong> {signal.metadata.riskLevel}
          </div>
          <div>
            <strong>Priority:</strong> {signal.priority}/10
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: ds.spacing.md
      }}>
        <button
          onClick={handleDismiss}
          disabled={state.isDismissing || isExpired}
          style={{
            padding: ds.spacing.md,
            backgroundColor: 'transparent',
            border: `2px solid ${ds.colors.neutral[300]}`,
            borderRadius: ds.radius.md,
            color: ds.colors.neutral[600],
            fontSize: ds.typography.scale.base,
            fontWeight: ds.typography.weights.medium,
            cursor: state.isDismissing || isExpired ? 'not-allowed' : 'pointer',
            opacity: state.isDismissing || isExpired ? 0.5 : 1,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!state.isDismissing && !isExpired) {
              e.currentTarget.style.backgroundColor = ds.colors.neutral[100]
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          {state.isDismissing ? 'Dismissing...' : 'Dismiss'}
        </button>
        
        <button
          onClick={handleAccept}
          disabled={state.isAccepting || isExpired}
          style={{
            padding: ds.spacing.md,
            backgroundColor: signalColor,
            border: `2px solid ${signalColor}`,
            borderRadius: ds.radius.md,
            color: ds.colors.semantic.background,
            fontSize: ds.typography.scale.base,
            fontWeight: ds.typography.weights.semibold,
            cursor: state.isAccepting || isExpired ? 'not-allowed' : 'pointer',
            opacity: state.isAccepting || isExpired ? 0.5 : 1,
            transition: 'all 0.2s ease',
            transform: state.isAccepting ? 'scale(0.98)' : 'scale(1)'
          }}
          onMouseEnter={(e) => {
            if (!state.isAccepting && !isExpired) {
              e.currentTarget.style.transform = 'scale(1.02)'
            }
          }}
          onMouseLeave={(e) => {
            if (!state.isAccepting) {
              e.currentTarget.style.transform = 'scale(1)'
            }
          }}
        >
          {state.isAccepting ? 'Accepting...' : 'Trade Now'}
        </button>
      </div>

      {/* Expired Overlay */}
      {isExpired && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          borderRadius: ds.radius.lg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: ds.typography.scale.lg,
          fontWeight: ds.typography.weights.bold,
          color: ds.colors.semantic.warning
        }}>
          SIGNAL EXPIRED
        </div>
      )}
    </div>
  )
}

export default SignalIndicator