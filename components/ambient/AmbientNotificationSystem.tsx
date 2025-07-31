/**
 * Ambient Notification System
 * 
 * Based on Brian Eno's ambient principles:
 * - "Calm technology" that doesn't interrupt
 * - Information that surfaces naturally when relevant
 * - Breathing rhythm that creates comfortable attention cycles
 * - Generative variations in presentation to avoid habituation
 */

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ambientDesignSystem as ambient, ambientAnimations } from '@/lib/design/AmbientDesignSystem'
import { ds } from '@/lib/design/TufteDesignSystem'

interface AmbientNotification {
  id: string
  type: 'info' | 'warning' | 'success' | 'error' | 'pattern'
  message: string
  data?: any
  timestamp: number
  significance: number  // 0-1, affects how prominently it's displayed
  urgency: number      // 0-1, affects how quickly it surfaces
  pattern?: string     // For pattern-based notifications
  metadata?: {
    symbol?: string
    value?: number
    change?: number
    source?: string
  }
}

interface AmbientNotificationSystemProps {
  notifications: AmbientNotification[]
  maxVisible?: number
  ambientState?: keyof typeof ambient.ambientStates
  onNotificationClick?: (notification: AmbientNotification) => void
  onPatternDetected?: (pattern: string, notifications: AmbientNotification[]) => void
  className?: string
}

interface NotificationState {
  surfaced: Set<string>
  breathing: 'inhale' | 'exhale' | 'hold'
  currentFocus?: string
  patternClusters: Map<string, AmbientNotification[]>
  lastActivity: number
}

