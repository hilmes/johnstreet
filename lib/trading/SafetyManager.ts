import { depositManager } from './DepositManager';
import { krakenService } from '../../services/KrakenService';
import { mockKrakenService } from './MockKrakenService';

export interface SafetyLimits {
  maxPositionSizePct: number;    // Maximum position size as % of portfolio
  dailyLossLimitPct: number;     // Daily loss limit as % of portfolio
  maxLeverage: number;           // Maximum leverage allowed
  minOrderSizeUSD: number;       // Minimum order size in USD
  maxOrderSizeUSD: number;       // Maximum order size in USD
  tradingMode: 'PAPER' | 'STAGING' | 'PRODUCTION';
}

export interface RiskMetrics {
  portfolioValue: number;
  dailyPnL: number;
  dailyPnLPct: number;
  openPositionsValue: number;
  openPositionsPct: number;
  availableMargin: number;
  isWithinLimits: boolean;
  violations: string[];
}

export interface TradeValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  adjustedQuantity?: number;
  riskScore: number;
}

export class SafetyManager {
  private limits: SafetyLimits;
  private emergencyStopActive = false;
  private dailyPnLStart: { date: string; portfolioValue: number } | null = null;
  private readonly useMockData = process.env.TRADING_MODE === 'PAPER' || process.env.MOCK_KRAKEN_API === 'true';

  private get krakenClient() {
    return this.useMockData ? mockKrakenService : krakenService;
  }

  constructor(limits?: Partial<SafetyLimits>) {
    this.limits = {
      maxPositionSizePct: parseFloat(process.env.MAX_POSITION_SIZE_PCT || '0.05'), // 5%
      dailyLossLimitPct: parseFloat(process.env.DAILY_LOSS_LIMIT_PCT || '0.02'),   // 2%
      maxLeverage: parseFloat(process.env.MAX_LEVERAGE || '1.0'),                  // No leverage
      minOrderSizeUSD: parseFloat(process.env.MIN_ORDER_SIZE_USD || '25'),
      maxOrderSizeUSD: parseFloat(process.env.MAX_ORDER_SIZE_USD || '1000'),
      tradingMode: (process.env.TRADING_MODE as any) || 'PAPER',
      ...limits
    };
  }

  /**
   * Get current safety limits
   */
  getLimits(): SafetyLimits {
    return { ...this.limits };
  }

  /**
   * Update safety limits (requires unlock key for production)
   */
  updateLimits(newLimits: Partial<SafetyLimits>, unlockKey?: string): void {
    if (this.limits.tradingMode === 'PRODUCTION' && unlockKey !== process.env.PRODUCTION_UNLOCK_KEY) {
      throw new Error('Production unlock key required to modify safety limits');
    }

    this.limits = { ...this.limits, ...newLimits };
  }

  /**
   * Calculate current risk metrics
   */
  async calculateRiskMetrics(): Promise<RiskMetrics> {
    try {
      const [balances, tradeBalance, openOrders] = await Promise.all([
        depositManager.getUSDBalances(),
        this.krakenClient.getTradeBalance('ZUSD'),
        this.krakenClient.getOpenOrders()
      ]);

      const portfolioValue = balances.totalUSD;
      const dailyPnL = await this.calculateDailyPnL(portfolioValue);
      const dailyPnLPct = portfolioValue > 0 ? (dailyPnL / portfolioValue) * 100 : 0;
      
      // Calculate open positions value
      const openPositionsValue = parseFloat(tradeBalance.c) || 0; // Cost basis of open positions
      const openPositionsPct = portfolioValue > 0 ? (openPositionsValue / portfolioValue) * 100 : 0;
      
      const availableMargin = parseFloat(tradeBalance.mf) || 0; // Free margin

      // Check for violations
      const violations: string[] = [];
      
      if (dailyPnLPct < -this.limits.dailyLossLimitPct * 100) {
        violations.push(`Daily loss limit exceeded: ${dailyPnLPct.toFixed(2)}% (limit: ${this.limits.dailyLossLimitPct * 100}%)`);
      }
      
      if (openPositionsPct > this.limits.maxPositionSizePct * 100) {
        violations.push(`Position size limit exceeded: ${openPositionsPct.toFixed(2)}% (limit: ${this.limits.maxPositionSizePct * 100}%)`);
      }

      return {
        portfolioValue,
        dailyPnL,
        dailyPnLPct,
        openPositionsValue,
        openPositionsPct,
        availableMargin,
        isWithinLimits: violations.length === 0,
        violations
      };
    } catch (error) {
      console.error('Error calculating risk metrics:', error);
      return {
        portfolioValue: 0,
        dailyPnL: 0,
        dailyPnLPct: 0,
        openPositionsValue: 0,
        openPositionsPct: 0,
        availableMargin: 0,
        isWithinLimits: false,
        violations: ['Error calculating risk metrics']
      };
    }
  }

  /**
   * Validate a trade before execution
   */
  async validateTrade(
    pair: string,
    side: 'buy' | 'sell',
    quantity: number,
    price?: number
  ): Promise<TradeValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let adjustedQuantity = quantity;
    let riskScore = 0;

