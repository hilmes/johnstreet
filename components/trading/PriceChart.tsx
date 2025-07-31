'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions,
  ScriptableContext
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { useLivePrice } from '@/app/hooks/useLivePrices'
import { ds } from '@/lib/design'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
)

interface PriceDataPoint {
  time: number
  price: number
  volume?: number
}

interface PriceChartProps {
  symbol: string
  height?: number
  showVolume?: boolean
  timeframe?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
}

export const PriceChart: React.FC<PriceChartProps> = ({ 
  symbol, 
  height = 400, 
  showVolume = false,
  timeframe = '1m'
}) => {
  const { price: livePrice, isConnected, error } = useLivePrice(symbol)
  const [priceHistory, setPriceHistory] = useState<PriceDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const maxDataPoints = 100 // Keep last 100 points for performance

  // Fetch historical data on mount
  useEffect(() => {
    const fetchHistoricalData = async () => {
      try {
        setIsLoading(true)
        // Fetch initial historical data from Kraken API
        const response = await fetch(`/api/kraken/historical?symbol=${symbol}&interval=${timeframe}&count=50`)
        if (response.ok) {
          const data = await response.json()
          setPriceHistory(data.history || [])
        }
      } catch (err) {
        console.error('Failed to fetch historical data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistoricalData()
  }, [symbol, timeframe])

  // Update price history with live data
  useEffect(() => {
    if (livePrice && livePrice.price) {
      setPriceHistory(prev => {
        const newPoint: PriceDataPoint = {
          time: livePrice.timestamp,
          price: livePrice.price,
          volume: livePrice.volume24h
        }

        const updated = [...prev, newPoint]
        
        // Keep only the most recent data points
        if (updated.length > maxDataPoints) {
          return updated.slice(-maxDataPoints)
        }
        
        return updated
      })
    }
  }, [livePrice])

  const chartData = useMemo(() => {
    if (!priceHistory.length) {
      return {
        labels: [],
        datasets: []
      }
    }

    const labels = priceHistory.map(point => new Date(point.time))
    const prices = priceHistory.map(point => point.price)
    
    // Calculate if price is trending up or down for gradient
    const isUptrend = prices.length > 1 && prices[prices.length - 1] > prices[0]
    
    return {
      labels,
      datasets: [
        {
          label: symbol,
          data: prices,
          borderColor: isUptrend ? ds.colors.semantic.profit : ds.colors.semantic.loss,
          backgroundColor: (context: ScriptableContext<'line'>) => {
            const chart = context.chart
            const { ctx, chartArea } = chart
            if (!chartArea) return 'transparent'
            
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
            gradient.addColorStop(0, isUptrend 
              ? 'rgba(16, 185, 129, 0.2)' 
              : 'rgba(239, 68, 68, 0.2)'
            )
            gradient.addColorStop(1, 'rgba(16, 185, 129, 0)')
            return gradient
          },
          borderWidth: 2,
          fill: true,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: isUptrend ? ds.colors.semantic.profit : ds.colors.semantic.loss,
          pointHoverBorderColor: ds.colors.semantic.background,
          pointHoverBorderWidth: 2,
        }
      ]
    }
  }, [priceHistory, symbol])

  const options: ChartOptions<'line'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeOutQuart'
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: ds.colors.semantic.surface,
        titleColor: ds.colors.neutral[900],
        bodyColor: ds.colors.neutral[900],
        borderColor: ds.colors.semantic.border,
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context) => {
            const date = new Date(context[0].parsed.x)
            return date.toLocaleString()
          },
          label: (context) => {
            const price = context.parsed.y
            return `${symbol}: $${price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 8
            })}`
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        display: true,
        grid: {
          color: ds.colors.semantic.border,
          drawBorder: false
        },
        ticks: {
          color: ds.colors.neutral[400],
          font: {
            family: ds.typography.secondary,
            size: 11
          },
          maxTicksLimit: 8
        }
      },
      y: {
        display: true,
        position: 'right',
        grid: {
          color: ds.colors.semantic.border,
          drawBorder: false
        },
        ticks: {
          color: ds.colors.neutral[400],
          font: {
            family: ds.typography.secondary,
            size: 11
          },
          callback: (value) => {
            return `$${Number(value).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6
            })}`
          }
        }
      }
    }
  }), [symbol])

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
        <div style={{ color: ds.colors.neutral[400] }}>Loading chart data...</div>
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
          Failed to load price data: {error.message}
        </div>
      </div>
    )
  }

  return (
    <div style={{ height, position: 'relative' }}>
      {/* Chart Header */}
      <div style={{
        position: 'absolute',
        top: ds.spacing.md,
        left: ds.spacing.md,
        zIndex: 10,
        backgroundColor: 'rgba(26, 26, 26, 0.8)',
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
          {symbol}
        </div>
        {livePrice && (
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
        )}
        {livePrice && (
          <div style={{
            fontSize: ds.typography.scale.xs,
            color: livePrice.changePercent24h >= 0 ? ds.colors.semantic.profit : ds.colors.semantic.loss
          }}>
            {livePrice.changePercent24h >= 0 ? '+' : ''}{livePrice.changePercent24h.toFixed(2)}%
          </div>
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
      <div style={{ height: '100%', padding: ds.spacing.sm }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
}