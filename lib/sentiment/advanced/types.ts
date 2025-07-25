// Advanced Sentiment Signal Types

export interface SignalMetadata {
  timestamp: Date;
  confidence: number; // 0-1
  source: string;
  processingTime: number; // milliseconds
}

export interface BaseSignal {
  id: string;
  type: SignalType;
  strength: number; // -1 to 1 (negative = bearish, positive = bullish)
  metadata: SignalMetadata;
}

export enum SignalType {
  URGENCY = 'URGENCY',
  FEAR = 'FEAR',
  EXCITEMENT = 'EXCITEMENT',
  UNCERTAINTY = 'UNCERTAINTY',
  CONFIDENCE = 'CONFIDENCE',
  FOMO = 'FOMO',
  PANIC = 'PANIC',
  GREED = 'GREED',
  HOPE = 'HOPE',
  DESPAIR = 'DESPAIR',
  EUPHORIA = 'EUPHORIA',
  CAPITULATION = 'CAPITULATION',
  DISBELIEF = 'DISBELIEF',
  COMPLACENCY = 'COMPLACENCY',
  MOMENTUM_SHIFT = 'MOMENTUM_SHIFT',
  CROSS_LANGUAGE_ARBITRAGE = 'CROSS_LANGUAGE_ARBITRAGE',
  INFLUENCER_NETWORK = 'INFLUENCER_NETWORK',
  SMART_MONEY = 'SMART_MONEY',
  REPLY_GUY = 'REPLY_GUY',
  EMOJI_EVOLUTION = 'EMOJI_EVOLUTION'
}

// Individual Signal Interfaces
export interface UrgencySignal extends BaseSignal {
  type: SignalType.URGENCY;
  indicators: {
    exclamationCount: number;
    capsRatio: number;
    timeRelatedWords: string[];
    urgencyScore: number;
  };
}

export interface FearSignal extends BaseSignal {
  type: SignalType.FEAR;
  indicators: {
    fearWords: string[];
    negativeIntensity: number;
    uncertaintyLevel: number;
    riskMentions: number;
  };
}

export interface ExcitementSignal extends BaseSignal {
  type: SignalType.EXCITEMENT;
  indicators: {
    positiveEmotions: string[];
    exclamationIntensity: number;
    enthusiasmLevel: number;
    positiveSuperlatives: string[];
  };
}

export interface UncertaintySignal extends BaseSignal {
  type: SignalType.UNCERTAINTY;
  indicators: {
    questionCount: number;
    hedgingWords: string[];
    conditionalStatements: number;
    uncertaintyKeywords: string[];
  };
}

export interface ConfidenceSignal extends BaseSignal {
  type: SignalType.CONFIDENCE;
  indicators: {
    assertiveStatements: number;
    certaintyWords: string[];
    factualClaims: number;
    confidenceScore: number;
  };
}

export interface FOMOSignal extends BaseSignal {
  type: SignalType.FOMO;
  indicators: {
    missedOpportunityPhrases: string[];
    comparisonToOthers: number;
    timeScarcity: boolean;
    regretIndicators: string[];
  };
}

export interface PanicSignal extends BaseSignal {
  type: SignalType.PANIC;
  indicators: {
    panicKeywords: string[];
    rapidSentimentShift: boolean;
    extremeNegativeWords: string[];
    sellPressure: number;
  };
}

export interface GreedSignal extends BaseSignal {
  type: SignalType.GREED;
  indicators: {
    profitFocus: number;
    unrealisticExpectations: string[];
    greedKeywords: string[];
    leverageMentions: number;
  };
}

export interface HopeSignal extends BaseSignal {
  type: SignalType.HOPE;
  indicators: {
    futureTensePositive: string[];
    hopefulPhrases: string[];
    recoveryMentions: number;
    optimismLevel: number;
  };
}

export interface DespairSignal extends BaseSignal {
  type: SignalType.DESPAIR;
  indicators: {
    defeatistLanguage: string[];
    givingUpPhrases: string[];
    extremeNegativeOutlook: number;
    hopelessnessScore: number;
  };
}

export interface EuphoriaSignal extends BaseSignal {
  type: SignalType.EUPHORIA;
  indicators: {
    extremePositiveWords: string[];
    unrealisticOptimism: number;
    celebratoryLanguage: string[];
    euphoriaIntensity: number;
  };
}

export interface CapitulationSignal extends BaseSignal {
  type: SignalType.CAPITULATION;
  indicators: {
    surrenderPhrases: string[];
    acceptanceLoss: boolean;
    exitLanguage: string[];
    defeatScore: number;
  };
}

