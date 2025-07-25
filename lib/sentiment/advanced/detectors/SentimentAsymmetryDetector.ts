import { BaseDetector } from '../base/BaseDetector';
import {
  SentimentData,
  OrderBookData,
  VolumeData,
  MarketData,
  DetectionResult,
  AsymmetrySignal
} from '../types';

interface AsymmetryConfig {
  minBuyWallSize: number;
  minSellWallSize: number;
  sentimentThreshold: number;
  volumeCorrelationWindow: number;
  divergenceThreshold: number;
  manipulationSensitivity: number;
}

interface OrderBookLevel {
  price: number;
  size: number;
  orders: number;
}

interface AsymmetryMetrics {
  buyWallStrength: number;
  sellWallStrength: number;
  sentimentScore: number;
  volumeSentimentCorrelation: number;
  orderBookImbalance: number;
  hiddenAccumulation: number;
  hiddenDistribution: number;
  manipulationScore: number;
}

export class SentimentAsymmetryDetector extends BaseDetector {
  private config: AsymmetryConfig;
  private sentimentHistory: SentimentData[] = [];
  private volumeHistory: VolumeData[] = [];
  private orderBookHistory: OrderBookData[] = [];
  private asymmetrySignals: AsymmetrySignal[] = [];

  constructor(config: Partial<AsymmetryConfig> = {}) {
    super();
    this.config = {
      minBuyWallSize: config.minBuyWallSize || 100000,
      minSellWallSize: config.minSellWallSize || 100000,
      sentimentThreshold: config.sentimentThreshold || 0.3,
      volumeCorrelationWindow: config.volumeCorrelationWindow || 20,
      divergenceThreshold: config.divergenceThreshold || 0.5,
      manipulationSensitivity: config.manipulationSensitivity || 0.7,
      ...config
    };
  }

  public async detect(
    sentiment: SentimentData,
    orderBook: OrderBookData,
    volume: VolumeData,
    market: MarketData
  ): Promise<DetectionResult> {
    // Update histories
    this.updateHistories(sentiment, orderBook, volume);

    // Calculate asymmetry metrics
    const metrics = this.calculateAsymmetryMetrics(sentiment, orderBook, volume, market);

    // Detect specific asymmetry patterns
    const signals: AsymmetrySignal[] = [];

    // Detect buy walls with negative sentiment (accumulation)
    const accumulationSignal = this.detectAccumulationPattern(metrics, orderBook, sentiment);
    if (accumulationSignal) signals.push(accumulationSignal);

    // Detect positive sentiment with sell pressure (distribution)
    const distributionSignal = this.detectDistributionPattern(metrics, orderBook, sentiment);
    if (distributionSignal) signals.push(distributionSignal);

    // Detect sentiment/volume divergence
    const divergenceSignal = this.detectSentimentVolumeDivergence(metrics, volume, sentiment);
    if (divergenceSignal) signals.push(divergenceSignal);

    // Detect order book sentiment divergence
    const orderBookDivergence = this.detectOrderBookSentimentDivergence(metrics, orderBook, sentiment);
    if (orderBookDivergence) signals.push(orderBookDivergence);

    // Detect market manipulation patterns
    const manipulationSignal = this.detectManipulationPattern(metrics, orderBook, volume);
    if (manipulationSignal) signals.push(manipulationSignal);

    // Store signals
    this.asymmetrySignals = [...this.asymmetrySignals.slice(-100), ...signals];

    // Calculate overall confidence
    const confidence = this.calculateConfidence(signals, metrics);

    return {
      detected: signals.length > 0,
      confidence,
      signals,
      metrics,
      recommendation: this.generateRecommendation(signals, metrics)
    };
  }

  private calculateAsymmetryMetrics(
    sentiment: SentimentData,
    orderBook: OrderBookData,
    volume: VolumeData,
    market: MarketData
  ): AsymmetryMetrics {
    const buyWallStrength = this.calculateWallStrength(orderBook.bids, market.price);
    const sellWallStrength = this.calculateWallStrength(orderBook.asks, market.price);
    const sentimentScore = this.calculateSentimentScore(sentiment);
    const volumeSentimentCorrelation = this.calculateVolumeSentimentCorrelation();
    const orderBookImbalance = this.calculateOrderBookImbalance(orderBook);
    const hiddenAccumulation = this.calculateHiddenAccumulation(
      sentiment,
      orderBook,
      volume,
      market
    );
    const hiddenDistribution = this.calculateHiddenDistribution(
      sentiment,
      orderBook,
      volume,
      market
    );
    const manipulationScore = this.calculateManipulationScore(
      orderBook,
      volume,
      sentiment
    );

    return {
      buyWallStrength,
      sellWallStrength,
      sentimentScore,
      volumeSentimentCorrelation,
      orderBookImbalance,
      hiddenAccumulation,
      hiddenDistribution,
      manipulationScore
    };
  }

