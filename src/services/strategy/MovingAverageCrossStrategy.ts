import { BaseStrategy } from './BaseStrategy';
import { StrategyConfig, MarketContext, StrategyPosition } from '../../types/strategy';

export class MovingAverageCrossStrategy extends BaseStrategy {
  static readonly config: StrategyConfig = {
    name: 'Moving Average Cross',
    description: 'Simple moving average crossover strategy',
    timeframe: '1h',
    pairs: ['XXBTZUSD'],
    parameters: {
      fastPeriod: {
        type: 'number',
        default: 10,
        description: 'Fast moving average period',
        min: 2,
        max: 200,
      },
      slowPeriod: {
        type: 'number',
        default: 20,
        description: 'Slow moving average period',
        min: 5,
        max: 200,
      },
      riskPerTrade: {
        type: 'number',
        default: 0.01,
        description: 'Risk per trade (1% = 0.01)',
        min: 0.001,
        max: 0.05,
      },
    },
  };

  async onInit(): Promise<void> {
    await this.addIndicator('fastMA', 'sma', { period: this.params.fastPeriod });
    await this.addIndicator('slowMA', 'sma', { period: this.params.slowPeriod });
  }

  async onTick(context: MarketContext): Promise<void> {
    const fastMA = this.getIndicatorValue('fastMA') as number[];
    const slowMA = this.getIndicatorValue('slowMA') as number[];

    if (fastMA.length < 2 || slowMA.length < 2) return;

    const currentFast = fastMA[fastMA.length - 1];
    const previousFast = fastMA[fastMA.length - 2];
    const currentSlow = slowMA[slowMA.length - 1];
    const previousSlow = slowMA[slowMA.length - 2];

    // Check for crossovers
    const crossedAbove = previousFast <= previousSlow && currentFast > currentSlow;
    const crossedBelow = previousFast >= previousSlow && currentFast < currentSlow;

    const position = this.positions.get(context.pair);

    if (crossedAbove && !position) {
      const stopLoss = context.price * 0.95; // 5% stop loss
      const quantity = this.calculatePositionSize(context.price, stopLoss);

      await this.enterPosition({
        type: 'entry',
        side: 'buy',
        pair: context.pair,
        price: context.price,
        quantity,
        stopLoss,
        takeProfit: context.price * 1.15, // 15% take profit
        reason: 'MA Cross Above',
        timestamp: context.timestamp,
      });
    } else if (crossedBelow && position?.side === 'long') {
      await this.exitPosition({
        type: 'exit',
        side: 'sell',
        pair: context.pair,
        price: context.price,
        quantity: position.quantity,
        reason: 'MA Cross Below',
        timestamp: context.timestamp,
      });
    }
  }

  onOrderUpdate(order: any): void {
    console.log('Order updated:', order);
  }

  onPositionUpdate(position: StrategyPosition): void {
    console.log('Position updated:', position);
  }

  onError(error: Error): void {
    console.error('Strategy error:', error);
  }
} 