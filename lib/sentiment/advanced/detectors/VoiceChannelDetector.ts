import { EventEmitter } from 'events';

interface VoiceChannelData {
  channelId: string;
  serverId: string;
  platform: 'discord' | 'telegram';
  timestamp: number;
  userCount: number;
  peakUserCount: number;
  duration: number; // seconds
  speakerChanges: number;
  averageVolume: number; // 0-1
  peakVolume: number; // 0-1
  emotionalTone?: {
    excitement: number; // 0-1
    urgency: number; // 0-1
    consensus: number; // 0-1
    negativity: number; // 0-1
  };
  topics?: string[];
  relatedAssets?: string[];
}

interface VoiceActivityPattern {
  pattern: 'surge' | 'sustained' | 'migration' | 'pump_signal' | 'panic' | 'euphoria';
  timestamp: number;
  confidence: number;
  channels: string[];
  metrics: {
    userGrowthRate: number; // users per minute
    energyLevel: number; // 0-1
    crossServerActivity: number; // 0-1
    sustainedDuration: number; // minutes
  };
}

interface VoicePumpSignal {
  timestamp: number;
  type: 'vc_pump_detected' | 'high_energy_detected' | 'migration_detected';
  severity: 'high' | 'medium' | 'low';
  pumpMetrics: {
    suddennessScore: number; // 0-1
    energyScore: number; // 0-1
    coordinationScore: number; // 0-1
    sustainabilityScore: number; // 0-1
  };
  affectedChannels: Array<{
    channelId: string;
    serverId: string;
    userCount: number;
    energyLevel: number;
  }>;
  migrationPatterns?: Array<{
    fromServer: string;
    toServer: string;
    userCount: number;
    timestamp: number;
  }>;
  predictedDuration: number; // minutes
  confidence: number;
}

interface ServerVoiceMetrics {
  serverId: string;
  platform: 'discord' | 'telegram';
  totalUsers: number;
  activeChannels: number;
  averageEnergy: number;
  recentSurges: number;
  crossServerConnections: Set<string>;
}

interface EnergyAnalysis {
  timestamp: number;
  energyLevel: number; // 0-1
  components: {
    volume: number; // Audio intensity
    speakerDiversity: number; // How many different speakers
    speakerOverlap: number; // People talking over each other
    emotionalIntensity: number; // Detected emotion level
    topicCoherence: number; // How focused the discussion is
  };
  trend: 'increasing' | 'stable' | 'decreasing';
  sustainedPeriod: number; // minutes
}

export class VoiceChannelDetector extends EventEmitter {
  private channelHistory: Map<string, VoiceChannelData[]> = new Map();
  private activityPatterns: VoiceActivityPattern[] = [];
  private serverMetrics: Map<string, ServerVoiceMetrics> = new Map();
  private energyAnalysis: Map<string, EnergyAnalysis[]> = new Map();
  private userMigrations: Map<string, Array<{
    timestamp: number;
    fromChannel: string;
    toChannel: string;
  }>> = new Map();
  
  // Configuration
  private readonly config = {
    surgeThreshold: 0.5, // 50% increase in users
    highEnergyThreshold: 0.7,
    sustainedPeriodMinutes: 10,
    migrationWindowMinutes: 5,
    pumpDetectionSensitivity: 0.6,
    minUsersForSignal: 10,
    crossServerCorrelationWindow: 15 * 60 * 1000, // 15 minutes
    emotionalIntensityWeight: 1.5,
    volumeSpikeMultiplier: 1.3,
    panicIndicatorThreshold: 0.8,
    euphoriaIndicatorThreshold: 0.85
  };

  // Known pump patterns
  private readonly pumpPatterns = {
    suddenSurge: {
      userGrowthRate: 5, // users per minute
      minDuration: 5, // minutes
      energyThreshold: 0.8
    },
    coordinatedMigration: {
      minServers: 3,
      migrationTime: 10, // minutes
      userThreshold: 20
    },
    sustainedHighEnergy: {
      minDuration: 15, // minutes
      energyThreshold: 0.75,
      volumeThreshold: 0.8
    }
  };

