'use client'

import React from 'react'
import { Box, Paper, Typography } from '@mui/material'
import { DesignSystem } from '@/lib/design/DesignSystem'

interface ZenCardProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  action?: React.ReactNode
  noPadding?: boolean
  elevated?: boolean
  onClick?: () => void
  className?: string
  transparent?: boolean
}

export default function ZenCard({
  children,
  title,
  subtitle,
  action,
  noPadding = false,
  elevated = false,
  onClick,
  className,
  transparent = false
}: ZenCardProps) {
  return (
    <Paper
      onClick={onClick}
      className={className}
      elevation={0}
      sx={{
        backgroundColor: transparent ? 'transparent' : DesignSystem.colors.background.secondary,
        border: transparent ? 'none' : `1px solid ${DesignSystem.colors.neutral[300]}`,
        borderRadius: DesignSystem.radius.base,
        padding: noPadding ? 0 : DesignSystem.spacing[6],
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 200ms ease',
        boxShadow: elevated ? DesignSystem.shadows.sm : 'none',
        '&:hover': onClick ? {
          boxShadow: DesignSystem.shadows.base,
          borderColor: DesignSystem.colors.neutral[400],
          transform: 'translateY(-1px)',
        } : {},
        // Japanese aesthetic - embrace emptiness
        '& > *:last-child': {
          marginBottom: 0,
        }
      }}
    >
      {(title || subtitle || action) && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: title || subtitle ? DesignSystem.spacing[4] : 0,
            paddingBottom: title || subtitle ? DesignSystem.spacing[4] : 0,
            borderBottom: title || subtitle ? `1px solid ${DesignSystem.colors.neutral[200]}` : 'none',
          }}
        >
          <Box>
            {title && (
              <Typography
                variant="h6"
                sx={{
                  fontSize: DesignSystem.typography.scale.md,
                  fontWeight: DesignSystem.typography.primary.weights.semibold,
                  color: DesignSystem.colors.neutral.black,
                  marginBottom: subtitle ? DesignSystem.spacing[1] : 0,
                  letterSpacing: '-0.01em',
                }}
              >
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography
                variant="body2"
                sx={{
                  fontSize: DesignSystem.typography.scale.sm,
                  color: DesignSystem.colors.neutral[600],
                  lineHeight: DesignSystem.typography.lineHeight.relaxed,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          {action && (
            <Box sx={{ ml: 2 }}>
              {action}
            </Box>
          )}
        </Box>
      )}
      {children}
    </Paper>
  )
}

// Specialized card for displaying key-value pairs with Japanese minimalism
interface InfoCardProps {
  items: Array<{
    label: string
    value: string | number | React.ReactNode
    highlighted?: boolean
  }>
  columns?: 1 | 2 | 3
  dense?: boolean
}

export function InfoCard({ items, columns = 1, dense = false }: InfoCardProps) {
  return (
    <ZenCard noPadding>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 0,
        }}
      >
        {items.map((item, index) => (
          <Box
            key={index}
            sx={{
              padding: dense ? DesignSystem.spacing[3] : DesignSystem.spacing[4],
              borderRight: (index + 1) % columns !== 0 ? `1px solid ${DesignSystem.colors.neutral[200]}` : 'none',
              borderBottom: index < items.length - columns ? `1px solid ${DesignSystem.colors.neutral[200]}` : 'none',
              backgroundColor: item.highlighted ? DesignSystem.colors.neutral[100] : 'transparent',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: DesignSystem.colors.neutral[600],
                fontSize: DesignSystem.typography.scale.xs,
                fontWeight: DesignSystem.typography.primary.weights.medium,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: DesignSystem.spacing[1],
              }}
            >
              {item.label}
            </Typography>
            <Box
              sx={{
                fontSize: dense ? DesignSystem.typography.scale.base : DesignSystem.typography.scale.md,
                fontWeight: DesignSystem.typography.primary.weights.medium,
                color: DesignSystem.colors.neutral.black,
                fontFamily: typeof item.value === 'number' ? DesignSystem.typography.secondary.fontFamily : 'inherit',
              }}
            >
              {item.value}
            </Box>
          </Box>
        ))}
      </Box>
    </ZenCard>
  )
}

// Empty state with Japanese wabi-sabi aesthetic
interface EmptyStateProps {
  title?: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: DesignSystem.spacing[16],
        textAlign: 'center',
        minHeight: 400,
      }}
    >
      {icon && (
        <Box
          sx={{
            color: DesignSystem.colors.neutral[400],
            marginBottom: DesignSystem.spacing[4],
            '& svg': {
              fontSize: 48,
            }
          }}
        >
          {icon}
        </Box>
      )}
      {title && (
        <Typography
          variant="h6"
          sx={{
            fontSize: DesignSystem.typography.scale.lg,
            fontWeight: DesignSystem.typography.primary.weights.medium,
            color: DesignSystem.colors.neutral[700],
            marginBottom: DesignSystem.spacing[2],
          }}
        >
          {title}
        </Typography>
      )}
      {description && (
        <Typography
          variant="body2"
          sx={{
            fontSize: DesignSystem.typography.scale.base,
            color: DesignSystem.colors.neutral[600],
            marginBottom: action ? DesignSystem.spacing[6] : 0,
            maxWidth: 400,
            lineHeight: DesignSystem.typography.lineHeight.relaxed,
          }}
        >
          {description}
        </Typography>
      )}
      {action}
    </Box>
  )
}