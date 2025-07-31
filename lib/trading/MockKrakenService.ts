import { KrakenBalance, KrakenTradeBalanceInfo, KrakenOrderInfo, KrakenLedgerEntry } from '../../types/kraken';

export class MockKrakenService {
  private mockBalances: KrakenBalance = {
    'XXBT': '0.15432100',    // ~$10,000 in BTC
    'XETH': '2.84561000',    // ~$7,500 in ETH  
    'ZUSD': '2543.25',       // $2,543 in USD
    'ADA': '8500.00000000',  // $3,400 in Cardano
    'SOL': '45.25000000'     // ~$2,250 in Solana
  };

  private mockTradeBalance: KrakenTradeBalanceInfo = {
    eb: '25693.25',  // $25,693 equivalent balance
    tb: '25693.25',  // trade balance
    m: '0.00',       // margin amount
    n: '0.00',       // unrealized P&L
    c: '0.00',       // cost basis
    v: '0.00',       // current valuation
    e: '25693.25',   // equity
    mf: '25693.25',  // free margin
    ml: '0.00'       // margin level
  };

  private mockDepositHistory: Record<string, KrakenLedgerEntry> = {
    'DEPOSIT-001': {
      refid: 'DEPOSIT-001',
      time: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
      type: 'deposit',
      aclass: 'currency',
      asset: 'XXBT',
      amount: '0.15432100',
      fee: '0.00000000',
      balance: '0.15432100'
    },
    'DEPOSIT-002': {
      refid: 'DEPOSIT-002', 
      time: Math.floor(Date.now() / 1000) - 172800, // 2 days ago
      type: 'deposit',
      aclass: 'currency',
      asset: 'ZUSD',
      amount: '5000.00',
      fee: '0.00',
      balance: '5000.00'
    }
  };

  async getAccountBalance(): Promise<KrakenBalance> {
    // Simulate API delay
    await this.delay(100);
    return { ...this.mockBalances };
  }

  async getTradeBalance(asset?: string): Promise<KrakenTradeBalanceInfo> {
    await this.delay(150);
    return { ...this.mockTradeBalance };
  }

  async getOpenOrders(): Promise<{ open: Record<string, KrakenOrderInfo> }> {
    await this.delay(100);
    return { open: {} }; // No open orders in mock
  }

  async getLedgers(params?: {
    asset?: string;
    type?: 'all' | 'deposit' | 'withdrawal' | 'trade' | 'margin';
    start?: number;
    end?: number;
    ofs?: number;
  }): Promise<{
    ledger: Record<string, KrakenLedgerEntry>;
    count: number;
  }> {
    await this.delay(200);
    
    let filteredLedger = { ...this.mockDepositHistory };
    
    if (params?.type && params.type !== 'all') {
      filteredLedger = Object.fromEntries(
        Object.entries(this.mockDepositHistory).filter(([_, entry]) => entry.type === params.type)
      );
    }
    
    if (params?.asset) {
      filteredLedger = Object.fromEntries(
        Object.entries(filteredLedger).filter(([_, entry]) => entry.asset === params.asset)
      );
    }

    return {
      ledger: filteredLedger,
      count: Object.keys(filteredLedger).length
    };
  }

  async cancelAllOrders(): Promise<{ count: number }> {
    await this.delay(100);
    console.log('MOCK: All orders cancelled');
    return { count: 0 };
  }

  async getTradableAssetPairs(pairs?: string[]): Promise<Record<string, any>> {
    await this.delay(100);
    
    const mockPairs = {
      'XXBTZUSD': {
        altname: 'XBTUSD',
        base: 'XXBT',
        quote: 'ZUSD',
        pair_decimals: 1,
        lot_decimals: 8,
        fees: [[0, 0.26], [50000, 0.24], [100000, 0.22]],
        fees_maker: [[0, 0.16], [50000, 0.14], [100000, 0.12]]
      },
      'XETHZUSD': {
        altname: 'ETHUSD',
        base: 'XETH', 
        quote: 'ZUSD',
        pair_decimals: 2,
        lot_decimals: 8,
        fees: [[0, 0.26], [50000, 0.24], [100000, 0.22]],
        fees_maker: [[0, 0.16], [50000, 0.14], [100000, 0.12]]
      }
    };

    return mockPairs;
  }

