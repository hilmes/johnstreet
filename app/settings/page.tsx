'use client'

import React, { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  IconButton,
  InputAdornment,
  Chip,
  FormControlLabel,
  Switch,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Card,
  CardContent,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Key,
  Save,
  Check,
  Warning,
  Palette as PaletteIcon,
} from '@mui/icons-material'
import { useTheme, ThemeName } from '@/contexts/ThemeContext'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export default function SettingsPage() {
  const { currentTheme, setTheme, availableThemes } = useTheme()
  const [tab, setTab] = useState(0)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [showApiSecret, setShowApiSecret] = useState(false)
  const [testMode, setTestMode] = useState(true)
  const [saved, setSaved] = useState(false)
  const [tested, setTested] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)

  const handleSave = () => {
    // TODO: Implement secure API key storage
    localStorage.setItem('kraken_api_key', apiKey)
    localStorage.setItem('kraken_api_secret', apiSecret)
    localStorage.setItem('kraken_test_mode', testMode.toString())
    
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleTestConnection = async () => {
    setTested(true)
    setTestResult(null)
    
    try {
      // TODO: Implement actual API connection test
      const response = await fetch('/api/kraken/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiSecret, testMode })
      })
      
      if (response.ok) {
        setTestResult('success')
      } else {
        setTestResult('error')
      }
    } catch (error) {
      setTestResult('error')
    }
  }

  const handleThemeChange = (themeName: string) => {
    setTheme(themeName as ThemeName)
  }

  const getThemePreview = (themeName: ThemeName) => {
    const colors = {
      cryptowatch: { primary: '#2962ff', bg: '#131722' },
      cyberpunk: { primary: '#00f5ff', bg: '#0f0f23' },
      'financial-excellence': { primary: '#2e3b5f', bg: '#fafafa' },
      'financial-excellence-dark': { primary: '#5b7dd8', bg: '#000000' }
    }
    return colors[themeName]
  }

  return (
    <div className="px-2 sm:px-3 md:px-4 lg:px-5 py-4 min-h-screen w-full">

      <Paper sx={{ mt: 3 }}>
        <Tabs
          value={tab}
          onChange={(e, newValue) => setTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Theme & Appearance" />
          <Tab label="API Configuration" />
          <Tab label="Trading Preferences" />
          <Tab label="Risk Management" />
          <Tab label="Notifications" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TabPanel value={tab} index={0}>
            <Box sx={{ maxWidth: 600 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <PaletteIcon sx={{ mr: 1 }} />
                Theme & Appearance
              </Typography>
              
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Choose your preferred visual style. The CryptoWatch theme provides a professional trading interface,
                  while the Cyberpunk theme offers a retro 8-bit aesthetic.
                </Typography>
              </Alert>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={currentTheme.name}
                  onChange={(e) => handleThemeChange(e.target.value)}
                  label="Theme"
                >
                  {availableThemes.map((theme) => (
                    <MenuItem key={theme.name} value={theme.name}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          sx={{
                            width: 24,
                            height: 24,
                            bgcolor: getThemePreview(theme.name).primary,
                            border: `2px solid ${getThemePreview(theme.name).bg}`
                          }}
                        />
                        {theme.displayName}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Current theme: <strong>{currentTheme.displayName}</strong>
              </Typography>

              {/* Theme Preview */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Theme Preview
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip 
                      label="Primary" 
                      size="small" 
                      sx={{ 
                        bgcolor: currentTheme.colors.primary, 
                        color: 'white'
                      }} 
                    />
                    <Chip 
                      label="Success" 
                      size="small" 
                      sx={{ 
                        bgcolor: currentTheme.colors.success, 
                        color: 'white'
                      }} 
                    />
                    <Chip 
                      label="Error" 
                      size="small" 
                      sx={{ 
                        bgcolor: currentTheme.colors.error, 
                        color: 'white'
                      }} 
                    />
                  </Box>
                  <Typography 
                    variant="body2"
                    sx={{ 
                      fontFamily: currentTheme.fonts.primary,
                      color: currentTheme.colors.text
                    }}
                  >
                    This is how text appears in the {currentTheme.displayName} theme.
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: currentTheme.colors.textSecondary,
                      fontFamily: currentTheme.fonts.secondary,
                      display: 'block',
                      mt: 1
                    }}
                  >
                    Secondary text and monospace font preview
                  </Typography>
                </CardContent>
              </Card>

              <Typography variant="h6" gutterBottom>
                Theme Features
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {currentTheme.effects.glow && (
                  <Chip label="Glow Effects" size="small" color="primary" />
                )}
                {currentTheme.effects.scanlines && (
                  <Chip label="Scanlines" size="small" color="primary" />
                )}
                {currentTheme.effects.pixelated && (
                  <Chip label="Pixelated" size="small" color="primary" />
                )}
                {!currentTheme.effects.glow && !currentTheme.effects.scanlines && !currentTheme.effects.pixelated && (
                  <Chip label="Clean & Professional" size="small" color="primary" />
                )}
              </Box>
            </Box>
          </TabPanel>

          <TabPanel value={tab} index={1}>
            <Box sx={{ maxWidth: 600 }}>
              <Typography variant="h6" gutterBottom>
                Kraken API Configuration
              </Typography>
              
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Your API keys are stored locally and never sent to our servers.
                  Make sure to use API keys with appropriate permissions.
                </Typography>
              </Alert>

              <FormControlLabel
                control={
                  <Switch
                    checked={testMode}
                    onChange={(e) => setTestMode(e.target.checked)}
                  />
                }
                label="Test Mode (Paper Trading)"
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                label="API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type={showApiKey ? 'text' : 'password'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowApiKey(!showApiKey)}
                        edge="end"
                      >
                        {showApiKey ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  startAdornment: (
                    <InputAdornment position="start">
                      <Key />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="API Secret"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                type={showApiSecret ? 'text' : 'password'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowApiSecret(!showApiSecret)}
                        edge="end"
                      >
                        {showApiSecret ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  startAdornment: (
                    <InputAdornment position="start">
                      <Key />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />

              {testResult && (
                <Alert 
                  severity={testResult === 'success' ? 'success' : 'error'} 
                  sx={{ mb: 2 }}
                >
                  {testResult === 'success' 
                    ? 'API connection successful!' 
                    : 'API connection failed. Please check your credentials.'}
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleTestConnection}
                  disabled={!apiKey || !apiSecret}
                >
                  Test Connection
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  startIcon={saved ? <Check /> : <Save />}
                  sx={{
                    backgroundColor: saved ? '#00CC66' : '#6563FF',
                    '&:hover': {
                      backgroundColor: saved ? '#00AA55' : '#5553DD',
                    },
                  }}
                >
                  {saved ? 'Saved!' : 'Save Settings'}
                </Button>
              </Box>

              <Divider sx={{ my: 4 }} />

              <Typography variant="h6" gutterBottom>
                API Permissions Required
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                <Chip label="Query Funds" color="primary" size="small" />
                <Chip label="Query Orders" color="primary" size="small" />
                <Chip label="Query Trades" color="primary" size="small" />
                <Chip label="Create & Modify Orders" color="warning" size="small" />
                <Chip label="Cancel Orders" color="warning" size="small" />
              </Box>

              <Alert severity="warning" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  Never share your API keys with anyone. If you suspect your keys have been compromised,
                  disable them immediately in your Kraken account settings.
                </Typography>
              </Alert>
            </Box>
          </TabPanel>

          <TabPanel value={tab} index={2}>
            <Typography variant="h6" gutterBottom>
              Trading Preferences
            </Typography>
            <Typography color="text.secondary">
              Configure your default trading settings and preferences.
            </Typography>
          </TabPanel>

          <TabPanel value={tab} index={3}>
            <Typography variant="h6" gutterBottom>
              Risk Management
            </Typography>
            <Typography color="text.secondary">
              Set up position limits, stop losses, and risk parameters.
            </Typography>
          </TabPanel>

          <TabPanel value={tab} index={4}>
            <Typography variant="h6" gutterBottom>
              Notifications
            </Typography>
            <Typography color="text.secondary">
              Configure alerts and notifications for your trading activities.
            </Typography>
          </TabPanel>
        </Box>
      </Paper>
    </div>
  )
}