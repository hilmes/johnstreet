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
      {/* Order Context - Current Market Price */}
      {marketData && (
        <div style={{
          padding: ds.spacing.medium,
          backgroundColor: ds.colors.semantic.background.primary,
          borderRadius: ds.interactive.radius.medium,
          marginBottom: ds.spacing.large,
          border: `1px solid ${ds.colors.grayscale[20]}`
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: ds.spacing.small
          }}>
            <span style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              fontWeight: ds.typography.weights.medium
            }}>
              Current Market
            </span>
            <span style={{
              fontSize: ds.typography.scale.mini,
              color: ds.colors.grayscale[60],
              fontFamily: ds.typography.families.data
            }}>
              Live
            </span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: ds.spacing.medium,
            textAlign: 'center'
          }}>
            <div>
              <div style={{
                fontSize: ds.typography.scale.mini,
                color: ds.colors.grayscale[60],
                marginBottom: ds.spacing.micro
              }}>BID</div>
              <div style={{
                fontSize: ds.typography.scale.small,
                fontFamily: ds.typography.families.data,
                color: ds.colors.semantic.buy,
                fontWeight: ds.typography.weights.semibold
              }}>
                ${marketData.bid.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{
                fontSize: ds.typography.scale.mini,
                color: ds.colors.grayscale[60],
                marginBottom: ds.spacing.micro
              }}>LAST</div>
              <div style={{
                fontSize: ds.typography.scale.small,
                fontFamily: ds.typography.families.data,
                color: ds.colors.grayscale[90],
                fontWeight: ds.typography.weights.semibold
              }}>
                ${marketData.last.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{
                fontSize: ds.typography.scale.mini,
                color: ds.colors.grayscale[60],
                marginBottom: ds.spacing.micro
              }}>ASK</div>
              <div style={{
                fontSize: ds.typography.scale.small,
                fontFamily: ds.typography.families.data,
                color: ds.colors.semantic.sell,
                fontWeight: ds.typography.weights.semibold
              }}>
                ${marketData.ask.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Order Side Selector with Visual Feedback */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: ds.spacing.mini,
        marginBottom: ds.spacing.large,
        padding: ds.spacing.mini,
        backgroundColor: ds.colors.semantic.background.primary,
        borderRadius: ds.interactive.radius.medium,
        border: `1px solid ${ds.colors.grayscale[20]}`
      }}>
        <button
          type="button"
          onClick={() => setOrderSide('buy')}
          style={{
            position: 'relative',
            padding: ds.spacing.medium,
            backgroundColor: orderSide === 'buy' ? ds.colors.semantic.buy : 'transparent',
            color: orderSide === 'buy' ? ds.colors.grayscale[5] : ds.colors.grayscale[70],
            border: orderSide === 'buy' ? 'none' : `1px solid ${ds.colors.grayscale[30]}`,
            borderRadius: ds.interactive.radius.medium,
            fontSize: ds.typography.scale.base,
            fontWeight: ds.typography.weights.semibold,
            cursor: 'pointer',
            transition: designHelpers.animate('all', ds.animation.durations.fast),
            minHeight: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            if (orderSide !== 'buy') {
              e.currentTarget.style.backgroundColor = `${ds.colors.semantic.buy}10`
              e.currentTarget.style.color = ds.colors.semantic.buy
            }
          }}
          onMouseLeave={(e) => {
            if (orderSide !== 'buy') {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = ds.colors.grayscale[70]
            }
          }}
        >
          BUY
          {orderSide === 'buy' && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '2px',
              backgroundColor: ds.colors.grayscale[5],
              opacity: 0.8
            }} />
          )}
        </button>
        <button
          type="button"
          onClick={() => setOrderSide('sell')}
          style={{
            position: 'relative',
            padding: ds.spacing.medium,
            backgroundColor: orderSide === 'sell' ? ds.colors.semantic.sell : 'transparent',
            color: orderSide === 'sell' ? ds.colors.grayscale[95] : ds.colors.grayscale[70],
            border: orderSide === 'sell' ? 'none' : `1px solid ${ds.colors.grayscale[30]}`,
            borderRadius: ds.interactive.radius.medium,
            fontSize: ds.typography.scale.base,
            fontWeight: ds.typography.weights.semibold,
            cursor: 'pointer',
            transition: designHelpers.animate('all', ds.animation.durations.fast),
            minHeight: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            if (orderSide !== 'sell') {
              e.currentTarget.style.backgroundColor = `${ds.colors.semantic.sell}10`
              e.currentTarget.style.color = ds.colors.semantic.sell
            }
          }}
          onMouseLeave={(e) => {
            if (orderSide !== 'sell') {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = ds.colors.grayscale[70]
            }
          }}
        >
          SELL
          {orderSide === 'sell' && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '2px',
              backgroundColor: ds.colors.grayscale[95],
              opacity: 0.8
            }} />
          )}
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

      {/* Order Risk Assessment */}
      <div style={{
        padding: ds.spacing.medium,
        backgroundColor: ds.colors.semantic.background.primary,
        borderRadius: ds.interactive.radius.medium,
        marginBottom: ds.spacing.large,
        border: `1px solid ${total > availableBalance * 0.8 ? ds.colors.semantic.danger : ds.colors.grayscale[20]}`
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: ds.spacing.small
        }}>
          <span style={{
            fontSize: ds.typography.scale.small,
            color: ds.colors.grayscale[70],
            fontWeight: ds.typography.weights.medium
          }}>
            Risk Check
          </span>
          <div style={{
            padding: `${ds.spacing.micro} ${ds.spacing.small}`,
            backgroundColor: total > availableBalance * 0.8 ? 
              `${ds.colors.semantic.danger}15` : `${ds.colors.semantic.buy}15`,
            color: total > availableBalance * 0.8 ? 
              ds.colors.semantic.danger : ds.colors.semantic.buy,
            borderRadius: ds.interactive.radius.small,
            fontSize: ds.typography.scale.mini,
            fontWeight: ds.typography.weights.medium
          }}>
            {total > availableBalance * 0.8 ? 'HIGH RISK' : 'LOW RISK'}
          </div>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: ds.spacing.medium,
          fontSize: ds.typography.scale.small
        }}>
          <div>
            <span style={{ color: ds.colors.grayscale[60] }}>Portfolio Impact:</span>
            <div style={{
              fontFamily: ds.typography.families.data,
              fontWeight: ds.typography.weights.semibold,
              color: ds.colors.grayscale[90]
            }}>
              {((total / availableBalance) * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <span style={{ color: ds.colors.grayscale[60] }}>Remaining Balance:</span>
            <div style={{
              fontFamily: ds.typography.families.data,
              fontWeight: ds.typography.weights.semibold,
              color: (availableBalance - total) < availableBalance * 0.1 ? 
                ds.colors.semantic.danger : ds.colors.grayscale[90]
            }}>
              ${(availableBalance - total).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Submit Button with Confirmation */}
      <div style={{ position: 'relative' }}>
        <button
          type="submit"
          disabled={isValidating || Object.keys(errors).length > 0}
          style={{
            width: '100%',
            padding: ds.spacing.medium,
            backgroundColor: 
              isValidating ? ds.colors.grayscale[50] :
              Object.keys(errors).length > 0 ? ds.colors.grayscale[30] :
              orderSide === 'buy' ? ds.colors.semantic.buy : ds.colors.semantic.sell,
            color: 
              isValidating || Object.keys(errors).length > 0 ? ds.colors.grayscale[60] :
              orderSide === 'buy' ? ds.colors.grayscale[5] : ds.colors.grayscale[95],
            border: 'none',
            borderRadius: ds.interactive.radius.medium,
            fontSize: ds.typography.scale.base,
            fontWeight: ds.typography.weights.semibold,
            cursor: isValidating || Object.keys(errors).length > 0 ? 'not-allowed' : 'pointer',
            transition: designHelpers.animate('all', ds.animation.durations.fast),
            minHeight: '52px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: ds.spacing.small
          }}
          onMouseEnter={(e) => {
            if (!isValidating && Object.keys(errors).length === 0) {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          {isValidating ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid transparent',
                borderTop: `2px solid ${ds.colors.grayscale[60]}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Validating Order...
            </>
          ) : Object.keys(errors).length > 0 ? (
            `Fix ${Object.keys(errors).length} Error${Object.keys(errors).length > 1 ? 's' : ''}`
          ) : (
            <>
              <span>{`Place ${orderSide.toUpperCase()} Order`}</span>
              <span style={{
                fontSize: ds.typography.scale.mini,
                opacity: 0.8,
                fontFamily: ds.typography.families.data
              }}>
                ${total.toFixed(2)}
              </span>
            </>
          )}
        </button>
        
        {/* Progress indicator during validation */}
        {isValidating && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '2px',
            backgroundColor: orderSide === 'buy' ? ds.colors.semantic.buy : ds.colors.semantic.sell,
            borderRadius: '1px',
            animation: 'progress 2s ease-in-out infinite'
          }} />
        )}
      </div>
      
      {/* Additional styles for animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
      `}</style>
    </form>
  )
}