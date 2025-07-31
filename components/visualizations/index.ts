/**
 * Visualization Components Index
 * 
 * Centralized exports for all visualization components and their variants.
 * Provides consistent importing and Edge Runtime compatibility.
 */

// Core components
export { default as MetricCard } from './MetricCard'
export { default as DataTable } from './DataTable' 
export { default as Sparkline } from './Sparkline'

// MetricCard variants
export {
  PrimaryMetricCard,
  SecondaryMetricCard, 
  StatusMetricCard,
  CriticalMetricCard
} from './MetricCard'

// DataTable variants
export {
  TradesTable,
  PositionsTable,
  OrdersTable,
  AnalyticsTable
} from './DataTable'

// Sparkline variants
export {
  PriceSparkline,
  VolumeSparkline,
  TrendSparkline,
  MinimalSparkline
} from './Sparkline'

// Legacy exports for existing components
export { default as RiskGauge } from './RiskGauge'
export { default as RiskMetrics } from './RiskMetrics'
export { default as PortfolioAllocation } from './PortfolioAllocation'
export { default as ExecutionAnalytics } from './ExecutionAnalytics'
export { default as MarketIndicator } from './MarketIndicator'

// Export types
export type { default as MetricCardProps } from './MetricCard'