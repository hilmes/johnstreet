import { TradingSignal } from './SignalGenerator'
import { Strategy } from '@/types/trading'

export interface StrategyCapacity {
  strategyId: string
  currentPositions: number
  maxPositions: number
  allocatedCapital: number
  maxCapital: number
  activeSignals: number
  performance: {
    winRate: number
    avgReturn: number
    sharpeRatio: number
  }
}

export interface StrategyAssignment {
  signal: TradingSignal
  strategyId: string
  priority: number
  reason: string
}

export interface SignalRoutingRules {
  // Strategy selection criteria
  symbolWhitelist?: Record<string, string[]> // symbol -> allowed strategies
  timeframeMapping?: Record<string, string[]> // timeframe -> preferred strategies
  riskMapping?: Record<string, string[]> // risk level -> allowed strategies
  
  // Capacity rules
  maxSignalsPerStrategy?: number
  maxPositionsPerSymbol?: number
  diversificationRules?: {
    maxConcentration: number // Max % of capital in one symbol
    minStrategies: number // Min strategies for a symbol
  }
  
  // Performance-based routing
  performanceThreshold?: {
    minWinRate: number
    minSharpe: number
  }
}

export class SignalRouter {
  private routingRules: SignalRoutingRules
  private strategyCapacities: Map<string, StrategyCapacity> = new Map()
  private activeAssignments: Map<string, StrategyAssignment[]> = new Map()

  constructor(rules?: SignalRoutingRules) {
    this.routingRules = {
      maxSignalsPerStrategy: 10,
      maxPositionsPerSymbol: 3,
      diversificationRules: {
        maxConcentration: 0.2, // 20% max per symbol
        minStrategies: 1
      },
      performanceThreshold: {
        minWinRate: 0.4,
        minSharpe: 0.5
      },
      ...rules
    }
  }

  async routeToStrategy(
    signal: TradingSignal,
    availableStrategies: Strategy[]
  ): Promise<StrategyAssignment | null> {
    // Filter eligible strategies
    const eligibleStrategies = this.filterEligibleStrategies(signal, availableStrategies)
    
    if (eligibleStrategies.length === 0) {
      console.warn(`No eligible strategies for signal ${signal.id}`)
      return null
    }
    
    // Score and rank strategies
    const scoredStrategies = this.scoreStrategies(signal, eligibleStrategies)
    
    // Select best strategy with capacity
    for (const { strategy, score } of scoredStrategies) {
      if (await this.checkStrategyCapacity(strategy.id)) {
        const assignment: StrategyAssignment = {
          signal,
          strategyId: strategy.id,
          priority: Math.round(score * 10),
          reason: this.getAssignmentReason(signal, strategy, score)
        }
        
        // Record assignment
        this.recordAssignment(assignment)
        
        return assignment
      }
    }
    
    return null
  }

  async balanceLoad(signals: TradingSignal[], strategies: Strategy[]): Promise<StrategyAssignment[]> {
    const assignments: StrategyAssignment[] = []
    const strategyLoads = new Map<string, number>()
    
    // Initialize load tracking
    strategies.forEach(s => strategyLoads.set(s.id, 0))
    
    // Sort signals by priority
    const sortedSignals = [...signals].sort((a, b) => b.priority - a.priority)
    
    for (const signal of sortedSignals) {
      // Find strategy with lowest load that can handle this signal
      const eligibleStrategies = this.filterEligibleStrategies(signal, strategies)
        .filter(s => strategyLoads.get(s.id)! < this.routingRules.maxSignalsPerStrategy!)
        .sort((a, b) => strategyLoads.get(a.id)! - strategyLoads.get(b.id)!)
      
      if (eligibleStrategies.length > 0) {
        const selectedStrategy = eligibleStrategies[0]
        
        const assignment: StrategyAssignment = {
          signal,
          strategyId: selectedStrategy.id,
          priority: signal.priority,
          reason: 'Load balanced assignment'
        }
        
        assignments.push(assignment)
        strategyLoads.set(selectedStrategy.id, strategyLoads.get(selectedStrategy.id)! + 1)
      }
    }
    
    // Record all assignments
    assignments.forEach(a => this.recordAssignment(a))
    
    return assignments
  }

