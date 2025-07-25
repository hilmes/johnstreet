import { BaseSignalDetector } from '../BaseSignalDetector';
import { SignalType, TextInput, ReplyGuySignal, DetectorConfig } from '../types';

/**
 * Reply Guy Analytics Detector
 * 
 * Analyzes response quality and patterns to gauge organic interest vs artificial engagement.
 * Detects bot behavior, measures engagement authenticity, and identifies organic growth.
 */
export class ReplyGuyDetector extends BaseSignalDetector {
  private readonly botPatterns = [
    /^\w+\d{4,}$/, // username followed by 4+ digits
    /^[a-z]+[A-Z][a-z]+\d+$/, // camelCase with numbers
    /bot|pump|moon|gem|x\d+|100x/i,
    /🚀|💎|🌙|📈|💰/g, // common pump emojis
  ];

  private readonly genericPhrases = [
    'great project',
    'to the moon',
    'bullish',
    'bearish',
    'hodl',
    'diamond hands',
    'paper hands',
    'this is the way',
    'lfg',
    'wagmi',
    'ngmi',
    'buy the dip',
    'dyor',
    'not financial advice',
    'still early',
    'hidden gem',
    'next big thing',
    'undervalued',
    'sleeping giant'
  ];

  private readonly shillIndicators = [
    /check out|look at|visit|join our|telegram|discord/i,
    /x\d+|100x|\d+x gains/i,
    /presale|ico|ido|airdrop/i,
    /whitelist|private sale/i,
    /limited time|hurry|act fast|don't miss/i,
    /guaranteed|sure thing|can't lose/i
  ];

