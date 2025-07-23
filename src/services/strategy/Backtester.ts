import { 
  StrategyConfig, 
  MarketContext, 
  StrategyPosition,
  TimeFrame 
} from '../../types/strategy';
import { BaseStrategy } from './BaseStrategy';
import { KrakenOHLCData, KrakenOHLCResponse, KrakenOHLCPairData } from '../../types/kraken';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// Use require for csv-parse since it doesn't provide ES module exports
const { parse } = require('csv-parse/sync');

export interface BacktestConfig {
  startTime: number;
  endTime: number;
  initialBalance: number;
  commission: number;
  slippage: number;
  timeframe: TimeFrame;
  pairs: string[];
  dataSource?: 'kraken' | 'file';
  dataLoader?: DataLoaderConfig;
}

export interface BacktestResult {
  trades: BacktestTrade[];
  metrics: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    totalReturn: number;
    totalReturnPercent: number;
    averageReturn: number;
    averageTradeLength: number;
    bestTrade: number;
    worstTrade: number;
    averageWin: number;
    averageLoss: number;
    expectancy: number;
    standardDeviation: number;
    annualizedReturn: number;
    annualizedVolatility: number;
  };
  equity: number[];
  drawdown: number[];
  timestamps: number[];
}

export interface BacktestTrade {
  id: string;
  pair: string;
  side: 'buy' | 'sell';
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  commission: number;
  slippage: number;
  holdingPeriod: number;
}

export interface DataLoaderConfig {
  type: 'csv' | 'json';
  directory: string;
  dateFormat?: string;
  timeColumns?: {
    timestamp: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  };
}

export class Backtester {
  private marketData: Map<string, KrakenOHLCData> = new Map();
  private currentIndex = 0;
  private equity: number[] = [];
  private drawdown: number[] = [];
  private trades: BacktestTrade[] = [];
  private timestamps: number[] = [];
  private highWaterMark: number;

  constructor(
    private strategy: BaseStrategy,
    private config: BacktestConfig
  ) {
    this.highWaterMark = config.initialBalance;
  }

  async loadData() {
    for (const pair of this.config.pairs) {
      const data = await this.fetchHistoricalData(pair);
      this.validateData(data);
      this.marketData.set(pair, data);
    }
  }

  private async fetchHistoricalData(pair: string): Promise<KrakenOHLCData> {
    if (this.config.dataSource === 'file') {
      return this.loadDataFromFile(pair);
    }
    return this.loadDataFromKraken(pair);
  }

  private async loadDataFromKraken(pair: string): Promise<KrakenOHLCData> {
    const timeframeMinutes = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '4h': 240,
      '1d': 1440,
      '1w': 10080
    };

    const interval = timeframeMinutes[this.config.timeframe];
    if (!interval) {
      throw new Error(`Invalid timeframe: ${this.config.timeframe}`);
    }