  async checkStrategyCapacity(strategyId: string): Promise<boolean> {
    const capacity = this.strategyCapacities.get(strategyId)
    if (!capacity) return true // No capacity info = assume available
    
    // Check position limit
    if (capacity.currentPositions >= capacity.maxPositions) {
      return false
    }
    
    // Check capital limit
    if (capacity.allocatedCapital >= capacity.maxCapital * 0.95) {
      return false
    }
    
    // Check signal limit
    if (capacity.activeSignals >= (this.routingRules.maxSignalsPerStrategy || 10)) {
      return false
    }
    
    return true
  }

  updateStrategyCapacity(strategyId: string, capacity: Partial<StrategyCapacity>): void {
    const current = this.strategyCapacities.get(strategyId) || {
      strategyId,
      currentPositions: 0,
      maxPositions: 10,
      allocatedCapital: 0,
      maxCapital: 100000,
      activeSignals: 0,
      performance: {
        winRate: 0.5,
        avgReturn: 0,
        sharpeRatio: 0
      }
    }
    
    this.strategyCapacities.set(strategyId, {
      ...current,
      ...capacity
    })
  }

  getActiveAssignments(strategyId?: string): StrategyAssignment[] {
    if (strategyId) {
      return this.activeAssignments.get(strategyId) || []
    }
    
    const allAssignments: StrategyAssignment[] = []
    for (const assignments of this.activeAssignments.values()) {
      allAssignments.push(...assignments)
    }
    
    return allAssignments
  }

  removeExpiredAssignments(): number {
    const now = Date.now()
    let removed = 0
    
    for (const [strategyId, assignments] of this.activeAssignments) {
      const active = assignments.filter(a => a.signal.expiresAt > now)
      removed += assignments.length - active.length
      
      if (active.length > 0) {
        this.activeAssignments.set(strategyId, active)
      } else {
        this.activeAssignments.delete(strategyId)
      }
    }
    
    return removed
  }

  private filterEligibleStrategies(signal: TradingSignal, strategies: Strategy[]): Strategy[] {
    return strategies.filter(strategy => {
      // Check symbol whitelist
      if (this.routingRules.symbolWhitelist) {
        const allowedStrategies = this.routingRules.symbolWhitelist[signal.symbol]
        if (allowedStrategies && !allowedStrategies.includes(strategy.id)) {
          return false
        }
      }
      
      // Check timeframe mapping
      if (this.routingRules.timeframeMapping) {
        const preferredStrategies = this.routingRules.timeframeMapping[signal.timeframe]
        if (preferredStrategies && !preferredStrategies.includes(strategy.id)) {
          return false
        }
      }
      
      // Check risk mapping
      if (this.routingRules.riskMapping) {
        const allowedStrategies = this.routingRules.riskMapping[signal.metadata.riskLevel]
        if (allowedStrategies && !allowedStrategies.includes(strategy.id)) {
          return false
        }
      }
      
      // Check performance threshold
      const capacity = this.strategyCapacities.get(strategy.id)
      if (capacity && this.routingRules.performanceThreshold) {
        if (capacity.performance.winRate < this.routingRules.performanceThreshold.minWinRate) {
          return false
        }
        if (capacity.performance.sharpeRatio < this.routingRules.performanceThreshold.minSharpe) {
          return false
        }
      }
      
      // Check strategy-specific rules
      if (strategy.rules) {
        // Check allowed symbols
        if (strategy.rules.allowedSymbols && strategy.rules.allowedSymbols.length > 0) {
          if (!strategy.rules.allowedSymbols.includes(signal.symbol)) {
            return false
          }
        }
        
        // Check risk limits
        if (signal.metadata.riskLevel === 'critical' && !strategy.rules.allowHighRisk) {
          return false
        }
      }
      
      return true
    })
  }