  async getTradeVolume(pairs?: string[]): Promise<any> {
    await this.delay(100);
    
    return {
      currency: 'ZUSD',
      volume: '12500.00',
      fees: {
        'XXBTZUSD': { fee: '0.0026', minfee: '0.0026', maxfee: '0.0026' },
        'XETHZUSD': { fee: '0.0026', minfee: '0.0026', maxfee: '0.0026' }
      },
      fees_maker: {
        'XXBTZUSD': { fee: '0.0016', minfee: '0.0016', maxfee: '0.0016' },
        'XETHZUSD': { fee: '0.0016', minfee: '0.0016', maxfee: '0.0016' }
      }
    };
  }

  async getTickerInformation(pairs: string[]): Promise<Record<string, any>> {
    await this.delay(100);
    
    const mockTickers = {
      'XXBTZUSD': {
        a: ['65234.50', '1', '1.000'],
        b: ['65230.10', '2', '2.000'], 
        c: ['65232.30', '0.05000000'],
        v: ['1547.12345678', '2847.98765432'],
        p: ['65180.45', '65205.67'],
        t: [1245, 2389],
        l: ['64890.10', '64750.20'],
        h: ['65450.80', '65890.30'],
        o: '65100.20'
      },
      'XETHZUSD': {
        a: ['2634.75', '3', '3.000'],
        b: ['2634.25', '5', '5.000'],
        c: ['2634.50', '0.25000000'], 
        v: ['2847.35678901', '5694.71357802'],
        p: ['2628.90', '2631.15'],
        t: [2156, 4312],
        l: ['2598.45', '2575.80'],
        h: ['2651.20', '2689.45'],
        o: '2625.40'
      }
    };

    return mockTickers;
  }

  // Simulate balance changes for deposit monitoring
  simulateDeposit(asset: string, amount: string): void {
    const currentBalance = parseFloat(this.mockBalances[asset] || '0');
    const newAmount = parseFloat(amount);
    this.mockBalances[asset] = (currentBalance + newAmount).toString();
    
    // Update trade balance
    const currentTradeBalance = parseFloat(this.mockTradeBalance.eb);
    const estimatedUSDValue = this.estimateUSDValue(asset, newAmount);
    this.mockTradeBalance.eb = (currentTradeBalance + estimatedUSDValue).toString();
    this.mockTradeBalance.tb = this.mockTradeBalance.eb;
    this.mockTradeBalance.e = this.mockTradeBalance.eb;
    this.mockTradeBalance.mf = this.mockTradeBalance.eb;

    console.log(`MOCK: Simulated deposit of ${amount} ${asset}`);
  }

  // Simulate portfolio value changes
  simulateMarketMovement(percentage: number): void {
    const multiplier = 1 + (percentage / 100);
    
    // Update crypto balances (simulate price changes, not quantity changes)
    const currentTradeBalance = parseFloat(this.mockTradeBalance.eb);
    const newTradeBalance = currentTradeBalance * multiplier;
    
    this.mockTradeBalance.eb = newTradeBalance.toFixed(2);
    this.mockTradeBalance.tb = newTradeBalance.toFixed(2);
    this.mockTradeBalance.e = newTradeBalance.toFixed(2);
    this.mockTradeBalance.mf = newTradeBalance.toFixed(2);

    console.log(`MOCK: Simulated ${percentage > 0 ? '+' : ''}${percentage}% market movement`);
  }

  private estimateUSDValue(asset: string, amount: number): number {
    const prices: Record<string, number> = {
      'XXBT': 65232,  // BTC price
      'XETH': 2634,   // ETH price
      'ADA': 0.40,    // ADA price
      'SOL': 50,      // SOL price
      'ZUSD': 1       // USD
    };
    
    return (prices[asset] || 0) * amount;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Method to reset mock data
  resetMockData(): void {
    this.mockBalances = {
      'XXBT': '0.15432100',
      'XETH': '2.84561000', 
      'ZUSD': '2543.25',
      'ADA': '8500.00000000',
      'SOL': '45.25000000'
    };

    this.mockTradeBalance = {
      eb: '25693.25',
      tb: '25693.25',
      m: '0.00',
      n: '0.00', 
      c: '0.00',
      v: '0.00',
      e: '25693.25',
      mf: '25693.25',
      ml: '0.00'
    };
  }
}

export const mockKrakenService = new MockKrakenService();