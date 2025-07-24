'use client'

import React, { useState, useEffect } from 'react'
import { dieterRamsDesign as ds, designHelpers } from '@/lib/design/DieterRamsDesignSystem'

interface PumpSignal {
  symbol: string
  confidence: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  indicators: {
    sentimentSpike: boolean
    volumeAnomaly: boolean
    priceAnomaly: boolean
    socialMediaBuzz: boolean
    influencerActivity: boolean
    coordinated: boolean
  }
  socialMetrics: {
    mentionCount: number
    sentimentScore: number
    engagementRate: number
    accountQuality: number
  }
  timestamp: number
}

interface DetectionResult {
  symbol: string
  timestamp: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  alerts: Array<{
    type: string
    message: string
    severity: 'info' | 'warning' | 'critical'
  }>
  data: {
    social: any
    market: any
    combined: any
  }
}

export default function PumpDetectorPage() {
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [timeframe, setTimeframe] = useState('hour')
  const [monitoring, setMonitoring] = useState(false)
  
  const cryptoSymbols = ['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'AVAX', 'MATIC', 'DOGE', 'SHIB', 'XRP']

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        runDetection()
      }, 60000)
      
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const runDetection = async (symbol?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        timeframe,
        ...(symbol && { symbol })
      })
      
      const response = await fetch(`/api/sentiment/pump-detector?${params}`)
      const result = await response.json()
      
      if (result.success) {
        if (symbol) {
          setDetectionResults(prev => {
            const filtered = prev.filter(r => r.symbol !== symbol)
            return [result.data, ...filtered].slice(0, 50)
          })
        } else {
          await runBulkDetection()
        }
      }
    } catch (error) {
      console.error('Detection error:', error)
    } finally {
      setLoading(false)
    }
  }

  const runBulkDetection = async () => {
    try {
      const response = await fetch('/api/sentiment/pump-detector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: cryptoSymbols,
          exchanges: ['kraken'],
          timeframe
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setDetectionResults(result.data.results)
      }
    } catch (error) {
      console.error('Bulk detection error:', error)
    }
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return ds.colors.semantic.error
      case 'high': return ds.colors.semantic.warning
      case 'medium': return ds.colors.semantic.info
      case 'low': return ds.colors.semantic.success
      default: return ds.colors.semantic.neutral
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return ds.colors.semantic.error
    if (confidence > 0.6) return ds.colors.semantic.warning
    if (confidence > 0.4) return ds.colors.semantic.info
    return ds.colors.semantic.success
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

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
              Pump & Dump Detector
            </h1>
            <p style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              margin: 0,
            }}>
              AI-powered detection of potential market manipulation
            </p>
          </div>

          <div style={{ display: 'flex', gap: ds.spacing.medium, alignItems: 'center' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: ds.spacing.small,
              fontSize: ds.typography.scale.small,
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Auto Refresh
            </label>
            
            <button
              onClick={() => runDetection()}
              disabled={loading}
              style={{
                padding: `${ds.spacing.small} ${ds.spacing.large}`,
                backgroundColor: ds.colors.semantic.primary,
                color: ds.colors.grayscale[5],
                border: 'none',
                borderRadius: ds.interactive.radius.medium,
                fontSize: ds.typography.scale.small,
                fontWeight: ds.typography.weights.medium,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: designHelpers.animate('all', ds.animation.durations.fast),
              }}
            >
              {loading ? 'Scanning...' : 'Scan Now'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: ds.grid.maxWidth,
        margin: '0 auto',
        padding: ds.spacing.large,
      }}>
        {/* Controls */}
        <section style={{
          backgroundColor: ds.colors.semantic.background.secondary,
          borderRadius: ds.interactive.radius.medium,
          padding: ds.spacing.large,
          marginBottom: ds.spacing.xlarge,
          border: `1px solid ${ds.colors.grayscale[20]}`,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: ds.spacing.large,
            alignItems: 'end',
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.small,
              }}>
                Symbol (Optional)
              </label>
              <input
                type="text"
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value.toUpperCase())}
                placeholder="e.g., BTC, ETH"
                style={{
                  width: '100%',
                  padding: ds.spacing.small,
                  backgroundColor: ds.colors.semantic.background.primary,
                  color: ds.colors.grayscale[90],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.small,
                  fontSize: ds.typography.scale.small,
                  fontFamily: ds.typography.families.data,
                }}
              />
              <div style={{
                fontSize: ds.typography.scale.mini,
                color: ds.colors.grayscale[60],
                marginTop: ds.spacing.mini,
              }}>
                Leave empty for bulk scan
              </div>
            </div>
            
            <div>
              <label style={{
                display: 'block',
                fontSize: ds.typography.scale.small,
                color: ds.colors.grayscale[70],
                marginBottom: ds.spacing.small,
              }}>
                Timeframe
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                style={{
                  width: '100%',
                  padding: ds.spacing.small,
                  backgroundColor: ds.colors.semantic.background.primary,
                  color: ds.colors.grayscale[90],
                  border: `1px solid ${ds.colors.grayscale[30]}`,
                  borderRadius: ds.interactive.radius.small,
                  fontSize: ds.typography.scale.small,
                  cursor: 'pointer',
                }}
              >
                <option value="hour">Last Hour</option>
                <option value="day">Last Day</option>
                <option value="week">Last Week</option>
              </select>
            </div>
            
            <button
              onClick={() => runDetection(selectedSymbol || undefined)}
              disabled={loading}
              style={{
                padding: ds.spacing.small,
                backgroundColor: 'transparent',
                color: ds.colors.semantic.primary,
                border: `1px solid ${ds.colors.semantic.primary}`,
                borderRadius: ds.interactive.radius.medium,
                fontSize: ds.typography.scale.small,
                fontWeight: ds.typography.weights.medium,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: designHelpers.animate('all', ds.animation.durations.fast),
              }}
            >
              {selectedSymbol ? `Scan ${selectedSymbol}` : 'Bulk Scan'}
            </button>
            
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: ds.spacing.small,
              fontSize: ds.typography.scale.small,
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={monitoring}
                onChange={(e) => setMonitoring(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Live Monitor
            </label>
          </div>
        </section>

        {/* Summary Cards */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: ds.spacing.large,
          marginBottom: ds.spacing.xlarge,
        }}>
          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            border: `1px solid ${ds.colors.grayscale[20]}`,
          }}>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Critical Alerts
            </div>
            <div style={{
              fontSize: ds.typography.scale.xxlarge,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              color: ds.colors.semantic.error,
            }}>
              {detectionResults.filter(r => r.riskLevel === 'critical').length}
            </div>
          </div>
          
          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            border: `1px solid ${ds.colors.grayscale[20]}`,
          }}>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              High Risk
            </div>
            <div style={{
              fontSize: ds.typography.scale.xxlarge,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              color: ds.colors.semantic.warning,
            }}>
              {detectionResults.filter(r => r.riskLevel === 'high').length}
            </div>
          </div>
          
          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            border: `1px solid ${ds.colors.grayscale[20]}`,
          }}>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Total Scanned
            </div>
            <div style={{
              fontSize: ds.typography.scale.xxlarge,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
            }}>
              {detectionResults.length}
            </div>
          </div>
          
          <div style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            border: `1px solid ${ds.colors.grayscale[20]}`,
          }}>
            <div style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.small,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Avg Confidence
            </div>
            <div style={{
              fontSize: ds.typography.scale.xxlarge,
              fontWeight: ds.typography.weights.semibold,
              fontFamily: ds.typography.families.data,
              color: ds.colors.semantic.success,
            }}>
              {detectionResults.length > 0 ? 
                Math.round((detectionResults.reduce((sum, r) => sum + r.confidence, 0) / detectionResults.length) * 100) : 0
              }%
            </div>
          </div>
        </section>

        {/* Trending Symbols */}
        {detectionResults.length > 0 && detectionResults[0]?.data?.social?.mentionedSymbols && (
          <section style={{
            backgroundColor: ds.colors.semantic.background.secondary,
            borderRadius: ds.interactive.radius.medium,
            padding: ds.spacing.large,
            marginBottom: ds.spacing.xlarge,
            border: `1px solid ${ds.colors.grayscale[20]}`,
          }}>
            <h2 style={{
              fontSize: ds.typography.scale.medium,
              fontWeight: ds.typography.weights.semibold,
              marginBottom: ds.spacing.small,
            }}>
              Trending Symbols
            </h2>
            <p style={{
              fontSize: ds.typography.scale.small,
              color: ds.colors.grayscale[70],
              marginBottom: ds.spacing.medium,
            }}>
              Most mentioned cryptocurrencies in recent social media activity
            </p>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: ds.spacing.small,
            }}>
              {detectionResults[0].data.social.mentionedSymbols.map((item: any) => (
                <button
                  key={item.symbol}
                  onClick={() => {
                    setSelectedSymbol(item.symbol)
                    runDetection(item.symbol)
                  }}
                  style={{
                    padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                    backgroundColor: item.mentions > 50 ? 
                      `${ds.colors.semantic.error}10` : 
                      item.mentions > 20 ? 
                        `${ds.colors.semantic.warning}10` : 
                        ds.colors.semantic.background.tertiary,
                    color: item.mentions > 50 ? 
                      ds.colors.semantic.error : 
                      item.mentions > 20 ? 
                        ds.colors.semantic.warning : 
                        ds.colors.grayscale[80],
                    border: `1px solid ${item.mentions > 50 ? 
                      ds.colors.semantic.error : 
                      item.mentions > 20 ? 
                        ds.colors.semantic.warning : 
                        ds.colors.grayscale[30]}`,
                    borderRadius: ds.interactive.radius.small,
                    fontSize: ds.typography.scale.small,
                    fontFamily: ds.typography.families.data,
                    cursor: 'pointer',
                    transition: designHelpers.animate('all', ds.animation.durations.fast),
                  }}
                >
                  {item.symbol} ({item.mentions})
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Detection Results */}
        <section style={{
          backgroundColor: ds.colors.semantic.background.secondary,
          borderRadius: ds.interactive.radius.medium,
          overflow: 'hidden',
          border: `1px solid ${ds.colors.grayscale[20]}`,
        }}>
          <div style={{
            padding: ds.spacing.large,
            borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{
              fontSize: ds.typography.scale.medium,
              fontWeight: ds.typography.weights.semibold,
              margin: 0,
            }}>
              Detection Results
            </h2>
            {loading && (
              <div style={{
                fontSize: ds.typography.scale.small,
                color: ds.colors.semantic.info,
              }}>
                Scanning...
              </div>
            )}
          </div>
          
          {detectionResults.length === 0 && !loading ? (
            <div style={{
              padding: ds.spacing.xxlarge,
              textAlign: 'center',
              color: ds.colors.grayscale[70],
              fontSize: ds.typography.scale.small,
            }}>
              No detection results yet. Click "Scan Now" to start.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: ds.typography.scale.small,
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: ds.colors.semantic.background.tertiary,
                  }}>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Symbol
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Risk Level
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Confidence
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Alerts
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Social Signals
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Market Signals
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'left',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Time
                    </th>
                    <th style={{
                      padding: ds.spacing.medium,
                      textAlign: 'center',
                      fontWeight: ds.typography.weights.medium,
                      color: ds.colors.grayscale[70],
                      borderBottom: `1px solid ${ds.colors.grayscale[20]}`,
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detectionResults.map((result, index) => (
                    <tr key={`${result.symbol}-${index}`}>
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        <div style={{
                          fontSize: ds.typography.scale.base,
                          fontWeight: ds.typography.weights.semibold,
                          fontFamily: ds.typography.families.data,
                        }}>
                          {result.symbol}
                        </div>
                      </td>
                      
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        <span style={{
                          display: 'inline-block',
                          padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                          backgroundColor: `${getRiskColor(result.riskLevel)}20`,
                          color: getRiskColor(result.riskLevel),
                          borderRadius: ds.interactive.radius.small,
                          fontSize: ds.typography.scale.mini,
                          fontWeight: ds.typography.weights.medium,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>
                          {result.riskLevel}
                        </span>
                      </td>
                      
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: ds.spacing.small }}>
                          <div style={{
                            width: '60px',
                            height: '4px',
                            backgroundColor: ds.colors.grayscale[20],
                            borderRadius: ds.interactive.radius.pill,
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${result.confidence * 100}%`,
                              height: '100%',
                              backgroundColor: getConfidenceColor(result.confidence),
                            }} />
                          </div>
                          <span style={{
                            fontSize: ds.typography.scale.small,
                            fontFamily: ds.typography.families.data,
                            fontWeight: ds.typography.weights.medium,
                          }}>
                            {Math.round(result.confidence * 100)}%
                          </span>
                        </div>
                      </td>
                      
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: ds.spacing.mini }}>
                          {result.alerts.slice(0, 2).map((alert, i) => (
                            <span
                              key={i}
                              style={{
                                display: 'inline-block',
                                padding: `${ds.spacing.micro} ${ds.spacing.mini}`,
                                backgroundColor: alert.severity === 'critical' ? 
                                  `${ds.colors.semantic.error}10` : 
                                  `${ds.colors.semantic.warning}10`,
                                color: alert.severity === 'critical' ? 
                                  ds.colors.semantic.error : 
                                  ds.colors.semantic.warning,
                                borderRadius: ds.interactive.radius.small,
                                fontSize: ds.typography.scale.mini,
                              }}
                            >
                              {alert.message}
                            </span>
                          ))}
                        </div>
                      </td>
                      
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        {result.data.social && (
                          <span style={{
                            display: 'inline-block',
                            padding: `${ds.spacing.mini} ${ds.spacing.small}`,
                            backgroundColor: `${ds.colors.semantic.info}10`,
                            color: ds.colors.semantic.info,
                            borderRadius: ds.interactive.radius.small,
                            fontSize: ds.typography.scale.mini,
                            fontFamily: ds.typography.families.data,
                          }}>
                            {result.data.social.symbolSignals} signals
                          </span>
                        )}
                      </td>
                      
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                      }}>
                        <div style={{ display: 'flex', gap: ds.spacing.small }}>
                          {result.data.market?.volumeSpike && (
                            <span style={{
                              color: ds.colors.semantic.warning,
                              fontSize: ds.typography.scale.small,
                            }}>
                              Vol↑
                            </span>
                          )}
                          {result.data.market?.priceAnomaly && (
                            <span style={{
                              color: ds.colors.semantic.error,
                              fontSize: ds.typography.scale.small,
                            }}>
                              Price↑
                            </span>
                          )}
                        </div>
                      </td>
                      
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                        color: ds.colors.grayscale[70],
                        fontFamily: ds.typography.families.data,
                      }}>
                        {formatTimestamp(result.timestamp)}
                      </td>
                      
                      <td style={{
                        padding: ds.spacing.medium,
                        borderBottom: `1px solid ${ds.colors.grayscale[10]}`,
                        textAlign: 'center',
                      }}>
                        <button
                          onClick={() => runDetection(result.symbol)}
                          disabled={loading}
                          style={{
                            padding: ds.spacing.mini,
                            backgroundColor: 'transparent',
                            color: ds.colors.semantic.primary,
                            border: `1px solid ${ds.colors.grayscale[30]}`,
                            borderRadius: ds.interactive.radius.small,
                            fontSize: ds.typography.scale.mini,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                            transition: designHelpers.animate('all', ds.animation.durations.fast),
                          }}
                        >
                          Refresh
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Warning Notice */}
        <div style={{
          marginTop: ds.spacing.xlarge,
          padding: ds.spacing.large,
          backgroundColor: `${ds.colors.semantic.warning}10`,
          border: `1px solid ${ds.colors.semantic.warning}`,
          borderRadius: ds.interactive.radius.medium,
        }}>
          <p style={{
            fontSize: ds.typography.scale.small,
            margin: 0,
          }}>
            <strong>Disclaimer:</strong> This tool is for educational and informational purposes only. 
            Pump and dump detection is not 100% accurate and should not be used as the sole basis for trading decisions. 
            Always conduct your own research and consider consulting with financial advisors.
          </p>
        </div>
      </main>
    </div>
  )
}