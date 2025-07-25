import { TradingSignal } from '../signals/SignalGenerator'
import { Portfolio } from '@/types/trading'

export interface PositionSizingMethod {
  type: 'fixed' | 'percentage' | 'kelly' | 'risk_parity' | 'volatility_adjusted'
  parameters: Record<string, number>
}

export interface RiskParameters {
  maxPositionSize: number // Max % of portfolio per position
  maxRiskPerTrade: number // Max % loss per trade
  maxPortfolioRisk: number // Max % portfolio at risk
  maxCorrelatedExposure: number // Max % in correlated assets
  minPositionSize: number // Min position size (in base currency)
  maxLeverage: number // Max leverage allowed
}

export interface MarketConditions {
  volatility: number // Current market volatility (0-1)
  trend: 'bullish' | 'bearish' | 'neutral'
  liquidity: number // Liquidity score (0-1)
  correlations: Map<string, Map<string, number>> // Symbol correlation matrix
}

export interface PositionSize {
  symbol: string
  baseAmount: number // Amount in base currency
  quoteAmount: number // Amount in quote currency
  percentage: number // % of portfolio
  leverage: number // Applied leverage
  stopLoss: number // Stop loss price
  takeProfit: number // Take profit price
  riskAmount: number // Amount at risk
  metadata: {
    method: PositionSizingMethod['type']
    confidence: number
    adjustments: string[]
  }
}

export class PositionSizer {
  private riskParams: RiskParameters
  private portfolio: Portfolio | null = null
  private marketConditions: MarketConditions | null = null
  private historicalReturns: Map<string, number[]> = new Map()

  constructor(riskParams?: Partial<RiskParameters>) {
    this.riskParams = {
      maxPositionSize: 0.1, // 10% max per position
      maxRiskPerTrade: 0.02, // 2% max risk per trade
      maxPortfolioRisk: 0.06, // 6% max portfolio risk
      maxCorrelatedExposure: 0.3, // 30% max in correlated assets
      minPositionSize: 100, // $100 minimum
      maxLeverage: 3, // 3x max leverage
      ...riskParams
    }
  }

  calculatePositionSize(
    signal: TradingSignal,
    price: number,
    portfolio: Portfolio,
    method?: PositionSizingMethod
  ): PositionSize | null {
    this.portfolio = portfolio
    
    // Select sizing method
    const sizingMethod = method || this.selectOptimalMethod(signal)
    
    // Calculate base position size
    let baseSize = 0
    switch (sizingMethod.type) {
      case 'fixed':
        baseSize = this.fixedSizing(sizingMethod.parameters)
        break
      case 'percentage':
        baseSize = this.percentageSizing(portfolio, sizingMethod.parameters)
        break
      case 'kelly':
        baseSize = this.kellySizing(signal, portfolio, sizingMethod.parameters)
        break
      case 'risk_parity':
        baseSize = this.riskParitySizing(signal, portfolio, sizingMethod.parameters)
        break
      case 'volatility_adjusted':
        baseSize = this.volatilityAdjustedSizing(signal, portfolio, sizingMethod.parameters)
        break
    }
    
    // Apply risk adjustments
    const adjustments: string[] = []
    baseSize = this.applyRiskLimits(baseSize, signal, portfolio, adjustments)
    
    // Check minimum size
    if (baseSize < this.riskParams.minPositionSize) {
      return null // Position too small
    }
    
    // Calculate stop loss and take profit
    const { stopLoss, takeProfit } = this.calculateRiskLevels(signal, price)
    
    // Calculate risk amount
    const riskAmount = this.calculateRiskAmount(baseSize, price, stopLoss)
    
    // Final portfolio risk check
    if (!this.checkPortfolioRisk(riskAmount, portfolio)) {
      adjustments.push('Reduced for portfolio risk limit')
      baseSize = this.adjustForPortfolioRisk(baseSize, riskAmount, portfolio)
    }
    
    return {
      symbol: signal.symbol,
      baseAmount: baseSize,
      quoteAmount: baseSize / price,
      percentage: baseSize / portfolio.totalValue,
      leverage: 1, // Will be calculated based on strategy
      stopLoss,
      takeProfit,
      riskAmount,
      metadata: {
        method: sizingMethod.type,
        confidence: signal.confidence,
        adjustments
      }
    }
  }

  // Fixed position sizing
  private fixedSizing(params: Record<string, number>): number {
    return params.amount || 1000
  }

  // Percentage of portfolio sizing
  private percentageSizing(portfolio: Portfolio, params: Record<string, number>): number {
    const percentage = params.percentage || 0.02 // Default 2%
    return portfolio.totalValue * percentage
  }

