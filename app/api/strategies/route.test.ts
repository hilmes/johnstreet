import { GET, POST, PUT, DELETE } from './route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

describe('/api/strategies', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com'
    }
  }

  const mockStrategy = {
    name: 'BTC Bull Strategy',
    description: 'Buy BTC when sentiment is positive',
    enabled: true,
    rules: [
      {
        id: 'rule-1',
        condition: {
          type: 'sentiment' as const,
          operator: 'greater' as const,
          value: 0.7,
          symbol: 'BTC'
        },
        action: {
          type: 'buy' as const,
          percentage: 10
        }
      }
    ]
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
  })

  describe('GET - List Strategies', () => {
    it('should return empty array for new user', async () => {
      const request = new NextRequest('http://localhost:3000/api/strategies')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('should return 401 for unauthenticated requests', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/strategies')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('should handle errors gracefully', async () => {
      ;(getServerSession as jest.Mock).mockRejectedValueOnce(new Error('Session error'))

      const request = new NextRequest('http://localhost:3000/api/strategies')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to fetch strategies' })
    })
  })

  describe('POST - Create Strategy', () => {
    it('should create a new strategy', async () => {
      const request = new NextRequest('http://localhost:3000/api/strategies', {
        method: 'POST',
        body: JSON.stringify(mockStrategy)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        ...mockStrategy,
        id: expect.stringMatching(/^strategy_\d+_[a-z0-9]+$/),
        userId: 'user-123',
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      })
    })

    it('should validate strategy name', async () => {
      const invalidStrategy = {
        ...mockStrategy,
        name: ''
      }

      const request = new NextRequest('http://localhost:3000/api/strategies', {
        method: 'POST',
        body: JSON.stringify(invalidStrategy)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Invalid strategy: name and at least one rule required'
      })
    })

    it('should validate rules array', async () => {
      const invalidStrategy = {
        ...mockStrategy,
        rules: []
      }

      const request = new NextRequest('http://localhost:3000/api/strategies', {
        method: 'POST',
        body: JSON.stringify(invalidStrategy)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Invalid strategy: name and at least one rule required'
      })
    })

    it('should create strategy with multiple rules', async () => {
      const complexStrategy = {
        ...mockStrategy,
        rules: [
          mockStrategy.rules[0],
          {
            id: 'rule-2',
            condition: {
              type: 'price' as const,
              operator: 'less' as const,
              value: 40000,
              symbol: 'BTC'
            },
            action: {
              type: 'sell' as const,
              percentage: 50
            }
          }
        ]
      }

      const request = new NextRequest('http://localhost:3000/api/strategies', {
        method: 'POST',
        body: JSON.stringify(complexStrategy)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.rules).toHaveLength(2)
    })

    it('should return 401 for unauthenticated requests', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/strategies', {
        method: 'POST',
        body: JSON.stringify(mockStrategy)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })
  })

  describe('PUT - Update Strategy', () => {
    it('should update an existing strategy', async () => {
      // First create a strategy
      const createRequest = new NextRequest('http://localhost:3000/api/strategies', {
        method: 'POST',
        body: JSON.stringify(mockStrategy)
      })
      const createResponse = await POST(createRequest)
      const createdStrategy = await createResponse.json()

      // Now update it
      const updates = {
        id: createdStrategy.id,
        name: 'Updated BTC Strategy',
        enabled: false
      }

      const updateRequest = new NextRequest('http://localhost:3000/api/strategies', {
        method: 'PUT',
        body: JSON.stringify(updates)
      })

      const response = await PUT(updateRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        ...createdStrategy,
        name: 'Updated BTC Strategy',
        enabled: false,
        updatedAt: expect.any(String)
      })
      expect(new Date(data.updatedAt).getTime()).toBeGreaterThan(
        new Date(createdStrategy.updatedAt).getTime()
      )
    })

    it('should require strategy ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/strategies', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Strategy'
          // Missing id
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Strategy ID required' })
    })

    it('should return 404 for non-existent strategy', async () => {
      const request = new NextRequest('http://localhost:3000/api/strategies', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'non-existent-id',
          name: 'Updated Strategy'
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Strategy not found' })
    })

    it('should not allow updating other users strategies', async () => {
      // Create a strategy
      const createRequest = new NextRequest('http://localhost:3000/api/strategies', {
        method: 'POST',
        body: JSON.stringify(mockStrategy)
      })
      const createResponse = await POST(createRequest)
      const createdStrategy = await createResponse.json()

      // Change session to different user
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: 'different-user-456' }
      })

      const updateRequest = new NextRequest('http://localhost:3000/api/strategies', {
        method: 'PUT',
        body: JSON.stringify({
          id: createdStrategy.id,
          name: 'Hacked Strategy'
        })
      })

      const response = await PUT(updateRequest)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Strategy not found' })
    })

    it('should preserve readonly fields during update', async () => {
      // Create a strategy
      const createRequest = new NextRequest('http://localhost:3000/api/strategies', {
        method: 'POST',
        body: JSON.stringify(mockStrategy)
      })
      const createResponse = await POST(createRequest)
      const createdStrategy = await createResponse.json()

      // Try to update readonly fields
      const updateRequest = new NextRequest('http://localhost:3000/api/strategies', {
        method: 'PUT',
        body: JSON.stringify({
          id: createdStrategy.id,
          name: 'Updated Name',
          userId: 'hacker-789', // Should be ignored
          createdAt: new Date('2020-01-01'), // Should be ignored
        })
      })

      const response = await PUT(updateRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.userId).toBe('user-123') // Original user ID preserved
      expect(data.createdAt).toBe(createdStrategy.createdAt) // Original creation date preserved
    })
  })

  describe('DELETE - Delete Strategy', () => {
    it('should delete an existing strategy', async () => {
      // First create a strategy
      const createRequest = new NextRequest('http://localhost:3000/api/strategies', {
        method: 'POST',
        body: JSON.stringify(mockStrategy)
      })
      const createResponse = await POST(createRequest)
      const createdStrategy = await createResponse.json()

      // Delete it
      const deleteRequest = new NextRequest(
        `http://localhost:3000/api/strategies?id=${createdStrategy.id}`,
        { method: 'DELETE' }
      )

      const response = await DELETE(deleteRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ message: 'Strategy deleted' })

      // Verify it's deleted
      const getRequest = new NextRequest('http://localhost:3000/api/strategies')
      const getResponse = await GET(getRequest)
      const strategies = await getResponse.json()
      expect(strategies).toEqual([])
    })

    it('should require strategy ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/strategies', {
        method: 'DELETE'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Strategy ID required' })
    })

    it('should return 404 for non-existent strategy', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/strategies?id=non-existent-id',
        { method: 'DELETE' }
      )

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Strategy not found' })
    })

    it('should not allow deleting other users strategies', async () => {
      // Create a strategy
      const createRequest = new NextRequest('http://localhost:3000/api/strategies', {
        method: 'POST',
        body: JSON.stringify(mockStrategy)
      })
      const createResponse = await POST(createRequest)
      const createdStrategy = await createResponse.json()

      // Change session to different user
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: 'different-user-456' }
      })

      const deleteRequest = new NextRequest(
        `http://localhost:3000/api/strategies?id=${createdStrategy.id}`,
        { method: 'DELETE' }
      )

      const response = await DELETE(deleteRequest)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Strategy not found' })
    })

    it('should return 401 for unauthenticated requests', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

      const request = new NextRequest(
        'http://localhost:3000/api/strategies?id=some-id',
        { method: 'DELETE' }
      )

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })
  })
})