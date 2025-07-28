import { 
  KrakenAsset, 
  KrakenAssetPair, 
  KrakenTicker, 
  KrakenBalance, 
  KrakenOrderInfo,
  KrakenTradeHistory,
  KrakenLedgerEntry,
  KrakenTradeVolume,
  KrakenOHLCData,
  KrakenDepth,
  KrakenSpread,
  KrakenTradeBalanceInfo,
  KrakenOrderRequest,
  KrakenOrderResponse
} from '../types/kraken';
import { ApiService } from './ApiService';

export class KrakenService {
  private readonly apiService: ApiService;

  constructor() {
    this.apiService = new ApiService();
  }

  private async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.apiService.get(endpoint, params);
  }

  private async post<T>(endpoint: string, data: Record<string, any>): Promise<T> {
    return this.apiService.post(endpoint, data);
  }

  // Public Market Data
  async getServerTime(): Promise<{ unixtime: number; rfc1123: string }> {
    return this.get('Time');
  }

  async getSystemStatus(): Promise<{
    status: string;
    timestamp: string;
  }> {
    return this.get('SystemStatus');
  }

  async getAssetInfo(assets?: string[]): Promise<Record<string, KrakenAsset>> {
    return this.get('Assets', assets ? { asset: assets.join(',') } : {});
  }

  async getTradableAssetPairs(pairs?: string[]): Promise<Record<string, KrakenAssetPair>> {
    return this.get('AssetPairs', pairs ? { pair: pairs.join(',') } : {});
  }

  async getTickerInformation(pairs: string[]): Promise<Record<string, KrakenTicker>> {
    return this.get('Ticker', { pair: pairs.join(',') });
  }

  async getOHLCData(pair: string, interval?: number, since?: number): Promise<KrakenOHLCData> {
    return this.get('OHLC', { pair, interval, since });
  }

  async getOrderBook(pair: string, count?: number): Promise<KrakenDepth> {
    return this.get('Depth', { pair, count });
  }

  async getRecentTrades(pair: string, since?: number): Promise<{
    last: string;
    trades: [string, string, number, string, string, string, string][];
  }> {
    return this.get('Trades', { pair, since });
  }

  async getRecentSpreads(pair: string, since?: number): Promise<KrakenSpread> {
    return this.get('Spread', { pair, since });
  }

  // Private User Data
  async getAccountBalance(): Promise<KrakenBalance> {
    return this.post('Balance', {});
  }

  async getTradeBalance(asset?: string): Promise<KrakenTradeBalanceInfo> {
    return this.post('TradeBalance', asset ? { asset } : {});
  }

  async getOpenOrders(trades?: boolean, userref?: number): Promise<{
    open: Record<string, KrakenOrderInfo>;
  }> {
    return this.post('OpenOrders', { trades, userref });
  }

  async getClosedOrders(params?: {
    trades?: boolean;
    userref?: number;
    start?: number;
    end?: number;
    ofs?: number;
    closetime?: 'open' | 'close' | 'both';
  }): Promise<{
    closed: Record<string, KrakenOrderInfo>;
    count: number;
  }> {
    return this.get('ClosedOrders', params);
  }

  async queryOrders(txids: string[], trades?: boolean): Promise<Record<string, KrakenOrderInfo>> {
    return this.get('QueryOrders', { txid: txids.join(','), trades });
  }

  async getTradesHistory(params?: {
    type?: 'all' | 'any position' | 'closed position' | 'closing position' | 'no position';
    trades?: boolean;
    start?: number;
    end?: number;
    ofs?: number;
  }): Promise<KrakenTradeHistory> {
    return this.get('TradesHistory', params);
  }

  async queryTrades(txids: string[], trades?: boolean): Promise<Record<string, KrakenTradeHistory>> {
    return this.get('QueryTrades', { txid: txids.join(','), trades });
  }

  async getOpenPositions(txids?: string[], docalcs?: boolean): Promise<Record<string, any>> {
    return this.get('OpenPositions', { txid: txids?.join(','), docalcs });
  }

  async getLedgers(params?: {
    asset?: string;
    aclass?: string;
    type?: 'all' | 'deposit' | 'withdrawal' | 'trade' | 'margin';
    start?: number;
    end?: number;
    ofs?: number;
  }): Promise<{
    ledger: Record<string, KrakenLedgerEntry>;
    count: number;
  }> {
    return this.get('Ledgers', params);
  }

  async queryLedgers(ids: string[]): Promise<Record<string, KrakenLedgerEntry>> {
    return this.get('QueryLedgers', { id: ids.join(',') });
  }

  async getTradeVolume(pairs?: string[]): Promise<KrakenTradeVolume> {
    return this.get('TradeVolume', pairs ? { pair: pairs.join(',') } : {});
  }

  // Private User Trading
  async addOrder(params: {
    pair: string;
    type: 'buy' | 'sell';
    ordertype: 'market' | 'limit' | 'stop-loss' | 'take-profit' | 'stop-loss-limit' | 'take-profit-limit' | 'settle-position';
    volume: number;
    price?: number;
    price2?: number;
    leverage?: string;
    oflags?: string;
    starttm?: number;
    expiretm?: number;
    userref?: number;
    validate?: boolean;
    close_ordertype?: string;
    close_price?: number;
    close_price2?: number;
    trading_agreement?: 'agree';
  }): Promise<{
    descr: { order: string };
    txid: string[];
  }> {
    return this.post('AddOrder', params);
  }

  async cancelOrder(txid: string): Promise<{
    count: number;
    pending?: boolean;
  }> {
    return this.post('CancelOrder', { txid });
  }

  async cancelAllOrders(): Promise<{ count: number }> {
    return this.post('CancelAll', {});
  }

  async cancelAllOrdersAfter(timeout: number): Promise<{
    currentTime: string;
    triggerTime: string;
  }> {
    return this.post('CancelAllOrdersAfter', { timeout });
  }

  // Helper methods
  parseTickerData(ticker: KrakenTicker) {
    return {
      ask: this.parsePrice(ticker.a[0]),
      bid: this.parsePrice(ticker.b[0]),
      lastPrice: this.parsePrice(ticker.c[0]),
      volume24h: this.parseVolume(ticker.v[1]),
      vwap24h: this.parsePrice(ticker.p[1]),
      trades24h: ticker.t[1],
      low24h: this.parsePrice(ticker.l[1]),
      high24h: this.parsePrice(ticker.h[1]),
      opening: this.parsePrice(ticker.o),
    };
  }

  formatPairName(base: string, quote: string): string {
    return `X${base}Z${quote}`;
  }

  parsePrice(price: string): number {
    return parseFloat(price);
  }

  parseVolume(volume: string): number {
    return parseFloat(volume);
  }

  async getAssets(): Promise<{ [key: string]: KrakenAsset }> {
    return this.get('Assets');
  }

  async getAssetPairs(): Promise<{ [key: string]: KrakenAssetPair }> {
    return this.get('AssetPairs');
  }

  async getTicker(symbol: string): Promise<any> {
    return this.get('Ticker', { pair: symbol });
  }

  async getOHLC(pair: string, interval: number = 1): Promise<KrakenOHLCData> {
    return this.get('OHLC', { pair, interval });
  }

  async placeOrder(request: KrakenOrderRequest): Promise<KrakenOrderResponse> {
    try {
      const response = await this.post<{
        order_id: string;
        cl_ord_id?: string;
        order_userref?: number;
        warnings?: string[];
      }>('/private/add_order', {
        ...request,
        // Convert timestamps to RFC3339 format if provided
        effective_time: request.effective_time ? new Date(request.effective_time).toISOString() : undefined,
        expire_time: request.expire_time ? new Date(request.expire_time).toISOString() : undefined,
        deadline: request.deadline ? new Date(request.deadline).toISOString() : undefined
      });

      return {
        ...response,
        success: true,
        time_in: new Date().toISOString(),
        time_out: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        order_id: '',
        success: false,
        error: error.message,
        time_in: new Date().toISOString(),
        time_out: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
export const krakenService = new KrakenService(); 