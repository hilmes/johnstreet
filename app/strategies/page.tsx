'use client'

export const dynamic = 'force-dynamic'

import React from 'react'
import { Card } from '@/components/Card'

export default function StrategiesPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Trading Strategies</h1>
        <p className="text-gray-600">AI-powered strategies and backtesting</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Momentum Strategy */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Momentum Breakout</h3>
          <p className="text-sm text-gray-600 mb-4">
            Identifies strong price movements and trades with the trend
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Win Rate</span>
              <span className="font-medium text-green-600">68.5%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total P&L</span>
              <span className="font-medium text-green-600">+$12,450</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Status</span>
              <span className="font-medium text-blue-600">Active</span>
            </div>
          </div>
          <button className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
            View Details
          </button>
        </Card>

        {/* Mean Reversion Strategy */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Mean Reversion</h3>
          <p className="text-sm text-gray-600 mb-4">
            Trades oversold/overbought conditions expecting price reversal
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Win Rate</span>
              <span className="font-medium text-green-600">72.3%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total P&L</span>
              <span className="font-medium text-green-600">+$8,230</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Status</span>
              <span className="font-medium text-gray-600">Paused</span>
            </div>
          </div>
          <button className="mt-4 w-full py-2 px-4 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">
            View Details
          </button>
        </Card>

        {/* Sentiment-Based Strategy */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Sentiment Analysis</h3>
          <p className="text-sm text-gray-600 mb-4">
            Uses social media sentiment to predict price movements
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Win Rate</span>
              <span className="font-medium text-yellow-600">58.2%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total P&L</span>
              <span className="font-medium text-red-600">-$1,850</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Status</span>
              <span className="font-medium text-yellow-600">Testing</span>
            </div>
          </div>
          <button className="mt-4 w-full py-2 px-4 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors">
            View Details
          </button>
        </Card>
      </div>

      {/* Strategy Performance */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Overall Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Strategies</p>
            <p className="text-2xl font-bold">3</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Active Strategies</p>
            <p className="text-2xl font-bold text-green-600">1</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Combined P&L</p>
            <p className="text-2xl font-bold text-green-600">+$18,830</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Average Win Rate</p>
            <p className="text-2xl font-bold">66.3%</p>
          </div>
        </div>
      </Card>

      {/* Create New Strategy */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Create New Strategy</h2>
        <p className="text-gray-600 mb-4">
          Use our AI-powered strategy builder to create and backtest new trading strategies
        </p>
        <button className="py-2 px-6 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
          Launch Strategy Builder
        </button>
      </Card>
    </div>
  )
}