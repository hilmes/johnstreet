import { Subject, Subscription, BehaviorSubject } from 'rxjs';
import { MarketUpdate, WebSocketMessage as WSMessage } from '../types/websocket';
import { API_CONFIG } from '../config/api';

export interface OrderParams {
  order_type: 'market' | 'limit';
  side: 'buy' | 'sell';
  limit_price?: number;
  order_userref?: number;
  order_qty: number;
  symbol: string;
  token?: string;
}

export interface OrderRequest {
  method: 'add_order' | 'cancel_order' | 'cancel_all' | 'edit_order' | 'cancel_all_orders_after' | 'batch_add' | 'batch_cancel';
  params: OrderParams | EditOrderParams | CancelOrderParams | CancelAllParams | CancelAllAfterParams | BatchAddParams | BatchCancelParams;
  req_id?: number;
}

export interface OrderResponse {
  error?: string[];
  result?: {
    order_id: string;
    status: string;
    reason?: string;
  };
  req_id?: number;
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
}

export interface KrakenStatus {
  api_version: string;
  connection_id: number;
  system: 'online' | 'maintenance' | 'cancel_only';
  version: string;
}

export interface WebSocketStatus {
  connected: boolean;
  error?: string;
  lastPing?: number;
  latency?: number;
  krakenStatus?: KrakenStatus;
}

export interface AmendOrderParams {
  cl_ord_id?: string;
  order_id?: string;
  limit_price?: number;
  order_qty?: number;
  token?: string;
}

export interface EditOrderParams {
  order_id: string;
  order_qty?: number;
  symbol: string;
  token: string;
}

export interface CancelOrderParams {
  order_id: string | string[];
  token: string;
}

export interface ExecutionUpdate {
  order_id: string;
  status: string;
  reason?: string;
  timestamp: string;
}

export interface CancelAllParams {
  token: string;
}

export interface CancelAllAfterParams {
  timeout: number;
  token: string;
}

export interface BatchOrderParams extends Omit<OrderParams, 'token' | 'symbol'> {
  limit_price: number;
  order_qty: number;
  order_type: 'limit';
  order_userref?: number;
  side: 'buy' | 'sell';
  stp_type?: 'cancel_both' | 'cancel_passive' | 'cancel_aggressive';
}

export interface BatchAddParams {
  deadline?: string;
  orders: BatchOrderParams[];
  symbol: string;
  token: string;
  validate?: boolean;
}

export interface BatchCancelParams {
  orders: string[];
  token: string;
}

export interface OrderBookLevel {
  price: string;
  quantity: string;
  timestamp: string;
  update_type?: 'snapshot' | 'update';
}

export interface OrderBookUpdate {
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
  symbol: string;
  checksum?: number;
  timestamp: string;
  type: 'snapshot' | 'update';
}

export interface Level3Order {
  order_id: string;
  price: string;
  quantity: string;
  timestamp: string;
  update_type?: 'new' | 'update' | 'delete';
}

export interface Level3Update {
  asks: Level3Order[];
  bids: Level3Order[];
  symbol: string;
  checksum?: number;
  timestamp: string;
  type: 'snapshot' | 'update';
  depth?: number;
}

export interface TickerData {
  symbol: string;
  bid: number;
  bid_qty: number;
  ask: number;
  ask_qty: number;
  last: number;
  volume: number;
  vwap: number;
  low: number;
  high: number;
  change: number;
  change_pct: number;
}

