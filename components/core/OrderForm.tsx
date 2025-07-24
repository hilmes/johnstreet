/**
 * Order Form - Redesigned with Design Excellence
 * 
 * Following principles:
 * - Clear visual hierarchy for critical trading decisions
 * - Minimal visual elements that don't distract from data
 * - Semantic color coding for buy/sell actions
 * - Precise typography for numerical accuracy
 */

'use client'

import React, { useState, useEffect } from 'react'
import { ds, layout } from '@/lib/design/TufteDesignSystem'
import { Typography } from './Typography'

interface OrderFormProps {
  symbol: string
  onOrderSubmit?: (order: any) => void
}

interface PriceData {
  bid: number
  ask: number
  last: number
}

export const OrderForm: React.FC<OrderFormProps> = ({ 
  symbol, 
  onOrderSubmit 
}) => {
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop-loss'>('limit')
  const [price, setPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [total, setTotal] = useState('0.00')
  const [priceData, setPriceData] = useState<PriceData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [balance] = useState({ USD: 10000, BTC: 1.5 }) // Mock balance

  // Fetch current prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const krakenPair = getKrakenPair(symbol)
        const response = await fetch(`/api/kraken/ticker?pair=${krakenPair}`)
        const data = await response.json()
        
        if (data[krakenPair]) {
          const ticker = data[krakenPair]
          setPriceData({
            bid: parseFloat(ticker.b[0]),
            ask: parseFloat(ticker.a[0]),
            last: parseFloat(ticker.c[0]),
          })
        }
      } catch (error) {
        console.error('Error fetching prices:', error)
      }
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 5000)
    return () => clearInterval(interval)
  }, [symbol])

  // Calculate total
  useEffect(() => {
    if (price && amount) {
      const priceNum = parseFloat(price)
      const amountNum = parseFloat(amount)
      if (!isNaN(priceNum) && !isNaN(amountNum)) {
        setTotal((priceNum * amountNum).toFixed(2))
      }
    } else {
      setTotal('0.00')
    }
  }, [price, amount])

  const getKrakenPair = (symbol: string) => {
    const conversions: Record<string, string> = {
      'BTC/USD': 'XXBTZUSD',
      'BTCUSD': 'XXBTZUSD',
      'ETH/USD': 'XETHZUSD',
      'ETHUSD': 'XETHZUSD',
    }
    return conversions[symbol] || symbol
  }

  const handleOrderSubmit = async () => {
    if (isSubmitting) return

    setIsSubmitting(true)
    
    try {
      const orderData = {
        symbol,
        side: orderSide,
        type: orderType,
        amount: parseFloat(amount),
        price: orderType === 'market' ? undefined : parseFloat(price),
        stopPrice: orderType === 'stop-loss' ? parseFloat(stopPrice) : undefined,
        validate: false
      }

      console.log('Submitting order:', orderData)

      const response = await fetch('/api/trading/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })

      const result = await response.json()

      if (result.success) {
        console.log('Order placed successfully:', result)
        
        // Reset form
        setAmount('')
        setPrice('')
        setStopPrice('')
        setTotal('0.00')
        
        // Notify parent component
        onOrderSubmit?.(result)
      } else {
        console.error('Order failed:', result.error)
      }
    } catch (error) {
      console.error('Order submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const setPercentAmount = (percent: number) => {
    const availableBalance = orderSide === 'buy' ? balance.USD : balance.BTC
    const priceNum = orderType === 'market' 
      ? (priceData ? (orderSide === 'buy' ? priceData.ask : priceData.bid) : 0)
      : parseFloat(price) || 0
    
    if (priceNum > 0) {
      const maxAmount = orderSide === 'buy' 
        ? (availableBalance * percent / 100) / priceNum
        : (availableBalance * percent / 100)
      
      setAmount(maxAmount.toFixed(8))
    }
  }

  const isFormValid = amount && (orderType === 'market' || price) && !isSubmitting

  return (
    <div style={{
      ...layout.card(),
      maxWidth: '400px'
    }}>
      {/* Header */}
      <div style={{ marginBottom: ds.spacing.lg }}>
        <Typography.DataLabel style={{ fontSize: ds.typography.scale.base }}>
          Place Order
        </Typography.DataLabel>
        <Typography.InlineCode style={{ marginLeft: ds.spacing.sm }}>
          {symbol}
        </Typography.InlineCode>
      </div>

      {/* Order Side Selection */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: ds.spacing.xs,
        marginBottom: ds.spacing.lg
      }}>
        <button
          onClick={() => setOrderSide('buy')}
          style={{
            padding: ds.spacing.md,
            border: `2px solid ${orderSide === 'buy' ? ds.colors.semantic.profit : ds.colors.semantic.border}`,
            backgroundColor: orderSide === 'buy' ? `${ds.colors.semantic.profit}10` : ds.colors.semantic.background,
            color: orderSide === 'buy' ? ds.colors.semantic.profit : ds.colors.neutral[400],
            borderRadius: ds.radius.sm,
            fontSize: ds.typography.scale.sm,
            fontWeight: ds.typography.weights.semibold,
            cursor: 'pointer',
            transition: 'all 150ms ease'
          }}
        >
          BUY
        </button>
        <button
          onClick={() => setOrderSide('sell')}
          style={{
            padding: ds.spacing.md,
            border: `2px solid ${orderSide === 'sell' ? ds.colors.semantic.loss : ds.colors.semantic.border}`,
            backgroundColor: orderSide === 'sell' ? `${ds.colors.semantic.loss}10` : ds.colors.semantic.background,
            color: orderSide === 'sell' ? ds.colors.semantic.loss : ds.colors.neutral[400],
            borderRadius: ds.radius.sm,
            fontSize: ds.typography.scale.sm,
            fontWeight: ds.typography.weights.semibold,
            cursor: 'pointer',
            transition: 'all 150ms ease'
          }}
        >
          SELL
        </button>
      </div>

      {/* Order Type */}
      <div style={{ marginBottom: ds.spacing.lg }}>
        <Typography.DataLabel style={{ marginBottom: ds.spacing.sm }}>
          Order Type
        </Typography.DataLabel>
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value as any)}
          style={{
            width: '100%',
            padding: ds.spacing.md,
            border: `1px solid ${ds.colors.semantic.border}`,
            borderRadius: ds.radius.sm,
            backgroundColor: ds.colors.semantic.background,
            fontSize: ds.typography.scale.sm,
            color: ds.colors.neutral[900]
          }}
        >
          <option value="market">Market</option>
          <option value="limit">Limit</option>
          <option value="stop-loss">Stop Loss</option>
        </select>
      </div>

      {/* Current Price Display */}
      {priceData && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: ds.spacing.lg,
          padding: ds.spacing.md,
          backgroundColor: ds.colors.neutral[50],
          borderRadius: ds.radius.sm,
          border: `1px solid ${ds.colors.semantic.border}`
        }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <Typography.Body size="sm" muted>Bid</Typography.Body>
            <Typography.Price value={priceData.bid} size="sm" />
          </div>
          <div style={{
            width: '1px',
            height: '40px',
            backgroundColor: ds.colors.semantic.border
          }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <Typography.Body size="sm" muted>Ask</Typography.Body>
            <Typography.Price value={priceData.ask} size="sm" />
          </div>
        </div>
      )}

      {/* Price Input */}
      {orderType !== 'market' && (
        <div style={{ marginBottom: ds.spacing.lg }}>
          <Typography.DataLabel style={{ marginBottom: ds.spacing.sm }}>
            Price (USD)
          </Typography.DataLabel>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              style={{
                width: '100%',
                padding: ds.spacing.md,
                border: `1px solid ${ds.colors.semantic.border}`,
                borderRadius: ds.radius.sm,
                backgroundColor: ds.colors.semantic.background,
                fontSize: ds.typography.scale.sm,
                fontFamily: ds.typography.secondary,
                color: ds.colors.neutral[900]
              }}
            />
            {priceData && (
              <button
                onClick={() => setPrice((orderSide === 'buy' ? priceData.bid : priceData.ask).toString())}
                style={{
                  position: 'absolute',
                  right: ds.spacing.sm,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: ds.colors.semantic.active,
                  fontSize: ds.typography.scale.xs,
                  cursor: 'pointer'
                }}
              >
                Market
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stop Price Input */}
      {orderType === 'stop-loss' && (
        <div style={{ marginBottom: ds.spacing.lg }}>
          <Typography.DataLabel style={{ marginBottom: ds.spacing.sm }}>
            Stop Price (USD)
          </Typography.DataLabel>
          <input
            type="number"
            value={stopPrice}
            onChange={(e) => setStopPrice(e.target.value)}
            placeholder="0.00"
            style={{
              width: '100%',
              padding: ds.spacing.md,
              border: `1px solid ${ds.colors.semantic.border}`,
              borderRadius: ds.radius.sm,
              backgroundColor: ds.colors.semantic.background,
              fontSize: ds.typography.scale.sm,
              fontFamily: ds.typography.secondary,
              color: ds.colors.neutral[900]
            }}
          />
        </div>
      )}

      {/* Amount Input */}
      <div style={{ marginBottom: ds.spacing.md }}>
        <Typography.DataLabel style={{ marginBottom: ds.spacing.sm }}>
          Amount (BTC)
        </Typography.DataLabel>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00000000"
          style={{
            width: '100%',
            padding: ds.spacing.md,
            border: `1px solid ${ds.colors.semantic.border}`,
            borderRadius: ds.radius.sm,
            backgroundColor: ds.colors.semantic.background,
            fontSize: ds.typography.scale.sm,
            fontFamily: ds.typography.secondary,
            color: ds.colors.neutral[900]
          }}
        />
      </div>

      {/* Quick Amount Buttons */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: ds.spacing.xs,
        marginBottom: ds.spacing.lg
      }}>
        {[25, 50, 75, 100].map((percent) => (
          <button
            key={percent}
            onClick={() => setPercentAmount(percent)}
            style={{
              padding: `${ds.spacing.xs} ${ds.spacing.sm}`,
              border: `1px solid ${ds.colors.semantic.border}`,
              backgroundColor: ds.colors.semantic.background,
              color: ds.colors.neutral[400],
              borderRadius: ds.radius.sm,
              fontSize: ds.typography.scale.xs,
              fontWeight: ds.typography.weights.medium,
              cursor: 'pointer',
              transition: 'all 150ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = ds.colors.semantic.active
              e.currentTarget.style.color = ds.colors.semantic.active
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = ds.colors.semantic.border
              e.currentTarget.style.color = ds.colors.neutral[400]
            }}
          >
            {percent}%
          </button>
        ))}
      </div>

      {/* Order Summary */}
      <div style={{
        padding: ds.spacing.md,
        backgroundColor: ds.colors.neutral[50],
        borderRadius: ds.radius.sm,
        marginBottom: ds.spacing.lg
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: ds.spacing.sm
        }}>
          <Typography.Body size="sm" muted>Total</Typography.Body>
          <Typography.Price value={parseFloat(total)} size="sm" />
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between'
        }}>
          <Typography.Body size="sm" muted>Available</Typography.Body>
          <Typography.Body size="sm">
            {orderSide === 'buy' 
              ? `$${balance.USD.toFixed(2)}` 
              : `${balance.BTC.toFixed(8)} BTC`}
          </Typography.Body>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleOrderSubmit}
        disabled={!isFormValid}
        style={{
          width: '100%',
          padding: ds.spacing.md,
          border: 'none',
          borderRadius: ds.radius.sm,
          backgroundColor: isFormValid ? 
            (orderSide === 'buy' ? ds.colors.semantic.profit : ds.colors.semantic.loss) :
            ds.colors.semantic.inactive,
          color: ds.colors.semantic.background,
          fontSize: ds.typography.scale.sm,
          fontWeight: ds.typography.weights.semibold,
          cursor: isFormValid ? 'pointer' : 'not-allowed',
          transition: 'all 150ms ease',
          opacity: isSubmitting ? 0.7 : 1
        }}
      >
        {isSubmitting ? 'Placing Order...' : `${orderSide.toUpperCase()} ${symbol}`}
      </button>

      {/* Market Order Warning */}
      {orderType === 'market' && (
        <div style={{
          marginTop: ds.spacing.md,
          padding: ds.spacing.sm,
          backgroundColor: `${ds.colors.semantic.warning}10`,
          border: `1px solid ${ds.colors.semantic.warning}`,
          borderRadius: ds.radius.sm
        }}>
          <Typography.Body size="sm" style={{ color: ds.colors.semantic.warning }}>
            Market orders execute immediately at the best available price
          </Typography.Body>
        </div>
      )}
    </div>
  )
}

export default OrderForm