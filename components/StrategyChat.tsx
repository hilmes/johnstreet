'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  Divider,
  Chip,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Code as CodeIcon,
  PlayArrow as PlayIcon,
  ContentCopy as CopyIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material'
import { GeneratedStrategy } from '@/lib/anthropic/client'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  strategy?: GeneratedStrategy
}

interface StrategyChatProps {
  apiKey?: string
  onStrategyGenerated?: (strategy: GeneratedStrategy) => void
}

export default function StrategyChat({ apiKey, onStrategyGenerated }: StrategyChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [tradingPair, setTradingPair] = useState('BTC/USD')
  const [riskLevel, setRiskLevel] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate')
  const [timeframe, setTimeframe] = useState('1h')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Check if user is asking for strategy generation
      const isStrategyRequest = input.toLowerCase().includes('strategy') || 
                               input.toLowerCase().includes('create') ||
                               input.toLowerCase().includes('generate') ||
                               input.toLowerCase().includes('build')

      if (isStrategyRequest) {
        // Generate strategy
        const response = await fetch('/api/claude/strategy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey && { 'x-anthropic-api-key': apiKey })
          },
          body: JSON.stringify({
            prompt: input,
            tradingPair,
            riskLevel,
            timeframe,
            indicators: extractIndicators(input)
          })
        })

        if (!response.ok) {
          throw new Error('Failed to generate strategy')
        }

        const strategy: GeneratedStrategy = await response.json()
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I've created a ${strategy.name} strategy for you. Here's what it does:\n\n${strategy.description}`,
          timestamp: new Date(),
          strategy
        }

        setMessages(prev => [...prev, assistantMessage])
        
        if (onStrategyGenerated) {
          onStrategyGenerated(strategy)
        }
      } else {
        // Regular chat
        const response = await fetch('/api/claude/strategy', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey && { 'x-anthropic-api-key': apiKey })
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content
            })),
            systemPrompt: 'You are an expert trading strategy assistant. Help users develop, understand, and improve their trading strategies. Be concise but thorough.'
          })
        })

        if (!response.ok) {
          throw new Error('Failed to get response')
        }

        const data = await response.json()
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.content,
          timestamp: new Date()
        }

        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your API key and try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const extractIndicators = (text: string): string[] => {
    const indicators = []
    const indicatorPatterns = ['RSI', 'MACD', 'SMA', 'EMA', 'BB', 'Bollinger', 'Stochastic', 'ATR', 'VWAP', 'Volume']
    
    indicatorPatterns.forEach(indicator => {
      if (text.toUpperCase().includes(indicator.toUpperCase())) {
        indicators.push(indicator)
      }
    })
    
    return indicators
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
  }

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BotIcon color="primary" />
            <Typography variant="h6">Strategy Assistant</Typography>
          </Box>
          <IconButton onClick={() => setShowSettings(!showSettings)}>
            <SettingsIcon />
          </IconButton>
        </Box>
        
        {showSettings && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Trading Pair</InputLabel>
              <Select value={tradingPair} onChange={(e) => setTradingPair(e.target.value)} label="Trading Pair">
                <MenuItem value="BTC/USD">BTC/USD</MenuItem>
                <MenuItem value="ETH/USD">ETH/USD</MenuItem>
                <MenuItem value="SOL/USD">SOL/USD</MenuItem>
                <MenuItem value="Custom">Custom</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Risk Level</InputLabel>
              <Select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as any)} label="Risk Level">
                <MenuItem value="conservative">Conservative</MenuItem>
                <MenuItem value="moderate">Moderate</MenuItem>
                <MenuItem value="aggressive">Aggressive</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Timeframe</InputLabel>
              <Select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} label="Timeframe">
                <MenuItem value="1m">1 Minute</MenuItem>
                <MenuItem value="5m">5 Minutes</MenuItem>
                <MenuItem value="15m">15 Minutes</MenuItem>
                <MenuItem value="1h">1 Hour</MenuItem>
                <MenuItem value="4h">4 Hours</MenuItem>
                <MenuItem value="1d">1 Day</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}
      </Box>

      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <TrendingUpIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Welcome to Strategy Assistant
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ask me to create trading strategies, explain indicators, or help optimize your trading approach.
            </Typography>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Chip label="Create a momentum strategy" onClick={() => setInput('Create a momentum trading strategy using RSI and MACD')} />
              <Chip label="Mean reversion strategy" onClick={() => setInput('Build a mean reversion strategy for crypto trading')} />
              <Chip label="Scalping strategy" onClick={() => setInput('Generate a 5-minute scalping strategy')} />
            </Box>
          </Box>
        ) : (
          messages.map((message) => (
            <Box key={message.id} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                {message.role === 'user' ? (
                  <PersonIcon sx={{ mt: 1 }} />
                ) : (
                  <BotIcon sx={{ mt: 1 }} color="primary" />
                )}
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {message.role === 'user' ? 'You' : 'Assistant'} • {message.timestamp.toLocaleTimeString()}
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {message.content}
                  </Typography>
                  
                  {message.strategy && (
                    <Card sx={{ mt: 2 }}>
                      <CardContent>
                        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
                          <Tab label="Overview" />
                          <Tab label="Code" />
                          <Tab label="Parameters" />
                          <Tab label="Risk Metrics" />
                        </Tabs>
                        
                        <Box sx={{ mt: 2 }}>
                          {activeTab === 0 && (
                            <Box>
                              <Typography variant="h6" gutterBottom>{message.strategy.name}</Typography>
                              <Typography variant="body2" paragraph>{message.strategy.description}</Typography>
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip label={`Timeframe: ${message.strategy.timeframe}`} size="small" />
                                {message.strategy.requiredIndicators.map(ind => (
                                  <Chip key={ind} label={ind} size="small" color="primary" />
                                ))}
                              </Box>
                            </Box>
                          )}
                          
                          {activeTab === 1 && (
                            <Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="subtitle2">
                                  {message.strategy.language}
                                </Typography>
                                <IconButton size="small" onClick={() => copyCode(message.strategy!.code)}>
                                  <CopyIcon fontSize="small" />
                                </IconButton>
                              </Box>
                              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                                <SyntaxHighlighter
                                  language={message.strategy.language}
                                  style={vscDarkPlus}
                                  customStyle={{ margin: 0, fontSize: '0.875rem' }}
                                >
                                  {message.strategy.code}
                                </SyntaxHighlighter>
                              </Box>
                            </Box>
                          )}
                          
                          {activeTab === 2 && (
                            <Box>
                              {Object.entries(message.strategy.parameters).map(([key, value]) => (
                                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2">{key}:</Typography>
                                  <Typography variant="body2" fontWeight="medium">
                                    {typeof value === 'number' ? value.toFixed(4) : String(value)}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          )}
                          
                          {activeTab === 3 && (
                            <Box>
                              {Object.entries(message.strategy.riskMetrics).map(([key, value]) => (
                                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2">{key}:</Typography>
                                  <Typography variant="body2" fontWeight="medium">
                                    {typeof value === 'number' ? 
                                      (key.includes('Rate') || key.includes('ratio') ? 
                                        (value * 100).toFixed(1) + '%' : 
                                        value.toFixed(4)
                                      ) : String(value)}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  )}
                </Box>
              </Box>
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        {!apiKey && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            No API key detected. Add your Anthropic API key in Settings or set ANTHROPIC_API_KEY environment variable.
          </Alert>
        )}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="Ask me to create a trading strategy..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            multiline
            maxRows={3}
            disabled={isLoading}
          />
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : <SendIcon />}
          >
            Send
          </Button>
        </Box>
      </Box>
    </Paper>
  )
}