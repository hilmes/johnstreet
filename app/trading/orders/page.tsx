'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect, useMemo } from 'react'

// Crypto-dark theme colors
const theme = {
  colors: {
    background: '#0d0e14',
    surface: '#1e222d',
    border: '#2a2e39',
    text: {
      primary: '#d1d4dc',
      secondary: '#787b86'
    },
    success: '#26a69a',
    danger: '#ef5350',
    // Additional semantic colors for trading
    buy: '#26a69a',
    sell: '#ef5350',
    primary: '#4a9eff',
    warning: '#ffa726',
    overlay: 'rgba(0, 0, 0, 0.75)'
  },
  spacing: {
    mini: '4px',
    small: '8px',
    medium: '16px',
    large: '24px',
    xlarge: '32px',
    xxlarge: '48px',
    xxxlarge: '64px'
  },
  typography: {
    families: {
      interface: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      data: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", monospace'
    },
    sizes: {
      mini: '10px',
      small: '12px',
      medium: '14px',
      large: '16px',
      xlarge: '20px',
      xxlarge: '24px',
      xxxlarge: '32px'
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  radius: {
    small: '4px',
    medium: '6px',
    large: '8px',
    pill: '999px'
  },
  shadows: {
    medium: '0 4px 6px rgba(0, 0, 0, 0.1)',
    large: '0 10px 15px rgba(0, 0, 0, 0.2)'
  },
  zIndex: {
    modal: 1000
  }
}

// Enhanced Order interface with additional fields
interface Order {
  id: string
  timestamp: Date
  pair: string
  type: 'market' | 'limit' | 'stop' | 'stop-limit'
  side: 'buy' | 'sell'
  price: number
  amount: number
  filled: number
  total: number
  status: 'active' | 'filled' | 'cancelled' | 'partial' | 'expired'
  fee?: number
  averagePrice?: number
  stopPrice?: number
  conditions?: string[]
  // Legacy fields for compatibility
  symbol: string
  size: number
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

interface FilterState {
  pair: string
  type: string
  side: string
  status: string
  dateFrom: string
  dateTo: string
  search: string
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

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active')
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  
  // Filters
  const [filters, setFilters] = useState<FilterState>({
    pair: '',
    type: '',
    side: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  })

  // Generate comprehensive mock data
  useEffect(() => {
    const generateMockOrders = (): Order[] => {
      const pairs = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'ADA/USD', 'DOT/USD']
      const types: Order['type'][] = ['market', 'limit', 'stop', 'stop-limit']
      const sides: Order['side'][] = ['buy', 'sell']
      const statuses: Order['status'][] = ['active', 'filled', 'cancelled', 'partial', 'expired']
      
      const orders: Order[] = []
      
      // Generate active orders
      for (let i = 0; i < 15; i++) {
        const pair = pairs[Math.floor(Math.random() * pairs.length)]
        const type = types[Math.floor(Math.random() * types.length)]
        const side = sides[Math.floor(Math.random() * sides.length)]
        const price = Math.random() * 100000 + 1000
        const amount = Math.random() * 10 + 0.01
        const filled = type === 'market' ? amount : Math.random() * amount
        const timestamp = new Date(Date.now() - Math.random() * 86400000 * 7)
        
        orders.push({
          id: `ORD${String(i + 1).padStart(6, '0')}`,
          timestamp,
          pair,
          type,
          side,
          price,
          amount,
          filled,
          total: price * amount,
          status: i < 5 ? 'active' : statuses[Math.floor(Math.random() * statuses.length)],
          fee: price * amount * 0.001, // 0.1% fee
          averagePrice: filled > 0 ? price * (0.95 + Math.random() * 0.1) : undefined,
          stopPrice: type.includes('stop') ? price * (side === 'buy' ? 1.05 : 0.95) : undefined,
          conditions: type === 'stop-limit' ? ['Stop Price Triggered'] : undefined,
          // Legacy fields for compatibility
          symbol: pair,
          size: amount,
          remaining: amount - filled,
          avgFillPrice: filled > 0 ? price * (0.95 + Math.random() * 0.1) : undefined,
          timeInForce: 'GTC',
          createdAt: timestamp.getTime(),
          updatedAt: timestamp.getTime(),
          source: 'manual',
          fees: price * amount * 0.001,
        })
      }
      
      // Generate more historical orders
      for (let i = 15; i < 100; i++) {
        const pair = pairs[Math.floor(Math.random() * pairs.length)]
        const type = types[Math.floor(Math.random() * types.length)]
        const side = sides[Math.floor(Math.random() * sides.length)]
        const price = Math.random() * 100000 + 1000
        const amount = Math.random() * 10 + 0.01
        const filled = amount
        const timestamp = new Date(Date.now() - Math.random() * 86400000 * 30)
        
        orders.push({
          id: `ORD${String(i + 1).padStart(6, '0')}`,
          timestamp,
          pair,
          type,
          side,
          price,
          amount,
          filled,
          total: price * amount,
          status: 'filled',
          fee: price * amount * 0.001,
          averagePrice: price * (0.95 + Math.random() * 0.1),
          // Legacy fields for compatibility
          symbol: pair,
          size: amount,
          remaining: 0,
          avgFillPrice: price * (0.95 + Math.random() * 0.1),
          timeInForce: 'GTC',
          createdAt: timestamp.getTime(),
          updatedAt: timestamp.getTime(),
          source: 'manual',
          fees: price * amount * 0.001,
        })
      }
      
      return orders.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    }

    // Simulate API call
    setTimeout(() => {
      setOrders(generateMockOrders())
      setIsLoading(false)
    }, 1000)
  }, [])

  // Filter orders based on active tab and filters
  const filteredOrders = useMemo(() => {
    let filtered = orders.filter(order => {
      if (activeTab === 'active') {
        return order.status === 'active' || order.status === 'partial'
      } else {
        return order.status === 'filled' || order.status === 'cancelled' || order.status === 'expired'
      }
    })

    // Apply filters
    if (filters.pair) {
      filtered = filtered.filter(order => order.pair === filters.pair)
    }
    if (filters.type) {
      filtered = filtered.filter(order => order.type === filters.type)
    }
    if (filters.side) {
      filtered = filtered.filter(order => order.side === filters.side)
    }
    if (filters.status) {
      filtered = filtered.filter(order => order.status === filters.status)
    }
    if (filters.dateFrom) {
      filtered = filtered.filter(order => order.timestamp >= new Date(filters.dateFrom))
    }
    if (filters.dateTo) {
      filtered = filtered.filter(order => order.timestamp <= new Date(filters.dateTo + 'T23:59:59'))
    }
    if (filters.search) {
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(filters.search.toLowerCase()) ||
        order.pair.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    return filtered
  }, [orders, activeTab, filters])

  // Get unique values for filter dropdowns
  const uniquePairs = useMemo(() => [...new Set(orders.map(o => o.pair))].sort(), [orders])
  const uniqueTypes = useMemo(() => [...new Set(orders.map(o => o.type))].sort(), [orders])
  const uniqueStatuses = useMemo(() => {
    if (activeTab === 'active') {
      return ['active', 'partial']
    } else {
      return ['filled', 'cancelled', 'expired']
    }
  }, [activeTab])

  // Calculate stats
  const stats: OrderStats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'active' || o.status === 'partial').length,
    filledOrders: orders.filter(o => o.status === 'filled').length,
    cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
    totalVolume: orders.reduce((sum, o) => sum + (o.filled * o.price), 0),
    totalFees: orders.reduce((sum, o) => sum + (o.fees || 0), 0),
    avgFillRate: orders.length > 0 ? 
      (orders.filter(o => o.status === 'filled').length / orders.length) * 100 : 0,
    avgSlippage: orders.filter(o => o.slippage).reduce((sum, o, _, arr) => 
      sum + (o.slippage || 0) / arr.length, 0),
  }

  // Cancel order handler
  const handleCancelOrder = (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'cancelled' as const }
        : order
    ))
  }

  // Export functionality
  const handleExport = () => {
    const csvContent = [
      'Order ID,Date/Time,Pair,Type,Side,Price,Amount,Filled,Total,Status,Fee',
      ...filteredOrders.map(order => [
        order.id,
        order.timestamp.toISOString(),
        order.pair,
        order.type,
        order.side,
        order.price.toFixed(8),
        order.amount.toFixed(8),
        order.filled.toFixed(8),
        order.total.toFixed(2),
        order.status,
        order.fee?.toFixed(2) || '0'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `orders-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'active': return theme.colors.warning
      case 'partial': return theme.colors.primary
      case 'filled': return theme.colors.success
      case 'cancelled': return theme.colors.text.secondary
      case 'expired': return theme.colors.danger
      default: return theme.colors.text.secondary
    }
  }

  return (
    <div style={{
      backgroundColor: theme.colors.background,
      color: theme.colors.text.primary,
      minHeight: '100vh',
      fontFamily: theme.typography.families.interface,
    }}>
      {/* Header */}
      <header style={{
        paddingLeft: theme.spacing.small,
        paddingRight: theme.spacing.large,
        paddingTop: theme.spacing.large,
        paddingBottom: theme.spacing.large,
        borderBottom: `1px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.surface,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h1 style={{
              fontSize: theme.typography.sizes.xlarge,
              fontWeight: theme.typography.weights.semibold,
              margin: 0,
              marginBottom: theme.spacing.mini,
            }}>
              Orders & History
            </h1>
            <p style={{
              fontSize: theme.typography.sizes.medium,
              color: theme.colors.text.secondary,
              margin: 0,
            }}>
              Manage your trading orders and view transaction history
            </p>
          </div>
          
          {/* Export Button */}
          <button
            onClick={handleExport}
            style={{
              backgroundColor: theme.colors.primary,
              color: theme.colors.background,
              border: 'none',
              borderRadius: theme.radius.medium,
              padding: `${theme.spacing.medium} ${theme.spacing.large}`,
              fontSize: theme.typography.sizes.medium,
              fontWeight: theme.typography.weights.medium,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = theme.shadows.medium
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Export CSV
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        paddingLeft: theme.spacing.small,
        paddingRight: theme.spacing.large,
        paddingTop: theme.spacing.large,
        paddingBottom: theme.spacing.large,
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: theme.spacing.mini,
          marginBottom: theme.spacing.large,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.medium,
          padding: theme.spacing.mini,
        }}>
          <button
            onClick={() => setActiveTab('active')}
            style={{
              flex: 1,
              padding: `${theme.spacing.medium} ${theme.spacing.large}`,
              backgroundColor: activeTab === 'active' ? theme.colors.primary : 'transparent',
              color: activeTab === 'active' ? theme.colors.background : theme.colors.text.secondary,
              border: 'none',
              borderRadius: theme.radius.small,
              fontSize: theme.typography.sizes.medium,
              fontWeight: theme.typography.weights.medium,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Active Orders ({orders.filter(o => o.status === 'active' || o.status === 'partial').length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: `${theme.spacing.medium} ${theme.spacing.large}`,
              backgroundColor: activeTab === 'history' ? theme.colors.primary : 'transparent',
              color: activeTab === 'history' ? theme.colors.background : theme.colors.text.secondary,
              border: 'none',
              borderRadius: theme.radius.small,
              fontSize: theme.typography.sizes.medium,
              fontWeight: theme.typography.weights.medium,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Order History ({orders.filter(o => o.status === 'filled' || o.status === 'cancelled' || o.status === 'expired').length})
          </button>
        </div>

        {/* Filters */}
        <div style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.medium,
          padding: theme.spacing.large,
          marginBottom: theme.spacing.large,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: theme.spacing.medium,
            alignItems: 'end',
          }}>
            {/* Search */}
            <div>
              <label style={{
                display: 'block',
                fontSize: theme.typography.sizes.small,
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing.mini,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Search
              </label>
              <input
                type="text"
                placeholder="Order ID or Pair..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.small} ${theme.spacing.medium}`,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.medium,
                  fontSize: theme.typography.sizes.medium,
                  fontFamily: theme.typography.families.interface,
                }}
              />
            </div>

            {/* Pair Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: theme.typography.sizes.small,
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing.mini,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Pair
              </label>
              <select
                value={filters.pair}
                onChange={(e) => setFilters(prev => ({ ...prev, pair: e.target.value }))}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.small} ${theme.spacing.medium}`,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.medium,
                  fontSize: theme.typography.sizes.medium,
                  cursor: 'pointer',
                }}
              >
                <option value="">All Pairs</option>
                {uniquePairs.map(pair => (
                  <option key={pair} value={pair}>{pair}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: theme.typography.sizes.small,
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing.mini,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.small} ${theme.spacing.medium}`,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.medium,
                  fontSize: theme.typography.sizes.medium,
                  cursor: 'pointer',
                }}
              >
                <option value="">All Types</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>{type.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Side Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: theme.typography.sizes.small,
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing.mini,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Side
              </label>
              <select
                value={filters.side}
                onChange={(e) => setFilters(prev => ({ ...prev, side: e.target.value }))}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.small} ${theme.spacing.medium}`,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.medium,
                  fontSize: theme.typography.sizes.medium,
                  cursor: 'pointer',
                }}
              >
                <option value="">Buy & Sell</option>
                <option value="buy">Buy Only</option>
                <option value="sell">Sell Only</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: theme.typography.sizes.small,
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing.mini,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.small} ${theme.spacing.medium}`,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.medium,
                  fontSize: theme.typography.sizes.medium,
                  cursor: 'pointer',
                }}
              >
                <option value="">All Statuses</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label style={{
                display: 'block',
                fontSize: theme.typography.sizes.small,
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing.mini,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.small} ${theme.spacing.medium}`,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.medium,
                  fontSize: theme.typography.sizes.medium,
                  fontFamily: theme.typography.families.interface,
                }}
              />
            </div>

            {/* Date To */}
            <div>
              <label style={{
                display: 'block',
                fontSize: theme.typography.sizes.small,
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing.mini,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.small} ${theme.spacing.medium}`,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.medium,
                  fontSize: theme.typography.sizes.medium,
                  fontFamily: theme.typography.families.interface,
                }}
              />
            </div>

            {/* Clear Filters */}
            <div>
              <button
                onClick={() => setFilters({
                  pair: '',
                  type: '',
                  side: '',
                  status: '',
                  dateFrom: '',
                  dateTo: '',
                  search: '',
                })}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.small} ${theme.spacing.medium}`,
                  backgroundColor: 'transparent',
                  color: theme.colors.text.secondary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.medium,
                  fontSize: theme.typography.sizes.medium,
                  fontWeight: theme.typography.weights.medium,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.background
                  e.currentTarget.style.color = theme.colors.text.primary
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = theme.colors.text.secondary
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.medium,
          overflow: 'hidden',
        }}>
          {/* Table Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: theme.spacing.large,
            borderBottom: `1px solid ${theme.colors.border}`,
          }}>
            <h2 style={{
              fontSize: theme.typography.sizes.large,
              fontWeight: theme.typography.weights.semibold,
              margin: 0,
              color: theme.colors.text.primary,
            }}>
              {activeTab === 'active' ? 'Active Orders' : 'Order History'} ({filteredOrders.length})
            </h2>
            
            {isLoading && (
              <div style={{
                fontSize: theme.typography.sizes.small,
                color: theme.colors.text.secondary,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.small,
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: `2px solid ${theme.colors.border}`,
                  borderTop: `2px solid ${theme.colors.primary}`,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                Loading orders...
              </div>
            )}
          </div>

          {/* Table */}
          {!isLoading && filteredOrders.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: theme.typography.families.data,
                fontSize: theme.typography.sizes.small,
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: theme.colors.background,
                  }}>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'left',
                      fontSize: theme.typography.sizes.mini,
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Order ID
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'left',
                      fontSize: theme.typography.sizes.mini,
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Date/Time
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'left',
                      fontSize: theme.typography.sizes.mini,
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Pair
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'left',
                      fontSize: theme.typography.sizes.mini,
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Type
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'left',
                      fontSize: theme.typography.sizes.mini,
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Side
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'right',
                      fontSize: theme.typography.sizes.mini,
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Price
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'right',
                      fontSize: theme.typography.sizes.mini,
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Amount
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'right',
                      fontSize: theme.typography.sizes.mini,
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Filled/Total
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'center',
                      fontSize: theme.typography.sizes.mini,
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Status
                    </th>
                    <th style={{
                      padding: theme.spacing.medium,
                      textAlign: 'center',
                      fontSize: theme.typography.sizes.mini,
                      fontWeight: theme.typography.weights.medium,
                      color: theme.colors.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, index) => (
                    <tr
                      key={order.id}
                      style={{
                        borderBottom: `1px solid ${theme.colors.border}`,
                        backgroundColor: index % 2 === 0 ? 'transparent' : theme.colors.background,
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.background
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'transparent' : theme.colors.background
                      }}
                    >
                      {/* Order ID */}
                      <td style={{
                        padding: theme.spacing.medium,
                        color: theme.colors.primary,
                        fontWeight: theme.typography.weights.medium,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setSelectedOrder(order)
                        setShowOrderDetails(true)
                      }}>
                        {order.id}
                      </td>

                      {/* Date/Time */}
                      <td style={{
                        padding: theme.spacing.medium,
                        color: theme.colors.text.primary,
                      }}>
                        <div>
                          {order.timestamp.toLocaleDateString()}
                        </div>
                        <div style={{
                          fontSize: theme.typography.sizes.mini,
                          color: theme.colors.text.secondary,
                        }}>
                          {order.timestamp.toLocaleTimeString()}
                        </div>
                      </td>

                      {/* Pair */}
                      <td style={{
                        padding: theme.spacing.medium,
                        color: theme.colors.text.primary,
                        fontWeight: theme.typography.weights.medium,
                      }}>
                        {order.pair}
                      </td>

                      {/* Type */}
                      <td style={{
                        padding: theme.spacing.medium,
                        color: theme.colors.text.primary,
                        textTransform: 'uppercase',
                      }}>
                        {order.type}
                      </td>

                      {/* Side */}
                      <td style={{
                        padding: theme.spacing.medium,
                      }}>
                        <span style={{
                          color: order.side === 'buy' ? theme.colors.buy : theme.colors.sell,
                          fontWeight: theme.typography.weights.semibold,
                          textTransform: 'uppercase',
                        }}>
                          {order.side}
                        </span>
                      </td>

                      {/* Price */}
                      <td style={{
                        padding: theme.spacing.medium,
                        textAlign: 'right',
                        color: theme.colors.text.primary,
                        fontWeight: theme.typography.weights.medium,
                        fontFamily: theme.typography.families.data,
                      }}>
                        ${order.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 8,
                        })}
                      </td>

                      {/* Amount */}
                      <td style={{
                        padding: theme.spacing.medium,
                        textAlign: 'right',
                        color: theme.colors.text.primary,
                        fontFamily: theme.typography.families.data,
                      }}>
                        {order.amount.toFixed(8)}
                      </td>

                      {/* Filled/Total */}
                      <td style={{
                        padding: theme.spacing.medium,
                        textAlign: 'right',
                        color: theme.colors.text.primary,
                        fontFamily: theme.typography.families.data,
                      }}>
                        <div>
                          {order.filled.toFixed(8)} / {order.amount.toFixed(8)}
                        </div>
                        <div style={{
                          fontSize: theme.typography.sizes.mini,
                          color: theme.colors.text.secondary,
                        }}>
                          {((order.filled / order.amount) * 100).toFixed(1)}%
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{
                        padding: theme.spacing.medium,
                        textAlign: 'center',
                      }}>
                        <span style={{
                          padding: `${theme.spacing.mini} ${theme.spacing.small}`,
                          borderRadius: theme.radius.pill,
                          fontSize: theme.typography.sizes.mini,
                          fontWeight: theme.typography.weights.medium,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          backgroundColor: 
                            order.status === 'active' ? `${theme.colors.warning}20` :
                            order.status === 'filled' ? `${theme.colors.success}20` :
                            order.status === 'cancelled' ? `${theme.colors.text.secondary}20` :
                            order.status === 'partial' ? `${theme.colors.primary}20` :
                            `${theme.colors.danger}20`,
                          color:
                            order.status === 'active' ? theme.colors.warning :
                            order.status === 'filled' ? theme.colors.success :
                            order.status === 'cancelled' ? theme.colors.text.secondary :
                            order.status === 'partial' ? theme.colors.primary :
                            theme.colors.danger,
                        }}>
                          {order.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{
                        padding: theme.spacing.medium,
                        textAlign: 'center',
                      }}>
                        <div style={{ display: 'flex', gap: theme.spacing.mini, justifyContent: 'center' }}>
                          <button
                            onClick={() => {
                              setSelectedOrder(order)
                              setShowOrderDetails(true)
                            }}
                            style={{
                              padding: `${theme.spacing.mini} ${theme.spacing.small}`,
                              backgroundColor: 'transparent',
                              color: theme.colors.primary,
                              border: `1px solid ${theme.colors.primary}`,
                              borderRadius: theme.radius.small,
                              fontSize: theme.typography.sizes.mini,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme.colors.primary
                              e.currentTarget.style.color = theme.colors.background
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent'
                              e.currentTarget.style.color = theme.colors.primary
                            }}
                          >
                            View
                          </button>
                          
                          {(order.status === 'active' || order.status === 'partial') && (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              style={{
                                padding: `${theme.spacing.mini} ${theme.spacing.small}`,
                                backgroundColor: 'transparent',
                                color: theme.colors.sell,
                                border: `1px solid ${theme.colors.sell}`,
                                borderRadius: theme.radius.small,
                                fontSize: theme.typography.sizes.mini,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = theme.colors.sell
                                e.currentTarget.style.color = theme.colors.background
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                                e.currentTarget.style.color = theme.colors.sell
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredOrders.length === 0 && (
            <div style={{
              padding: `${theme.spacing.xxxlarge} ${theme.spacing.large}`,
              textAlign: 'center',
              color: theme.colors.text.secondary,
            }}>
              <div style={{
                fontSize: theme.typography.sizes.large,
                marginBottom: theme.spacing.medium,
                color: theme.colors.text.primary,
              }}>
                No orders found
              </div>
              <div style={{
                fontSize: theme.typography.sizes.medium,
              }}>
                {activeTab === 'active' 
                  ? "You don't have any active orders at the moment."
                  : "No orders match your current filters."
                }
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.overlay,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: theme.zIndex.modal,
          padding: theme.spacing.large,
        }}
        onClick={() => setShowOrderDetails(false)}>
          <div
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.large,
              padding: theme.spacing.xxlarge,
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: theme.shadows.large,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.large,
              paddingBottom: theme.spacing.large,
              borderBottom: `1px solid ${theme.colors.border}`,
            }}>
              <h2 style={{
                fontSize: theme.typography.sizes.large,
                fontWeight: theme.typography.weights.semibold,
                margin: 0,
                color: theme.colors.text.primary,
              }}>
                Order Details
              </h2>
              <button
                onClick={() => setShowOrderDetails(false)}
                style={{
                  backgroundColor: 'transparent',
                  color: theme.colors.text.secondary,
                  border: 'none',
                  fontSize: theme.typography.sizes.large,
                  cursor: 'pointer',
                  padding: theme.spacing.small,
                  borderRadius: theme.radius.medium,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.background
                  e.currentTarget.style.color = theme.colors.text.primary
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = theme.colors.text.secondary
                }}
              >
                ×
              </button>
            </div>

            {/* Order Information */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: theme.spacing.large,
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: theme.typography.sizes.small,
                  color: theme.colors.text.secondary,
                  marginBottom: theme.spacing.mini,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Order ID
                </label>
                <div style={{
                  fontSize: theme.typography.sizes.medium,
                  color: theme.colors.primary,
                  fontWeight: theme.typography.weights.medium,
                  fontFamily: theme.typography.families.data,
                }}>
                  {selectedOrder.id}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: theme.typography.sizes.small,
                  color: theme.colors.text.secondary,
                  marginBottom: theme.spacing.mini,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Status
                </label>
                <span style={{
                  display: 'inline-block',
                  padding: `${theme.spacing.mini} ${theme.spacing.small}`,
                  borderRadius: theme.radius.pill,
                  fontSize: theme.typography.sizes.small,
                  fontWeight: theme.typography.weights.medium,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  backgroundColor: 
                    selectedOrder.status === 'active' ? `${theme.colors.warning}20` :
                    selectedOrder.status === 'filled' ? `${theme.colors.success}20` :
                    selectedOrder.status === 'cancelled' ? `${theme.colors.text.secondary}20` :
                    selectedOrder.status === 'partial' ? `${theme.colors.primary}20` :
                    `${theme.colors.danger}20`,
                  color:
                    selectedOrder.status === 'active' ? theme.colors.warning :
                    selectedOrder.status === 'filled' ? theme.colors.success :
                    selectedOrder.status === 'cancelled' ? theme.colors.text.secondary :
                    selectedOrder.status === 'partial' ? theme.colors.primary :
                    theme.colors.danger,
                }}>
                  {selectedOrder.status}
                </span>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: theme.typography.sizes.small,
                  color: theme.colors.text.secondary,
                  marginBottom: theme.spacing.mini,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Pair
                </label>
                <div style={{
                  fontSize: theme.typography.sizes.medium,
                  color: theme.colors.text.primary,
                  fontWeight: theme.typography.weights.medium,
                }}>
                  {selectedOrder.pair}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: theme.typography.sizes.small,
                  color: theme.colors.text.secondary,
                  marginBottom: theme.spacing.mini,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Type & Side
                </label>
                <div style={{ display: 'flex', gap: theme.spacing.small, alignItems: 'center' }}>
                  <span style={{
                    fontSize: theme.typography.sizes.medium,
                    color: theme.colors.text.primary,
                    textTransform: 'uppercase',
                  }}>
                    {selectedOrder.type}
                  </span>
                  <span style={{
                    color: selectedOrder.side === 'buy' ? theme.colors.buy : theme.colors.sell,
                    fontWeight: theme.typography.weights.semibold,
                    textTransform: 'uppercase',
                  }}>
                    {selectedOrder.side}
                  </span>
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: theme.typography.sizes.small,
                  color: theme.colors.text.secondary,
                  marginBottom: theme.spacing.mini,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Date & Time
                </label>
                <div style={{
                  fontSize: theme.typography.sizes.medium,
                  color: theme.colors.text.primary,
                  fontFamily: theme.typography.families.data,
                }}>
                  {selectedOrder.timestamp.toLocaleString()}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: theme.typography.sizes.small,
                  color: theme.colors.text.secondary,
                  marginBottom: theme.spacing.mini,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Price
                </label>
                <div style={{
                  fontSize: theme.typography.sizes.medium,
                  color: theme.colors.text.primary,
                  fontWeight: theme.typography.weights.medium,
                  fontFamily: theme.typography.families.data,
                }}>
                  ${selectedOrder.price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 8,
                  })}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: theme.typography.sizes.small,
                  color: theme.colors.text.secondary,
                  marginBottom: theme.spacing.mini,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Amount
                </label>
                <div style={{
                  fontSize: theme.typography.sizes.medium,
                  color: theme.colors.text.primary,
                  fontFamily: theme.typography.families.data,
                }}>
                  {selectedOrder.amount.toFixed(8)}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: theme.typography.sizes.small,
                  color: theme.colors.text.secondary,
                  marginBottom: theme.spacing.mini,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Filled Amount
                </label>
                <div style={{
                  fontSize: theme.typography.sizes.medium,
                  color: theme.colors.text.primary,
                  fontFamily: theme.typography.families.data,
                }}>
                  {selectedOrder.filled.toFixed(8)} ({((selectedOrder.filled / selectedOrder.amount) * 100).toFixed(1)}%)
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: theme.typography.sizes.small,
                  color: theme.colors.text.secondary,
                  marginBottom: theme.spacing.mini,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Total Value
                </label>
                <div style={{
                  fontSize: theme.typography.sizes.medium,
                  color: theme.colors.text.primary,
                  fontWeight: theme.typography.weights.medium,
                  fontFamily: theme.typography.families.data,
                }}>
                  ${selectedOrder.total.toFixed(2)}
                </div>
              </div>

              {selectedOrder.fee && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: theme.typography.sizes.small,
                    color: theme.colors.text.secondary,
                    marginBottom: theme.spacing.mini,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Fee
                  </label>
                  <div style={{
                    fontSize: theme.typography.sizes.medium,
                    color: theme.colors.text.primary,
                    fontFamily: theme.typography.families.data,
                  }}>
                    ${selectedOrder.fee.toFixed(2)}
                  </div>
                </div>
              )}

              {selectedOrder.averagePrice && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: theme.typography.sizes.small,
                    color: theme.colors.text.secondary,
                    marginBottom: theme.spacing.mini,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Average Price
                  </label>
                  <div style={{
                    fontSize: theme.typography.sizes.medium,
                    color: theme.colors.text.primary,
                    fontFamily: theme.typography.families.data,
                  }}>
                    ${selectedOrder.averagePrice.toFixed(8)}
                  </div>
                </div>
              )}

              {selectedOrder.stopPrice && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: theme.typography.sizes.small,
                    color: theme.colors.text.secondary,
                    marginBottom: theme.spacing.mini,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Stop Price
                  </label>
                  <div style={{
                    fontSize: theme.typography.sizes.medium,
                    color: theme.colors.warning,
                    fontFamily: theme.typography.families.data,
                  }}>
                    ${selectedOrder.stopPrice.toFixed(8)}
                  </div>
                </div>
              )}
            </div>

            {/* Order Actions */}
            {(selectedOrder.status === 'active' || selectedOrder.status === 'partial') && (
              <div style={{
                marginTop: theme.spacing.large,
                paddingTop: theme.spacing.large,
                borderTop: `1px solid ${theme.colors.border}`,
                display: 'flex',
                gap: theme.spacing.medium,
                justifyContent: 'flex-end',
              }}>
                <button
                  onClick={() => handleCancelOrder(selectedOrder.id)}
                  style={{
                    backgroundColor: theme.colors.sell,
                    color: theme.colors.background,
                    border: 'none',
                    borderRadius: theme.radius.medium,
                    padding: `${theme.spacing.medium} ${theme.spacing.large}`,
                    fontSize: theme.typography.sizes.medium,
                    fontWeight: theme.typography.weights.medium,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = theme.shadows.medium
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  Cancel Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add CSS for loading animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}