import React from 'react';
import {
  Paper,
  Typography,
  Grid,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from '@mui/material';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { TradeAnalysis as ITradeAnalysis, TradeWithPnL } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';

interface TradeAnalysisProps {
  symbol: string;
}

interface ChartDataPoint {
  timestamp: number;
  pnl: number;
  cumulative: number;
}

const TradeAnalysis: React.FC<TradeAnalysisProps> = ({ symbol }) => {
  const [trades, setTrades] = React.useState<TradeWithPnL[]>([]);
  const [analysis, setAnalysis] = React.useState<ITradeAnalysis>({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    averageWin: 0,
    averageLoss: 0,
    profitFactor: 0,
    largestWin: 0,
    largestLoss: 0,
    averageHoldingTime: 0,
    totalVolume: 0,
    totalFees: 0,
    netPnL: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  React.useEffect(() => {
    const loadTrades = async () => {
      try {
        // Implement real trade history fetching
        const dummyTrades = Array.from({ length: 50 }, (_, i) => ({
          id: `trade-${i}`,
          symbol,
          type: (Math.random() > 0.5 ? 'market' : 'limit') as 'market' | 'limit',
          side: (Math.random() > 0.5 ? 'buy' : 'sell') as 'buy' | 'sell',
          amount: Math.random() * 1,
          executedPrice: 40000 + Math.random() * 2000,
          fee: Math.random() * 10,
          timestamp: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
          pnl: Math.random() * 1000 * (Math.random() > 0.5 ? 1 : -1),
          roi: Math.random() * 10 * (Math.random() > 0.5 ? 1 : -1),
          holdingTime: Math.random() * 24 * 60 * 60 * 1000,
        })).sort((a, b) => b.timestamp - a.timestamp) as TradeWithPnL[];

        setTrades(dummyTrades);
        analyzeTrades(dummyTrades);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch trade history:', error);
      }
    };

    loadTrades();
  }, [symbol]);

  const analyzeTrades = (trades: TradeWithPnL[]) => {
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);

    const analysis: ITradeAnalysis = {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / trades.length) * 100,
      averageWin: winningTrades.reduce((acc, t) => acc + t.pnl, 0) / winningTrades.length,
      averageLoss: losingTrades.reduce((acc, t) => acc + t.pnl, 0) / losingTrades.length,
      profitFactor: Math.abs(winningTrades.reduce((acc, t) => acc + t.pnl, 0) / 
        losingTrades.reduce((acc, t) => acc + t.pnl, 0)),
      largestWin: Math.max(...trades.map(t => t.pnl)),
      largestLoss: Math.min(...trades.map(t => t.pnl)),
      averageHoldingTime: trades.reduce((acc, t) => acc + t.holdingTime, 0) / trades.length,
      totalVolume: trades.reduce((acc, t) => acc + t.amount * t.executedPrice, 0),
      totalFees: trades.reduce((acc, t) => acc + t.fee, 0),
      netPnL: trades.reduce((acc, t) => acc + t.pnl, 0),
    };

    setAnalysis(analysis);
  };

  const renderMetrics = () => (
    <Grid container spacing={2}>
      <Grid item xs={6} md={3}>
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="body2" color="textSecondary">Win Rate</Typography>
          <Typography variant="h6" color="primary">
            {analysis.winRate.toFixed(1)}%
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {analysis.winningTrades}/{analysis.totalTrades} trades
          </Typography>
        </Box>
      </Grid>
      <Grid item xs={6} md={3}>
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="body2" color="textSecondary">Net P&L</Typography>
          <Typography
            variant="h6"
            color={analysis.netPnL >= 0 ? 'success.main' : 'error.main'}
          >
            ${analysis.netPnL.toLocaleString()}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Fees: ${analysis.totalFees.toLocaleString()}
          </Typography>
        </Box>
      </Grid>
      <Grid item xs={6} md={3}>
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="body2" color="textSecondary">Profit Factor</Typography>
          <Typography variant="h6" color="primary">
            {analysis.profitFactor.toFixed(2)}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Avg Win: ${analysis.averageWin.toFixed(2)}
          </Typography>
        </Box>
      </Grid>
      <Grid item xs={6} md={3}>
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="body2" color="textSecondary">Volume</Typography>
          <Typography variant="h6" color="primary">
            ${analysis.totalVolume.toLocaleString()}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {analysis.totalTrades} trades
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );

  const renderPnLChart = () => {
    const chartData: ChartDataPoint[] = trades.map(trade => ({
      timestamp: trade.timestamp,
      pnl: trade.pnl,
      cumulative: trades
        .filter(t => t.timestamp <= trade.timestamp)
        .reduce((acc, t) => acc + t.pnl, 0),
    }));

    const getBarFill = (entry: ChartDataPoint) => {
      return entry.pnl >= 0 ? '#4caf50' : '#f44336';
    };

    return (
      <Box sx={{ height: 300, mt: 2 }}>
        <ResponsiveContainer>
          <ComposedChart data={chartData}>
            <XAxis
              dataKey="timestamp"
              tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
            />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip
              labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
              formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="pnl"
              fill="#4caf50"
              name="Trade P&L"
              isAnimationActive={false}
              onMouseEnter={(data) => {
                const fill = getBarFill(data);
                if (data.element) {
                  data.element.style.fill = fill;
                }
              }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              stroke="#2196f3"
              name="Cumulative P&L"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Trade Analysis
      </Typography>

      {renderMetrics()}
      {renderPnLChart()}

      <TableContainer sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Side</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Amount</TableCell>
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
                    {trade.amount.toFixed(8)}
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

export default TradeAnalysis; 