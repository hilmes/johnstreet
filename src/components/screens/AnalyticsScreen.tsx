import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { useAppContext } from '../../context/AppContext';
import {
  CandlestickChart,
  PortfolioBalance,
  TechnicalIndicators,
} from '../';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface PerformanceMetric {
  label: string;
  value: number;
  change: number;
  format: 'currency' | 'percentage' | 'number';
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const AnalyticsScreen: React.FC = () => {
  const { state } = useAppContext();
  const [timeRange, setTimeRange] = React.useState('7d');
  const [tabValue, setTabValue] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  // Mock performance metrics
  const performanceMetrics: PerformanceMetric[] = [
    {
      label: 'Total P&L',
      value: 15420.50,
      change: 12.5,
      format: 'currency',
    },
    {
      label: 'Win Rate',
      value: 68.5,
      change: 5.2,
      format: 'percentage',
    },
    {
      label: 'Total Trades',
      value: 156,
      change: 23,
      format: 'number',
    },
    {
      label: 'Average Trade',
      value: 98.85,
      change: -2.3,
      format: 'currency',
    },
  ];

  const formatMetricValue = (metric: PerformanceMetric) => {
    switch (metric.format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(metric.value);
      case 'percentage':
        return `${metric.value.toFixed(1)}%`;
      case 'number':
        return metric.value.toLocaleString();
      default:
        return metric.value.toString();
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleTimeRangeChange = (event: any) => {
    setTimeRange(event.target.value);
  };

  // Mock chart data
  const mockChartData = React.useMemo(() => {
    const now = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      const basePrice = 40000;
      const volatility = 1000;
      const open = basePrice + (Math.random() - 0.5) * volatility;
      const close = basePrice + (Math.random() - 0.5) * volatility;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      return {
        date,
        open,
        high,
        low,
        close,
        volume: Math.random() * 1000,
      };
    });
  }, []);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h4" gutterBottom>
            Analytics
          </Typography>
          <FormControl sx={{ minWidth: 120 }}>
            <Select
              value={timeRange}
              onChange={handleTimeRangeChange}
              size="small"
              startAdornment={<DateRangeIcon sx={{ mr: 1 }} />}
            >
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
              <MenuItem value="1y">Last Year</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12}>
          <Grid container spacing={3}>
            {performanceMetrics.map((metric, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      {metric.label}
                    </Typography>
                    <Typography variant="h4" component="div">
                      {formatMetricValue(metric)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      {metric.change >= 0 ? (
                        <TrendingUpIcon color="success" fontSize="small" />
                      ) : (
                        <TrendingDownIcon color="error" fontSize="small" />
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          color: metric.change >= 0 ? 'success.main' : 'error.main',
                          ml: 0.5,
                        }}
                      >
                        {metric.change >= 0 ? '+' : ''}
                        {metric.format === 'percentage'
                          ? `${metric.change.toFixed(1)}%`
                          : metric.change}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Charts and Analysis */}
        <Grid item xs={12}>
          <Paper>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Performance" />
              <Tab label="Trade Analysis" />
              <Tab label="Technical" />
            </Tabs>
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ height: 400 }}>
                <PortfolioBalance />
              </Box>
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ height: 400 }}>
                <CandlestickChart
                  symbol={state.selectedPair}
                  data={mockChartData}
                />
              </Box>
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ height: 400 }}>
                <TechnicalIndicators symbol={state.selectedPair} />
              </Box>
            </TabPanel>
          </Paper>
        </Grid>

        {/* Trade Statistics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Trade Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Profitable Trades
                </Typography>
                <Typography variant="h6">107 (68.5%)</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Loss-Making Trades
                </Typography>
                <Typography variant="h6">49 (31.5%)</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Average Win
                </Typography>
                <Typography variant="h6">$245.32</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Average Loss
                </Typography>
                <Typography variant="h6">$98.45</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Largest Win
                </Typography>
                <Typography variant="h6">$1,245.00</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Largest Loss
                </Typography>
                <Typography variant="h6">$432.10</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Strategy Performance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Strategy Performance
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Best Strategy
                </Typography>
                <Typography variant="h6">Grid Trading</Typography>
                <Typography variant="body2" color="success.main">
                  +18.5% ROI
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Most Active Strategy
                </Typography>
                <Typography variant="h6">DCA</Typography>
                <Typography variant="body2">
                  86 trades
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Best Pair
                </Typography>
                <Typography variant="h6">BTC/USD</Typography>
                <Typography variant="body2" color="success.main">
                  +22.3% ROI
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Most Traded Pair
                </Typography>
                <Typography variant="h6">ETH/USD</Typography>
                <Typography variant="body2">
                  92 trades
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsScreen; 