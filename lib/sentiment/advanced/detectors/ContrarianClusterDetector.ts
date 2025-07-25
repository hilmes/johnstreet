import { BaseSentimentDetector } from './BaseSentimentDetector';
import { 
  SentimentData, 
  DetectorResult, 
  TimeSeriesPoint,
  PatternMatch 
} from '../types';

interface FUDCampaign {
  id: string;
  startTime: number;
  peakTime: number;
  endTime?: number;
  initialIntensity: number;
  sources: string[];
  keywords: string[];
  communityResponse: CommunityResponse;
  streisandScore: number;
  backfireMetrics: BackfireMetrics;
}

interface CommunityResponse {
  pushbackIntensity: number;
  rallyingScore: number;
  positiveCounterVolume: number;
  memeDefenseScore: number;
  influencerSupport: number;
  grassrootsStrength: number;
}

interface BackfireMetrics {
  priceImpact: number;
  volumeIncrease: number;
  newHoldersGained: number;
  socialGrowth: number;
  sentimentReversal: number;
}

interface StreisandEffect {
  triggerEvent: string;
  censorshipAttempts: CensorshipAttempt[];
  attentionMultiplier: number;
  viralityScore: number;
  sustainedInterest: number;
}

interface CensorshipAttempt {
  timestamp: number;
  platform: string;
  type: 'deletion' | 'ban' | 'restriction' | 'warning';
  targetContent: string;
  resultingAmplification: number;
}

interface ContrarianPattern {
  type: 'fud_backfire' | 'streisand_effect' | 'rally_effect' | 'resilience_surge';
  confidence: number;
  timeline: TimeSeriesPoint[];
  keyMetrics: {
    reversalStrength: number;
    communityUnity: number;
    momentumShift: number;
  };
}

export class ContrarianClusterDetector extends BaseSentimentDetector {
  private readonly FUD_KEYWORDS = [
    'scam', 'rug', 'ponzi', 'dead', 'dump', 'crash', 'worthless',
    'exit', 'abandoned', 'hack', 'exploit', 'vulnerability'
  ];

  private readonly RESILIENCE_INDICATORS = [
    'diamond hands', 'hodl', 'buy the dip', 'fud is fuel',
    'stronger together', 'community strong', 'we like the token'
  ];

  private readonly CENSORSHIP_PLATFORMS = [
    'twitter', 'reddit', 'discord', 'telegram', 'youtube'
  ];

  constructor() {
    super('ContrarianClusterDetector', 0.75);
  }

  async detect(data: SentimentData): Promise<DetectorResult> {
    const campaigns = await this.detectFUDCampaigns(data);
    const streisandEffects = await this.identifyStreisandEffects(data);
    const communityResilience = await this.analyzeCommunityResilience(data, campaigns);
    const contrarianPatterns = await this.identifyContrarianPatterns(
      campaigns, 
      streisandEffects, 
      communityResilience
    );

    const overallScore = this.calculateContrarianScore(
      campaigns,
      streisandEffects,
      communityResilience
    );

    return {
      detected: overallScore > this.threshold,
      confidence: overallScore,
      signals: this.generateSignals(campaigns, streisandEffects, contrarianPatterns),
      metadata: {
        activeCampaigns: campaigns.filter(c => !c.endTime).length,
        backfiredCampaigns: campaigns.filter(c => c.backfireMetrics.sentimentReversal > 0.5).length,
        streisandInstances: streisandEffects.length,
        resilienceScore: communityResilience.overallScore,
        patterns: contrarianPatterns
      }
    };
  }

  private async detectFUDCampaigns(data: SentimentData): Promise<FUDCampaign[]> {
    const campaigns: FUDCampaign[] = [];
    const messages = this.extractMessages(data);
    
    // Group messages by time windows to detect coordinated campaigns
    const timeWindows = this.createTimeWindows(messages, 3600000); // 1 hour windows
    
    for (const window of timeWindows) {
      const fudMessages = window.messages.filter(msg => 
        this.containsFUDKeywords(msg.content)
      );

      if (fudMessages.length > 10) { // Threshold for campaign detection
        const campaign = await this.analyzeFUDCampaign(fudMessages, window, data);
        if (campaign.initialIntensity > 0.6) {
          campaigns.push(campaign);
        }
      }
    }

    return campaigns;
  }

