import { BaseSignalDetector } from '../BaseSignalDetector';
import { 
  SignalType, 
  TextInput, 
  EmojiEvolutionSignal, 
  DetectorConfig 
} from '../types';

interface EmojiContext {
  emoji: string;
  position: number;
  surrounding: string;
  timestamp: Date;
  author?: string;
  sentiment: number;
}

interface EmojiHistory {
  emoji: string;
  firstSeen: Date;
  usageCount: number;
  contexts: EmojiContext[];
  regions: Set<string>;
  sentimentHistory: number[];
  evolutionStage: 'simple' | 'compound' | 'complex' | 'meta';
}

interface RegionalData {
  region: string;
  dominantEmojis: Map<string, number>;
  uniquePatterns: string[];
  culturalContext: string;
  adoptionSpeed: number;
}

/**
 * Detects and analyzes emoji evolution patterns as sentiment indicators
 * Tracks adoption rates, regional preferences, complexity progression, and viral spread
 */
export class EmojiEvolutionDetector extends BaseSignalDetector {
  private emojiHistory: Map<string, EmojiHistory> = new Map();
  private regionalData: Map<string, RegionalData> = new Map();
  private complexityPatterns: Map<string, string[]> = new Map();
  private viralityTracker: Map<string, number> = new Map();
  private sentimentVelocityCache: Map<string, number[]> = new Map();
  
  // Emoji unicode ranges and classification
  private readonly emojiRanges = [
    [0x1F600, 0x1F64F], // Emoticons
    [0x1F300, 0x1F5FF], // Misc Symbols and Pictographs
    [0x1F680, 0x1F6FF], // Transport and Map
    [0x1F1E6, 0x1F1FF], // Regional Indicator Symbols (flags)
    [0x2600, 0x26FF],   // Misc symbols
    [0x2700, 0x27BF],   // Dingbats
    [0xFE00, 0xFE0F],   // Variation Selectors
    [0x1F900, 0x1F9FF], // Supplemental Symbols and Pictographs
    [0x1F018, 0x1F270], // Various symbols
  ];

  // Cultural/regional emoji preferences mapping
  private readonly culturalPreferences = {
    'western': ['😂', '❤️', '😍', '🔥', '👏', '💯', '😭', '🙏'],
    'east_asian': ['😊', '🥺', '😳', '🤔', '✨', '💖', '🌸', '🎉'],
    'middle_eastern': ['😊', '🙏', '❤️', '🌹', '✨', '🤲', '💚', '🌙'],
    'latin_american': ['😂', '❤️', '🔥', '💃', '⚽', '🎵', '🌮', '💕'],
    'african': ['😂', '🙏', '❤️', '💪', '🔥', '🌍', '✊', '🎵'],
  };

  // Sentiment mapping for emojis
  private readonly emojiSentiments = new Map([
    // Positive
    ['😂', 0.8], ['😊', 0.7], ['😍', 0.9], ['🥰', 0.9], ['😘', 0.8],
    ['🤗', 0.7], ['😎', 0.6], ['🤩', 0.9], ['🥳', 0.9], ['🔥', 0.8],
    ['💯', 0.8], ['👏', 0.7], ['🙌', 0.8], ['💪', 0.7], ['✨', 0.6],
    ['🚀', 0.9], ['📈', 0.8], ['💎', 0.7], ['🌙', 0.6], ['⭐', 0.7],
    
    // Negative  
    ['😭', -0.7], ['😢', -0.6], ['😰', -0.7], ['😱', -0.8], ['💀', -0.9],
    ['😡', -0.8], ['🤬', -0.9], ['😤', -0.6], ['💔', -0.8], ['😵', -0.7],
    ['🤮', -0.8], ['🤡', -0.5], ['💩', -0.6], ['📉', -0.8], ['⚰️', -0.9],
    
    // Neutral/Context dependent
    ['🤔', 0.0], ['😐', 0.0], ['🙄', -0.2], ['😏', 0.1], ['🤷‍♀️', 0.0],
    ['🤷‍♂️', 0.0], ['👀', 0.1], ['🧐', 0.1], ['😶', 0.0], ['😑', -0.1],
  ]);

