import { SentimentDetector } from '../../core/SentimentDetector';
import { SentimentSignal, SignalStrength } from '../../core/types';

interface UserMigration {
  userId: string;
  fromProject: string;
  toProject: string;
  timestamp: number;
  platform: 'discord' | 'telegram';
  userType: 'builder' | 'investor' | 'community' | 'whale';
}

interface ProjectCommunity {
  projectId: string;
  name: string;
  ecosystem: string;
  userCount: number;
  activeUsers: Set<string>;
  health: 'healthy' | 'declining' | 'failed' | 'merged';
  lastActivity: number;
}

interface MigrationFlow {
  fromProject: string;
  toProject: string;
  userCount: number;
  builderCount: number;
  whaleCount: number;
  velocity: number; // users per hour
  startTime: number;
  peakTime?: number;
  type: 'exodus' | 'merger' | 'organic' | 'refugee';
}

interface RefugeePump {
  targetProject: string;
  sourceProjects: string[];
  migrationCount: number;
  pumpProbability: number;
  expectedTimeframe: number; // hours until pump
  builderInvolvement: boolean;
}

export class CommunityMigrationDetector extends SentimentDetector {
  private userMigrations: Map<string, UserMigration[]> = new Map();
  private projectCommunities: Map<string, ProjectCommunity> = new Map();
  private migrationFlows: Map<string, MigrationFlow> = new Map();
  private userProjects: Map<string, Set<string>> = new Map(); // user -> projects
  private crossProjectOverlap: Map<string, Map<string, number>> = new Map();
  
  private readonly MIGRATION_WINDOW = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly REFUGEE_THRESHOLD = 0.2; // 20% of community
  private readonly PUMP_PREDICTION_THRESHOLD = 0.7;
  private readonly BUILDER_WEIGHT = 3; // builders count 3x in migrations
  private readonly WHALE_WEIGHT = 2; // whales count 2x

  async detectSignals(): Promise<SentimentSignal[]> {
    const signals: SentimentSignal[] = [];

    // Detect refugee pumps
    const refugeePumps = this.detectRefugeePumps();
    for (const pump of refugeePumps) {
      if (pump.pumpProbability >= this.PUMP_PREDICTION_THRESHOLD) {
        signals.push({
          type: 'community_migration',
          strength: SignalStrength.HIGH,
          confidence: pump.pumpProbability,
          source: 'migration_pattern',
          description: `Refugee pump detected: ${pump.migrationCount} users from ${pump.sourceProjects.join(', ')} → ${pump.targetProject}`,
          metadata: {
            pattern: 'refugee_pump',
            targetProject: pump.targetProject,
            sourceProjects: pump.sourceProjects,
            migrationCount: pump.migrationCount,
            expectedTimeframe: pump.expectedTimeframe,
            builderInvolvement: pump.builderInvolvement
          }
        });
      }
    }

    // Detect ecosystem migrations
    const ecosystemFlows = this.detectEcosystemMigrations();
    for (const [flowKey, flow] of ecosystemFlows) {
      if (flow.velocity > 50 && flow.builderCount > 5) { // High velocity with builders
        signals.push({
          type: 'ecosystem_migration',
          strength: SignalStrength.MEDIUM,
          confidence: 0.8,
          source: 'builder_movement',
          description: `Builder exodus detected: ${flow.builderCount} builders moving from ${flow.fromProject} → ${flow.toProject}`,
          metadata: {
            pattern: 'builder_exodus',
            flow: flow,
            impactScore: this.calculateMigrationImpact(flow)
          }
        });
      }
    }

    // Detect community mergers
    const mergers = this.detectCommunityMergers();
    for (const merger of mergers) {
      signals.push({
        type: 'community_merger',
        strength: SignalStrength.MEDIUM,
        confidence: 0.85,
        source: 'merger_pattern',
        description: `Community merger detected: ${merger.projects.join(' + ')} → ${merger.targetProject}`,
        metadata: {
          pattern: 'merger',
          merger: merger
        }
      });
    }

    return signals;
  }

  public trackUserActivity(
    userId: string,
    projectId: string,
    platform: 'discord' | 'telegram',
    userType: 'builder' | 'investor' | 'community' | 'whale' = 'community'
  ): void {
    // Update user projects
    if (!this.userProjects.has(userId)) {
      this.userProjects.set(userId, new Set());
    }
    
    const userProjectHistory = this.userProjects.get(userId)!;
    const previousProjects = Array.from(userProjectHistory);
    
    // Check if this is a migration
    if (previousProjects.length > 0 && !userProjectHistory.has(projectId)) {
      const lastProject = previousProjects[previousProjects.length - 1];
      
      const migration: UserMigration = {
        userId,
        fromProject: lastProject,
        toProject: projectId,
        timestamp: Date.now(),
        platform,
        userType
      };
      
      this.recordMigration(migration);
    }
    
    userProjectHistory.add(projectId);
    this.updateProjectCommunity(projectId, userId);
  }