  private readonly templatePatterns = [
    /^(wow|great|amazing|nice)\s+(project|token|coin)/i,
    /^(this|that)\s+(is|will be)\s+(huge|big|massive)/i,
    /^(thanks for|thank you for)\s+(sharing|posting)/i,
    /^(looking forward to|excited about|can't wait)/i
  ];

  // Cache for user behavior analysis
  private userBehaviorCache = new Map<string, {
    responses: Array<{
      text: string;
      timestamp: Date;
      length: number;
      complexity: number;
    }>;
    patterns: Set<string>;
    firstSeen: Date;
    botScore: number;
  }>();

  // Cache for temporal analysis
  private temporalAnalysisCache = new Map<string, Array<{
    timestamp: Date;
    author: string;
    responseTime: number;
  }>>();

  constructor(config?: Partial<DetectorConfig>) {
    super(SignalType.REPLY_GUY, config);
  }

  protected async performDetection(input: TextInput): Promise<ReplyGuySignal | null> {
    try {
      // Parse conversation thread from metadata
      const conversationId = input.metadata?.conversationId || input.source;
      const responses = this.parseResponses(input);
      
      if (responses.length < 2) {
        return null; // Need multiple responses for analysis
      }

      // Analyze response metrics
      const responseMetrics = this.analyzeResponseMetrics(responses);
      
      // Analyze quality metrics
      const qualityMetrics = this.analyzeQualityMetrics(responses);
      
      // Detect bot indicators
      const botIndicators = await this.detectBotIndicators(responses);
      
      // Analyze engagement authenticity
      const engagementAuthenticity = this.analyzeEngagementAuthenticity(responses);
      
      // Perform trend analysis
      const trendAnalysis = this.analyzeTrends(responses, conversationId);
      
      // Analyze content patterns
      const contentPatterns = this.analyzeContentPatterns(responses);

      // Calculate overall signal strength
      const strength = this.calculateReplyGuyStrength({
        responseMetrics,
        qualityMetrics,
        botIndicators,
        engagementAuthenticity,
        trendAnalysis,
        contentPatterns
      });

      // Calculate confidence based on data quality and indicators
      const confidence = this.calculateConfidence(responses, {
        responseMetrics,
        qualityMetrics,
        botIndicators,
        engagementAuthenticity
      });

      if (confidence < this.config.minConfidence) {
        return null;
      }

      return {
        id: this.generateSignalId(),
        type: SignalType.REPLY_GUY,
        strength,
        metadata: this.createMetadata(confidence, input.source),
        indicators: {
          responseMetrics,
          qualityMetrics,
          botIndicators,
          engagementAuthenticity,
          trendAnalysis,
          contentPatterns
        }
      };

    } catch (error) {
      this.debug('Error in reply guy detection:', error);
      return null;
    }
  }

  /**
   * Parse responses from input data
   */
  private parseResponses(input: TextInput): Array<{
    text: string;
    author: string;
    timestamp: Date;
    followers?: number;
    accountAge?: number;
  }> {
    // If input contains conversation thread
    if (input.metadata?.responses) {
      return input.metadata.responses.map((response: any) => ({
        text: response.text || response.content || '',
        author: response.author || response.user || 'unknown',
        timestamp: new Date(response.timestamp || response.created_at || Date.now()),
        followers: response.followers || response.follower_count,
        accountAge: response.account_age || this.calculateAccountAge(response.created_at)
      }));
    }

    // Fallback: treat input as single response
    return [{
      text: input.text,
      author: input.author || 'unknown',
      timestamp: input.timestamp || new Date(),
      followers: input.followers,
      accountAge: input.metadata?.accountAge
    }];
  }

  /**
   * Analyze response metrics
   */
  private analyzeResponseMetrics(responses: any[]): {
    totalResponses: number;
    uniqueAuthors: number;
    botToHumanRatio: number;
    averageResponseTime: number;
    responseVelocity: number;
  } {
    const uniqueAuthors = new Set(responses.map(r => r.author)).size;
    const totalResponses = responses.length;
    
    // Calculate response times
    const responseTimes = responses
      .slice(1)
      .map((response, index) => {
        const prevTimestamp = responses[index].timestamp.getTime();
        const currentTimestamp = response.timestamp.getTime();
        return (currentTimestamp - prevTimestamp) / 1000; // seconds
      });

    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    // Calculate velocity (responses per minute)
    const timeSpan = responses.length > 1 
      ? (responses[responses.length - 1].timestamp.getTime() - responses[0].timestamp.getTime()) / (1000 * 60)
      : 1;
    const responseVelocity = totalResponses / Math.max(timeSpan, 1);

    // Estimate bot ratio based on suspicious patterns
    const suspiciousCount = responses.filter(r => this.isSuspiciousAccount(r.author)).length;
    const botToHumanRatio = totalResponses > 0 ? suspiciousCount / totalResponses : 0;

    return {
      totalResponses,
      uniqueAuthors,
      botToHumanRatio,
      averageResponseTime,
      responseVelocity
    };
  }

  /**
   * Analyze response quality metrics
   */
  private analyzeQualityMetrics(responses: any[]): {
    averageLength: number;
    averageComplexity: number;
    uniquenessScore: number;
    relevanceScore: number;
    templateDetection: number;
  } {
    const lengths = responses.map(r => r.text.length);
    const averageLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;

    const complexities = responses.map(r => this.calculateTextComplexity(r.text));
    const averageComplexity = complexities.reduce((sum, comp) => sum + comp, 0) / complexities.length;

    // Calculate uniqueness by comparing text similarity
    const uniquenessScore = this.calculateUniquenessScore(responses.map(r => r.text));

    // Calculate relevance to original topic
    const relevanceScore = this.calculateRelevanceScore(responses);

    // Detect template usage
    const templateDetection = this.detectTemplateUsage(responses.map(r => r.text));

    return {
      averageLength,
      averageComplexity,
      uniquenessScore,
      relevanceScore,
      templateDetection
    };
  }

  /**
   * Detect bot indicators
   */
  private async detectBotIndicators(responses: any[]): Promise<{
    suspiciousAccounts: Array<{
      account: string;
      botScore: number;
      patterns: string[];
      creationDate?: Date;
      followersRatio?: number;
    }>;
    coordinationScore: number;
    temporalClustering: number;
    linguisticSimilarity: number;
  }> {
    const suspiciousAccounts = [];
    const authors = Array.from(new Set(responses.map(r => r.author)));

    for (const author of authors) {
      const authorResponses = responses.filter(r => r.author === author);
      const botScore = this.calculateBotScore(author, authorResponses);
      const patterns = this.identifyBotPatterns(author, authorResponses);

      if (botScore > 0.3) {
        suspiciousAccounts.push({
          account: author,
          botScore,
          patterns,
          creationDate: authorResponses[0]?.accountCreated,
          followersRatio: authorResponses[0]?.followers ? 
            authorResponses[0].followers / Math.max(authorResponses[0].accountAge || 1, 1) : undefined
        });
      }
    }

    // Calculate coordination indicators
    const coordinationScore = this.calculateCoordinationScore(responses);
    const temporalClustering = this.calculateTemporalClustering(responses);
    const linguisticSimilarity = this.calculateLinguisticSimilarity(responses.map(r => r.text));

    return {
      suspiciousAccounts,
      coordinationScore,
      temporalClustering,
      linguisticSimilarity
    };
  }

  /**
   * Analyze engagement authenticity
   */
  private analyzeEngagementAuthenticity(responses: any[]): {
    organicScore: number;
    manipulationIndicators: string[];
    naturalConversationFlow: number;
    diversityIndex: number;
  } {
    const manipulationIndicators = [];
    
    // Check for manipulation patterns
    if (this.hasHighBotRatio(responses)) {
      manipulationIndicators.push('high_bot_ratio');
    }
    
    if (this.hasSuspiciousTiming(responses)) {
      manipulationIndicators.push('suspicious_timing');
    }
    
    if (this.hasGenericContent(responses)) {
      manipulationIndicators.push('generic_content');
    }

    if (this.hasCoordinatedMessages(responses)) {
      manipulationIndicators.push('coordinated_messages');
    }

    // Calculate natural conversation flow
    const naturalConversationFlow = this.calculateConversationFlow(responses);
    
    // Calculate diversity index
    const diversityIndex = this.calculateDiversityIndex(responses);
    
    // Calculate organic score (inverse of manipulation indicators)
    const organicScore = Math.max(0, 1 - (manipulationIndicators.length * 0.2) - 
      (this.calculateArtificialityScore(responses) * 0.5));

    return {
      organicScore,
      manipulationIndicators,
      naturalConversationFlow,
      diversityIndex
    };
  }

  /**
   * Analyze trends and growth patterns
   */
  private analyzeTrends(responses: any[], conversationId: string): {
    growthPattern: 'organic' | 'artificial' | 'mixed';
    spikesDetected: Array<{
      timestamp: Date;
      intensity: number;
      suspicionLevel: number;
      likelySource: 'organic' | 'bot' | 'coordinated';
    }>;
    sustainabilityScore: number;
    viralPotential: number;
  } {
    // Detect spikes in activity
    const spikes = this.detectActivitySpikes(responses);
    
    // Determine growth pattern
    const growthPattern = this.determineGrowthPattern(responses, spikes);
    
    // Calculate sustainability
    const sustainabilityScore = this.calculateSustainabilityScore(responses, spikes);
    
    // Calculate viral potential
    const viralPotential = this.calculateViralPotential(responses);

    return {
      growthPattern,
      spikesDetected: spikes,
      sustainabilityScore,
      viralPotential
    };
  }

  /**
   * Analyze content patterns
   */
  private analyzeContentPatterns(responses: any[]): {
    genericResponses: number;
    copypastaPhrases: string[];
    shillKeywords: string[];
    promotionalContent: number;
    authenticEngagement: number;
  } {
    const texts = responses.map(r => r.text.toLowerCase());
    
    // Count generic responses
    const genericResponses = texts.filter(text => 
      this.genericPhrases.some(phrase => text.includes(phrase.toLowerCase()))
    ).length;

    // Detect copypasta
    const copypastaPhrases = this.detectCopypasta(texts);

    // Find shill keywords
    const shillKeywords = this.extractShillKeywords(texts);

    // Count promotional content
    const promotionalContent = texts.filter(text =>
      this.shillIndicators.some(pattern => pattern.test(text))
    ).length;

    // Calculate authentic engagement
    const authenticEngagement = responses.length - genericResponses - promotionalContent;

    return {
      genericResponses,
      copypastaPhrases,
      shillKeywords,
      promotionalContent,
      authenticEngagement: Math.max(0, authenticEngagement)
    };
  }

  /**
   * Calculate overall reply guy signal strength
   */
  private calculateReplyGuyStrength(indicators: any): number {
    const {
      responseMetrics,
      qualityMetrics,
      botIndicators,
      engagementAuthenticity,
      trendAnalysis,
      contentPatterns
    } = indicators;

    // Negative indicators (artificial/manipulated)
    const negativeScore = 
      (responseMetrics.botToHumanRatio * 0.3) +
      (1 - qualityMetrics.uniquenessScore) * 0.2 +
      (botIndicators.coordinationScore * 0.25) +
      (1 - engagementAuthenticity.organicScore) * 0.15 +
      (contentPatterns.genericResponses / Math.max(responseMetrics.totalResponses, 1)) * 0.1;

    // Positive indicators (organic engagement)
    const positiveScore = 
      (engagementAuthenticity.organicScore * 0.4) +
      (qualityMetrics.relevanceScore * 0.2) +
      (trendAnalysis.sustainabilityScore * 0.2) +
      (engagementAuthenticity.naturalConversationFlow * 0.1) +
      (engagementAuthenticity.diversityIndex * 0.1);

    // Return strength: positive for organic, negative for artificial
    return Math.max(-1, Math.min(1, positiveScore - negativeScore));
  }

  /**
   * Calculate detection confidence
   */
  private calculateConfidence(responses: any[], indicators: any): number {
    const {
      responseMetrics,
      qualityMetrics,
      botIndicators,
      engagementAuthenticity
    } = indicators;

    // Base confidence on data quality and sample size
    let confidence = Math.min(1, responses.length / 20); // More responses = higher confidence

    // Adjust based on clear indicators
    if (botIndicators.suspiciousAccounts.length > 0) {
      confidence += 0.2;
    }

    if (responseMetrics.botToHumanRatio > 0.5) {
      confidence += 0.3;
    }

    if (engagementAuthenticity.manipulationIndicators.length > 2) {
      confidence += 0.2;
    }

    if (qualityMetrics.templateDetection > 0.5) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  // Helper methods

  private isSuspiciousAccount(username: string): boolean {
    return this.botPatterns.some(pattern => pattern.test(username));
  }

  private calculateAccountAge(createdAt?: string | Date): number {
    if (!createdAt) return 0;
    const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
    return (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24); // days
  }

  private calculateTextComplexity(text: string): number {
    const words = text.split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const sentences = text.split(/[.!?]+/).length;
    const wordsPerSentence = words.length / Math.max(sentences, 1);
    
    // Complexity score based on vocabulary and structure
    return Math.min(1, (avgWordLength / 10) + (wordsPerSentence / 20));
  }

  private calculateUniquenessScore(texts: string[]): number {
    if (texts.length < 2) return 1;
    
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        totalSimilarity += this.calculateTextSimilarity(texts[i], texts[j]);
        comparisons++;
      }
    }
    
    const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;
    return 1 - avgSimilarity; // Higher uniqueness = lower similarity
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set(Array.from(words1).filter(word => words2.has(word)));
    const union = new Set([...Array.from(words1), ...Array.from(words2)]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private calculateRelevanceScore(responses: any[]): number {
    // Simple relevance based on keyword consistency
    // In a real implementation, this would use more sophisticated NLP
    if (responses.length < 2) return 1;
    
    const firstResponse = responses[0].text.toLowerCase();
    const keywords = firstResponse.split(/\s+/).filter(word => word.length > 3);
    
    let relevantResponses = 0;
    for (let i = 1; i < responses.length; i++) {
      const response = responses[i].text.toLowerCase();
      const hasRelevantKeywords = keywords.some(keyword => response.includes(keyword));
      if (hasRelevantKeywords) relevantResponses++;
    }
    
    return relevantResponses / Math.max(responses.length - 1, 1);
  }

  private detectTemplateUsage(texts: string[]): number {
    const templateMatches = texts.filter(text =>
      this.templatePatterns.some(pattern => pattern.test(text))
    );
    return templateMatches.length / Math.max(texts.length, 1);
  }

  private calculateBotScore(author: string, responses: any[]): number {
    let score = 0;
    
    // Username patterns
    if (this.isSuspiciousAccount(author)) score += 0.3;
    
    // Response patterns
    const texts = responses.map(r => r.text);
    
    // High generic content
    const genericRatio = texts.filter(text => 
      this.genericPhrases.some(phrase => text.toLowerCase().includes(phrase))
    ).length / texts.length;
    score += genericRatio * 0.4;
    
    // High similarity between responses
    if (texts.length > 1) {
      const avgSimilarity = this.calculateUniquenessScore(texts);
      score += (1 - avgSimilarity) * 0.3;
    }
    
    return Math.min(1, score);
  }

  private identifyBotPatterns(author: string, responses: any[]): string[] {
    const patterns = [];
    
    if (this.isSuspiciousAccount(author)) {
      patterns.push('suspicious_username');
    }
    
    const texts = responses.map(r => r.text);
    const genericRatio = texts.filter(text => 
      this.genericPhrases.some(phrase => text.toLowerCase().includes(phrase))
    ).length / texts.length;
    
    if (genericRatio > 0.5) {
      patterns.push('high_generic_content');
    }
    
    if (responses.length > 1 && this.calculateUniquenessScore(texts) < 0.3) {
      patterns.push('low_content_diversity');
    }
    
    return patterns;
  }

  private calculateCoordinationScore(responses: any[]): number {
    // Look for coordinated timing and similar content
    const timeGroups = this.groupByTimeWindow(responses, 60000); // 1 minute windows
    const largeGroups = timeGroups.filter(group => group.length > 3);
    
    if (largeGroups.length === 0) return 0;
    
    // Check content similarity within time groups
    let coordinationScore = 0;
    for (const group of largeGroups) {
      const texts = group.map(r => r.text);
      const similarity = 1 - this.calculateUniquenessScore(texts);
      coordinationScore += similarity * (group.length / responses.length);
    }
    
    return Math.min(1, coordinationScore);
  }

  private calculateTemporalClustering(responses: any[]): number {
    if (responses.length < 3) return 0;
    
    const intervals = [];
    for (let i = 1; i < responses.length; i++) {
      const interval = responses[i].timestamp.getTime() - responses[i-1].timestamp.getTime();
      intervals.push(interval);
    }
    
    // Calculate coefficient of variation
    const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;
    
    // Lower CV indicates more clustering
    return Math.max(0, 1 - coefficientOfVariation);
  }

  private calculateLinguisticSimilarity(texts: string[]): number {
    return 1 - this.calculateUniquenessScore(texts);
  }

  private hasHighBotRatio(responses: any[]): boolean {
    const suspiciousCount = responses.filter(r => this.isSuspiciousAccount(r.author)).length;
    return (suspiciousCount / responses.length) > 0.4;
  }

  private hasSuspiciousTiming(responses: any[]): boolean {
    return this.calculateTemporalClustering(responses) > 0.7;
  }

  private hasGenericContent(responses: any[]): boolean {
    const genericCount = responses.filter(r => 
      this.genericPhrases.some(phrase => r.text.toLowerCase().includes(phrase))
    ).length;
    return (genericCount / responses.length) > 0.5;
  }

  private hasCoordinatedMessages(responses: any[]): boolean {
    return this.calculateCoordinationScore(responses) > 0.6;
  }

  private calculateConversationFlow(responses: any[]): number {
    // Analyze if responses build on each other naturally
    if (responses.length < 3) return 1;
    
    let naturalTransitions = 0;
    for (let i = 1; i < responses.length - 1; i++) {
      const prev = responses[i-1].text.toLowerCase();
      const curr = responses[i].text.toLowerCase();
      const next = responses[i+1].text.toLowerCase();
      
      // Check for question-answer patterns, topic continuity, etc.
      if (this.hasNaturalTransition(prev, curr, next)) {
        naturalTransitions++;
      }
    }
    
    return naturalTransitions / Math.max(responses.length - 2, 1);
  }

  private hasNaturalTransition(prev: string, curr: string, next: string): boolean {
    // Simple heuristics for natural conversation flow
    const hasQuestionAnswer = prev.includes('?') && !curr.includes('?');
    const hasTopicContinuity = this.calculateTextSimilarity(prev, curr) > 0.2;
    const notGeneric = !this.genericPhrases.some(phrase => curr.includes(phrase));
    
    return hasQuestionAnswer || (hasTopicContinuity && notGeneric);
  }

  private calculateDiversityIndex(responses: any[]): number {
    // Shannon diversity index for authors and content
    const authors = responses.map(r => r.author);
    const authorCounts = authors.reduce((counts, author) => {
      counts[author] = (counts[author] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    const total = responses.length;
    let diversity = 0;
    
    for (const count of Object.values(authorCounts)) {
      const proportion = (count as number) / total;
      diversity -= proportion * Math.log2(proportion);
    }
    
    // Normalize to 0-1 range
    const maxDiversity = Math.log2(Object.keys(authorCounts).length);
    return maxDiversity > 0 ? diversity / maxDiversity : 0;
  }

  private calculateArtificialityScore(responses: any[]): number {
    const factors = [
      this.hasHighBotRatio(responses) ? 0.3 : 0,
      this.hasSuspiciousTiming(responses) ? 0.25 : 0,
      this.hasGenericContent(responses) ? 0.2 : 0,
      this.hasCoordinatedMessages(responses) ? 0.25 : 0
    ];
    
    return factors.reduce((sum, factor) => sum + factor, 0);
  }

  private detectActivitySpikes(responses: any[]): Array<{
    timestamp: Date;
    intensity: number;
    suspicionLevel: number;
    likelySource: 'organic' | 'bot' | 'coordinated';
  }> {
    const timeWindows = this.groupByTimeWindow(responses, 300000); // 5-minute windows
    const spikes = [];
    
    const avgResponses = responses.length / timeWindows.length;
    
    for (const window of timeWindows) {
      if (window.length > avgResponses * 2) {
        const intensity = window.length / avgResponses;
        const suspicionLevel = this.calculateSpikeSuspicion(window);
        const likelySource = this.determineSpikeSource(window);
        
        spikes.push({
          timestamp: window[0].timestamp,
          intensity,
          suspicionLevel,
          likelySource
        });
      }
    }
    
    return spikes;
  }

  private groupByTimeWindow(responses: any[], windowMs: number): any[][] {
    const groups: any[][] = [];
    let currentGroup: any[] = [];
    let windowStart = 0;
    
    for (const response of responses.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())) {
      const timestamp = response.timestamp.getTime();
      
      if (windowStart === 0) {
        windowStart = timestamp;
      }
      
      if (timestamp - windowStart <= windowMs) {
        currentGroup.push(response);
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [response];
        windowStart = timestamp;
      }
    }
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }

  private calculateSpikeSuspicion(responses: any[]): number {
    const botRatio = responses.filter(r => this.isSuspiciousAccount(r.author)).length / responses.length;
    const genericRatio = responses.filter(r => 
      this.genericPhrases.some(phrase => r.text.toLowerCase().includes(phrase))
    ).length / responses.length;
    const similarity = 1 - this.calculateUniquenessScore(responses.map(r => r.text));
    
    return (botRatio * 0.4) + (genericRatio * 0.3) + (similarity * 0.3);
  }

  private determineSpikeSource(responses: any[]): 'organic' | 'bot' | 'coordinated' {
    const suspicion = this.calculateSpikeSuspicion(responses);
    
    if (suspicion > 0.7) return 'bot';
    if (suspicion > 0.4) return 'coordinated';
    return 'organic';
  }

  private determineGrowthPattern(responses: any[], spikes: any[]): 'organic' | 'artificial' | 'mixed' {
    const artificialSpikes = spikes.filter(spike => spike.likelySource !== 'organic').length;
    const totalSpikes = spikes.length;
    
    if (totalSpikes === 0) return 'organic';
    
    const artificialRatio = artificialSpikes / totalSpikes;
    
    if (artificialRatio > 0.6) return 'artificial';
    if (artificialRatio > 0.3) return 'mixed';
    return 'organic';
  }

  private calculateSustainabilityScore(responses: any[], spikes: any[]): number {
    // Sustainable engagement should have consistent activity without relying on spikes
    const spikeResponses = spikes.reduce((sum, spike) => sum + spike.intensity, 0);
    const baselineResponses = responses.length - spikeResponses;
    
    return Math.max(0, baselineResponses / responses.length);
  }

  private calculateViralPotential(responses: any[]): number {
    // Based on engagement quality, diversity, and natural growth
    const qualityScore = 1 - (responses.filter(r => 
      this.genericPhrases.some(phrase => r.text.toLowerCase().includes(phrase))
    ).length / responses.length);
    
    const diversityScore = this.calculateDiversityIndex(responses);
    const organicScore = 1 - this.calculateArtificialityScore(responses);
    
    return (qualityScore * 0.4) + (diversityScore * 0.3) + (organicScore * 0.3);
  }

  private detectCopypasta(texts: string[]): string[] {
    const copypasta = [];
    const seen = new Map<string, number>();
    
    for (const text of texts) {
      // Look for exact or near-exact duplicates
      const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
      if (normalized.length < 10) continue;
      
      seen.set(normalized, (seen.get(normalized) || 0) + 1);
    }
    
    for (const [text, count] of Array.from(seen.entries())) {
      if (count > 1 && text.length > 20) {
        copypasta.push(text.substring(0, 50) + (text.length > 50 ? '...' : ''));
      }
    }
    
    return copypasta;
  }

  private extractShillKeywords(texts: string[]): string[] {
    const keywords = [];
    
    for (const text of texts) {
      for (const pattern of this.shillIndicators) {
        const matches = text.match(pattern);
        if (matches) {
          keywords.push(...matches);
        }
      }
    }
    
    return Array.from(new Set(keywords));
  }
}