  private async analyzeFUDCampaign(
    fudMessages: any[],
    window: any,
    data: SentimentData
  ): Promise<FUDCampaign> {
    const sources = [...new Set(fudMessages.map(m => m.source))];
    const keywords = this.extractFUDKeywords(fudMessages);
    
    // Analyze community response
    const responseMessages = this.getResponseMessages(window.endTime, data);
    const communityResponse = await this.analyzeCommunityResponse(responseMessages);
    
    // Calculate backfire metrics
    const backfireMetrics = await this.calculateBackfireMetrics(
      window.startTime,
      window.endTime,
      data
    );

    // Calculate Streisand score
    const streisandScore = this.calculateStreisandScore(
      fudMessages.length,
      responseMessages.length,
      backfireMetrics
    );

    return {
      id: `fud_${window.startTime}`,
      startTime: window.startTime,
      peakTime: this.findPeakTime(fudMessages),
      endTime: this.detectCampaignEnd(window.endTime, data),
      initialIntensity: fudMessages.length / window.messages.length,
      sources,
      keywords,
      communityResponse,
      streisandScore,
      backfireMetrics
    };
  }

  private async analyzeCommunityResponse(messages: any[]): Promise<CommunityResponse> {
    const positiveMessages = messages.filter(m => this.isPositiveResponse(m.content));
    const memeMessages = messages.filter(m => this.containsMemeDefense(m.content));
    const influencerMessages = messages.filter(m => m.influence > 0.7);

    return {
      pushbackIntensity: positiveMessages.length / Math.max(messages.length, 1),
      rallyingScore: this.calculateRallyingScore(positiveMessages),
      positiveCounterVolume: positiveMessages.length,
      memeDefenseScore: memeMessages.length / Math.max(messages.length, 1),
      influencerSupport: influencerMessages.filter(m => this.isPositiveResponse(m.content)).length,
      grassrootsStrength: this.calculateGrassrootsStrength(messages)
    };
  }

  private async identifyStreisandEffects(data: SentimentData): Promise<StreisandEffect[]> {
    const effects: StreisandEffect[] = [];
    const censorshipAttempts = await this.detectCensorshipAttempts(data);
    
    // Group censorship attempts by related content
    const groupedAttempts = this.groupCensorshipAttempts(censorshipAttempts);
    
    for (const group of groupedAttempts) {
      const effect = await this.analyzeStreisandEffect(group, data);
      if (effect.attentionMultiplier > 2.0) { // Significant amplification
        effects.push(effect);
      }
    }

    return effects;
  }

  private async detectCensorshipAttempts(data: SentimentData): Promise<CensorshipAttempt[]> {
    const attempts: CensorshipAttempt[] = [];
    
    // Analyze metadata for deletion/ban indicators
    if (data.metadata?.moderationEvents) {
      for (const event of data.metadata.moderationEvents) {
        const attempt: CensorshipAttempt = {
          timestamp: event.timestamp,
          platform: event.platform,
          type: this.classifyCensorshipType(event.action),
          targetContent: event.targetContent || 'unknown',
          resultingAmplification: await this.measureAmplification(event, data)
        };
        attempts.push(attempt);
      }
    }

    return attempts;
  }

  private async analyzeStreisandEffect(
    attempts: CensorshipAttempt[],
    data: SentimentData
  ): Promise<StreisandEffect> {
    const triggerEvent = this.identifyTriggerEvent(attempts);
    const beforeMetrics = this.getMetricsBefore(attempts[0].timestamp, data);
    const afterMetrics = this.getMetricsAfter(attempts[0].timestamp, data);

    return {
      triggerEvent,
      censorshipAttempts: attempts,
      attentionMultiplier: afterMetrics.volume / Math.max(beforeMetrics.volume, 1),
      viralityScore: this.calculateViralityScore(afterMetrics),
      sustainedInterest: this.measureSustainedInterest(attempts[0].timestamp, data)
    };
  }

