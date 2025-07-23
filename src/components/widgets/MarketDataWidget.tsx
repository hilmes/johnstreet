import React from 'react';
import { Paper, Typography, Grid, Box } from '@mui/material';
import { useWebSocket } from '../../hooks/useWebSocket';
import LoadingSpinner from '../common/LoadingSpinner';

interface MarketDataWidgetProps {
  symbol: string;
}

const MarketDataWidget: React.FC<MarketDataWidgetProps> = ({ symbol }) => {
  const [marketData, setMarketData] = React.useState({
    price: 0,
    volume: 0,
    high24h: 0,
    low24h: 0,
    change24h: 0,
  });

  const [loading, setLoading] = React.useState(true);

  useWebSocket({
    symbol,
    onTicker: (data) => {
      setMarketData(data);
      setLoading(false);
    },
  });

  if (loading) return <LoadingSpinner />;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {symbol} Market Data
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Box>
            <Typography variant="body2" color="textSecondary">
              Price
            </Typography>
            <Typography variant="h6">
              ${marketData.price.toLocaleString()}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box>
            <Typography variant="body2" color="textSecondary">
              24h Change
            </Typography>
            <Typography
              variant="h6"
              color={marketData.change24h >= 0 ? 'success.main' : 'error.main'}
            >
              {marketData.change24h.toFixed(2)}%
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box>
            <Typography variant="body2" color="textSecondary">
              24h High
            </Typography>
            <Typography variant="h6">
              ${marketData.high24h.toLocaleString()}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box>
            <Typography variant="body2" color="textSecondary">
              24h Low
            </Typography>
            <Typography variant="h6">
              ${marketData.low24h.toLocaleString()}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default MarketDataWidget; 