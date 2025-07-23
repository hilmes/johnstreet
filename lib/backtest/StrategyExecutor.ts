import { GeneratedStrategy } from '@/lib/anthropic/client'

export interface BacktestResult {
  strategy: string
  symbol: string
  timeframe: string
  startDate: Date
  endDate: Date
  initialBalance: number
  finalBalance: number
  totalReturn: number
  totalReturnPercent: number
  sharpeRatio: number
  maxDrawdown: number
  maxDrawdownPercent: number
  winRate: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  trades: Trade[]
  equityCurve: EquityPoint[]
  metrics: {
    annualizedReturn: number
    volatility: number
    calmarRatio: number
    sortinoRatio: number
  }
}

export interface Trade {
  id: string
  entryTime: Date
  exitTime: Date
  entryPrice: number
  exitPrice: number
  quantity: number
  side: 'buy' | 'sell'
  profit: number
  profitPercent: number
  commission: number
  exitReason: string
}

export interface EquityPoint {
  timestamp: Date
  equity: number
  drawdown: number
  position: number
}

export interface OHLCV {
  timestamp: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export class StrategyExecutor {
  private strategy: GeneratedStrategy
  private data: OHLCV[]
  private balance: number
  private position: number = 0
  private trades: Trade[] = []
  private equityCurve: EquityPoint[] = []
  private entryPrice: number = 0
  private entryTime: Date | null = null
  
  constructor(strategy: GeneratedStrategy, data: OHLCV[], initialBalance: number = 10000) {
    this.strategy = strategy
    this.data = data
    this.balance = initialBalance
  }

  async runBacktest(): Promise<BacktestResult> {
    // Initialize indicators based on strategy requirements
    const indicators = await this.initializeIndicators()
    
    // Process each candle
    for (let i = 0; i < this.data.length; i++) {
      const candle = this.data[i]
      const previousCandles = this.data.slice(Math.max(0, i - 100), i)
      
      // Update indicators
      const indicatorValues = this.calculateIndicators(previousCandles, candle, indicators)
      
      // Execute strategy logic
      const signal = await this.evaluateStrategy(candle, indicatorValues, previousCandles)
      
      // Process signal
      if (signal) {
        this.processSignal(signal, candle)
      }
      
      // Update equity curve
      const currentEquity = this.calculateEquity(candle.close)
      const drawdown = this.calculateDrawdown(currentEquity)
      this.equityCurve.push({
        timestamp: candle.timestamp,
        equity: currentEquity,
        drawdown,
        position: this.position
      })
    }
    
    // Close any open positions
    if (this.position !== 0) {
      this.closePosition(this.data[this.data.length - 1], 'End of backtest')
    }
    
    // Calculate final metrics
    return this.calculateResults()
  }

  private async initializeIndicators(): Promise<any> {
    // Parse strategy code to extract indicator configurations
    const indicators: any = {}
    
    if (this.strategy.requiredIndicators.includes('SMA')) {
      indicators.sma = { period: 20 }
    }
    if (this.strategy.requiredIndicators.includes('EMA')) {
      indicators.ema = { period: 12 }
    }
    if (this.strategy.requiredIndicators.includes('RSI')) {
      indicators.rsi = { period: 14 }
    }
    if (this.strategy.requiredIndicators.includes('MACD')) {
      indicators.macd = { fast: 12, slow: 26, signal: 9 }
    }
    
    return indicators
  }

  private calculateIndicators(previousCandles: OHLCV[], currentCandle: OHLCV, indicators: any): any {
    const values: any = {}
    const closes = [...previousCandles.map(c => c.close), currentCandle.close]
    
    // Simple Moving Average
    if (indicators.sma) {
      const period = indicators.sma.period
      if (closes.length >= period) {
        const sum = closes.slice(-period).reduce((a, b) => a + b, 0)
        values.sma = sum / period
      }
    }
    
    // Exponential Moving Average
    if (indicators.ema) {
      const period = indicators.ema.period
      if (closes.length >= period) {
        const multiplier = 2 / (period + 1)
        let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
        for (let i = period; i < closes.length; i++) {
          ema = (closes[i] - ema) * multiplier + ema
        }
        values.ema = ema
      }
    }
    
    // RSI
    if (indicators.rsi) {
      const period = indicators.rsi.period
      if (closes.length > period) {
        const gains = []
        const losses = []
        for (let i = 1; i < closes.length; i++) {
          const diff = closes[i] - closes[i - 1]
          gains.push(diff > 0 ? diff : 0)
          losses.push(diff < 0 ? -diff : 0)
        }
        const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period
        const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
        values.rsi = 100 - (100 / (1 + rs))
      }
    }
    
    // MACD
    if (indicators.macd) {
      const { fast, slow, signal } = indicators.macd
      if (closes.length >= slow) {
        const emaFast = this.calculateEMA(closes, fast)
        const emaSlow = this.calculateEMA(closes, slow)
        const macdLine = emaFast - emaSlow
        const signalLine = this.calculateEMA([macdLine], signal)
        values.macd = {
          macd: macdLine,
          signal: signalLine,
          histogram: macdLine - signalLine
        }
      }
    }
    
    return values
  }

  private calculateEMA(data: number[], period: number): number {
    const multiplier = 2 / (period + 1)
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema
    }
    return ema
  }

