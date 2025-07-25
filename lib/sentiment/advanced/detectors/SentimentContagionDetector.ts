import { EventEmitter } from 'events';

interface AssetData {
  symbol: string;
  chain?: string;
  sector?: string;
  timestamp: number;
  sentiment: number;
  volume: number;
  price?: number;
}

interface CorrelationData {
  asset1: string;
  asset2: string;
  correlation: number;
  type: 'price' | 'sentiment' | 'volume' | 'cross_chain' | 'sector';
  strength: 'strong' | 'moderate' | 'weak';
  timeframe: number; // hours
}

interface ContagionEvent {
  originAsset: string;
  timestamp: number;
  initialSentiment: number;
  sentimentChange: number;
  affectedAssets: Array<{
    asset: string;
    delay: number; // minutes
    impact: number; // 0-1
    correlation: number;
  }>;
  velocity: number; // spread speed
  reach: number; // number of assets affected
  type: 'positive' | 'negative' | 'mixed';
}

interface SectorRotation {
  fromSector: string;
  toSector: string;
  timestamp: number;
  strength: number;
  duration: number; // hours
  sentimentShift: number;
  assets: string[];
}

interface ContagionSignal {
  timestamp: number;
  type: 'contagion_detected' | 'rotation_detected' | 'cascade_warning';
  severity: 'high' | 'medium' | 'low';
  contagionMetrics: {
    originAsset: string;
    spreadVelocity: number;
    currentReach: number;
    projectedReach: number;
    timeToNextAsset: number; // minutes
  };
  affectedAssets: string[];
  predictedAssets: Array<{
    asset: string;
    probability: number;
    estimatedTime: number; // minutes
    estimatedImpact: number;
  }>;
  crossChainEffects: Array<{
    chain: string;
    exposure: number;
    correlatedAssets: string[];
  }>;
  sectorRotation?: SectorRotation;
  confidence: number;
}

interface AssetRelationship {
  correlation: number;
  leadLagTime: number; // minutes (positive = asset1 leads)
  contagionHistory: Array<{
    timestamp: number;
    direction: 'forward' | 'reverse';
    impact: number;
  }>;
  sharedSectors: string[];
  bridgeAssets: string[]; // Assets that connect these two
}

interface ChainMetrics {
  chain: string;
  sentimentMomentum: number;
  contagionSusceptibility: number;
  assets: Set<string>;
  recentContagions: number;
  averageSpreadTime: number;
}

export class SentimentContagionDetector extends EventEmitter {
  private assetHistory: Map<string, AssetData[]> = new Map();
  private correlationMatrix: Map<string, CorrelationData> = new Map();
  private contagionHistory: ContagionEvent[] = [];
  private assetRelationships: Map<string, AssetRelationship> = new Map();
  private chainMetrics: Map<string, ChainMetrics> = new Map();
  private sectorRotations: SectorRotation[] = [];
  
  // Configuration
  private readonly config = {
    correlationThreshold: 0.5,
    contagionThreshold: 0.3,
    minHistorySize: 50,
    contagionWindow: 4 * 60 * 60 * 1000, // 4 hours
    predictionHorizon: 2 * 60 * 60 * 1000, // 2 hours
    velocityThreshold: 0.7,
    crossChainMultiplier: 1.2,
    sectorRotationThreshold: 0.4,
    bridgeAssetWeight: 1.5,
    l2ContagionBoost: 1.3, // L2s are more susceptible to contagion
    maxPredictions: 10
  };

  // Known relationships
  private readonly chainRelationships = {
    ethereum: ['arbitrum', 'optimism', 'polygon', 'base'],
    arbitrum: ['ethereum', 'optimism', 'base'],
    optimism: ['ethereum', 'arbitrum', 'base'],
    polygon: ['ethereum'],
    base: ['ethereum', 'arbitrum', 'optimism'],
    solana: ['serum', 'raydium'],
    avalanche: ['trader_joe', 'pangolin']
  };

