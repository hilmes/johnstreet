import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  Divider,
  Tooltip,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAppContext } from '../../context/AppContext';
import IFTTTRuleBuilder from '../strategy/IFTTTRuleBuilder';
import { IFTTTRule, IFTTTStrategy } from '../../types/strategy';

const createEmptyRule = (): IFTTTRule => ({
  id: Date.now().toString(),
  name: 'New Rule',
  description: '',
  enabled: true,
  conditions: [],
  actions: [],
  logicOperator: 'AND',
  cooldownMinutes: 5,
});

const IFTTTStrategyScreen: React.FC = () => {
  const { state, services } = useAppContext();
  const [strategy, setStrategy] = React.useState<IFTTTStrategy>({
    id: Date.now().toString(),
    name: 'IFTTT Strategy',
    description: 'Custom IFTTT trading strategy',
    type: 'IFTTT',
    pair: state.selectedPair,
    isActive: false,
    config: {},
    timeframe: '1m',
    pairs: [state.selectedPair],
    parameters: {},
    rules: [],
    maxConcurrentTrades: 3,
    riskPerTrade: 1,
    totalRiskPercentage: 5,
  });

  const handleAddRule = () => {
    setStrategy((prev) => ({
      ...prev,
      rules: [...prev.rules, createEmptyRule()],
    }));
  };

  const handleUpdateRule = (index: number, updatedRule: IFTTTRule) => {
    setStrategy((prev) => {
      const newRules = [...prev.rules];
      newRules[index] = updatedRule;
      return { ...prev, rules: newRules };
    });
  };

  const handleDeleteRule = (index: number) => {
    setStrategy((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  };

  const handleSaveStrategy = async () => {
    try {
      // TODO: Implement strategy saving logic
      console.log('Saving strategy:', strategy);
    } catch (error) {
      console.error('Error saving strategy:', error);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 4, backgroundColor: '#F9F9F9', minHeight: '100vh' }}>
      <Grid container spacing={4}>
        {/* Header */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h4" sx={{ color: '#222222', fontWeight: 700 }}>
              IFTTT Trading Strategy
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveStrategy}
              sx={{ px: 4 }}
            >
              Save Strategy
            </Button>
          </Box>
        </Grid>

        {/* Strategy Settings */}
        <Grid item xs={12}>
          <Paper sx={{ 
            p: 3, 
            mb: 4,
            backgroundColor: '#FFFFFF',
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#222222', fontWeight: 600 }}>
              Strategy Settings
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: '#666666' }}>
              Configure the basic parameters of your trading strategy. These settings will apply to all rules within this strategy.
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Strategy Name"
                  value={strategy.name}
                  onChange={(e) => setStrategy((prev) => ({ ...prev, name: e.target.value }))}
                  helperText="Give your strategy a unique, descriptive name to easily identify it"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Trading Pair"
                  value={strategy.pairs[0]}
                  disabled
                  helperText="The cryptocurrency pair this strategy will trade on"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Description"
                  value={strategy.description}
                  onChange={(e) => setStrategy((prev) => ({ ...prev, description: e.target.value }))}
                  helperText="Describe what your strategy does and how it works - this will help you remember its purpose later"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Tooltip title="Maximum number of trades that can be open at the same time" arrow placement="top">
                  <TextField
                    fullWidth
                    type="number"
                    label="Max Concurrent Trades"
                    value={strategy.maxConcurrentTrades}
                    onChange={(e) => setStrategy((prev) => ({
                      ...prev,
                      maxConcurrentTrades: Number(e.target.value),
                    }))}
                    helperText="Limit the number of simultaneous open trades"
                  />
                </Tooltip>
              </Grid>
              <Grid item xs={12} md={4}>
                <Tooltip title="The percentage of your available balance to risk on each individual trade" arrow placement="top">
                  <TextField
                    fullWidth
                    type="number"
                    label="Risk Per Trade (%)"
                    value={strategy.riskPerTrade}
                    onChange={(e) => setStrategy((prev) => ({
                      ...prev,
                      riskPerTrade: Number(e.target.value),
                    }))}
                    helperText="Maximum risk percentage per individual trade"
                  />
                </Tooltip>
              </Grid>
              <Grid item xs={12} md={4}>
                <Tooltip title="The maximum total percentage of your balance that can be at risk across all active trades" arrow placement="top">
                  <TextField
                    fullWidth
                    type="number"
                    label="Total Risk (%)"
                    value={strategy.totalRiskPercentage}
                    onChange={(e) => setStrategy((prev) => ({
                      ...prev,
                      totalRiskPercentage: Number(e.target.value),
                    }))}
                    helperText="Maximum combined risk across all trades"
                  />
                </Tooltip>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Rules */}
        <Grid item xs={12}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h5" sx={{ color: '#222222', fontWeight: 600 }}>
                  Trading Rules
                </Typography>
                <Typography variant="body2" sx={{ color: '#666666', mt: 1 }}>
                  Create IF-THEN rules to automate your trading strategy. Each rule consists of conditions (IF) and actions (THEN).
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddRule}
                sx={{
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                  }
                }}
              >
                Add Rule
              </Button>
            </Box>

            {strategy.rules.length === 0 ? (
              <Alert 
                severity="info" 
                sx={{ 
                  mb: 2,
                  backgroundColor: 'rgba(101, 99, 255, 0.1)',
                  color: '#6563FF',
                  '& .MuiAlert-icon': {
                    color: '#6563FF'
                  }
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  No rules created yet
                </Typography>
                <Typography variant="body2">
                  Click "Add Rule" to create your first trading rule. Rules are the building blocks of your strategy - they define when and how your strategy will trade.
                </Typography>
              </Alert>
            ) : (
              strategy.rules.map((rule, index) => (
                <Paper 
                  key={rule.id} 
                  sx={{ 
                    mb: 3,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 3,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#222222', fontWeight: 600 }}>
                      Rule {index + 1}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 3, color: '#666666' }}>
                      Define the conditions that will trigger this rule and the actions that will be taken when those conditions are met.
                    </Typography>
                    <IFTTTRuleBuilder
                      rule={rule}
                      onChange={(updatedRule) => handleUpdateRule(index, updatedRule)}
                      onDelete={() => handleDeleteRule(index)}
                    />
                  </Box>
                </Paper>
              ))
            )}
          </Box>
        </Grid>

        {/* Strategy Preview */}
        {strategy.rules.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ 
              p: 3,
              backgroundColor: '#FFFFFF',
              borderRadius: 3,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#222222', fontWeight: 600 }}>
                Strategy Preview
              </Typography>
              <Typography variant="body2" sx={{ mb: 3, color: '#666666' }}>
                Review how your strategy will work. This preview shows a human-readable summary of all your rules and how they interact.
              </Typography>
              <Box sx={{ backgroundColor: 'rgba(101, 99, 255, 0.05)', p: 3, borderRadius: 2 }}>
                {strategy.rules.map((rule, index) => (
                  <Box key={rule.id} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ color: '#222222', fontWeight: 600 }}>
                      Rule {index + 1}: {rule.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#666666' }}>
                      If{' '}
                      {rule.conditions
                        .map((c) => `${c.type} (${c.parameters.value || ''})`)
                        .join(` ${rule.logicOperator} `)}{' '}
                      then{' '}
                      {rule.actions
                        .map((a) => `${a.type} (${a.parameters.amount || ''})`)
                        .join(' and ')}
                    </Typography>
                    {index < strategy.rules.length - 1 && (
                      <Divider sx={{ my: 2, borderColor: 'rgba(0, 0, 0, 0.08)' }} />
                    )}
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default IFTTTStrategyScreen; 