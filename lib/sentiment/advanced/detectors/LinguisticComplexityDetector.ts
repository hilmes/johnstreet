import { BaseSignalDetector } from '../BaseSignalDetector';
import { SignalType, TextInput, LinguisticComplexitySignal } from '../types';

interface VocabularyMetrics {
  uniqueWords: number;
  totalWords: number;
  averageWordLength: number;
  syllableComplexity: number;
  sentenceLength: number;
  lexicalDiversity: number; // Type-token ratio
  hapaxLegomena: number; // Words appearing only once
  sophisticationScore: number;
}

interface TechnicalLanguageMetrics {
  technicalTermCount: number;
  acronymCount: number;
  jargonDensity: number;
  domainSpecificity: number;
  expertiseLevel: 'novice' | 'intermediate' | 'expert' | 'professional';
  technicalAccuracy: number;
  conceptualDensity: number;
}

interface LanguageEvolution {
  timestamp: Date;
  complexityScore: number;
  technicalLevel: number;
  vocabularyRichness: number;
  narrativeType: 'technical' | 'analytical' | 'promotional' | 'hype' | 'educational';
  audienceTarget: 'retail' | 'professional' | 'mixed';
}

interface NarrativePattern {
  type: 'simplification' | 'complexification' | 'stable' | 'oscillating';
  startComplexity: number;
  endComplexity: number;
  duration: number; // hours
  velocityOfChange: number;
  inflectionPoints: Array<{
    timestamp: Date;
    fromLevel: number;
    toLevel: number;
    trigger?: string;
  }>;
}

interface AcronymAdoption {
  acronym: string;
  firstSeen: Date;
  adoptionRate: number; // mentions per hour
  contextQuality: number; // How well it's explained
  spreadVelocity: number;
  communityPenetration: number;
}

interface RetailWaveIndicator {
  probability: number;
  timeToArrival: number; // hours
  indicators: string[];
  languageShift: {
    from: string;
    to: string;
    magnitude: number;
  };
  simplificationVelocity: number;
  hypeLanguageRatio: number;
}

/**
 * Analyzes linguistic complexity as a smart money indicator
 * Tracks the evolution from technical to simplified language
 */
export class LinguisticComplexityDetector extends BaseSignalDetector {
  private languageEvolution: Map<string, LanguageEvolution[]> = new Map(); // By topic/project
  private vocabularyTracking: Map<string, Set<string>> = new Map();
  private acronymTracking: Map<string, AcronymAdoption> = new Map();
  private narrativePatterns: Map<string, NarrativePattern[]> = new Map();
  private timeWindow = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  // Technical vocabulary database
  private readonly technicalTerms = new Set([
    // Blockchain/Crypto
    'consensus', 'byzantine', 'merkle', 'nonce', 'sharding', 'rollup',
    'zk-snark', 'zk-stark', 'homomorphic', 'cryptographic', 'hash',
    'elliptic', 'curve', 'signature', 'deterministic', 'probabilistic',
    'finality', 'liveness', 'safety', 'fork', 'reorg', 'uncle',
    'mempool', 'gas', 'wei', 'gwei', 'slashing', 'attestation',
    'validator', 'proposer', 'committee', 'epoch', 'slot',
    
    // DeFi
    'liquidity', 'slippage', 'impermanent', 'arbitrage', 'yield',
    'collateralization', 'leverage', 'liquidation', 'oracle', 'flash',
    'amm', 'clmm', 'dex', 'cex', 'tvl', 'apy', 'apr', 'il',
    
    // Technical Analysis
    'resistance', 'support', 'fibonacci', 'retracement', 'divergence',
    'convergence', 'momentum', 'volatility', 'correlation', 'deviation',
    'regression', 'distribution', 'accumulation', 'wyckoff', 'elliott'
  ]);
  
  // Hype/Retail language indicators
  private readonly hypeIndicators = new Set([
    'moon', 'lambo', 'rocket', 'gem', 'pump', 'fomo', 'yolo',
    'hodl', 'diamond hands', 'paper hands', 'ape', 'degen',
    'to the moon', '100x', '1000x', 'millionaire', 'rich',
    'buy now', 'last chance', 'don\'t miss', 'explode', 'skyrocket',
    'guaranteed', 'easy money', 'free money', 'next bitcoin'
  ]);
  
  // Common acronyms and their adoption patterns
  private readonly trackedAcronyms = new Set([
    'TVL', 'APY', 'APR', 'IL', 'LP', 'AMM', 'DEX', 'CEX',
    'DAO', 'DeFi', 'NFT', 'L1', 'L2', 'ZK', 'EVM', 'MEV',
    'TVL', 'MC', 'FDV', 'P2E', 'PFP', 'WAGMI', 'NGMI'
  ]);
  
