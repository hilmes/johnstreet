import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

// WebSocket connections in Next.js require a custom server setup
// This is a placeholder that returns instructions
export async function GET(request: NextRequest) {
  return new Response(
    JSON.stringify({
      message: 'WebSocket connections require a custom server setup in Next.js',
      instructions: 'Use the existing Python WebSocket handler or set up a custom Node.js server',
      pythonWsUrl: 'ws://localhost:5000/ws'
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}