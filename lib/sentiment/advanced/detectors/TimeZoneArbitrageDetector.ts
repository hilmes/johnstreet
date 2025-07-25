import { EventEmitter } from 'events';

interface SentimentData {
  timestamp: number;
  score: number; // -1 to 1
  volume: number;
  source: string;
  language?: string;
  location?: string;
  metadata?: Record<string, any>;
}

interface TimeZoneMetrics {
  zone: string;
  currentScore: number;
  momentum: number;
  velocity: number;
  acceleration: number;
  volume: number;
  volumeChange: number;
  activeHours: number[];
  peakHour: number;
  sentiment24h: number[];
}

interface MarketSession {
  name: string;
  zone: string;
  openHour: number; // UTC hour
  closeHour: number;
  preMarketHour: number;
  afterMarketHour: number;
  tradingDays: number[]; // 0 = Sunday, 6 = Saturday
}

interface HandoffPattern {
  fromZone: string;
  toZone: string;
  timestamp: number;
  sentimentTransfer: number;
  momentumTransfer: number;
  volumeTransfer: number;
  confidence: number;
  characteristics: string[];
}

interface WeekendBuildup {
  startTimestamp: number;
  endTimestamp: number;
  peakTimestamp: number;
  totalVolume: number;
  avgSentiment: number;
  momentumBuild: number;
  predictedMonday: {
    openSentiment: number;
    volatility: number;
    confidence: number;
  };
}

interface CascadePattern {
  startZone: string;
  timestamp: number;
  duration: number; // hours
  zones: string[];
  peakZone: string;
  totalMomentum: number;
  cascadeVelocity: number; // zones per hour
  predictedEnd: number;
  type: 'bullish' | 'bearish' | 'neutral';
}

interface ArbitrageSignal {
  timestamp: number;
  type: 'handoff' | 'weekend_buildup' | 'cascade' | 'pre_market' | 'divergence';
  strength: number;
  confidence: number;
  primaryZone: string;
  secondaryZones: string[];
  momentum: {
    current: number;
    predicted: number;
    velocity: number;
  };
  predictedImpact: {
    zone: string;
    timing: number; // timestamp
    sentiment: number;
    confidence: number;
  };
  metadata: {
    handoffPattern?: HandoffPattern;
    weekendBuildup?: WeekendBuildup;
    cascadePattern?: CascadePattern;
    historicalSimilarity: number;
    riskFactors: string[];
  };
}

export class TimeZoneArbitrageDetector extends EventEmitter {
  private sentimentHistory: Map<string, SentimentData[]> = new Map();
  private zoneMetrics: Map<string, TimeZoneMetrics> = new Map();
  private handoffPatterns: HandoffPattern[] = [];
  private weekendBuildups: WeekendBuildup[] = [];
  private cascadePatterns: CascadePattern[] = [];
  
  // Market sessions configuration
  private readonly marketSessions: MarketSession[] = [
    {
      name: 'Asia/Tokyo',
      zone: 'Asia',
      openHour: 0, // 9 AM JST = 0 UTC
      closeHour: 6, // 3 PM JST = 6 UTC
      preMarketHour: 23,
      afterMarketHour: 7,
      tradingDays: [1, 2, 3, 4, 5]
    },
    {
      name: 'Europe/London',
      zone: 'Europe',
      openHour: 8, // 8 AM GMT = 8 UTC
      closeHour: 16, // 4:30 PM GMT = 16:30 UTC
      preMarketHour: 7,
      afterMarketHour: 17,
      tradingDays: [1, 2, 3, 4, 5]
    },
    {
      name: 'America/New_York',
      zone: 'Americas',
      openHour: 14, // 9:30 AM EST = 14:30 UTC (winter)
      closeHour: 21, // 4 PM EST = 21 UTC
      preMarketHour: 9,
      afterMarketHour: 22,
      tradingDays: [1, 2, 3, 4, 5]
    }
  ];
  
  // Configuration
  private readonly config = {
    historyWindow: 168, // 7 days in hours
    momentumWindow: 24, // hours
    handoffThreshold: 0.3,
    cascadeThreshold: 0.4,
    weekendBuildupThreshold: 0.2,
    minConfidence: 0.6,
    smoothingFactor: 0.15,
    predictionHorizon: 8, // hours
    volumeSignificance: 1.5, // multiplier for significant volume
    zoneOverlapHours: 2,
    cascadeMinZones: 3
  };
  
  constructor(customConfig?: Partial<typeof TimeZoneArbitrageDetector.prototype.config>) {
    super();
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    // Initialize zones
    this.initializeTimeZones();
  }
  
