import { PerformanceMetrics, Trade, BacktestConfig } from './types'

export class PerformanceAnalyzer {
  calculateMetrics(
    equityCurve: Array<{ timestamp: Date; value: number; drawdown: number }>,
    trades: Trade[],
    config: BacktestConfig
  ): PerformanceMetrics {
    if (equityCurve.length === 0) {
      return this.getEmptyMetrics()
    }

    const returns = this.calculateReturns(equityCurve)
    const tradePnLs = this.calculateTradePnLs(trades)
    
    return {
      totalReturn: this.calculateTotalReturn(equityCurve, config.initialCapital),
      annualizedReturn: this.calculateAnnualizedReturn(equityCurve, config),
      volatility: this.calculateVolatility(returns),
      sharpeRatio: this.calculateSharpeRatio(returns, config.riskFreeRate || 0.02),
      sortinoRatio: this.calculateSortinoRatio(returns, config.riskFreeRate || 0.02),
      maxDrawdown: this.calculateMaxDrawdown(equityCurve),
      calmarRatio: this.calculateCalmarRatio(equityCurve, config),
      winRate: this.calculateWinRate(tradePnLs),
      profitFactor: this.calculateProfitFactor(tradePnLs),
      totalTrades: trades.length,
      averageTradeReturn: this.calculateAverageTradeReturn(tradePnLs),
      averageWin: this.calculateAverageWin(tradePnLs),
      averageLoss: this.calculateAverageLoss(tradePnLs),
      largestWin: this.calculateLargestWin(tradePnLs),
      largestLoss: this.calculateLargestLoss(tradePnLs),
      consecutiveWins: this.calculateConsecutiveWins(tradePnLs),
      consecutiveLosses: this.calculateConsecutiveLosses(tradePnLs)
    }
  }

  calculateReturns(equityCurve: Array<{ timestamp: Date; value: number }>): number[] {
    const returns: number[] = []
    
    for (let i = 1; i < equityCurve.length; i++) {
      const currentValue = equityCurve[i].value
      const previousValue = equityCurve[i - 1].value
      const dailyReturn = (currentValue - previousValue) / previousValue
      returns.push(dailyReturn)
    }
    
    return returns
  }

  private calculateTradePnLs(trades: Trade[]): number[] {
    // Group trades by symbol to calculate P&L
    const positionTrades = new Map<string, Trade[]>()
    
    trades.forEach(trade => {
      if (!positionTrades.has(trade.symbol)) {
        positionTrades.set(trade.symbol, [])
      }
      positionTrades.get(trade.symbol)!.push(trade)
    })

    const tradePnLs: number[] = []
    
    positionTrades.forEach((symbolTrades) => {
      let position = 0
      let avgPrice = 0
      
      symbolTrades.forEach(trade => {
        if (trade.side === 'buy') {
          if (position <= 0) {
            // Opening new long position or covering short
            position += trade.quantity
            avgPrice = trade.price
          } else {
            // Adding to long position
            const totalCost = (position * avgPrice) + (trade.quantity * trade.price)
            position += trade.quantity
            avgPrice = totalCost / position
          }
        } else { // sell
          if (position > 0) {
            // Closing long position
            const quantity = Math.min(trade.quantity, position)
            const pnl = (trade.price - avgPrice) * quantity - trade.commission
            tradePnLs.push(pnl)
            position -= quantity
          } else {
            // Opening short position
            position -= trade.quantity
            avgPrice = trade.price
          }
        }
      })
    })
    
    return tradePnLs
  }

  private calculateTotalReturn(
    equityCurve: Array<{ value: number }>,
    initialCapital: number
  ): number {
    if (equityCurve.length === 0) return 0
    const finalValue = equityCurve[equityCurve.length - 1].value
    return (finalValue - initialCapital) / initialCapital
  }

