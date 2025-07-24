import crypto from 'crypto'

interface ApiKeyConfig {
  exchange: string
  apiKey: string
  secret: string
  passphrase?: string
  sandbox?: boolean
  permissions?: string[]
  createdAt: number
  lastUsed?: number
  isActive: boolean
}

interface EncryptedApiKey {
  encrypted: string
  iv: string
  salt: string
}

export class ApiKeyManager {
  private static instance: ApiKeyManager
  private encryptionKey: string
  private apiKeys: Map<string, ApiKeyConfig> = new Map()

  private constructor() {
    // In production, this should come from environment variables or secure storage
    this.encryptionKey = process.env.API_KEY_ENCRYPTION_KEY || this.generateEncryptionKey()
    this.loadApiKeys()
  }

  static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager()
    }
    return ApiKeyManager.instance
  }

  private generateEncryptionKey(): string {
    // Generate a random 32-byte key for AES-256
    return crypto.randomBytes(32).toString('hex')
  }

  private encrypt(text: string): EncryptedApiKey {
    const salt = crypto.randomBytes(32)
    const iv = crypto.randomBytes(16)
    const key = crypto.pbkdf2Sync(this.encryptionKey, salt, 100000, 32, 'sha512')
    
    const cipher = crypto.createCipherGCM('aes-256-gcm', key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return {
      encrypted: encrypted + ':' + authTag.toString('hex'),
      iv: iv.toString('hex'),
      salt: salt.toString('hex')
    }
  }

  private decrypt(encryptedData: EncryptedApiKey): string {
    const salt = Buffer.from(encryptedData.salt, 'hex')
    const iv = Buffer.from(encryptedData.iv, 'hex')
    const key = crypto.pbkdf2Sync(this.encryptionKey, salt, 100000, 32, 'sha512')
    
    const [encrypted, authTag] = encryptedData.encrypted.split(':')
    
    const decipher = crypto.createDecipherGCM('aes-256-gcm', key, iv)
    decipher.setAuthTag(Buffer.from(authTag, 'hex'))
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }

  async addApiKey(
    keyId: string,
    exchange: string,
    apiKey: string,
    secret: string,
    options: {
      passphrase?: string
      sandbox?: boolean
      permissions?: string[]
    } = {}
  ): Promise<boolean> {
    try {
      // Validate API key format
      if (!this.validateApiKeyFormat(exchange, apiKey, secret)) {
        throw new Error('Invalid API key format')
      }

      // Test API key by making a simple request
      const isValid = await this.testApiKey(exchange, apiKey, secret, options.passphrase, options.sandbox)
      if (!isValid) {
        throw new Error('API key validation failed')
      }

      const config: ApiKeyConfig = {
        exchange: exchange.toLowerCase(),
        apiKey,
        secret,
        passphrase: options.passphrase,
        sandbox: options.sandbox || false,
        permissions: options.permissions || [],
        createdAt: Date.now(),
        isActive: true
      }

      this.apiKeys.set(keyId, config)
      await this.saveApiKeys()
      
      console.log(`API key added for ${exchange}:`, keyId)
      return true

    } catch (error) {
      console.error('Failed to add API key:', error)
      return false
    }
  }

  async getApiKey(keyId: string): Promise<ApiKeyConfig | null> {
    const config = this.apiKeys.get(keyId)
    if (config && config.isActive) {
      // Update last used timestamp
      config.lastUsed = Date.now()
      await this.saveApiKeys()
      return config
    }
    return null
  }

  async removeApiKey(keyId: string): Promise<boolean> {
    try {
      const deleted = this.apiKeys.delete(keyId)
      if (deleted) {
        await this.saveApiKeys()
        console.log('API key removed:', keyId)
      }
      return deleted
    } catch (error) {
      console.error('Failed to remove API key:', error)
      return false
    }
  }

  async listApiKeys(): Promise<Array<{ keyId: string; exchange: string; sandbox: boolean; permissions: string[]; createdAt: number; lastUsed?: number }>> {
    return Array.from(this.apiKeys.entries()).map(([keyId, config]) => ({
      keyId,
      exchange: config.exchange,
      sandbox: config.sandbox,
      permissions: config.permissions || [],
      createdAt: config.createdAt,
      lastUsed: config.lastUsed
    }))
  }

  async updateApiKeyStatus(keyId: string, isActive: boolean): Promise<boolean> {
    try {
      const config = this.apiKeys.get(keyId)
      if (config) {
        config.isActive = isActive
        await this.saveApiKeys()
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to update API key status:', error)
      return false
    }
  }

  private validateApiKeyFormat(exchange: string, apiKey: string, secret: string): boolean {
    // Basic validation - can be enhanced per exchange
    if (!apiKey || !secret) return false
    
    switch (exchange.toLowerCase()) {
      case 'kraken':
        // Kraken API keys are typically base64 encoded
        return apiKey.length >= 40 && secret.length >= 40
      case 'binance':
        return apiKey.length === 64 && secret.length === 64
      case 'coinbase':
        return apiKey.length >= 20 && secret.length >= 40
      default:
        return apiKey.length >= 10 && secret.length >= 10
    }
  }

  private async testApiKey(
    exchange: string,
    apiKey: string,
    secret: string,
    passphrase?: string,
    sandbox: boolean = false
  ): Promise<boolean> {
    try {
      // Import exchange services dynamically to avoid circular dependencies
      switch (exchange.toLowerCase()) {
        case 'kraken': {
          // Test with a simple balance request
          const testConfig = { apiKey, secret, sandbox }
          // This would need to be implemented with actual API testing
          // For now, we'll assume the key is valid if it meets format requirements
          return this.validateApiKeyFormat(exchange, apiKey, secret)
        }
        default:
          return this.validateApiKeyFormat(exchange, apiKey, secret)
      }
    } catch (error) {
      console.error('API key test failed:', error)
      return false
    }
  }

  private async loadApiKeys(): Promise<void> {
    try {
      // In production, this should load from secure database or encrypted file
      // For now, we'll use in-memory storage
      const storedKeys = process.env.STORED_API_KEYS
      if (storedKeys) {
        const parsed = JSON.parse(storedKeys)
        for (const [keyId, encryptedConfig] of Object.entries(parsed)) {
          try {
            const decrypted = this.decrypt(encryptedConfig as EncryptedApiKey)
            const config = JSON.parse(decrypted)
            this.apiKeys.set(keyId, config)
          } catch (error) {
            console.error(`Failed to decrypt API key ${keyId}:`, error)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load API keys:', error)
    }
  }

  private async saveApiKeys(): Promise<void> {
    try {
      // In production, this should save to secure database or encrypted file
      const toStore: Record<string, EncryptedApiKey> = {}
      
      for (const [keyId, config] of this.apiKeys.entries()) {
        const serialized = JSON.stringify(config)
        toStore[keyId] = this.encrypt(serialized)
      }
      
      // For development, log a warning about insecure storage
      if (process.env.NODE_ENV !== 'production') {
        console.warn('API keys are stored in memory only. Configure secure storage for production.')
      }
      
    } catch (error) {
      console.error('Failed to save API keys:', error)
    }
  }

  // Utility method to get API credentials for a specific exchange
  async getExchangeCredentials(exchange: string): Promise<ApiKeyConfig | null> {
    // Find the first active API key for the given exchange
    for (const [keyId, config] of this.apiKeys.entries()) {
      if (config.exchange === exchange.toLowerCase() && config.isActive) {
        config.lastUsed = Date.now()
        await this.saveApiKeys()
        return config
      }
    }
    return null
  }

  // Check if trading is enabled (has valid API keys)
  isTradingEnabled(exchange: string): boolean {
    for (const [keyId, config] of this.apiKeys.entries()) {
      if (config.exchange === exchange.toLowerCase() && config.isActive) {
        const permissions = config.permissions || []
        return permissions.includes('trade') || permissions.length === 0 // Assume trading if no specific permissions set
      }
    }
    return false
  }
}