  constructor(customConfig?: Partial<typeof VoiceChannelDetector.prototype.config>) {
    super();
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
  }

  /**
   * Update voice channel data
   */
  public updateChannel(data: VoiceChannelData): void {
    const channelKey = this.getChannelKey(data.channelId, data.serverId);
    
    // Initialize or update channel history
    if (!this.channelHistory.has(channelKey)) {
      this.channelHistory.set(channelKey, []);
    }
    
    const history = this.channelHistory.get(channelKey)!;
    history.push(data);
    this.maintainHistoryWindow(history);
    
    // Update server metrics
    this.updateServerMetrics(data);
    
    // Analyze energy
    const energy = this.analyzeEnergy(data, history);
    this.updateEnergyAnalysis(channelKey, energy);
    
    // Track user migrations
    this.trackUserMigrations(data);
    
    // Detect patterns
    if (history.length >= 5) {
      this.detectActivityPatterns(channelKey, data);
      this.detectVCPump(data);
    }
  }

  /**
   * Analyze energy level in voice channel
   */
  private analyzeEnergy(
    currentData: VoiceChannelData, 
    history: VoiceChannelData[]
  ): EnergyAnalysis {
    // Calculate volume component
    const volumeComponent = currentData.averageVolume * 
      (currentData.peakVolume > 0.9 ? this.config.volumeSpikeMultiplier : 1);
    
    // Calculate speaker diversity (high changes = high energy)
    const recentHistory = history.slice(-5);
    const avgSpeakerChanges = recentHistory.length > 0 ?
      recentHistory.reduce((sum, d) => sum + d.speakerChanges, 0) / recentHistory.length : 0;
    const speakerDiversity = Math.min(1, currentData.speakerChanges / (avgSpeakerChanges + 1));
    
    // Calculate speaker overlap (people talking over each other)
    const speakerOverlap = currentData.peakVolume > currentData.averageVolume * 1.5 ?
      (currentData.peakVolume - currentData.averageVolume) : 0;
    
    // Calculate emotional intensity
    const emotionalIntensity = currentData.emotionalTone ?
      (currentData.emotionalTone.excitement + currentData.emotionalTone.urgency) / 2 *
      this.config.emotionalIntensityWeight : 0.5;
    
    // Calculate topic coherence (fewer topics = more focused = higher energy)
    const topicCoherence = currentData.topics ?
      Math.max(0, 1 - (currentData.topics.length - 1) * 0.2) : 0.5;
    
    // Combined energy level
    const energyLevel = (
      volumeComponent * 0.3 +
      speakerDiversity * 0.2 +
      speakerOverlap * 0.15 +
      emotionalIntensity * 0.25 +
      topicCoherence * 0.1
    );
    
    // Determine trend
    const previousEnergy = this.energyAnalysis.get(
      this.getChannelKey(currentData.channelId, currentData.serverId)
    );
    const trend = this.calculateEnergyTrend(energyLevel, previousEnergy);
    
    // Calculate sustained period
    const sustainedPeriod = this.calculateSustainedPeriod(
      energyLevel, 
      previousEnergy || []
    );
    
    return {
      timestamp: currentData.timestamp,
      energyLevel: Math.min(1, energyLevel),
      components: {
        volume: volumeComponent,
        speakerDiversity,
        speakerOverlap,
        emotionalIntensity,
        topicCoherence
      },
      trend,
      sustainedPeriod
    };
  }

  /**
   * Detect activity patterns
   */
  private detectActivityPatterns(channelKey: string, currentData: VoiceChannelData): void {
    const history = this.channelHistory.get(channelKey)!;
    const recentHistory = history.slice(-10);
    
    // Check for surge pattern
    const surgePatter = this.detectSurgePattern(recentHistory, currentData);
    if (surgePatter) {
      this.activityPatterns.push(surgePatter);
      this.emit('pattern_detected', surgePatter);
    }
    
    // Check for sustained high energy
    const sustainedPattern = this.detectSustainedPattern(channelKey);
    if (sustainedPattern) {
      this.activityPatterns.push(sustainedPattern);
      this.emit('pattern_detected', sustainedPattern);
    }
    
    // Check for migration pattern
    const migrationPattern = this.detectMigrationPattern(currentData);
    if (migrationPattern) {
      this.activityPatterns.push(migrationPattern);
      this.emit('pattern_detected', migrationPattern);
    }
    
    // Clean old patterns
    this.maintainHistoryWindow(this.activityPatterns, 100);
  }

