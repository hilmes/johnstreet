import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { BacktestResult } from '../../../services/strategy/Backtester';

interface MetricsPanelProps {
  metrics: BacktestResult['metrics'];
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics }) => {
  const MetricBox = ({ label, value, format = 'number' }: { 
    label: string; 
    value: number; 
    format?: 'number' | 'percent' | 'currency' 
  }) => {
    const formatValue = (val: number) => {
      switch (format) {
        case 'percent':
          return `${val.toFixed(2)}%`;
        case 'currency':
          return `$${val.toLocaleString()}`;
        default:
          return val.toLocaleString();
      }
    };

    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="textSecondary">
          {label}
        </Typography>
        <Typography variant="h6">
          {formatValue(value)}
        </Typography>
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <MetricBox 
            label="Total Return" 
            value={metrics.totalReturnPercent} 
            format="percent" 
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricBox 
            label="Win Rate" 
            value={metrics.winRate} 
            format="percent" 
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricBox 
            label="Profit Factor" 
            value={metrics.profitFactor} 
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricBox 
            label="Max Drawdown" 
            value={metrics.maxDrawdownPercent} 
            format="percent" 
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricBox 
            label="Sharpe Ratio" 
            value={metrics.sharpeRatio} 
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricBox 
            label="Total Trades" 
            value={metrics.totalTrades} 
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricBox 
            label="Average Win" 
            value={metrics.averageWin} 
            format="currency" 
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricBox 
            label="Average Loss" 
            value={Math.abs(metrics.averageLoss)} 
            format="currency" 
          />
        </Grid>
      </Grid>
    </Paper>
  );
}; 