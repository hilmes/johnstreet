'use client'

import React from 'react'
import { Box } from '@mui/material'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

interface CandlestickChartProps {
  symbol: string
  data: any[]
}

export function CandlestickChart({ symbol, data }: CandlestickChartProps) {
  // Transform data for candlestick visualization
  const chartData = data.map((item, index) => ({
    ...item,
    range: [item.low, item.high],
    body: [Math.min(item.open, item.close), Math.max(item.open, item.close)],
    isGreen: item.close > item.open,
    dateStr: item.date.toLocaleDateString()
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <Box sx={{ bgcolor: 'background.paper', p: 1, border: 1, borderColor: 'divider' }}>
          <Box sx={{ fontSize: '0.75rem' }}>
            <div>Date: {data.dateStr}</div>
            <div>Open: ${data.open.toFixed(2)}</div>
            <div>High: ${data.high.toFixed(2)}</div>
            <div>Low: ${data.low.toFixed(2)}</div>
            <div>Close: ${data.close.toFixed(2)}</div>
            <div>Volume: {data.volume.toFixed(2)}</div>
          </Box>
        </Box>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="dateStr" />
        <YAxis domain={['dataMin - 100', 'dataMax + 100']} />
        <Tooltip content={<CustomTooltip />} />
        
        {/* Wicks */}
        <Bar dataKey="range" fill="#666">
          {chartData.map((entry, index) => (
            <Cell key={`wick-${index}`} fill={entry.isGreen ? '#00CC66' : '#FF4F00'} />
          ))}
        </Bar>
        
        {/* Bodies */}
        <Bar dataKey="body" fill="#333">
          {chartData.map((entry, index) => (
            <Cell key={`body-${index}`} fill={entry.isGreen ? '#00CC66' : '#FF4F00'} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  )
}