  // Kelly Criterion sizing
  private kellySizing(signal: TradingSignal, portfolio: Portfolio, params: Record<string, number>): number {
    const winProbability = this.estimateWinProbability(signal)
    const winLossRatio = params.winLossRatio || 1.5 // Default 1.5:1 reward/risk
    
    // Kelly formula: f = (p * b - q) / b
    // where f = fraction to bet, p = win probability, q = loss probability, b = win/loss ratio
    const q = 1 - winProbability
    const kellyFraction = (winProbability * winLossRatio - q) / winLossRatio
    
    // Apply Kelly fraction with safety factor
    const safetyFactor = params.safetyFactor || 0.25 // Use 25% of Kelly
    const fraction = Math.max(0, kellyFraction * safetyFactor)
    
    return portfolio.totalValue * Math.min(fraction, this.riskParams.maxPositionSize)
  }

  // Risk parity sizing
  private riskParitySizing(signal: TradingSignal, portfolio: Portfolio, params: Record<string, number>): number {
    const targetRisk = params.targetRisk || 0.01 // 1% target risk contribution
    const volatility = signal.source.marketData.volatility
    
    // Size inversely proportional to volatility
    const baseSize = (portfolio.totalValue * targetRisk) / volatility
    
    // Adjust for correlation with existing positions
    const correlationAdjustment = this.getCorrelationAdjustment(signal.symbol)
    
    return baseSize * correlationAdjustment
  }

  // Volatility-adjusted sizing
  private volatilityAdjustedSizing(signal: TradingSignal, portfolio: Portfolio, params: Record<string, number>): number {
    const basePercentage = params.basePercentage || 0.02 // 2% base
    const targetVolatility = params.targetVolatility || 0.15 // 15% target vol
    const currentVolatility = signal.source.marketData.volatility
    
    // Adjust size inversely to volatility
    const volAdjustment = Math.min(2, targetVolatility / currentVolatility)
    
    return portfolio.totalValue * basePercentage * volAdjustment
  }

  // Apply risk limits and adjustments
  private applyRiskLimits(
    baseSize: number,
    signal: TradingSignal,
    portfolio: Portfolio,
    adjustments: string[]
  ): number {
    let adjustedSize = baseSize
    
    // Max position size limit
    const maxSize = portfolio.totalValue * this.riskParams.maxPositionSize
    if (adjustedSize > maxSize) {
      adjustedSize = maxSize
      adjustments.push(`Capped at max position size (${(this.riskParams.maxPositionSize * 100).toFixed(1)}%)`)
    }
    
    // Risk level adjustments
    if (signal.metadata.riskLevel === 'critical') {
      adjustedSize *= 0.5
      adjustments.push('Reduced 50% for critical risk')
    } else if (signal.metadata.riskLevel === 'high') {
      adjustedSize *= 0.75
      adjustments.push('Reduced 25% for high risk')
    }
    
    // Confidence adjustments
    if (signal.confidence < 0.7) {
      const confidenceMultiplier = 0.5 + (signal.confidence * 0.5)
      adjustedSize *= confidenceMultiplier
      adjustments.push(`Adjusted for confidence (${(signal.confidence * 100).toFixed(0)}%)`)
    }
    
    // Market conditions adjustments
    if (this.marketConditions) {
      if (this.marketConditions.volatility > 0.3) {
        adjustedSize *= 0.7
        adjustments.push('Reduced 30% for high market volatility')
      }
      
      if (this.marketConditions.liquidity < 0.5) {
        adjustedSize *= 0.8
        adjustments.push('Reduced 20% for low liquidity')
      }
    }
    
    // Leverage limits
    const maxLeveragedSize = portfolio.totalValue * this.riskParams.maxLeverage
    if (adjustedSize > maxLeveragedSize) {
      adjustedSize = maxLeveragedSize
      adjustments.push(`Capped at max leverage (${this.riskParams.maxLeverage}x)`)
    }
    
    return adjustedSize
  }

  // Calculate stop loss and take profit levels
  private calculateRiskLevels(signal: TradingSignal, currentPrice: number): {
    stopLoss: number
    takeProfit: number
  } {
    const volatility = signal.source.marketData.volatility
    const timeframeMultiplier = this.getTimeframeMultiplier(signal.timeframe)
    
    // Dynamic stop loss based on volatility and timeframe
    const stopDistance = volatility * timeframeMultiplier * 2 // 2x volatility
    const profitDistance = stopDistance * 2 // 2:1 reward/risk ratio
    
    // Adjust for signal strength
    const strengthMultiplier = 0.5 + (signal.strength * 0.5) // 0.5x to 1x
    
    return {
      stopLoss: currentPrice * (1 - stopDistance * strengthMultiplier),
      takeProfit: currentPrice * (1 + profitDistance * strengthMultiplier)
    }
  }

  private getTimeframeMultiplier(timeframe: string): number {
    switch (timeframe) {
      case '1m': return 0.1
      case '5m': return 0.2
      case '15m': return 0.3
      case '1h': return 0.5
      case '4h': return 0.8
      case '1d': return 1.0
      default: return 0.5
    }
  }

