import { GET } from './route'
import { NextRequest } from 'next/server'
import axios from 'axios'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('/api/kraken/ticker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should fetch ticker data for default pair', async () => {
      const mockTickerData = {
        XXBTZUSD: {
          a: ['43620.10000', '1', '1.000'],
          b: ['43620.00000', '1', '1.000'],
          c: ['43620.10000', '0.00229950'],
          v: ['59.55269590', '1088.28887833'],
          p: ['43599.65623', '43246.34839'],
          t: [291, 5830],
          l: ['43301.20000', '42567.60000'],
          h: ['43980.00000', '44121.10000'],
          o: '43580.10000'
        }
      }

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          error: [],
          result: mockTickerData
        }
      })

      const request = new NextRequest('http://localhost:3000/api/kraken/ticker')
      const response = await GET(request)
      const data = await response.json()

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.kraken.com/0/public/Ticker?pair=XXBTZUSD'
      )
      expect(data).toEqual(mockTickerData)
      expect(response.status).toBe(200)
    })

    it('should fetch ticker data for specified pair', async () => {
      const mockTickerData = {
        XETHZUSD: {
          a: ['2850.00000', '10', '10.000'],
          b: ['2849.90000', '5', '5.000'],
          c: ['2850.00000', '0.35000000'],
          v: ['892.40198740', '18234.58374651'],
          p: ['2838.57264', '2821.94572'],
          t: [892, 14578],
          l: ['2801.00000', '2756.10000'],
          h: ['2885.00000', '2895.40000'],
          o: '2830.00000'
        }
      }

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          error: [],
          result: mockTickerData
        }
      })

      const request = new NextRequest('http://localhost:3000/api/kraken/ticker?pair=XETHZUSD')
      const response = await GET(request)
      const data = await response.json()

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.kraken.com/0/public/Ticker?pair=XETHZUSD'
      )
      expect(data).toEqual(mockTickerData)
      expect(response.status).toBe(200)
    })

    it('should handle multiple pairs', async () => {
      const mockTickerData = {
        XXBTZUSD: {
          a: ['43620.10000', '1', '1.000'],
          b: ['43620.00000', '1', '1.000'],
          c: ['43620.10000', '0.00229950'],
          v: ['59.55269590', '1088.28887833'],
          p: ['43599.65623', '43246.34839'],
          t: [291, 5830],
          l: ['43301.20000', '42567.60000'],
          h: ['43980.00000', '44121.10000'],
          o: '43580.10000'
        },
        XETHZUSD: {
          a: ['2850.00000', '10', '10.000'],
          b: ['2849.90000', '5', '5.000'],
          c: ['2850.00000', '0.35000000'],
          v: ['892.40198740', '18234.58374651'],
          p: ['2838.57264', '2821.94572'],
          t: [892, 14578],
          l: ['2801.00000', '2756.10000'],
          h: ['2885.00000', '2895.40000'],
          o: '2830.00000'
        }
      }

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          error: [],
          result: mockTickerData
        }
      })

      const request = new NextRequest('http://localhost:3000/api/kraken/ticker?pair=XXBTZUSD,XETHZUSD')
      const response = await GET(request)
      const data = await response.json()

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.kraken.com/0/public/Ticker?pair=XXBTZUSD,XETHZUSD'
      )
      expect(data).toEqual(mockTickerData)
      expect(Object.keys(data)).toHaveLength(2)
    })

    it('should handle Kraken API errors', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          error: ['Invalid asset pair'],
          result: {}
        }
      })

      const request = new NextRequest('http://localhost:3000/api/kraken/ticker?pair=INVALID')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual({ error: 'Invalid asset pair' })
      expect(response.status).toBe(400)
    })

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'))

      const request = new NextRequest('http://localhost:3000/api/kraken/ticker')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual({ error: 'Failed to fetch ticker data' })
      expect(response.status).toBe(500)
    })

    it('should handle timeout errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('timeout of 5000ms exceeded'))

      const request = new NextRequest('http://localhost:3000/api/kraken/ticker?pair=XXBTZUSD')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual({ error: 'Failed to fetch ticker data' })
      expect(response.status).toBe(500)
    })

    it('should parse ticker response correctly', async () => {
      const mockTickerData = {
        XXBTZUSD: {
          a: ['43620.10000', '1', '1.000'], // ask: [price, whole lot volume, lot volume]
          b: ['43620.00000', '1', '1.000'], // bid: [price, whole lot volume, lot volume]
          c: ['43620.10000', '0.00229950'], // last trade closed: [price, lot volume]
          v: ['59.55269590', '1088.28887833'], // volume: [today, last 24 hours]
          p: ['43599.65623', '43246.34839'], // volume weighted average price: [today, last 24 hours]
          t: [291, 5830], // number of trades: [today, last 24 hours]
          l: ['43301.20000', '42567.60000'], // low: [today, last 24 hours]
          h: ['43980.00000', '44121.10000'], // high: [today, last 24 hours]
          o: '43580.10000' // today's opening price
        }
      }

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          error: [],
          result: mockTickerData
        }
      })

      const request = new NextRequest('http://localhost:3000/api/kraken/ticker')
      const response = await GET(request)
      const data = await response.json()

      const ticker = data.XXBTZUSD
      expect(ticker.a[0]).toBe('43620.10000') // Ask price
      expect(ticker.b[0]).toBe('43620.00000') // Bid price
      expect(ticker.c[0]).toBe('43620.10000') // Last price
      expect(ticker.v[1]).toBe('1088.28887833') // 24h volume
      expect(ticker.p[1]).toBe('43246.34839') // 24h VWAP
      expect(ticker.l[1]).toBe('42567.60000') // 24h low
      expect(ticker.h[1]).toBe('44121.10000') // 24h high
      expect(ticker.o).toBe('43580.10000') // Opening price
    })

    it('should handle empty pair parameter', async () => {
      const mockTickerData = {
        XXBTZUSD: {
          a: ['43620.10000', '1', '1.000'],
          b: ['43620.00000', '1', '1.000'],
          c: ['43620.10000', '0.00229950'],
          v: ['59.55269590', '1088.28887833'],
          p: ['43599.65623', '43246.34839'],
          t: [291, 5830],
          l: ['43301.20000', '42567.60000'],
          h: ['43980.00000', '44121.10000'],
          o: '43580.10000'
        }
      }

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          error: [],
          result: mockTickerData
        }
      })

      const request = new NextRequest('http://localhost:3000/api/kraken/ticker?pair=')
      const response = await GET(request)
      const data = await response.json()

      // Should default to XXBTZUSD
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.kraken.com/0/public/Ticker?pair=XXBTZUSD'
      )
      expect(data).toEqual(mockTickerData)
    })

    it('should handle API rate limiting', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded' }
        }
      })

      const request = new NextRequest('http://localhost:3000/api/kraken/ticker')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual({ error: 'Failed to fetch ticker data' })
      expect(response.status).toBe(500)
    })

    it('should handle malformed API responses', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: null
      })

      const request = new NextRequest('http://localhost:3000/api/kraken/ticker')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toBeNull()
      expect(response.status).toBe(200)
    })

    it('should handle special characters in pair names', async () => {
      const mockTickerData = {
        'XBT/USD': {
          a: ['43620.10000', '1', '1.000'],
          // ... other fields
        }
      }

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          error: [],
          result: mockTickerData
        }
      })

      const request = new NextRequest('http://localhost:3000/api/kraken/ticker?pair=XBT/USD')
      const response = await GET(request)
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.kraken.com/0/public/Ticker?pair=XBT/USD'
      )
      expect(response.status).toBe(200)
    })
  })
})