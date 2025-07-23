import React, { useEffect } from 'react';
import { KrakenService } from './services/KrakenService';

export const TestAPI: React.FC = () => {
  useEffect(() => {
    const testAPI = async () => {
      const kraken = new KrakenService();

      try {
        // Test public endpoints
        console.log('Testing public endpoints...');
        
        const serverTime = await kraken.getServerTime();
        console.log('Server time:', serverTime);

        const systemStatus = await kraken.getSystemStatus();
        console.log('System status:', systemStatus);

        const btcusdTicker = await kraken.getTicker('XBTUSD');
        console.log('BTC/USD Ticker:', btcusdTicker);

        // Test private endpoints
        console.log('\nTesting private endpoints...');
        
        const balance = await kraken.getAccountBalance();
        console.log('Account balance:', balance);

        const tradeBalance = await kraken.getTradeBalance();
        console.log('Trade balance:', tradeBalance);

        console.log('\nAPI test completed successfully!');
      } catch (error) {
        console.error('API test failed:', error);
      }
    };

    testAPI();
  }, []);

  return <div>Testing Kraken API... Check the console for results.</div>;
}; 