import { NextRequest, NextResponse } from 'next/server'
import { KrakenService } from '@/services/KrakenService'

interface Position {
  txid: string
  ordertxid: string
  pair: string
  time: number
  type: 'buy' | 'sell'
  ordertype: string
  cost: string
  fee: string
  vol: string
  vol_closed: string
  margin: string
  value?: string
  net?: string
  terms?: string
  rollovertm?: string
  misc?: string
  oflags?: string
}

interface PositionsResponse {
  success: boolean
  positions?: Record<string, Position>
  error?: string
  count?: number
}

interface PositionSummary {
  totalPositions: number
  totalValue: number
  totalPnL: number
  openLongs: number
  openShorts: number
  marginUsed: number
}

export async function GET(request: NextRequest): Promise<NextResponse<PositionsResponse | { success: boolean; summary?: PositionSummary; error?: string }>> {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const txids = searchParams.get('txids')
    const docalcs = searchParams.get('docalcs') === 'true'
    
    const krakenService = new KrakenService()

    if (action === 'summary') {
      // Get position summary
      const positions = await krakenService.getOpenPositions(undefined, true)
      
      let totalPositions = 0
      let totalValue = 0
      let totalPnL = 0
      let openLongs = 0
      let openShorts = 0
      let marginUsed = 0

      Object.values(positions).forEach((position: any) => {
        totalPositions++
        
        const cost = parseFloat(position.cost || '0')
        const vol = parseFloat(position.vol || '0')
        const fee = parseFloat(position.fee || '0')
        const margin = parseFloat(position.margin || '0')
        
        totalValue += cost
        marginUsed += margin
        
        // Calculate PnL if available
        if (position.net) {
          totalPnL += parseFloat(position.net)
        }
        
        // Count longs vs shorts
        if (position.type === 'buy') {
          openLongs++
        } else if (position.type === 'sell') {
          openShorts++
        }
      })

      const summary: PositionSummary = {
        totalPositions,
        totalValue,
        totalPnL,
        openLongs,
        openShorts,
        marginUsed
      }

      return NextResponse.json({
        success: true,
        summary
      })
    }

    // Get open positions
    let txidArray: string[] | undefined
    if (txids) {
      txidArray = txids.split(',').filter(id => id.trim() !== '')
    }

    console.log('Getting open positions:', { txidArray, docalcs })

    const positions = await krakenService.getOpenPositions(txidArray, docalcs)
    
    return NextResponse.json({
      success: true,
      positions,
      count: Object.keys(positions).length
    })

  } catch (error: any) {
    console.error('Get positions error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get positions'
    }, { status: 500 })
  }
}

// POST endpoint for position management (closing positions, adjusting stops, etc.)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { action, txid, volume, price } = body
    
    if (!action) {
      return NextResponse.json({
        success: false,
        error: 'Action is required'
      }, { status: 400 })
    }

    const krakenService = new KrakenService()

    switch (action) {
      case 'close': {
        if (!txid) {
          return NextResponse.json({
            success: false,
            error: 'Transaction ID (txid) is required to close position'
          }, { status: 400 })
        }

        // Get position details first
        const positions = await krakenService.getOpenPositions([txid], true)
        const position = positions[txid]
        
        if (!position) {
          return NextResponse.json({
            success: false,
            error: 'Position not found'
          }, { status: 404 })
        }

        // Create opposite order to close position
        const closeOrderParams = {
          pair: position.pair,
          type: position.type === 'buy' ? 'sell' : 'buy',
          ordertype: 'market',
          volume: parseFloat(volume || position.vol),
          close_ordertype: 'market'
        }

        const response = await krakenService.addOrder(closeOrderParams)
        
        return NextResponse.json({
          success: true,
          txid: response.txid,
          description: response.descr.order,
          action: 'close_position'
        })
      }

      case 'modify_stop': {
        return NextResponse.json({
          success: false,
          error: 'Stop modification not yet implemented'
        }, { status: 501 })
      }

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Position management error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to manage position'
    }, { status: 500 })
  }
}

// DELETE endpoint for closing all positions
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const confirmClose = searchParams.get('confirm')
    
    if (confirmClose !== 'true') {
      return NextResponse.json({
        success: false,
        error: 'Add ?confirm=true to confirm closing all positions'
      }, { status: 400 })
    }

    const krakenService = new KrakenService()
    
    // Get all open positions
    const positions = await krakenService.getOpenPositions(undefined, true)
    
    const closeOrders = []
    
    // Create close orders for each position
    for (const [txid, position] of Object.entries(positions)) {
      try {
        const closeOrderParams = {
          pair: (position as any).pair,
          type: (position as any).type === 'buy' ? 'sell' : 'buy',
          ordertype: 'market',
          volume: parseFloat((position as any).vol),
          close_ordertype: 'market'
        }

        const response = await krakenService.addOrder(closeOrderParams)
        closeOrders.push({
          originalTxid: txid,
          closeTxid: response.txid[0],
          description: response.descr.order
        })
      } catch (error) {
        console.error(`Failed to close position ${txid}:`, error)
      }
    }
    
    return NextResponse.json({
      success: true,
      closedPositions: closeOrders.length,
      orders: closeOrders
    })

  } catch (error: any) {
    console.error('Close all positions error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to close all positions'
    }, { status: 500 })
  }
}