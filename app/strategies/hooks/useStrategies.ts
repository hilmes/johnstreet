/**
 * Custom hook for strategy management with SWR integration
 */
'use client'

import { useMemo, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import { Strategy, StrategyFormData } from '../types'
import { mockStrategies } from '../mock-data'

interface UseStrategiesOptions {
  searchTerm?: string
  typeFilter?: Strategy['type'] | 'all'
  statusFilter?: Strategy['status'] | 'all'
  sortBy?: 'name' | 'pnl' | 'winRate' | 'created'
  sortOrder?: 'asc' | 'desc'
}

interface UseStrategiesReturn {
  strategies: Strategy[]
  loading: boolean
  error: Error | null
  createStrategy: (data: StrategyFormData) => Promise<void>
  updateStrategy: (id: string, data: StrategyFormData) => Promise<void>
  deleteStrategy: (id: string) => Promise<void>
  refreshStrategies: () => Promise<void>
}

/**
 * API fetcher function for SWR
 */
const fetcher = async (url: string): Promise<Strategy[]> => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    // For now, return mock data when API is not available
    console.warn('API unavailable, using mock data:', error)
    return mockStrategies
  }
}

/**
 * Hook for managing strategy data with filtering, sorting, and CRUD operations
 */
export const useStrategies = (options: UseStrategiesOptions = {}): UseStrategiesReturn => {
  const {
    searchTerm = '',
    typeFilter = 'all',
    statusFilter = 'all',
    sortBy = 'name',
    sortOrder = 'asc'
  } = options

  // SWR for data fetching with automatic caching and revalidation
  const { 
    data: rawStrategies = [], 
    error, 
    isLoading: loading,
    mutate: revalidate
  } = useSWR<Strategy[]>('/api/strategies', fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 30000, // Refresh every 30 seconds
    dedupingInterval: 5000, // Dedupe requests within 5 seconds
    errorRetryCount: 3,
    errorRetryInterval: 1000,
    onError: (error) => {
      console.error('Error fetching strategies:', error)
    }
  })

  // Filter and sort strategies
  const filteredAndSortedStrategies = useMemo(() => {
    let filtered = rawStrategies

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(strategy => 
        strategy.name.toLowerCase().includes(term) ||
        strategy.description.toLowerCase().includes(term)
      )
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(strategy => strategy.type === typeFilter)
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(strategy => strategy.status === statusFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'pnl':
          aValue = a.performance.totalPnl
          bValue = b.performance.totalPnl
          break
        case 'winRate':
          aValue = a.performance.winRate
          bValue = b.performance.winRate
          break
        case 'created':
          aValue = a.createdAt.getTime()
          bValue = b.createdAt.getTime()
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [rawStrategies, searchTerm, typeFilter, statusFilter, sortBy, sortOrder])

  /**
   * Create a new strategy with optimistic updates
   */
  const createStrategy = useCallback(async (data: StrategyFormData): Promise<void> => {
    const newStrategy: Strategy = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date(),
      lastActive: new Date(),
      performance: {
        totalPnl: 0,
        dailyPnl: 0,
        winRate: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        totalTrades: 0,
        avgTradeSize: 0
      },
      riskMetrics: {
        volatility: 0,
        valueAtRisk: 0,
        beta: 0
      }
    }

    // Optimistic update - immediately update local cache
    await mutate('/api/strategies', 
      async (currentData: Strategy[] = []) => {
        try {
          // Simulate API call
          const response = await fetch('/api/strategies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const createdStrategy = await response.json()
          return [...currentData, createdStrategy]
        } catch (error) {
          // If API fails, use optimistic data
          console.warn('API create failed, using optimistic update:', error)
          return [...currentData, newStrategy]
        }
      },
      {
        optimisticData: [...rawStrategies, newStrategy],
        rollbackOnError: true,
        revalidate: false
      }
    )
  }, [rawStrategies])

  /**
   * Update an existing strategy with optimistic updates
   */
  const updateStrategy = useCallback(async (id: string, data: StrategyFormData): Promise<void> => {
    await mutate('/api/strategies',
      async (currentData: Strategy[] = []) => {
        try {
          const response = await fetch(`/api/strategies/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const updatedStrategy = await response.json()
          return currentData.map(strategy =>
            strategy.id === id ? updatedStrategy : strategy
          )
        } catch (error) {
          // If API fails, use optimistic data
          console.warn('API update failed, using optimistic update:', error)
          return currentData.map(strategy =>
            strategy.id === id
              ? { ...strategy, ...data, lastActive: new Date() }
              : strategy
          )
        }
      },
      {
        optimisticData: rawStrategies.map(strategy =>
          strategy.id === id
            ? { ...strategy, ...data, lastActive: new Date() }
            : strategy
        ),
        rollbackOnError: true,
        revalidate: false
      }
    )
  }, [rawStrategies])

  /**
   * Delete a strategy with optimistic updates
   */
  const deleteStrategy = useCallback(async (id: string): Promise<void> => {
    await mutate('/api/strategies',
      async (currentData: Strategy[] = []) => {
        try {
          const response = await fetch(`/api/strategies/${id}`, {
            method: 'DELETE'
          })
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          return currentData.filter(strategy => strategy.id !== id)
        } catch (error) {
          // If API fails, use optimistic data
          console.warn('API delete failed, using optimistic update:', error)
          return currentData.filter(strategy => strategy.id !== id)
        }
      },
      {
        optimisticData: rawStrategies.filter(strategy => strategy.id !== id),
        rollbackOnError: true,
        revalidate: false
      }
    )
  }, [rawStrategies])

  /**
   * Manually refresh strategies data
   */
  const refreshStrategies = useCallback(async (): Promise<void> => {
    await revalidate()
  }, [revalidate])

  return {
    strategies: filteredAndSortedStrategies,
    loading,
    error,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    refreshStrategies
  }
}