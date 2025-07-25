import { advancedSignals, AggregatedSignal, StreamingUpdate, Alert } from './AdvancedSignalsIntegration';
import { SocialMediaPost } from '../SentimentAnalyzer';
import { SignalType } from './types';

/**
 * Dashboard integration helper for advanced signals
 * Provides React-friendly hooks and utilities
 */

export interface DashboardSignal {
  id: string;
  symbol: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  signals: {
    type: SignalType;
    strength: number;
    label: string;
  }[];
  alerts: Alert[];
  riskScore: number;
  consensusLevel: number;
}

export interface SignalChartData {
  timestamp: number;
  strength: number;
  confidence: number;
  sentiment: number; // -1 to 1
}

export interface SignalTypeDistribution {
  type: string;
  count: number;
  avgStrength: number;
}

export interface SymbolSummary {
  symbol: string;
  totalSignals: number;
  currentSentiment: 'bullish' | 'bearish' | 'neutral';
  avgStrength: number;
  avgConfidence: number;
  recentAlerts: Alert[];
  trendDirection: 'up' | 'down' | 'stable';
}

export class DashboardIntegration {
  private signalHistory: Map<string, DashboardSignal[]> = new Map();
  private chartDataCache: Map<string, SignalChartData[]> = new Map();
  private updateCallbacks: Set<(update: StreamingUpdate) => void> = new Set();
  private alertCallbacks: Set<(alerts: Alert[]) => void> = new Set();
  private maxHistorySize: number = 100;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for streaming updates
    advancedSignals.on('streamingUpdate', (update: StreamingUpdate) => {
      this.handleStreamingUpdate(update);
    });

