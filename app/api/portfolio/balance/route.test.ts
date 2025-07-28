import { GET } from './route'
import axios from 'axios'
import { NextResponse } from 'next/server'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('/api/portfolio/balance', () => {
  const mockEnv = {
    KRAKEN_API_KEY: 'test-api-key',
    KRAKEN_API_SECRET: 'dGVzdC1hcGktc2VjcmV0' // base64 encoded 'test-api-secret'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...mockEnv }
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('GET', () => {
    it('should return balance data successfully', async () => {
      const mockBalance = {
        ZUSD: '1000.0000',
        XXBT: '0.10000000',
        XETH: '2.00000000'
      }

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          error: [],
          result: mockBalance
        }
      })

      const response = await GET()
      const data = await response.json()

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.kraken.com/0/private/Balance',
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: expect.objectContaining({
            'API-Key': 'test-api-key',
            'API-Sign': expect.any(String),
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      )

      expect(data).toEqual(mockBalance)
      expect(response.status).toBe(200)
    })

    it('should handle Kraken API errors', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          error: ['Invalid API key'],
          result: {}
        }
      })

      const response = await GET()
      const data = await response.json()

      expect(data).toEqual({ error: 'Invalid API key' })
      expect(response.status).toBe(400)
    })

    it('should handle network errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

      const response = await GET()
      const data = await response.json()

      expect(data).toEqual({ error: 'Failed to fetch balance data' })
      expect(response.status).toBe(500)
    })

    it('should handle missing environment variables', async () => {
      delete process.env.KRAKEN_API_KEY
      delete process.env.KRAKEN_API_SECRET

      await expect(GET()).rejects.toThrow()
    })
  })
})