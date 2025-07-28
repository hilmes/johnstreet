import { PaperTradingEngine } from './PaperTradingEngine'

describe('PaperTradingEngine', () => {
  let engine: PaperTradingEngine

  beforeEach(() => {
    engine = new PaperTradingEngine(100000)
  })

  describe('initialization', () => {
    it('should initialize with default USD balance', () => {
      const balance = engine.getBalance('USD')
      expect(balance).toBeDefined()
      expect(balance?.available).toBe(100000)
      expect(balance?.locked).toBe(0)
      expect(balance?.total).toBe(100000)
    })

    it('should initialize with custom balance', () => {
      const customEngine = new PaperTradingEngine(50000)
      const balance = customEngine.getBalance('USD')
      expect(balance?.total).toBe(50000)
    })

    it('should initialize crypto balances at zero', () => {
      const cryptos = ['BTC', 'ETH', 'ADA', 'DOT', 'LINK', 'XRP']
      cryptos.forEach(crypto => {
        const balance = engine.getBalance(crypto)
        expect(balance).toBeDefined()
        expect(balance?.available).toBe(0)
        expect(balance?.total).toBe(0)
      })
    })
  })

  describe('paper trading mode', () => {
    it('should start disabled', () => {
      expect(engine.isPaperTradingEnabled()).toBe(false)
    })

    it('should enable paper trading', (done) => {
      engine.on('paper_trading_enabled', () => {
        expect(engine.isPaperTradingEnabled()).toBe(true)
        done()
      })
      engine.enablePaperTrading()
    })

    it('should disable paper trading', (done) => {
      engine.enablePaperTrading()
      engine.on('paper_trading_disabled', () => {
        expect(engine.isPaperTradingEnabled()).toBe(false)
        done()
      })
      engine.disablePaperTrading()
    })
  })

  describe('market data updates', () => {
    beforeEach(() => {
      engine.enablePaperTrading()
    })

    it('should update market data', () => {
      const marketData = {
        symbol: 'BTC/USD',
        price: 50000,
        bid: 49950,
        ask: 50050,
        timestamp: Date.now()
      }
      engine.updateMarketData('BTC/USD', marketData)
      // Market data is private, but we can verify it works through order execution
    })
  })

  describe('order placement', () => {
    beforeEach(() => {
      engine.enablePaperTrading()
      engine.updateMarketData('BTC/USD', {
        symbol: 'BTC/USD',
        price: 50000,
        bid: 49950,
        ask: 50050,
        timestamp: Date.now()
      })
    })

    it('should reject orders when paper trading is disabled', async () => {
      engine.disablePaperTrading()
      const result = await engine.placeOrder({
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'market',
        amount: 1
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Paper trading is not enabled')
    })

    it('should reject orders without market data', async () => {
      const result = await engine.placeOrder({
        symbol: 'ETH/USD',
        side: 'buy',
        type: 'market',
        amount: 1
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('No market data available for symbol')
    })

    it('should reject orders with insufficient balance', async () => {
      const result = await engine.placeOrder({
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'market',
        amount: 3 // 3 BTC at $50,050 = $150,150 > $100,000
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Insufficient balance')
    })

    it('should place a market buy order', async () => {
      const result = await engine.placeOrder({
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'market',
        amount: 1
      })
      expect(result.success).toBe(true)
      expect(result.orderId).toBeDefined()
    })

    it('should place a limit buy order', async () => {
      const result = await engine.placeOrder({
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'limit',
        amount: 1,
        price: 49000
      })
      expect(result.success).toBe(true)
      expect(result.orderId).toBeDefined()
    })

    it('should place a stop-loss order', async () => {
      const result = await engine.placeOrder({
        symbol: 'BTC/USD',
        side: 'sell',
        type: 'stop-loss',
        amount: 1,
        stopPrice: 48000
      })
      expect(result.success).toBe(true)
      expect(result.orderId).toBeDefined()
    })

    it('should lock funds when placing buy order', async () => {
      const balanceBefore = engine.getBalance('USD')!
      await engine.placeOrder({
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'market',
        amount: 1
      })
      
      // Wait for order to be processed
      await new Promise(resolve => setTimeout(resolve, 150))
      
      const balanceAfter = engine.getBalance('USD')!
      expect(balanceAfter.available).toBeLessThan(balanceBefore.available)
    })
  })

  describe('order cancellation', () => {
    let orderId: string

    beforeEach(async () => {
      engine.enablePaperTrading()
      engine.updateMarketData('BTC/USD', {
        symbol: 'BTC/USD',
        price: 50000,
        bid: 49950,
        ask: 50050,
        timestamp: Date.now()
      })
      
      const result = await engine.placeOrder({
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'limit',
        amount: 1,
        price: 49000
      })
      orderId = result.orderId!
    })

    it('should cancel pending order', async () => {
      const result = await engine.cancelOrder(orderId)
      expect(result.success).toBe(true)
    })

    it('should not cancel non-existent order', async () => {
      const result = await engine.cancelOrder('invalid_id')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Order not found')
    })

    it('should unlock funds after cancellation', async () => {
      const balanceBefore = engine.getBalance('USD')!
      await engine.cancelOrder(orderId)
      const balanceAfter = engine.getBalance('USD')!
      expect(balanceAfter.available).toBeGreaterThan(balanceBefore.available)
    })
  })

  describe('order execution', () => {
    beforeEach(() => {
      engine.enablePaperTrading()
    })

    it('should execute market buy order immediately', (done) => {
      engine.updateMarketData('BTC/USD', {
        symbol: 'BTC/USD',
        price: 50000,
        bid: 49950,
        ask: 50050,
        timestamp: Date.now()
      })

      engine.on('order_filled', (order) => {
        expect(order.status).toBe('filled')
        expect(order.filledPrice).toBeGreaterThan(50050) // With slippage
        expect(order.filledAmount).toBe(0.1)
        done()
      })

      engine.placeOrder({
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'market',
        amount: 0.1
      })
    })

    it('should execute limit order when price matches', (done) => {
      engine.updateMarketData('BTC/USD', {
        symbol: 'BTC/USD',
        price: 50000,
        bid: 49950,
        ask: 50050,
        timestamp: Date.now()
      })

      engine.on('order_filled', (order) => {
        expect(order.status).toBe('filled')
        expect(order.filledPrice).toBe(49000)
        done()
      })

      engine.placeOrder({
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'limit',
        amount: 0.1,
        price: 49000
      })

      // Simulate price drop
      setTimeout(() => {
        engine.updateMarketData('BTC/USD', {
          symbol: 'BTC/USD',
          price: 48900,
          bid: 48850,
          ask: 48950,
          timestamp: Date.now()
        })
      }, 150)
    })

    it('should update balances after execution', async () => {
      engine.updateMarketData('BTC/USD', {
        symbol: 'BTC/USD',
        price: 50000,
        bid: 49950,
        ask: 50050,
        timestamp: Date.now()
      })

      const usdBefore = engine.getBalance('USD')!.total
      const btcBefore = engine.getBalance('BTC')!.total

      await engine.placeOrder({
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'market',
        amount: 0.1
      })

      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 150))

      const usdAfter = engine.getBalance('USD')!.total
      const btcAfter = engine.getBalance('BTC')!.total

      expect(usdAfter).toBeLessThan(usdBefore)
      expect(btcAfter).toBeGreaterThan(btcBefore)
      expect(btcAfter).toBe(0.1)
    })
  })

  describe('position management', () => {
    beforeEach(async () => {
      engine.enablePaperTrading()
      engine.updateMarketData('BTC/USD', {
        symbol: 'BTC/USD',
        price: 50000,
        bid: 49950,
        ask: 50050,
        timestamp: Date.now()
      })

      // Execute a buy order to create a position
      await engine.placeOrder({
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'market',
        amount: 0.1
      })

      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    it('should create position after order execution', () => {
      const positions = engine.getPositions()
      expect(positions.length).toBe(1)
      expect(positions[0].symbol).toBe('BTC/USD')
      expect(positions[0].side).toBe('long')
      expect(positions[0].amount).toBe(0.1)
    })

    it('should update position PnL with price changes', (done) => {
      engine.on('position_updated', (position) => {
        if (position.currentPrice === 51000) {
          expect(position.unrealizedPnL).toBeGreaterThan(0)
          done()
        }
      })

      engine.updateMarketData('BTC/USD', {
        symbol: 'BTC/USD',
        price: 51000,
        bid: 50950,
        ask: 51050,
        timestamp: Date.now()
      })
    })

    it('should average position price on multiple orders', async () => {
      // Place another buy order
      await engine.placeOrder({
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'market',
        amount: 0.1
      })

      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 150))

      const positions = engine.getPositions()
      expect(positions.length).toBe(1)
      expect(positions[0].amount).toBe(0.2)
    })
  })

  describe('portfolio management', () => {
    it('should calculate total portfolio value', async () => {
      engine.enablePaperTrading()
      engine.updateMarketData('BTC/USD', {
        symbol: 'BTC/USD',
        price: 50000,
        bid: 49950,
        ask: 50050,
        timestamp: Date.now()
      })

      const initialValue = engine.getTotalPortfolioValue()
      expect(initialValue).toBe(100000)

      // Buy some BTC
      await engine.placeOrder({
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'market',
        amount: 1
      })

      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 150))

      const newValue = engine.getTotalPortfolioValue()
      // Should be roughly the same (minus slippage/fees)
      expect(newValue).toBeCloseTo(100000, 0)
    })
  })

  describe('getters', () => {
    beforeEach(async () => {
      engine.enablePaperTrading()
      engine.updateMarketData('BTC/USD', {
        symbol: 'BTC/USD',
        price: 50000,
        bid: 49950,
        ask: 50050,
        timestamp: Date.now()
      })

      // Place multiple orders
      await engine.placeOrder({
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'market',
        amount: 0.1
      })

      await engine.placeOrder({
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'limit',
        amount: 0.1,
        price: 49000
      })
    })

    it('should get all orders', () => {
      const orders = engine.getOrders()
      expect(orders.length).toBeGreaterThanOrEqual(2)
    })

    it('should get open orders only', () => {
      const openOrders = engine.getOpenOrders()
      // Market order should be filled, limit order should be pending
      expect(openOrders.length).toBe(1)
      expect(openOrders[0].type).toBe('limit')
    })

    it('should get all balances', () => {
      const balances = engine.getBalances()
      expect(balances.length).toBeGreaterThan(0)
      expect(balances.find(b => b.currency === 'USD')).toBeDefined()
    })
  })

  describe('reset', () => {
    it('should reset all state', async () => {
      engine.enablePaperTrading()
      engine.updateMarketData('BTC/USD', {
        symbol: 'BTC/USD',
        price: 50000,
        bid: 49950,
        ask: 50050,
        timestamp: Date.now()
      })

      // Place an order
      await engine.placeOrder({
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'market',
        amount: 0.1
      })

      // Reset
      engine.reset(50000)

      // Check everything is cleared
      expect(engine.getOrders().length).toBe(0)
      expect(engine.getPositions().length).toBe(0)
      expect(engine.getBalance('USD')?.total).toBe(50000)
      expect(engine.getBalance('BTC')?.total).toBe(0)
    })
  })
})