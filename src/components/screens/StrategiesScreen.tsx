import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAppContext } from '../../context/AppContext';
import { StrategyConfig } from '../widgets';
import { Strategy, IFTTTStrategy } from '../../types/strategy';
import { IFTTTStrategyScreen } from '../strategy';

const StrategiesScreen: React.FC = () => {
  const { services } = useAppContext();
  const [strategies, setStrategies] = React.useState<Strategy[]>([]);
  const [isEditing, setIsEditing] = React.useState(false);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [newStrategyType, setNewStrategyType] = React.useState<'GRID' | 'DCA' | 'MOMENTUM' | 'CUSTOM' | 'IFTTT'>('GRID');

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
      {
        id: '3',
        name: 'BTC Price Alert Strategy',
        type: 'IFTTT',
        pair: 'BTC/USD',
        isActive: true,
        config: {},
        description: 'Send notification when BTC price drops below $40,000',
        timeframe: '1m',
        pairs: ['BTC/USD'],
        parameters: {},
        rules: [
          {
            id: '1',
            name: 'Price Drop Alert',
            description: 'Send notification when BTC price drops below $40,000',
            enabled: true,
            conditions: [
              {
                id: '1',
                type: 'PRICE_BELOW',
                parameters: {
                  value: 40000,
                },
              },
            ],
            actions: [
              {
                id: '1',
                type: 'SEND_NOTIFICATION',
                parameters: {
                  message: 'BTC price has dropped below $40,000!',
                },
              },
            ],
            logicOperator: 'AND',
            cooldownMinutes: 60,
          },
        ],
        maxConcurrentTrades: 1,
        riskPerTrade: 1,
        totalRiskPercentage: 5,
      } as IFTTTStrategy,
    ];
    setStrategies(mockStrategies);
  }, []);

  const handleCreateStrategy = () => {
    if (newStrategyType === 'IFTTT') {
      const newStrategy: IFTTTStrategy = {
        id: Date.now().toString(),
        name: 'New IFTTT Strategy',
        type: 'IFTTT',
        pair: 'BTC/USD',
        isActive: false,
        config: {},
        description: 'Custom IFTTT trading strategy',
        timeframe: '1m',
        pairs: ['BTC/USD'],
        parameters: {},
        rules: [],
        maxConcurrentTrades: 3,
        riskPerTrade: 1,
        totalRiskPercentage: 5,
      };
      setStrategies([...strategies, newStrategy]);
    }
    // Handle other strategy types...
    setShowCreateDialog(false);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Typography variant="h4" gutterBottom>
            Trading Strategies
          </Typography>
        </Grid>

        {/* Strategy List */}
        <Grid container spacing={3}>
          {strategies.map((strategy) => (
            <Grid item xs={12} key={strategy.id}>
              <StrategyConfig
                strategy={strategy}
                isEditing={isEditing}
                onUpdate={(updatedStrategy) => {
                  setStrategies(prev =>
                    prev.map(s =>
                      s.id === updatedStrategy.id ? updatedStrategy : s
                    )
                  );
                }}
              />
            </Grid>
          ))}
        </Grid>
      </Grid>
    </Box>
  );
};

export default StrategiesScreen; 