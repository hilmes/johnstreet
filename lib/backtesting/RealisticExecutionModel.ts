import { ExecutionModel, Signal, MarketData, Portfolio, Trade, BacktestConfig } from './types'
import { v4 as uuidv4 } from 'uuid'

export class RealisticExecutionModel implements ExecutionModel {
  private config: BacktestConfig
  private orderBook: Map<string, OrderBookLevel[]> = new Map()

  constructor(config: BacktestConfig) {
    this.config = config
  }

  executeSignal(signal: Signal, marketData: MarketData, portfolio: Portfolio): Trade | null {
    if (signal.action === 'hold') return null

    // Calculate execution price with slippage
    const basePrice = signal.price || marketData.close
    const slippage = this.calculateSlippage(signal, marketData)
    const executionPrice = signal.action === 'buy' 
      ? basePrice + slippage 
      : basePrice - slippage

    // Calculate quantity
    let quantity = this.calculateQuantity(signal, marketData, portfolio, executionPrice)
    if (quantity <= 0) return null

    // Apply market impact based on volume
    const marketImpact = this.calculateMarketImpact(quantity, marketData)
    const finalPrice = signal.action === 'buy'
      ? executionPrice + marketImpact
      : executionPrice - marketImpact

    // Calculate commission
    const trade: Trade = {
      id: uuidv4(),
      timestamp: new Date(marketData.timestamp),
      symbol: signal.symbol,
      side: signal.action,
      quantity,
      price: finalPrice,
      commission: 0,
      slippage: slippage + marketImpact,
      strategyId: signal.strategyId
    }

    trade.commission = this.calculateCommission(trade)

    return trade
  }

  calculateSlippage(signal: Signal, marketData: MarketData): number {
    // Base slippage from config
    let slippage = this.config.slippage || 0.001

    // Adjust slippage based on market conditions
    const spread = (marketData.high - marketData.low) / marketData.close
    const volatility = this.calculateVolatility(marketData)
    
    // Higher slippage during high volatility and wide spreads
    slippage *= (1 + spread * 10 + volatility * 5)

    // Add time-of-day effects (simplified)
    const hour = marketData.timestamp.getHours()
    if (hour < 10 || hour > 15) { // Market open/close times
      slippage *= 1.5 // Higher slippage during volatile periods
    }

    return slippage * marketData.close
  }

  calculateCommission(trade: Trade): number {
    const baseCommission = this.config.commission || 0.001
    
    // Different commission structures
    const fixedCommission = 1.0 // $1 per trade
    const percentageCommission = trade.quantity * trade.price * baseCommission
    const perShareCommission = trade.quantity * 0.005 // $0.005 per share

    // Use the maximum of fixed and percentage-based commission
    return Math.max(fixedCommission, Math.min(percentageCommission, perShareCommission))
  }

  private calculateQuantity(
    signal: Signal, 
    marketData: MarketData, 
    portfolio: Portfolio, 
    price: number
  ): number {
    if (signal.quantity) {
      return signal.quantity
    }

    if (signal.targetWeight) {
      // Calculate quantity based on target portfolio weight
      const targetValue = portfolio.totalValue * signal.targetWeight
      return Math.floor(targetValue / price)
    }

    // Default: use 10% of available cash for buys
    if (signal.action === 'buy') {
      const availableCash = portfolio.cash * 0.1
      return Math.floor(availableCash / price)
    }

    // For sells, use current position
    const position = portfolio.positions.get(signal.symbol)
    return position ? position.quantity : 0
  }

  private calculateMarketImpact(quantity: number, marketData: MarketData): number {
    // Simplified market impact model
    const volumeRatio = quantity / (marketData.volume / 100) // Assume we're trading against 1% of daily volume
    const impactFactor = Math.sqrt(volumeRatio) * 0.001 // Square root impact law
    
    return impactFactor * marketData.close
  }

  private calculateVolatility(marketData: MarketData): number {
    // Simple volatility proxy using high-low range
    return (marketData.high - marketData.low) / marketData.close
  }
}

interface OrderBookLevel {
  price: number
  quantity: number
  side: 'bid' | 'ask'
}

export class AdvancedExecutionModel implements ExecutionModel {
  private config: BacktestConfig
  private priceHistory: Map<string, number[]> = new Map()
  private volumeHistory: Map<string, number[]> = new Map()
  private maxHistoryLength: number = 20

  constructor(config: BacktestConfig) {
    this.config = config
  }