  private scoreStrategies(
    signal: TradingSignal,
    strategies: Strategy[]
  ): Array<{ strategy: Strategy; score: number }> {
    const scored = strategies.map(strategy => {
      let score = 0
      
      // Performance score (40%)
      const capacity = this.strategyCapacities.get(strategy.id)
      if (capacity) {
        score += capacity.performance.winRate * 0.2
        score += Math.min(capacity.performance.sharpeRatio / 2, 0.2)
      } else {
        score += 0.2 // Default performance score
      }
      
      // Timeframe match (20%)
      if (strategy.config?.defaultTimeframe === signal.timeframe) {
        score += 0.2
      } else {
        score += 0.1 // Partial score for any timeframe
      }
      
      // Risk alignment (20%)
      const strategyRiskTolerance = strategy.rules?.maxRiskPerTrade || 0.02
      const signalRiskLevel = this.mapRiskLevelToNumber(signal.metadata.riskLevel)
      const riskAlignment = 1 - Math.abs(strategyRiskTolerance - signalRiskLevel)
      score += riskAlignment * 0.2
      
      // Capacity utilization (20%)
      if (capacity) {
        const utilizationRate = capacity.currentPositions / capacity.maxPositions
        score += (1 - utilizationRate) * 0.2 // Prefer less utilized strategies
      } else {
        score += 0.2
      }
      
      return { strategy, score }
    })
    
    // Sort by score descending
    return scored.sort((a, b) => b.score - a.score)
  }

  private mapRiskLevelToNumber(riskLevel: string): number {
    switch (riskLevel) {
      case 'low': return 0.01
      case 'medium': return 0.02
      case 'high': return 0.04
      case 'critical': return 0.08
      default: return 0.02
    }
  }

  private getAssignmentReason(signal: TradingSignal, strategy: Strategy, score: number): string {
    const reasons: string[] = []
    
    // Performance reason
    const capacity = this.strategyCapacities.get(strategy.id)
    if (capacity && capacity.performance.winRate > 0.6) {
      reasons.push(`High win rate (${(capacity.performance.winRate * 100).toFixed(1)}%)`)
    }
    
    // Timeframe match
    if (strategy.config?.defaultTimeframe === signal.timeframe) {
      reasons.push(`Timeframe match (${signal.timeframe})`)
    }
    
    // Risk alignment
    if (signal.metadata.riskLevel === 'low' && strategy.rules?.conservative) {
      reasons.push('Conservative strategy for low-risk signal')
    }
    
    // Score reason
    reasons.push(`Score: ${(score * 100).toFixed(1)}%`)
    
    return reasons.join(', ')
  }

  private recordAssignment(assignment: StrategyAssignment): void {
    if (!this.activeAssignments.has(assignment.strategyId)) {
      this.activeAssignments.set(assignment.strategyId, [])
    }
    
    const assignments = this.activeAssignments.get(assignment.strategyId)!
    assignments.push(assignment)
    
    // Update strategy capacity
    const capacity = this.strategyCapacities.get(assignment.strategyId)
    if (capacity) {
      capacity.activeSignals += 1
    }
  }

  // Analytics methods
  getRoutingStats(): {
    totalAssignments: number
    assignmentsByStrategy: Record<string, number>
    avgSignalsPerStrategy: number
    routingEfficiency: number
  } {
    let totalAssignments = 0
    const assignmentsByStrategy: Record<string, number> = {}
    
    for (const [strategyId, assignments] of this.activeAssignments) {
      assignmentsByStrategy[strategyId] = assignments.length
      totalAssignments += assignments.length
    }
    
    const numStrategies = Object.keys(assignmentsByStrategy).length
    const avgSignalsPerStrategy = numStrategies > 0 ? totalAssignments / numStrategies : 0
    
    // Routing efficiency = how evenly distributed signals are
    const variance = Object.values(assignmentsByStrategy)
      .reduce((sum, count) => sum + Math.pow(count - avgSignalsPerStrategy, 2), 0) / numStrategies
    const routingEfficiency = 1 - (Math.sqrt(variance) / avgSignalsPerStrategy)
    
    return {
      totalAssignments,
      assignmentsByStrategy,
      avgSignalsPerStrategy,
      routingEfficiency: isNaN(routingEfficiency) ? 1 : routingEfficiency
    }
  }
}

// Export singleton instance
export const signalRouter = new SignalRouter()