  /**
   * Initialize time zone tracking
   */
  private initializeTimeZones(): void {
    const zones = ['Asia', 'Europe', 'Americas', 'Oceania', 'Africa'];
    
    zones.forEach(zone => {
      this.zoneMetrics.set(zone, {
        zone,
        currentScore: 0,
        momentum: 0,
        velocity: 0,
        acceleration: 0,
        volume: 0,
        volumeChange: 0,
        activeHours: [],
        peakHour: 0,
        sentiment24h: new Array(24).fill(0)
      });
      
      this.sentimentHistory.set(zone, []);
    });
  }
  
  /**
   * Update sentiment data for a specific time zone
   */
  public updateSentiment(data: SentimentData): void {
    const zone = this.classifyTimeZone(data);
    if (!zone) return;
    
    // Add to history
    const history = this.sentimentHistory.get(zone) || [];
    history.push(data);
    this.maintainHistoryWindow(history);
    this.sentimentHistory.set(zone, history);
    
    // Update zone metrics
    this.updateZoneMetrics(zone);
    
    // Check for patterns
    this.detectHandoffPatterns();
    this.detectWeekendBuildup();
    this.detectCascadePatterns();
    
    // Emit signals if found
    this.checkForArbitrageSignals();
  }
  
  /**
   * Classify sentiment data into time zones
   */
  private classifyTimeZone(data: SentimentData): string | null {
    // Use location if available
    if (data.location) {
      return this.locationToZone(data.location);
    }
    
    // Use language as proxy
    if (data.language) {
      return this.languageToZone(data.language);
    }
    
    // Use timestamp to guess active zone
    const hour = new Date(data.timestamp).getUTCHours();
    return this.hourToActiveZone(hour);
  }
  
  /**
   * Convert location to zone
   */
  private locationToZone(location: string): string {
    const locationMap: Record<string, string> = {
      // Asia
      'JP': 'Asia', 'CN': 'Asia', 'KR': 'Asia', 'SG': 'Asia',
      'HK': 'Asia', 'TW': 'Asia', 'IN': 'Asia', 'TH': 'Asia',
      // Europe
      'GB': 'Europe', 'DE': 'Europe', 'FR': 'Europe', 'IT': 'Europe',
      'ES': 'Europe', 'NL': 'Europe', 'CH': 'Europe', 'SE': 'Europe',
      // Americas
      'US': 'Americas', 'CA': 'Americas', 'MX': 'Americas', 'BR': 'Americas',
      // Oceania
      'AU': 'Oceania', 'NZ': 'Oceania',
      // Africa
      'ZA': 'Africa', 'NG': 'Africa', 'EG': 'Africa'
    };
    
    return locationMap[location.toUpperCase()] || 'Americas';
  }
  
  /**
   * Convert language to probable zone
   */
  private languageToZone(language: string): string {
    const languageMap: Record<string, string> = {
      'ja': 'Asia', 'zh': 'Asia', 'ko': 'Asia', 'hi': 'Asia',
      'en': 'Americas', // Default English to Americas
      'es': 'Americas', // Spanish primarily Americas
      'pt': 'Americas', // Portuguese (Brazil)
      'de': 'Europe', 'fr': 'Europe', 'it': 'Europe',
      'ru': 'Europe', 'nl': 'Europe', 'sv': 'Europe'
    };
    
    return languageMap[language.toLowerCase()] || 'Americas';
  }
  
  /**
   * Determine most active zone by hour
   */
  private hourToActiveZone(utcHour: number): string {
    // Rough approximation of active trading hours
    if (utcHour >= 23 || utcHour < 7) return 'Asia';
    if (utcHour >= 7 && utcHour < 14) return 'Europe';
    if (utcHour >= 14 && utcHour < 23) return 'Americas';
    return 'Americas'; // Default
  }
  
