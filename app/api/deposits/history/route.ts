export const runtime = 'edge';
export const revalidate = 30; // Cache for 30 seconds

import { NextRequest, NextResponse } from 'next/server';
import { depositManager } from '../../../../lib/trading/DepositManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const asset = searchParams.get('asset') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    const deposits = await depositManager.getDepositHistory(asset, limit);

    return NextResponse.json({
      deposits,
      count: deposits.length,
      asset: asset || 'all',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Deposit history API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve deposit history',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}