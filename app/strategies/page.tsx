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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab
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
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  ShowChart as ShowChartIcon,
  ViewList as ViewListIcon,
  TableChart as TableChartIcon,
} from '@mui/icons-material'
import ExpandableStrategyList from '@/components/ExpandableStrategyList'
import StrategyChat from '@/components/StrategyChat'
import { GeneratedStrategy } from '@/lib/anthropic/client'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import BacktestResults from '@/components/BacktestResults'
import { BacktestResult } from '@/lib/backtest/StrategyExecutor'

interface Strategy {
  id: string
  name: string
  type: 'momentum' | 'mean_reversion' | 'scalping' | 'market_making' | 'ai_generated'
  active: boolean
  totalRuns: number
  successfulRuns: number
  totalPnl: number
  lastRun?: Date
  runs: StrategyRun[]
}

interface StrategyRun {
  id: string
  runId: string
  startTime: Date
  endTime?: Date
  status: 'running' | 'completed' | 'failed' | 'stopped'
  pnl?: number
  trades?: number
  winRate?: number
  sharpeRatio?: number
}

// Mock data with run history
const mockStrategies: Strategy[] = [
  {
    id: '1',
    name: 'Mean Reversion Strategy',
    type: 'mean_reversion',
    active: true,
    totalRuns: 15,
    successfulRuns: 12,
    totalPnl: 12840,
    lastRun: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    runs: [
      {
        id: 'run-1-1',
        runId: 'a1b2c3d4',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'running',
        trades: 23,
        winRate: 0.78,
        sharpeRatio: 1.85
      },
      {
        id: 'run-1-2',
        runId: 'e5f6g7h8',
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 20 * 60 * 60 * 1000),
        status: 'completed',
        pnl: 2340,
        trades: 45,
        winRate: 0.82,
        sharpeRatio: 2.1
      },
      {
        id: 'run-1-3',
        runId: 'i9j0k1l2',
        startTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 46 * 60 * 60 * 1000),
        status: 'failed',
        pnl: -450,
        trades: 12,
        winRate: 0.25,
        sharpeRatio: -0.8
      }
    ]
  },
  {
    id: '2',
    name: 'Momentum Trading Strategy',
    type: 'momentum',
    active: true,
    totalRuns: 8,
    successfulRuns: 6,
    totalPnl: 18760,
    lastRun: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    runs: [
      {
        id: 'run-2-1',
        runId: 'm3n4o5p6',
        startTime: new Date(Date.now() - 30 * 60 * 1000),
        status: 'running',
        trades: 8,
        winRate: 0.75,
        sharpeRatio: 1.95
      },
      {
        id: 'run-2-2',
        runId: 'q7r8s9t0',
        startTime: new Date(Date.now() - 12 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 8 * 60 * 60 * 1000),
        status: 'completed',
        pnl: 5680,
        trades: 18,
        winRate: 0.72,
        sharpeRatio: 1.68
      }
    ]
  },
  {
    id: '3',
    name: 'AI-Generated Scalper',
    type: 'ai_generated',
    active: false,
    totalRuns: 23,
    successfulRuns: 18,
    totalPnl: 9435,
    lastRun: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    runs: [
      {
        id: 'run-3-1',
        runId: 'u1v2w3x4',
        startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        status: 'stopped',
        pnl: 890,
        trades: 124,
        winRate: 0.68,
        sharpeRatio: 1.45
      }
    ]
  },
  {
    id: '4',
    name: 'Market Making Bot',
    type: 'market_making',
    active: true,
    totalRuns: 45,
    successfulRuns: 38,
    totalPnl: 15220,
    lastRun: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    runs: [
      {
        id: 'run-4-1',
        runId: 'y5z6a7b8',
        startTime: new Date(Date.now() - 10 * 60 * 1000),
        status: 'running',
        trades: 234,
        winRate: 0.85,
        sharpeRatio: 2.34
      },
      {
        id: 'run-4-2',
        runId: 'c9d0e1f2',
        startTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'completed',
        pnl: 1340,
        trades: 567,
        winRate: 0.83,
        sharpeRatio: 2.15
      },
      {
        id: 'run-4-3',
        runId: 'g3h4i5j6',
        startTime: new Date(Date.now() - 12 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 8 * 60 * 60 * 1000),
        status: 'completed',
        pnl: 980,
        trades: 423,
        winRate: 0.86,
        sharpeRatio: 2.45
      }
    ]
  },
  {
    id: '5',
    name: 'High-Frequency Scalper',
    type: 'scalping',
    active: false,
    totalRuns: 12,
    successfulRuns: 7,
    totalPnl: -2340,
    lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    runs: []
  }
]


