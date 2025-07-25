import { EventEmitter } from 'events';
import { 
  SignalOrchestrator,
  UrgencyDetector,
  SentimentAsymmetryDetector,
  VelocityDivergenceDetector,
  TimeZoneArbitrageDetector,
  SentimentExhaustionDetector,
  InfluencerNetworkDetector,
  SmartMoneyDetector,
  CrossLanguageArbitrageDetector
} from './index';
import {
  AdvancedSignal,
  SignalType,
  TextInput,
  BatchTextInput,
  SignalAnalysisResult,
  ISignalDetector,
  SignalDetectorConfig,
  BaseSignal
} from './types';
import { SentimentAnalyzer, SentimentScore, SocialMediaPost, CryptoPumpSignal } from '../SentimentAnalyzer';
import { signalPipeline, PipelineConfig } from '@/lib/trading/pipeline/SignalPipeline';
import { MarketData } from '@/lib/trading/signals/SignalGenerator';
import { CrossPlatformSignal } from '@/lib/feeds/DataOrchestrator';
import { activityLoggerKV } from '../ActivityLoggerKV';

// Signal priority weights for aggregation
const SIGNAL_WEIGHTS: Record<SignalType, number> = {
  urgency: 1.5,
  sentiment_asymmetry: 1.3,
  velocity_divergence: 1.4,
  timezone_arbitrage: 1.2,
  sentiment_exhaustion: 1.3,
  influencer_network: 1.8,
  smart_money: 2.0,
  cross_language: 1.4,
  fear: 1.1,
  excitement: 1.0,
  uncertainty: 1.1,
  confidence: 1.2,
  fomo: 1.3,
  panic: 1.4,
  greed: 1.2,
  hope: 0.9,
  despair: 1.3,
  euphoria: 1.5,
  capitulation: 1.6,
  disbelief: 1.0,
  complacency: 0.8,
  momentum_shift: 1.7
};

// Signal combination rules
interface SignalCombination {
  signals: SignalType[];
  weight: number;
  condition: (signals: Map<SignalType, AdvancedSignal>) => boolean;
}

const SIGNAL_COMBINATIONS: SignalCombination[] = [
  {
    signals: ['smart_money', 'influencer_network'],
    weight: 2.5,
    condition: (signals) => {
      const sm = signals.get('smart_money');
      const inf = signals.get('influencer_network');
      return !!sm && !!inf && sm.strength > 0.7 && inf.strength > 0.6;
    }
  },
  {
    signals: ['urgency', 'fomo', 'velocity_divergence'],
    weight: 2.2,
    condition: (signals) => {
      const urg = signals.get('urgency');
      const fomo = signals.get('fomo');
      const vel = signals.get('velocity_divergence');
      return !!urg && !!fomo && !!vel && urg.strength > 0.6;
    }
  },
  {
    signals: ['sentiment_exhaustion', 'capitulation'],
    weight: 2.0,
    condition: (signals) => {
      const exh = signals.get('sentiment_exhaustion');
      const cap = signals.get('capitulation');
      return !!exh && !!cap && exh.strength > 0.7;
    }
  }
];

export interface IntegrationConfig {
  // Signal detection config
  detectorConfig?: Partial<SignalDetectorConfig>;
  
  // Pipeline integration
  enableTradingPipeline: boolean;
  pipelineConfig?: Partial<PipelineConfig>;
  
  // Real-time streaming
  enableStreaming: boolean;
  streamingInterval?: number; // ms
  
  // Signal filtering
  minSignalStrength: number;
  minConfidence: number;
  requiredSignals?: SignalType[];
  
  // Aggregation settings
  aggregationMethod: 'weighted' | 'consensus' | 'highest' | 'custom';
  customAggregator?: (signals: AdvancedSignal[]) => AggregatedSignal;
  
  // Alert thresholds
  alertThresholds: {
    criticalStrength: number;
    criticalConfidence: number;
    combinationThreshold: number;
  };
}

export interface AggregatedSignal {
  symbol: string;
  overallStrength: number;
  overallConfidence: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  signals: AdvancedSignal[];
  dominantSignal: SignalType;
  combinations: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata: {
    signalCount: number;
    avgTimeframe: number;
    consensusLevel: number;
    riskScore: number;
  };
}