  private calculateAnnualizedReturn(
    equityCurve: Array<{ timestamp: Date; value: number }>,
    config: BacktestConfig
  ): number {
    if (equityCurve.length === 0) return 0
    
    const totalReturn = this.calculateTotalReturn(equityCurve, config.initialCapital)
    const startDate = config.startDate
    const endDate = config.endDate
    const years = (endDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    
    return Math.pow(1 + totalReturn, 1 / years) - 1
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    
    // Annualized volatility (assuming daily returns)
    return Math.sqrt(variance * 252)
  }

  private calculateSharpeRatio(returns: number[], riskFreeRate: number): number {
    if (returns.length === 0) return 0
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const volatility = this.calculateVolatility(returns)
    
    if (volatility === 0) return 0
    
    // Convert annual risk-free rate to daily
    const dailyRiskFreeRate = Math.pow(1 + riskFreeRate, 1/252) - 1
    const excessReturn = avgReturn - dailyRiskFreeRate
    
    return (excessReturn * Math.sqrt(252)) / volatility
  }

  private calculateSortinoRatio(returns: number[], riskFreeRate: number): number {
    if (returns.length === 0) return 0
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const dailyRiskFreeRate = Math.pow(1 + riskFreeRate, 1/252) - 1
    
    // Calculate downside deviation
    const downsideReturns = returns.filter(ret => ret < dailyRiskFreeRate)
    if (downsideReturns.length === 0) return Infinity
    
    const downsideVariance = downsideReturns.reduce(
      (sum, ret) => sum + Math.pow(ret - dailyRiskFreeRate, 2), 0
    ) / returns.length
    
    const downsideDeviation = Math.sqrt(downsideVariance * 252)
    
    if (downsideDeviation === 0) return 0
    
    const excessReturn = avgReturn - dailyRiskFreeRate
    return (excessReturn * Math.sqrt(252)) / downsideDeviation
  }

  private calculateMaxDrawdown(equityCurve: Array<{ value: number }>): number {
    let maxDrawdown = 0
    let peak = equityCurve[0]?.value || 0
    
    for (const point of equityCurve) {
      if (point.value > peak) {
        peak = point.value
      }
      
      const drawdown = (peak - point.value) / peak
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    }
    
    return maxDrawdown
  }

  private calculateCalmarRatio(
    equityCurve: Array<{ timestamp: Date; value: number }>,
    config: BacktestConfig
  ): number {
    const annualizedReturn = this.calculateAnnualizedReturn(equityCurve, config)
    const maxDrawdown = this.calculateMaxDrawdown(equityCurve)
    
    return maxDrawdown === 0 ? 0 : annualizedReturn / maxDrawdown
  }

  private calculateWinRate(tradePnLs: number[]): number {
    if (tradePnLs.length === 0) return 0
    const wins = tradePnLs.filter(pnl => pnl > 0).length
    return wins / tradePnLs.length
  }

  private calculateProfitFactor(tradePnLs: number[]): number {
    const grossProfit = tradePnLs.filter(pnl => pnl > 0).reduce((sum, pnl) => sum + pnl, 0)
    const grossLoss = Math.abs(tradePnLs.filter(pnl => pnl < 0).reduce((sum, pnl) => sum + pnl, 0))
    
    return grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss
  }

  private calculateAverageTradeReturn(tradePnLs: number[]): number {
    if (tradePnLs.length === 0) return 0
    return tradePnLs.reduce((sum, pnl) => sum + pnl, 0) / tradePnLs.length
  }

  private calculateAverageWin(tradePnLs: number[]): number {
    const wins = tradePnLs.filter(pnl => pnl > 0)
    if (wins.length === 0) return 0
    return wins.reduce((sum, pnl) => sum + pnl, 0) / wins.length
  }

  private calculateAverageLoss(tradePnLs: number[]): number {
    const losses = tradePnLs.filter(pnl => pnl < 0)
    if (losses.length === 0) return 0
    return losses.reduce((sum, pnl) => sum + pnl, 0) / losses.length
  }

  private calculateLargestWin(tradePnLs: number[]): number {
    const wins = tradePnLs.filter(pnl => pnl > 0)
    return wins.length > 0 ? Math.max(...wins) : 0
  }

  private calculateLargestLoss(tradePnLs: number[]): number {
    const losses = tradePnLs.filter(pnl => pnl < 0)
    return losses.length > 0 ? Math.min(...losses) : 0
  }

  private calculateConsecutiveWins(tradePnLs: number[]): number {
    let maxConsecutive = 0
    let current = 0
    
    for (const pnl of tradePnLs) {
      if (pnl > 0) {
        current++
        maxConsecutive = Math.max(maxConsecutive, current)
      } else {
        current = 0
      }
    }
    
    return maxConsecutive
  }

  private calculateConsecutiveLosses(tradePnLs: number[]): number {
    let maxConsecutive = 0
    let current = 0
    
    for (const pnl of tradePnLs) {
      if (pnl < 0) {
        current++
        maxConsecutive = Math.max(maxConsecutive, current)
      } else {
        current = 0
      }
    }
    
    return maxConsecutive
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      calmarRatio: 0,
      winRate: 0,
      profitFactor: 0,
      totalTrades: 0,
      averageTradeReturn: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0
    }
  }

  // Advanced metrics
  calculateBeta(strategyReturns: number[], benchmarkReturns: number[]): number {
    if (strategyReturns.length !== benchmarkReturns.length || strategyReturns.length < 2) {
      return 0
    }

    const strategyMean = strategyReturns.reduce((sum, ret) => sum + ret, 0) / strategyReturns.length
    const benchmarkMean = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length

    let covariance = 0
    let benchmarkVariance = 0

    for (let i = 0; i < strategyReturns.length; i++) {
      const strategyDiff = strategyReturns[i] - strategyMean
      const benchmarkDiff = benchmarkReturns[i] - benchmarkMean
      
      covariance += strategyDiff * benchmarkDiff
      benchmarkVariance += benchmarkDiff * benchmarkDiff
    }

    covariance /= strategyReturns.length
    benchmarkVariance /= benchmarkReturns.length

    return benchmarkVariance === 0 ? 0 : covariance / benchmarkVariance
  }

  calculateAlpha(
    strategyReturns: number[], 
    benchmarkReturns: number[], 
    riskFreeRate: number
  ): number {
    const beta = this.calculateBeta(strategyReturns, benchmarkReturns)
    const strategyMean = strategyReturns.reduce((sum, ret) => sum + ret, 0) / strategyReturns.length
    const benchmarkMean = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length
    const dailyRiskFreeRate = Math.pow(1 + riskFreeRate, 1/252) - 1

    // Alpha = Strategy Return - (Risk-free Rate + Beta * (Benchmark Return - Risk-free Rate))
    return strategyMean - (dailyRiskFreeRate + beta * (benchmarkMean - dailyRiskFreeRate))
  }

  calculateInformationRatio(strategyReturns: number[], benchmarkReturns: number[]): number {
    if (strategyReturns.length !== benchmarkReturns.length || strategyReturns.length < 2) {
      return 0
    }

    const excessReturns = strategyReturns.map((ret, i) => ret - benchmarkReturns[i])
    const avgExcessReturn = excessReturns.reduce((sum, ret) => sum + ret, 0) / excessReturns.length
    
    const trackingError = Math.sqrt(
      excessReturns.reduce((sum, ret) => sum + Math.pow(ret - avgExcessReturn, 2), 0) / excessReturns.length
    )

    return trackingError === 0 ? 0 : avgExcessReturn / trackingError
  }
}