  // Narrative simplification patterns
  private readonly simplificationIndicators = [
    { from: 'automated market maker', to: 'AMM', score: 0.1 },
    { from: 'impermanent loss', to: 'IL', score: 0.1 },
    { from: 'decentralized exchange', to: 'DEX', score: 0.1 },
    { from: 'total value locked', to: 'TVL', score: 0.1 },
    { from: 'complex technical analysis', to: 'buy signal', score: 0.3 },
    { from: 'risk-adjusted returns', to: 'profits', score: 0.4 },
    { from: 'market microstructure', to: 'price action', score: 0.3 },
    { from: 'liquidity provisioning', to: 'farming', score: 0.3 },
    { from: 'cryptographic proof', to: 'secure', score: 0.5 },
    { from: 'consensus mechanism', to: 'how it works', score: 0.5 }
  ];

  constructor() {
    super(SignalType.LINGUISTIC_COMPLEXITY);
  }

  protected async performDetection(input: TextInput): Promise<LinguisticComplexitySignal | null> {
    // Analyze the linguistic complexity of the input
    const vocabularyMetrics = this.analyzeVocabulary(input.text);
    const technicalMetrics = this.analyzeTechnicalLanguage(input.text);
    
    // Extract topic/project from text
    const topic = this.extractTopic(input.text);
    
    // Track language evolution
    this.trackLanguageEvolution(topic, input, vocabularyMetrics, technicalMetrics);
    
    // Track acronym adoption
    this.trackAcronymAdoption(input.text, input.timestamp || new Date());
    
    // Clean old data
    this.cleanOldData();
    
    // Check if we have enough data for pattern detection
    const evolution = this.languageEvolution.get(topic) || [];
    if (evolution.length < 5) {
      this.debug('Insufficient language evolution data', {
        topic,
        dataPoints: evolution.length
      });
      return null;
    }
    
    // Analyze narrative patterns
    const narrativePatterns = this.analyzeNarrativePatterns(topic);
    
    // Calculate complexity score
    const complexityScore = this.calculateComplexityScore(vocabularyMetrics, technicalMetrics);
    
    // Detect narrative shifts
    const narrativeShifts = this.detectNarrativeShifts(topic);
    
    // Analyze jargon adoption rates
    const jargonAdoption = this.analyzeJargonAdoption();
    
    // Measure expertise indicators
    const expertiseIndicators = this.measureExpertiseIndicators(technicalMetrics);
    
    // Predict retail wave
    const retailWavePrediction = this.predictRetailWave(topic);
    
    // Identify simplification velocity
    const simplificationVelocity = this.calculateSimplificationVelocity(topic);
    
    // Calculate signal strength
    const strength = this.calculateSignalStrength(
      complexityScore,
      narrativeShifts,
      retailWavePrediction,
      simplificationVelocity
    );
    
    // Check if signal is significant
    if (Math.abs(strength) < 0.35) {
      this.debug('Linguistic complexity signal too weak', { strength });
      return null;
    }
    
    // Calculate confidence
    const confidence = this.calculateConfidence(
      evolution.length,
      narrativePatterns,
      jargonAdoption
    );

    return {
      id: this.generateSignalId(),
      type: SignalType.LINGUISTIC_COMPLEXITY,
      strength,
      metadata: this.createMetadata(confidence, input.source),
      indicators: {
        complexityScore,
        vocabularyMetrics,
        technicalMetrics,
        narrativeShifts,
        jargonAdoption,
        expertiseIndicators,
        retailWavePrediction,
        simplificationVelocity
      }
    };
  }

  /**
   * Analyze vocabulary complexity and richness
   */
  private analyzeVocabulary(text: string): VocabularyMetrics {
    const words = this.tokenizeText(text);
    const sentences = this.splitSentences(text);
    
    // Calculate unique words (case-insensitive)
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    
    // Calculate average word length
    const totalLength = words.reduce((sum, word) => sum + word.length, 0);
    const averageWordLength = words.length > 0 ? totalLength / words.length : 0;
    
    // Estimate syllable complexity
    const syllableComplexity = this.calculateSyllableComplexity(words);
    
    // Calculate average sentence length
    const sentenceLength = sentences.length > 0 
      ? words.length / sentences.length 
      : words.length;
    
    // Calculate lexical diversity (Type-Token Ratio)
    const lexicalDiversity = words.length > 0 
      ? uniqueWords.size / words.length 
      : 0;
    
    // Count hapax legomena (words appearing only once)
    const wordFrequency = new Map<string, number>();
    words.forEach(word => {
      const lower = word.toLowerCase();
      wordFrequency.set(lower, (wordFrequency.get(lower) || 0) + 1);
    });
    const hapaxLegomena = Array.from(wordFrequency.values())
      .filter(count => count === 1).length;
    
    // Calculate sophistication score
    const sophisticationScore = this.calculateSophisticationScore(
      averageWordLength,
      syllableComplexity,
      sentenceLength,
      lexicalDiversity
    );
    
    return {
      uniqueWords: uniqueWords.size,
      totalWords: words.length,
      averageWordLength,
      syllableComplexity,
      sentenceLength,
      lexicalDiversity,
      hapaxLegomena,
      sophisticationScore
    };
  }

