import { 
  StrategyConfig, 
  StrategyState, 
  MarketContext, 
  StrategySignal,
  StrategyPosition,
  StrategyAlert,
  AlertLevel,
  StrategyMetrics
} from '../../types/strategy';
import { Subject } from 'rxjs';
import { StrategyMonitor } from './StrategyMonitor';

export abstract class BaseStrategy {
  protected state!: StrategyState;
  protected signals = new Subject<StrategySignal>();
  protected positions = new Map<string, StrategyPosition>();
  protected indicators = new Map<string, any>();
  protected monitor: StrategyMonitor;

  constructor(
    protected readonly config: StrategyConfig,
    protected readonly params: Record<string, any>
  ) {
    this.validateConfig();
    this.initializeState();
    this.monitor = new StrategyMonitor(this);
    
    // Setup monitoring handlers
    this.monitor.onAlert(this.handleAlert.bind(this));
    this.monitor.onMetrics(this.handleMetrics.bind(this));
  }

  private validateConfig() {
    // Validate parameters against config
    Object.entries(this.config.parameters).forEach(([key, spec]) => {
      if (!(key in this.params)) {
        this.params[key] = spec.default;
      } else if (spec.type === 'number') {
        if (spec.min !== undefined && this.params[key] < spec.min) {
          throw new Error(`Parameter ${key} below minimum value ${spec.min}`);
        }
        if (spec.max !== undefined && this.params[key] > spec.max) {
          throw new Error(`Parameter ${key} above maximum value ${spec.max}`);
        }
      }
    });
  }

  private initializeState() {
    this.state = {
      positions: [],
      equity: 0,
      balance: 0,
      risk: 0,
      performance: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
      },
    };
  }

  // Abstract methods that must be implemented by concrete strategies
  abstract onInit(): Promise<void>;
  abstract onTick(context: MarketContext): Promise<void>;
  abstract onOrderUpdate(order: any): void;
  abstract onPositionUpdate(position: StrategyPosition): void;
  abstract onError(error: Error): void;

  // Helper methods for position management
  protected async enterPosition(signal: StrategySignal) {
    try {
      // Implement position entry logic
      this.positions.set(signal.pair, {
        pair: signal.pair,
        side: signal.side === 'buy' ? 'long' : 'short',
        entryPrice: signal.price,
        quantity: signal.quantity,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        timestamp: signal.timestamp,
      });
      this.signals.next(signal);
    } catch (error) {
      this.onError(error as Error);
    }
  }

  protected async exitPosition(signal: StrategySignal) {
    try {
      // Implement position exit logic
      this.positions.delete(signal.pair);
      this.signals.next(signal);
    } catch (error) {
      this.onError(error as Error);
    }
  }

  // Risk management methods
  protected calculatePositionSize(price: number, stopLoss: number): number {
    const riskAmount = this.state.balance * (this.params.riskPerTrade || 0.01);
    const riskPerUnit = Math.abs(price - stopLoss);
    return riskAmount / riskPerUnit;
  }

  protected updatePerformance(pnl: number) {
    const perf = this.state.performance;
    perf.totalTrades++;
    if (pnl > 0) {
      perf.winningTrades++;
    } else {
      perf.losingTrades++;
    }
    perf.winRate = (perf.winningTrades / perf.totalTrades) * 100;
    // Update other performance metrics...
  }

  // Utility methods for indicators
  protected async addIndicator(name: string, type: string, params: any) {
    // Implement indicator calculation
    this.indicators.set(name, { type, params, values: [] });
  }

  protected getIndicatorValue(name: string): number | number[] {
    return this.indicators.get(name)?.values;
  }

  // Getters for strategy state
  getState(): StrategyState {
    return this.state;
  }

  getPositions(): StrategyPosition[] {
    return Array.from(this.positions.values());
  }

  onSignals(callback: (signal: StrategySignal) => void) {
    return this.signals.subscribe(callback);
  }

  protected handleAlert(alert: StrategyAlert) {
    switch (alert.level) {
      case AlertLevel.CRITICAL:
        // Implement emergency procedures (e.g., close positions)
        if (alert.category === 'risk') {
          this.handleRiskAlert(alert);
        }
        break;
      case AlertLevel.WARNING:
        // Log warning and possibly adjust position sizes
        console.warn('Strategy warning:', alert);
        break;
      default:
        console.log('Strategy info:', alert);
    }
  }

  protected handleMetrics(metrics: StrategyMetrics) {
    // Update strategy state with new metrics
    this.state.equity = metrics.equity;
    this.state.balance = metrics.balance;
    
    // Emit metrics for external monitoring
    this.signals.next({
      type: 'metrics',
      data: metrics,
      timestamp: Date.now()
    } as any);
  }

  protected async handleRiskAlert(alert: StrategyAlert) {
    if (alert.category === 'risk' && alert.level === AlertLevel.CRITICAL) {
      // Close all positions
      const positions = Array.from(this.positions.values());
      for (const position of positions) {
        await this.exitPosition({
          type: 'exit',
          side: position.side === 'long' ? 'sell' : 'buy',
          pair: position.pair,
          price: 0, // Use market price
          quantity: position.quantity,
          reason: 'Risk alert: ' + alert.message,
          timestamp: Date.now()
        });
      }
    }
  }

  // Add monitoring configuration
  setMonitoringThresholds(thresholds: {
    marginLevelWarning?: number;
    marginLevelCritical?: number;
    drawdownWarning?: number;
    drawdownCritical?: number;
    dailyLossWarning?: number;
    dailyLossCritical?: number;
    latencyWarning?: number;
    latencyCritical?: number;
  }) {
    this.monitor.setThresholds(thresholds);
  }
} 