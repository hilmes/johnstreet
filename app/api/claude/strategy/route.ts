import { NextRequest, NextResponse } from 'next/server'
import { generateTradingStrategy, StrategyGenerationRequest } from '@/lib/anthropic/client'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const body: StrategyGenerationRequest = await request.json()
    
    // Get API key from header or environment
    const apiKey = request.headers.get('x-anthropic-api-key') || process.env.ANTHROPIC_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not provided' },
        { status: 401 }
      )
    }
    
    const strategy = await generateTradingStrategy(body, apiKey)
    
    return NextResponse.json(strategy)
  } catch (error) {
    console.error('Strategy generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate strategy', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Also handle regular chat messages
export async function PUT(request: NextRequest) {
  try {
    const { messages, systemPrompt } = await request.json()
    
    // Get API key from header or environment
    const apiKey = request.headers.get('x-anthropic-api-key') || process.env.ANTHROPIC_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not provided' },
        { status: 401 }
      )
    }
    
    // Import Anthropic client
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey })
    
    const response = await client.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt || 'You are a helpful trading strategy assistant. Help the user develop and refine their trading strategies.',
      messages
    })
    
    return NextResponse.json({
      content: response.content[0].type === 'text' ? response.content[0].text : '',
      usage: response.usage
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}