  private detectAccumulationPattern(
    metrics: AsymmetryMetrics,
    orderBook: OrderBookData,
    sentiment: SentimentData
  ): AsymmetrySignal | null {
    // Large buy walls with negative sentiment indicates accumulation
    if (
      metrics.buyWallStrength > this.config.minBuyWallSize &&
      metrics.sentimentScore < -this.config.sentimentThreshold
    ) {
      const strength = this.calculateAccumulationStrength(metrics, orderBook);
      
      return {
        type: 'accumulation',
        timestamp: Date.now(),
        strength,
        description: 'Large buy walls detected with negative sentiment - potential accumulation',
        metrics: {
          buyWallSize: metrics.buyWallStrength,
          sentimentScore: metrics.sentimentScore,
          hiddenAccumulation: metrics.hiddenAccumulation
        }
      };
    }

    return null;
  }

  private detectDistributionPattern(
    metrics: AsymmetryMetrics,
    orderBook: OrderBookData,
    sentiment: SentimentData
  ): AsymmetrySignal | null {
    // Positive sentiment with sell pressure indicates distribution
    if (
      metrics.sentimentScore > this.config.sentimentThreshold &&
      metrics.sellWallStrength > this.config.minSellWallSize
    ) {
      const strength = this.calculateDistributionStrength(metrics, orderBook);
      
      return {
        type: 'distribution',
        timestamp: Date.now(),
        strength,
        description: 'Positive sentiment with large sell walls - potential distribution',
        metrics: {
          sellWallSize: metrics.sellWallStrength,
          sentimentScore: metrics.sentimentScore,
          hiddenDistribution: metrics.hiddenDistribution
        }
      };
    }

    return null;
  }

  private detectSentimentVolumeDivergence(
    metrics: AsymmetryMetrics,
    volume: VolumeData,
    sentiment: SentimentData
  ): AsymmetrySignal | null {
    // Detect when sentiment and volume move in opposite directions
    if (Math.abs(metrics.volumeSentimentCorrelation) < -this.config.divergenceThreshold) {
      const divergenceType = metrics.volumeSentimentCorrelation < 0 ? 'negative' : 'positive';
      
      return {
        type: 'sentiment_volume_divergence',
        timestamp: Date.now(),
        strength: Math.abs(metrics.volumeSentimentCorrelation),
        description: `${divergenceType} divergence between sentiment and volume detected`,
        metrics: {
          correlation: metrics.volumeSentimentCorrelation,
          volumeTrend: this.calculateVolumeTrend(),
          sentimentTrend: this.calculateSentimentTrend()
        }
      };
    }

    return null;
  }

  private detectOrderBookSentimentDivergence(
    metrics: AsymmetryMetrics,
    orderBook: OrderBookData,
    sentiment: SentimentData
  ): AsymmetrySignal | null {
    // Detect when order book imbalance conflicts with sentiment
    const sentimentBullish = metrics.sentimentScore > this.config.sentimentThreshold;
    const orderBookBullish = metrics.orderBookImbalance > 0.2;

    if (sentimentBullish !== orderBookBullish && 
        Math.abs(metrics.orderBookImbalance) > 0.3) {
      return {
        type: 'orderbook_sentiment_divergence',
        timestamp: Date.now(),
        strength: Math.abs(metrics.orderBookImbalance),
        description: 'Order book imbalance conflicts with sentiment direction',
        metrics: {
          orderBookImbalance: metrics.orderBookImbalance,
          sentimentScore: metrics.sentimentScore,
          divergenceStrength: Math.abs(metrics.sentimentScore - metrics.orderBookImbalance)
        }
      };
    }

    return null;
  }

  private detectManipulationPattern(
    metrics: AsymmetryMetrics,
    orderBook: OrderBookData,
    volume: VolumeData
  ): AsymmetrySignal | null {
    if (metrics.manipulationScore > this.config.manipulationSensitivity) {
      const manipulationType = this.identifyManipulationType(metrics, orderBook);
      
      return {
        type: 'manipulation',
        timestamp: Date.now(),
        strength: metrics.manipulationScore,
        description: `Potential ${manipulationType} manipulation detected`,
        metrics: {
          manipulationScore: metrics.manipulationScore,
          manipulationType,
          buyWallStrength: metrics.buyWallStrength,
          sellWallStrength: metrics.sellWallStrength
        }
      };
    }

    return null;
  }