  /**
   * Detect surge pattern
   */
  private detectSurgePattern(
    history: VoiceChannelData[], 
    currentData: VoiceChannelData
  ): VoiceActivityPattern | null {
    if (history.length < 3) return null;
    
    // Calculate user growth rate
    const oldUserCount = history[0].userCount;
    const userGrowthRate = oldUserCount > 0 ?
      (currentData.userCount - oldUserCount) / oldUserCount : 0;
    
    if (userGrowthRate < this.config.surgeThreshold) return null;
    
    // Calculate energy metrics
    const currentEnergy = this.energyAnalysis.get(
      this.getChannelKey(currentData.channelId, currentData.serverId)
    );
    const energyLevel = currentEnergy?.slice(-1)[0]?.energyLevel || 0;
    
    // Check cross-server activity
    const crossServerActivity = this.calculateCrossServerActivity(currentData.serverId);
    
    return {
      pattern: 'surge',
      timestamp: currentData.timestamp,
      confidence: Math.min(1, userGrowthRate * energyLevel),
      channels: [currentData.channelId],
      metrics: {
        userGrowthRate: (currentData.userCount - oldUserCount) / history.length,
        energyLevel,
        crossServerActivity,
        sustainedDuration: 0
      }
    };
  }

  /**
   * Detect sustained high energy pattern
   */
  private detectSustainedPattern(channelKey: string): VoiceActivityPattern | null {
    const energyHistory = this.energyAnalysis.get(channelKey);
    if (!energyHistory || energyHistory.length < 5) return null;
    
    const recentEnergy = energyHistory.slice(-10);
    const highEnergyCount = recentEnergy.filter(
      e => e.energyLevel >= this.config.highEnergyThreshold
    ).length;
    
    if (highEnergyCount < 7) return null; // 70% of recent samples
    
    const avgEnergy = recentEnergy.reduce((sum, e) => sum + e.energyLevel, 0) / recentEnergy.length;
    const sustainedMinutes = recentEnergy[0].sustainedPeriod;
    
    if (sustainedMinutes < this.config.sustainedPeriodMinutes) return null;
    
    // Check if it's panic or euphoria
    const channelData = this.channelHistory.get(channelKey)!.slice(-1)[0];
    const pattern = this.determineEmotionalPattern(channelData, avgEnergy);
    
    return {
      pattern,
      timestamp: Date.now(),
      confidence: Math.min(1, avgEnergy * (sustainedMinutes / 30)),
      channels: [channelKey],
      metrics: {
        userGrowthRate: 0,
        energyLevel: avgEnergy,
        crossServerActivity: this.calculateCrossServerActivity(channelData.serverId),
        sustainedDuration: sustainedMinutes
      }
    };
  }

