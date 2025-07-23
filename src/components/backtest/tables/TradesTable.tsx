import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from '@mui/material';
import { BacktestTrade } from '../../../services/strategy/Backtester';

interface TradesTableProps {
  trades: BacktestTrade[];
}

export const TradesTable: React.FC<TradesTableProps> = ({ trades }) => {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  return (
    <Paper>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Pair</TableCell>
              <TableCell>Side</TableCell>
              <TableCell>Entry Time</TableCell>
              <TableCell>Exit Time</TableCell>
              <TableCell align="right">Entry Price</TableCell>
              <TableCell align="right">Exit Price</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell align="right">P&L</TableCell>
              <TableCell align="right">ROI</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trades
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((trade) => (
                <TableRow
                  key={trade.id}
                  sx={{
                    backgroundColor: trade.pnl >= 0 ? 
                      'success.main' : 'error.main',
                    opacity: 0.1
                  }}
                >
                  <TableCell>{trade.pair}</TableCell>
                  <TableCell>{trade.side}</TableCell>
                  <TableCell>
                    {new Date(trade.entryTime).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {new Date(trade.exitTime).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    ${trade.entryPrice.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    ${trade.exitPrice.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    {trade.quantity.toFixed(8)}
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
                      color: trade.pnlPercent >= 0 ? 'success.main' : 'error.main',
                    }}
                  >
                    {trade.pnlPercent.toFixed(2)}%
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
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
      />
    </Paper>
  );
}; 