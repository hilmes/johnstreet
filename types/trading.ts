export interface Order {
  symbol: string;
  type: 'market' | 'limit';
  side: 'buy' | 'sell';
  amount: number;
  price?: number;
  status?: 'pending' | 'filled' | 'cancelled' | 'rejected';
  timestamp?: number;
  id?: string;
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