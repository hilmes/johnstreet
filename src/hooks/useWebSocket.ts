import { useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { MarketUpdate } from '../types/websocket';
import { Subscription } from 'rxjs';

interface UseWebSocketProps {
  symbol: string;
  onTicker?: (update: MarketUpdate) => void;
  onTrade?: (data: any) => void;
  onOrderBook?: (data: any) => void;
  onOrder?: (data: any) => void;
}

export const useWebSocket = ({ symbol, onTicker, onTrade, onOrderBook, onOrder }: UseWebSocketProps) => {
  const { services } = useAppContext();
  const subscriptionsRef = useRef<{ [key: string]: boolean }>({});
  const marketSubRef = useRef<Subscription | null>(null);

  useEffect(() => {
    // Track active subscriptions to prevent duplicate subscriptions
    const subscriptions = subscriptionsRef.current;

    // Subscribe to market updates
    if (onTicker && !subscriptions['ticker']) {
      marketSubRef.current = services.ws.onMarketUpdate((update) => {
        if (update.type === 'ticker' && update.symbol === symbol) {
          onTicker(update);
        }
      });
    }

    // Subscribe to channels only if not already subscribed
    if (onTicker && !subscriptions['ticker']) {
      services.ws.subscribeTicker(symbol);
      subscriptions['ticker'] = true;
    }
    
    if (onOrderBook && !subscriptions['orderbook']) {
      services.ws.subscribeOrderBook(symbol);
      subscriptions['orderbook'] = true;
    }
    
    if (onTrade && !subscriptions['trades']) {
      services.ws.subscribeTrades(symbol);
      subscriptions['trades'] = true;
    }

    // Cleanup subscriptions
    return () => {
      if (marketSubRef.current) {
        marketSubRef.current.unsubscribe();
        marketSubRef.current = null;
      }
      
      // Only unsubscribe if we were the ones who subscribed
      if (subscriptions['ticker']) {
        services.ws.unsubscribeTicker([symbol]);
        delete subscriptions['ticker'];
      }
      
      if (subscriptions['orderbook']) {
        services.ws.unsubscribeOrderBook([symbol]);
        delete subscriptions['orderbook'];
      }
      
      if (subscriptions['trades'] && onTrade) {
        services.ws.unsubscribe('trades', onTrade);
        delete subscriptions['trades'];
      }
    };
  }, [symbol, services.ws, onTicker, onTrade, onOrderBook, onOrder]);
}; 