  /**
   * Analyze technical language usage
   */
  private analyzeTechnicalLanguage(text: string): TechnicalLanguageMetrics {
    const words = this.tokenizeText(text);
    const lowerText = text.toLowerCase();
    
    // Count technical terms
    let technicalTermCount = 0;
    for (const term of this.technicalTerms) {
      if (lowerText.includes(term)) {
        technicalTermCount++;
      }
    }
    
    // Count acronyms
    const acronymCount = words.filter(word => 
      word.length >= 2 && 
      word === word.toUpperCase() && 
      /^[A-Z]+$/.test(word)
    ).length;
    
    // Calculate jargon density
    const jargonDensity = words.length > 0 
      ? (technicalTermCount + acronymCount) / words.length 
      : 0;
    
    // Assess domain specificity
    const domainSpecificity = this.assessDomainSpecificity(text);
    
    // Determine expertise level
    const expertiseLevel = this.determineExpertiseLevel(
      technicalTermCount,
      jargonDensity,
      domainSpecificity
    );
    
    // Calculate technical accuracy (based on proper term usage)
    const technicalAccuracy = this.assessTechnicalAccuracy(text);
    
    // Calculate conceptual density
    const conceptualDensity = this.calculateConceptualDensity(text);
    
    return {
      technicalTermCount,
      acronymCount,
      jargonDensity,
      domainSpecificity,
      expertiseLevel,
      technicalAccuracy,
      conceptualDensity
    };
  }

  /**
   * Track language evolution over time
   */
  private trackLanguageEvolution(
    topic: string,
    input: TextInput,
    vocabulary: VocabularyMetrics,
    technical: TechnicalLanguageMetrics
  ): void {
    if (!this.languageEvolution.has(topic)) {
      this.languageEvolution.set(topic, []);
    }
    
    const evolution = this.languageEvolution.get(topic)!;
    const timestamp = input.timestamp || new Date();
    
    // Calculate complexity score
    const complexityScore = (vocabulary.sophisticationScore + technical.jargonDensity) / 2;
    
    // Determine narrative type
    const narrativeType = this.determineNarrativeType(input.text, technical);
    
    // Determine audience target
    const audienceTarget = this.determineAudienceTarget(vocabulary, technical);
    
    evolution.push({
      timestamp,
      complexityScore,
      technicalLevel: technical.jargonDensity,
      vocabularyRichness: vocabulary.lexicalDiversity,
      narrativeType,
      audienceTarget
    });
    
    // Keep only recent evolution data
    const cutoff = Date.now() - this.timeWindow;
    this.languageEvolution.set(
      topic,
      evolution.filter(e => e.timestamp.getTime() > cutoff)
    );
  }

  /**
   * Track acronym adoption and spread
   */
  private trackAcronymAdoption(text: string, timestamp: Date): void {
    const words = this.tokenizeText(text);
    
    for (const word of words) {
      if (this.trackedAcronyms.has(word)) {
        if (!this.acronymTracking.has(word)) {
          this.acronymTracking.set(word, {
            acronym: word,
            firstSeen: timestamp,
            adoptionRate: 0,
            contextQuality: 0,
            spreadVelocity: 0,
            communityPenetration: 0
          });
        }
        
        const tracking = this.acronymTracking.get(word)!;
        
        // Update adoption metrics
        const hoursSinceFirst = (timestamp.getTime() - tracking.firstSeen.getTime()) / (60 * 60 * 1000);
        tracking.adoptionRate = hoursSinceFirst > 0 ? 1 / hoursSinceFirst : 1;
        
        // Assess context quality (is it explained?)
        tracking.contextQuality = this.assessAcronymContext(word, text);
        
        // Calculate spread velocity
        tracking.spreadVelocity = this.calculateSpreadVelocity(tracking);
        
        // Estimate community penetration
        tracking.communityPenetration = Math.min(1, tracking.adoptionRate * 10);
      }
    }
  }

  /**
   * Analyze narrative patterns over time
   */
  private analyzeNarrativePatterns(topic: string): NarrativePattern[] {
    const evolution = this.languageEvolution.get(topic) || [];
    if (evolution.length < 2) return [];
    
    const patterns: NarrativePattern[] = [];
    let currentPattern: NarrativePattern | null = null;
    
    for (let i = 1; i < evolution.length; i++) {
      const prev = evolution[i - 1];
      const curr = evolution[i];
      const complexityChange = curr.complexityScore - prev.complexityScore;
      
      // Detect pattern changes
      if (!currentPattern || this.isPatternChange(currentPattern, complexityChange)) {
        if (currentPattern) {
          patterns.push(currentPattern);
        }
        
        currentPattern = {
          type: this.determinePatternType(complexityChange),
          startComplexity: prev.complexityScore,
          endComplexity: curr.complexityScore,
          duration: (curr.timestamp.getTime() - prev.timestamp.getTime()) / (60 * 60 * 1000),
          velocityOfChange: Math.abs(complexityChange),
          inflectionPoints: []
        };
      }
      
      // Track significant changes
      if (Math.abs(complexityChange) > 0.2) {
        currentPattern.inflectionPoints.push({
          timestamp: curr.timestamp,
          fromLevel: prev.complexityScore,
          toLevel: curr.complexityScore,
          trigger: this.identifyTrigger(prev, curr)
        });
      }
      
      // Update pattern metrics
      currentPattern.endComplexity = curr.complexityScore;
      currentPattern.duration = (curr.timestamp.getTime() - evolution[0].timestamp.getTime()) / (60 * 60 * 1000);
    }
    
    if (currentPattern) {
      patterns.push(currentPattern);
    }
    
    // Store patterns
    this.narrativePatterns.set(topic, patterns);
    
    return patterns;
  }