  private readonly sectorRelationships = {
    defi: ['lending', 'dex', 'yield', 'derivatives'],
    gaming: ['metaverse', 'nft', 'social'],
    infrastructure: ['oracle', 'bridge', 'storage'],
    meme: ['community', 'social'],
    ai: ['compute', 'data', 'automation'],
    layer2: ['scaling', 'infrastructure']
  };

  constructor(customConfig?: Partial<typeof SentimentContagionDetector.prototype.config>) {
    super();
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
  }

  /**
   * Update asset data and check for contagion
   */
  public updateAsset(data: AssetData): void {
    const { symbol } = data;
    
    // Initialize or update asset history
    if (!this.assetHistory.has(symbol)) {
      this.assetHistory.set(symbol, []);
    }
    
    const history = this.assetHistory.get(symbol)!;
    history.push(data);
    this.maintainHistoryWindow(history);
    
    // Update correlations
    this.updateCorrelations(symbol, data);
    
    // Update chain metrics
    if (data.chain) {
      this.updateChainMetrics(data.chain, data);
    }
    
    // Check for contagion events
    if (history.length >= this.config.minHistorySize) {
      this.detectContagion(symbol, data);
      this.detectSectorRotation(data);
    }
  }

  /**
   * Update correlation matrix
   */
  private updateCorrelations(symbol: string, data: AssetData): void {
    for (const [otherSymbol, otherHistory] of this.assetHistory.entries()) {
      if (otherSymbol === symbol || otherHistory.length < this.config.minHistorySize) continue;
      
      // Calculate various correlations
      const priceCorr = this.calculateCorrelation(symbol, otherSymbol, 'price');
      const sentimentCorr = this.calculateCorrelation(symbol, otherSymbol, 'sentiment');
      const volumeCorr = this.calculateCorrelation(symbol, otherSymbol, 'volume');
      
      // Determine correlation type and strength
      const maxCorr = Math.max(priceCorr, sentimentCorr, volumeCorr);
      let type: CorrelationData['type'] = 'price';
      if (sentimentCorr === maxCorr) type = 'sentiment';
      else if (volumeCorr === maxCorr) type = 'volume';
      
      // Check for cross-chain correlation
      const asset1Data = this.assetHistory.get(symbol)![0];
      const asset2Data = otherHistory[0];
      if (asset1Data.chain && asset2Data.chain && asset1Data.chain !== asset2Data.chain) {
        type = 'cross_chain';
      }
      
      // Check for sector correlation
      if (asset1Data.sector && asset2Data.sector && asset1Data.sector === asset2Data.sector) {
        type = 'sector';
      }
      
      const strength: CorrelationData['strength'] = 
        maxCorr > 0.8 ? 'strong' : 
        maxCorr > 0.6 ? 'moderate' : 'weak';
      
      if (maxCorr > this.config.correlationThreshold) {
        const key = this.getCorrelationKey(symbol, otherSymbol);
        this.correlationMatrix.set(key, {
          asset1: symbol,
          asset2: otherSymbol,
          correlation: maxCorr,
          type,
          strength,
          timeframe: 24 // hours
        });
        
        // Update asset relationships
        this.updateAssetRelationship(symbol, otherSymbol, maxCorr);
      }
    }
  }

  /**
   * Calculate correlation between two assets
   */
  private calculateCorrelation(
    asset1: string, 
    asset2: string, 
    field: 'price' | 'sentiment' | 'volume'
  ): number {
    const history1 = this.assetHistory.get(asset1)!;
    const history2 = this.assetHistory.get(asset2)!;
    
    // Align timestamps
    const aligned = this.alignTimestamps(history1, history2);
    if (aligned.length < 20) return 0;
    
    // Extract values
    const values1 = aligned.map(pair => pair[0][field] || 0);
    const values2 = aligned.map(pair => pair[1][field] || 0);
    
    // Calculate Pearson correlation
    return this.pearsonCorrelation(values1, values2);
  }

