'use client'

import React, { useState } from 'react'
import { dieterRamsDesign as ds, designHelpers } from '@/lib/design/DieterRamsDesignSystem'
import ExpandableStrategyList from '@/components/ExpandableStrategyList'
import StrategyChat from '@/components/StrategyChat'
import { GeneratedStrategy } from '@/lib/anthropic/client'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import BacktestResults from '@/components/BacktestResults'
import { BacktestResult } from '@/lib/backtest/StrategyExecutor'

interface Strategy {
  id: string
  name: string
  type: 'momentum' | 'mean_reversion' | 'scalping' | 'market_making' | 'ai_generated'
  active: boolean
  totalRuns: number
  successfulRuns: number
  totalPnl: number
  lastRun?: Date
  runs: StrategyRun[]
}

interface StrategyRun {
  id: string
  runId: string
  startTime: Date
  endTime?: Date
  status: 'running' | 'completed' | 'failed' | 'stopped'
  pnl?: number
  trades?: number
  winRate?: number
  sharpeRatio?: number
}

// Mock data
const mockStrategies: Strategy[] = [
  {
    id: '1',
    name: 'Mean Reversion Strategy',
    type: 'mean_reversion',
    active: true,
    totalRuns: 15,
    successfulRuns: 12,
    totalPnl: 12840,
    lastRun: new Date(Date.now() - 2 * 60 * 60 * 1000),
    runs: [
      {
        id: 'run-1-1',
        runId: 'a1b2c3d4',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'running',
        trades: 23,
        winRate: 0.78,
        sharpeRatio: 1.85
      },
      {
        id: 'run-1-2',
        runId: 'e5f6g7h8',
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 20 * 60 * 60 * 1000),
        status: 'completed',
        pnl: 2340,
        trades: 45,
        winRate: 0.82,
        sharpeRatio: 2.1
      },
    ]
  },
  {
    id: '2',
    name: 'Momentum Trading Strategy',
    type: 'momentum',
    active: true,
    totalRuns: 8,
    successfulRuns: 6,
    totalPnl: 18760,
    lastRun: new Date(Date.now() - 30 * 60 * 1000),
    runs: [
      {
        id: 'run-2-1',
        runId: 'm3n4o5p6',
        startTime: new Date(Date.now() - 30 * 60 * 1000),
        status: 'running',
        trades: 8,
        winRate: 0.75,
        sharpeRatio: 1.95
      },
    ]
  },
  {
    id: '3',
    name: 'AI-Generated Scalper',
    type: 'ai_generated',
    active: false,
    totalRuns: 23,
    successfulRuns: 18,
    totalPnl: 9435,
    lastRun: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    runs: []
  },
  {
    id: '4',
    name: 'Market Making Bot',
    type: 'market_making',
    active: true,
    totalRuns: 45,
    successfulRuns: 38,
    totalPnl: 15220,
    lastRun: new Date(Date.now() - 10 * 60 * 1000),
    runs: []
  },
  {
    id: '5',
    name: 'High-Frequency Scalper',
    type: 'scalping',
    active: false,
    totalRuns: 12,
    successfulRuns: 7,
    totalPnl: -2340,
    lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    runs: []
  }
]

