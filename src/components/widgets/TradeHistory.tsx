import React from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Trade } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';

interface TradeHistoryProps {
  symbol: string;
  maxTrades?: number;
}

const TradeHistory: React.FC<TradeHistoryProps> = ({ 
  symbol, 
  maxTrades = 50 
}) => {
  const [trades, setTrades] = React.useState<Trade[]>([]);
  const [loading, setLoading] = React.useState(true);

  useWebSocket({
    symbol,
    onTrade: (newTrade: Trade) => {
      setTrades(prev => {
        const updated = [newTrade, ...prev].slice(0, maxTrades);
        return updated;
      });
      setLoading(false);
    },
  });

  if (loading) return <LoadingSpinner />;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Trade History
      </Typography>
      <TableContainer sx={{ maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Side</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trades.map((trade) => (
              <TableRow key={trade.id}>
                <TableCell>
                  {new Date(trade.timestamp).toLocaleTimeString()}
                </TableCell>
                <TableCell
                  sx={{
                    color: trade.side === 'buy' ? 'success.main' : 'error.main',
                  }}
                >
                  {trade.side.toUpperCase()}
                </TableCell>
                <TableCell align="right">
                  ${trade.executedPrice.toLocaleString()}
                </TableCell>
                <TableCell align="right">
                  {trade.amount.toFixed(8)}
                </TableCell>
                <TableCell align="right">
                  ${(trade.executedPrice * trade.amount).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default TradeHistory; 