  /**
   * Detect contagion events
   */
  private detectContagion(symbol: string, currentData: AssetData): void {
    const history = this.assetHistory.get(symbol)!;
    const recentHistory = history.slice(-10);
    
    // Calculate sentiment change
    const avgRecentSentiment = recentHistory.slice(-5)
      .reduce((sum, d) => sum + d.sentiment, 0) / 5;
    const avgOlderSentiment = recentHistory.slice(0, 5)
      .reduce((sum, d) => sum + d.sentiment, 0) / 5;
    const sentimentChange = avgRecentSentiment - avgOlderSentiment;
    
    // Check if significant change
    if (Math.abs(sentimentChange) < this.config.contagionThreshold) return;
    
    // Find correlated assets that might be affected
    const affectedAssets = this.findAffectedAssets(symbol, sentimentChange);
    
    if (affectedAssets.length > 0) {
      const contagionEvent: ContagionEvent = {
        originAsset: symbol,
        timestamp: currentData.timestamp,
        initialSentiment: avgOlderSentiment,
        sentimentChange,
        affectedAssets,
        velocity: this.calculateContagionVelocity(affectedAssets),
        reach: affectedAssets.length,
        type: sentimentChange > 0 ? 'positive' : 'negative'
      };
      
      this.contagionHistory.push(contagionEvent);
      this.maintainHistoryWindow(this.contagionHistory, 100);
      
      // Predict next affected assets
      const predictions = this.predictNextAffectedAssets(symbol, contagionEvent);
      
      // Generate signal
      const signal = this.generateContagionSignal(contagionEvent, predictions, currentData);
      
      if (signal.confidence >= 0.6) {
        this.emit('contagion', signal);
      }
    }
  }

  /**
   * Find assets that might be affected by contagion
   */
  private findAffectedAssets(
    originAsset: string, 
    sentimentChange: number
  ): ContagionEvent['affectedAssets'] {
    const affected: ContagionEvent['affectedAssets'] = [];
    const originData = this.assetHistory.get(originAsset)!.slice(-1)[0];
    
    for (const [key, correlation] of this.correlationMatrix.entries()) {
      if (correlation.asset1 !== originAsset && correlation.asset2 !== originAsset) continue;
      
      const otherAsset = correlation.asset1 === originAsset ? 
        correlation.asset2 : correlation.asset1;
      
      const otherHistory = this.assetHistory.get(otherAsset);
      if (!otherHistory || otherHistory.length < 10) continue;
      
      // Check if sentiment is starting to move in same direction
      const recentOtherSentiment = otherHistory.slice(-3);
      const sentimentDirection = Math.sign(sentimentChange);
      const otherDirection = Math.sign(
        recentOtherSentiment[2].sentiment - recentOtherSentiment[0].sentiment
      );
      
      if (sentimentDirection === otherDirection || Math.random() < correlation.correlation) {
        // Calculate delay based on lead-lag relationship
        const relationship = this.assetRelationships.get(key);
        const delay = relationship ? Math.abs(relationship.leadLagTime) : 
          this.estimateContagionDelay(originAsset, otherAsset);
        
        // Boost impact for cross-chain and L2 contagion
        let impact = correlation.correlation * Math.abs(sentimentChange);
        if (correlation.type === 'cross_chain') {
          impact *= this.config.crossChainMultiplier;
        }
        if (this.isL2Asset(otherAsset, otherHistory[0])) {
          impact *= this.config.l2ContagionBoost;
        }
        
        affected.push({
          asset: otherAsset,
          delay,
          impact: Math.min(1, impact),
          correlation: correlation.correlation
        });
      }
    }
    
    // Sort by delay (assets affected sooner first)
    return affected.sort((a, b) => a.delay - b.delay);
  }

