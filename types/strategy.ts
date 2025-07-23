export type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export interface StrategyConfig {
  name: string;
  description: string;
  timeframe: TimeFrame;
  pairs: string[];
  parameters: Record<string, {
    type: 'number' | 'boolean' | 'string' | 'select';
    default: any;
    description: string;
    options?: string[];  // For select type
    min?: number;        // For number type
    max?: number;        // For number type
  }>;
}

export interface StrategyPosition {
  pair: string;
  side: 'long' | 'short' | 'flat';
  entryPrice: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  timestamp: number;
}

export interface StrategyState {
  positions: StrategyPosition[];
  equity: number;
  balance: number;
  risk: number;
  performance: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
}

export interface MarketContext {
  timestamp: number;
  pair: string;
  price: number;
  volume: number;
  indicators: Record<string, number | number[]>;
  ohlcv: {
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    volume: number[];
  };
}

export interface StrategySignal {
  type: 'entry' | 'exit';
  side: 'buy' | 'sell';
  pair: string;
  price: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  reason: string;
  timestamp: number;
}

export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

export interface StrategyAlert {
  level: AlertLevel;
  category: 'risk' | 'performance' | 'system';
  message: string;
  timestamp: number;
  data?: any;
}

export interface StrategyMetrics {
  equity: number;
  balance: number;
  openPositions: number;
  dailyPnL: number;
  dailyRoi: number;
  drawdown: number;
  drawdownPercent: number;
  marginLevel: number;
  latency: number;
  risk: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  timestamp: number;
}

export type TriggerType = 
  | 'PRICE_ABOVE'
  | 'PRICE_BELOW'
  | 'PRICE_CHANGE_PERCENT'
  | 'VOLUME_ABOVE'
  | 'VOLUME_BELOW'
  | 'RSI_ABOVE'
  | 'RSI_BELOW'
  | 'MACD_CROSS_ABOVE'
  | 'MACD_CROSS_BELOW'
  | 'MA_CROSS_ABOVE'
  | 'MA_CROSS_BELOW'
  | 'TIME_OF_DAY'
  | 'CUSTOM_INDICATOR';

export type ActionType =
  | 'BUY_MARKET'
  | 'SELL_MARKET'
  | 'BUY_LIMIT'
  | 'SELL_LIMIT'
  | 'CANCEL_ORDERS'
  | 'SET_STOP_LOSS'
  | 'SET_TAKE_PROFIT'
  | 'SEND_NOTIFICATION'
  | 'CUSTOM_ACTION';

export interface IFTTTCondition {
  id: string;
  type: TriggerType;
  parameters: {
    value?: number;
    timeframe?: string;
    indicator?: string;
    comparison?: 'above' | 'below' | 'equals';
    period?: number;
    customFormula?: string;
  };
}

export interface IFTTTAction {
  id: string;
  type: ActionType;
  parameters: {
    amount?: number;
    price?: number;
    percentage?: number;
    message?: string;
    customCode?: string;
  };
}

export interface IFTTTRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: IFTTTCondition[];
  actions: IFTTTAction[];
  logicOperator: 'AND' | 'OR';
  cooldownMinutes: number;
  lastTriggered?: number;
}

export interface IFTTTStrategy extends Strategy {
  type: 'IFTTT';
  description: string;
  timeframe: TimeFrame;
  pairs: string[];
  parameters: Record<string, {
    type: 'number' | 'boolean' | 'string' | 'select';
    default: any;
    description: string;
    options?: string[];
    min?: number;
    max?: number;
  }>;
  rules: IFTTTRule[];
  maxConcurrentTrades: number;
  riskPerTrade: number;
  totalRiskPercentage: number;
}

export interface Strategy {
  id: string;
  name: string;
  type: 'GRID' | 'DCA' | 'MOMENTUM' | 'CUSTOM' | 'IFTTT';
  pair: string;
  isActive: boolean;
  config: {
    gridSize?: number;
    upperPrice?: number;
    lowerPrice?: number;
    investmentAmount?: number;
    takeProfitPercentage?: number;
    stopLossPercentage?: number;
    interval?: string;
    indicators?: string[];
  };
} 