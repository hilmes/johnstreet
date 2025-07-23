/**
 * Cryptocurrency Symbol Extractor
 * Identifies and extracts cryptocurrency symbols from text
 */

export interface ExtractedSymbol {
  symbol: string
  name?: string
  mentions: number
  contexts: string[] // Text snippets where the symbol appears
}

export class CryptoSymbolExtractor {
  // Common cryptocurrency symbols and their names
  private static readonly KNOWN_CRYPTOS: Record<string, string> = {
    // Major cryptocurrencies
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'BNB': 'Binance Coin',
    'XRP': 'Ripple',
    'ADA': 'Cardano',
    'SOL': 'Solana',
    'DOGE': 'Dogecoin',
    'DOT': 'Polkadot',
    'MATIC': 'Polygon',
    'SHIB': 'Shiba Inu',
    'TRX': 'TRON',
    'AVAX': 'Avalanche',
    'UNI': 'Uniswap',
    'ATOM': 'Cosmos',
    'LTC': 'Litecoin',
    'LINK': 'Chainlink',
    'BCH': 'Bitcoin Cash',
    'ALGO': 'Algorand',
    'XLM': 'Stellar',
    'VET': 'VeChain',
    'ICP': 'Internet Computer',
    'FIL': 'Filecoin',
    'LUNA': 'Terra',
    'NEAR': 'NEAR Protocol',
    'FTM': 'Fantom',
    'SAND': 'The Sandbox',
    'MANA': 'Decentraland',
    'XTZ': 'Tezos',
    'THETA': 'Theta',
    'AAVE': 'Aave',
    'AXS': 'Axie Infinity',
    'EGLD': 'MultiversX',
    'FLOW': 'Flow',
    'GALA': 'Gala',
    'CHZ': 'Chiliz',
    'KDA': 'Kadena',
    'CRO': 'Cronos',
    'QNT': 'Quant',
    'ARB': 'Arbitrum',
    'OP': 'Optimism',
    'APT': 'Aptos',
    'HBAR': 'Hedera',
    'IMX': 'Immutable',
    'GRT': 'The Graph',
    'INJ': 'Injective',
    'STX': 'Stacks',
    'RNDR': 'Render',
    'RUNE': 'THORChain',
    'OSMO': 'Osmosis',
    'SEI': 'Sei',
    'SUI': 'Sui',
    'PEPE': 'Pepe',
    'FLOKI': 'Floki',
    'WIF': 'dogwifhat',
    'BONK': 'Bonk',
    // Stablecoins
    'USDT': 'Tether',
    'USDC': 'USD Coin',
    'BUSD': 'Binance USD',
    'DAI': 'Dai',
    'TUSD': 'TrueUSD',
    'USDD': 'USDD',
    'GUSD': 'Gemini Dollar',
  }

  // Common patterns for cryptocurrency mentions
  private static readonly PATTERNS = {
    // $SYMBOL pattern (e.g., $BTC, $ETH)
    dollarSymbol: /\$([A-Z]{2,10})\b/gi,
    // Hashtag pattern (e.g., #BTC, #Bitcoin)
    hashtagSymbol: /#([A-Z]{2,10})\b/gi,
    // Standalone uppercase symbols (e.g., "BTC is pumping")
    standaloneSymbol: /\b([A-Z]{2,10})\b/g,
    // Symbol/USDT or Symbol/USD patterns
    tradingPair: /\b([A-Z]{2,10})\/(USD[TC]?|BTC|ETH|BNB)\b/gi,
    // "coin" or "token" mentions (e.g., "PEPE coin", "SHIB token")
    coinToken: /\b([A-Z]{2,10})\s*(coin|token)\b/gi,
  }

  // Words to exclude that might match patterns but aren't crypto
  private static readonly EXCLUSIONS = new Set([
    'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'ALL', 'NEW', 'ONE', 'TWO',
    'CAN', 'HAS', 'HAD', 'WAS', 'GET', 'GOT', 'HIM', 'HER', 'ITS', 'NOW',
    'TOP', 'HOW', 'OUT', 'SEE', 'WAY', 'WHO', 'OIL', 'DID', 'CAR', 'FEW',
    'USA', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'NZD',
    'CEO', 'CFO', 'CTO', 'IPO', 'API', 'URL', 'FAQ', 'CEO', 'COO',
    'ATH', 'ATL', 'ROI', 'APY', 'APR', 'TVL', 'DEX', 'CEX', 'DAO',
    'GMT', 'UTC', 'EST', 'PST', 'PDT', 'EDT', 'BST', 'JST',
    'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN',
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ])

