import { BaseSignalDetector } from '../BaseSignalDetector';
import { SignalType, TextInput, InfluencerNetworkSignal } from '../types';

interface InfluencerNode {
  id: string;
  followers: number;
  tier: 'mega' | 'macro' | 'micro' | 'nano';
  firstMention?: Date;
  mentions: Set<string>;
  mentionedBy: Set<string>;
  degree: number;
  centrality: number;
  messages: Array<{
    text: string;
    timestamp: Date;
    mentions: string[];
  }>;
}

interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  timestamps: Date[];
}

/**
 * Detects influencer network patterns and coordination
 * Maps influence propagation paths and identifies coordinated activity
 */
export class InfluencerNetworkDetector extends BaseSignalDetector {
  private network: Map<string, InfluencerNode> = new Map();
  private edges: Map<string, NetworkEdge> = new Map();
  private timeWindow = 24 * 60 * 60 * 1000; // 24 hours
  
  // Influencer tier thresholds
  private readonly tierThresholds = {
    mega: 100000,
    macro: 10000,
    micro: 1000,
    nano: 0
  };

  // Coordination detection patterns
  private readonly suspiciousPatterns = [
    'simultaneous posting', // Multiple accounts posting within minutes
    'identical messaging', // Same or very similar content
    'circular mentions', // A mentions B, B mentions C, C mentions A
    'burst activity', // Sudden spike in mentions
    'dormant activation', // Previously inactive accounts suddenly active
    'follow-unfollow chains', // Coordinated follow/unfollow patterns
    'time zone anomaly', // Activity patterns inconsistent with claimed location
    'bot-like timing' // Posts at exact intervals
  ];

  constructor() {
    super(SignalType.INFLUENCER_NETWORK);
  }

  protected async performDetection(input: TextInput): Promise<InfluencerNetworkSignal | null> {
    // Add message to network
    this.addToNetwork(input);
    
    // Clean old data outside time window
    this.cleanOldData();
    
    // Check if we have enough data
    if (this.network.size < 5) {
      this.debug('Insufficient network data', { nodeCount: this.network.size });
      return null;
    }

    // Calculate network metrics
    const networkMetrics = this.calculateNetworkMetrics();
    
    // Classify influencers by tier
    const influencerTiers = this.classifyInfluencerTiers();
    
    // Detect propagation paths
    const propagationPaths = this.detectPropagationPaths();
    
    // Identify patient zero accounts
    const patientZeroAccounts = this.identifyPatientZero();
    
    // Analyze coordination indicators
    const coordinationIndicators = this.analyzeCoordination();
    
    // Determine influence flow
    const influenceFlow = this.analyzeInfluenceFlow();
    
    // Calculate signal strength based on network patterns
    const strength = this.calculateNetworkSignalStrength(
      networkMetrics,
      coordinationIndicators,
      influenceFlow
    );
    
    // Check if signal is significant
    if (Math.abs(strength) < 0.3) {
      this.debug('Network signal too weak', { strength });
      return null;
    }

    // Calculate confidence
    const confidence = this.calculateNetworkConfidence(
      networkMetrics,
      coordinationIndicators,
      propagationPaths.length
    );

    return {
      id: this.generateSignalId(),
      type: SignalType.INFLUENCER_NETWORK,
      strength,
      metadata: this.createMetadata(confidence, input.source),
      indicators: {
        networkMetrics,
        influencerTiers,
        propagationPaths: propagationPaths.slice(0, 10), // Top 10 paths
        patientZeroAccounts: patientZeroAccounts.slice(0, 5), // Top 5
        coordinationIndicators,
        influenceFlow
      }
    };
  }