  /**
   * Calculate overall complexity score
   */
  private calculateComplexityScore(
    vocabulary: VocabularyMetrics,
    technical: TechnicalLanguageMetrics
  ): number {
    // Weighted combination of metrics
    const vocabScore = (
      vocabulary.sophisticationScore * 0.3 +
      vocabulary.lexicalDiversity * 0.2 +
      (vocabulary.averageWordLength / 10) * 0.1 +
      (vocabulary.sentenceLength / 30) * 0.1
    );
    
    const techScore = (
      technical.jargonDensity * 0.2 +
      technical.domainSpecificity * 0.2 +
      technical.conceptualDensity * 0.2 +
      technical.technicalAccuracy * 0.1
    );
    
    // Expertise level bonus
    const expertiseBonus = technical.expertiseLevel === 'professional' ? 0.2 :
                          technical.expertiseLevel === 'expert' ? 0.15 :
                          technical.expertiseLevel === 'intermediate' ? 0.05 : 0;
    
    return Math.min(1, vocabScore + techScore + expertiseBonus);
  }

  /**
   * Detect narrative shifts from technical to hype
   */
  private detectNarrativeShifts(topic: string): Array<{
    timestamp: Date;
    shiftType: 'technical_to_hype' | 'hype_to_technical' | 'simplification' | 'complexification';
    magnitude: number;
    velocity: number;
  }> {
    const evolution = this.languageEvolution.get(topic) || [];
    const shifts: Array<{
      timestamp: Date;
      shiftType: 'technical_to_hype' | 'hype_to_technical' | 'simplification' | 'complexification';
      magnitude: number;
      velocity: number;
    }> = [];
    
    for (let i = 1; i < evolution.length; i++) {
      const prev = evolution[i - 1];
      const curr = evolution[i];
      
      // Check for narrative type changes
      if (prev.narrativeType !== curr.narrativeType) {
        const shiftType = this.categorizeShift(prev.narrativeType, curr.narrativeType);
        const magnitude = Math.abs(curr.complexityScore - prev.complexityScore);
        const timeDiff = (curr.timestamp.getTime() - prev.timestamp.getTime()) / (60 * 60 * 1000);
        const velocity = timeDiff > 0 ? magnitude / timeDiff : magnitude;
        
        shifts.push({
          timestamp: curr.timestamp,
          shiftType,
          magnitude,
          velocity
        });
      }
    }
    
    return shifts;
  }

  /**
   * Analyze jargon adoption patterns
   */
  private analyzeJargonAdoption(): {
    adoptionRate: number;
    topAcronyms: Array<{ acronym: string; penetration: number }>;
    maturityLevel: 'emerging' | 'growing' | 'mature' | 'saturated';
    diffusionPattern: 'organic' | 'forced' | 'viral';
  } {
    const acronyms = Array.from(this.acronymTracking.values());
    
    // Calculate average adoption rate
    const adoptionRate = acronyms.length > 0
      ? acronyms.reduce((sum, a) => sum + a.adoptionRate, 0) / acronyms.length
      : 0;
    
    // Get top acronyms by penetration
    const topAcronyms = acronyms
      .sort((a, b) => b.communityPenetration - a.communityPenetration)
      .slice(0, 5)
      .map(a => ({ acronym: a.acronym, penetration: a.communityPenetration }));
    
    // Determine maturity level
    const avgPenetration = acronyms.length > 0
      ? acronyms.reduce((sum, a) => sum + a.communityPenetration, 0) / acronyms.length
      : 0;
    
    const maturityLevel = avgPenetration > 0.8 ? 'saturated' :
                         avgPenetration > 0.6 ? 'mature' :
                         avgPenetration > 0.3 ? 'growing' : 'emerging';
    
    // Analyze diffusion pattern
    const diffusionPattern = this.analyzeDiffusionPattern(acronyms);
    
    return {
      adoptionRate,
      topAcronyms,
      maturityLevel,
      diffusionPattern
    };
  }