  private recordMigration(migration: UserMigration): void {
    // Store migration
    if (!this.userMigrations.has(migration.userId)) {
      this.userMigrations.set(migration.userId, []);
    }
    this.userMigrations.get(migration.userId)!.push(migration);
    
    // Update migration flows
    const flowKey = `${migration.fromProject}->${migration.toProject}`;
    if (!this.migrationFlows.has(flowKey)) {
      this.migrationFlows.set(flowKey, {
        fromProject: migration.fromProject,
        toProject: migration.toProject,
        userCount: 0,
        builderCount: 0,
        whaleCount: 0,
        velocity: 0,
        startTime: migration.timestamp,
        type: 'organic'
      });
    }
    
    const flow = this.migrationFlows.get(flowKey)!;
    flow.userCount++;
    
    if (migration.userType === 'builder') {
      flow.builderCount++;
    } else if (migration.userType === 'whale') {
      flow.whaleCount++;
    }
    
    // Update velocity
    this.updateMigrationVelocity(flowKey);
    
    // Update cross-project overlap
    this.updateCrossProjectOverlap(migration.fromProject, migration.toProject);
  }

  private updateMigrationVelocity(flowKey: string): void {
    const flow = this.migrationFlows.get(flowKey)!;
    const timeElapsed = (Date.now() - flow.startTime) / (1000 * 60 * 60); // hours
    
    if (timeElapsed > 0) {
      flow.velocity = flow.userCount / timeElapsed;
      
      // Detect flow type based on velocity and composition
      if (flow.velocity > 100 && flow.userCount > 50) {
        flow.type = 'exodus';
      } else if (flow.builderCount > flow.userCount * 0.1) {
        flow.type = 'refugee';
      } else if (flow.userCount > 20 && timeElapsed < 24) {
        flow.type = 'merger';
      }
    }
  }

  private detectRefugeePumps(): RefugeePump[] {
    const pumps: RefugeePump[] = [];
    const recentMigrations = this.getRecentMigrations(24 * 60 * 60 * 1000); // 24 hours
    
    // Group migrations by target project
    const targetGroups = new Map<string, UserMigration[]>();
    for (const migration of recentMigrations) {
      if (!targetGroups.has(migration.toProject)) {
        targetGroups.set(migration.toProject, []);
      }
      targetGroups.get(migration.toProject)!.push(migration);
    }
    
    // Analyze each target for refugee pump patterns
    for (const [targetProject, migrations] of targetGroups) {
      const sourceProjects = new Set(migrations.map(m => m.fromProject));
      
      // Check if source projects are failing
      const failedSources = Array.from(sourceProjects).filter(project => {
        const community = this.projectCommunities.get(project);
        return community?.health === 'failed' || community?.health === 'declining';
      });
      
      if (failedSources.length > 0) {
        const builderCount = migrations.filter(m => m.userType === 'builder').length;
        const whaleCount = migrations.filter(m => m.userType === 'whale').length;
        
        // Calculate pump probability
        const probability = this.calculatePumpProbability(
          migrations.length,
          builderCount,
          whaleCount,
          failedSources.length
        );
        
        pumps.push({
          targetProject,
          sourceProjects: failedSources,
          migrationCount: migrations.length,
          pumpProbability: probability,
          expectedTimeframe: this.estimatePumpTimeframe(migrations),
          builderInvolvement: builderCount > 0
        });
      }
    }
    
    return pumps;
  }

  private calculatePumpProbability(
    migrationCount: number,
    builderCount: number,
    whaleCount: number,
    failedSourceCount: number
  ): number {
    // Weighted migration score
    const weightedCount = migrationCount + 
      (builderCount * this.BUILDER_WEIGHT) + 
      (whaleCount * this.WHALE_WEIGHT);
    
    // Base probability from migration volume
    let probability = Math.min(weightedCount / 100, 0.5);
    
    // Boost for multiple failed sources (coordinated movement)
    if (failedSourceCount > 1) {
      probability += 0.2;
    }
    
    // Boost for builder involvement
    if (builderCount > 0) {
      probability += 0.15 * Math.min(builderCount / 5, 1);
    }
    
    // Boost for whale involvement
    if (whaleCount > 0) {
      probability += 0.1 * Math.min(whaleCount / 3, 1);
    }
    
    return Math.min(probability, 1);
  }

  private estimatePumpTimeframe(migrations: UserMigration[]): number {
    // Sort migrations by timestamp
    const sorted = migrations.sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate migration acceleration
    const timeSpan = sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
    const avgInterval = timeSpan / migrations.length;
    
    // Faster migrations = sooner pump
    if (avgInterval < 60 * 60 * 1000) { // Less than 1 hour average
      return 6; // 6 hours
    } else if (avgInterval < 6 * 60 * 60 * 1000) { // Less than 6 hours
      return 24; // 24 hours
    } else {
      return 48; // 48 hours
    }
  }

  private detectEcosystemMigrations(): Map<string, MigrationFlow> {
    const ecosystemFlows = new Map<string, MigrationFlow>();
    
    for (const [flowKey, flow] of this.migrationFlows) {
      const fromCommunity = this.projectCommunities.get(flow.fromProject);
      const toCommunity = this.projectCommunities.get(flow.toProject);
      
      if (fromCommunity && toCommunity && 
          fromCommunity.ecosystem !== toCommunity.ecosystem) {
        ecosystemFlows.set(flowKey, flow);
      }
    }
    
    return ecosystemFlows;
  }

