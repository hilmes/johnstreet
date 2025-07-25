import { EventEmitter } from 'events';

interface SentimentData {
  timestamp: number;
  score: number; // -1 to 1 (negative = bearish, positive = bullish)
  volume: number; // Number of mentions/posts
  sources: number; // Number of unique sources
  intensity: number; // Average intensity of sentiment
  fudKeywords?: string[]; // FUD-related keywords found
}

interface PriceData {
  timestamp: number;
  price: number;
  volume: number;
  volatility: number; // Price volatility measure
}

interface ExhaustionMetrics {
  sentimentImpactDecay: number; // How much sentiment impact has decayed (0-1)
  fudResistance: number; // Resistance to FUD (0-1, higher = more resistant)
  bearCapitulation: number; // Bear capitulation score (0-1)
  volumeSentimentDivergence: number; // Divergence between volume and sentiment
  sentimentFatigue: number; // Overall fatigue score (0-1)
  consecutiveFudDays: number; // Days of continuous negative sentiment
  diminishingReturns: number; // Diminishing returns on negative sentiment
}

interface ExhaustionSignal {
  timestamp: number;
  type: 'sentiment_exhaustion' | 'fud_resistance' | 'bear_capitulation' | 'divergence';
  strength: number; // 0-1
  metrics: ExhaustionMetrics;
  confidence: number; // 0-1
  metadata: {
    priceResilience: number; // How well price holds despite negative sentiment
    sentimentPersistence: number; // How long sentiment has persisted
    volumeProfile: 'accumulation' | 'distribution' | 'neutral';
    marketPhase: 'early_fud' | 'peak_fear' | 'exhaustion' | 'recovery';
    recommendation: string;
  };
}

interface ImpactHistoryEntry {
  timestamp: number;
  sentimentScore: number;
  priceImpact: number; // Percentage price change
  impactRatio: number; // Impact per unit of sentiment
  fudIntensity: number;
}

export class SentimentExhaustionDetector extends EventEmitter {
  private sentimentHistory: SentimentData[] = [];
  private priceHistory: PriceData[] = [];
  private impactHistory: ImpactHistoryEntry[] = [];
  private fudEpisodes: Array<{
    startTime: number;
    endTime?: number;
    peakIntensity: number;
    totalImpact: number;
    resistance: number;
  }> = [];

  // Configuration
  private readonly config = {
    // Time windows
    shortWindow: 24, // 24 hours
    mediumWindow: 72, // 3 days
    longWindow: 168, // 7 days
    
    // Thresholds
    negativeThreshold: -0.3, // Sentiment score below this is considered negative
    exhaustionThreshold: 0.7, // Exhaustion score above this triggers signal
    fudResistanceThreshold: 0.6, // FUD resistance above this is significant
    divergenceThreshold: 0.5, // Volume-sentiment divergence threshold
    
    // Decay parameters
    impactDecayRate: 0.1, // How fast sentiment impact decays
    fatigueAccumulation: 0.05, // How fast fatigue accumulates
    
    // FUD detection
    fudKeywords: [
      'scam', 'rug', 'dump', 'crash', 'fraud', 'fake', 'ponzi', 'bubble',
      'collapse', 'bankrupt', 'liquidation', 'margin call', 'dead', 'worthless',
      'exit scam', 'pump and dump', 'bear market', 'blood bath', 'capitulation'
    ],
    
    // Analysis parameters
    minDataPoints: 10,
    smoothingFactor: 0.2
  };

  constructor(customConfig?: Partial<typeof SentimentExhaustionDetector.prototype.config>) {
    super();
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
  }

  /**
   * Update sentiment data and check for exhaustion patterns
   */
  public updateSentiment(data: SentimentData): void {
    // Detect FUD keywords if not provided
    if (!data.fudKeywords) {
      data.fudKeywords = this.detectFudKeywords(data);
    }

    this.sentimentHistory.push(data);
    this.maintainHistoryWindow(this.sentimentHistory);
    
    // Update FUD episodes
    this.updateFudEpisodes(data);
    
    // Check for exhaustion if we have enough data
    if (this.hasEnoughData()) {
      this.analyzeExhaustion();
    }
  }