  /**
   * Measure expertise indicators
   */
  private measureExpertiseIndicators(technical: TechnicalLanguageMetrics): {
    level: string;
    indicators: string[];
    authenticity: number;
    consistency: number;
  } {
    const indicators: string[] = [];
    
    // Check for expertise indicators
    if (technical.technicalAccuracy > 0.8) {
      indicators.push('high_technical_accuracy');
    }
    
    if (technical.conceptualDensity > 0.7) {
      indicators.push('complex_concept_handling');
    }
    
    if (technical.domainSpecificity > 0.8) {
      indicators.push('deep_domain_knowledge');
    }
    
    if (technical.jargonDensity > 0.15 && technical.jargonDensity < 0.4) {
      indicators.push('balanced_technical_communication');
    }
    
    // Calculate authenticity (not trying too hard)
    const authenticity = this.calculateAuthenticity(technical);
    
    // Calculate consistency
    const consistency = this.calculateConsistency(technical);
    
    return {
      level: technical.expertiseLevel,
      indicators,
      authenticity,
      consistency
    };
  }

  /**
   * Predict incoming retail wave based on language simplification
   */
  private predictRetailWave(topic: string): RetailWaveIndicator {
    const evolution = this.languageEvolution.get(topic) || [];
    const patterns = this.narrativePatterns.get(topic) || [];
    
    // Analyze recent trends
    const recentEvolution = evolution.slice(-10);
    if (recentEvolution.length < 3) {
      return {
        probability: 0,
        timeToArrival: Infinity,
        indicators: [],
        languageShift: { from: 'unknown', to: 'unknown', magnitude: 0 },
        simplificationVelocity: 0,
        hypeLanguageRatio: 0
      };
    }
    
    // Calculate simplification trend
    const simplificationTrend = this.calculateSimplificationTrend(recentEvolution);
    
    // Calculate hype language ratio
    const hypeRatio = this.calculateHypeLanguageRatio(recentEvolution);
    
    // Identify retail indicators
    const indicators = this.identifyRetailIndicators(recentEvolution, patterns);
    
    // Calculate probability
    const probability = this.calculateRetailProbability(
      simplificationTrend,
      hypeRatio,
      indicators
    );
    
    // Estimate time to arrival
    const timeToArrival = this.estimateRetailArrival(simplificationTrend, hypeRatio);
    
    // Identify language shift
    const languageShift = this.identifyLanguageShift(recentEvolution);
    
    return {
      probability,
      timeToArrival,
      indicators,
      languageShift,
      simplificationVelocity: simplificationTrend.velocity,
      hypeLanguageRatio: hypeRatio
    };
  }

  /**
   * Calculate simplification velocity
   */
  private calculateSimplificationVelocity(topic: string): number {
    const evolution = this.languageEvolution.get(topic) || [];
    if (evolution.length < 2) return 0;
    
    let totalVelocity = 0;
    let count = 0;
    
    for (let i = 1; i < evolution.length; i++) {
      const prev = evolution[i - 1];
      const curr = evolution[i];
      
      // Only count simplification (negative change)
      const complexityChange = curr.complexityScore - prev.complexityScore;
      if (complexityChange < 0) {
        const timeDiff = (curr.timestamp.getTime() - prev.timestamp.getTime()) / (60 * 60 * 1000);
        const velocity = timeDiff > 0 ? Math.abs(complexityChange) / timeDiff : 0;
        totalVelocity += velocity;
        count++;
      }
    }
    
    return count > 0 ? totalVelocity / count : 0;
  }

  /**
   * Clean old data
   */
  private cleanOldData(): void {
    const cutoff = new Date(Date.now() - this.timeWindow);
    
    // Clean language evolution
    for (const [topic, evolution] of this.languageEvolution.entries()) {
      const filtered = evolution.filter(e => e.timestamp > cutoff);
      if (filtered.length === 0) {
        this.languageEvolution.delete(topic);
      } else {
        this.languageEvolution.set(topic, filtered);
      }
    }
    
    // Clean acronym tracking
    for (const [acronym, tracking] of this.acronymTracking.entries()) {
      if (tracking.firstSeen < cutoff) {
        this.acronymTracking.delete(acronym);
      }
    }
  }

  /**
   * Calculate signal strength
   */
  private calculateSignalStrength(
    complexityScore: number,
    narrativeShifts: any[],
    retailPrediction: RetailWaveIndicator,
    simplificationVelocity: number
  ): number {
    let strength = 0;
    
    // High complexity = smart money present
    if (complexityScore > 0.7) {
      strength += 0.3;
    }
    
    // Narrative shifts indicate transition
    if (narrativeShifts.length > 0) {
      const recentShifts = narrativeShifts.filter(s => 
        s.shiftType === 'technical_to_hype' || s.shiftType === 'simplification'
      );
      strength -= recentShifts.length * 0.1; // Negative for retail incoming
    }
    
    // High retail probability = negative signal
    strength -= retailPrediction.probability * 0.4;
    
    // High simplification velocity = retail wave approaching
    strength -= Math.min(0.3, simplificationVelocity * 2);
    
    return Math.max(-1, Math.min(1, strength));
  }