  /**
   * Predict which assets will be affected next
   */
  private predictNextAffectedAssets(
    originAsset: string,
    contagionEvent: ContagionEvent
  ): ContagionSignal['predictedAssets'] {
    const predictions: ContagionSignal['predictedAssets'] = [];
    const alreadyAffected = new Set([
      originAsset,
      ...contagionEvent.affectedAssets.map(a => a.asset)
    ]);
    
    // Find assets connected to already affected ones
    for (const affected of contagionEvent.affectedAssets) {
      for (const [key, correlation] of this.correlationMatrix.entries()) {
        if (correlation.asset1 !== affected.asset && correlation.asset2 !== affected.asset) continue;
        
        const candidateAsset = correlation.asset1 === affected.asset ? 
          correlation.asset2 : correlation.asset1;
        
        if (alreadyAffected.has(candidateAsset)) continue;
        
        // Calculate probability based on correlation strength and contagion velocity
        let probability = correlation.correlation * contagionEvent.velocity;
        
        // Boost for same sector or chain
        const candidateData = this.assetHistory.get(candidateAsset)?.[0];
        const originData = this.assetHistory.get(originAsset)?.[0];
        
        if (candidateData && originData) {
          if (candidateData.sector === originData.sector) {
            probability *= 1.3;
          }
          if (candidateData.chain === originData.chain) {
            probability *= 1.2;
          }
          // Special boost for L2s in same ecosystem
          if (this.areInSameEcosystem(candidateData.chain, originData.chain)) {
            probability *= this.config.l2ContagionBoost;
          }
        }
        
        // Check for bridge assets
        const bridgeMultiplier = this.getBridgeAssetMultiplier(candidateAsset, affected.asset);
        probability *= bridgeMultiplier;
        
        if (probability > 0.3) {
          predictions.push({
            asset: candidateAsset,
            probability: Math.min(1, probability),
            estimatedTime: affected.delay + this.estimateContagionDelay(affected.asset, candidateAsset),
            estimatedImpact: correlation.correlation * affected.impact * 0.8
          });
        }
        
        alreadyAffected.add(candidateAsset);
      }
    }
    
    // Sort by probability and limit
    return predictions
      .sort((a, b) => b.probability - a.probability)
      .slice(0, this.config.maxPredictions);
  }

  /**
   * Calculate contagion velocity
   */
  private calculateContagionVelocity(affectedAssets: ContagionEvent['affectedAssets']): number {
    if (affectedAssets.length === 0) return 0;
    
    // Average time to affect assets
    const avgDelay = affectedAssets.reduce((sum, a) => sum + a.delay, 0) / affectedAssets.length;
    
    // Velocity is inverse of average delay, normalized
    const velocity = Math.max(0, 1 - (avgDelay / 60)); // Normalize to 60 minutes
    
    // Factor in number of assets affected
    const reachFactor = Math.min(1, affectedAssets.length / 10);
    
    return velocity * 0.7 + reachFactor * 0.3;
  }

  /**
   * Update asset relationships with lead-lag analysis
   */
  private updateAssetRelationship(asset1: string, asset2: string, correlation: number): void {
    const key = this.getCorrelationKey(asset1, asset2);
    
    if (!this.assetRelationships.has(key)) {
      this.assetRelationships.set(key, {
        correlation,
        leadLagTime: 0,
        contagionHistory: [],
        sharedSectors: [],
        bridgeAssets: []
      });
    }
    
    const relationship = this.assetRelationships.get(key)!;
    relationship.correlation = correlation;
    
    // Calculate lead-lag time
    const leadLag = this.calculateLeadLagTime(asset1, asset2);
    relationship.leadLagTime = leadLag;
    
    // Update shared sectors
    const asset1Data = this.assetHistory.get(asset1)?.[0];
    const asset2Data = this.assetHistory.get(asset2)?.[0];
    
    if (asset1Data?.sector && asset2Data?.sector) {
      const sectors = new Set([asset1Data.sector, asset2Data.sector]);
      relationship.sharedSectors = Array.from(sectors);
    }
    
    // Find bridge assets
    relationship.bridgeAssets = this.findBridgeAssets(asset1, asset2);
  }

  /**
   * Calculate lead-lag time between assets
   */
  private calculateLeadLagTime(asset1: string, asset2: string): number {
    const history1 = this.assetHistory.get(asset1)!;
    const history2 = this.assetHistory.get(asset2)!;
    
    // Use cross-correlation to find lead-lag
    const maxLag = 10; // Check up to 10 periods
    let bestCorr = 0;
    let bestLag = 0;
    
    for (let lag = -maxLag; lag <= maxLag; lag++) {
      const corr = this.laggedCorrelation(history1, history2, lag, 'sentiment');
      if (Math.abs(corr) > Math.abs(bestCorr)) {
        bestCorr = corr;
        bestLag = lag;
      }
    }
    
    // Convert periods to minutes (assuming 5-minute periods)
    return bestLag * 5;
  }