  /**
   * Update metrics for a specific zone
   */
  private updateZoneMetrics(zone: string): void {
    const history = this.sentimentHistory.get(zone) || [];
    if (history.length < 2) return;
    
    const metrics = this.zoneMetrics.get(zone);
    if (!metrics) return;
    
    // Calculate current metrics
    const recent = history.slice(-20);
    const current = recent[recent.length - 1];
    
    // Current score
    metrics.currentScore = current.score;
    
    // Volume metrics
    metrics.volume = recent.reduce((sum, d) => sum + d.volume, 0) / recent.length;
    const oldVolume = history.slice(-40, -20).reduce((sum, d) => sum + d.volume, 0) / 20;
    metrics.volumeChange = oldVolume > 0 ? (metrics.volume - oldVolume) / oldVolume : 0;
    
    // Momentum (rate of change)
    const momentum = this.calculateMomentum(recent);
    metrics.momentum = momentum.momentum;
    metrics.velocity = momentum.velocity;
    metrics.acceleration = momentum.acceleration;
    
    // Active hours analysis
    const hourlyData = this.groupByHour(history);
    metrics.activeHours = this.findActiveHours(hourlyData);
    metrics.peakHour = this.findPeakHour(hourlyData);
    
    // 24-hour sentiment profile
    metrics.sentiment24h = this.calculate24HourProfile(history);
    
    this.zoneMetrics.set(zone, metrics);
  }
  
  /**
   * Calculate momentum metrics
   */
  private calculateMomentum(data: SentimentData[]): {
    momentum: number;
    velocity: number;
    acceleration: number;
  } {
    if (data.length < 3) {
      return { momentum: 0, velocity: 0, acceleration: 0 };
    }
    
    // Calculate weighted average sentiment
    const weights = data.map((_, i) => Math.exp(i / data.length));
    const weightSum = weights.reduce((a, b) => a + b, 0);
    const weightedSentiment = data.reduce((sum, d, i) => 
      sum + d.score * weights[i], 0) / weightSum;
    
    // Calculate derivatives
    const timestamps = data.map(d => d.timestamp);
    const sentiments = data.map(d => d.score);
    
    // First derivative (velocity)
    const velocities: number[] = [];
    for (let i = 1; i < sentiments.length; i++) {
      const dt = (timestamps[i] - timestamps[i - 1]) / (1000 * 60 * 60); // hours
      const ds = sentiments[i] - sentiments[i - 1];
      velocities.push(ds / dt);
    }
    
    // Second derivative (acceleration)
    const accelerations: number[] = [];
    for (let i = 1; i < velocities.length; i++) {
      const dt = (timestamps[i + 1] - timestamps[i]) / (1000 * 60 * 60);
      const dv = velocities[i] - velocities[i - 1];
      accelerations.push(dv / dt);
    }
    
    return {
      momentum: weightedSentiment,
      velocity: velocities.length > 0 ? velocities[velocities.length - 1] : 0,
      acceleration: accelerations.length > 0 ? accelerations[accelerations.length - 1] : 0
    };
  }
  
  /**
   * Group sentiment data by hour
   */
  private groupByHour(data: SentimentData[]): Map<number, SentimentData[]> {
    const hourlyData = new Map<number, SentimentData[]>();
    
    data.forEach(d => {
      const hour = new Date(d.timestamp).getUTCHours();
      const hourData = hourlyData.get(hour) || [];
      hourData.push(d);
      hourlyData.set(hour, hourData);
    });
    
    return hourlyData;
  }
  
  /**
   * Find active trading hours
   */
  private findActiveHours(hourlyData: Map<number, SentimentData[]>): number[] {
    const volumeByHour: Array<{ hour: number; volume: number }> = [];
    
    hourlyData.forEach((data, hour) => {
      const totalVolume = data.reduce((sum, d) => sum + d.volume, 0);
      volumeByHour.push({ hour, volume: totalVolume });
    });
    
    // Sort by volume and take top hours
    volumeByHour.sort((a, b) => b.volume - a.volume);
    const threshold = volumeByHour[0]?.volume * 0.5 || 0;
    
    return volumeByHour
      .filter(h => h.volume >= threshold)
      .map(h => h.hour)
      .sort((a, b) => a - b);
  }
  
  /**
   * Find peak activity hour
   */
  private findPeakHour(hourlyData: Map<number, SentimentData[]>): number {
    let peakHour = 0;
    let peakVolume = 0;
    
    hourlyData.forEach((data, hour) => {
      const volume = data.reduce((sum, d) => sum + d.volume, 0);
      if (volume > peakVolume) {
        peakVolume = volume;
        peakHour = hour;
      }
    });
    
    return peakHour;
  }
  
  /**
   * Calculate 24-hour sentiment profile
   */
  private calculate24HourProfile(data: SentimentData[]): number[] {
    const profile = new Array(24).fill(0);
    const counts = new Array(24).fill(0);
    
    // Only use recent 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const recentData = data.filter(d => d.timestamp > cutoff);
    
    recentData.forEach(d => {
      const hour = new Date(d.timestamp).getUTCHours();
      profile[hour] += d.score;
      counts[hour]++;
    });
    
    // Average
    for (let i = 0; i < 24; i++) {
      if (counts[i] > 0) {
        profile[i] /= counts[i];
      }
    }
    
    return profile;
  }
  