  /**
   * Add a message to the network graph
   */
  private addToNetwork(input: TextInput): void {
    if (!input.author) return;

    const author = input.author.toLowerCase();
    const timestamp = input.timestamp || new Date();
    
    // Create or update author node
    if (!this.network.has(author)) {
      this.network.set(author, {
        id: author,
        followers: input.followers || 0,
        tier: this.getTier(input.followers || 0),
        firstMention: timestamp,
        mentions: new Set(),
        mentionedBy: new Set(),
        degree: 0,
        centrality: 0,
        messages: []
      });
    }
    
    const authorNode = this.network.get(author)!;
    authorNode.messages.push({
      text: input.text,
      timestamp,
      mentions: input.mentions || []
    });

    // Process mentions
    if (input.mentions && input.mentions.length > 0) {
      for (const mention of input.mentions) {
        const mentionLower = mention.toLowerCase();
        
        // Create mentioned user if not exists
        if (!this.network.has(mentionLower)) {
          this.network.set(mentionLower, {
            id: mentionLower,
            followers: 0,
            tier: 'nano',
            mentions: new Set(),
            mentionedBy: new Set(),
            degree: 0,
            centrality: 0,
            messages: []
          });
        }
        
        // Update relationships
        authorNode.mentions.add(mentionLower);
        this.network.get(mentionLower)!.mentionedBy.add(author);
        
        // Update edges
        const edgeKey = `${author}->${mentionLower}`;
        if (!this.edges.has(edgeKey)) {
          this.edges.set(edgeKey, {
            source: author,
            target: mentionLower,
            weight: 0,
            timestamps: []
          });
        }
        
        const edge = this.edges.get(edgeKey)!;
        edge.weight++;
        edge.timestamps.push(timestamp);
      }
    }

    // Update node degrees
    this.updateNodeDegrees();
  }

  /**
   * Clean data outside the time window
   */
  private cleanOldData(): void {
    const cutoff = new Date(Date.now() - this.timeWindow);
    
    // Clean old messages from nodes
    for (const node of this.network.values()) {
      node.messages = node.messages.filter(m => m.timestamp > cutoff);
    }
    
    // Remove nodes with no recent activity
    const nodesToRemove: string[] = [];
    for (const [id, node] of this.network.entries()) {
      if (node.messages.length === 0 && (!node.firstMention || node.firstMention < cutoff)) {
        nodesToRemove.push(id);
      }
    }
    
    for (const id of nodesToRemove) {
      this.network.delete(id);
    }
    
    // Clean edges
    const edgesToRemove: string[] = [];
    for (const [key, edge] of this.edges.entries()) {
      edge.timestamps = edge.timestamps.filter(t => t > cutoff);
      if (edge.timestamps.length === 0) {
        edgesToRemove.push(key);
      } else {
        edge.weight = edge.timestamps.length;
      }
    }
    
    for (const key of edgesToRemove) {
      this.edges.delete(key);
    }
  }

  /**
   * Get influencer tier based on follower count
   */
  private getTier(followers: number): 'mega' | 'macro' | 'micro' | 'nano' {
    if (followers >= this.tierThresholds.mega) return 'mega';
    if (followers >= this.tierThresholds.macro) return 'macro';
    if (followers >= this.tierThresholds.micro) return 'micro';
    return 'nano';
  }

  /**
   * Update node degrees and centrality
   */
  private updateNodeDegrees(): void {
    // Calculate degree for each node
    for (const node of this.network.values()) {
      node.degree = node.mentions.size + node.mentionedBy.size;
    }
    
    // Calculate betweenness centrality (simplified)
    this.calculateCentrality();
  }

  /**
   * Calculate network-wide metrics
   */
  private calculateNetworkMetrics(): InfluencerNetworkSignal['indicators']['networkMetrics'] {
    const nodes = Array.from(this.network.values());
    const totalNodes = nodes.length;
    const totalEdges = this.edges.size;
    
    // Average degree
    const avgDegree = totalNodes > 0 
      ? nodes.reduce((sum, node) => sum + node.degree, 0) / totalNodes 
      : 0;
    
    // Network density
    const maxPossibleEdges = totalNodes * (totalNodes - 1);
    const density = maxPossibleEdges > 0 ? totalEdges / maxPossibleEdges : 0;
    
    // Average centrality
    const centralityScore = totalNodes > 0
      ? nodes.reduce((sum, node) => sum + node.centrality, 0) / totalNodes
      : 0;

    return {
      totalNodes,
      avgDegree,
      density,
      centralityScore
    };
  }