  constructor(config?: Partial<DetectorConfig>) {
    super(SignalType.EMOJI_EVOLUTION, config);
    this.initializeCulturalPatterns();
  }

  protected async performDetection(input: TextInput): Promise<EmojiEvolutionSignal | null> {
    const emojis = this.extractEmojis(input.text);
    
    if (emojis.length === 0) {
      return null;
    }

    // Update emoji history and tracking
    this.updateEmojiHistory(emojis, input);
    
    // Analyze patterns
    const adoptionMetrics = this.analyzeAdoptionMetrics(emojis, input);
    const evolutionPatterns = this.analyzeEvolutionPatterns(emojis, input);
    const regionalPatterns = this.analyzeRegionalPatterns(emojis, input);
    const sentimentVelocity = this.analyzeSentimentVelocity(emojis, input);
    const viralityMetrics = this.analyzeViralityMetrics(emojis, input);
    const trendPrediction = this.analyzeTrendPrediction(emojis, input);

    // Calculate overall signal strength
    const strength = this.calculateEvolutionStrength(
      adoptionMetrics,
      evolutionPatterns,
      sentimentVelocity,
      viralityMetrics
    );

    if (Math.abs(strength) < 0.1) {
      return null;
    }

    const confidence = this.calculateConfidence(emojis, input);
    
    return {
      id: this.generateSignalId(),
      type: SignalType.EMOJI_EVOLUTION,
      strength,
      metadata: this.createMetadata(confidence, input.source),
      indicators: {
        adoptionMetrics,
        evolutionPatterns,
        regionalPatterns,
        sentimentVelocity,
        viralityMetrics,
        trendPrediction
      }
    };
  }

  /**
   * Extract emojis from text using Unicode ranges
   */
  private extractEmojis(text: string): string[] {
    const emojis: string[] = [];
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]/gu;
    
    let match;
    while ((match = emojiRegex.exec(text)) !== null) {
      emojis.push(match[0]);
    }
    
