'use client'

import React from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material'
import {
  TrendingUp as ProfitIcon,
  TrendingDown as LossIcon,
  ShowChart as ChartIcon,
  Speed as SpeedIcon,
  Security as RiskIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material'
import { BacktestResult } from '@/lib/backtest/StrategyExecutor'
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
  Filler,
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

interface BacktestResultsProps {
  results: BacktestResult
  isLoading?: boolean
}

export default function BacktestResults({ results, isLoading }: BacktestResultsProps) {
  const [activeTab, setActiveTab] = React.useState(0)

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Running Backtest...</Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Analyzing {results?.strategy || 'strategy'} performance...
        </Typography>
      </Paper>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return (value * 100).toFixed(2) + '%'
  }

  const equityChartData = {
    labels: results.equityCurve.map(p => p.timestamp.toLocaleDateString()),
    datasets: [
      {
        label: 'Equity',
        data: results.equityCurve.map(p => p.equity),
        borderColor: results.totalReturn > 0 ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)',
        backgroundColor: results.totalReturn > 0 ? 'rgba(75, 192, 192, 0.1)' : 'rgba(255, 99, 132, 0.1)',
        fill: true,
        tension: 0.1,
      },
    ],
  }

  const drawdownChartData = {
    labels: results.equityCurve.map(p => p.timestamp.toLocaleDateString()),
    datasets: [
      {
        label: 'Drawdown',
        data: results.equityCurve.map(p => -p.drawdown * 100),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        fill: true,
        tension: 0.1,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        position: 'right' as const,
      },
    },
  }

  const performanceMetrics = [
    {
      label: 'Total Return',
      value: formatCurrency(results.totalReturn),
      percent: formatPercent(results.totalReturnPercent),
      icon: results.totalReturn > 0 ? <ProfitIcon /> : <LossIcon />,
      color: results.totalReturn > 0 ? '#4caf50' : '#f44336',
    },
    {
      label: 'Win Rate',
      value: formatPercent(results.winRate),
      percent: `${results.winningTrades}/${results.totalTrades}`,
      icon: <ChartIcon />,
      color: results.winRate > 0.5 ? '#4caf50' : '#ff9800',
    },
    {
      label: 'Sharpe Ratio',
      value: results.sharpeRatio.toFixed(2),
      percent: results.sharpeRatio > 1 ? 'Good' : 'Poor',
      icon: <SpeedIcon />,
      color: results.sharpeRatio > 1 ? '#4caf50' : '#ff9800',
    },
    {
      label: 'Max Drawdown',
      value: formatPercent(results.maxDrawdownPercent),
      percent: 'Risk',
      icon: <RiskIcon />,
      color: results.maxDrawdownPercent < 0.2 ? '#4caf50' : '#f44336',
    },
  ]

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {performanceMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ color: metric.color }}>{metric.icon}</Box>
                  <Chip label={metric.percent} size="small" />
                </Box>
                <Typography variant="h5" sx={{ color: metric.color, fontWeight: 'bold' }}>
                  {metric.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {metric.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Detailed Results */}
      <Paper>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Overview" />
          <Tab label="Trades" />
          <Tab label="Charts" />
          <Tab label="Metrics" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Performance Summary</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>Strategy</TableCell>
                        <TableCell align="right">{results.strategy}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Period</TableCell>
                        <TableCell align="right">
                          {results.startDate.toLocaleDateString()} - {results.endDate.toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Initial Balance</TableCell>
                        <TableCell align="right">{formatCurrency(results.initialBalance)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Final Balance</TableCell>
                        <TableCell align="right">{formatCurrency(results.finalBalance)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Total Trades</TableCell>
                        <TableCell align="right">{results.totalTrades}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Profit Factor</TableCell>
                        <TableCell align="right">{results.profitFactor.toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Risk Metrics</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>Annualized Return</TableCell>
                        <TableCell align="right">{formatPercent(results.metrics.annualizedReturn)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Volatility</TableCell>
                        <TableCell align="right">{formatPercent(results.metrics.volatility)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Calmar Ratio</TableCell>
                        <TableCell align="right">{results.metrics.calmarRatio.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Sortino Ratio</TableCell>
                        <TableCell align="right">{results.metrics.sortinoRatio.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Average Win</TableCell>
                        <TableCell align="right">{formatCurrency(results.avgWin)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Average Loss</TableCell>
                        <TableCell align="right">{formatCurrency(results.avgLoss)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          )}

          {activeTab === 1 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Entry Time</TableCell>
                    <TableCell>Exit Time</TableCell>
                    <TableCell align="right">Entry Price</TableCell>
                    <TableCell align="right">Exit Price</TableCell>
                    <TableCell align="right">Profit</TableCell>
                    <TableCell align="right">Return</TableCell>
                    <TableCell>Exit Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.trades.slice(0, 20).map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell>{trade.entryTime.toLocaleString()}</TableCell>
                      <TableCell>{trade.exitTime.toLocaleString()}</TableCell>
                      <TableCell align="right">{formatCurrency(trade.entryPrice)}</TableCell>
                      <TableCell align="right">{formatCurrency(trade.exitPrice)}</TableCell>
                      <TableCell align="right" sx={{ color: trade.profit > 0 ? '#4caf50' : '#f44336' }}>
                        {formatCurrency(trade.profit)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: trade.profit > 0 ? '#4caf50' : '#f44336' }}>
                        {formatPercent(trade.profitPercent)}
                      </TableCell>
                      <TableCell>{trade.exitReason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {activeTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Equity Curve</Typography>
                <Box sx={{ height: 300 }}>
                  <Line data={equityChartData} options={chartOptions} />
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Drawdown</Typography>
                <Box sx={{ height: 200 }}>
                  <Line data={drawdownChartData} options={chartOptions} />
                </Box>
              </Grid>
            </Grid>
          )}

          {activeTab === 3 && (
            <Grid container spacing={2}>
              {Object.entries(results.metrics).map(([key, value]) => (
                <Grid item xs={12} sm={6} md={3} key={key}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Typography>
                      <Typography variant="h6">
                        {typeof value === 'number' ? 
                          (key.includes('Return') || key.includes('volatility') ? 
                            formatPercent(value) : 
                            value.toFixed(2)
                          ) : value}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Paper>
    </Box>
  )
}