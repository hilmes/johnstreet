import React from 'react';
import { Box, useTheme } from '@mui/material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { BacktestResult } from '../../../services/strategy/Backtester';

interface DrawdownChartProps {
  data: BacktestResult;
}

export const DrawdownChart: React.FC<DrawdownChartProps> = ({ data }) => {
  const theme = useTheme();

  const chartData = data.timestamps.map((timestamp, index) => ({
    timestamp,
    drawdown: data.drawdown[index] * 100, // Convert to percentage
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
            tickFormatter={(value) => `${value.toFixed(2)}%`}
          />
          <Tooltip
            labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
          />
          <Line
            type="monotone"
            dataKey="drawdown"
            stroke={theme.palette.error.main}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}; 