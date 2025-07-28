'use client'

import React, { useState } from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import {
  SmartToy as AIIcon,
  PlayArrow as RunIcon,
  Save as SaveIcon,
  Code as CodeIcon,
  Settings as SettingsIcon,
  Key as KeyIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Assessment as TestIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material'
import StrategyChat from '@/components/StrategyChat'
import { GeneratedStrategy } from '@/lib/anthropic/client'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import BacktestResults from '@/components/BacktestResults'
import { BacktestResult } from '@/lib/backtest/StrategyExecutor'

export default function AIStrategyPage() {
  const [apiKey, setApiKey] = useState('')
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [tempApiKey, setTempApiKey] = useState('')
  const [generatedStrategies, setGeneratedStrategies] = useState<GeneratedStrategy[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<GeneratedStrategy | null>(null)
  const [showBacktestDialog, setShowBacktestDialog] = useState(false)
  const [backtestSymbol, setBacktestSymbol] = useState('BTC/USD')
  const [backtestPeriod, setBacktestPeriod] = useState('30')
  const [backtestResults, setBacktestResults] = useState<BacktestResult | null>(null)
  const [isBacktesting, setIsBacktesting] = useState(false)

  const handleStrategyGenerated = (strategy: GeneratedStrategy) => {
    setGeneratedStrategies(prev => [strategy, ...prev])
    setSelectedStrategy(strategy)
  }

  const handleSaveApiKey = () => {
    setApiKey(tempApiKey)
    setShowApiKeyDialog(false)
    // In production, you'd want to encrypt and store this securely
    localStorage.setItem('anthropic_api_key', tempApiKey)
  }

  const handleRunBacktest = async () => {
    if (!selectedStrategy) return
    
    setIsBacktesting(true)
    setShowBacktestDialog(false)
    
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(backtestPeriod))
      
      const response = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          strategy: selectedStrategy,
          symbol: backtestSymbol,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          initialBalance: 10000
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to run backtest')
      }
      
      const results = await response.json()
      setBacktestResults(results)
    } catch (error) {
      console.error('Backtest error:', error)
      alert('Failed to run backtest. Please try again.')
    } finally {
      setIsBacktesting(false)
    }
  }

  // Load API key from localStorage on mount
  React.useEffect(() => {
    const savedKey = localStorage.getItem('anthropic_api_key')
    if (savedKey) {
      setApiKey(savedKey)
    }
  }, [])

  const quickPrompts = [
    {
      title: 'Momentum Strategy',
      prompt: 'Create a momentum trading strategy that identifies strong trends using multiple timeframes',
      icon: <TrendingUpIcon />,
      color: '#4caf50'
    },
    {
      title: 'Mean Reversion',
      prompt: 'Build a mean reversion strategy that trades oversold and overbought conditions',
      icon: <AIIcon />,
      color: '#2196f3'
    },
    {
      title: 'Scalping Bot',
      prompt: 'Generate a high-frequency scalping strategy for 1-minute charts with tight risk management',
      icon: <SpeedIcon />,
      color: '#ff9800'
    },
    {
      title: 'Risk-Adjusted',
      prompt: 'Create a conservative strategy focused on capital preservation with 2:1 risk-reward ratio',
      icon: <SecurityIcon />,
      color: '#9c27b0'
    }
  ]

  return (
    <div className="px-2 sm:px-3 md:px-4 lg:px-5 py-4 space-y-4 min-h-screen w-full">
      {/* Header */}
      <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AIIcon sx={{ fontSize: 32 }} />
              AI Strategy Builder
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
              Create bespoke trading strategies using Claude AI
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<KeyIcon />}
            onClick={() => setShowApiKeyDialog(true)}
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.2)', 
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              color: 'white'
            }}
          >
            {apiKey ? 'Update API Key' : 'Set API Key'}
          </Button>
        </Box>
      </Paper>

      {!apiKey && (
        <Alert severity="info" sx={{ mb: 2 }}>
          To use the AI Strategy Builder, please set your Anthropic API key. You can get one from{' '}
          <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">
            console.anthropic.com
          </a>
        </Alert>
      )}

      {/* Quick Start Templates */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>Quick Start Templates</Typography>
        <Grid container spacing={2}>
          {quickPrompts.map((prompt, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 }
                }}
                onClick={() => {
                  // This will be handled by the chat component
                  const chatInput = document.querySelector('textarea[placeholder*="Ask me to create"]') as HTMLTextAreaElement
                  if (chatInput) {
                    chatInput.value = prompt.prompt
                    chatInput.focus()
                    // Trigger input event
                    const event = new Event('input', { bubbles: true })
                    chatInput.dispatchEvent(event)
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box sx={{ color: prompt.color }}>{prompt.icon}</Box>
                    <Typography variant="h6">{prompt.title}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {prompt.prompt}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Chat Interface */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ height: 600, display: 'flex', flexDirection: 'column' }}>
            <StrategyChat 
              apiKey={apiKey} 
              onStrategyGenerated={handleStrategyGenerated}
            />
          </Paper>
        </Grid>

        {/* Strategy Preview */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ height: 600, p: 2, overflow: 'auto' }}>
            {selectedStrategy ? (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">{selectedStrategy.name}</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<TestIcon />}
                      onClick={() => setShowBacktestDialog(true)}
                      disabled={isBacktesting}
                    >
                      Test Strategy
                    </Button>
                    <IconButton size="small">
                      <SaveIcon />
                    </IconButton>
                    <IconButton size="small">
                      <RunIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Typography variant="body2" paragraph color="text.secondary">
                  {selectedStrategy.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Required Indicators</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedStrategy.requiredIndicators.map(indicator => (
                      <Chip key={indicator} label={indicator} size="small" />
                    ))}
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Risk Metrics</Typography>
                  <Grid container spacing={1}>
                    {Object.entries(selectedStrategy.riskMetrics).map(([key, value]) => (
                      <Grid item xs={6} key={key}>
                        <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {typeof value === 'number' ? 
                              (key.includes('Rate') || key.includes('ratio') ? 
                                (value * 100).toFixed(1) + '%' : 
                                value.toFixed(2)
                              ) : value}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Strategy Code</Typography>
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    <SyntaxHighlighter
                      language={selectedStrategy.language}
                      style={vscDarkPlus}
                      customStyle={{ margin: 0, fontSize: '0.875rem' }}
                    >
                      {selectedStrategy.code}
                    </SyntaxHighlighter>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'text.secondary'
              }}>
                <CodeIcon sx={{ fontSize: 64, mb: 2 }} />
                <Typography variant="h6" gutterBottom>No Strategy Selected</Typography>
                <Typography variant="body2" textAlign="center">
                  Generate a strategy using the chat interface or select from your saved strategies
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Generated Strategies List */}
      {generatedStrategies.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Generated Strategies</Typography>
          <Grid container spacing={2}>
            {generatedStrategies.map((strategy, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    bgcolor: selectedStrategy?.name === strategy.name ? 'action.selected' : 'background.paper'
                  }}
                  onClick={() => setSelectedStrategy(strategy)}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom>{strategy.name}</Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {strategy.description.substring(0, 100)}...
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip label={strategy.timeframe} size="small" />
                      <Chip label={strategy.language} size="small" color="primary" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Backtest Results */}
      {(backtestResults || isBacktesting) && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Backtest Results
          </Typography>
          <BacktestResults results={backtestResults!} isLoading={isBacktesting} />
        </Paper>
      )}

      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onClose={() => setShowApiKeyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Set Anthropic API Key</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Your API key is stored locally and never sent to our servers. It&apos;s only used to communicate directly with Anthropic&apos;s API.
          </Alert>
          <TextField
            fullWidth
            label="API Key"
            type="password"
            value={tempApiKey}
            onChange={(e) => setTempApiKey(e.target.value)}
            placeholder="sk-ant-..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApiKeyDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveApiKey} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Backtest Dialog */}
      <Dialog open={showBacktestDialog} onClose={() => setShowBacktestDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configure Backtest</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Trading Pair</InputLabel>
              <Select
                value={backtestSymbol}
                onChange={(e) => setBacktestSymbol(e.target.value)}
                label="Trading Pair"
              >
                <MenuItem value="BTC/USD">BTC/USD</MenuItem>
                <MenuItem value="ETH/USD">ETH/USD</MenuItem>
                <MenuItem value="SOL/USD">SOL/USD</MenuItem>
                <MenuItem value="ADA/USD">ADA/USD</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Time Period</InputLabel>
              <Select
                value={backtestPeriod}
                onChange={(e) => setBacktestPeriod(e.target.value)}
                label="Time Period"
              >
                <MenuItem value="7">Last 7 days</MenuItem>
                <MenuItem value="30">Last 30 days</MenuItem>
                <MenuItem value="90">Last 90 days</MenuItem>
                <MenuItem value="180">Last 180 days</MenuItem>
                <MenuItem value="365">Last year</MenuItem>
              </Select>
            </FormControl>
            
            <Alert severity="info">
              This will run a historical backtest using {selectedStrategy?.timeframe || '1h'} candles for {selectedStrategy?.name}.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBacktestDialog(false)}>Cancel</Button>
          <Button onClick={handleRunBacktest} variant="contained" startIcon={<TestIcon />}>
            Run Backtest
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}