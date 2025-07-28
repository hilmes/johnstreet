'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useLivePrice } from '@/app/hooks/useLivePrices'
import { ds } from '@/lib/design/TufteDesignSystem'

interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp?: string
}

interface CandlestickChartProps {
  symbol: string
  height?: number
  timeframe?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  showVolume?: boolean
}

// Custom Candlestick component for Recharts
const Candlestick = (props: any) => {
  const { payload, x, y, width, height } = props
  if (!payload) return null

  const { open, high, low, close } = payload
  const isGreen = close > open
  const bodyHeight = Math.abs(close - open)
  const bodyY = Math.min(close, open)
  
  // Scale values to chart coordinates
  const candleWidth = width * 0.6
  const wickWidth = 1
  const candleX = x + (width - candleWidth) / 2
  const wickX = x + width / 2

  return (
    <g>
      {/* Wick (high-low line) */}
      <line
        x1={wickX}
        y1={y}
        x2={wickX}
        y2={y + height}
        stroke={isGreen ? ds.colors.semantic.profit : ds.colors.semantic.loss}
        strokeWidth={wickWidth}
      />
      
      {/* Body (open-close rectangle) */}
      <rect
        x={candleX}
        y={y + (height * (1 - (bodyY - low) / (high - low)))}
        width={candleWidth}
        height={height * (bodyHeight / (high - low))}
        fill={isGreen ? ds.colors.semantic.profit : ds.colors.semantic.loss}
        stroke={isGreen ? ds.colors.semantic.profit : ds.colors.semantic.loss}
        strokeWidth={1}
        opacity={isGreen ? 0.8 : 1}
      />
    </g>
  )
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  symbol,
  height = 500,
  timeframe = '1h',
  showVolume = true
}) => {
  const { price: livePrice, isConnected, error } = useLivePrice(symbol)
  const [candleData, setCandleData] = useState<CandleData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch historical candlestick data
  useEffect(() => {
    const fetchCandleData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/kraken/historical?symbol=${symbol}&interval=${timeframe}&count=100`)
        if (response.ok) {
          const data = await response.json()
          const formattedData = data.history.map((item: any) => ({
            ...item,
            timestamp: new Date(item.time).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          }))
          setCandleData(formattedData)
        }
      } catch (err) {
        console.error('Failed to fetch candle data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCandleData()
  }, [symbol, timeframe])

  // Update with live price data
  useEffect(() => {
    if (livePrice && candleData.length > 0) {
      setCandleData(prev => {
        const lastCandle = prev[prev.length - 1]
        const currentTime = Math.floor(livePrice.timestamp / (60 * 1000)) * (60 * 1000) // Round to minute
        
        if (lastCandle && Math.abs(lastCandle.time - currentTime) < 60000) {
          // Update current candle
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...lastCandle,
            close: livePrice.price,
            high: Math.max(lastCandle.high, livePrice.price),
            low: Math.min(lastCandle.low, livePrice.price),
            volume: lastCandle.volume + (livePrice.volume24h / 1440) // Estimate minute volume
          }
          return updated
        } else {
          // Create new candle
          const newCandle: CandleData = {
            time: currentTime,
            open: livePrice.price,
            high: livePrice.price,
            low: livePrice.price,
            close: livePrice.price,
            volume: livePrice.volume24h / 1440,
            timestamp: new Date(currentTime).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          }
          return [...prev.slice(-99), newCandle] // Keep last 100 candles
        }
      })
    }
  }, [livePrice, candleData.length])

  const chartData = useMemo(() => {
    return candleData.map(candle => ({
      ...candle,
      color: candle.close > candle.open ? ds.colors.semantic.profit : ds.colors.semantic.loss
    }))
  }, [candleData])

  if (isLoading) {
    return (
      <div 
        style={{ 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: ds.colors.semantic.surface,
          borderRadius: ds.radius.md,
          border: `1px solid ${ds.colors.semantic.border}`
        }}
      >
        <div style={{ color: ds.colors.neutral[400] }}>Loading candlestick data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div 
        style={{ 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: ds.colors.semantic.surface,
          borderRadius: ds.radius.md,
          border: `1px solid ${ds.colors.semantic.border}`
        }}
      >
        <div style={{ color: ds.colors.semantic.loss }}>
          Failed to load candlestick data: {error.message}
        </div>
      </div>
    )
  }

  return (
    <div style={{ height, position: 'relative', backgroundColor: ds.colors.semantic.surface }}>
      {/* Chart Header */}
      <div style={{
        position: 'absolute',
        top: ds.spacing.md,
        left: ds.spacing.md,
        zIndex: 10,
        backgroundColor: 'rgba(26, 26, 26, 0.9)',
        padding: `${ds.spacing.sm} ${ds.spacing.md}`,
        borderRadius: ds.radius.sm,
        backdropFilter: 'blur(4px)'
      }}>
        <div style={{
          fontSize: ds.typography.scale.sm,
          fontWeight: ds.typography.weights.medium,
          color: ds.colors.neutral[900],
          marginBottom: ds.spacing.xs
        }}>
          {symbol} • {timeframe.toUpperCase()}
        </div>
        {livePrice && (
          <>
            <div style={{
              fontSize: ds.typography.scale.lg,
              fontWeight: ds.typography.weights.semibold,
              color: livePrice.changePercent24h >= 0 ? ds.colors.semantic.profit : ds.colors.semantic.loss
            }}>
              ${livePrice.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 8
              })}
            </div>
            <div style={{
              fontSize: ds.typography.scale.xs,
              color: livePrice.changePercent24h >= 0 ? ds.colors.semantic.profit : ds.colors.semantic.loss
            }}>
              {livePrice.changePercent24h >= 0 ? '+' : ''}{livePrice.changePercent24h.toFixed(2)}%
            </div>
          </>
        )}
      </div>

      {/* Connection Status */}
      <div style={{
        position: 'absolute',
        top: ds.spacing.md,
        right: ds.spacing.md,
        zIndex: 10
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isConnected ? ds.colors.semantic.profit : ds.colors.semantic.loss,
          boxShadow: `0 0 8px ${isConnected ? ds.colors.semantic.profit : ds.colors.semantic.loss}`
        }} />
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={showVolume ? "70%" : "100%"}>
        <ComposedChart
          data={chartData}
          margin={{ top: 60, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={ds.colors.semantic.border}
            opacity={0.3}
          />
          <XAxis 
            dataKey="timestamp"
            axisLine={false}
            tickLine={false}
            tick={{ 
              fill: ds.colors.neutral[400], 
              fontSize: 11,
              fontFamily: ds.typography.secondary 
            }}
          />
          <YAxis 
            domain={['dataMin - 50', 'dataMax + 50']}
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ 
              fill: ds.colors.neutral[400], 
              fontSize: 11,
              fontFamily: ds.typography.secondary 
            }}
            tickFormatter={(value) => `$${Number(value).toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2
            })}`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div style={{
                    backgroundColor: ds.colors.semantic.surface,
                    border: `1px solid ${ds.colors.semantic.border}`,
                    borderRadius: ds.radius.sm,
                    padding: ds.spacing.md,
                    fontSize: ds.typography.scale.sm
                  }}>
                    <div style={{ color: ds.colors.neutral[900], marginBottom: ds.spacing.xs }}>
                      {new Date(data.time).toLocaleString()}
                    </div>
                    <div style={{ color: ds.colors.neutral[400] }}>
                      Open: ${data.open.toFixed(2)}
                    </div>
                    <div style={{ color: ds.colors.neutral[400] }}>
                      High: ${data.high.toFixed(2)}
                    </div>
                    <div style={{ color: ds.colors.neutral[400] }}>
                      Low: ${data.low.toFixed(2)}
                    </div>
                    <div style={{ color: data.close > data.open ? ds.colors.semantic.profit : ds.colors.semantic.loss }}>
                      Close: ${data.close.toFixed(2)}
                    </div>
                    <div style={{ color: ds.colors.neutral[400] }}>
                      Volume: {data.volume.toFixed(2)}
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          
          {/* Custom candlestick rendering */}
          <Bar dataKey="high" fill="transparent" />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Volume Chart */}
      {showVolume && (
        <ResponsiveContainer width="100%" height="30%">
          <ComposedChart
            data={chartData}
            margin={{ top: 0, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={ds.colors.semantic.border}
              opacity={0.3}
            />
            <XAxis 
              dataKey="timestamp"
              axisLine={false}
              tickLine={false}
              tick={{ 
                fill: ds.colors.neutral[400], 
                fontSize: 11,
                fontFamily: ds.typography.secondary 
              }}
            />
            <YAxis 
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ 
                fill: ds.colors.neutral[400], 
                fontSize: 11,
                fontFamily: ds.typography.secondary 
              }}
              tickFormatter={(value) => `${Number(value).toFixed(0)}`}
            />
            <Bar dataKey="volume">
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.close > entry.open ? ds.colors.semantic.profit : ds.colors.semantic.loss}
                  opacity={0.6}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}