  /**
   * Update price data
   */
  public updatePrice(data: PriceData): void {
    this.priceHistory.push(data);
    this.maintainHistoryWindow(this.priceHistory);
    
    // Calculate and store impact if we have corresponding sentiment
    this.calculateSentimentImpact();
  }

  /**
   * Analyze for sentiment exhaustion patterns
   */
  private analyzeExhaustion(): void {
    const metrics = this.calculateExhaustionMetrics();
    
    // Check if any exhaustion condition is met
    if (this.isExhaustionDetected(metrics)) {
      const signal = this.generateExhaustionSignal(metrics);
      this.emit('exhaustion', signal);
    }
  }

  /**
   * Calculate comprehensive exhaustion metrics
   */
  private calculateExhaustionMetrics(): ExhaustionMetrics {
    const now = Date.now();
    
    // Calculate sentiment impact decay
    const impactDecay = this.calculateImpactDecay();
    
    // Calculate FUD resistance
    const fudResistance = this.calculateFudResistance();
    
    // Detect bear capitulation
    const bearCapitulation = this.detectBearCapitulation();
    
    // Calculate volume-sentiment divergence
    const divergence = this.calculateVolumeSentimentDivergence();
    
    // Count consecutive FUD days
    const consecutiveFudDays = this.countConsecutiveFudDays();
    
    // Calculate diminishing returns
    const diminishingReturns = this.calculateDiminishingReturns();
    
    // Overall sentiment fatigue score
    const sentimentFatigue = this.calculateOverallFatigue({
      impactDecay,
      fudResistance,
      bearCapitulation,
      divergence,
      consecutiveFudDays,
      diminishingReturns
    });

    return {
      sentimentImpactDecay: impactDecay,
      fudResistance,
      bearCapitulation,
      volumeSentimentDivergence: divergence,
      sentimentFatigue,
      consecutiveFudDays,
      diminishingReturns
    };
  }

  /**
   * Calculate how much sentiment impact has decayed over time
   */
  private calculateImpactDecay(): number {
    if (this.impactHistory.length < 10) return 0;
    
    // Get recent vs older impact ratios
    const recentImpacts = this.impactHistory.slice(-10);
    const olderImpacts = this.impactHistory.slice(-20, -10);
    
    if (olderImpacts.length === 0) return 0;
    
    // Calculate average impact ratios
    const recentAvg = this.average(recentImpacts.map(i => Math.abs(i.impactRatio)));
    const olderAvg = this.average(olderImpacts.map(i => Math.abs(i.impactRatio)));
    
    // Decay is measured as reduction in impact
    const decay = olderAvg > 0 ? 1 - (recentAvg / olderAvg) : 0;
    
    return Math.max(0, Math.min(1, decay));
  }

  /**
   * Calculate market's resistance to FUD
   */
  private calculateFudResistance(): number {
    const recentFudEpisodes = this.fudEpisodes.filter(
      episode => episode.startTime > Date.now() - this.config.longWindow * 3600 * 1000
    );
    
    if (recentFudEpisodes.length === 0) return 0.5; // Neutral if no FUD
    
    // Calculate average resistance across episodes
    const resistances = recentFudEpisodes.map(episode => episode.resistance);
    const avgResistance = this.average(resistances);
    
    // Trend in resistance (increasing resistance = market getting immune)
    const resistanceTrend = this.calculateTrend(resistances);
    
    // Combine average and trend
    return Math.min(1, avgResistance + resistanceTrend * 0.2);
  }

