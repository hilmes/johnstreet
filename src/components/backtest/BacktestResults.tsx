import React from 'react';
import { Box, Paper, Grid, Typography, Tabs, Tab } from '@mui/material';
import { BacktestResult } from '../../services/strategy/Backtester';
import { EquityChart } from './charts/EquityChart';
import { DrawdownChart } from './charts/DrawdownChart';
import { TradesTable } from './tables/TradesTable';
import { MetricsPanel } from './panels/MetricsPanel';
import { MonthlyReturns } from './charts/MonthlyReturns';
import { TradeDistribution } from './charts/TradeDistribution';

interface BacktestResultsProps {
  results: BacktestResult;
}

export const BacktestResults: React.FC<BacktestResultsProps> = ({ results }) => {
  const [selectedTab, setSelectedTab] = React.useState(0);

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        {/* Summary Metrics */}
        <Grid item xs={12}>
          <MetricsPanel metrics={results.metrics} />
        </Grid>

        {/* Charts */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Tabs
              value={selectedTab}
              onChange={(_, newValue) => setSelectedTab(newValue)}
              sx={{ mb: 2 }}
            >
              <Tab label="Equity" />
              <Tab label="Drawdown" />
              <Tab label="Monthly Returns" />
              <Tab label="Trade Distribution" />
            </Tabs>

            {selectedTab === 0 && <EquityChart data={results} />}
            {selectedTab === 1 && <DrawdownChart data={results} />}
            {selectedTab === 2 && <MonthlyReturns data={results} />}
            {selectedTab === 3 && <TradeDistribution trades={results.trades} />}
          </Paper>
        </Grid>

        {/* Trades Table */}
        <Grid item xs={12}>
          <TradesTable trades={results.trades} />
        </Grid>
      </Grid>
    </Box>
  );
}; 