  private async analyzeCommunityResilience(
    data: SentimentData,
    campaigns: FUDCampaign[]
  ): Promise<any> {
    const resilienceMetrics = {
      overallScore: 0,
      recoverySpeed: 0,
      unityScore: 0,
      defenseEffectiveness: 0,
      positiveReinforcement: 0
    };

    // Analyze recovery from FUD campaigns
    for (const campaign of campaigns) {
      if (campaign.backfireMetrics.sentimentReversal > 0) {
        resilienceMetrics.recoverySpeed += this.calculateRecoverySpeed(campaign);
        resilienceMetrics.defenseEffectiveness += campaign.communityResponse.pushbackIntensity;
      }
    }

    // Analyze community unity
    const messages = this.extractMessages(data);
    const resilienceMessages = messages.filter(m => 
      this.RESILIENCE_INDICATORS.some(indicator => 
        m.content.toLowerCase().includes(indicator)
      )
    );

    resilienceMetrics.unityScore = resilienceMessages.length / Math.max(messages.length, 1);
    resilienceMetrics.positiveReinforcement = this.calculatePositiveReinforcement(messages);
    
    // Calculate overall resilience score
    resilienceMetrics.overallScore = 
      (resilienceMetrics.recoverySpeed * 0.3) +
      (resilienceMetrics.unityScore * 0.2) +
      (resilienceMetrics.defenseEffectiveness * 0.3) +
      (resilienceMetrics.positiveReinforcement * 0.2);

    return resilienceMetrics;
  }

  private async identifyContrarianPatterns(
    campaigns: FUDCampaign[],
    streisandEffects: StreisandEffect[],
    resilience: any
  ): Promise<ContrarianPattern[]> {
    const patterns: ContrarianPattern[] = [];

    // Identify FUD backfire patterns
    for (const campaign of campaigns) {
      if (campaign.backfireMetrics.sentimentReversal > 0.6) {
        patterns.push({
          type: 'fud_backfire',
          confidence: campaign.backfireMetrics.sentimentReversal,
          timeline: this.generatePatternTimeline(campaign),
          keyMetrics: {
            reversalStrength: campaign.backfireMetrics.sentimentReversal,
            communityUnity: campaign.communityResponse.rallyingScore,
            momentumShift: campaign.backfireMetrics.priceImpact
          }
        });
      }
    }

    // Identify Streisand effect patterns
    for (const effect of streisandEffects) {
      patterns.push({
        type: 'streisand_effect',
        confidence: Math.min(effect.attentionMultiplier / 5, 1),
        timeline: this.generateStreisandTimeline(effect),
        keyMetrics: {
          reversalStrength: effect.attentionMultiplier,
          communityUnity: 0.8, // High unity in censorship response
          momentumShift: effect.sustainedInterest
        }
      });
    }

    // Identify resilience surge patterns
    if (resilience.overallScore > 0.7) {
      patterns.push({
        type: 'resilience_surge',
        confidence: resilience.overallScore,
        timeline: [],
        keyMetrics: {
          reversalStrength: resilience.recoverySpeed,
          communityUnity: resilience.unityScore,
          momentumShift: resilience.defenseEffectiveness
        }
      });
    }

    return patterns;
  }

  private calculateContrarianScore(
    campaigns: FUDCampaign[],
    streisandEffects: StreisandEffect[],
    resilience: any
  ): number {
    let score = 0;

    // Score based on backfired campaigns
    const backfiredCampaigns = campaigns.filter(c => 
      c.backfireMetrics.sentimentReversal > 0.5
    );
    score += backfiredCampaigns.length * 0.2;

    // Score based on Streisand effects
    const strongStreisand = streisandEffects.filter(e => 
      e.attentionMultiplier > 3.0
    );
    score += strongStreisand.length * 0.25;

    // Score based on community resilience
    score += resilience.overallScore * 0.3;

    // Bonus for sustained contrarian momentum
    if (backfiredCampaigns.length > 0 && resilience.overallScore > 0.7) {
      score += 0.25;
    }

    return Math.min(score, 1);
  }

