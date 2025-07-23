export interface MarketData {
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades?: number;
  vwap?: number;
}

export interface MarketUpdate {
  type: 'ticker' | 'trade' | 'orderbook';
  symbol: string;
  data: TickerData | TradeData | OrderBookData;
  timestamp: number;
}

export interface TickerData {
  last: number;
  high: number;
  low: number;
  volume: number;
  vwap?: number;
  trades?: number;
  bid?: number;
  ask?: number;
}

export interface TradeData {
  price: number;
  volume: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

export interface OrderBookData {
  bids: [number, number][]; // [price, volume][]
  asks: [number, number][]; // [price, volume][]
}

export interface OrderBookLevel {
  price: number;
  volume: number;
}

export interface MarketDepth {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface MarketStats {
  high24h: number;
  low24h: number;
  volume24h: number;
  priceChange24h: number;
  priceChangePercent24h: number;
} 