  /**
   * Calculate confidence in the signal
   */
  private calculateConfidence(
    dataPoints: number,
    patterns: NarrativePattern[],
    jargonAdoption: any
  ): number {
    let confidence = 0.5;
    
    // More data points = higher confidence
    confidence += Math.min(0.2, dataPoints / 50);
    
    // Clear patterns increase confidence
    if (patterns.length > 0) {
      const clearPatterns = patterns.filter(p => 
        p.type !== 'oscillating' && p.velocityOfChange > 0.1
      );
      confidence += Math.min(0.2, clearPatterns.length * 0.05);
    }
    
    // Consistent jargon adoption
    if (jargonAdoption.maturityLevel === 'mature' || jargonAdoption.maturityLevel === 'saturated') {
      confidence += 0.1;
    }
    
    return Math.min(1, confidence);
  }

  // Helper methods

  private tokenizeText(text: string): string[] {
    // Remove punctuation and split by whitespace
    return text
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  private splitSentences(text: string): string[] {
    // Simple sentence splitting
    return text
      .split(/[.!?]+/)
      .filter(s => s.trim().length > 0);
  }

  private calculateSyllableComplexity(words: string[]): number {
    // Simplified syllable counting
    let totalSyllables = 0;
    
    for (const word of words) {
      const syllables = this.countSyllables(word);
      totalSyllables += syllables;
    }
    
    return words.length > 0 ? totalSyllables / words.length : 0;
  }

  private countSyllables(word: string): number {
    // Simple syllable counting algorithm
    word = word.toLowerCase();
    let count = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = /[aeiou]/.test(word[i]);
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }
    
    // Adjust for silent e
    if (word.endsWith('e') && count > 1) {
      count--;
    }
    
    return Math.max(1, count);
  }

  private calculateSophisticationScore(
    avgWordLength: number,
    syllableComplexity: number,
    sentenceLength: number,
    lexicalDiversity: number
  ): number {
    // Normalize and combine metrics
    const wordLengthScore = Math.min(1, avgWordLength / 10);
    const syllableScore = Math.min(1, syllableComplexity / 3);
    const sentenceScore = Math.min(1, sentenceLength / 30);
    const diversityScore = lexicalDiversity;
    
    return (wordLengthScore + syllableScore + sentenceScore + diversityScore) / 4;
  }

  private assessDomainSpecificity(text: string): number {
    const lowerText = text.toLowerCase();
    let specificityScore = 0;
    let termCount = 0;
    
    // Check for domain-specific term combinations
    const domainPairs = [
      ['liquidity', 'pool'],
      ['smart', 'contract'],
      ['consensus', 'mechanism'],
      ['yield', 'farming'],
      ['gas', 'fee'],
      ['private', 'key'],
      ['merkle', 'tree'],
      ['hash', 'function']
    ];
    
    for (const [term1, term2] of domainPairs) {
      if (lowerText.includes(term1) && lowerText.includes(term2)) {
        specificityScore += 0.1;
        termCount++;
      }
    }
    
    return Math.min(1, specificityScore);
  }

  private determineExpertiseLevel(
    technicalTermCount: number,
    jargonDensity: number,
    domainSpecificity: number
  ): TechnicalLanguageMetrics['expertiseLevel'] {
    const score = (technicalTermCount / 10) + jargonDensity + domainSpecificity;
    
    if (score > 0.8) return 'professional';
    if (score > 0.6) return 'expert';
    if (score > 0.3) return 'intermediate';
    return 'novice';
  }

  private assessTechnicalAccuracy(text: string): number {
    // Check for correct usage of technical terms
    let accuracy = 0.5; // Base accuracy
    const lowerText = text.toLowerCase();
    
    // Common misuses to check
    const misuses = [
      { correct: 'impermanent loss', incorrect: 'permanent loss' },
      { correct: 'liquidity provider', incorrect: 'liquidity maker' },
      { correct: 'automated market maker', incorrect: 'automatic market maker' },
      { correct: 'gas fee', incorrect: 'gas price' },
      { correct: 'smart contract', incorrect: 'smart contracts' }
    ];
    
    for (const { correct, incorrect } of misuses) {
      if (lowerText.includes(correct) && !lowerText.includes(incorrect)) {
        accuracy += 0.1;
      } else if (lowerText.includes(incorrect)) {
        accuracy -= 0.1;
      }
    }
    
    return Math.max(0, Math.min(1, accuracy));
  }

  private calculateConceptualDensity(text: string): number {
    const concepts = [
      'mechanism', 'protocol', 'algorithm', 'architecture',
      'implementation', 'optimization', 'security', 'cryptography',
      'consensus', 'scalability', 'interoperability', 'composability'
    ];
    
    const words = this.tokenizeText(text);
    const conceptCount = concepts.filter(c => text.toLowerCase().includes(c)).length;
    
    return Math.min(1, conceptCount / 5); // Normalize to max 5 concepts
  }

  private extractTopic(text: string): string {
    // Extract project/token mentions
    const tokenMatch = text.match(/\$([A-Z]{2,10})/);
    if (tokenMatch) {
      return tokenMatch[1];
    }
    
    // Look for project names
    const projectMatch = text.match(/(?:project|protocol|platform)\s+([A-Z][a-zA-Z]+)/);
    if (projectMatch) {
      return projectMatch[1];
    }
    
    // Default to general topic
    return 'general';
  }

