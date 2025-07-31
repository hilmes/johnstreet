'use client'

import React from 'react'
import Sparkline from './Sparkline'
import { DesignSystem } from '@/lib/design'

// PriceSparkline - specialized for price data
export function PriceSparkline(props: Omit<Parameters<typeof Sparkline>[0], 'color'> & { 
  isPositive?: boolean 
}) {
  const { isPositive = true, ...sparklineProps } = props
  
  return (
    <Sparkline
      {...sparklineProps}
      color={isPositive ? DesignSystem.colors.market.up : DesignSystem.colors.market.down}
      showArea={true}
      strokeWidth={2}
    />
  )
}

// VolumeSparkline - specialized for volume data
export function VolumeSparkline(props: Parameters<typeof Sparkline>[0]) {
  return (
    <Sparkline
      {...props}
      color={DesignSystem.colors.market.volume}
      showArea={true}
      strokeWidth={1}
    />
  )
}

// TrendSparkline - specialized for trend analysis
export function TrendSparkline(props: Parameters<typeof Sparkline>[0]) {
  return (
    <Sparkline
      {...props}
      color={DesignSystem.colors.system.active}
      showDots={true}
      strokeWidth={1.5}
    />
  )
}

// MinimalSparkline - ultra-compact version
export function MinimalSparkline(props: Parameters<typeof Sparkline>[0]) {
  return (
    <Sparkline
      {...props}
      width={60}
      height={16}
      strokeWidth={1}
    />
  )
}