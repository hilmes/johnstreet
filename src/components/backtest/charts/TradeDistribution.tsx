import React from 'react';
import { Box, useTheme } from '@mui/material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { BacktestTrade } from '../../../services/strategy/Backtester';

interface TradeDistributionProps {
  trades: BacktestTrade[];
}

export const TradeDistribution: React.FC<TradeDistributionProps> = ({ trades }) => {
  const theme = useTheme();

  // Calculate trade distribution
  const distributionData = React.useMemo(() => {
    const ranges = new Map<string, number>();
    const rangeSize = 1; // 1% range size

    trades.forEach(trade => {
      const returnPercent = trade.pnlPercent;
      const rangeStart = Math.floor(returnPercent / rangeSize) * rangeSize;
      const rangeKey = `${rangeStart}% to ${rangeStart + rangeSize}%`;
      ranges.set(rangeKey, (ranges.get(rangeKey) || 0) + 1);
    });

    return Array.from(ranges.entries())
      .map(([range, count]) => ({
        range,
        count,
      }))
      .sort((a, b) => {
        const aStart = parseFloat(a.range.split('%')[0]);
        const bStart = parseFloat(b.range.split('%')[0]);
        return aStart - bStart;
      });
  }, [trades]);

  return (
    <Box sx={{ height: 400 }}>
      <ResponsiveContainer>
        <BarChart data={distributionData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="range" />
          <YAxis />
          <Tooltip />
          <Bar
            dataKey="count"
            fill={theme.palette.primary.main}
            stroke={theme.palette.primary.dark}
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}; 