  private generateSignals(
    campaigns: FUDCampaign[],
    streisandEffects: StreisandEffect[],
    patterns: ContrarianPattern[]
  ): string[] {
    const signals: string[] = [];

    // FUD backfire signals
    const backfired = campaigns.filter(c => c.backfireMetrics.sentimentReversal > 0.6);
    if (backfired.length > 0) {
      signals.push(`FUD campaign backfire detected: ${backfired.length} failed negative campaigns`);
      const avgReversal = backfired.reduce((sum, c) => sum + c.backfireMetrics.sentimentReversal, 0) / backfired.length;
      signals.push(`Average sentiment reversal strength: ${(avgReversal * 100).toFixed(1)}%`);
    }

    // Streisand effect signals
    if (streisandEffects.length > 0) {
      const maxMultiplier = Math.max(...streisandEffects.map(e => e.attentionMultiplier));
      signals.push(`Streisand effect detected: ${maxMultiplier.toFixed(1)}x attention multiplier`);
    }

    // Community resilience signals
    const resiliencePattern = patterns.find(p => p.type === 'resilience_surge');
    if (resiliencePattern) {
      signals.push(`Strong community resilience: ${(resiliencePattern.confidence * 100).toFixed(1)}% unity score`);
    }

    // Rally effect signals
    const rallyPatterns = patterns.filter(p => p.type === 'rally_effect');
    if (rallyPatterns.length > 0) {
      signals.push(`Community rally effect active: ${rallyPatterns.length} coordinated defense waves`);
    }

    return signals;
  }

  // Helper methods
  private containsFUDKeywords(content: string): boolean {
    const lowerContent = content.toLowerCase();
    return this.FUD_KEYWORDS.some(keyword => lowerContent.includes(keyword));
  }

  private extractFUDKeywords(messages: any[]): string[] {
    const keywords = new Set<string>();
    for (const msg of messages) {
      const lowerContent = msg.content.toLowerCase();
      this.FUD_KEYWORDS.forEach(keyword => {
        if (lowerContent.includes(keyword)) {
          keywords.add(keyword);
        }
      });
    }
    return Array.from(keywords);
  }

  private isPositiveResponse(content: string): boolean {
    const lowerContent = content.toLowerCase();
    return this.RESILIENCE_INDICATORS.some(indicator => 
      lowerContent.includes(indicator)
    ) || lowerContent.includes('buy') || lowerContent.includes('support');
  }

  private containsMemeDefense(content: string): boolean {
    const memeIndicators = ['🚀', '💎', '🙌', 'moon', 'lambo', 'wagmi'];
    const lowerContent = content.toLowerCase();
    return memeIndicators.some(indicator => 
      content.includes(indicator) || lowerContent.includes(indicator)
    );
  }

  private calculateRallyingScore(messages: any[]): number {
    const rallyingPhrases = [
      'together', 'unite', 'strong', 'defend', 'support',
      'community', 'family', 'army', 'warriors'
    ];
    
    let rallyCount = 0;
    for (const msg of messages) {
      const lowerContent = msg.content.toLowerCase();
      if (rallyingPhrases.some(phrase => lowerContent.includes(phrase))) {
        rallyCount++;
      }
    }
    
    return rallyCount / Math.max(messages.length, 1);
  }

  private calculateGrassrootsStrength(messages: any[]): number {
    // Measure organic community response vs. coordinated
    const uniqueUsers = new Set(messages.map(m => m.userId || m.source));
    const organicScore = uniqueUsers.size / Math.max(messages.length, 1);
    
    // Higher score for more unique participants
    return Math.min(organicScore * 1.5, 1);
  }

