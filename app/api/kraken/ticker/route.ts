import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const pair = searchParams.get('pair') || 'XXBTZUSD'
  
  try {
    const response = await axios.get(
      `https://api.kraken.com/0/public/Ticker?pair=${pair}`
    )
    
    if (response.data.error && response.data.error.length > 0) {
      return NextResponse.json(
        { error: response.data.error[0] },
        { status: 400 }
      )
    }
    
    return NextResponse.json(response.data.result)
  } catch (error) {
    console.error('Error fetching ticker:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ticker data' },
      { status: 500 }
    )
  }
}