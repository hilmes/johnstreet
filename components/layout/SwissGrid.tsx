'use client'

import React from 'react'
import { Box, Grid, Container } from '@mui/material'
import { DesignSystem } from '@/lib/design/DesignSystem'

interface SwissGridProps {
  children: React.ReactNode
  container?: boolean
  spacing?: number | string
  columns?: number
  className?: string
}

export function SwissGrid({ 
  children, 
  container = true, 
  spacing = DesignSystem.grid.gutter,
  columns = DesignSystem.grid.columns,
  className 
}: SwissGridProps) {
  const content = (
    <Grid 
      container 
      spacing={typeof spacing === 'number' ? spacing / 8 : spacing}
      sx={{
        margin: 0,
        width: '100%',
      }}
      className={className}
    >
      {children}
    </Grid>
  )

  if (!container) return content

  return (
    <Container
      maxWidth={false}
      sx={{
        padding: `0 ${DesignSystem.grid.margin}px`,
        maxWidth: '1920px',
        margin: '0 auto',
      }}
    >
      {content}
    </Container>
  )
}

interface SwissGridItemProps {
  children: React.ReactNode
  xs?: number | 'auto'
  sm?: number | 'auto'
  md?: number | 'auto'
  lg?: number | 'auto'
  xl?: number | 'auto'
  className?: string
}

export function SwissGridItem({ 
  children, 
  xs = 12,
  sm,
  md,
  lg,
  xl,
  className 
}: SwissGridItemProps) {
  return (
    <Grid 
      item 
      xs={xs}
      sm={sm}
      md={md}
      lg={lg}
      xl={xl}
      className={className}
    >
      {children}
    </Grid>
  )
}

interface PageSectionProps {
  children: React.ReactNode
  spacing?: keyof typeof DesignSystem.grid.verticalRhythm
  className?: string
  noPadding?: boolean
}

export function PageSection({ 
  children, 
  spacing = 'lg',
  className,
  noPadding = false
}: PageSectionProps) {
  return (
    <Box
      component="section"
      sx={{
        paddingTop: noPadding ? 0 : `${DesignSystem.grid.verticalRhythm[spacing]}px`,
        paddingBottom: noPadding ? 0 : `${DesignSystem.grid.verticalRhythm[spacing]}px`,
      }}
      className={className}
    >
      {children}
    </Box>
  )
}

interface ContentBlockProps {
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | false
  center?: boolean
  className?: string
}

export function ContentBlock({ 
  children, 
  maxWidth = 'lg',
  center = false,
  className
}: ContentBlockProps) {
  const maxWidths = {
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
  }

  return (
    <Box
      sx={{
        maxWidth: maxWidth ? `${maxWidths[maxWidth]}px` : 'none',
        margin: center ? '0 auto' : 0,
        width: '100%',
      }}
      className={className}
    >
      {children}
    </Box>
  )
}

// Layout compositions for common patterns
export function TwoColumnLayout({ 
  left, 
  right,
  leftWidth = 8,
  rightWidth = 4,
  spacing = DesignSystem.grid.gutter,
  reverseOnMobile = false
}: {
  left: React.ReactNode
  right: React.ReactNode
  leftWidth?: number
  rightWidth?: number
  spacing?: number
  reverseOnMobile?: boolean
}) {
  return (
    <SwissGrid spacing={spacing}>
      <SwissGridItem 
        xs={12} 
        md={leftWidth}
        sx={{ order: { xs: reverseOnMobile ? 2 : 1, md: 1 } }}
      >
        {left}
      </SwissGridItem>
      <SwissGridItem 
        xs={12} 
        md={rightWidth}
        sx={{ order: { xs: reverseOnMobile ? 1 : 2, md: 2 } }}
      >
        {right}
      </SwissGridItem>
    </SwissGrid>
  )
}

export function ThreeColumnLayout({ 
  left, 
  center, 
  right,
  spacing = DesignSystem.grid.gutter
}: {
  left: React.ReactNode
  center: React.ReactNode
  right: React.ReactNode
  spacing?: number
}) {
  return (
    <SwissGrid spacing={spacing}>
      <SwissGridItem xs={12} md={4}>
        {left}
      </SwissGridItem>
      <SwissGridItem xs={12} md={4}>
        {center}
      </SwissGridItem>
      <SwissGridItem xs={12} md={4}>
        {right}
      </SwissGridItem>
    </SwissGrid>
  )
}

export function MetricsGrid({ 
  children,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 }
}: {
  children: React.ReactNode
  columns?: { xs?: number; sm?: number; md?: number; lg?: number }
}) {
  const childrenArray = React.Children.toArray(children)
  
  return (
    <SwissGrid spacing={DesignSystem.grid.gutter}>
      {childrenArray.map((child, index) => (
        <SwissGridItem
          key={index}
          xs={12 / (columns.xs || 1)}
          sm={columns.sm ? 12 / columns.sm : undefined}
          md={columns.md ? 12 / columns.md : undefined}
          lg={columns.lg ? 12 / columns.lg : undefined}
        >
          {child}
        </SwissGridItem>
      ))}
    </SwissGrid>
  )
}