export interface StreamingUpdate {
  timestamp: number;
  symbol: string;
  newSignals: AdvancedSignal[];
  aggregatedSignal: AggregatedSignal;
  tradingSignal?: any;
  alerts: Alert[];
}

export interface Alert {
  level: 'info' | 'warning' | 'critical';
  type: string;
  message: string;
  data: any;
  timestamp: number;
}

export class AdvancedSignalsIntegration extends EventEmitter {
  private orchestrator: SignalOrchestrator;
  private sentimentAnalyzer: SentimentAnalyzer;
  private config: IntegrationConfig;
  private detectors: Map<SignalType, ISignalDetector>;
  private streamingInterval?: NodeJS.Timeout;
  private signalHistory: Map<string, AdvancedSignal[]>;
  private isInitialized: boolean = false;

  constructor(config: Partial<IntegrationConfig> = {}) {
    super();
    
    this.config = this.createDefaultConfig(config);
    this.orchestrator = new SignalOrchestrator(this.config.detectorConfig);
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.detectors = new Map();
    this.signalHistory = new Map();
    
    this.initializeDetectors();
  }

  private createDefaultConfig(partial: Partial<IntegrationConfig>): IntegrationConfig {
    return {
      enableTradingPipeline: true,
      enableStreaming: true,
      streamingInterval: 5000, // 5 seconds
      minSignalStrength: 0.4,
      minConfidence: 0.5,
      aggregationMethod: 'weighted',
      alertThresholds: {
        criticalStrength: 0.8,
        criticalConfidence: 0.85,
        combinationThreshold: 0.75
      },
      ...partial
    };
  }

  private initializeDetectors(): void {
    // Initialize all detectors
    const detectorClasses = [
      UrgencyDetector,
      SentimentAsymmetryDetector,
      VelocityDivergenceDetector,
      TimeZoneArbitrageDetector,
      SentimentExhaustionDetector,
      InfluencerNetworkDetector,
      SmartMoneyDetector,
      CrossLanguageArbitrageDetector
    ];

    detectorClasses.forEach(DetectorClass => {
      try {
        const detector = new DetectorClass();
        this.detectors.set(detector.type, detector);
        this.orchestrator.registerDetector(detector);
      } catch (error) {
        console.error(`Failed to initialize detector:`, error);
      }
    });

    this.isInitialized = true;
    this.emit('initialized', { detectorCount: this.detectors.size });
  }

  /**
   * Main API: Analyze text and get all signals
   */
  public async analyzeText(input: TextInput | string): Promise<AggregatedSignal | null> {
    if (!this.isInitialized) {
      throw new Error('Integration not initialized');
    }

    try {
      // Prepare input
      const textInput: TextInput = typeof input === 'string' 
        ? { text: input, metadata: {} } 
        : input;

      // Get base sentiment
      const baseSentiment = this.sentimentAnalyzer.analyzeSentiment(textInput.text);
      
      // Get advanced signals
      const analysisResult = await this.orchestrator.analyze(textInput);
      
      // Filter signals
      const filteredSignals = this.filterSignals(analysisResult.signals);
      
      if (filteredSignals.length === 0) {
        return null;
      }

      // Extract symbol if available
      const symbol = this.extractSymbol(textInput.text, filteredSignals);
      
      // Aggregate signals
      const aggregated = this.aggregateSignals(filteredSignals, symbol, baseSentiment);
      
      // Store in history
      if (symbol) {
        this.updateSignalHistory(symbol, filteredSignals);
      }

      // Process alerts
      const alerts = this.checkAlerts(aggregated);
      if (alerts.length > 0) {
        this.emit('alerts', alerts);
      }

      // Integrate with trading pipeline if enabled
      if (this.config.enableTradingPipeline && symbol) {
        await this.sendToTradingPipeline(aggregated, baseSentiment);
      }

      return aggregated;

    } catch (error) {
      console.error('Analysis error:', error);
      await activityLoggerKV.log({
        type: 'advanced_signal_error',
        platform: 'system',
        source: 'advanced_signals',
        message: 'Failed to analyze text',
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        severity: 'error'
      });
      throw error;
    }
  }

