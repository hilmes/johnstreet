import { Subject } from 'rxjs';
import { BaseStrategy } from './BaseStrategy';
import { 
  StrategyState, 
  StrategyPosition, 
  AlertLevel,
  StrategyAlert as IStrategyAlert,
  StrategyMetrics as IStrategyMetrics
} from '../../types/strategy';

export interface StrategyAlert extends IStrategyAlert {}

export interface StrategyMetrics extends IStrategyMetrics {}

export class StrategyMonitor {
  private alerts = new Subject<StrategyAlert>();
  private metrics = new Subject<StrategyMetrics>();
  private lastCheck = Date.now();
  private lastMetrics: StrategyMetrics | null = null;

  private readonly thresholds = {
    marginLevelWarning: 2.5,
    marginLevelCritical: 1.5,
    drawdownWarning: 0.08,
    drawdownCritical: 0.15,
    dailyLossWarning: 0.015,
    dailyLossCritical: 0.025,
    latencyWarning: 500,  // ms
    latencyCritical: 1000 // ms
  };

  constructor(
    private strategy: BaseStrategy,
    private checkInterval: number = 5000
  ) {
    this.startMonitoring();
  }

  private startMonitoring() {
    setInterval(() => this.checkStrategy(), this.checkInterval);
  }

  private async checkStrategy() {
    try {
      const state = this.strategy.getState();
      const positions = this.strategy.getPositions();
      
      // Calculate current metrics
      const metrics = this.calculateMetrics(state, positions);
      this.metrics.next(metrics);

      // Check for alerts
      await Promise.all([
        this.checkRiskLevels(metrics),
        this.checkPerformance(metrics),
        this.checkPositions(positions),
        this.checkLatency(metrics)
      ]);

      this.lastCheck = Date.now();
      this.lastMetrics = metrics;
    } catch (error) {
      console.error('Strategy monitoring error:', error);
      this.createAlert(AlertLevel.CRITICAL, 'Strategy monitoring failed', 'system', { error });
    }
  }

  private calculateMetrics(state: StrategyState, positions: StrategyPosition[]): StrategyMetrics {
    const now = Date.now();
    const dayStart = new Date().setHours(0, 0, 0, 0);
    
    // Calculate daily PnL
    const dailyPnL = this.lastMetrics ? 
      state.equity - this.lastMetrics.equity :
      0;

    // Calculate drawdown
    const peak = Math.max(state.equity, this.lastMetrics?.equity || state.equity);
    const drawdown = peak > 0 ? (peak - state.equity) / peak : 0;

    return {
      equity: state.equity,
      balance: state.balance,
      openPositions: positions.length,
      dailyPnL,
      dailyRoi: state.balance > 0 ? dailyPnL / state.balance : 0,
      drawdown,
      drawdownPercent: drawdown * 100,
      marginLevel: this.calculateMarginLevel(state, positions),
      latency: now - this.lastCheck,
      risk: state.risk,
      totalTrades: state.performance.totalTrades,
      winningTrades: state.performance.winningTrades,
      losingTrades: state.performance.losingTrades,
      winRate: state.performance.winRate,
      profitFactor: state.performance.profitFactor,
      sharpeRatio: state.performance.sharpeRatio,
      maxDrawdown: state.performance.maxDrawdown,
      maxDrawdownPercent: state.performance.maxDrawdown * 100,
      timestamp: now
    };
  }

  private calculateMarginLevel(state: StrategyState, positions: StrategyPosition[]): number {
    const totalPositionValue = positions.reduce((sum, pos) => {
      return sum + pos.entryPrice * pos.quantity;
    }, 0);

    return totalPositionValue > 0 ? state.equity / totalPositionValue : Infinity;
  }

  private async checkRiskLevels(metrics: StrategyMetrics) {
    // Check margin level
    if (metrics.marginLevel <= this.thresholds.marginLevelCritical) {
      this.createAlert(AlertLevel.CRITICAL, 'Critical margin level', 'risk', {
        marginLevel: metrics.marginLevel
      });
    } else if (metrics.marginLevel <= this.thresholds.marginLevelWarning) {
      this.createAlert(AlertLevel.WARNING, 'Low margin level', 'risk', {
        marginLevel: metrics.marginLevel
      });
    }

    // Check drawdown
    if (metrics.drawdown >= this.thresholds.drawdownCritical) {
      this.createAlert(AlertLevel.CRITICAL, 'Critical drawdown level', 'risk', {
        drawdown: metrics.drawdown
      });
    } else if (metrics.drawdown >= this.thresholds.drawdownWarning) {
      this.createAlert(AlertLevel.WARNING, 'High drawdown level', 'risk', {
        drawdown: metrics.drawdown
      });
    }
  }

  private async checkPerformance(metrics: StrategyMetrics) {
    // Check daily loss
    const dailyLossRatio = Math.abs(metrics.dailyRoi);
    if (dailyLossRatio >= this.thresholds.dailyLossCritical) {
      this.createAlert(AlertLevel.CRITICAL, 'Critical daily loss', 'performance', {
        dailyRoi: metrics.dailyRoi
      });
    } else if (dailyLossRatio >= this.thresholds.dailyLossWarning) {
      this.createAlert(AlertLevel.WARNING, 'High daily loss', 'performance', {
        dailyRoi: metrics.dailyRoi
      });
    }
  }

  private async checkPositions(positions: StrategyPosition[]) {
    positions.forEach(position => {
      // Check stop loss proximity
      if (position.stopLoss) {
        const distanceToStop = Math.abs(position.entryPrice - position.stopLoss) / position.entryPrice;
        if (distanceToStop < 0.01) {  // Within 1% of stop loss
          this.createAlert(AlertLevel.WARNING, 'Position near stop loss', 'risk', {
            pair: position.pair,
            distanceToStop
          });
        }
      }
    });
  }

  private async checkLatency(metrics: StrategyMetrics) {
    if (metrics.latency >= this.thresholds.latencyCritical) {
      this.createAlert(AlertLevel.CRITICAL, 'Critical latency', 'system', {
        latency: metrics.latency
      });
    } else if (metrics.latency >= this.thresholds.latencyWarning) {
      this.createAlert(AlertLevel.WARNING, 'High latency', 'system', {
        latency: metrics.latency
      });
    }
  }

  private createAlert(level: AlertLevel, message: string, category: 'risk' | 'performance' | 'system', data?: any) {
    const alert: StrategyAlert = {
      level,
      message,
      category,
      timestamp: Date.now(),
      data
    };
    this.alerts.next(alert);
  }

  onAlert(callback: (alert: StrategyAlert) => void) {
    return this.alerts.subscribe(callback);
  }

  onMetrics(callback: (metrics: StrategyMetrics) => void) {
    return this.metrics.subscribe(callback);
  }

  setThresholds(newThresholds: Partial<typeof this.thresholds>) {
    Object.assign(this.thresholds, newThresholds);
  }
} 