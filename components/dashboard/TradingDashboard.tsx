'use client'

import React from 'react'
import { Card } from '@/components/Card'

export default function TradingDashboard() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Portfolio Value */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Portfolio Value</h3>
          <p className="text-2xl font-bold text-gray-900">$0.00</p>
          <p className="text-sm text-gray-500 mt-1">+0.00 (0.00%)</p>
        </Card>

        {/* Daily P&L */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Today's P&L</h3>
          <p className="text-2xl font-bold text-gray-900">$0.00</p>
          <p className="text-sm text-gray-500 mt-1">0.00%</p>
        </Card>

        {/* Active Positions */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Active Positions</h3>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-sm text-gray-500 mt-1">No open positions</p>
        </Card>

        {/* Available Balance */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Available Balance</h3>
          <p className="text-2xl font-bold text-gray-900">$0.00</p>
          <p className="text-sm text-gray-500 mt-1">USD</p>
        </Card>
      </div>

      {/* Trading Status */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Trading Status</h2>
        <div className="text-center py-8">
          <p className="text-gray-500">JohnStreet Trading Platform</p>
          <p className="text-sm text-gray-400 mt-2">Configure your trading settings to get started</p>
        </div>
      </Card>
    </div>
  )
}