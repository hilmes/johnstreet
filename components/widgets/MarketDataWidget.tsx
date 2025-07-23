'use client'

import React from 'react'
import { Typography, Chip, Skeleton, Box } from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import BarChartIcon from '@mui/icons-material/BarChart'
import CandlestickChartIcon from '@mui/icons-material/CandlestickChart'
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt'
import { useLivePrice } from '@/hooks/useLivePrices'

interface MarketDataWidgetProps {
  symbol: string
}

interface MarketStat {
  label: string
  value: string | number
  subValue?: string
  change?: number
  icon?: React.ReactNode
}

export function MarketDataWidget({ symbol }: MarketDataWidgetProps) {
  const { price: liveData, isConnected, error } = useLivePrice(symbol)
  
  // Fallback to mock data if no live data available
  const marketData = React.useMemo(() => {
    if (liveData) {
      return {
        price: liveData.price,
        change24h: liveData.changePercent24h,
        high24h: liveData.high24h,
        low24h: liveData.low24h,
        volume24h: liveData.volume24h,
        marketCap: liveData.price * 19000000, // Mock market cap based on price
        openInterest: 45678901, // Still mocked
        fundingRate: 0.0125, // Still mocked
        lastUpdate: liveData.timestamp
      }
    }
    
    // Fallback mock data
    return {
      price: 42156.78,
      change24h: 2.34,
      high24h: 42890.12,
      low24h: 41023.45,
      volume24h: 123456789,
      marketCap: 823456789012,
      openInterest: 45678901,
      fundingRate: 0.0125,
      lastUpdate: Date.now()
    }
  }, [liveData])

  const isPositive = marketData.change24h > 0

  const stats: MarketStat[] = [
    {
      label: 'Current Price',
      value: `$${marketData.price.toLocaleString()}`,
      change: marketData.change24h,
      icon: <ShowChartIcon className="text-purple-500" />
    },
    {
      label: '24h Range',
      value: `$${marketData.high24h.toLocaleString()}`,
      subValue: `$${marketData.low24h.toLocaleString()}`,
      icon: <CandlestickChartIcon className="text-orange-500" />
    },
    {
      label: '24h Volume',
      value: `$${(marketData.volume24h / 1000000).toFixed(2)}M`,
      icon: <BarChartIcon className="text-blue-500" />
    },
    {
      label: 'Market Cap',
      value: `$${(marketData.marketCap / 1000000000).toFixed(2)}B`,
      icon: <TrendingUpIcon className="text-green-500" />
    },
    {
      label: 'Open Interest',
      value: `$${(marketData.openInterest / 1000000).toFixed(2)}M`,
      icon: <ShowChartIcon className="text-indigo-500" />
    },
    {
      label: 'Funding Rate',
      value: `${(marketData.fundingRate * 100).toFixed(3)}%`,
      icon: <TrendingUpIcon className={marketData.fundingRate > 0 ? "text-green-500" : "text-red-500"} />
    }
  ]

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Box className="flex items-center gap-2 justify-end">
        <SignalCellularAltIcon 
          fontSize="small" 
          className={isConnected ? 'text-green-500' : 'text-gray-500'}
        />
        <Typography variant="caption" className={isConnected ? 'text-green-500' : 'text-gray-500'}>
          {isConnected ? 'Live' : 'Disconnected'}
        </Typography>
        {liveData && (
          <Typography variant="caption" className="text-gray-400 ml-2">
            Updated: {new Date(marketData.lastUpdate).toLocaleTimeString()}
          </Typography>
        )}
      </Box>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, index) => (
          <div 
            key={stat.label}
            className="group p-4 rounded-lg bg-gray-900 hover:bg-gray-800 transition-all cursor-pointer relative overflow-hidden"
          >
            {/* Live indicator pulse */}
            {isConnected && liveData && (
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            )}
            
            <div className="flex items-start justify-between mb-2">
              <Typography variant="caption" className="text-gray-400 uppercase tracking-wider">
                {stat.label}
              </Typography>
              <div className="opacity-50 group-hover:opacity-100 transition-opacity">
                {stat.icon}
              </div>
            </div>
            
            <div>
              <div className="flex items-baseline gap-2">
                {liveData ? (
                  <Typography variant="h6" className="font-bold">
                    {stat.value}
                  </Typography>
                ) : (
                  <Skeleton variant="text" width={100} height={28} />
                )}
                {stat.change !== undefined && (
                  <Chip
                    size="small"
                    icon={isPositive ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
                    label={`${isPositive ? '+' : ''}${stat.change.toFixed(2)}%`}
                    className={`scale-90 ${isPositive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}
                  />
                )}
              </div>
              {stat.subValue && (
                <Typography variant="caption" className="text-gray-400">
                  Low: {stat.subValue}
                </Typography>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {error && (
        <Typography variant="caption" className="text-red-400 text-center">
          Error connecting to price feed: {error.message}
        </Typography>
      )}
    </div>
  )
}