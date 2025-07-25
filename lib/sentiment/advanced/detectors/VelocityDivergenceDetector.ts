import { EventEmitter } from 'events';

interface PriceData {
  timestamp: number;
  price: number;
  volume: number;
}

interface SentimentData {
  timestamp: number;
  score: number;
  volume: number;
  sources: number;
}

interface VelocityMetrics {
  value: number;
  velocity: number;
  acceleration: number;
  jerk?: number; // Rate of change of acceleration
}

interface DivergenceSignal {
  timestamp: number;
  type: 'bullish' | 'bearish' | 'accumulation' | 'distribution';
  strength: number;
  sentimentVelocity: VelocityMetrics;
  priceVelocity: VelocityMetrics;
  divergenceScore: number;
  confidence: number;
  metadata: {
    quietAccumulation: boolean;
    velocityRatio: number;
    accelerationDivergence: number;
    historicalContext: string;
  };
}

interface VelocityHistoryEntry {
  timestamp: number;
  sentiment: VelocityMetrics;
  price: VelocityMetrics;
  divergence: number;
}

export class VelocityDivergenceDetector extends EventEmitter {
  private sentimentHistory: SentimentData[] = [];
  private priceHistory: PriceData[] = [];
  private velocityHistory: VelocityHistoryEntry[] = [];
  
  // Configuration
  private readonly config = {
    windowSize: 20,
    smoothingFactor: 0.2,
    divergenceThreshold: 0.3,
    accelerationWeight: 0.4,
    velocityWeight: 0.6,
    quietAccumulationThreshold: 0.15,
    minConfidence: 0.6,
    historicalLookback: 100
  };

  // State tracking
  private lastSentimentVelocity: VelocityMetrics | null = null;
  private lastPriceVelocity: VelocityMetrics | null = null;

  constructor(customConfig?: Partial<typeof VelocityDivergenceDetector.prototype.config>) {
    super();
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
  }

  /**
   * Update sentiment data and check for divergences
   */
  public updateSentiment(data: SentimentData): void {
    this.sentimentHistory.push(data);
    this.maintainHistoryWindow(this.sentimentHistory);
    
    if (this.sentimentHistory.length >= this.config.windowSize) {
      this.checkForDivergence();
    }
  }

  /**
   * Update price data
   */
  public updatePrice(data: PriceData): void {
    this.priceHistory.push(data);
    this.maintainHistoryWindow(this.priceHistory);
  }

  /**
   * Calculate velocity metrics for a time series
   */
  private calculateVelocityMetrics(
    data: Array<{ timestamp: number; value: number }>,
    smoothing: boolean = true
  ): VelocityMetrics | null {
    if (data.length < 3) return null;

    const values = data.map(d => d.value);
    const timestamps = data.map(d => d.timestamp);
    
    // Apply exponential smoothing if requested
    const smoothedValues = smoothing ? this.exponentialSmoothing(values) : values;
    
    // Calculate first derivative (velocity)
    const velocities: number[] = [];
    for (let i = 1; i < smoothedValues.length; i++) {
      const dt = (timestamps[i] - timestamps[i - 1]) / 1000; // Convert to seconds
      const dv = smoothedValues[i] - smoothedValues[i - 1];
      velocities.push(dv / dt);
    }
    
    // Calculate second derivative (acceleration)
    const accelerations: number[] = [];
    for (let i = 1; i < velocities.length; i++) {
      const dt = (timestamps[i + 1] - timestamps[i]) / 1000;
      const da = velocities[i] - velocities[i - 1];
      accelerations.push(da / dt);
    }
    
    // Calculate third derivative (jerk) for advanced analysis
    let jerk: number | undefined;
    if (accelerations.length >= 2) {
      const dt = (timestamps[timestamps.length - 1] - timestamps[timestamps.length - 2]) / 1000;
      const dj = accelerations[accelerations.length - 1] - accelerations[accelerations.length - 2];
      jerk = dj / dt;
    }
    
    return {
      value: smoothedValues[smoothedValues.length - 1],
      velocity: velocities[velocities.length - 1],
      acceleration: accelerations[accelerations.length - 1],
      jerk
    };
  }