  /**
   * Batch analysis for multiple texts
   */
  public async analyzeBatch(inputs: BatchTextInput | string[]): Promise<AggregatedSignal[]> {
    const batchInput: BatchTextInput = Array.isArray(inputs)
      ? { texts: inputs.map(text => ({ text, metadata: {} })) }
      : inputs;

    const results: AggregatedSignal[] = [];
    
    for (const textInput of batchInput.texts) {
      try {
        const result = await this.analyzeText(textInput);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error('Batch analysis error for text:', error);
      }
    }

    return results;
  }

  /**
   * Analyze social media post with platform-specific handling
   */
  public async analyzeSocialPost(post: SocialMediaPost): Promise<AggregatedSignal | null> {
    const input: TextInput = {
      text: post.text,
      metadata: {
        platform: post.platform,
        author: post.author,
        timestamp: post.timestamp,
        engagement: post.engagement,
        ...post.metadata
      }
    };

    return this.analyzeText(input);
  }

  /**
   * Start real-time streaming
   */
  public startStreaming(callback?: (update: StreamingUpdate) => void): void {
    if (!this.config.enableStreaming) {
      throw new Error('Streaming is disabled in config');
    }

    if (this.streamingInterval) {
      this.stopStreaming();
    }

    this.streamingInterval = setInterval(async () => {
      try {
        const updates = await this.processStreamingUpdate();
        
        if (updates.length > 0) {
          updates.forEach(update => {
            this.emit('streamingUpdate', update);
            if (callback) {
              callback(update);
            }
          });
        }
      } catch (error) {
        console.error('Streaming error:', error);
      }
    }, this.config.streamingInterval);

    this.emit('streamingStarted');
  }

