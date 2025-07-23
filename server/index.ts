import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import WebSocket from 'ws';
import { WebSocketManager } from './services/WebSocketManager';
import { MarketData, OrderBookUpdate } from './types';
import fetch from 'node-fetch';
import crypto from 'crypto';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ 
  server,
  path: '/ws'
});
const PORT = process.env.SERVER_PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4000';

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'API-Key', 'API-Sign', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message
  });
});

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');
  
  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      // Handle different message types
      switch (data.type) {
        case 'subscribe':
          // Handle subscription
          break;
        case 'unsubscribe':
          // Handle unsubscription
          break;
        case 'order':
          // Handle order
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({ 
        event: 'error',
        error: ['Failed to process message']
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Portfolio endpoint
app.get('/api/portfolio', async (req, res, next) => {
  try {
    // Mock portfolio data for now
    const portfolio = {
      totalValue: 100000,
      assets: [
        { symbol: 'BTC', amount: 1.5, value: 60000 },
        { symbol: 'ETH', amount: 10, value: 30000 },
      ],
    };
    res.json(portfolio);
  } catch (error) {
    next(error);
  }
});

// Open orders endpoint
app.get('/api/openOrders', async (req, res, next) => {
  try {
    // Mock open orders data
    const orders = {
      open: {
        'OABC123': {
          refid: null,
          userref: 0,
          status: 'pending',
          opentm: Date.now() / 1000,
          starttm: 0,
          expiretm: 0,
          descr: {
            pair: 'BTC/USD',
            type: 'buy',
            ordertype: 'limit',
            price: '45000',
            price2: '0',
            leverage: 'none',
            order: 'buy 0.1000 BTC/USD @ limit 45000'
          },
          vol: '0.1000',
          vol_exec: '0.0000',
          cost: '0.0000',
          fee: '0.0000',
          price: '0.0000',
          stopprice: '0.0000',
          limitprice: '0.0000',
          misc: '',
          oflags: 'fciq'
        },
        'OXYZ456': {
          refid: null,
          userref: 0,
          status: 'pending',
          opentm: Date.now() / 1000,
          starttm: 0,
          expiretm: 0,
          descr: {
            pair: 'ETH/USD',
            type: 'sell',
            ordertype: 'limit',
            price: '3200',
            price2: '0',
            leverage: 'none',
            order: 'sell 2.0000 ETH/USD @ limit 3200'
          },
          vol: '2.0000',
          vol_exec: '0.0000',
          cost: '0.0000',
          fee: '0.0000',
          price: '0.0000',
          stopprice: '0.0000',
          limitprice: '0.0000',
          misc: '',
          oflags: 'fciq'
        }
      }
    };
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// Trade history endpoint
app.get('/api/tradesHistory', async (req, res, next) => {
  try {
    // Mock trade history data
    const trades = {
      trades: {
        'TABC123': {
          ordertxid: 'OABC123',
          pair: 'BTC/USD',
          time: Math.floor(Date.now() / 1000),
          type: 'buy',
          ordertype: 'limit',
          price: '40000',
          cost: '4000',
          fee: '10',
          vol: '0.1',
          margin: '0',
          misc: '',
          posstatus: 'closed',
          cprice: '40000',
          ccost: '4000',
          cfee: '10',
          cvol: '0.1',
          cmargin: '0',
          net: '100',
          trades: []
        },
        'TXYZ456': {
          ordertxid: 'OXYZ456',
          pair: 'ETH/USD',
          time: Math.floor((Date.now() - 3600000) / 1000),
          type: 'sell',
          ordertype: 'limit',
          price: '3000',
          cost: '6000',
          fee: '15',
          vol: '2',
          margin: '0',
          misc: '',
          posstatus: 'closed',
          cprice: '3000',
          ccost: '6000',
          cfee: '15',
          cvol: '2',
          cmargin: '0',
          net: '150',
          trades: []
        }
      },
      count: 2
    };
    res.json(trades);
  } catch (error) {
    next(error);
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 