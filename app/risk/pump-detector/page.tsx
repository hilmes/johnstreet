'use client'

import React, { useState, useEffect } from 'react'
import { dieterRamsDesign as ds, designHelpers } from '@/lib/design/DieterRamsDesignSystem'

interface PumpSignal {
  symbol: string
  confidence: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  indicators: {
    sentimentSpike: boolean
    volumeAnomaly: boolean
    priceAnomaly: boolean
    socialMediaBuzz: boolean
    influencerActivity: boolean
    coordinated: boolean
  }
  socialMetrics: {
    mentionCount: number
    sentimentScore: number
    engagementRate: number
    accountQuality: number
  }
  timestamp: number
}

interface DetectionResult {
  symbol: string
  timestamp: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  alerts: Array<{
    type: string
    message: string
    severity: 'info' | 'warning' | 'critical'
  }>
  data: {
    social: any
    market: any
    combined: any
  }
}

interface NewSymbolAlert {
  symbol: string
  confidence: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  firstDetected: number
  platforms: string[]
  mentions: number
  historicalContext: {
    hasHistory: boolean
    firstHistoricalMention?: number
    daysSinceFirstMention?: number
    previousMentionCount: number
  }
  pumpIndicators: {
    suddenSpike: boolean
    coordinatedMentions: boolean
    suspiciousAccounts: boolean
    missingMarketData: boolean
  }
  recommendation: 'investigate' | 'monitor' | 'high_risk' | 'likely_pump'
}

