import React from 'react';
import { Box, useTheme } from '@mui/material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { BacktestResult } from '../../../services/strategy/Backtester';

interface EquityChartProps {
  data: BacktestResult;
}

export const EquityChart: React.FC<EquityChartProps> = ({ data }) => {
  const theme = useTheme();

  const chartData = data.timestamps.map((timestamp, index) => ({
    timestamp,
    equity: data.equity[index],
  }));

  return (
    <Box sx={{ height: 400 }}>
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
          />
          <YAxis
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip
            labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Equity']}
          />
          <Line
            type="monotone"
            dataKey="equity"
            stroke={theme.palette.primary.main}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}; 