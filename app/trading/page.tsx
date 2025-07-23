'use client'

import React from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
} from '@mui/material'
import { AppProvider, useAppContext } from '@/contexts/AppContext'
import { OrderForm } from '@/components/widgets/OrderForm'
import { OpenOrders } from '@/components/widgets/OpenOrders'
import { OrderHistory } from '@/components/widgets/OrderHistory'
import { OrderBook } from '@/components/widgets/OrderBook'
import { CandlestickChart } from '@/components/widgets/CandlestickChart'
import TradingTicker from '@/components/TradingTicker'

function TradingContent() {
  const { state } = useAppContext()
  const { selectedPair } = state

  return (
    <div className="px-2 sm:px-3 md:px-4 lg:px-5 py-4 min-h-screen w-full">
      <Typography variant="h4" gutterBottom>
        Trading Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Trading Ticker */}
        <Grid item xs={12}>
          <TradingTicker />
        </Grid>

        {/* Price Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {selectedPair} Chart
            </Typography>
            <Box sx={{ height: 400 }}>
              <CandlestickChart symbol={selectedPair} data={[]} />
            </Box>
          </Paper>
        </Grid>

        {/* Order Book */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Order Book
            </Typography>
            <OrderBook symbol={selectedPair} />
          </Paper>
        </Grid>

        {/* Order Form */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Place Order
            </Typography>
            <OrderForm symbol={selectedPair} />
          </Paper>
        </Grid>

        {/* Open Orders */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Open Orders
            </Typography>
            <OpenOrders />
          </Paper>
        </Grid>

        {/* Order History */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Order History
            </Typography>
            <OrderHistory />
          </Paper>
        </Grid>
      </Grid>
    </div>
  )
}

export default function TradingPage() {
  return (
    <AppProvider>
      <TradingContent />
    </AppProvider>
  )
}