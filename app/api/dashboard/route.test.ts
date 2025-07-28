import { GET } from './route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

describe('/api/dashboard', () => {
  const mockSession = {
    user: {
      id: 'test-user-123',
      name: 'Test User',
      email: 'test@example.com'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
  })

  describe('GET - Dashboard Data', () => {
    it('should return dashboard data for authenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard')

      const response = await GET(request)
      const data = await response.json()

      expect(getServerSession).toHaveBeenCalled()
      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        portfolioValue: expect.any(Number),
        dailyPnL: expect.any(Number),
        positions: expect.arrayContaining([
          expect.objectContaining({
            symbol: expect.any(String),
            side: expect.stringMatching(/^(long|short)$/),
            size: expect.any(Number),
            avgPrice: expect.any(Number),
            currentPrice: expect.any(Number),
            unrealizedPnl: expect.any(Number),
            change: expect.any(Number),
            priceHistory: expect.any(Array)
          })
        ]),
        recentSignals: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            symbol: expect.any(String),
            action: expect.stringMatching(/^(BUY|SELL)$/),
            strength: expect.any(Number),
            timestamp: expect.any(String),
            status: expect.stringMatching(/^(active|expired|executed)$/)
          })
        ]),
        performanceChart: expect.arrayContaining([
          expect.objectContaining({
            time: expect.any(String),
            value: expect.any(Number)
          })
        ]),
        alerts: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            type: expect.stringMatching(/^(info|warning|error|success)$/),
            message: expect.any(String),
            timestamp: expect.any(String)
          })
        ])
      })
    })

    it('should return dashboard data with 1 day timeframe', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard?timeframe=1d')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.performanceChart).toHaveLength(24) // 24 hours
      expect(data.positions[0].priceHistory).toHaveLength(24)
    })

    it('should return dashboard data with 7 day timeframe', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard?timeframe=7d')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.performanceChart).toHaveLength(7) // 7 days
      expect(data.positions[0].priceHistory).toHaveLength(7)
    })

    it('should return dashboard data with 30 day timeframe', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard?timeframe=30d')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.performanceChart).toHaveLength(30) // 30 days
      expect(data.positions[0].priceHistory).toHaveLength(30)
    })

    it('should use default timeframe when not specified', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.performanceChart).toHaveLength(24) // Default is 1d
    })

    it('should calculate correct position metrics', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard')

      const response = await GET(request)
      const data = await response.json()

      // Verify BTC position calculations
      const btcPosition = data.positions.find((p: any) => p.symbol === 'BTC/USD')
      expect(btcPosition).toBeDefined()
      expect(btcPosition.side).toBe('long')
      expect(btcPosition.size).toBe(0.5)
      expect(btcPosition.avgPrice).toBe(43250)
      expect(btcPosition.currentPrice).toBe(44100)
      expect(btcPosition.unrealizedPnl).toBeCloseTo(425)
      expect(btcPosition.change).toBeCloseTo(1.96, 1)
    })

    it('should return portfolio performance metrics', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard')

      const response = await GET(request)
      const data = await response.json()

      expect(data.portfolioValue).toBe(125430.50)
      expect(data.dailyPnL).toBeCloseTo(2345.55, 2)
    })

    it('should include recent signals', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard')

      const response = await GET(request)
      const data = await response.json()

      expect(data.recentSignals).toHaveLength(2)
      expect(data.recentSignals[0]).toMatchObject({
        id: 'sig_1',
        symbol: 'BTC/USD',
        action: 'BUY',
        strength: 0.82,
        status: 'active'
      })
    })

    it('should include alerts', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard')

      const response = await GET(request)
      const data = await response.json()

      expect(data.alerts).toHaveLength(2)
      expect(data.alerts[0]).toMatchObject({
        id: 'alert_1',
        type: 'success',
        message: 'BTC/USD position hit take profit target'
      })
    })

    it('should return 401 for unauthenticated requests', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/dashboard')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('should handle errors gracefully', async () => {
      ;(getServerSession as jest.Mock).mockRejectedValueOnce(new Error('Session error'))

      const request = new NextRequest('http://localhost:3000/api/dashboard')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to fetch dashboard data' })
    })

    it('should generate price history with correct endpoint', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard')

      const response = await GET(request)
      const data = await response.json()

      const btcPosition = data.positions.find((p: any) => p.symbol === 'BTC/USD')
      const priceHistory = btcPosition.priceHistory

      // Last price should match current price
      expect(priceHistory[priceHistory.length - 1]).toBe(btcPosition.currentPrice)
      
      // Price history should have reasonable variation
      const minPrice = Math.min(...priceHistory)
      const maxPrice = Math.max(...priceHistory)
      expect(maxPrice - minPrice).toBeGreaterThan(0)
    })

    it('should format performance chart correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard?timeframe=1d')

      const response = await GET(request)
      const data = await response.json()

      expect(data.performanceChart).toHaveLength(24)
      data.performanceChart.forEach((point: any) => {
        expect(point).toHaveProperty('time')
        expect(point).toHaveProperty('value')
        expect(typeof point.time).toBe('string')
        expect(typeof point.value).toBe('number')
        // For 1d timeframe, time should be in time format
        expect(point.time).toMatch(/\d{1,2}:\d{2}:\d{2}/)
      })
    })

    it('should format performance chart for weekly timeframe', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard?timeframe=7d')

      const response = await GET(request)
      const data = await response.json()

      expect(data.performanceChart).toHaveLength(7)
      data.performanceChart.forEach((point: any) => {
        // For 7d timeframe, time should be in date format
        expect(point.time).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
      })
    })
  })
})