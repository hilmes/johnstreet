export interface MarketUpdate {
  type: 'ticker';
  symbol: string;
  price: number;
  volume: number;
  high24h: number;
  low24h: number;
  change24h: number;
}

export interface WebSocketMessage {
  event?: string;
  channel?: string;
  type?: string;
  method?: string;
  params?: any;
  data?: any;
  reqid?: number;
  req_id?: number;
  error?: string[];
  result?: any;
  pair?: string[];
  message?: string;
}

export interface TickerData {
  price: number;
  volume: number;
  high24h: number;
  low24h: number;
  change24h: number;
}

export interface OrderBookData {
  bids: [number, number][]; // [price, amount][]
  asks: [number, number][]; // [price, amount][]
} 