  /**
   * Detect if bears are capitulating (giving up on negative messaging)
   */
  private detectBearCapitulation(): number {
    const recentSentiment = this.sentimentHistory.slice(-this.config.shortWindow);
    if (recentSentiment.length < 10) return 0;
    
    // Look for patterns of bear capitulation:
    // 1. Decreasing intensity of negative sentiment
    // 2. Decreasing volume of negative posts
    // 3. Shift from extremely negative to moderately negative
    
    const negativeSentiments = recentSentiment.filter(s => s.score < 0);
    if (negativeSentiments.length < 5) return 0;
    
    // Calculate intensity trend
    const intensities = negativeSentiments.map(s => s.intensity);
    const intensityTrend = this.calculateTrend(intensities);
    
    // Calculate volume trend
    const volumes = negativeSentiments.map(s => s.volume);
    const volumeTrend = this.calculateTrend(volumes);
    
    // Check for moderation in sentiment
    const earlyNegative = negativeSentiments.slice(0, Math.floor(negativeSentiments.length / 2));
    const lateNegative = negativeSentiments.slice(Math.floor(negativeSentiments.length / 2));
    
    const earlyAvg = this.average(earlyNegative.map(s => s.score));
    const lateAvg = this.average(lateNegative.map(s => s.score));
    
    const moderation = lateAvg > earlyAvg ? (lateAvg - earlyAvg) / Math.abs(earlyAvg) : 0;
    
    // Combine factors
    const capitulation = (
      Math.max(0, -intensityTrend) * 0.3 +
      Math.max(0, -volumeTrend) * 0.3 +
      moderation * 0.4
    );
    
    return Math.min(1, Math.max(0, capitulation));
  }

  /**
   * Calculate divergence between volume and sentiment
   */
  private calculateVolumeSentimentDivergence(): number {
    const recentData = this.getAlignedData(this.config.shortWindow);
    if (recentData.length < 10) return 0;
    
    // Calculate correlations
    const sentimentScores = recentData.map(d => d.sentiment.score);
    const priceVolumes = recentData.map(d => d.price.volume);
    const sentimentVolumes = recentData.map(d => d.sentiment.volume);
    
    // Look for divergence patterns:
    // 1. High trading volume with low sentiment volume (accumulation)
    // 2. Negative sentiment with increasing price volume (bullish divergence)
    
    const priceVolumeTrend = this.calculateTrend(priceVolumes);
    const sentimentVolumeTrend = this.calculateTrend(sentimentVolumes);
    const sentimentTrend = this.calculateTrend(sentimentScores);
    
    // Calculate divergence
    let divergence = 0;
    
    // Volume divergence (price volume up, sentiment volume down)
    if (priceVolumeTrend > 0 && sentimentVolumeTrend < 0) {
      divergence += 0.5;
    }
    
    // Sentiment-volume divergence (negative sentiment, positive volume)
    if (sentimentTrend < -0.1 && priceVolumeTrend > 0.1) {
      divergence += 0.5;
    }
    
    return divergence;
  }

  /**
   * Count consecutive days of FUD
   */
  private countConsecutiveFudDays(): number {
    const dailyAverages = this.getDailySentimentAverages();
    let consecutiveDays = 0;
    
    // Count from most recent backwards
    for (let i = dailyAverages.length - 1; i >= 0; i--) {
      if (dailyAverages[i] < this.config.negativeThreshold) {
        consecutiveDays++;
      } else {
        break;
      }
    }
    
    return consecutiveDays;
  }

  /**
   * Calculate diminishing returns on FUD
   */
  private calculateDiminishingReturns(): number {
    if (this.impactHistory.length < 20) return 0;
    
    // Group impacts by FUD intensity levels
    const impactsByIntensity: { [key: string]: number[] } = {
      low: [],
      medium: [],
      high: []
    };
    
    this.impactHistory.forEach(impact => {
      const level = impact.fudIntensity < 0.3 ? 'low' :
                   impact.fudIntensity < 0.7 ? 'medium' : 'high';
      impactsByIntensity[level].push(Math.abs(impact.priceImpact));
    });
    
    // Calculate diminishing returns for each level
    let totalDiminishing = 0;
    let count = 0;
    
    Object.values(impactsByIntensity).forEach(impacts => {
      if (impacts.length >= 5) {
        const early = impacts.slice(0, Math.floor(impacts.length / 2));
        const late = impacts.slice(Math.floor(impacts.length / 2));
        
        const earlyAvg = this.average(early);
        const lateAvg = this.average(late);
        
        if (earlyAvg > 0) {
          const diminishing = 1 - (lateAvg / earlyAvg);
          totalDiminishing += Math.max(0, diminishing);
          count++;
        }
      }
    });
    
    return count > 0 ? totalDiminishing / count : 0;
  }

