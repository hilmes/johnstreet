/**
 * Strategy filtering and search components
 */
'use client'

import React, { memo, useCallback } from 'react'
import { Strategy } from '../types'
import { dieterRamsDesign as ds } from '@/lib/design/DieterRamsDesignSystem'

interface StrategyFiltersProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  selectedType: Strategy['type'] | 'all'
  onTypeChange: (type: Strategy['type'] | 'all') => void
  selectedStatus: Strategy['status'] | 'all'
  onStatusChange: (status: Strategy['status'] | 'all') => void
  sortBy: 'name' | 'pnl' | 'winRate' | 'created'
  onSortChange: (sort: 'name' | 'pnl' | 'winRate' | 'created') => void
  sortOrder: 'asc' | 'desc'
  onSortOrderChange: (order: 'asc' | 'desc') => void
}

const strategyTypes: Array<{ value: Strategy['type'] | 'all', label: string }> = [
  { value: 'all', label: 'All Types' },
  { value: 'ai_generated', label: 'AI Generated' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'mean_reversion', label: 'Mean Reversion' },
  { value: 'scalping', label: 'Scalping' },
  { value: 'market_making', label: 'Market Making' }
]

const strategyStatuses: Array<{ value: Strategy['status'] | 'all', label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'testing', label: 'Testing' }
]

const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'pnl', label: 'P&L' },
  { value: 'winRate', label: 'Win Rate' },
  { value: 'created', label: 'Created Date' }
] as const

/**
 * Provides filtering and sorting controls for strategy list
 */
export const StrategyFilters = memo<StrategyFiltersProps>(({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedStatus,
  onStatusChange,
  sortBy,
  onSortChange,
  sortOrder,
  onSortOrderChange
}) => {
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value)
  }, [onSearchChange])

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onTypeChange(e.target.value as Strategy['type'] | 'all')
  }, [onTypeChange])

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onStatusChange(e.target.value as Strategy['status'] | 'all')
  }, [onStatusChange])

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onSortChange(e.target.value as 'name' | 'pnl' | 'winRate' | 'created')
  }, [onSortChange])

  const toggleSortOrder = useCallback(() => {
    onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')
  }, [sortOrder, onSortOrderChange])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: ds.spacing.md,
      padding: ds.spacing.lg,
      backgroundColor: ds.colors.background.secondary,
      borderRadius: ds.borderRadius.medium,
      marginBottom: ds.spacing.lg
    }}>
      {/* Search */}
      <div>
        <label style={{
          ...ds.typography.label,
          display: 'block',
          marginBottom: ds.spacing.xs
        }}>
          Search Strategies
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Search by name or description..."
          style={{
            ...ds.inputs.text,
            width: '100%'
          }}
        />
      </div>

      {/* Filters Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: ds.spacing.md
      }}>
        {/* Type Filter */}
        <div>
          <label style={{
            ...ds.typography.label,
            display: 'block',
            marginBottom: ds.spacing.xs
          }}>
            Strategy Type
          </label>
          <select
            value={selectedType}
            onChange={handleTypeChange}
            style={{
              ...ds.inputs.select,
              width: '100%'
            }}
          >
            {strategyTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label style={{
            ...ds.typography.label,
            display: 'block',
            marginBottom: ds.spacing.xs
          }}>
            Status
          </label>
          <select
            value={selectedStatus}
            onChange={handleStatusChange}
            style={{
              ...ds.inputs.select,
              width: '100%'
            }}
          >
            {strategyStatuses.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Options */}
        <div style={{ display: 'flex', gap: ds.spacing.sm, alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <label style={{
              ...ds.typography.label,
              display: 'block',
              marginBottom: ds.spacing.xs
            }}>
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={handleSortChange}
              style={{
                ...ds.inputs.select,
                width: '100%'
              }}
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={toggleSortOrder}
            style={{
              ...ds.buttons.secondary,
              minWidth: '60px',
              height: '40px',
              padding: `0 ${ds.spacing.sm}`
            }}
            title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>
    </div>
  )
})

StrategyFilters.displayName = 'StrategyFilters'