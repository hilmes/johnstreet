/**
 * Ambient Trading Dashboard
 * 
 * Reimagines the trading interface using Brian Eno's ambient design principles:
 * - Information that can be ignored when not relevant
 * - Generative systems that create endless variation
 * - Calm technology that doesn't interrupt focus
 * - Background processes that surface important patterns
 * - Breathing rhythms that create natural attention cycles
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ds } from '@/lib/design/TufteDesignSystem'
import { ambientDesignSystem as ambient } from '@/lib/design/AmbientDesignSystem'
import AmbientSparkline from '@/components/visualizations/AmbientSparkline'
import AmbientNotificationSystem, { AmbientNotification } from '@/components/ambient/AmbientNotificationSystem'
import AmbientDataFlow from '@/components/ambient/AmbientDataFlow'
import { Typography } from '@/components/core/Typography'

interface TradingData {
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
  marketData: Array<{
    symbol: string
    price: number
    change: number
    volume: number
    priceHistory: number[]
    volatility: number
  }>
  alerts: Array<{
    id: string
    type: 'info' | 'warning' | 'error' | 'success'
    message: string
    timestamp: string
    significance: number
    urgency: number
    metadata?: {
      symbol?: string
      value?: number
      change?: number
    }
  }>
}

interface AmbientState {
  mode: keyof typeof ambient.ambientStates
  focusedSymbol?: string
  backgroundProcesses: Set<string>
  lastInteraction: number
  patternDetections: Map<string, { count: number; lastSeen: number }>
  breathingPhase: 'inhale' | 'exhale' | 'hold'
}

export const AmbientTradingDashboard: React.FC = () => {
  const [tradingData, setTradingData] = useState<TradingData | null>(null)
  const [ambientState, setAmbientState] = useState<AmbientState>({
    mode: 'calm',
    backgroundProcesses: new Set(['price-feed', 'sentiment-analysis', 'risk-monitor']),
    lastInteraction: Date.now(),
    patternDetections: new Map(),
    breathingPhase: 'inhale'
  })

  // Determine ambient mode based on activity and market conditions
  const calculateAmbientMode = useMemo(() => {
    if (!tradingData) return 'calm'

    const timeSinceInteraction = Date.now() - ambientState.lastInteraction
    const marketVolatility = tradingData.marketData.reduce((sum, m) => sum + m.volatility, 0) / tradingData.marketData.length
    const criticalAlerts = tradingData.alerts.filter(a => a.significance > 0.8).length

    // Critical mode: High volatility or critical alerts
    if (criticalAlerts > 0 || marketVolatility > 0.15) return 'critical'
    
    // Focused mode: Recent interaction or moderate volatility
    if (timeSinceInteraction < 30000 || marketVolatility > 0.08) return 'focused'
    
    // Active mode: Some activity
    if (timeSinceInteraction < 120000 || marketVolatility > 0.04) return 'active'
    
    // Calm mode: Low activity
    return 'calm'
  }, [tradingData, ambientState.lastInteraction])

  // Update ambient mode
  useEffect(() => {
    const newMode = calculateAmbientMode
    if (newMode !== ambientState.mode) {
      setAmbientState(prev => ({ ...prev, mode: newMode }))
    }
  }, [calculateAmbientMode, ambientState.mode])

  // Fetch trading data with ambient-aware intervals
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard')
        if (response.ok) {
          const data = await response.json()
          setTradingData(data)
        }
      } catch (error) {
        console.error('Failed to fetch trading data:', error)
      }
    }

    // Fetch interval based on ambient state
    const stateConfig = ambient.ambientStates[ambientState.mode]
    const fetchInterval = Math.max(1000, 10000 / stateConfig.updateFrequency)

    fetchData()
    const interval = setInterval(fetchData, fetchInterval)
    return () => clearInterval(interval)
  }, [ambientState.mode])

  // Convert alerts to ambient notifications
  const ambientNotifications: AmbientNotification[] = useMemo(() => {
    if (!tradingData) return []

    return tradingData.alerts.map(alert => ({
      id: alert.id,
      type: alert.type,
      message: alert.message,
      timestamp: new Date(alert.timestamp).getTime(),
      significance: alert.significance,
      urgency: alert.urgency,
      metadata: alert.metadata
    }))
  }, [tradingData?.alerts])

  // Generate data streams for ambient flow visualization
  const dataStreams = useMemo(() => {
    if (!tradingData) return []

    return tradingData.marketData.map(market => ({
      id: market.symbol,
      name: market.symbol,
      values: market.priceHistory,
      significance: Math.min(1, market.volatility * 10), // Scale volatility to 0-1
      velocity: Math.max(0.1, market.volume / 1000000), // Volume-based velocity
      pattern: market.volatility > 0.1 ? 'volatile' as const :
               Math.abs(market.change) > 0.05 ? 'trending' as const :
               'stable' as const,
      color: ambient.generateColor(
        market.price, 
        market.change > 0 ? 'calm' : market.change < -0.05 ? 'critical' : 'neutral'
      )
    }))
  }, [tradingData?.marketData])

  // Handle user interactions
  const handleInteraction = (type: string, data?: any) => {
    setAmbientState(prev => ({
      ...prev,
      lastInteraction: Date.now(),
      focusedSymbol: data?.symbol || prev.focusedSymbol
    }))
  }

  // Handle pattern detection
  const handlePatternDetected = (pattern: string, notifications: AmbientNotification[]) => {
    setAmbientState(prev => {
      const newPatterns = new Map(prev.patternDetections)
      const existing = newPatterns.get(pattern) || { count: 0, lastSeen: 0 }
      newPatterns.set(pattern, {
        count: existing.count + 1,
        lastSeen: Date.now()
      })
      return { ...prev, patternDetections: newPatterns }
    })

    console.log(`Pattern detected: ${pattern}`, notifications)
  }

  if (!tradingData) {
    return (
      <div style={{
        ...ds.layout.container(),
        padding: ds.spacing.xl,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ds.colors.semantic.background
      }}>
        <Typography.Body>Initializing ambient trading environment...</Typography.Body>
      </div>
    )
  }

  const stateConfig = ambient.ambientStates[ambientState.mode]

  return (
    <div style={{
      backgroundColor: ds.colors.semantic.background,
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Ambient background flow */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        opacity: ambientState.mode === 'calm' ? 0.3 : 0.1,
        pointerEvents: 'none'
      }}>
        <AmbientDataFlow
          streams={dataStreams}
          width={window.innerWidth || 1200}
          height={window.innerHeight || 800}
          ambientState={ambientState.mode}
          showLabels={false}
          interactive={false}
        />
      </div>

      {/* Main content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: `${ds.spacing.xl} ${ds.spacing.lg}`,
        maxWidth: ds.grid.maxWidth,
        margin: '0 auto'
      }}>
        {/* Header with ambient state indicator */}
        <header style={{
          marginBottom: ds.spacing.xxl,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: ds.spacing.md }}>
              <Typography.CriticalMetric value={tradingData.portfolioValue} />
              
              {/* Ambient state indicator */}
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: ambient.generateColor(Date.now(), 
                  ambientState.mode === 'critical' ? 'critical' :
                  ambientState.mode === 'focused' ? 'alert' : 'calm'
                ),
                opacity: stateConfig.motionIntensity,
                animation: `gentle-pulse ${ambient.timing(3000)}ms infinite ease-in-out`
              }} />
            </div>
            
            <Typography.Body size="sm" muted style={{ marginTop: ds.spacing.xs }}>
              Portfolio Value • {ambientState.mode} mode
            </Typography.Body>
          </div>

          <div style={{ textAlign: 'right' }}>
            <Typography.Price
              value={tradingData.dailyPnL}
              change={(tradingData.dailyPnL / (tradingData.portfolioValue - tradingData.dailyPnL)) * 100}
              size="lg"
            />
            <Typography.Body size="sm" muted style={{ marginTop: ds.spacing.xs }}>
              Today's P&L
            </Typography.Body>
          </div>
        </header>

        {/* Ambient positions grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: ds.spacing.lg,
          marginBottom: ds.spacing.xxl
        }}>
          {tradingData.positions.map((position, index) => {
            const isFocused = ambientState.focusedSymbol === position.symbol
            const attentionLevel = Math.abs(position.change) > 0.05 ? 'focused' :
                                  Math.abs(position.change) > 0.02 ? 'noticed' : 'ambient'

            return (
              <div
                key={position.symbol}
                style={{
                  ...ds.layout.card(),
                  opacity: isFocused ? 1 : ambient.attention[attentionLevel].opacity,
                  transform: `scale(${isFocused ? 1.02 : 1})`,
                  transition: `all ${ds.motion.duration.normal}`,
                  cursor: 'pointer',
                  border: isFocused ? `2px solid ${ambient.generateColor(index, 'neutral')}` : 
                         `1px solid ${ds.colors.semantic.border}`
                }}
                onClick={() => handleInteraction('position-click', { symbol: position.symbol })}
                onMouseEnter={() => handleInteraction('position-hover', { symbol: position.symbol })}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Typography.InlineCode>{position.symbol}</Typography.InlineCode>
                    <Typography.Body size="sm" style={{ marginTop: ds.spacing.xs }}>
                      {position.side} • {position.size} shares
                    </Typography.Body>
                  </div>
                  
                  <AmbientSparkline
                    data={position.priceHistory}
                    symbol={position.symbol}
                    width={80}
                    height={20}
                    attentionThresholds={{
                      ambient: 0.01,
                      noticed: 0.03,
                      focused: 0.05,
                      critical: 0.1
                    }}
                    breathingEnabled={ambientState.mode !== 'critical'}
                    generativeMode={true}
                  />
                </div>

                <div style={{ 
                  marginTop: ds.spacing.md,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <Typography.Price
                      value={position.currentPrice}
                      change={position.change}
                      size="base"
                    />
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <Typography.Price
                      value={position.unrealizedPnl}
                      change={position.unrealizedPnl > 0 ? 1 : -1}
                      size="sm"
                    />
                    <Typography.Body size="xs" muted>
                      Unrealized P&L
                    </Typography.Body>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pattern detection status */}
        {ambientState.patternDetections.size > 0 && (
          <div style={{
            marginBottom: ds.spacing.lg,
            padding: ds.spacing.md,
            backgroundColor: `${ds.colors.semantic.surface}20`,
            border: `1px solid ${ds.colors.semantic.border}`,
            borderRadius: ds.radius.md,
            opacity: ambientState.mode === 'calm' ? 0.6 : 1
          }}>
            <Typography.Body size="sm" style={{ marginBottom: ds.spacing.xs }}>
              Emergent Patterns Detected:
            </Typography.Body>
            <div style={{ display: 'flex', gap: ds.spacing.md, flexWrap: 'wrap' }}>
              {Array.from(ambientState.patternDetections.entries()).map(([pattern, info]) => (
                <span
                  key={pattern}
                  style={{
                    fontSize: ds.typography.scale.xs,
                    padding: `${ds.spacing.xs} ${ds.spacing.sm}`,
                    backgroundColor: ambient.generateColor(info.count, 'neutral'),
                    color: ds.colors.neutral[1000],
                    borderRadius: ds.radius.sm,
                    opacity: 0.8
                  }}
                >
                  {pattern} ({info.count})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Background processes indicator */}
        <div style={{
          position: 'fixed',
          bottom: ds.spacing.lg,
          left: ds.spacing.lg,
          fontSize: ds.typography.scale.xs,
          color: ds.colors.neutral[400],
          opacity: 0.6,
          zIndex: 2
        }}>
          {Array.from(ambientState.backgroundProcesses).join(' • ')} • 
          {tradingData.positions.length} positions • 
          {ambientState.patternDetections.size} patterns
        </div>
      </div>

      {/* Ambient notification system */}
      <AmbientNotificationSystem
        notifications={ambientNotifications}
        ambientState={ambientState.mode}
        onNotificationClick={(notification) => 
          handleInteraction('notification-click', { notification })
        }
        onPatternDetected={handlePatternDetected}
      />
    </div>
  )
}

export default AmbientTradingDashboard