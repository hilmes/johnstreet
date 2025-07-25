import {
  ISignalOrchestrator,
  ISignalDetector,
  SignalType,
  SignalDetectorConfig,
  DetectorConfig,
  TextInput,
  BatchTextInput,
  SignalAnalysisResult,
  AdvancedSignal
} from './types';

/**
 * Orchestrates multiple signal detectors to provide comprehensive sentiment analysis
 */
export class SignalOrchestrator implements ISignalOrchestrator {
  private detectors: Map<SignalType, ISignalDetector> = new Map();
  private config: SignalDetectorConfig;

  constructor(config?: Partial<SignalDetectorConfig>) {
    this.config = this.createDefaultConfig();
    
    if (config) {
      this.mergeConfig(config);
    }
  }

  /**
   * Register a signal detector
   */
  public registerDetector(detector: ISignalDetector): void {
    this.detectors.set(detector.type, detector);
    
    // Apply orchestrator config to detector
    if (this.config[detector.type]) {
      detector.updateConfig(this.config[detector.type]);
    }
  }

  /**
   * Unregister a signal detector
   */
  public unregisterDetector(type: SignalType): void {
    this.detectors.delete(type);
  }

  /**
   * Analyze a single text input
   */
  public async analyze(input: TextInput): Promise<SignalAnalysisResult> {
    const startTime = Date.now();
    const activeDetectors = this.getActiveDetectorInstances();
    
    if (activeDetectors.length === 0) {
      return this.createEmptyResult(startTime);
    }

    // Run all detectors in parallel
    const detectionPromises = activeDetectors.map(detector => 
      detector.detect(input)
    );

    const detectionResults = await Promise.all(detectionPromises);
    const signals = detectionResults.filter((signal): signal is AdvancedSignal => 
      signal !== null
    );

    return this.createAnalysisResult(signals, startTime);
  }

  /**
   * Analyze batch of text inputs
   */
  public async analyzeBatch(input: BatchTextInput): Promise<SignalAnalysisResult> {
    const startTime = Date.now();
    const { texts, aggregationMethod = 'weighted' } = input;

    if (texts.length === 0) {
      return this.createEmptyResult(startTime);
    }

    // Analyze each text
    const analysisPromises = texts.map(textInput => this.analyze(textInput));
    const results = await Promise.all(analysisPromises);

    // Aggregate results based on method
    return this.aggregateResults(results, aggregationMethod, startTime);
  }

  /**
   * Update configuration for a specific detector
   */
  public updateDetectorConfig(type: SignalType, config: Partial<DetectorConfig>): void {
    this.config[type] = { ...this.config[type], ...config };
    
    const detector = this.detectors.get(type);
    if (detector) {
      detector.updateConfig(this.config[type]);
    }
  }

  /**
   * Get list of active detector types
   */
  public getActiveDetectors(): SignalType[] {
    return Array.from(this.detectors.keys()).filter(type => 
      this.config[type].enabled
    );
  }

  /**
   * Get current configuration
   */
  public getConfig(): SignalDetectorConfig {
    return { ...this.config };
  }

  /**
   * Get detector statistics
   */
  public getDetectorStats(): Record<SignalType, {
    registered: boolean;
    enabled: boolean;
    config: DetectorConfig;
  }> {
    const stats: any = {};
    
    for (const type of Object.values(SignalType)) {
      stats[type] = {
        registered: this.detectors.has(type),
        enabled: this.config[type].enabled,
        config: this.config[type]
      };
    }

    return stats;
  }

  /**
   * Create default configuration for all detectors
   */
  private createDefaultConfig(): SignalDetectorConfig {
    const defaultDetectorConfig: DetectorConfig = {
      enabled: true,
      sensitivity: 0.5,
      minConfidence: 0.3
    };

    const config = {} as SignalDetectorConfig;
    
    for (const type of Object.values(SignalType)) {
      config[type] = { ...defaultDetectorConfig };
    }

    return config;
  }

  /**
   * Merge partial config with existing config
   */
  private mergeConfig(partialConfig: Partial<SignalDetectorConfig>): void {
    for (const [type, config] of Object.entries(partialConfig)) {
      if (this.config[type as SignalType]) {
        this.config[type as SignalType] = {
          ...this.config[type as SignalType],
          ...config
        };
      }
    }
  }

