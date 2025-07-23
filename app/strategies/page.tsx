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
import ViewListIcon from '@mui/icons-material/ViewList'
import TableChartIcon from '@mui/icons-material/TableChart'
import ExpandableStrategyList from '@/components/ExpandableStrategyList'

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
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null)
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
    setSelectedStrategy(strategy)
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

  const handleDelete = (strategyId: string) => {
    setStrategies(prev => prev.filter(s => s.id !== strategyId))
  }

  const handleSave = () => {
    // Save strategy
    console.log('Save strategy:', formData)
    setOpenDialog(false)
    setSelectedStrategy(null)
  }

  const getStatusColor = (active: boolean) => {
    return active ? 'success' : 'default'
  }

  const filteredStrategies = tabValue === 0 
    ? strategies 
    : tabValue === 1 
    ? strategies.filter(s => s.active)
    : strategies.filter(s => !s.active)

  return (
    <div className="px-2 sm:px-3 md:px-4 lg:px-5 py-4 min-h-screen w-full">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'primary.main' }}>
          Trading Strategies
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
            {selectedStrategy ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}