'use client'

export const dynamic = 'force-dynamic'

import React from 'react'
import { Card } from '@/components/Card'

export default function FinancialExcellencePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Financial Excellence</h1>
        <p className="text-gray-600">Advanced portfolio analytics and market insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Portfolio Value */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Portfolio Value</h3>
          <p className="text-2xl font-bold text-gray-900">$125,430.25</p>
          <p className="text-sm text-green-600 mt-1">+$2,340.15 (1.87%)</p>
        </Card>

        {/* 24h Change */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">24h Change</h3>
          <p className="text-2xl font-bold text-green-600">+1.87%</p>
          <p className="text-sm text-gray-500 mt-1">Outperforming market</p>
        </Card>

        {/* Risk Score */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Risk Score</h3>
          <p className="text-2xl font-bold text-yellow-600">65/100</p>
          <p className="text-sm text-gray-500 mt-1">Moderate risk</p>
        </Card>

        {/* Sharpe Ratio */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Sharpe Ratio</h3>
          <p className="text-2xl font-bold text-gray-900">1.8</p>
          <p className="text-sm text-gray-500 mt-1">Good risk-adjusted returns</p>
        </Card>
      </div>

      {/* Market Overview */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Market Overview</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <div>
              <span className="font-medium">BTC/USD</span>
              <span className="text-sm text-gray-500 ml-2">Bitcoin</span>
            </div>
            <div className="text-right">
              <span className="font-medium">$43,250.50</span>
              <span className="text-sm text-green-600 ml-2">+2.01%</span>
            </div>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <div>
              <span className="font-medium">ETH/USD</span>
              <span className="text-sm text-gray-500 ml-2">Ethereum</span>
            </div>
            <div className="text-right">
              <span className="font-medium">$2,280.75</span>
              <span className="text-sm text-red-600 ml-2">-1.95%</span>
            </div>
          </div>
          <div className="flex justify-between items-center py-2">
            <div>
              <span className="font-medium">SOL/USD</span>
              <span className="text-sm text-gray-500 ml-2">Solana</span>
            </div>
            <div className="text-right">
              <span className="font-medium">$98.45</span>
              <span className="text-sm text-green-600 ml-2">+3.36%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Portfolio Allocation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Portfolio Allocation</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Bitcoin (BTC)</span>
                <span className="text-sm font-medium">40%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '40%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Ethereum (ETH)</span>
                <span className="text-sm font-medium">30%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '30%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Other</span>
                <span className="text-sm font-medium">30%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gray-500 h-2 rounded-full" style={{ width: '30%' }}></div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Risk Metrics</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Value at Risk (95%)</span>
              <span className="text-sm font-medium">8.5%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Max Drawdown</span>
              <span className="text-sm font-medium">12.3%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Beta</span>
              <span className="text-sm font-medium">1.15</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Volatility (30d)</span>
              <span className="text-sm font-medium">18.7%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}