  /**
   * Stop real-time streaming
   */
  public stopStreaming(): void {
    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
      this.streamingInterval = undefined;
      this.emit('streamingStopped');
    }
  }

  /**
   * Get current signals for a symbol
   */
  public getSignalsForSymbol(symbol: string): AdvancedSignal[] {
    return this.signalHistory.get(symbol) || [];
  }

  /**
   * Get all active signals
   */
  public getAllActiveSignals(): Map<string, AdvancedSignal[]> {
    const active = new Map<string, AdvancedSignal[]>();
    
    this.signalHistory.forEach((signals, symbol) => {
      const activeSignals = signals.filter(s => 
        Date.now() - s.timestamp < s.timeframe
      );
      
      if (activeSignals.length > 0) {
        active.set(symbol, activeSignals);
      }
    });

    return active;
  }

  /**
   * Update detector configuration
   */
  public updateDetectorConfig(type: SignalType, config: Partial<DetectorConfig>): void {
    const detector = this.detectors.get(type);
    if (detector) {
      detector.updateConfig(config);
    }
  }

  /**
   * Update integration configuration
   */
  public updateConfig(config: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.detectorConfig) {
      this.orchestrator.updateConfig(config.detectorConfig);
    }
  }

  /**
   * Get metrics and statistics
   */
  public getMetrics(): any {
    const activeSignals = this.getAllActiveSignals();
    const totalSignals = Array.from(activeSignals.values())
      .reduce((sum, signals) => sum + signals.length, 0);

    return {
      totalSymbolsTracked: activeSignals.size,
      totalActiveSignals: totalSignals,
      detectorCount: this.detectors.size,
      isStreaming: !!this.streamingInterval,
      signalDistribution: this.calculateSignalDistribution(activeSignals),
      topSymbols: this.getTopSymbols(activeSignals, 10)
    };
  }

  // Private helper methods

  private filterSignals(signals: AdvancedSignal[]): AdvancedSignal[] {
    return signals.filter(signal => {
      // Basic strength and confidence filtering
      if (signal.strength < this.config.minSignalStrength) return false;
      if (signal.confidence < this.config.minConfidence) return false;
      
      // Required signals filtering
      if (this.config.requiredSignals && 
          !this.config.requiredSignals.includes(signal.type)) {
        return false;
      }

      return true;
    });
  }

  private extractSymbol(text: string, signals: AdvancedSignal[]): string {
    // First try to extract from signals
    for (const signal of signals) {
      if (signal.metadata?.symbol) {
        return signal.metadata.symbol;
      }
    }

    // Fallback to text extraction
    const extracted = this.sentimentAnalyzer.analyzeSentiment(text);
    if (extracted.symbols && extracted.symbols.length > 0) {
      return extracted.symbols[0].symbol;
    }

    return '';
  }

  private aggregateSignals(
    signals: AdvancedSignal[], 
    symbol: string,
    baseSentiment: SentimentScore
  ): AggregatedSignal {
    const method = this.config.aggregationMethod;
    
    switch (method) {
      case 'weighted':
        return this.weightedAggregation(signals, symbol, baseSentiment);
      case 'consensus':
        return this.consensusAggregation(signals, symbol, baseSentiment);
      case 'highest':
        return this.highestAggregation(signals, symbol, baseSentiment);
      case 'custom':
        if (this.config.customAggregator) {
          return this.config.customAggregator(signals);
        }
        // Fallback to weighted
        return this.weightedAggregation(signals, symbol, baseSentiment);
      default:
        return this.weightedAggregation(signals, symbol, baseSentiment);
    }
  }

  private weightedAggregation(
    signals: AdvancedSignal[], 
    symbol: string,
    baseSentiment: SentimentScore
  ): AggregatedSignal {
    let totalWeight = 0;
    let weightedStrength = 0;
    let weightedConfidence = 0;
    let bullishScore = 0;
    let bearishScore = 0;

    // Group signals by type for combination checking
    const signalMap = new Map<SignalType, AdvancedSignal>();
    signals.forEach(signal => signalMap.set(signal.type, signal));

    // Calculate weighted scores
    signals.forEach(signal => {
      const weight = SIGNAL_WEIGHTS[signal.type] || 1.0;
      totalWeight += weight;
      weightedStrength += signal.strength * weight;
      weightedConfidence += signal.confidence * weight;

      // Sentiment direction
      if (signal.direction === 'bullish') {
        bullishScore += signal.strength * weight;
      } else if (signal.direction === 'bearish') {
        bearishScore += signal.strength * weight;
      }
    });

    // Check for signal combinations
    const activeCombinations: string[] = [];
    let combinationBonus = 0;

    SIGNAL_COMBINATIONS.forEach(combo => {
      if (combo.condition(signalMap)) {
        activeCombinations.push(combo.signals.join('+'));
        combinationBonus += combo.weight;
      }
    });

    // Apply combination bonus
    if (combinationBonus > 0) {
      totalWeight += combinationBonus;
      weightedStrength += combinationBonus * 0.8; // 80% strength bonus
      weightedConfidence += combinationBonus * 0.9; // 90% confidence bonus
    }

    // Normalize
    const overallStrength = totalWeight > 0 ? weightedStrength / totalWeight : 0;
    const overallConfidence = totalWeight > 0 ? weightedConfidence / totalWeight : 0;

    // Determine sentiment
    let sentiment: 'bullish' | 'bearish' | 'neutral';
    if (bullishScore > bearishScore * 1.2) {
      sentiment = 'bullish';
    } else if (bearishScore > bullishScore * 1.2) {
      sentiment = 'bearish';
    } else {
      sentiment = 'neutral';
    }

    // Find dominant signal
    const dominantSignal = signals.reduce((prev, current) => 
      current.strength > prev.strength ? current : prev
    ).type;

    // Determine priority
    let priority: 'low' | 'medium' | 'high' | 'critical';
    if (overallStrength >= 0.8 && overallConfidence >= 0.8) {
      priority = 'critical';
    } else if (overallStrength >= 0.6 || overallConfidence >= 0.7) {
      priority = 'high';
    } else if (overallStrength >= 0.4 || overallConfidence >= 0.5) {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    // Calculate metadata
    const avgTimeframe = signals.reduce((sum, s) => sum + s.timeframe, 0) / signals.length;
    const consensusLevel = this.calculateConsensus(signals);
    const riskScore = this.calculateRiskScore(signals, baseSentiment);

    return {
      symbol,
      overallStrength,
      overallConfidence,
      sentiment,
      signals,
      dominantSignal,
      combinations: activeCombinations,
      priority,
      metadata: {
        signalCount: signals.length,
        avgTimeframe,
        consensusLevel,
        riskScore
      }
    };
  }

  private consensusAggregation(
    signals: AdvancedSignal[], 
    symbol: string,
    baseSentiment: SentimentScore
  ): AggregatedSignal {
    // Group by direction
    const bullish = signals.filter(s => s.direction === 'bullish');
    const bearish = signals.filter(s => s.direction === 'bearish');
    const neutral = signals.filter(s => s.direction === 'neutral');

    // Determine consensus
    let sentiment: 'bullish' | 'bearish' | 'neutral';
    if (bullish.length > bearish.length + neutral.length) {
      sentiment = 'bullish';
    } else if (bearish.length > bullish.length + neutral.length) {
      sentiment = 'bearish';
    } else {
      sentiment = 'neutral';
    }

    // Average metrics
    const overallStrength = signals.reduce((sum, s) => sum + s.strength, 0) / signals.length;
    const overallConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;

    // Find dominant signal type
    const signalCounts = new Map<SignalType, number>();
    signals.forEach(s => {
      signalCounts.set(s.type, (signalCounts.get(s.type) || 0) + 1);
    });

    const dominantSignal = Array.from(signalCounts.entries())
      .sort((a, b) => b[1] - a[1])[0][0];

    return {
      symbol,
      overallStrength,
      overallConfidence,
      sentiment,
      signals,
      dominantSignal,
      combinations: [],
      priority: this.calculatePriority(overallStrength, overallConfidence),
      metadata: {
        signalCount: signals.length,
        avgTimeframe: signals.reduce((sum, s) => sum + s.timeframe, 0) / signals.length,
        consensusLevel: this.calculateConsensus(signals),
        riskScore: this.calculateRiskScore(signals, baseSentiment)
      }
    };
  }

  private highestAggregation(
    signals: AdvancedSignal[], 
    symbol: string,
    baseSentiment: SentimentScore
  ): AggregatedSignal {
    // Sort by strength
    const sorted = [...signals].sort((a, b) => b.strength - a.strength);
    const highest = sorted[0];

    return {
      symbol,
      overallStrength: highest.strength,
      overallConfidence: highest.confidence,
      sentiment: highest.direction,
      signals,
      dominantSignal: highest.type,
      combinations: [],
      priority: this.calculatePriority(highest.strength, highest.confidence),
      metadata: {
        signalCount: signals.length,
        avgTimeframe: highest.timeframe,
        consensusLevel: this.calculateConsensus(signals),
        riskScore: this.calculateRiskScore(signals, baseSentiment)
      }
    };
  }

  private calculateConsensus(signals: AdvancedSignal[]): number {
    if (signals.length <= 1) return 1.0;

    const directions = signals.map(s => s.direction);
    const counts = new Map<string, number>();
    
    directions.forEach(d => {
      counts.set(d, (counts.get(d) || 0) + 1);
    });

    const maxCount = Math.max(...counts.values());
    return maxCount / signals.length;
  }

  private calculateRiskScore(signals: AdvancedSignal[], baseSentiment: SentimentScore): number {
    let riskScore = 0;
    
    // High volatility signals increase risk
    const volatileSignals = ['urgency', 'fomo', 'panic', 'euphoria'];
    const volatileCount = signals.filter(s => volatileSignals.includes(s.type)).length;
    riskScore += (volatileCount / signals.length) * 0.3;

    // Low consensus increases risk
    const consensus = this.calculateConsensus(signals);
    riskScore += (1 - consensus) * 0.3;

    // Extreme sentiment increases risk
    if (Math.abs(baseSentiment.score) > 0.8) {
      riskScore += 0.2;
    }

    // Multiple warning signals increase risk
    const warningSignals = ['sentiment_exhaustion', 'capitulation', 'despair'];
    const warningCount = signals.filter(s => warningSignals.includes(s.type)).length;
    riskScore += (warningCount / signals.length) * 0.2;

    return Math.min(riskScore, 1.0);
  }

  private calculatePriority(strength: number, confidence: number): 'low' | 'medium' | 'high' | 'critical' {
    const score = (strength + confidence) / 2;
    
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  private updateSignalHistory(symbol: string, signals: AdvancedSignal[]): void {
    const history = this.signalHistory.get(symbol) || [];
    
    // Add new signals
    history.push(...signals);
    
    // Remove expired signals
    const now = Date.now();
    const active = history.filter(s => now - s.timestamp < s.timeframe);
    
    // Keep last 100 signals per symbol
    const kept = active.slice(-100);
    
    this.signalHistory.set(symbol, kept);
  }

  private checkAlerts(aggregated: AggregatedSignal): Alert[] {
    const alerts: Alert[] = [];
    const { alertThresholds } = this.config;

    // Critical strength alert
    if (aggregated.overallStrength >= alertThresholds.criticalStrength) {
      alerts.push({
        level: 'critical',
        type: 'high_strength',
        message: `Critical signal strength detected for ${aggregated.symbol}`,
        data: {
          symbol: aggregated.symbol,
          strength: aggregated.overallStrength,
          signals: aggregated.signals.map(s => s.type)
        },
        timestamp: Date.now()
      });
    }

    // Critical confidence alert
    if (aggregated.overallConfidence >= alertThresholds.criticalConfidence) {
      alerts.push({
        level: 'critical',
        type: 'high_confidence',
        message: `High confidence signal for ${aggregated.symbol}`,
        data: {
          symbol: aggregated.symbol,
          confidence: aggregated.overallConfidence,
          sentiment: aggregated.sentiment
        },
        timestamp: Date.now()
      });
    }

    // Signal combination alert
    if (aggregated.combinations.length > 0 && 
        aggregated.overallStrength >= alertThresholds.combinationThreshold) {
      alerts.push({
        level: 'warning',
        type: 'signal_combination',
        message: `Multiple correlated signals detected for ${aggregated.symbol}`,
        data: {
          symbol: aggregated.symbol,
          combinations: aggregated.combinations,
          signalCount: aggregated.signals.length
        },
        timestamp: Date.now()
      });
    }

    // High risk alert
    if (aggregated.metadata.riskScore > 0.7) {
      alerts.push({
        level: 'warning',
        type: 'high_risk',
        message: `High risk conditions detected for ${aggregated.symbol}`,
        data: {
          symbol: aggregated.symbol,
          riskScore: aggregated.metadata.riskScore,
          priority: aggregated.priority
        },
        timestamp: Date.now()
      });
    }

    return alerts;
  }

  private async sendToTradingPipeline(
    aggregated: AggregatedSignal, 
    baseSentiment: SentimentScore
  ): Promise<void> {
    if (!signalPipeline.isActive()) {
      console.warn('Trading pipeline is not active');
      return;
    }

    try {
      // Convert to sentiment score format expected by pipeline
      const sentimentScore: SentimentScore = {
        score: aggregated.sentiment === 'bullish' ? aggregated.overallStrength : 
               aggregated.sentiment === 'bearish' ? -aggregated.overallStrength : 0,
        magnitude: aggregated.overallStrength,
        classification: this.mapSentimentClassification(aggregated),
        confidence: aggregated.overallConfidence,
        keywords: this.extractKeywords(aggregated),
        symbols: baseSentiment.symbols
      };

      // Create market data placeholder (would come from real market feed)
      const marketData: MarketData = {
        symbol: aggregated.symbol,
        timestamp: Date.now(),
        price: 0, // Would be filled by market data feed
        volume: 0,
        bid: 0,
        ask: 0,
        high24h: 0,
        low24h: 0,
        change24h: 0
      };

      // Create cross-platform signal
      const crossPlatformSignal: CrossPlatformSignal = {
        id: `adv_${Date.now()}_${aggregated.symbol}`,
        timestamp: Date.now(),
        symbol: aggregated.symbol,
        platforms: this.extractPlatforms(aggregated),
        aggregatedSentiment: sentimentScore,
        momentum: {
          velocity: aggregated.metadata.consensusLevel,
          acceleration: 0, // Would be calculated from history
          direction: aggregated.sentiment
        },
        confidence: aggregated.overallConfidence,
        metadata: {
          signalTypes: aggregated.signals.map(s => s.type),
          combinations: aggregated.combinations,
          priority: aggregated.priority,
          riskScore: aggregated.metadata.riskScore
        }
      };

      // Queue for processing
      signalPipeline.queueSentiment(sentimentScore, marketData, crossPlatformSignal);

      await activityLoggerKV.log({
        type: 'signal_queued',
        platform: 'system',
        source: 'advanced_signals',
        message: `Advanced signal queued for ${aggregated.symbol}`,
        data: {
          symbol: aggregated.symbol,
          sentiment: aggregated.sentiment,
          strength: aggregated.overallStrength,
          confidence: aggregated.overallConfidence,
          signalCount: aggregated.signals.length
        }
      });

    } catch (error) {
      console.error('Failed to send to trading pipeline:', error);
    }
  }

  private mapSentimentClassification(aggregated: AggregatedSignal): SentimentScore['classification'] {
    if (aggregated.sentiment === 'bullish') {
      return aggregated.overallStrength > 0.7 ? 'very_positive' : 'positive';
    } else if (aggregated.sentiment === 'bearish') {
      return aggregated.overallStrength > 0.7 ? 'very_negative' : 'negative';
    }
    return 'neutral';
  }

  private extractKeywords(aggregated: AggregatedSignal): string[] {
    const keywords: Set<string> = new Set();
    
    // Add signal types as keywords
    aggregated.signals.forEach(signal => {
      keywords.add(signal.type.replace('_', ' '));
      
      // Add any keywords from signal metadata
      if (signal.metadata?.keywords) {
        signal.metadata.keywords.forEach((kw: string) => keywords.add(kw));
      }
    });

    // Add sentiment and priority
    keywords.add(aggregated.sentiment);
    keywords.add(aggregated.priority);

    return Array.from(keywords);
  }

  private extractPlatforms(aggregated: AggregatedSignal): string[] {
    const platforms: Set<string> = new Set();
    
    aggregated.signals.forEach(signal => {
      if (signal.metadata?.platform) {
        platforms.add(signal.metadata.platform);
      }
    });

    return platforms.size > 0 ? Array.from(platforms) : ['advanced_analysis'];
  }

  private async processStreamingUpdate(): Promise<StreamingUpdate[]> {
    const updates: StreamingUpdate[] = [];
    const activeSignals = this.getAllActiveSignals();

    for (const [symbol, signals] of activeSignals) {
      // Check for new signals in the last streaming interval
      const recentSignals = signals.filter(s => 
        Date.now() - s.timestamp < this.config.streamingInterval!
      );

      if (recentSignals.length > 0) {
        const baseSentiment = this.sentimentAnalyzer.analyzeSentiment(symbol);
        const aggregated = this.aggregateSignals(signals, symbol, baseSentiment);
        const alerts = this.checkAlerts(aggregated);

        updates.push({
          timestamp: Date.now(),
          symbol,
          newSignals: recentSignals,
          aggregatedSignal: aggregated,
          alerts
        });
      }
    }

    return updates;
  }

  private calculateSignalDistribution(activeSignals: Map<string, AdvancedSignal[]>): Record<SignalType, number> {
    const distribution: Record<string, number> = {};
    
    activeSignals.forEach(signals => {
      signals.forEach(signal => {
        distribution[signal.type] = (distribution[signal.type] || 0) + 1;
      });
    });

    return distribution as Record<SignalType, number>;
  }

  private getTopSymbols(activeSignals: Map<string, AdvancedSignal[]>, limit: number): Array<{symbol: string, signalCount: number, avgStrength: number}> {
    const symbolStats = Array.from(activeSignals.entries()).map(([symbol, signals]) => {
      const avgStrength = signals.reduce((sum, s) => sum + s.strength, 0) / signals.length;
      return {
        symbol,
        signalCount: signals.length,
        avgStrength
      };
    });

    return symbolStats
      .sort((a, b) => b.avgStrength - a.avgStrength)
      .slice(0, limit);
  }
}

// Export singleton instance
export const advancedSignals = new AdvancedSignalsIntegration();

// Export types for external use
export type { 
  IntegrationConfig, 
  AggregatedSignal, 
  StreamingUpdate, 
  Alert 
};