export default function PumpDetectorPage() {
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>([])
  const [newSymbolAlerts, setNewSymbolAlerts] = useState<NewSymbolAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [timeframe, setTimeframe] = useState('hour')
  const [monitoring, setMonitoring] = useState(false)
  const [scanningNewSymbols, setScanningNewSymbols] = useState(false)
  const [twitterEnabled, setTwitterEnabled] = useState(false)
  const [redditEnabled, setRedditEnabled] = useState(true)
  const [showSubredditManager, setShowSubredditManager] = useState(false)
  const [subreddits, setSubreddits] = useState<any[]>([])
  const [subredditStats, setSubredditStats] = useState<any>(null)
  const [availableTags, setAvailableTags] = useState<any[]>([])
  const [newSubreddit, setNewSubreddit] = useState({
    name: '',
    displayName: '',
    tags: [] as string[],
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    scanFrequency: 'daily' as 'realtime' | 'hourly' | 'daily' | 'weekly',
    riskLevel: 'moderate' as 'safe' | 'moderate' | 'risky' | 'high_risk',
    description: ''
  })
  
  const cryptoSymbols = ['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'AVAX', 'MATIC', 'DOGE', 'SHIB', 'XRP']

  useEffect(() => {
    loadSubreddits()
    loadSubredditStats()
    loadAvailableTags()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        runDetection()
        scanForNewSymbols()
      }, 60000)
      
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadSubreddits = async () => {
    try {
      const response = await fetch('/api/sentiment/subreddits?action=list')
      const result = await response.json()
      if (result.success) {
        setSubreddits(result.data)
      }
    } catch (error) {
      console.error('Error loading subreddits:', error)
    }
  }

  const loadSubredditStats = async () => {
    try {
      const response = await fetch('/api/sentiment/subreddits?action=stats')
      const result = await response.json()
      if (result.success) {
        setSubredditStats(result.data)
      }
    } catch (error) {
      console.error('Error loading subreddit stats:', error)
    }
  }

  const loadAvailableTags = async () => {
    try {
      const response = await fetch('/api/sentiment/subreddits?action=tags')
      const result = await response.json()
      if (result.success) {
        setAvailableTags(result.data)
      }
    } catch (error) {
      console.error('Error loading tags:', error)
    }
  }

  const addSubreddit = async () => {
    if (!newSubreddit.name.trim()) return

    try {
      const response = await fetch('/api/sentiment/subreddits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          subreddit: {
            ...newSubreddit,
            name: newSubreddit.name.replace(/^r\//, ''),
            displayName: newSubreddit.displayName || `r/${newSubreddit.name.replace(/^r\//, '')}`,
            active: true
          }
        })
      })

      const result = await response.json()
      if (result.success) {
        setNewSubreddit({
          name: '',
          displayName: '',
          tags: [],
          priority: 'medium',
          scanFrequency: 'daily',
          riskLevel: 'moderate',
          description: ''
        })
        await loadSubreddits()
        await loadSubredditStats()
      } else {
        alert(result.error || 'Failed to add subreddit')
      }
    } catch (error) {
      console.error('Error adding subreddit:', error)
      alert('Failed to add subreddit')
    }
  }

  const toggleSubreddit = async (name: string) => {
    try {
      const response = await fetch('/api/sentiment/subreddits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          subreddit: { name }
        })
      })

      const result = await response.json()
      if (result.success) {
        await loadSubreddits()
        await loadSubredditStats()
      }
    } catch (error) {
      console.error('Error toggling subreddit:', error)
    }
  }

  const removeSubreddit = async (name: string) => {
    if (!confirm(`Are you sure you want to remove r/${name}?`)) return

    try {
      const response = await fetch('/api/sentiment/subreddits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          subreddit: { name }
        })
      })

      const result = await response.json()
      if (result.success) {
        await loadSubreddits()
        await loadSubredditStats()
      }
    } catch (error) {
      console.error('Error removing subreddit:', error)
    }
  }

  const toggleTag = (tag: string) => {
    setNewSubreddit(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }))
  }

  const getTagColor = (tagName: string) => {
    const tag = availableTags.find(t => t.name === tagName)
    return tag?.color || '#6B7280'
  }

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'safe': return ds.colors.semantic.success
      case 'moderate': return ds.colors.semantic.info
      case 'risky': return ds.colors.semantic.warning
      case 'high_risk': return ds.colors.semantic.error
      default: return ds.colors.grayscale[50]
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return ds.colors.semantic.error
      case 'high': return ds.colors.semantic.warning
      case 'medium': return ds.colors.semantic.info
      case 'low': return ds.colors.semantic.success
      default: return ds.colors.grayscale[50]
    }
  }

  const scanForNewSymbols = async () => {
    setScanningNewSymbols(true)
    try {
      const response = await fetch('/api/sentiment/historical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scan_new_symbols',
          hours: timeframe === 'hour' ? 1 : timeframe === 'day' ? 24 : 168
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setNewSymbolAlerts(result.data.newSymbols)
      }
    } catch (error) {
      console.error('New symbol scan error:', error)
    } finally {
      setScanningNewSymbols(false)
    }
  }

  const verifySymbol = async (symbol: string) => {
    try {
      const response = await fetch(`/api/sentiment/historical?action=verify&symbol=${symbol}`)
      const result = await response.json()
      
      if (result.success) {
        setNewSymbolAlerts(prev => {
          const filtered = prev.filter(a => a.symbol !== symbol)
          return [result.data, ...filtered].slice(0, 20)
        })
      }
    } catch (error) {
      console.error('Symbol verification error:', error)
    }
  }

  const runDetection = async (symbol?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        timeframe,
        ...(symbol && { symbol })
      })
      
      const response = await fetch(`/api/sentiment/pump-detector?${params}`)
      const result = await response.json()
      
      if (result.success) {
        if (symbol) {
          setDetectionResults(prev => {
            const filtered = prev.filter(r => r.symbol !== symbol)
            return [result.data, ...filtered].slice(0, 50)
          })
        } else {
          await runBulkDetection()
        }
      }
    } catch (error) {
      console.error('Detection error:', error)
    } finally {
      setLoading(false)
    }
  }

  const runBulkDetection = async () => {
    try {
      const response = await fetch('/api/sentiment/pump-detector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: cryptoSymbols,
          exchanges: ['kraken'],
          timeframe
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setDetectionResults(result.data.results)
      }
    } catch (error) {
      console.error('Bulk detection error:', error)
    }
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return ds.colors.semantic.error
      case 'high': return ds.colors.semantic.warning
      case 'medium': return ds.colors.semantic.info
      case 'low': return ds.colors.semantic.success
      default: return ds.colors.semantic.neutral
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return ds.colors.semantic.error
    if (confidence > 0.6) return ds.colors.semantic.warning
    if (confidence > 0.4) return ds.colors.semantic.info
    return ds.colors.semantic.success
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
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
              Pump & Dump Detector
            </h1>
            <p style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              margin: 0,
            }}>
              AI-powered detection of potential market manipulation
            </p>
          </div>

          <div style={{ display: 'flex', gap: ds.spacing.medium, alignItems: 'center' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: ds.spacing.small,
              fontSize: ds.typography.scale.small,
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Auto Refresh
            </label>
            
            <div style={{ display: 'flex', gap: ds.spacing.small }}>
              <button
                onClick={() => runDetection()}
                disabled={loading}
                style={{
                  padding: `${ds.spacing.small} ${ds.spacing.large}`,
                  backgroundColor: ds.colors.semantic.primary,
                  color: ds.colors.grayscale[5],
                  border: 'none',
                  borderRadius: ds.interactive.radius.medium,
                  fontSize: ds.typography.scale.small,
                  fontWeight: ds.typography.weights.medium,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: designHelpers.animate('all', ds.animation.durations.fast),
                }}
              >
                {loading ? 'Scanning...' : 'Scan Now'}
              </button>
              
              <button
                onClick={scanForNewSymbols}
                disabled={scanningNewSymbols}
                style={{
                  padding: `${ds.spacing.small} ${ds.spacing.large}`,
                  backgroundColor: 'transparent',
                  color: ds.colors.semantic.info,
                  border: `1px solid ${ds.colors.semantic.info}`,
                  borderRadius: ds.interactive.radius.medium,
                  fontSize: ds.typography.scale.small,
                  fontWeight: ds.typography.weights.medium,
                  cursor: scanningNewSymbols ? 'not-allowed' : 'pointer',
                  opacity: scanningNewSymbols ? 0.6 : 1,
                  transition: designHelpers.animate('all', ds.animation.durations.fast),
                }}
              >
                {scanningNewSymbols ? 'Scanning...' : 'New Symbols'}
              </button>
              
              <button
                onClick={() => setShowSubredditManager(!showSubredditManager)}
                style={{
                  padding: `${ds.spacing.small} ${ds.spacing.large}`,
                  backgroundColor: 'transparent',
                  color: ds.colors.semantic.warning,
                  border: `1px solid ${ds.colors.semantic.warning}`,
                  borderRadius: ds.interactive.radius.medium,
                  fontSize: ds.typography.scale.small,
                  fontWeight: ds.typography.weights.medium,
                  cursor: 'pointer',
                  transition: designHelpers.animate('all', ds.animation.durations.fast),
                }}
              >
                Subreddits
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: ds.grid.maxWidth,
        margin: '0 auto',
        padding: ds.spacing.large,
      }}>
        {/* Controls */}
        <section style={{
          backgroundColor: ds.colors.semantic.background.secondary,
          borderRadius: ds.interactive.radius.medium,
          padding: ds.spacing.large,
          marginBottom: ds.spacing.xlarge,
          border: `1px solid ${ds.colors.grayscale[20]}`,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: ds.spacing.large,
            alignItems: 'end',
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.small,
              }}>
                Symbol (Optional)
              </label>
              <input
                type="text"
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value.toUpperCase())}
                placeholder="e.g., BTC, ETH"
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
              <div style={{
                fontSize: ds.typography.scale.mini,
                color: ds.colors.grayscale[60],
                marginTop: ds.spacing.mini,
              }}>
                Leave empty for bulk scan
              </div>
            </div>
            
            <div>
              <label style={{
                display: 'block',
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.small,
              }}>
                Timeframe
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
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
                <option value="hour">Last Hour</option>
                <option value="day">Last Day</option>
                <option value="week">Last Week</option>
              </select>
            </div>
            
            <button
              onClick={() => runDetection(selectedSymbol || undefined)}
              disabled={loading}
              style={{
                padding: ds.spacing.small,
                backgroundColor: 'transparent',
                color: ds.colors.semantic.primary,
                border: `1px solid ${ds.colors.semantic.primary}`,
                borderRadius: ds.interactive.radius.medium,
                fontSize: ds.typography.scale.small,
                fontWeight: ds.typography.weights.medium,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: designHelpers.animate('all', ds.animation.durations.fast),
              }}
            >
              {selectedSymbol ? `Scan ${selectedSymbol}` : 'Bulk Scan'}
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: ds.spacing.small }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: ds.spacing.small,
                fontSize: ds.typography.scale.small,
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={monitoring}
                  onChange={(e) => setMonitoring(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Live Monitor
              </label>
              
              <div style={{ display: 'flex', gap: ds.spacing.medium }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: ds.spacing.mini,
                  fontSize: ds.typography.scale.mini,
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={redditEnabled}
                    onChange={(e) => setRedditEnabled(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  Reddit
                </label>
                
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: ds.spacing.mini,
                  fontSize: ds.typography.scale.mini,
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={twitterEnabled}
                    onChange={(e) => setTwitterEnabled(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  Twitter
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Subreddit Manager */}
        {showSubredditManager && (
          <section style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            marginBottom: ds.spacing.xlarge,
            border: `1px solid ${ds.colors.semantic.warning}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: ds.spacing.large }}>
              <h2 style={{
                fontSize: ds.typography.scale.medium,
                fontWeight: ds.typography.weights.semibold,
                margin: 0,
              }}>
                Subreddit Manager
              </h2>
              <button
                onClick={() => setShowSubredditManager(false)}
                style={{
                  padding: ds.spacing.mini,
                  backgroundColor: 'transparent',
                  color: ds.colors.grayscale[70],
                  border: 'none',
                  fontSize: ds.typography.scale.base,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Stats Overview */}
            {subredditStats && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: ds.spacing.medium,
                marginBottom: ds.spacing.large,
                padding: ds.spacing.medium,
                backgroundColor: ds.colors.semantic.background.tertiary,
                borderRadius: ds.interactive.radius.small,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: ds.typography.scale.base, fontWeight: ds.typography.weights.semibold, color: ds.colors.semantic.info }}>
                    {subredditStats.totalSubreddits}
                  </div>
                  <div style={{ fontSize: ds.typography.scale.mini, color: ds.colors.grayscale[70] }}>Total</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: ds.typography.scale.base, fontWeight: ds.typography.weights.semibold, color: ds.colors.semantic.success }}>
                    {subredditStats.activeSubreddits}
                  </div>
                  <div style={{ fontSize: ds.typography.scale.mini, color: ds.colors.grayscale[70] }}>Active</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: ds.typography.scale.base, fontWeight: ds.typography.weights.semibold, color: ds.colors.semantic.error }}>
                    {subredditStats.highRiskSubreddits}
                  </div>
                  <div style={{ fontSize: ds.typography.scale.mini, color: ds.colors.grayscale[70] }}>High Risk</div>
                </div>
              </div>
            )}

            {/* Add New Subreddit */}
            <div style={{
              backgroundColor: ds.colors.semantic.background.tertiary,
              borderRadius: ds.interactive.radius.small,
              padding: ds.spacing.medium,
              marginBottom: ds.spacing.large,
            }}>
              <h3 style={{
                fontSize: ds.typography.scale.small,
                fontWeight: ds.typography.weights.semibold,
                marginBottom: ds.spacing.medium,
              }}>
                Add New Subreddit
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: ds.spacing.medium,
                marginBottom: ds.spacing.medium,
              }}>
                <div>
                  <label style={{ fontSize: ds.typography.scale.mini, color: ds.colors.grayscale[70], marginBottom: ds.spacing.mini, display: 'block' }}>
                    Subreddit Name
                  </label>
                  <input
                    type="text"
                    value={newSubreddit.name}
                    onChange={(e) => setNewSubreddit(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="CryptoCurrency or r/CryptoCurrency"
                    style={{
                      width: '100%',
                      padding: ds.spacing.small,
                      backgroundColor: ds.colors.semantic.background.primary,
                      color: ds.colors.grayscale[90],
                      border: `1px solid ${ds.colors.grayscale[30]}`,
                      borderRadius: ds.interactive.radius.small,
                      fontSize: ds.typography.scale.small,
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ fontSize: ds.typography.scale.mini, color: ds.colors.grayscale[70], marginBottom: ds.spacing.mini, display: 'block' }}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={newSubreddit.displayName}
                    onChange={(e) => setNewSubreddit(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="r/CryptoCurrency"
                    style={{
                      width: '100%',
                      padding: ds.spacing.small,
                      backgroundColor: ds.colors.semantic.background.primary,
                      color: ds.colors.grayscale[90],
                      border: `1px solid ${ds.colors.grayscale[30]}`,
                      borderRadius: ds.interactive.radius.small,
                      fontSize: ds.typography.scale.small,
                    }}
                  />
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: ds.spacing.medium,
                marginBottom: ds.spacing.medium,
              }}>
                <div>
                  <label style={{ fontSize: ds.typography.scale.mini, color: ds.colors.grayscale[70], marginBottom: ds.spacing.mini, display: 'block' }}>
                    Priority
                  </label>
                  <select
                    value={newSubreddit.priority}
                    onChange={(e) => setNewSubreddit(prev => ({ ...prev, priority: e.target.value as any }))}
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
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: ds.typography.scale.mini, color: ds.colors.grayscale[70], marginBottom: ds.spacing.mini, display: 'block' }}>
                    Scan Frequency
                  </label>
                  <select
                    value={newSubreddit.scanFrequency}
                    onChange={(e) => setNewSubreddit(prev => ({ ...prev, scanFrequency: e.target.value as any }))}
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
                    <option value="realtime">Realtime (5min)</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: ds.typography.scale.mini, color: ds.colors.grayscale[70], marginBottom: ds.spacing.mini, display: 'block' }}>
                    Risk Level
                  </label>
                  <select
                    value={newSubreddit.riskLevel}
                    onChange={(e) => setNewSubreddit(prev => ({ ...prev, riskLevel: e.target.value as any }))}
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
                    <option value="safe">Safe</option>
                    <option value="moderate">Moderate</option>
                    <option value="risky">Risky</option>
                    <option value="high_risk">High Risk</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: ds.spacing.medium }}>
                <label style={{ fontSize: ds.typography.scale.mini, color: ds.colors.grayscale[70], marginBottom: ds.spacing.mini, display: 'block' }}>
                  Description
                </label>
                <input
                  type="text"
                  value={newSubreddit.description}
                  onChange={(e) => setNewSubreddit(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description of this subreddit"
                  style={{
                    width: '100%',
                    padding: ds.spacing.small,
                    backgroundColor: ds.colors.semantic.background.primary,
                    color: ds.colors.grayscale[90],
                    border: `1px solid ${ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.small,
                    fontSize: ds.typography.scale.small,
                  }}
                />
              </div>

              <div style={{ marginBottom: ds.spacing.medium }}>
                <label style={{ fontSize: ds.typography.scale.mini, color: ds.colors.grayscale[70], marginBottom: ds.spacing.mini, display: 'block' }}>
                  Tags
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: ds.spacing.mini }}>
                  {availableTags.map(tag => (
                    <button
                      key={tag.name}
                      onClick={() => toggleTag(tag.name)}
                      style={{
                        padding: `${ds.spacing.micro} ${ds.spacing.mini}`,
                        backgroundColor: newSubreddit.tags.includes(tag.name) ? tag.color : 'transparent',
                        color: newSubreddit.tags.includes(tag.name) ? '#ffffff' : tag.color,
                        border: `1px solid ${tag.color}`,
                        borderRadius: ds.interactive.radius.small,
                        fontSize: ds.typography.scale.mini,
                        cursor: 'pointer',
                        transition: designHelpers.animate('all', ds.animation.durations.fast),
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={addSubreddit}
                disabled={!newSubreddit.name.trim()}
                style={{
                  padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                  backgroundColor: ds.colors.semantic.primary,
                  color: ds.colors.grayscale[5],
                  border: 'none',
                  borderRadius: ds.interactive.radius.small,
                  fontSize: ds.typography.scale.small,
                  fontWeight: ds.typography.weights.medium,
                  cursor: newSubreddit.name.trim() ? 'pointer' : 'not-allowed',
                  opacity: newSubreddit.name.trim() ? 1 : 0.6,
                }}
              >
                Add Subreddit
              </button>
            </div>

            {/* Subreddit List */}
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              border: `1px solid ${ds.colors.grayscale[20]}`,
              borderRadius: ds.interactive.radius.small,
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: ds.typography.scale.small }}>
                <thead>
                  <tr style={{ backgroundColor: ds.colors.semantic.background.tertiary }}>
                    <th style={{ padding: ds.spacing.small, textAlign: 'left', borderBottom: `1px solid ${ds.colors.grayscale[20]}` }}>Subreddit</th>
                    <th style={{ padding: ds.spacing.small, textAlign: 'left', borderBottom: `1px solid ${ds.colors.grayscale[20]}` }}>Tags</th>
                    <th style={{ padding: ds.spacing.small, textAlign: 'center', borderBottom: `1px solid ${ds.colors.grayscale[20]}` }}>Priority</th>
                    <th style={{ padding: ds.spacing.small, textAlign: 'center', borderBottom: `1px solid ${ds.colors.grayscale[20]}` }}>Risk</th>
                    <th style={{ padding: ds.spacing.small, textAlign: 'center', borderBottom: `1px solid ${ds.colors.grayscale[20]}` }}>Frequency</th>
                    <th style={{ padding: ds.spacing.small, textAlign: 'center', borderBottom: `1px solid ${ds.colors.grayscale[20]}` }}>Status</th>
                    <th style={{ padding: ds.spacing.small, textAlign: 'center', borderBottom: `1px solid ${ds.colors.grayscale[20]}` }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subreddits.map(subreddit => (
                    <tr key={subreddit.name} style={{ borderBottom: `1px solid ${ds.colors.grayscale[10]}` }}>
                      <td style={{ padding: ds.spacing.small }}>
                        <div style={{ fontWeight: ds.typography.weights.medium }}>{subreddit.displayName}</div>
                        <div style={{ fontSize: ds.typography.scale.mini, color: ds.colors.grayscale[60] }}>{subreddit.description}</div>
                      </td>
                      <td style={{ padding: ds.spacing.small }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: ds.spacing.micro }}>
                          {subreddit.tags.slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              style={{
                                padding: `${ds.spacing.micro} ${ds.spacing.mini}`,
                                backgroundColor: `${getTagColor(tag)}20`,
                                color: getTagColor(tag),
                                borderRadius: ds.interactive.radius.small,
                                fontSize: ds.typography.scale.mini,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                          {subreddit.tags.length > 3 && (
                            <span style={{ fontSize: ds.typography.scale.mini, color: ds.colors.grayscale[60] }}>
                              +{subreddit.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: ds.spacing.small, textAlign: 'center' }}>
                        <span style={{
                          color: getPriorityColor(subreddit.priority),
                          fontWeight: ds.typography.weights.medium,
                          fontSize: ds.typography.scale.mini,
                          textTransform: 'uppercase',
                        }}>
                          {subreddit.priority}
                        </span>
                      </td>
                      <td style={{ padding: ds.spacing.small, textAlign: 'center' }}>
                        <span style={{
                          color: getRiskLevelColor(subreddit.riskLevel),
                          fontWeight: ds.typography.weights.medium,
                          fontSize: ds.typography.scale.mini,
                          textTransform: 'uppercase',
                        }}>
                          {subreddit.riskLevel.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: ds.spacing.small, textAlign: 'center', fontSize: ds.typography.scale.mini }}>
                        {subreddit.scanFrequency}
                      </td>
                      <td style={{ padding: ds.spacing.small, textAlign: 'center' }}>
                        <span style={{
                          color: subreddit.active ? ds.colors.semantic.success : ds.colors.grayscale[50],
                          fontSize: ds.typography.scale.mini,
                        }}>
                          {subreddit.active ? '●' : '○'}
                        </span>
                      </td>
                      <td style={{ padding: ds.spacing.small, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: ds.spacing.mini, justifyContent: 'center' }}>
                          <button
                            onClick={() => toggleSubreddit(subreddit.name)}
                            style={{
                              padding: ds.spacing.micro,
                              backgroundColor: 'transparent',
                              color: ds.colors.semantic.info,
                              border: `1px solid ${ds.colors.semantic.info}`,
                              borderRadius: ds.interactive.radius.small,
                              fontSize: ds.typography.scale.mini,
                              cursor: 'pointer',
                            }}
                          >
                            {subreddit.active ? 'Pause' : 'Start'}
                          </button>
                          <button
                            onClick={() => removeSubreddit(subreddit.name)}
                            style={{
                              padding: ds.spacing.micro,
                              backgroundColor: 'transparent',
                              color: ds.colors.semantic.error,
                              border: `1px solid ${ds.colors.semantic.error}`,
                              borderRadius: ds.interactive.radius.small,
                              fontSize: ds.typography.scale.mini,
                              cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Summary Cards */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: ds.spacing.large,
          marginBottom: ds.spacing.xlarge,
        }}>
          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            border: `1px solid ${ds.colors.grayscale[20]}`,
          }}>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Critical Alerts
            </div>
            <div style={{
              fontSize: ds.typography.scale.xxlarge,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              color: ds.colors.semantic.error,
            }}>
              {detectionResults.filter(r => r.riskLevel === 'critical').length}
            </div>
          </div>
          
          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            border: `1px solid ${ds.colors.grayscale[20]}`,
          }}>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              High Risk
            </div>
            <div style={{
              fontSize: ds.typography.scale.xxlarge,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              color: ds.colors.semantic.warning,
            }}>
              {detectionResults.filter(r => r.riskLevel === 'high').length}
            </div>
          </div>
          
          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            border: `1px solid ${ds.colors.grayscale[20]}`,
          }}>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Total Scanned
            </div>
            <div style={{
              fontSize: ds.typography.scale.xxlarge,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
            }}>
              {detectionResults.length}
            </div>
          </div>
          
          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            border: `1px solid ${ds.colors.grayscale[20]}`,
          }}>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Avg Confidence
            </div>
            <div style={{
              fontSize: ds.typography.scale.xxlarge,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              color: ds.colors.semantic.success,
            }}>
              {detectionResults.length > 0 ? 
                Math.round((detectionResults.reduce((sum, r) => sum + r.confidence, 0) / detectionResults.length) * 100) : 0
              }%
            </div>
          </div>
        </section>

        {/* New Symbol Alerts */}
        {newSymbolAlerts.length > 0 && (
          <section style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            marginBottom: ds.spacing.xlarge,
            border: `1px solid ${ds.colors.semantic.warning}`,
          }}>
            <h2 style={{
              fontSize: ds.typography.scale.medium,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.small,
            }}>
              🚨 New Symbol Alerts
            </h2>
            <p style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.medium,
            }}>
              Recently detected cryptocurrency symbols with pump/dump risk indicators
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: ds.spacing.medium,
            }}>
              {newSymbolAlerts.slice(0, 6).map((alert) => (
                <div
                  key={alert.symbol}
                  style={{
                    padding: ds.spacing.medium,
                    backgroundColor: alert.riskLevel === 'critical' ? 
                      `${ds.colors.semantic.error}05` : 
                      alert.riskLevel === 'high' ? 
                        `${ds.colors.semantic.warning}05` : 
                        ds.colors.semantic.background.tertiary,
                    border: `1px solid ${alert.riskLevel === 'critical' ? 
                      ds.colors.semantic.error : 
                      alert.riskLevel === 'high' ? 
                        ds.colors.semantic.warning : 
                        ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.small,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: ds.spacing.small }}>
                    <span style={{
                      fontSize: ds.typography.scale.base,
                      fontWeight: ds.typography.weights.semibold,
                      fontFamily: ds.typography.families.data,
                    }}>
                      {alert.symbol}
                    </span>
                    <span style={{
                      display: 'inline-block',
                      padding: `${ds.spacing.micro} ${ds.spacing.mini}`,
                      backgroundColor: alert.riskLevel === 'critical' ? 
                        ds.colors.semantic.error : 
                        alert.riskLevel === 'high' ? 
                          ds.colors.semantic.warning : 
                          ds.colors.semantic.info,
                      color: ds.colors.grayscale[5],
                      borderRadius: ds.interactive.radius.small,
                      fontSize: ds.typography.scale.mini,
                      fontWeight: ds.typography.weights.medium,
                      textTransform: 'uppercase',
                    }}>
                      {alert.riskLevel}
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: ds.spacing.small }}>
                    <div style={{ fontSize: ds.typography.scale.small, color: ds.colors.grayscale[70] }}>
                      Confidence: {Math.round(alert.confidence * 100)}% | 
                      Mentions: {alert.mentions} |
                      Platforms: {alert.platforms.join(', ')}
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: ds.spacing.medium }}>
                    <div style={{ fontSize: ds.typography.scale.mini, color: ds.colors.grayscale[60] }}>
                      {alert.historicalContext.hasHistory ? 
                        `Known symbol (${alert.historicalContext.daysSinceFirstMention} days old)` :
                        'New/unknown symbol'
                      }
                    </div>
                    <div style={{ fontSize: ds.typography.scale.mini, color: ds.colors.grayscale[60] }}>
                      Recommendation: {alert.recommendation.replace('_', ' ')}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: ds.spacing.small }}>
                    <button
                      onClick={() => {
                        setSelectedSymbol(alert.symbol)
                        runDetection(alert.symbol)
                      }}
                      style={{
                        flex: 1,
                        padding: ds.spacing.mini,
                        backgroundColor: 'transparent',
                        color: ds.colors.semantic.primary,
                        border: `1px solid ${ds.colors.semantic.primary}`,
                        borderRadius: ds.interactive.radius.small,
                        fontSize: ds.typography.scale.mini,
                        cursor: 'pointer',
                      }}
                    >
                      Analyze
                    </button>
                    <button
                      onClick={() => verifySymbol(alert.symbol)}
                      style={{
                        flex: 1,
                        padding: ds.spacing.mini,
                        backgroundColor: 'transparent',
                        color: ds.colors.semantic.info,
                        border: `1px solid ${ds.colors.semantic.info}`,
                        borderRadius: ds.interactive.radius.small,
                        fontSize: ds.typography.scale.mini,
                        cursor: 'pointer',
                      }}
                    >
                      Verify
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trending Symbols */}
        {detectionResults.length > 0 && detectionResults[0]?.data?.social?.mentionedSymbols && (
          <section style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            marginBottom: ds.spacing.xlarge,
            border: `1px solid ${ds.colors.grayscale[20]}`,
          }}>
            <h2 style={{
              fontSize: ds.typography.scale.medium,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.small,
            }}>
              Trending Symbols
            </h2>
            <p style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.medium,
            }}>
              Most mentioned cryptocurrencies in recent social media activity
            </p>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: ds.spacing.small,
            }}>
              {detectionResults[0].data.social.mentionedSymbols.map((item: any) => (
                <button
                  key={item.symbol}
                  onClick={() => {
                    setSelectedSymbol(item.symbol)
                    runDetection(item.symbol)
                  }}
                  style={{
                    padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                    backgroundColor: item.mentions > 50 ? 
                      `${ds.colors.semantic.error}10` : 
                      item.mentions > 20 ? 
                        `${ds.colors.semantic.warning}10` : 
                        ds.colors.semantic.background.tertiary,
                    color: item.mentions > 50 ? 
                      ds.colors.semantic.error : 
                      item.mentions > 20 ? 
                        ds.colors.semantic.warning : 
                        ds.colors.grayscale[80],
                    border: `1px solid ${item.mentions > 50 ? 
                      ds.colors.semantic.error : 
                      item.mentions > 20 ? 
                        ds.colors.semantic.warning : 
                        ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.small,
                    fontSize: ds.typography.scale.small,
                    fontFamily: ds.typography.families.data,
                    cursor: 'pointer',
                    transition: designHelpers.animate('all', ds.animation.durations.fast),
                  }}
                >
                  {item.symbol} ({item.mentions})
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Detection Results */}
        <section style={{
          backgroundColor: ds.colors.semantic.background.secondary,
          borderRadius: ds.interactive.radius.medium,
          overflow: 'hidden',
          border: `1px solid ${ds.colors.grayscale[20]}`,
        }}>
          <div style={{
            padding: ds.spacing.large,
            borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{
              fontSize: ds.typography.scale.medium,
              fontWeight: ds.typography.weights.semibold,
              margin: 0,
            }}>
              Detection Results
            </h2>
            {loading && (
              <div style={{
                fontSize: ds.typography.scale.small,
                color: ds.colors.semantic.info,
              }}>
                Scanning...
              </div>
            )}
          </div>
          
          {detectionResults.length === 0 && !loading ? (
            <div style={{
              padding: ds.spacing.xxlarge,
              textAlign: 'center',
              color: ds.colors.grayscale[70],
              fontSize: ds.typography.scale.small,
            }}>
              No detection results yet. Click "Scan Now" to start.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
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
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Symbol
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Risk Level
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Confidence
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Alerts
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Social Signals
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Market Signals
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Time
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'center',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detectionResults.map((result, index) => (
                    <tr key={`${result.symbol}-${index}`}>
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        <div style={{
                          fontSize: ds.typography.scale.base,
                          fontWeight: ds.typography.weights.semibold,
                          fontFamily: ds.typography.families.data,
                        }}>
                          {result.symbol}
                        </div>
                      </td>
                      
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        <span style={{
                          display: 'inline-block',
                          padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                          backgroundColor: `${getRiskColor(result.riskLevel)}20`,
                          color: getRiskColor(result.riskLevel),
                          borderRadius: ds.interactive.radius.small,
                          fontSize: ds.typography.scale.mini,
                          fontWeight: ds.typography.weights.medium,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>
                          {result.riskLevel}
                        </span>
                      </td>
                      
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: ds.spacing.small }}>
                          <div style={{
                            width: '60px',
                            height: '4px',
                            backgroundColor: ds.colors.grayscale[20],
                            borderRadius: ds.interactive.radius.pill,
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${result.confidence * 100}%`,
                              height: '100%',
                              backgroundColor: getConfidenceColor(result.confidence),
                            }} />
                          </div>
                          <span style={{
                            fontSize: ds.typography.scale.small,
                            fontFamily: ds.typography.families.data,
                            fontWeight: ds.typography.weights.medium,
                          }}>
                            {Math.round(result.confidence * 100)}%
                          </span>
                        </div>
                      </td>
                      
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: ds.spacing.mini }}>
                          {result.alerts.slice(0, 2).map((alert, i) => (
                            <span
                              key={i}
                              style={{
                                display: 'inline-block',
                                padding: `${ds.spacing.micro} ${ds.spacing.mini}`,
                                backgroundColor: alert.severity === 'critical' ? 
                                  `${ds.colors.semantic.error}10` : 
                                  `${ds.colors.semantic.warning}10`,
                                color: alert.severity === 'critical' ? 
                                  ds.colors.semantic.error : 
                                  ds.colors.semantic.warning,
                                borderRadius: ds.interactive.radius.small,
                                fontSize: ds.typography.scale.mini,
                              }}
                            >
                              {alert.message}
                            </span>
                          ))}
                        </div>
                      </td>
                      
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        {result.data.social && (
                          <span style={{
                            display: 'inline-block',
                            padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                            backgroundColor: `${ds.colors.semantic.info}10`,
                            color: ds.colors.semantic.info,
                            borderRadius: ds.interactive.radius.small,
                            fontSize: ds.typography.scale.mini,
                            fontFamily: ds.typography.families.data,
                          }}>
                            {result.data.social.symbolSignals} signals
                          </span>
                        )}
                      </td>
                      
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        <div style={{ display: 'flex', gap: ds.spacing.small }}>
                          {result.data.market?.volumeSpike && (
                            <span style={{
                              color: ds.colors.semantic.warning,
                              fontSize: ds.typography.scale.small,
                            }}>
                              Vol↑
                            </span>
                          )}
                          {result.data.market?.priceAnomaly && (
                            <span style={{
                              color: ds.colors.semantic.error,
                              fontSize: ds.typography.scale.small,
                            }}>
                              Price↑
                            </span>
                          )}
                        </div>
                      </td>
                      
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                        color: ds.colors.grayscale[70],
                        fontFamily: ds.typography.families.data,
                      }}>
                        {formatTimestamp(result.timestamp)}
                      </td>
                      
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                        textAlign: 'center',
                      }}>
                        <button
                          onClick={() => runDetection(result.symbol)}
                          disabled={loading}
                          style={{
                            padding: ds.spacing.mini,
                            backgroundColor: 'transparent',
                            color: ds.colors.semantic.primary,
                            border: `1px solid ${ds.colors.grayscale[30]}`,
                            borderRadius: ds.interactive.radius.small,
                            fontSize: ds.typography.scale.mini,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                            transition: designHelpers.animate('all', ds.animation.durations.fast),
                          }}
                        >
                          Refresh
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Warning Notice */}
        <div style={{
          marginTop: ds.spacing.xlarge,
          padding: ds.spacing.large,
          backgroundColor: `${ds.colors.semantic.warning}10`,
          border: `1px solid ${ds.colors.semantic.warning}`,
          borderRadius: ds.interactive.radius.medium,
        }}>
          <p style={{
            fontSize: ds.typography.scale.small,
            margin: 0,
          }}>
            <strong>Disclaimer:</strong> This tool is for educational and informational purposes only. 
            Pump and dump detection is not 100% accurate and should not be used as the sole basis for trading decisions. 
            Always conduct your own research and consider consulting with financial advisors.
          </p>
        </div>
      </main>
    </div>
  )
}