  /**
   * Calculate lagged correlation
   */
  private laggedCorrelation(
    history1: AssetData[],
    history2: AssetData[],
    lag: number,
    field: 'sentiment' | 'price' | 'volume'
  ): number {
    const values1: number[] = [];
    const values2: number[] = [];
    
    const start = Math.max(0, -lag);
    const end1 = Math.min(history1.length, history1.length - lag);
    const end2 = Math.min(history2.length, history2.length + lag);
    
    for (let i = start; i < Math.min(end1, end2); i++) {
      const idx1 = lag >= 0 ? i : i - lag;
      const idx2 = lag >= 0 ? i + lag : i;
      
      if (idx1 < history1.length && idx2 < history2.length) {
        values1.push(history1[idx1][field] || 0);
        values2.push(history2[idx2][field] || 0);
      }
    }
    
    if (values1.length < 10) return 0;
    return this.pearsonCorrelation(values1, values2);
  }

  /**
   * Find bridge assets that connect two assets
   */
  private findBridgeAssets(asset1: string, asset2: string): string[] {
    const bridges: string[] = [];
    
    // Find assets correlated with both
    const asset1Correlated = new Set<string>();
    const asset2Correlated = new Set<string>();
    
    for (const [key, corr] of this.correlationMatrix.entries()) {
      if (corr.correlation < 0.6) continue;
      
      if (corr.asset1 === asset1) asset1Correlated.add(corr.asset2);
      if (corr.asset2 === asset1) asset1Correlated.add(corr.asset1);
      if (corr.asset1 === asset2) asset2Correlated.add(corr.asset2);
      if (corr.asset2 === asset2) asset2Correlated.add(corr.asset1);
    }
    
    // Find intersection
    for (const asset of asset1Correlated) {
      if (asset2Correlated.has(asset)) {
        bridges.push(asset);
      }
    }
    
    return bridges;
  }

  /**
   * Update chain metrics
   */
  private updateChainMetrics(chain: string, data: AssetData): void {
    if (!this.chainMetrics.has(chain)) {
      this.chainMetrics.set(chain, {
        chain,
        sentimentMomentum: 0,
        contagionSusceptibility: 0.5,
        assets: new Set(),
        recentContagions: 0,
        averageSpreadTime: 30 // minutes
      });
    }
    
    const metrics = this.chainMetrics.get(chain)!;
    metrics.assets.add(data.symbol);
    
    // Update sentiment momentum
    const chainAssets = Array.from(metrics.assets);
    let totalMomentum = 0;
    let count = 0;
    
    for (const asset of chainAssets) {
      const history = this.assetHistory.get(asset);
      if (history && history.length >= 5) {
        const recent = history.slice(-5);
        const momentum = (recent[4].sentiment - recent[0].sentiment) / 5;
        totalMomentum += momentum;
        count++;
      }
    }
    
    metrics.sentimentMomentum = count > 0 ? totalMomentum / count : 0;
    
    // Update contagion susceptibility based on recent events
    const recentContagions = this.contagionHistory.filter(c => {
      const affected = c.affectedAssets.find(a => {
        const assetData = this.assetHistory.get(a.asset)?.[0];
        return assetData?.chain === chain;
      });
      return affected && (Date.now() - c.timestamp < this.config.contagionWindow);
    });
    
    metrics.recentContagions = recentContagions.length;
    metrics.contagionSusceptibility = Math.min(1, 0.5 + recentContagions.length * 0.1);
    
    // Update average spread time
    if (recentContagions.length > 0) {
      const totalTime = recentContagions.reduce((sum, c) => {
        const chainAffected = c.affectedAssets.filter(a => {
          const assetData = this.assetHistory.get(a.asset)?.[0];
          return assetData?.chain === chain;
        });
        return sum + chainAffected.reduce((s, a) => s + a.delay, 0) / chainAffected.length;
      }, 0);
      metrics.averageSpreadTime = totalTime / recentContagions.length;
    }
  }