  private calculateWallStrength(levels: OrderBookLevel[], currentPrice: number): number {
    let totalStrength = 0;
    
    for (const level of levels) {
      const priceDistance = Math.abs(level.price - currentPrice) / currentPrice;
      const weight = Math.exp(-priceDistance * 10); // Exponential decay with distance
      totalStrength += level.size * weight;
    }
    
    return totalStrength;
  }

  private calculateSentimentScore(sentiment: SentimentData): number {
    // Weighted sentiment score based on different sources
    const weights = {
      social: 0.3,
      news: 0.4,
      technical: 0.3
    };
    
    return (
      sentiment.social * weights.social +
      sentiment.news * weights.news +
      sentiment.technical * weights.technical
    );
  }

  private calculateVolumeSentimentCorrelation(): number {
    if (this.volumeHistory.length < this.config.volumeCorrelationWindow ||
        this.sentimentHistory.length < this.config.volumeCorrelationWindow) {
      return 0;
    }

    const window = this.config.volumeCorrelationWindow;
    const recentVolumes = this.volumeHistory.slice(-window);
    const recentSentiments = this.sentimentHistory.slice(-window);

    // Calculate correlation coefficient
    const volumeValues = recentVolumes.map(v => v.total);
    const sentimentValues = recentSentiments.map(s => this.calculateSentimentScore(s));

    return this.pearsonCorrelation(volumeValues, sentimentValues);
  }

  private calculateOrderBookImbalance(orderBook: OrderBookData): number {
    const totalBidVolume = orderBook.bids.reduce((sum, bid) => sum + bid.size, 0);
    const totalAskVolume = orderBook.asks.reduce((sum, ask) => sum + ask.size, 0);
    
    return (totalBidVolume - totalAskVolume) / (totalBidVolume + totalAskVolume);
  }

