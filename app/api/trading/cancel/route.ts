import { NextRequest, NextResponse } from 'next/server'
import { KrakenService } from '@/services/KrakenService'

export const runtime = 'edge'

interface CancelOrderRequest {
  txid: string
}

interface CancelOrderResponse {
  success: boolean
  count?: number
  pending?: boolean
  error?: string
}

interface CancelAllOrdersResponse {
  success: boolean
  count?: number
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<CancelOrderResponse>> {
  try {
    const body: CancelOrderRequest = await request.json()
    
    // Validate required fields
    if (!body.txid) {
      return NextResponse.json({
        success: false,
        error: 'Transaction ID (txid) is required'
      }, { status: 400 })
    }

    const krakenService = new KrakenService()

    console.log('Cancelling order:', body.txid)

    // Cancel order using KrakenService
    const response = await krakenService.cancelOrder(body.txid)

    return NextResponse.json({
      success: true,
      count: response.count,
      pending: response.pending
    })

  } catch (error: any) {
    console.error('Order cancellation error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to cancel order'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse<CancelAllOrdersResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const cancelAll = searchParams.get('all')
    
    const krakenService = new KrakenService()

    if (cancelAll === 'true') {
      console.log('Cancelling all orders')
      
      // Cancel all orders
      const response = await krakenService.cancelAllOrders()
      
      return NextResponse.json({
        success: true,
        count: response.count
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid request. Use ?all=true to cancel all orders'
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Cancel all orders error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to cancel all orders'
    }, { status: 500 })
  }
}

// GET endpoint to check cancellation status or get cancellable orders
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    const krakenService = new KrakenService()
    
    if (action === 'open_orders') {
      // Get all open orders that can be cancelled
      const openOrdersResponse = await krakenService.getOpenOrders(true)
      
      const cancellableOrders = Object.entries(openOrdersResponse.open || {}).map(([txid, orderInfo]) => ({
        txid,
        pair: orderInfo.descr.pair,
        type: orderInfo.descr.type,
        ordertype: orderInfo.descr.ordertype,
        price: orderInfo.descr.price,
        volume: orderInfo.vol,
        status: orderInfo.status,
        opentm: orderInfo.opentm,
        descr: orderInfo.descr.order
      }))
      
      return NextResponse.json({
        success: true,
        orders: cancellableOrders,
        count: cancellableOrders.length
      })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use ?action=open_orders to get cancellable orders'
    }, { status: 400 })

  } catch (error: any) {
    console.error('Get cancellable orders error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get cancellable orders'
    }, { status: 500 })
  }
}