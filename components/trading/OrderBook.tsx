'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { dieterRamsDesign as ds, designHelpers } from '@/lib/design/DieterRamsDesignSystem'
import { useLiveOrderBook, OrderBookEntry } from '@/app/hooks/useLiveOrderBook'

interface OrderBookProps {
  symbol: string
}

export const OrderBook: React.FC<OrderBookProps> = ({ symbol }) => {
  const { 
    orderBook, 
    isConnected, 
    error,
    bestBid,
    bestAsk,
    spread: liveSpread,
    spreadPercent: liveSpreadPercent 
  } = useLiveOrderBook({ symbol, maxLevels: 15 })

  // Fallback to mock data if no live data available
  const [mockBids, setMockBids] = useState<OrderBookEntry[]>([])
  const [mockAsks, setMockAsks] = useState<OrderBookEntry[]>([])
  
  const bids = orderBook?.bids || mockBids
  const asks = orderBook?.asks || mockAsks
  const spread = liveSpread ?? 0
  const spreadPercent = liveSpreadPercent ?? 0

  // Generate mock order book data as fallback
  useEffect(() => {
    if (!orderBook) {
      const basePrice = symbol === 'BTC/USD' ? 68200 : symbol === 'ETH/USD' ? 3820 : 125
      const mockBidsData: OrderBookEntry[] = []
      const mockAsksData: OrderBookEntry[] = []
      let bidTotal = 0
      let askTotal = 0

      // Generate bids
      for (let i = 0; i < 15; i++) {
        const price = basePrice - (i + 1) * 0.5
        const size = Math.random() * 2 + 0.1
        bidTotal += size
        mockBidsData.push({ price, size, total: bidTotal })
      }

      // Generate asks
      for (let i = 0; i < 15; i++) {
        const price = basePrice + (i + 1) * 0.5
        const size = Math.random() * 2 + 0.1
        askTotal += size
        mockAsksData.push({ price, size, total: askTotal })
      }

      setMockBids(mockBidsData)
      setMockAsks(mockAsksData)
    }
  }, [symbol, orderBook])

  // Calculate max totals for visualization
  const maxBidTotal = useMemo(() => Math.max(...bids.map(b => b.total)), [bids])
  const maxAskTotal = useMemo(() => Math.max(...asks.map(a => a.total)), [asks])

  const renderOrderBookSide = (orders: OrderBookEntry[], side: 'bid' | 'ask', maxTotal: number) => {
    const color = side === 'bid' ? ds.colors.semantic.buy : ds.colors.semantic.sell
    const bgColor = side === 'bid' ? 'rgba(0, 208, 132, 0.1)' : 'rgba(255, 51, 102, 0.1)'

    return orders.map((order, index) => (
      <div
        key={`${side}-${index}`}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          padding: `${ds.spacing.mini} ${ds.spacing.small}`,
          position: 'relative',
          fontSize: ds.typography.scale.small,
          fontFamily: ds.typography.families.data,
          cursor: 'pointer',
          transition: designHelpers.animate('background-color', ds.animation.durations.micro),
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = ds.colors.semantic.background.tertiary
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        {/* Background bar visualization */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: `${(order.total / maxTotal) * 100}%`,
            backgroundColor: bgColor,
            zIndex: ds.zIndex.base,
          }}
        />
        
        {/* Price */}
        <div style={{ 
          textAlign: 'left',
          color,
          fontWeight: ds.typography.weights.medium,
          position: 'relative',
          zIndex: ds.zIndex.raised,
        }}>
          {order.price.toFixed(2)}
        </div>
        
        {/* Size */}
        <div style={{ 
          textAlign: 'center',
          color: ds.colors.grayscale[90],
          position: 'relative',
          zIndex: ds.zIndex.raised,
        }}>
          {order.size.toFixed(5)}
        </div>
        
        {/* Total */}
        <div style={{ 
          textAlign: 'right',
          color: ds.colors.grayscale[70],
          position: 'relative',
          zIndex: ds.zIndex.raised,
        }}>
          {order.total.toFixed(5)}
        </div>
      </div>
    ))
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: ds.spacing.medium,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: ds.spacing.small }}>
          <h3 style={{
            fontSize: ds.typography.scale.medium,
            fontWeight: ds.typography.weights.semibold,
            margin: 0,
          }}>
            Order Book
          </h3>
          
          {/* Connection status and data source indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: ds.spacing.micro }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isConnected ? ds.colors.semantic.success : ds.colors.semantic.warning,
              boxShadow: `0 0 4px ${isConnected ? ds.colors.semantic.success : ds.colors.semantic.warning}`
            }} />
            <span style={{
              fontSize: ds.typography.scale.mini,
              color: ds.colors.grayscale[70],
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {orderBook ? 'LIVE' : 'DEMO'}
            </span>
            {orderBook && (
              <span style={{
                fontSize: ds.typography.scale.mini,
                color: ds.colors.grayscale[60],
                marginLeft: ds.spacing.small
              }}>
                {new Date(orderBook.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        
        {/* Spread indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: ds.spacing.small,
          fontSize: ds.typography.scale.small,
        }}>
          <span style={{ color: ds.colors.grayscale[70] }}>Spread:</span>
          <span style={{ 
            fontFamily: ds.typography.families.data,
            fontWeight: ds.typography.weights.medium,
          }}>
            ${spread.toFixed(2)}
          </span>
          <span style={{ 
            color: ds.colors.grayscale[70],
            fontSize: ds.typography.scale.mini,
          }}>
            ({spreadPercent.toFixed(3)}%)
          </span>
        </div>
      </div>

      {/* Column Headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        padding: `${ds.spacing.mini} ${ds.spacing.small}`,
        borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
        fontSize: ds.typography.scale.mini,
        color: ds.colors.grayscale[70],
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        <div style={{ textAlign: 'left' }}>Price</div>
        <div style={{ textAlign: 'center' }}>Size</div>
        <div style={{ textAlign: 'right' }}>Total</div>
      </div>

      {/* Order Book Content */}
      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Asks (Sells) */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column-reverse',
        }}>
          {renderOrderBookSide(asks.slice(0, 15), 'ask', maxAskTotal)}
        </div>

        {/* Mid Price */}
        <div style={{
          padding: ds.spacing.small,
          backgroundColor: ds.colors.semantic.background.primary,
          borderTop: `1px solid ${ds.colors.grayscale[20]}`,
          borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
          textAlign: 'center',
        }}>
          <span style={{
            fontSize: ds.typography.scale.medium,
            fontWeight: ds.typography.weights.semibold,
            fontFamily: ds.typography.families.data,
          }}>
            {((asks[0]?.price || 0) + (bids[0]?.price || 0)) / 2}
          </span>
          <span style={{
            fontSize: ds.typography.scale.mini,
            color: ds.colors.grayscale[70],
            marginLeft: ds.spacing.small,
          }}>
            MID
          </span>
        </div>

        {/* Bids (Buys) */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto',
        }}>
          {renderOrderBookSide(bids.slice(0, 15), 'bid', maxBidTotal)}
        </div>
      </div>

      {/* Aggregation Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: ds.spacing.mini,
        padding: ds.spacing.small,
        borderTop: `1px solid ${ds.colors.grayscale[20]}`,
      }}>
        {['0.01', '0.10', '1.00'].map(level => (
          <button
            key={level}
            style={{
              padding: `${ds.spacing.micro} ${ds.spacing.small}`,
              backgroundColor: 'transparent',
              color: ds.colors.grayscale[70],
              border: `1px solid ${ds.colors.grayscale[30]}`,
              borderRadius: ds.interactive.radius.small,
              fontSize: ds.typography.scale.mini,
              cursor: 'pointer',
              transition: designHelpers.animate('all', ds.animation.durations.micro),
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = ds.colors.semantic.background.tertiary
              e.currentTarget.style.borderColor = ds.colors.grayscale[50]
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.borderColor = ds.colors.grayscale[30]
            }}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  )
}