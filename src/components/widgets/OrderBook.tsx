import React from 'react';
import { Paper, Typography, Box, Grid } from '@mui/material';
import { useWebSocket } from '../../hooks/useWebSocket';
import LoadingSpinner from '../common/LoadingSpinner';
import { OrderBookData } from '../../types';

interface OrderBookProps {
  symbol: string;
}

const OrderBook: React.FC<OrderBookProps> = ({ symbol }) => {
  const [orderBook, setOrderBook] = React.useState<OrderBookData>({
    bids: [],
    asks: [],
  });
  const [loading, setLoading] = React.useState(true);

  useWebSocket({
    symbol,
    onOrderBook: (data: OrderBookData) => {
      setOrderBook(data);
      setLoading(false);
    },
  });

  if (loading) return <LoadingSpinner />;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Order Book
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Typography variant="subtitle2" color="success.main">
            Bids
          </Typography>
          {orderBook.bids.slice(0, 10).map(([price, amount], index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                py: 0.5,
              }}
            >
              <Typography color="success.main">
                {price.toLocaleString()}
              </Typography>
              <Typography>{amount.toFixed(8)}</Typography>
            </Box>
          ))}
        </Grid>
        <Grid item xs={6}>
          <Typography variant="subtitle2" color="error.main">
            Asks
          </Typography>
          {orderBook.asks.slice(0, 10).map(([price, amount], index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                py: 0.5,
              }}
            >
              <Typography color="error.main">
                {price.toLocaleString()}
              </Typography>
              <Typography>{amount.toFixed(8)}</Typography>
            </Box>
          ))}
        </Grid>
      </Grid>
    </Paper>
  );
};

export default OrderBook; 