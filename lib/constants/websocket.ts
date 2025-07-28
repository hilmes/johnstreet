/**
 * WebSocket Service Constants
 */

export const WS_CONSTANTS = {
  // Reconnection settings
  MAX_RECONNECT_ATTEMPTS: 5,
  MIN_CONNECTION_INTERVAL: 60000, // 1 minute between attempts
  MAX_CONNECTION_INTERVAL: 300000, // Max 5 minutes
  CONNECTION_BACKOFF_MULTIPLIER: 2,
  
  // Timeouts
  DEFAULT_REQUEST_TIMEOUT: 10000, // 10 seconds
  PING_INTERVAL: 30000, // 30 seconds
  PONG_TIMEOUT: 10000, // 10 seconds
  RECONNECT_BASE_DELAY: 30000, // 30 seconds
  RATE_LIMITED_DELAY: 60000, // 1 minute if rate limited
  POST_DISCONNECT_DELAY: 1000, // 1 second after disconnect
  DEFAULT_DEADLINE: 60000, // 1 minute default deadline
  
  // Dead man's switch
  DEAD_MAN_SWITCH_RENEWAL_MIN: 15000, // 15 seconds minimum
  DEAD_MAN_SWITCH_RENEWAL_MAX: 30000, // 30 seconds maximum
  DEAD_MAN_SWITCH_RENEWAL_FACTOR: 3, // Divide timeout by this for renewal interval
  
  // Rate limiting
  RATE_LIMIT_CODE: '429',
  
  // Trading parameters
  DEFAULT_STOP_LOSS_PERCENTAGE: 0.05, // 5% stop loss
  DEFAULT_TAKE_PROFIT_PERCENTAGE: 0.15, // 15% take profit
  STOP_LOSS_WARNING_THRESHOLD: 0.01, // Within 1% of stop loss
  
  // Strategy parameters
  DEFAULT_LOOKBACK_PERIOD: 100,
  LATENCY_WARNING_THRESHOLD: 500, // ms
  LATENCY_CRITICAL_THRESHOLD: 1000, // ms
  
  // Risk-free rate for Sharpe ratio calculation
  ANNUAL_RISK_FREE_RATE: 0.02, // 2% annual
  TRADING_DAYS_PER_YEAR: 252,
  
  // Percentage calculations
  PERCENTAGE_MULTIPLIER: 100,
  
  // Time calculations
  MS_PER_YEAR: 365 * 24 * 60 * 60 * 1000,
  
  // WebSocket message types
  MESSAGE_TYPES: {
    SUBSCRIBE: 'subscribe',
    UNSUBSCRIBE: 'unsubscribe',
    ADD_ORDER: 'addOrder',
    CANCEL_ORDER: 'cancelOrder',
    CANCEL_ALL: 'cancelAll',
    PING: 'ping',
    PONG: 'pong',
    ERROR: 'error',
    SYSTEM_STATUS: 'systemStatus',
    SUBSCRIPTION_STATUS: 'subscriptionStatus'
  },
  
  // Subscription names
  SUBSCRIPTIONS: {
    TICKER: 'ticker',
    OHLC: 'ohlc',
    TRADE: 'trade',
    SPREAD: 'spread',
    BOOK: 'book',
    OWN_TRADES: 'ownTrades',
    OPEN_ORDERS: 'openOrders'
  }
} as const

// OHLC array indices
export const OHLC_INDICES = {
  TIME: 0,
  OPEN: 1,
  HIGH: 2,
  LOW: 3,
  CLOSE: 4,
  VWAP: 5,
  VOLUME: 6,
  COUNT: 7
} as const

// Order status codes
export const ORDER_STATUS = {
  PENDING: 'pending',
  OPEN: 'open',
  CLOSED: 'closed',
  CANCELED: 'canceled',
  EXPIRED: 'expired'
} as const

// Error codes
export const WS_ERROR_CODES = {
  CONNECTION_FAILED: 'WS_CONNECTION_FAILED',
  AUTHENTICATION_FAILED: 'WS_AUTH_FAILED',
  SUBSCRIPTION_FAILED: 'WS_SUB_FAILED',
  RATE_LIMITED: 'WS_RATE_LIMITED',
  TIMEOUT: 'WS_TIMEOUT',
  INVALID_MESSAGE: 'WS_INVALID_MESSAGE'
} as const