  /**
   * Extract cryptocurrency symbols from text
   */
  static extractSymbols(text: string): ExtractedSymbol[] {
    const symbolMap = new Map<string, ExtractedSymbol>()
    const processedText = text.toUpperCase()

    // Extract using dollar sign pattern (highest confidence)
    this.extractWithPattern(text, this.PATTERNS.dollarSymbol, symbolMap, 1)

    // Extract using hashtag pattern
    this.extractWithPattern(text, this.PATTERNS.hashtagSymbol, symbolMap, 0)

    // Extract trading pairs
    this.extractWithPattern(text, this.PATTERNS.tradingPair, symbolMap, 0)

    // Extract coin/token mentions
    this.extractWithPattern(text, this.PATTERNS.coinToken, symbolMap, 0)

    // Extract standalone symbols (lower confidence, only if known)
    const standaloneMatches = processedText.matchAll(this.PATTERNS.standaloneSymbol)
    for (const match of standaloneMatches) {
      const symbol = match[1]
      if (this.isValidCryptoSymbol(symbol) && this.KNOWN_CRYPTOS[symbol]) {
        this.addSymbolToMap(symbol, match[0], text, match.index || 0, symbolMap)
      }
    }

    // Convert map to array and sort by mentions
    return Array.from(symbolMap.values())
      .sort((a, b) => b.mentions - a.mentions)
  }

  /**
   * Extract symbols using a specific pattern
   */
  private static extractWithPattern(
    text: string,
    pattern: RegExp,
    symbolMap: Map<string, ExtractedSymbol>,
    captureGroup: number
  ): void {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const symbol = match[captureGroup].toUpperCase()
      if (this.isValidCryptoSymbol(symbol)) {
        this.addSymbolToMap(symbol, match[0], text, match.index || 0, symbolMap)
      }
    }
  }

  /**
   * Add symbol to the map with context
   */
  private static addSymbolToMap(
    symbol: string,
    matchText: string,
    fullText: string,
    index: number,
    symbolMap: Map<string, ExtractedSymbol>
  ): void {
    // Get context (50 chars before and after)
    const contextStart = Math.max(0, index - 50)
    const contextEnd = Math.min(fullText.length, index + matchText.length + 50)
    const context = fullText.substring(contextStart, contextEnd).trim()

    if (symbolMap.has(symbol)) {
      const existing = symbolMap.get(symbol)!
      existing.mentions++
      if (!existing.contexts.includes(context)) {
        existing.contexts.push(context)
      }
    } else {
      symbolMap.set(symbol, {
        symbol,
        name: this.KNOWN_CRYPTOS[symbol],
        mentions: 1,
        contexts: [context]
      })
    }
  }

  /**
   * Check if a symbol is valid
   */
  private static isValidCryptoSymbol(symbol: string): boolean {
    // Must be 2-10 characters
    if (symbol.length < 2 || symbol.length > 10) return false
    
    // Must not be in exclusions
    if (this.EXCLUSIONS.has(symbol)) return false
    
    // Must be all uppercase letters
    if (!/^[A-Z]+$/.test(symbol)) return false
    
    return true
  }

  /**
   * Get symbol information
   */
  static getSymbolInfo(symbol: string): { symbol: string; name?: string; isKnown: boolean } {
    const upperSymbol = symbol.toUpperCase()
    return {
      symbol: upperSymbol,
      name: this.KNOWN_CRYPTOS[upperSymbol],
      isKnown: !!this.KNOWN_CRYPTOS[upperSymbol]
    }
  }

  /**
   * Analyze symbol frequency across multiple texts
   */
  static analyzeSymbolFrequency(texts: string[]): Map<string, number> {
    const frequencyMap = new Map<string, number>()

    for (const text of texts) {
      const symbols = this.extractSymbols(text)
      for (const symbol of symbols) {
        const current = frequencyMap.get(symbol.symbol) || 0
        frequencyMap.set(symbol.symbol, current + symbol.mentions)
      }
    }

    // Sort by frequency
    return new Map(
      Array.from(frequencyMap.entries())
        .sort((a, b) => b[1] - a[1])
    )
  }

  /**
   * Find trending symbols (mentioned significantly more than usual)
   */
  static findTrendingSymbols(
    currentMentions: Map<string, number>,
    historicalAverage: Map<string, number>,
    threshold: number = 2.0 // 2x normal mentions
  ): string[] {
    const trending: string[] = []

    for (const [symbol, current] of currentMentions) {
      const historical = historicalAverage.get(symbol) || 1
      if (current / historical >= threshold) {
        trending.push(symbol)
      }
    }

    return trending
  }
}