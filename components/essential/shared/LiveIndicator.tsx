'use client'

import React from 'react'
import { ds } from '@/lib/design/TufteDesignSystem'

interface LiveIndicatorProps {
  status: 'connected' | 'disconnected' | 'error'
  lastUpdate?: Date
  label?: string
  showLastUpdate?: boolean
  size?: 'small' | 'medium' | 'large'
}

const getStatusColor = (status: LiveIndicatorProps['status']) => {
  switch (status) {
    case 'connected': return ds.colors.semantic.profit
    case 'disconnected': return ds.colors.neutral[400]
    case 'error': return ds.colors.semantic.loss
    default: return ds.colors.neutral[400]
  }
}

const getStatusText = (status: LiveIndicatorProps['status']) => {
  switch (status) {
    case 'connected': return 'Live'
    case 'disconnected': return 'Offline'
    case 'error': return 'Error'
    default: return 'Unknown'
  }
}

const getSizeStyles = (size: LiveIndicatorProps['size']) => {
  switch (size) {
    case 'small':
      return {
        dotSize: '6px',
        fontSize: ds.typography.scale.xs,
        gap: ds.spacing.xs
      }
    case 'large':
      return {
        dotSize: '12px',
        fontSize: ds.typography.scale.base,
        gap: ds.spacing.sm
      }
    default: // medium
      return {
        dotSize: '8px',
        fontSize: ds.typography.scale.sm,
        gap: ds.spacing.xs
      }
  }
}

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({
  status,
  lastUpdate,
  label,
  showLastUpdate = true,
  size = 'medium'
}) => {
  const statusColor = getStatusColor(status)
  const statusText = label || getStatusText(status)
  const sizeStyles = getSizeStyles(size)

  const formatLastUpdate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)

    if (diffSeconds < 60) {
      return 'just now'
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: sizeStyles.gap
    }}>
      {/* Status Dot */}
      <div style={{
        position: 'relative',
        width: sizeStyles.dotSize,
        height: sizeStyles.dotSize
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          backgroundColor: statusColor
        }} />
        
        {status === 'connected' && (
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            backgroundColor: statusColor,
            opacity: 0.6,
            animation: 'pulse 2s ease-in-out infinite'
          }} />
        )}
      </div>

      {/* Status Text */}
      <span style={{
        fontSize: sizeStyles.fontSize,
        color: ds.colors.semantic.text,
        fontWeight: ds.typography.weights.medium
      }}>
        {statusText}
      </span>

      {/* Last Update */}
      {showLastUpdate && lastUpdate && (
        <>
          <span style={{
            fontSize: sizeStyles.fontSize,
            color: ds.colors.neutral[400]
          }}>
            •
          </span>
          <span style={{
            fontSize: sizeStyles.fontSize,
            color: ds.colors.neutral[500],
            fontFamily: ds.typography.families.data
          }}>
            {formatLastUpdate(lastUpdate)}
          </span>
        </>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.2;
          }
          100% {
            transform: scale(1);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  )
}

export default LiveIndicator