  /**
   * Apply exponential smoothing to reduce noise
   */
  private exponentialSmoothing(values: number[]): number[] {
    const smoothed: number[] = [values[0]];
    const alpha = this.config.smoothingFactor;
    
    for (let i = 1; i < values.length; i++) {
      smoothed.push(alpha * values[i] + (1 - alpha) * smoothed[i - 1]);
    }
    
    return smoothed;
  }

  /**
   * Check for velocity divergence between sentiment and price
   */
  private checkForDivergence(): void {
    // Prepare data for velocity calculation
    const sentimentData = this.sentimentHistory.map(s => ({
      timestamp: s.timestamp,
      value: s.score
    }));
    
    const priceData = this.priceHistory.map(p => ({
      timestamp: p.timestamp,
      value: p.price
    }));
    
    // Calculate current velocity metrics
    const sentimentVelocity = this.calculateVelocityMetrics(sentimentData);
    const priceVelocity = this.calculateVelocityMetrics(priceData);
    
    if (!sentimentVelocity || !priceVelocity) return;
    
    // Store current velocities
    this.lastSentimentVelocity = sentimentVelocity;
    this.lastPriceVelocity = priceVelocity;
    
    // Calculate divergence score
    const divergenceScore = this.calculateDivergenceScore(sentimentVelocity, priceVelocity);
    
    // Store in history
    this.velocityHistory.push({
      timestamp: Date.now(),
      sentiment: sentimentVelocity,
      price: priceVelocity,
      divergence: divergenceScore
    });
    this.maintainHistoryWindow(this.velocityHistory, this.config.historicalLookback);
    
    // Check if divergence is significant
    if (Math.abs(divergenceScore) > this.config.divergenceThreshold) {
      const signal = this.generateDivergenceSignal(
        sentimentVelocity,
        priceVelocity,
        divergenceScore
      );
      
      if (signal.confidence >= this.config.minConfidence) {
        this.emit('divergence', signal);
      }
    }
  }

  /**
   * Calculate divergence score between sentiment and price velocities
   */
  private calculateDivergenceScore(
    sentimentVelocity: VelocityMetrics,
    priceVelocity: VelocityMetrics
  ): number {
    // Normalize velocities to compare them
    const sentimentNorm = this.normalizeVelocity(sentimentVelocity);
    const priceNorm = this.normalizeVelocity(priceVelocity);
    
    // Calculate weighted divergence
    const velocityDivergence = (sentimentNorm.velocity - priceNorm.velocity) * this.config.velocityWeight;
    const accelerationDivergence = (sentimentNorm.acceleration - priceNorm.acceleration) * this.config.accelerationWeight;
    
    return velocityDivergence + accelerationDivergence;
  }

  /**
   * Normalize velocity metrics for comparison
   */
  private normalizeVelocity(metrics: VelocityMetrics): VelocityMetrics {
    const recentHistory = this.velocityHistory.slice(-20);
    if (recentHistory.length === 0) return metrics;
    
    // Calculate normalization factors
    const velocities = recentHistory.map(h => Math.abs(h.sentiment.velocity));
    const accelerations = recentHistory.map(h => Math.abs(h.sentiment.acceleration));
    
    const maxVelocity = Math.max(...velocities, 0.001);
    const maxAcceleration = Math.max(...accelerations, 0.001);
    
    return {
      value: metrics.value,
      velocity: metrics.velocity / maxVelocity,
      acceleration: metrics.acceleration / maxAcceleration,
      jerk: metrics.jerk
    };
  }

