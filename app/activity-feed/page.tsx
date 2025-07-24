'use client'

import React, { useState, useEffect, useRef } from 'react'
import { dieterRamsDesign as ds, designHelpers } from '@/lib/design/DieterRamsDesignSystem'

interface ActivityLogEntry {
  id: string
  timestamp: number
  type: 'reddit_scan' | 'twitter_scan' | 'symbol_detection' | 'pump_alert' | 'new_symbol' | 'historical_check' | 'api_call' | 'error'
  platform: 'reddit' | 'twitter' | 'system' | 'api'
  source: string
  message: string
  data?: any
  duration?: number
  severity: 'info' | 'warning' | 'error' | 'critical' | 'success'
  symbols?: string[]
  metrics?: {
    posts?: number
    comments?: number
    mentions?: number
    sentiment?: number
    riskScore?: number
  }
}

interface ActivityStats {
  totalLogs: number
  byType: Record<string, number>
  byPlatform: Record<string, number>
  bySeverity: Record<string, number>
  avgDuration: number
  totalSymbols: number
  uniqueSymbols: number
  errorRate: number
}

export default function ActivityFeedPage() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [maxLogs, setMaxLogs] = useState(1000)
  const [isPaused, setIsPaused] = useState(false)
  
  const logContainerRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const pausedLogsRef = useRef<ActivityLogEntry[]>([])

  useEffect(() => {
    connectToStream()
    loadInitialData()
    loadStats()

    const statsInterval = setInterval(loadStats, 5000) // Update stats every 5 seconds

    return () => {
      disconnectFromStream()
      clearInterval(statsInterval)
    }
  }, [])

  useEffect(() => {
    if (autoScroll && logContainerRef.current && !isPaused) {
      logContainerRef.current.scrollTop = 0
    }
  }, [logs, autoScroll, isPaused])

  const connectToStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource('/api/sentiment/activity?action=stream')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
      console.log('Connected to activity stream')
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'log') {
          const logEntry = data as ActivityLogEntry
          
          if (isPaused) {
            // Store logs while paused
            pausedLogsRef.current.unshift(logEntry)
          } else {
            // Add to live feed
            setLogs(prev => {
              const newLogs = [logEntry, ...prev].slice(0, maxLogs)
              return newLogs
            })
          }
        }
      } catch (error) {
        console.error('Error parsing stream data:', error)
      }
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      console.log('Activity stream disconnected, attempting to reconnect...')
      
      setTimeout(() => {
        if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
          connectToStream()
        }
      }, 5000)
    }
  }

  const disconnectFromStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsConnected(false)
  }

  const loadInitialData = async () => {
    try {
      const response = await fetch('/api/sentiment/activity?action=recent&limit=100')
      const result = await response.json()
      if (result.success) {
        setLogs(result.data)
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/sentiment/activity?action=stats&time_range=60000')
      const result = await response.json()
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs?')) return
    
    try {
      await fetch('/api/sentiment/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' })
      })
      setLogs([])
    } catch (error) {
      console.error('Error clearing logs:', error)
    }
  }

  const togglePause = () => {
    if (isPaused) {
      // Resume: add paused logs to main feed
      setLogs(prev => {
        const combined = [...pausedLogsRef.current, ...prev].slice(0, maxLogs)
        pausedLogsRef.current = []
        return combined
      })
    }
    setIsPaused(!isPaused)
  }

  const getFilteredLogs = () => {
    return logs.filter(log => {
      if (filterType !== 'all' && log.type !== filterType) return false
      if (filterPlatform !== 'all' && log.platform !== filterPlatform) return false
      if (filterSeverity !== 'all' && log.severity !== filterSeverity) return false
      return true
    })
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return ds.colors.semantic.error
      case 'error': return '#DC2626'
      case 'warning': return ds.colors.semantic.warning
      case 'success': return ds.colors.semantic.success
      case 'info': return ds.colors.semantic.info
      default: return ds.colors.grayscale[70]
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'success': return '✅'
      case 'info': return 'ℹ️'
      default: return '📝'
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'reddit': return '📱'
      case 'twitter': return '🐦'
      case 'system': return '⚙️'
      case 'api': return '🔗'
      default: return '💻'
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - timestamp
    
    if (diff < 1000) {
      return `${diff}ms ago`
    } else if (diff < 60000) {
      return `${Math.floor(diff / 1000)}s ago`
    } else {
      return date.toLocaleTimeString()
    }
  }

  const formatDuration = (duration?: number) => {
    if (!duration) return ''
    if (duration < 1000) return `${duration}ms`
    return `${(duration / 1000).toFixed(1)}s`
  }

  const filteredLogs = getFilteredLogs()

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
              Real-time Activity Feed
            </h1>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: ds.spacing.medium,
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
            }}>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: ds.spacing.mini,
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isConnected ? ds.colors.semantic.success : ds.colors.semantic.error,
                }} />
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              {isPaused && (
                <span style={{ color: ds.colors.semantic.warning }}>
                  ⏸️ Paused ({pausedLogsRef.current.length} queued)
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: ds.spacing.small, alignItems: 'center' }}>
            <button
              onClick={togglePause}
              style={{
                padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                backgroundColor: isPaused ? ds.colors.semantic.success : ds.colors.semantic.warning,
                color: ds.colors.grayscale[5],
                border: 'none',
                borderRadius: ds.interactive.radius.small,
                fontSize: ds.typography.scale.small,
                cursor: 'pointer',
              }}
            >
              {isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </button>

            <button
              onClick={() => setAutoScroll(!autoScroll)}
              style={{
                padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                backgroundColor: autoScroll ? ds.colors.semantic.primary : 'transparent',
                color: autoScroll ? ds.colors.grayscale[5] : ds.colors.semantic.primary,
                border: `1px solid ${ds.colors.semantic.primary}`,
                borderRadius: ds.interactive.radius.small,
                fontSize: ds.typography.scale.small,
                cursor: 'pointer',
              }}
            >
              Auto Scroll
            </button>

            <button
              onClick={clearLogs}
              style={{
                padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                backgroundColor: 'transparent',
                color: ds.colors.semantic.error,
                border: `1px solid ${ds.colors.semantic.error}`,
                borderRadius: ds.interactive.radius.small,
                fontSize: ds.typography.scale.small,
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </header>

      <main style={{
        maxWidth: ds.grid.maxWidth,
        margin: '0 auto',
        padding: ds.spacing.large,
      }}>
        {/* Stats Dashboard */}
        {stats && (
          <section style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            marginBottom: ds.spacing.large,
            border: `1px solid ${ds.colors.grayscale[20]}`,
          }}>
            <h2 style={{
              fontSize: ds.typography.scale.medium,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.medium,
            }}>
              Activity Statistics (Last Minute)
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: ds.spacing.medium,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: ds.typography.scale.large,
                  fontWeight: ds.typography.weights.semibold,
                  color: ds.colors.semantic.info,
                  fontFamily: ds.typography.families.data,
                }}>
                  {stats.totalLogs}
                </div>
                <div style={{ fontSize: ds.typography.scale.mini, color: ds.colors.grayscale[70] }}>
                  Total Events
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: ds.typography.scale.large,
                  fontWeight: ds.typography.weights.semibold,
                  color: ds.colors.semantic.success,
                  fontFamily: ds.typography.families.data,
                }}>
                  {Math.round(stats.avgDuration)}ms
                </div>
                <div style={{ fontSize: ds.typography.scale.mini, color: ds.colors.grayscale[70] }}>
                  Avg Duration
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: ds.typography.scale.large,
                  fontWeight: ds.typography.weights.semibold,
                  color: ds.colors.semantic.warning,
                  fontFamily: ds.typography.families.data,
                }}>
                  {stats.uniqueSymbols}
                </div>
                <div style={{ fontSize: ds.typography.scale.mini, color: ds.colors.grayscale[70] }}>
                  Unique Symbols
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: ds.typography.scale.large,
                  fontWeight: ds.typography.weights.semibold,
                  color: stats.errorRate > 0.1 ? ds.colors.semantic.error : ds.colors.semantic.success,
                  fontFamily: ds.typography.families.data,
                }}>
                  {Math.round(stats.errorRate * 100)}%
                </div>
                <div style={{ fontSize: ds.typography.scale.mini, color: ds.colors.grayscale[70] }}>
                  Error Rate
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Filters */}
        <section style={{
          backgroundColor: ds.colors.semantic.background.secondary,
          borderRadius: ds.interactive.radius.medium,
          padding: ds.spacing.medium,
          marginBottom: ds.spacing.large,
          border: `1px solid ${ds.colors.grayscale[20]}`,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: ds.spacing.medium,
            alignItems: 'end',
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: ds.typography.scale.mini,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.mini,
              }}>
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  width: '100%',
                  padding: ds.spacing.small,
                  backgroundColor: ds.colors.semantic.background.primary,
                  color: ds.colors.grayscale[90],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.small,
                  fontSize: ds.typography.scale.small,
                }}
              >
                <option value="all">All Types</option>
                <option value="reddit_scan">Reddit Scan</option>
                <option value="twitter_scan">Twitter Scan</option>
                <option value="symbol_detection">Symbol Detection</option>
                <option value="pump_alert">Pump Alert</option>
                <option value="new_symbol">New Symbol</option>
                <option value="historical_check">Historical Check</option>
                <option value="api_call">API Call</option>
                <option value="error">Error</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: ds.typography.scale.mini,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.mini,
              }}>
                Platform
              </label>
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                style={{
                  width: '100%',
                  padding: ds.spacing.small,
                  backgroundColor: ds.colors.semantic.background.primary,
                  color: ds.colors.grayscale[90],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.small,
                  fontSize: ds.typography.scale.small,
                }}
              >
                <option value="all">All Platforms</option>
                <option value="reddit">Reddit</option>
                <option value="twitter">Twitter</option>
                <option value="system">System</option>
                <option value="api">API</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: ds.typography.scale.mini,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.mini,
              }}>
                Severity
              </label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                style={{
                  width: '100%',
                  padding: ds.spacing.small,
                  backgroundColor: ds.colors.semantic.background.primary,
                  color: ds.colors.grayscale[90],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.small,
                  fontSize: ds.typography.scale.small,
                }}
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="info">Info</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: ds.typography.scale.mini,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.mini,
              }}>
                Max Logs
              </label>
              <select
                value={maxLogs}
                onChange={(e) => setMaxLogs(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: ds.spacing.small,
                  backgroundColor: ds.colors.semantic.background.primary,
                  color: ds.colors.grayscale[90],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.small,
                  fontSize: ds.typography.scale.small,
                }}
              >
                <option value={100}>100</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
                <option value={5000}>5000</option>
              </select>
            </div>
          </div>
        </section>

        {/* Activity Log */}
        <section style={{
          backgroundColor: ds.colors.semantic.background.secondary,
          borderRadius: ds.interactive.radius.medium,
          overflow: 'hidden',
          border: `1px solid ${ds.colors.grayscale[20]}`,
          height: '70vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            padding: ds.spacing.medium,
            borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h3 style={{
              fontSize: ds.typography.scale.medium,
              fontWeight: ds.typography.weights.semibold,
              margin: 0,
            }}>
              Live Activity ({filteredLogs.length} entries)
            </h3>
            <div style={{
              fontSize: ds.typography.scale.mini,
              color: ds.colors.grayscale[70],
            }}>
              Updates in real-time
            </div>
          </div>

          <div
            ref={logContainerRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              fontFamily: ds.typography.families.data,
            }}
          >
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: ds.spacing.small,
                  borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                  fontSize: ds.typography.scale.small,
                  borderLeft: `3px solid ${getSeverityColor(log.severity)}`,
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: ds.spacing.mini,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: ds.spacing.small,
                  }}>
                    <span>{getSeverityIcon(log.severity)}</span>
                    <span>{getPlatformIcon(log.platform)}</span>
                    <span style={{
                      color: ds.colors.grayscale[90],
                      fontWeight: ds.typography.weights.medium,
                    }}>
                      {log.message}
                    </span>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: ds.spacing.small,
                    fontSize: ds.typography.scale.mini,
                    color: ds.colors.grayscale[60],
                  }}>
                    {log.duration && (
                      <span style={{
                        backgroundColor: ds.colors.semantic.background.tertiary,
                        padding: `${ds.spacing.micro} ${ds.spacing.mini}`,
                        borderRadius: ds.interactive.radius.small,
                      }}>
                        {formatDuration(log.duration)}
                      </span>
                    )}
                    <span>{formatTimestamp(log.timestamp)}</span>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: ds.spacing.medium,
                  fontSize: ds.typography.scale.mini,
                  color: ds.colors.grayscale[70],
                }}>
                  <span>
                    <strong>Source:</strong> {log.source}
                  </span>
                  <span>
                    <strong>Type:</strong> {log.type.replace('_', ' ')}
                  </span>
                  {log.symbols && log.symbols.length > 0 && (
                    <span>
                      <strong>Symbols:</strong> {log.symbols.join(', ')}
                    </span>
                  )}
                  {log.metrics && (
                    <span>
                      <strong>Metrics:</strong> {JSON.stringify(log.metrics)}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {filteredLogs.length === 0 && (
              <div style={{
                padding: ds.spacing.xlarge,
                textAlign: 'center',
                color: ds.colors.grayscale[70],
                fontSize: ds.typography.scale.small,
              }}>
                No activity logs match the current filters.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}