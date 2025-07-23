import { BaseStrategy, MarketData, Portfolio, Signal, Trade } from '../types'

export class BuyAndHoldStrategy extends BaseStrategy {
  private hasInitialPosition: boolean = false

  constructor(parameters: { symbol?: string } = {}) {
    super('Buy and Hold', parameters)
  }

  onBar(data: MarketData, portfolio: Portfolio): Signal[] {
    const signals: Signal[] = []

    // Only buy once at the beginning
    if (!this.hasInitialPosition && !portfolio.positions.has(data.symbol)) {
      signals.push({
        symbol: data.symbol,
        action: 'buy',
        targetWeight: 0.95, // Use 95% of capital
        strategyId: this.name
      })
      this.hasInitialPosition = true
    }

    return signals
  }
}

export class SimpleMovingAverageCrossover extends BaseStrategy {
  private priceHistory: Map<string, number[]> = new Map()
  private shortPeriod: number
  private longPeriod: number

  constructor(parameters: { shortPeriod?: number; longPeriod?: number } = {}) {
    super('SMA Crossover', parameters)
    this.shortPeriod = parameters.shortPeriod || 10
    this.longPeriod = parameters.longPeriod || 30
  }

  onBar(data: MarketData, portfolio: Portfolio): Signal[] {
    const signals: Signal[] = []
    const symbol = data.symbol

    // Update price history
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, [])
    }
    const prices = this.priceHistory.get(symbol)!
    prices.push(data.close)

    // Keep only necessary history
    const maxPeriod = Math.max(this.shortPeriod, this.longPeriod)
    if (prices.length > maxPeriod + 1) {
      prices.shift()
    }

    // Need enough data for calculation
    if (prices.length < this.longPeriod) {
      return signals
    }

    // Calculate moving averages
    const shortMA = this.calculateSMA(prices, this.shortPeriod)
    const longMA = this.calculateSMA(prices, this.longPeriod)
    const prevShortMA = this.calculateSMA(prices.slice(0, -1), this.shortPeriod)
    const prevLongMA = this.calculateSMA(prices.slice(0, -1), this.longPeriod)

    const position = portfolio.positions.get(symbol)
    const hasPosition = position && position.quantity > 0

    // Bullish crossover: short MA crosses above long MA
    if (prevShortMA <= prevLongMA && shortMA > longMA && !hasPosition) {
      signals.push({
        symbol,
        action: 'buy',
        targetWeight: 0.3,
        strategyId: this.name,
        confidence: Math.abs(shortMA - longMA) / longMA,
        reason: `Bullish crossover: SMA${this.shortPeriod} (${shortMA.toFixed(2)}) > SMA${this.longPeriod} (${longMA.toFixed(2)})`
      })
    }

    // Bearish crossover: short MA crosses below long MA
    if (prevShortMA >= prevLongMA && shortMA < longMA && hasPosition) {
      signals.push({
        symbol,
        action: 'sell',
        quantity: position.quantity,
        strategyId: this.name,
        confidence: Math.abs(shortMA - longMA) / longMA,
        reason: `Bearish crossover: SMA${this.shortPeriod} (${shortMA.toFixed(2)}) < SMA${this.longPeriod} (${longMA.toFixed(2)})`
      })
    }

    return signals
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0
    const slice = prices.slice(-period)
    return slice.reduce((sum, price) => sum + price, 0) / period
  }
}

export class RSIMeanReversionStrategy extends BaseStrategy {
  private priceHistory: Map<string, number[]> = new Map()
  private period: number
  private oversoldThreshold: number
  private overboughtThreshold: number

  constructor(parameters: { 
    period?: number, 
    oversoldThreshold?: number, 
    overboughtThreshold?: number 
  } = {}) {
    super('RSI Mean Reversion', parameters)
    this.period = parameters.period || 14
    this.oversoldThreshold = parameters.oversoldThreshold || 30
    this.overboughtThreshold = parameters.overboughtThreshold || 70
  }

