import { MarketData, MarketSimulator } from './types'

export class HistoricalDataSimulator implements MarketSimulator {
  private data: MarketData[]
  private currentIndex: number = 0
  private symbols: string[]

  constructor(data: MarketData[]) {
    this.data = data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    this.symbols = [...new Set(data.map(d => d.symbol))]
    this.currentIndex = 0
  }

  getNextBar(): MarketData | null {
    if (this.currentIndex >= this.data.length) {
      return null
    }
    return this.data[this.currentIndex++]
  }

  hasMoreData(): boolean {
    return this.currentIndex < this.data.length
  }

  getCurrentTimestamp(): Date {
    if (this.currentIndex === 0) return this.data[0].timestamp
    if (this.currentIndex >= this.data.length) return this.data[this.data.length - 1].timestamp
    return this.data[this.currentIndex - 1].timestamp
  }

  getSymbols(): string[] {
    return [...this.symbols]
  }

  reset(): void {
    this.currentIndex = 0
  }

  // Get data for specific time range
  getDataInRange(startDate: Date, endDate: Date, symbols?: string[]): MarketData[] {
    return this.data.filter(d => 
      d.timestamp >= startDate && 
      d.timestamp <= endDate &&
      (!symbols || symbols.includes(d.symbol))
    )
  }
}

export class SyntheticDataGenerator {
  /**
   * Generate synthetic market data for backtesting
   */
  static generateOHLCData(
    symbol: string,
    startDate: Date,
    endDate: Date,
    intervalMinutes: number = 1,
    initialPrice: number = 100,
    volatility: number = 0.02,
    trend: number = 0.0001,
    volumeBase: number = 1000000
  ): MarketData[] {
    const data: MarketData[] = []
    const msPerInterval = intervalMinutes * 60 * 1000
    let currentTime = new Date(startDate)
    let lastPrice = initialPrice

    while (currentTime <= endDate) {
      // Generate random price movement using geometric Brownian motion
      const dt = intervalMinutes / (60 * 24 * 365) // time step in years
      const randomShock = this.normalRandom() * Math.sqrt(dt)
      const priceChange = trend * dt + volatility * randomShock
      
      const newPrice = lastPrice * Math.exp(priceChange)
      
      // Generate OHLC from the price movement
      const open = lastPrice
      const close = newPrice
      
      // Generate high and low with some randomness
      const maxPrice = Math.max(open, close)
      const minPrice = Math.min(open, close)
      const range = Math.abs(close - open)
      
      const high = maxPrice + (Math.random() * range * 0.5)
      const low = minPrice - (Math.random() * range * 0.5)
      
      // Generate volume with some correlation to price movement
      const priceMovement = Math.abs((close - open) / open)
      const volumeMultiplier = 1 + (priceMovement * 2) + (Math.random() - 0.5) * 0.5
      const volume = Math.max(0, Math.round(volumeBase * volumeMultiplier))
      
      // Calculate VWAP (simplified)
      const vwap = (high + low + close) / 3

      data.push({
        timestamp: new Date(currentTime),
        symbol,
        open,
        high,
        low,
        close,
        volume,
        vwap
      })

      lastPrice = close
      currentTime = new Date(currentTime.getTime() + msPerInterval)
    }

    return data
  }

  /**
   * Generate correlated multi-asset data
   */
  static generateCorrelatedData(
    symbols: string[],
    startDate: Date,
    endDate: Date,
    correlationMatrix: number[][],
    baseParams: {
      initialPrices: number[]
      volatilities: number[]
      trends: number[]
    },
    intervalMinutes: number = 1
  ): MarketData[] {
    if (symbols.length !== correlationMatrix.length ||
        symbols.length !== baseParams.initialPrices.length) {
      throw new Error('Dimension mismatch in parameters')
    }

    const allData: MarketData[] = []
    const msPerInterval = intervalMinutes * 60 * 1000
    let currentTime = new Date(startDate)
    const lastPrices = [...baseParams.initialPrices]

    while (currentTime <= endDate) {
      const dt = intervalMinutes / (60 * 24 * 365)
      
      // Generate correlated random shocks
      const independentShocks = symbols.map(() => this.normalRandom())
      const correlatedShocks = this.applyCorrelation(independentShocks, correlationMatrix)

      for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i]
        const volatility = baseParams.volatilities[i]
        const trend = baseParams.trends[i]
        const shock = correlatedShocks[i] * Math.sqrt(dt)
        
        const priceChange = trend * dt + volatility * shock
        const newPrice = lastPrices[i] * Math.exp(priceChange)
        
        const open = lastPrices[i]
        const close = newPrice
        const maxPrice = Math.max(open, close)
        const minPrice = Math.min(open, close)
        const range = Math.abs(close - open)
        
        const high = maxPrice + (Math.random() * range * 0.3)
        const low = minPrice - (Math.random() * range * 0.3)
        const volume = Math.max(0, Math.round(1000000 * (1 + Math.random())))
        const vwap = (high + low + close) / 3

        allData.push({
          timestamp: new Date(currentTime),
          symbol,
          open,
          high,
          low,
          close,
          volume,
          vwap
        })

        lastPrices[i] = close
      }