  /**
   * Detect sector rotation patterns
   */
  private detectSectorRotation(data: AssetData): void {
    if (!data.sector) return;
    
    // Calculate sector momentum
    const sectorMomentum = this.calculateSectorMomentum();
    
    // Find sectors with opposite momentum
    let maxRotation = 0;
    let fromSector = '';
    let toSector = '';
    
    for (const [sector1, momentum1] of sectorMomentum.entries()) {
      for (const [sector2, momentum2] of sectorMomentum.entries()) {
        if (sector1 === sector2) continue;
        
        // Look for negative correlation (money flowing from one to another)
        if (momentum1 < -this.config.sectorRotationThreshold && 
            momentum2 > this.config.sectorRotationThreshold) {
          const rotationStrength = momentum2 - momentum1;
          if (rotationStrength > maxRotation) {
            maxRotation = rotationStrength;
            fromSector = sector1;
            toSector = sector2;
          }
        }
      }
    }
    
    if (maxRotation > this.config.sectorRotationThreshold * 2) {
      const rotation: SectorRotation = {
        fromSector,
        toSector,
        timestamp: data.timestamp,
        strength: maxRotation,
        duration: this.estimateRotationDuration(fromSector, toSector),
        sentimentShift: maxRotation,
        assets: this.getSectorAssets(toSector)
      };
      
      this.sectorRotations.push(rotation);
      this.maintainHistoryWindow(this.sectorRotations, 20);
      
      this.emit('sector_rotation', rotation);
    }
  }

  /**
   * Calculate sector momentum
   */
  private calculateSectorMomentum(): Map<string, number> {
    const sectorMomentum = new Map<string, number>();
    const sectorCounts = new Map<string, number>();
    
    for (const [symbol, history] of this.assetHistory.entries()) {
      if (history.length < 10) continue;
      
      const asset = history[0];
      if (!asset.sector) continue;
      
      // Calculate momentum for this asset
      const recent = history.slice(-10);
      const oldSentiment = recent.slice(0, 5).reduce((sum, d) => sum + d.sentiment, 0) / 5;
      const newSentiment = recent.slice(5).reduce((sum, d) => sum + d.sentiment, 0) / 5;
      const momentum = newSentiment - oldSentiment;
      
      // Add to sector totals
      const current = sectorMomentum.get(asset.sector) || 0;
      sectorMomentum.set(asset.sector, current + momentum);
      
      const count = sectorCounts.get(asset.sector) || 0;
      sectorCounts.set(asset.sector, count + 1);
    }
    
    // Average by asset count
    for (const [sector, total] of sectorMomentum.entries()) {
      const count = sectorCounts.get(sector) || 1;
      sectorMomentum.set(sector, total / count);
    }
    
    return sectorMomentum;
  }

  /**
   * Generate contagion signal
   */
  private generateContagionSignal(
    contagion: ContagionEvent,
    predictions: ContagionSignal['predictedAssets'],
    currentData: AssetData
  ): ContagionSignal {
    // Determine severity
    const severity: ContagionSignal['severity'] = 
      contagion.velocity > this.config.velocityThreshold && contagion.reach > 5 ? 'high' :
      contagion.velocity > 0.5 || contagion.reach > 3 ? 'medium' : 'low';
    
    // Calculate cross-chain effects
    const crossChainEffects = this.calculateCrossChainEffects(contagion);
    
    // Calculate confidence
    const confidence = this.calculateSignalConfidence(contagion, predictions);
    
    // Find any sector rotation
    const recentRotation = this.sectorRotations.find(r => 
      Math.abs(r.timestamp - currentData.timestamp) < 60 * 60 * 1000
    );
    
    return {
      timestamp: Date.now(),
      type: 'contagion_detected',
      severity,
      contagionMetrics: {
        originAsset: contagion.originAsset,
        spreadVelocity: contagion.velocity,
        currentReach: contagion.reach,
        projectedReach: contagion.reach + predictions.length,
        timeToNextAsset: predictions[0]?.estimatedTime || 0
      },
      affectedAssets: contagion.affectedAssets.map(a => a.asset),
      predictedAssets: predictions,
      crossChainEffects,
      sectorRotation: recentRotation,
      confidence
    };
  }

