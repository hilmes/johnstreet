import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { useAppContext } from '../../context/AppContext';
import { MarketDataWidget } from '../';

interface PairData {
  symbol: string;
  lastPrice: number;
  priceChange24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  isFavorite: boolean;
}

const PairsScreen: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [pairs, setPairs] = React.useState<PairData[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Mock data for demonstration
  React.useEffect(() => {
    const mockPairs: PairData[] = [
      {
        symbol: 'BTC/USD',
        lastPrice: 45000,
        priceChange24h: 2.5,
        volume24h: 1200000000,
        high24h: 46000,
        low24h: 44000,
        isFavorite: true,
      },
      {
        symbol: 'ETH/USD',
        lastPrice: 2800,
        priceChange24h: -1.2,
        volume24h: 800000000,
        high24h: 2900,
        low24h: 2750,
        isFavorite: false,
      },
      // Add more mock pairs as needed
    ];
    setPairs(mockPairs);
    setLoading(false);
  }, []);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const toggleFavorite = (symbol: string) => {
    setPairs(prevPairs =>
      prevPairs.map(pair =>
        pair.symbol === symbol
          ? { ...pair, isFavorite: !pair.isFavorite }
          : pair
      )
    );
  };

  const handlePairClick = (symbol: string) => {
    dispatch({ type: 'SET_SELECTED_PAIR', payload: symbol });
  };

  const filteredPairs = pairs.filter(pair =>
    pair.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    return `$${volume.toFixed(2)}`;
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Typography variant="h4" gutterBottom>
            Trading Pairs
          </Typography>
        </Grid>

        {/* Market Overview for Selected Pair */}
        <Grid item xs={12}>
          <MarketDataWidget symbol={state.selectedPair} />
        </Grid>

        {/* Search and Filters */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search trading pairs..."
              value={searchQuery}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Paper>
        </Grid>

        {/* Pairs Table */}
        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Pair</TableCell>
                  <TableCell align="right">Last Price</TableCell>
                  <TableCell align="right">24h Change</TableCell>
                  <TableCell align="right">24h High</TableCell>
                  <TableCell align="right">24h Low</TableCell>
                  <TableCell align="right">24h Volume</TableCell>
                  <TableCell align="center">Favorite</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPairs.map((pair) => (
                  <TableRow
                    key={pair.symbol}
                    hover
                    onClick={() => handlePairClick(pair.symbol)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography variant="body1" component="span">
                        {pair.symbol}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      ${formatNumber(pair.lastPrice)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color:
                          pair.priceChange24h >= 0
                            ? 'success.main'
                            : 'error.main',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {pair.priceChange24h >= 0 ? (
                          <TrendingUpIcon fontSize="small" sx={{ mr: 1 }} />
                        ) : (
                          <TrendingDownIcon fontSize="small" sx={{ mr: 1 }} />
                        )}
                        {formatNumber(Math.abs(pair.priceChange24h))}%
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      ${formatNumber(pair.high24h)}
                    </TableCell>
                    <TableCell align="right">
                      ${formatNumber(pair.low24h)}
                    </TableCell>
                    <TableCell align="right">
                      {formatVolume(pair.volume24h)}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(pair.symbol);
                        }}
                        color="primary"
                      >
                        {pair.isFavorite ? <StarIcon /> : <StarBorderIcon />}
                      </IconButton>
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

export default PairsScreen; 