  /**
   * Calculate overall sentiment fatigue score
   */
  private calculateOverallFatigue(metrics: Omit<ExhaustionMetrics, 'sentimentFatigue'>): number {
    // Weight different factors
    const weights = {
      impactDecay: 0.25,
      fudResistance: 0.20,
      bearCapitulation: 0.20,
      divergence: 0.15,
      consecutiveDays: 0.10,
      diminishingReturns: 0.10
    };
    
    // Normalize consecutive days (cap at 14 days)
    const normalizedDays = Math.min(metrics.consecutiveFudDays / 14, 1);
    
    const fatigue = (
      metrics.sentimentImpactDecay * weights.impactDecay +
      metrics.fudResistance * weights.fudResistance +
      metrics.bearCapitulation * weights.bearCapitulation +
      metrics.volumeSentimentDivergence * weights.divergence +
      normalizedDays * weights.consecutiveDays +
      metrics.diminishingReturns * weights.diminishingReturns
    );
    
    return Math.min(1, Math.max(0, fatigue));
  }

  /**
   * Track sentiment impact on price
   */
  private calculateSentimentImpact(): void {
    const alignedData = this.getAlignedData(1); // Get latest aligned data
    if (alignedData.length === 0) return;
    
    const latest = alignedData[alignedData.length - 1];
    const previous = alignedData.length > 1 ? alignedData[alignedData.length - 2] : null;
    
    if (!previous) return;
    
    // Calculate price impact
    const priceChange = (latest.price.price - previous.price.price) / previous.price.price;
    const sentimentChange = latest.sentiment.score - previous.sentiment.score;
    
    // Calculate impact ratio (price change per unit sentiment)
    const impactRatio = sentimentChange !== 0 ? priceChange / sentimentChange : 0;
    
    // Calculate FUD intensity
    const fudIntensity = this.calculateFudIntensity(latest.sentiment);
    
    this.impactHistory.push({
      timestamp: latest.sentiment.timestamp,
      sentimentScore: latest.sentiment.score,
      priceImpact: priceChange,
      impactRatio,
      fudIntensity
    });
    
    // Maintain history window
    this.maintainHistoryWindow(this.impactHistory, this.config.longWindow * 2);
  }

  /**
   * Calculate FUD intensity from sentiment data
   */
  private calculateFudIntensity(sentiment: SentimentData): number {
    if (!sentiment.fudKeywords || sentiment.fudKeywords.length === 0) return 0;
    
    // Base intensity on keyword count and sentiment score
    const keywordIntensity = Math.min(sentiment.fudKeywords.length / 5, 1);
    const sentimentIntensity = Math.abs(Math.min(sentiment.score, 0));
    
    return (keywordIntensity * 0.4 + sentimentIntensity * 0.6);
  }

  /**
   * Detect FUD keywords in sentiment data
   */
  private detectFudKeywords(data: SentimentData): string[] {
    // This would normally analyze the actual text content
    // For now, return empty array as we don't have text content
    return [];
  }

