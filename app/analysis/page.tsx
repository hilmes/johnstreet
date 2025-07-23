'use client'

import React, { useState } from 'react'
import {
  Typography,
  Card,
  CardContent,
  Grid,
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Paper,
  Divider,
  IconButton,
  LinearProgress
} from '@mui/material'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import RefreshIcon from '@mui/icons-material/Refresh'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import AssessmentIcon from '@mui/icons-material/Assessment'

const performanceData = [
  { date: '2024-01-01', portfolio: 100000, benchmark: 100000 },
  { date: '2024-01-08', portfolio: 102500, benchmark: 101000 },
  { date: '2024-01-15', portfolio: 105000, benchmark: 102000 },
  { date: '2024-01-22', portfolio: 103000, benchmark: 101500 },
  { date: '2024-01-29', portfolio: 107000, benchmark: 103000 },
  { date: '2024-02-05', portfolio: 110000, benchmark: 104000 },
  { date: '2024-02-12', portfolio: 108000, benchmark: 103500 },
]

const winLossData = [
  { name: 'Wins', value: 68, color: '#00CC66' },
  { name: 'Losses', value: 32, color: '#FF4F00' },
]

const strategyPerformance = [
  { strategy: 'RSI Oversold', winRate: 72, pnl: 5420 },
  { strategy: 'MACD Cross', winRate: 65, pnl: 3210 },
  { strategy: 'Support Break', winRate: 58, pnl: 1890 },
  { strategy: 'Trend Follow', winRate: 81, pnl: 8750 },
]

export default function AnalysisPage() {
  const [timeframe, setTimeframe] = useState('1M')
  const [selectedStrategy, setSelectedStrategy] = useState('all')

  const metrics = {
    totalReturn: 10.5,
    sharpeRatio: 1.8,
    maxDrawdown: 8.2,
    winRate: 68,
    avgWin: 245,
    avgLoss: 125,
    profitFactor: 2.1,
    totalTrades: 148
  }

  return (
    <div className="px-2 sm:px-3 md:px-4 lg:px-5 py-4 min-h-screen w-full">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'primary.main' }}>
          Performance Analysis
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Timeframe</InputLabel>
            <Select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} label="Timeframe">
              <MenuItem value="1D">1 Day</MenuItem>
              <MenuItem value="1W">1 Week</MenuItem>
              <MenuItem value="1M">1 Month</MenuItem>
              <MenuItem value="3M">3 Months</MenuItem>
              <MenuItem value="1Y">1 Year</MenuItem>
            </Select>
          </FormControl>
          <IconButton color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Total Return</Typography>
            <Typography variant="h5" sx={{ color: metrics.totalReturn > 0 ? 'success.main' : 'error.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {metrics.totalReturn > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
              {metrics.totalReturn}%
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Win Rate</Typography>
            <Typography variant="h5">{metrics.winRate}%</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Profit Factor</Typography>
            <Typography variant="h5">{metrics.profitFactor}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Total Trades</Typography>
            <Typography variant="h5">{metrics.totalTrades}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Portfolio Performance Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Portfolio Performance</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="portfolio" stroke="#6563FF" strokeWidth={2} name="Portfolio" />
                  <Line type="monotone" dataKey="benchmark" stroke="#90caf9" strokeWidth={2} name="Benchmark" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Win/Loss Distribution */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Win/Loss Distribution</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={winLossData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {winLossData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Strategy Performance */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Strategy Performance</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={strategyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="strategy" />
                  <YAxis yAxisId="left" orientation="left" stroke="#6563FF" />
                  <YAxis yAxisId="right" orientation="right" stroke="#00CC66" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="winRate" fill="#6563FF" name="Win Rate (%)" />
                  <Bar yAxisId="right" dataKey="pnl" fill="#00CC66" name="P&L ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Risk Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Risk Metrics</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Sharpe Ratio</Typography>
                  <Typography fontWeight="bold">{metrics.sharpeRatio}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Max Drawdown</Typography>
                  <Typography fontWeight="bold" color="error.main">-{metrics.maxDrawdown}%</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Average Win</Typography>
                  <Typography fontWeight="bold" color="success.main">${metrics.avgWin}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Average Loss</Typography>
                  <Typography fontWeight="bold" color="error.main">-${metrics.avgLoss}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Trade Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Trade Statistics</Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Long vs Short</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Box sx={{ flex: 0.7, bgcolor: 'primary.main', height: 8, borderRadius: 1 }} />
                  <Typography variant="body2">70%</Typography>
                  <Box sx={{ flex: 0.3, bgcolor: 'secondary.main', height: 8, borderRadius: 1 }} />
                  <Typography variant="body2">30%</Typography>
                </Box>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Average Trade Duration</Typography>
                <Typography variant="h6">4h 32m</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Best Trade</Typography>
                <Typography variant="h6" color="success.main">+$1,845</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  )
}