  onBar(data: MarketData, portfolio: Portfolio): Signal[] {
    const signals: Signal[] = []
    const symbol = data.symbol

    // Update price history
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, [])
    }
    const prices = this.priceHistory.get(symbol)!
    prices.push(data.close)

    if (prices.length > this.period + 10) {
      prices.shift()
    }

    if (prices.length < this.period + 1) {
      return signals
    }

    const rsi = this.calculateRSI(prices, this.period)
    const position = portfolio.positions.get(symbol)
    const hasPosition = position && position.quantity > 0

    // Buy signal: RSI oversold
    if (rsi < this.oversoldThreshold && !hasPosition) {
      signals.push({
        symbol,
        action: 'buy',
        targetWeight: 0.2,
        strategyId: this.name,
        confidence: (this.oversoldThreshold - rsi) / this.oversoldThreshold,
        reason: `RSI oversold: ${rsi.toFixed(2)} < ${this.oversoldThreshold}`
      })
    }

    // Sell signal: RSI overbought
    if (rsi > this.overboughtThreshold && hasPosition) {
      signals.push({
        symbol,
        action: 'sell',
        quantity: position.quantity,
        strategyId: this.name,
        confidence: (rsi - this.overboughtThreshold) / (100 - this.overboughtThreshold),
        reason: `RSI overbought: ${rsi.toFixed(2)} > ${this.overboughtThreshold}`
      })
    }

    return signals
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50

    const gains: number[] = []
    const losses: number[] = []

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? Math.abs(change) : 0)
    }

    // Calculate initial average gain and loss
    let avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period
    let avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period

    // Wilder's smoothing for subsequent calculations
    if (gains.length > period) {
      for (let i = period; i < gains.length; i++) {
        avgGain = ((avgGain * (period - 1)) + gains[i]) / period
        avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period
      }
    }

    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }
}

export class MomentumStrategy extends BaseStrategy {
  private priceHistory: Map<string, number[]> = new Map()
  private lookbackPeriod: number
  private momentumThreshold: number

  constructor(parameters: { lookbackPeriod?: number, momentumThreshold?: number } = {}) {
    super('Momentum', parameters)
    this.lookbackPeriod = parameters.lookbackPeriod || 20
    this.momentumThreshold = parameters.momentumThreshold || 0.05 // 5% momentum threshold
  }

  onBar(data: MarketData, portfolio: Portfolio): Signal[] {
    const signals: Signal[] = []
    const symbol = data.symbol

    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, [])
    }
    const prices = this.priceHistory.get(symbol)!
    prices.push(data.close)

    if (prices.length > this.lookbackPeriod + 5) {
      prices.shift()
    }

    if (prices.length < this.lookbackPeriod) {
      return signals
    }

    // Calculate momentum
    const currentPrice = prices[prices.length - 1]
    const lookbackPrice = prices[prices.length - this.lookbackPeriod]
    const momentum = (currentPrice - lookbackPrice) / lookbackPrice

    const position = portfolio.positions.get(symbol)
    const hasPosition = position && position.quantity > 0

    // Strong positive momentum - buy
    if (momentum > this.momentumThreshold && !hasPosition) {
      signals.push({
        symbol,
        action: 'buy',
        targetWeight: Math.min(0.4, momentum * 2), // Scale position size with momentum
        strategyId: this.name,
        confidence: Math.min(1, momentum / this.momentumThreshold),
        reason: `Positive momentum: ${(momentum * 100).toFixed(2)}% over ${this.lookbackPeriod} periods`
      })
    }

    // Momentum reversal - sell
    if (momentum < -this.momentumThreshold / 2 && hasPosition) {
      signals.push({
        symbol,
        action: 'sell',
        quantity: position.quantity,
        strategyId: this.name,
        confidence: Math.min(1, Math.abs(momentum) / this.momentumThreshold),
        reason: `Momentum reversal: ${(momentum * 100).toFixed(2)}% over ${this.lookbackPeriod} periods`
      })
    }

    return signals
  }
}

export class BollingerBandsStrategy extends BaseStrategy {
  private priceHistory: Map<string, number[]> = new Map()
  private period: number
  private stdMultiplier: number

  constructor(parameters: { period?: number, stdMultiplier?: number } = {}) {
    super('Bollinger Bands', parameters)
    this.period = parameters.period || 20
    this.stdMultiplier = parameters.stdMultiplier || 2
  }

