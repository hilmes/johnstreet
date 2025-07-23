import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useAppContext } from '../../context/AppContext';
import StrategyConfig from '../widgets/StrategyConfig';
import { IFTTTStrategyScreen } from '../strategy';
import { Strategy } from '../../types/strategy';

const StrategyScreen: React.FC = () => {
  const { services, state } = useAppContext();
  const [strategies, setStrategies] = React.useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = React.useState<Strategy | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [newStrategyType, setNewStrategyType] = React.useState<Strategy['type']>('CUSTOM');

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
        isActive: false,
        config: {},
      },
    ];
    setStrategies(mockStrategies);
    setLoading(false);
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

  const handleStrategySelect = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setIsEditing(false);
  };

  const handleStrategyDelete = (strategyId: string) => {
    setStrategies(prevStrategies =>
      prevStrategies.filter(strategy => strategy.id !== strategyId)
    );
    if (selectedStrategy?.id === strategyId) {
      setSelectedStrategy(null);
    }
  };

  const handleCreateStrategy = () => {
    const newStrategy: Strategy = {
      id: Date.now().toString(),
      name: 'New Strategy',
      type: newStrategyType,
      pair: state.selectedPair,
      isActive: false,
      config: {},
    };
    setStrategies(prev => [...prev, newStrategy]);
    setSelectedStrategy(newStrategy);
    setIsEditing(true);
    setShowCreateDialog(false);
  };

  const renderStrategyContent = () => {
    if (!selectedStrategy) {
      return (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">
            Select a strategy or create a new one to get started
          </Typography>
        </Paper>
      );
    }

    if (selectedStrategy.type === 'IFTTT') {
      return <IFTTTStrategyScreen />;
    }

    return (
      <StrategyConfig
        strategy={selectedStrategy}
        isEditing={isEditing}
        onUpdate={(updatedStrategy) => {
          setStrategies(prev =>
            prev.map(s =>
              s.id === updatedStrategy.id ? updatedStrategy : s
            )
          );
          setSelectedStrategy(updatedStrategy);
        }}
      />
    );
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h4" gutterBottom>
            Trading Strategies
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
          >
            Create Strategy
          </Button>
        </Grid>

        {/* Strategy List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Active Strategies
            </Typography>
            {strategies.map((strategy) => (
              <Card
                key={strategy.id}
                sx={{
                  mb: 2,
                  cursor: 'pointer',
                  bgcolor:
                    selectedStrategy?.id === strategy.id
                      ? 'action.selected'
                      : 'background.paper',
                }}
                onClick={() => handleStrategySelect(strategy)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle1">{strategy.name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {strategy.pair} - {strategy.type}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Tooltip title={strategy.isActive ? 'Stop' : 'Start'}>
                        <IconButton
                          size="small"
                          color={strategy.isActive ? 'error' : 'success'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStrategyToggle(strategy.id);
                          }}
                        >
                          {strategy.isActive ? <StopIcon /> : <StartIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStrategyDelete(strategy.id);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Paper>
        </Grid>

        {/* Strategy Content */}
        <Grid item xs={12} md={8}>
          {renderStrategyContent()}
        </Grid>
      </Grid>

      {/* Create Strategy Dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)}>
        <DialogTitle>Create New Strategy</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Strategy Type</InputLabel>
            <Select
              value={newStrategyType}
              onChange={(e) => setNewStrategyType(e.target.value as Strategy['type'])}
            >
              <MenuItem value="GRID">Grid Trading</MenuItem>
              <MenuItem value="DCA">Dollar Cost Averaging</MenuItem>
              <MenuItem value="MOMENTUM">Momentum Trading</MenuItem>
              <MenuItem value="IFTTT">If This Then That (IFTTT)</MenuItem>
              <MenuItem value="CUSTOM">Custom Strategy</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateStrategy} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StrategyScreen; 