  private calculateBackfireMetrics(
    startTime: number,
    endTime: number,
    data: SentimentData
  ): BackfireMetrics {
    // Simplified calculation - in production would use actual market data
    const timeDiff = endTime - startTime;
    const sentimentShift = this.measureSentimentShift(startTime, endTime, data);
    
    return {
      priceImpact: sentimentShift * 0.8,
      volumeIncrease: Math.max(0, sentimentShift * 2),
      newHoldersGained: Math.floor(sentimentShift * 100),
      socialGrowth: sentimentShift * 1.5,
      sentimentReversal: Math.max(0, sentimentShift)
    };
  }

  private measureSentimentShift(
    startTime: number,
    endTime: number,
    data: SentimentData
  ): number {
    const messages = this.extractMessages(data);
    const beforeMessages = messages.filter(m => m.timestamp < startTime);
    const afterMessages = messages.filter(m => m.timestamp > endTime);
    
    const beforePositive = beforeMessages.filter(m => this.isPositiveResponse(m.content)).length;
    const afterPositive = afterMessages.filter(m => this.isPositiveResponse(m.content)).length;
    
    const beforeRatio = beforePositive / Math.max(beforeMessages.length, 1);
    const afterRatio = afterPositive / Math.max(afterMessages.length, 1);
    
    return afterRatio - beforeRatio;
  }

  private calculateStreisandScore(
    fudCount: number,
    responseCount: number,
    backfire: BackfireMetrics
  ): number {
    const responseRatio = responseCount / Math.max(fudCount, 1);
    const backfireStrength = backfire.sentimentReversal;
    
    return Math.min((responseRatio * 0.5) + (backfireStrength * 0.5), 1);
  }

