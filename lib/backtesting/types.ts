export interface MarketData {
  timestamp: Date
  symbol: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  vwap?: number
}

export interface Trade {
  id: string
  timestamp: Date
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  price: number
  commission: number
  slippage: number
  strategyId: string
}

export interface Position {
  symbol: string
  quantity: number
  averagePrice: number
  marketValue: number
  unrealizedPnL: number
  realizedPnL: number
}

export interface Portfolio {
  cash: number
  positions: Map<string, Position>
  totalValue: number
  totalPnL: number
  trades: Trade[]
}

export interface BacktestConfig {
  startDate: Date
  endDate: Date
  initialCapital: number
  symbols: string[]
  commission: number
  slippage: number
  benchmarkSymbol?: string
  riskFreeRate?: number
}

export interface PerformanceMetrics {
  totalReturn: number
  annualizedReturn: number
  volatility: number
  sharpeRatio: number
  sortinoRatio: number
  maxDrawdown: number
  calmarRatio: number
  winRate: number
  profitFactor: number
  totalTrades: number
  averageTradeReturn: number
  averageWin: number
  averageLoss: number
  largestWin: number
  largestLoss: number
  consecutiveWins: number
  consecutiveLosses: number
  beta?: number
  alpha?: number
  informationRatio?: number
}

export interface BacktestResult {
  config: BacktestConfig
  portfolio: Portfolio
  metrics: PerformanceMetrics
  equityCurve: Array<{ timestamp: Date; value: number; drawdown: number }>
  trades: Trade[]
  positions: Array<{ timestamp: Date; positions: Position[] }>
  benchmarkReturns?: number[]
  strategyReturns: number[]
}

export abstract class BaseStrategy {
  protected name: string
  protected parameters: Record<string, any>
  
  constructor(name: string, parameters: Record<string, any> = {}) {
    this.name = name
    this.parameters = parameters
  }

  abstract onBar(data: MarketData, portfolio: Portfolio): Signal[]
  abstract onTrade?(trade: Trade, portfolio: Portfolio): void
  abstract initialize?(symbols: string[]): void
  abstract finalize?(portfolio: Portfolio): void

  getName(): string {
    return this.name
  }

  getParameters(): Record<string, any> {
    return this.parameters
  }
}

export interface Signal {
  symbol: string
  action: 'buy' | 'sell' | 'hold'
  quantity?: number
  targetWeight?: number
  price?: number
  stopLoss?: number
  takeProfit?: number
  strategyId: string
  confidence?: number
  reason?: string
}

export interface MarketSimulator {
  getNextBar(): MarketData | null
  hasMoreData(): boolean
  getCurrentTimestamp(): Date
  getSymbols(): string[]
  reset(): void
}

export interface ExecutionModel {
  executeSignal(signal: Signal, marketData: MarketData, portfolio: Portfolio): Trade | null
  calculateSlippage(signal: Signal, marketData: MarketData): number
  calculateCommission(trade: Trade): number
}