import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  IconButton,
  Chip,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAppContext } from '../../context/AppContext';
import { Strategy, StrategyMetrics } from '../../types/strategy';
import StrategySettings from '../widgets/StrategySettings';

interface AlgorithmCardProps {
  strategy: Strategy;
  metrics: StrategyMetrics;
  onToggle: () => void;
  onUpdate: (updatedStrategy: Strategy) => void;
}

const AlgorithmCard: React.FC<AlgorithmCardProps> = ({
  strategy,
  metrics,
  onToggle,
  onUpdate,
}) => {
  const [showSettings, setShowSettings] = React.useState(false);

  const formatValue = (value: number, format: 'currency' | 'percentage' | 'number' = 'number') => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      case 'percentage':
        return `${value.toFixed(2)}%`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <>
      <Paper sx={{ 
        py: 2,
        px: 3,
        mb: 2,
        backgroundColor: '#FFFFFF',
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
      }}>
        <Grid container spacing={2} alignItems="center">
          {/* Strategy Info */}
          <Grid item xs={2.5}>
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {strategy.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={strategy.isActive ? 'Running' : 'Stopped'}
                  color={strategy.isActive ? 'success' : 'default'}
                  size="small"
                />
                <Chip
                  label={strategy.pair}
                  variant="outlined"
                  size="small"
                  color="primary"
                />
              </Box>
            </Box>
          </Grid>

          {/* Performance Metrics */}
          <Grid item xs={2}>
            <Box>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>Daily P&L</Typography>
              <Chip
                icon={metrics.dailyPnL >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                label={formatValue(metrics.dailyPnL, 'currency')}
                color={metrics.dailyPnL >= 0 ? 'success' : 'error'}
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
          </Grid>

          {/* ROI */}
          <Grid item xs={1.5}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>ROI</Typography>
            <Chip
              label={formatValue(metrics.dailyRoi, 'percentage')}
              color={metrics.dailyRoi >= 0 ? 'success' : 'error'}
              variant="outlined"
            />
          </Grid>

          {/* Win Rate */}
          <Grid item xs={1.5}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>Win Rate</Typography>
            <Chip
              label={formatValue((metrics.winningTrades / metrics.totalTrades) * 100, 'percentage')}
              color="primary"
              variant="outlined"
            />
          </Grid>

          {/* Drawdown */}
          <Grid item xs={1.5}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>Drawdown</Typography>
            <Chip
              label={formatValue(metrics.drawdownPercent, 'percentage')}
              color="error"
              variant="outlined"
            />
          </Grid>

          {/* Risk Level */}
          <Grid item xs={2}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>Risk Level</Typography>
            <Chip
              label={`${metrics.risk}%`}
              color={
                metrics.risk < 30 ? 'success' :
                metrics.risk < 70 ? 'warning' : 'error'
              }
              variant="outlined"
            />
          </Grid>

          {/* Actions */}
          <Grid item xs={1}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <IconButton 
                onClick={onToggle} 
                color={strategy.isActive ? 'error' : 'success'}
                size="small"
              >
                {strategy.isActive ? <StopIcon /> : <PlayArrowIcon />}
              </IconButton>
              <IconButton 
                onClick={() => setShowSettings(true)} 
                size="small"
              >
                <SettingsIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <StrategySettings
        open={showSettings}
        strategy={strategy}
        onClose={() => setShowSettings(false)}
        onSave={onUpdate}
      />
    </>
  );
};

const HomeScreen: React.FC = () => {
  const { services } = useAppContext();
  const [strategies, setStrategies] = React.useState<Strategy[]>([]);
  const [metrics, setMetrics] = React.useState<Record<string, StrategyMetrics>>({});

  // Mock data for demonstration
  React.useEffect(() => {
    const mockStrategies: Strategy[] = [
      {
        id: '1',
        name: 'BTC Grid Trading',
        type: 'GRID',
        pair: 'BTC/USD',
        isActive: true,
        config: {
          gridSize: 10,
          upperPrice: 48000,
          lowerPrice: 42000,
          investmentAmount: 10000,
        },
      },
      {
        id: '2',
        name: 'ETH DCA Strategy',
        type: 'DCA',
        pair: 'ETH/USD',
        isActive: false,
        config: {
          interval: '1d',
          investmentAmount: 500,
        },
      },
    ];

    const mockMetrics: Record<string, StrategyMetrics> = {
      '1': {
        equity: 15000,
        balance: 14500,
        openPositions: 3,
        dailyPnL: 1250.50,
        dailyRoi: 2.5,
        drawdown: 180,
        drawdownPercent: 1.2,
        marginLevel: 85,
        latency: 42,
        risk: 25,
        totalTrades: 10,
        winningTrades: 8,
        losingTrades: 2,
        winRate: 80,
        profitFactor: 2.3,
        sharpeRatio: 1.9,
        maxDrawdown: 950,
        maxDrawdownPercent: 6.5,
        timestamp: Date.now(),
      },
      '2': {
        equity: 8500,
        balance: 8200,
        openPositions: 1,
        dailyPnL: -150.25,
        dailyRoi: -0.8,
        drawdown: 210,
        drawdownPercent: 2.5,
        marginLevel: 92,
        latency: 35,
        risk: 45,
        totalTrades: 5,
        winningTrades: 3,
        losingTrades: 2,
        winRate: 60,
        profitFactor: 1.5,
        sharpeRatio: 1.2,
        maxDrawdown: 750,
        maxDrawdownPercent: 9.0,
        timestamp: Date.now(),
      },
    };

    setStrategies(mockStrategies);
    setMetrics(mockMetrics);
  }, []);

  const handleStrategyToggle = (strategyId: string) => {
    setStrategies(prevStrategies =>
      prevStrategies.map(strategy =>
        strategy.id === strategyId
          ? { ...strategy, isActive: !strategy.isActive }
          : strategy
      )
    );
  };

  const handleStrategyUpdate = (updatedStrategy: Strategy) => {
    setStrategies(prevStrategies =>
      prevStrategies.map(strategy =>
        strategy.id === updatedStrategy.id ? updatedStrategy : strategy
      )
    );
  };

  return (
    <Box sx={{ 
      flexGrow: 1,
      m: 0,
      p: 0
    }}>
      <Typography variant="h4" sx={{ mb: 3, mr: 3, mt: 3 }}>
        Active Algorithms
      </Typography>
      {strategies.map((strategy) => (
        <AlgorithmCard
          key={strategy.id}
          strategy={strategy}
          metrics={metrics[strategy.id]}
          onToggle={() => handleStrategyToggle(strategy.id)}
          onUpdate={handleStrategyUpdate}
        />
      ))}
    </Box>
  );
};

export default HomeScreen; 