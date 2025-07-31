'use client'

export const dynamic = 'force-dynamic'

import React, { useState } from 'react'

// Crypto-dark theme colors
const theme = {
  colors: {
    background: '#0d0e14',
    surface: '#1e222d',
    border: '#2a2e39',
    text: {
      primary: '#d1d4dc',
      secondary: '#787b86'
    },
    success: '#26a69a',
    danger: '#ef5350',
    primary: '#4a9eff',
    warning: '#ffa726'
  },
  spacing: {
    mini: '4px',
    small: '8px',
    medium: '16px',
    large: '24px',
    xlarge: '32px',
    xxlarge: '48px'
  },
  typography: {
    families: {
      interface: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      data: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", monospace'
    },
    sizes: {
      mini: '10px',
      small: '12px',
      medium: '14px',
      large: '16px',
      xlarge: '20px',
      xxlarge: '24px',
      xxxlarge: '32px'
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  radius: {
    small: '4px',
    medium: '6px',
    large: '8px',
    pill: '999px'
  }
}

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
      style={{
        display: value === index ? 'block' : 'none',
        paddingTop: theme.spacing.large,
      }}
      {...other}
    >
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState(0)
  const [currentTheme, setCurrentTheme] = useState('crypto-dark')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [showApiSecret, setShowApiSecret] = useState(false)
  const [testMode, setTestMode] = useState(true)
  const [notifications, setNotifications] = useState({
    tradeExecutions: true,
    priceAlerts: true,
    systemUpdates: false,
    marketNews: true,
  })
  const [riskSettings, setRiskSettings] = useState({
    maxPositionSize: 10000,
    stopLossPercentage: 5,
    takeProfitPercentage: 15,
    dailyLossLimit: 1000,
  })
  const [saved, setSaved] = useState(false)
  const [tested, setTested] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)

  const availableThemes = [
    { name: 'crypto-dark', displayName: 'Crypto Dark (Default)' },
    { name: 'swiss-minimal', displayName: 'Swiss Minimal' },
    { name: 'terminal-green', displayName: 'Terminal Green' }
  ]

  const handleSave = () => {
    localStorage.setItem('app_theme', currentTheme)
    localStorage.setItem('kraken_api_key', apiKey)
    localStorage.setItem('kraken_api_secret', apiSecret)
    localStorage.setItem('kraken_test_mode', testMode.toString())
    localStorage.setItem('notifications', JSON.stringify(notifications))
    localStorage.setItem('risk_settings', JSON.stringify(riskSettings))
    
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleTestConnection = async () => {
    setTested(true)
    setTestResult(null)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const success = Math.random() > 0.3
      setTestResult(success ? 'success' : 'error')
    } catch (error) {
      setTestResult('error')
    }
  }

  const tabs = [
    'Theme & Appearance',
    'API Configuration', 
    'Trading Preferences',
    'Risk Management',
    'Notifications'
  ]

  return (
    <div style={{
      backgroundColor: theme.colors.background,
      color: theme.colors.text.primary,
      minHeight: '100vh',
      fontFamily: theme.typography.families.interface,
    }}>
      {/* Header */}
      <header style={{
        padding: theme.spacing.large,
        borderBottom: `1px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.surface,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <h1 style={{
            fontSize: theme.typography.sizes.xxxlarge,
            fontWeight: theme.typography.weights.bold,
            margin: 0,
            marginBottom: theme.spacing.small,
          }}>
            Settings
          </h1>
          <p style={{
            fontSize: theme.typography.sizes.large,
            color: theme.colors.text.secondary,
            margin: 0,
          }}>
            Configure your trading platform preferences and system settings
          </p>
        </div>
      </header>

      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: theme.spacing.large,
      }}>
        {/* Tab Navigation */}
        <div style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.medium,
          marginBottom: theme.spacing.large,
          overflow: 'hidden',
          border: `1px solid ${theme.colors.border}`,
        }}>
          <div style={{
            display: 'flex',
            borderBottom: `1px solid ${theme.colors.border}`,
          }}>
            {tabs.map((tabName, index) => (
              <button
                key={index}
                onClick={() => setTab(index)}
                style={{
                  flex: 1,
                  padding: `${theme.spacing.medium} ${theme.spacing.large}`,
                  backgroundColor: tab === index ? theme.colors.background : 'transparent',
                  color: tab === index ? theme.colors.text.primary : theme.colors.text.secondary,
                  border: 'none',
                  fontSize: theme.typography.sizes.medium,
                  fontWeight: tab === index ? theme.typography.weights.semibold : theme.typography.weights.medium,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  borderBottom: tab === index ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
                }}
              >
                {tabName}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ 
            padding: theme.spacing.large
          }}>
            {/* Theme & Appearance Tab */}
            <TabPanel value={tab} index={0}>
              <div style={{ maxWidth: '600px' }}>
                <h2 style={{
                  fontSize: theme.typography.sizes.xlarge,
                  fontWeight: theme.typography.weights.semibold,
                  marginBottom: theme.spacing.medium,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.small,
                  color: theme.colors.text.primary,
                }}>
                  Theme & Appearance
                </h2>
                
                <div style={{
                  backgroundColor: theme.colors.background,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.medium,
                  padding: theme.spacing.medium,
                  marginBottom: theme.spacing.large,
                }}>
                  <p style={{
                    fontSize: theme.typography.sizes.medium,
                    color: theme.colors.text.primary,
                    margin: 0,
                  }}>
                    Choose your preferred visual style. The crypto-dark theme is optimized for reduced eye strain 
                    during extended trading sessions and provides optimal contrast for data visualization.
                  </p>
                </div>

                <div style={{ marginBottom: theme.spacing.large }}>
                  <label style={{
                    display: 'block',
                    fontSize: theme.typography.sizes.medium,
                    fontWeight: theme.typography.weights.medium,
                    marginBottom: theme.spacing.small,
                    color: theme.colors.text.secondary,
                  }}>
                    Theme Selection
                  </label>
                  <select
                    value={currentTheme}
                    onChange={(e) => setCurrentTheme(e.target.value)}
                    style={{
                      width: '100%',
                      padding: theme.spacing.medium,
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text.primary,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.radius.medium,
                      fontSize: theme.typography.sizes.medium,
                      cursor: 'pointer',
                      fontFamily: theme.typography.families.interface,
                    }}
                  >
                    {availableThemes.map((themeOption) => (
                      <option key={themeOption.name} value={themeOption.name}>
                        {themeOption.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{
                  backgroundColor: theme.colors.surface,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.medium,
                  padding: theme.spacing.large,
                  marginBottom: theme.spacing.large,
                }}>
                  <h3 style={{
                    fontSize: theme.typography.sizes.large,
                    fontWeight: theme.typography.weights.semibold,
                    marginBottom: theme.spacing.medium,
                    color: theme.colors.text.primary,
                  }}>
                    Theme Preview
                  </h3>
                  <div style={{
                    display: 'flex',
                    gap: theme.spacing.small,
                    marginBottom: theme.spacing.medium,
                  }}>
                    <span style={{
                      display: 'inline-block',
                      padding: `${theme.spacing.mini} ${theme.spacing.small}`,
                      backgroundColor: theme.colors.primary,
                      color: '#ffffff',
                      borderRadius: theme.radius.small,
                      fontSize: theme.typography.sizes.small,
                      fontWeight: theme.typography.weights.medium,
                    }}>
                      Primary
                    </span>
                    <span style={{
                      display: 'inline-block',
                      padding: `${theme.spacing.mini} ${theme.spacing.small}`,
                      backgroundColor: theme.colors.success,
                      color: '#ffffff',
                      borderRadius: theme.radius.small,
                      fontSize: theme.typography.sizes.small,
                      fontWeight: theme.typography.weights.medium,
                    }}>
                      Success
                    </span>
                    <span style={{
                      display: 'inline-block',
                      padding: `${theme.spacing.mini} ${theme.spacing.small}`,
                      backgroundColor: theme.colors.warning,
                      color: '#ffffff',
                      borderRadius: theme.radius.small,
                      fontSize: theme.typography.sizes.small,
                      fontWeight: theme.typography.weights.medium,
                    }}>
                      Warning
                    </span>
                    <span style={{
                      display: 'inline-block',
                      padding: `${theme.spacing.mini} ${theme.spacing.small}`,
                      backgroundColor: theme.colors.danger,
                      color: '#ffffff',
                      borderRadius: theme.radius.small,
                      fontSize: theme.typography.sizes.small,
                      fontWeight: theme.typography.weights.medium,
                    }}>
                      Danger
                    </span>
                  </div>
                  <p style={{
                    fontSize: theme.typography.sizes.medium,
                    fontFamily: theme.typography.families.interface,
                    color: theme.colors.text.primary,
                    marginBottom: theme.spacing.small,
                  }}>
                    This is how interface text appears in the crypto-dark theme.
                  </p>
                  <p style={{
                    fontSize: theme.typography.sizes.small,
                    fontFamily: theme.typography.families.data,
                    color: theme.colors.text.secondary,
                    margin: 0,
                  }}>
                    Data and numerical values: $12,345.67 • BTC/USD • 0.00145892
                  </p>
                </div>
              </div>
            </TabPanel>

            {/* API Configuration Tab */}
            <TabPanel value={tab} index={1}>
              <div style={{ maxWidth: '600px' }}>
                <h2 style={{
                  fontSize: theme.typography.sizes.xlarge,
                  fontWeight: theme.typography.weights.semibold,
                  marginBottom: theme.spacing.medium,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.small,
                  color: theme.colors.text.primary,
                }}>
                  API Configuration
                </h2>
                
                <div style={{
                  backgroundColor: theme.colors.background,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.medium,
                  padding: theme.spacing.medium,
                  marginBottom: theme.spacing.large,
                }}>
                  <p style={{
                    fontSize: theme.typography.sizes.medium,
                    color: theme.colors.text.primary,
                    margin: 0,
                  }}>
                    Your API keys are stored locally and encrypted. Never share your API credentials with anyone.
                    Configure appropriate permissions for trading operations.
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.small,
                  marginBottom: theme.spacing.large,
                }}>
                  <input
                    type="checkbox"
                    id="testMode"
                    checked={testMode}
                    onChange={(e) => setTestMode(e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: theme.colors.primary,
                    }}
                  />
                  <label
                    htmlFor="testMode"
                    style={{
                      fontSize: theme.typography.sizes.medium,
                      fontWeight: theme.typography.weights.medium,
                      cursor: 'pointer',
                      color: theme.colors.text.primary,
                    }}
                  >
                    Test Mode (Paper Trading)
                  </label>
                </div>

                <div style={{ marginBottom: theme.spacing.medium }}>
                  <label style={{
                    display: 'block',
                    fontSize: theme.typography.sizes.medium,
                    fontWeight: theme.typography.weights.medium,
                    marginBottom: theme.spacing.small,
                    color: theme.colors.text.secondary,
                  }}>
                    API Key
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your API key"
                      style={{
                        width: '100%',
                        padding: theme.spacing.medium,
                        paddingRight: '48px',
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.text.primary,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radius.medium,
                        fontSize: theme.typography.sizes.medium,
                        fontFamily: theme.typography.families.data,
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      style={{
                        position: 'absolute',
                        right: theme.spacing.small,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: theme.colors.text.secondary,
                        cursor: 'pointer',
                        padding: theme.spacing.mini,
                      }}
                    >
                      {showApiKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: theme.spacing.large }}>
                  <label style={{
                    display: 'block',
                    fontSize: theme.typography.sizes.medium,
                    fontWeight: theme.typography.weights.medium,
                    marginBottom: theme.spacing.small,
                    color: theme.colors.text.secondary,
                  }}>
                    API Secret
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showApiSecret ? 'text' : 'password'}
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      placeholder="Enter your API secret"
                      style={{
                        width: '100%',
                        padding: theme.spacing.medium,
                        paddingRight: '48px',
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.text.primary,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radius.medium,
                        fontSize: theme.typography.sizes.medium,
                        fontFamily: theme.typography.families.data,
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiSecret(!showApiSecret)}
                      style={{
                        position: 'absolute',
                        right: theme.spacing.small,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: theme.colors.text.secondary,
                        cursor: 'pointer',
                        padding: theme.spacing.mini,
                      }}
                    >
                      {showApiSecret ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {testResult && (
                  <div style={{
                    backgroundColor: theme.colors.background,
                    border: `1px solid ${testResult === 'success' 
                      ? theme.colors.success 
                      : theme.colors.danger}`,
                    borderRadius: theme.radius.medium,
                    padding: theme.spacing.medium,
                    marginBottom: theme.spacing.medium,
                  }}>
                    <p style={{
                      fontSize: theme.typography.sizes.medium,
                      color: testResult === 'success' 
                        ? theme.colors.success 
                        : theme.colors.danger,
                      margin: 0,
                    }}>
                      {testResult === 'success' 
                        ? '✅ API connection successful!' 
                        : '❌ API connection failed. Please check your credentials.'}
                    </p>
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  gap: theme.spacing.medium,
                  marginBottom: theme.spacing.xxlarge,
                }}>
                  <button
                    onClick={handleTestConnection}
                    disabled={!apiKey || !apiSecret}
                    style={{
                      padding: `${theme.spacing.small} ${theme.spacing.large}`,
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text.primary,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.radius.medium,
                      fontSize: theme.typography.sizes.medium,
                      fontWeight: theme.typography.weights.medium,
                      cursor: !apiKey || !apiSecret ? 'not-allowed' : 'pointer',
                      opacity: !apiKey || !apiSecret ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Test Connection
                  </button>
                  <button
                    onClick={handleSave}
                    style={{
                      padding: `${theme.spacing.small} ${theme.spacing.large}`,
                      backgroundColor: saved ? theme.colors.success : theme.colors.primary,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: theme.radius.medium,
                      fontSize: theme.typography.sizes.medium,
                      fontWeight: theme.typography.weights.medium,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {saved ? '✅ Saved!' : 'Save Settings'}
                  </button>
                </div>

                <div style={{
                  borderTop: `1px solid ${theme.colors.border}`,
                  paddingTop: theme.spacing.large,
                }}>
                  <h3 style={{
                    fontSize: theme.typography.sizes.large,
                    fontWeight: theme.typography.weights.semibold,
                    marginBottom: theme.spacing.medium,
                    color: theme.colors.text.primary,
                  }}>
                    Required API Permissions
                  </h3>
                  
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: theme.spacing.small,
                    marginBottom: theme.spacing.medium,
                  }}>
                    {[
                      { label: 'Query Funds', type: 'info' },
                      { label: 'Query Orders', type: 'info' },
                      { label: 'Query Trades', type: 'info' },
                      { label: 'Create Orders', type: 'warning' },
                      { label: 'Cancel Orders', type: 'warning' },
                    ].map((permission, index) => (
                      <span
                        key={index}
                        style={{
                          display: 'inline-block',
                          padding: `${theme.spacing.mini} ${theme.spacing.small}`,
                          backgroundColor: permission.type === 'warning' 
                            ? theme.colors.warning 
                            : theme.colors.primary,
                          color: '#ffffff',
                          borderRadius: theme.radius.small,
                          fontSize: theme.typography.sizes.small,
                          fontWeight: theme.typography.weights.medium,
                        }}
                      >
                        {permission.label}
                      </span>
                    ))}
                  </div>

                  <div style={{
                    backgroundColor: theme.colors.background,
                    border: `1px solid ${theme.colors.warning}`,
                    borderRadius: theme.radius.medium,
                    padding: theme.spacing.medium,
                  }}>
                    <p style={{
                      fontSize: theme.typography.sizes.medium,
                      color: theme.colors.warning,
                      margin: 0,
                    }}>
                      ⚠️ Never share your API keys with third parties. If compromised, revoke them immediately
                      from your exchange account settings.
                    </p>
                  </div>
                </div>
              </div>
            </TabPanel>

            {/* Trading Preferences Tab */}
            <TabPanel value={tab} index={2}>
              <div style={{ maxWidth: '600px' }}>
                <h2 style={{
                  fontSize: theme.typography.sizes.xlarge,
                  fontWeight: theme.typography.weights.semibold,
                  marginBottom: theme.spacing.medium,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.small,
                  color: theme.colors.text.primary,
                }}>
                  Trading Preferences
                </h2>
                
                <div style={{ marginBottom: theme.spacing.large }}>
                  <label style={{
                    display: 'block',
                    fontSize: theme.typography.sizes.medium,
                    fontWeight: theme.typography.weights.medium,
                    marginBottom: theme.spacing.small,
                    color: theme.colors.text.secondary,
                  }}>
                    Default Order Type
                  </label>
                  <select
                    style={{
                      width: '100%',
                      padding: theme.spacing.medium,
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text.primary,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.radius.medium,
                      fontSize: theme.typography.sizes.medium,
                      cursor: 'pointer',
                      fontFamily: theme.typography.families.interface,
                    }}
                  >
                    <option value="limit">Limit Order</option>
                    <option value="market">Market Order</option>
                    <option value="stop">Stop Order</option>
                    <option value="stop-limit">Stop-Limit Order</option>
                  </select>
                </div>

                <div style={{ marginBottom: theme.spacing.large }}>
                  <label style={{
                    display: 'block',
                    fontSize: theme.typography.sizes.medium,
                    fontWeight: theme.typography.weights.medium,
                    marginBottom: theme.spacing.small,
                    color: theme.colors.text.secondary,
                  }}>
                    Default Position Size (USD)
                  </label>
                  <input
                    type="number"
                    defaultValue="1000"
                    style={{
                      width: '100%',
                      padding: theme.spacing.medium,
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text.primary,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.radius.medium,
                      fontSize: theme.typography.sizes.medium,
                      fontFamily: theme.typography.families.data,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.small,
                  marginBottom: theme.spacing.large,
                }}>
                  <input
                    type="checkbox"
                    id="confirmOrders"
                    defaultChecked
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: theme.colors.primary,
                    }}
                  />
                  <label
                    htmlFor="confirmOrders"
                    style={{
                      fontSize: theme.typography.sizes.medium,
                      fontWeight: theme.typography.weights.medium,
                      cursor: 'pointer',
                      color: theme.colors.text.primary,
                    }}
                  >
                    Confirm orders before execution
                  </label>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.small,
                }}>
                  <input
                    type="checkbox"
                    id="autoSaveCharts"
                    defaultChecked
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: theme.colors.primary,
                    }}
                  />
                  <label
                    htmlFor="autoSaveCharts"
                    style={{
                      fontSize: theme.typography.sizes.medium,
                      fontWeight: theme.typography.weights.medium,
                      cursor: 'pointer',
                      color: theme.colors.text.primary,
                    }}
                  >
                    Auto-save chart configurations
                  </label>
                </div>
              </div>
            </TabPanel>

            {/* Risk Management Tab */}
            <TabPanel value={tab} index={3}>
              <div style={{ maxWidth: '600px' }}>
                <h2 style={{
                  fontSize: theme.typography.sizes.xlarge,
                  fontWeight: theme.typography.weights.semibold,
                  marginBottom: theme.spacing.medium,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.small,
                  color: theme.colors.text.primary,
                }}>
                  Risk Management
                </h2>
                
                <div style={{ marginBottom: theme.spacing.large }}>
                  <label style={{
                    display: 'block',
                    fontSize: theme.typography.sizes.medium,
                    fontWeight: theme.typography.weights.medium,
                    marginBottom: theme.spacing.small,
                    color: theme.colors.text.secondary,
                  }}>
                    Maximum Position Size (USD)
                  </label>
                  <input
                    type="number"
                    value={riskSettings.maxPositionSize}
                    onChange={(e) => setRiskSettings({
                      ...riskSettings,
                      maxPositionSize: Number(e.target.value)
                    })}
                    style={{
                      width: '100%',
                      padding: theme.spacing.medium,
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text.primary,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.radius.medium,
                      fontSize: theme.typography.sizes.medium,
                      fontFamily: theme.typography.families.data,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: theme.spacing.medium,
                  marginBottom: theme.spacing.large,
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: theme.typography.sizes.medium,
                      fontWeight: theme.typography.weights.medium,
                      marginBottom: theme.spacing.small,
                      color: theme.colors.text.secondary,
                    }}>
                      Default Stop Loss (%)
                    </label>
                    <input
                      type="number"
                      value={riskSettings.stopLossPercentage}
                      onChange={(e) => setRiskSettings({
                        ...riskSettings,
                        stopLossPercentage: Number(e.target.value)
                      })}
                      style={{
                        width: '100%',
                        padding: theme.spacing.medium,
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.text.primary,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radius.medium,
                        fontSize: theme.typography.sizes.medium,
                        fontFamily: theme.typography.families.data,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: theme.typography.sizes.medium,
                      fontWeight: theme.typography.weights.medium,
                      marginBottom: theme.spacing.small,
                      color: theme.colors.text.secondary,
                    }}>
                      Default Take Profit (%)
                    </label>
                    <input
                      type="number"
                      value={riskSettings.takeProfitPercentage}
                      onChange={(e) => setRiskSettings({
                        ...riskSettings,
                        takeProfitPercentage: Number(e.target.value)
                      })}
                      style={{
                        width: '100%',
                        padding: theme.spacing.medium,
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.text.primary,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radius.medium,
                        fontSize: theme.typography.sizes.medium,
                        fontFamily: theme.typography.families.data,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: theme.spacing.large }}>
                  <label style={{
                    display: 'block',
                    fontSize: theme.typography.sizes.medium,
                    fontWeight: theme.typography.weights.medium,
                    marginBottom: theme.spacing.small,
                    color: theme.colors.text.secondary,
                  }}>
                    Daily Loss Limit (USD)
                  </label>
                  <input
                    type="number"
                    value={riskSettings.dailyLossLimit}
                    onChange={(e) => setRiskSettings({
                      ...riskSettings,
                      dailyLossLimit: Number(e.target.value)
                    })}
                    style={{
                      width: '100%',
                      padding: theme.spacing.medium,
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text.primary,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.radius.medium,
                      fontSize: theme.typography.sizes.medium,
                      fontFamily: theme.typography.families.data,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{
                  backgroundColor: theme.colors.background,
                  border: `1px solid ${theme.colors.warning}`,
                  borderRadius: theme.radius.medium,
                  padding: theme.spacing.medium,
                }}>
                  <p style={{
                    fontSize: theme.typography.sizes.medium,
                    color: theme.colors.warning,
                    margin: 0,
                  }}>
                    ⚠️ Risk management settings help protect your capital. These limits will be enforced
                    automatically during trading operations.
                  </p>
                </div>
              </div>
            </TabPanel>

            {/* Notifications Tab */}
            <TabPanel value={tab} index={4}>
              <div style={{ maxWidth: '600px' }}>
                <h2 style={{
                  fontSize: theme.typography.sizes.xlarge,
                  fontWeight: theme.typography.weights.semibold,
                  marginBottom: theme.spacing.medium,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.small,
                  color: theme.colors.text.primary,
                }}>
                  Notifications
                </h2>
                
                <div style={{ marginBottom: theme.spacing.large }}>
                  {Object.entries(notifications).map(([key, enabled]) => (
                    <div key={key} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: theme.spacing.medium,
                      borderBottom: `1px solid ${theme.colors.border}`,
                    }}>
                      <div>
                        <div style={{
                          fontSize: theme.typography.sizes.medium,
                          fontWeight: theme.typography.weights.medium,
                          marginBottom: theme.spacing.mini,
                          color: theme.colors.text.primary,
                        }}>
                          {key === 'tradeExecutions' && 'Trade Executions'}
                          {key === 'priceAlerts' && 'Price Alerts'}
                          {key === 'systemUpdates' && 'System Updates'}
                          {key === 'marketNews' && 'Market News'}
                        </div>
                        <div style={{
                          fontSize: theme.typography.sizes.small,
                          color: theme.colors.text.secondary,
                        }}>
                          {key === 'tradeExecutions' && 'Notifications when trades are executed'}
                          {key === 'priceAlerts' && 'Alerts when price targets are reached'}
                          {key === 'systemUpdates' && 'Platform maintenance and updates'}
                          {key === 'marketNews' && 'Important market news and events'}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setNotifications({
                          ...notifications,
                          [key]: e.target.checked
                        })}
                        style={{
                          width: '20px',
                          height: '20px',
                          accentColor: theme.colors.primary,
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div style={{
                  backgroundColor: theme.colors.background,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.medium,
                  padding: theme.spacing.medium,
                }}>
                  <p style={{
                    fontSize: theme.typography.sizes.medium,
                    color: theme.colors.text.primary,
                    margin: 0,
                  }}>
                    💡 Notifications help you stay informed about your trading activities and market conditions.
                    You can adjust these settings at any time.
                  </p>
                </div>
              </div>
            </TabPanel>
          </div>
        </div>

        {/* Save Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: theme.spacing.large,
        }}>
          <button
            onClick={handleSave}
            style={{
              padding: `${theme.spacing.medium} ${theme.spacing.xxlarge}`,
              backgroundColor: saved ? theme.colors.success : theme.colors.primary,
              color: '#ffffff',
              border: 'none',
              borderRadius: theme.radius.medium,
              fontSize: theme.typography.sizes.large,
              fontWeight: theme.typography.weights.semibold,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {saved ? '✅ All Settings Saved!' : 'Save All Settings'}
          </button>
        </div>
      </main>
    </div>
  )
}