  /**
   * Calculate cross-chain effects
   */
  private calculateCrossChainEffects(
    contagion: ContagionEvent
  ): ContagionSignal['crossChainEffects'] {
    const chainEffects = new Map<string, {
      exposure: number;
      assets: Set<string>;
    }>();
    
    // Analyze affected assets by chain
    for (const affected of contagion.affectedAssets) {
      const assetData = this.assetHistory.get(affected.asset)?.[0];
      if (!assetData?.chain) continue;
      
      if (!chainEffects.has(assetData.chain)) {
        chainEffects.set(assetData.chain, {
          exposure: 0,
          assets: new Set()
        });
      }
      
      const effect = chainEffects.get(assetData.chain)!;
      effect.exposure += affected.impact;
      effect.assets.add(affected.asset);
    }
    
    // Add related chains
    for (const [chain, effect] of chainEffects.entries()) {
      const relatedChains = this.chainRelationships[chain] || [];
      for (const relatedChain of relatedChains) {
        if (!chainEffects.has(relatedChain)) {
          const metrics = this.chainMetrics.get(relatedChain);
          if (metrics) {
            chainEffects.set(relatedChain, {
              exposure: effect.exposure * 0.5 * metrics.contagionSusceptibility,
              assets: new Set()
            });
          }
        }
      }
    }
    
    return Array.from(chainEffects.entries()).map(([chain, effect]) => ({
      chain,
      exposure: effect.exposure,
      correlatedAssets: Array.from(effect.assets)
    }));
  }

  /**
   * Calculate signal confidence
   */
  private calculateSignalConfidence(
    contagion: ContagionEvent,
    predictions: ContagionSignal['predictedAssets']
  ): number {
    let confidence = 0.5;
    
    // Strong velocity increases confidence
    if (contagion.velocity > this.config.velocityThreshold) {
      confidence += 0.2;
    }
    
    // Multiple affected assets
    if (contagion.reach > 3) {
      confidence += 0.15;
    }
    
    // High correlation in affected assets
    const avgCorrelation = contagion.affectedAssets.reduce(
      (sum, a) => sum + a.correlation, 0
    ) / contagion.affectedAssets.length;
    
    if (avgCorrelation > 0.7) {
      confidence += 0.15;
    }
    
    // Consistent predictions
    if (predictions.length > 3 && predictions[0].probability > 0.7) {
      confidence += 0.1;
    }
    
    return Math.min(1, confidence);
  }

  /**
   * Helper methods
   */
  
  private getCorrelationKey(asset1: string, asset2: string): string {
    return [asset1, asset2].sort().join(':');
  }