      currentTime = new Date(currentTime.getTime() + msPerInterval)
    }

    return allData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }

  /**
   * Generate market crash scenario
   */
  static generateCrashScenario(
    symbol: string,
    normalStartDate: Date,
    crashStartDate: Date,
    crashEndDate: Date,
    recoveryEndDate: Date,
    crashSeverity: number = 0.3,
    intervalMinutes: number = 1
  ): MarketData[] {
    const data: MarketData[] = []
    
    // Normal market phase
    const normalData = this.generateOHLCData(
      symbol, normalStartDate, crashStartDate, intervalMinutes, 100, 0.015, 0.0002
    )
    data.push(...normalData)
    
    const preCrashPrice = normalData[normalData.length - 1].close
    
    // Crash phase - high volatility, negative trend
    const crashData = this.generateOHLCData(
      symbol, crashStartDate, crashEndDate, intervalMinutes, 
      preCrashPrice, 0.08, -0.02, 2000000
    )
    data.push(...crashData)
    
    const postCrashPrice = crashData[crashData.length - 1].close
    
    // Recovery phase - moderate volatility, positive trend
    const recoveryData = this.generateOHLCData(
      symbol, crashEndDate, recoveryEndDate, intervalMinutes,
      postCrashPrice, 0.04, 0.001, 1500000
    )
    data.push(...recoveryData)
    
    return data
  }

  private static normalRandom(): number {
    // Box-Muller transformation for normal distribution
    let u = 0, v = 0
    while(u === 0) u = Math.random() // Converting [0,1) to (0,1)
    while(v === 0) v = Math.random()
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  }

  private static applyCorrelation(
    independentShocks: number[],
    correlationMatrix: number[][]
  ): number[] {
    // Cholesky decomposition for correlation
    const n = independentShocks.length
    const L = this.choleskyDecomposition(correlationMatrix)
    const correlatedShocks = new Array(n).fill(0)
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        correlatedShocks[i] += L[i][j] * independentShocks[j]
      }
    }
    
    return correlatedShocks
  }

  private static choleskyDecomposition(matrix: number[][]): number[][] {
    const n = matrix.length
    const L = Array(n).fill(null).map(() => Array(n).fill(0))
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        if (i === j) {
          let sum = 0
          for (let k = 0; k < j; k++) {
            sum += L[i][k] * L[i][k]
          }
          L[i][j] = Math.sqrt(matrix[i][i] - sum)
        } else {
          let sum = 0
          for (let k = 0; k < j; k++) {
            sum += L[i][k] * L[j][k]
          }
          L[i][j] = (matrix[i][j] - sum) / L[j][j]
        }
      }
    }
    
    return L
  }
}

export class LiveDataSimulator implements MarketSimulator {
  private realtimeData: MarketData[] = []
  private currentIndex: number = 0
  private symbols: string[]
  private intervalMs: number
  private isRunning: boolean = false
  private dataGenerator: () => MarketData[]

  constructor(
    symbols: string[],
    intervalMs: number = 1000,
    dataGenerator?: () => MarketData[]
  ) {
    this.symbols = symbols
    this.intervalMs = intervalMs
    this.dataGenerator = dataGenerator || this.defaultDataGenerator.bind(this)
  }

  private defaultDataGenerator(): MarketData[] {
    const now = new Date()
    return this.symbols.map(symbol => ({
      timestamp: now,
      symbol,
      open: 100 + Math.random() * 10,
      high: 105 + Math.random() * 10,
      low: 95 + Math.random() * 10,
      close: 100 + Math.random() * 10,
      volume: Math.round(1000000 * (0.5 + Math.random())),
      vwap: 100 + Math.random() * 10
    }))
  }

  start(): void {
    this.isRunning = true
    this.generateData()
  }

  stop(): void {
    this.isRunning = false
  }

  private generateData(): void {
    if (!this.isRunning) return
    
    const newData = this.dataGenerator()
    this.realtimeData.push(...newData)
    
    setTimeout(() => this.generateData(), this.intervalMs)
  }

  getNextBar(): MarketData | null {
    if (this.currentIndex >= this.realtimeData.length) {
      return null
    }
    return this.realtimeData[this.currentIndex++]
  }

  hasMoreData(): boolean {
    return this.isRunning || this.currentIndex < this.realtimeData.length
  }

  getCurrentTimestamp(): Date {
    return new Date()
  }

  getSymbols(): string[] {
    return [...this.symbols]
  }

  reset(): void {
    this.currentIndex = 0
    this.realtimeData = []
  }
}