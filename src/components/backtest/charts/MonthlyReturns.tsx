import React from 'react';
import { Box, useTheme } from '@mui/material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { BacktestResult } from '../../../services/strategy/Backtester';

interface MonthlyReturnsProps {
  data: BacktestResult;
}

export const MonthlyReturns: React.FC<MonthlyReturnsProps> = ({ data }) => {
  const theme = useTheme();

  // Calculate monthly returns
  const monthlyData = React.useMemo(() => {
    const returns = new Map<string, number>();
    
    data.timestamps.forEach((timestamp, index) => {
      if (index === 0) return;
      
      const date = new Date(timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthReturn = ((data.equity[index] - data.equity[index - 1]) / data.equity[index - 1]) * 100;
      
      returns.set(monthKey, (returns.get(monthKey) || 0) + monthReturn);
    });

    return Array.from(returns.entries()).map(([month, value]) => ({
      month,
      return: value,
    }));
  }, [data]);

  return (
    <Box sx={{ height: 400 }}>
      <ResponsiveContainer>
        <BarChart data={monthlyData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={(value) => `${value.toFixed(2)}%`} />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Return']}
          />
          <Bar
            dataKey="return"
            fill={theme.palette.primary.main}
            stroke={theme.palette.primary.dark}
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}; 