  /**
   * Detect migration pattern
   */
  private detectMigrationPattern(currentData: VoiceChannelData): VoiceActivityPattern | null {
    const migrations = this.getRecentMigrations();
    if (migrations.length < 10) return null;
    
    // Group migrations by time window
    const migrationGroups = this.groupMigrationsByTime(migrations);
    
    // Find coordinated migrations
    for (const group of migrationGroups) {
      if (group.length >= this.pumpPatterns.coordinatedMigration.minServers) {
        const uniqueServers = new Set(group.map(m => {
          const fromChannel = this.parseChannelKey(m.fromChannel);
          const toChannel = this.parseChannelKey(m.toChannel);
          return [fromChannel.serverId, toChannel.serverId];
        }).flat());
        
        if (uniqueServers.size >= this.pumpPatterns.coordinatedMigration.minServers) {
          return {
            pattern: 'migration',
            timestamp: group[0].timestamp,
            confidence: Math.min(1, group.length / 20),
            channels: group.map(m => m.toChannel),
            metrics: {
              userGrowthRate: group.length / this.config.migrationWindowMinutes,
              energyLevel: 0.7, // Migration implies high interest
              crossServerActivity: 1, // By definition
              sustainedDuration: 0
            }
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Detect VC pump patterns
   */
  private detectVCPump(currentData: VoiceChannelData): void {
    // Calculate pump indicators
    const suddennessScore = this.calculateSuddennessScore(currentData);
    const energyScore = this.calculateEnergyScore(currentData);
    const coordinationScore = this.calculateCoordinationScore(currentData);
    const sustainabilityScore = this.calculateSustainabilityScore(currentData);
    
    // Combined pump score
    const pumpScore = (
      suddennessScore * 0.3 +
      energyScore * 0.3 +
      coordinationScore * 0.25 +
      sustainabilityScore * 0.15
    );
    
    if (pumpScore < this.config.pumpDetectionSensitivity) return;
    
    // Gather affected channels
    const affectedChannels = this.findAffectedChannels(currentData);
    
    // Check for migrations
    const migrationPatterns = this.analyzeMigrationPatterns(currentData.timestamp);
    
    // Determine signal type and severity
    const { type, severity } = this.determinePumpType(
      pumpScore, 
      suddennessScore, 
      coordinationScore
    );
    
    // Predict duration based on patterns
    const predictedDuration = this.predictPumpDuration(
      sustainabilityScore,
      energyScore,
      affectedChannels.length
    );
    
    const signal: VoicePumpSignal = {
      timestamp: Date.now(),
      type,
      severity,
      pumpMetrics: {
        suddennessScore,
        energyScore,
        coordinationScore,
        sustainabilityScore
      },
      affectedChannels,
      migrationPatterns: migrationPatterns.length > 0 ? migrationPatterns : undefined,
      predictedDuration,
      confidence: pumpScore
    };
    
    this.emit('vc_pump', signal);
  }

  /**
   * Calculate suddenness score
   */
  private calculateSuddennessScore(currentData: VoiceChannelData): number {
    const channelKey = this.getChannelKey(currentData.channelId, currentData.serverId);
    const history = this.channelHistory.get(channelKey)!;
    
    if (history.length < 5) return 0;
    
    // Compare current state to baseline
    const baseline = history.slice(-10, -5);
    const avgBaselineUsers = baseline.reduce((sum, d) => sum + d.userCount, 0) / baseline.length;
    const avgBaselineVolume = baseline.reduce((sum, d) => sum + d.averageVolume, 0) / baseline.length;
    
    // Calculate sudden changes
    const userIncrease = avgBaselineUsers > 0 ?
      (currentData.userCount - avgBaselineUsers) / avgBaselineUsers : 0;
    const volumeIncrease = avgBaselineVolume > 0 ?
      (currentData.averageVolume - avgBaselineVolume) / avgBaselineVolume : 0;
    
    // Check rate of change
    const recentHistory = history.slice(-3);
    const changeRate = recentHistory.reduce((sum, d, i) => {
      if (i === 0) return sum;
      const prev = recentHistory[i - 1];
      return sum + Math.abs(d.userCount - prev.userCount) / prev.userCount;
    }, 0) / (recentHistory.length - 1);
    
    return Math.min(1, (userIncrease * 0.5 + volumeIncrease * 0.3 + changeRate * 0.2));
  }

  /**
   * Calculate energy score
   */
  private calculateEnergyScore(currentData: VoiceChannelData): number {
    const channelKey = this.getChannelKey(currentData.channelId, currentData.serverId);
    const energyHistory = this.energyAnalysis.get(channelKey);
    
    if (!energyHistory || energyHistory.length === 0) return 0;
    
    const currentEnergy = energyHistory[energyHistory.length - 1];
    
    // Weight emotional intensity higher for pumps
    const emotionalBoost = currentData.emotionalTone ?
      (currentData.emotionalTone.excitement * 1.5 + currentData.emotionalTone.urgency * 1.3) / 2 : 0;
    
    // Check for sustained high energy
    const sustainedBonus = currentEnergy.sustainedPeriod > 10 ? 0.2 : 0;
    
    return Math.min(1, currentEnergy.energyLevel + emotionalBoost * 0.3 + sustainedBonus);
  }

  /**
   * Calculate coordination score
   */
  private calculateCoordinationScore(currentData: VoiceChannelData): number {
    // Check cross-server activity
    const crossServerScore = this.calculateCrossServerActivity(currentData.serverId);
    
    // Check migration patterns
    const migrations = this.getRecentMigrations();
    const coordinatedMigrations = this.groupMigrationsByTime(migrations);
    const migrationScore = Math.min(1, coordinatedMigrations.length / 5);
    
    // Check for synchronized activity across channels
    const syncScore = this.calculateSynchronizedActivity(currentData.timestamp);
    
    // Check topic coherence across channels
    const topicScore = currentData.topics ?
      this.calculateTopicCoherence(currentData.topics) : 0.5;
    
    return (
      crossServerScore * 0.3 +
      migrationScore * 0.3 +
      syncScore * 0.25 +
      topicScore * 0.15
    );
  }

  /**
   * Calculate sustainability score
   */
  private calculateSustainabilityScore(currentData: VoiceChannelData): number {
    const channelKey = this.getChannelKey(currentData.channelId, currentData.serverId);
    const history = this.channelHistory.get(channelKey)!;
    const energyHistory = this.energyAnalysis.get(channelKey) || [];
    
    // Check if energy is maintained
    const recentEnergy = energyHistory.slice(-5);
    const energyVariance = this.calculateVariance(recentEnergy.map(e => e.energyLevel));
    const energyStability = 1 - Math.min(1, energyVariance * 2);
    
    // Check user retention
    const recentHistory = history.slice(-5);
    let retentionScore = 0;
    if (recentHistory.length >= 2) {
      const userChanges = recentHistory.map((d, i) => {
        if (i === 0) return 0;
        return Math.abs(d.userCount - recentHistory[i - 1].userCount) / d.userCount;
      });
      retentionScore = 1 - Math.min(1, userChanges.reduce((a, b) => a + b, 0) / userChanges.length);
    }
    
    // Check emotional tone consistency
    const emotionalConsistency = currentData.emotionalTone ?
      currentData.emotionalTone.consensus : 0.5;
    
    return (
      energyStability * 0.4 +
      retentionScore * 0.4 +
      emotionalConsistency * 0.2
    );
  }

  /**
   * Find channels affected by pump
   */
  private findAffectedChannels(currentData: VoiceChannelData): VoicePumpSignal['affectedChannels'] {
    const affected: VoicePumpSignal['affectedChannels'] = [];
    const currentTime = currentData.timestamp;
    
    // Check all active channels
    for (const [channelKey, history] of this.channelHistory.entries()) {
      const recentData = history[history.length - 1];
      if (!recentData || currentTime - recentData.timestamp > 5 * 60 * 1000) continue;
      
      // Check if channel shows pump characteristics
      const { serverId } = this.parseChannelKey(channelKey);
      const energyData = this.energyAnalysis.get(channelKey);
      const currentEnergy = energyData?.[energyData.length - 1];
      
      if (recentData.userCount >= this.config.minUsersForSignal &&
          currentEnergy && currentEnergy.energyLevel >= this.config.highEnergyThreshold) {
        affected.push({
          channelId: recentData.channelId,
          serverId,
          userCount: recentData.userCount,
          energyLevel: currentEnergy.energyLevel
        });
      }
    }
    
    // Sort by energy level
    return affected.sort((a, b) => b.energyLevel - a.energyLevel);
  }

  /**
   * Analyze migration patterns
   */
  private analyzeMigrationPatterns(timestamp: number): VoicePumpSignal['migrationPatterns'] {
    const patterns: VoicePumpSignal['migrationPatterns'] = [];
    const migrations = this.getRecentMigrations();
    
    // Group by server pairs
    const serverMigrations = new Map<string, number>();
    
    for (const migration of migrations) {
      if (timestamp - migration.timestamp > this.config.migrationWindowMinutes * 60 * 1000) continue;
      
      const fromData = this.parseChannelKey(migration.fromChannel);
      const toData = this.parseChannelKey(migration.toChannel);
      
      if (fromData.serverId !== toData.serverId) {
        const key = `${fromData.serverId}->${toData.serverId}`;
        serverMigrations.set(key, (serverMigrations.get(key) || 0) + 1);
      }
    }
    
    // Convert to pattern array
    for (const [key, count] of serverMigrations.entries()) {
      const [fromServer, toServer] = key.split('->');
      if (count >= 5) { // Minimum threshold for pattern
        patterns.push({
          fromServer,
          toServer,
          userCount: count,
          timestamp
        });
      }
    }
    
    return patterns;
  }

  /**
   * Track user migrations between channels
   */
  private trackUserMigrations(data: VoiceChannelData): void {
    // This would typically be called when users leave one channel and join another
    // For now, we'll simulate based on user count changes
    const channelKey = this.getChannelKey(data.channelId, data.serverId);
    const history = this.channelHistory.get(channelKey);
    
    if (!history || history.length < 2) return;
    
    const previous = history[history.length - 2];
    const userDecrease = previous.userCount - data.userCount;
    
    if (userDecrease > 3) {
      // Check other channels for corresponding increases
      for (const [otherKey, otherHistory] of this.channelHistory.entries()) {
        if (otherKey === channelKey) continue;
        
        const otherRecent = otherHistory[otherHistory.length - 1];
        if (!otherRecent || Math.abs(otherRecent.timestamp - data.timestamp) > 60000) continue;
        
        const otherPrevious = otherHistory[otherHistory.length - 2];
        if (!otherPrevious) continue;
        
        const otherIncrease = otherRecent.userCount - otherPrevious.userCount;
        
        if (otherIncrease > 3 && Math.abs(otherIncrease - userDecrease) < 3) {
          // Likely migration
          const userId = 'simulated'; // In real implementation, would track actual users
          if (!this.userMigrations.has(userId)) {
            this.userMigrations.set(userId, []);
          }
          
          this.userMigrations.get(userId)!.push({
            timestamp: data.timestamp,
            fromChannel: channelKey,
            toChannel: otherKey
          });
        }
      }
    }
  }

  /**
   * Update server metrics
   */
  private updateServerMetrics(data: VoiceChannelData): void {
    if (!this.serverMetrics.has(data.serverId)) {
      this.serverMetrics.set(data.serverId, {
        serverId: data.serverId,
        platform: data.platform,
        totalUsers: 0,
        activeChannels: 0,
        averageEnergy: 0,
        recentSurges: 0,
        crossServerConnections: new Set()
      });
    }
    
    const metrics = this.serverMetrics.get(data.serverId)!;
    
    // Update active channels count
    const activeChannels = Array.from(this.channelHistory.entries()).filter(([key, history]) => {
      const { serverId } = this.parseChannelKey(key);
      const recent = history[history.length - 1];
      return serverId === data.serverId && 
             recent && 
             Date.now() - recent.timestamp < 10 * 60 * 1000;
    });
    
    metrics.activeChannels = activeChannels.length;
    
    // Update total users
    metrics.totalUsers = activeChannels.reduce((sum, [_, history]) => {
      const recent = history[history.length - 1];
      return sum + (recent?.userCount || 0);
    }, 0);
    
    // Update average energy
    let totalEnergy = 0;
    let energyCount = 0;
    
    for (const [channelKey, _] of activeChannels) {
      const energy = this.energyAnalysis.get(channelKey);
      if (energy && energy.length > 0) {
        totalEnergy += energy[energy.length - 1].energyLevel;
        energyCount++;
      }
    }
    
    metrics.averageEnergy = energyCount > 0 ? totalEnergy / energyCount : 0;
    
    // Count recent surges
    metrics.recentSurges = this.activityPatterns.filter(p =>
      p.pattern === 'surge' &&
      Date.now() - p.timestamp < 30 * 60 * 1000 &&
      p.channels.some(c => this.parseChannelKey(c).serverId === data.serverId)
    ).length;
  }

  /**
   * Update energy analysis
   */
  private updateEnergyAnalysis(channelKey: string, energy: EnergyAnalysis): void {
    if (!this.energyAnalysis.has(channelKey)) {
      this.energyAnalysis.set(channelKey, []);
    }
    
    const history = this.energyAnalysis.get(channelKey)!;
    history.push(energy);
    this.maintainHistoryWindow(history, 50);
  }

  /**
   * Helper methods
   */
  
  private getChannelKey(channelId: string, serverId: string): string {
    return `${serverId}:${channelId}`;
  }

  private parseChannelKey(key: string): { serverId: string; channelId: string } {
    const [serverId, channelId] = key.split(':');
    return { serverId, channelId };
  }

  private calculateEnergyTrend(
    currentEnergy: number, 
    history?: EnergyAnalysis[]
  ): 'increasing' | 'stable' | 'decreasing' {
    if (!history || history.length < 3) return 'stable';
    
    const recent = history.slice(-3);
    const avgRecent = recent.reduce((sum, e) => sum + e.energyLevel, 0) / recent.length;
    
    if (currentEnergy > avgRecent * 1.1) return 'increasing';
    if (currentEnergy < avgRecent * 0.9) return 'decreasing';
    return 'stable';
  }

  private calculateSustainedPeriod(currentEnergy: number, history: EnergyAnalysis[]): number {
    if (currentEnergy < this.config.highEnergyThreshold) return 0;
    
    let sustainedMinutes = 0;
    const threshold = this.config.highEnergyThreshold;
    
    // Count backwards to find how long energy has been high
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].energyLevel >= threshold) {
        sustainedMinutes += 5; // Assuming 5-minute intervals
      } else {
        break;
      }
    }
    
    return sustainedMinutes;
  }

  private calculateCrossServerActivity(serverId: string): number {
    const serverData = this.serverMetrics.get(serverId);
    if (!serverData) return 0;
    
    // Check for correlated activity in other servers
    let correlatedServers = 0;
    const currentTime = Date.now();
    
    for (const [otherServerId, otherMetrics] of this.serverMetrics.entries()) {
      if (otherServerId === serverId) continue;
      
      // Check if both servers have recent high activity
      if (otherMetrics.averageEnergy > this.config.highEnergyThreshold &&
          serverData.averageEnergy > this.config.highEnergyThreshold) {
        correlatedServers++;
      }
    }
    
    return Math.min(1, correlatedServers / 5);
  }

  private getRecentMigrations(): Array<{
    timestamp: number;
    fromChannel: string;
    toChannel: string;
  }> {
    const migrations: Array<{
      timestamp: number;
      fromChannel: string;
      toChannel: string;
    }> = [];
    
    const cutoff = Date.now() - this.config.crossServerCorrelationWindow;
    
    for (const userMigrations of this.userMigrations.values()) {
      migrations.push(...userMigrations.filter(m => m.timestamp > cutoff));
    }
    
    return migrations.sort((a, b) => a.timestamp - b.timestamp);
  }

  private groupMigrationsByTime(
    migrations: Array<{ timestamp: number; fromChannel: string; toChannel: string }>
  ): Array<Array<{ timestamp: number; fromChannel: string; toChannel: string }>> {
    const groups: Array<Array<{ timestamp: number; fromChannel: string; toChannel: string }>> = [];
    const windowMs = this.config.migrationWindowMinutes * 60 * 1000;
    
    for (const migration of migrations) {
      let added = false;
      
      for (const group of groups) {
        const groupStart = group[0].timestamp;
        if (migration.timestamp - groupStart <= windowMs) {
          group.push(migration);
          added = true;
          break;
        }
      }
      
      if (!added) {
        groups.push([migration]);
      }
    }
    
    return groups;
  }

  private determineEmotionalPattern(
    data: VoiceChannelData, 
    avgEnergy: number
  ): VoiceActivityPattern['pattern'] {
    if (!data.emotionalTone) return 'sustained';
    
    if (data.emotionalTone.negativity > this.config.panicIndicatorThreshold &&
        avgEnergy > this.config.highEnergyThreshold) {
      return 'panic';
    }
    
    if (data.emotionalTone.excitement > this.config.euphoriaIndicatorThreshold &&
        avgEnergy > this.config.highEnergyThreshold) {
      return 'euphoria';
    }
    
    return 'sustained';
  }

  private calculateSynchronizedActivity(timestamp: number): number {
    const window = 5 * 60 * 1000; // 5 minutes
    let synchronizedChannels = 0;
    let totalChannels = 0;
    
    for (const [channelKey, history] of this.channelHistory.entries()) {
      const recent = history[history.length - 1];
      if (!recent || timestamp - recent.timestamp > window) continue;
      
      totalChannels++;
      
      // Check if activity spiked around the same time
      const spike = history.find(h => 
        Math.abs(h.timestamp - timestamp) < window &&
        h.userCount > recent.userCount * 1.3
      );
      
      if (spike) synchronizedChannels++;
    }
    
    return totalChannels > 0 ? synchronizedChannels / totalChannels : 0;
  }

  private calculateTopicCoherence(topics: string[]): number {
    if (topics.length === 0) return 0.5;
    if (topics.length === 1) return 1;
    
    // Check if topics are related (simplified - would use NLP in production)
    const cryptoTopics = topics.filter(t => 
      t.toLowerCase().includes('pump') ||
      t.toLowerCase().includes('moon') ||
      t.toLowerCase().includes('buy') ||
      t.toLowerCase().includes('sell')
    );
    
    return cryptoTopics.length / topics.length;
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private determinePumpType(
    pumpScore: number,
    suddennessScore: number,
    coordinationScore: number
  ): { type: VoicePumpSignal['type']; severity: VoicePumpSignal['severity'] } {
    if (coordinationScore > 0.7 && suddennessScore > 0.6) {
      return {
        type: 'vc_pump_detected',
        severity: pumpScore > 0.8 ? 'high' : 'medium'
      };
    }
    
    if (coordinationScore > 0.8) {
      return {
        type: 'migration_detected',
        severity: pumpScore > 0.7 ? 'high' : 'medium'
      };
    }
    
    return {
      type: 'high_energy_detected',
      severity: pumpScore > 0.75 ? 'medium' : 'low'
    };
  }

  private predictPumpDuration(
    sustainabilityScore: number,
    energyScore: number,
    affectedChannels: number
  ): number {
    // Base duration on sustainability
    let baseDuration = sustainabilityScore * 30; // Up to 30 minutes
    
    // Adjust for energy (higher energy usually burns out faster)
    const energyMultiplier = 1 - (energyScore - 0.7) * 0.5;
    baseDuration *= energyMultiplier;
    
    // More channels = potentially longer duration
    const channelMultiplier = 1 + Math.min(0.5, affectedChannels / 10);
    baseDuration *= channelMultiplier;
    
    return Math.max(5, Math.min(60, baseDuration)); // 5-60 minutes
  }

  private maintainHistoryWindow<T>(array: T[], maxSize: number = 100): void {
    while (array.length > maxSize) {
      array.shift();
    }
  }

  /**
   * Public methods for analysis
   */
  
  public getChannelHistory(channelId: string, serverId: string): VoiceChannelData[] {
    const key = this.getChannelKey(channelId, serverId);
    return [...(this.channelHistory.get(key) || [])];
  }

  public getActivityPatterns(limit?: number): VoiceActivityPattern[] {
    return limit ? this.activityPatterns.slice(-limit) : [...this.activityPatterns];
  }

  public getServerMetrics(serverId?: string): ServerVoiceMetrics[] {
    if (serverId) {
      const metrics = this.serverMetrics.get(serverId);
      return metrics ? [metrics] : [];
    }
    return Array.from(this.serverMetrics.values());
  }

  public getEnergyAnalysis(channelId: string, serverId: string): EnergyAnalysis[] {
    const key = this.getChannelKey(channelId, serverId);
    return [...(this.energyAnalysis.get(key) || [])];
  }

  public reset(): void {
    this.channelHistory.clear();
    this.activityPatterns = [];
    this.serverMetrics.clear();
    this.energyAnalysis.clear();
    this.userMigrations.clear();
  }
}