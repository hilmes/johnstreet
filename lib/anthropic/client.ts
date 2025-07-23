import Anthropic from '@anthropic-ai/sdk'

export function getAnthropicClient(apiKey?: string) {
  const key = apiKey || process.env.ANTHROPIC_API_KEY
  
  if (!key) {
    throw new Error('Anthropic API key not found. Please set ANTHROPIC_API_KEY environment variable.')
  }
  
  return new Anthropic({
    apiKey: key,
  })
}

export interface StrategyGenerationRequest {
  prompt: string
  tradingPair?: string
  riskLevel?: 'conservative' | 'moderate' | 'aggressive'
  timeframe?: string
  indicators?: string[]
}

export interface GeneratedStrategy {
  name: string
  description: string
  code: string
  language: 'python' | 'javascript' | 'typescript'
  parameters: Record<string, any>
  riskMetrics: {
    maxDrawdown?: number
    sharpeRatio?: number
    winRate?: number
  }
  requiredIndicators: string[]
  timeframe: string
}

export async function generateTradingStrategy(
  request: StrategyGenerationRequest,
  apiKey?: string
): Promise<GeneratedStrategy> {
  const client = getAnthropicClient(apiKey)
  
  const systemPrompt = `You are an expert quantitative trading strategy developer. When asked to create trading strategies, you should:

1. Generate well-structured, production-ready code
2. Include proper risk management
3. Use standard technical indicators
4. Provide clear entry and exit signals
5. Include parameter configuration
6. Add appropriate comments and documentation

Return your response in the following JSON format:
{
  "name": "Strategy Name",
  "description": "Brief description of the strategy",
  "code": "// Complete strategy code here",
  "language": "typescript",
  "parameters": {
    "stopLoss": 0.02,
    "takeProfit": 0.05,
    "positionSize": 0.1
  },
  "riskMetrics": {
    "maxDrawdown": 0.15,
    "sharpeRatio": 1.5,
    "winRate": 0.65
  },
  "requiredIndicators": ["SMA", "RSI", "MACD"],
  "timeframe": "1h"
}`

  const userPrompt = `Create a trading strategy with the following requirements:
${request.prompt}
${request.tradingPair ? `Trading Pair: ${request.tradingPair}` : ''}
${request.riskLevel ? `Risk Level: ${request.riskLevel}` : ''}
${request.timeframe ? `Timeframe: ${request.timeframe}` : ''}
${request.indicators ? `Preferred Indicators: ${request.indicators.join(', ')}` : ''}`

  try {
    const response = await client.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 4000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })

    const content = response.content[0]
    if (content.type === 'text') {
      // Extract JSON from the response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    }

    throw new Error('Failed to parse strategy from response')
  } catch (error) {
    console.error('Error generating strategy:', error)
    throw error
  }
}