import { BaseSignalDetector } from '../BaseSignalDetector';
import { SignalType, TextInput, SmartMoneySignal } from '../types';

interface WalletActivity {
  address: string;
  firstSeen: Date;
  lastSeen: Date;
  mentions: number;
  sentimentShifts: Array<{
    timestamp: Date;
    fromSentiment: number;
    toSentiment: number;
    magnitude: number;
  }>;
  projects: Set<string>;
  transactionRefs: Array<{
    txHash: string;
    timestamp: Date;
    type: 'buy' | 'sell' | 'transfer' | 'stake';
    amount?: string;
  }>;
  walletType: 'whale' | 'fund' | 'dex_trader' | 'early_investor' | 'unknown';
  reputation: number; // 0-1 score based on historical performance
}

interface DeveloperActivity {
  githubUser: string;
  repos: Set<string>;
  commitCount: number;
  lastCommit: Date;
  correlatedPriceMovements: Array<{
    repo: string;
    commitDate: Date;
    priceChangePercent: number;
    timeToImpact: number; // hours
  }>;
  languages: Set<string>;
  contributionIntensity: number; // commits per day average
}

interface ProjectActivity {
  name: string;
  symbol?: string;
  githubActivity: {
    stars: number;
    forks: number;
    commits: number;
    contributors: number;
    lastUpdate: Date;
    velocity: number; // commits per day
  };
  smartMoneyAddresses: Set<string>;
  developerBuzz: number; // 0-1 score
  socialMentions: number;
  sentimentTrend: 'accumulation' | 'distribution' | 'neutral';
}

interface AccumulationPattern {
  project: string;
  startDate: Date;
  duration: number; // hours
  walletCount: number;
  averagePosition: string;
  sentimentDivergence: number; // price vs sentiment
  socialSilence: boolean;
  characteristics: string[];
}

/**
 * Detects smart money sentiment footprints by correlating whale wallet activity,
 * developer engagement, and on-chain references with sentiment shifts
 */
export class SmartMoneyDetector extends BaseSignalDetector {
  private walletActivity: Map<string, WalletActivity> = new Map();
  private developerActivity: Map<string, DeveloperActivity> = new Map();
  private projectActivity: Map<string, ProjectActivity> = new Map();
  private knownSmartAddresses: Set<string> = new Set();
  private timeWindow = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  // Known smart money addresses (would be loaded from external source)
  private readonly smartMoneyAddresses = new Set([
    '0x...', // Placeholder for real addresses
    // These would typically be loaded from a database or API
  ]);
  
  // Wallet address patterns
  private readonly walletPatterns = {
    ethereum: /^0x[a-fA-F0-9]{40}$/,
    bitcoin: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
    solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
  };
  
  // GitHub activity keywords
  private readonly githubKeywords = [
    'commit', 'merge', 'release', 'deploy', 'mainnet',
    'audit', 'security', 'upgrade', 'feature', 'fix'
  ];
  
  // Smart money behavior patterns
  private readonly smartMoneyPatterns = [
    'early_accumulation', // Buying before major announcements
    'silent_accumulation', // Accumulating without social mentions
    'developer_correlation', // Buying correlated with dev activity
    'contrarian_entry', // Buying during negative sentiment
    'institutional_pattern', // Large, methodical purchases
    'pre_partnership', // Activity before partnership announcements
    'technical_accumulation', // Buying at key technical levels
    'cross_chain_activity' // Activity across multiple chains
  ];

  constructor() {
    super(SignalType.SMART_MONEY);
  }

