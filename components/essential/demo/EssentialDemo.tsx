'use client'

import React, { useState, useEffect } from 'react'
import { UnifiedDashboard, TradingSignal, PerformanceData, SimpleOrder, TradingSettings } from '../index'

// Mock data for demonstration
const mockSignal: TradingSignal = {
  id: 'sig_demo_001',
  symbol: 'BTC/USD',
  action: 'BUY',
  strength: 0.85,
  confidence: 0.78,
  timeframe: '15m',
  source: {
    sentiment: {
      score: 0.7,
      confidence: 0.8,
      keywords: ['bullish', 'momentum', 'breakout'],
      sources: ['reddit', 'twitter'],
      volume: 1250
    },
    marketData: {
      symbol: 'BTC/USD',
      price: 43250.00,
      volume24h: 28500000,
      priceChange24h: 0.034,
      volatility: 0.15,
      bid: 43240.00,
      ask: 43260.00,
      timestamp: Date.now()
    }
  },
  metadata: {
    sentimentVelocity: 0.15,
    volumeProfile: 'increasing',
    riskLevel: 'medium',
    correlatedSymbols: ['ETH/USD', 'SOL/USD']
  },
  createdAt: Date.now(),
  expiresAt: Date.now() + (15 * 60 * 1000), // 15 minutes
  priority: 8
}

const mockPortfolio: PerformanceData = {
  dailyPnL: 1247.85,
  totalPortfolioValue: 125430.50,
  openPositions: [
    {
      id: 'pos_001',
      symbol: 'BTC/USD',
      side: 'long',
      size: 0.5,
      avgPrice: 42800.00,
      currentPrice: 43250.00,
      unrealizedPnl: 225.00,
      change: 1.05
    },
    {
      id: 'pos_002',
      symbol: 'ETH/USD',
      side: 'long',
      size: 5.2,
      avgPrice: 2650.00,
      currentPrice: 2695.50,
      unrealizedPnl: 236.60,
      change: 1.72
    }
  ],
  chartData: [124500, 124800, 124200, 125100, 124950, 125430],
  stats: {
    winRate: 68.5,
    bestTrade: 892.50,
    worstTrade: -234.80,
    totalTrades: 47
  }
}

const mockSettings: TradingSettings = {
  riskProfile: 'moderate',
  autoExecute: false,
  maxDailyLoss: 2500
}

export const EssentialDemo: React.FC = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([mockSignal])
  const [portfolio, setPortfolio] = useState<PerformanceData>(mockPortfolio)
  const [settings, setSettings] = useState<TradingSettings>(mockSettings)
  const [balance] = useState(15000)

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update portfolio values slightly
      setPortfolio(prev => ({
        ...prev,
        dailyPnL: prev.dailyPnL + (Math.random() - 0.5) * 10,
        totalPortfolioValue: prev.totalPortfolioValue + (Math.random() - 0.5) * 100,
        openPositions: prev.openPositions.map(pos => ({
          ...pos,
          currentPrice: pos.currentPrice + (Math.random() - 0.5) * pos.currentPrice * 0.001,
          unrealizedPnl: pos.unrealizedPnl + (Math.random() - 0.5) * 20
        }))
      }))

      // Occasionally generate new signals
      if (Math.random() < 0.1) {
        const newSignal: TradingSignal = {
          ...mockSignal,
          id: `sig_demo_${Date.now()}`,
          symbol: ['BTC/USD', 'ETH/USD', 'SOL/USD'][Math.floor(Math.random() * 3)],
          action: Math.random() > 0.5 ? 'BUY' : 'SELL',
          strength: 0.6 + Math.random() * 0.4,
          confidence: 0.6 + Math.random() * 0.4,
          createdAt: Date.now(),
          expiresAt: Date.now() + (15 * 60 * 1000)
        }
        setSignals([newSignal])
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const handleAcceptSignal = async (signal: TradingSignal) => {
    console.log('Accepting signal:', signal)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  const handleDismissSignal = async (signalId: string) => {
    console.log('Dismissing signal:', signalId)
    setSignals(prev => prev.filter(s => s.id !== signalId))
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  const handleExecuteTrade = async (order: SimpleOrder) => {
    console.log('Executing trade:', order)
    // Simulate trade execution
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Add to positions
    const newPosition = {
      id: `pos_${Date.now()}`,
      symbol: order.symbol,
      side: order.side === 'buy' ? 'long' as const : 'short' as const,
      size: order.size,
      avgPrice: mockSignal.source.marketData.price,
      currentPrice: mockSignal.source.marketData.price,
      unrealizedPnl: 0,
      change: 0
    }
    
    setPortfolio(prev => ({
      ...prev,
      openPositions: [...prev.openPositions, newPosition]
    }))
  }

  const handleClosePosition = async (positionId: string) => {
    console.log('Closing position:', positionId)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setPortfolio(prev => ({
      ...prev,
      openPositions: prev.openPositions.filter(p => p.id !== positionId)
    }))
  }

  const handleUpdateSettings = async (newSettings: Partial<TradingSettings>) => {
    console.log('Updating settings:', newSettings)
    setSettings(prev => ({ ...prev, ...newSettings }))
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: '20px'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#1a1a1a',
          marginBottom: '8px'
        }}>
          Essential Trading Components Demo
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#666',
          marginBottom: '20px'
        }}>
          Simplified architecture focused on Signal → Execute → Track workflow
        </p>
        
        <div style={{
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px'
        }}>
          <strong>Demo Features:</strong>
          <ul style={{ margin: '8px 0 0 20px', color: '#1976d2' }}>
            <li>Real-time signal updates every 3 seconds</li>
            <li>Mock portfolio value fluctuations</li>
            <li>Interactive trade execution workflow</li>
            <li>Position management with one-click close</li>
            <li>Settings panel with risk profile selection</li>
          </ul>
        </div>
      </div>

      <UnifiedDashboard
        signals={signals}
        portfolio={portfolio}
        settings={settings}
        balance={balance}
        onAcceptSignal={handleAcceptSignal}
        onDismissSignal={handleDismissSignal}
        onExecuteTrade={handleExecuteTrade}
        onClosePosition={handleClosePosition}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  )
}

export default EssentialDemo