  private determineNarrativeType(
    text: string,
    technical: TechnicalLanguageMetrics
  ): LanguageEvolution['narrativeType'] {
    const lowerText = text.toLowerCase();
    
    // Count hype indicators
    let hypeCount = 0;
    for (const indicator of this.hypeIndicators) {
      if (lowerText.includes(indicator)) {
        hypeCount++;
      }
    }
    
    // Determine based on multiple factors
    if (hypeCount > 3) return 'hype';
    if (hypeCount > 1 && technical.jargonDensity < 0.1) return 'promotional';
    if (technical.expertiseLevel === 'professional') return 'technical';
    if (technical.conceptualDensity > 0.5) return 'analytical';
    
    return 'educational';
  }

  private determineAudienceTarget(
    vocabulary: VocabularyMetrics,
    technical: TechnicalLanguageMetrics
  ): LanguageEvolution['audienceTarget'] {
    // Low complexity + hype = retail
    if (vocabulary.sophisticationScore < 0.3 && technical.jargonDensity < 0.1) {
      return 'retail';
    }
    
    // High complexity + technical = professional
    if (vocabulary.sophisticationScore > 0.7 && technical.expertiseLevel !== 'novice') {
      return 'professional';
    }
    
    return 'mixed';
  }

  private assessAcronymContext(acronym: string, text: string): number {
    // Check if acronym is explained in the text
    const patterns = [
      new RegExp(`${acronym}\\s*\\([^)]+\\)`, 'i'), // TVL (Total Value Locked)
      new RegExp(`[^(]+\\s*\\(${acronym}\\)`, 'i'), // Total Value Locked (TVL)
      new RegExp(`${acronym}(?:\\s+(?:is|means|stands for)\\s+)`, 'i')
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return 1; // Well explained
      }
    }
    
