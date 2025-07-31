'use client'

import React from 'react'
import DataTable from './DataTable'

// TradesTable - specialized for trading data
export function TradesTable(props: Parameters<typeof DataTable>[0]) {
  return (
    <DataTable
      {...props}
      dense={true}
      stickyHeader={true}
      maxHeight={400}
      highlightRow={(row) => row.status === 'filled'}
    />
  )
}

// PositionsTable - specialized for position data
export function PositionsTable(props: Parameters<typeof DataTable>[0]) {
  return (
    <DataTable
      {...props}
      dense={false}
      stickyHeader={true}
      highlightRow={(row) => Math.abs(row.pnl || 0) > 100}
    />
  )
}

// OrdersTable - specialized for order data
export function OrdersTable(props: Parameters<typeof DataTable>[0]) {
  return (
    <DataTable
      {...props}
      dense={true}
      stickyHeader={true}
      maxHeight={300}
      highlightRow={(row) => row.status === 'pending'}
    />
  )
}

// AnalyticsTable - specialized for analytics data
export function AnalyticsTable(props: Parameters<typeof DataTable>[0]) {
  return (
    <DataTable
      {...props}
      dense={false}
      stickyHeader={false}
    />
  )
}