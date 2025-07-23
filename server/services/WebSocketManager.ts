import { WebSocket, WebSocketServer } from 'ws';
import { WebSocketMessage, MarketData, OrderBookUpdate } from '../types';

interface ClientHealth {
  lastPing: number;
  lastPong: number;
  latency: number;
  missedHeartbeats: number;
  status: 'healthy' | 'warning' | 'critical';
}

export class WebSocketManager {
  private clients: Map<WebSocket, Set<string>> = new Map();
  private marketData: Map<string, MarketData> = new Map();
  private orderBooks: Map<string, OrderBookUpdate> = new Map();
  private clientHealth: Map<WebSocket, ClientHealth> = new Map();
  private readonly MAX_MISSED_HEARTBEATS = 3;
  private readonly HEARTBEAT_INTERVAL = 30000;
  private readonly LATENCY_WARNING_THRESHOLD = 1000;
  private readonly LATENCY_CRITICAL_THRESHOLD = 3000;

  constructor(private wss: WebSocketServer) {
    this.setupHeartbeat();
    this.monitorConnections();
  }

  private setupHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          const health = this.clientHealth.get(client);
          if (health) {
            health.lastPing = Date.now();
            client.ping();
          }
        }
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  private monitorConnections() {
    setInterval(() => {
      this.clientHealth.forEach((health, client) => {
        // Check for missed heartbeats
        const timeSinceLastPong = Date.now() - health.lastPong;
        if (timeSinceLastPong > this.HEARTBEAT_INTERVAL) {
          health.missedHeartbeats++;
          if (health.missedHeartbeats >= this.MAX_MISSED_HEARTBEATS) {
            console.warn('Client unresponsive, terminating connection');
            client.terminate();
            return;
          }
        }

        // Update status based on latency and missed heartbeats
        if (health.missedHeartbeats > 1 || health.latency > this.LATENCY_CRITICAL_THRESHOLD) {
          health.status = 'critical';
        } else if (health.missedHeartbeats > 0 || health.latency > this.LATENCY_WARNING_THRESHOLD) {
          health.status = 'warning';
        } else {
          health.status = 'healthy';
        }

        // Send health status to client
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            event: 'health',
            data: {
              latency: health.latency,
              status: health.status,
              timestamp: Date.now()
            }
          }));
        }
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  handleConnection(ws: WebSocket) {
    console.log('Client connected');
    this.clients.set(ws, new Set());
    this.initializeClientHealth(ws);

    ws.on('message', (message: string) => this.handleMessage(ws, message));
    ws.on('close', () => this.handleDisconnection(ws));
    ws.on('error', this.handleError);
    ws.on('pong', () => this.handlePong(ws));
  }

  private initializeClientHealth(ws: WebSocket) {
    this.clientHealth.set(ws, {
      lastPing: Date.now(),
      lastPong: Date.now(),
      latency: 0,
      missedHeartbeats: 0,
      status: 'healthy'
    });
  }

  private handlePong(ws: WebSocket) {
    const health = this.clientHealth.get(ws);
    if (health) {
      const now = Date.now();
      health.lastPong = now;
      health.latency = now - health.lastPing;
      health.missedHeartbeats = 0;
    }
  }

  private handleMessage(ws: WebSocket, message: string) {
    try {
      const msg = JSON.parse(message) as WebSocketMessage;
      console.log('Received:', msg);

      // Reset missed heartbeats on any message
      const health = this.clientHealth.get(ws);
      if (health) {
        health.missedHeartbeats = 0;
      }

      switch (msg.event) {
        case 'subscribe':
          this.handleSubscribe(ws, msg);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(ws, msg);
          break;
        case 'health_check':
          this.sendHealthStatus(ws);
          break;
        default:
          console.warn('Unknown message event:', msg.event);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private sendHealthStatus(ws: WebSocket) {
    const health = this.clientHealth.get(ws);
    if (health && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        event: 'health',
        data: {
          latency: health.latency,
          status: health.status,
          timestamp: Date.now()
        }
      }));
    }
  }

  private handleDisconnection(ws: WebSocket) {
    console.log('Client disconnected');
    this.clients.delete(ws);
    this.clientHealth.delete(ws);
  }

  private handleError(error: Error) {
    console.error('WebSocket error:', error);
  }

  // Broadcasting methods
  broadcastMarketData(symbol: string, data: MarketData) {
    this.marketData.set(symbol, data);
    
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        const subscriptions = this.clients.get(client);
        if (subscriptions?.has(`ticker:${symbol}`)) {
          client.send(JSON.stringify({
            event: 'ticker',
            channel: `ticker:${symbol}`,
            data
          }));
        }
      }
    });
  }

  broadcastOrderBook(symbol: string, data: OrderBookUpdate) {
    this.orderBooks.set(symbol, data);
    
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        const subscriptions = this.clients.get(client);
        if (subscriptions?.has(`orderbook:${symbol}`)) {
          client.send(JSON.stringify({
            event: 'orderbook',
            channel: `orderbook:${symbol}`,
            data
          }));
        }
      }
    });
  }

  private sendMarketData(ws: WebSocket, symbol: string) {
    const data = this.marketData.get(symbol);
    if (data) {
      ws.send(JSON.stringify({
        event: 'ticker',
        channel: `ticker:${symbol}`,
        data
      }));
    }
  }

  private sendOrderBook(ws: WebSocket, symbol: string) {
    const data = this.orderBooks.get(symbol);
    if (data) {
      ws.send(JSON.stringify({
        event: 'orderbook',
        channel: `orderbook:${symbol}`,
        data
      }));
    }
  }

  getConnectionStats() {
    const stats = {
      totalConnections: this.wss.clients.size,
      healthyConnections: 0,
      warningConnections: 0,
      criticalConnections: 0,
      averageLatency: 0,
    };

    let totalLatency = 0;
    this.clientHealth.forEach(health => {
      switch (health.status) {
        case 'healthy':
          stats.healthyConnections++;
          break;
        case 'warning':
          stats.warningConnections++;
          break;
        case 'critical':
          stats.criticalConnections++;
          break;
      }
      totalLatency += health.latency;
    });

    stats.averageLatency = totalLatency / this.clientHealth.size || 0;
    return stats;
  }

  private handleSubscribe(ws: WebSocket, msg: WebSocketMessage) {
    if (!msg.channel) return;

    const subscriptions = this.clients.get(ws);
    if (subscriptions) {
      subscriptions.add(msg.channel);
      
      // Send initial data
      const [type, symbol] = msg.channel.split(':');
      switch (type) {
        case 'ticker':
          this.sendMarketData(ws, symbol);
          break;
        case 'orderbook':
          this.sendOrderBook(ws, symbol);
          break;
      }
    }
  }

  private handleUnsubscribe(ws: WebSocket, msg: WebSocketMessage) {
    if (!msg.channel) return;

    const subscriptions = this.clients.get(ws);
    if (subscriptions) {
      subscriptions.delete(msg.channel);
    }
  }
} 