export default function StrategiesPage() {
  const [tabValue, setTabValue] = useState(0)
  const [viewMode, setViewMode] = useState<'table' | 'expandable'>('expandable')
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedStrategyForEdit, setSelectedStrategyForEdit] = useState<Strategy | null>(null)
  const [strategies, setStrategies] = useState(mockStrategies)
  const [formData, setFormData] = useState({
    name: '',
    type: 'momentum',
    description: '',
    entryCondition: '',
    exitCondition: '',
    stopLoss: '2',
    takeProfit: '5',
    positionSize: '1000'
  })

  // AI Strategy Builder states
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

  const handleStatusToggle = (strategyId: string) => {
    setStrategies(prev => 
      prev.map(s => 
        s.id === strategyId ? { ...s, active: !s.active } : s
      )
    )
  }

  const handleRunClick = (strategyId: string, runId: string) => {
    console.log('View run details:', strategyId, runId)
    // Navigate to run details or open dialog
  }

  const handleStrategyClick = (strategyId: string) => {
    console.log('View strategy details:', strategyId)
    // Navigate to strategy details
  }

  const handleStartStrategy = (strategyId: string) => {
    setStrategies(prev => 
      prev.map(s => 
        s.id === strategyId ? { ...s, active: true } : s
      )
    )
  }

  const handleStopStrategy = (strategyId: string) => {
    setStrategies(prev => 
      prev.map(s => 
        s.id === strategyId ? { ...s, active: false } : s
      )
    )
  }

  const handleEdit = (strategy: Strategy) => {
    setSelectedStrategyForEdit(strategy)
    setFormData({
      name: strategy.name,
      type: strategy.type,
      description: '',
      entryCondition: '',
      exitCondition: '',
      stopLoss: '2',
      takeProfit: '5',
      positionSize: '1000'
    })
    setOpenDialog(true)
  }

  // AI Strategy Builder handlers
  const handleStrategyGenerated = (strategy: GeneratedStrategy) => {
    setGeneratedStrategies(prev => [strategy, ...prev])
    setSelectedStrategy(strategy)
  }

  const handleSaveApiKey = () => {
    setApiKey(tempApiKey)
    setShowApiKeyDialog(false)
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

  React.useEffect(() => {
    const savedKey = localStorage.getItem('anthropic_api_key')
    if (savedKey) {
      setApiKey(savedKey)
    }
  }, [])

  const handleDelete = (strategyId: string) => {
    setStrategies(prev => prev.filter(s => s.id !== strategyId))
  }

  const handleSave = () => {
    // Save strategy
    console.log('Save strategy:', formData)
    setOpenDialog(false)
    setSelectedStrategyForEdit(null)
  }

  const getStatusColor = (active: boolean) => {
    return active ? 'success' : 'default'
  }

  const filteredStrategies = tabValue === 0 
    ? strategies 
    : tabValue === 1 
    ? strategies.filter(s => s.active)
    : strategies.filter(s => !s.active)

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
      {/* AI Strategy Builder Header */}
      <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AIIcon sx={{ fontSize: 32 }} />
              AI Strategy Builder & Management
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
              Create bespoke trading strategies using Claude AI or manage existing strategies
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
                  const chatInput = document.querySelector('textarea[placeholder*="Ask me to create"]') as HTMLTextAreaElement
                  if (chatInput) {
                    chatInput.value = prompt.prompt
                    chatInput.focus()
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

      {/* AI Strategy Builder */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ height: 600, display: 'flex', flexDirection: 'column' }}>
            <StrategyChat 
              apiKey={apiKey} 
              onStrategyGenerated={handleStrategyGenerated}
            />
          </Paper>
        </Grid>

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

      {/* Existing Strategies Management */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ color: 'primary.main' }}>
          Manage Existing Strategies
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <IconButton
            onClick={() => setViewMode(viewMode === 'table' ? 'expandable' : 'table')}
            sx={{ color: 'primary.main' }}
          >
            {viewMode === 'table' ? <ViewListIcon /> : <TableChartIcon />}
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            New Strategy
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="All Strategies" />
          <Tab label="Active" />
          <Tab label="Inactive" />
          <Tab label="Performance" />
        </Tabs>
      </Paper>

      {viewMode === 'expandable' ? (
        <ExpandableStrategyList
          strategies={filteredStrategies}
          onRunClick={handleRunClick}
          onStrategyClick={handleStrategyClick}
          onStartStrategy={handleStartStrategy}
          onStopStrategy={handleStopStrategy}
        />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Strategy Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Total P&L</TableCell>
                <TableCell align="right">Success Rate</TableCell>
                <TableCell align="right">Total Runs</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStrategies.map((strategy) => (
                <TableRow key={strategy.id}>
                  <TableCell>
                    <Typography variant="body1" fontWeight="medium">
                      {strategy.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={strategy.type.replace('_', ' ').toUpperCase()} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={strategy.active ? 'ACTIVE' : 'INACTIVE'} 
                      color={getStatusColor(strategy.active)} 
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography 
                      color={strategy.totalPnl > 0 ? 'success.main' : 'error.main'}
                      fontWeight="medium"
                    >
                      ${strategy.totalPnl.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {strategy.totalRuns > 0 
                      ? `${((strategy.successfulRuns / strategy.totalRuns) * 100).toFixed(0)}%`
                      : '-'
                    }
                  </TableCell>
                  <TableCell align="right">{strategy.totalRuns}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleStatusToggle(strategy.id)}
                        color={strategy.active ? 'error' : 'success'}
                      >
                        {strategy.active ? <PauseIcon /> : <PlayArrowIcon />}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(strategy)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(strategy.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onClose={() => setShowApiKeyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Set Anthropic API Key</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Your API key is stored locally and never sent to our servers. It's only used to communicate directly with Anthropic's API.
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

      {/* Strategy Form Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedStrategyForEdit ? 'Edit Strategy' : 'Create New Strategy'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Strategy Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Strategy Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  label="Strategy Type"
                >
                  <MenuItem value="mean_reversion">Mean Reversion</MenuItem>
                  <MenuItem value="momentum">Momentum</MenuItem>
                  <MenuItem value="scalping">Scalping</MenuItem>
                  <MenuItem value="market_making">Market Making</MenuItem>
                  <MenuItem value="ai_generated">AI Generated</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Entry Conditions"
                placeholder="e.g., RSI < 30 AND Price > 20 EMA"
                value={formData.entryCondition}
                onChange={(e) => setFormData({ ...formData, entryCondition: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Exit Conditions"
                placeholder="e.g., RSI > 70 OR Price < Entry - 2%"
                value={formData.exitCondition}
                onChange={(e) => setFormData({ ...formData, exitCondition: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Stop Loss (%)"
                type="number"
                value={formData.stopLoss}
                onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Take Profit (%)"
                type="number"
                value={formData.takeProfit}
                onChange={(e) => setFormData({ ...formData, takeProfit: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Position Size ($)"
                type="number"
                value={formData.positionSize}
                onChange={(e) => setFormData({ ...formData, positionSize: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {selectedStrategyForEdit ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}