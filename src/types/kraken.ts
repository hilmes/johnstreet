export interface KrakenAsset {
  aclass: string;
  altname: string;
  decimals: number;
  display_decimals: number;
}

export interface KrakenAssetPair {
  altname: string;
  wsname: string;
  base: string;
  quote: string;
  lot: string;
  pair_decimals: number;
  lot_decimals: number;
  lot_multiplier: number;
  leverage_buy: number[];
  leverage_sell: number[];
  fees: [number, number][];
  fees_maker: [number, number][];
  fee_volume_currency: string;
  margin_call: number;
  margin_stop: number;
}

export interface KrakenTicker {
  a: string[];  // ask [price, wholeLotVolume, lotVolume]
  b: string[];  // bid [price, wholeLotVolume, lotVolume]
  c: string[];  // last trade closed [price, lot volume]
  v: string[];  // volume [today, last 24 hours]
  p: string[];  // volume weighted average price [today, last 24 hours]
  t: number[];  // number of trades [today, last 24 hours]
  l: string[];  // low [today, last 24 hours]
  h: string[];  // high [today, last 24 hours]
  o: string;    // today's opening price
}

export interface KrakenBalance {
  [key: string]: string;  // asset => amount
}

export interface KrakenOrderInfo {
  refid: string | null;
  userref: number;
  status: string;
  opentm: number;
  starttm: number;
  expiretm: number;
  descr: {
    pair: string;
    type: string;
    ordertype: string;
    price: string;
    price2: string;
    leverage: string;
    order: string;
    close: string;
  };
  vol: string;
  vol_exec: string;
  cost: string;
  fee: string;
  price: string;
  stopprice: string;
  limitprice: string;
  misc: string;
  oflags: string;
  trades: string[];
}

export interface KrakenTradeHistory {
  trades: Record<string, {
    ordertxid: string;
    pair: string;
    time: number;
    type: string;
    ordertype: string;
    price: string;
    cost: string;
    fee: string;
    vol: string;
    margin: string;
    misc: string;
    posstatus: string;
    cprice: string;
    ccost: string;
    cfee: string;
    cvol: string;
    cmargin: string;
    net: string;
    trades: string[];
  }>;
  count: number;
}

export interface KrakenLedgerEntry {
  refid: string;
  time: number;
  type: string;
  aclass: string;
  asset: string;
  amount: string;
  fee: string;
  balance: string;
}

export interface KrakenTradeVolume {
  currency: string;
  volume: string;
  fees: Record<string, {
    fee: string;
    minfee: string;
    maxfee: string;
    nextfee: string | null;
    nextvolume: string | null;
    tiervolume: string | null;
  }>;
  fees_maker: Record<string, {
    fee: string;
    minfee: string;
    maxfee: string;
    nextfee: string | null;
    nextvolume: string | null;
    tiervolume: string | null;
  }>;
}

export interface KrakenOHLCResponse {
  error: string[];
  result: Record<string, [number, string, string, string, string, string, string, number][]> & {
    last: number;
  };
}

export interface KrakenOHLCPairData {
  candles: Array<[number, string, string, string, string, string, string, number]>;
  last: number;
}

export interface KrakenOHLCData {
  [pair: string]: KrakenOHLCPairData;
}

export interface KrakenDepth {
  [pair: string]: {
    asks: [string, string, number][];
    bids: [string, string, number][];
  };
}

export interface KrakenSpreadPairData {
  spreads: [number, string, string][];
  last: number;
}

export interface KrakenSpread {
  [pair: string]: KrakenSpreadPairData;
}

export interface KrakenTradeBalanceInfo {
  eb: string;  // equivalent balance (combined balance of all currencies)
  tb: string;  // trade balance (combined balance of all equity currencies)
  m: string;   // margin amount of open positions
  n: string;   // unrealized net profit/loss of open positions
  c: string;   // cost basis of open positions
  v: string;   // current floating valuation of open positions
  e: string;   // equity = trade balance + unrealized net profit/loss
  mf: string;  // free margin = equity - initial margin (maximum margin available to open new positions)
  ml: string;  // margin level = (equity / initial margin) * 100
}

export type OrderType = 'limit' | 'market' | 'iceberg' | 'stop-loss' | 'stop-loss-limit' | 
  'take-profit' | 'take-profit-limit' | 'trailing-stop' | 'trailing-stop-limit' | 'settle-position';

export type OrderSide = 'buy' | 'sell';

export type TimeInForce = 'gtc' | 'gtd' | 'ioc';

export type PriceType = 'static' | 'pct' | 'quote';

export type STPType = 'cancel_newest' | 'cancel_oldest' | 'cancel_both';

export interface OrderTriggers {
  reference?: 'index' | 'last';
  price: number;
  price_type?: PriceType;
}

export interface ConditionalOrder {
  order_type: Exclude<OrderType, 'market' | 'iceberg' | 'settle-position'>;
  limit_price?: number;
  limit_price_type?: PriceType;
  trigger_price: number;
  trigger_price_type?: PriceType;
}

export interface KrakenOrderRequest {
  order_type: OrderType;
  side: OrderSide;
  order_qty: number;
  symbol: string;
  limit_price?: number;
  limit_price_type?: PriceType;
  triggers?: OrderTriggers;
  time_in_force?: TimeInForce;
  margin?: boolean;
  post_only?: boolean;
  reduce_only?: boolean;
  effective_time?: string;
  expire_time?: string;
  deadline?: string;
  cl_ord_id?: string;
  order_userref?: number;
  conditional?: ConditionalOrder;
  display_qty?: number;
  fee_preference?: 'base' | 'quote';
  no_mpp?: boolean;
  stp_type?: STPType;
  cash_order_qty?: number;
  validate?: boolean;
  sender_sub_id?: string;
}

export interface KrakenOrderResponse {
  order_id: string;
  cl_ord_id?: string;
  order_userref?: number;
  warnings?: string[];
  error?: string;
  success: boolean;
  time_in: string;
  time_out: string;
} 