  /**
   * Classify influencers by tier
   */
  private classifyInfluencerTiers(): InfluencerNetworkSignal['indicators']['influencerTiers'] {
    const tiers = {
      mega: [] as string[],
      macro: [] as string[],
      micro: [] as string[],
      nano: [] as string[]
    };

    for (const node of this.network.values()) {
      if (node.messages.length > 0) { // Only active nodes
        tiers[node.tier].push(node.id);
      }
    }

    // Sort by activity level within each tier
    for (const tier of Object.keys(tiers) as Array<keyof typeof tiers>) {
      tiers[tier].sort((a, b) => {
        const nodeA = this.network.get(a)!;
        const nodeB = this.network.get(b)!;
        return nodeB.messages.length - nodeA.messages.length;
      });
    }

    return tiers;
  }

  /**
   * Detect influence propagation paths
   */
  private detectPropagationPaths(): InfluencerNetworkSignal['indicators']['propagationPaths'] {
    const paths: InfluencerNetworkSignal['indicators']['propagationPaths'] = [];
    
    // Find chains of mentions
    for (const [source, node] of this.network.entries()) {
      if (node.mentions.size > 0) {
        const targets = Array.from(node.mentions);
        const timestamps = node.messages
          .filter(m => m.mentions.length > 0)
          .map(m => m.timestamp);
        
        if (timestamps.length > 0) {
          const velocity = this.calculateVelocity(timestamps);
          
          paths.push({
            source,
            targets,
            timestamp: timestamps[0],
            velocity
          });
        }
      }
    }
    
    // Sort by velocity (fastest spreading first)
    return paths.sort((a, b) => b.velocity - a.velocity);
  }

  /**
   * Identify patient zero accounts
   */
  private identifyPatientZero(): InfluencerNetworkSignal['indicators']['patientZeroAccounts'] {
    const candidates: InfluencerNetworkSignal['indicators']['patientZeroAccounts'] = [];
    
    // Find earliest mentions with high propagation
    for (const [id, node] of this.network.entries()) {
      if (node.firstMention && node.mentions.size > 2) {
        // Calculate how many others mentioned the same topic after this account
        const subsequentMentions = this.countSubsequentMentions(id, node.firstMention);
        
        if (subsequentMentions > 5) {
          candidates.push({
            account: id,
            firstMention: node.firstMention,
            followersAtTime: node.followers,
            prePumpTiming: 0 // This would need price data to calculate
          });
        }
      }
    }
    
    // Sort by earliest mention
    return candidates.sort((a, b) => a.firstMention.getTime() - b.firstMention.getTime());
  }

  /**
   * Analyze coordination indicators
   */
  private analyzeCoordination(): InfluencerNetworkSignal['indicators']['coordinationIndicators'] {
    const suspiciousPatterns: string[] = [];
    
    // Check for simultaneous posting
    const simultaneousThreshold = 5 * 60 * 1000; // 5 minutes
    const timeClusters = this.findTimeClusters(simultaneousThreshold);
    if (timeClusters.length > 0) {
      suspiciousPatterns.push('simultaneous posting');
    }
    
    // Check for identical messaging
    const messageSimilarity = this.calculateMessageSimilarity();
    if (messageSimilarity > 0.7) {
      suspiciousPatterns.push('identical messaging');
    }
    
    // Check for circular mentions
    if (this.hasCircularMentions()) {
      suspiciousPatterns.push('circular mentions');
    }
    
    // Check for burst activity
    const burstScore = this.detectBurstActivity();
    if (burstScore > 0.7) {
      suspiciousPatterns.push('burst activity');
    }
    
    // Calculate alignment score
    const alignmentScore = this.calculateAlignmentScore();
    
    // Calculate temporal clustering
    const temporalClustering = timeClusters.length > 0 
      ? Math.min(1, timeClusters.length / 10) 
      : 0;

    return {
      alignmentScore,
      temporalClustering,
      messageSimiliarity: messageSimilarity,
      suspiciousPatterns
    };
  }

