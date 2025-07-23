'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material'
import {
  Warning,
  TrendingUp,
  TrendingDown,
  Refresh,
  Security,
  Reddit,
  Twitter,
  ShowChart,
  VolumeUp,
  Timeline,
} from '@mui/icons-material'

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

export default function PumpDetectorPage() {
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [timeframe, setTimeframe] = useState('hour')
  const [monitoring, setMonitoring] = useState(false)
  
  const cryptoSymbols = ['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'AVAX', 'MATIC', 'DOGE', 'SHIB', 'XRP']

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        runDetection()
      }, 60000) // Refresh every minute
      
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

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
          // Single symbol detection
          setDetectionResults(prev => {
            const filtered = prev.filter(r => r.symbol !== symbol)
            return [result.data, ...filtered].slice(0, 50)
          })
        } else {
          // Run detection for multiple symbols
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
      case 'critical': return '#FF1744'
      case 'high': return '#FF9100'
      case 'medium': return '#FFC107'
      case 'low': return '#4CAF50'
      default: return '#9E9E9E'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return '#FF1744'
    if (confidence > 0.6) return '#FF9100'
    if (confidence > 0.4) return '#FFC107'
    return '#4CAF50'
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="px-2 sm:px-3 md:px-4 lg:px-5 py-4 min-h-screen w-full">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Security color="error" />
          Pump & Dump Detector
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Auto Refresh"
          />
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={() => runDetection()}
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? 'Scanning...' : 'Scan Now'}
          </Button>
        </Box>
      </Box>

      {/* Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Symbol (Optional)"
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value.toUpperCase())}
              placeholder="e.g., BTC, ETH"
              helperText="Leave empty for bulk scan"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Timeframe</InputLabel>
              <Select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                label="Timeframe"
              >
                <MenuItem value="hour">Last Hour</MenuItem>
                <MenuItem value="day">Last Day</MenuItem>
                <MenuItem value="week">Last Week</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => runDetection(selectedSymbol || undefined)}
              disabled={loading}
              sx={{ height: 56 }}
            >
              {selectedSymbol ? `Scan ${selectedSymbol}` : 'Bulk Scan'}
            </Button>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={monitoring}
                  onChange={(e) => setMonitoring(e.target.checked)}
                />
              }
              label="Live Monitor"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Warning color="error" />
                <Box>
                  <Typography variant="h4" color="error">
                    {detectionResults.filter(r => r.riskLevel === 'critical').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Critical Alerts
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TrendingUp color="warning" />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {detectionResults.filter(r => r.riskLevel === 'high').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    High Risk
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ShowChart color="info" />
                <Box>
                  <Typography variant="h4" color="info.main">
                    {detectionResults.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Scanned
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Timeline color="success" />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {detectionResults.length > 0 ? 
                      Math.round((detectionResults.reduce((sum, r) => sum + r.confidence, 0) / detectionResults.length) * 100) : 0
                    }%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Confidence
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Trending Symbols */}
      {detectionResults.length > 0 && detectionResults[0]?.data?.social?.mentionedSymbols && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp color="primary" />
            Trending Symbols
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Most mentioned cryptocurrencies in recent social media activity
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
            {detectionResults[0].data.social.mentionedSymbols.map((item: any) => (
              <Chip
                key={item.symbol}
                label={`${item.symbol} (${item.mentions})`}
                variant="outlined"
                color={
                  item.mentions > 50 ? 'error' : 
                  item.mentions > 20 ? 'warning' : 
                  'default'
                }
                onClick={() => {
                  setSelectedSymbol(item.symbol)
                  runDetection(item.symbol)
                }}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Detection Results */}
      <Paper>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Detection Results</Typography>
          {loading && <LinearProgress sx={{ mt: 1 }} />}
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Symbol</TableCell>
                <TableCell>Risk Level</TableCell>
                <TableCell>Confidence</TableCell>
                <TableCell>Alerts</TableCell>
                <TableCell>Social Signals</TableCell>
                <TableCell>Related Symbols</TableCell>
                <TableCell>Market Signals</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detectionResults.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No detection results yet. Click "Scan Now" to start.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              
              {detectionResults.map((result, index) => (
                <TableRow key={`${result.symbol}-${index}`}>
                  <TableCell>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {result.symbol}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      label={result.riskLevel.toUpperCase()}
                      sx={{
                        backgroundColor: getRiskColor(result.riskLevel) + '20',
                        color: getRiskColor(result.riskLevel),
                        fontWeight: 600
                      }}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={result.confidence * 100}
                        sx={{
                          width: 60,
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getConfidenceColor(result.confidence)
                          }
                        }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {Math.round(result.confidence * 100)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {result.alerts.slice(0, 2).map((alert, i) => (
                        <Chip
                          key={i}
                          label={alert.message}
                          size="small"
                          color={alert.severity === 'critical' ? 'error' : 'warning'}
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    {result.data.social && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title={`${result.data.social.totalSignals} total signals`}>
                          <Chip
                            icon={<Reddit />}
                            label={result.data.social.symbolSignals}
                            size="small"
                            color="info"
                          />
                        </Tooltip>
                      </Box>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {result.data.combined?.relatedSymbols && result.data.combined.relatedSymbols.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {result.data.combined.relatedSymbols.slice(0, 3).map((sym: string) => (
                          <Chip
                            key={sym}
                            label={sym}
                            size="small"
                            onClick={() => {
                              setSelectedSymbol(sym)
                              runDetection(sym)
                            }}
                            sx={{ 
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'action.hover'
                              }
                            }}
                          />
                        ))}
                        {result.data.combined.relatedSymbols.length > 3 && (
                          <Typography variant="caption" color="text.secondary">
                            +{result.data.combined.relatedSymbols.length - 3}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {result.data.market && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {result.data.market.volumeSpike && (
                          <Tooltip title="Volume spike detected">
                            <VolumeUp color="warning" fontSize="small" />
                          </Tooltip>
                        )}
                        {result.data.market.priceAnomaly && (
                          <Tooltip title="Price anomaly detected">
                            <TrendingUp color="error" fontSize="small" />
                          </Tooltip>
                        )}
                      </Box>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatTimestamp(result.timestamp)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Tooltip title="Refresh this symbol">
                      <IconButton
                        size="small"
                        onClick={() => runDetection(result.symbol)}
                        disabled={loading}
                      >
                        <Refresh />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Warning Notice */}
      <Alert severity="warning" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Disclaimer:</strong> This tool is for educational and informational purposes only. 
          Pump and dump detection is not 100% accurate and should not be used as the sole basis for trading decisions. 
          Always conduct your own research and consider consulting with financial advisors.
        </Typography>
      </Alert>
    </div>
  )
}