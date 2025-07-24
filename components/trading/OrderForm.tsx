'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { dieterRamsDesign as ds, designHelpers } from '@/lib/design/DieterRamsDesignSystem'

interface OrderFormProps {
  symbol: string
  marketData: {
    bid: number
    ask: number
    last: number
  } | null
  availableBalance: number
}

type OrderType = 'market' | 'limit' | 'stop' | 'stopLimit'
type OrderSide = 'buy' | 'sell'

export const OrderForm: React.FC<OrderFormProps> = ({
  symbol,
  marketData,
  availableBalance,
}) => {
  const [orderSide, setOrderSide] = useState<OrderSide>('buy')
  const [orderType, setOrderType] = useState<OrderType>('limit')
  const [amount, setAmount] = useState('')
  const [price, setPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [total, setTotal] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  // Form validation states
  const [errors, setErrors] = useState<{
    amount?: string
    price?: string
    stopPrice?: string
    balance?: string
  }>({})

  // Calculate total when amount or price changes
  useEffect(() => {
    const amountNum = parseFloat(amount) || 0
    const priceNum = parseFloat(price) || (marketData?.last || 0)
    setTotal(amountNum * priceNum)
  }, [amount, price, marketData])

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors: typeof errors = {}
    
    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }

    if (orderType === 'limit' || orderType === 'stopLimit') {
      const priceNum = parseFloat(price)
      if (!priceNum || priceNum <= 0) {
        newErrors.price = 'Price must be greater than 0'
      }
    }

    if (orderType === 'stop' || orderType === 'stopLimit') {
      const stopPriceNum = parseFloat(stopPrice)
      if (!stopPriceNum || stopPriceNum <= 0) {
        newErrors.stopPrice = 'Stop price must be greater than 0'
      }
    }

    if (total > availableBalance) {
      newErrors.balance = 'Insufficient balance'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [amount, price, stopPrice, orderType, total, availableBalance])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsValidating(true)
    
    // Simulate order validation
    setTimeout(() => {
      setIsValidating(false)
      // Show confirmation modal
      console.log('Order submitted:', {
        symbol,
        side: orderSide,
        type: orderType,
        amount,
        price,
        stopPrice,
        total,
      })
    }, 500)
  }

  // Quick amount buttons
  const quickAmounts = [
    { label: '25%', value: 0.25 },
    { label: '50%', value: 0.5 },
    { label: '75%', value: 0.75 },
    { label: '100%', value: 1.0 },
  ]

  const inputStyle = {
    width: '100%',
    padding: `${ds.spacing.small} ${ds.spacing.medium}`,
    backgroundColor: ds.colors.semantic.background.primary,
    border: `1px solid ${ds.colors.grayscale[30]}`,
    borderRadius: ds.interactive.radius.medium,
    color: ds.colors.grayscale[90],
    fontSize: ds.typography.scale.base,
    fontFamily: ds.typography.families.data,
    transition: designHelpers.animate('all', ds.animation.durations.fast),
    outline: 'none',
  }

  const labelStyle = {
    display: 'block',
    fontSize: ds.typography.scale.small,
    color: ds.colors.grayscale[70],
    marginBottom: ds.spacing.mini,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    fontWeight: ds.typography.weights.medium,
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      {/* Order Side Selector */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: ds.spacing.mini,
        marginBottom: ds.spacing.large,
      }}>
        <button
          type="button"
          onClick={() => setOrderSide('buy')}
          style={{
            padding: ds.spacing.medium,
            backgroundColor: orderSide === 'buy' ? ds.colors.semantic.buy : ds.colors.semantic.background.tertiary,
            color: orderSide === 'buy' ? ds.colors.grayscale[5] : ds.colors.grayscale[70],
            border: 'none',
            borderRadius: ds.interactive.radius.medium,
            fontSize: ds.typography.scale.base,
            fontWeight: ds.typography.weights.semibold,
            cursor: 'pointer',
            transition: designHelpers.animate('all', ds.animation.durations.fast),
          }}
        >
          BUY
        </button>
        <button
          type="button"
          onClick={() => setOrderSide('sell')}
          style={{
            padding: ds.spacing.medium,
            backgroundColor: orderSide === 'sell' ? ds.colors.semantic.sell : ds.colors.semantic.background.tertiary,
            color: orderSide === 'sell' ? ds.colors.grayscale[95] : ds.colors.grayscale[70],
            border: 'none',
            borderRadius: ds.interactive.radius.medium,
            fontSize: ds.typography.scale.base,
            fontWeight: ds.typography.weights.semibold,
            cursor: 'pointer',
            transition: designHelpers.animate('all', ds.animation.durations.fast),
          }}
        >
          SELL
        </button>
      </div>

      {/* Order Type */}
      <div style={{ marginBottom: ds.spacing.medium }}>
        <label style={labelStyle}>Order Type</label>
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value as OrderType)}
          style={{
            ...inputStyle,
            cursor: 'pointer',
          }}
        >
          <option value="market">Market</option>
          <option value="limit">Limit</option>
          <option value="stop">Stop</option>
          <option value="stopLimit">Stop Limit</option>
        </select>
      </div>

      {/* Amount Input */}
      <div style={{ marginBottom: ds.spacing.medium }}>
        <label style={labelStyle}>Amount ({symbol.split('/')[0]})</label>
        <div style={{ position: 'relative' }}>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.00001"
            style={{
              ...inputStyle,
              borderColor: errors.amount ? ds.colors.semantic.danger : ds.colors.grayscale[30],
            }}
          />
          {errors.amount && (
            <div style={{
              fontSize: ds.typography.scale.mini,
              color: ds.colors.semantic.danger,
              marginTop: ds.spacing.micro,
            }}>
              {errors.amount}
            </div>
          )}
        </div>

        {/* Quick Amount Buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: ds.spacing.mini,
          marginTop: ds.spacing.small,
        }}>
          {quickAmounts.map((quick) => (
            <button
              key={quick.label}
              type="button"
              onClick={() => {
                const maxAmount = availableBalance / (parseFloat(price) || marketData?.last || 1)
                setAmount((maxAmount * quick.value).toFixed(5))
              }}
              style={{
                padding: ds.spacing.mini,
                backgroundColor: ds.colors.semantic.background.tertiary,
                color: ds.colors.grayscale[70],
                border: `1px solid ${ds.colors.grayscale[30]}`,
                borderRadius: ds.interactive.radius.small,
                fontSize: ds.typography.scale.mini,
                cursor: 'pointer',
                transition: designHelpers.animate('all', ds.animation.durations.micro),
              }}
            >
              {quick.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price Input (for limit orders) */}
      {(orderType === 'limit' || orderType === 'stopLimit') && (
        <div style={{ marginBottom: ds.spacing.medium }}>
          <label style={labelStyle}>Price ({symbol.split('/')[1]})</label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={marketData?.last.toString() || '0.00'}
              step="0.01"
              style={{
                ...inputStyle,
                borderColor: errors.price ? ds.colors.semantic.danger : ds.colors.grayscale[30],
              }}
            />
            {marketData && (
              <button
                type="button"
                onClick={() => setPrice(marketData.last.toString())}
                style={{
                  position: 'absolute',
                  right: ds.spacing.small,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                  backgroundColor: ds.colors.semantic.background.tertiary,
                  color: ds.colors.grayscale[70],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.small,
                  fontSize: ds.typography.scale.mini,
                  cursor: 'pointer',
                }}
              >
                LAST
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stop Price (for stop orders) */}
      {(orderType === 'stop' || orderType === 'stopLimit') && (
        <div style={{ marginBottom: ds.spacing.medium }}>
          <label style={labelStyle}>Stop Price ({symbol.split('/')[1]})</label>
          <input
            type="number"
            value={stopPrice}
            onChange={(e) => setStopPrice(e.target.value)}
            placeholder="0.00"
            step="0.01"
            style={{
              ...inputStyle,
              borderColor: errors.stopPrice ? ds.colors.semantic.danger : ds.colors.grayscale[30],
            }}
          />
        </div>
      )}

      {/* Advanced Options Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        style={{
          width: '100%',
          padding: ds.spacing.small,
          backgroundColor: 'transparent',
          color: ds.colors.grayscale[70],
          border: 'none',
          fontSize: ds.typography.scale.small,
          cursor: 'pointer',
          marginBottom: ds.spacing.medium,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: ds.spacing.mini,
        }}
      >
        Advanced Options {showAdvanced ? '▲' : '▼'}
      </button>

      {/* Advanced Options */}
      {showAdvanced && (
        <div style={{
          padding: ds.spacing.medium,
          backgroundColor: ds.colors.semantic.background.primary,
          borderRadius: ds.interactive.radius.medium,
          marginBottom: ds.spacing.medium,
        }}>
          <div style={{ marginBottom: ds.spacing.small }}>
            <label style={labelStyle}>Time in Force</label>
            <select style={inputStyle}>
              <option value="GTC">Good Till Cancelled</option>
              <option value="IOC">Immediate or Cancel</option>
              <option value="FOK">Fill or Kill</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Post Only</label>
            <input type="checkbox" />
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div style={{
        padding: ds.spacing.medium,
        backgroundColor: ds.colors.semantic.background.primary,
        borderRadius: ds.interactive.radius.medium,
        marginBottom: ds.spacing.large,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: ds.spacing.small,
        }}>
          <span style={{ fontSize: ds.typography.scale.small, color: ds.colors.grayscale[70] }}>
            Total
          </span>
          <span style={{
            fontSize: ds.typography.scale.medium,
            fontWeight: ds.typography.weights.semibold,
            fontFamily: ds.typography.families.data,
          }}>
            ${total.toFixed(2)}
          </span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: ds.typography.scale.small, color: ds.colors.grayscale[70] }}>
            Available
          </span>
          <span style={{
            fontSize: ds.typography.scale.small,
            fontFamily: ds.typography.families.data,
            color: errors.balance ? ds.colors.semantic.danger : ds.colors.grayscale[90],
          }}>
            ${availableBalance.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isValidating || Object.keys(errors).length > 0}
        style={{
          width: '100%',
          padding: ds.spacing.medium,
          backgroundColor: orderSide === 'buy' ? ds.colors.semantic.buy : ds.colors.semantic.sell,
          color: orderSide === 'buy' ? ds.colors.grayscale[5] : ds.colors.grayscale[95],
          border: 'none',
          borderRadius: ds.interactive.radius.medium,
          fontSize: ds.typography.scale.base,
          fontWeight: ds.typography.weights.semibold,
          cursor: isValidating || Object.keys(errors).length > 0 ? 'not-allowed' : 'pointer',
          opacity: isValidating || Object.keys(errors).length > 0 ? 0.5 : 1,
          transition: designHelpers.animate('all', ds.animation.durations.fast),
          minHeight: ds.interactive.minSize.desktop,
        }}
      >
        {isValidating ? 'Validating...' : `Place ${orderSide.toUpperCase()} Order`}
      </button>
    </form>
  )
}