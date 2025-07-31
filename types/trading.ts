export type OrderType = 'market' | 'limit'
export type OrderStatus = 'pending' | 'open' | 'closed' | 'canceled' | 'filled' | 'cancelled' | 'rejected'
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'GTD'

export interface Order {
  id: string;
  symbol: string;
  type: OrderType;
  side: 'buy' | 'sell';
  amount: number;
  price?: number;
  status: OrderStatus;
  timestamp: number;
  filled: number;
  remaining: number;
  average?: number;
  cost?: number;
  fee?: { cost: number; currency?: string };
  timeInForce?: TimeInForce;
  stopLoss?: number;
  takeProfit?: number;
  metadata?: Record<string, any>;
}

export interface Trade extends Order {
  executedPrice: number;
  fee: number;
  timestamp: number;
  id: string;
}

export interface BalanceHistory {
  timestamp: number;
  totalValue: number;
  balances: Balance[];
}

export interface PerformanceMetrics {
  dailyPnL: number;
  dailyRoi: number;
  weeklyPnL: number;
  weeklyRoi: number;
  monthlyPnL: number;
  monthlyRoi: number;
  allTimePnL: number;
  allTimeRoi: number;
}

export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
  usdValue: number;
  pnl24h?: number;  // 24h profit/loss
  roi24h?: number;  // 24h return on investment
}

export interface TradeAnalysis {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  averageHoldingTime: number;
  totalVolume: number;
  totalFees: number;
  netPnL: number;
}

export interface TradeWithPnL extends Trade {
  pnl: number;
  roi: number;
  holdingTime: number;
} 