  // Calculate amount at risk
  private calculateRiskAmount(positionSize: number, entryPrice: number, stopLoss: number): number {
    const stopLossPercentage = Math.abs(entryPrice - stopLoss) / entryPrice
    return positionSize * stopLossPercentage
  }

  // Check if adding position exceeds portfolio risk limits
  private checkPortfolioRisk(newRiskAmount: number, portfolio: Portfolio): boolean {
    const currentRisk = this.calculateCurrentPortfolioRisk(portfolio)
    const totalRisk = currentRisk + newRiskAmount
    const totalRiskPercentage = totalRisk / portfolio.totalValue
    
    return totalRiskPercentage <= this.riskParams.maxPortfolioRisk
  }

  private calculateCurrentPortfolioRisk(portfolio: Portfolio): number {
    // Sum up risk from all open positions
    // In a real implementation, this would iterate through actual positions
    return portfolio.totalValue * 0.02 // Placeholder: assume 2% current risk
  }

  private adjustForPortfolioRisk(size: number, riskAmount: number, portfolio: Portfolio): number {
    const currentRisk = this.calculateCurrentPortfolioRisk(portfolio)
    const availableRisk = (portfolio.totalValue * this.riskParams.maxPortfolioRisk) - currentRisk
    
    if (availableRisk <= 0) return 0
    
    const riskRatio = availableRisk / riskAmount
    return size * Math.min(1, riskRatio)
  }

  // Estimate win probability based on signal and historical data
  private estimateWinProbability(signal: TradingSignal): number {
    // Base probability from signal confidence
    let probability = signal.confidence * 0.6 // Scale down confidence
    
    // Adjust based on historical performance
    const historicalWinRate = this.getHistoricalWinRate(signal.symbol)
    if (historicalWinRate !== null) {
      probability = (probability + historicalWinRate) / 2 // Average with historical
    }
    
    // Adjust for risk level
    if (signal.metadata.riskLevel === 'critical') probability *= 0.7
    else if (signal.metadata.riskLevel === 'high') probability *= 0.85
    
    return Math.max(0.3, Math.min(0.8, probability)) // Clamp between 30% and 80%
  }

  private getHistoricalWinRate(symbol: string): number | null {
    const returns = this.historicalReturns.get(symbol)
    if (!returns || returns.length < 10) return null
    
    const wins = returns.filter(r => r > 0).length
    return wins / returns.length
  }

  private getCorrelationAdjustment(symbol: string): number {
    if (!this.marketConditions || !this.portfolio) return 1
    
    // Check correlation with existing positions
    // In a real implementation, this would check actual portfolio positions
    const correlations = this.marketConditions.correlations.get(symbol)
    if (!correlations) return 1
    
    // Reduce size if highly correlated with existing positions
    let maxCorrelation = 0
    for (const [otherSymbol, correlation] of correlations) {
      maxCorrelation = Math.max(maxCorrelation, Math.abs(correlation))
    }
    
    return 1 - (maxCorrelation * 0.5) // Reduce up to 50% for perfect correlation
  }

  private selectOptimalMethod(signal: TradingSignal): PositionSizingMethod {
    // Select method based on signal characteristics
    if (signal.confidence > 0.8 && signal.metadata.riskLevel === 'low') {
      return {
        type: 'kelly',
        parameters: { winLossRatio: 2, safetyFactor: 0.3 }
      }
    }
    
    if (signal.source.marketData.volatility > 0.2) {
      return {
        type: 'volatility_adjusted',
        parameters: { basePercentage: 0.02, targetVolatility: 0.15 }
      }
    }
    
    return {
      type: 'percentage',
      parameters: { percentage: 0.02 }
    }
  }

  // Public methods for configuration
  updateRiskParameters(params: Partial<RiskParameters>): void {
    this.riskParams = { ...this.riskParams, ...params }
  }

  updateMarketConditions(conditions: MarketConditions): void {
    this.marketConditions = conditions
  }

  addHistoricalReturn(symbol: string, returnValue: number): void {
    if (!this.historicalReturns.has(symbol)) {
      this.historicalReturns.set(symbol, [])
    }
    
    const returns = this.historicalReturns.get(symbol)!
    returns.push(returnValue)
    
    // Keep only last 100 returns
    if (returns.length > 100) {
      returns.shift()
    }
  }

  // Analytics
  getPositionSizingStats(): {
    avgPositionSize: number
    avgRiskPerTrade: number
    methodUsage: Record<string, number>
  } {
    // In a real implementation, this would track actual usage
    return {
      avgPositionSize: 0.02,
      avgRiskPerTrade: 0.01,
      methodUsage: {
        percentage: 0.4,
        volatility_adjusted: 0.3,
        kelly: 0.2,
        risk_parity: 0.1,
        fixed: 0
      }
    }
  }
}

// Export singleton instance
export const positionSizer = new PositionSizer()