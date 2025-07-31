// Essential Trading Components
// Simplified architecture for Signal/Execute/Track workflow

export { default as SignalIndicator } from './SignalIndicator'
export { default as ExecutionPanel } from './ExecutionPanel'
export { default as PerformanceTracker } from './PerformanceTracker'
export { default as UnifiedDashboard } from './UnifiedDashboard'

// Shared Components
export { default as MinimalCard } from './shared/MinimalCard'
export { default as PriorityButton } from './shared/PriorityButton'
export { default as LiveIndicator } from './shared/LiveIndicator'

// Types
export type { TradingSignal } from '@/lib/trading/signals/SignalGenerator'

export interface Position {
  id: string
  symbol: string
  side: 'long' | 'short'
  size: number
  avgPrice: number
  currentPrice: number
  unrealizedPnl: number
  change: number
}

export interface PerformanceData {
  dailyPnL: number
  totalPortfolioValue: number
  openPositions: Position[]
  chartData: number[]
  stats: {
    winRate: number
    bestTrade: number
    worstTrade: number
    totalTrades: number
  }
}

export interface SimpleOrder {
  symbol: string
  side: 'buy' | 'sell'
  size: number
  type: 'market'
  riskAmount: number
  signalId: string
}

export interface TradingSettings {
  riskProfile: 'conservative' | 'moderate' | 'aggressive'
  autoExecute: boolean
  maxDailyLoss: number
}