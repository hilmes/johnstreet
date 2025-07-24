'use client'

import React, { useState, useEffect } from 'react'
import { dieterRamsDesign as ds, designHelpers } from '@/lib/design/DieterRamsDesignSystem'

interface PaperPosition {
  id: string
  symbol: string
  side: 'long' | 'short'
  size: number
  entryPrice: number
  currentPrice: number
  pnl: number
  pnlPercent: number
  entryTime: number
  stopLoss?: number
  takeProfit?: number
}

interface PaperTrade {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  price: number
  size: number
  timestamp: number
  type: 'entry' | 'exit' | 'stop' | 'tp'
  pnl?: number
}

interface MarketPrice {
  symbol: string
  price: number
  change24h: number
  volume24h: number
}

interface AccountStats {
  startingBalance: number
  currentBalance: number
  totalPnL: number
  totalPnLPercent: number
  winRate: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  largestWin: number
  largestLoss: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  sharpeRatio: number
  maxDrawdown: number
  currentDrawdown: number
}

export default function PaperTradingPage() {
  const [positions, setPositions] = useState<PaperPosition[]>([])
  const [trades, setTrades] = useState<PaperTrade[]>([])
  const [accountStats, setAccountStats] = useState<AccountStats>({
    startingBalance: 100000,
    currentBalance: 100000,
    totalPnL: 0,
    totalPnLPercent: 0,
    winRate: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    largestWin: 0,
    largestLoss: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    currentDrawdown: 0,
  })
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USD')
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy')
  const [orderSize, setOrderSize] = useState('')
  const [orderPrice, setOrderPrice] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Mock market prices
  const [marketPrices, setMarketPrices] = useState<Record<string, MarketPrice>>({
    'BTC/USD': { symbol: 'BTC/USD', price: 69420, change24h: 2.5, volume24h: 45000 },
    'ETH/USD': { symbol: 'ETH/USD', price: 3850, change24h: -1.2, volume24h: 32000 },
    'SOL/USD': { symbol: 'SOL/USD', price: 178.50, change24h: 5.8, volume24h: 12000 },
  })

  // Update prices with random walk
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketPrices(prev => {
        const updated = { ...prev }
        Object.keys(updated).forEach(symbol => {
          const change = (Math.random() - 0.5) * 0.002 // 0.2% max change
          updated[symbol] = {
            ...updated[symbol],
            price: updated[symbol].price * (1 + change),
            change24h: updated[symbol].change24h + (Math.random() - 0.5) * 0.1,
          }
        })
        return updated
      })

      // Update position P&L
      setPositions(prev => prev.map(pos => {
        const currentPrice = marketPrices[pos.symbol]?.price || pos.currentPrice
        const pnl = pos.side === 'long' 
          ? (currentPrice - pos.entryPrice) * pos.size
          : (pos.entryPrice - currentPrice) * pos.size
        const pnlPercent = (pnl / (pos.entryPrice * pos.size)) * 100

        // Check stop loss and take profit
        if (pos.stopLoss && ((pos.side === 'long' && currentPrice <= pos.stopLoss) || 
            (pos.side === 'short' && currentPrice >= pos.stopLoss))) {
          handleClosePosition(pos.id, 'stop')
        } else if (pos.takeProfit && ((pos.side === 'long' && currentPrice >= pos.takeProfit) || 
            (pos.side === 'short' && currentPrice <= pos.takeProfit))) {
          handleClosePosition(pos.id, 'tp')
        }

        return { ...pos, currentPrice, pnl, pnlPercent }
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [marketPrices])

  const handleSubmitOrder = () => {
    if (!orderSize || parseFloat(orderSize) <= 0) return

    const size = parseFloat(orderSize)
    const price = orderType === 'limit' && orderPrice ? parseFloat(orderPrice) : marketPrices[selectedSymbol].price
    const sl = stopLoss ? parseFloat(stopLoss) : undefined
    const tp = takeProfit ? parseFloat(takeProfit) : undefined

    // Check if we have enough balance
    const requiredMargin = price * size
    const availableBalance = accountStats.currentBalance - positions.reduce((sum, p) => sum + p.entryPrice * p.size, 0)
    
    if (requiredMargin > availableBalance) {
      alert('Insufficient balance')
      return
    }

    // Create position
    const position: PaperPosition = {
      id: Date.now().toString(),
      symbol: selectedSymbol,
      side: orderSide === 'buy' ? 'long' : 'short',
      size,
      entryPrice: price,
      currentPrice: price,
      pnl: 0,
      pnlPercent: 0,
      entryTime: Date.now(),
      stopLoss: sl,
      takeProfit: tp,
    }

    // Create trade entry
    const trade: PaperTrade = {
      id: Date.now().toString(),
      symbol: selectedSymbol,
      side: orderSide,
      price,
      size,
      timestamp: Date.now(),
      type: 'entry',
    }

    setPositions(prev => [...prev, position])
    setTrades(prev => [trade, ...prev])

    // Reset form
    setOrderSize('')
    setOrderPrice('')
    setStopLoss('')
    setTakeProfit('')
  }

  const handleClosePosition = (positionId: string, type: 'manual' | 'stop' | 'tp' = 'manual') => {
    const position = positions.find(p => p.id === positionId)
    if (!position) return

    // Create exit trade
    const trade: PaperTrade = {
      id: Date.now().toString(),
      symbol: position.symbol,
      side: position.side === 'long' ? 'sell' : 'buy',
      price: position.currentPrice,
      size: position.size,
      timestamp: Date.now(),
      type: type === 'stop' ? 'stop' : type === 'tp' ? 'tp' : 'exit',
      pnl: position.pnl,
    }

    setTrades(prev => [trade, ...prev])
    setPositions(prev => prev.filter(p => p.id !== positionId))

    // Update account stats
    setAccountStats(prev => {
      const newBalance = prev.currentBalance + position.pnl
      const totalPnL = newBalance - prev.startingBalance
      const totalPnLPercent = (totalPnL / prev.startingBalance) * 100
      const isWin = position.pnl > 0
      const winningTrades = isWin ? prev.winningTrades + 1 : prev.winningTrades
      const losingTrades = !isWin ? prev.losingTrades + 1 : prev.losingTrades
      const totalTrades = prev.totalTrades + 1
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
      const largestWin = Math.max(prev.largestWin, position.pnl)
      const largestLoss = Math.min(prev.largestLoss, position.pnl)

      return {
        ...prev,
        currentBalance: newBalance,
        totalPnL,
        totalPnLPercent,
        totalTrades,
        winningTrades,
        losingTrades,
        winRate,
        largestWin,
        largestLoss,
      }
    })
  }

  const handleResetAccount = () => {
    setPositions([])
    setTrades([])
    setAccountStats({
      startingBalance: 100000,
      currentBalance: 100000,
      totalPnL: 0,
      totalPnLPercent: 0,
      winRate: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      largestWin: 0,
      largestLoss: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
    })
    setShowResetConfirm(false)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div style={{
      backgroundColor: ds.colors.semantic.background.primary,
      color: ds.colors.grayscale[90],
      minHeight: '100vh',
      fontFamily: ds.typography.families.interface,
    }}>
      {/* Header */}
      <header style={{
        padding: ds.spacing.large,
        borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
        backgroundColor: ds.colors.semantic.background.secondary,
      }}>
        <div style={{
          maxWidth: ds.grid.maxWidth,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h1 style={{
              fontSize: ds.typography.scale.xlarge,
              fontWeight: ds.typography.weights.semibold,
              margin: 0,
              marginBottom: ds.spacing.mini,
            }}>
              Paper Trading
            </h1>
            <p style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              margin: 0,
            }}>
              Practice trading with virtual funds in real market conditions
            </p>
          </div>

          <div style={{ display: 'flex', gap: ds.spacing.medium, alignItems: 'center' }}>
            <div style={{
              padding: `${ds.spacing.small} ${ds.spacing.medium}`,
              backgroundColor: ds.colors.semantic.background.tertiary,
              borderRadius: ds.interactive.radius.small,
              fontSize: ds.typography.scale.small,
              color: ds.colors.semantic.warning,
              fontWeight: ds.typography.weights.medium,
            }}>
              PAPER TRADING MODE
            </div>
            
            <button
              onClick={() => setShowResetConfirm(true)}
              style={{
                padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                backgroundColor: 'transparent',
                color: ds.colors.semantic.error,
                border: `1px solid ${ds.colors.semantic.error}`,
                borderRadius: ds.interactive.radius.medium,
                fontSize: ds.typography.scale.small,
                fontWeight: ds.typography.weights.medium,
                cursor: 'pointer',
                transition: designHelpers.animate('all', ds.animation.durations.fast),
              }}
            >
              Reset Account
            </button>
          </div>
        </div>
      </header>

      {/* Account Overview */}
      <section style={{
        backgroundColor: ds.colors.semantic.background.secondary,
        borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
      }}>
        <div style={{
          maxWidth: ds.grid.maxWidth,
          margin: '0 auto',
          padding: ds.spacing.large,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: ds.spacing.large,
        }}>
          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Account Balance
            </div>
            <div style={{
              fontSize: ds.typography.scale.xlarge,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
            }}>
              {formatCurrency(accountStats.currentBalance)}
            </div>
          </div>

          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Total P&L
            </div>
            <div style={{
              fontSize: ds.typography.scale.xlarge,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              color: accountStats.totalPnL >= 0 ? ds.colors.semantic.buy : ds.colors.semantic.sell,
            }}>
              {accountStats.totalPnL >= 0 ? '+' : ''}{formatCurrency(accountStats.totalPnL)}
              <span style={{
                fontSize: ds.typography.scale.medium,
                marginLeft: ds.spacing.small,
              }}>
                ({accountStats.totalPnLPercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Win Rate
            </div>
            <div style={{
              fontSize: ds.typography.scale.xlarge,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              color: accountStats.winRate > 50 ? ds.colors.semantic.success : ds.colors.semantic.warning,
            }}>
              {accountStats.winRate.toFixed(1)}%
            </div>
          </div>

          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Total Trades
            </div>
            <div style={{
              fontSize: ds.typography.scale.xlarge,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
            }}>
              {accountStats.totalTrades}
            </div>
          </div>

          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Open Positions
            </div>
            <div style={{
              fontSize: ds.typography.scale.xlarge,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
            }}>
              {positions.length}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main style={{
        maxWidth: ds.grid.maxWidth,
        margin: '0 auto',
        padding: ds.spacing.large,
        display: 'grid',
        gridTemplateColumns: '350px 1fr',
        gap: ds.spacing.xlarge,
      }}>
        {/* Order Form */}
        <div style={{
          backgroundColor: ds.colors.semantic.background.secondary,
          borderRadius: ds.interactive.radius.medium,
          padding: ds.spacing.large,
          border: `1px solid ${ds.colors.grayscale[20]}`,
          height: 'fit-content',
          position: 'sticky',
          top: ds.spacing.large,
        }}>
          <h2 style={{
            fontSize: ds.typography.scale.medium,
            fontWeight: ds.typography.weights.semibold,
            marginBottom: ds.spacing.large,
          }}>
            Place Order
          </h2>

          {/* Symbol Selection */}
          <div style={{ marginBottom: ds.spacing.medium }}>
            <label style={{
              display: 'block',
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
            }}>
              Symbol
            </label>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              style={{
                width: '100%',
                padding: ds.spacing.small,
                backgroundColor: ds.colors.semantic.background.primary,
                color: ds.colors.grayscale[90],
                border: `1px solid ${ds.colors.grayscale[30]}`,
                borderRadius: ds.interactive.radius.small,
                fontSize: ds.typography.scale.small,
                cursor: 'pointer',
              }}
            >
              {Object.keys(marketPrices).map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
          </div>

          {/* Market Info */}
          <div style={{
            padding: ds.spacing.medium,
            backgroundColor: ds.colors.semantic.background.tertiary,
            borderRadius: ds.interactive.radius.small,
            marginBottom: ds.spacing.medium,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{
                  fontSize: ds.typography.scale.mini,
                  color: ds.colors.grayscale[70],
                }}>
                  Market Price
                </div>
                <div style={{
                  fontSize: ds.typography.scale.large,
                  fontWeight: ds.typography.weights.semibold,
                  fontFamily: ds.typography.families.data,
                }}>
                  {formatCurrency(marketPrices[selectedSymbol].price)}
                </div>
              </div>
              <div style={{
                fontSize: ds.typography.scale.small,
                color: marketPrices[selectedSymbol].change24h >= 0 ? 
                  ds.colors.semantic.buy : ds.colors.semantic.sell,
                fontWeight: ds.typography.weights.medium,
              }}>
                {marketPrices[selectedSymbol].change24h >= 0 ? '+' : ''}
                {marketPrices[selectedSymbol].change24h.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Order Type */}
          <div style={{ marginBottom: ds.spacing.medium }}>
            <label style={{
              display: 'block',
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
            }}>
              Order Type
            </label>
            <div style={{ display: 'flex', gap: ds.spacing.small }}>
              {(['market', 'limit'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  style={{
                    flex: 1,
                    padding: ds.spacing.small,
                    backgroundColor: orderType === type ? 
                      ds.colors.semantic.primary : 'transparent',
                    color: orderType === type ? 
                      ds.colors.grayscale[5] : ds.colors.grayscale[70],
                    border: `1px solid ${orderType === type ? 
                      ds.colors.semantic.primary : ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.small,
                    fontSize: ds.typography.scale.small,
                    fontWeight: ds.typography.weights.medium,
                    cursor: 'pointer',
                    transition: designHelpers.animate('all', ds.animation.durations.fast),
                    textTransform: 'capitalize',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Buy/Sell */}
          <div style={{ marginBottom: ds.spacing.medium }}>
            <label style={{
              display: 'block',
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
            }}>
              Side
            </label>
            <div style={{ display: 'flex', gap: ds.spacing.small }}>
              <button
                onClick={() => setOrderSide('buy')}
                style={{
                  flex: 1,
                  padding: ds.spacing.medium,
                  backgroundColor: orderSide === 'buy' ? 
                    ds.colors.semantic.buy : 'transparent',
                  color: orderSide === 'buy' ? 
                    ds.colors.grayscale[5] : ds.colors.semantic.buy,
                  border: `1px solid ${ds.colors.semantic.buy}`,
                  borderRadius: ds.interactive.radius.small,
                  fontSize: ds.typography.scale.small,
                  fontWeight: ds.typography.weights.medium,
                  cursor: 'pointer',
                  transition: designHelpers.animate('all', ds.animation.durations.fast),
                }}
              >
                Buy
              </button>
              <button
                onClick={() => setOrderSide('sell')}
                style={{
                  flex: 1,
                  padding: ds.spacing.medium,
                  backgroundColor: orderSide === 'sell' ? 
                    ds.colors.semantic.sell : 'transparent',
                  color: orderSide === 'sell' ? 
                    ds.colors.grayscale[5] : ds.colors.semantic.sell,
                  border: `1px solid ${ds.colors.semantic.sell}`,
                  borderRadius: ds.interactive.radius.small,
                  fontSize: ds.typography.scale.small,
                  fontWeight: ds.typography.weights.medium,
                  cursor: 'pointer',
                  transition: designHelpers.animate('all', ds.animation.durations.fast),
                }}
              >
                Sell
              </button>
            </div>
          </div>

          {/* Size */}
          <div style={{ marginBottom: ds.spacing.medium }}>
            <label style={{
              display: 'block',
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
            }}>
              Size
            </label>
            <input
              type="number"
              value={orderSize}
              onChange={(e) => setOrderSize(e.target.value)}
              placeholder="0.00"
              style={{
                width: '100%',
                padding: ds.spacing.small,
                backgroundColor: ds.colors.semantic.background.primary,
                color: ds.colors.grayscale[90],
                border: `1px solid ${ds.colors.grayscale[30]}`,
                borderRadius: ds.interactive.radius.small,
                fontSize: ds.typography.scale.small,
                fontFamily: ds.typography.families.data,
              }}
            />
          </div>

          {/* Price (for limit orders) */}
          {orderType === 'limit' && (
            <div style={{ marginBottom: ds.spacing.medium }}>
              <label style={{
                display: 'block',
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.small,
              }}>
                Limit Price
              </label>
              <input
                type="number"
                value={orderPrice}
                onChange={(e) => setOrderPrice(e.target.value)}
                placeholder={marketPrices[selectedSymbol].price.toFixed(2)}
                style={{
                  width: '100%',
                  padding: ds.spacing.small,
                  backgroundColor: ds.colors.semantic.background.primary,
                  color: ds.colors.grayscale[90],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.small,
                  fontSize: ds.typography.scale.small,
                  fontFamily: ds.typography.families.data,
                }}
              />
            </div>
          )}

          {/* Stop Loss & Take Profit */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: ds.spacing.medium,
            marginBottom: ds.spacing.large,
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.small,
              }}>
                Stop Loss
              </label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="Optional"
                style={{
                  width: '100%',
                  padding: ds.spacing.small,
                  backgroundColor: ds.colors.semantic.background.primary,
                  color: ds.colors.grayscale[90],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.small,
                  fontSize: ds.typography.scale.small,
                  fontFamily: ds.typography.families.data,
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.small,
              }}>
                Take Profit
              </label>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="Optional"
                style={{
                  width: '100%',
                  padding: ds.spacing.small,
                  backgroundColor: ds.colors.semantic.background.primary,
                  color: ds.colors.grayscale[90],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.small,
                  fontSize: ds.typography.scale.small,
                  fontFamily: ds.typography.families.data,
                }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmitOrder}
            disabled={!orderSize || parseFloat(orderSize) <= 0}
            style={{
              width: '100%',
              padding: ds.spacing.medium,
              backgroundColor: orderSide === 'buy' ? 
                ds.colors.semantic.buy : ds.colors.semantic.sell,
              color: ds.colors.grayscale[5],
              border: 'none',
              borderRadius: ds.interactive.radius.medium,
              fontSize: ds.typography.scale.small,
              fontWeight: ds.typography.weights.medium,
              cursor: !orderSize || parseFloat(orderSize) <= 0 ? 'not-allowed' : 'pointer',
              opacity: !orderSize || parseFloat(orderSize) <= 0 ? 0.5 : 1,
              transition: designHelpers.animate('all', ds.animation.durations.fast),
            }}
          >
            {orderSide === 'buy' ? 'Buy' : 'Sell'} {selectedSymbol}
          </button>
        </div>

        {/* Positions & Trades */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: ds.spacing.xlarge }}>
          {/* Open Positions */}
          <section>
            <h2 style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.large,
            }}>
              Open Positions
            </h2>

            {positions.length === 0 ? (
              <div style={{
                backgroundColor: ds.colors.semantic.background.secondary,
                borderRadius: ds.interactive.radius.medium,
                padding: ds.spacing.xlarge,
                textAlign: 'center',
                color: ds.colors.grayscale[60],
              }}>
                No open positions
              </div>
            ) : (
              <div style={{
                backgroundColor: ds.colors.semantic.background.secondary,
                borderRadius: ds.interactive.radius.medium,
                overflow: 'hidden',
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: ds.typography.scale.small,
                }}>
                  <thead>
                    <tr style={{
                      backgroundColor: ds.colors.semantic.background.tertiary,
                    }}>
                      <th style={{
                        padding: ds.spacing.medium,
                        textAlign: 'left',
                        fontWeight: ds.typography.weights.medium,
                        color: ds.colors.grayscale[70],
                      }}>
                        Symbol
                      </th>
                      <th style={{
                        padding: ds.spacing.medium,
                        textAlign: 'left',
                        fontWeight: ds.typography.weights.medium,
                        color: ds.colors.grayscale[70],
                      }}>
                        Side
                      </th>
                      <th style={{
                        padding: ds.spacing.medium,
                        textAlign: 'right',
                        fontWeight: ds.typography.weights.medium,
                        color: ds.colors.grayscale[70],
                      }}>
                        Size
                      </th>
                      <th style={{
                        padding: ds.spacing.medium,
                        textAlign: 'right',
                        fontWeight: ds.typography.weights.medium,
                        color: ds.colors.grayscale[70],
                      }}>
                        Entry
                      </th>
                      <th style={{
                        padding: ds.spacing.medium,
                        textAlign: 'right',
                        fontWeight: ds.typography.weights.medium,
                        color: ds.colors.grayscale[70],
                      }}>
                        Current
                      </th>
                      <th style={{
                        padding: ds.spacing.medium,
                        textAlign: 'right',
                        fontWeight: ds.typography.weights.medium,
                        color: ds.colors.grayscale[70],
                      }}>
                        P&L
                      </th>
                      <th style={{
                        padding: ds.spacing.medium,
                        textAlign: 'center',
                        fontWeight: ds.typography.weights.medium,
                        color: ds.colors.grayscale[70],
                      }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map(position => (
                      <tr key={position.id}>
                        <td style={{
                          padding: ds.spacing.medium,
                          borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                          fontFamily: ds.typography.families.data,
                          fontWeight: ds.typography.weights.medium,
                        }}>
                          {position.symbol}
                        </td>
                        <td style={{
                          padding: ds.spacing.medium,
                          borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                        }}>
                          <span style={{
                            display: 'inline-block',
                            padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                            backgroundColor: position.side === 'long' ? 
                              `${ds.colors.semantic.buy}20` : 
                              `${ds.colors.semantic.sell}20`,
                            color: position.side === 'long' ? 
                              ds.colors.semantic.buy : 
                              ds.colors.semantic.sell,
                            borderRadius: ds.interactive.radius.small,
                            fontSize: ds.typography.scale.mini,
                            fontWeight: ds.typography.weights.medium,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}>
                            {position.side}
                          </span>
                        </td>
                        <td style={{
                          padding: ds.spacing.medium,
                          borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                          textAlign: 'right',
                          fontFamily: ds.typography.families.data,
                        }}>
                          {position.size}
                        </td>
                        <td style={{
                          padding: ds.spacing.medium,
                          borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                          textAlign: 'right',
                          fontFamily: ds.typography.families.data,
                        }}>
                          {formatCurrency(position.entryPrice)}
                        </td>
                        <td style={{
                          padding: ds.spacing.medium,
                          borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                          textAlign: 'right',
                          fontFamily: ds.typography.families.data,
                        }}>
                          {formatCurrency(position.currentPrice)}
                        </td>
                        <td style={{
                          padding: ds.spacing.medium,
                          borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                          textAlign: 'right',
                          fontFamily: ds.typography.families.data,
                          color: position.pnl >= 0 ? 
                            ds.colors.semantic.buy : 
                            ds.colors.semantic.sell,
                          fontWeight: ds.typography.weights.medium,
                        }}>
                          {position.pnl >= 0 ? '+' : ''}{formatCurrency(position.pnl)}
                          <div style={{
                            fontSize: ds.typography.scale.mini,
                            color: position.pnl >= 0 ? 
                              ds.colors.semantic.buy : 
                              ds.colors.semantic.sell,
                          }}>
                            ({position.pnlPercent.toFixed(2)}%)
                          </div>
                        </td>
                        <td style={{
                          padding: ds.spacing.medium,
                          borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                          textAlign: 'center',
                        }}>
                          <button
                            onClick={() => handleClosePosition(position.id)}
                            style={{
                              padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                              backgroundColor: 'transparent',
                              color: ds.colors.semantic.primary,
                              border: `1px solid ${ds.colors.grayscale[30]}`,
                              borderRadius: ds.interactive.radius.small,
                              fontSize: ds.typography.scale.mini,
                              cursor: 'pointer',
                              transition: designHelpers.animate('all', ds.animation.durations.fast),
                            }}
                          >
                            Close
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Recent Trades */}
          <section>
            <h2 style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.large,
            }}>
              Recent Trades
            </h2>

            {trades.length === 0 ? (
              <div style={{
                backgroundColor: ds.colors.semantic.background.secondary,
                borderRadius: ds.interactive.radius.medium,
                padding: ds.spacing.xlarge,
                textAlign: 'center',
                color: ds.colors.grayscale[60],
              }}>
                No trades yet
              </div>
            ) : (
              <div style={{
                backgroundColor: ds.colors.semantic.background.secondary,
                borderRadius: ds.interactive.radius.medium,
                overflow: 'hidden',
                maxHeight: '400px',
                overflowY: 'auto',
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: ds.typography.scale.small,
                }}>
                  <thead>
                    <tr style={{
                      backgroundColor: ds.colors.semantic.background.tertiary,
                      position: 'sticky',
                      top: 0,
                    }}>
                      <th style={{
                        padding: ds.spacing.medium,
                        textAlign: 'left',
                        fontWeight: ds.typography.weights.medium,
                        color: ds.colors.grayscale[70],
                      }}>
                        Time
                      </th>
                      <th style={{
                        padding: ds.spacing.medium,
                        textAlign: 'left',
                        fontWeight: ds.typography.weights.medium,
                        color: ds.colors.grayscale[70],
                      }}>
                        Symbol
                      </th>
                      <th style={{
                        padding: ds.spacing.medium,
                        textAlign: 'left',
                        fontWeight: ds.typography.weights.medium,
                        color: ds.colors.grayscale[70],
                      }}>
                        Type
                      </th>
                      <th style={{
                        padding: ds.spacing.medium,
                        textAlign: 'right',
                        fontWeight: ds.typography.weights.medium,
                        color: ds.colors.grayscale[70],
                      }}>
                        Size
                      </th>
                      <th style={{
                        padding: ds.spacing.medium,
                        textAlign: 'right',
                        fontWeight: ds.typography.weights.medium,
                        color: ds.colors.grayscale[70],
                      }}>
                        Price
                      </th>
                      <th style={{
                        padding: ds.spacing.medium,
                        textAlign: 'right',
                        fontWeight: ds.typography.weights.medium,
                        color: ds.colors.grayscale[70],
                      }}>
                        P&L
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map(trade => (
                      <tr key={trade.id}>
                        <td style={{
                          padding: ds.spacing.medium,
                          borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                          fontSize: ds.typography.scale.mini,
                          color: ds.colors.grayscale[70],
                        }}>
                          {formatTimestamp(trade.timestamp)}
                        </td>
                        <td style={{
                          padding: ds.spacing.medium,
                          borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                          fontFamily: ds.typography.families.data,
                          fontWeight: ds.typography.weights.medium,
                        }}>
                          {trade.symbol}
                        </td>
                        <td style={{
                          padding: ds.spacing.medium,
                          borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                        }}>
                          <span style={{
                            display: 'inline-block',
                            padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                            backgroundColor: trade.side === 'buy' ? 
                              `${ds.colors.semantic.buy}20` : 
                              `${ds.colors.semantic.sell}20`,
                            color: trade.side === 'buy' ? 
                              ds.colors.semantic.buy : 
                              ds.colors.semantic.sell,
                            borderRadius: ds.interactive.radius.small,
                            fontSize: ds.typography.scale.mini,
                            fontWeight: ds.typography.weights.medium,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}>
                            {trade.side}
                          </span>
                          {trade.type !== 'entry' && (
                            <span style={{
                              marginLeft: ds.spacing.small,
                              fontSize: ds.typography.scale.mini,
                              color: ds.colors.grayscale[60],
                            }}>
                              ({trade.type})
                            </span>
                          )}
                        </td>
                        <td style={{
                          padding: ds.spacing.medium,
                          borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                          textAlign: 'right',
                          fontFamily: ds.typography.families.data,
                        }}>
                          {trade.size}
                        </td>
                        <td style={{
                          padding: ds.spacing.medium,
                          borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                          textAlign: 'right',
                          fontFamily: ds.typography.families.data,
                        }}>
                          {formatCurrency(trade.price)}
                        </td>
                        <td style={{
                          padding: ds.spacing.medium,
                          borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                          textAlign: 'right',
                          fontFamily: ds.typography.families.data,
                          color: trade.pnl !== undefined ? 
                            (trade.pnl >= 0 ? ds.colors.semantic.buy : ds.colors.semantic.sell) : 
                            ds.colors.grayscale[60],
                          fontWeight: ds.typography.weights.medium,
                        }}>
                          {trade.pnl !== undefined ? 
                            `${trade.pnl >= 0 ? '+' : ''}${formatCurrency(trade.pnl)}` : 
                            '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.xlarge,
            maxWidth: '400px',
            width: '90%',
            border: `1px solid ${ds.colors.grayscale[30]}`,
          }}>
            <h3 style={{
              fontSize: ds.typography.scale.medium,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.medium,
            }}>
              Reset Paper Trading Account?
            </h3>
            <p style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.large,
            }}>
              This will clear all positions, trades, and reset your account balance to $100,000. This action cannot be undone.
            </p>
            <div style={{
              display: 'flex',
              gap: ds.spacing.medium,
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setShowResetConfirm(false)}
                style={{
                  padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                  backgroundColor: 'transparent',
                  color: ds.colors.grayscale[70],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.medium,
                  fontSize: ds.typography.scale.small,
                  fontWeight: ds.typography.weights.medium,
                  cursor: 'pointer',
                  transition: designHelpers.animate('all', ds.animation.durations.fast),
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleResetAccount}
                style={{
                  padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                  backgroundColor: ds.colors.semantic.error,
                  color: ds.colors.grayscale[5],
                  border: 'none',
                  borderRadius: ds.interactive.radius.medium,
                  fontSize: ds.typography.scale.small,
                  fontWeight: ds.typography.weights.medium,
                  cursor: 'pointer',
                  transition: designHelpers.animate('all', ds.animation.durations.fast),
                }}
              >
                Reset Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}