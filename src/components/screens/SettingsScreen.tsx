import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Alert,
  Snackbar,
  Container,
} from '@mui/material';
import { useAppContext } from '../../context/AppContext';
import LoadingSpinner from '../common/LoadingSpinner';

interface ApiSettings {
  apiKey: string;
  apiSecret: string;
  apiEndpoint: string;
  wsEndpoint: string;
}

interface TradingSettings {
  defaultLeverage: number;
  maxPositions: number;
  maxDrawdown: number;
  enableTrailingStop: boolean;
  defaultTrailingDistance: number;
}

interface NotificationSettings {
  enableEmailAlerts: boolean;
  enablePushNotifications: boolean;
  emailAddress: string;
  tradingAlerts: boolean;
  systemAlerts: boolean;
}

const SettingsScreen: React.FC = () => {
  const { services, dispatch } = useAppContext();
  const [apiSettings, setApiSettings] = React.useState<ApiSettings>({
    apiKey: '',
    apiSecret: '',
    apiEndpoint: '',
    wsEndpoint: '',
  });

  const [tradingSettings, setTradingSettings] = React.useState<TradingSettings>({
    defaultLeverage: 1,
    maxPositions: 5,
    maxDrawdown: 10,
    enableTrailingStop: false,
    defaultTrailingDistance: 1,
  });

  const [notificationSettings, setNotificationSettings] = React.useState<NotificationSettings>({
    enableEmailAlerts: false,
    enablePushNotifications: false,
    emailAddress: '',
    tradingAlerts: true,
    systemAlerts: true,
  });

  const [snackbar, setSnackbar] = React.useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setApiSettings(services.settings.getApiSettings());
        setTradingSettings(services.settings.getTradingSettings());
        setNotificationSettings(services.settings.getNotificationSettings());
      } catch (error) {
        console.error('Failed to load settings:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load settings',
          severity: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [services.settings]);

  const handleApiSettingsChange = (field: keyof ApiSettings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setApiSettings((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleTradingSettingsChange = (field: keyof TradingSettings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.type === 'checkbox' 
      ? event.target.checked 
      : parseFloat(event.target.value);
    
    setTradingSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNotificationSettingsChange = (field: keyof NotificationSettings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.type === 'checkbox' 
      ? event.target.checked 
      : event.target.value;
    
    setNotificationSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);

      // Validate API settings
      const isValid = await services.settings.validateApiSettings(apiSettings);
      if (!isValid) {
        throw new Error('Invalid API settings');
      }

      // Save all settings
      await Promise.all([
        services.settings.updateApiSettings(apiSettings),
        services.settings.updateTradingSettings(tradingSettings),
        services.settings.updateNotificationSettings(notificationSettings),
      ]);

      // Update WebSocket connection with new settings
      await services.ws.disconnect();
      await services.ws.connect();

      setSnackbar({
        open: true,
        message: 'Settings saved successfully',
        severity: 'success',
      });
    } catch (error: unknown) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to save settings',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <Grid container spacing={3}>
          {/* API Settings */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                API Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="API Key"
                    type="password"
                    value={apiSettings.apiKey}
                    onChange={handleApiSettingsChange('apiKey')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="API Secret"
                    type="password"
                    value={apiSettings.apiSecret}
                    onChange={handleApiSettingsChange('apiSecret')}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="API Endpoint"
                    value={apiSettings.apiEndpoint}
                    onChange={handleApiSettingsChange('apiEndpoint')}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="WebSocket Endpoint"
                    value={apiSettings.wsEndpoint}
                    onChange={handleApiSettingsChange('wsEndpoint')}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Trading Settings */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Trading Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Default Leverage"
                    type="number"
                    value={tradingSettings.defaultLeverage}
                    onChange={handleTradingSettingsChange('defaultLeverage')}
                    InputProps={{ inputProps: { min: 1, max: 100, step: 1 } }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Max Positions"
                    type="number"
                    value={tradingSettings.maxPositions}
                    onChange={handleTradingSettingsChange('maxPositions')}
                    InputProps={{ inputProps: { min: 1, max: 50 } }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Max Drawdown %"
                    type="number"
                    value={tradingSettings.maxDrawdown}
                    onChange={handleTradingSettingsChange('maxDrawdown')}
                    InputProps={{ inputProps: { min: 0, max: 100, step: 0.1 } }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={tradingSettings.enableTrailingStop}
                        onChange={handleTradingSettingsChange('enableTrailingStop')}
                      />
                    }
                    label="Enable Trailing Stop"
                  />
                </Grid>
                {tradingSettings.enableTrailingStop && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Default Trailing Distance %"
                      type="number"
                      value={tradingSettings.defaultTrailingDistance}
                      onChange={handleTradingSettingsChange('defaultTrailingDistance')}
                      InputProps={{ inputProps: { min: 0.1, step: 0.1 } }}
                    />
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>

          {/* Notification Settings */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Notification Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationSettings.enableEmailAlerts}
                        onChange={handleNotificationSettingsChange('enableEmailAlerts')}
                      />
                    }
                    label="Enable Email Alerts"
                  />
                </Grid>
                {notificationSettings.enableEmailAlerts && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      value={notificationSettings.emailAddress}
                      onChange={handleNotificationSettingsChange('emailAddress')}
                    />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationSettings.enablePushNotifications}
                        onChange={handleNotificationSettingsChange('enablePushNotifications')}
                      />
                    }
                    label="Enable Push Notifications"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationSettings.tradingAlerts}
                        onChange={handleNotificationSettingsChange('tradingAlerts')}
                      />
                    }
                    label="Trading Alerts"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationSettings.systemAlerts}
                        onChange={handleNotificationSettingsChange('systemAlerts')}
                      />
                    }
                    label="System Alerts"
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Save Button */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveSettings}
                size="large"
              >
                Save Settings
              </Button>
            </Box>
          </Grid>
        </Grid>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SettingsScreen; 