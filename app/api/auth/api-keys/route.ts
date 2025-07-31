import { NextRequest, NextResponse } from 'next/server'
import { ApiKeyManager } from '@/lib/auth/ApiKeyManager'

// Note: Uses Node.js runtime due to crypto dependencies

interface AddApiKeyRequest {
  keyId: string
  exchange: string
  apiKey: string
  secret: string
  passphrase?: string
  sandbox?: boolean
  permissions?: string[]
}

interface UpdateApiKeyRequest {
  keyId: string
  isActive: boolean
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: AddApiKeyRequest = await request.json()
    
    // Validate required fields
    if (!body.keyId || !body.exchange || !body.apiKey || !body.secret) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: keyId, exchange, apiKey, secret'
      }, { status: 400 })
    }

    const apiKeyManager = ApiKeyManager.getInstance()
    
    const success = await apiKeyManager.addApiKey(
      body.keyId,
      body.exchange,
      body.apiKey,
      body.secret,
      {
        passphrase: body.passphrase,
        sandbox: body.sandbox,
        permissions: body.permissions
      }
    )

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'API key added successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to add API key - validation failed'
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Add API key error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to add API key'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('keyId')
    const exchange = searchParams.get('exchange')
    
    const apiKeyManager = ApiKeyManager.getInstance()
    
    if (keyId) {
      // Get specific API key (without sensitive data)
      const apiKey = await apiKeyManager.getApiKey(keyId)
      
      if (apiKey) {
        return NextResponse.json({
          success: true,
          apiKey: {
            keyId,
            exchange: apiKey.exchange,
            sandbox: apiKey.sandbox,
            permissions: apiKey.permissions,
            createdAt: apiKey.createdAt,
            lastUsed: apiKey.lastUsed,
            isActive: apiKey.isActive
          }
        })
      } else {
        return NextResponse.json({
          success: false,
          error: 'API key not found'
        }, { status: 404 })
      }
    } else if (exchange) {
      // Check if trading is enabled for exchange
      const tradingEnabled = apiKeyManager.isTradingEnabled(exchange)
      
      return NextResponse.json({
        success: true,
        tradingEnabled,
        exchange
      })
    } else {
      // List all API keys (without sensitive data)
      const apiKeys = await apiKeyManager.listApiKeys()
      
      return NextResponse.json({
        success: true,
        apiKeys
      })
    }

  } catch (error: any) {
    console.error('Get API keys error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get API keys'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body: UpdateApiKeyRequest = await request.json()
    
    if (!body.keyId || typeof body.isActive !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: keyId, isActive'
      }, { status: 400 })
    }

    const apiKeyManager = ApiKeyManager.getInstance()
    
    const success = await apiKeyManager.updateApiKeyStatus(body.keyId, body.isActive)

    if (success) {
      return NextResponse.json({
        success: true,
        message: `API key ${body.isActive ? 'enabled' : 'disabled'} successfully`
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'API key not found'
      }, { status: 404 })
    }

  } catch (error: any) {
    console.error('Update API key error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update API key'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('keyId')
    
    if (!keyId) {
      return NextResponse.json({
        success: false,
        error: 'keyId parameter is required'
      }, { status: 400 })
    }

    const apiKeyManager = ApiKeyManager.getInstance()
    
    const success = await apiKeyManager.removeApiKey(keyId)

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'API key removed successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'API key not found'
      }, { status: 404 })
    }

  } catch (error: any) {
    console.error('Remove API key error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to remove API key'
    }, { status: 500 })
  }
}