'use client'

import React from 'react'
import { ds } from '@/lib/design/TufteDesignSystem'

interface MinimalCardProps {
  title?: string
  priority?: 'high' | 'medium' | 'low'
  status?: 'active' | 'inactive' | 'warning'
  children: React.ReactNode
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}

const getPriorityColor = (priority: MinimalCardProps['priority']) => {
  switch (priority) {
    case 'high': return ds.colors.semantic.critical
    case 'medium': return ds.colors.semantic.warning
    case 'low': return ds.colors.neutral[400]
    default: return ds.colors.semantic.border
  }
}

const getStatusColor = (status: MinimalCardProps['status']) => {
  switch (status) {
    case 'active': return ds.colors.semantic.profit
    case 'warning': return ds.colors.semantic.warning
    case 'inactive': return ds.colors.neutral[400]
    default: return ds.colors.semantic.border
  }
}

export const MinimalCard: React.FC<MinimalCardProps> = ({
  title,
  priority,
  status,
  children,
  onClick,
  className = '',
  style = {}
}) => {
  const borderColor = priority ? getPriorityColor(priority) : 
                     status ? getStatusColor(status) : 
                     ds.colors.semantic.border

  return (
    <div
      className={`minimal-card ${className}`}
      onClick={onClick}
      style={{
        backgroundColor: ds.colors.semantic.background,
        border: `1px solid ${borderColor}`,
        borderRadius: ds.radius.lg,
        padding: ds.spacing.lg,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        ...style
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = ds.colors.semantic.active
          e.currentTarget.style.boxShadow = ds.shadows.subtle
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = borderColor
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      {title && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: ds.spacing.md
        }}>
          <h3 style={{
            fontSize: ds.typography.scale.base,
            fontWeight: ds.typography.weights.semibold,
            color: ds.colors.semantic.text,
            margin: 0
          }}>
            {title}
          </h3>
          
          {(priority || status) && (
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: borderColor
            }} />
          )}
        </div>
      )}
      
      {children}
    </div>
  )
}

export default MinimalCard