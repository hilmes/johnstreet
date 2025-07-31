export const runtime = 'edge';
export const revalidate = 10; // Cache for 10 seconds

import { NextRequest, NextResponse } from 'next/server';
import { depositManager } from '../../../../lib/trading/DepositManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const asset = searchParams.get('asset');
    const format = searchParams.get('format') || 'detailed';

    if (asset) {
      // Get balance for specific asset
      const balance = await depositManager.getBalance(asset);
      return NextResponse.json({ 
        asset, 
        balance,
        formatted: `${balance.toFixed(8)} ${depositManager.formatAssetName(asset)}`
      });
    }

    if (format === 'usd') {
      // Get USD equivalent balances
      const { balances, totalUSD } = await depositManager.getUSDBalances();
      return NextResponse.json({
        balances,
        totalUSD,
        formatted: `$${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      });
    }

    // Get all balances with details
    const balances = await depositManager.getBalances();
    const formattedBalances = Object.entries(balances)
      .filter(([_, balance]) => balance > 0.00000001) // Only show non-zero balances
      .map(([asset, balance]) => ({
        asset,
        balance,
        name: depositManager.formatAssetName(asset),
        formatted: `${balance.toFixed(8)} ${asset}`
      }));

    return NextResponse.json({
      balances: formattedBalances,
      raw: balances,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Balance API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve balance',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}