    try {
      const response = await fetch(
        `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${interval}&since=${this.config.startTime}`
      );

      if (!response.ok) {
        throw new Error(`Kraken API error: ${response.statusText}`);
      }

      const data = await response.json() as KrakenOHLCResponse;
      if (data.error && data.error.length > 0) {
        throw new Error(`Kraken API error: ${data.error.join(', ')}`);
      }

      const candles = Object.values(data.result)[0] as [number, string, string, string, string, string, string, number][];
      const filteredCandles = candles.filter(
        candle => candle[0] >= this.config.startTime && candle[0] <= this.config.endTime
      );

      const result: KrakenOHLCData = {
        [pair]: {
          candles: filteredCandles,
          last: parseInt(data.result.last.toString())
        }
      };

      return result;
    } catch (error: any) {
      throw new Error(`Failed to fetch data from Kraken: ${error?.message || 'Unknown error'}`);
    }
  }

  private async loadDataFromFile(pair: string): Promise<KrakenOHLCData> {
    if (!this.config.dataSource || !this.config.dataLoader) {
      throw new Error('Data source configuration missing');
    }

    const { type, directory } = this.config.dataLoader;
    const filename = `${pair}_${this.config.timeframe}.${type}`;
    const filepath = path.join(directory, filename);

    if (!fs.existsSync(filepath)) {
      throw new Error(`Data file not found: ${filepath}`);
    }

    return type === 'csv' ? 
      this.loadCSVData(filepath, pair) :
      this.loadJSONData(filepath, pair);
  }

  private async loadCSVData(filepath: string, pair: string): Promise<KrakenOHLCData> {
    const readFile = promisify(fs.readFile);
    const fileContent = await readFile(filepath, 'utf-8');
    
    const columns = this.config.dataLoader?.timeColumns || {
      timestamp: 'timestamp',
      open: 'open',
      high: 'high',
      low: 'low',
      close: 'close',
      volume: 'volume'
    };

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      cast: true
    }) as Array<Record<string, any>>;

    const candles = records
      .filter((row: any) => {
        const timestamp = new Date(row[columns.timestamp]).getTime();
        return timestamp >= this.config.startTime && timestamp <= this.config.endTime;
      })
      .map((row: any) => [
        new Date(row[columns.timestamp]).getTime(),
        row[columns.open].toString(),
        row[columns.high].toString(),
        row[columns.low].toString(),
        row[columns.close].toString(),
        '0', // vwap (not used)
        row[columns.volume].toString(),
        0  // count (not used)
      ] as [number, string, string, string, string, string, string, number]);

    return { 
      [pair]: {
        candles,
        last: candles[candles.length - 1][0]
      }
    };
  }

  private async loadJSONData(filepath: string, pair: string): Promise<KrakenOHLCData> {
    const fileContent = await fs.promises.readFile(filepath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Handle different JSON formats
    let candles: [number, string, string, string, string, string, string, number][];
    if (Array.isArray(data)) {
      candles = data;
    } else if (data.candles) {
      candles = data.candles;
    } else {
      throw new Error('Invalid JSON data format');
    }

    // Filter and format candles
    const formattedCandles = candles
      .filter(candle => {
        const timestamp = typeof candle[0] === 'string' ? 
          new Date(candle[0]).getTime() : candle[0];
        return timestamp >= this.config.startTime && timestamp <= this.config.endTime;
      })
      .map(candle => {
        // Handle different timestamp formats
        const timestamp = typeof candle[0] === 'string' ? 
          new Date(candle[0]).getTime() : candle[0];
        
        return [
          timestamp,
          candle[1].toString(), // open
          candle[2].toString(), // high
          candle[3].toString(), // low
          candle[4].toString(), // close
          '0',                  // vwap
          candle[6].toString(), // volume
          0                     // count
        ] as [number, string, string, string, string, string, string, number];
      });

    return { 
      [pair]: {
        candles: formattedCandles,
        last: formattedCandles[formattedCandles.length - 1][0]
      }
    };
  }

  async run(): Promise<BacktestResult> {
    await this.loadData();
    
    // Initialize strategy
    await this.strategy.onInit();

    // Run through each timestamp
    while (this.hasNextCandle()) {
      const context = this.prepareMarketContext();
      await this.strategy.onTick(context);
      this.updateMetrics();
      this.currentIndex++;
    }

    return this.generateResults();
  }

  private hasNextCandle(): boolean {
    // Check if we have more data to process
    return this.currentIndex < this.getMinDataLength();
  }

  private getMinDataLength(): number {
    let minLength = Infinity;
    this.marketData.forEach((data) => {
      const length = data[Object.keys(data)[0]].candles.length;
      if (length < minLength) {
        minLength = length;
      }
    });
    return minLength;
  }

  private prepareMarketContext(): MarketContext {
    const timestamp = this.getCurrentTimestamp();
    const context: MarketContext = {
      timestamp,
      pair: this.config.pairs[0], // Primary pair
      price: this.getCurrentPrice(),
      volume: this.getCurrentVolume(),
      indicators: {},
      ohlcv: this.getCurrentOHLCV(),
    };
    return context;
  }

  private getCurrentTimestamp(): number {
    const data = this.marketData.get(this.config.pairs[0])!;
    const pairData = data[Object.keys(data)[0]];
    return pairData.candles[this.currentIndex][0];
  }

  private getCurrentPrice(): number {
    const data = this.marketData.get(this.config.pairs[0])!;
    const pairData = data[Object.keys(data)[0]];
    return parseFloat(pairData.candles[this.currentIndex][4]); // Close price
  }

  private getCurrentVolume(): number {
    const data = this.marketData.get(this.config.pairs[0])!;
    const pairData = data[Object.keys(data)[0]];
    return parseFloat(pairData.candles[this.currentIndex][6]); // Volume
  }

  private getCurrentOHLCV() {
    const result = {
      open: [] as number[],
      high: [] as number[],
      low: [] as number[],
      close: [] as number[],
      volume: [] as number[],
    };

    this.marketData.forEach(data => {
      const pairData = Object.values(data)[0];
      const lookback = 100; // Adjust as needed
      const start = Math.max(0, this.currentIndex - lookback);
      
      for (let i = start; i <= this.currentIndex; i++) {
        const candle = pairData.candles[i];
        result.open.push(parseFloat(candle[1]));
        result.high.push(parseFloat(candle[2]));
        result.low.push(parseFloat(candle[3]));
        result.close.push(parseFloat(candle[4]));
        result.volume.push(parseFloat(candle[6]));
      }
    });

    return result;
  }

  private updateMetrics() {
    const currentEquity = this.calculateCurrentEquity();
    this.equity.push(currentEquity);
    
    // Update high water mark and drawdown
    this.highWaterMark = Math.max(this.highWaterMark, currentEquity);
    const currentDrawdown = (this.highWaterMark - currentEquity) / this.highWaterMark;
    this.drawdown.push(currentDrawdown);
    
    this.timestamps.push(this.getCurrentTimestamp());
  }

  private calculateCurrentEquity(): number {
    // Calculate current portfolio value including open positions
    const positions = this.strategy.getPositions();
    const currentPrice = this.getCurrentPrice();
    
    return positions.reduce((equity, position) => {
      const positionValue = position.quantity * currentPrice;
      return equity + positionValue;
    }, this.config.initialBalance);
  }

  private generateResults(): BacktestResult {
    return {
      trades: this.trades,
      metrics: this.calculateMetrics(),
      equity: this.equity,
      drawdown: this.drawdown,
      timestamps: this.timestamps,
    };
  }

  private calculateMetrics() {
    const returns = this.calculateReturns();
    const winningTrades = this.trades.filter(t => t.pnl > 0);
    const losingTrades = this.trades.filter(t => t.pnl <= 0);

    return {
      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / this.trades.length) * 100,
      profitFactor: this.calculateProfitFactor(),
      sharpeRatio: this.calculateSharpeRatio(returns),
      maxDrawdown: Math.max(...this.drawdown),
      maxDrawdownPercent: Math.max(...this.drawdown) * 100,
      totalReturn: this.equity[this.equity.length - 1] - this.config.initialBalance,
      totalReturnPercent: ((this.equity[this.equity.length - 1] / this.config.initialBalance) - 1) * 100,
      averageReturn: returns.reduce((a, b) => a + b, 0) / returns.length,
      averageTradeLength: this.calculateAverageTradeLength(),
      bestTrade: Math.max(...this.trades.map(t => t.pnl)),
      worstTrade: Math.min(...this.trades.map(t => t.pnl)),
      averageWin: this.calculateAverageWin(),
      averageLoss: this.calculateAverageLoss(),
      expectancy: this.calculateExpectancy(),
      standardDeviation: this.calculateStandardDeviation(returns),
      annualizedReturn: this.calculateAnnualizedReturn(),
      annualizedVolatility: this.calculateAnnualizedVolatility(returns),
    };
  }

  // Helper methods for metric calculations...
  private calculateReturns(): number[] {
    const returns: number[] = [];
    for (let i = 1; i < this.equity.length; i++) {
      returns.push((this.equity[i] - this.equity[i - 1]) / this.equity[i - 1]);
    }
    return returns;
  }

  private calculateProfitFactor(): number {
    const grossProfit = this.trades
      .filter(t => t.pnl > 0)
      .reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(this.trades
      .filter(t => t.pnl <= 0)
      .reduce((sum, t) => sum + t.pnl, 0));
    return grossLoss === 0 ? Infinity : grossProfit / grossLoss;
  }

  private calculateSharpeRatio(returns: number[]): number {
    const riskFreeRate = 0.02 / 252; // Assuming 2% annual risk-free rate
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = this.calculateStandardDeviation(returns);
    return stdDev === 0 ? 0 : (meanReturn - riskFreeRate) / stdDev;
  }

  private calculateAverageTradeLength(): number {
    if (this.trades.length === 0) return 0;
    return this.trades.reduce((sum, trade) => sum + trade.holdingPeriod, 0) / this.trades.length;
  }

  private calculateAverageWin(): number {
    const winningTrades = this.trades.filter(t => t.pnl > 0);
    if (winningTrades.length === 0) return 0;
    return winningTrades.reduce((sum, trade) => sum + trade.pnl, 0) / winningTrades.length;
  }

  private calculateAverageLoss(): number {
    const losingTrades = this.trades.filter(t => t.pnl < 0);
    if (losingTrades.length === 0) return 0;
    return losingTrades.reduce((sum, trade) => sum + trade.pnl, 0) / losingTrades.length;
  }

  private calculateExpectancy(): number {
    const avgWin = this.calculateAverageWin();
    const avgLoss = Math.abs(this.calculateAverageLoss());
    const winRate = this.trades.filter(t => t.pnl > 0).length / this.trades.length;
    return (winRate * avgWin) - ((1 - winRate) * avgLoss);
  }

  private calculateStandardDeviation(returns: number[]): number {
    if (returns.length === 0) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;
    return Math.sqrt(variance);
  }

  private calculateAnnualizedReturn(): number {
    if (this.equity.length < 2) return 0;
    const totalReturn = (this.equity[this.equity.length - 1] / this.equity[0]) - 1;
    const years = (this.config.endTime - this.config.startTime) / (365 * 24 * 60 * 60 * 1000);
    return Math.pow(1 + totalReturn, 1 / years) - 1;
  }

  private calculateAnnualizedVolatility(returns: number[]): number {
    const stdDev = this.calculateStandardDeviation(returns);
    const periodsPerYear = this.getPeriodsPerYear();
    return stdDev * Math.sqrt(periodsPerYear);
  }

  private getPeriodsPerYear(): number {
    const timeframeMinutes = {
      '1m': 525600,
      '5m': 105120,
      '15m': 35040,
      '30m': 17520,
      '1h': 8760,
      '4h': 2190,
      '1d': 365,
      '1w': 52
    };
    return timeframeMinutes[this.config.timeframe] || 365;
  }

  // ... implement other metric calculation methods

  // Add data validation method
  private validateData(data: KrakenOHLCData): void {
    const pairData = Object.values(data)[0];
    if (!pairData || !pairData.candles || pairData.candles.length === 0) {
      throw new Error('Invalid market data format');
    }
  }
} 