  /**
   * Update FUD episode tracking
   */
  private updateFudEpisodes(sentiment: SentimentData): void {
    const isFud = sentiment.score < this.config.negativeThreshold;
    const currentEpisode = this.fudEpisodes.find(e => !e.endTime);
    
    if (isFud) {
      if (!currentEpisode) {
        // Start new FUD episode
        this.fudEpisodes.push({
          startTime: sentiment.timestamp,
          peakIntensity: Math.abs(sentiment.score),
          totalImpact: 0,
          resistance: 0
        });
      } else {
        // Update ongoing episode
        currentEpisode.peakIntensity = Math.max(
          currentEpisode.peakIntensity,
          Math.abs(sentiment.score)
        );
      }
    } else if (currentEpisode) {
      // End current episode
      currentEpisode.endTime = sentiment.timestamp;
      
      // Calculate episode resistance
      const episodeImpacts = this.impactHistory.filter(
        i => i.timestamp >= currentEpisode.startTime &&
             i.timestamp <= sentiment.timestamp
      );
      
      if (episodeImpacts.length > 0) {
        const totalImpact = episodeImpacts.reduce((sum, i) => sum + Math.abs(i.priceImpact), 0);
        const expectedImpact = currentEpisode.peakIntensity * episodeImpacts.length * 0.02; // 2% per period expected
        
        currentEpisode.totalImpact = totalImpact;
        currentEpisode.resistance = expectedImpact > 0 ? 1 - (totalImpact / expectedImpact) : 0.5;
        currentEpisode.resistance = Math.max(0, Math.min(1, currentEpisode.resistance));
      }
    }
  }

  /**
   * Check if exhaustion conditions are met
   */
  private isExhaustionDetected(metrics: ExhaustionMetrics): boolean {
    return (
      metrics.sentimentFatigue > this.config.exhaustionThreshold ||
      metrics.fudResistance > this.config.fudResistanceThreshold ||
      metrics.bearCapitulation > 0.7 ||
      metrics.volumeSentimentDivergence > this.config.divergenceThreshold
    );
  }

  /**
   * Generate exhaustion signal
   */
  private generateExhaustionSignal(metrics: ExhaustionMetrics): ExhaustionSignal {
    // Determine signal type
    let type: ExhaustionSignal['type'] = 'sentiment_exhaustion';
    if (metrics.fudResistance > this.config.fudResistanceThreshold) {
      type = 'fud_resistance';
    } else if (metrics.bearCapitulation > 0.7) {
      type = 'bear_capitulation';
    } else if (metrics.volumeSentimentDivergence > this.config.divergenceThreshold) {
      type = 'divergence';
    }
    
    // Calculate signal strength
    const strength = Math.max(
      metrics.sentimentFatigue,
      metrics.fudResistance,
      metrics.bearCapitulation,
      metrics.volumeSentimentDivergence * 0.8 // Slightly lower weight for divergence
    );
    
    // Calculate confidence
    const confidence = this.calculateSignalConfidence(metrics);
    
    // Determine market phase
    const marketPhase = this.determineMarketPhase(metrics);
    
    // Generate recommendation
    const recommendation = this.generateRecommendation(type, metrics, marketPhase);
    
    return {
      timestamp: Date.now(),
      type,
      strength,
      metrics,
      confidence,
      metadata: {
        priceResilience: this.calculatePriceResilience(),
        sentimentPersistence: metrics.consecutiveFudDays / 14, // Normalized
        volumeProfile: this.analyzeVolumeProfile(),
        marketPhase,
        recommendation
      }
    };
  }

  /**
   * Calculate signal confidence
   */
  private calculateSignalConfidence(metrics: ExhaustionMetrics): number {
    let confidence = 0;
    
    // Multiple confirming metrics increase confidence
    if (metrics.sentimentFatigue > 0.6) confidence += 0.2;
    if (metrics.fudResistance > 0.5) confidence += 0.2;
    if (metrics.bearCapitulation > 0.5) confidence += 0.2;
    if (metrics.volumeSentimentDivergence > 0.4) confidence += 0.2;
    if (metrics.diminishingReturns > 0.5) confidence += 0.2;
    
    // Long duration increases confidence
    if (metrics.consecutiveFudDays > 7) confidence += 0.1;
    if (metrics.consecutiveFudDays > 14) confidence += 0.1;
    
    return Math.min(1, confidence);
  }

  /**
   * Determine current market phase
   */
  private determineMarketPhase(metrics: ExhaustionMetrics): ExhaustionSignal['metadata']['marketPhase'] {
    if (metrics.consecutiveFudDays < 3 && metrics.sentimentFatigue < 0.3) {
      return 'early_fud';
    } else if (metrics.sentimentFatigue < 0.5 && metrics.fudResistance < 0.4) {
      return 'peak_fear';
    } else if (metrics.sentimentFatigue > 0.7 || metrics.bearCapitulation > 0.6) {
      return 'exhaustion';
    } else {
      return 'recovery';
    }
  }

