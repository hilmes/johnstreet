import { NextRequest, NextResponse } from 'next/server'
import { sentimentTradeIntegration } from '@/lib/trading/integration/SentimentTradeIntegration'
import { Portfolio } from '@/lib/backtesting/types'

// Helper function to create a portfolio from balance data
async function createPortfolioFromBalance(): Promise<Portfolio> {
  try {
    // Fetch current balance from Kraken
    const balanceResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/portfolio/balance`, {
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!balanceResponse.ok) {
      throw new Error('Failed to fetch balance')
    }

    const balances = await balanceResponse.json()
    
    // Calculate total USD value (assuming ZUSD is USD)
    let totalCash = 0
    const positions = new Map()

    for (const [asset, balance] of Object.entries(balances)) {
      const numBalance = parseFloat(balance as string)
      
      if (asset === 'ZUSD' || asset === 'USD') {
        totalCash += numBalance
      } else if (numBalance > 0) {
        // For other assets, we'd need to fetch their USD value
        // For now, we'll just track them as positions
        positions.set(asset, {
          symbol: asset,
          quantity: numBalance,
          averagePrice: 0, // Would need historical data
          marketValue: 0, // Would need current price
          unrealizedPnL: 0,
          realizedPnL: 0
        })
      }
    }

    // If no USD balance, use a default starting capital
    if (totalCash === 0) {
      totalCash = 10000 // Default $10,000 starting capital for paper trading
    }

    return {
      cash: totalCash,
      positions,
      totalValue: totalCash, // Would need to add position values
      totalPnL: 0,
      trades: []
    }
  } catch (error) {
    console.error('Error creating portfolio from balance:', error)
    
    // Return default portfolio for paper trading
    return {
      cash: 10000,
      positions: new Map(),
      totalValue: 10000,
      totalPnL: 0,
      trades: []
    }
  }
}

// GET endpoint to check integration status
export async function GET(request: NextRequest) {
  try {
    const isActive = sentimentTradeIntegration.isActive()
    const stats = sentimentTradeIntegration.getActivityStats()
    const config = sentimentTradeIntegration.getConfig()

    return NextResponse.json({
      success: true,
      data: {
        enabled: config.enabled || false,
        running: isActive,
        config: {
          sentimentThreshold: 0.6, // Default values, could be stored in config
          mentionThreshold: config.minActivityThreshold || 10,
          maxPositions: 5,
          riskLimit: 0.1,
          enableAutoTrading: false
        },
        stats: {
          activeSymbols: stats.uniqueSymbols || 0,
          totalMentions: stats.totalDetections || 0,
          avgSentiment: stats.averageSentiment || 0,
          lastUpdate: Date.now()
        }
      }
    })
  } catch (error) {
    console.error('Error checking integration status:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get integration status' 
      },
      { status: 500 }
    )
  }
}

// POST endpoint to start/stop integration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, config } = body

    if (!action || !['start', 'stop'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "start" or "stop"' },
        { status: 400 }
      )
    }

    if (action === 'start') {
      // Check if already running
      if (sentimentTradeIntegration.isActive()) {
        return NextResponse.json(
          { error: 'Integration is already running' },
          { status: 400 }
        )
      }

      // Update config if provided
      if (config) {
        // Validate config
        const validKeys = ['enabled', 'symbolWhitelist', 'minActivityThreshold', 'priceUpdateInterval', 'sentimentAggregationWindow']
        const invalidKeys = Object.keys(config).filter(key => !validKeys.includes(key))
        
        if (invalidKeys.length > 0) {
          return NextResponse.json(
            { error: `Invalid config keys: ${invalidKeys.join(', ')}` },
            { status: 400 }
          )
        }

        // Validate specific config values
        if (config.symbolWhitelist && !Array.isArray(config.symbolWhitelist)) {
          return NextResponse.json(
            { error: 'symbolWhitelist must be an array' },
            { status: 400 }
          )
        }

        if (config.minActivityThreshold && (typeof config.minActivityThreshold !== 'number' || config.minActivityThreshold < 0)) {
          return NextResponse.json(
            { error: 'minActivityThreshold must be a positive number' },
            { status: 400 }
          )
        }

        if (config.priceUpdateInterval && (typeof config.priceUpdateInterval !== 'number' || config.priceUpdateInterval < 1000)) {
          return NextResponse.json(
            { error: 'priceUpdateInterval must be at least 1000ms' },
            { status: 400 }
          )
        }

        if (config.sentimentAggregationWindow && (typeof config.sentimentAggregationWindow !== 'number' || config.sentimentAggregationWindow < 60000)) {
          return NextResponse.json(
            { error: 'sentimentAggregationWindow must be at least 60000ms (1 minute)' },
            { status: 400 }
          )
        }

        sentimentTradeIntegration.updateConfig(config)
      }

      // Create portfolio from current balance
      const portfolio = await createPortfolioFromBalance()

      // Start the integration
      await sentimentTradeIntegration.start(portfolio)

      // Get initial stats
      const stats = sentimentTradeIntegration.getActivityStats()

      return NextResponse.json({
        success: true,
        action: 'started',
        portfolio: {
          cash: portfolio.cash,
          totalValue: portfolio.totalValue,
          positionCount: portfolio.positions.size
        },
        stats,
        config: config || {}
      })
    } else {
      // Stop action
      if (!sentimentTradeIntegration.isActive()) {
        return NextResponse.json(
          { error: 'Integration is not running' },
          { status: 400 }
        )
      }

      // Get final stats before stopping
      const finalStats = sentimentTradeIntegration.getActivityStats()

      // Stop the integration
      await sentimentTradeIntegration.stop()

      return NextResponse.json({
        success: true,
        action: 'stopped',
        finalStats
      })
    }
  } catch (error) {
    console.error('Error managing integration:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process integration request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE endpoint to reset integration (optional)
export async function DELETE(request: NextRequest) {
  try {
    // Stop if running
    if (sentimentTradeIntegration.isActive()) {
      await sentimentTradeIntegration.stop()
    }

    // Reset to default config
    sentimentTradeIntegration.updateConfig({
      enabled: false,
      symbolWhitelist: ['BTC', 'ETH', 'DOGE', 'SHIB', 'PEPE', 'BONK'],
      minActivityThreshold: 5,
      priceUpdateInterval: 30000,
      sentimentAggregationWindow: 5 * 60 * 1000
    })

    return NextResponse.json({
      success: true,
      message: 'Integration reset to default configuration'
    })
  } catch (error) {
    console.error('Error resetting integration:', error)
    return NextResponse.json(
      { error: 'Failed to reset integration' },
      { status: 500 }
    )
  }
}