  private alignTimestamps(history1: AssetData[], history2: AssetData[]): Array<[AssetData, AssetData]> {
    const aligned: Array<[AssetData, AssetData]> = [];
    let i = 0, j = 0;
    
    while (i < history1.length && j < history2.length) {
      const timeDiff = Math.abs(history1[i].timestamp - history2[j].timestamp);
      
      if (timeDiff < 5 * 60 * 1000) { // Within 5 minutes
        aligned.push([history1[i], history2[j]]);
        i++;
        j++;
      } else if (history1[i].timestamp < history2[j].timestamp) {
        i++;
      } else {
        j++;
      }
    }
    
    return aligned;
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n === 0) return 0;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return den === 0 ? 0 : num / den;
  }

  private isL2Asset(symbol: string, data?: AssetData): boolean {
    if (!data?.chain) return false;
    
    const l2Chains = ['arbitrum', 'optimism', 'polygon', 'base', 'zksync', 'starknet'];
    return l2Chains.includes(data.chain.toLowerCase());
  }

  private areInSameEcosystem(chain1?: string, chain2?: string): boolean {
    if (!chain1 || !chain2) return false;
    
    // Check if chains are in same ecosystem
    for (const [mainChain, related] of Object.entries(this.chainRelationships)) {
      if ((chain1 === mainChain || related.includes(chain1)) &&
          (chain2 === mainChain || related.includes(chain2))) {
        return true;
      }
    }
    
    return false;
  }

  private estimateContagionDelay(from: string, to: string): number {
    // Check if we have historical data
    const key = this.getCorrelationKey(from, to);
    const relationship = this.assetRelationships.get(key);
    
    if (relationship && relationship.contagionHistory.length > 0) {
      // Use average historical delay
      const avgDelay = relationship.contagionHistory.reduce(
        (sum, h) => sum + Math.abs(relationship.leadLagTime), 0
      ) / relationship.contagionHistory.length;
      return avgDelay;
    }
    
    // Estimate based on correlation strength
    const correlation = this.correlationMatrix.get(key);
    if (correlation) {
      // Stronger correlation = faster contagion
      return Math.max(5, 60 * (1 - correlation.correlation)); // 5-60 minutes
    }
    
    return 30; // Default 30 minutes
  }

  private getBridgeAssetMultiplier(asset: string, connectedAsset: string): number {
    const key = this.getCorrelationKey(asset, connectedAsset);
    const relationship = this.assetRelationships.get(key);
    
    if (!relationship || relationship.bridgeAssets.length === 0) return 1;
    
    // More bridge assets = stronger connection
    return 1 + (relationship.bridgeAssets.length * 0.1);
  }

  private getSectorAssets(sector: string): string[] {
    const assets: string[] = [];
    
    for (const [symbol, history] of this.assetHistory.entries()) {
      if (history[0]?.sector === sector) {
        assets.push(symbol);
      }
    }
    
    return assets;
  }

  private estimateRotationDuration(fromSector: string, toSector: string): number {
    // Look at historical rotations
    const historicalRotations = this.sectorRotations.filter(r =>
      r.fromSector === fromSector && r.toSector === toSector
    );
    
    if (historicalRotations.length > 0) {
      const avgDuration = historicalRotations.reduce(
        (sum, r) => sum + r.duration, 0
      ) / historicalRotations.length;
      return avgDuration;
    }
    
    // Default estimate based on sector relationships
    const relatedSectors = this.sectorRelationships[fromSector] || [];
    if (relatedSectors.includes(toSector)) {
      return 24; // 24 hours for related sectors
    }
    
    return 48; // 48 hours for unrelated sectors
  }

  private maintainHistoryWindow<T>(array: T[], maxSize?: number): void {
    const limit = maxSize || 100;
    while (array.length > limit) {
      array.shift();
    }
  }

  /**
   * Public methods for analysis
   */
  
  public getContagionHistory(limit?: number): ContagionEvent[] {
    return limit ? this.contagionHistory.slice(-limit) : [...this.contagionHistory];
  }

  public getAssetCorrelations(asset: string): CorrelationData[] {
    const correlations: CorrelationData[] = [];
    
    for (const [key, corr] of this.correlationMatrix.entries()) {
      if (corr.asset1 === asset || corr.asset2 === asset) {
        correlations.push(corr);
      }
    }
    
    return correlations.sort((a, b) => b.correlation - a.correlation);
  }

  public getChainMetrics(chain?: string): ChainMetrics[] {
    if (chain) {
      const metrics = this.chainMetrics.get(chain);
      return metrics ? [metrics] : [];
    }
    
    return Array.from(this.chainMetrics.values());
  }

  public getSectorRotations(limit?: number): SectorRotation[] {
    return limit ? this.sectorRotations.slice(-limit) : [...this.sectorRotations];
  }

  public reset(): void {
    this.assetHistory.clear();
    this.correlationMatrix.clear();
    this.contagionHistory = [];
    this.assetRelationships.clear();
    this.chainMetrics.clear();
    this.sectorRotations = [];
  }
}