export const AmbientNotificationSystem: React.FC<AmbientNotificationSystemProps> = ({
  notifications,
  maxVisible = 3,
  ambientState = 'calm',
  onNotificationClick,
  onPatternDetected,
  className = ''
}) => {
  const [notificationState, setNotificationState] = useState<NotificationState>({
    surfaced: new Set(),
    breathing: 'inhale',
    currentFocus: undefined,
    patternClusters: new Map(),
    lastActivity: Date.now()
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const breathingTimerRef = useRef<NodeJS.Timeout>()
  const emergenceTimerRef = useRef<NodeJS.Timeout>()

  // Ambient state configuration
  const stateConfig = ambient.ambientStates[ambientState]

  // Calculate which notifications should surface based on ambient rules
  const calculateSurfacing = useCallback(() => {
    const now = Date.now()
    const timeSinceActivity = now - notificationState.lastActivity
    
    // Determine information density based on activity and state
    const activityFactor = Math.min(1, timeSinceActivity / 30000) // 30 seconds to full calm
    const targetDensity = stateConfig.informationDensity * (1 - activityFactor * 0.5)
    
    // Sort notifications by emergence priority
    const prioritized = notifications
      .filter(n => !notificationState.surfaced.has(n.id))
      .map(n => ({
        ...n,
        emergencePriority: (
          n.significance * 0.4 +
          n.urgency * 0.4 +
          (1 - (now - n.timestamp) / 300000) * 0.2 // Recency factor (5 minutes)
        )
      }))
      .sort((a, b) => b.emergencePriority - a.emergencePriority)

    // Surface notifications based on breathing rhythm and density
    const shouldSurface = Math.floor(targetDensity * maxVisible)
    const toSurface = prioritized.slice(0, shouldSurface)
    
    return toSurface.map(n => n.id)
  }, [notifications, notificationState, stateConfig, maxVisible])

  // Pattern detection system
  useEffect(() => {
    const detectPatterns = () => {
      const recentNotifications = notifications.filter(n => 
        Date.now() - n.timestamp < 300000 // Last 5 minutes
      )

      // Group by similarity
      const patterns = new Map<string, AmbientNotification[]>()

      recentNotifications.forEach(notification => {
        // Simple pattern detection based on message similarity and metadata
        const patternKey = notification.pattern || 
          `${notification.type}_${notification.metadata?.symbol || 'general'}`
        
        if (!patterns.has(patternKey)) {
          patterns.set(patternKey, [])
        }
        patterns.get(patternKey)!.push(notification)
      })

      // Identify significant patterns (3+ similar notifications)
      const significantPatterns = Array.from(patterns.entries())
        .filter(([_, notifications]) => notifications.length >= ambient.emergence.patterns.repetition)

      setNotificationState(prev => ({
        ...prev,
        patternClusters: new Map(significantPatterns)
      }))

      // Notify about detected patterns
      significantPatterns.forEach(([pattern, notifications]) => {
        if (onPatternDetected) {
          onPatternDetected(pattern, notifications)
        }
      })
    }

    const interval = setInterval(detectPatterns, 10000) // Check every 10 seconds
    return () => clearInterval(interval)
  }, [notifications, onPatternDetected])

  // Breathing cycle system
  useEffect(() => {
    const breathingCycle = () => {
      const { inhale, exhale, hold, variance } = ambient.breathing
      
      const phases = [
        { phase: 'inhale', duration: ambient.timing(inhale, variance) },
        { phase: 'hold', duration: ambient.timing(hold, variance) },
        { phase: 'exhale', duration: ambient.timing(exhale, variance) },
        { phase: 'hold', duration: ambient.timing(hold, variance) }
      ]

      let currentPhaseIndex = 0
      
      const nextPhase = () => {
        setNotificationState(prev => ({
          ...prev,
          breathing: phases[currentPhaseIndex].phase as NotificationState['breathing']
        }))
        
        currentPhaseIndex = (currentPhaseIndex + 1) % phases.length
        breathingTimerRef.current = setTimeout(nextPhase, phases[currentPhaseIndex].duration)
      }

      nextPhase()
    }

    breathingCycle()
    return () => {
      if (breathingTimerRef.current) clearTimeout(breathingTimerRef.current)
    }
  }, [])

  // Emergence system - surfaces notifications naturally
  useEffect(() => {
    const emergenceCheck = () => {
      const toSurface = calculateSurfacing()
      
      setNotificationState(prev => {
        const newSurfaced = new Set(prev.surfaced)
        
        // Surface new notifications
        toSurface.forEach(id => newSurfaced.add(id))
        
        // Submerge old notifications based on time and attention
        Array.from(prev.surfaced).forEach(id => {
          const notification = notifications.find(n => n.id === id)
          if (!notification) {
            newSurfaced.delete(id)
            return
          }
          
          const age = Date.now() - notification.timestamp
          const shouldSubmerge = age > (300000 * notification.significance) // 5 minutes * significance
          
          if (shouldSubmerge && newSurfaced.size > maxVisible) {
            newSurfaced.delete(id)
          }
        })
        
        return {
          ...prev,
          surfaced: newSurfaced
        }
      })
    }

    emergenceTimerRef.current = setInterval(emergenceCheck, stateConfig.updateFrequency)
    return () => {
      if (emergenceTimerRef.current) clearInterval(emergenceTimerRef.current)
    }
  }, [calculateSurfacing, stateConfig.updateFrequency, notifications, maxVisible])

  // Get currently visible notifications
  const visibleNotifications = notifications
    .filter(n => notificationState.surfaced.has(n.id))
    .sort((a, b) => b.significance - a.significance)
    .slice(0, maxVisible)

  // Handle notification interaction
  const handleNotificationClick = (notification: AmbientNotification) => {
    setNotificationState(prev => ({
      ...prev,
      currentFocus: notification.id,
      lastActivity: Date.now()
    }))
    
    if (onNotificationClick) {
      onNotificationClick(notification)
    }
  }

  // Render individual notification
  const renderNotification = (notification: AmbientNotification, index: number) => {
    const attentionLevel = notification.significance >= 0.8 ? 'critical' :
                          notification.significance >= 0.6 ? 'focused' :
                          notification.significance >= 0.4 ? 'noticed' :
                          notification.significance >= 0.2 ? 'ambient' : 'background'

    const attentionConfig = ambient.attention[attentionLevel]
    const isBreathing = notificationState.breathing === 'inhale'
    const isFocused = notificationState.currentFocus === notification.id

    // Generative color based on notification data
    const color = ambient.generateColor(
      notification.timestamp + index,
      notification.type === 'error' ? 'critical' :
      notification.type === 'warning' ? 'alert' :
      notification.type === 'success' ? 'calm' : 'neutral'
    )

    const styles: React.CSSProperties = {
      opacity: attentionConfig.opacity * (isFocused ? 1.2 : 1),
      transform: `
        scale(${isBreathing ? 1.005 : 0.998}) 
        translateY(${index * 2}px)
      `,
      backgroundColor: `${color}10`, // 10% opacity
      borderLeft: `2px solid ${color}`,
      padding: `${ds.spacing.sm} ${ds.spacing.md}`,
      marginBottom: ds.spacing.xs,
      borderRadius: ds.radius.sm,
      cursor: 'pointer',
      transition: `all ${ds.motion.duration.normal} ${ds.motion.easing.easeInOut}`,
      animation: attentionConfig.animation !== 'none' ? 
        `${attentionConfig.animation} ${ambient.timing(6000)}ms infinite ease-in-out` : 'none',
      fontSize: ds.typography.scale.sm,
      color: ds.colors.semantic.active
    }

    return (
      <div
        key={notification.id}
        style={styles}
        onClick={() => handleNotificationClick(notification)}
        onMouseEnter={() => setNotificationState(prev => ({ 
          ...prev, 
          currentFocus: notification.id,
          lastActivity: Date.now()
        }))}
        onMouseLeave={() => setNotificationState(prev => ({ 
          ...prev, 
          currentFocus: undefined 
        }))}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: ds.spacing.sm }}>
          {/* Pattern indicator */}
          {notificationState.patternClusters.has(notification.pattern || `${notification.type}_${notification.metadata?.symbol}`) && (
            <div
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: color,
                opacity: 0.8
              }}
            />
          )}
          
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: ds.typography.weights.medium }}>
              {notification.message}
            </div>
            
            {notification.metadata && (
              <div style={{ 
                fontSize: ds.typography.scale.xs,
                opacity: 0.7,
                marginTop: ds.spacing.xs
              }}>
                {notification.metadata.symbol && `${notification.metadata.symbol} • `}
                {notification.metadata.value && `${notification.metadata.value} • `}
                {new Date(notification.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
          
          {/* Significance indicator */}
          <div
            style={{
              width: `${notification.significance * 20}px`,
              height: '2px',
              backgroundColor: color,
              borderRadius: '1px',
              opacity: 0.6
            }}
          />
        </div>
      </div>
    )
  }

  if (visibleNotifications.length === 0) return null

  return (
    <div 
      ref={containerRef}
      className={`ambient-notification-system ${className}`}
      style={{
        position: 'fixed',
        top: ds.spacing.xl,
        right: ds.spacing.xl,
        maxWidth: '320px',
        zIndex: 100,
        pointerEvents: 'auto'
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: ambientAnimations }} />
      
      {/* Pattern cluster summary */}
      {notificationState.patternClusters.size > 0 && (
        <div style={{
          fontSize: ds.typography.scale.xs,
          color: ds.colors.neutral[400],
          marginBottom: ds.spacing.sm,
          opacity: 0.8
        }}>
          {notificationState.patternClusters.size} pattern{notificationState.patternClusters.size > 1 ? 's' : ''} detected
        </div>
      )}
      
      {/* Visible notifications */}
      {visibleNotifications.map((notification, index) => 
        renderNotification(notification, index)
      )}
      
      {/* Hidden notifications indicator */}
      {notifications.length > visibleNotifications.length && (
        <div style={{
          fontSize: ds.typography.scale.xs,
          color: ds.colors.neutral[400],
          textAlign: 'center',
          padding: ds.spacing.sm,
          opacity: 0.6
        }}>
          +{notifications.length - visibleNotifications.length} more in background
        </div>
      )}
    </div>
  )
}

export default AmbientNotificationSystem