  /**
   * Analyze influence flow patterns
   */
  private analyzeInfluenceFlow(): InfluencerNetworkSignal['indicators']['influenceFlow'] {
    // Determine if influence is concentrated or distributed
    const centralityValues = Array.from(this.network.values())
      .map(n => n.centrality)
      .sort((a, b) => b - a);
    
    const top20Percent = Math.ceil(centralityValues.length * 0.2);
    const top20Sum = centralityValues.slice(0, top20Percent).reduce((a, b) => a + b, 0);
    const totalSum = centralityValues.reduce((a, b) => a + b, 0);
    
    const concentration = totalSum > 0 ? top20Sum / totalSum : 0;
    const direction = concentration > 0.6 ? 'concentrated' : 'distributed';
    
    // Calculate flow rate
    const recentMessages = this.getRecentMessages(60 * 60 * 1000); // Last hour
    const flowRate = recentMessages.length;
    
    // Check for critical mass
    const activeInfluencers = this.countActiveInfluencers();
    const criticalMass = activeInfluencers.mega > 2 || 
                        activeInfluencers.macro > 5 || 
                        activeInfluencers.micro > 10;
    
    // Detect tipping point
    const tippingPoint = this.detectTippingPoint();

    return {
      direction,
      flowRate,
      criticalMass,
      tippingPoint
    };
  }

  /**
   * Calculate network signal strength
   */
  private calculateNetworkSignalStrength(
    metrics: InfluencerNetworkSignal['indicators']['networkMetrics'],
    coordination: InfluencerNetworkSignal['indicators']['coordinationIndicators'],
    flow: InfluencerNetworkSignal['indicators']['influenceFlow']
  ): number {
    let strength = 0;
    
    // Network size and density contribute to strength
    strength += Math.min(0.3, metrics.totalNodes / 100);
    strength += metrics.density * 0.2;
    strength += metrics.centralityScore * 0.2;
    
    // Coordination indicators (suspicious = bearish)
    if (coordination.suspiciousPatterns.length > 2) {
      strength -= 0.3;
    }
    
    // High alignment without suspicious patterns = bullish
    if (coordination.alignmentScore > 0.7 && coordination.suspiciousPatterns.length < 2) {
      strength += 0.3;
    }
    
    // Critical mass = strong signal
    if (flow.criticalMass) {
      strength += 0.2;
    }
    
    // Concentrated influence = potential manipulation
    if (flow.direction === 'concentrated' && coordination.suspiciousPatterns.length > 0) {
      strength -= 0.2;
    }
    
    return Math.max(-1, Math.min(1, strength));
  }

  /**
   * Calculate confidence in network signal
   */
  private calculateNetworkConfidence(
    metrics: InfluencerNetworkSignal['indicators']['networkMetrics'],
    coordination: InfluencerNetworkSignal['indicators']['coordinationIndicators'],
    pathCount: number
  ): number {
    let confidence = 0.5;
    
    // More nodes = higher confidence
    confidence += Math.min(0.2, metrics.totalNodes / 50);
    
    // Clear patterns = higher confidence
    confidence += coordination.alignmentScore * 0.2;
    
    // Multiple propagation paths = higher confidence
    confidence += Math.min(0.1, pathCount / 20);
    
    return Math.min(1, confidence);
  }

  /**
   * Calculate simplified betweenness centrality
   */
  private calculateCentrality(): void {
    // Reset centrality scores
    for (const node of this.network.values()) {
      node.centrality = 0;
    }
    
    // Simplified centrality based on mention relationships
    for (const node of this.network.values()) {
      // Nodes that are mentioned by many and mention many have high centrality
      const inDegree = node.mentionedBy.size;
      const outDegree = node.mentions.size;
      const totalNodes = this.network.size;
      
      if (totalNodes > 1) {
        node.centrality = (inDegree + outDegree) / (2 * (totalNodes - 1));
      }
    }
  }

