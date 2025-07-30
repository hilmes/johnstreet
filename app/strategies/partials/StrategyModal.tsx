/**
 * Modal component for viewing and editing strategy details
 */
'use client'

import React, { memo, useState, useCallback, useEffect } from 'react'
import { Strategy, StrategyFormData } from '../types'
import { dieterRamsDesign as ds } from '@/lib/design/DieterRamsDesignSystem'

interface StrategyModalProps {
  strategy: Strategy | null
  isOpen: boolean
  mode: 'view' | 'edit' | 'create'
  onClose: () => void
  onSave?: (data: StrategyFormData) => void
}

/**
 * Modal for strategy CRUD operations with form validation
 */
export const StrategyModal = memo<StrategyModalProps>(({
  strategy,
  isOpen,
  mode,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<StrategyFormData>({
    name: '',
    description: '',
    type: 'momentum',
    status: 'testing',
    timeframe: '5m',
    symbols: [],
    code: '',
    language: 'python'
  })

  const [errors, setErrors] = useState<Partial<Record<keyof StrategyFormData, string>>>({})

  // Initialize form data when strategy changes
  useEffect(() => {
    if (strategy && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: strategy.name,
        description: strategy.description,
        type: strategy.type,
        status: strategy.status,
        timeframe: strategy.timeframe,
        symbols: strategy.symbols,
        code: strategy.code || '',
        language: strategy.language || 'python'
      })
    } else if (mode === 'create') {
      setFormData({
        name: '',
        description: '',
        type: 'momentum',
        status: 'testing',
        timeframe: '5m',
        symbols: [],
        code: '',
        language: 'python'
      })
    }
    setErrors({})
  }, [strategy, mode])

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof StrategyFormData, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Strategy name is required'
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }
    if (formData.symbols.length === 0) {
      newErrors.symbols = 'At least one symbol is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleSave = useCallback(() => {
    if (validateForm() && onSave) {
      onSave(formData)
      onClose()
    }
  }, [formData, onSave, onClose, validateForm])

  const handleInputChange = useCallback((field: keyof StrategyFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }, [errors])

  const handleSymbolsChange = useCallback((value: string) => {
    const symbols = value.split(',').map(s => s.trim()).filter(s => s.length > 0)
    handleInputChange('symbols', symbols)
  }, [handleInputChange])

  if (!isOpen) return null

  const isReadOnly = mode === 'view'
  const title = mode === 'create' ? 'Create Strategy' : mode === 'edit' ? 'Edit Strategy' : 'Strategy Details'

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: ds.spacing.lg
    }}>
      <div style={{
        backgroundColor: ds.colors.background.primary,
        borderRadius: ds.borderRadius.large,
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: ds.shadows.large
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: ds.spacing.lg,
          borderBottom: `1px solid ${ds.colors.border}`
        }}>
          <h2 style={{ ...ds.typography.h2, margin: 0 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: ds.colors.text.secondary,
              padding: ds.spacing.xs
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: ds.spacing.lg }}>
          <div style={{
            display: 'grid',
            gap: ds.spacing.lg
          }}>
            {/* Basic Information */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: ds.spacing.md
            }}>
              <div>
                <label style={{ ...ds.typography.label, display: 'block', marginBottom: ds.spacing.xs }}>
                  Strategy Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  readOnly={isReadOnly}
                  style={{
                    ...ds.inputs.text,
                    width: '100%',
                    borderColor: errors.name ? ds.colors.error : ds.colors.border
                  }}
                />
                {errors.name && (
                  <div style={{ ...ds.typography.caption, color: ds.colors.error, marginTop: ds.spacing.xs }}>
                    {errors.name}
                  </div>
                )}
              </div>

              <div>
                <label style={{ ...ds.typography.label, display: 'block', marginBottom: ds.spacing.xs }}>
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  disabled={isReadOnly}
                  style={{ ...ds.inputs.select, width: '100%' }}
                >
                  <option value="momentum">Momentum</option>
                  <option value="mean_reversion">Mean Reversion</option>
                  <option value="scalping">Scalping</option>
                  <option value="market_making">Market Making</option>
                  <option value="ai_generated">AI Generated</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ ...ds.typography.label, display: 'block', marginBottom: ds.spacing.xs }}>
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                readOnly={isReadOnly}
                rows={3}
                style={{
                  ...ds.inputs.text,
                  width: '100%',
                  resize: 'vertical',
                  borderColor: errors.description ? ds.colors.error : ds.colors.border
                }}
              />
              {errors.description && (
                <div style={{ ...ds.typography.caption, color: ds.colors.error, marginTop: ds.spacing.xs }}>
                  {errors.description}
                </div>
              )}
            </div>

            {/* Configuration */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: ds.spacing.md
            }}>
              <div>
                <label style={{ ...ds.typography.label, display: 'block', marginBottom: ds.spacing.xs }}>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  disabled={isReadOnly}
                  style={{ ...ds.inputs.select, width: '100%' }}
                >
                  <option value="testing">Testing</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="stopped">Stopped</option>
                </select>
              </div>

              <div>
                <label style={{ ...ds.typography.label, display: 'block', marginBottom: ds.spacing.xs }}>
                  Timeframe
                </label>
                <select
                  value={formData.timeframe}
                  onChange={(e) => handleInputChange('timeframe', e.target.value)}
                  disabled={isReadOnly}
                  style={{ ...ds.inputs.select, width: '100%' }}
                >
                  <option value="1s">1 Second</option>
                  <option value="1m">1 Minute</option>
                  <option value="5m">5 Minutes</option>
                  <option value="15m">15 Minutes</option>
                  <option value="1h">1 Hour</option>
                  <option value="4h">4 Hours</option>
                  <option value="1d">1 Day</option>
                </select>
              </div>

              <div>
                <label style={{ ...ds.typography.label, display: 'block', marginBottom: ds.spacing.xs }}>
                  Language
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => handleInputChange('language', e.target.value)}
                  disabled={isReadOnly}
                  style={{ ...ds.inputs.select, width: '100%' }}
                >
                  <option value="python">Python</option>
                  <option value="typescript">TypeScript</option>
                  <option value="rust">Rust</option>
                  <option value="go">Go</option>
                </select>
              </div>
            </div>

            {/* Symbols */}
            <div>
              <label style={{ ...ds.typography.label, display: 'block', marginBottom: ds.spacing.xs }}>
                Trading Symbols * (comma-separated)
              </label>
              <input
                type="text"
                value={formData.symbols.join(', ')}
                onChange={(e) => handleSymbolsChange(e.target.value)}
                readOnly={isReadOnly}
                placeholder="BTC/USD, ETH/USD, SOL/USD"
                style={{
                  ...ds.inputs.text,
                  width: '100%',
                  borderColor: errors.symbols ? ds.colors.error : ds.colors.border
                }}
              />
              {errors.symbols && (
                <div style={{ ...ds.typography.caption, color: ds.colors.error, marginTop: ds.spacing.xs }}>
                  {errors.symbols}
                </div>
              )}
            </div>

            {/* Code */}
            <div>
              <label style={{ ...ds.typography.label, display: 'block', marginBottom: ds.spacing.xs }}>
                Strategy Code
              </label>
              <textarea
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                readOnly={isReadOnly}
                rows={12}
                style={{
                  ...ds.inputs.text,
                  width: '100%',
                  fontFamily: 'Monaco, "Courier New", monospace',
                  fontSize: '0.85rem',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Performance Metrics (View Mode Only) */}
            {mode === 'view' && strategy && (
              <div style={{
                borderTop: `1px solid ${ds.colors.border}`,
                paddingTop: ds.spacing.lg
              }}>
                <h3 style={{ ...ds.typography.h3, marginBottom: ds.spacing.md }}>
                  Performance Metrics
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: ds.spacing.md
                }}>
                  <div>
                    <div style={{ ...ds.typography.caption, color: ds.colors.text.secondary }}>
                      Total P&L
                    </div>
                    <div style={{
                      ...ds.typography.h4,
                      color: strategy.performance.totalPnl >= 0 ? ds.colors.success : ds.colors.error
                    }}>
                      ${strategy.performance.totalPnl.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ ...ds.typography.caption, color: ds.colors.text.secondary }}>
                      Win Rate
                    </div>
                    <div style={{ ...ds.typography.h4 }}>
                      {(strategy.performance.winRate * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ ...ds.typography.caption, color: ds.colors.text.secondary }}>
                      Sharpe Ratio
                    </div>
                    <div style={{ ...ds.typography.h4 }}>
                      {strategy.performance.sharpeRatio.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{ ...ds.typography.caption, color: ds.colors.text.secondary }}>
                      Total Trades
                    </div>
                    <div style={{ ...ds.typography.h4 }}>
                      {strategy.performance.totalTrades.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {!isReadOnly && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: ds.spacing.md,
            padding: ds.spacing.lg,
            borderTop: `1px solid ${ds.colors.border}`
          }}>
            <button
              onClick={onClose}
              style={ds.buttons.secondary}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={ds.buttons.primary}
            >
              {mode === 'create' ? 'Create Strategy' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

StrategyModal.displayName = 'StrategyModal'