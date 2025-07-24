'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Box, Typography, Grid, Card, CardContent, Chip, LinearProgress, IconButton, Switch, FormControlLabel } from '@mui/material'
import { PlayArrow, Pause, Refresh, TrendingUp, TrendingDown, Warning } from '@mui/icons-material'

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
  errors: number
  lastActivity: number
}

export default function LiveDashboard() {
  const [isRunning, setIsRunning] = useState(true)
  const [liveDetections, setLiveDetections] = useState<LiveSymbolDetection[]>([])
  const [symbolMetrics, setSymbolMetrics] = useState<Map<string, SymbolMetrics>>(new Map())
  const [dataSourceStatus, setDataSourceStatus] = useState<DataSourceStatus[]>([
    { name: 'RSS Monitor', isActive: true, eventsPerSecond: 0.5, totalEvents: 0, errors: 0, lastActivity: Date.now() },
    { name: 'Twitter Stream', isActive: true, eventsPerSecond: 2.3, totalEvents: 0, errors: 0, lastActivity: Date.now() },
    { name: 'CryptoPanic', isActive: true, eventsPerSecond: 0.3, totalEvents: 0, errors: 0, lastActivity: Date.now() },
    { name: 'LunarCrush', isActive: true, eventsPerSecond: 0.2, totalEvents: 0, errors: 0, lastActivity: Date.now() },
  ])
  const [totalSymbolsDetected, setTotalSymbolsDetected] = useState(0)
  const [totalMentionsToday, setTotalMentionsToday] = useState(0)
  const [avgSentiment, setAvgSentiment] = useState(0)
  const [criticalAlerts, setCriticalAlerts] = useState(0)
  const [showOnlyNewSymbols, setShowOnlyNewSymbols] = useState(false)
  
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

        // Update data source status
        if (result.data.dataSourceStatus) {
          setDataSourceStatus(result.data.dataSourceStatus)
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
            totalEvents: source.totalEvents + Math.floor(Math.random() * 3),
            eventsPerSecond: 0.1 + Math.random() * 2,
            lastActivity: Date.now(),
            errors: source.errors + (Math.random() < 0.01 ? 1 : 0) // 1% chance of error
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

  const topSymbols = Array.from(symbolMetrics.values())
    .sort((a, b) => b.totalMentions - a.totalMentions)
    .slice(0, 10)

  return (
    <Box sx={{ p: 3, bgcolor: '#0a0a0a', minHeight: '100vh', color: 'white' }}>
      {/* Header with Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#00ff88' }}>
          🔴 LIVE Crypto Sentiment Monitor
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch 
                checked={showOnlyNewSymbols} 
                onChange={(e) => setShowOnlyNewSymbols(e.target.checked)}
                sx={{ '& .MuiSwitch-thumb': { backgroundColor: '#00ff88' }}}
              />
            }
            label="New Symbols Only"
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

      <Grid container spacing={3}>
        {/* Live Feed */}
        <Grid item xs={12} md={8}>
          <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', height: '600px' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: '#00ff88' }}>
                🔴 Live Symbol Detections {showOnlyNewSymbols && '(New Only)'}
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

        {/* Top Symbols */}
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
    </Box>
  )
}