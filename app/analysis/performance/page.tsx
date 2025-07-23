'use client'

import React from 'react'
import { Typography, Paper, Box } from '@mui/material'
import { AutoGraph } from '@mui/icons-material'

export default function PerformancePage() {
  return (
    <div className="px-2 sm:px-3 md:px-4 lg:px-5 py-4 min-h-screen w-full">
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AutoGraph sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4" sx={{ color: 'primary.main' }}>
          Performance Analysis
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Performance analysis page coming soon. This will include:
        </Typography>
        <Box component="ul" sx={{ mt: 2, color: 'text.secondary' }}>
          <li>Strategy performance metrics</li>
          <li>P&L charts and graphs</li>
          <li>Risk analysis</li>
          <li>Trade statistics</li>
          <li>Historical performance comparison</li>
        </Box>
      </Paper>
    </div>
  )
}