  private detectCommunityMergers(): any[] {
    const mergers: any[] = [];
    const mergerCandidates = new Map<string, Set<string>>();
    
    // Look for projects with high mutual migration
    for (const [project1, overlapMap] of this.crossProjectOverlap) {
      for (const [project2, overlapCount] of overlapMap) {
        const community1 = this.projectCommunities.get(project1);
        const community2 = this.projectCommunities.get(project2);
        
        if (community1 && community2) {
          const overlapRatio = overlapCount / Math.min(
            community1.userCount,
            community2.userCount
          );
          
          if (overlapRatio > 0.3) { // 30% overlap
            // Check migration patterns
            const flow12 = this.migrationFlows.get(`${project1}->${project2}`);
            const flow21 = this.migrationFlows.get(`${project2}->${project1}`);
            
            if (flow12 && flow12.userCount > community1.userCount * 0.2) {
              // Significant one-way migration indicates merger
              mergers.push({
                projects: [project1],
                targetProject: project2,
                migrationRatio: flow12.userCount / community1.userCount,
                type: 'acquisition'
              });
            }
          }
        }
      }
    }
    
    return mergers;
  }

  private calculateMigrationImpact(flow: MigrationFlow): number {
    // Impact based on user composition and velocity
    const builderImpact = flow.builderCount * this.BUILDER_WEIGHT;
    const whaleImpact = flow.whaleCount * this.WHALE_WEIGHT;
    const velocityImpact = Math.log(flow.velocity + 1);
    
    return (flow.userCount + builderImpact + whaleImpact) * velocityImpact;
  }

  private updateProjectCommunity(projectId: string, userId: string): void {
    if (!this.projectCommunities.has(projectId)) {
      this.projectCommunities.set(projectId, {
        projectId,
        name: projectId,
        ecosystem: 'unknown',
        userCount: 0,
        activeUsers: new Set(),
        health: 'healthy',
        lastActivity: Date.now()
      });
    }
    
    const community = this.projectCommunities.get(projectId)!;
    community.activeUsers.add(userId);
    community.userCount = community.activeUsers.size;
    community.lastActivity = Date.now();
    
    // Update health based on activity
    this.updateCommunityHealth(community);
  }

  private updateCommunityHealth(community: ProjectCommunity): void {
    const inactivityThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
    const timeSinceActivity = Date.now() - community.lastActivity;
    
    // Check outgoing migrations
    let outgoingCount = 0;
    for (const [flowKey, flow] of this.migrationFlows) {
      if (flow.fromProject === community.projectId) {
        outgoingCount += flow.userCount;
      }
    }
    
    const outgoingRatio = outgoingCount / Math.max(community.userCount, 1);
    
    if (timeSinceActivity > inactivityThreshold || outgoingRatio > 0.5) {
      community.health = 'failed';
    } else if (outgoingRatio > 0.3) {
      community.health = 'declining';
    } else {
      community.health = 'healthy';
    }
  }

  private updateCrossProjectOverlap(project1: string, project2: string): void {
    if (!this.crossProjectOverlap.has(project1)) {
      this.crossProjectOverlap.set(project1, new Map());
    }
    
    const overlapMap = this.crossProjectOverlap.get(project1)!;
    overlapMap.set(project2, (overlapMap.get(project2) || 0) + 1);
    
    // Update reverse direction
    if (!this.crossProjectOverlap.has(project2)) {
      this.crossProjectOverlap.set(project2, new Map());
    }
    
    const reverseMap = this.crossProjectOverlap.get(project2)!;
    reverseMap.set(project1, (reverseMap.get(project1) || 0) + 1);
  }

  private getRecentMigrations(timeWindow: number): UserMigration[] {
    const cutoff = Date.now() - timeWindow;
    const recent: UserMigration[] = [];
    
    for (const migrations of this.userMigrations.values()) {
      recent.push(...migrations.filter(m => m.timestamp > cutoff));
    }
    
    return recent;
  }

  public getMigrationVelocity(fromProject: string, toProject: string): number {
    const flowKey = `${fromProject}->${toProject}`;
    const flow = this.migrationFlows.get(flowKey);
    return flow?.velocity || 0;
  }

  public getCommunityOverlap(project1: string, project2: string): number {
    const overlap = this.crossProjectOverlap.get(project1)?.get(project2) || 0;
    const community1 = this.projectCommunities.get(project1);
    const community2 = this.projectCommunities.get(project2);
    
    if (!community1 || !community2) return 0;
    
    return overlap / Math.min(community1.userCount, community2.userCount);
  }

  public getRefugeePumpPredictions(): RefugeePump[] {
    return this.detectRefugeePumps()
      .filter(pump => pump.pumpProbability >= this.PUMP_PREDICTION_THRESHOLD)
      .sort((a, b) => b.pumpProbability - a.pumpProbability);
  }
}