export interface TickerUpdate {
  type: 'snapshot' | 'update';
  data: TickerData[];
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private lastConnectionAttempt = 0;
  private minConnectionInterval = 60000; // 1 minute between attempts
  private lastError: string | null = null;
  private isReconnecting = false;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime: number = 0;
  private pingTimeout: NodeJS.Timeout | null = null;
  private reqId = 1;
  private orderCallbacks: Map<number, (response: OrderResponse) => void> = new Map();
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private statusSubject = new BehaviorSubject<WebSocketStatus>({ connected: false });
  private marketUpdateSubject = new Subject<MarketUpdate>();
  private orderBookSubject = new Subject<OrderBookUpdate>();
  private readonly wsUrl: string;
  private deadManSwitchInterval: NodeJS.Timeout | null = null;
  private deadManSwitchTimeout: number = 0;
  private deadManSwitchFailures: number = 0;
  private level3Subject = new Subject<Level3Update>();
  private tickerSubject = new Subject<TickerUpdate>();
  private connectionQueue: Array<() => void> = [];
  private isProcessingQueue = false;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    this.wsUrl = API_CONFIG.ws.public;
    this.connect().catch(error => {
      console.error('Failed to establish initial WebSocket connection:', error);
      this.statusSubject.next({ 
        connected: false, 
        error: error.message || 'Failed to establish initial WebSocket connection'
      });
    });
  }

  private async processConnectionQueue() {
    if (this.isProcessingQueue || this.connectionQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    while (this.connectionQueue.length > 0) {
      const task = this.connectionQueue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('Error processing connection task:', error);
        }
      }
    }
    this.isProcessingQueue = false;
  }

  public async connect(): Promise<void> {
    // If we already have a connection promise, return it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // If we're already connected, just return
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    // Create a new connection promise
    this.connectionPromise = new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        this.connectionPromise = null;
      };

      this.establishConnection()
        .then(() => {
          cleanup();
          resolve();
        })
        .catch((error) => {
          cleanup();
          reject(error);
        });
    });

    return this.connectionPromise;
  }

  private async establishConnection(): Promise<void> {
    // If we're in the process of connecting, queue this request
    if (this.isReconnecting) {
      console.log('Connection in progress, queueing request');
      return new Promise((resolve, reject) => {
        this.connectionQueue.push(async () => {
          try {
            await this.establishConnection();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    // If we have a websocket in a closing state, wait for it to finish
    if (this.ws?.readyState === WebSocket.CLOSING) {
      await new Promise<void>((resolve) => {
        const checkClosed = setInterval(() => {
          if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
            clearInterval(checkClosed);
            resolve();
          }
        }, 100);
      });
    }

    // Check if we're trying to connect too frequently
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastConnectionAttempt;
    if (timeSinceLastAttempt < this.minConnectionInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minConnectionInterval - timeSinceLastAttempt));
    }

    this.lastConnectionAttempt = Date.now();
    this.isReconnecting = true;

    try {
      console.log('Connecting to WebSocket server at:', this.wsUrl);
      
      // Create WebSocket connection
      this.ws = new WebSocket(this.wsUrl);

      await new Promise<void>((resolve, reject) => {
        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket connection timeout');
            this.ws.close();
            this.isReconnecting = false;
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        this.ws!.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket connected successfully');
          this.reconnectAttempts = 0;
          this.lastError = null;
          this.isReconnecting = false;
          this.statusSubject.next({ connected: true });
          
          // Set up heartbeat
          this.setupPing();

          // Process any queued connection requests
          this.processConnectionQueue();
          
          resolve();
        };

        this.ws!.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket disconnected:', event.code, event.reason);
          
          // Track rate limit closes
          if (event.code === 429 || event.reason?.includes('429')) {
            this.lastError = 'Rate limit exceeded';
            this.minConnectionInterval = Math.min(this.minConnectionInterval * 2, 300000);
          }
          
          this.statusSubject.next({ 
            connected: false,
            error: `Connection closed: ${event.code} ${event.reason}`
          });
          this.clearPing();
          this.isReconnecting = false;
          this.handleDisconnect();
          reject(new Error(`Connection closed: ${event.code} ${event.reason}`));
        };

        this.ws!.onerror = (event: Event) => {
          clearTimeout(connectionTimeout);
          const error = event as ErrorEvent;
          console.error('WebSocket error:', error);
          
          if (error.message?.includes('429')) {
            this.lastError = error.message;
            this.minConnectionInterval = Math.min(this.minConnectionInterval * 2, 300000);
          }
          
          this.statusSubject.next({ 
            connected: false, 
            error: error.message || 'Connection error'
          });
          this.isReconnecting = false;
          reject(error);
        };

        this.ws!.onmessage = this.handleMessage.bind(this);
      });
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.handleDisconnect();
      throw error;
    }
  }

  private handleMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Received WebSocket message:', data);
      
      // Handle system messages
      if (data.event === 'heartbeat') {
        if (this.pingTimeout) {
          clearTimeout(this.pingTimeout);
          this.pingTimeout = null;
        }
        this.sendMessage({ event: 'heartbeat' });
        return;
      }

      if (data.event === 'error') {
        const errorMessage = data.error?.[0] || 'Unknown server error';
        console.error('Server error:', errorMessage);
        this.statusSubject.next({
          connected: this.ws?.readyState === WebSocket.OPEN,
          error: errorMessage
        });
        return;
      }

      // Handle ticker updates
      if (data.type === 'ticker') {
        const tickerUpdate = {
          symbol: data.symbol,
          price: data.price
        };
        
        // Notify ticker subscribers
        const subscribers = this.subscribers.get('ticker');
        if (subscribers) {
          subscribers.forEach(callback => callback(tickerUpdate));
        }
        return;
      }

      // Handle other message types
      const subscribers = this.subscribers.get(data.channel || '');
      if (subscribers) {
        subscribers.forEach(callback => callback(data.data));
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }

  public async reconnect(): Promise<void> {
    // If we're already in the process of reconnecting, don't start another attempt
    if (this.isReconnecting) {
      console.log('Already attempting to reconnect');
      return;
    }

    console.log('Initiating reconnection...');
    try {
      await this.disconnect();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a second after disconnect
      await this.connect();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error during reconnection:', error);
      this.isReconnecting = false;
      this.lastError = errorMessage;
      throw new Error(`Reconnection failed: ${errorMessage}`);
    }
  }

  private setupPing() {
    this.clearPing();
    
    // Send heartbeat every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now();
        this.sendMessage({ event: 'heartbeat' });
        
        // Set timeout for response (5 seconds)
        this.pingTimeout = setTimeout(() => {
          console.warn('Heartbeat response timeout - reconnecting');
          this.reconnect().catch(error => {
            console.error('Failed to reconnect after heartbeat timeout:', error);
          });
        }, 5000);
      }
    }, 30000);
  }

  private clearPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = null;
    }
  }

  private handlePong() {
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = null;
    }
    
    const latency = Date.now() - this.lastPingTime;
    this.statusSubject.next({
      ...this.statusSubject.getValue(),
      connected: true,
      lastPing: this.lastPingTime,
      latency
    });
  }

  private handleDisconnect() {
    if (this.isReconnecting) {
      console.log('Already attempting to reconnect');
      return;
    }

    // If we got a 429, wait longer before reconnecting
    const baseDelay = this.lastError?.includes('429') ? 60000 : 30000; // 1 minute if rate limited, 30 seconds otherwise
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, this.reconnectAttempts - 1) * (0.5 + Math.random()),
        300000 // Max 5 minutes
      );
      
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) after ${delay}ms...`);
      
      setTimeout(async () => {
        try {
          await this.reconnect();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.lastError = errorMessage;
          console.error('Reconnection attempt failed:', error);
          this.statusSubject.next({
            connected: false,
            error: `Reconnection attempt failed: ${errorMessage}`
          });
          // Try again if we haven't hit the limit
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.handleDisconnect();
          }
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.statusSubject.next({ 
        connected: false, 
        error: 'Failed to reconnect after maximum attempts' 
      });
      // Reset reconnection state for future attempts
      this.reconnectAttempts = 0;
      this.lastError = null;
      this.isReconnecting = false;
    }
  }

  onStatusChange(callback: (status: WebSocketStatus) => void): Subscription {
    return this.statusSubject.subscribe(callback);
  }

  onMarketUpdate(callback: (update: MarketUpdate) => void): Subscription {
    return this.marketUpdateSubject.subscribe(callback);
  }

  /**
   * Subscribe to L2 order book data for one or more symbols
   * Provides aggregated order quantities at each price level
   * @param symbols Single symbol or array of symbols to subscribe to
   * @returns Subscription that can be used to unsubscribe
   */
  public subscribeOrderBook(symbols: string | string[]): Subscription {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    
    const request: WebSocketMessage = {
      method: 'subscribe',
      params: {
        channel: 'book',
        symbol: symbolArray
      }
    };

    // Send subscription request
    this.sendMessage(request);

    // Return subscription that handles cleanup
    return new Subscription(() => {
      this.unsubscribeOrderBook(symbolArray);
    });
  }

  subscribeTrades(symbol: string) {
    this.sendMessage({ event: 'subscribe', channel: `trades:${symbol}` });
  }

  subscribe(channel: string, callback: (data: any) => void) {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
      this.sendMessage({ event: 'subscribe', channel });
    }
    this.subscribers.get(channel)!.add(callback);
    return new Subscription(() => this.unsubscribe(channel, callback));
  }

  unsubscribe(channel: string, callback: (data: any) => void) {
    const subscribers = this.subscribers.get(channel);
    if (subscribers) {
      subscribers.delete(callback);
      if (subscribers.size === 0) {
        this.subscribers.delete(channel);
        this.sendMessage({ event: 'unsubscribe', channel });
      }
    }
  }

  private sendMessage(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send message:', error);
        this.statusSubject.next({
          connected: false,
          error: 'Failed to send message to server'
        });
      }
    } else {
      console.warn('WebSocket is not connected, message not sent:', message);
      // Queue message to be sent when connection is established
      this.connect().then(() => {
        this.sendMessage(message);
      }).catch(error => {
        console.error('Failed to send message:', error);
        this.statusSubject.next({
          connected: false,
          error: 'Failed to send message: connection lost'
        });
      });
    }
  }

  public async disconnect(): Promise<void> {
    if (this.deadManSwitchInterval) {
      clearInterval(this.deadManSwitchInterval);
      this.deadManSwitchInterval = null;
    }
    this.deadManSwitchTimeout = 0;
    
    this.clearPing();

    // Only attempt to close if we have a websocket and it's not already closing/closed
    if (this.ws && this.ws.readyState !== WebSocket.CLOSING && this.ws.readyState !== WebSocket.CLOSED) {
      try {
        this.sendMessage({
          event: 'unsubscribe',
          channel: 'status'
        });
        await new Promise<void>((resolve) => {
          const closeTimeout = setTimeout(() => {
            console.log('WebSocket close timed out');
            resolve();
          }, 1000);
          
          this.ws!.onclose = () => {
            clearTimeout(closeTimeout);
            resolve();
          };
          
          this.ws!.close();
        });
      } catch (error) {
        console.warn('Error during WebSocket disconnect:', error);
      }
    }
    
    this.ws = null;
    this.statusSubject.next({ connected: false });
  }

  private handleStatusUpdate(status: KrakenStatus) {
    if (!status) return;
    
    console.log('Kraken status update:', status);
    this.statusSubject.next({
      connected: true,
      krakenStatus: status
    });

    // Handle system status changes
    if (status.system === 'maintenance') {
      console.warn('Kraken system in maintenance mode');
    } else if (status.system === 'cancel_only') {
      console.warn('Kraken system in cancel-only mode');
    }
  }

  private subscribeStatus() {
    this.sendMessage({
      event: 'subscribe',
      channel: 'status'
    });
  }

  private handleExecutionUpdate(data: any) {
    if (!data) return;
    
    const execution = data as ExecutionUpdate;
    console.log('Order execution update:', execution);
    
    // Notify subscribers about the execution update
    const subscribers = this.subscribers.get('executions');
    if (subscribers) {
      subscribers.forEach(callback => callback(execution));
    }
  }

  // Add order-related methods
  public async placeOrder(params: OrderParams): Promise<OrderResponse> {
    return new Promise((resolve, reject) => {
      const req_id = this.reqId++;
      
      const request: OrderRequest = {
        method: 'add_order',
        params,
        req_id
      };

      this.orderCallbacks.set(req_id, (response) => {
        if (response.error) {
          reject(new Error(response.error.join(', ')));
        } else {
          resolve(response);
        }
      });

      this.sendMessage(request);
    });
  }

  /**
   * Cancel one or more orders
   * @param orderIds Single order ID or array of order IDs to cancel
   * @param token Authentication token
   * @returns Promise resolving to the cancellation response
   */
  public async cancelOrder(orderIds: string | string[], token: string): Promise<OrderResponse> {
    return new Promise((resolve, reject) => {
      const req_id = this.reqId++;
      
      const request: OrderRequest = {
        method: 'cancel_order',
        params: {
          order_id: orderIds,
          token
        },
        req_id
      };

      // Subscribe to executions channel if not already subscribed
      if (!this.subscribers.has('executions')) {
        this.subscribe('executions', (execution) => {
          console.log('Execution update received:', execution);
        });
      }

      this.orderCallbacks.set(req_id, (response) => {
        if (response.error) {
          reject(new Error(response.error.join(', ')));
        } else {
          resolve(response);
        }
      });

      this.sendMessage(request);
    });
  }

  /**
   * Cancels all open orders, including untriggered orders and orders resting in the book.
   * The details of cancelled orders will be streamed on the executions channel.
   * @param token Authentication token
   * @returns Promise resolving to the cancellation response
   */
  public async cancelAllOrders(token: string): Promise<OrderResponse> {
    return new Promise((resolve, reject) => {
      if (!token) {
        reject(new Error('Authentication token is required'));
        return;
      }

      const req_id = this.reqId++;
      
      const request: OrderRequest = {
        method: 'cancel_all',
        params: { token },
        req_id
      };

      // Subscribe to executions channel if not already subscribed
      if (!this.subscribers.has('executions')) {
        this.subscribe('executions', (execution) => {
          console.log('Execution update received:', execution);
        });
      }

      this.orderCallbacks.set(req_id, (response) => {
        if (response.error) {
          reject(new Error(response.error.join(', ')));
        } else {
          resolve(response);
        }
      });

      this.sendMessage(request);
    });
  }

  /**
   * Edit an existing order
   * Note: This method has several limitations:
   * - Triggered stop loss or take profit orders are not supported
   * - Orders with conditional close terms are not supported
   * - Orders where executed volume > new volume will be rejected
   * - Queue position will not be maintained
   * - Existing executions remain with original order
   */
  public async editOrder(params: EditOrderParams): Promise<OrderResponse> {
    return new Promise((resolve, reject) => {
      if (!params.order_id || !params.symbol || !params.token) {
        reject(new Error('Required parameters missing: order_id, symbol, and token are required'));
        return;
      }

      const req_id = this.reqId++;
      
      const request: OrderRequest = {
        method: 'edit_order',
        params,
        req_id
      };

      this.orderCallbacks.set(req_id, (response) => {
        if (response.error) {
          reject(new Error(response.error.join(', ')));
        } else {
          resolve(response);
        }
      });

      this.sendMessage(request);
    });
  }

  /** @deprecated Use editOrder instead */
  public async amendOrder(params: AmendOrderParams): Promise<OrderResponse> {
    console.warn('amendOrder is deprecated. Please use editOrder instead.');
    return this.editOrder({
      order_id: params.order_id || '',
      order_qty: params.order_qty,
      symbol: '', // Required parameter that wasn't in AmendOrderParams
      token: params.token || ''
    });
  }

  /**
   * Sets up or disables the Dead Man's Switch that will cancel all orders after the specified timeout
   * if not renewed. The client must keep sending new requests to reset the timer or disable it with timeout=0.
   * @param timeout Timeout in seconds (0 to disable)
   * @param token Authentication token
   * @returns Promise resolving to the response
   */
  public async setCancelAllOrdersAfter(timeout: number, token: string): Promise<OrderResponse> {
    return new Promise((resolve, reject) => {
      if (!token) {
        reject(new Error('Authentication token is required'));
        return;
      }

      // Validate timeout value
      if (timeout < 0) {
        reject(new Error('Timeout must be a non-negative number'));
        return;
      }

      const req_id = this.reqId++;
      
      const request: OrderRequest = {
        method: 'cancel_all_orders_after',
        params: {
          timeout,
          token
        },
        req_id
      };

      // Clear existing renewal interval if any
      if (this.deadManSwitchInterval) {
        clearInterval(this.deadManSwitchInterval);
        this.deadManSwitchInterval = null;
      }

      // Set up automatic renewal if timeout > 0
      if (timeout > 0) {
        this.deadManSwitchTimeout = timeout;
        // Renew at recommended interval (15-30s for 60s timeout)
        const renewalInterval = Math.min(30000, Math.max(15000, timeout * 1000 / 3));
        
        this.deadManSwitchInterval = setInterval(async () => {
          // Check if we're in maintenance mode
          const status = this.statusSubject.getValue().krakenStatus;
          if (status?.system === 'maintenance') {
            console.warn('Kraken system in maintenance mode - disabling Dead Man\'s Switch');
            await this.disableCancelAllOrdersAfter(token);
            return;
          }

          console.log('Renewing Dead Man\'s Switch timer');
          try {
            await this.setCancelAllOrdersAfter(timeout, token);
          } catch (error) {
            console.error('Failed to renew Dead Man\'s Switch:', error);
            // If we fail to renew multiple times, disable the switch
            if (this.deadManSwitchFailures++ >= 3) {
              console.error('Multiple renewal failures - disabling Dead Man\'s Switch');
              await this.disableCancelAllOrdersAfter(token);
            }
          }
        }, renewalInterval);

        // Reset failure counter when setting up new interval
        this.deadManSwitchFailures = 0;
      }

      this.orderCallbacks.set(req_id, (response) => {
        if (response.error) {
          reject(new Error(response.error.join(', ')));
        } else {
          resolve(response);
        }
      });

      this.sendMessage(request);
    });
  }

  /**
   * Disables the Dead Man's Switch if it's active
   * @param token Authentication token
   * @returns Promise that resolves when the switch is disabled
   */
  public async disableCancelAllOrdersAfter(token: string): Promise<void> {
    try {
      await this.setCancelAllOrdersAfter(0, token);
      if (this.deadManSwitchInterval) {
        clearInterval(this.deadManSwitchInterval);
        this.deadManSwitchInterval = null;
      }
      this.deadManSwitchTimeout = 0;
      this.deadManSwitchFailures = 0;
      console.log('Dead Man\'s Switch disabled');
    } catch (error) {
      console.error('Failed to disable Dead Man\'s Switch:', error);
      throw error;
    }
  }

  /**
   * Submit multiple orders in a single batch (2-15 orders)
   * All orders must be for the same trading pair and must be limit orders
   * If any orders are rejected due to validation errors, the remainder will still be processed
   * @param params Batch order parameters including deadline, orders array, symbol, and token
   * @returns Promise resolving to the batch submission response
   */
  public async batchAddOrders(params: BatchAddParams): Promise<OrderResponse> {
    return new Promise((resolve, reject) => {
      // Validate required parameters
      if (!params.orders || !params.symbol || !params.token) {
        reject(new Error('Required parameters missing: orders, symbol, and token are required'));
        return;
      }

      // Validate order count
      if (params.orders.length < 2 || params.orders.length > 15) {
        reject(new Error('Batch must contain between 2 and 15 orders'));
        return;
      }

      // Validate all orders are limit orders
      if (params.orders.some(order => order.order_type !== 'limit')) {
        reject(new Error('All orders in batch must be limit orders'));
        return;
      }

      // Validate required fields for each order
      for (const order of params.orders) {
        if (!order.limit_price || !order.order_qty || !order.side) {
          reject(new Error('Each order must specify limit_price, order_qty, and side'));
          return;
        }
      }

      const req_id = this.reqId++;
      
      const request: OrderRequest = {
        method: 'batch_add',
        params: {
          ...params,
          deadline: params.deadline || new Date(Date.now() + 60000).toISOString(), // Default to 1 minute from now
          validate: params.validate ?? false
        },
        req_id
      };

      // Subscribe to executions channel if not already subscribed
      if (!this.subscribers.has('executions')) {
        this.subscribe('executions', (execution) => {
          console.log('Batch order execution update:', execution);
        });
      }

      this.orderCallbacks.set(req_id, (response) => {
        if (response.error) {
          // Even with errors, some orders might have been accepted
          console.warn('Batch order response contains errors:', response.error);
          resolve(response);  // Resolve instead of reject to handle partial success
        } else {
          resolve(response);
        }
      });

      this.sendMessage(request);
    });
  }

  /**
   * Cancel multiple orders in a single batch request (2-50 orders)
   * If any orders are rejected due to validation errors, the remainder will still be processed
   * The details of cancelled orders will be streamed on the executions channel
   * @param orderIds Array of order IDs to cancel (2-50 orders)
   * @param token Authentication token
   * @returns Promise resolving to the batch cancellation response
   */
  public async batchCancelOrders(orderIds: string[], token: string): Promise<OrderResponse> {
    return new Promise((resolve, reject) => {
      // Validate required parameters
      if (!token) {
        reject(new Error('Authentication token is required'));
        return;
      }

      // Validate order IDs array
      if (!Array.isArray(orderIds) || orderIds.length < 2 || orderIds.length > 50) {
        reject(new Error('Must provide between 2 and 50 order IDs to cancel'));
        return;
      }

      const req_id = this.reqId++;
      
      const request: OrderRequest = {
        method: 'batch_cancel',
        params: {
          orders: orderIds,
          token
        },
        req_id
      };

      // Subscribe to executions channel if not already subscribed
      if (!this.subscribers.has('executions')) {
        this.subscribe('executions', (execution) => {
          console.log('Batch cancel execution update:', execution);
        });
      }

      this.orderCallbacks.set(req_id, (response) => {
        if (response.error) {
          // Even with errors, some orders might have been cancelled
          console.warn('Batch cancel response contains errors:', response.error);
          resolve(response);  // Resolve instead of reject to handle partial success
        } else {
          resolve(response);
        }
      });

      this.sendMessage(request);
    });
  }

  /**
   * Unsubscribe from order book data for one or more symbols
   * @param symbols Single symbol or array of symbols to unsubscribe from
   */
  public unsubscribeOrderBook(symbols: string | string[]) {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    
    const request: WebSocketMessage = {
      method: 'unsubscribe',
      params: {
        channel: 'book',
        symbol: symbolArray
      }
    };

    this.sendMessage(request);
  }

  /**
   * Subscribe to order book updates
   * @param callback Function to be called with order book updates
   * @returns Subscription that can be used to unsubscribe
   */
  public onOrderBookUpdate(callback: (update: OrderBookUpdate) => void): Subscription {
    return this.orderBookSubject.subscribe(callback);
  }

  /**
   * Subscribe to Level 3 order book data for one or more symbols
   * Provides visibility of individual orders in the book
   * @param symbols Single symbol or array of symbols to subscribe to
   * @param depth Order book depth (10, 100, or 1000)
   * @param token Authentication token required for Level 3 data
   * @returns Subscription that can be used to unsubscribe
   */
  public subscribeLevel3(symbols: string | string[], depth: 10 | 100 | 1000, token: string): Subscription {
    if (!token) {
      throw new Error('Authentication token is required for Level 3 data');
    }

    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    
    const request: WebSocketMessage = {
      method: 'subscribe',
      params: {
        channel: 'level3',
        symbol: symbolArray,
        depth,
        token
      }
    };

    // Send subscription request
    this.sendMessage(request);

    // Return subscription that handles cleanup
    return new Subscription(() => {
      this.unsubscribeLevel3(symbolArray, token);
    });
  }

  private unsubscribeLevel3(symbols: string | string[], token: string) {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    
    const request: WebSocketMessage = {
      method: 'unsubscribe',
      params: {
        channel: 'level3',
        symbol: symbolArray,
        token
      }
    };

    this.sendMessage(request);
  }

  /**
   * Subscribe to Level 3 order book updates
   * @param callback Function to be called with Level 3 updates
   * @returns Subscription that can be used to unsubscribe
   */
  public onLevel3Update(callback: (update: Level3Update) => void): Subscription {
    return this.level3Subject.subscribe(callback);
  }

  // Add to message handling in connect() method
  private handleLevel3Message(message: WebSocketMessage): void {
    if (!message.data) return;

    const update: Level3Update = {
      asks: message.data.asks?.map((order: any) => ({
        order_id: order[0],
        price: order[1],
        quantity: order[2],
        timestamp: order[3],
        update_type: message.data.type === 'snapshot' ? 'new' : order[4]
      })) || [],
      bids: message.data.bids?.map((order: any) => ({
        order_id: order[0],
        price: order[1],
        quantity: order[2],
        timestamp: order[3],
        update_type: message.data.type === 'snapshot' ? 'new' : order[4]
      })) || [],
      symbol: message.data.symbol,
      checksum: message.data.checksum,
      timestamp: message.data.timestamp || new Date().toISOString(),
      type: message.data.type || 'update',
      depth: message.data.depth
    };

    this.level3Subject.next(update);
  }

  // Add back the handleOrderBookMessage method
  private handleOrderBookMessage(message: WebSocketMessage): void {
    if (!message.data) return;

    const update: OrderBookUpdate = {
      asks: message.data.asks?.map((level: any) => ({
        price: level[0],
        quantity: level[1],
        timestamp: level[2],
        update_type: message.data.type || 'update'
      })) || [],
      bids: message.data.bids?.map((level: any) => ({
        price: level[0],
        quantity: level[1],
        timestamp: level[2],
        update_type: message.data.type || 'update'
      })) || [],
      symbol: message.data.symbol,
      checksum: message.data.checksum,
      timestamp: message.data.timestamp || new Date().toISOString(),
      type: message.data.type || 'update'
    };

    this.orderBookSubject.next(update);
  }

  /**
   * Subscribe to ticker data for one or more symbols
   * @param symbols Single symbol or array of symbols to subscribe to
   * @param eventTrigger Optional trigger type ('bbo' or 'trades')
   * @param snapshot Whether to request initial snapshot (default: true)
   * @returns Subscription that can be used to unsubscribe
   */
  public subscribeTicker(
    symbols: string | string[], 
    eventTrigger: 'bbo' | 'trades' = 'trades',
    snapshot: boolean = true
  ): Subscription {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    
    const request: WebSocketMessage = {
      method: 'subscribe',
      params: {
        channel: 'ticker',
        symbol: symbolArray,
        event_trigger: eventTrigger,
        snapshot
      }
    };

    // Send subscription request
    this.sendMessage(request);

    // Return subscription that handles cleanup
    return new Subscription(() => {
      this.unsubscribeTicker(symbolArray);
    });
  }

  public unsubscribeTicker(symbols: string | string[]) {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    
    const request: WebSocketMessage = {
      method: 'unsubscribe',
      params: {
        channel: 'ticker',
        symbol: symbolArray
      }
    };

    this.sendMessage(request);
  }

  /**
   * Subscribe to ticker updates
   * @param callback Function to be called with ticker updates
   * @returns Subscription that can be used to unsubscribe
   */
  public onTickerUpdate(callback: (update: TickerUpdate) => void): Subscription {
    return this.tickerSubject.subscribe(callback);
  }

  // Add to message handling in connect() method
  private handleTickerMessage(message: WebSocketMessage): void {
    if (!message.data) return;

    const update: TickerUpdate = {
      type: message.type as 'snapshot' | 'update',
      data: Array.isArray(message.data) ? message.data : [message.data]
    };

    this.tickerSubject.next(update);
    
    // Also emit to market update subject for backward compatibility
    update.data.forEach(ticker => {
      this.marketUpdateSubject.next({
        type: 'ticker',
        symbol: ticker.symbol,
        price: ticker.last,
        volume: ticker.volume,
        high24h: ticker.high,
        low24h: ticker.low,
        change24h: ticker.change
      });
    });
  }
} 