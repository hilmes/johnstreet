'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon
} from '@mui/icons-material'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface BacktestResult {
  config: any
  portfolio: any
  metrics: any
  equityCurve: Array<{ timestamp: string; value: number; drawdown: number }>
  trades: any[]
  strategyReturns: number[]
}

interface Strategy {
  name: string
  displayName: string
  description: string
  parameters: Record<string, any>
}

export default function BacktestingPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState('')
  const [strategyParameters, setStrategyParameters] = useState<Record<string, any>>({})
  const [backtestConfig, setBacktestConfig] = useState({
    symbols: ['BTC'],
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    initialCapital: 100000,
    commission: 0.001,
    slippage: 0.001,
    useAdvancedExecution: false,
    useSyntheticData: true
  })
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStrategies()
  }, [])

  const fetchStrategies = async () => {
    try {
      const response = await fetch('/api/backtesting/run')
      const data = await response.json()
      setStrategies(data.strategies)
    } catch (error) {
      console.error('Failed to fetch strategies:', error)
    }
  }

  const handleStrategyChange = (strategyName: string) => {
    setSelectedStrategy(strategyName)
    const strategy = strategies.find(s => s.name === strategyName)
    if (strategy) {
      const defaultParams: Record<string, any> = {}
      Object.entries(strategy.parameters).forEach(([key, param]: [string, any]) => {
        defaultParams[key] = param.default
      })
      setStrategyParameters(defaultParams)
    }
  }

  const handleParameterChange = (paramName: string, value: any) => {
    setStrategyParameters(prev => ({
      ...prev,
      [paramName]: value
    }))
  }

  const runBacktest = async () => {
    if (!selectedStrategy) {
      setError('Please select a strategy')
      return
    }

    setIsRunning(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/backtesting/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          strategyName: selectedStrategy,
          strategyParameters,
          ...backtestConfig
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setResult(data.result)
      } else {
        setError(data.error || 'Backtest failed')
      }
    } catch (error) {
      setError('Failed to run backtest')
      console.error('Backtest error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const renderPerformanceMetrics = () => {
    if (!result) return null

    const metrics = result.metrics
    
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="retro-container animate-glow">
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon sx={{ fontSize: 40, color: 'var(--retro-green)', mb: 1 }} />
              <Typography variant="h6" sx={{ color: 'var(--retro-cyan)', fontSize: '10px' }}>
                Total Return
              </Typography>
              <Typography variant="h4" sx={{ color: 'var(--retro-yellow)', fontSize: '14px' }}>
                {(metrics.totalReturn * 100).toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card className="retro-container animate-glow">
            <CardContent sx={{ textAlign: 'center' }}>
              <SpeedIcon sx={{ fontSize: 40, color: 'var(--retro-pink)', mb: 1 }} />
              <Typography variant="h6" sx={{ color: 'var(--retro-cyan)', fontSize: '10px' }}>
                Sharpe Ratio
              </Typography>
              <Typography variant="h4" sx={{ color: 'var(--retro-yellow)', fontSize: '14px' }}>
                {metrics.sharpeRatio.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card className="retro-container animate-glow">
            <CardContent sx={{ textAlign: 'center' }}>
              <TimelineIcon sx={{ fontSize: 40, color: 'var(--retro-red)', mb: 1 }} />
              <Typography variant="h6" sx={{ color: 'var(--retro-cyan)', fontSize: '10px' }}>
                Max Drawdown
              </Typography>
              <Typography variant="h4" sx={{ color: 'var(--retro-yellow)', fontSize: '14px' }}>
                {(metrics.maxDrawdown * 100).toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card className="retro-container animate-glow">
            <CardContent sx={{ textAlign: 'center' }}>
              <AssessmentIcon sx={{ fontSize: 40, color: 'var(--retro-purple)', mb: 1 }} />
              <Typography variant="h6" sx={{ color: 'var(--retro-cyan)', fontSize: '10px' }}>
                Win Rate
              </Typography>
              <Typography variant="h4" sx={{ color: 'var(--retro-yellow)', fontSize: '14px' }}>
                {(metrics.winRate * 100).toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )
  }

  const renderEquityCurve = () => {
    if (!result) return null

    const chartData = {
      labels: result.equityCurve.map(point => new Date(point.timestamp).toLocaleDateString()),
      datasets: [
        {
          label: 'Portfolio Value',
          data: result.equityCurve.map(point => point.value),
          borderColor: 'rgb(0, 245, 255)',
          backgroundColor: 'rgba(0, 245, 255, 0.1)',
          fill: true,
          tension: 0.1
        }
      ]
    }

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: 'rgb(0, 245, 255)',
            font: {
              family: "'Press Start 2P', monospace",
              size: 8
            }
          }
        },
        title: {
          display: true,
          text: 'Equity Curve',
          color: 'rgb(255, 255, 0)',
          font: {
            family: "'Press Start 2P', monospace",
            size: 10
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: 'rgb(255, 255, 255)',
            font: {
              family: "'Press Start 2P', monospace",
              size: 6
            }
          },
          grid: {
            color: 'rgba(0, 245, 255, 0.3)'
          }
        },
        y: {
          ticks: {
            color: 'rgb(255, 255, 255)',
            font: {
              family: "'Press Start 2P', monospace",
              size: 6
            }
          },
          grid: {
            color: 'rgba(0, 245, 255, 0.3)'
          }
        }
      }
    }

    return (
      <Paper className="retro-container" sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" sx={{ color: 'var(--retro-yellow)', mb: 2, fontSize: '12px' }}>
          &gt; EQUITY_CURVE &lt;
        </Typography>
        <Box sx={{ height: '400px' }}>
          <Line data={chartData} options={options} />
        </Box>
      </Paper>
    )
  }

  const renderTradesTable = () => {
    if (!result || !result.trades.length) return null

    return (
      <Paper className="retro-container" sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" sx={{ color: 'var(--retro-yellow)', mb: 2, fontSize: '12px' }}>
          &gt; TRADE_HISTORY &lt;
        </Typography>
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'var(--retro-cyan)', fontSize: '8px' }}>Date</TableCell>
                <TableCell sx={{ color: 'var(--retro-cyan)', fontSize: '8px' }}>Symbol</TableCell>
                <TableCell sx={{ color: 'var(--retro-cyan)', fontSize: '8px' }}>Side</TableCell>
                <TableCell sx={{ color: 'var(--retro-cyan)', fontSize: '8px' }}>Quantity</TableCell>
                <TableCell sx={{ color: 'var(--retro-cyan)', fontSize: '8px' }}>Price</TableCell>
                <TableCell sx={{ color: 'var(--retro-cyan)', fontSize: '8px' }}>Commission</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.trades.slice(-20).map((trade, index) => (
                <TableRow key={index}>
                  <TableCell sx={{ color: 'var(--retro-white)', fontSize: '7px' }}>
                    {new Date(trade.timestamp).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={{ color: 'var(--retro-white)', fontSize: '7px' }}>
                    {trade.symbol}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={trade.side.toUpperCase()} 
                      size="small"
                      sx={{ 
                        backgroundColor: trade.side === 'buy' ? 'var(--retro-green)' : 'var(--retro-red)',
                        color: 'var(--retro-black)',
                        fontSize: '6px',
                        height: '16px'
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'var(--retro-white)', fontSize: '7px' }}>
                    {trade.quantity.toFixed(4)}
                  </TableCell>
                  <TableCell sx={{ color: 'var(--retro-white)', fontSize: '7px' }}>
                    ${trade.price.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ color: 'var(--retro-white)', fontSize: '7px' }}>
                    ${trade.commission.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    )
  }

  return (
    <div className="px-2 sm:px-3 md:px-4 lg:px-5 py-4 min-h-screen w-full retro-scanline">

      <Grid container spacing={3}>
        {/* Configuration Panel */}
        <Grid item xs={12} md={4}>
          <Paper className="retro-container" sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ color: 'var(--retro-cyan)', mb: 2, fontSize: '12px' }}>
              &gt; CONFIGURATION &lt;
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel sx={{ color: 'var(--retro-cyan)', fontSize: '10px' }}>Strategy</InputLabel>
              <Select
                value={selectedStrategy}
                onChange={(e) => handleStrategyChange(e.target.value)}
                size="small"
              >
                {strategies.map((strategy) => (
                  <MenuItem key={strategy.name} value={strategy.name}>
                    {strategy.displayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedStrategy && (
              <Accordion sx={{ mb: 2, backgroundColor: 'var(--retro-dark-blue)' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'var(--retro-cyan)' }} />}>
                  <Typography sx={{ color: 'var(--retro-green)', fontSize: '10px' }}>
                    Strategy Parameters
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {Object.entries(strategies.find(s => s.name === selectedStrategy)?.parameters || {}).map(([key, param]: [string, any]) => (
                    <TextField
                      key={key}
                      label={param.description || key}
                      type={param.type === 'number' ? 'number' : 'text'}
                      value={strategyParameters[key] || param.default}
                      onChange={(e) => handleParameterChange(key, param.type === 'number' ? Number(e.target.value) : e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ mb: 1 }}
                    />
                  ))}
                </AccordionDetails>
              </Accordion>
            )}

            <TextField
              label="Symbols (comma-separated)"
              value={backtestConfig.symbols.join(', ')}
              onChange={(e) => setBacktestConfig(prev => ({ 
                ...prev, 
                symbols: e.target.value.split(',').map(s => s.trim()) 
              }))}
              fullWidth
              size="small"
              sx={{ mb: 2 }}
            />

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={backtestConfig.startDate}
                  onChange={(e) => setBacktestConfig(prev => ({ ...prev, startDate: e.target.value }))}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="End Date"
                  type="date"
                  value={backtestConfig.endDate}
                  onChange={(e) => setBacktestConfig(prev => ({ ...prev, endDate: e.target.value }))}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <TextField
              label="Initial Capital"
              type="number"
              value={backtestConfig.initialCapital}
              onChange={(e) => setBacktestConfig(prev => ({ ...prev, initialCapital: Number(e.target.value) }))}
              fullWidth
              size="small"
              sx={{ mb: 2 }}
            />

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <TextField
                  label="Commission"
                  type="number"
                  value={backtestConfig.commission}
                  onChange={(e) => setBacktestConfig(prev => ({ ...prev, commission: Number(e.target.value) }))}
                  fullWidth
                  size="small"
                  inputProps={{ step: 0.0001 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Slippage"
                  type="number"
                  value={backtestConfig.slippage}
                  onChange={(e) => setBacktestConfig(prev => ({ ...prev, slippage: Number(e.target.value) }))}
                  fullWidth
                  size="small"
                  inputProps={{ step: 0.0001 }}
                />
              </Grid>
            </Grid>

            <FormControlLabel
              control={
                <Switch
                  checked={backtestConfig.useAdvancedExecution}
                  onChange={(e) => setBacktestConfig(prev => ({ ...prev, useAdvancedExecution: e.target.checked }))}
                />
              }
              label={<Typography sx={{ fontSize: '8px' }}>Advanced Execution</Typography>}
              sx={{ mb: 2 }}
            />

            <Button
              variant="contained"
              onClick={runBacktest}
              disabled={isRunning || !selectedStrategy}
              startIcon={<PlayIcon />}
              fullWidth
              sx={{ 
                backgroundColor: 'var(--retro-green)',
                color: 'var(--retro-black)',
                '&:hover': {
                  backgroundColor: 'var(--retro-cyan)'
                }
              }}
            >
              {isRunning ? 'RUNNING...' : 'RUN BACKTEST'}
            </Button>

            {isRunning && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress 
                  sx={{ 
                    backgroundColor: 'var(--retro-dark-blue)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: 'var(--retro-green)'
                    }
                  }} 
                />
                <Typography sx={{ color: 'var(--retro-cyan)', fontSize: '8px', mt: 1 }}>
                  Processing backtest...
                </Typography>
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2, fontSize: '8px' }}>
                {error}
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Results Panel */}
        <Grid item xs={12} md={8}>
          {result ? (
            <>
              {renderPerformanceMetrics()}
              {renderEquityCurve()}
              {renderTradesTable()}
            </>
          ) : (
            <Paper className="retro-container" sx={{ p: 4, textAlign: 'center', minHeight: '300px' }}>
              <Typography sx={{ color: 'var(--retro-gray)', fontSize: '10px' }}>
                Configure and run a backtest to see results
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </div>
  )
}