  /**
   * Detect handoff patterns between time zones
   */
  private detectHandoffPatterns(): void {
    const zones = Array.from(this.zoneMetrics.keys());
    
    for (let i = 0; i < zones.length; i++) {
      for (let j = 0; j < zones.length; j++) {
        if (i === j) continue;
        
        const fromZone = zones[i];
        const toZone = zones[j];
        const pattern = this.analyzeHandoff(fromZone, toZone);
        
        if (pattern && pattern.confidence >= this.config.minConfidence) {
          this.handoffPatterns.push(pattern);
          this.maintainPatternHistory(this.handoffPatterns);
        }
      }
    }
  }
  
  /**
   * Analyze handoff between two zones
   */
  private analyzeHandoff(fromZone: string, toZone: string): HandoffPattern | null {
    const fromMetrics = this.zoneMetrics.get(fromZone);
    const toMetrics = this.zoneMetrics.get(toZone);
    
    if (!fromMetrics || !toMetrics) return null;
    
    // Check for momentum transfer
    const momentumTransfer = this.calculateMomentumTransfer(fromMetrics, toMetrics);
    if (Math.abs(momentumTransfer) < this.config.handoffThreshold) return null;
    
    // Calculate sentiment transfer
    const sentimentTransfer = toMetrics.currentScore - fromMetrics.currentScore;
    
    // Volume analysis
    const volumeTransfer = toMetrics.volumeChange - fromMetrics.volumeChange;
    
    // Determine characteristics
    const characteristics: string[] = [];
    if (momentumTransfer > 0.5) characteristics.push('strong_momentum');
    if (volumeTransfer > 0.3) characteristics.push('volume_surge');
    if (Math.sign(fromMetrics.momentum) === Math.sign(toMetrics.momentum)) {
      characteristics.push('continuation');
    } else {
      characteristics.push('reversal');
    }
    
    // Calculate confidence
    const confidence = this.calculateHandoffConfidence(
      fromMetrics, toMetrics, momentumTransfer
    );
    
    return {
      fromZone,
      toZone,
      timestamp: Date.now(),
      sentimentTransfer,
      momentumTransfer,
      volumeTransfer,
      confidence,
      characteristics
    };
  }
  
  /**
   * Calculate momentum transfer between zones
   */
  private calculateMomentumTransfer(
    from: TimeZoneMetrics,
    to: TimeZoneMetrics
  ): number {
    // Check if zones have overlapping active hours
    const overlap = this.calculateActiveHourOverlap(from, to);
    if (overlap < this.config.zoneOverlapHours) return 0;
    
    // Momentum should be decreasing in 'from' and increasing in 'to'
    const fromDeceleration = from.acceleration < 0;
    const toAcceleration = to.acceleration > 0;
    
    if (!fromDeceleration || !toAcceleration) return 0;
    
    // Calculate transfer strength
    const transfer = Math.abs(from.momentum) * 0.7 + Math.abs(to.momentum) * 0.3;
    return Math.min(transfer, 1.0);
  }
  
  /**
   * Calculate overlap in active hours
   */
  private calculateActiveHourOverlap(
    zone1: TimeZoneMetrics,
    zone2: TimeZoneMetrics
  ): number {
    const overlap = zone1.activeHours.filter(h => 
      zone2.activeHours.includes(h)
    ).length;
    
    return overlap;
  }
  
