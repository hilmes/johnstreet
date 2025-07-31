'use client'

import React from 'react'
import { ds } from '@/lib/design/TufteDesignSystem'

interface PriorityButtonProps {
  action: 'buy' | 'sell' | 'close' | 'cancel'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

const getActionColor = (action: PriorityButtonProps['action']) => {
  switch (action) {
    case 'buy': return ds.colors.semantic.profit
    case 'sell': return ds.colors.semantic.loss
    case 'close': return ds.colors.semantic.warning
    case 'cancel': return ds.colors.neutral[400]
    default: return ds.colors.semantic.active
  }
}

const getSizeStyles = (size: PriorityButtonProps['size']) => {
  switch (size) {
    case 'small':
      return {
        padding: `${ds.spacing.xs} ${ds.spacing.sm}`,
        fontSize: ds.typography.scale.sm,
        minHeight: '32px'
      }
    case 'large':
      return {
        padding: `${ds.spacing.lg} ${ds.spacing.xl}`,
        fontSize: ds.typography.scale.lg,
        minHeight: '56px'
      }
    default: // medium
      return {
        padding: `${ds.spacing.md} ${ds.spacing.lg}`,
        fontSize: ds.typography.scale.base,
        minHeight: '44px'
      }
  }
}

export const PriorityButton: React.FC<PriorityButtonProps> = ({
  action,
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  children,
  className = '',
  style = {}
}) => {
  const actionColor = getActionColor(action)
  const sizeStyles = getSizeStyles(size)
  const isDisabled = disabled || loading

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`priority-button priority-button--${action} priority-button--${size} ${className}`}
      style={{
        ...sizeStyles,
        width: '100%',
        backgroundColor: isDisabled ? ds.colors.neutral[200] : actionColor,
        border: 'none',
        borderRadius: ds.radius.md,
        color: isDisabled ? ds.colors.neutral[500] : 
               action === 'cancel' ? ds.colors.semantic.text : ds.colors.semantic.background,
        fontWeight: ds.typography.weights.semibold,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: ds.spacing.sm,
        opacity: isDisabled ? 0.6 : 1,
        transform: loading ? 'scale(0.98)' : 'scale(1)',
        ...style
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.transform = 'scale(1.02)'
          e.currentTarget.style.filter = 'brightness(1.1)'
        }
      }}
      onMouseLeave={(e) => {
        if (!loading) {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.filter = 'brightness(1)'
        }
      }}
      onMouseDown={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.transform = 'scale(0.98)'
        }
      }}
      onMouseUp={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.transform = 'scale(1.02)'
        }
      }}
    >
      {loading && (
        <div style={{
          width: '16px',
          height: '16px',
          border: '2px solid currentColor',
          borderTop: '2px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      )}
      
      {children}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  )
}

export default PriorityButton