export interface DisbeliefSignal extends BaseSignal {
  type: SignalType.DISBELIEF;
  indicators: {
    denialPhrases: string[];
    skepticismLevel: number;
    contradictionWords: string[];
    disbeliefIntensity: number;
  };
}

export interface ComplacencySignal extends BaseSignal {
  type: SignalType.COMPLACENCY;
  indicators: {
    lackOfConcern: number;
    dismissiveLanguage: string[];
    overconfidence: number;
    complacencyKeywords: string[];
  };
}

export interface MomentumShiftSignal extends BaseSignal {
  type: SignalType.MOMENTUM_SHIFT;
  indicators: {
    sentimentDelta: number;
    volumeChange: number;
    toneShift: string;
    pivotKeywords: string[];
  };
}

export interface CrossLanguageArbitrageSignal extends BaseSignal {
  type: SignalType.CROSS_LANGUAGE_ARBITRAGE;
  indicators: {
    primaryLanguage: string;
    secondaryLanguages: string[];
    translationLag: number; // milliseconds
    sentimentSpread: number; // -1 to 1
    regionalPremium: number; // percentage
    languageVelocity: Record<string, number>;
    crossLingualCorrelation: number;
    arbitrageOpportunity: {
      direction: 'bullish' | 'bearish';
      confidence: number;
      estimatedDuration: number; // milliseconds
    };
  };
}

export interface InfluencerNetworkSignal extends BaseSignal {
  type: SignalType.INFLUENCER_NETWORK;
  indicators: {
    networkMetrics: {
      totalNodes: number;
      avgDegree: number;
      density: number;
      centralityScore: number;
    };
    influencerTiers: {
      mega: string[]; // >100k followers
      macro: string[]; // 10k-100k followers
      micro: string[]; // 1k-10k followers
      nano: string[]; // <1k followers
    };
    propagationPaths: Array<{
      source: string;
      targets: string[];
      timestamp: Date;
      velocity: number; // mentions/hour
    }>;
    patientZeroAccounts: Array<{
      account: string;
      firstMention: Date;
      followersAtTime: number;
      prePumpTiming: number; // hours before pump
    }>;
    coordinationIndicators: {
      alignmentScore: number; // 0-1
      temporalClustering: number; // 0-1
      messageSimiliarity: number; // 0-1
      suspiciousPatterns: string[];
    };
    influenceFlow: {
      direction: 'concentrated' | 'distributed';
      flowRate: number; // messages/hour
      criticalMass: boolean;
      tippingPoint: Date | null;
    };
  };
}

export interface SmartMoneySignal extends BaseSignal {
  type: SignalType.SMART_MONEY;
  indicators: {
    whalePatterns: Array<{
      address: string;
      sentimentCorrelation: number;
      transactionPattern: string;
      influenceScore: number;
    }>;
    developerCorrelation: {
      activitySpikes: Array<{
        timestamp: Date;
        intensity: number;
        correlatedWallets: string[];
        priceImpact?: number;
      }>;
      priceCorrelation: number;
      commitPatterns: string[];
    };
    accumulationPatterns: Array<{
      project: string;
      startDate: Date;
      duration: number; // hours
      walletCount: number;
      averagePosition: string;
      sentimentDivergence: number;
      socialSilence: boolean;
      characteristics: string[];
    }>;
    smartMoneyEngagement: {
      knownAddresses: string[];
      engagementTypes: string[];
      socialCorrelation: number;
      timing: 'early' | 'peak' | 'late';
    };
    githubCorrelation: {
      repoActivity: Record<string, {
        commits: number;
        stars: number;
        sentiment: number;
      }>;
      developerMetrics: {
        totalDevelopers: number;
        activeDevelopers: number;
        avgContribution: number;
        uniqueRepos: number;
      };
      buzzPatterns: string[];
    };
    silentAccumulation: {
      detected: boolean;
      patterns: Array<{
        project: string;
        duration: number;
        walletCount: number;
        socialSilenceScore: number;
      }>;
      projects: string[];
      averageDuration: number; // hours
    };
  };
}