  /**
   * Get active detector instances
   */
  private getActiveDetectorInstances(): ISignalDetector[] {
    return Array.from(this.detectors.entries())
      .filter(([type, _]) => this.config[type].enabled)
      .map(([_, detector]) => detector);
  }

  /**
   * Create analysis result from signals
   */
  private createAnalysisResult(
    signals: AdvancedSignal[], 
    startTime: number
  ): SignalAnalysisResult {
    const aggregation = this.aggregateSignals(signals);
    
    return {
      signals,
      aggregateScore: aggregation.score,
      dominantSignal: aggregation.dominant,
      signalDistribution: aggregation.distribution,
      timestamp: new Date(),
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Create empty result when no detectors are active
   */
  private createEmptyResult(startTime: number): SignalAnalysisResult {
    return {
      signals: [],
      aggregateScore: 0,
      dominantSignal: null,
      signalDistribution: this.createEmptyDistribution(),
      timestamp: new Date(),
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Aggregate multiple signals into a summary
   */
  private aggregateSignals(signals: AdvancedSignal[]): {
    score: number;
    dominant: SignalType | null;
    distribution: Record<SignalType, number>;
  } {
    if (signals.length === 0) {
      return {
        score: 0,
        dominant: null,
        distribution: this.createEmptyDistribution()
      };
    }

    const distribution = this.createEmptyDistribution();
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let maxStrength = 0;
    let dominantType: SignalType | null = null;

    for (const signal of signals) {
      const weight = signal.metadata.confidence;
      distribution[signal.type] = signal.strength;
      totalWeightedScore += signal.strength * weight;
      totalWeight += weight;

      if (Math.abs(signal.strength) > maxStrength) {
        maxStrength = Math.abs(signal.strength);
        dominantType = signal.type;
      }
    }

    const aggregateScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

    return {
      score: Math.max(-1, Math.min(1, aggregateScore)),
      dominant: dominantType,
      distribution
    };
  }

  /**
   * Aggregate multiple analysis results
   */
  private aggregateResults(
    results: SignalAnalysisResult[],
    method: 'average' | 'weighted' | 'max',
    startTime: number
  ): SignalAnalysisResult {
    if (results.length === 0) {
      return this.createEmptyResult(startTime);
    }

    const allSignals: AdvancedSignal[] = [];
    const distribution = this.createEmptyDistribution();
    let aggregateScore = 0;

    for (const result of results) {
      allSignals.push(...result.signals);
    }

    switch (method) {
      case 'average':
        aggregateScore = results.reduce((sum, r) => sum + r.aggregateScore, 0) / results.length;
        break;
        
      case 'weighted':
        const totalSignals = results.reduce((sum, r) => sum + r.signals.length, 0);
        aggregateScore = results.reduce((sum, r) => 
          sum + (r.aggregateScore * r.signals.length / totalSignals), 0
        );
        break;
        
      case 'max':
        aggregateScore = Math.max(...results.map(r => Math.abs(r.aggregateScore))) *
          (results.find(r => Math.abs(r.aggregateScore) === Math.max(...results.map(r => Math.abs(r.aggregateScore))))?.aggregateScore || 0 >= 0 ? 1 : -1);
        break;
    }

    // Aggregate distribution
    for (const result of results) {
      for (const [type, score] of Object.entries(result.signalDistribution)) {
        distribution[type as SignalType] = 
          (distribution[type as SignalType] + score) / 2;
      }
    }

    // Find dominant signal
    let dominantSignal: SignalType | null = null;
    let maxScore = 0;
    for (const [type, score] of Object.entries(distribution)) {
      if (Math.abs(score) > maxScore) {
        maxScore = Math.abs(score);
        dominantSignal = type as SignalType;
      }
    }

    return {
      signals: allSignals,
      aggregateScore: Math.max(-1, Math.min(1, aggregateScore)),
      dominantSignal,
      signalDistribution: distribution,
      timestamp: new Date(),
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Create empty distribution object
   */
  private createEmptyDistribution(): Record<SignalType, number> {
    const distribution: any = {};
    
    for (const type of Object.values(SignalType)) {
      distribution[type] = 0;
    }

    return distribution;
  }
}