    try {
      // Check if emergency stop is active
      if (this.emergencyStopActive) {
        errors.push('Emergency stop is active - no trading allowed');
        return {
          valid: false,
          errors,
          warnings,
          riskScore: 100
        };
      }

      // Check trading mode
      if (this.limits.tradingMode === 'PAPER') {
        warnings.push('Paper trading mode - no real money at risk');
      }

      // Get current market price if not provided
      if (!price) {
        const ticker = await this.krakenClient.getTickerInformation([pair]);
        const tickerData = ticker[pair];
        if (tickerData) {
          price = parseFloat(tickerData.c[0]); // Last trade price
        } else {
          errors.push('Unable to get current market price');
          return { valid: false, errors, warnings, riskScore: 100 };
        }
      }

      const orderValueUSD = quantity * price;

      // Check minimum/maximum order sizes
      if (orderValueUSD < this.limits.minOrderSizeUSD) {
        errors.push(`Order size too small: $${orderValueUSD.toFixed(2)} (minimum: $${this.limits.minOrderSizeUSD})`);
      }

      if (orderValueUSD > this.limits.maxOrderSizeUSD) {
        errors.push(`Order size too large: $${orderValueUSD.toFixed(2)} (maximum: $${this.limits.maxOrderSizeUSD})`);
      }

      // Check balance
      const balanceCheck = await depositManager.hasSufficientBalance(pair, side, quantity, price);
      if (!balanceCheck.sufficient) {
        errors.push(`Insufficient balance: need ${balanceCheck.required.toFixed(8)} ${balanceCheck.asset}, have ${balanceCheck.available.toFixed(8)}`);
      }

      // Check position size limits
      const riskMetrics = await this.calculateRiskMetrics();
      const positionSizePct = (orderValueUSD / riskMetrics.portfolioValue) * 100;
      
      if (positionSizePct > this.limits.maxPositionSizePct * 100) {
        const maxOrderValue = (riskMetrics.portfolioValue * this.limits.maxPositionSizePct);
        adjustedQuantity = maxOrderValue / price;
        warnings.push(`Position size reduced to comply with limits: ${adjustedQuantity.toFixed(8)} (was ${quantity.toFixed(8)})`);
        riskScore += 20;
      }

      // Check daily loss limits
      if (!riskMetrics.isWithinLimits) {
        for (const violation of riskMetrics.violations) {
          if (violation.includes('Daily loss limit')) {
            errors.push('Daily loss limit exceeded - no new positions allowed');
            riskScore += 50;
          }
        }
      }

      // Calculate risk score
      riskScore += Math.min(positionSizePct * 2, 30); // Position size risk
      riskScore += Math.abs(riskMetrics.dailyPnLPct); // P&L risk
      
      if (side === 'buy' && riskMetrics.openPositionsPct > 80) {
        riskScore += 20; // High exposure risk
        warnings.push('High portfolio exposure detected');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        adjustedQuantity: adjustedQuantity !== quantity ? adjustedQuantity : undefined,
        riskScore: Math.min(riskScore, 100)
      };

    } catch (error) {
      console.error('Error validating trade:', error);
      return {
        valid: false,
        errors: [`Validation error: ${error}`],
        warnings,
        riskScore: 100
      };
    }
  }

  /**
   * Activate emergency stop
   */
  async activateEmergencyStop(reason: string): Promise<void> {
    console.warn(`EMERGENCY STOP ACTIVATED: ${reason}`);
    this.emergencyStopActive = true;

    try {
      // Cancel all open orders
      await this.krakenClient.cancelAllOrders();
      console.log('All open orders cancelled');

      // Log the emergency stop
      const riskMetrics = await this.calculateRiskMetrics();
      console.log('Emergency stop activated', {
        reason,
        timestamp: new Date().toISOString(),
        riskMetrics
      });

    } catch (error) {
      console.error('Error during emergency stop:', error);
    }
  }

  /**
   * Reset emergency stop (requires admin key)
   */
  resetEmergencyStop(adminKey: string): void {
    if (adminKey !== process.env.KILL_SWITCH_RESET_KEY) {
      throw new Error('Invalid admin key');
    }

    this.emergencyStopActive = false;
    console.log('Emergency stop reset by admin');
  }

  /**
   * Check if emergency stop is active
   */
  isEmergencyStopActive(): boolean {
    return this.emergencyStopActive;
  }

  /**
   * Calculate daily P&L
   */
  private async calculateDailyPnL(currentPortfolioValue: number): Promise<number> {
    const today = new Date().toDateString();
    
    // Initialize daily tracking if needed
    if (!this.dailyPnLStart || this.dailyPnLStart.date !== today) {
      this.dailyPnLStart = {
        date: today,
        portfolioValue: currentPortfolioValue
      };
      return 0; // First calculation of the day
    }

    return currentPortfolioValue - this.dailyPnLStart.portfolioValue;
  }

  /**
   * Get safety status summary
   */
  async getSafetyStatus(): Promise<{
    emergencyStopActive: boolean;
    tradingMode: string;
    riskMetrics: RiskMetrics;
    limits: SafetyLimits;
    timestamp: string;
  }> {
    const riskMetrics = await this.calculateRiskMetrics();
    
    return {
      emergencyStopActive: this.emergencyStopActive,
      tradingMode: this.limits.tradingMode,
      riskMetrics,
      limits: this.limits,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Auto-check safety limits and trigger emergency stop if needed
   */
  async autoSafetyCheck(): Promise<void> {
    try {
      const riskMetrics = await this.calculateRiskMetrics();
      
      // Auto-trigger emergency stop for severe violations
      if (riskMetrics.dailyPnLPct < -this.limits.dailyLossLimitPct * 100 * 1.5) {
        await this.activateEmergencyStop(`Daily loss exceeded ${(this.limits.dailyLossLimitPct * 150).toFixed(1)}%`);
      }
      
      if (riskMetrics.openPositionsPct > this.limits.maxPositionSizePct * 100 * 2) {
        await this.activateEmergencyStop(`Position size exceeded ${(this.limits.maxPositionSizePct * 200).toFixed(1)}%`);
      }

    } catch (error) {
      console.error('Error in auto safety check:', error);
      await this.activateEmergencyStop('Safety check system error');
    }
  }
}

// Export singleton instance
export const safetyManager = new SafetyManager();