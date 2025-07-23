'use client'

import React from 'react'
import { Typography, Divider, Chip } from '@mui/material'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'

interface Asset {
  symbol: string
  amount: number
  value: number
  percentage: number
  change24h: number
}

export function PortfolioBalance() {
  // Mock portfolio data
  const assets: Asset[] = [
    { symbol: 'BTC', amount: 0.5, value: 21078.39, percentage: 45, change24h: 2.3 },
    { symbol: 'ETH', amount: 3.2, value: 9600.00, percentage: 20, change24h: -1.2 },
    { symbol: 'USDT', amount: 8000, value: 8000.00, percentage: 17, change24h: 0 },
    { symbol: 'ADA', amount: 5000, value: 3500.00, percentage: 8, change24h: 5.7 },
    { symbol: 'SOL', amount: 100, value: 4700.00, percentage: 10, change24h: -3.2 },
  ]

  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0)
  const totalChange = assets.reduce((sum, asset) => sum + (asset.value * asset.change24h / 100), 0)
  const totalChangePercent = (totalChange / totalValue) * 100

  const COLORS = ['#6563FF', '#90caf9', '#f48fb1', '#ce93d8', '#80cbc4']

  const pieData = assets.map((asset, index) => ({
    name: asset.symbol,
    value: asset.percentage,
    color: COLORS[index % COLORS.length]
  }))

  return (
    <div className="h-full flex flex-col">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AccountBalanceWalletIcon className="text-purple-500" />
            <Typography variant="h5" className="font-bold">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </div>
          <div className="flex items-center gap-2">
            <Typography variant="body2" className="text-gray-400">
              24h Change:
            </Typography>
            <Chip
              size="small"
              icon={<TrendingUpIcon />}
              label={`${totalChangePercent >= 0 ? '+' : ''}${totalChangePercent.toFixed(2)}%`}
              className={`${totalChangePercent >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
            />
          </div>
        </div>
        
        {/* Pie Chart */}
        <div className="w-32 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Divider className="mb-4" />

      {/* Assets List */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-3">
          {assets.map((asset) => (
            <div 
              key={asset.symbol} 
              className="group p-3 rounded-lg hover:bg-gray-900 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Typography variant="body1" className="font-medium">
                      {asset.symbol}
                    </Typography>
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[assets.indexOf(asset) % COLORS.length] }}
                    />
                  </div>
                  <Typography variant="caption" className="text-gray-400">
                    {asset.amount} {asset.symbol}
                  </Typography>
                </div>
                
                <div className="text-right">
                  <Typography variant="body2" className="font-medium">
                    ${asset.value.toLocaleString()}
                  </Typography>
                  <div className="flex items-center justify-end gap-1">
                    <Typography 
                      variant="caption" 
                      className={asset.change24h >= 0 ? 'text-green-600' : 'text-red-600'}
                    >
                      {asset.change24h >= 0 ? '+' : ''}{asset.change24h}%
                    </Typography>
                    <Typography variant="caption" className="text-gray-400">
                      ({asset.percentage}%)
                    </Typography>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}