  protected async performDetection(input: TextInput): Promise<SmartMoneySignal | null> {
    // Process the input for wallet mentions and GitHub activity
    this.processInput(input);
    
    // Clean old data
    this.cleanOldData();
    
    // Check if we have enough data
    if (this.walletActivity.size < 3 && this.developerActivity.size < 2) {
      this.debug('Insufficient smart money data', {
        wallets: this.walletActivity.size,
        developers: this.developerActivity.size
      });
      return null;
    }
    
    // Detect whale wallet patterns
    const whalePatterns = this.detectWhalePatterns();
    
    // Analyze developer activity correlation
    const developerCorrelation = this.analyzeDeveloperCorrelation();
    
    // Identify accumulation patterns
    const accumulationPatterns = this.identifyAccumulationPatterns();
    
    // Track smart money engagement
    const smartMoneyEngagement = this.trackSmartMoneyEngagement();
    
    // Analyze GitHub correlation
    const githubCorrelation = this.analyzeGitHubCorrelation();
    
    // Detect silent accumulation
    const silentAccumulation = this.detectSilentAccumulation();
    
    // Calculate signal strength
    const strength = this.calculateSmartMoneyStrength(
      whalePatterns,
      developerCorrelation,
      accumulationPatterns,
      smartMoneyEngagement
    );
    
    // Check if signal is significant
    if (Math.abs(strength) < 0.35) {
      this.debug('Smart money signal too weak', { strength });
      return null;
    }
    
    // Calculate confidence
    const confidence = this.calculateSmartMoneyConfidence(
      whalePatterns,
      developerCorrelation,
      githubCorrelation
    );

    return {
      id: this.generateSignalId(),
      type: SignalType.SMART_MONEY,
      strength,
      metadata: this.createMetadata(confidence, input.source),
      indicators: {
        whalePatterns,
        developerCorrelation,
        accumulationPatterns,
        smartMoneyEngagement,
        githubCorrelation,
        silentAccumulation
      }
    };
  }

  /**
   * Process input for wallet mentions and developer activity
   */
  private processInput(input: TextInput): void {
    const text = input.text.toLowerCase();
    const timestamp = input.timestamp || new Date();
    
    // Extract wallet addresses
    const wallets = this.extractWalletAddresses(text);
    for (const wallet of wallets) {
      this.updateWalletActivity(wallet, input, timestamp);
    }
    
    // Extract GitHub activity
    if (this.containsGitHubActivity(text)) {
      this.updateDeveloperActivity(input, timestamp);
    }
    
    // Extract project mentions
    const projects = this.extractProjectMentions(text);
    for (const project of projects) {
      this.updateProjectActivity(project, input, timestamp);
    }
    
    // Check for smart money indicators
    this.checkSmartMoneyIndicators(text, timestamp);
  }

  /**
   * Extract wallet addresses from text
   */
  private extractWalletAddresses(text: string): string[] {
    const addresses: string[] = [];
    
    // Check for Ethereum addresses
    const ethMatches = text.match(/0x[a-fA-F0-9]{40}/g) || [];
    addresses.push(...ethMatches);
    
    // Check for Bitcoin addresses
    const btcMatches = text.match(/[13][a-km-zA-HJ-NP-Z1-9]{25,34}/g) || [];
    addresses.push(...btcMatches);
    
    // Check for Solana addresses
    const solMatches = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g) || [];
    addresses.push(...solMatches);
    
