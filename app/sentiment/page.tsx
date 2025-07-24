'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Box, Typography, Grid, Card, CardContent, Chip, LinearProgress, IconButton, Switch, FormControlLabel, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material'
import { PlayArrow, Pause, Refresh, TrendingUp, TrendingDown, Warning, ViewList, ViewModule, Sort } from '@mui/icons-material'

interface LiveSymbolDetection {
  symbol: string
  timestamp: number
  platform: string
  source: string
  sentiment: number
  confidence: number
  pumpIndicators: string[]
  engagement: number
  riskScore: number
  isNew: boolean
}

interface SymbolMetrics {
  symbol: string
  totalMentions: number
  platforms: string[]
  avgSentiment: number
  avgRiskScore: number
  firstSeen: number
  lastSeen: number
  mentionsPerMinute: number
  pumpIndicatorCount: number
  totalEngagement: number
  crossPlatformSignal: boolean
}

interface DataSourceStatus {
  name: string
  isActive: boolean
  eventsPerSecond: number
  totalEvents: number
  totalProcessed?: number
  errors: number
  lastActivity: number
  performance?: {
    requestsPerMinute?: number
  }
}

export default function LiveSentimentDashboard() {
  const [isRunning, setIsRunning] = useState(true)
  const [liveDetections, setLiveDetections] = useState<LiveSymbolDetection[]>([])
  const [symbolMetrics, setSymbolMetrics] = useState<Map<string, SymbolMetrics>>(new Map())
  const [dataSourceStatus, setDataSourceStatus] = useState<DataSourceStatus[]>([
    { name: 'RSS Monitor', isActive: true, eventsPerSecond: 0.5, totalEvents: 0, errors: 0, lastActivity: Date.now() },
    { name: 'Twitter Stream', isActive: false, eventsPerSecond: 0, totalEvents: 0, errors: 0, lastActivity: Date.now() },
    { name: 'CryptoPanic', isActive: false, eventsPerSecond: 0, totalEvents: 0, errors: 0, lastActivity: Date.now() },
    { name: 'LunarCrush', isActive: false, eventsPerSecond: 0, totalEvents: 0, errors: 0, lastActivity: Date.now() },
    { name: 'Pushshift', isActive: true, eventsPerSecond: 0.3, totalEvents: 0, errors: 0, lastActivity: Date.now() },
  ])
  const [totalSymbolsDetected, setTotalSymbolsDetected] = useState(0)
  const [totalMentionsToday, setTotalMentionsToday] = useState(0)
  const [avgSentiment, setAvgSentiment] = useState(0)
  const [criticalAlerts, setCriticalAlerts] = useState(0)
  const [showOnlyNewSymbols, setShowOnlyNewSymbols] = useState(false)
  const [viewMode, setViewMode] = useState<'feed' | 'symbols'>('feed')
  const [sortBy, setSortBy] = useState<'mentions' | 'sentiment' | 'risk' | 'newest' | 'trending'>('mentions')
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const [systemStarted, setSystemStarted] = useState(false)
  const [useRealData, setUseRealData] = useState(true)

  // Start the monitoring system on component mount
  useEffect(() => {
    const startSystem = async () => {
      try {
        const response = await fetch('/api/live/start-system', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (response.ok) {
          setSystemStarted(true)
          console.log('Live monitoring system started')
        } else {
          console.warn('Failed to start monitoring system, using mock data')
          setUseRealData(false)
        }
      } catch (error) {
        console.error('Error starting system:', error)
        setUseRealData(false)
      }
    }

    startSystem()
  }, [])

  // Fetch real data from the live API
  const fetchRealData = async () => {
    try {
      const response = await fetch('/api/live/activity-feed?limit=20')
      const result = await response.json()
      
      if (result.success && result.data.detections.length > 0) {
        // Update with real detections
        setLiveDetections(prev => {
          const newDetections = result.data.detections.filter(
            (detection: LiveSymbolDetection) => !prev.some(p => 
              p.symbol === detection.symbol && 
              p.timestamp === detection.timestamp && 
              p.source === detection.source
            )
          )
          return [...newDetections, ...prev.slice(0, 80)] // Keep last 80
        })

        // Update metrics with real data
        result.data.detections.forEach((detection: LiveSymbolDetection) => {
          updateMetrics(detection)
          
          setTotalMentionsToday(prev => prev + 1)
          if (detection.isNew) {
            setTotalSymbolsDetected(prev => prev + 1)
          }
          if (detection.riskScore > 0.8) {
            setCriticalAlerts(prev => prev + 1)
          }
        })

        // Update data source status with persistent totals
        if (result.data.dataSourceStatus) {
          setDataSourceStatus(result.data.dataSourceStatus.map((source: DataSourceStatus) => ({
            ...source,
            totalEvents: source.totalProcessed || source.totalEvents || 0,
            eventsPerSecond: source.performance?.requestsPerMinute ? source.performance.requestsPerMinute / 60 : source.eventsPerSecond || 0
          })))
        }
      }
    } catch (error) {
      console.error('Error fetching real data:', error)
      // Fall back to mock data if real data fails
      if (useRealData) {
        setUseRealData(false)
      }
    }
  }

  // Simulate real-time data (fallback when real data isn't available)
  const generateMockDetection = (): LiveSymbolDetection => {
    const symbols = ['PEPE', 'SHIB', 'DOGE', 'BONK', 'FLOKI', 'WOJAK', 'BRETT', 'TURBO', 'MEW', 'POPCAT', 'WIF', 'BOOK', 'TRUMP', 'TREMP']
    const platforms = ['twitter', 'reddit', 'cryptopanic', 'lunarcrush']
    const sources = ['r/CryptoMoonShots', '@CryptoPump_Bot', 'CoinDesk', 'r/SatoshiStreetBets', '@elonmusk', 'CryptoPanic News']
    const pumpWords = ['moon', 'rocket', '100x', 'diamond hands', 'to the moon', 'breakout', 'pump']
    
    const symbol = symbols[Math.floor(Math.random() * symbols.length)]
    const platform = platforms[Math.floor(Math.random() * platforms.length)]
    const sentiment = (Math.random() - 0.5) * 2 // -1 to 1
    const riskScore = Math.random()
    const pumpIndicatorCount = Math.floor(Math.random() * 4)
    const pumpIndicators = Array.from({length: pumpIndicatorCount}, () => 
      pumpWords[Math.floor(Math.random() * pumpWords.length)]
    )
    
    return {
      symbol,
      timestamp: Date.now(),
      platform,
      source: sources[Math.floor(Math.random() * sources.length)],
      sentiment,
      confidence: 0.7 + Math.random() * 0.3,
      pumpIndicators,
      engagement: Math.floor(Math.random() * 1000),
      riskScore,
      isNew: Math.random() < 0.3 // 30% chance of being a new symbol
    }
  }

  const updateMetrics = (detection: LiveSymbolDetection) => {
    setSymbolMetrics(prev => {
      const newMetrics = new Map(prev)
      const existing = newMetrics.get(detection.symbol)
      
      if (existing) {
        // Update existing symbol metrics
        const updatedMetric: SymbolMetrics = {
          ...existing,
          totalMentions: existing.totalMentions + 1,
          platforms: [...new Set([...existing.platforms, detection.platform])],
          avgSentiment: (existing.avgSentiment * existing.totalMentions + detection.sentiment) / (existing.totalMentions + 1),
          avgRiskScore: (existing.avgRiskScore * existing.totalMentions + detection.riskScore) / (existing.totalMentions + 1),
          lastSeen: detection.timestamp,
          mentionsPerMinute: existing.totalMentions / ((detection.timestamp - existing.firstSeen) / 60000),
          pumpIndicatorCount: existing.pumpIndicatorCount + detection.pumpIndicators.length,
          totalEngagement: existing.totalEngagement + detection.engagement,
          crossPlatformSignal: existing.platforms.length > 1 || existing.platforms[0] !== detection.platform
        }
        newMetrics.set(detection.symbol, updatedMetric)
      } else {
        // Create new symbol metrics
        const newMetric: SymbolMetrics = {
          symbol: detection.symbol,
          totalMentions: 1,
          platforms: [detection.platform],
          avgSentiment: detection.sentiment,
          avgRiskScore: detection.riskScore,
          firstSeen: detection.timestamp,
          lastSeen: detection.timestamp,
          mentionsPerMinute: 1,
          pumpIndicatorCount: detection.pumpIndicators.length,
          totalEngagement: detection.engagement,
          crossPlatformSignal: false
        }
        newMetrics.set(detection.symbol, newMetric)
      }
      
      return newMetrics
    })
  }

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(async () => {
        if (useRealData && systemStarted) {
          // Try to fetch real data
          await fetchRealData()
        } else {
          // Fall back to mock data
          const detectionsCount = Math.floor(Math.random() * 3) + 1
          
          for (let i = 0; i < detectionsCount; i++) {
            const detection = generateMockDetection()
            
            setLiveDetections(prev => {
              const updated = [detection, ...prev.slice(0, 99)] // Keep last 100
              return updated
            })
            
            updateMetrics(detection)
            
            // Update totals
            setTotalMentionsToday(prev => prev + 1)
            if (detection.isNew) {
              setTotalSymbolsDetected(prev => prev + 1)
            }
            if (detection.riskScore > 0.8) {
              setCriticalAlerts(prev => prev + 1)
            }
          }
          
          // Update data source status (mock)
          setDataSourceStatus(prev => prev.map(source => ({
            ...source,
            totalEvents: source.isActive ? source.totalEvents + Math.floor(Math.random() * 3) : source.totalEvents,
            eventsPerSecond: source.isActive ? (0.1 + Math.random() * 2) : 0,
            lastActivity: source.isActive ? Date.now() : source.lastActivity,
            errors: source.isActive ? source.errors + (Math.random() < 0.01 ? 1 : 0) : source.errors // Only generate errors for active sources
          })))
        }
      }, 1000) // Update every second
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, useRealData, systemStarted])

  // Calculate average sentiment across all symbols
  useEffect(() => {
    const symbols = Array.from(symbolMetrics.values())
    if (symbols.length > 0) {
      const totalSentiment = symbols.reduce((sum, symbol) => sum + symbol.avgSentiment, 0)
      setAvgSentiment(totalSentiment / symbols.length)
    }
  }, [symbolMetrics])

  const toggleRunning = () => {
    setIsRunning(!isRunning)
  }

  const resetData = () => {
    setLiveDetections([])
    setSymbolMetrics(new Map())
    setTotalSymbolsDetected(0)
    setTotalMentionsToday(0)
    setCriticalAlerts(0)
  }

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.3) return '#4caf50' // Green for positive
    if (sentiment < -0.3) return '#f44336' // Red for negative
    return '#ff9800' // Orange for neutral
  }

  const getRiskColor = (risk: number) => {
    if (risk > 0.8) return '#f44336' // Red for high risk
    if (risk > 0.6) return '#ff9800' // Orange for medium risk
    if (risk > 0.4) return '#ffeb3b' // Yellow for moderate risk
    return '#4caf50' // Green for low risk
  }

  const filteredDetections = showOnlyNewSymbols 
    ? liveDetections.filter(d => d.isNew)
    : liveDetections

  const getSortedSymbols = () => {
    const symbols = Array.from(symbolMetrics.values())
    
    switch (sortBy) {
      case 'mentions':
        return symbols.sort((a, b) => b.totalMentions - a.totalMentions)
      case 'sentiment':
        return symbols.sort((a, b) => b.avgSentiment - a.avgSentiment)
      case 'risk':
        return symbols.sort((a, b) => b.avgRiskScore - a.avgRiskScore)
      case 'newest':
        return symbols.sort((a, b) => b.firstSeen - a.firstSeen)
      case 'trending':
        return symbols.sort((a, b) => b.mentionsPerMinute - a.mentionsPerMinute)
      default:
        return symbols.sort((a, b) => b.totalMentions - a.totalMentions)
    }
  }

  const sortedSymbols = getSortedSymbols()
  const topSymbols = sortedSymbols.slice(0, 10)

  return (
    <Box sx={{ p: 3, bgcolor: '#0a0a0a', minHeight: '100vh', color: 'white' }}>
      {/* Header with Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#00ff88' }}>
          🟢 LIVE Crypto Sentiment Monitor
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant={viewMode === 'feed' ? 'contained' : 'outlined'}
              startIcon={<ViewList />}
              onClick={() => setViewMode('feed')}
              sx={{ 
                bgcolor: viewMode === 'feed' ? '#00ff88' : 'transparent',
                color: viewMode === 'feed' ? '#000' : '#00ff88',
                borderColor: '#00ff88',
                '&:hover': { bgcolor: viewMode === 'feed' ? '#00cc66' : '#0a2a1a' }
              }}
            >
              Feed
            </Button>
            <Button
              variant={viewMode === 'symbols' ? 'contained' : 'outlined'}
              startIcon={<ViewModule />}
              onClick={() => setViewMode('symbols')}
              sx={{ 
                bgcolor: viewMode === 'symbols' ? '#00ff88' : 'transparent',
                color: viewMode === 'symbols' ? '#000' : '#00ff88',
                borderColor: '#00ff88',
                '&:hover': { bgcolor: viewMode === 'symbols' ? '#00cc66' : '#0a2a1a' }
              }}
            >
              Symbols
            </Button>
          </Box>
          
          {viewMode === 'symbols' && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel sx={{ color: '#888' }}>Sort by</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                sx={{ 
                  color: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
                  '& .MuiSvgIcon-root': { color: '#888' }
                }}
              >
                <MenuItem value="mentions">Most Mentions</MenuItem>
                <MenuItem value="trending">Trending (per min)</MenuItem>
                <MenuItem value="sentiment">Highest Sentiment</MenuItem>
                <MenuItem value="risk">Highest Risk</MenuItem>
                <MenuItem value="newest">Newest</MenuItem>
              </Select>
            </FormControl>
          )}
          
          <FormControlLabel
            control={
              <Switch 
                checked={showOnlyNewSymbols} 
                onChange={(e) => setShowOnlyNewSymbols(e.target.checked)}
                sx={{ '& .MuiSwitch-thumb': { backgroundColor: '#00ff88' }}}
              />
            }
            label="New Only"
          />
          <IconButton onClick={resetData} sx={{ color: '#ff6b6b' }}>
            <Refresh />
          </IconButton>
          <IconButton 
            onClick={toggleRunning} 
            sx={{ 
              color: isRunning ? '#ff6b6b' : '#00ff88',
              bgcolor: isRunning ? '#1a1a1a' : '#0a2a1a',
              '&:hover': { bgcolor: isRunning ? '#2a1a1a' : '#1a3a2a' }
            }}
          >
            {isRunning ? <Pause /> : <PlayArrow />}
          </IconButton>
        </Box>
      </Box>

      {/* Status Indicator */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: isRunning ? '#00ff88' : '#ff6b6b' }}>
          {isRunning ? '🟢 SYSTEM LIVE - MONITORING ALL SOURCES' : '🔴 SYSTEM PAUSED'}
        </Typography>
        {isRunning && (
          <Typography variant="body2" sx={{ color: '#888', mt: 1 }}>
            {useRealData && systemStarted 
              ? 'Real-time crypto sentiment analysis • Live data feed active' 
              : 'Demo mode with simulated data • Updates every second'
            }
          </Typography>
        )}
        {!systemStarted && isRunning && (
          <Typography variant="body2" sx={{ color: '#ff9800', mt: 0.5 }}>
            ⚠️ Starting monitoring system...
          </Typography>
        )}
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333' }}>
            <CardContent>
              <Typography variant="h4" sx={{ color: '#00ff88', fontWeight: 700 }}>
                {totalSymbolsDetected.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: '#888' }}>
                Unique Symbols Detected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333' }}>
            <CardContent>
              <Typography variant="h4" sx={{ color: '#4fc3f7', fontWeight: 700 }}>
                {totalMentionsToday.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: '#888' }}>
                Total Mentions Today
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333' }}>
            <CardContent>
              <Typography 
                variant="h4" 
                sx={{ 
                  color: getSentimentColor(avgSentiment), 
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                {avgSentiment > 0 ? <TrendingUp /> : <TrendingDown />}
                {(avgSentiment * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2" sx={{ color: '#888' }}>
                Average Sentiment
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333' }}>
            <CardContent>
              <Typography variant="h4" sx={{ color: '#ff6b6b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning />
                {criticalAlerts}
              </Typography>
              <Typography variant="body2" sx={{ color: '#888' }}>
                Critical Alerts
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Data Source Status */}
      <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, color: '#00ff88' }}>
            Data Source Status
          </Typography>
          <Grid container spacing={2}>
            {dataSourceStatus.map((source) => (
              <Grid item xs={12} md={3} key={source.name}>
                <Box sx={{ p: 2, bgcolor: '#0a0a0a', borderRadius: 1, border: '1px solid #333' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {source.name}
                    </Typography>
                    <Chip 
                      label={source.isActive ? 'LIVE' : 'OFFLINE'} 
                      size="small"
                      sx={{ 
                        bgcolor: source.isActive ? '#00ff88' : '#ff6b6b',
                        color: '#000',
                        fontWeight: 600
                      }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#888', mb: 1 }}>
                    {source.eventsPerSecond.toFixed(1)} events/sec
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#888', mb: 1 }}>
                    {source.totalEvents.toLocaleString()} total events
                  </Typography>
                  <Typography variant="body2" sx={{ color: source.errors > 0 ? '#ff6b6b' : '#888' }}>
                    {source.errors} errors
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Critical Alerts & Error Debugging Section */}
      {(criticalAlerts > 0 || dataSourceStatus.some(s => s.errors > 0) || !systemStarted || !useRealData) && (
        <Card sx={{ bgcolor: '#2a1a1a', border: '2px solid #ff6b6b', mb: 4 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Warning />
              System Alerts & Debug Information
            </Typography>
            
            {/* System Status Issues */}
            {!systemStarted && (
              <Box sx={{ p: 2, bgcolor: '#3a1a1a', borderRadius: 1, mb: 2, border: '1px solid #ff9800' }}>
                <Typography variant="body1" sx={{ color: '#ff9800', fontWeight: 600, mb: 1 }}>
                  ⚠️ System Startup Issue
                </Typography>
                <Typography variant="body2" sx={{ color: '#ccc' }}>
                  The live monitoring system failed to start. The dashboard is running in demo mode with simulated data.
                </Typography>
                <Typography variant="body2" sx={{ color: '#888', mt: 1 }}>
                  Debug: Check backend API endpoints and data orchestrator initialization.
                </Typography>
              </Box>
            )}

            {!useRealData && systemStarted && (
              <Box sx={{ p: 2, bgcolor: '#3a1a1a', borderRadius: 1, mb: 2, border: '1px solid #ff9800' }}>
                <Typography variant="body1" sx={{ color: '#ff9800', fontWeight: 600, mb: 1 }}>
                  ⚠️ Real Data Connection Failed
                </Typography>
                <Typography variant="body2" sx={{ color: '#ccc' }}>
                  System started but cannot fetch real-time data. Fallback to simulated data active.
                </Typography>
                <Typography variant="body2" sx={{ color: '#888', mt: 1 }}>
                  Debug: Check activity feed API and data source connections.
                </Typography>
              </Box>
            )}

            {/* Data Source Errors */}
            {dataSourceStatus.filter(s => s.errors > 0).map((source) => (
              <Box key={source.name} sx={{ p: 2, bgcolor: '#3a1a1a', borderRadius: 1, mb: 2, border: '1px solid #ff6b6b' }}>
                <Typography variant="body1" sx={{ color: '#ff6b6b', fontWeight: 600, mb: 1 }}>
                  🚨 {source.name} Errors
                </Typography>
                <Typography variant="body2" sx={{ color: '#ccc', mb: 1 }}>
                  Error Count: {source.errors} | Status: {source.isActive ? 'Active' : 'Offline'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#888' }}>
                  Events/sec: {source.eventsPerSecond.toFixed(1)} | Total Events: {source.totalEvents.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ color: '#888', mt: 1 }}>
                  Debug: Check {source.name.toLowerCase()} API credentials and rate limits.
                </Typography>
              </Box>
            ))}

            {/* Critical Alerts Details */}
            {criticalAlerts > 0 && (
              <Box sx={{ p: 2, bgcolor: '#3a1a1a', borderRadius: 1, mb: 2, border: '1px solid #ff6b6b' }}>
                <Typography variant="body1" sx={{ color: '#ff6b6b', fontWeight: 600, mb: 1 }}>
                  🚨 {criticalAlerts} Critical Risk Alerts
                </Typography>
                <Typography variant="body2" sx={{ color: '#ccc', mb: 1 }}>
                  High-risk pump signals detected. Symbols with risk scores above 80%.
                </Typography>
                <Typography variant="body2" sx={{ color: '#888' }}>
                  Review the live feed for symbols with high pump indicators and cross-platform signals.
                </Typography>
              </Box>
            )}

            {/* Performance Info */}
            <Box sx={{ p: 2, bgcolor: '#1a2a1a', borderRadius: 1, border: '1px solid #00ff88' }}>
              <Typography variant="body1" sx={{ color: '#00ff88', fontWeight: 600, mb: 1 }}>
                📊 Performance Metrics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ color: '#ccc' }}>
                    Data Mode: {useRealData && systemStarted ? 'Live Data' : 'Demo Mode'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ccc' }}>
                    Update Rate: Every 1 second
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ color: '#ccc' }}>
                    Active Sources: {dataSourceStatus.filter(s => s.isActive).length}/{dataSourceStatus.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ccc' }}>
                    Total Events: {dataSourceStatus.reduce((sum, s) => sum + s.totalEvents, 0).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* View Mode Content */}
      {viewMode === 'feed' ? (
        <Grid container spacing={3}>
          {/* Live Feed */}
          <Grid item xs={12} md={8}>
            <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', height: '600px' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, color: '#00ff88' }}>
                  🟢 Live Symbol Detections {showOnlyNewSymbols && '(New Only)'}
                </Typography>
                <Box sx={{ height: '520px', overflowY: 'auto' }}>
                  {filteredDetections.map((detection, index) => (
                    <Box 
                      key={`${detection.symbol}-${detection.timestamp}-${index}`}
                      sx={{ 
                        p: 2, 
                        mb: 1, 
                        bgcolor: '#0a0a0a', 
                        borderRadius: 1,
                        border: `1px solid ${detection.isNew ? '#00ff88' : '#333'}`,
                        opacity: index < 10 ? 1 : 0.7,
                        animation: index === 0 ? 'fadeIn 0.5s ease-in' : 'none',
                        '@keyframes fadeIn': {
                          from: { opacity: 0, transform: 'translateY(-10px)' },
                          to: { opacity: 1, transform: 'translateY(0)' }
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
                            ${detection.symbol}
                          </Typography>
                          {detection.isNew && (
                            <Chip 
                              label="NEW" 
                              size="small" 
                              sx={{ bgcolor: '#00ff88', color: '#000', fontWeight: 600 }}
                            />
                          )}
                          <Chip 
                            label={detection.platform.toUpperCase()} 
                            size="small" 
                            sx={{ bgcolor: '#333', color: '#fff' }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ color: '#888' }}>
                          {new Date(detection.timestamp).toLocaleTimeString()}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" sx={{ color: '#ccc', mb: 1 }}>
                        Source: {detection.source}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ color: '#888', mb: 0.5 }}>
                            Sentiment: {(detection.sentiment * 100).toFixed(1)}%
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={((detection.sentiment + 1) / 2) * 100}
                            sx={{ 
                              height: 4,
                              bgcolor: '#333',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: getSentimentColor(detection.sentiment)
                              }
                            }}
                          />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ color: '#888', mb: 0.5 }}>
                            Risk: {(detection.riskScore * 100).toFixed(1)}%
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={detection.riskScore * 100}
                            sx={{ 
                              height: 4,
                              bgcolor: '#333',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: getRiskColor(detection.riskScore)
                              }
                            }}
                          />
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {detection.pumpIndicators.map((indicator, i) => (
                            <Chip 
                              key={i}
                              label={indicator} 
                              size="small" 
                              sx={{ bgcolor: '#ff6b6b', color: '#fff', fontSize: '0.7rem' }}
                            />
                          ))}
                        </Box>
                        <Typography variant="body2" sx={{ color: '#888' }}>
                          {detection.engagement.toLocaleString()} engagement
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Symbols Sidebar */}
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', height: '600px' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, color: '#00ff88' }}>
                  📊 Top Symbols by Volume
                </Typography>
                <Box sx={{ height: '520px', overflowY: 'auto' }}>
                  {topSymbols.map((symbol, index) => (
                    <Box 
                      key={symbol.symbol}
                      sx={{ 
                        p: 2, 
                        mb: 1, 
                        bgcolor: '#0a0a0a', 
                        borderRadius: 1,
                        border: '1px solid #333'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
                          #{index + 1} ${symbol.symbol}
                        </Typography>
                        {symbol.crossPlatformSignal && (
                          <Chip 
                            label="CROSS-PLATFORM" 
                            size="small" 
                            sx={{ bgcolor: '#ff9800', color: '#000', fontWeight: 600, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                      
                      <Typography variant="body2" sx={{ color: '#4fc3f7', mb: 1 }}>
                        {symbol.totalMentions.toLocaleString()} mentions
                      </Typography>
                      
                      <Typography variant="body2" sx={{ color: '#888', mb: 1 }}>
                        Platforms: {symbol.platforms.join(', ')}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ color: getSentimentColor(symbol.avgSentiment) }}>
                          Sentiment: {(symbol.avgSentiment * 100).toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" sx={{ color: getRiskColor(symbol.avgRiskScore) }}>
                          Risk: {(symbol.avgRiskScore * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" sx={{ color: '#888' }}>
                        {symbol.mentionsPerMinute.toFixed(1)} mentions/min • {symbol.totalEngagement.toLocaleString()} engagement
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        /* Symbol Cards Grid View */
        <Box>
          <Typography variant="h6" sx={{ mb: 3, color: '#00ff88', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ViewModule />
            Symbol Overview - Sorted by {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)} {showOnlyNewSymbols && '(New Only)'}
            <Typography variant="body2" sx={{ color: '#888', ml: 2 }}>
              ({sortedSymbols.length} symbols tracked)
            </Typography>
          </Typography>
          
          <Grid container spacing={2}>
            {sortedSymbols
              .filter(symbol => !showOnlyNewSymbols || (Date.now() - symbol.firstSeen) < 3600000) // Filter new symbols (last hour)
              .map((symbol) => {
                const recentMentions = liveDetections.filter(d => 
                  d.symbol === symbol.symbol && 
                  Date.now() - d.timestamp < 60000 // Last minute
                ).length
                
                const isActive = recentMentions > 0
                
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={symbol.symbol}>
                    <Card 
                      sx={{ 
                        bgcolor: '#1a1a1a', 
                        border: `2px solid ${isActive ? '#00ff88' : '#333'}`,
                        height: '320px',
                        display: 'flex',
                        flexDirection: 'column',
                        animation: isActive ? 'pulse 2s infinite' : 'none',
                        '@keyframes pulse': {
                          '0%': { borderColor: '#00ff88' },
                          '50%': { borderColor: '#00cc66' },
                          '100%': { borderColor: '#00ff88' }
                        }
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1, p: 2 }}>
                        {/* Header */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
                            ${symbol.symbol}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column', alignItems: 'flex-end' }}>
                            {isActive && (
                              <Chip 
                                label="LIVE" 
                                size="small" 
                                sx={{ bgcolor: '#00ff88', color: '#000', fontWeight: 600, fontSize: '0.6rem' }}
                              />
                            )}
                            {symbol.crossPlatformSignal && (
                              <Chip 
                                label="MULTI" 
                                size="small" 
                                sx={{ bgcolor: '#ff9800', color: '#000', fontWeight: 600, fontSize: '0.6rem' }}
                              />
                            )}
                          </Box>
                        </Box>

                        {/* Key Metrics */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="h4" sx={{ color: '#4fc3f7', fontWeight: 700, mb: 0.5 }}>
                            {symbol.totalMentions.toLocaleString()}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#888' }}>
                            total mentions
                          </Typography>
                        </Box>

                        {/* Real-time Metrics */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Box>
                            <Typography variant="body2" sx={{ color: '#00ff88', fontWeight: 600 }}>
                              {symbol.mentionsPerMinute.toFixed(1)}/min
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#888' }}>
                              Rate
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" sx={{ color: getSentimentColor(symbol.avgSentiment), fontWeight: 600 }}>
                              {(symbol.avgSentiment * 100).toFixed(0)}%
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#888' }}>
                              Sentiment
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" sx={{ color: getRiskColor(symbol.avgRiskScore), fontWeight: 600 }}>
                              {(symbol.avgRiskScore * 100).toFixed(0)}%
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#888' }}>
                              Risk
                            </Typography>
                          </Box>
                        </Box>

                        {/* Platforms */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" sx={{ color: '#888' }}>
                            Platforms:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                            {symbol.platforms.map(platform => (
                              <Chip 
                                key={platform}
                                label={platform} 
                                size="small" 
                                sx={{ bgcolor: '#333', color: '#fff', fontSize: '0.6rem', height: '20px' }}
                              />
                            ))}
                          </Box>
                        </Box>

                        {/* Activity Indicator */}
                        <Box sx={{ mt: 'auto' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="caption" sx={{ color: '#888' }}>
                              Activity
                            </Typography>
                            <Typography variant="caption" sx={{ color: isActive ? '#00ff88' : '#888' }}>
                              {isActive ? `${recentMentions} new` : 'Quiet'}
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={Math.min(100, symbol.mentionsPerMinute * 10)}
                            sx={{ 
                              height: 6,
                              bgcolor: '#333',
                              borderRadius: 3,
                              '& .MuiLinearProgress-bar': {
                                bgcolor: isActive ? '#00ff88' : '#666',
                                borderRadius: 3
                              }
                            }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
          </Grid>
          
          {sortedSymbols.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" sx={{ color: '#888', mb: 2 }}>
                No symbols detected yet
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                Start monitoring to see real-time crypto symbol activity
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}