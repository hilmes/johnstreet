'use client'

import React from 'react'
import { Typography as MuiTypography, TypographyProps as MuiTypographyProps, Box } from '@mui/material'
import { DesignSystem } from '@/lib/design/DesignSystem'

interface TypographyProps extends Omit<MuiTypographyProps, 'variant'> {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2' | 'caption' | 'overline' | 'label' | 'mono'
  children: React.ReactNode
  weight?: keyof typeof DesignSystem.typography.primary.weights
  color?: 'primary' | 'secondary' | 'muted' | 'success' | 'error' | 'warning'
  className?: string
}

export default function Typography({
  variant = 'body1',
  children,
  weight,
  color = 'primary',
  className,
  sx,
  ...props
}: TypographyProps) {
  const getStyles = () => {
    const baseStyles: any = {
      fontFamily: DesignSystem.typography.primary.fontFamily,
      color: getColor(),
      transition: 'color 200ms ease',
    }

    // Apply variant-specific styles
    switch (variant) {
      case 'h1':
        return {
          ...baseStyles,
          fontSize: DesignSystem.typography.scale.xxxl,
          fontWeight: weight || DesignSystem.typography.primary.weights.light,
          lineHeight: DesignSystem.typography.lineHeight.tight,
          letterSpacing: '-0.02em',
          marginBottom: DesignSystem.spacing[6],
        }
      case 'h2':
        return {
          ...baseStyles,
          fontSize: DesignSystem.typography.scale.xxl,
          fontWeight: weight || DesignSystem.typography.primary.weights.regular,
          lineHeight: DesignSystem.typography.lineHeight.tight,
          letterSpacing: '-0.02em',
          marginBottom: DesignSystem.spacing[5],
        }
      case 'h3':
        return {
          ...baseStyles,
          fontSize: DesignSystem.typography.scale.xl,
          fontWeight: weight || DesignSystem.typography.primary.weights.medium,
          lineHeight: DesignSystem.typography.lineHeight.tight,
          letterSpacing: '-0.01em',
          marginBottom: DesignSystem.spacing[4],
        }
      case 'h4':
        return {
          ...baseStyles,
          fontSize: DesignSystem.typography.scale.lg,
          fontWeight: weight || DesignSystem.typography.primary.weights.medium,
          lineHeight: DesignSystem.typography.lineHeight.normal,
          marginBottom: DesignSystem.spacing[3],
        }
      case 'h5':
        return {
          ...baseStyles,
          fontSize: DesignSystem.typography.scale.md,
          fontWeight: weight || DesignSystem.typography.primary.weights.semibold,
          lineHeight: DesignSystem.typography.lineHeight.normal,
          marginBottom: DesignSystem.spacing[2],
        }
      case 'h6':
        return {
          ...baseStyles,
          fontSize: DesignSystem.typography.scale.base,
          fontWeight: weight || DesignSystem.typography.primary.weights.semibold,
          lineHeight: DesignSystem.typography.lineHeight.normal,
          marginBottom: DesignSystem.spacing[2],
        }
      case 'body1':
        return {
          ...baseStyles,
          fontSize: DesignSystem.typography.scale.base,
          fontWeight: weight || DesignSystem.typography.primary.weights.regular,
          lineHeight: DesignSystem.typography.lineHeight.normal,
          marginBottom: DesignSystem.spacing[3],
        }
      case 'body2':
        return {
          ...baseStyles,
          fontSize: DesignSystem.typography.scale.sm,
          fontWeight: weight || DesignSystem.typography.primary.weights.regular,
          lineHeight: DesignSystem.typography.lineHeight.normal,
          marginBottom: DesignSystem.spacing[2],
        }
      case 'caption':
        return {
          ...baseStyles,
          fontSize: DesignSystem.typography.scale.xs,
          fontWeight: weight || DesignSystem.typography.primary.weights.regular,
          lineHeight: DesignSystem.typography.lineHeight.normal,
          letterSpacing: '0.03em',
        }
      case 'overline':
        return {
          ...baseStyles,
          fontSize: DesignSystem.typography.scale.xs,
          fontWeight: weight || DesignSystem.typography.primary.weights.medium,
          lineHeight: DesignSystem.typography.lineHeight.tight,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }
      case 'label':
        return {
          ...baseStyles,
          fontSize: DesignSystem.typography.scale.xs,
          fontWeight: weight || DesignSystem.typography.primary.weights.medium,
          lineHeight: DesignSystem.typography.lineHeight.tight,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: DesignSystem.colors.neutral[600],
        }
      case 'mono':
        return {
          ...baseStyles,
          fontFamily: DesignSystem.typography.secondary.fontFamily,
          fontSize: DesignSystem.typography.scale.sm,
          fontWeight: weight || DesignSystem.typography.secondary.weights.regular,
          lineHeight: DesignSystem.typography.lineHeight.normal,
          letterSpacing: '0',
        }
      default:
        return baseStyles
    }
  }

  const getColor = () => {
    switch (color) {
      case 'primary':
        return DesignSystem.colors.neutral.black
      case 'secondary':
        return DesignSystem.colors.neutral[700]
      case 'muted':
        return DesignSystem.colors.neutral[600]
      case 'success':
        return DesignSystem.colors.market.up
      case 'error':
        return DesignSystem.colors.market.down
      case 'warning':
        return DesignSystem.colors.market.warning
      default:
        return DesignSystem.colors.neutral.black
    }
  }

  const mappedVariant = variant === 'mono' || variant === 'label' || variant === 'overline' ? 'body2' : variant

  return (
    <MuiTypography
      variant={mappedVariant as any}
      className={className}
      sx={{
        ...getStyles(),
        ...sx,
      }}
      {...props}
    >
      {children}
    </MuiTypography>
  )
}

// Specialized typography components for common patterns

interface PageTitleProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function PageTitle({ title, subtitle, action }: PageTitleProps) {
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start',
      marginBottom: DesignSystem.spacing[8],
    }}>
      <Box>
        <Typography variant="h2" sx={{ marginBottom: subtitle ? DesignSystem.spacing[2] : 0 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body1" color="muted" sx={{ marginBottom: 0 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && (
        <Box sx={{ marginLeft: DesignSystem.spacing[4] }}>
          {action}
        </Box>
      )}
    </Box>
  )
}

interface SectionTitleProps {
  title: string
  subtitle?: string
  gutterBottom?: boolean
}

export function SectionTitle({ title, subtitle, gutterBottom = true }: SectionTitleProps) {
  return (
    <Box sx={{ marginBottom: gutterBottom ? DesignSystem.spacing[4] : 0 }}>
      <Typography variant="h5" sx={{ marginBottom: subtitle ? DesignSystem.spacing[1] : 0 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="muted" sx={{ marginBottom: 0 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  )
}

interface DataLabelProps {
  label: string
  value: string | number | React.ReactNode
  inline?: boolean
}

export function DataLabel({ label, value, inline = false }: DataLabelProps) {
  if (inline) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Typography variant="label">{label}:</Typography>
        <Typography variant={typeof value === 'number' ? 'mono' : 'body1'} sx={{ marginBottom: 0 }}>
          {value}
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="label" sx={{ marginBottom: DesignSystem.spacing[1] }}>
        {label}
      </Typography>
      <Typography variant={typeof value === 'number' ? 'mono' : 'body1'} sx={{ marginBottom: 0 }}>
        {value}
      </Typography>
    </Box>
  )
}