import React, { useState } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Grid,
} from '@mui/material';
import { useAppContext } from '../../context/AppContext';

interface OrderFormProps {
  symbol: string;
}

type OrderType = 'market' | 'limit';
type OrderSide = 'buy' | 'sell';

const OrderForm: React.FC<OrderFormProps> = ({ symbol }) => {
  const { services } = useAppContext();
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [side, setSide] = useState<OrderSide>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Implement order submission logic
      const order = {
        symbol,
        type: orderType,
        side,
        amount: parseFloat(amount),
        price: orderType === 'limit' ? parseFloat(price) : undefined,
      };
      
      // Submit order through KrakenService
      // await services.kraken.submitOrder(order);
      
      // Clear form
      setAmount('');
      setPrice('');
    } catch (error) {
      console.error('Order submission failed:', error);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Place Order
      </Typography>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Order Type</InputLabel>
              <Select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as OrderType)}
                label="Order Type"
              >
                <MenuItem value="market">Market</MenuItem>
                <MenuItem value="limit">Limit</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Side</InputLabel>
              <Select
                value={side}
                onChange={(e) => setSide(e.target.value as OrderSide)}
                label="Side"
              >
                <MenuItem value="buy">Buy</MenuItem>
                <MenuItem value="sell">Sell</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              InputProps={{ inputProps: { min: 0, step: 0.00000001 } }}
            />
          </Grid>
          {orderType === 'limit' && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="contained"
              color={side === 'buy' ? 'success' : 'error'}
              type="submit"
            >
              {side === 'buy' ? 'Buy' : 'Sell'} {symbol}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default OrderForm; 