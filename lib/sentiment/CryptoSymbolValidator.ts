/**
 * Cryptocurrency Symbol Validator
 * Validates symbols against real market data
 */

import { CryptoSymbolExtractor } from './CryptoSymbolExtractor'

export interface ValidatedSymbol {
  symbol: string
  name?: string
  isValid: boolean
  marketCap?: number
  price?: number
  volume24h?: number
  source: 'known' | 'market' | 'unknown'
}

export class CryptoSymbolValidator {
  private static cache = new Map<string, ValidatedSymbol>()
  private static cacheExpiry = 3600000 // 1 hour
  private static lastCacheUpdate = 0

  /**
   * Validate a single symbol
   */
  static async validateSymbol(symbol: string): Promise<ValidatedSymbol> {
    const upperSymbol = symbol.toUpperCase()
    
    // Check cache first
    const cached = this.cache.get(upperSymbol)
    if (cached && Date.now() - this.lastCacheUpdate < this.cacheExpiry) {
      return cached
    }

    // Check known cryptos first
    const knownInfo = CryptoSymbolExtractor.getSymbolInfo(upperSymbol)
    if (knownInfo.isKnown) {
      const validated: ValidatedSymbol = {
        symbol: upperSymbol,
        name: knownInfo.name,
        isValid: true,
        source: 'known'
      }
      this.cache.set(upperSymbol, validated)
      return validated
    }

    // If not known, could check against a market API
    // For now, mark as unknown
    const validated: ValidatedSymbol = {
      symbol: upperSymbol,
      isValid: false,
      source: 'unknown'
    }
    this.cache.set(upperSymbol, validated)
    return validated
  }

  /**
   * Validate multiple symbols
   */
  static async validateSymbols(symbols: string[]): Promise<ValidatedSymbol[]> {
    const results = await Promise.all(
      symbols.map(symbol => this.validateSymbol(symbol))
    )
    return results
  }

  /**
   * Filter valid symbols from a list
   */
  static async filterValidSymbols(symbols: string[]): Promise<string[]> {
    const validated = await this.validateSymbols(symbols)
    return validated
      .filter(v => v.isValid)
      .map(v => v.symbol)
  }

  /**
   * Get market data for validated symbols (placeholder for future API integration)
   */
  static async enrichWithMarketData(symbols: ValidatedSymbol[]): Promise<ValidatedSymbol[]> {
    // In a real implementation, this would fetch current market data
    // For now, return as-is
    return symbols
  }

  /**
   * Clear validation cache
   */
  static clearCache(): void {
    this.cache.clear()
    this.lastCacheUpdate = 0
  }
}