  /**
   * Calculate handoff confidence
   */
  private calculateHandoffConfidence(
    from: TimeZoneMetrics,
    to: TimeZoneMetrics,
    momentumTransfer: number
  ): number {
    let confidence = 0;
    
    // Strong momentum transfer
    confidence += Math.min(momentumTransfer, 0.3);
    
    // Volume confirmation
    if (to.volumeChange > from.volumeChange) confidence += 0.2;
    
    // Directional alignment
    if (Math.sign(from.momentum) === Math.sign(to.momentum)) confidence += 0.2;
    
    // Historical precedence
    const historicalSimilarity = this.findHistoricalHandoffSimilarity(from.zone, to.zone);
    confidence += historicalSimilarity * 0.3;
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * Find historical handoff similarity
   */
  private findHistoricalHandoffSimilarity(fromZone: string, toZone: string): number {
    const similar = this.handoffPatterns.filter(p => 
      p.fromZone === fromZone && p.toZone === toZone
    );
    
    if (similar.length === 0) return 0;
    
    // Average confidence of historical patterns
    const avgConfidence = similar.reduce((sum, p) => sum + p.confidence, 0) / similar.length;
    return avgConfidence;
  }
  
  /**
   * Detect weekend sentiment buildup
   */
  private detectWeekendBuildup(): void {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    
    // Only check on weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) return;
    
    const buildup = this.analyzeWeekendBuildup();
    if (buildup && buildup.avgSentiment > this.config.weekendBuildupThreshold) {
      this.weekendBuildups.push(buildup);
      this.maintainPatternHistory(this.weekendBuildups);
    }
  }
  
  /**
   * Analyze weekend buildup patterns
   */
  private analyzeWeekendBuildup(): WeekendBuildup | null {
    // Get weekend data (last 48 hours)
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const weekendData: SentimentData[] = [];
    
    this.sentimentHistory.forEach(history => {
      weekendData.push(...history.filter(d => d.timestamp > cutoff));
    });
    
    if (weekendData.length < 10) return null;
    
    // Sort by timestamp
    weekendData.sort((a, b) => a.timestamp - b.timestamp);
    
    // Find peak sentiment
    let peakSentiment = -1;
    let peakTimestamp = 0;
    
    weekendData.forEach(d => {
      if (d.score > peakSentiment) {
        peakSentiment = d.score;
        peakTimestamp = d.timestamp;
      }
    });
    
    // Calculate metrics
    const totalVolume = weekendData.reduce((sum, d) => sum + d.volume, 0);
    const avgSentiment = weekendData.reduce((sum, d) => sum + d.score, 0) / weekendData.length;
    
    // Calculate momentum build
    const firstHalf = weekendData.slice(0, Math.floor(weekendData.length / 2));
    const secondHalf = weekendData.slice(Math.floor(weekendData.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.score, 0) / secondHalf.length;
    const momentumBuild = secondAvg - firstAvg;
    
    // Predict Monday opening
    const prediction = this.predictMondayOpen(weekendData, momentumBuild);
    
    return {
      startTimestamp: weekendData[0].timestamp,
      endTimestamp: weekendData[weekendData.length - 1].timestamp,
      peakTimestamp,
      totalVolume,
      avgSentiment,
      momentumBuild,
      predictedMonday: prediction
    };
  }
  
  /**
   * Predict Monday market open sentiment
   */
  private predictMondayOpen(
    weekendData: SentimentData[],
    momentumBuild: number
  ): WeekendBuildup['predictedMonday'] {
    // Use exponential smoothing for prediction
    const alpha = this.config.smoothingFactor;
    let smoothedSentiment = weekendData[0].score;
    
    weekendData.forEach(d => {
      smoothedSentiment = alpha * d.score + (1 - alpha) * smoothedSentiment;
    });
    
    // Adjust for momentum
    const predictedSentiment = smoothedSentiment + momentumBuild * 0.5;
    
    // Estimate volatility based on weekend variance
    const sentiments = weekendData.map(d => d.score);
    const variance = this.calculateVariance(sentiments);
    const volatility = Math.sqrt(variance);
    
    // Confidence based on data quality and historical accuracy
    const confidence = this.calculatePredictionConfidence(weekendData, volatility);
    
    return {
      openSentiment: Math.max(-1, Math.min(1, predictedSentiment)),
      volatility,
      confidence
    };
  }
  
  /**
   * Calculate prediction confidence
   */
  private calculatePredictionConfidence(
    data: SentimentData[],
    volatility: number
  ): number {
    let confidence = 0.5; // Base confidence
    
    // More data points increase confidence
    if (data.length > 50) confidence += 0.2;
    else if (data.length > 20) confidence += 0.1;
    
    // Lower volatility increases confidence
    if (volatility < 0.1) confidence += 0.2;
    else if (volatility < 0.2) confidence += 0.1;
    
    // Historical accuracy (simplified)
    const historicalAccuracy = 0.7; // Would be calculated from past predictions
    confidence += historicalAccuracy * 0.2;
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * Detect 24-hour cascade patterns
   */
  private detectCascadePatterns(): void {
    const activeZones = this.findActiveZones();
    if (activeZones.length < this.config.cascadeMinZones) return;
    
    const cascade = this.analyzeCascade(activeZones);
    if (cascade && cascade.totalMomentum > this.config.cascadeThreshold) {
      this.cascadePatterns.push(cascade);
      this.maintainPatternHistory(this.cascadePatterns);
    }
  }
  
  /**
   * Find currently active zones
   */
  private findActiveZones(): string[] {
    const activeZones: string[] = [];
    const threshold = 0.1; // Minimum momentum to be considered active
    
    this.zoneMetrics.forEach((metrics, zone) => {
      if (Math.abs(metrics.momentum) > threshold) {
        activeZones.push(zone);
      }
    });
    
    return activeZones;
  }
  
  /**
   * Analyze cascade pattern across zones
   */
  private analyzeCascade(zones: string[]): CascadePattern | null {
    if (zones.length < this.config.cascadeMinZones) return null;
    
    // Sort zones by when they became active
    const zoneActivations = zones.map(zone => {
      const metrics = this.zoneMetrics.get(zone)!;
      const history = this.sentimentHistory.get(zone)!;
      
      // Find when momentum started building
      let activationTime = Date.now();
      for (let i = history.length - 1; i >= 0; i--) {
        if (Math.abs(history[i].score) < 0.1) {
          activationTime = history[i].timestamp;
          break;
        }
      }
      
      return { zone, activationTime, metrics };
    }).sort((a, b) => a.activationTime - b.activationTime);
    
    const startZone = zoneActivations[0].zone;
    const startTime = zoneActivations[0].activationTime;
    const currentTime = Date.now();
    const duration = (currentTime - startTime) / (1000 * 60 * 60); // hours
    
    // Calculate cascade velocity
    const cascadeVelocity = zones.length / duration;
    
    // Find peak zone
    let peakZone = startZone;
    let peakMomentum = 0;
    
    zoneActivations.forEach(({ zone, metrics }) => {
      if (Math.abs(metrics.momentum) > peakMomentum) {
        peakMomentum = Math.abs(metrics.momentum);
        peakZone = zone;
      }
    });
    
    // Calculate total momentum
    const totalMomentum = zoneActivations.reduce((sum, { metrics }) => 
      sum + Math.abs(metrics.momentum), 0
    ) / zones.length;
    
    // Determine cascade type
    const avgSentiment = zoneActivations.reduce((sum, { metrics }) => 
      sum + metrics.currentScore, 0
    ) / zones.length;
    
    const type = avgSentiment > 0.1 ? 'bullish' : 
                 avgSentiment < -0.1 ? 'bearish' : 'neutral';
    
    // Predict cascade end
    const predictedEnd = this.predictCascadeEnd(zoneActivations, cascadeVelocity);
    
    return {
      startZone,
      timestamp: startTime,
      duration,
      zones: zones,
      peakZone,
      totalMomentum,
      cascadeVelocity,
      predictedEnd,
      type
    };
  }
  
  /**
   * Predict when cascade will end
   */
  private predictCascadeEnd(
    activations: Array<{ zone: string; activationTime: number; metrics: TimeZoneMetrics }>,
    velocity: number
  ): number {
    // Simple prediction based on deceleration
    const decelerations = activations.filter(a => a.metrics.acceleration < 0);
    
    if (decelerations.length > activations.length / 2) {
      // Cascade is slowing down
      const remainingHours = 1 / velocity; // Simplified
      return Date.now() + remainingHours * 60 * 60 * 1000;
    }
    
    // Otherwise predict based on typical cascade duration (8 hours)
    return Date.now() + 8 * 60 * 60 * 1000;
  }
  
  /**
   * Check for arbitrage signals
   */
  private checkForArbitrageSignals(): void {
    const signals: ArbitrageSignal[] = [];
    
    // Check handoff patterns
    const recentHandoffs = this.handoffPatterns.filter(p => 
      Date.now() - p.timestamp < 60 * 60 * 1000 // Last hour
    );
    
    recentHandoffs.forEach(handoff => {
      if (handoff.confidence >= this.config.minConfidence) {
        signals.push(this.createHandoffSignal(handoff));
      }
    });
    
    // Check weekend buildups
    const currentBuildup = this.weekendBuildups[this.weekendBuildups.length - 1];
    if (currentBuildup && this.isWeekend()) {
      signals.push(this.createWeekendSignal(currentBuildup));
    }
    
    // Check cascade patterns
    const activeCascade = this.cascadePatterns[this.cascadePatterns.length - 1];
    if (activeCascade && Date.now() - activeCascade.timestamp < activeCascade.duration * 60 * 60 * 1000) {
      signals.push(this.createCascadeSignal(activeCascade));
    }
    
    // Emit signals
    signals.forEach(signal => {
      if (signal.confidence >= this.config.minConfidence) {
        this.emit('arbitrage', signal);
      }
    });
  }
  
  /**
   * Create handoff arbitrage signal
   */
  private createHandoffSignal(handoff: HandoffPattern): ArbitrageSignal {
    const fromMetrics = this.zoneMetrics.get(handoff.fromZone)!;
    const toMetrics = this.zoneMetrics.get(handoff.toZone)!;
    
    return {
      timestamp: Date.now(),
      type: 'handoff',
      strength: handoff.momentumTransfer,
      confidence: handoff.confidence,
      primaryZone: handoff.toZone,
      secondaryZones: [handoff.fromZone],
      momentum: {
        current: toMetrics.momentum,
        predicted: toMetrics.momentum + handoff.momentumTransfer * 0.5,
        velocity: toMetrics.velocity
      },
      predictedImpact: {
        zone: handoff.toZone,
        timing: Date.now() + 2 * 60 * 60 * 1000, // 2 hours
        sentiment: toMetrics.currentScore + handoff.sentimentTransfer * 0.3,
        confidence: handoff.confidence * 0.8
      },
      metadata: {
        handoffPattern: handoff,
        historicalSimilarity: this.findHistoricalHandoffSimilarity(handoff.fromZone, handoff.toZone),
        riskFactors: this.identifyRiskFactors(handoff)
      }
    };
  }
  
  /**
   * Create weekend buildup signal
   */
  private createWeekendSignal(buildup: WeekendBuildup): ArbitrageSignal {
    return {
      timestamp: Date.now(),
      type: 'weekend_buildup',
      strength: buildup.momentumBuild,
      confidence: buildup.predictedMonday.confidence,
      primaryZone: 'Asia', // Asia opens first
      secondaryZones: ['Europe', 'Americas'],
      momentum: {
        current: buildup.avgSentiment,
        predicted: buildup.predictedMonday.openSentiment,
        velocity: buildup.momentumBuild / 48 // per hour
      },
      predictedImpact: {
        zone: 'Asia',
        timing: this.getNextMondayOpen(),
        sentiment: buildup.predictedMonday.openSentiment,
        confidence: buildup.predictedMonday.confidence
      },
      metadata: {
        weekendBuildup: buildup,
        historicalSimilarity: this.findHistoricalWeekendSimilarity(buildup),
        riskFactors: ['weekend_gap_risk', 'low_liquidity']
      }
    };
  }
  
  /**
   * Create cascade signal
   */
  private createCascadeSignal(cascade: CascadePattern): ArbitrageSignal {
    const nextZone = this.predictNextCascadeZone(cascade);
    
    return {
      timestamp: Date.now(),
      type: 'cascade',
      strength: cascade.totalMomentum,
      confidence: Math.min(0.9, cascade.totalMomentum / this.config.cascadeThreshold),
      primaryZone: cascade.peakZone,
      secondaryZones: cascade.zones,
      momentum: {
        current: cascade.totalMomentum,
        predicted: cascade.totalMomentum * 0.8, // Decay factor
        velocity: cascade.cascadeVelocity
      },
      predictedImpact: {
        zone: nextZone,
        timing: Date.now() + (1 / cascade.cascadeVelocity) * 60 * 60 * 1000,
        sentiment: cascade.type === 'bullish' ? 0.5 : -0.5,
        confidence: 0.7
      },
      metadata: {
        cascadePattern: cascade,
        historicalSimilarity: this.findHistoricalCascadeSimilarity(cascade),
        riskFactors: ['cascade_exhaustion', 'momentum_reversal']
      }
    };
  }
  
  /**
   * Identify risk factors for a handoff
   */
  private identifyRiskFactors(handoff: HandoffPattern): string[] {
    const risks: string[] = [];
    
    if (handoff.characteristics.includes('reversal')) {
      risks.push('momentum_reversal');
    }
    
    if (Math.abs(handoff.volumeTransfer) < 0.1) {
      risks.push('low_volume_confirmation');
    }
    
    if (handoff.confidence < 0.7) {
      risks.push('low_confidence_signal');
    }
    
    return risks;
  }
  
  /**
   * Find historical weekend similarity
   */
  private findHistoricalWeekendSimilarity(buildup: WeekendBuildup): number {
    const similar = this.weekendBuildups.filter(b => 
      Math.abs(b.avgSentiment - buildup.avgSentiment) < 0.1 &&
      Math.abs(b.momentumBuild - buildup.momentumBuild) < 0.1
    );
    
    return similar.length / Math.max(this.weekendBuildups.length, 1);
  }
  
  /**
   * Find historical cascade similarity
   */
  private findHistoricalCascadeSimilarity(cascade: CascadePattern): number {
    const similar = this.cascadePatterns.filter(c => 
      c.zones.length === cascade.zones.length &&
      c.type === cascade.type &&
      Math.abs(c.totalMomentum - cascade.totalMomentum) < 0.1
    );
    
    return similar.length / Math.max(this.cascadePatterns.length, 1);
  }
  
  /**
   * Predict next zone in cascade
   */
  private predictNextCascadeZone(cascade: CascadePattern): string {
    const allZones = ['Asia', 'Europe', 'Americas', 'Oceania', 'Africa'];
    const unusedZones = allZones.filter(z => !cascade.zones.includes(z));
    
    if (unusedZones.length === 0) return cascade.zones[0]; // Cycle back
    
    // Predict based on typical flow
    const lastZone = cascade.zones[cascade.zones.length - 1];
    const typicalFlow: Record<string, string> = {
      'Asia': 'Europe',
      'Europe': 'Americas',
      'Americas': 'Asia',
      'Oceania': 'Asia',
      'Africa': 'Europe'
    };
    
    return typicalFlow[lastZone] || unusedZones[0];
  }
  
  /**
   * Get next Monday market open timestamp
   */
  private getNextMondayOpen(): number {
    const now = new Date();
    const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
    const monday = new Date(now);
    monday.setUTCDate(monday.getUTCDate() + daysUntilMonday);
    monday.setUTCHours(0, 0, 0, 0); // Asia market open
    return monday.getTime();
  }
  
  /**
   * Check if current time is weekend
   */
  private isWeekend(): boolean {
    const day = new Date().getUTCDay();
    return day === 0 || day === 6;
  }
  
  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }
  
  /**
   * Maintain history window
   */
  private maintainHistoryWindow(array: any[]): void {
    const maxSize = this.config.historyWindow;
    while (array.length > maxSize) {
      array.shift();
    }
  }
  
  /**
   * Maintain pattern history
   */
  private maintainPatternHistory<T>(patterns: T[]): void {
    const maxPatterns = 100;
    while (patterns.length > maxPatterns) {
      patterns.shift();
    }
  }
  
  /**
   * Get current metrics for all zones
   */
  public getZoneMetrics(): Map<string, TimeZoneMetrics> {
    return new Map(this.zoneMetrics);
  }
  
  /**
   * Get recent handoff patterns
   */
  public getHandoffPatterns(limit?: number): HandoffPattern[] {
    return limit ? this.handoffPatterns.slice(-limit) : [...this.handoffPatterns];
  }
  
  /**
   * Get weekend buildups
   */
  public getWeekendBuildups(limit?: number): WeekendBuildup[] {
    return limit ? this.weekendBuildups.slice(-limit) : [...this.weekendBuildups];
  }
  
  /**
   * Get cascade patterns
   */
  public getCascadePatterns(limit?: number): CascadePattern[] {
    return limit ? this.cascadePatterns.slice(-limit) : [...this.cascadePatterns];
  }
  
  /**
   * Predict sentiment for specific zone and time
   */
  public predictSentiment(zone: string, hoursAhead: number): {
    sentiment: number;
    confidence: number;
    factors: string[];
  } {
    const metrics = this.zoneMetrics.get(zone);
    if (!metrics) {
      return { sentiment: 0, confidence: 0, factors: ['zone_not_found'] };
    }
    
    // Simple linear prediction with momentum
    const predictedSentiment = metrics.currentScore + 
      (metrics.velocity * hoursAhead) + 
      (0.5 * metrics.acceleration * hoursAhead * hoursAhead);
    
    // Identify factors
    const factors: string[] = [];
    if (Math.abs(metrics.momentum) > 0.3) factors.push('strong_momentum');
    if (metrics.acceleration > 0) factors.push('accelerating');
    if (metrics.volumeChange > 0.5) factors.push('increasing_volume');
    
    // Calculate confidence based on data quality
    const history = this.sentimentHistory.get(zone) || [];
    const dataPoints = history.length;
    const confidence = Math.min(0.9, dataPoints / 100);
    
    return {
      sentiment: Math.max(-1, Math.min(1, predictedSentiment)),
      confidence,
      factors
    };
  }
  
  /**
   * Reset the detector
   */
  public reset(): void {
    this.sentimentHistory.clear();
    this.zoneMetrics.clear();
    this.handoffPatterns = [];
    this.weekendBuildups = [];
    this.cascadePatterns = [];
    this.initializeTimeZones();
  }
}