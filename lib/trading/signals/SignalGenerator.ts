import { SentimentScore } from '@/lib/sentiment/SentimentAnalyzer'
import { CrossPlatformSignal } from '@/lib/feeds/DataOrchestrator'

export interface MarketData {
  symbol: string
  price: number
  volume24h: number
  priceChange24h: number
  volatility: number
  bid: number
  ask: number
  timestamp: number
}

export interface TradingSignal {
  id: string
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  strength: number // 0-1 signal strength
  confidence: number // 0-1 confidence level
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  source: {
    sentiment: SentimentScore
    marketData: MarketData
    crossPlatformSignal?: CrossPlatformSignal
  }
  metadata: {
    sentimentVelocity: number // Rate of sentiment change
    volumeProfile: 'increasing' | 'decreasing' | 'stable'
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    correlatedSymbols: string[]
  }
  createdAt: number
  expiresAt: number
  priority: number // 1-10, higher = more important
}

export interface SignalValidation {
  isValid: boolean
  reasons: string[]
  adjustments?: {
    strength?: number
    confidence?: number
    timeframe?: TradingSignal['timeframe']
  }
}

export interface SignalGeneratorConfig {
  // Sentiment thresholds
  sentimentThresholds: {
    bullish: number // Above this = potential buy
    bearish: number // Below this = potential sell
    neutral: { min: number; max: number }
  }
  
  // Risk parameters
  riskLimits: {
    maxRiskScore: number
    minConfidence: number
    requiredPlatforms: number // Min platforms for cross-platform signals
  }
  
  // Market conditions
  marketFilters: {
    minVolume24h: number
    maxVolatility: number
    minLiquidity: number
  }
  
  // Signal parameters
  signalParams: {
    defaultTimeframe: TradingSignal['timeframe']
    signalTTL: number // Time to live in milliseconds
    velocityWindow: number // Time window for velocity calculation
  }
}

export class SignalGenerator {
  private config: SignalGeneratorConfig
  private signalHistory: Map<string, TradingSignal[]> = new Map()
  private sentimentHistory: Map<string, { sentiment: number; timestamp: number }[]> = new Map()

  constructor(config?: Partial<SignalGeneratorConfig>) {
    this.config = {
      sentimentThresholds: {
        bullish: 0.6,
        bearish: -0.6,
        neutral: { min: -0.2, max: 0.2 }
      },
      riskLimits: {
        maxRiskScore: 0.7,
        minConfidence: 0.6,
        requiredPlatforms: 2
      },
      marketFilters: {
        minVolume24h: 100000, // $100k daily volume
        maxVolatility: 0.3, // 30% max volatility
        minLiquidity: 50000 // $50k order book depth
      },
      signalParams: {
        defaultTimeframe: '15m',
        signalTTL: 15 * 60 * 1000, // 15 minutes
        velocityWindow: 30 * 60 * 1000 // 30 minutes
      },
      ...config
    }
  }