  /**
   * Generate trading recommendation
   */
  private generateRecommendation(
    type: ExhaustionSignal['type'],
    metrics: ExhaustionMetrics,
    phase: ExhaustionSignal['metadata']['marketPhase']
  ): string {
    switch (type) {
      case 'fud_resistance':
        return `Market showing strong FUD resistance (${(metrics.fudResistance * 100).toFixed(0)}%). Consider accumulation as sellers exhaust.`;
        
      case 'bear_capitulation':
        return `Bear capitulation detected (${(metrics.bearCapitulation * 100).toFixed(0)}%). Negative sentiment losing effectiveness.`;
        
      case 'divergence':
        return `Volume-sentiment divergence suggests accumulation despite negative sentiment. Watch for reversal.`;
        
      case 'sentiment_exhaustion':
      default:
        if (phase === 'exhaustion') {
          return `Sentiment exhaustion reached (${(metrics.sentimentFatigue * 100).toFixed(0)}%). Market may be bottoming.`;
        } else if (phase === 'recovery') {
          return `Early recovery signs after ${metrics.consecutiveFudDays} days of FUD. Monitor for confirmation.`;
        } else {
          return `Sentiment fatigue building. Continue monitoring for exhaustion signals.`;
        }
    }
  }

  /**
   * Calculate price resilience to negative sentiment
   */
  private calculatePriceResilience(): number {
    const recentData = this.getAlignedData(this.config.shortWindow);
    if (recentData.length < 10) return 0.5;
    
    // Find periods of negative sentiment
    const negativePeriods = recentData.filter(d => d.sentiment.score < this.config.negativeThreshold);
    if (negativePeriods.length === 0) return 1; // No negative sentiment = full resilience
    
    // Calculate price performance during negative periods
    let totalExpectedDrop = 0;
    let totalActualDrop = 0;
    
    for (let i = 1; i < negativePeriods.length; i++) {
      const sentimentDrop = Math.abs(negativePeriods[i].sentiment.score);
      const expectedDrop = sentimentDrop * 0.02; // Expected 2% drop per 0.1 sentiment
      
      const priceChange = (negativePeriods[i].price.price - negativePeriods[i-1].price.price) / 
                          negativePeriods[i-1].price.price;
      
      totalExpectedDrop += expectedDrop;
      totalActualDrop += Math.min(0, priceChange); // Only count drops
    }
    
    // Resilience is inverse of actual vs expected drop
    const resilience = totalExpectedDrop > 0 ? 
      1 - (Math.abs(totalActualDrop) / totalExpectedDrop) : 0.5;
    
    return Math.max(0, Math.min(1, resilience));
  }

  /**
   * Analyze volume profile
   */
  private analyzeVolumeProfile(): 'accumulation' | 'distribution' | 'neutral' {
    const recentData = this.getAlignedData(this.config.shortWindow);
    if (recentData.length < 10) return 'neutral';
    
    // Analyze price-volume relationship
    const priceChanges = [];
    const volumes = [];
    
    for (let i = 1; i < recentData.length; i++) {
      const priceChange = (recentData[i].price.price - recentData[i-1].price.price) / 
                         recentData[i-1].price.price;
      priceChanges.push(priceChange);
      volumes.push(recentData[i].price.volume);
    }
    
    // Calculate volume-weighted price change
    const upVolume = priceChanges.reduce((sum, change, i) => 
      change > 0 ? sum + volumes[i] : sum, 0);
    const downVolume = priceChanges.reduce((sum, change, i) => 
      change < 0 ? sum + volumes[i] : sum, 0);
    
    const volumeRatio = upVolume / (downVolume || 1);
    
    if (volumeRatio > 1.5) return 'accumulation';
    if (volumeRatio < 0.67) return 'distribution';
    return 'neutral';
  }

