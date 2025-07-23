import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const pair = searchParams.get('pair') || 'XXBTZUSD'
  const count = searchParams.get('count') || '100'
  
  try {
    const response = await axios.get(
      `https://api.kraken.com/0/public/Depth?pair=${pair}&count=${count}`
    )
    
    if (response.data.error && response.data.error.length > 0) {
      return NextResponse.json(
        { error: response.data.error[0] },
        { status: 400 }
      )
    }
    
    // Extract the order book data for the pair
    const orderBookData = response.data.result[pair]
    
    if (!orderBookData) {
      return NextResponse.json(
        { error: 'No data found for pair' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(orderBookData)
  } catch (error) {
    console.error('Error fetching order book:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order book data' },
      { status: 500 }
    )
  }
}