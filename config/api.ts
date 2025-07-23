export const API_CONFIG = {
  KRAKEN_API_BASE: 'https://api.kraken.com',
  KRAKEN_WS_URL: process.env.NEXT_PUBLIC_KRAKEN_WSS_URI || 'wss://ws.kraken.com',
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5003',
  PYTHON_API_URL: process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:5000',
}