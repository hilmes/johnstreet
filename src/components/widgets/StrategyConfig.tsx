import React from 'react';
import {
  Box,
  Grid,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Strategy } from '../../types/strategy';

interface StrategyConfigProps {
  strategy: Strategy;
  isEditing: boolean;
  onUpdate: (updatedStrategy: Strategy) => void;
}

const StrategyConfig: React.FC<StrategyConfigProps> = ({
  strategy,
  isEditing,
  onUpdate,
}) => {
  const handleChange = (field: string, value: any) => {
    const updatedStrategy = {
      ...strategy,
      [field]: value,
    };
    onUpdate(updatedStrategy);
  };

  const handleConfigChange = (field: string, value: any) => {
    const updatedStrategy = {
      ...strategy,
      config: {
        ...strategy.config,
        [field]: value,
      },
    };
    onUpdate(updatedStrategy);
  };

  const renderGridConfig = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Grid Size"
          type="number"
          value={strategy.config.gridSize || ''}
          onChange={(e) => handleConfigChange('gridSize', Number(e.target.value))}
          disabled={!isEditing}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Investment Amount"
          type="number"
          value={strategy.config.investmentAmount || ''}
          onChange={(e) =>
            handleConfigChange('investmentAmount', Number(e.target.value))
          }
          disabled={!isEditing}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Upper Price"
          type="number"
          value={strategy.config.upperPrice || ''}
          onChange={(e) =>
            handleConfigChange('upperPrice', Number(e.target.value))
          }
          disabled={!isEditing}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Lower Price"
          type="number"
          value={strategy.config.lowerPrice || ''}
          onChange={(e) =>
            handleConfigChange('lowerPrice', Number(e.target.value))
          }
          disabled={!isEditing}
        />
      </Grid>
    </Grid>
  );

  const renderDCAConfig = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>Interval</InputLabel>
          <Select
            value={strategy.config.interval || '1d'}
            onChange={(e) => handleConfigChange('interval', e.target.value)}
            disabled={!isEditing}
          >
            <MenuItem value="1h">1 Hour</MenuItem>
            <MenuItem value="4h">4 Hours</MenuItem>
            <MenuItem value="12h">12 Hours</MenuItem>
            <MenuItem value="1d">1 Day</MenuItem>
            <MenuItem value="1w">1 Week</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Investment Amount"
          type="number"
          value={strategy.config.investmentAmount || ''}
          onChange={(e) =>
            handleConfigChange('investmentAmount', Number(e.target.value))
          }
          disabled={!isEditing}
        />
      </Grid>
    </Grid>
  );

  const renderMomentumConfig = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Take Profit %"
          type="number"
          value={strategy.config.takeProfitPercentage || ''}
          onChange={(e) =>
            handleConfigChange('takeProfitPercentage', Number(e.target.value))
          }
          disabled={!isEditing}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Stop Loss %"
          type="number"
          value={strategy.config.stopLossPercentage || ''}
          onChange={(e) =>
            handleConfigChange('stopLossPercentage', Number(e.target.value))
          }
          disabled={!isEditing}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Indicators</InputLabel>
          <Select
            multiple
            value={strategy.config.indicators || []}
            onChange={(e) => handleConfigChange('indicators', e.target.value)}
            disabled={!isEditing}
          >
            <MenuItem value="RSI">RSI</MenuItem>
            <MenuItem value="MACD">MACD</MenuItem>
            <MenuItem value="BB">Bollinger Bands</MenuItem>
            <MenuItem value="MA">Moving Average</MenuItem>
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Basic Strategy Info */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Strategy Name"
            value={strategy.name}
            onChange={(e) => handleChange('name', e.target.value)}
            disabled={!isEditing}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Strategy Type</InputLabel>
            <Select
              value={strategy.type}
              onChange={(e) =>
                handleChange('type', e.target.value as Strategy['type'])
              }
              disabled={!isEditing}
            >
              <MenuItem value="GRID">Grid Trading</MenuItem>
              <MenuItem value="DCA">Dollar Cost Averaging</MenuItem>
              <MenuItem value="MOMENTUM">Momentum Trading</MenuItem>
              <MenuItem value="CUSTOM">Custom Strategy</MenuItem>
              <MenuItem value="IFTTT">IFTTT</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Trading Pair */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Trading Pair"
            value={strategy.pair}
            onChange={(e) => handleChange('pair', e.target.value)}
            disabled={!isEditing}
          />
        </Grid>

        {/* Strategy-specific Configuration */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Strategy Configuration
          </Typography>
          {strategy.type === 'GRID' && renderGridConfig()}
          {strategy.type === 'DCA' && renderDCAConfig()}
          {strategy.type === 'MOMENTUM' && renderMomentumConfig()}
        </Grid>
      </Grid>
    </Box>
  );
};

export default StrategyConfig; 