    // Listen for alerts
    advancedSignals.on('alerts', (alerts: Alert[]) => {
      this.handleAlerts(alerts);
    });
  }

  /**
   * Start real-time updates for dashboard
   */
  public startDashboardUpdates(
    onUpdate?: (update: StreamingUpdate) => void,
    onAlert?: (alerts: Alert[]) => void
  ): void {
    if (onUpdate) {
      this.updateCallbacks.add(onUpdate);
    }
    if (onAlert) {
      this.alertCallbacks.add(onAlert);
    }

    // Start streaming if not already running
    if (!advancedSignals.getMetrics().isStreaming) {
      advancedSignals.startStreaming();
    }
  }

  /**
   * Stop dashboard updates
   */
  public stopDashboardUpdates(
    onUpdate?: (update: StreamingUpdate) => void,
    onAlert?: (alerts: Alert[]) => void
  ): void {
    if (onUpdate) {
      this.updateCallbacks.delete(onUpdate);
    }
    if (onAlert) {
      this.alertCallbacks.delete(onAlert);
    }

    // Stop streaming if no more callbacks
    if (this.updateCallbacks.size === 0 && this.alertCallbacks.size === 0) {
      advancedSignals.stopStreaming();
    }
  }

  /**
   * Analyze text and get dashboard-friendly result
   */
  public async analyzeForDashboard(
    text: string | SocialMediaPost
  ): Promise<DashboardSignal | null> {
    const result = typeof text === 'string' 
      ? await advancedSignals.analyzeText(text)
      : await advancedSignals.analyzeSocialPost(text);

    if (!result) return null;

    return this.convertToDashboardSignal(result);
  }

  /**
   * Get current signals for a symbol
   */
  public getSymbolSignals(symbol: string): DashboardSignal[] {
    return this.signalHistory.get(symbol) || [];
  }

  /**
   * Get chart data for a symbol
   */
  public getChartData(symbol: string, timeRange: 'hour' | 'day' | 'week' = 'hour'): SignalChartData[] {
    const signals = this.getSymbolSignals(symbol);
    const now = Date.now();
    const ranges = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    };

    const cutoff = now - ranges[timeRange];
    
    return signals
      .filter(s => s.timestamp >= cutoff)
      .map(s => ({
        timestamp: s.timestamp,
        strength: s.strength,
        confidence: s.confidence,
        sentiment: s.sentiment === 'bullish' ? s.strength : 
                   s.sentiment === 'bearish' ? -s.strength : 0
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get signal type distribution
   */
  public getSignalTypeDistribution(): SignalTypeDistribution[] {
    const distribution = new Map<SignalType, { count: number; totalStrength: number }>();

    this.signalHistory.forEach(signals => {
      signals.forEach(signal => {
        signal.signals.forEach(s => {
          const current = distribution.get(s.type) || { count: 0, totalStrength: 0 };
          distribution.set(s.type, {
            count: current.count + 1,
            totalStrength: current.totalStrength + s.strength
          });
        });
      });
    });

    return Array.from(distribution.entries()).map(([type, data]) => ({
      type: this.formatSignalType(type),
      count: data.count,
      avgStrength: data.totalStrength / data.count
    })).sort((a, b) => b.count - a.count);
  }

  /**
   * Get top symbols by activity
   */
  public getTopSymbols(limit: number = 10): SymbolSummary[] {
    const summaries: SymbolSummary[] = [];

    this.signalHistory.forEach((signals, symbol) => {
      if (signals.length === 0) return;

      const recent = signals.slice(-10); // Last 10 signals
      const totalStrength = recent.reduce((sum, s) => sum + s.strength, 0);
      const totalConfidence = recent.reduce((sum, s) => sum + s.confidence, 0);
      
      // Determine trend
      let trendDirection: 'up' | 'down' | 'stable' = 'stable';
      if (recent.length >= 3) {
        const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
        const secondHalf = recent.slice(Math.floor(recent.length / 2));
        
        const firstAvg = firstHalf.reduce((sum, s) => sum + s.strength, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, s) => sum + s.strength, 0) / secondHalf.length;
        
        if (secondAvg > firstAvg * 1.1) trendDirection = 'up';
        else if (secondAvg < firstAvg * 0.9) trendDirection = 'down';
      }

      // Collect recent alerts
      const recentAlerts: Alert[] = [];
      recent.forEach(s => {
        if (s.alerts) recentAlerts.push(...s.alerts);
      });

      summaries.push({
        symbol,
        totalSignals: signals.length,
        currentSentiment: recent[recent.length - 1].sentiment,
        avgStrength: totalStrength / recent.length,
        avgConfidence: totalConfidence / recent.length,
        recentAlerts: recentAlerts.slice(-5),
        trendDirection
      });
    });

    return summaries
      .sort((a, b) => b.totalSignals - a.totalSignals)
      .slice(0, limit);
  }

  /**
   * Get recent alerts
   */
  public getRecentAlerts(limit: number = 20): Alert[] {
    const alerts: Alert[] = [];

    this.signalHistory.forEach(signals => {
      signals.forEach(signal => {
        if (signal.alerts) {
          alerts.push(...signal.alerts);
        }
      });
    });

    return alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get signal statistics
   */
  public getStatistics(): {
    totalSignals: number;
    totalSymbols: number;
    avgStrength: number;
    avgConfidence: number;
    sentimentDistribution: Record<string, number>;
    priorityDistribution: Record<string, number>;
    alertCount: number;
  } {
    let totalSignals = 0;
    let totalStrength = 0;
    let totalConfidence = 0;
    const sentimentCounts: Record<string, number> = { bullish: 0, bearish: 0, neutral: 0 };
    const priorityCounts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    let alertCount = 0;

    this.signalHistory.forEach(signals => {
      signals.forEach(signal => {
        totalSignals++;
        totalStrength += signal.strength;
        totalConfidence += signal.confidence;
        sentimentCounts[signal.sentiment]++;
        priorityCounts[signal.priority]++;
        alertCount += signal.alerts?.length || 0;
      });
    });

    return {
      totalSignals,
      totalSymbols: this.signalHistory.size,
      avgStrength: totalSignals > 0 ? totalStrength / totalSignals : 0,
      avgConfidence: totalSignals > 0 ? totalConfidence / totalSignals : 0,
      sentimentDistribution: sentimentCounts,
      priorityDistribution: priorityCounts,
      alertCount
    };
  }

  /**
   * Clear history for a symbol or all symbols
   */
  public clearHistory(symbol?: string): void {
    if (symbol) {
      this.signalHistory.delete(symbol);
      this.chartDataCache.delete(symbol);
    } else {
      this.signalHistory.clear();
      this.chartDataCache.clear();
    }
  }

  // Private helper methods

  private handleStreamingUpdate(update: StreamingUpdate): void {
    const dashboardSignal = this.convertToDashboardSignal(update.aggregatedSignal, update.alerts);
    this.addToHistory(dashboardSignal);

    // Notify callbacks
    this.updateCallbacks.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('Dashboard update callback error:', error);
      }
    });
  }

  private handleAlerts(alerts: Alert[]): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alerts);
      } catch (error) {
        console.error('Alert callback error:', error);
      }
    });
  }

  private convertToDashboardSignal(
    aggregated: AggregatedSignal, 
    alerts?: Alert[]
  ): DashboardSignal {
    return {
      id: `${aggregated.symbol}_${Date.now()}`,
      symbol: aggregated.symbol,
      sentiment: aggregated.sentiment,
      strength: aggregated.overallStrength,
      confidence: aggregated.overallConfidence,
      priority: aggregated.priority,
      timestamp: Date.now(),
      signals: aggregated.signals.map(s => ({
        type: s.type,
        strength: s.strength,
        label: this.formatSignalType(s.type)
      })),
      alerts: alerts || [],
      riskScore: aggregated.metadata.riskScore,
      consensusLevel: aggregated.metadata.consensusLevel
    };
  }

  private addToHistory(signal: DashboardSignal): void {
    const history = this.signalHistory.get(signal.symbol) || [];
    history.push(signal);

    // Maintain max history size
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    this.signalHistory.set(signal.symbol, history);
  }

  private formatSignalType(type: SignalType): string {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

// Export singleton instance
export const dashboardIntegration = new DashboardIntegration();

// Export React hook for easy integration
export function useAdvancedSignals(
  onUpdate?: (update: StreamingUpdate) => void,
  onAlert?: (alerts: Alert[]) => void
) {
  // This would be a proper React hook in a React environment
  // For now, just return the integration instance
  return {
    integration: dashboardIntegration,
    startUpdates: () => dashboardIntegration.startDashboardUpdates(onUpdate, onAlert),
    stopUpdates: () => dashboardIntegration.stopDashboardUpdates(onUpdate, onAlert),
    analyze: (text: string | SocialMediaPost) => dashboardIntegration.analyzeForDashboard(text),
    getSymbolSignals: (symbol: string) => dashboardIntegration.getSymbolSignals(symbol),
    getChartData: (symbol: string, range?: 'hour' | 'day' | 'week') => dashboardIntegration.getChartData(symbol, range),
    getTopSymbols: (limit?: number) => dashboardIntegration.getTopSymbols(limit),
    getStatistics: () => dashboardIntegration.getStatistics(),
    getRecentAlerts: (limit?: number) => dashboardIntegration.getRecentAlerts(limit)
  };
}