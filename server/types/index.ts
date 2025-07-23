export interface WebSocketMessage {
  event: string;
  channel?: string;
  data?: any;
}

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  high24h: number;
  low24h: number;
  change24h: number;
}

export interface OrderBookEntry {
  price: number;
  amount: number;
}

export interface OrderBookUpdate {
  symbol: string;
  bids: [number, number][];
  asks: [number, number][];
} 