import { POST, GET } from './route'
import { NextRequest } from 'next/server'
import { KrakenService } from '@/services/KrakenService'

// Mock the KrakenService
jest.mock('@/services/KrakenService')

describe('/api/trading/order', () => {
  let mockKrakenService: jest.Mocked<KrakenService>

  beforeEach(() => {
    jest.clearAllMocks()
    mockKrakenService = {
      addOrder: jest.fn(),
      queryOrders: jest.fn()
    } as any
    ;(KrakenService as jest.MockedClass<typeof KrakenService>).mockImplementation(() => mockKrakenService)
  })

  describe('POST - Place Order', () => {
    it('should successfully place a market order', async () => {
      const mockOrderResponse = {
        txid: ['OXH2WS-XXXXX-YYYYY'],
        descr: { order: 'buy 0.1 XXBTZUSD @ market' }
      }
      mockKrakenService.addOrder.mockResolvedValueOnce(mockOrderResponse)

      const request = new NextRequest('http://localhost:3000/api/trading/order', {
        method: 'POST',
        body: JSON.stringify({
          symbol: 'BTC/USD',
          side: 'buy',
          type: 'market',
          amount: 0.1
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(mockKrakenService.addOrder).toHaveBeenCalledWith({
        pair: 'XXBTZUSD',
        type: 'buy',
        ordertype: 'market',
        volume: 0.1,
        validate: false
      })

      expect(data).toEqual({
        success: true,
        txid: ['OXH2WS-XXXXX-YYYYY'],
        orderId: 'OXH2WS-XXXXX-YYYYY',
        description: 'buy 0.1 XXBTZUSD @ market'
      })
      expect(response.status).toBe(200)
    })

    it('should successfully place a limit order', async () => {
      const mockOrderResponse = {
        txid: ['OXH2WS-XXXXX-ZZZZZ'],
        descr: { order: 'sell 0.5 XETHZUSD @ limit 2000' }
      }
      mockKrakenService.addOrder.mockResolvedValueOnce(mockOrderResponse)

      const request = new NextRequest('http://localhost:3000/api/trading/order', {
        method: 'POST',
        body: JSON.stringify({
          symbol: 'ETH/USD',
          side: 'sell',
          type: 'limit',
          amount: 0.5,
          price: 2000
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(mockKrakenService.addOrder).toHaveBeenCalledWith({
        pair: 'XETHZUSD',
        type: 'sell',
        ordertype: 'limit',
        volume: 0.5,
        price: 2000,
        validate: false
      })

      expect(data.success).toBe(true)
      expect(data.orderId).toBe('OXH2WS-XXXXX-ZZZZZ')
    })

    it('should successfully place a stop-loss order', async () => {
      const mockOrderResponse = {
        txid: ['OXH2WS-XXXXX-AAAAA'],
        descr: { order: 'sell 1 XXBTZUSD @ stop loss 40000' }
      }
      mockKrakenService.addOrder.mockResolvedValueOnce(mockOrderResponse)

      const request = new NextRequest('http://localhost:3000/api/trading/order', {
        method: 'POST',
        body: JSON.stringify({
          symbol: 'BTC/USD',
          side: 'sell',
          type: 'stop-loss',
          amount: 1,
          price: 39000,
          stopPrice: 40000
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(mockKrakenService.addOrder).toHaveBeenCalledWith({
        pair: 'XXBTZUSD',
        type: 'sell',
        ordertype: 'stop-loss',
        volume: 1,
        price: 39000,
        price2: 40000,
        validate: false
      })

      expect(data.success).toBe(true)
    })

    it('should validate order when validate flag is true', async () => {
      const mockOrderResponse = {
        txid: [],
        descr: { order: 'buy 0.1 XXBTZUSD @ market (validation only)' }
      }
      mockKrakenService.addOrder.mockResolvedValueOnce(mockOrderResponse)

      const request = new NextRequest('http://localhost:3000/api/trading/order', {
        method: 'POST',
        body: JSON.stringify({
          symbol: 'BTC/USD',
          side: 'buy',
          type: 'market',
          amount: 0.1,
          validate: true
        })
      })

      const response = await POST(request)
      
      expect(mockKrakenService.addOrder).toHaveBeenCalledWith({
        pair: 'XXBTZUSD',
        type: 'buy',
        ordertype: 'market',
        volume: 0.1,
        validate: true
      })
    })

    it('should handle missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/trading/order', {
        method: 'POST',
        body: JSON.stringify({
          symbol: 'BTC/USD',
          side: 'buy'
          // Missing type and amount
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({
        success: false,
        error: 'Missing required fields: symbol, side, type, amount'
      })
      expect(response.status).toBe(400)
      expect(mockKrakenService.addOrder).not.toHaveBeenCalled()
    })

    it('should require price for limit orders', async () => {
      const request = new NextRequest('http://localhost:3000/api/trading/order', {
        method: 'POST',
        body: JSON.stringify({
          symbol: 'BTC/USD',
          side: 'buy',
          type: 'limit',
          amount: 0.1
          // Missing price
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({
        success: false,
        error: 'Price is required for non-market orders'
      })
      expect(response.status).toBe(400)
    })

    it('should require stop price for stop-loss orders', async () => {
      const request = new NextRequest('http://localhost:3000/api/trading/order', {
        method: 'POST',
        body: JSON.stringify({
          symbol: 'BTC/USD',
          side: 'sell',
          type: 'stop-loss',
          amount: 0.1,
          price: 39000
          // Missing stopPrice
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({
        success: false,
        error: 'Stop price is required for stop-loss orders'
      })
      expect(response.status).toBe(400)
    })

    it('should handle KrakenService errors', async () => {
      mockKrakenService.addOrder.mockRejectedValueOnce(new Error('Insufficient funds'))

      const request = new NextRequest('http://localhost:3000/api/trading/order', {
        method: 'POST',
        body: JSON.stringify({
          symbol: 'BTC/USD',
          side: 'buy',
          type: 'market',
          amount: 100
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({
        success: false,
        error: 'Insufficient funds'
      })
      expect(response.status).toBe(500)
    })

    it('should handle various symbol formats', async () => {
      const testCases = [
        { input: 'BTC/USD', expected: 'XXBTZUSD' },
        { input: 'BTCUSD', expected: 'XXBTZUSD' },
        { input: 'BTC-USD', expected: 'XXBTZUSD' },
        { input: 'ETH/USD', expected: 'XETHZUSD' },
        { input: 'XRP/USD', expected: 'XXRPZUSD' },
        { input: 'ADA/USD', expected: 'ADAUSD' },
        { input: 'DOT/USD', expected: 'DOTUSD' },
        { input: 'LINK/USD', expected: 'LINKUSD' }
      ]

      for (const { input, expected } of testCases) {
        mockKrakenService.addOrder.mockResolvedValueOnce({
          txid: ['test-txid'],
          descr: { order: 'test order' }
        })

        const request = new NextRequest('http://localhost:3000/api/trading/order', {
          method: 'POST',
          body: JSON.stringify({
            symbol: input,
            side: 'buy',
            type: 'market',
            amount: 0.1
          })
        })

        await POST(request)

        expect(mockKrakenService.addOrder).toHaveBeenCalledWith(
          expect.objectContaining({ pair: expected })
        )
      }
    })
  })

  describe('GET - Query Order Status', () => {
    it('should successfully query order status', async () => {
      const mockOrderInfo = {
        'OXH2WS-XXXXX-YYYYY': {
          status: 'closed',
          vol_exec: '0.1',
          cost: '4500.00',
          fee: '6.75',
          price: '45000.00'
        }
      }
      mockKrakenService.queryOrders.mockResolvedValueOnce(mockOrderInfo)

      const request = new NextRequest('http://localhost:3000/api/trading/order?txid=OXH2WS-XXXXX-YYYYY')

      const response = await GET(request)
      const data = await response.json()

      expect(mockKrakenService.queryOrders).toHaveBeenCalledWith(['OXH2WS-XXXXX-YYYYY'], true)
      expect(data).toEqual({
        success: true,
        order: mockOrderInfo['OXH2WS-XXXXX-YYYYY']
      })
      expect(response.status).toBe(200)
    })

    it('should handle missing txid parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/trading/order')

      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual({
        success: false,
        error: 'Transaction ID (txid) is required'
      })
      expect(response.status).toBe(400)
      expect(mockKrakenService.queryOrders).not.toHaveBeenCalled()
    })

    it('should handle order not found', async () => {
      mockKrakenService.queryOrders.mockResolvedValueOnce({})

      const request = new NextRequest('http://localhost:3000/api/trading/order?txid=INVALID-TXID')

      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual({
        success: true,
        order: null
      })
    })

    it('should handle KrakenService query errors', async () => {
      mockKrakenService.queryOrders.mockRejectedValueOnce(new Error('API Error'))

      const request = new NextRequest('http://localhost:3000/api/trading/order?txid=OXH2WS-XXXXX-YYYYY')

      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual({
        success: false,
        error: 'API Error'
      })
      expect(response.status).toBe(500)
    })
  })
})