  /**
   * Generate a divergence signal with analysis
   */
  private generateDivergenceSignal(
    sentimentVelocity: VelocityMetrics,
    priceVelocity: VelocityMetrics,
    divergenceScore: number
  ): DivergenceSignal {
    const type = this.classifyDivergence(sentimentVelocity, priceVelocity, divergenceScore);
    const confidence = this.calculateConfidence(sentimentVelocity, priceVelocity, divergenceScore);
    const quietAccumulation = this.detectQuietAccumulation(sentimentVelocity, priceVelocity);
    
    return {
      timestamp: Date.now(),
      type,
      strength: Math.abs(divergenceScore),
      sentimentVelocity,
      priceVelocity,
      divergenceScore,
      confidence,
      metadata: {
        quietAccumulation,
        velocityRatio: sentimentVelocity.velocity / (priceVelocity.velocity || 0.001),
        accelerationDivergence: sentimentVelocity.acceleration - priceVelocity.acceleration,
        historicalContext: this.getHistoricalContext(divergenceScore)
      }
    };
  }

  /**
   * Classify the type of divergence
   */
  private classifyDivergence(
    sentimentVelocity: VelocityMetrics,
    priceVelocity: VelocityMetrics,
    divergenceScore: number
  ): DivergenceSignal['type'] {
    const sentPosVel = sentimentVelocity.velocity > 0;
    const pricePosVel = priceVelocity.velocity > 0;
    const sentPosAcc = sentimentVelocity.acceleration > 0;
    
    // Bullish divergence: sentiment velocity > price velocity
    if (divergenceScore > 0 && sentPosVel && !pricePosVel) {
      return 'bullish';
    }
    
    // Bearish divergence: sentiment velocity < price velocity
    if (divergenceScore < 0 && !sentPosVel && pricePosVel) {
      return 'bearish';
    }
    
    // Accumulation: positive sentiment acceleration with stable/declining price
    if (sentPosAcc && Math.abs(priceVelocity.velocity) < this.config.quietAccumulationThreshold) {
      return 'accumulation';
    }
    
    // Distribution: negative sentiment acceleration with stable/rising price
    if (!sentPosAcc && Math.abs(priceVelocity.velocity) < this.config.quietAccumulationThreshold) {
      return 'distribution';
    }
    
    // Default based on divergence direction
    return divergenceScore > 0 ? 'bullish' : 'bearish';
  }

  /**
   * Detect quiet accumulation patterns
   */
  private detectQuietAccumulation(
    sentimentVelocity: VelocityMetrics,
    priceVelocity: VelocityMetrics
  ): boolean {
    // Quiet accumulation characteristics:
    // 1. Low price velocity (sideways movement)
    // 2. Positive sentiment acceleration
    // 3. Increasing sentiment velocity
    // 4. Low volume volatility
    
    const lowPriceMovement = Math.abs(priceVelocity.velocity) < this.config.quietAccumulationThreshold;
    const positiveSentimentAccel = sentimentVelocity.acceleration > 0;
    const increasingSentiment = sentimentVelocity.velocity > 0;
    
    // Check volume patterns
    const recentVolumes = this.priceHistory.slice(-10).map(p => p.volume);
    const volumeStdDev = this.calculateStandardDeviation(recentVolumes);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const lowVolumeVolatility = volumeStdDev / avgVolume < 0.3;
    
    return lowPriceMovement && positiveSentimentAccel && increasingSentiment && lowVolumeVolatility;
  }

