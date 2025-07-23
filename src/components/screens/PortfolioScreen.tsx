import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAppContext } from '../../context/AppContext';
import { PortfolioBalance } from '../';

interface AssetHolding {
  symbol: string;
  amount: number;
  averagePrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercentage: number;
  allocation: number;
}

const PortfolioScreen: React.FC = () => {
  const { services } = useAppContext();
  const [holdings, setHoldings] = React.useState<AssetHolding[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date());

  // Mock data for demonstration
  React.useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        // In a real implementation, this would fetch from your trading service
        const mockHoldings: AssetHolding[] = [
          {
            symbol: 'BTC',
            amount: 1.5,
            averagePrice: 42000,
            currentPrice: 45000,
            value: 67500,
            pnl: 4500,
            pnlPercentage: 7.14,
            allocation: 60,
          },
          {
            symbol: 'ETH',
            amount: 15,
            averagePrice: 2600,
            currentPrice: 2800,
            value: 42000,
            pnl: 3000,
            pnlPercentage: 7.69,
            allocation: 40,
          },
        ];
        setHoldings(mockHoldings);
        setLoading(false);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to fetch portfolio:', error);
        setLoading(false);
      }
    };

    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [services]);

  const totalValue = React.useMemo(() => {
    return holdings.reduce((sum, holding) => sum + holding.value, 0);
  }, [holdings]);

  const totalPnL = React.useMemo(() => {
    return holdings.reduce((sum, holding) => sum + holding.pnl, 0);
  }, [holdings]);

  const totalPnLPercentage = React.useMemo(() => {
    const totalCost = holdings.reduce(
      (sum, holding) => sum + holding.amount * holding.averagePrice,
      0
    );
    return totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
  }, [holdings, totalPnL]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatNumber = (num: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h4" gutterBottom>
            Portfolio
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Typography>
            <Tooltip title="Refresh">
              <IconButton onClick={() => setLastUpdated(new Date())}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Grid>

        {/* Portfolio Overview Cards */}
        <Grid item xs={12}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Total Value
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(totalValue)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Total P&L
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      color: totalPnL >= 0 ? 'success.main' : 'error.main',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    {totalPnL >= 0 ? (
                      <TrendingUpIcon />
                    ) : (
                      <TrendingDownIcon />
                    )}
                    {formatCurrency(totalPnL)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Return
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      color: totalPnLPercentage >= 0 ? 'success.main' : 'error.main',
                    }}
                  >
                    {formatNumber(totalPnLPercentage)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Portfolio Balance Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Portfolio Balance History
            </Typography>
            <Box sx={{ height: 300 }}>
              <PortfolioBalance />
            </Box>
          </Paper>
        </Grid>

        {/* Holdings Table */}
        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Asset</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">Average Price</TableCell>
                  <TableCell align="right">Current Price</TableCell>
                  <TableCell align="right">Value</TableCell>
                  <TableCell align="right">P&L</TableCell>
                  <TableCell align="right">P&L %</TableCell>
                  <TableCell align="right">Allocation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {holdings.map((holding) => (
                  <TableRow key={holding.symbol}>
                    <TableCell>
                      <Typography variant="body1" component="span">
                        {holding.symbol}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(holding.amount, 8)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(holding.averagePrice)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(holding.currentPrice)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(holding.value)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: holding.pnl >= 0 ? 'success.main' : 'error.main',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {holding.pnl >= 0 ? (
                          <TrendingUpIcon fontSize="small" sx={{ mr: 1 }} />
                        ) : (
                          <TrendingDownIcon fontSize="small" sx={{ mr: 1 }} />
                        )}
                        {formatCurrency(holding.pnl)}
                      </Box>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: holding.pnlPercentage >= 0 ? 'success.main' : 'error.main',
                      }}
                    >
                      {formatNumber(holding.pnlPercentage)}%
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(holding.allocation)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PortfolioScreen; 