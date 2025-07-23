import { useState, useEffect } from 'react';
import { useServices } from '../context/ServicesContext';
import { MarketData, TickerData } from '../types/market';

export function useMarketData(symbol: string) {
  const services = useServices();
  const [data, setData] = useState<MarketData | null>(null);

  useEffect(() => {
    const subscription = services.ws.subscribe(`market:${symbol}`, (tickerData: TickerData) => {
      if (!data) return;
      
      setData({
        symbol,
        timestamp: Date.now(),
        open: data.open,
        high: tickerData.high,
        low: tickerData.low,
        close: tickerData.last,
        volume: tickerData.volume,
        vwap: tickerData.vwap,
        trades: tickerData.trades
      });
    });

    // Initial fetch
    services.kraken.getTicker(symbol)
      .then(tickerData => {
        setData({
          symbol,
          timestamp: Date.now(),
          open: tickerData.o[0],
          high: tickerData.h[0],
          low: tickerData.l[0],
          close: tickerData.c[0],
          volume: parseFloat(tickerData.v[0]),
          vwap: parseFloat(tickerData.p[0]),
          trades: parseInt(tickerData.t[0])
        });
      })
      .catch(console.error);

    return () => {
      subscription.unsubscribe();
    };
  }, [symbol, services.ws, services.kraken]);

  return data;
} 