    return emojis;
  }

  /**
   * Initialize cultural preference patterns
   */
  private initializeCulturalPatterns(): void {
    // Initialize complexity progression patterns
    this.complexityPatterns.set('financial_progression', [
      '💰', '💸', '📈', '🚀', '🌙', '💎', '🤲'
    ]);
    
    this.complexityPatterns.set('emotional_progression', [
      '😊', '😍', '🥰', '🤩', '🥳', '😵‍💫', '🤯'
    ]);
    
    this.complexityPatterns.set('cultural_evolution', [
      '👋', '🤝', '🫱🏻‍🫲🏾', '🤜🤛', '🫶', '🤟', '✊'
    ]);

    // Initialize regional data
    Object.entries(this.culturalPreferences).forEach(([region, emojis]) => {
      this.regionalData.set(region, {
        region,
        dominantEmojis: new Map(emojis.map(e => [e, 1])),
        uniquePatterns: [],
        culturalContext: region,
        adoptionSpeed: 1.0
      });
    });
  }

  /**
   * Update emoji history with new occurrences
   */
  private updateEmojiHistory(emojis: string[], input: TextInput): void {
    const now = input.timestamp || new Date();
    const region = this.detectRegion(input);
    
    emojis.forEach((emoji, index) => {
      let history = this.emojiHistory.get(emoji);
      
      if (!history) {
        history = {
          emoji,
          firstSeen: now,
          usageCount: 0,
          contexts: [],
          regions: new Set(),
          sentimentHistory: [],
          evolutionStage: 'simple'
        };
        this.emojiHistory.set(emoji, history);
      }
      
      history.usageCount++;
      history.regions.add(region);
      
      // Add context
      const surrounding = this.getSurroundingContext(input.text, emoji, index);
      history.contexts.push({
        emoji,
        position: index,
        surrounding,
        timestamp: now,
        author: input.author,
        sentiment: this.calculateContextualSentiment(surrounding, emoji)
      });
      
      // Update sentiment history (keep last 100 entries)
      history.sentimentHistory.push(this.calculateContextualSentiment(surrounding, emoji));
      if (history.sentimentHistory.length > 100) {
        history.sentimentHistory.shift();
      }
      
      // Update evolution stage
      history.evolutionStage = this.determineEvolutionStage(history);
    });
  }

  /**
   * Analyze new emoji adoption metrics
   */
  private analyzeAdoptionMetrics(emojis: string[], input: TextInput) {
    const now = input.timestamp || new Date();
    const windowStart = new Date(now.getTime() - 3600000); // 1 hour window
    
    const newEmojis = emojis.filter(emoji => {
      const history = this.emojiHistory.get(emoji);
      return !history || history.firstSeen > windowStart;
    });
    
    const recentHistory = Array.from(this.emojiHistory.values())
      .filter(h => h.firstSeen > windowStart);
    
    const adoptionRate = recentHistory.length / 1; // per hour
    const previousRate = this.getPreviousAdoptionRate();
    const adoptionVelocity = adoptionRate - previousRate;
    
    return {
      newEmojiCount: newEmojis.length,
      adoptionRate,
      adoptionVelocity,
      firstSeenTimestamp: recentHistory.map(h => h.firstSeen),
      adoptionLatency: this.calculateAverageAdoptionLatency()
    };
  }

  /**
   * Analyze emoji evolution patterns
   */
  private analyzeEvolutionPatterns(emojis: string[], input: TextInput) {
    const complexityProgression = this.analyzeComplexityProgression(emojis);
    const emergentCombinations = this.findEmergentCombinations(input.text);
    const semanticDrift = this.analyzeSemanticDrift(emojis);
    
    return {
      complexityProgression,
      emergentCombinations,
      semanticDrift
    };
  }

  /**
   * Analyze regional emoji patterns
   */
  private analyzeRegionalPatterns(emojis: string[], input: TextInput) {
    const region = this.detectRegion(input);
    const culturalClusters: Record<string, any> = {};
    const geographicDistribution: Record<string, number> = {};
    
    // Update regional data
    this.regionalData.forEach((data, regionKey) => {
      const relevantEmojis = emojis.filter(emoji => 
        data.dominantEmojis.has(emoji)
      );
      
      culturalClusters[regionKey] = {
        dominantEmojis: Array.from(data.dominantEmojis.keys()),
        uniqueUsagePatterns: data.uniquePatterns,
        culturalContext: data.culturalContext,
        adoptionSpeed: data.adoptionSpeed,
        crossoverPotential: this.calculateCrossoverPotential(regionKey, emojis)
      };
      
      geographicDistribution[regionKey] = relevantEmojis.length / emojis.length;
    });
    
    const culturalBarriers = this.identifyCulturalBarriers(emojis);
    const regionInfluence = this.calculateRegionInfluence();
    
    return {
      culturalClusters,
      geographicDistribution,
      culturalBarriers,
      regionInfluence
    };
  }

  /**
   * Analyze emoji sentiment velocity
   */
  private analyzeSentimentVelocity(emojis: string[], input: TextInput) {
    const currentSentiment = this.calculateEmojiSetSentiment(emojis);
    const velocityHistory = this.sentimentVelocityCache.get('global') || [];
    
    velocityHistory.push(currentSentiment);
    if (velocityHistory.length > 100) velocityHistory.shift();
    
    this.sentimentVelocityCache.set('global', velocityHistory);
    
    const instantaneousVelocity = this.calculateInstantaneousVelocity(velocityHistory);
    const accelerationTrend = this.calculateAccelerationTrend(velocityHistory);
    const momentumIndicator = this.calculateMomentumIndicator(velocityHistory);
    const volatilityIndex = this.calculateVolatilityIndex(velocityHistory);
    
    return {
      velocityMetrics: {
        instantaneousVelocity,
        accelerationTrend,
        momentumIndicator,
        volatilityIndex
      },
      temporalPatterns: this.analyzeTemporalPatterns(velocityHistory),
      contextualVelocity: this.analyzeContextualVelocity(emojis, input)
    };
  }

  /**
   * Analyze emoji virality metrics
   */
  private analyzeViralityMetrics(emojis: string[], input: TextInput) {
    const spreadPatterns = this.analyzeSpreadPatterns(emojis, input);
    const memeticFitness = this.analyzeMemeticFitness(emojis);
    const networkEffects = this.analyzeNetworkEffects(emojis, input);
    const competitiveAnalysis = this.analyzeCompetitiveEmojis(emojis);
    
    return {
      spreadPatterns,
      memeticFitness,
      networkEffects,
      competitiveAnalysis
    };
  }

  /**
   * Analyze and predict emoji trends
   */
  private analyzeTrendPrediction(emojis: string[], input: TextInput) {
    const emergingTrends = this.identifyEmergingTrends(emojis);
    const declineIndicators = this.identifyDeclineIndicators();
    const cycleAnalysis = this.analyzeCycles(emojis, input);
    
    return {
      emergingTrends,
      declineIndicators,
      cycleAnalysis
    };
  }

  // Helper methods for various analyses

  private calculateEvolutionStrength(
    adoption: any,
    evolution: any,
    velocity: any,
    virality: any
  ): number {
    const adoptionScore = Math.min(adoption.adoptionVelocity * 0.1, 1);
    const complexityScore = evolution.complexityProgression.length * 0.1;
    const velocityScore = Math.abs(velocity.velocityMetrics.instantaneousVelocity) * 0.5;
    const viralityScore = virality.networkEffects.networkDensity * 0.3;
    
    return Math.max(-1, Math.min(1, adoptionScore + complexityScore + velocityScore + viralityScore));
  }

  private calculateConfidence(emojis: string[], input: TextInput): number {
    const diversityScore = new Set(emojis).size / Math.max(emojis.length, 1);
    const historicalDataScore = Math.min(this.emojiHistory.size / 100, 1);
    const contextScore = input.text.length > 50 ? 0.8 : 0.5;
    
    return (diversityScore + historicalDataScore + contextScore) / 3;
  }

  private getSurroundingContext(text: string, emoji: string, index: number): string {
    const emojiIndex = text.indexOf(emoji);
    const start = Math.max(0, emojiIndex - 20);
    const end = Math.min(text.length, emojiIndex + emoji.length + 20);
    return text.slice(start, end);
  }

  private calculateContextualSentiment(context: string, emoji: string): number {
    const baseSentiment = this.emojiSentiments.get(emoji) || 0;
    const contextModifier = this.analyzeContextSentiment(context);
    return Math.max(-1, Math.min(1, baseSentiment + contextModifier * 0.2));
  }

  private analyzeContextSentiment(context: string): number {
    const positiveWords = ['great', 'amazing', 'awesome', 'love', 'best', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible'];
    
    const lowerContext = context.toLowerCase();
    const positiveCount = positiveWords.reduce((count, word) => 
      count + (lowerContext.includes(word) ? 1 : 0), 0
    );
    const negativeCount = negativeWords.reduce((count, word) => 
      count + (lowerContext.includes(word) ? 1 : 0), 0
    );
    
    return (positiveCount - negativeCount) * 0.5;
  }

  private detectRegion(input: TextInput): string {
    // Simple region detection based on metadata or patterns
    if (input.metadata?.region) {
      return input.metadata.region;
    }
    
    // Default to western for now
    return 'western';
  }

  private determineEvolutionStage(history: EmojiHistory): 'simple' | 'compound' | 'complex' | 'meta' {
    if (history.usageCount < 10) return 'simple';
    if (history.regions.size < 3) return 'compound';
    if (history.contexts.length < 50) return 'complex';
    return 'meta';
  }

  private getPreviousAdoptionRate(): number {
    // Simplified - return cached rate or default
    return 0.5;
  }

  private calculateAverageAdoptionLatency(): number {
    const histories = Array.from(this.emojiHistory.values());
    if (histories.length === 0) return 0;
    
    const now = new Date();
    const latencies = histories.map(h => now.getTime() - h.firstSeen.getTime());
    return latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
  }

  // Placeholder implementations for complex analysis methods
  private analyzeComplexityProgression(emojis: string[]) {
    return emojis.map(emoji => ({
      sequence: emoji,
      progressionStage: 'simple' as const,
      evolutionPath: [emoji],
      sentimentShift: this.emojiSentiments.get(emoji) || 0,
      culturalSignificance: Math.random() * 0.5 + 0.3
    }));
  }

  private findEmergentCombinations(text: string) {
    const combinations = this.extractEmojiCombinations(text);
    return combinations.map(combo => ({
      combination: combo,
      frequency: 1,
      contextualMeaning: 'emerging_pattern',
      viralityScore: Math.random() * 0.8,
      regionOfOrigin: 'unknown'
    }));
  }

  private extractEmojiCombinations(text: string): string[] {
    const emojis = this.extractEmojis(text);
    const combinations: string[] = [];
    
    for (let i = 0; i < emojis.length - 1; i++) {
      combinations.push(emojis[i] + emojis[i + 1]);
    }
    
    return combinations;
  }

  private analyzeSemanticDrift(emojis: string[]) {
    return emojis.map(emoji => ({
      emoji,
      originalMeaning: 'original_context',
      currentMeaning: 'current_context',
      driftDirection: 'neutral' as const,
      driftVelocity: Math.random() * 0.1
    }));
  }

  private calculateCrossoverPotential(region: string, emojis: string[]): number {
    const regionalData = this.regionalData.get(region);
    if (!regionalData) return 0;
    
    const crossoverEmojis = emojis.filter(emoji => 
      !regionalData.dominantEmojis.has(emoji)
    );
    
    return crossoverEmojis.length / Math.max(emojis.length, 1);
  }

  private identifyCulturalBarriers(emojis: string[]) {
    return emojis.map(emoji => ({
      emoji,
      restrictedRegions: ['conservative_regions'],
      culturalSensitivity: Math.random() * 0.5,
      alternativeEmojis: [emoji] // simplified
    }));
  }

  private calculateRegionInfluence() {
    const influence: Record<string, any> = {};
    
    this.regionalData.forEach((data, region) => {
      influence[region] = {
        innovationRate: Math.random() * 10,
        exportRate: Math.random() * 5,
        culturalReach: Math.random()
      };
    });
    
    return influence;
  }

  private calculateEmojiSetSentiment(emojis: string[]): number {
    if (emojis.length === 0) return 0;
    
    const sentiments = emojis.map(emoji => this.emojiSentiments.get(emoji) || 0);
    return sentiments.reduce((sum, sentiment) => sum + sentiment, 0) / sentiments.length;
  }

  private calculateInstantaneousVelocity(history: number[]): number {
    if (history.length < 2) return 0;
    return history[history.length - 1] - history[history.length - 2];
  }

  private calculateAccelerationTrend(history: number[]): number {
    if (history.length < 3) return 0;
    const v1 = history[history.length - 1] - history[history.length - 2];
    const v2 = history[history.length - 2] - history[history.length - 3];
    return v1 - v2;
  }

  private calculateMomentumIndicator(history: number[]): number {
    if (history.length < 5) return 0;
    const recent = history.slice(-5);
    const trend = recent[recent.length - 1] - recent[0];
    return Math.max(-1, Math.min(1, trend));
  }

  private calculateVolatilityIndex(history: number[]): number {
    if (history.length < 2) return 0;
    
    const diffs = history.slice(1).map((val, i) => Math.abs(val - history[i]));
    const avgDiff = diffs.reduce((sum, diff) => sum + diff, 0) / diffs.length;
    return Math.min(1, avgDiff);
  }

  private analyzeTemporalPatterns(history: number[]) {
    return [
      {
        timeWindow: '1h',
        averageVelocity: this.calculateInstantaneousVelocity(history),
        peakVelocity: Math.max(...history.slice(-10).map((_, i, arr) => 
          i === 0 ? 0 : arr[i] - arr[i - 1]
        )),
        trendDirection: 'stable' as const,
        cyclicalPatterns: ['hourly_cycle']
      }
    ];
  }

  private analyzeContextualVelocity(emojis: string[], input: TextInput) {
    const contexts = ['financial', 'social', 'cultural', 'technical'] as const;
    const contextVelocity: Record<string, any> = {};
    
    contexts.forEach(context => {
      contextVelocity[context] = {
        context,
        velocityMultiplier: Math.random() * 2,
        stabilityFactor: Math.random(),
        predictabilityScore: Math.random()
      };
    });
    
    return contextVelocity;
  }

  private analyzeSpreadPatterns(emojis: string[], input: TextInput) {
    return emojis.map(emoji => ({
      emoji,
      initialSource: input.source,
      spreadRadius: Math.floor(Math.random() * 6) + 1,
      peakReach: Math.floor(Math.random() * 10000) + 100,
      halfLife: Math.floor(Math.random() * 24) + 1,
      reproductionRate: Math.random() * 3 + 0.5
    }));
  }

  private analyzeMemeticFitness(emojis: string[]) {
    return emojis.map(emoji => ({
      emojiPattern: emoji,
      adaptability: Math.random(),
      memorability: Math.random(),
      shareability: Math.random(),
      longevity: Math.random() * 168, // up to 1 week
      mutationRate: Math.random() * 0.1
    }));
  }

  private analyzeNetworkEffects(emojis: string[], input: TextInput) {
    return {
      criticalMass: Math.floor(Math.random() * 1000) + 100,
      networkDensity: Math.random(),
      influenceHubs: ['hub1', 'hub2', 'hub3'],
      cascadeThreshold: Math.random() * 0.5 + 0.1
    };
  }

  private analyzeCompetitiveEmojis(emojis: string[]) {
    return emojis.map(emoji => ({
      emoji,
      competitors: this.findSimilarEmojis(emoji),
      marketShare: Math.random(),
      disruptionPotential: Math.random(),
      survivabilityScore: Math.random()
    }));
  }

  private findSimilarEmojis(emoji: string): string[] {
    // Simplified - return some related emojis
    const similarGroups = {
      '😂': ['😆', '🤣', '😹'],
      '❤️': ['💙', '💚', '💛', '💜'],
      '🔥': ['💥', '⚡', '✨', '💫'],
      '🚀': ['📈', '⬆️', '📊', '💹']
    };
    
    return similarGroups[emoji as keyof typeof similarGroups] || [];
  }

  private identifyEmergingTrends(emojis: string[]) {
    return emojis.slice(0, 3).map(emoji => ({
      pattern: emoji,
      confidence: Math.random(),
      estimatedPeakTime: new Date(Date.now() + Math.random() * 86400000),
      expectedDuration: Math.floor(Math.random() * 48) + 1,
      targetDemographics: ['gen_z', 'millennials'],
      culturalFactors: ['social_media', 'current_events']
    }));
  }

  private identifyDeclineIndicators() {
    const decliningEmojis = ['📱', '💾', '📼']; // outdated tech emojis
    
    return decliningEmojis.map(emoji => ({
      emoji,
      declineRate: Math.random() * -0.1,
      replacementCandidates: this.findSimilarEmojis(emoji),
      obsolescenceScore: Math.random(),
      nostalgiaValue: Math.random()
    }));
  }

  private analyzeCycles(emojis: string[], input: TextInput) {
    return {
      seasonalPatterns: {
        'spring': 1.2,
        'summer': 1.5,
        'fall': 0.8,
        'winter': 0.9
      },
      eventCorrelations: [
        {
          event: 'market_pump',
          emojiSpikes: ['🚀', '📈', '💎'],
          correlation: 0.8,
          leadTime: -2 // 2 hours before event
        }
      ],
      generationalDivides: {
        'gen_z': {
          generation: 'gen_z',
          preferredEmojis: ['💀', '😭', '🤡', '✨'],
          adoptionRate: 0.9,
          innovationContribution: 0.7
        },
        'millennials': {
          generation: 'millennials',
          preferredEmojis: ['😂', '🔥', '💯', '👏'],
          adoptionRate: 0.6,
          innovationContribution: 0.4
        }
      }
    };
  }
}