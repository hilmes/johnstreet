import { NextRequest, NextResponse } from 'next/server'
import { OrderMonitor } from '@/lib/trading/OrderMonitor'

export const runtime = 'edge'

// Global order monitor instance
let orderMonitor: OrderMonitor | null = null

function getOrderMonitor(): OrderMonitor {
  if (!orderMonitor) {
    orderMonitor = new OrderMonitor({
      pollInterval: 5000, // 5 seconds
      maxRetries: 3,
      enableNotifications: true
    })

    // Set up event listeners
    orderMonitor.on('order_fill', (event) => {
      console.log('Order fill detected:', event)
      // Here you could send WebSocket notifications, etc.
    })

    orderMonitor.on('order_completed', (order) => {
      console.log('Order completed:', order.txid)
    })

    orderMonitor.on('status_change', (event) => {
      console.log('Order status change:', event)
    })

    orderMonitor.on('monitor_error', (error) => {
      console.error('Order monitor error:', error)
    })
  }
  
  return orderMonitor
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { action } = body

    const monitor = getOrderMonitor()

    switch (action) {
      case 'start': {
        monitor.startMonitoring()
        return NextResponse.json({
          success: true,
          message: 'Order monitoring started'
        })
      }

      case 'stop': {
        monitor.stopMonitoring()
        return NextResponse.json({
          success: true,
          message: 'Order monitoring stopped'
        })
      }

      case 'add_order': {
        const { txid, symbol, side, type, amount, price } = body
        
        if (!txid || !symbol || !side || !type || !amount) {
          return NextResponse.json({
            success: false,
            error: 'Missing required fields: txid, symbol, side, type, amount'
          }, { status: 400 })
        }

        monitor.addOrder(txid, { symbol, side, type, amount, price })
        
        return NextResponse.json({
          success: true,
          message: `Order ${txid} added to monitoring`
        })
      }

      case 'remove_order': {
        const { txid } = body
        
        if (!txid) {
          return NextResponse.json({
            success: false,
            error: 'txid is required'
          }, { status: 400 })
        }

        const removed = monitor.removeOrder(txid)
        
        return NextResponse.json({
          success: removed,
          message: removed 
            ? `Order ${txid} removed from monitoring`
            : `Order ${txid} not found in monitoring`
        })
      }

      case 'update_config': {
        const { pollInterval, maxRetries, enableNotifications } = body
        
        const config: any = {}
        if (pollInterval !== undefined) config.pollInterval = pollInterval
        if (maxRetries !== undefined) config.maxRetries = maxRetries
        if (enableNotifications !== undefined) config.enableNotifications = enableNotifications
        
        monitor.updateConfig(config)
        
        return NextResponse.json({
          success: true,
          message: 'Monitor configuration updated'
        })
      }

      case 'clear_all': {
        monitor.clearAll()
        
        return NextResponse.json({
          success: true,
          message: 'All monitored orders cleared'
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Order monitor API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Order monitor operation failed'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const txid = searchParams.get('txid')

    const monitor = getOrderMonitor()

    switch (action) {
      case 'status': {
        return NextResponse.json({
          success: true,
          monitoring: monitor.isMonitoring(),
          totalOrders: monitor.getMonitoredOrderCount(),
          activeOrders: monitor.getActiveOrderCount()
        })
      }

      case 'orders': {
        const filter = searchParams.get('filter')
        
        let orders
        if (filter === 'active') {
          orders = monitor.getActiveOrders()
        } else {
          orders = monitor.getAllOrders()
        }

        return NextResponse.json({
          success: true,
          orders,
          count: orders.length
        })
      }

      case 'order': {
        if (!txid) {
          return NextResponse.json({
            success: false,
            error: 'txid parameter is required'
          }, { status: 400 })
        }

        const order = monitor.getOrderStatus(txid)
        
        if (order) {
          return NextResponse.json({
            success: true,
            order
          })
        } else {
          return NextResponse.json({
            success: false,
            error: 'Order not found in monitoring'
          }, { status: 404 })
        }
      }

      case 'fills': {
        if (!txid) {
          return NextResponse.json({
            success: false,
            error: 'txid parameter is required'
          }, { status: 400 })
        }

        const order = monitor.getOrderStatus(txid)
        
        if (order) {
          return NextResponse.json({
            success: true,
            fills: order.fills,
            fillCount: order.fills.length,
            totalFilled: order.filledAmount || 0,
            averagePrice: order.averagePrice || 0
          })
        } else {
          return NextResponse.json({
            success: false,
            error: 'Order not found in monitoring'
          }, { status: 404 })
        }
      }

      case 'summary': {
        const orders = monitor.getAllOrders()
        const activeOrders = monitor.getActiveOrders()
        
        const summary = {
          totalOrders: orders.length,
          activeOrders: activeOrders.length,
          completedOrders: orders.filter(o => o.status === 'closed').length,
          cancelledOrders: orders.filter(o => o.status === 'canceled').length,
          partiallyFilled: orders.filter(o => o.status === 'partial').length,
          totalFills: orders.reduce((sum, o) => sum + o.fills.length, 0),
          monitoring: monitor.isMonitoring()
        }

        return NextResponse.json({
          success: true,
          summary
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Action parameter is required. Valid actions: status, orders, order, fills, summary'
        }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Order monitor GET error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get order monitor data'
    }, { status: 500 })
  }
}