export default function StrategiesPage() {
  const [tabValue, setTabValue] = useState(0)
  const [viewMode, setViewMode] = useState<'table' | 'expandable'>('expandable')
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedStrategyForEdit, setSelectedStrategyForEdit] = useState<Strategy | null>(null)
  const [strategies, setStrategies] = useState(mockStrategies)
  const [formData, setFormData] = useState({
    name: '',
    type: 'momentum',
    description: '',
    entryCondition: '',
    exitCondition: '',
    stopLoss: '2',
    takeProfit: '5',
    positionSize: '1000'
  })

  // AI Strategy Builder states
  const [apiKey, setApiKey] = useState('')
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [tempApiKey, setTempApiKey] = useState('')
  const [generatedStrategies, setGeneratedStrategies] = useState<GeneratedStrategy[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<GeneratedStrategy | null>(null)
  const [showBacktestDialog, setShowBacktestDialog] = useState(false)
  const [backtestSymbol, setBacktestSymbol] = useState('BTC/USD')
  const [backtestPeriod, setBacktestPeriod] = useState('30')
  const [backtestResults, setBacktestResults] = useState<BacktestResult | null>(null)
  const [isBacktesting, setIsBacktesting] = useState(false)

  // Chat interface states
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{id: string, text: string, timestamp: Date, type: 'user' | 'system'}>>([
    {
      id: '1',
      text: 'Welcome! I can help you create trading strategies, analyze market conditions, or answer questions about your existing strategies. What would you like to do?',
      timestamp: new Date(),
      type: 'system'
    }
  ])

  const handleStatusToggle = (strategyId: string) => {
    setStrategies(prev => 
      prev.map(s => 
        s.id === strategyId ? { ...s, active: !s.active } : s
      )
    )
  }

  const handleDelete = (strategyId: string) => {
    setStrategies(prev => prev.filter(s => s.id !== strategyId))
  }

  const handleEdit = (strategy: Strategy) => {
    setSelectedStrategyForEdit(strategy)
    setFormData({
      name: strategy.name,
      type: strategy.type,
      description: '',
      entryCondition: '',
      exitCondition: '',
      stopLoss: '2',
      takeProfit: '5',
      positionSize: '1000'
    })
    setOpenDialog(true)
  }

  const handleSave = () => {
    console.log('Save strategy:', formData)
    setOpenDialog(false)
    setSelectedStrategyForEdit(null)
  }

  const handleStrategyGenerated = (strategy: GeneratedStrategy) => {
    setGeneratedStrategies(prev => [strategy, ...prev])
    setSelectedStrategy(strategy)
  }

  const handleSaveApiKey = () => {
    setApiKey(tempApiKey)
    setShowApiKeyDialog(false)
    localStorage.setItem('anthropic_api_key', tempApiKey)
  }

  const handleRunBacktest = async () => {
    if (!selectedStrategy) return
    
    setIsBacktesting(true)
    setShowBacktestDialog(false)
    
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(backtestPeriod))
      
      const response = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          strategy: selectedStrategy,
          symbol: backtestSymbol,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          initialBalance: 10000
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to run backtest')
      }
      
      const results = await response.json()
      setBacktestResults(results)
    } catch (error) {
      console.error('Backtest error:', error)
      alert('Failed to run backtest. Please try again.')
    } finally {
      setIsBacktesting(false)
    }
  }

  React.useEffect(() => {
    const savedKey = localStorage.getItem('anthropic_api_key')
    if (savedKey) {
      setApiKey(savedKey)
    }
  }, [])

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const userMessage = {
      id: Date.now().toString(),
      text: chatInput,
      timestamp: new Date(),
      type: 'user' as const
    }

    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')

    setTimeout(() => {
      const systemResponse = {
        id: (Date.now() + 1).toString(),
        text: getSimpleResponse(chatInput),
        timestamp: new Date(),
        type: 'system' as const
      }
      setChatMessages(prev => [...prev, systemResponse])
    }, 1000)
  }

  const getSimpleResponse = (input: string): string => {
    const lowerInput = input.toLowerCase()
    
    if (lowerInput.includes('strategy') || lowerInput.includes('create')) {
      return 'I can help you create trading strategies! Use the AI Strategy Builder below or try one of the quick start templates. What type of strategy are you interested in? (momentum, mean reversion, scalping, etc.)'
    } else if (lowerInput.includes('market') || lowerInput.includes('price')) {
      return 'For market analysis, I recommend checking the dashboard for real-time data. What specific market conditions are you looking to analyze?'
    } else if (lowerInput.includes('risk') || lowerInput.includes('manage')) {
      return 'Risk management is crucial! Check your existing strategies below - you can see their performance metrics, win rates, and P&L. Would you like help setting up stop losses or position sizing?'
    } else if (lowerInput.includes('help') || lowerInput.includes('how')) {
      return 'I can help with: 1) Creating new trading strategies, 2) Analyzing your existing strategies, 3) Market analysis, 4) Risk management. What would you like to focus on?'
    } else {
      return 'Interesting question! For detailed strategy creation, use the AI Strategy Builder below. For general trading questions, I recommend checking your dashboard or existing strategies. How can I help you specifically?'
    }
  }

  const filteredStrategies = tabValue === 0 
    ? strategies 
    : tabValue === 1 
    ? strategies.filter(s => s.active)
    : strategies.filter(s => !s.active)

  const quickPrompts = [
    {
      title: 'Momentum Strategy',
      prompt: 'Create a momentum trading strategy that identifies strong trends using multiple timeframes',
      icon: '📈',
      color: ds.colors.semantic.success
    },
    {
      title: 'Mean Reversion',
      prompt: 'Build a mean reversion strategy that trades oversold and overbought conditions',
      icon: '🤖',
      color: ds.colors.semantic.info
    },
    {
      title: 'Scalping Bot',
      prompt: 'Generate a high-frequency scalping strategy for 1-minute charts with tight risk management',
      icon: '⚡',
      color: ds.colors.semantic.warning
    },
    {
      title: 'Risk-Adjusted',
      prompt: 'Create a conservative strategy focused on capital preservation with 2:1 risk-reward ratio',
      icon: '🛡️',
      color: ds.colors.semantic.primary
    }
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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h1 style={{
              fontSize: ds.typography.scale.xlarge,
              fontWeight: ds.typography.weights.semibold,
              margin: 0,
              marginBottom: ds.spacing.mini,
            }}>
              AI Strategy Builder & Management
            </h1>
            <p style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              margin: 0,
            }}>
              Create bespoke trading strategies using Claude AI or manage existing strategies
            </p>
          </div>

          <button
            onClick={() => setShowApiKeyDialog(true)}
            style={{
              padding: `${ds.spacing.small} ${ds.spacing.large}`,
              backgroundColor: 'transparent',
              color: ds.colors.semantic.primary,
              border: `1px solid ${ds.colors.semantic.primary}`,
              borderRadius: ds.interactive.radius.medium,
              fontSize: ds.typography.scale.small,
              fontWeight: ds.typography.weights.medium,
              cursor: 'pointer',
              transition: designHelpers.animate('all', ds.animation.durations.fast),
              display: 'flex',
              alignItems: 'center',
              gap: ds.spacing.small,
            }}
          >
            🔑 {apiKey ? 'Update API Key' : 'Set API Key'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: ds.grid.maxWidth,
        margin: '0 auto',
        padding: ds.spacing.large,
      }}>
        {!apiKey && (
          <div style={{
            padding: ds.spacing.large,
            backgroundColor: `${ds.colors.semantic.info}10`,
            border: `1px solid ${ds.colors.semantic.info}`,
            borderRadius: ds.interactive.radius.medium,
            marginBottom: ds.spacing.xlarge,
          }}>
            <p style={{
              fontSize: ds.typography.scale.small,
              margin: 0,
            }}>
              To use the AI Strategy Builder, please set your Anthropic API key. You can get one from{' '}
              <a 
                href="https://console.anthropic.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: ds.colors.semantic.info }}
              >
                console.anthropic.com
              </a>
            </p>
          </div>
        )}

        {/* Simple Chat Interface */}
        <section style={{
          backgroundColor: ds.colors.semantic.background.secondary,
          borderRadius: ds.interactive.radius.medium,
          padding: ds.spacing.large,
          marginBottom: ds.spacing.xlarge,
          border: `1px solid ${ds.colors.grayscale[20]}`,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: ds.spacing.small,
            marginBottom: ds.spacing.medium,
          }}>
            <span style={{ fontSize: ds.typography.scale.large }}>💬</span>
            <h2 style={{
              fontSize: ds.typography.scale.medium,
              fontWeight: ds.typography.weights.semibold,
              margin: 0,
            }}>
              Quick Chat
            </h2>
          </div>
          
          <div style={{ 
            maxHeight: '300px',
            minHeight: '200px',
            overflow: 'auto',
            backgroundColor: ds.colors.semantic.background.primary,
            borderRadius: ds.interactive.radius.small,
            padding: ds.spacing.medium,
            marginBottom: ds.spacing.medium,
            border: `1px solid ${ds.colors.grayscale[20]}`,
          }}>
            {chatMessages.map((message) => (
              <div 
                key={message.id} 
                style={{ 
                  marginBottom: ds.spacing.medium,
                  display: 'flex', 
                  justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start' 
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: ds.spacing.medium,
                    borderRadius: ds.interactive.radius.medium,
                    backgroundColor: message.type === 'user' ? 
                      ds.colors.semantic.primary : 
                      ds.colors.semantic.background.tertiary,
                    color: message.type === 'user' ? 
                      ds.colors.grayscale[5] : 
                      ds.colors.grayscale[90],
                  }}
                >
                  <p style={{
                    fontSize: ds.typography.scale.small,
                    margin: 0,
                    marginBottom: ds.spacing.mini,
                  }}>
                    {message.text}
                  </p>
                  <span style={{
                    fontSize: ds.typography.scale.mini,
                    opacity: 0.7,
                  }}>
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <form 
            onSubmit={handleChatSubmit}
            style={{ display: 'flex', gap: ds.spacing.small }}
          >
            <input
              type="text"
              placeholder="Ask me about trading strategies, market analysis, or risk management..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              style={{
                flex: 1,
                padding: ds.spacing.small,
                backgroundColor: ds.colors.semantic.background.primary,
                color: ds.colors.grayscale[90],
                border: `1px solid ${ds.colors.grayscale[30]}`,
                borderRadius: ds.interactive.radius.small,
                fontSize: ds.typography.scale.small,
              }}
            />
            <button 
              type="submit" 
              disabled={!chatInput.trim()}
              style={{
                padding: `${ds.spacing.small} ${ds.spacing.large}`,
                backgroundColor: ds.colors.semantic.primary,
                color: ds.colors.grayscale[5],
                border: 'none',
                borderRadius: ds.interactive.radius.medium,
                fontSize: ds.typography.scale.small,
                fontWeight: ds.typography.weights.medium,
                cursor: !chatInput.trim() ? 'not-allowed' : 'pointer',
                opacity: !chatInput.trim() ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: ds.spacing.small,
              }}
            >
              Send →
            </button>
          </form>
        </section>

        {/* Quick Start Templates */}
        <section style={{ marginBottom: ds.spacing.xlarge }}>
          <h3 style={{
            fontSize: ds.typography.scale.medium,
            fontWeight: ds.typography.weights.semibold,
            marginBottom: ds.spacing.medium,
          }}>
            Quick Start Templates
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: ds.spacing.medium,
          }}>
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => {
                  const chatArea = document.querySelector('textarea[placeholder*="Ask me to create"]') as HTMLTextAreaElement
                  if (chatArea) {
                    chatArea.value = prompt.prompt
                    chatArea.focus()
                    const event = new Event('input', { bubbles: true })
                    chatArea.dispatchEvent(event)
                  }
                }}
                style={{
                  padding: ds.spacing.large,
                  backgroundColor: ds.colors.semantic.background.secondary,
                  border: `1px solid ${ds.colors.grayscale[20]}`,
                  borderRadius: ds.interactive.radius.medium,
                  cursor: 'pointer',
                  transition: designHelpers.animate('all', ds.animation.durations.fast),
                  textAlign: 'left',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: ds.spacing.small,
                  marginBottom: ds.spacing.small,
                }}>
                  <span style={{ fontSize: ds.typography.scale.large }}>{prompt.icon}</span>
                  <h4 style={{
                    fontSize: ds.typography.scale.base,
                    fontWeight: ds.typography.weights.medium,
                    margin: 0,
                  }}>
                    {prompt.title}
                  </h4>
                </div>
                <p style={{
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                  margin: 0,
                }}>
                  {prompt.prompt}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* AI Strategy Builder */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: ds.spacing.xlarge,
          marginBottom: ds.spacing.xlarge,
        }}>
          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            border: `1px solid ${ds.colors.grayscale[20]}`,
            height: '600px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <StrategyChat 
              apiKey={apiKey} 
              onStrategyGenerated={handleStrategyGenerated}
            />
          </div>

          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            border: `1px solid ${ds.colors.grayscale[20]}`,
            padding: ds.spacing.large,
            height: '600px',
            overflow: 'auto',
          }}>
            {selectedStrategy ? (
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: ds.spacing.large,
                }}>
                  <h3 style={{
                    fontSize: ds.typography.scale.medium,
                    fontWeight: ds.typography.weights.semibold,
                    margin: 0,
                  }}>
                    {selectedStrategy.name}
                  </h3>
                  <div style={{ display: 'flex', gap: ds.spacing.small }}>
                    <button
                      onClick={() => setShowBacktestDialog(true)}
                      disabled={isBacktesting}
                      style={{
                        padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                        backgroundColor: ds.colors.semantic.primary,
                        color: ds.colors.grayscale[5],
                        border: 'none',
                        borderRadius: ds.interactive.radius.small,
                        fontSize: ds.typography.scale.small,
                        fontWeight: ds.typography.weights.medium,
                        cursor: isBacktesting ? 'not-allowed' : 'pointer',
                        opacity: isBacktesting ? 0.5 : 1,
                      }}
                    >
                      📊 Test Strategy
                    </button>
                    <button
                      style={{
                        padding: ds.spacing.small,
                        backgroundColor: 'transparent',
                        border: `1px solid ${ds.colors.grayscale[30]}`,
                        borderRadius: ds.interactive.radius.small,
                        cursor: 'pointer',
                      }}
                    >
                      💾
                    </button>
                    <button
                      style={{
                        padding: ds.spacing.small,
                        backgroundColor: 'transparent',
                        border: `1px solid ${ds.colors.grayscale[30]}`,
                        borderRadius: ds.interactive.radius.small,
                        cursor: 'pointer',
                      }}
                    >
                      ▶️
                    </button>
                  </div>
                </div>

                <p style={{
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                  marginBottom: ds.spacing.large,
                }}>
                  {selectedStrategy.description}
                </p>

                <div style={{ marginBottom: ds.spacing.large }}>
                  <h4 style={{
                    fontSize: ds.typography.scale.small,
                    fontWeight: ds.typography.weights.medium,
                    marginBottom: ds.spacing.small,
                  }}>
                    Required Indicators
                  </h4>
                  <div style={{ display: 'flex', gap: ds.spacing.small, flexWrap: 'wrap' }}>
                    {selectedStrategy.requiredIndicators.map(indicator => (
                      <span
                        key={indicator}
                        style={{
                          padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                          backgroundColor: ds.colors.semantic.background.tertiary,
                          borderRadius: ds.interactive.radius.small,
                          fontSize: ds.typography.scale.mini,
                        }}
                      >
                        {indicator}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: ds.spacing.large }}>
                  <h4 style={{
                    fontSize: ds.typography.scale.small,
                    fontWeight: ds.typography.weights.medium,
                    marginBottom: ds.spacing.small,
                  }}>
                    Risk Metrics
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: ds.spacing.small,
                  }}>
                    {Object.entries(selectedStrategy.riskMetrics).map(([key, value]) => (
                      <div
                        key={key}
                        style={{
                          padding: ds.spacing.small,
                          backgroundColor: ds.colors.semantic.background.primary,
                          borderRadius: ds.interactive.radius.small,
                        }}
                      >
                        <div style={{
                          fontSize: ds.typography.scale.mini,
                          color: ds.colors.grayscale[70],
                          marginBottom: ds.spacing.micro,
                        }}>
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div style={{
                          fontSize: ds.typography.scale.small,
                          fontWeight: ds.typography.weights.medium,
                          fontFamily: ds.typography.families.data,
                        }}>
                          {typeof value === 'number' ? 
                            (key.includes('Rate') || key.includes('ratio') ? 
                              (value * 100).toFixed(1) + '%' : 
                              value.toFixed(2)
                            ) : value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{
                    fontSize: ds.typography.scale.small,
                    fontWeight: ds.typography.weights.medium,
                    marginBottom: ds.spacing.small,
                  }}>
                    Strategy Code
                  </h4>
                  <div style={{ 
                    maxHeight: '250px', 
                    overflow: 'auto',
                    borderRadius: ds.interactive.radius.small,
                  }}>
                    <SyntaxHighlighter
                      language={selectedStrategy.language}
                      style={vscDarkPlus}
                      customStyle={{ 
                        margin: 0, 
                        fontSize: ds.typography.scale.small,
                      }}
                    >
                      {selectedStrategy.code}
                    </SyntaxHighlighter>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: ds.colors.grayscale[70],
              }}>
                <span style={{ fontSize: '48px', marginBottom: ds.spacing.medium }}>📝</span>
                <h3 style={{
                  fontSize: ds.typography.scale.medium,
                  fontWeight: ds.typography.weights.medium,
                  marginBottom: ds.spacing.small,
                }}>
                  No Strategy Selected
                </h3>
                <p style={{
                  fontSize: ds.typography.scale.small,
                  textAlign: 'center',
                }}>
                  Generate a strategy using the chat interface or select from your saved strategies
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Generated Strategies List */}
        {generatedStrategies.length > 0 && (
          <section style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            marginBottom: ds.spacing.xlarge,
            border: `1px solid ${ds.colors.grayscale[20]}`,
          }}>
            <h3 style={{
              fontSize: ds.typography.scale.medium,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.medium,
            }}>
              Generated Strategies
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: ds.spacing.medium,
            }}>
              {generatedStrategies.map((strategy, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedStrategy(strategy)}
                  style={{
                    padding: ds.spacing.medium,
                    backgroundColor: selectedStrategy?.name === strategy.name ? 
                      ds.colors.semantic.background.tertiary : 
                      ds.colors.semantic.background.primary,
                    border: `1px solid ${selectedStrategy?.name === strategy.name ? 
                      ds.colors.semantic.primary : 
                      ds.colors.grayscale[20]}`,
                    borderRadius: ds.interactive.radius.medium,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: designHelpers.animate('all', ds.animation.durations.fast),
                  }}
                >
                  <h4 style={{
                    fontSize: ds.typography.scale.base,
                    fontWeight: ds.typography.weights.medium,
                    margin: 0,
                    marginBottom: ds.spacing.small,
                  }}>
                    {strategy.name}
                  </h4>
                  <p style={{
                    fontSize: ds.typography.scale.small,
                    color: ds.colors.grayscale[70],
                    margin: 0,
                    marginBottom: ds.spacing.small,
                  }}>
                    {strategy.description.substring(0, 100)}...
                  </p>
                  <div style={{ display: 'flex', gap: ds.spacing.small }}>
                    <span style={{
                      padding: `${ds.spacing.micro} ${ds.spacing.mini}`,
                      backgroundColor: ds.colors.semantic.background.tertiary,
                      borderRadius: ds.interactive.radius.small,
                      fontSize: ds.typography.scale.mini,
                    }}>
                      {strategy.timeframe}
                    </span>
                    <span style={{
                      padding: `${ds.spacing.micro} ${ds.spacing.mini}`,
                      backgroundColor: `${ds.colors.semantic.primary}20`,
                      color: ds.colors.semantic.primary,
                      borderRadius: ds.interactive.radius.small,
                      fontSize: ds.typography.scale.mini,
                    }}>
                      {strategy.language}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Backtest Results */}
        {(backtestResults || isBacktesting) && (
          <section style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            marginBottom: ds.spacing.xlarge,
            border: `1px solid ${ds.colors.grayscale[20]}`,
          }}>
            <h3 style={{
              fontSize: ds.typography.scale.medium,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.medium,
            }}>
              Backtest Results
            </h3>
            <BacktestResults results={backtestResults!} isLoading={isBacktesting} />
          </section>
        )}

        {/* Existing Strategies Management */}
        <section>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: ds.spacing.large,
          }}>
            <h2 style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              margin: 0,
            }}>
              Manage Existing Strategies
            </h2>
            <div style={{ display: 'flex', gap: ds.spacing.medium }}>
              <button
                onClick={() => setViewMode(viewMode === 'table' ? 'expandable' : 'table')}
                style={{
                  padding: ds.spacing.small,
                  backgroundColor: 'transparent',
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.small,
                  cursor: 'pointer',
                }}
              >
                {viewMode === 'table' ? '📋' : '📊'}
              </button>
              <button
                onClick={() => setOpenDialog(true)}
                style={{
                  padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                  backgroundColor: ds.colors.semantic.primary,
                  color: ds.colors.grayscale[5],
                  border: 'none',
                  borderRadius: ds.interactive.radius.medium,
                  fontSize: ds.typography.scale.small,
                  fontWeight: ds.typography.weights.medium,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: ds.spacing.small,
                }}
              >
                + New Strategy
              </button>
            </div>
          </div>

          <div style={{
            marginBottom: ds.spacing.large,
          }}>
            <div style={{ display: 'flex', gap: ds.spacing.mini }}>
              {['All Strategies', 'Active', 'Inactive', 'Performance'].map((tab, index) => (
                <button
                  key={tab}
                  onClick={() => setTabValue(index)}
                  style={{
                    padding: `${ds.spacing.small} ${ds.spacing.medium}`,
                    backgroundColor: tabValue === index ? 
                      ds.colors.semantic.background.secondary : 
                      'transparent',
                    color: tabValue === index ? 
                      ds.colors.grayscale[90] : 
                      ds.colors.grayscale[70],
                    border: `1px solid ${tabValue === index ? 
                      ds.colors.grayscale[30] : 
                      'transparent'}`,
                    borderRadius: ds.interactive.radius.medium,
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                    fontSize: ds.typography.scale.small,
                    fontWeight: ds.typography.weights.medium,
                    cursor: 'pointer',
                    transition: designHelpers.animate('all', ds.animation.durations.fast),
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {viewMode === 'expandable' ? (
            <ExpandableStrategyList
              strategies={filteredStrategies}
              onRunClick={(strategyId, runId) => console.log('View run:', strategyId, runId)}
              onStrategyClick={(strategyId) => console.log('View strategy:', strategyId)}
              onStartStrategy={handleStatusToggle}
              onStopStrategy={handleStatusToggle}
            />
          ) : (
            <div style={{
              backgroundColor: ds.colors.semantic.background.secondary,
              borderRadius: ds.interactive.radius.medium,
              overflow: 'hidden',
              border: `1px solid ${ds.colors.grayscale[20]}`,
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: ds.colors.semantic.background.tertiary,
                  }}>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontSize: ds.typography.scale.small,
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Strategy Name
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontSize: ds.typography.scale.small,
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Type
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontSize: ds.typography.scale.small,
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Status
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'right',
                      fontSize: ds.typography.scale.small,
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Total P&L
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'right',
                      fontSize: ds.typography.scale.small,
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Success Rate
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'right',
                      fontSize: ds.typography.scale.small,
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Total Runs
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'center',
                      fontSize: ds.typography.scale.small,
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStrategies.map((strategy) => (
                    <tr key={strategy.id}>
                      <td style={{
                        padding: ds.spacing.medium,
                        fontSize: ds.typography.scale.small,
                        fontWeight: ds.typography.weights.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        {strategy.name}
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        fontSize: ds.typography.scale.small,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        <span style={{
                          padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                          backgroundColor: ds.colors.semantic.background.tertiary,
                          borderRadius: ds.interactive.radius.small,
                          fontSize: ds.typography.scale.mini,
                          textTransform: 'uppercase',
                        }}>
                          {strategy.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        fontSize: ds.typography.scale.small,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        <span style={{
                          padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                          backgroundColor: strategy.active ? 
                            `${ds.colors.semantic.success}20` : 
                            ds.colors.semantic.background.tertiary,
                          color: strategy.active ? 
                            ds.colors.semantic.success : 
                            ds.colors.grayscale[70],
                          borderRadius: ds.interactive.radius.small,
                          fontSize: ds.typography.scale.mini,
                          textTransform: 'uppercase',
                        }}>
                          {strategy.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        fontSize: ds.typography.scale.small,
                        fontFamily: ds.typography.families.data,
                        fontWeight: ds.typography.weights.medium,
                        color: strategy.totalPnl > 0 ? 
                          ds.colors.semantic.buy : 
                          ds.colors.semantic.sell,
                        textAlign: 'right',
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        ${strategy.totalPnl.toLocaleString()}
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        fontSize: ds.typography.scale.small,
                        fontFamily: ds.typography.families.data,
                        textAlign: 'right',
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        {strategy.totalRuns > 0 
                          ? `${((strategy.successfulRuns / strategy.totalRuns) * 100).toFixed(0)}%`
                          : '-'
                        }
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        fontSize: ds.typography.scale.small,
                        fontFamily: ds.typography.families.data,
                        textAlign: 'right',
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        {strategy.totalRuns}
                      </td>
                      <td style={{
                        padding: ds.spacing.medium,
                        textAlign: 'center',
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: ds.spacing.small }}>
                          <button
                            onClick={() => handleStatusToggle(strategy.id)}
                            style={{
                              padding: ds.spacing.mini,
                              backgroundColor: 'transparent',
                              color: strategy.active ? 
                                ds.colors.semantic.error : 
                                ds.colors.semantic.success,
                              border: 'none',
                              fontSize: ds.typography.scale.small,
                              cursor: 'pointer',
                            }}
                          >
                            {strategy.active ? '⏸' : '▶'}
                          </button>
                          <button
                            onClick={() => handleEdit(strategy)}
                            style={{
                              padding: ds.spacing.mini,
                              backgroundColor: 'transparent',
                              color: ds.colors.grayscale[70],
                              border: 'none',
                              fontSize: ds.typography.scale.small,
                              cursor: 'pointer',
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(strategy.id)}
                            style={{
                              padding: ds.spacing.mini,
                              backgroundColor: 'transparent',
                              color: ds.colors.semantic.error,
                              border: 'none',
                              fontSize: ds.typography.scale.small,
                              cursor: 'pointer',
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Dialogs */}
      {showApiKeyDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: ds.colors.semantic.background.primary,
            borderRadius: ds.interactive.radius.large,
            padding: ds.spacing.xlarge,
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}>
            <h2 style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.medium,
            }}>
              Set Anthropic API Key
            </h2>
            
            <div style={{
              padding: ds.spacing.medium,
              backgroundColor: `${ds.colors.semantic.info}10`,
              border: `1px solid ${ds.colors.semantic.info}`,
              borderRadius: ds.interactive.radius.medium,
              marginBottom: ds.spacing.large,
            }}>
              <p style={{
                fontSize: ds.typography.scale.small,
                margin: 0,
              }}>
                Your API key is stored locally and never sent to our servers. It's only used to communicate directly with Anthropic's API.
              </p>
            </div>
            
            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="sk-ant-..."
              style={{
                width: '100%',
                padding: ds.spacing.medium,
                backgroundColor: ds.colors.semantic.background.secondary,
                color: ds.colors.grayscale[90],
                border: `1px solid ${ds.colors.grayscale[30]}`,
                borderRadius: ds.interactive.radius.small,
                fontSize: ds.typography.scale.small,
                marginBottom: ds.spacing.large,
              }}
            />
            
            <div style={{
              display: 'flex',
              gap: ds.spacing.medium,
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setShowApiKeyDialog(false)}
                style={{
                  padding: `${ds.spacing.small} ${ds.spacing.large}`,
                  backgroundColor: 'transparent',
                  color: ds.colors.grayscale[70],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.medium,
                  fontSize: ds.typography.scale.small,
                  fontWeight: ds.typography.weights.medium,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                style={{
                  padding: `${ds.spacing.small} ${ds.spacing.large}`,
                  backgroundColor: ds.colors.semantic.primary,
                  color: ds.colors.grayscale[5],
                  border: 'none',
                  borderRadius: ds.interactive.radius.medium,
                  fontSize: ds.typography.scale.small,
                  fontWeight: ds.typography.weights.medium,
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backtest Dialog */}
      {showBacktestDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: ds.colors.semantic.background.primary,
            borderRadius: ds.interactive.radius.large,
            padding: ds.spacing.xlarge,
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}>
            <h2 style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.large,
            }}>
              Configure Backtest
            </h2>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: ds.spacing.medium,
              marginBottom: ds.spacing.large,
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                  marginBottom: ds.spacing.small,
                }}>
                  Trading Pair
                </label>
                <select
                  value={backtestSymbol}
                  onChange={(e) => setBacktestSymbol(e.target.value)}
                  style={{
                    width: '100%',
                    padding: ds.spacing.small,
                    backgroundColor: ds.colors.semantic.background.secondary,
                    color: ds.colors.grayscale[90],
                    border: `1px solid ${ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.small,
                    fontSize: ds.typography.scale.small,
                    cursor: 'pointer',
                  }}
                >
                  <option value="BTC/USD">BTC/USD</option>
                  <option value="ETH/USD">ETH/USD</option>
                  <option value="SOL/USD">SOL/USD</option>
                  <option value="ADA/USD">ADA/USD</option>
                </select>
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                  marginBottom: ds.spacing.small,
                }}>
                  Time Period
                </label>
                <select
                  value={backtestPeriod}
                  onChange={(e) => setBacktestPeriod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: ds.spacing.small,
                    backgroundColor: ds.colors.semantic.background.secondary,
                    color: ds.colors.grayscale[90],
                    border: `1px solid ${ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.small,
                    fontSize: ds.typography.scale.small,
                    cursor: 'pointer',
                  }}
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="180">Last 180 days</option>
                  <option value="365">Last year</option>
                </select>
              </div>
              
              <div style={{
                padding: ds.spacing.medium,
                backgroundColor: `${ds.colors.semantic.info}10`,
                border: `1px solid ${ds.colors.semantic.info}`,
                borderRadius: ds.interactive.radius.medium,
              }}>
                <p style={{
                  fontSize: ds.typography.scale.small,
                  margin: 0,
                }}>
                  This will run a historical backtest using {selectedStrategy?.timeframe || '1h'} candles for {selectedStrategy?.name}.
                </p>
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              gap: ds.spacing.medium,
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setShowBacktestDialog(false)}
                style={{
                  padding: `${ds.spacing.small} ${ds.spacing.large}`,
                  backgroundColor: 'transparent',
                  color: ds.colors.grayscale[70],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.medium,
                  fontSize: ds.typography.scale.small,
                  fontWeight: ds.typography.weights.medium,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRunBacktest}
                style={{
                  padding: `${ds.spacing.small} ${ds.spacing.large}`,
                  backgroundColor: ds.colors.semantic.primary,
                  color: ds.colors.grayscale[5],
                  border: 'none',
                  borderRadius: ds.interactive.radius.medium,
                  fontSize: ds.typography.scale.small,
                  fontWeight: ds.typography.weights.medium,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: ds.spacing.small,
                }}
              >
                📊 Run Backtest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strategy Form Dialog */}
      {openDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: ds.colors.semantic.background.primary,
            borderRadius: ds.interactive.radius.large,
            padding: ds.spacing.xlarge,
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}>
            <h2 style={{
              fontSize: ds.typography.scale.large,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.large,
            }}>
              {selectedStrategyForEdit ? 'Edit Strategy' : 'Create New Strategy'}
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: ds.spacing.medium,
              marginBottom: ds.spacing.large,
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                  marginBottom: ds.spacing.small,
                }}>
                  Strategy Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: ds.spacing.small,
                    backgroundColor: ds.colors.semantic.background.secondary,
                    color: ds.colors.grayscale[90],
                    border: `1px solid ${ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.small,
                    fontSize: ds.typography.scale.small,
                  }}
                />
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                  marginBottom: ds.spacing.small,
                }}>
                  Strategy Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: ds.spacing.small,
                    backgroundColor: ds.colors.semantic.background.secondary,
                    color: ds.colors.grayscale[90],
                    border: `1px solid ${ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.small,
                    fontSize: ds.typography.scale.small,
                    cursor: 'pointer',
                  }}
                >
                  <option value="mean_reversion">Mean Reversion</option>
                  <option value="momentum">Momentum</option>
                  <option value="scalping">Scalping</option>
                  <option value="market_making">Market Making</option>
                  <option value="ai_generated">AI Generated</option>
                </select>
              </div>
            </div>
            
            <div style={{ marginBottom: ds.spacing.medium }}>
              <label style={{
                display: 'block',
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.small,
              }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                style={{
                  width: '100%',
                  padding: ds.spacing.small,
                  backgroundColor: ds.colors.semantic.background.secondary,
                  color: ds.colors.grayscale[90],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.small,
                  fontSize: ds.typography.scale.small,
                  resize: 'vertical',
                }}
              />
            </div>
            
            <div style={{ marginBottom: ds.spacing.medium }}>
              <label style={{
                display: 'block',
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.small,
              }}>
                Entry Conditions
              </label>
              <textarea
                value={formData.entryCondition}
                onChange={(e) => setFormData({ ...formData, entryCondition: e.target.value })}
                placeholder="e.g., RSI < 30 AND Price > 20 EMA"
                rows={3}
                style={{
                  width: '100%',
                  padding: ds.spacing.small,
                  backgroundColor: ds.colors.semantic.background.secondary,
                  color: ds.colors.grayscale[90],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.small,
                  fontSize: ds.typography.scale.small,
                  fontFamily: ds.typography.families.data,
                  resize: 'vertical',
                }}
              />
            </div>
            
            <div style={{ marginBottom: ds.spacing.medium }}>
              <label style={{
                display: 'block',
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.small,
              }}>
                Exit Conditions
              </label>
              <textarea
                value={formData.exitCondition}
                onChange={(e) => setFormData({ ...formData, exitCondition: e.target.value })}
                placeholder="e.g., RSI > 70 OR Price < Entry - 2%"
                rows={3}
                style={{
                  width: '100%',
                  padding: ds.spacing.small,
                  backgroundColor: ds.colors.semantic.background.secondary,
                  color: ds.colors.grayscale[90],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.small,
                  fontSize: ds.typography.scale.small,
                  fontFamily: ds.typography.families.data,
                  resize: 'vertical',
                }}
              />
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: ds.spacing.medium,
              marginBottom: ds.spacing.large,
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                  marginBottom: ds.spacing.small,
                }}>
                  Stop Loss (%)
                </label>
                <input
                  type="number"
                  value={formData.stopLoss}
                  onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
                  style={{
                    width: '100%',
                    padding: ds.spacing.small,
                    backgroundColor: ds.colors.semantic.background.secondary,
                    color: ds.colors.grayscale[90],
                    border: `1px solid ${ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.small,
                    fontSize: ds.typography.scale.small,
                    fontFamily: ds.typography.families.data,
                  }}
                />
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                  marginBottom: ds.spacing.small,
                }}>
                  Take Profit (%)
                </label>
                <input
                  type="number"
                  value={formData.takeProfit}
                  onChange={(e) => setFormData({ ...formData, takeProfit: e.target.value })}
                  style={{
                    width: '100%',
                    padding: ds.spacing.small,
                    backgroundColor: ds.colors.semantic.background.secondary,
                    color: ds.colors.grayscale[90],
                    border: `1px solid ${ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.small,
                    fontSize: ds.typography.scale.small,
                    fontFamily: ds.typography.families.data,
                  }}
                />
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  fontSize: ds.typography.scale.small,
                  color: ds.colors.grayscale[70],
                  marginBottom: ds.spacing.small,
                }}>
                  Position Size ($)
                </label>
                <input
                  type="number"
                  value={formData.positionSize}
                  onChange={(e) => setFormData({ ...formData, positionSize: e.target.value })}
                  style={{
                    width: '100%',
                    padding: ds.spacing.small,
                    backgroundColor: ds.colors.semantic.background.secondary,
                    color: ds.colors.grayscale[90],
                    border: `1px solid ${ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.small,
                    fontSize: ds.typography.scale.small,
                    fontFamily: ds.typography.families.data,
                  }}
                />
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              gap: ds.spacing.medium,
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => {
                  setOpenDialog(false)
                  setSelectedStrategyForEdit(null)
                }}
                style={{
                  padding: `${ds.spacing.small} ${ds.spacing.large}`,
                  backgroundColor: 'transparent',
                  color: ds.colors.grayscale[70],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.medium,
                  fontSize: ds.typography.scale.small,
                  fontWeight: ds.typography.weights.medium,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: `${ds.spacing.small} ${ds.spacing.large}`,
                  backgroundColor: ds.colors.semantic.primary,
                  color: ds.colors.grayscale[5],
                  border: 'none',
                  borderRadius: ds.interactive.radius.medium,
                  fontSize: ds.typography.scale.small,
                  fontWeight: ds.typography.weights.medium,
                  cursor: 'pointer',
                }}
              >
                {selectedStrategyForEdit ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}