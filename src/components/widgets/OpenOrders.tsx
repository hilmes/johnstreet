import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Typography,
  Box,
} from '@mui/material';
import { Cancel as CancelIcon } from '@mui/icons-material';
import { useAppContext } from '../../context/AppContext';
import { Order } from '../../types/trading';
import LoadingSpinner from '../common/LoadingSpinner';

interface OpenOrdersProps {
  symbol?: string;
}

const OpenOrders: React.FC<OpenOrdersProps> = ({ symbol }) => {
  const { services } = useAppContext();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await services.kraken.getOpenOrders();
        // Transform Kraken order format to our Order format
        const transformedOrders = Object.entries(response.open).map(([id, order]) => ({
          id,
          symbol: order.descr.pair,
          type: order.descr.ordertype as 'market' | 'limit',
          side: order.descr.type as 'buy' | 'sell',
          amount: parseFloat(order.vol),
          price: parseFloat(order.descr.price),
          status: order.status as 'pending' | 'filled' | 'cancelled' | 'rejected',
          timestamp: order.opentm * 1000, // Convert to milliseconds
        }));

        // Filter by symbol if provided
        const filteredOrders = symbol
          ? transformedOrders.filter(o => o.symbol === symbol)
          : transformedOrders;

        setOrders(filteredOrders);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch open orders:', error);
        setLoading(false);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [symbol, services.kraken]);

  const handleCancelOrder = async (orderId: string) => {
    try {
      await services.kraken.cancelOrder(orderId);
      // Remove the cancelled order from the local state
      setOrders(prev => prev.filter(order => order.id !== orderId));
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (orders.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="textSecondary">
          No open orders
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Time</TableCell>
            <TableCell>Pair</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Side</TableCell>
            <TableCell align="right">Price</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell align="right">Filled</TableCell>
            <TableCell align="right">Status</TableCell>
            <TableCell align="center">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                {new Date(order.timestamp!).toLocaleTimeString()}
              </TableCell>
              <TableCell>{order.symbol}</TableCell>
              <TableCell>{order.type}</TableCell>
              <TableCell
                sx={{
                  color: order.side === 'buy' ? 'success.main' : 'error.main',
                }}
              >
                {order.side.toUpperCase()}
              </TableCell>
              <TableCell align="right">
                ${order.price?.toLocaleString() ?? 'Market'}
              </TableCell>
              <TableCell align="right">
                {order.amount.toLocaleString()}
              </TableCell>
              <TableCell align="right">
                {/* Add filled amount when available in the Order type */}
                0%
              </TableCell>
              <TableCell align="right">
                {order.status?.toUpperCase()}
              </TableCell>
              <TableCell align="center">
                <Tooltip title="Cancel Order">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => order.id && handleCancelOrder(order.id)}
                  >
                    <CancelIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default OpenOrders; 