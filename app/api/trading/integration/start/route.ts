import { NextRequest, NextResponse } from 'next/server'
import { sentimentTradeIntegration } from '@/lib/trading/integration/SentimentTradeIntegration'
import { Portfolio } from '@/lib/backtesting/types'

export const runtime = 'edge'

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { config } = body

    // Check if already running
    if (sentimentTradeIntegration.isActive()) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Integration is already running' 
        },
        { status: 400 }
      )
    }

    // Update config if provided
    if (config) {
      // Map dashboard config to integration config
      const integrationConfig: any = {}
      
      if (config.mentionThreshold !== undefined) {
        integrationConfig.minActivityThreshold = config.mentionThreshold
      }
      
      if (config.enableAutoTrading !== undefined) {
        integrationConfig.enabled = config.enableAutoTrading
      }

      // Update the integration config
      if (Object.keys(integrationConfig).length > 0) {
        sentimentTradeIntegration.updateConfig(integrationConfig)
      }
    }

    // Create portfolio from current balance
    const portfolio = await createPortfolioFromBalance()

    // Start the integration
    await sentimentTradeIntegration.start(portfolio)

    // Get initial stats
    const stats = sentimentTradeIntegration.getActivityStats()
    const integrationConfig = sentimentTradeIntegration.getConfig()

    return NextResponse.json({
      success: true,
      data: {
        enabled: integrationConfig.enabled || false,
        running: true,
        config: {
          sentimentThreshold: config?.sentimentThreshold || 0.6,
          mentionThreshold: integrationConfig.minActivityThreshold || 10,
          maxPositions: config?.maxPositions || 5,
          riskLimit: config?.riskLimit || 0.1,
          enableAutoTrading: config?.enableAutoTrading || false
        },
        stats: {
          activeSymbols: stats.uniqueSymbols || 0,
          totalMentions: stats.totalDetections || 0,
          avgSentiment: stats.averageSentiment || 0,
          lastUpdate: Date.now()
        },
        portfolio: {
          cash: portfolio.cash,
          totalValue: portfolio.totalValue,
          positionCount: portfolio.positions.size
        }
      }
    })
  } catch (error) {
    console.error('Error starting integration:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to start integration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}