  private createTimeWindows(messages: any[], windowSize: number): any[] {
    const windows: any[] = [];
    if (messages.length === 0) return windows;
    
    messages.sort((a, b) => a.timestamp - b.timestamp);
    let currentWindow = {
      startTime: messages[0].timestamp,
      endTime: messages[0].timestamp + windowSize,
      messages: [messages[0]]
    };
    
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].timestamp <= currentWindow.endTime) {
        currentWindow.messages.push(messages[i]);
      } else {
        windows.push(currentWindow);
        currentWindow = {
          startTime: messages[i].timestamp,
          endTime: messages[i].timestamp + windowSize,
          messages: [messages[i]]
        };
      }
    }
    
    if (currentWindow.messages.length > 0) {
      windows.push(currentWindow);
    }
    
    return windows;
  }

  private findPeakTime(messages: any[]): number {
    // Find the time with highest message density
    const timeSlots = new Map<number, number>();
    const slotSize = 600000; // 10 minutes
    
    for (const msg of messages) {
      const slot = Math.floor(msg.timestamp / slotSize) * slotSize;
      timeSlots.set(slot, (timeSlots.get(slot) || 0) + 1);
    }
    
    let peakTime = messages[0]?.timestamp || Date.now();
    let maxCount = 0;
    
    for (const [time, count] of timeSlots) {
      if (count > maxCount) {
        maxCount = count;
        peakTime = time;
      }
    }
    
    return peakTime;
  }

  private detectCampaignEnd(windowEnd: number, data: SentimentData): number | undefined {
    // Detect when FUD campaign loses momentum
    const messages = this.extractMessages(data);
    const afterMessages = messages.filter(m => m.timestamp > windowEnd);
    
    let consecutiveQuiet = 0;
    const checkWindow = 3600000; // 1 hour
    
    for (let time = windowEnd; time < windowEnd + (24 * 3600000); time += checkWindow) {
      const windowMessages = afterMessages.filter(m => 
        m.timestamp >= time && m.timestamp < time + checkWindow
      );
      
      const fudMessages = windowMessages.filter(m => this.containsFUDKeywords(m.content));
      
      if (fudMessages.length < 2) {
        consecutiveQuiet++;
        if (consecutiveQuiet >= 3) {
          return time;
        }
      } else {
        consecutiveQuiet = 0;
      }
    }
    
    return undefined;
  }

  private getResponseMessages(afterTime: number, data: SentimentData): any[] {
    const messages = this.extractMessages(data);
    const responseWindow = 3600000 * 4; // 4 hours
    return messages.filter(m => 
      m.timestamp > afterTime && m.timestamp < afterTime + responseWindow
    );
  }

  private classifyCensorshipType(action: string): CensorshipAttempt['type'] {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('delete') || actionLower.includes('remove')) return 'deletion';
    if (actionLower.includes('ban') || actionLower.includes('suspend')) return 'ban';
    if (actionLower.includes('restrict') || actionLower.includes('limit')) return 'restriction';
    return 'warning';
  }

  private async measureAmplification(event: any, data: SentimentData): Promise<number> {
    const beforeVolume = this.getMessageVolume(event.timestamp - 3600000, event.timestamp, data);
    const afterVolume = this.getMessageVolume(event.timestamp, event.timestamp + 3600000, data);
    
    return afterVolume / Math.max(beforeVolume, 1);
  }

  private getMessageVolume(startTime: number, endTime: number, data: SentimentData): number {
    const messages = this.extractMessages(data);
    return messages.filter(m => m.timestamp >= startTime && m.timestamp <= endTime).length;
  }

  private groupCensorshipAttempts(attempts: CensorshipAttempt[]): CensorshipAttempt[][] {
    const groups: CensorshipAttempt[][] = [];
    const timeThreshold = 3600000; // 1 hour
    
    for (const attempt of attempts) {
      let added = false;
      
      for (const group of groups) {
        const lastAttempt = group[group.length - 1];
        if (attempt.timestamp - lastAttempt.timestamp < timeThreshold) {
          group.push(attempt);
          added = true;
          break;
        }
      }
      
      if (!added) {
        groups.push([attempt]);
      }
    }
    
    return groups;
  }

  private identifyTriggerEvent(attempts: CensorshipAttempt[]): string {
    // Identify the primary censorship event
    const typeCount = new Map<string, number>();
    
    for (const attempt of attempts) {
      typeCount.set(attempt.type, (typeCount.get(attempt.type) || 0) + 1);
    }
    
    let maxType = 'unknown';
    let maxCount = 0;
    
    for (const [type, count] of typeCount) {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    }
    
    return `${maxType} on ${attempts[0].platform}`;
  }

  private getMetricsBefore(timestamp: number, data: SentimentData): any {
    const window = 3600000; // 1 hour
    const messages = this.extractMessages(data);
    const beforeMessages = messages.filter(m => 
      m.timestamp >= timestamp - window && m.timestamp < timestamp
    );
    
    return {
      volume: beforeMessages.length,
      sentiment: this.calculateAverageSentiment(beforeMessages),
      engagement: beforeMessages.reduce((sum, m) => sum + (m.engagement || 0), 0)
    };
  }

  private getMetricsAfter(timestamp: number, data: SentimentData): any {
    const window = 3600000 * 4; // 4 hours (longer window for effect)
    const messages = this.extractMessages(data);
    const afterMessages = messages.filter(m => 
      m.timestamp > timestamp && m.timestamp <= timestamp + window
    );
    
    return {
      volume: afterMessages.length,
      sentiment: this.calculateAverageSentiment(afterMessages),
      engagement: afterMessages.reduce((sum, m) => sum + (m.engagement || 0), 0)
    };
  }

  private calculateViralityScore(metrics: any): number {
    // Simplified virality calculation
    const volumeScore = Math.min(metrics.volume / 1000, 1);
    const engagementScore = Math.min(metrics.engagement / 10000, 1);
    
    return (volumeScore + engagementScore) / 2;
  }

  private measureSustainedInterest(startTime: number, data: SentimentData): number {
    const messages = this.extractMessages(data);
    const dayInMs = 24 * 3600000;
    let sustainScore = 0;
    
    // Check interest levels for 7 days
    for (let day = 1; day <= 7; day++) {
      const dayStart = startTime + ((day - 1) * dayInMs);
      const dayEnd = startTime + (day * dayInMs);
      
      const dayMessages = messages.filter(m => 
        m.timestamp >= dayStart && m.timestamp < dayEnd
      );
      
      if (dayMessages.length > 50) {
        sustainScore += 1 / day; // Decay factor
      }
    }
    
    return Math.min(sustainScore / 2, 1);
  }

  private calculateRecoverySpeed(campaign: FUDCampaign): number {
    if (!campaign.endTime) return 0;
    
    const duration = campaign.endTime - campaign.startTime;
    const hoursDuration = duration / 3600000;
    
    // Faster recovery = higher score
    if (hoursDuration < 6) return 1;
    if (hoursDuration < 12) return 0.8;
    if (hoursDuration < 24) return 0.6;
    if (hoursDuration < 48) return 0.4;
    return 0.2;
  }

  private calculatePositiveReinforcement(messages: any[]): number {
    let reinforcementScore = 0;
    const positiveMessages = messages.filter(m => this.isPositiveResponse(m.content));
    
    // Look for chains of positive messages
    for (let i = 1; i < positiveMessages.length; i++) {
      const timeDiff = positiveMessages[i].timestamp - positiveMessages[i-1].timestamp;
      if (timeDiff < 300000) { // Within 5 minutes
        reinforcementScore += 0.1;
      }
    }
    
    return Math.min(reinforcementScore, 1);
  }

  private generatePatternTimeline(campaign: FUDCampaign): TimeSeriesPoint[] {
    const points: TimeSeriesPoint[] = [];
    const duration = (campaign.endTime || Date.now()) - campaign.startTime;
    const steps = 10;
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const timestamp = campaign.startTime + (duration * progress);
      
      // Simulate backfire curve
      let value: number;
      if (progress < 0.3) {
        value = -campaign.initialIntensity * (1 - progress * 3.33);
      } else {
        value = (progress - 0.3) * campaign.backfireMetrics.sentimentReversal * 1.43;
      }
      
      points.push({ timestamp, value });
    }
    
    return points;
  }

  private generateStreisandTimeline(effect: StreisandEffect): TimeSeriesPoint[] {
    const points: TimeSeriesPoint[] = [];
    const startTime = effect.censorshipAttempts[0].timestamp;
    const duration = 24 * 3600000; // 24 hours
    
    for (let i = 0; i <= 24; i++) {
      const timestamp = startTime + (i * 3600000);
      const hoursSinceStart = i;
      
      // Exponential growth then decay
      let value: number;
      if (hoursSinceStart < 6) {
        value = Math.pow(effect.attentionMultiplier, hoursSinceStart / 6);
      } else {
        const decay = Math.exp(-(hoursSinceStart - 6) / 12);
        value = effect.attentionMultiplier * decay;
      }
      
      points.push({ timestamp, value });
    }
    
    return points;
  }

  private calculateAverageSentiment(messages: any[]): number {
    if (messages.length === 0) return 0.5;
    
    const positiveCount = messages.filter(m => this.isPositiveResponse(m.content)).length;
    const negativeCount = messages.filter(m => this.containsFUDKeywords(m.content)).length;
    const neutralCount = messages.length - positiveCount - negativeCount;
    
    const score = (positiveCount * 1 + neutralCount * 0.5 + negativeCount * 0) / messages.length;
    return score;
  }

  private extractMessages(data: SentimentData): any[] {
    const messages: any[] = [];
    
    // Extract from various data sources
    if (data.reddit?.posts) {
      messages.push(...data.reddit.posts.map(p => ({
        content: p.content,
        timestamp: p.timestamp,
        source: 'reddit',
        userId: p.author,
        engagement: p.score
      })));
    }
    
    if (data.twitter?.tweets) {
      messages.push(...data.twitter.tweets.map(t => ({
        content: t.text,
        timestamp: t.timestamp,
        source: 'twitter',
        userId: t.authorId,
        engagement: t.likes + t.retweets,
        influence: t.authorFollowers > 10000 ? 0.8 : 0.3
      })));
    }
    
    if (data.discord?.messages) {
      messages.push(...data.discord.messages.map(m => ({
        content: m.content,
        timestamp: m.timestamp,
        source: 'discord',
        userId: m.authorId
      })));
    }
    
    return messages.sort((a, b) => a.timestamp - b.timestamp);
  }
}