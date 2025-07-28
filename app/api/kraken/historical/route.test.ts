import { GET } from './route'
import { NextRequest } from 'next/server'

// Mock fetch
global.fetch = jest.fn()

describe('GET /api/kraken/historical', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    console.log = jest.fn()
    console.error = jest.fn()
  })

  it('fetches historical data with default parameters', async () => {
    const mockKrakenResponse = {
      error: [],
      result: {
        'XXBTZUSD': [
          [1640000000, '50000', '50100', '49900', '50050', '50025', '100', 1000],
          [1640000060, '50050', '50150', '49950', '50100', '50075', '110', 1100],
          [1640000120, '50100', '50200', '50000', '50150', '50125', '120', 1200],
        ],
        last: 1640000180
      }
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockKrakenResponse
    })

    const request = new NextRequest('http://localhost:3000/api/kraken/historical')
    const response = await GET(request)
    const data = await response.json()

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.kraken.com/0/public/OHLC'),
      expect.objectContaining({
        method: 'GET',
        headers: {
          'User-Agent': 'JohnStreet Trading Platform'
        }
      })
    )

    expect(data).toEqual({
      symbol: 'BTC/USD',
      interval: '1m',
      count: 3,
      history: expect.arrayContaining([
        expect.objectContaining({
          time: 1640000000000,
          price: 50050,
          open: 50000,
          high: 50100,
          low: 49900,
          close: 50050,
          volume: 100
        })
      ])
    })
  })

  it('handles custom parameters correctly', async () => {
    const mockKrakenResponse = {
      error: [],
      result: {
        'XETHZUSD': Array(100).fill([1640000000, '2800', '2850', '2750', '2820', '2810', '50', 500])
      }
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockKrakenResponse
    })

    const request = new NextRequest('http://localhost:3000/api/kraken/historical?symbol=ETH/USD&interval=5m&count=20')
    const response = await GET(request)
    const data = await response.json()

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(fetchCall).toContain('pair=ETH/USD')
    expect(fetchCall).toContain('interval=5')
    
    expect(data.symbol).toBe('ETH/USD')
    expect(data.interval).toBe('5m')
    expect(data.count).toBe(20)
    expect(data.history).toHaveLength(20)
  })

  it('converts BTC to XBT for Kraken API', async () => {
    const mockKrakenResponse = {
      error: [],
      result: {
        'XXBTZUSD': [[1640000000, '50000', '50100', '49900', '50050', '50025', '100', 1000]]
      }
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockKrakenResponse
    })

    const request = new NextRequest('http://localhost:3000/api/kraken/historical?symbol=BTC/USD')
    await GET(request)

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(fetchCall).toContain('pair=XBT/USD')
  })

  it('maps interval values correctly', async () => {
    const intervals = [
      { input: '1m', expected: '1' },
      { input: '5m', expected: '5' },
      { input: '15m', expected: '15' },
      { input: '30m', expected: '30' },
      { input: '1h', expected: '60' },
      { input: '4h', expected: '240' },
      { input: '1d', expected: '1440' }
    ]

    for (const { input, expected } of intervals) {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: [], result: { 'XXBTZUSD': [] } })
      })

      const request = new NextRequest(`http://localhost:3000/api/kraken/historical?interval=${input}`)
      await GET(request)

      const fetchCall = (global.fetch as jest.Mock).mock.calls[global.fetch.mock.calls.length - 1][0]
      expect(fetchCall).toContain(`interval=${expected}`)
    }
  })

  it('handles Kraken API HTTP errors', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 503
    })

    const request = new NextRequest('http://localhost:3000/api/kraken/historical')
    const response = await GET(request)
    const data = await response.json()

    expect(data.error).toBe('Using mock data due to API error')
    expect(data.interval).toBe('mock')
    expect(data.history).toBeDefined()
    expect(data.history.length).toBeGreaterThan(0)
  })

  it('handles Kraken API error responses', async () => {
    const mockKrakenResponse = {
      error: ['EGeneral:Invalid arguments'],
      result: {}
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockKrakenResponse
    })

    const request = new NextRequest('http://localhost:3000/api/kraken/historical')
    const response = await GET(request)
    const data = await response.json()

    expect(data.error).toBe('Using mock data due to API error')
    expect(data.history).toBeDefined()
  })

  it('handles missing data in Kraken response', async () => {
    const mockKrakenResponse = {
      error: [],
      result: {
        last: 1640000180
        // Missing pair data
      }
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockKrakenResponse
    })

    const request = new NextRequest('http://localhost:3000/api/kraken/historical')
    const response = await GET(request)
    const data = await response.json()

    expect(data.error).toBe('Using mock data due to API error')
    expect(data.history).toBeDefined()
  })

  it('handles network errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    const request = new NextRequest('http://localhost:3000/api/kraken/historical')
    const response = await GET(request)
    const data = await response.json()

    expect(console.error).toHaveBeenCalledWith('Historical data API error:', expect.any(Error))
    expect(data.error).toBe('Using mock data due to API error')
    expect(data.history).toBeDefined()
    expect(data.history.length).toBeGreaterThan(0)
  })

  it('returns correct mock data structure for BTC', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API error'))

    const request = new NextRequest('http://localhost:3000/api/kraken/historical?symbol=BTC/USD')
    const response = await GET(request)
    const data = await response.json()

    expect(data.symbol).toBe('BTC/USD')
    expect(data.history).toBeDefined()
    
    data.history.forEach((point: any) => {
      expect(point).toHaveProperty('time')
      expect(point).toHaveProperty('price')
      expect(point).toHaveProperty('open')
      expect(point).toHaveProperty('high')
      expect(point).toHaveProperty('low')
      expect(point).toHaveProperty('close')
      expect(point).toHaveProperty('volume')
      
      // BTC mock price should be around 45000
      expect(point.price).toBeGreaterThan(40000)
      expect(point.price).toBeLessThan(50000)
    })
  })

  it('returns correct mock data structure for ETH', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API error'))

    const request = new NextRequest('http://localhost:3000/api/kraken/historical?symbol=ETH/USD')
    const response = await GET(request)
    const data = await response.json()

    expect(data.symbol).toBe('ETH/USD')
    
    data.history.forEach((point: any) => {
      // ETH mock price should be around 2800
      expect(point.price).toBeGreaterThan(2500)
      expect(point.price).toBeLessThan(3100)
    })
  })

  it('limits returned data points to requested count', async () => {
    const mockKrakenResponse = {
      error: [],
      result: {
        'XXBTZUSD': Array(200).fill([1640000000, '50000', '50100', '49900', '50050', '50025', '100', 1000])
      }
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockKrakenResponse
    })

    const request = new NextRequest('http://localhost:3000/api/kraken/historical?count=10')
    const response = await GET(request)
    const data = await response.json()

    expect(data.history).toHaveLength(10)
    expect(data.count).toBe(10)
  })

  it('calculates since parameter correctly', async () => {
    const now = Date.now()
    const expectedSince = Math.floor((now - (24 * 60 * 60 * 1000)) / 1000)

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: [], result: { 'XXBTZUSD': [] } })
    })

    const request = new NextRequest('http://localhost:3000/api/kraken/historical')
    await GET(request)

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0]
    const urlParams = new URLSearchParams(fetchCall.split('?')[1])
    const sincePara = parseInt(urlParams.get('since') || '0')
    
    // Allow for some time difference during test execution
    expect(Math.abs(sincePara - expectedSince)).toBeLessThan(5)
  })
})