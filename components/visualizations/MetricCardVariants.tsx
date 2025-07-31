'use client'

import React from 'react'
import MetricCard from './MetricCard'

// Primary Metric Card - for key financial metrics
export function PrimaryMetricCard(props: Parameters<typeof MetricCard>[0]) {
  return (
    <MetricCard
      {...props}
      priority="high"
      interactive={true}
    />
  )
}

// Secondary Metric Card - for supporting metrics
export function SecondaryMetricCard(props: Parameters<typeof MetricCard>[0]) {
  return (
    <MetricCard
      {...props}
      priority="medium"
      dense={true}
      interactive={false}
    />
  )
}

// Status Metric Card - for system status indicators
export function StatusMetricCard(props: Parameters<typeof MetricCard>[0]) {
  return (
    <MetricCard
      {...props}
      priority="low"
      dense={true}
      interactive={false}
    />
  )
}

// Critical Metric Card - for alerts and warnings
export function CriticalMetricCard(props: Parameters<typeof MetricCard>[0]) {
  return (
    <MetricCard
      {...props}
      priority="high"
      status="critical"
      interactive={true}
    />
  )
}