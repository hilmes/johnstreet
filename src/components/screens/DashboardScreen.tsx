import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  useTheme,
  Card,
  CardContent,
} from '@mui/material';
import { useAppContext } from '../../context/AppContext';
import {
  MarketDataWidget,
  OrderBook,
  TradeHistory,
  PortfolioBalance,
  CandlestickChart,
  TechnicalIndicators,
} from '../';

const DashboardScreen: React.FC = () => {
  const { state } = useAppContext();
  const { selectedPair } = state;

  // Mock data for candlestick chart
  const mockChartData = React.useMemo(() => {
    const now = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      const basePrice = 40000;
      const volatility = 1000;
      const open = basePrice + (Math.random() - 0.5) * volatility;
      const close = basePrice + (Math.random() - 0.5) * volatility;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      return {
        date,
        open,
        high,
        low,
        close,
        volume: Math.random() * 1000,
      };
    });
  }, []);

  return (
    <Box>
      <Grid container spacing={2}>
        {/* Market Overview */}
        <Grid item xs={12}>
          <Typography variant="h4">
            Market Overview
          </Typography>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography color="textSecondary">
                24h Volume
              </Typography>
              <Typography variant="h5">$1.2M</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography color="textSecondary">
                Active Positions
              </Typography>
              <Typography variant="h5">3</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography color="textSecondary">
                Total P&L
              </Typography>
              <Typography variant="h5" color="success.main">
                +$5,234.21
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography color="textSecondary">
                Portfolio Value
              </Typography>
              <Typography variant="h5">$25,432.10</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Chart Section */}
        <Grid item xs={12} md={8}>
          <Paper>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6">
                {selectedPair} Price Chart
              </Typography>
              <Box sx={{ height: '400px', mt: 2 }}>
                <CandlestickChart symbol={selectedPair} data={mockChartData} />
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Order Book & Trade History */}
        <Grid item xs={12} md={4}>
          <Paper>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6">
                Order Book
              </Typography>
              <OrderBook symbol={selectedPair} />
              <Box sx={{ height: 1, bgcolor: 'divider', my: 2 }} />
              <Typography variant="h6">
                Recent Trades
              </Typography>
              <TradeHistory symbol={selectedPair} maxTrades={10} />
            </Box>
          </Paper>
        </Grid>

        {/* Technical Analysis */}
        <Grid item xs={12} md={6}>
          <Paper>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6">
                Technical Indicators
              </Typography>
              <TechnicalIndicators symbol={selectedPair} />
            </Box>
          </Paper>
        </Grid>

        {/* Portfolio Summary */}
        <Grid item xs={12} md={6}>
          <Paper>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6">
                Portfolio Balance
              </Typography>
              <PortfolioBalance />
            </Box>
          </Paper>
        </Grid>

        {/* Market Data */}
        <Grid item xs={12}>
          <Paper>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6">
                Market Data
              </Typography>
              <MarketDataWidget symbol={selectedPair} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardScreen; 