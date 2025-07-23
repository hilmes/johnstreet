import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import axios from 'axios'

const API_KEY = process.env.KRAKEN_API_KEY!
const API_SECRET = process.env.KRAKEN_API_SECRET!

function getKrakenSignature(path: string, data: any, secret: string) {
  const message = data.nonce + new URLSearchParams(data).toString()
  const secret_buffer = Buffer.from(secret, 'base64')
  const hash = crypto.createHash('sha256')
  const hmac = crypto.createHmac('sha512', secret_buffer)
  const hash_digest = hash.update(message).digest()
  const hmac_digest = hmac.update(path + hash_digest).digest('base64')
  return hmac_digest
}

export async function GET() {
  try {
    const nonce = Date.now() * 1000
    const data = { nonce }
    const path = '/0/private/Balance'
    const signature = getKrakenSignature(path, data, API_SECRET)
    
    const response = await axios.post(
      `https://api.kraken.com${path}`,
      new URLSearchParams(data),
      {
        headers: {
          'API-Key': API_KEY,
          'API-Sign': signature,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )
    
    if (response.data.error && response.data.error.length > 0) {
      return NextResponse.json(
        { error: response.data.error[0] },
        { status: 400 }
      )
    }
    
    return NextResponse.json(response.data.result)
  } catch (error) {
    console.error('Error fetching balance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch balance data' },
      { status: 500 }
    )
  }
}