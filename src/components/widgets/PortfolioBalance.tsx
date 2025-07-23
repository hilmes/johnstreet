import React from 'react';
import { Paper, Typography, Grid, Box, Tab, Tabs } from '@mui/material';
import { useWebSocket } from '../../hooks/useWebSocket';
import LoadingSpinner from '../common/LoadingSpinner';
import { Balance, PerformanceMetrics, BalanceHistory } from '../../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ResponsivePie } from '@nivo/pie';

interface PortfolioBalanceProps {
  symbol?: string;
}

const PortfolioBalance: React.FC<PortfolioBalanceProps> = ({ symbol = 'XXBTZUSD' }) => {
  const [balances, setBalances] = React.useState<Balance[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [totalValue, setTotalValue] = React.useState(0);
  const [selectedTab, setSelectedTab] = React.useState(0);
  const [history, setHistory] = React.useState<BalanceHistory[]>([]);
  const [metrics, setMetrics] = React.useState<PerformanceMetrics>({
    dailyPnL: 0,
    dailyRoi: 0,
    weeklyPnL: 0,
    weeklyRoi: 0,
    monthlyPnL: 0,
    monthlyRoi: 0,
    allTimePnL: 0,
    allTimeRoi: 0,
  });

  useWebSocket({
    symbol,
    onTicker: (tickerData) => {
      setBalances(prev => {
        const updated = prev.map(balance => {
          if (balance.asset === symbol.slice(0, -3)) {
            const newUsdValue = balance.total * tickerData.price;
            const prevUsdValue = balance.usdValue;
            const pnl24h = newUsdValue - prevUsdValue;
            const roi24h = (pnl24h / prevUsdValue) * 100;

            return {
              ...balance,
              usdValue: newUsdValue,
              pnl24h,
              roi24h,
            };
          }
          return balance;
        });

        const newTotal = updated.reduce((acc, bal) => acc + bal.usdValue, 0);
        setTotalValue(newTotal);

        // Update history
        const newHistoryEntry: BalanceHistory = {
          timestamp: Date.now(),
          totalValue: newTotal,
          balances: updated,
        };
        setHistory(prev => [...prev, newHistoryEntry].slice(-100)); // Keep last 100 entries

        return updated;
      });
    },
    onOrder: (order) => {
      setBalances(prev => {
        const updatedBalances = [...prev];
        const [baseAsset, quoteAsset] = order.symbol.split('');
        const baseAssetIndex = updatedBalances.findIndex(b => b.asset === baseAsset);
        const quoteAssetIndex = updatedBalances.findIndex(b => b.asset === quoteAsset);

        if (baseAssetIndex !== -1 && quoteAssetIndex !== -1) {
          if (order.side === 'buy') {
            updatedBalances[baseAssetIndex].free += order.amount;
            updatedBalances[quoteAssetIndex].free -= order.amount * (order.price || 0);
          } else {
            updatedBalances[baseAssetIndex].free -= order.amount;
            updatedBalances[quoteAssetIndex].free += order.amount * (order.price || 0);
          }
        }

        return updatedBalances;
      });
    },
  });

  // Calculate performance metrics whenever history updates
  React.useEffect(() => {
    if (history.length < 2) return;

    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const currentValue = history[history.length - 1].totalValue;
    const dayAgoValue = findClosestValue(history, dayAgo);
    const weekAgoValue = findClosestValue(history, weekAgo);
    const monthAgoValue = findClosestValue(history, monthAgo);
    const initialValue = history[0].totalValue;

    setMetrics({
      dailyPnL: currentValue - dayAgoValue,
      dailyRoi: ((currentValue - dayAgoValue) / dayAgoValue) * 100,
      weeklyPnL: currentValue - weekAgoValue,
      weeklyRoi: ((currentValue - weekAgoValue) / weekAgoValue) * 100,
      monthlyPnL: currentValue - monthAgoValue,
      monthlyRoi: ((currentValue - monthAgoValue) / monthAgoValue) * 100,
      allTimePnL: currentValue - initialValue,
      allTimeRoi: ((currentValue - initialValue) / initialValue) * 100,
    });
  }, [history]);

  const findClosestValue = (history: BalanceHistory[], timestamp: number) => {
    const entry = history.reduce((prev, curr) => {
      return Math.abs(curr.timestamp - timestamp) < Math.abs(prev.timestamp - timestamp)
        ? curr
        : prev;
    });
    return entry.totalValue;
  };

  // Initial balance load
  React.useEffect(() => {
    const loadBalances = async () => {
      try {
        const dummyBalances: Balance[] = [
          {
            asset: 'BTC',
            free: 0.5,
            locked: 0.1,
            total: 0.6,
            usdValue: 24000,
          },
          {
            asset: 'ETH',
            free: 5.0,
            locked: 1.0,
            total: 6.0,
            usdValue: 12000,
          },
        ];
        setBalances(dummyBalances);
        setTotalValue(dummyBalances.reduce((acc, bal) => acc + bal.usdValue, 0));
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch balances:', error);
      }
    };

    loadBalances();
  }, []);

  const renderPerformanceMetrics = () => (
    <Grid container spacing={2}>
      <Grid item xs={6} md={3}>
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="body2" color="textSecondary">24h P&L</Typography>
          <Typography
            variant="h6"
            color={metrics.dailyPnL >= 0 ? 'success.main' : 'error.main'}
          >
            ${metrics.dailyPnL.toLocaleString()}
          </Typography>
          <Typography variant="body2" color={metrics.dailyRoi >= 0 ? 'success.main' : 'error.main'}>
            {metrics.dailyRoi.toFixed(2)}%
          </Typography>
        </Box>
      </Grid>
      <Grid item xs={6} md={3}>
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="body2" color="textSecondary">7D P&L</Typography>
          <Typography
            variant="h6"
            color={metrics.weeklyPnL >= 0 ? 'success.main' : 'error.main'}
          >
            ${metrics.weeklyPnL.toLocaleString()}
          </Typography>
          <Typography variant="body2" color={metrics.weeklyRoi >= 0 ? 'success.main' : 'error.main'}>
            {metrics.weeklyRoi.toFixed(2)}%
          </Typography>
        </Box>
      </Grid>
      <Grid item xs={6} md={3}>
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="body2" color="textSecondary">30D P&L</Typography>
          <Typography
            variant="h6"
            color={metrics.monthlyPnL >= 0 ? 'success.main' : 'error.main'}
          >
            ${metrics.monthlyPnL.toLocaleString()}
          </Typography>
          <Typography variant="body2" color={metrics.monthlyRoi >= 0 ? 'success.main' : 'error.main'}>
            {metrics.monthlyRoi.toFixed(2)}%
          </Typography>
        </Box>
      </Grid>
      <Grid item xs={6} md={3}>
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="body2" color="textSecondary">All Time P&L</Typography>
          <Typography
            variant="h6"
            color={metrics.allTimePnL >= 0 ? 'success.main' : 'error.main'}
          >
            ${metrics.allTimePnL.toLocaleString()}
          </Typography>
          <Typography variant="body2" color={metrics.allTimeRoi >= 0 ? 'success.main' : 'error.main'}>
            {metrics.allTimeRoi.toFixed(2)}%
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );

  const renderBalanceChart = () => (
    <Box sx={{ height: 300, mt: 2 }}>
      <ResponsiveContainer>
        <LineChart data={history}>
          <XAxis
            dataKey="timestamp"
            tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
          />
          <YAxis />
          <Tooltip
            labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Portfolio Value']}
          />
          <Line
            type="monotone"
            dataKey="totalValue"
            stroke="#8884d8"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderAllocationChart = () => {
    const pieData = balances
      .filter(balance => balance.usdValue > 0)
      .map(balance => ({
        id: balance.asset,
        label: balance.asset,
        value: balance.usdValue,
        percentage: (balance.usdValue / totalValue) * 100,
      }));

    return (
      <Box sx={{ height: 300, mt: 2 }}>
        <ResponsivePie
          data={pieData}
          margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
          innerRadius={0.5}
          padAngle={0.7}
          cornerRadius={3}
          activeOuterRadiusOffset={8}
          colors={{ scheme: 'nivo' }}
          borderWidth={1}
          borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
          arcLinkLabelsSkipAngle={10}
          arcLinkLabelsTextColor="#333333"
          arcLinkLabelsThickness={2}
          arcLinkLabelsColor={{ from: 'color' }}
          arcLabelsSkipAngle={10}
          arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
          tooltip={({ datum }) => (
            <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="body2">
                {datum.label}: ${datum.value.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {((datum.value / totalValue) * 100).toFixed(2)}%
              </Typography>
            </Box>
          )}
          legends={[
            {
              anchor: 'bottom',
              direction: 'row',
              justify: false,
              translateX: 0,
              translateY: 56,
              itemsSpacing: 0,
              itemWidth: 100,
              itemHeight: 18,
              itemTextColor: '#999',
              itemDirection: 'left-to-right',
              itemOpacity: 1,
              symbolSize: 18,
              symbolShape: 'circle',
            },
          ]}
        />
      </Box>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Portfolio Balance
      </Typography>
      <Typography variant="h4" gutterBottom color="primary">
        ${totalValue.toLocaleString()}
      </Typography>
      
      <Tabs
        value={selectedTab}
        onChange={(_, newValue) => setSelectedTab(newValue)}
        sx={{ mb: 2 }}
      >
        <Tab label="Assets" />
        <Tab label="Performance" />
        <Tab label="Allocation" />
      </Tabs>

      {selectedTab === 0 ? (
        <Grid container spacing={2}>
          {balances.map((balance) => (
            <Grid item xs={12} key={balance.asset}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box>
                  <Typography variant="subtitle1">{balance.asset}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Free: {balance.free.toFixed(8)}
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="subtitle1">
                    ${balance.usdValue.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total: {balance.total.toFixed(8)}
                  </Typography>
                  {balance.pnl24h !== undefined && (
                    <Typography
                      variant="body2"
                      color={balance.pnl24h >= 0 ? 'success.main' : 'error.main'}
                    >
                      24h: {balance.pnl24h >= 0 ? '+' : ''}
                      ${balance.pnl24h.toLocaleString()} (
                      {balance.roi24h?.toFixed(2)}%)
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      ) : selectedTab === 1 ? (
        <>
          {renderPerformanceMetrics()}
          {renderBalanceChart()}
        </>
      ) : (
        renderAllocationChart()
      )}
    </Paper>
  );
};

export default PortfolioBalance; 