  async generateFromSentiment(
    sentiment: SentimentScore,
    marketData: MarketData,
    crossPlatformSignal?: CrossPlatformSignal
  ): Promise<TradingSignal | null> {
    // Update sentiment history
    this.updateSentimentHistory(marketData.symbol, sentiment.score)
    
    // Calculate sentiment velocity
    const sentimentVelocity = this.calculateSentimentVelocity(marketData.symbol)
    
    // Determine signal action
    const action = this.determineAction(sentiment, sentimentVelocity, marketData)
    if (action === 'HOLD') return null
    
    // Calculate signal strength and confidence
    const strength = this.calculateSignalStrength(sentiment, sentimentVelocity, crossPlatformSignal)
    const confidence = this.calculateConfidence(sentiment, marketData, crossPlatformSignal)
    
    // Check if signal meets minimum thresholds
    if (confidence < this.config.riskLimits.minConfidence) return null
    
    // Determine risk level
    const riskLevel = this.assessRiskLevel(sentiment, marketData, crossPlatformSignal)
    if (riskLevel === 'critical' && crossPlatformSignal?.riskLevel !== 'critical') return null
    
    // Create trading signal
    const signal: TradingSignal = {
      id: this.generateSignalId(),
      symbol: marketData.symbol,
      action,
      strength,
      confidence,
      timeframe: this.determineTimeframe(sentimentVelocity, marketData.volatility),
      source: {
        sentiment,
        marketData,
        crossPlatformSignal
      },
      metadata: {
        sentimentVelocity,
        volumeProfile: this.analyzeVolumeProfile(marketData),
        riskLevel,
        correlatedSymbols: crossPlatformSignal?.relatedSymbols || []
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.signalParams.signalTTL,
      priority: this.calculatePriority(strength, confidence, riskLevel)
    }
    
    // Store signal in history
    this.addToSignalHistory(signal)
    
    return signal
  }

  validateSignal(signal: TradingSignal, currentMarketData?: MarketData): SignalValidation {
    const reasons: string[] = []
    const adjustments: SignalValidation['adjustments'] = {}
    
    // Check if signal has expired
    if (Date.now() > signal.expiresAt) {
      reasons.push('Signal has expired')
      return { isValid: false, reasons }
    }
    
    // Validate market conditions if current data provided
    if (currentMarketData) {
      // Check price deviation
      const priceDeviation = Math.abs(currentMarketData.price - signal.source.marketData.price) / signal.source.marketData.price
      if (priceDeviation > 0.05) { // 5% price change
        reasons.push(`Price has moved ${(priceDeviation * 100).toFixed(2)}% since signal generation`)
        adjustments.strength = signal.strength * (1 - priceDeviation)
      }
      
      // Check volume
      if (currentMarketData.volume24h < this.config.marketFilters.minVolume24h) {
        reasons.push('Current volume below minimum threshold')
        adjustments.confidence = signal.confidence * 0.8
      }
      
      // Check volatility
      if (currentMarketData.volatility > this.config.marketFilters.maxVolatility) {
        reasons.push('Current volatility exceeds maximum threshold')
        adjustments.timeframe = '1m' // Reduce timeframe in high volatility
      }
    }
    
    // Check signal history for conflicting signals
    const recentSignals = this.getRecentSignals(signal.symbol, 5 * 60 * 1000) // Last 5 minutes
    const conflictingSignals = recentSignals.filter(s => 
      s.id !== signal.id && s.action !== signal.action
    )
    
    if (conflictingSignals.length > 0) {
      reasons.push(`Found ${conflictingSignals.length} conflicting signals`)
      adjustments.confidence = signal.confidence * 0.7
    }
    
    // Determine if signal is still valid
    const isValid = reasons.length === 0 || 
      (adjustments.confidence && adjustments.confidence >= this.config.riskLimits.minConfidence)
    
    return { isValid, reasons, adjustments }
  }

  prioritizeSignals(signals: TradingSignal[]): TradingSignal[] {
    return signals
      .filter(s => this.validateSignal(s).isValid)
      .sort((a, b) => {
        // Sort by priority (descending)
        if (a.priority !== b.priority) return b.priority - a.priority
        
        // Then by confidence (descending)
        if (a.confidence !== b.confidence) return b.confidence - a.confidence
        
        // Then by strength (descending)
        if (a.strength !== b.strength) return b.strength - a.strength
        
        // Finally by creation time (newest first)
        return b.createdAt - a.createdAt
      })
  }

  private determineAction(
    sentiment: SentimentScore,
    velocity: number,
    marketData: MarketData
  ): TradingSignal['action'] {
    // Strong bullish sentiment with positive velocity
    if (sentiment.score > this.config.sentimentThresholds.bullish && velocity > 0.1) {
      return 'BUY'
    }
    
    // Strong bearish sentiment with negative velocity
    if (sentiment.score < this.config.sentimentThresholds.bearish && velocity < -0.1) {
      return 'SELL'
    }
    
    // Momentum reversal signals
    if (sentiment.score > 0.4 && velocity > 0.2 && marketData.priceChange24h < -0.05) {
      return 'BUY' // Sentiment improving while price is down
    }
    
    if (sentiment.score < -0.4 && velocity < -0.2 && marketData.priceChange24h > 0.05) {
      return 'SELL' // Sentiment worsening while price is up
    }
    
    return 'HOLD'
  }

  private calculateSignalStrength(
    sentiment: SentimentScore,
    velocity: number,
    crossPlatformSignal?: CrossPlatformSignal
  ): number {
    let strength = 0
    
    // Base strength from sentiment magnitude
    strength += Math.abs(sentiment.score) * 0.4
    
    // Velocity component
    strength += Math.min(Math.abs(velocity), 0.5) * 0.3
    
    // Cross-platform bonus
    if (crossPlatformSignal) {
      strength += Math.min(crossPlatformSignal.confidence, 1) * 0.3
    }
    
    return Math.min(strength, 1)
  }

  private calculateConfidence(
    sentiment: SentimentScore,
    marketData: MarketData,
    crossPlatformSignal?: CrossPlatformSignal
  ): number {
    let confidence = sentiment.confidence
    
    // Adjust for market conditions
    if (marketData.volume24h > this.config.marketFilters.minVolume24h * 2) {
      confidence *= 1.1 // Higher volume = higher confidence
    }
    
    if (marketData.volatility < 0.1) {
      confidence *= 1.05 // Lower volatility = higher confidence
    }
    
    // Cross-platform validation
    if (crossPlatformSignal && crossPlatformSignal.platforms.length >= this.config.riskLimits.requiredPlatforms) {
      confidence *= 1.15
    }
    
    return Math.min(confidence, 1)
  }

  private calculateSentimentVelocity(symbol: string): number {
    const history = this.sentimentHistory.get(symbol) || []
    if (history.length < 2) return 0
    
    const window = this.config.signalParams.velocityWindow
    const now = Date.now()
    const recentHistory = history.filter(h => now - h.timestamp < window)
    
    if (recentHistory.length < 2) return 0
    
    // Calculate rate of change
    const oldest = recentHistory[0]
    const newest = recentHistory[recentHistory.length - 1]
    const timeDiff = (newest.timestamp - oldest.timestamp) / 1000 / 60 // Minutes
    
    return (newest.sentiment - oldest.sentiment) / timeDiff
  }

  private determineTimeframe(velocity: number, volatility: number): TradingSignal['timeframe'] {
    // High velocity or volatility = shorter timeframe
    if (Math.abs(velocity) > 0.3 || volatility > 0.2) return '1m'
    if (Math.abs(velocity) > 0.2 || volatility > 0.15) return '5m'
    if (Math.abs(velocity) > 0.1 || volatility > 0.1) return '15m'
    if (Math.abs(velocity) > 0.05) return '1h'
    return '4h'
  }

  private assessRiskLevel(
    sentiment: SentimentScore,
    marketData: MarketData,
    crossPlatformSignal?: CrossPlatformSignal
  ): TradingSignal['metadata']['riskLevel'] {
    const risks: number[] = []
    
    // Sentiment-based risk
    if (sentiment.keywords.some(k => ['pump', 'dump', 'rug', 'scam'].includes(k.toLowerCase()))) {
      risks.push(0.9)
    }
    
    // Volatility risk
    risks.push(Math.min(marketData.volatility / 0.3, 1))
    
    // Cross-platform risk
    if (crossPlatformSignal) {
      if (crossPlatformSignal.riskLevel === 'critical') return 'critical'
      if (crossPlatformSignal.riskLevel === 'high') risks.push(0.8)
    }
    
    const maxRisk = Math.max(...risks, 0)
    
    if (maxRisk > 0.8) return 'critical'
    if (maxRisk > 0.6) return 'high'
    if (maxRisk > 0.3) return 'medium'
    return 'low'
  }

  private analyzeVolumeProfile(marketData: MarketData): TradingSignal['metadata']['volumeProfile'] {
    // In a real implementation, this would compare against historical volume
    // For now, use simple 24h change
    if (marketData.priceChange24h > 0.1) return 'increasing'
    if (marketData.priceChange24h < -0.1) return 'decreasing'
    return 'stable'
  }

  private calculatePriority(strength: number, confidence: number, riskLevel: string): number {
    let priority = Math.round((strength + confidence) * 5)
    
    // Adjust for risk
    if (riskLevel === 'critical') priority = Math.max(priority - 3, 1)
    if (riskLevel === 'high') priority = Math.max(priority - 1, 1)
    
    return Math.min(Math.max(priority, 1), 10)
  }

  private updateSentimentHistory(symbol: string, sentiment: number): void {
    if (!this.sentimentHistory.has(symbol)) {
      this.sentimentHistory.set(symbol, [])
    }
    
    const history = this.sentimentHistory.get(symbol)!
    history.push({ sentiment, timestamp: Date.now() })
    
    // Keep only recent history
    const cutoff = Date.now() - (2 * this.config.signalParams.velocityWindow)
    this.sentimentHistory.set(
      symbol,
      history.filter(h => h.timestamp > cutoff)
    )
  }

  private addToSignalHistory(signal: TradingSignal): void {
    if (!this.signalHistory.has(signal.symbol)) {
      this.signalHistory.set(signal.symbol, [])
    }
    
    const history = this.signalHistory.get(signal.symbol)!
    history.push(signal)
    
    // Keep only recent signals
    const cutoff = Date.now() - (24 * 60 * 60 * 1000) // 24 hours
    this.signalHistory.set(
      signal.symbol,
      history.filter(s => s.createdAt > cutoff)
    )
  }

  private getRecentSignals(symbol: string, window: number): TradingSignal[] {
    const history = this.signalHistory.get(symbol) || []
    const cutoff = Date.now() - window
    return history.filter(s => s.createdAt > cutoff)
  }

  private generateSignalId(): string {
    return `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Public methods for signal analysis
  getSignalHistory(symbol: string, hours: number = 24): TradingSignal[] {
    const history = this.signalHistory.get(symbol) || []
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    return history.filter(s => s.createdAt > cutoff)
  }

  getActiveSignals(): TradingSignal[] {
    const now = Date.now()
    const activeSignals: TradingSignal[] = []
    
    for (const [_, signals] of this.signalHistory) {
      activeSignals.push(...signals.filter(s => s.expiresAt > now))
    }
    
    return this.prioritizeSignals(activeSignals)
  }
}

// Export singleton instance
export const signalGenerator = new SignalGenerator()