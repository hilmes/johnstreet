import { PositionSizer, PositionSizingMethod, RiskParameters, MarketConditions } from './PositionSizer'
import { TradingSignal } from '../signals/SignalGenerator'
import { Portfolio } from '@/types/trading'

describe('PositionSizer', () => {
  let positionSizer: PositionSizer
  let mockSignal: TradingSignal
  let mockPortfolio: Portfolio
  let currentPrice: number

  beforeEach(() => {
    positionSizer = new PositionSizer()
    currentPrice = 50000

    mockSignal = {
      id: 'signal_123',
      symbol: 'BTC/USD',
      action: 'BUY',
      strength: 0.8,
      confidence: 0.85,
      timeframe: '1h',
      source: {
        sentiment: {
          symbol: 'BTC',
          score: 0.75,
          confidence: 0.85,
          volume: 100,
          platforms: ['reddit', 'twitter'],
          timestamp: Date.now(),
          metadata: {
            mentionCount: 50,
            uniqueAuthors: 30,
            averageFollowers: 1000,
            viralPosts: 2,
            influencerEngagement: 0.8
          }
        },
        marketData: {
          symbol: 'BTC/USD',
          price: 50000,
          bid: 49995,
          ask: 50005,
          volume: 1000,
          timestamp: Date.now()
        }
      },
      metadata: {
        sentimentVelocity: 0.15,
        volumeProfile: 'increasing',
        riskLevel: 'medium',
        correlatedSymbols: ['ETH', 'SOL']
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000,
      priority: 8
    }

    mockPortfolio = {
      id: 'portfolio_123',
      userId: 'user_123',
      totalValue: 100000,
      cash: 50000,
      positions: [
        {
          symbol: 'ETH/USD',
          amount: 10,
          averagePrice: 3000,
          currentPrice: 3100,
          value: 31000,
          unrealizedPnL: 1000,
          realizedPnL: 0
        }
      ],
      performance: {
        totalReturn: 0.05,
        dailyReturn: 0.01,
        weeklyReturn: 0.03,
        monthlyReturn: 0.05,
        yearlyReturn: 0,
        sharpeRatio: 1.2,
        maxDrawdown: -0.08,
        winRate: 0.6
      },
      risk: {
        portfolioVolatility: 0.15,
        valueAtRisk: -5000,
        beta: 1.1,
        correlation: 0.85
      },
      updatedAt: Date.now()
    }
  })

  describe('constructor', () => {
    it('should initialize with default risk parameters', () => {
      const sizer = new PositionSizer()
      expect(sizer).toBeDefined()
    })

    it('should accept custom risk parameters', () => {
      const customParams: Partial<RiskParameters> = {
        maxPositionSize: 0.05,
        maxRiskPerTrade: 0.01,
        maxLeverage: 2
      }
      const sizer = new PositionSizer(customParams)
      expect(sizer).toBeDefined()
    })
  })

  describe('calculatePositionSize', () => {
    it('should calculate position size with fixed method', () => {
      const method: PositionSizingMethod = {
        type: 'fixed',
        parameters: { amount: 5000 }
      }

      const position = positionSizer.calculatePositionSize(
        mockSignal,
        currentPrice,
        mockPortfolio,
        method
      )

      expect(position).toBeDefined()
      expect(position?.baseAmount).toBe(5000)
      expect(position?.quoteAmount).toBe(0.1) // 5000 / 50000
      expect(position?.percentage).toBe(0.05) // 5000 / 100000
    })

    it('should calculate position size with percentage method', () => {
      const method: PositionSizingMethod = {
        type: 'percentage',
        parameters: { percentage: 0.03 }
      }

      const position = positionSizer.calculatePositionSize(
        mockSignal,
        currentPrice,
        mockPortfolio,
        method
      )

      expect(position).toBeDefined()
      expect(position?.baseAmount).toBe(3000) // 3% of 100000
      expect(position?.quoteAmount).toBe(0.06) // 3000 / 50000
    })

    it('should return null for positions below minimum size', () => {
      const method: PositionSizingMethod = {
        type: 'fixed',
        parameters: { amount: 50 } // Below $100 minimum
      }

      const position = positionSizer.calculatePositionSize(
        mockSignal,
        currentPrice,
        mockPortfolio,
        method
      )

      expect(position).toBeNull()
    })

    it('should calculate stop loss and take profit levels', () => {
      const position = positionSizer.calculatePositionSize(
        mockSignal,
        currentPrice,
        mockPortfolio
      )

      expect(position?.stopLoss).toBeLessThan(currentPrice)
      expect(position?.takeProfit).toBeGreaterThan(currentPrice)
    })

    it('should apply risk limits to position size', () => {
      const method: PositionSizingMethod = {
        type: 'percentage',
        parameters: { percentage: 0.2 } // 20% - above 10% max
      }

      const position = positionSizer.calculatePositionSize(
        mockSignal,
        currentPrice,
        mockPortfolio,
        method
      )

      expect(position?.percentage).toBeLessThanOrEqual(0.1) // Should be capped at 10%
      expect(position?.metadata.adjustments).toContain('Position size limited to max')
    })

    it('should calculate risk amount correctly', () => {
      const position = positionSizer.calculatePositionSize(
        mockSignal,
        currentPrice,
        mockPortfolio
      )

      expect(position?.riskAmount).toBeDefined()
      expect(position?.riskAmount).toBeGreaterThan(0)
      expect(position?.riskAmount).toBeLessThan(position!.baseAmount)
    })

    it('should adjust for portfolio risk limits', () => {
      // Set up portfolio with existing risk
      mockPortfolio.risk.valueAtRisk = -5500 // Close to 6% limit

      const position = positionSizer.calculatePositionSize(
        mockSignal,
        currentPrice,
        mockPortfolio
      )

      expect(position?.metadata.adjustments).toContain('Reduced for portfolio risk limit')
    })

    it('should handle volatility-adjusted sizing', () => {
      const method: PositionSizingMethod = {
        type: 'volatility_adjusted',
        parameters: { targetVolatility: 0.1 }
      }

      const position = positionSizer.calculatePositionSize(
        mockSignal,
        currentPrice,
        mockPortfolio,
        method
      )

      expect(position).toBeDefined()
      expect(position?.metadata.method).toBe('volatility_adjusted')
    })

    it('should include confidence in metadata', () => {
      const position = positionSizer.calculatePositionSize(
        mockSignal,
        currentPrice,
        mockPortfolio
      )

      expect(position?.metadata.confidence).toBe(mockSignal.confidence)
    })
  })

  describe('updateMarketConditions', () => {
    it('should update market conditions', () => {
      const conditions: MarketConditions = {
        volatility: 0.25,
        trend: 'bullish',
        liquidity: 0.8,
        correlations: new Map()
      }

      positionSizer.updateMarketConditions(conditions)
      
      // Calculate position with updated conditions
      const position = positionSizer.calculatePositionSize(
        mockSignal,
        currentPrice,
        mockPortfolio
      )

      expect(position).toBeDefined()
    })
  })

  describe('getOptimalSizingMethod', () => {
    it('should select optimal method based on signal characteristics', () => {
      const method = positionSizer.getOptimalSizingMethod(mockSignal, mockPortfolio)
      
      expect(method).toBeDefined()
      expect(['fixed', 'percentage', 'kelly', 'risk_parity', 'volatility_adjusted']).toContain(method.type)
    })

    it('should prefer volatility sizing in high volatility', () => {
      mockSignal.metadata.volatility = 0.35 // High volatility
      
      const method = positionSizer.getOptimalSizingMethod(mockSignal, mockPortfolio)
      
      expect(method.type).toBe('volatility_adjusted')
    })

    it('should prefer Kelly for high confidence signals', () => {
      mockSignal.confidence = 0.95
      mockSignal.strength = 0.9
      
      const method = positionSizer.getOptimalSizingMethod(mockSignal, mockPortfolio)
      
      expect(method.type).toBe('kelly')
    })
  })
})