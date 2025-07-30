import { NextRequest, NextResponse } from 'next/server'
import { PaperTradingEngine } from '@/lib/trading/PaperTradingEngine'

export const runtime = 'edge'

// Global paper trading engine instance
let paperTradingEngine: PaperTradingEngine | null = null

function getPaperTradingEngine(): PaperTradingEngine {
  if (!paperTradingEngine) {
    paperTradingEngine = new PaperTradingEngine(100000) // $100k starting balance
  }
  return paperTradingEngine
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { action } = body

    const engine = getPaperTradingEngine()

    switch (action) {
      case 'enable': {
        engine.enablePaperTrading()
        return NextResponse.json({
          success: true,
          message: 'Paper trading enabled'
        })
      }

      case 'disable': {
        engine.disablePaperTrading()
        return NextResponse.json({
          success: true,
          message: 'Paper trading disabled'
        })
      }

      case 'place_order': {
        const { symbol, side, type, amount, price, stopPrice } = body
        
        if (!symbol || !side || !type || !amount) {
          return NextResponse.json({
            success: false,
            error: 'Missing required fields: symbol, side, type, amount'
          }, { status: 400 })
        }

        const result = await engine.placeOrder({
          symbol,
          side,
          type,
          amount,
          price,
          stopPrice
        })

        return NextResponse.json(result)
      }

      case 'cancel_order': {
        const { orderId } = body
        
        if (!orderId) {
          return NextResponse.json({
            success: false,
            error: 'orderId is required'
          }, { status: 400 })
        }

        const result = await engine.cancelOrder(orderId)
        return NextResponse.json(result)
      }

      case 'update_market_data': {
        const { symbol, price, bid, ask } = body
        
        if (!symbol || !price || !bid || !ask) {
          return NextResponse.json({
            success: false,
            error: 'Missing required fields: symbol, price, bid, ask'
          }, { status: 400 })
        }

        engine.updateMarketData(symbol, {
          symbol,
          price,
          bid,
          ask,
          timestamp: Date.now()
        })

        return NextResponse.json({
          success: true,
          message: 'Market data updated'
        })
      }

      case 'reset': {
        const { initialBalance } = body
        engine.reset(initialBalance || 100000)
        
        return NextResponse.json({
          success: true,
          message: 'Paper trading engine reset'
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Paper trading API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Paper trading operation failed'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    const engine = getPaperTradingEngine()

    switch (action) {
      case 'status': {
        return NextResponse.json({
          success: true,
          enabled: engine.isPaperTradingEnabled(),
          totalPortfolioValue: engine.getTotalPortfolioValue()
        })
      }

      case 'orders': {
        const status = searchParams.get('status')
        
        let orders
        if (status === 'open') {
          orders = engine.getOpenOrders()
        } else {
          orders = engine.getOrders()
        }

        return NextResponse.json({
          success: true,
          orders,
          count: orders.length
        })
      }

      case 'positions': {
        const positions = engine.getPositions()
        
        return NextResponse.json({
          success: true,
          positions,
          count: positions.length
        })
      }

      case 'balances': {
        const currency = searchParams.get('currency')
        
        if (currency) {
          const balance = engine.getBalance(currency)
          
          if (balance) {
            return NextResponse.json({
              success: true,
              balance
            })
          } else {
            return NextResponse.json({
              success: false,
              error: 'Currency not found'
            }, { status: 404 })
          }
        } else {
          const balances = engine.getBalances().filter(b => b.total > 0 || b.currency === 'USD')
          
          return NextResponse.json({
            success: true,
            balances,
            totalValue: engine.getTotalPortfolioValue()
          })
        }
      }

      case 'portfolio': {
        return NextResponse.json({
          success: true,
          portfolio: {
            totalValue: engine.getTotalPortfolioValue(),
            balances: engine.getBalances().filter(b => b.total > 0 || b.currency === 'USD'),
            positions: engine.getPositions(),
            openOrders: engine.getOpenOrders().length,
            enabled: engine.isPaperTradingEnabled()
          }
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Action parameter is required. Valid actions: status, orders, positions, balances, portfolio'
        }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Paper trading GET error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get paper trading data'
    }, { status: 500 })
  }
}