    return 0.5; // Not explained
  }

  private calculateSpreadVelocity(tracking: AcronymAdoption): number {
    const hoursSinceFirst = (Date.now() - tracking.firstSeen.getTime()) / (60 * 60 * 1000);
    return hoursSinceFirst > 0 ? tracking.adoptionRate / hoursSinceFirst : 0;
  }

  private isPatternChange(current: NarrativePattern, complexityChange: number): boolean {
    // Detect if the pattern has changed
    if (current.type === 'simplification' && complexityChange > 0) return true;
    if (current.type === 'complexification' && complexityChange < 0) return true;
    if (Math.abs(complexityChange) < 0.05 && current.type !== 'stable') return true;
    
    return false;
  }

  private determinePatternType(complexityChange: number): NarrativePattern['type'] {
    if (complexityChange < -0.05) return 'simplification';
    if (complexityChange > 0.05) return 'complexification';
    return 'stable';
  }

  private identifyTrigger(prev: LanguageEvolution, curr: LanguageEvolution): string {
    // Identify what might have triggered the change
    if (prev.narrativeType !== curr.narrativeType) {
      return `narrative_shift_${prev.narrativeType}_to_${curr.narrativeType}`;
    }
    
    if (prev.audienceTarget !== curr.audienceTarget) {
      return `audience_shift_${prev.audienceTarget}_to_${curr.audienceTarget}`;
    }
    
    return 'gradual_evolution';
  }

  private categorizeShift(
    from: LanguageEvolution['narrativeType'],
    to: LanguageEvolution['narrativeType']
  ): 'technical_to_hype' | 'hype_to_technical' | 'simplification' | 'complexification' {
    if ((from === 'technical' || from === 'analytical') && 
        (to === 'hype' || to === 'promotional')) {
      return 'technical_to_hype';
    }
    
    if ((from === 'hype' || from === 'promotional') && 
        (to === 'technical' || to === 'analytical')) {
      return 'hype_to_technical';
    }
    
    // Default based on general direction
    const fromComplexity = from === 'technical' || from === 'analytical' ? 1 : 0;
    const toComplexity = to === 'technical' || to === 'analytical' ? 1 : 0;
    
    return toComplexity < fromComplexity ? 'simplification' : 'complexification';
  }

  private analyzeDiffusionPattern(acronyms: AcronymAdoption[]): 'organic' | 'forced' | 'viral' {
    if (acronyms.length === 0) return 'organic';
    
    // Calculate average spread velocity
    const avgVelocity = acronyms.reduce((sum, a) => sum + a.spreadVelocity, 0) / acronyms.length;
    
    // Check context quality
    const avgContext = acronyms.reduce((sum, a) => sum + a.contextQuality, 0) / acronyms.length;
    
    if (avgVelocity > 0.8 && avgContext < 0.3) return 'viral';
    if (avgContext > 0.7) return 'organic';
    return 'forced';
  }

  private calculateAuthenticity(technical: TechnicalLanguageMetrics): number {
    // High jargon density with low accuracy = trying too hard
    if (technical.jargonDensity > 0.3 && technical.technicalAccuracy < 0.5) {
      return 0.3;
    }
    
    // Balanced metrics = authentic
    if (technical.jargonDensity > 0.1 && technical.jargonDensity < 0.25 &&
        technical.technicalAccuracy > 0.7) {
      return 0.9;
    }
    
    return 0.6;
  }

  private calculateConsistency(technical: TechnicalLanguageMetrics): number {
    // Simplified consistency check based on balance of metrics
    const metrics = [
      technical.jargonDensity,
      technical.domainSpecificity,
      technical.technicalAccuracy,
      technical.conceptualDensity
    ];
    
    const avg = metrics.reduce((sum, m) => sum + m, 0) / metrics.length;
    const variance = metrics.reduce((sum, m) => sum + Math.pow(m - avg, 2), 0) / metrics.length;
    
    // Low variance = high consistency
    return Math.max(0, 1 - Math.sqrt(variance));
  }

  private calculateSimplificationTrend(evolution: LanguageEvolution[]): {
    direction: 'simplifying' | 'complexifying' | 'stable';
    velocity: number;
    magnitude: number;
  } {
    if (evolution.length < 2) {
      return { direction: 'stable', velocity: 0, magnitude: 0 };
    }
    
    let totalChange = 0;
    let totalTime = 0;
    
    for (let i = 1; i < evolution.length; i++) {
      const change = evolution[i].complexityScore - evolution[i-1].complexityScore;
      const time = (evolution[i].timestamp.getTime() - evolution[i-1].timestamp.getTime()) / (60 * 60 * 1000);
      
      totalChange += change;
      totalTime += time;
    }
    
    const velocity = totalTime > 0 ? Math.abs(totalChange) / totalTime : 0;
    const direction = totalChange < -0.1 ? 'simplifying' :
                     totalChange > 0.1 ? 'complexifying' : 'stable';
    
    return {
      direction,
      velocity,
      magnitude: Math.abs(totalChange)
    };
  }

  private calculateHypeLanguageRatio(evolution: LanguageEvolution[]): number {
    const hypeNarratives = evolution.filter(e => 
      e.narrativeType === 'hype' || e.narrativeType === 'promotional'
    ).length;
    
    return evolution.length > 0 ? hypeNarratives / evolution.length : 0;
  }

  private identifyRetailIndicators(
    evolution: LanguageEvolution[],
    patterns: NarrativePattern[]
  ): string[] {
    const indicators: string[] = [];
    
    // Check for simplification patterns
    if (patterns.some(p => p.type === 'simplification')) {
      indicators.push('narrative_simplification');
    }
    
    // Check for audience shift
    const recentRetailTarget = evolution.slice(-3).filter(e => 
      e.audienceTarget === 'retail'
    ).length;
    if (recentRetailTarget > 1) {
      indicators.push('retail_audience_targeting');
    }
    
    // Check for hype language increase
    const recentHype = evolution.slice(-5).filter(e => 
      e.narrativeType === 'hype' || e.narrativeType === 'promotional'
    ).length;
    if (recentHype > 2) {
      indicators.push('hype_language_increase');
    }
    
    // Check for complexity decrease
    if (evolution.length > 3) {
      const earlyComplexity = evolution.slice(0, 3).reduce((sum, e) => 
        sum + e.complexityScore, 0) / 3;
      const recentComplexity = evolution.slice(-3).reduce((sum, e) => 
        sum + e.complexityScore, 0) / 3;
      
      if (recentComplexity < earlyComplexity * 0.7) {
        indicators.push('significant_complexity_decrease');
      }
    }
    
    return indicators;
  }

  private calculateRetailProbability(
    simplificationTrend: any,
    hypeRatio: number,
    indicators: string[]
  ): number {
    let probability = 0;
    
    // Simplification trend contribution
    if (simplificationTrend.direction === 'simplifying') {
      probability += Math.min(0.3, simplificationTrend.velocity * 0.5);
    }
    
    // Hype ratio contribution
    probability += hypeRatio * 0.3;
    
    // Indicators contribution
    probability += Math.min(0.4, indicators.length * 0.1);
    
    return Math.min(1, probability);
  }

  private estimateRetailArrival(simplificationTrend: any, hypeRatio: number): number {
    // Estimate hours until retail wave arrives
    if (hypeRatio > 0.7) {
      return 0; // Already here
    }
    
    if (simplificationTrend.direction !== 'simplifying') {
      return Infinity; // Not approaching
    }
    
    // Estimate based on velocity
    const remainingComplexity = 0.3; // Target complexity for retail
    const hoursToTarget = simplificationTrend.velocity > 0 
      ? remainingComplexity / simplificationTrend.velocity
      : Infinity;
    
    return Math.max(0, hoursToTarget);
  }

  private identifyLanguageShift(evolution: LanguageEvolution[]): {
    from: string;
    to: string;
    magnitude: number;
  } {
    if (evolution.length < 2) {
      return { from: 'unknown', to: 'unknown', magnitude: 0 };
    }
    
    const first = evolution[0];
    const last = evolution[evolution.length - 1];
    
    return {
      from: first.narrativeType,
      to: last.narrativeType,
      magnitude: Math.abs(last.complexityScore - first.complexityScore)
    };
  }
}