  /**
   * Get aligned sentiment and price data
   */
  private getAlignedData(hours: number): Array<{
    sentiment: SentimentData;
    price: PriceData;
  }> {
    const cutoff = Date.now() - hours * 3600 * 1000;
    const recentSentiment = this.sentimentHistory.filter(s => s.timestamp > cutoff);
    const recentPrice = this.priceHistory.filter(p => p.timestamp > cutoff);
    
    const aligned: Array<{ sentiment: SentimentData; price: PriceData }> = [];
    
    // Simple alignment - match closest timestamps
    for (const sentiment of recentSentiment) {
      const closestPrice = this.findClosestPrice(sentiment.timestamp, recentPrice);
      if (closestPrice) {
        aligned.push({ sentiment, price: closestPrice });
      }
    }
    
    return aligned;
  }

  /**
   * Find closest price data to sentiment timestamp
   */
  private findClosestPrice(timestamp: number, priceData: PriceData[]): PriceData | null {
    if (priceData.length === 0) return null;
    
    let closest = priceData[0];
    let minDiff = Math.abs(timestamp - closest.timestamp);
    
    for (const price of priceData) {
      const diff = Math.abs(timestamp - price.timestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closest = price;
      }
    }
    
    // Only return if within 1 hour
    return minDiff < 3600 * 1000 ? closest : null;
  }

  /**
   * Get daily sentiment averages
   */
  private getDailySentimentAverages(): number[] {
    const dailyAverages: number[] = [];
    const msPerDay = 24 * 3600 * 1000;
    
    // Group by day
    const dayGroups: { [key: string]: SentimentData[] } = {};
    
    this.sentimentHistory.forEach(sentiment => {
      const day = Math.floor(sentiment.timestamp / msPerDay);
      if (!dayGroups[day]) dayGroups[day] = [];
      dayGroups[day].push(sentiment);
    });
    
    // Calculate averages
    Object.keys(dayGroups)
      .sort((a, b) => Number(a) - Number(b))
      .forEach(day => {
        const sentiments = dayGroups[day];
        const avg = this.average(sentiments.map(s => s.score));
        dailyAverages.push(avg);
      });
    
    return dailyAverages;
  }

  /**
   * Calculate trend in a time series
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    // Simple linear regression
    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    
    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Normalize by average value
    const avgValue = sumY / n;
    return avgValue !== 0 ? slope / Math.abs(avgValue) : 0;
  }

  /**
   * Calculate average of array
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Maintain history window size
   */
  private maintainHistoryWindow<T>(array: T[], maxHours?: number): void {
    const cutoff = Date.now() - (maxHours || this.config.longWindow) * 3600 * 1000;
    while (array.length > 0 && (array[0] as any).timestamp < cutoff) {
      array.shift();
    }
  }

  /**
   * Check if we have enough data for analysis
   */
  private hasEnoughData(): boolean {
    return (
      this.sentimentHistory.length >= this.config.minDataPoints &&
      this.priceHistory.length >= this.config.minDataPoints
    );
  }

  /**
   * Get current exhaustion metrics
   */
  public getCurrentMetrics(): ExhaustionMetrics | null {
    if (!this.hasEnoughData()) return null;
    return this.calculateExhaustionMetrics();
  }

  /**
   * Get FUD episode history
   */
  public getFudEpisodes(limit?: number): typeof this.fudEpisodes {
    const episodes = [...this.fudEpisodes];
    return limit ? episodes.slice(-limit) : episodes;
  }

  /**
   * Get impact history for analysis
   */
  public getImpactHistory(hours?: number): ImpactHistoryEntry[] {
    if (!hours) return [...this.impactHistory];
    
    const cutoff = Date.now() - hours * 3600 * 1000;
    return this.impactHistory.filter(i => i.timestamp > cutoff);
  }

  /**
   * Reset the detector
   */
  public reset(): void {
    this.sentimentHistory = [];
    this.priceHistory = [];
    this.impactHistory = [];
    this.fudEpisodes = [];
  }
}