import { NextRequest, NextResponse } from 'next/server'
import { KrakenService } from '@/services/KrakenService'

interface OrderRequest {
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit' | 'stop-loss'
  amount: number
  price?: number
  stopPrice?: number
  validate?: boolean
}

interface OrderResponse {
  success: boolean
  orderId?: string
  txid?: string[]
  error?: string
  description?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<OrderResponse>> {
  try {
    const body: OrderRequest = await request.json()
    
    // Validate required fields
    if (!body.symbol || !body.side || !body.type || !body.amount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: symbol, side, type, amount'
      }, { status: 400 })
    }

    // Validate price for non-market orders
    if (body.type !== 'market' && !body.price) {
      return NextResponse.json({
        success: false,
        error: 'Price is required for non-market orders'
      }, { status: 400 })
    }

    // Validate stop price for stop-loss orders
    if (body.type === 'stop-loss' && !body.stopPrice) {
      return NextResponse.json({
        success: false,
        error: 'Stop price is required for stop-loss orders'
      }, { status: 400 })
    }

    const krakenService = new KrakenService()

    // Convert to Kraken format
    const krakenPair = convertToKrakenPair(body.symbol)
    
    // Prepare order parameters
    const orderParams = {
      pair: krakenPair,
      type: body.side,
      ordertype: mapOrderType(body.type),
      volume: body.amount,
      price: body.price,
      price2: body.stopPrice,
      validate: body.validate || false
    }

    // Remove undefined values
    Object.keys(orderParams).forEach(key => {
      if (orderParams[key as keyof typeof orderParams] === undefined) {
        delete orderParams[key as keyof typeof orderParams]
      }
    })

    console.log('Placing order:', orderParams)

    // Place order using KrakenService
    const response = await krakenService.addOrder(orderParams)

    return NextResponse.json({
      success: true,
      txid: response.txid,
      orderId: response.txid[0],
      description: response.descr.order
    })

  } catch (error: any) {
    console.error('Order placement error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to place order'
    }, { status: 500 })
  }
}

// Helper functions
function convertToKrakenPair(symbol: string): string {
  const conversions: Record<string, string> = {
    'BTC/USD': 'XXBTZUSD',
    'BTCUSD': 'XXBTZUSD',
    'BTC-USD': 'XXBTZUSD',
    'ETH/USD': 'XETHZUSD',
    'ETHUSD': 'XETHZUSD',
    'ETH-USD': 'XETHZUSD',
    'ADA/USD': 'ADAUSD',
    'ADAUSD': 'ADAUSD',
    'DOT/USD': 'DOTUSD',
    'DOTUSD': 'DOTUSD',
    'LINK/USD': 'LINKUSD',
    'LINKUSD': 'LINKUSD',
    'XRP/USD': 'XXRPZUSD',
    'XRPUSD': 'XXRPZUSD',
    'XRP-USD': 'XXRPZUSD'
  }
  
  return conversions[symbol.toUpperCase()] || symbol
}

function mapOrderType(type: string): string {
  const typeMap: Record<string, string> = {
    'market': 'market',
    'limit': 'limit',
    'stop-loss': 'stop-loss'
  }
  
  return typeMap[type] || 'limit'
}

// GET endpoint for order status
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const txid = searchParams.get('txid')
    
    if (!txid) {
      return NextResponse.json({
        success: false,
        error: 'Transaction ID (txid) is required'
      }, { status: 400 })
    }

    const krakenService = new KrakenService()
    const orderInfo = await krakenService.queryOrders([txid], true)
    
    return NextResponse.json({
      success: true,
      order: orderInfo[txid] || null
    })

  } catch (error: any) {
    console.error('Order query error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to query order'
    }, { status: 500 })
  }
}