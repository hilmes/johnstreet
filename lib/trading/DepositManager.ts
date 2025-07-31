import { krakenService } from '../../services/KrakenService';
import { mockKrakenService } from './MockKrakenService';
import { KrakenBalance, KrakenLedgerEntry } from '../../types/kraken';

export interface DepositAddress {
  asset: string;
  address: string;
  tag?: string;
  method: string;
  new: boolean;
}

export interface DepositStatus {
  asset: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  requiredConfirmations: number;
  txid?: string;
  time: Date;
}

export interface WithdrawalRequest {
  asset: string;
  key: string; // Withdrawal address key
  amount: number;
}

export interface WithdrawalStatus {
  refid: string;
  asset: string;
  amount: number;
  fee: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'failed';
  time: Date;
}

export class DepositManager {
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second
  private readonly useMockData = process.env.TRADING_MODE === 'PAPER' || process.env.MOCK_KRAKEN_API === 'true';

  private get krakenClient() {
    return this.useMockData ? mockKrakenService : krakenService;
  }

  /**
   * Get account balances for all assets
   */
  async getBalances(): Promise<Record<string, number>> {
    try {
      const balances = await this.krakenClient.getAccountBalance();
      const parsedBalances: Record<string, number> = {};
      
      for (const [asset, balance] of Object.entries(balances)) {
        parsedBalances[asset] = parseFloat(balance);
      }
      
      return parsedBalances;
    } catch (error) {
      console.error('Failed to get balances:', error);
      throw new Error(`Failed to retrieve account balances: ${error}`);
    }
  }

  /**
   * Get balance for a specific asset
   */
  async getBalance(asset: string): Promise<number> {
    const balances = await this.getBalances();
    return balances[asset] || 0;
  }

  /**
   * Get USD equivalent balance for all assets
   */
  async getUSDBalances(): Promise<{ balances: Record<string, number>; totalUSD: number }> {
    try {
      const [balances, tradeBalance] = await Promise.all([
        this.getBalances(),
        this.krakenClient.getTradeBalance('ZUSD')
      ]);

      const totalUSD = parseFloat(tradeBalance.eb); // Equivalent balance in USD

      return {
        balances,
        totalUSD
      };
    } catch (error) {
      console.error('Failed to get USD balances:', error);
      throw new Error(`Failed to retrieve USD balances: ${error}`);
    }
  }

  /**
   * Get deposit address for an asset
   * Note: This requires special API permissions and is not available in all regions
   */
  async getDepositAddress(asset: string, method?: string): Promise<DepositAddress> {
    try {
      // This is a placeholder - actual implementation would call Kraken's deposit methods
      // which require special permissions and are region-dependent
      throw new Error('Deposit address generation requires manual setup via Kraken website');
    } catch (error) {
      console.error('Failed to get deposit address:', error);
      throw new Error(`Deposit address not available via API. Please use Kraken website to generate deposit addresses for ${asset}`);
    }
  }

  /**
   * Get deposit history from ledger
   */
  async getDepositHistory(asset?: string, limit = 50): Promise<DepositStatus[]> {
    try {
      const ledgerResponse = await this.krakenClient.getLedgers({
        asset,
        type: 'deposit',
        ofs: 0
      });

      const deposits: DepositStatus[] = [];
      
      for (const [id, entry] of Object.entries(ledgerResponse.ledger)) {
        if (entry.type === 'deposit') {
          deposits.push({
            asset: entry.asset,
            amount: parseFloat(entry.amount),
            status: parseFloat(entry.amount) > 0 ? 'confirmed' : 'pending',
            confirmations: parseFloat(entry.amount) > 0 ? 6 : 0, // Assume confirmed if positive
            requiredConfirmations: this.getRequiredConfirmations(entry.asset),
            txid: entry.refid,
            time: new Date(entry.time * 1000)
          });
        }
      }

      return deposits.slice(0, limit);
    } catch (error) {
      console.error('Failed to get deposit history:', error);
      throw new Error(`Failed to retrieve deposit history: ${error}`);
    }
  }

  /**
   * Monitor for new deposits by polling balance changes
   */
  async monitorDeposits(
    callback: (deposit: DepositStatus) => void,
    pollInterval = 30000 // 30 seconds
  ): Promise<() => void> {
    let previousBalances = await this.getBalances();
    let isRunning = true;

    const poll = async () => {
      if (!isRunning) return;

      try {
        const currentBalances = await this.getBalances();
        
        // Check for balance increases (potential deposits)
        for (const [asset, currentBalance] of Object.entries(currentBalances)) {
          const previousBalance = previousBalances[asset] || 0;
          const difference = currentBalance - previousBalance;
          
          if (difference > 0.00000001) { // Account for floating point precision
            // Potential deposit detected
            callback({
              asset,
              amount: difference,
              status: 'confirmed',
              confirmations: 6,
              requiredConfirmations: this.getRequiredConfirmations(asset),
              time: new Date()
            });
          }
        }
        
        previousBalances = currentBalances;
      } catch (error) {
        console.error('Error monitoring deposits:', error);
      }

      if (isRunning) {
        setTimeout(poll, pollInterval);
      }
    };

    // Start polling
    setTimeout(poll, pollInterval);

    // Return stop function
    return () => {
      isRunning = false;
    };
  }

