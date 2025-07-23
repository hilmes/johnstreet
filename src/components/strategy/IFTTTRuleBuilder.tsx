import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Tooltip,
  FormHelperText,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import {
  IFTTTRule,
  IFTTTCondition,
  IFTTTAction,
  TriggerType,
  ActionType,
} from '../../types/strategy';

interface IFTTTRuleBuilderProps {
  rule: IFTTTRule;
  onChange: (updatedRule: IFTTTRule) => void;
  onDelete?: () => void;
}

const IFTTTRuleBuilder: React.FC<IFTTTRuleBuilderProps> = ({
  rule,
  onChange,
  onDelete,
}) => {
  const handleConditionChange = (index: number, condition: IFTTTCondition) => {
    const newConditions = [...rule.conditions];
    newConditions[index] = condition;
    onChange({ ...rule, conditions: newConditions });
  };

  const handleActionChange = (index: number, action: IFTTTAction) => {
    const newActions = [...rule.actions];
    newActions[index] = action;
    onChange({ ...rule, actions: newActions });
  };

  const handleAddCondition = () => {
    const newCondition: IFTTTCondition = {
      id: Date.now().toString(),
      type: 'PRICE_ABOVE',
      parameters: {},
    };
    onChange({
      ...rule,
      conditions: [...rule.conditions, newCondition],
    });
  };

  const handleAddAction = () => {
    const newAction: IFTTTAction = {
      id: Date.now().toString(),
      type: 'BUY_MARKET',
      parameters: {},
    };
    onChange({
      ...rule,
      actions: [...rule.actions, newAction],
    });
  };

  const handleDeleteCondition = (index: number) => {
    const newConditions = rule.conditions.filter((_, i) => i !== index);
    onChange({ ...rule, conditions: newConditions });
  };

  const handleDeleteAction = (index: number) => {
    const newActions = rule.actions.filter((_, i) => i !== index);
    onChange({ ...rule, actions: newActions });
  };

  const renderConditionParameters = (condition: IFTTTCondition) => {
    switch (condition.type) {
      case 'PRICE_ABOVE':
      case 'PRICE_BELOW':
        return (
          <Tooltip title="The price threshold that will trigger this condition" arrow placement="top">
            <TextField
              fullWidth
              label="Price Value"
              type="number"
              value={condition.parameters.value || ''}
              onChange={(e) =>
                handleConditionChange(rule.conditions.indexOf(condition), {
                  ...condition,
                  parameters: { ...condition.parameters, value: Number(e.target.value) },
                })
              }
              helperText="Enter the price level that will activate this condition"
            />
          </Tooltip>
        );
      case 'RSI_ABOVE':
      case 'RSI_BELOW':
        return (
          <Tooltip title="The RSI value (0-100) that will trigger this condition" arrow placement="top">
            <TextField
              fullWidth
              label="RSI Value"
              type="number"
              value={condition.parameters.value || ''}
              onChange={(e) =>
                handleConditionChange(rule.conditions.indexOf(condition), {
                  ...condition,
                  parameters: { ...condition.parameters, value: Number(e.target.value) },
                })
              }
              helperText="Enter the RSI level (typically 30 for oversold, 70 for overbought)"
            />
          </Tooltip>
        );
      case 'CUSTOM_INDICATOR':
        return (
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Custom Formula"
            value={condition.parameters.customFormula || ''}
            onChange={(e) =>
              handleConditionChange(rule.conditions.indexOf(condition), {
                ...condition,
                parameters: { ...condition.parameters, customFormula: e.target.value },
              })
            }
            placeholder="e.g., close > sma(close, 20)"
          />
        );
      default:
        return null;
    }
  };

  const renderActionParameters = (action: IFTTTAction) => {
    switch (action.type) {
      case 'BUY_MARKET':
      case 'SELL_MARKET':
        return (
          <Tooltip title="The amount to trade in the base currency (e.g., BTC)" arrow placement="top">
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={action.parameters.amount || ''}
              onChange={(e) =>
                handleActionChange(rule.actions.indexOf(action), {
                  ...action,
                  parameters: { ...action.parameters, amount: Number(e.target.value) },
                })
              }
              helperText="Enter the quantity to trade when this action is triggered"
            />
          </Tooltip>
        );
      case 'SET_STOP_LOSS':
      case 'SET_TAKE_PROFIT':
        return (
          <Tooltip title="The percentage from the entry price" arrow placement="top">
            <TextField
              fullWidth
              label="Percentage"
              type="number"
              value={action.parameters.percentage || ''}
              onChange={(e) =>
                handleActionChange(rule.actions.indexOf(action), {
                  ...action,
                  parameters: { ...action.parameters, percentage: Number(e.target.value) },
                })
              }
              helperText="Enter the percentage for stop-loss or take-profit level"
            />
          </Tooltip>
        );
      case 'SEND_NOTIFICATION':
        return (
          <Tooltip title="The message to send when this action is triggered" arrow placement="top">
            <TextField
              fullWidth
              label="Message"
              value={action.parameters.message || ''}
              onChange={(e) =>
                handleActionChange(rule.actions.indexOf(action), {
                  ...action,
                  parameters: { ...action.parameters, message: e.target.value },
                })
              }
              helperText="Enter the notification message to be sent"
            />
          </Tooltip>
        );
      case 'CUSTOM_ACTION':
        return (
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Custom Code"
            value={action.parameters.customCode || ''}
            onChange={(e) =>
              handleActionChange(rule.actions.indexOf(action), {
                ...action,
                parameters: { ...action.parameters, customCode: e.target.value },
              })
            }
            placeholder="e.g., executeOrder('BUY', amount, price)"
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Rule Name"
                value={rule.name}
                onChange={(e) =>
                  onChange({ ...rule, name: e.target.value })
                }
                helperText="Give your rule a descriptive name to identify its purpose"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Rule Description"
                value={rule.description}
                onChange={(e) =>
                  onChange({ ...rule, description: e.target.value })
                }
                helperText="Describe what this rule does and when it should trigger"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={rule.enabled}
                    onChange={(e) =>
                      onChange({ ...rule, enabled: e.target.checked })
                    }
                  />
                }
                label="Enable Rule"
              />
              <FormHelperText>Toggle this rule on/off without deleting it</FormHelperText>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Typography variant="h6" gutterBottom sx={{ color: '#222222', fontWeight: 600 }}>
        If...
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: '#666666' }}>
        Define the conditions that must be met for this rule to trigger. Multiple conditions can be combined using AND/OR logic.
      </Typography>

      {rule.conditions.map((condition, index) => (
        <Card key={condition.id} sx={{ mb: 2, borderRadius: 3, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Condition Type</InputLabel>
                  <Select
                    value={condition.type}
                    onChange={(e) =>
                      handleConditionChange(index, {
                        ...condition,
                        type: e.target.value as TriggerType,
                        parameters: {},
                      })
                    }
                  >
                    <MenuItem value="PRICE_ABOVE">Price Above</MenuItem>
                    <MenuItem value="PRICE_BELOW">Price Below</MenuItem>
                    <MenuItem value="RSI_ABOVE">RSI Above</MenuItem>
                    <MenuItem value="RSI_BELOW">RSI Below</MenuItem>
                    <MenuItem value="VOLUME_SPIKE">Volume Spike</MenuItem>
                    <MenuItem value="CUSTOM_INDICATOR">Custom Indicator</MenuItem>
                  </Select>
                  <FormHelperText>Select the type of condition to check</FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={7}>
                {renderConditionParameters(condition)}
              </Grid>
              <Grid item xs={12} md={1}>
                <IconButton
                  color="error"
                  onClick={() => handleDeleteCondition(index)}
                >
                  <DeleteIcon />
                </IconButton>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}

      <Box sx={{ mb: 3 }}>
        <FormControl component="fieldset">
          <FormControlLabel
            control={
              <Switch
                checked={rule.logicOperator === 'AND'}
                onChange={(e) =>
                  onChange({
                    ...rule,
                    logicOperator: e.target.checked ? 'AND' : 'OR',
                  })
                }
              />
            }
            label={`Combine conditions using ${rule.logicOperator}`}
          />
          <FormHelperText>
            {rule.logicOperator === 'AND' 
              ? 'All conditions must be true to trigger the rule' 
              : 'Any condition can trigger the rule'}
          </FormHelperText>
        </FormControl>
      </Box>

      <Button
        startIcon={<AddIcon />}
        onClick={handleAddCondition}
        sx={{ mb: 3 }}
      >
        Add Condition
      </Button>

      <Typography variant="h6" gutterBottom sx={{ color: '#222222', fontWeight: 600 }}>
        Then...
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: '#666666' }}>
        Define the actions to take when the conditions are met. Multiple actions can be executed in sequence.
      </Typography>

      {rule.actions.map((action, index) => (
        <Card key={action.id} sx={{ mb: 2, borderRadius: 3, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Action Type</InputLabel>
                  <Select
                    value={action.type}
                    onChange={(e) =>
                      handleActionChange(index, {
                        ...action,
                        type: e.target.value as ActionType,
                        parameters: {},
                      })
                    }
                  >
                    <MenuItem value="BUY_MARKET">Buy Market</MenuItem>
                    <MenuItem value="SELL_MARKET">Sell Market</MenuItem>
                    <MenuItem value="SET_STOP_LOSS">Set Stop Loss</MenuItem>
                    <MenuItem value="SET_TAKE_PROFIT">Set Take Profit</MenuItem>
                    <MenuItem value="SEND_NOTIFICATION">Send Notification</MenuItem>
                    <MenuItem value="CUSTOM_ACTION">Custom Action</MenuItem>
                  </Select>
                  <FormHelperText>Select the action to perform when triggered</FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={7}>
                {renderActionParameters(action)}
              </Grid>
              <Grid item xs={12} md={1}>
                <IconButton
                  color="error"
                  onClick={() => handleDeleteAction(index)}
                >
                  <DeleteIcon />
                </IconButton>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}

      <Button
        startIcon={<AddIcon />}
        onClick={handleAddAction}
        sx={{ mb: 3 }}
      >
        Add Action
      </Button>

      {onDelete && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            color="error"
            onClick={onDelete}
            startIcon={<DeleteIcon />}
          >
            Delete Rule
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default IFTTTRuleBuilder; 