  onBar(data: MarketData, portfolio: Portfolio): Signal[] {
    const signals: Signal[] = []
    const symbol = data.symbol

    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, [])
    }
    const prices = this.priceHistory.get(symbol)!
    prices.push(data.close)

    if (prices.length > this.period + 5) {
      prices.shift()
    }

    if (prices.length < this.period) {
      return signals
    }

    const { upperBand, lowerBand, middleBand } = this.calculateBollingerBands(prices, this.period, this.stdMultiplier)
    const currentPrice = data.close
    const position = portfolio.positions.get(symbol)
    const hasPosition = position && position.quantity > 0

    // Price touches lower band - oversold, buy signal
    if (currentPrice <= lowerBand && !hasPosition) {
      const distanceFromBand = (lowerBand - currentPrice) / middleBand
      signals.push({
        symbol,
        action: 'buy',
        targetWeight: Math.min(0.3, distanceFromBand * 5),
        strategyId: this.name,
        confidence: distanceFromBand,
        reason: `Price below lower Bollinger Band: ${currentPrice.toFixed(2)} <= ${lowerBand.toFixed(2)}`
      })
    }

    // Price touches upper band - overbought, sell signal
    if (currentPrice >= upperBand && hasPosition) {
      signals.push({
        symbol,
        action: 'sell',
        quantity: position.quantity,
        strategyId: this.name,
        confidence: (currentPrice - upperBand) / middleBand,
        reason: `Price above upper Bollinger Band: ${currentPrice.toFixed(2)} >= ${upperBand.toFixed(2)}`
      })
    }

    // Mean reversion to middle band
    if (hasPosition && Math.abs(currentPrice - middleBand) / middleBand < 0.01) {
      signals.push({
        symbol,
        action: 'sell',
        quantity: Math.floor(position.quantity * 0.5), // Partial profit taking
        strategyId: this.name,
        confidence: 0.5,
        reason: `Price near middle band - partial profit taking`
      })
    }

    return signals
  }

  private calculateBollingerBands(prices: number[], period: number, stdMultiplier: number) {
    const recentPrices = prices.slice(-period)
    const middleBand = recentPrices.reduce((sum, price) => sum + price, 0) / period
    
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - middleBand, 2), 0) / period
    const standardDeviation = Math.sqrt(variance)
    
    const upperBand = middleBand + (standardDeviation * stdMultiplier)
    const lowerBand = middleBand - (standardDeviation * stdMultiplier)
    
    return { upperBand, lowerBand, middleBand }
  }
}

export class MultiFactorStrategy extends BaseStrategy {
  private priceHistory: Map<string, number[]> = new Map()
  private volumeHistory: Map<string, number[]> = new Map()
  private strategies: BaseStrategy[]

  constructor(parameters: Record<string, any> = {}) {
    super('Multi-Factor', parameters)
    
    // Combine multiple strategies
    this.strategies = [
      new SimpleMovingAverageCrossover({ shortPeriod: 10, longPeriod: 30 }),
      new RSIMeanReversionStrategy({ period: 14, oversoldThreshold: 25, overboughtThreshold: 75 }),
      new MomentumStrategy({ lookbackPeriod: 20, momentumThreshold: 0.03 })
    ]
  }

  onBar(data: MarketData, portfolio: Portfolio): Signal[] {
    // Get signals from all strategies
    const allSignals: Signal[] = []
    
    for (const strategy of this.strategies) {
      const signals = strategy.onBar(data, portfolio)
      allSignals.push(...signals)
    }

    // Combine signals using voting system
    const combinedSignals = this.combineSignals(allSignals, data.symbol)
    
    return combinedSignals
  }

  private combineSignals(signals: Signal[], symbol: string): Signal[] {
    if (signals.length === 0) return []

    const buySignals = signals.filter(s => s.action === 'buy')
    const sellSignals = signals.filter(s => s.action === 'sell')

    const combinedSignals: Signal[] = []

    // Buy consensus (at least 2 strategies agree)
    if (buySignals.length >= 2) {
      const avgConfidence = buySignals.reduce((sum, s) => sum + (s.confidence || 0.5), 0) / buySignals.length
      const avgWeight = buySignals.reduce((sum, s) => sum + (s.targetWeight || 0.1), 0) / buySignals.length
      
      combinedSignals.push({
        symbol,
        action: 'buy',
        targetWeight: Math.min(avgWeight, 0.25), // Cap at 25%
        strategyId: this.name,
        confidence: avgConfidence,
        reason: `Multi-factor buy: ${buySignals.length} strategies agree`
      })
    }

    // Sell consensus (at least 2 strategies agree or any strategy with high confidence)
    if (sellSignals.length >= 2 || sellSignals.some(s => (s.confidence || 0) > 0.8)) {
      const maxQuantity = Math.max(...sellSignals.map(s => s.quantity || 0))
      const avgConfidence = sellSignals.reduce((sum, s) => sum + (s.confidence || 0.5), 0) / sellSignals.length
      
      combinedSignals.push({
        symbol,
        action: 'sell',
        quantity: maxQuantity,
        strategyId: this.name,
        confidence: avgConfidence,
        reason: `Multi-factor sell: ${sellSignals.length} strategies agree`
      })
    }

    return combinedSignals
  }

  initialize(symbols: string[]): void {
    // Initialize all sub-strategies
    for (const strategy of this.strategies) {
      if (strategy.initialize) {
        strategy.initialize(symbols)
      }
    }
  }

  onTrade(trade: Trade, portfolio: Portfolio): void {
    // Notify all sub-strategies
    for (const strategy of this.strategies) {
      if (strategy.onTrade) {
        strategy.onTrade(trade, portfolio)
      }
    }
  }
}