  private calculateHiddenAccumulation(
    sentiment: SentimentData,
    orderBook: OrderBookData,
    volume: VolumeData,
    market: MarketData
  ): number {
    // Score indicating hidden accumulation activity
    let score = 0;

    // Negative sentiment with price support
    if (this.calculateSentimentScore(sentiment) < -0.2 && market.priceChange > 0) {
      score += 0.3;
    }

    // Large buy walls below current price
    const buyWallsBelow = this.findLargeBuyWalls(orderBook, market.price);
    score += Math.min(buyWallsBelow.length * 0.1, 0.3);

    // Volume increases on dips
    if (this.detectVolumeOnDips()) {
      score += 0.2;
    }

    // Decreasing sell pressure
    if (this.detectDecreasingSellPressure(orderBook)) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  private calculateHiddenDistribution(
    sentiment: SentimentData,
    orderBook: OrderBookData,
    volume: VolumeData,
    market: MarketData
  ): number {
    // Score indicating hidden distribution activity
    let score = 0;

    // Positive sentiment with price weakness
    if (this.calculateSentimentScore(sentiment) > 0.2 && market.priceChange < 0) {
      score += 0.3;
    }

    // Large sell walls above current price
    const sellWallsAbove = this.findLargeSellWalls(orderBook, market.price);
    score += Math.min(sellWallsAbove.length * 0.1, 0.3);

    // Volume increases on rallies
    if (this.detectVolumeOnRallies()) {
      score += 0.2;
    }

    // Increasing sell pressure
    if (this.detectIncreasingSellPressure(orderBook)) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  private calculateManipulationScore(
    orderBook: OrderBookData,
    volume: VolumeData,
    sentiment: SentimentData
  ): number {
    let score = 0;

    // Spoofing detection - large orders that disappear
    if (this.detectSpoofing(orderBook)) {
      score += 0.3;
    }

    // Layering detection - multiple orders at different levels
    if (this.detectLayering(orderBook)) {
      score += 0.2;
    }

    // Wash trading detection - artificial volume
    if (this.detectWashTrading(volume)) {
      score += 0.3;
    }

    // Sentiment manipulation - sudden changes
    if (this.detectSentimentManipulation(sentiment)) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  private calculateAccumulationStrength(
    metrics: AsymmetryMetrics,
    orderBook: OrderBookData
  ): number {
    return (
      metrics.hiddenAccumulation * 0.4 +
      (metrics.buyWallStrength / this.config.minBuyWallSize) * 0.3 +
      Math.abs(metrics.sentimentScore) * 0.3
    );
  }

  private calculateDistributionStrength(
    metrics: AsymmetryMetrics,
    orderBook: OrderBookData
  ): number {
    return (
      metrics.hiddenDistribution * 0.4 +
      (metrics.sellWallStrength / this.config.minSellWallSize) * 0.3 +
      metrics.sentimentScore * 0.3
    );
  }

  private identifyManipulationType(
    metrics: AsymmetryMetrics,
    orderBook: OrderBookData
  ): string {
    if (metrics.buyWallStrength > metrics.sellWallStrength * 2) {
      return 'buy-side spoofing';
    } else if (metrics.sellWallStrength > metrics.buyWallStrength * 2) {
      return 'sell-side spoofing';
    } else if (this.detectLayering(orderBook)) {
      return 'layering';
    } else {
      return 'general';
    }
  }

  private findLargeBuyWalls(orderBook: OrderBookData, currentPrice: number): OrderBookLevel[] {
    return orderBook.bids.filter(bid => 
      bid.size > this.config.minBuyWallSize &&
      bid.price < currentPrice * 0.98 // Within 2% of current price
    );
  }

  private findLargeSellWalls(orderBook: OrderBookData, currentPrice: number): OrderBookLevel[] {
    return orderBook.asks.filter(ask => 
      ask.size > this.config.minSellWallSize &&
      ask.price > currentPrice * 1.02 // Within 2% of current price
    );
  }

  private detectVolumeOnDips(): boolean {
    if (this.volumeHistory.length < 10) return false;

    const recentVolumes = this.volumeHistory.slice(-10);
    const avgVolume = recentVolumes.reduce((sum, v) => sum + v.total, 0) / recentVolumes.length;
    
    // Check if volume increases when price decreases
    return recentVolumes.some((v, i) => 
      i > 0 && 
      v.total > avgVolume * 1.2 && 
      v.priceChange < -0.01
    );
  }

  private detectVolumeOnRallies(): boolean {
    if (this.volumeHistory.length < 10) return false;

    const recentVolumes = this.volumeHistory.slice(-10);
    const avgVolume = recentVolumes.reduce((sum, v) => sum + v.total, 0) / recentVolumes.length;
    
    // Check if volume increases when price increases
    return recentVolumes.some((v, i) => 
      i > 0 && 
      v.total > avgVolume * 1.2 && 
      v.priceChange > 0.01
    );
  }

  private detectDecreasingSellPressure(orderBook: OrderBookData): boolean {
    if (this.orderBookHistory.length < 5) return false;

    const recentBooks = this.orderBookHistory.slice(-5);
    const sellPressures = recentBooks.map(book => 
      book.asks.reduce((sum, ask) => sum + ask.size, 0)
    );

    // Check if sell pressure is decreasing
    return sellPressures.every((pressure, i) => 
      i === 0 || pressure <= sellPressures[i - 1]
    );
  }

  private detectIncreasingSellPressure(orderBook: OrderBookData): boolean {
    if (this.orderBookHistory.length < 5) return false;

    const recentBooks = this.orderBookHistory.slice(-5);
    const sellPressures = recentBooks.map(book => 
      book.asks.reduce((sum, ask) => sum + ask.size, 0)
    );

    // Check if sell pressure is increasing
    return sellPressures.every((pressure, i) => 
      i === 0 || pressure >= sellPressures[i - 1]
    );
  }

  private detectSpoofing(orderBook: OrderBookData): boolean {
    if (this.orderBookHistory.length < 3) return false;

    // Look for large orders that appear and disappear quickly
    const currentLargeOrders = [...orderBook.bids, ...orderBook.asks]
      .filter(order => order.size > this.config.minBuyWallSize);

    const previousLargeOrders = this.orderBookHistory[this.orderBookHistory.length - 2];
    if (!previousLargeOrders) return false;

    const prevLarge = [...previousLargeOrders.bids, ...previousLargeOrders.asks]
      .filter(order => order.size > this.config.minBuyWallSize);

    // Check if large orders disappeared without being filled
    const disappeared = prevLarge.filter(prevOrder =>
      !currentLargeOrders.some(currOrder => 
        Math.abs(currOrder.price - prevOrder.price) < 0.001 &&
        Math.abs(currOrder.size - prevOrder.size) < prevOrder.size * 0.1
      )
    );

    return disappeared.length > prevLarge.length * 0.5;
  }

  private detectLayering(orderBook: OrderBookData): boolean {
    // Detect multiple orders at different price levels from same entity
    const bidPriceLevels = new Map<number, number>();
    const askPriceLevels = new Map<number, number>();

    orderBook.bids.forEach(bid => {
      const priceKey = Math.floor(bid.price * 100) / 100;
      bidPriceLevels.set(priceKey, (bidPriceLevels.get(priceKey) || 0) + 1);
    });

    orderBook.asks.forEach(ask => {
      const priceKey = Math.floor(ask.price * 100) / 100;
      askPriceLevels.set(priceKey, (askPriceLevels.get(priceKey) || 0) + 1);
    });

    // Check for suspicious clustering
    const bidClustering = Array.from(bidPriceLevels.values()).filter(count => count > 3).length;
    const askClustering = Array.from(askPriceLevels.values()).filter(count => count > 3).length;

    return bidClustering > 2 || askClustering > 2;
  }

  private detectWashTrading(volume: VolumeData): boolean {
    if (this.volumeHistory.length < 10) return false;

    const recentVolumes = this.volumeHistory.slice(-10);
    const avgVolume = recentVolumes.reduce((sum, v) => sum + v.total, 0) / recentVolumes.length;
    
    // Check for suspiciously consistent volume patterns
    const volumeVariance = this.calculateVariance(recentVolumes.map(v => v.total));
    const coefficientOfVariation = Math.sqrt(volumeVariance) / avgVolume;

    // Low variation with high volume might indicate wash trading
    return coefficientOfVariation < 0.1 && avgVolume > 100000;
  }

  private detectSentimentManipulation(sentiment: SentimentData): boolean {
    if (this.sentimentHistory.length < 5) return false;

    const recentSentiments = this.sentimentHistory.slice(-5);
    const sentimentScores = recentSentiments.map(s => this.calculateSentimentScore(s));

    // Check for sudden sentiment spikes
    const maxChange = Math.max(...sentimentScores.slice(1).map((score, i) => 
      Math.abs(score - sentimentScores[i])
    ));

    return maxChange > 0.5;
  }

  private calculateVolumeTrend(): number {
    if (this.volumeHistory.length < 5) return 0;

    const recentVolumes = this.volumeHistory.slice(-5).map(v => v.total);
    return this.calculateTrend(recentVolumes);
  }

  private calculateSentimentTrend(): number {
    if (this.sentimentHistory.length < 5) return 0;

    const recentSentiments = this.sentimentHistory.slice(-5)
      .map(s => this.calculateSentimentScore(s));
    return this.calculateTrend(recentSentiments);
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + val * i, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
    const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private calculateConfidence(signals: AsymmetrySignal[], metrics: AsymmetryMetrics): number {
    let confidence = 0;

    // Base confidence from signal count
    confidence += Math.min(signals.length * 0.2, 0.6);

    // Additional confidence from metric strengths
    if (metrics.hiddenAccumulation > 0.7 || metrics.hiddenDistribution > 0.7) {
      confidence += 0.2;
    }

    if (Math.abs(metrics.volumeSentimentCorrelation) > 0.7) {
      confidence += 0.1;
    }

    if (metrics.manipulationScore > 0.8) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1);
  }

  private generateRecommendation(
    signals: AsymmetrySignal[],
    metrics: AsymmetryMetrics
  ): string {
    if (signals.length === 0) {
      return 'No significant asymmetry detected';
    }

    const recommendations: string[] = [];

    // Check for accumulation
    if (signals.some(s => s.type === 'accumulation')) {
      recommendations.push('Hidden accumulation detected - consider following smart money');
    }

    // Check for distribution
    if (signals.some(s => s.type === 'distribution')) {
      recommendations.push('Hidden distribution detected - be cautious of potential selling');
    }

    // Check for manipulation
    if (signals.some(s => s.type === 'manipulation')) {
      recommendations.push('Market manipulation detected - avoid trading until clarity emerges');
    }

    // Check for divergences
    if (signals.some(s => s.type.includes('divergence'))) {
      recommendations.push('Significant divergence detected - wait for confirmation');
    }

    return recommendations.join('; ');
  }

  private updateHistories(
    sentiment: SentimentData,
    orderBook: OrderBookData,
    volume: VolumeData
  ): void {
    this.sentimentHistory = [...this.sentimentHistory.slice(-100), sentiment];
    this.orderBookHistory = [...this.orderBookHistory.slice(-100), orderBook];
    this.volumeHistory = [...this.volumeHistory.slice(-100), volume];
  }

  public getAsymmetrySignals(): AsymmetrySignal[] {
    return this.asymmetrySignals;
  }

  public reset(): void {
    this.sentimentHistory = [];
    this.volumeHistory = [];
    this.orderBookHistory = [];
    this.asymmetrySignals = [];
  }
}