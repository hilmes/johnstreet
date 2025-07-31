'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { dieterRamsDesign as ds, designHelpers } from '@/lib/design/DieterRamsDesignSystem'

interface Order {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit' | 'stop' | 'stop-limit' | 'trailing-stop'
  status: 'pending' | 'partial' | 'filled' | 'cancelled' | 'rejected' | 'expired'
  price: number
  stopPrice?: number
  size: number
  filled: number
  remaining: number
  avgFillPrice?: number
  timeInForce: 'GTC' | 'IOC' | 'FOK' | 'GTD' | 'DAY'
  createdAt: number
  updatedAt: number
  expiresAt?: number
  notes?: string
  source: 'manual' | 'strategy' | 'api'
  strategyId?: string
  parentOrderId?: string
  childOrders?: string[]
  fees?: number
  slippage?: number
}

interface OrderFilter {
  status: 'all' | Order['status']
  side: 'all' | Order['side']
  type: 'all' | Order['type']
  symbol: string
  dateRange: 'today' | 'week' | 'month' | 'all'
}

interface OrderStats {
  totalOrders: number
  pendingOrders: number
  filledOrders: number
  cancelledOrders: number
  totalVolume: number
  totalFees: number
  avgFillRate: number
  avgSlippage: number
}

export default function OrderManagementPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<OrderFilter>({
    status: 'all',
    side: 'all',
    type: 'all',
    symbol: '',
    dateRange: 'today',
  })
  const [sortBy, setSortBy] = useState<'time' | 'symbol' | 'size' | 'price'>('time')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [editingOrder, setEditingOrder] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editSize, setEditSize] = useState('')

  // Mock data
  useEffect(() => {
    const mockOrders: Order[] = [
      {
        id: '1',
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'limit',
        status: 'pending',
        price: 68000,
        size: 0.5,
        filled: 0,
        remaining: 0.5,
        timeInForce: 'GTC',
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 3600000,
        source: 'manual',
      },
      {
        id: '2',
        symbol: 'ETH/USD',
        side: 'sell',
        type: 'market',
        status: 'filled',
        price: 3850,
        size: 5,
        filled: 5,
        remaining: 0,
        avgFillPrice: 3852.50,
        timeInForce: 'IOC',
        createdAt: Date.now() - 7200000,
        updatedAt: Date.now() - 7190000,
        source: 'strategy',
        strategyId: 'momentum-1',
        fees: 19.26,
        slippage: 2.50,
      },
      {
        id: '3',
        symbol: 'SOL/USD',
        side: 'buy',
        type: 'stop',
        status: 'pending',
        price: 180,
        stopPrice: 175,
        size: 10,
        filled: 0,
        remaining: 10,
        timeInForce: 'GTC',
        createdAt: Date.now() - 1800000,
        updatedAt: Date.now() - 1800000,
        source: 'manual',
      },
      {
        id: '4',
        symbol: 'BTC/USD',
        side: 'sell',
        type: 'limit',
        status: 'partial',
        price: 70000,
        size: 1,
        filled: 0.3,
        remaining: 0.7,
        avgFillPrice: 69950,
        timeInForce: 'DAY',
        createdAt: Date.now() - 5400000,
        updatedAt: Date.now() - 1200000,
        source: 'api',
        fees: 20.99,
      },
      {
        id: '5',
        symbol: 'ETH/USD',
        side: 'buy',
        type: 'limit',
        status: 'cancelled',
        price: 3800,
        size: 3,
        filled: 0,
        remaining: 3,
        timeInForce: 'GTC',
        createdAt: Date.now() - 10800000,
        updatedAt: Date.now() - 9000000,
        source: 'manual',
        notes: 'Cancelled due to market conditions',
      },
    ]

    setOrders(mockOrders)
  }, [])

  // Calculate stats
  const stats: OrderStats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    filledOrders: orders.filter(o => o.status === 'filled').length,
    cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
    totalVolume: orders.reduce((sum, o) => sum + (o.filled * o.price), 0),
    totalFees: orders.reduce((sum, o) => sum + (o.fees || 0), 0),
    avgFillRate: orders.length > 0 ? 
      (orders.filter(o => o.status === 'filled').length / orders.length) * 100 : 0,
    avgSlippage: orders.filter(o => o.slippage).reduce((sum, o, _, arr) => 
      sum + (o.slippage || 0) / arr.length, 0),
  }

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (filter.status !== 'all' && order.status !== filter.status) return false
    if (filter.side !== 'all' && order.side !== filter.side) return false
    if (filter.type !== 'all' && order.type !== filter.type) return false
    if (filter.symbol && !order.symbol.toLowerCase().includes(filter.symbol.toLowerCase())) return false
    
    if (filter.dateRange !== 'all') {
      const now = Date.now()
      const orderTime = order.createdAt
      const day = 24 * 60 * 60 * 1000
      
      switch (filter.dateRange) {
        case 'today':
          if (now - orderTime > day) return false
          break
        case 'week':
          if (now - orderTime > 7 * day) return false
          break
        case 'month':
          if (now - orderTime > 30 * day) return false
          break
      }
    }
    
    return true
  })

  // Sort orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'time':
        comparison = a.createdAt - b.createdAt
        break
      case 'symbol':
        comparison = a.symbol.localeCompare(b.symbol)
        break
      case 'size':
        comparison = a.size - b.size
        break
      case 'price':
        comparison = a.price - b.price
        break
    }
    
    return sortOrder === 'asc' ? comparison : -comparison
  })

  const handleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
    setShowBulkActions(newSelected.size > 0)
  }

  const handleSelectAll = () => {
    if (selectedOrders.size === sortedOrders.length) {
      setSelectedOrders(new Set())
      setShowBulkActions(false)
    } else {
      setSelectedOrders(new Set(sortedOrders.map(o => o.id)))
      setShowBulkActions(true)
    }
  }

  const handleCancelOrder = (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: 'cancelled', updatedAt: Date.now() } : order
    ))
  }

  const handleBulkCancel = () => {
    setOrders(prev => prev.map(order => 
      selectedOrders.has(order.id) && (order.status === 'pending' || order.status === 'partial') ? 
        { ...order, status: 'cancelled', updatedAt: Date.now() } : order
    ))
    setSelectedOrders(new Set())
    setShowBulkActions(false)
  }

  const handleEditOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (order) {
      setEditingOrder(orderId)
      setEditPrice(order.price.toString())
      setEditSize(order.remaining.toString())
    }
  }

  const handleSaveEdit = () => {
    if (!editingOrder) return
    
    setOrders(prev => prev.map(order => 
      order.id === editingOrder ? {
        ...order,
        price: parseFloat(editPrice) || order.price,
        size: (order.filled + parseFloat(editSize)) || order.size,
        remaining: parseFloat(editSize) || order.remaining,
        updatedAt: Date.now(),
      } : order
    ))
    
    setEditingOrder(null)
    setEditPrice('')
    setEditSize('')
  }

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return ds.colors.semantic.info
      case 'partial': return ds.colors.semantic.warning
      case 'filled': return ds.colors.semantic.success
      case 'cancelled': return ds.colors.grayscale[60]
      case 'rejected': return ds.colors.semantic.error
      case 'expired': return ds.colors.grayscale[50]
      default: return ds.colors.semantic.neutral
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60))
      return `${minutes}m ago`
    } else if (hours < 24) {
      return `${hours}h ago`
    } else {
      return date.toLocaleDateString()
    }
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
              Order Management
            </h1>
            <p style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              margin: 0,
            }}>
              Monitor and manage all your trading orders
            </p>
          </div>

          {showBulkActions && (
            <div style={{
              display: 'flex',
              gap: ds.spacing.medium,
              alignItems: 'center',
            }}>
              <span style={{
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
              }}>
                {selectedOrders.size} selected
              </span>
              <button
                onClick={handleBulkCancel}
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
                Cancel Selected
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Stats Bar */}
      <section style={{
        backgroundColor: ds.colors.semantic.background.secondary,
        borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
      }}>
        <div style={{
          maxWidth: ds.grid.maxWidth,
          margin: '0 auto',
          padding: ds.spacing.large,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: ds.spacing.large,
        }}>
          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.micro,
            }}>
              Total Orders
            </div>
            <div style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
            }}>
              {stats.totalOrders}
            </div>
          </div>

          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.micro,
            }}>
              Pending
            </div>
            <div style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              color: ds.colors.semantic.info,
            }}>
              {stats.pendingOrders}
            </div>
          </div>

          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.micro,
            }}>
              Filled
            </div>
            <div style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              color: ds.colors.semantic.success,
            }}>
              {stats.filledOrders}
            </div>
          </div>

          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.micro,
            }}>
              Fill Rate
            </div>
            <div style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
            }}>
              {stats.avgFillRate.toFixed(1)}%
            </div>
          </div>

          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.micro,
            }}>
              Total Volume
            </div>
            <div style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
            }}>
              ${stats.totalVolume.toLocaleString()}
            </div>
          </div>

          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.micro,
            }}>
              Total Fees
            </div>
            <div style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              color: ds.colors.semantic.sell,
            }}>
              ${stats.totalFees.toFixed(2)}
            </div>
          </div>

          <div>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.micro,
            }}>
              Avg Slippage
            </div>
            <div style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
            }}>
              ${stats.avgSlippage.toFixed(2)}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main style={{
        maxWidth: ds.grid.maxWidth,
        margin: '0 auto',
        padding: ds.spacing.large,
      }}>
        {/* Filters */}
        <section style={{
          marginBottom: ds.spacing.large,
          display: 'flex',
          gap: ds.spacing.medium,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value as any })}
            style={{
              padding: ds.spacing.small,
              backgroundColor: ds.colors.semantic.background.secondary,
              color: ds.colors.grayscale[90],
              border: `1px solid ${ds.colors.grayscale[30]}`,
              borderRadius: ds.interactive.radius.small,
              fontSize: ds.typography.scale.small,
              cursor: 'pointer',
            }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="filled">Filled</option>
            <option value="cancelled">Cancelled</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>

          <select
            value={filter.side}
            onChange={(e) => setFilter({ ...filter, side: e.target.value as any })}
            style={{
              padding: ds.spacing.small,
              backgroundColor: ds.colors.semantic.background.secondary,
              color: ds.colors.grayscale[90],
              border: `1px solid ${ds.colors.grayscale[30]}`,
              borderRadius: ds.interactive.radius.small,
              fontSize: ds.typography.scale.small,
              cursor: 'pointer',
            }}
          >
            <option value="all">All Sides</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>

          <select
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value as any })}
            style={{
              padding: ds.spacing.small,
              backgroundColor: ds.colors.semantic.background.secondary,
              color: ds.colors.grayscale[90],
              border: `1px solid ${ds.colors.grayscale[30]}`,
              borderRadius: ds.interactive.radius.small,
              fontSize: ds.typography.scale.small,
              cursor: 'pointer',
            }}
          >
            <option value="all">All Types</option>
            <option value="market">Market</option>
            <option value="limit">Limit</option>
            <option value="stop">Stop</option>
            <option value="stop-limit">Stop Limit</option>
            <option value="trailing-stop">Trailing Stop</option>
          </select>

          <input
            type="text"
            placeholder="Filter by symbol..."
            value={filter.symbol}
            onChange={(e) => setFilter({ ...filter, symbol: e.target.value })}
            style={{
              padding: ds.spacing.small,
              backgroundColor: ds.colors.semantic.background.secondary,
              color: ds.colors.grayscale[90],
              border: `1px solid ${ds.colors.grayscale[30]}`,
              borderRadius: ds.interactive.radius.small,
              fontSize: ds.typography.scale.small,
              width: '200px',
            }}
          />

          <select
            value={filter.dateRange}
            onChange={(e) => setFilter({ ...filter, dateRange: e.target.value as any })}
            style={{
              padding: ds.spacing.small,
              backgroundColor: ds.colors.semantic.background.secondary,
              color: ds.colors.grayscale[90],
              border: `1px solid ${ds.colors.grayscale[30]}`,
              borderRadius: ds.interactive.radius.small,
              fontSize: ds.typography.scale.small,
              cursor: 'pointer',
            }}
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: ds.spacing.small }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: ds.spacing.small,
                backgroundColor: ds.colors.semantic.background.secondary,
                color: ds.colors.grayscale[90],
                border: `1px solid ${ds.colors.grayscale[30]}`,
                borderRadius: ds.interactive.radius.small,
                fontSize: ds.typography.scale.small,
                cursor: 'pointer',
              }}
            >
              <option value="time">Sort by Time</option>
              <option value="symbol">Sort by Symbol</option>
              <option value="size">Sort by Size</option>
              <option value="price">Sort by Price</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              style={{
                padding: ds.spacing.small,
                backgroundColor: ds.colors.semantic.background.secondary,
                color: ds.colors.grayscale[90],
                border: `1px solid ${ds.colors.grayscale[30]}`,
                borderRadius: ds.interactive.radius.small,
                fontSize: ds.typography.scale.small,
                cursor: 'pointer',
                transition: designHelpers.animate('all', ds.animation.durations.fast),
              }}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </section>

        {/* Orders Table */}
        <section style={{
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
                  textAlign: 'center',
                  fontWeight: ds.typography.weights.medium,
                  color: ds.colors.grayscale[70],
                  width: '40px',
                }}>
                  <input
                    type="checkbox"
                    checked={selectedOrders.size === sortedOrders.length && sortedOrders.length > 0}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
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
                  Price
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
                  Filled
                </th>
                <th style={{
                  padding: ds.spacing.medium,
                  textAlign: 'left',
                  fontWeight: ds.typography.weights.medium,
                  color: ds.colors.grayscale[70],
                }}>
                  Status
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
              {sortedOrders.map((order) => {
                const isEditing = editingOrder === order.id
                const fillPercentage = (order.filled / order.size) * 100

                return (
                  <tr key={order.id} style={{
                    backgroundColor: selectedOrders.has(order.id) ? 
                      `${ds.colors.semantic.primary}10` : 'transparent',
                  }}>
                    <td style={{
                      padding: ds.spacing.medium,
                      borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      textAlign: 'center',
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => handleSelectOrder(order.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{
                      padding: ds.spacing.medium,
                      borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      fontSize: ds.typography.scale.mini,
                      color: ds.colors.grayscale[70],
                    }}>
                      {formatTimestamp(order.createdAt)}
                    </td>
                    <td style={{
                      padding: ds.spacing.medium,
                      borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      fontFamily: ds.typography.families.data,
                      fontWeight: ds.typography.weights.medium,
                    }}>
                      {order.symbol}
                    </td>
                    <td style={{
                      padding: ds.spacing.medium,
                      borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                    }}>
                      <span style={{
                        display: 'inline-block',
                        padding: `${ds.spacing.micro} ${ds.spacing.mini}`,
                        backgroundColor: ds.colors.semantic.background.tertiary,
                        borderRadius: ds.interactive.radius.small,
                        fontSize: ds.typography.scale.mini,
                        textTransform: 'uppercase',
                      }}>
                        {order.type}
                      </span>
                    </td>
                    <td style={{
                      padding: ds.spacing.medium,
                      borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                    }}>
                      <span style={{
                        display: 'inline-block',
                        padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                        backgroundColor: order.side === 'buy' ? 
                          `${ds.colors.semantic.buy}20` : 
                          `${ds.colors.semantic.sell}20`,
                        color: order.side === 'buy' ? 
                          ds.colors.semantic.buy : 
                          ds.colors.semantic.sell,
                        borderRadius: ds.interactive.radius.small,
                        fontSize: ds.typography.scale.mini,
                        fontWeight: ds.typography.weights.medium,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        {order.side}
                      </span>
                    </td>
                    <td style={{
                      padding: ds.spacing.medium,
                      borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      textAlign: 'right',
                      fontFamily: ds.typography.families.data,
                    }}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          style={{
                            width: '80px',
                            padding: ds.spacing.mini,
                            backgroundColor: ds.colors.semantic.background.primary,
                            color: ds.colors.grayscale[90],
                            border: `1px solid ${ds.colors.semantic.primary}`,
                            borderRadius: ds.interactive.radius.small,
                            fontSize: ds.typography.scale.small,
                            fontFamily: ds.typography.families.data,
                            textAlign: 'right',
                          }}
                        />
                      ) : (
                        <span>
                          ${order.price.toFixed(2)}
                          {order.stopPrice && (
                            <div style={{
                              fontSize: ds.typography.scale.mini,
                              color: ds.colors.grayscale[60],
                            }}>
                              Stop: ${order.stopPrice.toFixed(2)}
                            </div>
                          )}
                        </span>
                      )}
                    </td>
                    <td style={{
                      padding: ds.spacing.medium,
                      borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      textAlign: 'right',
                      fontFamily: ds.typography.families.data,
                    }}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editSize}
                          onChange={(e) => setEditSize(e.target.value)}
                          style={{
                            width: '60px',
                            padding: ds.spacing.mini,
                            backgroundColor: ds.colors.semantic.background.primary,
                            color: ds.colors.grayscale[90],
                            border: `1px solid ${ds.colors.semantic.primary}`,
                            borderRadius: ds.interactive.radius.small,
                            fontSize: ds.typography.scale.small,
                            fontFamily: ds.typography.families.data,
                            textAlign: 'right',
                          }}
                        />
                      ) : (
                        order.size
                      )}
                    </td>
                    <td style={{
                      padding: ds.spacing.medium,
                      borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      textAlign: 'right',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: ds.spacing.small }}>
                        <div style={{
                          width: '50px',
                          height: '6px',
                          backgroundColor: ds.colors.grayscale[20],
                          borderRadius: ds.interactive.radius.pill,
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${fillPercentage}%`,
                            height: '100%',
                            backgroundColor: ds.colors.semantic.primary,
                          }} />
                        </div>
                        <span style={{
                          fontSize: ds.typography.scale.small,
                          fontFamily: ds.typography.families.data,
                        }}>
                          {order.filled}/{order.size}
                        </span>
                      </div>
                    </td>
                    <td style={{
                      padding: ds.spacing.medium,
                      borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                    }}>
                      <span style={{
                        display: 'inline-block',
                        padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                        backgroundColor: `${getStatusColor(order.status)}20`,
                        color: getStatusColor(order.status),
                        borderRadius: ds.interactive.radius.small,
                        fontSize: ds.typography.scale.mini,
                        fontWeight: ds.typography.weights.medium,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{
                      padding: ds.spacing.medium,
                      borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      textAlign: 'center',
                    }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: ds.spacing.mini, justifyContent: 'center' }}>
                          <button
                            onClick={handleSaveEdit}
                            style={{
                              padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                              backgroundColor: ds.colors.semantic.success,
                              color: ds.colors.grayscale[5],
                              border: 'none',
                              borderRadius: ds.interactive.radius.small,
                              fontSize: ds.typography.scale.mini,
                              cursor: 'pointer',
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingOrder(null)
                              setEditPrice('')
                              setEditSize('')
                            }}
                            style={{
                              padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                              backgroundColor: 'transparent',
                              color: ds.colors.grayscale[60],
                              border: `1px solid ${ds.colors.grayscale[30]}`,
                              borderRadius: ds.interactive.radius.small,
                              fontSize: ds.typography.scale.mini,
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: ds.spacing.mini, justifyContent: 'center' }}>
                          {(order.status === 'pending' || order.status === 'partial') && (
                            <>
                              <button
                                onClick={() => handleEditOrder(order.id)}
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
                                Edit
                              </button>
                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                style={{
                                  padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                                  backgroundColor: 'transparent',
                                  color: ds.colors.semantic.error,
                                  border: `1px solid ${ds.colors.grayscale[30]}`,
                                  borderRadius: ds.interactive.radius.small,
                                  fontSize: ds.typography.scale.mini,
                                  cursor: 'pointer',
                                  transition: designHelpers.animate('all', ds.animation.durations.fast),
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {order.notes && (
                            <button
                              title={order.notes}
                              style={{
                                padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                                backgroundColor: 'transparent',
                                color: ds.colors.grayscale[60],
                                border: `1px solid ${ds.colors.grayscale[30]}`,
                                borderRadius: ds.interactive.radius.small,
                                fontSize: ds.typography.scale.mini,
                                cursor: 'pointer',
                              }}
                            >
                              ℹ️
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {sortedOrders.length === 0 && (
            <div style={{
              padding: ds.spacing.xxlarge,
              textAlign: 'center',
              color: ds.colors.grayscale[60],
            }}>
              No orders found matching your filters
            </div>
          )}
        </section>
      </main>
    </div>
  )
}