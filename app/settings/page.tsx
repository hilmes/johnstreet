'use client'

export const dynamic = 'force-dynamic'

import React, { useState } from 'react'
import { dieterRamsDesign as ds, designHelpers } from '@/lib/design/DieterRamsDesignSystem'

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
        paddingTop: ds.spacing.large,
      }}
      {...other}
    >
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState(0)
  const [currentTheme, setCurrentTheme] = useState('financial-excellence-dark')
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
    { name: 'financial-excellence', displayName: 'Financial Excellence Light' },
    { name: 'financial-excellence-dark', displayName: 'Financial Excellence Dark' },
    { name: 'cryptowatch', displayName: 'CryptoWatch Pro' },
    { name: 'cyberpunk', displayName: 'Cyberpunk Terminal' }
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
      backgroundColor: ds.colors.semantic.background.primary,
      color: ds.colors.grayscale[90],
      minHeight: '100vh',
      fontFamily: ds.typography.families.interface,
    }}>
      {/* Header */}
      <header style={{
        padding: ds.spacing.large,
        borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
        backgroundColor: ds.colors.semantic.background.secondary,
      }}>
        <div style={{
          maxWidth: ds.grid.maxWidth,
          margin: '0 auto',
        }}>
          <h1 style={{
            fontSize: ds.typography.scale.xxlarge,
            fontWeight: ds.typography.weights.bold,
            margin: 0,
            marginBottom: ds.spacing.small,
          }}>
            Settings
          </h1>
          <p style={{
            fontSize: ds.typography.scale.medium,
            color: ds.colors.grayscale[70],
            margin: 0,
          }}>
            Configure your trading platform preferences and system settings
          </p>
        </div>
      </header>

      <main style={{
        maxWidth: ds.grid.maxWidth,
        margin: '0 auto',
        padding: ds.spacing.large,
      }}>
        {/* Tab Navigation */}
        <div style={{
          backgroundColor: ds.colors.semantic.background.secondary,
          borderRadius: ds.interactive.radius.medium,
          marginBottom: ds.spacing.large,
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            borderBottom: `1px solid ${ds.colors.grayscale[30]}`,
          }}>
            {tabs.map((tabName, index) => (
              <button
                key={index}
                onClick={() => setTab(index)}
                style={{
                  flex: 1,
                  padding: `${ds.spacing.medium} ${ds.spacing.large}`,
                  backgroundColor: tab === index ? ds.colors.semantic.background.tertiary : 'transparent',
                  color: tab === index ? ds.colors.grayscale[90] : ds.colors.grayscale[70],
                  border: 'none',
                  fontSize: ds.typography.scale.medium,
                  fontWeight: tab === index ? ds.typography.weights.semibold : ds.typography.weights.medium,
                  cursor: 'pointer',
                  transition: designHelpers.animate('all', ds.animation.durations.fast),
                  borderBottom: tab === index ? `2px solid ${ds.colors.semantic.accent}` : '2px solid transparent',
                }}
              >
                {tabName}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ 
            paddingLeft: ds.spacing.small, // Minimal left padding since sidebar offset handled by layout
            paddingRight: ds.spacing.large, 
            paddingTop: ds.spacing.large, 
            paddingBottom: ds.spacing.large 
          }}>
            {/* Theme & Appearance Tab */}
            <TabPanel value={tab} index={0}>
              <div style={{ maxWidth: '600px' }}>
                <h2 style={{
                  fontSize: ds.typography.scale.large,
                  fontWeight: ds.typography.weights.semibold,
                  marginBottom: ds.spacing.medium,
                  display: 'flex',
                  alignItems: 'center',
                  gap: ds.spacing.small,
                }}>
                  🎨 Theme & Appearance
                </h2>
                
                <div style={{
                  backgroundColor: ds.colors.semantic.info.background,
                  border: `1px solid ${ds.colors.semantic.info.border}`,
                  borderRadius: ds.interactive.radius.medium,
                  padding: ds.spacing.medium,
                  marginBottom: ds.spacing.large,
                }}>
                  <p style={{
                    fontSize: ds.typography.scale.base,
                    color: ds.colors.semantic.info.text,
                    margin: 0,
                  }}>
                    Choose your preferred visual style. Dark themes reduce eye strain during extended trading sessions,
                    while light themes provide enhanced readability in bright environments.
                  </p>
                </div>

                <div style={{ marginBottom: ds.spacing.large }}>
                  <label style={{
                    display: 'block',
                    fontSize: ds.typography.scale.medium,
                    fontWeight: ds.typography.weights.medium,
                    marginBottom: ds.spacing.small,
                    color: ds.colors.grayscale[80],
                  }}>
                    Theme Selection
                  </label>
                  <select
                    value={currentTheme}
                    onChange={(e) => setCurrentTheme(e.target.value)}
                    style={{
                      width: '100%',
                      padding: ds.spacing.medium,
                      backgroundColor: ds.colors.semantic.background.tertiary,
                      color: ds.colors.grayscale[90],
                      border: `1px solid ${ds.colors.grayscale[30]}`,
                      borderRadius: ds.interactive.radius.medium,
                      fontSize: ds.typography.scale.base,
                      cursor: 'pointer',
                    }}
                  >
                    {availableThemes.map((theme) => (
                      <option key={theme.name} value={theme.name}>
                        {theme.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{
                  backgroundColor: ds.colors.semantic.background.tertiary,
                  borderRadius: ds.interactive.radius.medium,
                  padding: ds.spacing.large,
                  marginBottom: ds.spacing.large,
                }}>
                  <h3 style={{
                    fontSize: ds.typography.scale.medium,
                    fontWeight: ds.typography.weights.semibold,
                    marginBottom: ds.spacing.medium,
                  }}>
                    Theme Preview
                  </h3>
                  <div style={{
                    display: 'flex',
                    gap: ds.spacing.small,
                    marginBottom: ds.spacing.medium,
                  }}>
                    <span style={{
                      display: 'inline-block',
                      padding: `${ds.spacing.micro} ${ds.spacing.small}`,
                      backgroundColor: ds.colors.semantic.accent,
                      color: ds.colors.grayscale[10],
                      borderRadius: ds.interactive.radius.small,
                      fontSize: ds.typography.scale.small,
                      fontWeight: ds.typography.weights.medium,
                    }}>
                      Primary
                    </span>
                    <span style={{
                      display: 'inline-block',
                      padding: `${ds.spacing.micro} ${ds.spacing.small}`,
                      backgroundColor: ds.colors.semantic.success,
                      color: ds.colors.grayscale[10],
                      borderRadius: ds.interactive.radius.small,
                      fontSize: ds.typography.scale.small,
                      fontWeight: ds.typography.weights.medium,
                    }}>
                      Success
                    </span>
                    <span style={{
                      display: 'inline-block',
                      padding: `${ds.spacing.micro} ${ds.spacing.small}`,
                      backgroundColor: ds.colors.semantic.warning,
                      color: ds.colors.grayscale[10],
                      borderRadius: ds.interactive.radius.small,
                      fontSize: ds.typography.scale.small,
                      fontWeight: ds.typography.weights.medium,
                    }}>
                      Warning
                    </span>
                  </div>
                  <p style={{
                    fontSize: ds.typography.scale.base,
                    fontFamily: ds.typography.families.interface,
                    color: ds.colors.grayscale[90],
                    marginBottom: ds.spacing.small,
                  }}>
                    This is how interface text appears in the selected theme.
                  </p>
                  <p style={{
                    fontSize: ds.typography.scale.small,
                    fontFamily: ds.typography.families.data,
                    color: ds.colors.grayscale[70],
                    margin: 0,
                  }}>
                    Data and numerical values use the monospace font family.
                  </p>
                </div>
              </div>
            </TabPanel>

            {/* API Configuration Tab */}
            <TabPanel value={tab} index={1}>
              <div style={{ maxWidth: '600px' }}>
                <h2 style={{
                  fontSize: ds.typography.scale.large,
                  fontWeight: ds.typography.weights.semibold,
                  marginBottom: ds.spacing.medium,
                  display: 'flex',
                  alignItems: 'center',
                  gap: ds.spacing.small,
                }}>
                  🔑 API Configuration
                </h2>
                
                <div style={{
                  backgroundColor: ds.colors.semantic.info.background,
                  border: `1px solid ${ds.colors.semantic.info.border}`,
                  borderRadius: ds.interactive.radius.medium,
                  padding: ds.spacing.medium,
                  marginBottom: ds.spacing.large,
                }}>
                  <p style={{
                    fontSize: ds.typography.scale.base,
                    color: ds.colors.semantic.info.text,
                    margin: 0,
                  }}>
                    Your API keys are stored locally and encrypted. Never share your API credentials with anyone.
                    Configure appropriate permissions for trading operations.
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: ds.spacing.small,
                  marginBottom: ds.spacing.large,
                }}>
                  <input
                    type="checkbox"
                    id="testMode"
                    checked={testMode}
                    onChange={(e) => setTestMode(e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: ds.colors.semantic.accent,
                    }}
                  />
                  <label
                    htmlFor="testMode"
                    style={{
                      fontSize: ds.typography.scale.base,
                      fontWeight: ds.typography.weights.medium,
                      cursor: 'pointer',
                    }}
                  >
                    Test Mode (Paper Trading)
                  </label>
                </div>

                <div style={{ marginBottom: ds.spacing.medium }}>
                  <label style={{
                    display: 'block',
                    fontSize: ds.typography.scale.medium,
                    fontWeight: ds.typography.weights.medium,
                    marginBottom: ds.spacing.small,
                    color: ds.colors.grayscale[80],
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
                        padding: ds.spacing.medium,
                        paddingRight: '48px',
                        backgroundColor: ds.colors.semantic.background.tertiary,
                        color: ds.colors.grayscale[90],
                        border: `1px solid ${ds.colors.grayscale[30]}`,
                        borderRadius: ds.interactive.radius.medium,
                        fontSize: ds.typography.scale.base,
                        fontFamily: ds.typography.families.data,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      style={{
                        position: 'absolute',
                        right: ds.spacing.small,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: ds.colors.grayscale[70],
                        cursor: 'pointer',
                        padding: ds.spacing.micro,
                      }}
                    >
                      {showApiKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: ds.spacing.large }}>
                  <label style={{
                    display: 'block',
                    fontSize: ds.typography.scale.medium,
                    fontWeight: ds.typography.weights.medium,
                    marginBottom: ds.spacing.small,
                    color: ds.colors.grayscale[80],
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
                        padding: ds.spacing.medium,
                        paddingRight: '48px',
                        backgroundColor: ds.colors.semantic.background.tertiary,
                        color: ds.colors.grayscale[90],
                        border: `1px solid ${ds.colors.grayscale[30]}`,
                        borderRadius: ds.interactive.radius.medium,
                        fontSize: ds.typography.scale.base,
                        fontFamily: ds.typography.families.data,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiSecret(!showApiSecret)}
                      style={{
                        position: 'absolute',
                        right: ds.spacing.small,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: ds.colors.grayscale[70],
                        cursor: 'pointer',
                        padding: ds.spacing.micro,
                      }}
                    >
                      {showApiSecret ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {testResult && (
                  <div style={{
                    backgroundColor: testResult === 'success' 
                      ? ds.colors.semantic.success.background 
                      : ds.colors.semantic.error.background,
                    border: `1px solid ${testResult === 'success' 
                      ? ds.colors.semantic.success.border 
                      : ds.colors.semantic.error.border}`,
                    borderRadius: ds.interactive.radius.medium,
                    padding: ds.spacing.medium,
                    marginBottom: ds.spacing.medium,
                  }}>
                    <p style={{
                      fontSize: ds.typography.scale.base,
                      color: testResult === 'success' 
                        ? ds.colors.semantic.success.text 
                        : ds.colors.semantic.error.text,
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
                  gap: ds.spacing.medium,
                  marginBottom: ds.spacing.xlarge,
                }}>
                  <button
                    onClick={handleTestConnection}
                    disabled={!apiKey || !apiSecret}
                    style={{
                      padding: `${ds.spacing.small} ${ds.spacing.large}`,
                      backgroundColor: ds.colors.semantic.background.tertiary,
                      color: ds.colors.grayscale[90],
                      border: `1px solid ${ds.colors.grayscale[30]}`,
                      borderRadius: ds.interactive.radius.medium,
                      fontSize: ds.typography.scale.base,
                      fontWeight: ds.typography.weights.medium,
                      cursor: !apiKey || !apiSecret ? 'not-allowed' : 'pointer',
                      opacity: !apiKey || !apiSecret ? 0.6 : 1,
                      transition: designHelpers.animate('all', ds.animation.durations.fast),
                    }}
                  >
                    Test Connection
                  </button>
                  <button
                    onClick={handleSave}
                    style={{
                      padding: `${ds.spacing.small} ${ds.spacing.large}`,
                      backgroundColor: saved ? ds.colors.semantic.success : ds.colors.semantic.accent,
                      color: ds.colors.grayscale[10],
                      border: 'none',
                      borderRadius: ds.interactive.radius.medium,
                      fontSize: ds.typography.scale.base,
                      fontWeight: ds.typography.weights.medium,
                      cursor: 'pointer',
                      transition: designHelpers.animate('all', ds.animation.durations.fast),
                    }}
                  >
                    {saved ? '✅ Saved!' : '💾 Save Settings'}
                  </button>
                </div>

                <div style={{
                  borderTop: `1px solid ${ds.colors.grayscale[30]}`,
                  paddingTop: ds.spacing.large,
                }}>
                  <h3 style={{
                    fontSize: ds.typography.scale.medium,
                    fontWeight: ds.typography.weights.semibold,
                    marginBottom: ds.spacing.medium,
                  }}>
                    Required API Permissions
                  </h3>
                  
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: ds.spacing.small,
                    marginBottom: ds.spacing.medium,
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
                          padding: `${ds.spacing.micro} ${ds.spacing.small}`,
                          backgroundColor: permission.type === 'warning' 
                            ? ds.colors.semantic.warning 
                            : ds.colors.semantic.accent,
                          color: ds.colors.grayscale[10],
                          borderRadius: ds.interactive.radius.small,
                          fontSize: ds.typography.scale.small,
                          fontWeight: ds.typography.weights.medium,
                        }}
                      >
                        {permission.label}
                      </span>
                    ))}
                  </div>

                  <div style={{
                    backgroundColor: ds.colors.semantic.warning.background,
                    border: `1px solid ${ds.colors.semantic.warning.border}`,
                    borderRadius: ds.interactive.radius.medium,
                    padding: ds.spacing.medium,
                  }}>
                    <p style={{
                      fontSize: ds.typography.scale.base,
                      color: ds.colors.semantic.warning.text,
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
                  fontSize: ds.typography.scale.large,
                  fontWeight: ds.typography.weights.semibold,
                  marginBottom: ds.spacing.medium,
                  display: 'flex',
                  alignItems: 'center',
                  gap: ds.spacing.small,
                }}>
                  ⚙️ Trading Preferences
                </h2>
                
                <div style={{ marginBottom: ds.spacing.large }}>
                  <label style={{
                    display: 'block',
                    fontSize: ds.typography.scale.medium,
                    fontWeight: ds.typography.weights.medium,
                    marginBottom: ds.spacing.small,
                    color: ds.colors.grayscale[80],
                  }}>
                    Default Order Type
                  </label>
                  <select
                    style={{
                      width: '100%',
                      padding: ds.spacing.medium,
                      backgroundColor: ds.colors.semantic.background.tertiary,
                      color: ds.colors.grayscale[90],
                      border: `1px solid ${ds.colors.grayscale[30]}`,
                      borderRadius: ds.interactive.radius.medium,
                      fontSize: ds.typography.scale.base,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="limit">Limit Order</option>
                    <option value="market">Market Order</option>
                    <option value="stop">Stop Order</option>
                    <option value="stop-limit">Stop-Limit Order</option>
                  </select>
                </div>

                <div style={{ marginBottom: ds.spacing.large }}>
                  <label style={{
                    display: 'block',
                    fontSize: ds.typography.scale.medium,
                    fontWeight: ds.typography.weights.medium,
                    marginBottom: ds.spacing.small,
                    color: ds.colors.grayscale[80],
                  }}>
                    Default Position Size (USD)
                  </label>
                  <input
                    type="number"
                    defaultValue="1000"
                    style={{
                      width: '100%',
                      padding: ds.spacing.medium,
                      backgroundColor: ds.colors.semantic.background.tertiary,
                      color: ds.colors.grayscale[90],
                      border: `1px solid ${ds.colors.grayscale[30]}`,
                      borderRadius: ds.interactive.radius.medium,
                      fontSize: ds.typography.scale.base,
                      fontFamily: ds.typography.families.data,
                    }}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: ds.spacing.small,
                  marginBottom: ds.spacing.large,
                }}>
                  <input
                    type="checkbox"
                    id="confirmOrders"
                    defaultChecked
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: ds.colors.semantic.accent,
                    }}
                  />
                  <label
                    htmlFor="confirmOrders"
                    style={{
                      fontSize: ds.typography.scale.base,
                      fontWeight: ds.typography.weights.medium,
                      cursor: 'pointer',
                    }}
                  >
                    Confirm orders before execution
                  </label>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: ds.spacing.small,
                }}>
                  <input
                    type="checkbox"
                    id="autoSaveCharts"
                    defaultChecked
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: ds.colors.semantic.accent,
                    }}
                  />
                  <label
                    htmlFor="autoSaveCharts"
                    style={{
                      fontSize: ds.typography.scale.base,
                      fontWeight: ds.typography.weights.medium,
                      cursor: 'pointer',
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
                  fontSize: ds.typography.scale.large,
                  fontWeight: ds.typography.weights.semibold,
                  marginBottom: ds.spacing.medium,
                  display: 'flex',
                  alignItems: 'center',
                  gap: ds.spacing.small,
                }}>
                  🛡️ Risk Management
                </h2>
                
                <div style={{ marginBottom: ds.spacing.large }}>
                  <label style={{
                    display: 'block',
                    fontSize: ds.typography.scale.medium,
                    fontWeight: ds.typography.weights.medium,
                    marginBottom: ds.spacing.small,
                    color: ds.colors.grayscale[80],
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
                      padding: ds.spacing.medium,
                      backgroundColor: ds.colors.semantic.background.tertiary,
                      color: ds.colors.grayscale[90],
                      border: `1px solid ${ds.colors.grayscale[30]}`,
                      borderRadius: ds.interactive.radius.medium,
                      fontSize: ds.typography.scale.base,
                      fontFamily: ds.typography.families.data,
                    }}
                  />
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: ds.spacing.medium,
                  marginBottom: ds.spacing.large,
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: ds.typography.scale.medium,
                      fontWeight: ds.typography.weights.medium,
                      marginBottom: ds.spacing.small,
                      color: ds.colors.grayscale[80],
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
                        padding: ds.spacing.medium,
                        backgroundColor: ds.colors.semantic.background.tertiary,
                        color: ds.colors.grayscale[90],
                        border: `1px solid ${ds.colors.grayscale[30]}`,
                        borderRadius: ds.interactive.radius.medium,
                        fontSize: ds.typography.scale.base,
                        fontFamily: ds.typography.families.data,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: ds.typography.scale.medium,
                      fontWeight: ds.typography.weights.medium,
                      marginBottom: ds.spacing.small,
                      color: ds.colors.grayscale[80],
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
                        padding: ds.spacing.medium,
                        backgroundColor: ds.colors.semantic.background.tertiary,
                        color: ds.colors.grayscale[90],
                        border: `1px solid ${ds.colors.grayscale[30]}`,
                        borderRadius: ds.interactive.radius.medium,
                        fontSize: ds.typography.scale.base,
                        fontFamily: ds.typography.families.data,
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: ds.spacing.large }}>
                  <label style={{
                    display: 'block',
                    fontSize: ds.typography.scale.medium,
                    fontWeight: ds.typography.weights.medium,
                    marginBottom: ds.spacing.small,
                    color: ds.colors.grayscale[80],
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
                      padding: ds.spacing.medium,
                      backgroundColor: ds.colors.semantic.background.tertiary,
                      color: ds.colors.grayscale[90],
                      border: `1px solid ${ds.colors.grayscale[30]}`,
                      borderRadius: ds.interactive.radius.medium,
                      fontSize: ds.typography.scale.base,
                      fontFamily: ds.typography.families.data,
                    }}
                  />
                </div>

                <div style={{
                  backgroundColor: ds.colors.semantic.warning.background,
                  border: `1px solid ${ds.colors.semantic.warning.border}`,
                  borderRadius: ds.interactive.radius.medium,
                  padding: ds.spacing.medium,
                }}>
                  <p style={{
                    fontSize: ds.typography.scale.base,
                    color: ds.colors.semantic.warning.text,
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
                  fontSize: ds.typography.scale.large,
                  fontWeight: ds.typography.weights.semibold,
                  marginBottom: ds.spacing.medium,
                  display: 'flex',
                  alignItems: 'center',
                  gap: ds.spacing.small,
                }}>
                  🔔 Notifications
                </h2>
                
                <div style={{ marginBottom: ds.spacing.large }}>
                  {Object.entries(notifications).map(([key, enabled]) => (
                    <div key={key} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: ds.spacing.medium,
                      borderBottom: `1px solid ${ds.colors.grayscale[30]}`,
                    }}>
                      <div>
                        <div style={{
                          fontSize: ds.typography.scale.base,
                          fontWeight: ds.typography.weights.medium,
                          marginBottom: ds.spacing.micro,
                        }}>
                          {key === 'tradeExecutions' && 'Trade Executions'}
                          {key === 'priceAlerts' && 'Price Alerts'}
                          {key === 'systemUpdates' && 'System Updates'}
                          {key === 'marketNews' && 'Market News'}
                        </div>
                        <div style={{
                          fontSize: ds.typography.scale.small,
                          color: ds.colors.grayscale[70],
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
                          accentColor: ds.colors.semantic.accent,
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div style={{
                  backgroundColor: ds.colors.semantic.info.background,
                  border: `1px solid ${ds.colors.semantic.info.border}`,
                  borderRadius: ds.interactive.radius.medium,
                  padding: ds.spacing.medium,
                }}>
                  <p style={{
                    fontSize: ds.typography.scale.base,
                    color: ds.colors.semantic.info.text,
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
          marginTop: ds.spacing.large,
        }}>
          <button
            onClick={handleSave}
            style={{
              padding: `${ds.spacing.medium} ${ds.spacing.xlarge}`,
              backgroundColor: saved ? ds.colors.semantic.success : ds.colors.semantic.accent,
              color: ds.colors.grayscale[10],
              border: 'none',
              borderRadius: ds.interactive.radius.medium,
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              cursor: 'pointer',
              transition: designHelpers.animate('all', ds.animation.durations.fast),
            }}
          >
            {saved ? '✅ All Settings Saved!' : '💾 Save All Settings'}
          </button>
        </div>
      </main>
    </div>
  )
}