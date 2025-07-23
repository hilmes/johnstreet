import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  TablePagination,
} from '@mui/material';
import { useAppContext } from '../../context/AppContext';
import { TradeWithPnL } from '../../types/trading';
import LoadingSpinner from '../common/LoadingSpinner';

interface OrderHistoryProps {
  symbol?: string;
  days?: number;
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ symbol, days = 7 }) => {
  const { services } = useAppContext();
  const [trades, setTrades] = React.useState<TradeWithPnL[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  React.useEffect(() => {
    const fetchHistory = async () => {
      try {
        // In a real implementation, this would fetch from your trading service
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - days);
        const history = await services.kraken.getTradesHistory();
        // Transform the Kraken trade history format to our TradeWithPnL format
        const transformedTrades = Object.entries(history.trades).map(([id, trade]) => ({
          id,
          symbol: trade.pair,
          type: trade.ordertype as 'market' | 'limit',
          side: trade.type as 'buy' | 'sell',
          amount: parseFloat(trade.vol),
          executedPrice: parseFloat(trade.price),
          fee: parseFloat(trade.fee),
          timestamp: trade.time * 1000, // Convert to milliseconds
          pnl: parseFloat(trade.net),
          roi: (parseFloat(trade.net) / (parseFloat(trade.price) * parseFloat(trade.vol))) * 100,
          holdingTime: 0, // This information might not be available from Kraken
        }));
        
        // Filter by symbol if provided
        const filteredTrades = symbol 
          ? transformedTrades.filter(t => t.symbol === symbol)
          : transformedTrades;

        setTrades(filteredTrades);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch trade history:', error);
        setLoading(false);
      }
    };

    fetchHistory();
  }, [symbol, days, services.kraken]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) return <LoadingSpinner />;

  if (trades.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="textSecondary">
          No trade history
        </Typography>
      </Box>
    );
  }

  return (
    <>
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
              <TableCell align="right">Fee</TableCell>
              <TableCell align="right">P&L</TableCell>
              <TableCell align="right">ROI</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trades
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell>
                    {new Date(trade.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>{trade.symbol}</TableCell>
                  <TableCell>{trade.type}</TableCell>
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
                    {trade.amount.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    ${trade.fee.toLocaleString()}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: trade.pnl >= 0 ? 'success.main' : 'error.main',
                    }}
                  >
                    ${trade.pnl.toLocaleString()}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: trade.roi >= 0 ? 'success.main' : 'error.main',
                    }}
                  >
                    {trade.roi.toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={trades.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </>
  );
};

export default OrderHistory; 