  /**
   * Calculate velocity of mentions
   */
  private calculateVelocity(timestamps: Date[]): number {
    if (timestamps.length < 2) return 0;
    
    const sorted = timestamps.sort((a, b) => a.getTime() - b.getTime());
    const timeSpan = sorted[sorted.length - 1].getTime() - sorted[0].getTime();
    const hours = timeSpan / (60 * 60 * 1000);
    
    return hours > 0 ? timestamps.length / hours : timestamps.length;
  }

  /**
   * Count mentions that occurred after a given account's first mention
   */
  private countSubsequentMentions(accountId: string, afterTime: Date): number {
    let count = 0;
    
    for (const [id, node] of this.network.entries()) {
      if (id !== accountId && node.firstMention && node.firstMention > afterTime) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Find clusters of activity within time windows
   */
  private findTimeClusters(threshold: number): Date[][] {
    const allTimestamps = this.getAllMessageTimestamps();
    const clusters: Date[][] = [];
    
    if (allTimestamps.length === 0) return clusters;
    
    allTimestamps.sort((a, b) => a.getTime() - b.getTime());
    
    let currentCluster: Date[] = [allTimestamps[0]];
    
    for (let i = 1; i < allTimestamps.length; i++) {
      const timeDiff = allTimestamps[i].getTime() - allTimestamps[i - 1].getTime();
      
      if (timeDiff <= threshold) {
        currentCluster.push(allTimestamps[i]);
      } else {
        if (currentCluster.length > 3) { // Significant cluster
          clusters.push([...currentCluster]);
        }
        currentCluster = [allTimestamps[i]];
      }
    }
    
    if (currentCluster.length > 3) {
      clusters.push(currentCluster);
    }
    
    return clusters;
  }

  /**
   * Calculate similarity between messages
   */
  private calculateMessageSimilarity(): number {
    const allMessages = this.getAllMessages();
    if (allMessages.length < 2) return 0;
    
    let totalSimilarity = 0;
    let comparisons = 0;
    
    // Compare recent messages
    const recentMessages = allMessages.slice(-20);
    
    for (let i = 0; i < recentMessages.length; i++) {
      for (let j = i + 1; j < recentMessages.length; j++) {
        const similarity = this.getStringSimilarity(
          recentMessages[i].toLowerCase(),
          recentMessages[j].toLowerCase()
        );
        totalSimilarity += similarity;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  /**
   * Simple string similarity calculation
   */
  private getStringSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Check for circular mention patterns
   */
  private hasCircularMentions(): boolean {
    // Look for A->B->C->A patterns
    for (const [sourceId, source] of this.network.entries()) {
      for (const targetId of source.mentions) {
        const target = this.network.get(targetId);
        if (!target) continue;
        
        for (const tertiaryId of target.mentions) {
          const tertiary = this.network.get(tertiaryId);
          if (!tertiary) continue;
          
          if (tertiary.mentions.has(sourceId)) {
            return true; // Found circular pattern
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Detect burst activity patterns
   */
  private detectBurstActivity(): number {
    const hourlyActivity = this.getHourlyActivity();
    if (hourlyActivity.length < 2) return 0;
    
    // Calculate standard deviation
    const mean = hourlyActivity.reduce((a, b) => a + b, 0) / hourlyActivity.length;
    const variance = hourlyActivity.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / hourlyActivity.length;
    const stdDev = Math.sqrt(variance);
    
    // Find spikes
    const spikes = hourlyActivity.filter(activity => activity > mean + 2 * stdDev);
    
    return Math.min(1, spikes.length / hourlyActivity.length);
  }

  /**
   * Calculate alignment score
   */
  private calculateAlignmentScore(): number {
    // Check how aligned influencers are in their messaging
    const influencerMessages = this.getInfluencerMessages();
    if (influencerMessages.length < 2) return 0;
    
    let alignmentScore = 0;
    
    // Check for common themes/keywords
    const keywordFrequency = new Map<string, number>();
    
    for (const message of influencerMessages) {
      const keywords = this.extractKeywords(message);
      for (const keyword of keywords) {
        keywordFrequency.set(keyword, (keywordFrequency.get(keyword) || 0) + 1);
      }
    }
    
    // Keywords mentioned by multiple influencers indicate alignment
    const alignedKeywords = Array.from(keywordFrequency.entries())
      .filter(([_, freq]) => freq > influencerMessages.length * 0.3);
    
    alignmentScore = Math.min(1, alignedKeywords.length / 10);
    
    return alignmentScore;
  }

  /**
   * Get all message timestamps
   */
  private getAllMessageTimestamps(): Date[] {
    const timestamps: Date[] = [];
    
    for (const node of this.network.values()) {
      timestamps.push(...node.messages.map(m => m.timestamp));
    }
    
    return timestamps;
  }

  /**
   * Get all messages
   */
  private getAllMessages(): string[] {
    const messages: string[] = [];
    
    for (const node of this.network.values()) {
      messages.push(...node.messages.map(m => m.text));
    }
    
    return messages;
  }

  /**
   * Get recent messages
   */
  private getRecentMessages(timeWindow: number): string[] {
    const cutoff = new Date(Date.now() - timeWindow);
    const messages: string[] = [];
    
    for (const node of this.network.values()) {
      const recentMessages = node.messages
        .filter(m => m.timestamp > cutoff)
        .map(m => m.text);
      messages.push(...recentMessages);
    }
    
    return messages;
  }

  /**
   * Get hourly activity levels
   */
  private getHourlyActivity(): number[] {
    const hourlyBuckets = new Map<number, number>();
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    for (const node of this.network.values()) {
      for (const message of node.messages) {
        const timestamp = message.timestamp.getTime();
        if (timestamp > oneDayAgo) {
          const hourBucket = Math.floor((now - timestamp) / (60 * 60 * 1000));
          hourlyBuckets.set(hourBucket, (hourlyBuckets.get(hourBucket) || 0) + 1);
        }
      }
    }
    
    // Convert to array (0 = most recent hour, 23 = 23 hours ago)
    const activity: number[] = [];
    for (let i = 0; i < 24; i++) {
      activity.push(hourlyBuckets.get(i) || 0);
    }
    
    return activity;
  }

  /**
   * Count active influencers by tier
   */
  private countActiveInfluencers(): Record<'mega' | 'macro' | 'micro' | 'nano', number> {
    const counts = {
      mega: 0,
      macro: 0,
      micro: 0,
      nano: 0
    };
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const node of this.network.values()) {
      const isActive = node.messages.some(m => m.timestamp > oneHourAgo);
      if (isActive) {
        counts[node.tier]++;
      }
    }
    
    return counts;
  }

  /**
   * Detect potential tipping point
   */
  private detectTippingPoint(): Date | null {
    const activityHistory = this.getHourlyActivity();
    
    // Look for exponential growth pattern
    for (let i = 0; i < activityHistory.length - 2; i++) {
      const current = activityHistory[i];
      const previous = activityHistory[i + 1];
      const beforePrevious = activityHistory[i + 2];
      
      // Check if activity is doubling each hour
      if (previous > 0 && current > previous * 1.8 && previous > beforePrevious * 1.8) {
        // Found potential tipping point
        const hoursAgo = i;
        return new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
      }
    }
    
    return null;
  }

  /**
   * Get messages from influencers (macro and above)
   */
  private getInfluencerMessages(): string[] {
    const messages: string[] = [];
    
    for (const node of this.network.values()) {
      if (node.tier === 'mega' || node.tier === 'macro') {
        messages.push(...node.messages.map(m => m.text));
      }
    }
    
    return messages;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - words longer than 4 chars, excluding common words
    const commonWords = new Set([
      'the', 'and', 'for', 'with', 'this', 'that', 'have', 'from',
      'will', 'what', 'when', 'where', 'which', 'about', 'would',
      'there', 'their', 'been', 'being', 'these', 'those', 'were'
    ]);
    
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 4 && !commonWords.has(word))
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => word.length > 0);
  }
}