  /**
   * Get required confirmations for different assets
   */
  private getRequiredConfirmations(asset: string): number {
    const confirmations: Record<string, number> = {
      'XXBT': 3,  // Bitcoin
      'XETH': 12, // Ethereum
      'XXRP': 2,  // Ripple
      'ADA': 15,  // Cardano
      'SOL': 1,   // Solana
      'DOT': 1,   // Polkadot
      'LINK': 12, // Chainlink
      'XLTC': 6,  // Litecoin
      'BCH': 6,   // Bitcoin Cash
      'XXLM': 2   // Stellar
    };
    
    return confirmations[asset] || 6; // Default to 6 confirmations
  }

  /**
   * Format asset name for display
   */
  formatAssetName(asset: string): string {
    const assetMap: Record<string, string> = {
      'XXBT': 'Bitcoin',
      'XETH': 'Ethereum', 
      'XXRP': 'Ripple',
      'ADA': 'Cardano',
      'SOL': 'Solana',
      'DOT': 'Polkadot',
      'LINK': 'Chainlink',
      'XLTC': 'Litecoin',
      'BCH': 'Bitcoin Cash',
      'XXLM': 'Stellar',
      'ZUSD': 'USD'
    };
    
    return assetMap[asset] || asset;
  }

  /**
   * Get trading pairs available for an asset
   */
  async getAvailablePairs(asset: string): Promise<string[]> {
    try {
      const pairs = await this.krakenClient.getTradableAssetPairs();
      const availablePairs = [];
      
      for (const [pairName, pairInfo] of Object.entries(pairs)) {
        if (pairInfo.base === asset || pairInfo.quote === asset) {
          availablePairs.push(pairName);
        }
      }
      
      return availablePairs;
    } catch (error) {
      console.error('Failed to get available pairs:', error);
      return [];
    }
  }

  /**
   * Estimate trading fees for a given volume
   */
  async estimateTradingFees(pair: string, volume: number): Promise<{
    takerFee: number;
    makerFee: number;
    feeAsset: string;
  }> {
    try {
      const tradeVolume = await this.krakenClient.getTradeVolume([pair]);
      const pairFees = tradeVolume.fees[pair];
      const pairMakerFees = tradeVolume.fees_maker[pair];
      
      return {
        takerFee: parseFloat(pairFees?.fee || '0.0026'), // Default 0.26%
        makerFee: parseFloat(pairMakerFees?.fee || '0.0016'), // Default 0.16%
        feeAsset: tradeVolume.currency
      };
    } catch (error) {
      console.error('Failed to estimate fees:', error);
      return {
        takerFee: 0.0026, // Default Kraken taker fee
        makerFee: 0.0016, // Default Kraken maker fee
        feeAsset: 'USD'
      };
    }
  }

  /**
   * Check if account has sufficient balance for a trade
   */
  async hasSufficientBalance(
    pair: string, 
    side: 'buy' | 'sell', 
    quantity: number, 
    price?: number
  ): Promise<{ 
    sufficient: boolean; 
    available: number; 
    required: number; 
    asset: string 
  }> {
    try {
      const [balances, pairInfo] = await Promise.all([
        this.getBalances(),
        this.krakenClient.getTradableAssetPairs([pair])
      ]);

      const pairData = pairInfo[pair];
      if (!pairData) {
        throw new Error(`Pair ${pair} not found`);
      }

      let requiredAsset: string;
      let requiredAmount: number;

      if (side === 'buy') {
        // Buying: need quote currency (e.g., USD to buy BTC)
        requiredAsset = pairData.quote;
        requiredAmount = quantity * (price || 0); // Will need current market price if not provided
      } else {
        // Selling: need base currency (e.g., BTC to sell for USD)
        requiredAsset = pairData.base;
        requiredAmount = quantity;
      }

      const available = balances[requiredAsset] || 0;
      
      // Add estimated fees (0.26% for taker orders)
      const estimatedFees = requiredAmount * 0.0026;
      const totalRequired = requiredAmount + estimatedFees;

      return {
        sufficient: available >= totalRequired,
        available,
        required: totalRequired,
        asset: requiredAsset
      };
    } catch (error) {
      console.error('Failed to check balance:', error);
      return {
        sufficient: false,
        available: 0,
        required: 0,
        asset: ''
      };
    }
  }
}

// Export singleton instance
export const depositManager = new DepositManager();