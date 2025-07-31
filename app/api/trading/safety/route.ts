export const runtime = 'edge';
export const revalidate = 5; // Cache for 5 seconds

import { NextRequest, NextResponse } from 'next/server';
import { safetyManager } from '../../../../lib/trading/SafetyManager';

export async function GET(request: NextRequest) {
  try {
    const safetyStatus = await safetyManager.getSafetyStatus();
    
    return NextResponse.json(safetyStatus);

  } catch (error: any) {
    console.error('Safety status API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve safety status',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, adminKey, reason, limits } = body;

    switch (action) {
      case 'emergency_stop':
        await safetyManager.activateEmergencyStop(reason || 'Manual emergency stop');
        return NextResponse.json({ 
          success: true, 
          message: 'Emergency stop activated',
          timestamp: new Date().toISOString()
        });

      case 'reset_emergency_stop':
        if (!adminKey) {
          return NextResponse.json(
            { error: 'Admin key required for reset' },
            { status: 400 }
          );
        }
        safetyManager.resetEmergencyStop(adminKey);
        return NextResponse.json({ 
          success: true, 
          message: 'Emergency stop reset',
          timestamp: new Date().toISOString()
        });

      case 'update_limits':
        if (!adminKey) {
          return NextResponse.json(
            { error: 'Admin key required to update limits' },
            { status: 400 }
          );
        }
        safetyManager.updateLimits(limits, adminKey);
        return NextResponse.json({ 
          success: true, 
          message: 'Safety limits updated',
          limits: safetyManager.getLimits(),
          timestamp: new Date().toISOString()
        });

      case 'validate_trade':
        const { pair, side, quantity, price } = body;
        const validation = await safetyManager.validateTrade(pair, side, quantity, price);
        return NextResponse.json({
          validation,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Safety API error:', error);
    return NextResponse.json(
      { 
        error: 'Safety operation failed',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}