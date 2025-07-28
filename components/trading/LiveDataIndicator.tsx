'use client'

import React, { useState } from 'react'
import { ds } from '@/lib/design/TufteDesignSystem'

interface LiveDataIndicatorProps {
  symbol: string
}

export const LiveDataIndicator: React.FC<LiveDataIndicatorProps> = ({ symbol }) => {
  const [testResult, setTestResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const testLiveData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/kraken/orderbook/test?symbol=${symbol}`)
      const data = await response.json()
      setTestResult(data)
    } catch (error) {
      setTestResult({ error: 'Failed to fetch test data', isLive: false })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      backgroundColor: ds.colors.semantic.surface,
      border: `1px solid ${ds.colors.semantic.border}`,
      borderRadius: ds.radius.md,
      padding: ds.spacing.md,
      marginBottom: ds.spacing.lg
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: ds.spacing.sm
      }}>
        <h4 style={{
          fontSize: ds.typography.scale.sm,
          fontWeight: ds.typography.weights.semibold,
          margin: 0,
          color: ds.colors.neutral[900]
        }}>
          Live Data Verification
        </h4>
        
        <button
          onClick={testLiveData}
          disabled={isLoading}
          style={{
            padding: `${ds.spacing.xs} ${ds.spacing.sm}`,
            backgroundColor: ds.colors.semantic.active,
            color: ds.colors.neutral[0],
            border: 'none',
            borderRadius: ds.radius.sm,
            fontSize: ds.typography.scale.xs,
            fontWeight: ds.typography.weights.medium,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            transition: 'opacity 150ms ease'
          }}
        >
          {isLoading ? 'Testing...' : 'Test Live Order Book'}
        </button>
      </div>

      {testResult && (
        <div style={{
          backgroundColor: testResult.isLive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${testResult.isLive ? ds.colors.semantic.profit : ds.colors.semantic.loss}`,
          borderRadius: ds.radius.sm,
          padding: ds.spacing.sm,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: ds.spacing.xs,
            marginBottom: ds.spacing.xs
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: testResult.isLive ? ds.colors.semantic.profit : ds.colors.semantic.loss
            }} />
            <span style={{
              fontSize: ds.typography.scale.xs,
              fontWeight: ds.typography.weights.semibold,
              color: testResult.isLive ? ds.colors.semantic.profit : ds.colors.semantic.loss
            }}>
              {testResult.isLive ? 'LIVE DATA CONFIRMED' : 'USING DEMO DATA'}
            </span>
          </div>
          
          {testResult.isLive && (
            <div style={{
              fontSize: ds.typography.scale.xs,
              color: ds.colors.neutral[400],
              fontFamily: ds.typography.secondary
            }}>
              <div>Best Bid: ${testResult.bestBid?.toFixed(2)}</div>
              <div>Best Ask: ${testResult.bestAsk?.toFixed(2)}</div>
              <div>Spread: ${testResult.spread?.toFixed(2)} ({testResult.spreadPercent?.toFixed(3)}%)</div>
              <div>Source: {testResult.source}</div>
              <div>Updated: {new Date(testResult.timestamp).toLocaleTimeString()}</div>
            </div>
          )}

          {testResult.error && (
            <div style={{
              fontSize: ds.typography.scale.xs,
              color: ds.colors.semantic.loss,
              fontFamily: ds.typography.secondary
            }}>
              Error: {testResult.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}