/**
 * Type definitions for trading strategies
 */

export interface StrategyPerformance {
  totalPnl: number
  dailyPnl: number
  winRate: number
  sharpeRatio: number
  maxDrawdown: number
  totalTrades: number
  avgTradeSize: number
}

export interface StrategyRiskMetrics {
  volatility: number
  valueAtRisk: number
  beta: number
}

export interface Strategy {
  id: string
  name: string
  description: string
  type: 'momentum' | 'mean_reversion' | 'scalping' | 'market_making' | 'ai_generated'
  status: 'active' | 'paused' | 'stopped' | 'testing'
  performance: StrategyPerformance
  riskMetrics: StrategyRiskMetrics
  lastActive: Date
  createdAt: Date
  timeframe: string
  symbols: string[]
  code?: string
  language?: string
}

export type StrategyFormData = Omit<Strategy, 'id' | 'createdAt' | 'lastActive' | 'performance' | 'riskMetrics'>