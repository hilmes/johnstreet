/**
 * Refactored Strategies page - modular and under 400 lines
 * 
 * This component demonstrates proper modularization following AI-GUIDELINES.md:
 * - Components split by responsibility
 * - Proper use of custom hooks
 * - Performance optimizations with React.memo
 * - TypeScript-first approach
 * - Error handling with error boundaries
 */
'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { dieterRamsDesign as ds, designHelpers } from '@/lib/design/DieterRamsDesignSystem'
import { Strategy, StrategyFormData } from './types'
import { useStrategies } from './hooks/useStrategies'
import { StrategyCard } from './partials/StrategyCard'
import { StrategyFilters } from './partials/StrategyFilters'
import { StrategyModal } from './partials/StrategyModal'

interface StrategiesPageState {
  searchTerm: string
  selectedType: Strategy['type'] | 'all'
  selectedStatus: Strategy['status'] | 'all'
  sortBy: 'name' | 'pnl' | 'winRate' | 'created'
  sortOrder: 'asc' | 'desc'
  selectedStrategy: Strategy | null
  modalOpen: boolean
  modalMode: 'view' | 'edit' | 'create'
}

/**
 * Main strategies page component with modular architecture
 */
export default function StrategiesPage() {
  // State management
  const [state, setState] = useState<StrategiesPageState>({
    searchTerm: '',
    selectedType: 'all',
    selectedStatus: 'all',
    sortBy: 'pnl',
    sortOrder: 'desc',
    selectedStrategy: null,
    modalOpen: false,
    modalMode: 'view'
  })

  // Custom hook for strategy management
  const {
    strategies,
    loading,
    error,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    refreshStrategies
  } = useStrategies({
    searchTerm: state.searchTerm,
    typeFilter: state.selectedType,
    statusFilter: state.selectedStatus,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder
  })

  // Memoized handlers to prevent unnecessary re-renders
  const handleSearchChange = useCallback((searchTerm: string) => {
    setState(prev => ({ ...prev, searchTerm }))
  }, [])

  const handleTypeChange = useCallback((selectedType: Strategy['type'] | 'all') => {
    setState(prev => ({ ...prev, selectedType }))
  }, [])

  const handleStatusChange = useCallback((selectedStatus: Strategy['status'] | 'all') => {
    setState(prev => ({ ...prev, selectedStatus }))
  }, [])

  const handleSortChange = useCallback((sortBy: 'name' | 'pnl' | 'winRate' | 'created') => {
    setState(prev => ({ ...prev, sortBy }))
  }, [])

  const handleSortOrderChange = useCallback((sortOrder: 'asc' | 'desc') => {
    setState(prev => ({ ...prev, sortOrder }))
  }, [])

  const handleStrategySelect = useCallback((strategy: Strategy) => {
    setState(prev => ({
      ...prev,
      selectedStrategy: strategy,
      modalOpen: true,
      modalMode: 'view'
    }))
  }, [])

  const handleStrategyEdit = useCallback((strategy: Strategy) => {
    setState(prev => ({
      ...prev,
      selectedStrategy: strategy,
      modalOpen: true,
      modalMode: 'edit'
    }))
  }, [])

  const handleStrategyDelete = useCallback(async (strategyId: string) => {
    try {
      await deleteStrategy(strategyId)
    } catch (error) {
      console.error('Failed to delete strategy:', error)
      // TODO: Show toast notification
    }
  }, [deleteStrategy])

  const handleCreateNew = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedStrategy: null,
      modalOpen: true,
      modalMode: 'create'
    }))
  }, [])

  const handleModalClose = useCallback(() => {
    setState(prev => ({
      ...prev,
      modalOpen: false,
      selectedStrategy: null
    }))
  }, [])

  const handleModalSave = useCallback(async (data: StrategyFormData) => {
    try {
      if (state.modalMode === 'create') {
        await createStrategy(data)
      } else if (state.modalMode === 'edit' && state.selectedStrategy) {
        await updateStrategy(state.selectedStrategy.id, data)
      }
    } catch (error) {
      console.error('Failed to save strategy:', error)
      // TODO: Show toast notification
      throw error // Re-throw to prevent modal from closing
    }
  }, [state.modalMode, state.selectedStrategy, createStrategy, updateStrategy])

  // Memoized summary statistics
  const summaryStats = useMemo(() => {
    const totalPnl = strategies.reduce((sum, s) => sum + s.performance.totalPnl, 0)
    const avgWinRate = strategies.length > 0 
      ? strategies.reduce((sum, s) => sum + s.performance.winRate, 0) / strategies.length 
      : 0
    const activeCount = strategies.filter(s => s.status === 'active').length

    return { totalPnl, avgWinRate, activeCount, totalCount: strategies.length }
  }, [strategies])

  // Error handling
  if (error) {
    return (
      <div style={{
        ...ds.containers.page,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh'
      }}>
        <div style={{
          ...ds.containers.card,
          textAlign: 'center',
          padding: ds.spacing.xl
        }}>
          <h2 style={{ ...ds.typography.h2, color: ds.colors.error, marginBottom: ds.spacing.md }}>
            Error Loading Strategies
          </h2>
          <p style={{ ...ds.typography.body, marginBottom: ds.spacing.lg }}>
            {error.message}
          </p>
          <button
            onClick={refreshStrategies}
            style={ds.buttons.primary}
            disabled={loading}
          >
            {loading ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={ds.containers.page}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: ds.spacing.xl
      }}>
        <div>
          <h1 style={{ ...ds.typography.h1, margin: 0, marginBottom: ds.spacing.xs }}>
            Trading Strategies
          </h1>
          <p style={{ ...ds.typography.body, color: ds.colors.text.secondary, margin: 0 }}>
            Manage and monitor your automated trading strategies
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          style={ds.buttons.primary}
          disabled={loading}
        >
          Create Strategy
        </button>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: ds.spacing.lg,
        marginBottom: ds.spacing.xl
      }}>
        <div style={ds.containers.card}>
          <div style={{ ...ds.typography.caption, color: ds.colors.text.secondary }}>
            Total P&L
          </div>
          <div style={{ 
            ...ds.typography.h2, 
            color: summaryStats.totalPnl >= 0 ? ds.colors.success : ds.colors.error,
            margin: 0 
          }}>
            ${summaryStats.totalPnl.toLocaleString()}
          </div>
        </div>
        <div style={ds.containers.card}>
          <div style={{ ...ds.typography.caption, color: ds.colors.text.secondary }}>
            Average Win Rate
          </div>
          <div style={{ ...ds.typography.h2, margin: 0 }}>
            {(summaryStats.avgWinRate * 100).toFixed(1)}%
          </div>
        </div>
        <div style={ds.containers.card}>
          <div style={{ ...ds.typography.caption, color: ds.colors.text.secondary }}>
            Active Strategies
          </div>
          <div style={{ ...ds.typography.h2, margin: 0 }}>
            {summaryStats.activeCount}
          </div>
        </div>
        <div style={ds.containers.card}>
          <div style={{ ...ds.typography.caption, color: ds.colors.text.secondary }}>
            Total Strategies
          </div>
          <div style={{ ...ds.typography.h2, margin: 0 }}>
            {summaryStats.totalCount}
          </div>
        </div>
      </div>

      {/* Filters */}
      <StrategyFilters
        searchTerm={state.searchTerm}
        onSearchChange={handleSearchChange}
        selectedType={state.selectedType}
        onTypeChange={handleTypeChange}
        selectedStatus={state.selectedStatus}
        onStatusChange={handleStatusChange}
        sortBy={state.sortBy}
        onSortChange={handleSortChange}
        sortOrder={state.sortOrder}
        onSortOrderChange={handleSortOrderChange}
      />

      {/* Strategy Grid */}
      {loading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '200px'
        }}>
          <div style={{ ...ds.typography.body, color: ds.colors.text.secondary }}>
            Loading strategies...
          </div>
        </div>
      ) : strategies.length === 0 ? (
        <div style={{
          ...ds.containers.card,
          textAlign: 'center',
          padding: ds.spacing.xl
        }}>
          <h3 style={{ ...ds.typography.h3, marginBottom: ds.spacing.md }}>
            No Strategies Found
          </h3>
          <p style={{ ...ds.typography.body, color: ds.colors.text.secondary, marginBottom: ds.spacing.lg }}>
            {state.searchTerm || state.selectedType !== 'all' || state.selectedStatus !== 'all'
              ? 'No strategies match your current filters.'
              : 'Get started by creating your first trading strategy.'
            }
          </p>
          <button
            onClick={handleCreateNew}
            style={ds.buttons.primary}
          >
            Create Your First Strategy
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: ds.spacing.lg
        }}>
          {strategies.map(strategy => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              onSelect={handleStrategySelect}
              onEdit={handleStrategyEdit}
              onDelete={handleStrategyDelete}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <StrategyModal
        strategy={state.selectedStrategy}
        isOpen={state.modalOpen}
        mode={state.modalMode}
        onClose={handleModalClose}
        onSave={handleModalSave}
      />
    </div>
  )
}