'use client'

import React, { useState, useEffect } from 'react'
import { dieterRamsDesign as ds, designHelpers } from '@/lib/design/DieterRamsDesignSystem'

interface Alert {
  id: string
  type: 'price' | 'volume' | 'risk' | 'strategy' | 'system'
  severity: 'info' | 'warning' | 'critical'
  symbol?: string
  title: string
  message: string
  timestamp: number
  isRead: boolean
  data?: {
    currentValue?: number
    threshold?: number
    change?: number
    direction?: 'up' | 'down'
  }
}

interface AlertRule {
  id: string
  name: string
  type: 'price' | 'volume' | 'risk' | 'volatility' | 'correlation'
  condition: 'above' | 'below' | 'crosses' | 'change'
  threshold: number
  symbol: string
  isActive: boolean
  lastTriggered?: number
  triggerCount: number
}

export default function AlertsCenterPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical' | 'warning' | 'info'>('all')
  const [selectedType, setSelectedType] = useState<'all' | Alert['type']>('all')
  const [showAddRule, setShowAddRule] = useState(false)
  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
    type: 'price',
    condition: 'above',
    isActive: true,
  })

  // Mock data
  useEffect(() => {
    const mockAlerts: Alert[] = [
      {
        id: '1',
        type: 'price',
        severity: 'critical',
        symbol: 'BTC',
        title: 'BTC Price Alert',
        message: 'BTC has crossed above $70,000',
        timestamp: Date.now() - 1000 * 60 * 5,
        isRead: false,
        data: {
          currentValue: 70125,
          threshold: 70000,
          change: 2.5,
          direction: 'up',
        },
      },
      {
        id: '2',
        type: 'risk',
        severity: 'warning',
        title: 'Portfolio Risk Alert',
        message: 'Portfolio drawdown approaching limit',
        timestamp: Date.now() - 1000 * 60 * 30,
        isRead: false,
        data: {
          currentValue: -8.2,
          threshold: -10,
        },
      },
      {
        id: '3',
        type: 'volume',
        severity: 'info',
        symbol: 'ETH',
        title: 'ETH Volume Spike',
        message: 'Unusual volume detected on ETH',
        timestamp: Date.now() - 1000 * 60 * 60,
        isRead: true,
        data: {
          currentValue: 2500000,
          change: 150,
          direction: 'up',
        },
      },
      {
        id: '4',
        type: 'strategy',
        severity: 'warning',
        title: 'Strategy Performance',
        message: 'Mean Reversion strategy underperforming',
        timestamp: Date.now() - 1000 * 60 * 120,
        isRead: true,
        data: {
          currentValue: -5.3,
          threshold: -3,
        },
      },
      {
        id: '5',
        type: 'system',
        severity: 'critical',
        title: 'System Alert',
        message: 'API rate limit approaching',
        timestamp: Date.now() - 1000 * 60 * 180,
        isRead: false,
        data: {
          currentValue: 95,
          threshold: 100,
        },
      },
    ]

    const mockRules: AlertRule[] = [
      {
        id: 'r1',
        name: 'BTC Price Above $70k',
        type: 'price',
        condition: 'above',
        threshold: 70000,
        symbol: 'BTC',
        isActive: true,
        lastTriggered: Date.now() - 1000 * 60 * 5,
        triggerCount: 3,
      },
      {
        id: 'r2',
        name: 'ETH Volume Spike',
        type: 'volume',
        condition: 'change',
        threshold: 100,
        symbol: 'ETH',
        isActive: true,
        lastTriggered: Date.now() - 1000 * 60 * 60,
        triggerCount: 7,
      },
      {
        id: 'r3',
        name: 'Portfolio Drawdown',
        type: 'risk',
        condition: 'below',
        threshold: -10,
        symbol: 'PORTFOLIO',
        isActive: true,
        triggerCount: 1,
      },
      {
        id: 'r4',
        name: 'SOL Volatility Alert',
        type: 'volatility',
        condition: 'above',
        threshold: 30,
        symbol: 'SOL',
        isActive: false,
        triggerCount: 0,
      },
    ]

    setAlerts(mockAlerts)
    setAlertRules(mockRules)
  }, [])

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread' && alert.isRead) return false
    if (filter !== 'all' && filter !== 'unread' && alert.severity !== filter) return false
    if (selectedType !== 'all' && alert.type !== selectedType) return false
    return true
  })

  const unreadCount = alerts.filter(a => !a.isRead).length
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.isRead).length

  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ))
  }

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })))
  }

  const deleteAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }

  const toggleRule = (ruleId: string) => {
    setAlertRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    ))
  }

  const deleteRule = (ruleId: string) => {
    setAlertRules(prev => prev.filter(rule => rule.id !== ruleId))
  }

  const addRule = () => {
    if (newRule.name && newRule.symbol && newRule.threshold) {
      const rule: AlertRule = {
        id: `r${Date.now()}`,
        name: newRule.name,
        type: newRule.type || 'price',
        condition: newRule.condition || 'above',
        threshold: newRule.threshold,
        symbol: newRule.symbol,
        isActive: true,
        triggerCount: 0,
      }
      setAlertRules(prev => [...prev, rule])
      setNewRule({ type: 'price', condition: 'above', isActive: true })
      setShowAddRule(false)
    }
  }

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical': return ds.colors.semantic.error
      case 'warning': return ds.colors.semantic.warning
      case 'info': return ds.colors.semantic.info
      default: return ds.colors.semantic.neutral
    }
  }

  const getTypeIcon = (type: Alert['type']) => {
    switch (type) {
      case 'price': return '$'
      case 'volume': return '📊'
      case 'risk': return '⚠️'
      case 'strategy': return '📈'
      case 'system': return '⚙️'
      default: return '•'
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
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
              Alerts Center
            </h1>
            <p style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              margin: 0,
            }}>
              Monitor and manage your trading alerts
            </p>
          </div>

          <div style={{ display: 'flex', gap: ds.spacing.medium, alignItems: 'center' }}>
            {unreadCount > 0 && (
              <div style={{
                padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                backgroundColor: criticalCount > 0 ? ds.colors.semantic.error : ds.colors.semantic.info,
                color: ds.colors.grayscale[5],
                borderRadius: ds.interactive.radius.small,
                fontSize: ds.typography.scale.small,
                fontWeight: ds.typography.weights.medium,
              }}>
                {unreadCount} unread{criticalCount > 0 && ` (${criticalCount} critical)`}
              </div>
            )}
            
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              style={{
                padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                backgroundColor: 'transparent',
                color: ds.colors.semantic.primary,
                border: `1px solid ${ds.colors.semantic.primary}`,
                borderRadius: ds.interactive.radius.medium,
                fontSize: ds.typography.scale.small,
                fontWeight: ds.typography.weights.medium,
                cursor: unreadCount === 0 ? 'not-allowed' : 'pointer',
                opacity: unreadCount === 0 ? 0.5 : 1,
                transition: designHelpers.animate('all', ds.animation.durations.fast),
              }}
            >
              Mark All Read
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: ds.grid.maxWidth,
        margin: '0 auto',
        padding: ds.spacing.large,
        display: 'grid',
        gridTemplateColumns: '1fr 350px',
        gap: ds.spacing.xlarge,
      }}>
        {/* Left Column - Alerts */}
        <div>
          {/* Filters */}
          <div style={{
            display: 'flex',
            gap: ds.spacing.medium,
            marginBottom: ds.spacing.large,
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', gap: ds.spacing.mini }}>
              {(['all', 'unread', 'critical', 'warning', 'info'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                    backgroundColor: filter === f ? ds.colors.semantic.primary : 'transparent',
                    color: filter === f ? ds.colors.grayscale[5] : ds.colors.grayscale[70],
                    border: `1px solid ${filter === f ? ds.colors.semantic.primary : ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.medium,
                    fontSize: ds.typography.scale.small,
                    fontWeight: ds.typography.weights.medium,
                    cursor: 'pointer',
                    transition: designHelpers.animate('all', ds.animation.durations.fast),
                    textTransform: 'capitalize',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as typeof selectedType)}
              style={{
                padding: ds.spacing.small,
                backgroundColor: ds.colors.semantic.background.secondary,
                color: ds.colors.grayscale[90],
                border: `1px solid ${ds.colors.grayscale[30]}`,
                borderRadius: ds.interactive.radius.medium,
                fontSize: ds.typography.scale.small,
                cursor: 'pointer',
              }}
            >
              <option value="all">All Types</option>
              <option value="price">Price</option>
              <option value="volume">Volume</option>
              <option value="risk">Risk</option>
              <option value="strategy">Strategy</option>
              <option value="system">System</option>
            </select>
          </div>

          {/* Alerts List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: ds.spacing.medium }}>
            {filteredAlerts.length === 0 ? (
              <div style={{
                padding: ds.spacing.xlarge,
                textAlign: 'center',
                color: ds.colors.grayscale[70],
                backgroundColor: ds.colors.semantic.background.secondary,
                borderRadius: ds.interactive.radius.medium,
                border: `1px solid ${ds.colors.grayscale[20]}`,
              }}>
                No alerts found
              </div>
            ) : (
              filteredAlerts.map(alert => (
                <div
                  key={alert.id}
                  style={{
                    backgroundColor: alert.isRead ? 
                      ds.colors.semantic.background.secondary : 
                      `${getSeverityColor(alert.severity)}10`,
                    border: `1px solid ${alert.isRead ? 
                      ds.colors.grayscale[20] : 
                      getSeverityColor(alert.severity)}`,
                    borderRadius: ds.interactive.radius.medium,
                    padding: ds.spacing.large,
                    position: 'relative',
                    transition: designHelpers.animate('all', ds.animation.durations.fast),
                  }}
                  onClick={() => markAsRead(alert.id)}
                >
                  {/* Alert Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: ds.spacing.small,
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: ds.spacing.small,
                    }}>
                      <span style={{
                        fontSize: ds.typography.scale.large,
                        marginRight: ds.spacing.mini,
                      }}>
                        {getTypeIcon(alert.type)}
                      </span>
                      <div>
                        <h3 style={{
                          fontSize: ds.typography.scale.base,
                          fontWeight: ds.typography.weights.semibold,
                          margin: 0,
                          marginBottom: ds.spacing.micro,
                        }}>
                          {alert.title}
                        </h3>
                        {alert.symbol && (
                          <span style={{
                            fontSize: ds.typography.scale.small,
                            fontFamily: ds.typography.families.data,
                            color: ds.colors.grayscale[70],
                          }}>
                            {alert.symbol}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: ds.spacing.small,
                    }}>
                      <span style={{
                        fontSize: ds.typography.scale.mini,
                        color: ds.colors.grayscale[60],
                      }}>
                        {formatTimestamp(alert.timestamp)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteAlert(alert.id)
                        }}
                        style={{
                          padding: ds.spacing.mini,
                          backgroundColor: 'transparent',
                          color: ds.colors.grayscale[60],
                          border: 'none',
                          fontSize: ds.typography.scale.small,
                          cursor: 'pointer',
                          transition: designHelpers.animate('opacity', ds.animation.durations.fast),
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Alert Message */}
                  <p style={{
                    fontSize: ds.typography.scale.small,
                    margin: 0,
                    marginBottom: alert.data ? ds.spacing.medium : 0,
                  }}>
                    {alert.message}
                  </p>

                  {/* Alert Data */}
                  {alert.data && (
                    <div style={{
                      display: 'flex',
                      gap: ds.spacing.large,
                      fontSize: ds.typography.scale.small,
                      fontFamily: ds.typography.families.data,
                    }}>
                      {alert.data.currentValue !== undefined && (
                        <div>
                          <span style={{ color: ds.colors.grayscale[70] }}>Current: </span>
                          <span style={{ fontWeight: ds.typography.weights.medium }}>
                            {typeof alert.data.currentValue === 'number' && alert.data.currentValue > 1000 ?
                              `$${alert.data.currentValue.toLocaleString()}` :
                              alert.data.currentValue}
                          </span>
                        </div>
                      )}
                      {alert.data.threshold !== undefined && (
                        <div>
                          <span style={{ color: ds.colors.grayscale[70] }}>Threshold: </span>
                          <span style={{ fontWeight: ds.typography.weights.medium }}>
                            {typeof alert.data.threshold === 'number' && alert.data.threshold > 1000 ?
                              `$${alert.data.threshold.toLocaleString()}` :
                              alert.data.threshold}
                          </span>
                        </div>
                      )}
                      {alert.data.change !== undefined && (
                        <div>
                          <span style={{ color: ds.colors.grayscale[70] }}>Change: </span>
                          <span style={{ 
                            fontWeight: ds.typography.weights.medium,
                            color: alert.data.direction === 'up' ? 
                              ds.colors.semantic.buy : 
                              ds.colors.semantic.sell,
                          }}>
                            {alert.data.direction === 'up' ? '+' : ''}{alert.data.change}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Unread indicator */}
                  {!alert.isRead && (
                    <div style={{
                      position: 'absolute',
                      top: ds.spacing.medium,
                      left: ds.spacing.medium,
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: getSeverityColor(alert.severity),
                    }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Alert Rules */}
        <div>
          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            border: `1px solid ${ds.colors.grayscale[20]}`,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: ds.spacing.large,
            }}>
              <h2 style={{
                fontSize: ds.typography.scale.medium,
                fontWeight: ds.typography.weights.semibold,
                margin: 0,
              }}>
                Alert Rules
              </h2>
              <button
                onClick={() => setShowAddRule(true)}
                style={{
                  padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                  backgroundColor: ds.colors.semantic.primary,
                  color: ds.colors.grayscale[5],
                  border: 'none',
                  borderRadius: ds.interactive.radius.medium,
                  fontSize: ds.typography.scale.small,
                  fontWeight: ds.typography.weights.medium,
                  cursor: 'pointer',
                  transition: designHelpers.animate('all', ds.animation.durations.fast),
                }}
              >
                + Add Rule
              </button>
            </div>

            {/* Add Rule Form */}
            {showAddRule && (
              <div style={{
                marginBottom: ds.spacing.large,
                padding: ds.spacing.medium,
                backgroundColor: ds.colors.semantic.background.primary,
                borderRadius: ds.interactive.radius.small,
                border: `1px solid ${ds.colors.grayscale[30]}`,
              }}>
                <input
                  type="text"
                  placeholder="Rule name"
                  value={newRule.name || ''}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: ds.spacing.small,
                    marginBottom: ds.spacing.small,
                    backgroundColor: ds.colors.semantic.background.secondary,
                    color: ds.colors.grayscale[90],
                    border: `1px solid ${ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.small,
                    fontSize: ds.typography.scale.small,
                  }}
                />
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: ds.spacing.small,
                  marginBottom: ds.spacing.small,
                }}>
                  <select
                    value={newRule.type}
                    onChange={(e) => setNewRule({ ...newRule, type: e.target.value as AlertRule['type'] })}
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
                    <option value="price">Price</option>
                    <option value="volume">Volume</option>
                    <option value="risk">Risk</option>
                    <option value="volatility">Volatility</option>
                    <option value="correlation">Correlation</option>
                  </select>
                  
                  <select
                    value={newRule.condition}
                    onChange={(e) => setNewRule({ ...newRule, condition: e.target.value as AlertRule['condition'] })}
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
                    <option value="above">Above</option>
                    <option value="below">Below</option>
                    <option value="crosses">Crosses</option>
                    <option value="change">Change %</option>
                  </select>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: ds.spacing.small,
                  marginBottom: ds.spacing.medium,
                }}>
                  <input
                    type="text"
                    placeholder="Symbol"
                    value={newRule.symbol || ''}
                    onChange={(e) => setNewRule({ ...newRule, symbol: e.target.value.toUpperCase() })}
                    style={{
                      padding: ds.spacing.small,
                      backgroundColor: ds.colors.semantic.background.secondary,
                      color: ds.colors.grayscale[90],
                      border: `1px solid ${ds.colors.grayscale[30]}`,
                      borderRadius: ds.interactive.radius.small,
                      fontSize: ds.typography.scale.small,
                      fontFamily: ds.typography.families.data,
                    }}
                  />
                  
                  <input
                    type="number"
                    placeholder="Threshold"
                    value={newRule.threshold || ''}
                    onChange={(e) => setNewRule({ ...newRule, threshold: parseFloat(e.target.value) })}
                    style={{
                      padding: ds.spacing.small,
                      backgroundColor: ds.colors.semantic.background.secondary,
                      color: ds.colors.grayscale[90],
                      border: `1px solid ${ds.colors.grayscale[30]}`,
                      borderRadius: ds.interactive.radius.small,
                      fontSize: ds.typography.scale.small,
                      fontFamily: ds.typography.families.data,
                    }}
                  />
                </div>
                
                <div style={{
                  display: 'flex',
                  gap: ds.spacing.small,
                  justifyContent: 'flex-end',
                }}>
                  <button
                    onClick={() => {
                      setShowAddRule(false)
                      setNewRule({ type: 'price', condition: 'above', isActive: true })
                    }}
                    style={{
                      padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                      backgroundColor: 'transparent',
                      color: ds.colors.grayscale[70],
                      border: `1px solid ${ds.colors.grayscale[30]}`,
                      borderRadius: ds.interactive.radius.small,
                      fontSize: ds.typography.scale.small,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addRule}
                    disabled={!newRule.name || !newRule.symbol || !newRule.threshold}
                    style={{
                      padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                      backgroundColor: ds.colors.semantic.primary,
                      color: ds.colors.grayscale[5],
                      border: 'none',
                      borderRadius: ds.interactive.radius.small,
                      fontSize: ds.typography.scale.small,
                      fontWeight: ds.typography.weights.medium,
                      cursor: (!newRule.name || !newRule.symbol || !newRule.threshold) ? 'not-allowed' : 'pointer',
                      opacity: (!newRule.name || !newRule.symbol || !newRule.threshold) ? 0.5 : 1,
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Rules List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: ds.spacing.small }}>
              {alertRules.map(rule => (
                <div
                  key={rule.id}
                  style={{
                    padding: ds.spacing.medium,
                    backgroundColor: ds.colors.semantic.background.primary,
                    borderRadius: ds.interactive.radius.small,
                    border: `1px solid ${ds.colors.grayscale[20]}`,
                    opacity: rule.isActive ? 1 : 0.6,
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: ds.spacing.small,
                  }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{
                        fontSize: ds.typography.scale.small,
                        fontWeight: ds.typography.weights.medium,
                        margin: 0,
                        marginBottom: ds.spacing.mini,
                      }}>
                        {rule.name}
                      </h4>
                      <div style={{
                        fontSize: ds.typography.scale.mini,
                        color: ds.colors.grayscale[70],
                      }}>
                        {rule.symbol} {rule.type} {rule.condition} {rule.threshold}
                      </div>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      gap: ds.spacing.mini,
                    }}>
                      <button
                        onClick={() => toggleRule(rule.id)}
                        style={{
                          padding: ds.spacing.mini,
                          backgroundColor: 'transparent',
                          color: rule.isActive ? ds.colors.semantic.success : ds.colors.grayscale[60],
                          border: 'none',
                          fontSize: ds.typography.scale.small,
                          cursor: 'pointer',
                        }}
                      >
                        {rule.isActive ? '✓' : '○'}
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        style={{
                          padding: ds.spacing.mini,
                          backgroundColor: 'transparent',
                          color: ds.colors.grayscale[60],
                          border: 'none',
                          fontSize: ds.typography.scale.small,
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  
                  {rule.lastTriggered && (
                    <div style={{
                      fontSize: ds.typography.scale.mini,
                      color: ds.colors.grayscale[60],
                    }}>
                      Last triggered: {formatTimestamp(rule.lastTriggered)} • 
                      Triggered {rule.triggerCount} times
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}