'use client'

import React, { useState } from 'react'
import {
  Typography,
  Card,
  CardContent,
  Grid,
  Box,
  Button,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import SettingsIcon from '@mui/icons-material/Settings'
import ShowChartIcon from '@mui/icons-material/ShowChart'

interface Strategy {
  id: string
  name: string
  type: string
  status: 'active' | 'paused' | 'testing'
  pnl: number
  winRate: number
  trades: number
  description: string
}

const strategies: Strategy[] = [
  {
    id: '1',
    name: 'Mean Reversion Strategy',
    type: 'Mean Reversion',
    status: 'active',
    pnl: 12840,
    winRate: 78,
    trades: 156,
    description: 'Profits from price movements reverting to historical average using z-score analysis'
  },
  {
    id: '2',
    name: 'Momentum Trading Strategy',
    type: 'Momentum',
    status: 'active',
    pnl: 18760,
    winRate: 73,
    trades: 89,
    description: 'Capitalizes on trend continuation with dynamic position sizing and trailing stops'
  },
  {
    id: '3',
    name: 'Statistical Arbitrage',
    type: 'Market Neutral',
    status: 'active',
    pnl: 9435,
    winRate: 68,
    trades: 234,
    description: 'Exploits price inefficiencies between cointegrated cryptocurrency pairs'
  },
  {
    id: '4',
    name: 'Market Making Strategy',
    type: 'Market Making',
    status: 'active',
    pnl: 15220,
    winRate: 85,
    trades: 1247,
    description: 'Provides liquidity by continuously quoting bid-ask spreads with inventory management'
  },
  {
    id: '5',
    name: 'Bollinger Bands Strategy',
    type: 'Mean Reversion',
    status: 'testing',
    pnl: 4680,
    winRate: 71,
    trades: 67,
    description: 'Uses volatility bands to identify overbought/oversold conditions for entry signals'
  },
  {
    id: '6',
    name: 'RSI Divergence Strategy',
    type: 'Technical Analysis',
    status: 'paused',
    pnl: 3120,
    winRate: 64,
    trades: 42,
    description: 'Identifies divergences between price and RSI momentum for trend reversal detection'
  },
  {
    id: '7',
    name: 'VWAP Trading Strategy',
    type: 'Volume Analysis',
    status: 'active',
    pnl: 7290,
    winRate: 69,
    trades: 98,
    description: 'Trades based on price deviations from Volume Weighted Average Price benchmark'
  },
  {
    id: '8',
    name: 'Pairs Trading Strategy',
    type: 'Market Neutral',
    status: 'testing',
    pnl: 5560,
    winRate: 76,
    trades: 58,
    description: 'Market-neutral strategy trading relative performance between correlated assets'
  },
  {
    id: '9',
    name: 'Grid Trading Strategy',
    type: 'Grid Trading',
    status: 'active',
    pnl: 6840,
    winRate: 82,
    trades: 312,
    description: 'Places multiple limit orders at different price levels creating a grid pattern'
  }
]


export default function StrategiesPage() {
  const [tabValue, setTabValue] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'Trend Following',
    description: '',
    entryCondition: '',
    exitCondition: '',
    stopLoss: '2',
    takeProfit: '5',
    positionSize: '1000'
  })

  const handleStatusToggle = (strategyId: string) => {
    // Toggle strategy status
    console.log('Toggle status for strategy:', strategyId)
  }

  const handleEdit = (strategy: Strategy) => {
    setSelectedStrategy(strategy)
    setFormData({
      name: strategy.name,
      type: strategy.type,
      description: strategy.description,
      entryCondition: '',
      exitCondition: '',
      stopLoss: '2',
      takeProfit: '5',
      positionSize: '1000'
    })
    setOpenDialog(true)
  }

  const handleDelete = (strategyId: string) => {
    // Delete strategy
    console.log('Delete strategy:', strategyId)
  }

  const handleSave = () => {
    // Save strategy
    console.log('Save strategy:', formData)
    setOpenDialog(false)
    setSelectedStrategy(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'paused': return 'warning'
      case 'testing': return 'info'
      default: return 'default'
    }
  }

  return (
    <div className="px-2 sm:px-3 md:px-4 lg:px-5 py-4 min-h-screen w-full">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'primary.main' }}>
          Trading Strategies
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          New Strategy
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="All Strategies" />
          <Tab label="Active" />
          <Tab label="Testing" />
          <Tab label="Performance" />
        </Tabs>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Strategy Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">P&L</TableCell>
              <TableCell align="right">Win Rate</TableCell>
              <TableCell align="right">Trades</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {strategies.map((strategy) => (
              <TableRow key={strategy.id}>
                <TableCell>
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      {strategy.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {strategy.description}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={strategy.type} size="small" />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={strategy.status} 
                    color={getStatusColor(strategy.status)} 
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography 
                    color={strategy.pnl > 0 ? 'success.main' : 'error.main'}
                    fontWeight="medium"
                  >
                    ${strategy.pnl.toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">{strategy.winRate}%</TableCell>
                <TableCell align="right">{strategy.trades}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleStatusToggle(strategy.id)}
                      color={strategy.status === 'active' ? 'error' : 'success'}
                    >
                      {strategy.status === 'active' ? <PauseIcon /> : <PlayArrowIcon />}
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


      {/* Strategy Form Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedStrategy ? 'Edit Strategy' : 'Create New Strategy'}
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
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  label="Strategy Type"
                >
                  <MenuItem value="Mean Reversion">Mean Reversion</MenuItem>
                  <MenuItem value="Momentum">Momentum</MenuItem>
                  <MenuItem value="Market Neutral">Market Neutral</MenuItem>
                  <MenuItem value="Market Making">Market Making</MenuItem>
                  <MenuItem value="Technical Analysis">Technical Analysis</MenuItem>
                  <MenuItem value="Volume Analysis">Volume Analysis</MenuItem>
                  <MenuItem value="Grid Trading">Grid Trading</MenuItem>
                  <MenuItem value="Statistical Arbitrage">Statistical Arbitrage</MenuItem>
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
            {selectedStrategy ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}