  private async evaluateStrategy(candle: OHLCV, indicators: any, history: OHLCV[]): Promise<any> {
    // This is a simplified strategy evaluator
    // In production, you'd parse and execute the actual strategy code
    
    const params = this.strategy.parameters
    const stopLoss = params.stopLoss || 0.02
    const takeProfit = params.takeProfit || 0.05
    
    // Example momentum strategy logic
    if (this.strategy.name.toLowerCase().includes('momentum')) {
      if (indicators.rsi && indicators.sma) {
        if (this.position === 0) {
          // Entry conditions
          if (indicators.rsi > 50 && candle.close > indicators.sma) {
            return { action: 'buy', quantity: 0.1 }
          }
        } else if (this.position > 0) {
          // Exit conditions
          const profitPercent = (candle.close - this.entryPrice) / this.entryPrice
          if (profitPercent >= takeProfit || profitPercent <= -stopLoss || indicators.rsi < 30) {
            return { action: 'sell', quantity: this.position }
          }
        }
      }
    }
    
    // Example mean reversion strategy
    if (this.strategy.name.toLowerCase().includes('reversion')) {
      if (indicators.rsi && indicators.ema) {
        if (this.position === 0) {
          // Entry on oversold
          if (indicators.rsi < 30 && candle.close < indicators.ema * 0.98) {
            return { action: 'buy', quantity: 0.1 }
          }
        } else if (this.position > 0) {
          // Exit on mean reversion
          const profitPercent = (candle.close - this.entryPrice) / this.entryPrice
          if (candle.close > indicators.ema || profitPercent >= takeProfit || profitPercent <= -stopLoss) {
            return { action: 'sell', quantity: this.position }
          }
        }
      }
    }
    
    return null
  }

  private processSignal(signal: any, candle: OHLCV): void {
    const commission = 0.001 // 0.1% commission
    
    if (signal.action === 'buy' && this.position === 0) {
      const cost = candle.close * signal.quantity * this.balance
      const commissionAmount = cost * commission
      if (cost + commissionAmount <= this.balance) {
        this.position = signal.quantity * this.balance / candle.close
        this.entryPrice = candle.close
        this.entryTime = candle.timestamp
        this.balance -= commissionAmount
      }
    } else if (signal.action === 'sell' && this.position > 0) {
      this.closePosition(candle, signal.reason || 'Signal')
    }
  }

  private closePosition(candle: OHLCV, reason: string): void {
    if (this.position === 0 || !this.entryTime) return
    
    const commission = 0.001
    const value = this.position * candle.close
    const commissionAmount = value * commission
    const profit = value - (this.position * this.entryPrice) - commissionAmount
    const profitPercent = profit / (this.position * this.entryPrice)
    
    this.trades.push({
      id: `trade_${this.trades.length + 1}`,
      entryTime: this.entryTime,
      exitTime: candle.timestamp,
      entryPrice: this.entryPrice,
      exitPrice: candle.close,
      quantity: this.position,
      side: 'buy',
      profit,
      profitPercent,
      commission: commissionAmount,
      exitReason: reason
    })
    
    this.balance += value - commissionAmount
    this.position = 0
    this.entryPrice = 0
    this.entryTime = null
  }

  private calculateEquity(currentPrice: number): number {
    const positionValue = this.position * currentPrice
    return this.balance + positionValue
  }

  private calculateDrawdown(currentEquity: number): number {
    const maxEquity = Math.max(...this.equityCurve.map(p => p.equity), currentEquity)
    return (maxEquity - currentEquity) / maxEquity
  }

  private calculateResults(): BacktestResult {
    const initialBalance = 10000
    const finalBalance = this.balance
    const totalReturn = finalBalance - initialBalance
    const totalReturnPercent = totalReturn / initialBalance
    
    const winningTrades = this.trades.filter(t => t.profit > 0)
    const losingTrades = this.trades.filter(t => t.profit <= 0)
    const winRate = this.trades.length > 0 ? winningTrades.length / this.trades.length : 0
    
    const avgWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, t) => sum + t.profit, 0) / winningTrades.length : 0
    const avgLoss = losingTrades.length > 0 ? 
      Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0) / losingTrades.length) : 0
    
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0
    
    const maxDrawdown = Math.max(...this.equityCurve.map(p => p.drawdown), 0)
    
    // Calculate Sharpe ratio (simplified)
    const returns = []
    for (let i = 1; i < this.equityCurve.length; i++) {
      const dailyReturn = (this.equityCurve[i].equity - this.equityCurve[i - 1].equity) / this.equityCurve[i - 1].equity
      returns.push(dailyReturn)
    }
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
    const stdDev = Math.sqrt(returns.map(r => Math.pow(r - avgReturn, 2)).reduce((a, b) => a + b, 0) / returns.length)
    const sharpeRatio = stdDev > 0 ? (avgReturn * 252) / (stdDev * Math.sqrt(252)) : 0
    
    return {
      strategy: this.strategy.name,
      symbol: 'BTC/USD', // This should be passed from the UI
      timeframe: this.strategy.timeframe,
      startDate: this.data[0].timestamp,
      endDate: this.data[this.data.length - 1].timestamp,
      initialBalance,
      finalBalance,
      totalReturn,
      totalReturnPercent,
      sharpeRatio,
      maxDrawdown,
      maxDrawdownPercent: maxDrawdown,
      winRate,
      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      avgWin,
      avgLoss,
      profitFactor,
      trades: this.trades,
      equityCurve: this.equityCurve,
      metrics: {
        annualizedReturn: totalReturnPercent * (252 / this.data.length),
        volatility: stdDev * Math.sqrt(252),
        calmarRatio: maxDrawdown > 0 ? totalReturnPercent / maxDrawdown : 0,
        sortinoRatio: sharpeRatio * 1.2 // Simplified
      }
    }
  }
}