    return addresses;
  }

  /**
   * Update wallet activity tracking
   */
  private updateWalletActivity(
    address: string, 
    input: TextInput, 
    timestamp: Date
  ): void {
    if (!this.walletActivity.has(address)) {
      this.walletActivity.set(address, {
        address,
        firstSeen: timestamp,
        lastSeen: timestamp,
        mentions: 0,
        sentimentShifts: [],
        projects: new Set(),
        transactionRefs: [],
        walletType: this.classifyWallet(address),
        reputation: this.getWalletReputation(address)
      });
    }
    
    const activity = this.walletActivity.get(address)!;
    activity.lastSeen = timestamp;
    activity.mentions++;
    
    // Track sentiment shifts
    if (input.sentiment !== undefined) {
      const lastSentiment = activity.sentimentShifts.length > 0
        ? activity.sentimentShifts[activity.sentimentShifts.length - 1].toSentiment
        : 0;
      
      if (Math.abs(input.sentiment - lastSentiment) > 0.2) {
        activity.sentimentShifts.push({
          timestamp,
          fromSentiment: lastSentiment,
          toSentiment: input.sentiment,
          magnitude: Math.abs(input.sentiment - lastSentiment)
        });
      }
    }
    
    // Extract transaction references
    const txRefs = this.extractTransactionRefs(input.text);
    activity.transactionRefs.push(...txRefs);
    
    // Extract project associations
    const projects = this.extractProjectMentions(input.text);
    projects.forEach(p => activity.projects.add(p));
  }

  /**
   * Check if text contains GitHub activity
   */
  private containsGitHubActivity(text: string): boolean {
    return this.githubKeywords.some(keyword => text.includes(keyword)) &&
           (text.includes('github') || text.includes('commit') || text.includes('merge'));
  }

  /**
   * Update developer activity tracking
   */
  private updateDeveloperActivity(input: TextInput, timestamp: Date): void {
    const githubUser = this.extractGitHubUser(input.text);
    if (!githubUser) return;
    
    if (!this.developerActivity.has(githubUser)) {
      this.developerActivity.set(githubUser, {
        githubUser,
        repos: new Set(),
        commitCount: 0,
        lastCommit: timestamp,
        correlatedPriceMovements: [],
        languages: new Set(),
        contributionIntensity: 0
      });
    }
    
    const activity = this.developerActivity.get(githubUser)!;
    activity.lastCommit = timestamp;
    activity.commitCount++;
    
    // Extract repository information
    const repos = this.extractRepos(input.text);
    repos.forEach(r => activity.repos.add(r));
    
    // Extract languages mentioned
    const languages = this.extractLanguages(input.text);
    languages.forEach(l => activity.languages.add(l));
    
    // Update contribution intensity
    this.updateContributionIntensity(activity);
  }

  /**
   * Extract project mentions from text
   */
  private extractProjectMentions(text: string): string[] {
    const projects: string[] = [];
    
    // Look for token symbols ($TOKEN)
    const symbolMatches = text.match(/\$[A-Z]{2,10}/g) || [];
    projects.push(...symbolMatches.map(s => s.substring(1)));
    
    // Look for project names (capitalized words near "project", "protocol", etc.)
    const projectPattern = /(?:project|protocol|platform|dapp)\s+([A-Z][a-zA-Z]+)/g;
    let match;
    while ((match = projectPattern.exec(text)) !== null) {
      projects.push(match[1]);
    }
    
    return [...new Set(projects)];
  }

  /**
   * Update project activity
   */
  private updateProjectActivity(
    project: string, 
    input: TextInput, 
    timestamp: Date
  ): void {
    if (!this.projectActivity.has(project)) {
      this.projectActivity.set(project, {
        name: project,
        githubActivity: {
          stars: 0,
          forks: 0,
          commits: 0,
          contributors: 0,
          lastUpdate: timestamp,
          velocity: 0
        },
        smartMoneyAddresses: new Set(),
        developerBuzz: 0,
        socialMentions: 0,
        sentimentTrend: 'neutral'
      });
    }
    
    const activity = this.projectActivity.get(project)!;
    activity.socialMentions++;
    
    // Update GitHub metrics if mentioned
    if (this.containsGitHubActivity(input.text)) {
      this.updateProjectGitHubMetrics(activity, input.text, timestamp);
    }
    
    // Track smart money addresses
    const wallets = this.extractWalletAddresses(input.text);
    wallets.forEach(w => {
      if (this.isSmartMoney(w)) {
        activity.smartMoneyAddresses.add(w);
      }
    });
    
    // Update developer buzz
    activity.developerBuzz = this.calculateDeveloperBuzz(activity);
    
    // Determine sentiment trend
    activity.sentimentTrend = this.determineSentimentTrend(project);
  }

  /**
   * Check for smart money indicators in text
   */
  private checkSmartMoneyIndicators(text: string, timestamp: Date): void {
    const indicators = [
      'whale', 'smart money', 'institutional', 'fund',
      'accumulating', 'loading', 'buying the dip',
      'silent accumulation', 'stealth mode'
    ];
    
    for (const indicator of indicators) {
      if (text.includes(indicator)) {
        // Extract associated wallets and projects
        const wallets = this.extractWalletAddresses(text);
        const projects = this.extractProjectMentions(text);
        
        // Mark these as potential smart money activity
        wallets.forEach(w => this.knownSmartAddresses.add(w));
      }
    }
  }

  /**
   * Detect whale wallet patterns
   */
  private detectWhalePatterns(): SmartMoneySignal['indicators']['whalePatterns'] {
    const patterns: SmartMoneySignal['indicators']['whalePatterns'] = [];
    
    for (const [address, activity] of this.walletActivity.entries()) {
      if (activity.walletType !== 'whale' && activity.walletType !== 'fund') continue;
      
      // Analyze sentiment correlation
      const sentimentCorrelation = this.calculateSentimentCorrelation(activity);
      
      // Analyze transaction patterns
      const transactionPattern = this.analyzeTransactionPattern(activity);
      
      // Calculate influence score
      const influenceScore = this.calculateWalletInfluence(activity);
      
      if (sentimentCorrelation > 0.5 || influenceScore > 0.6) {
        patterns.push({
          address,
          sentimentCorrelation,
          transactionPattern,
          influenceScore
        });
      }
    }
    
    // Sort by influence score
    return patterns.sort((a, b) => b.influenceScore - a.influenceScore);
  }

  /**
   * Analyze developer activity correlation
   */
  private analyzeDeveloperCorrelation(): SmartMoneySignal['indicators']['developerCorrelation'] {
    const activitySpikes: Array<{
      timestamp: Date;
      intensity: number;
      correlatedWallets: string[];
      priceImpact?: number;
    }> = [];
    
    // Group developer activity by time periods
    const hourlyActivity = this.groupDeveloperActivityByHour();
    
    for (const [hour, activities] of hourlyActivity.entries()) {
      if (activities.length > 2) { // Spike in activity
        const intensity = activities.length / 2; // Normalized
        
        // Find wallets active in the same period
        const correlatedWallets = this.findCorrelatedWallets(new Date(hour));
        
        if (correlatedWallets.length > 0) {
          activitySpikes.push({
            timestamp: new Date(hour),
            intensity,
            correlatedWallets
          });
        }
      }
    }
    
    // Calculate price correlation
    const priceCorrelation = this.calculateDeveloperPriceCorrelation();
    
    // Identify commit patterns
    const commitPatterns = this.identifyCommitPatterns();
    
    return {
      activitySpikes,
      priceCorrelation,
      commitPatterns
    };
  }

  /**
   * Identify accumulation patterns
   */
  private identifyAccumulationPatterns(): SmartMoneySignal['indicators']['accumulationPatterns'] {
    const patterns: AccumulationPattern[] = [];
    
    // Group wallet activity by project
    const projectAccumulation = new Map<string, WalletActivity[]>();
    
    for (const activity of this.walletActivity.values()) {
      for (const project of activity.projects) {
        if (!projectAccumulation.has(project)) {
          projectAccumulation.set(project, []);
        }
        projectAccumulation.get(project)!.push(activity);
      }
    }
    
    // Analyze each project for accumulation patterns
    for (const [project, wallets] of projectAccumulation.entries()) {
      if (wallets.length < 2) continue;
      
      const pattern = this.analyzeProjectAccumulation(project, wallets);
      if (pattern) {
        patterns.push(pattern);
      }
    }
    
    return patterns;
  }

  /**
   * Track smart money engagement patterns
   */
  private trackSmartMoneyEngagement(): SmartMoneySignal['indicators']['smartMoneyEngagement'] {
    const knownAddresses: string[] = [];
    const engagementTypes: string[] = [];
    const socialCorrelation = this.calculateSocialCorrelation();
    const timing = this.analyzeSmartMoneyTiming();
    
    // Identify known smart money addresses
    for (const address of this.walletActivity.keys()) {
      if (this.isSmartMoney(address)) {
        knownAddresses.push(address);
      }
    }
    
    // Determine engagement types
    for (const activity of this.walletActivity.values()) {
      if (this.isSmartMoney(activity.address)) {
        const types = this.determineEngagementTypes(activity);
        engagementTypes.push(...types);
      }
    }
    
    return {
      knownAddresses: knownAddresses.slice(0, 10), // Top 10
      engagementTypes: [...new Set(engagementTypes)],
      socialCorrelation,
      timing
    };
  }

  /**
   * Analyze GitHub activity correlation
   */
  private analyzeGitHubCorrelation(): SmartMoneySignal['indicators']['githubCorrelation'] {
    const repoActivity: Record<string, {
      commits: number;
      stars: number;
      sentiment: number;
    }> = {};
    
    // Aggregate repository activity
    for (const dev of this.developerActivity.values()) {
      for (const repo of dev.repos) {
        if (!repoActivity[repo]) {
          repoActivity[repo] = { commits: 0, stars: 0, sentiment: 0 };
        }
        repoActivity[repo].commits += dev.commitCount;
      }
    }
    
    // Get developer community metrics
    const developerMetrics = this.calculateDeveloperMetrics();
    
    // Calculate buzz patterns
    const buzzPatterns = this.identifyBuzzPatterns();
    
    return {
      repoActivity,
      developerMetrics,
      buzzPatterns
    };
  }

  /**
   * Detect silent accumulation patterns
   */
  private detectSilentAccumulation(): SmartMoneySignal['indicators']['silentAccumulation'] {
    const patterns: Array<{
      project: string;
      duration: number;
      walletCount: number;
      socialSilenceScore: number;
    }> = [];
    
    for (const [project, activity] of this.projectActivity.entries()) {
      // Calculate social silence score (high activity, low mentions)
      const socialSilenceScore = this.calculateSocialSilence(activity);
      
      if (socialSilenceScore > 0.7 && activity.smartMoneyAddresses.size > 2) {
        patterns.push({
          project,
          duration: Date.now() - activity.githubActivity.lastUpdate.getTime(),
          walletCount: activity.smartMoneyAddresses.size,
          socialSilenceScore
        });
      }
    }
    
    const detected = patterns.length > 0;
    const projects = patterns.map(p => p.project);
    const averageDuration = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.duration, 0) / patterns.length / (60 * 60 * 1000)
      : 0;
    
    return {
      detected,
      patterns,
      projects,
      averageDuration
    };
  }

  /**
   * Clean old data outside time window
   */
  private cleanOldData(): void {
    const cutoff = new Date(Date.now() - this.timeWindow);
    
    // Clean wallet activity
    for (const [address, activity] of this.walletActivity.entries()) {
      if (activity.lastSeen < cutoff) {
        this.walletActivity.delete(address);
      } else {
        // Clean old sentiment shifts and transaction refs
        activity.sentimentShifts = activity.sentimentShifts.filter(s => s.timestamp > cutoff);
        activity.transactionRefs = activity.transactionRefs.filter(t => t.timestamp > cutoff);
      }
    }
    
    // Clean developer activity
    for (const [user, activity] of this.developerActivity.entries()) {
      if (activity.lastCommit < cutoff) {
        this.developerActivity.delete(user);
      }
    }
    
    // Clean project activity
    for (const [project, activity] of this.projectActivity.entries()) {
      if (activity.githubActivity.lastUpdate < cutoff) {
        this.projectActivity.delete(project);
      }
    }
  }

  /**
   * Calculate smart money signal strength
   */
  private calculateSmartMoneyStrength(
    whalePatterns: SmartMoneySignal['indicators']['whalePatterns'],
    developerCorrelation: SmartMoneySignal['indicators']['developerCorrelation'],
    accumulationPatterns: SmartMoneySignal['indicators']['accumulationPatterns'],
    engagement: SmartMoneySignal['indicators']['smartMoneyEngagement']
  ): number {
    let strength = 0;
    
    // Whale patterns contribute positively
    if (whalePatterns.length > 0) {
      const avgInfluence = whalePatterns.reduce((sum, p) => sum + p.influenceScore, 0) / whalePatterns.length;
      strength += avgInfluence * 0.3;
    }
    
    // Developer correlation is bullish
    if (developerCorrelation.priceCorrelation > 0.6) {
      strength += 0.25;
    }
    
    // Multiple accumulation patterns = strong signal
    strength += Math.min(0.3, accumulationPatterns.length * 0.1);
    
    // Known smart money engagement
    if (engagement.knownAddresses.length > 5) {
      strength += 0.2;
    }
    
    // Early timing is especially bullish
    if (engagement.timing === 'early') {
      strength += 0.15;
    }
    
    return Math.max(-1, Math.min(1, strength));
  }

  /**
   * Calculate confidence in smart money signal
   */
  private calculateSmartMoneyConfidence(
    whalePatterns: SmartMoneySignal['indicators']['whalePatterns'],
    developerCorrelation: SmartMoneySignal['indicators']['developerCorrelation'],
    githubCorrelation: SmartMoneySignal['indicators']['githubCorrelation']
  ): number {
    let confidence = 0.5;
    
    // More whale patterns = higher confidence
    confidence += Math.min(0.2, whalePatterns.length * 0.05);
    
    // Strong developer correlation
    if (developerCorrelation.activitySpikes.length > 3) {
      confidence += 0.15;
    }
    
    // Active GitHub repos
    const activeRepos = Object.keys(githubCorrelation.repoActivity).length;
    confidence += Math.min(0.15, activeRepos * 0.03);
    
    return Math.min(1, confidence);
  }

  // Helper methods

  private classifyWallet(address: string): WalletActivity['walletType'] {
    // In a real implementation, this would check against known databases
    if (this.smartMoneyAddresses.has(address)) {
      return 'fund';
    }
    
    // Simple heuristic based on address patterns
    if (address.length > 40) {
      return 'whale';
    }
    
    return 'unknown';
  }

  private getWalletReputation(address: string): number {
    // In a real implementation, this would check historical performance
    if (this.smartMoneyAddresses.has(address)) {
      return 0.8;
    }
    return 0.5;
  }

  private extractTransactionRefs(text: string): WalletActivity['transactionRefs'] {
    const refs: WalletActivity['transactionRefs'] = [];
    
    // Look for transaction hashes
    const txPattern = /0x[a-fA-F0-9]{64}/g;
    const matches = text.match(txPattern) || [];
    
    for (const txHash of matches) {
      refs.push({
        txHash,
        timestamp: new Date(),
        type: this.determineTransactionType(text)
      });
    }
    
    return refs;
  }

  private determineTransactionType(text: string): 'buy' | 'sell' | 'transfer' | 'stake' {
    if (text.includes('buy') || text.includes('bought')) return 'buy';
    if (text.includes('sell') || text.includes('sold')) return 'sell';
    if (text.includes('stake') || text.includes('staking')) return 'stake';
    return 'transfer';
  }

  private extractGitHubUser(text: string): string | null {
    const userPattern = /github\.com\/([a-zA-Z0-9-]+)/;
    const match = text.match(userPattern);
    return match ? match[1] : null;
  }

  private extractRepos(text: string): string[] {
    const repos: string[] = [];
    const repoPattern = /([a-zA-Z0-9-]+\/[a-zA-Z0-9-]+)/g;
    const matches = text.match(repoPattern) || [];
    repos.push(...matches);
    return repos;
  }

  private extractLanguages(text: string): string[] {
    const languages = ['javascript', 'typescript', 'solidity', 'rust', 'go', 'python'];
    return languages.filter(lang => text.toLowerCase().includes(lang));
  }

  private updateContributionIntensity(activity: DeveloperActivity): void {
    const daysSinceFirst = Math.max(1, 
      (activity.lastCommit.getTime() - activity.lastCommit.getTime()) / (24 * 60 * 60 * 1000)
    );
    activity.contributionIntensity = activity.commitCount / daysSinceFirst;
  }

  private isSmartMoney(address: string): boolean {
    return this.smartMoneyAddresses.has(address) || 
           this.knownSmartAddresses.has(address) ||
           (this.walletActivity.get(address)?.reputation || 0) > 0.7;
  }

  private updateProjectGitHubMetrics(
    activity: ProjectActivity,
    text: string,
    timestamp: Date
  ): void {
    // Extract GitHub metrics from text (simplified)
    const numbers = text.match(/\d+/g) || [];
    if (numbers.length > 0) {
      activity.githubActivity.commits += parseInt(numbers[0], 10);
      activity.githubActivity.lastUpdate = timestamp;
    }
    
    // Update velocity
    const hoursSinceUpdate = (timestamp.getTime() - activity.githubActivity.lastUpdate.getTime()) / (60 * 60 * 1000);
    if (hoursSinceUpdate > 0) {
      activity.githubActivity.velocity = activity.githubActivity.commits / (hoursSinceUpdate / 24);
    }
  }

  private calculateDeveloperBuzz(activity: ProjectActivity): number {
    let buzz = 0;
    
    // GitHub activity contributes to buzz
    buzz += Math.min(0.3, activity.githubActivity.velocity / 10);
    
    // Smart money interest
    buzz += Math.min(0.3, activity.smartMoneyAddresses.size / 5);
    
    // Social mentions
    buzz += Math.min(0.4, activity.socialMentions / 100);
    
    return buzz;
  }

  private determineSentimentTrend(project: string): 'accumulation' | 'distribution' | 'neutral' {
    const wallets = Array.from(this.walletActivity.values())
      .filter(w => w.projects.has(project));
    
    if (wallets.length === 0) return 'neutral';
    
    const recentBuys = wallets.filter(w => 
      w.transactionRefs.some(t => t.type === 'buy' && 
        t.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000)
    ).length;
    
    const recentSells = wallets.filter(w => 
      w.transactionRefs.some(t => t.type === 'sell' && 
        t.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000)
    ).length;
    
    if (recentBuys > recentSells * 2) return 'accumulation';
    if (recentSells > recentBuys * 2) return 'distribution';
    return 'neutral';
  }

  private calculateSentimentCorrelation(activity: WalletActivity): number {
    if (activity.sentimentShifts.length < 2) return 0;
    
    // Calculate correlation between wallet activity and sentiment shifts
    let correlation = 0;
    for (const shift of activity.sentimentShifts) {
      if (shift.toSentiment > shift.fromSentiment) {
        correlation += shift.magnitude;
      }
    }
    
    return Math.min(1, correlation / activity.sentimentShifts.length);
  }

  private analyzeTransactionPattern(activity: WalletActivity): string {
    const buyCount = activity.transactionRefs.filter(t => t.type === 'buy').length;
    const sellCount = activity.transactionRefs.filter(t => t.type === 'sell').length;
    
    if (buyCount > sellCount * 2) return 'accumulation';
    if (sellCount > buyCount * 2) return 'distribution';
    if (activity.transactionRefs.length > 10) return 'active_trading';
    return 'holding';
  }

  private calculateWalletInfluence(activity: WalletActivity): number {
    let influence = activity.reputation;
    
    // More mentions = more influence
    influence += Math.min(0.2, activity.mentions / 50);
    
    // Projects associated
    influence += Math.min(0.2, activity.projects.size / 10);
    
    // Transaction volume
    influence += Math.min(0.1, activity.transactionRefs.length / 20);
    
    return Math.min(1, influence);
  }

  private groupDeveloperActivityByHour(): Map<number, DeveloperActivity[]> {
    const hourly = new Map<number, DeveloperActivity[]>();
    
    for (const activity of this.developerActivity.values()) {
      const hour = Math.floor(activity.lastCommit.getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000);
      if (!hourly.has(hour)) {
        hourly.set(hour, []);
      }
      hourly.get(hour)!.push(activity);
    }
    
    return hourly;
  }

  private findCorrelatedWallets(timestamp: Date): string[] {
    const timeWindow = 60 * 60 * 1000; // 1 hour
    const correlated: string[] = [];
    
    for (const [address, activity] of this.walletActivity.entries()) {
      const hasRecentActivity = activity.transactionRefs.some(t => 
        Math.abs(t.timestamp.getTime() - timestamp.getTime()) < timeWindow
      );
      
      if (hasRecentActivity) {
        correlated.push(address);
      }
    }
    
    return correlated;
  }

  private calculateDeveloperPriceCorrelation(): number {
    // Simplified correlation calculation
    let totalCorrelation = 0;
    let count = 0;
    
    for (const activity of this.developerActivity.values()) {
      if (activity.correlatedPriceMovements.length > 0) {
        const avgImpact = activity.correlatedPriceMovements.reduce(
          (sum, m) => sum + Math.abs(m.priceChangePercent), 0
        ) / activity.correlatedPriceMovements.length;
        
        totalCorrelation += avgImpact;
        count++;
      }
    }
    
    return count > 0 ? totalCorrelation / count / 100 : 0; // Normalize to 0-1
  }

  private identifyCommitPatterns(): string[] {
    const patterns: string[] = [];
    
    // Check for release patterns
    const hasReleasePattern = Array.from(this.developerActivity.values())
      .some(a => Array.from(a.repos).some(r => r.includes('release')));
    
    if (hasReleasePattern) {
      patterns.push('release_preparation');
    }
    
    // Check for security updates
    const hasSecurityPattern = Array.from(this.developerActivity.values())
      .some(a => a.languages.has('solidity'));
    
    if (hasSecurityPattern) {
      patterns.push('security_focus');
    }
    
    return patterns;
  }

  private analyzeProjectAccumulation(
    project: string,
    wallets: WalletActivity[]
  ): AccumulationPattern | null {
    if (wallets.length < 2) return null;
    
    // Find accumulation time window
    const timestamps = wallets.flatMap(w => w.transactionRefs.map(t => t.timestamp));
    if (timestamps.length === 0) return null;
    
    timestamps.sort((a, b) => a.getTime() - b.getTime());
    const startDate = timestamps[0];
    const endDate = timestamps[timestamps.length - 1];
    const duration = (endDate.getTime() - startDate.getTime()) / (60 * 60 * 1000);
    
    // Check for social silence
    const projectActivity = this.projectActivity.get(project);
    const socialSilence = projectActivity 
      ? projectActivity.socialMentions < wallets.length * 2
      : true;
    
    // Identify characteristics
    const characteristics: string[] = [];
    
    if (wallets.some(w => w.walletType === 'whale')) {
      characteristics.push('whale_participation');
    }
    
    if (duration < 48) {
      characteristics.push('rapid_accumulation');
    }
    
    if (socialSilence) {
      characteristics.push('under_radar');
    }
    
    const hasSmartMoney = wallets.some(w => this.isSmartMoney(w.address));
    if (hasSmartMoney) {
      characteristics.push('smart_money_involved');
    }
    
    return {
      project,
      startDate,
      duration,
      walletCount: wallets.length,
      averagePosition: 'N/A', // Would need price data
      sentimentDivergence: 0, // Would need price data
      socialSilence,
      characteristics
    };
  }

  private calculateSocialCorrelation(): number {
    // Calculate correlation between smart money activity and social mentions
    let correlation = 0;
    let count = 0;
    
    for (const project of this.projectActivity.values()) {
      if (project.smartMoneyAddresses.size > 0) {
        const socialScore = Math.min(1, project.socialMentions / 100);
        const smartMoneyScore = Math.min(1, project.smartMoneyAddresses.size / 10);
        
        // Inverse correlation (smart money likes quiet accumulation)
        correlation += (1 - Math.abs(socialScore - smartMoneyScore));
        count++;
      }
    }
    
    return count > 0 ? correlation / count : 0;
  }

  private analyzeSmartMoneyTiming(): 'early' | 'peak' | 'late' {
    // Analyze when smart money is entering relative to social activity
    const recentActivity = Array.from(this.walletActivity.values())
      .filter(w => this.isSmartMoney(w.address))
      .filter(w => w.lastSeen.getTime() > Date.now() - 24 * 60 * 60 * 1000);
    
    if (recentActivity.length === 0) return 'late';
    
    // Check social activity trend
    const socialTrend = this.calculateSocialTrend();
    
    if (socialTrend < 0.3) return 'early';
    if (socialTrend > 0.7) return 'late';
    return 'peak';
  }

  private calculateSocialTrend(): number {
    // Calculate normalized social activity trend
    let totalMentions = 0;
    let recentMentions = 0;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    for (const project of this.projectActivity.values()) {
      totalMentions += project.socialMentions;
      // Estimate recent mentions (simplified)
      recentMentions += project.socialMentions * 0.3;
    }
    
    return totalMentions > 0 ? recentMentions / totalMentions : 0;
  }

  private determineEngagementTypes(activity: WalletActivity): string[] {
    const types: string[] = [];
    
    const buyCount = activity.transactionRefs.filter(t => t.type === 'buy').length;
    const stakeCount = activity.transactionRefs.filter(t => t.type === 'stake').length;
    
    if (buyCount > 5) types.push('heavy_accumulation');
    if (stakeCount > 0) types.push('long_term_commitment');
    if (activity.projects.size > 3) types.push('ecosystem_play');
    if (activity.sentimentShifts.length > 2) types.push('sentiment_leader');
    
    return types;
  }

  private calculateDeveloperMetrics(): SmartMoneySignal['indicators']['githubCorrelation']['developerMetrics'] {
    const totalDevelopers = this.developerActivity.size;
    const activeDevelopers = Array.from(this.developerActivity.values())
      .filter(d => d.lastCommit.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length;
    
    const avgContribution = totalDevelopers > 0
      ? Array.from(this.developerActivity.values())
          .reduce((sum, d) => sum + d.contributionIntensity, 0) / totalDevelopers
      : 0;
    
    const uniqueRepos = new Set(
      Array.from(this.developerActivity.values())
        .flatMap(d => Array.from(d.repos))
    ).size;
    
    return {
      totalDevelopers,
      activeDevelopers,
      avgContribution,
      uniqueRepos
    };
  }

  private identifyBuzzPatterns(): string[] {
    const patterns: string[] = [];
    
    // Check for coordinated development
    const developerTimestamps = Array.from(this.developerActivity.values())
      .map(d => d.lastCommit.getTime());
    
    if (developerTimestamps.length > 3) {
      const stdDev = this.calculateStandardDeviation(developerTimestamps);
      const mean = developerTimestamps.reduce((a, b) => a + b, 0) / developerTimestamps.length;
      
      if (stdDev < mean * 0.1) {
        patterns.push('coordinated_development');
      }
    }
    
    // Check for feature releases
    const hasFeatureKeywords = Array.from(this.developerActivity.values())
      .some(d => Array.from(d.repos).some(r => 
        r.includes('feature') || r.includes('release') || r.includes('v2')
      ));
    
    if (hasFeatureKeywords) {
      patterns.push('feature_release_incoming');
    }
    
    return patterns;
  }

  private calculateSocialSilence(activity: ProjectActivity): number {
    // High GitHub activity but low social mentions = silent accumulation
    const githubScore = Math.min(1, activity.githubActivity.velocity / 10);
    const socialScore = Math.min(1, activity.socialMentions / 100);
    
    // Inverse relationship
    return githubScore * (1 - socialScore);
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}