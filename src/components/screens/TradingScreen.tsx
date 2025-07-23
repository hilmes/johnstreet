import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Divider,
  useTheme,
} from '@mui/material';
import { useAppContext } from '../../context/AppContext';
import {
  OrderForm,
  OrderBook,
  TradeHistory,
  CandlestickChart,
  TechnicalIndicators,
  MarketDataWidget,
  OpenOrders,
  OrderHistory,
} from '../';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`trading-tabpanel-${index}`}
      aria-labelledby={`trading-tab-${index}`}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const TradingScreen: React.FC = () => {
  const { state } = useAppContext();
  const { selectedPair } = state;
  const theme = useTheme();
  const [tabValue, setTabValue] = React.useState(0);

  // Mock data for candlestick chart
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ flexGrow: 1, p: 4, backgroundColor: '#F9F9F9', minHeight: '100vh' }}>
      <Grid container spacing={4}>
        {/* Header */}
        <Grid item xs={12}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ 
              fontWeight: 700, 
              color: '#222222',
              fontSize: '2rem',
              mb: 2 
            }}>
              Trading
            </Typography>
            <Typography variant="body1" sx={{ color: '#666666' }}>
              Monitor markets, place orders, and track your trading activity
            </Typography>
          </Box>
        </Grid>

        {/* Market Data Overview */}
        <Grid item xs={12}>
          <Paper sx={{ 
            p: 3, 
            mb: 4,
            backgroundColor: '#FFFFFF',
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}>
            <MarketDataWidget symbol={selectedPair} />
          </Paper>
        </Grid>

        {/* Main Trading Area */}
        <Grid item xs={12} container spacing={4}>
          {/* Left Column - Chart and Orders */}
          <Grid item xs={12} md={8}>
            {/* Chart */}
            <Paper sx={{ 
              mb: 4, 
              height: '500px',
              backgroundColor: '#FFFFFF',
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}>
              <Box sx={{ 
                borderBottom: 1, 
                borderColor: 'rgba(0, 0, 0, 0.08)',
                backgroundColor: '#FFFFFF' 
              }}>
                <Tabs 
                  value={tabValue} 
                  onChange={handleTabChange}
                  sx={{
                    '& .MuiTabs-indicator': {
                      backgroundColor: '#6563FF',
                      height: 3,
                      borderRadius: '3px 3px 0 0'
                    }
                  }}
                >
                  <Tab 
                    label="Chart" 
                    sx={{ 
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#666666',
                      '&.Mui-selected': { color: '#6563FF' }
                    }} 
                  />
                  <Tab 
                    label="Depth" 
                    sx={{ 
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#666666',
                      '&.Mui-selected': { color: '#6563FF' }
                    }} 
                  />
                  <Tab 
                    label="Technical" 
                    sx={{ 
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#666666',
                      '&.Mui-selected': { color: '#6563FF' }
                    }} 
                  />
                </Tabs>
              </Box>
              <TabPanel value={tabValue} index={0}>
                <CandlestickChart symbol={selectedPair} data={mockChartData} />
              </TabPanel>
              <TabPanel value={tabValue} index={1}>
                <OrderBook symbol={selectedPair} />
              </TabPanel>
              <TabPanel value={tabValue} index={2}>
                <TechnicalIndicators symbol={selectedPair} />
              </TabPanel>
            </Paper>

            {/* Open Orders */}
            <Paper sx={{ 
              p: 3, 
              mb: 4,
              backgroundColor: '#FFFFFF',
              borderRadius: 3,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600,
                  color: '#222222'
                }}>
                  Open Orders
                </Typography>
                <Typography variant="subtitle2" sx={{ 
                  ml: 1,
                  color: '#666666'
                }}>
                  ({selectedPair})
                </Typography>
              </Box>
              <OpenOrders symbol={selectedPair} />
            </Paper>

            {/* Order History */}
            <Paper sx={{ 
              p: 3,
              backgroundColor: '#FFFFFF',
              borderRadius: 3,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600,
                  color: '#222222'
                }}>
                  Order History
                </Typography>
                <Typography variant="subtitle2" sx={{ 
                  ml: 1,
                  color: '#666666'
                }}>
                  (Last 7 days)
                </Typography>
              </Box>
              <OrderHistory symbol={selectedPair} days={7} />
            </Paper>
          </Grid>

          {/* Right Column - Order Form and Trade History */}
          <Grid item xs={12} md={4}>
            {/* Order Form */}
            <Paper sx={{ 
              p: 3, 
              mb: 4,
              backgroundColor: '#FFFFFF',
              borderRadius: 3,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}>
              <Typography variant="h6" sx={{ 
                mb: 3,
                fontWeight: 600,
                color: '#222222'
              }}>
                Place Order
              </Typography>
              <OrderForm symbol={selectedPair} />
            </Paper>

            {/* Trade History */}
            <Paper sx={{ 
              p: 3,
              backgroundColor: '#FFFFFF',
              borderRadius: 3,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}>
              <Typography variant="h6" sx={{ 
                mb: 3,
                fontWeight: 600,
                color: '#222222'
              }}>
                Recent Trades
              </Typography>
              <TradeHistory symbol={selectedPair} maxTrades={10} />
            </Paper>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TradingScreen; 