export interface ReplyGuySignal extends BaseSignal {
  type: SignalType.REPLY_GUY;
  indicators: {
    responseMetrics: {
      totalResponses: number;
      uniqueAuthors: number;
      botToHumanRatio: number;
      averageResponseTime: number; // seconds
      responseVelocity: number; // responses per minute
    };
    qualityMetrics: {
      averageLength: number;
      averageComplexity: number;
      uniquenessScore: number; // 0-1
      relevanceScore: number; // 0-1
      templateDetection: number; // 0-1
    };
    botIndicators: {
      suspiciousAccounts: Array<{
        account: string;
        botScore: number; // 0-1
        patterns: string[];
        creationDate?: Date;
        followersRatio?: number;
      }>;
      coordinationScore: number; // 0-1
      temporalClustering: number; // 0-1
      linguisticSimilarity: number; // 0-1
    };
    engagementAuthenticity: {
      organicScore: number; // 0-1
      manipulationIndicators: string[];
      naturalConversationFlow: number; // 0-1
      diversityIndex: number; // 0-1
    };
    trendAnalysis: {
      growthPattern: 'organic' | 'artificial' | 'mixed';
      spikesDetected: Array<{
        timestamp: Date;
        intensity: number;
        suspicionLevel: number;
        likelySource: 'organic' | 'bot' | 'coordinated';
      }>;
      sustainabilityScore: number; // 0-1
      viralPotential: number; // 0-1
    };
    contentPatterns: {
      genericResponses: number;
      copypastaPhrases: string[];
      shillKeywords: string[];
      promotionalContent: number;
      authenticEngagement: number;
    };
  };
}

export interface EmojiEvolutionSignal extends BaseSignal {
  type: SignalType.EMOJI_EVOLUTION;
  indicators: {
    adoptionMetrics: {
      newEmojiCount: number;
      adoptionRate: number; // emojis per hour
      adoptionVelocity: number; // rate change
      firstSeenTimestamp: Date[];
      adoptionLatency: number; // milliseconds from first appearance
    };
    evolutionPatterns: {
      complexityProgression: Array<{
        sequence: string;
        progressionStage: 'simple' | 'compound' | 'complex' | 'meta';
        evolutionPath: string[];
        sentimentShift: number; // -1 to 1
        culturalSignificance: number; // 0-1
      }>;
      emergentCombinations: Array<{
        combination: string;
        frequency: number;
        contextualMeaning: string;
        viralityScore: number; // 0-1
        regionOfOrigin?: string;
      }>;
      semanticDrift: Array<{
        emoji: string;
        originalMeaning: string;
        currentMeaning: string;
        driftDirection: 'positive' | 'negative' | 'neutral';
        driftVelocity: number;
      }>;
    };
    regionalPatterns: {
      culturalClusters: Record<string, {
        dominantEmojis: string[];
        uniqueUsagePatterns: string[];
        culturalContext: string;
        adoptionSpeed: number;
        crossoverPotential: number; // 0-1
      }>;
      geographicDistribution: Record<string, number>; // region -> usage intensity
      culturalBarriers: Array<{
        emoji: string;
        restrictedRegions: string[];
        culturalSensitivity: number; // 0-1
        alternativeEmojis: string[];
      }>;
      regionInfluence: Record<string, {
        innovationRate: number; // new patterns per hour
        exportRate: number; // patterns adopted elsewhere
        culturalReach: number; // 0-1
      }>;
    };
    sentimentVelocity: {
      velocityMetrics: {
        instantaneousVelocity: number; // current sentiment change rate
        accelerationTrend: number; // velocity change rate
        momentumIndicator: number; // sustained direction strength
        volatilityIndex: number; // sentiment stability measure
      };
      temporalPatterns: Array<{
        timeWindow: string; // '1h', '24h', '7d'
        averageVelocity: number;
        peakVelocity: number;
        trendDirection: 'accelerating' | 'decelerating' | 'stable';
        cyclicalPatterns: string[];
      }>;
      contextualVelocity: Record<string, {
        context: 'financial' | 'social' | 'cultural' | 'technical';
        velocityMultiplier: number;
        stabilityFactor: number;
        predictabilityScore: number; // 0-1
      }>;
    };
    viralityMetrics: {
      spreadPatterns: Array<{
        emoji: string;
        initialSource: string;
        spreadRadius: number; // degrees of separation
        peakReach: number; // maximum simultaneous users
        halfLife: number; // hours to 50% decay
        reproductionRate: number; // R0 equivalent
      }>;
      memeticFitness: Array<{
        emojiPattern: string;
        adaptability: number; // 0-1
        memorability: number; // 0-1
        shareability: number; // 0-1
        longevity: number; // expected lifespan in hours
        mutationRate: number; // variation frequency
      }>;
      networkEffects: {
        criticalMass: number; // users needed for viral spread
        networkDensity: number; // connectivity measure
        influenceHubs: string[]; // key propagation nodes
        cascadeThreshold: number; // tipping point
      };
      competitiveAnalysis: Array<{
        emoji: string;
        competitors: string[]; // similar meaning emojis
        marketShare: number; // 0-1
        disruptionPotential: number; // 0-1
        survivabilityScore: number; // 0-1
      }>;
    };
    trendPrediction: {
      emergingTrends: Array<{
        pattern: string;
        confidence: number; // 0-1
        estimatedPeakTime: Date;
        expectedDuration: number; // hours
        targetDemographics: string[];
        culturalFactors: string[];
      }>;
      declineIndicators: Array<{
        emoji: string;
        declineRate: number; // usage decrease per hour
        replacementCandidates: string[];
        obsolescenceScore: number; // 0-1
        nostalgiaValue: number; // 0-1
      }>;
      cycleAnalysis: {
        seasonalPatterns: Record<string, number>; // season -> usage multiplier
        eventCorrelations: Array<{
          event: string;
          emojiSpikes: string[];
          correlation: number; // -1 to 1
          leadTime: number; // hours before/after event
        }>;
        generationalDivides: Record<string, {
          generation: string;
          preferredEmojis: string[];
          adoptionRate: number;
          innovationContribution: number;
        }>;
      };
    };
  };
}

