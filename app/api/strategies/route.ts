import { NextRequest, NextResponse } from 'next/server'
// import { getServerSession } from 'next-auth'

export const runtime = 'edge'

export interface IFTTTRule {
  id: string
  condition: {
    type: 'price' | 'sentiment' | 'volume' | 'technical'
    operator: 'greater' | 'less' | 'equals' | 'crosses'
    value: number
    symbol?: string
    indicator?: string
  }
  action: {
    type: 'buy' | 'sell' | 'alert' | 'email'
    amount?: number
    percentage?: number
    message?: string
  }
}

export interface IFTTTStrategy {
  id?: string
  name: string
  description: string
  enabled: boolean
  rules: IFTTTRule[]
  createdAt?: Date
  updatedAt?: Date
  userId?: string
}

// In-memory storage for demo (replace with database in production)
const strategies = new Map<string, IFTTTStrategy>()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's strategies
    const userStrategies = Array.from(strategies.values())
      .filter(strategy => strategy.userId === session.user?.id)

    return NextResponse.json(userStrategies)
  } catch (error) {
    console.error('Strategies GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch strategies' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const strategyData: IFTTTStrategy = await request.json()
    
    // Validate strategy
    if (!strategyData.name || strategyData.rules.length === 0) {
      return NextResponse.json(
        { error: 'Invalid strategy: name and at least one rule required' },
        { status: 400 }
      )
    }

    // Create strategy
    const strategy: IFTTTStrategy = {
      ...strategyData,
      id: `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: session.user?.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Save strategy
    strategies.set(strategy.id!, strategy)

    // In production, also:
    // 1. Save to database
    // 2. Register with strategy execution engine
    // 3. Set up monitoring

    return NextResponse.json(strategy)
  } catch (error) {
    console.error('Strategy POST error:', error)
    return NextResponse.json(
      { error: 'Failed to save strategy' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, ...updates }: IFTTTStrategy = await request.json()
    
    if (!id) {
      return NextResponse.json(
        { error: 'Strategy ID required' },
        { status: 400 }
      )
    }

    const existingStrategy = strategies.get(id)
    if (!existingStrategy || existingStrategy.userId !== session.user?.id) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      )
    }

    // Update strategy
    const updatedStrategy: IFTTTStrategy = {
      ...existingStrategy,
      ...updates,
      id,
      userId: existingStrategy.userId,
      createdAt: existingStrategy.createdAt,
      updatedAt: new Date()
    }

    strategies.set(id, updatedStrategy)

    return NextResponse.json(updatedStrategy)
  } catch (error) {
    console.error('Strategy PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update strategy' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Strategy ID required' },
        { status: 400 }
      )
    }

    const existingStrategy = strategies.get(id)
    if (!existingStrategy || existingStrategy.userId !== session.user?.id) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      )
    }

    strategies.delete(id)

    return NextResponse.json({ message: 'Strategy deleted' })
  } catch (error) {
    console.error('Strategy DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete strategy' },
      { status: 500 }
    )
  }
}