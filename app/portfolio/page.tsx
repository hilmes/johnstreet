'use client'

import React from 'react'
import {
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { AppProvider, useAppContext } from '@/contexts/AppContext'
import { PortfolioBalance } from '@/components/widgets/PortfolioBalance'
import { TradeAnalysis } from '@/components/widgets/TradeAnalysis'

function PortfolioContent() {
  const { state } = useAppContext()

  const positions = [
    { asset: 'BTC', amount: 0.5, value: 20000, pnl: 1234.56, pnlPercent: 6.2 },
    { asset: 'ETH', amount: 5.2, value: 8320, pnl: -234.56, pnlPercent: -2.8 },
    { asset: 'SOL', amount: 100, value: 2500, pnl: 456.78, pnlPercent: 18.3 },
  ]

  return (
    <div className="px-2 sm:px-3 md:px-4 lg:px-5 py-4 min-h-screen w-full">
      <Typography variant="h4" gutterBottom>
        Portfolio Overview
      </Typography>

      <Grid container spacing={3}>
        {/* Portfolio Summary */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Portfolio Balance
            </Typography>
            <PortfolioBalance />
          </Paper>
        </Grid>

        {/* Trade Analysis */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Trade Analysis
            </Typography>
            <TradeAnalysis />
          </Paper>
        </Grid>

        {/* Current Positions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Current Positions
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Asset</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Value (USD)</TableCell>
                    <TableCell align="right">P&L</TableCell>
                    <TableCell align="right">P&L %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {positions.map((position) => (
                    <TableRow key={position.asset}>
                      <TableCell>{position.asset}</TableCell>
                      <TableCell align="right">{position.amount}</TableCell>
                      <TableCell align="right">${position.value.toLocaleString()}</TableCell>
                      <TableCell 
                        align="right"
                        sx={{ color: position.pnl >= 0 ? 'success.main' : 'error.main' }}
                      >
                        ${position.pnl.toFixed(2)}
                      </TableCell>
                      <TableCell 
                        align="right"
                        sx={{ color: position.pnl >= 0 ? 'success.main' : 'error.main' }}
                      >
                        {position.pnlPercent.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </div>
  )
}

export default function PortfolioPage() {
  return (
    <AppProvider>
      <PortfolioContent />
    </AppProvider>
  )
}