// Union type for all signals
export type AdvancedSignal = 
  | UrgencySignal
  | FearSignal
  | ExcitementSignal
  | UncertaintySignal
  | ConfidenceSignal
  | FOMOSignal
  | PanicSignal
  | GreedSignal
  | HopeSignal
  | DespairSignal
  | EuphoriaSignal
  | CapitulationSignal
  | DisbeliefSignal
  | ComplacencySignal
  | MomentumShiftSignal
  | CrossLanguageArbitrageSignal
  | InfluencerNetworkSignal
  | SmartMoneySignal
  | ReplyGuySignal
  | EmojiEvolutionSignal;

// Detection Configuration
export interface DetectorConfig {
  enabled: boolean;
  sensitivity: number; // 0-1
  minConfidence: number; // 0-1
  debugMode?: boolean;
}

export interface SignalDetectorConfig {
  [SignalType.URGENCY]: DetectorConfig;
  [SignalType.FEAR]: DetectorConfig;
  [SignalType.EXCITEMENT]: DetectorConfig;
  [SignalType.UNCERTAINTY]: DetectorConfig;
  [SignalType.CONFIDENCE]: DetectorConfig;
  [SignalType.FOMO]: DetectorConfig;
  [SignalType.PANIC]: DetectorConfig;
  [SignalType.GREED]: DetectorConfig;
  [SignalType.HOPE]: DetectorConfig;
  [SignalType.DESPAIR]: DetectorConfig;
  [SignalType.EUPHORIA]: DetectorConfig;
  [SignalType.CAPITULATION]: DetectorConfig;
  [SignalType.DISBELIEF]: DetectorConfig;
  [SignalType.COMPLACENCY]: DetectorConfig;
  [SignalType.MOMENTUM_SHIFT]: DetectorConfig;
  [SignalType.CROSS_LANGUAGE_ARBITRAGE]: DetectorConfig;
  [SignalType.INFLUENCER_NETWORK]: DetectorConfig;
  [SignalType.SMART_MONEY]: DetectorConfig;
  [SignalType.REPLY_GUY]: DetectorConfig;
  [SignalType.EMOJI_EVOLUTION]: DetectorConfig;
}

// Analysis Results
export interface SignalAnalysisResult {
  signals: AdvancedSignal[];
  aggregateScore: number; // -1 to 1
  dominantSignal: SignalType | null;
  signalDistribution: Record<SignalType, number>;
  timestamp: Date;
  processingTime: number;
}

// Input Types
export interface TextInput {
  text: string;
  source: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
  author?: string;
  mentions?: string[];
  retweets?: string[];
  followers?: number;
  sentiment?: number; // -1 to 1
}

export interface BatchTextInput {
  texts: TextInput[];
  aggregationMethod?: 'average' | 'weighted' | 'max';
}

// Detector Interface
export interface ISignalDetector {
  type: SignalType;
  config: DetectorConfig;
  detect(input: TextInput): Promise<AdvancedSignal | null>;
  detectBatch(inputs: TextInput[]): Promise<AdvancedSignal[]>;
  updateConfig(config: Partial<DetectorConfig>): void;
}

// Orchestrator Interface
export interface ISignalOrchestrator {
  analyze(input: TextInput): Promise<SignalAnalysisResult>;
  analyzeBatch(input: BatchTextInput): Promise<SignalAnalysisResult>;
  updateDetectorConfig(type: SignalType, config: Partial<DetectorConfig>): void;
  getActiveDetectors(): SignalType[];
  getConfig(): SignalDetectorConfig;
}

// Utilities
export interface SignalAggregator {
  aggregate(signals: AdvancedSignal[]): {
    score: number;
    dominant: SignalType | null;
    distribution: Record<SignalType, number>;
  };
}

export interface SignalValidator {
  validate(signal: AdvancedSignal): boolean;
  validateBatch(signals: AdvancedSignal[]): AdvancedSignal[];
}