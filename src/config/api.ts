// API Configuration
const API_PORT = process.env.REACT_APP_API_PORT || 5004;
const API_HOST = process.env.REACT_APP_API_HOST || 'localhost';
const API_PROTOCOL = process.env.REACT_APP_API_PROTOCOL || 'http';
const WS_PROTOCOL = API_PROTOCOL === 'https' ? 'wss' : 'ws';

// Kraken WebSocket endpoints
const KRAKEN_WS_PUBLIC = `${WS_PROTOCOL}://${API_HOST}:${API_PORT}/ws`;
const KRAKEN_WS_PRIVATE = `${WS_PROTOCOL}://${API_HOST}:${API_PORT}/ws-auth`;

export const API_CONFIG = {
  baseUrl: `${API_PROTOCOL}://${API_HOST}:${API_PORT}`,
  ws: {
    public: KRAKEN_WS_PUBLIC,
    private: KRAKEN_WS_PRIVATE
  },
  endpoints: {
    health: '/api/health',
    wsStats: '/api/ws/stats',
    portfolio: '/api/portfolio',
    openOrders: '/api/openOrders',
    tradesHistory: '/api/tradesHistory',
    krakenPublic: (version: string, endpoint: string) => `/api/kraken/${version}/public/${endpoint}`,
    krakenPrivate: (version: string, endpoint: string) => `/api/kraken/${version}/private/${endpoint}`,
  }
}; 