  executeSignal(signal: Signal, marketData: MarketData, portfolio: Portfolio): Trade | null {
    if (signal.action === 'hold') return null

    // Update price and volume history
    this.updateHistory(marketData)

    // Check for partial fills based on market liquidity
    const maxQuantity = this.calculateMaxQuantity(signal, marketData)
    let quantity = Math.min(
      this.calculateQuantity(signal, marketData, portfolio),
      maxQuantity
    )

    if (quantity <= 0) return null

    // Implement TWAP execution for large orders
    if (this.isLargeOrder(quantity, marketData)) {
      return this.executeTWAP(signal, marketData, portfolio, quantity)
    }

    // Regular execution with sophisticated slippage model
    const executionPrice = this.calculateExecutionPrice(signal, marketData, quantity)
    
    const trade: Trade = {
      id: uuidv4(),
      timestamp: new Date(marketData.timestamp),
      symbol: signal.symbol,
      side: signal.action,
      quantity,
      price: executionPrice,
      commission: 0,
      slippage: Math.abs(executionPrice - marketData.close),
      strategyId: signal.strategyId
    }

    trade.commission = this.calculateCommission(trade)
    return trade
  }

  private updateHistory(marketData: MarketData): void {
    const symbol = marketData.symbol
    
    // Update price history
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, [])
    }
    const prices = this.priceHistory.get(symbol)!
    prices.push(marketData.close)
    if (prices.length > this.maxHistoryLength) {
      prices.shift()
    }

    // Update volume history
    if (!this.volumeHistory.has(symbol)) {
      this.volumeHistory.set(symbol, [])
    }
    const volumes = this.volumeHistory.get(symbol)!
    volumes.push(marketData.volume)
    if (volumes.length > this.maxHistoryLength) {
      volumes.shift()
    }
  }

  private calculateMaxQuantity(signal: Signal, marketData: MarketData): number {
    // Don't allow trades larger than 10% of average daily volume
    const volumes = this.volumeHistory.get(marketData.symbol) || []
    if (volumes.length === 0) return marketData.volume * 0.1

    const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
    return Math.floor(avgVolume * 0.1)
  }

  private isLargeOrder(quantity: number, marketData: MarketData): boolean {
    const volumes = this.volumeHistory.get(marketData.symbol) || [marketData.volume]
    const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
    return quantity > avgVolume * 0.05 // More than 5% of average volume
  }

  private executeTWAP(
    signal: Signal, 
    marketData: MarketData, 
    portfolio: Portfolio, 
    totalQuantity: number
  ): Trade {
    // Simplified TWAP - in reality this would be split across multiple time periods
    const slices = Math.min(10, Math.floor(totalQuantity / 100))
    const sliceSize = Math.floor(totalQuantity / slices)
    
    // Execute first slice immediately
    const executionPrice = this.calculateExecutionPrice(signal, marketData, sliceSize)
    
    const trade: Trade = {
      id: uuidv4(),
      timestamp: new Date(marketData.timestamp),
      symbol: signal.symbol,
      side: signal.action,
      quantity: sliceSize,
      price: executionPrice,
      commission: 0,
      slippage: Math.abs(executionPrice - marketData.close),
      strategyId: signal.strategyId
    }

    trade.commission = this.calculateCommission(trade)
    return trade
  }

  private calculateExecutionPrice(signal: Signal, marketData: MarketData, quantity: number): number {
    const basePrice = signal.price || marketData.close
    
    // Calculate historical volatility
    const prices = this.priceHistory.get(marketData.symbol) || []
    const volatility = this.calculateHistoricalVolatility(prices)
    
    // Calculate volume-weighted slippage
    const volumeRatio = quantity / marketData.volume
    const baseSlippage = (this.config.slippage || 0.001) * basePrice
    
    // Slippage increases with volatility and volume ratio
    const volatilityMultiplier = 1 + volatility * 2
    const volumeMultiplier = 1 + Math.sqrt(volumeRatio) * 0.5
    
    const totalSlippage = baseSlippage * volatilityMultiplier * volumeMultiplier
    
    return signal.action === 'buy' 
      ? basePrice + totalSlippage 
      : basePrice - totalSlippage
  }

  private calculateHistoricalVolatility(prices: number[]): number {
    if (prices.length < 2) return 0.02 // Default volatility

    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]))
    }

    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length
    
    return Math.sqrt(variance * 252) // Annualized volatility
  }

  private calculateQuantity(signal: Signal, marketData: MarketData, portfolio: Portfolio): number {
    if (signal.quantity) return signal.quantity

    if (signal.targetWeight) {
      const targetValue = portfolio.totalValue * signal.targetWeight
      return Math.floor(targetValue / marketData.close)
    }

    if (signal.action === 'buy') {
      const availableCash = portfolio.cash * 0.1
      return Math.floor(availableCash / marketData.close)
    }

    const position = portfolio.positions.get(signal.symbol)
    return position ? position.quantity : 0
  }

  calculateSlippage(signal: Signal, marketData: MarketData): number {
    // This is now handled in calculateExecutionPrice
    return 0
  }

  calculateCommission(trade: Trade): number {
    const baseCommission = this.config.commission || 0.001
    const fixedCommission = 1.0
    const percentageCommission = trade.quantity * trade.price * baseCommission
    
    return Math.max(fixedCommission, percentageCommission)
  }
}