  /**
   * Calculate confidence in the divergence signal
   */
  private calculateConfidence(
    sentimentVelocity: VelocityMetrics,
    priceVelocity: VelocityMetrics,
    divergenceScore: number
  ): number {
    let confidence = 0;
    
    // Strong divergence score
    if (Math.abs(divergenceScore) > this.config.divergenceThreshold * 2) {
      confidence += 0.3;
    } else if (Math.abs(divergenceScore) > this.config.divergenceThreshold) {
      confidence += 0.2;
    }
    
    // Consistent direction in derivatives
    const consistentDirection = 
      Math.sign(sentimentVelocity.velocity) === Math.sign(sentimentVelocity.acceleration);
    if (consistentDirection) confidence += 0.2;
    
    // Historical precedence
    const historicalStrength = this.getHistoricalDivergenceStrength();
    confidence += historicalStrength * 0.2;
    
    // Jerk analysis (if available)
    if (sentimentVelocity.jerk !== undefined && priceVelocity.jerk !== undefined) {
      const jerkDivergence = Math.abs(sentimentVelocity.jerk - priceVelocity.jerk);
      if (jerkDivergence > 0.1) confidence += 0.1;
    }
    
    // Volume confirmation
    const volumeConfirms = this.checkVolumeConfirmation();
    if (volumeConfirms) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Get historical context for the current divergence
   */
  private getHistoricalContext(currentDivergence: number): string {
    const historicalDivergences = this.velocityHistory.map(h => h.divergence);
    if (historicalDivergences.length < 10) return 'Insufficient history';
    
    const percentile = this.calculatePercentile(historicalDivergences, currentDivergence);
    
    if (percentile > 95) return 'Extreme high divergence (top 5%)';
    if (percentile > 90) return 'Very high divergence (top 10%)';
    if (percentile > 75) return 'High divergence (top 25%)';
    if (percentile < 5) return 'Extreme low divergence (bottom 5%)';
    if (percentile < 10) return 'Very low divergence (bottom 10%)';
    if (percentile < 25) return 'Low divergence (bottom 25%)';
    
    return 'Moderate divergence';
  }

  /**
   * Get historical divergence strength
   */
  private getHistoricalDivergenceStrength(): number {
    if (this.velocityHistory.length < 5) return 0.5;
    
    const recentDivergences = this.velocityHistory.slice(-5).map(h => h.divergence);
    const avgDivergence = recentDivergences.reduce((a, b) => a + b, 0) / recentDivergences.length;
    
    return Math.min(Math.abs(avgDivergence) / this.config.divergenceThreshold, 1.0);
  }

  /**
   * Check if volume confirms the divergence
   */
  private checkVolumeConfirmation(): boolean {
    if (this.priceHistory.length < 10) return false;
    
    const recentVolumes = this.priceHistory.slice(-5).map(p => p.volume);
    const olderVolumes = this.priceHistory.slice(-10, -5).map(p => p.volume);
    
    const recentAvg = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const olderAvg = olderVolumes.reduce((a, b) => a + b, 0) / olderVolumes.length;
    
    // Volume should increase with divergence
    return recentAvg > olderAvg * 1.1;
  }

  /**
   * Calculate percentile of a value in a dataset
   */
  private calculatePercentile(data: number[], value: number): number {
    const sorted = [...data].sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    
    if (index === -1) return 100;
    if (index === 0) return 0;
    
    return (index / sorted.length) * 100;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Maintain history window size
   */
  private maintainHistoryWindow<T>(array: T[], maxSize?: number): void {
    const limit = maxSize || this.config.windowSize;
    while (array.length > limit) {
      array.shift();
    }
  }

  /**
   * Get current velocity metrics
   */
  public getCurrentMetrics(): {
    sentiment: VelocityMetrics | null;
    price: VelocityMetrics | null;
    divergence: number | null;
  } {
    const latestHistory = this.velocityHistory[this.velocityHistory.length - 1];
    
    return {
      sentiment: this.lastSentimentVelocity,
      price: this.lastPriceVelocity,
      divergence: latestHistory?.divergence || null
    };
  }

  /**
   * Get velocity history for analysis
   */
  public getVelocityHistory(limit?: number): VelocityHistoryEntry[] {
    return limit ? this.velocityHistory.slice(-limit) : [...this.velocityHistory];
  }

  /**
   * Reset the detector
   */
  public reset(): void {
    this.sentimentHistory = [];
    this.priceHistory = [];
    this.velocityHistory = [];
    this.lastSentimentVelocity = null;
    this.lastPriceVelocity = null;
  }
}