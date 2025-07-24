/**
 * Cryptocurrency Symbol Extractor
 * Identifies and extracts cryptocurrency symbols from text
 */

export interface ExtractedSymbol {
  symbol: string
  name?: string
  mentions: number
  contexts: string[] // Text snippets where the symbol appears
  newProjectIndicators?: number // Count of new project phrases found with this symbol
  pumpIndicators?: number // Count of pump/dump phrases found with this symbol
  riskScore?: number // 0-1 score based on pump indicators
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

  // New project indicators
  private static readonly NEW_PROJECT_PATTERNS = [
    /new\s+(project|coin|token|crypto|cryptocurrency)/gi,
    /just\s+(launched|released|announced)/gi,
    /(fresh|brand\s+new|stealth)\s+(launch|project)/gi,
    /(hidden|found|discovered)\s+gem/gi,
    /early\s+(stage|project|investment)/gi,
    /(fair|stealth)\s+launch/gi,
    /(presale|ido)\s+(live|launching|started)/gi,
    /new\s+listing/gi,
    /recently\s+(launched|listed|announced)/gi,
    /gem\s+(alert|found)/gi
  ]

  // Pump and dump indicators  
  private static readonly PUMP_PATTERNS = [
    /\b(moon|moonshot|rocket|pump)\b/gi,
    /\b(100x|1000x|10x|50x)\b/gi,
    /diamond\s+hands/gi,
    /(ape|yolo)\s+in/gi,
    /to\s+the\s+moon/gi,
    /get\s+(rich|wealthy)\s+(quick|fast)/gi,
    /easy\s+money/gi,
    /guaranteed\s+(profit|returns)/gi,
    /next\s+(big|huge)\s+thing/gi,
    /don't\s+miss\s+out/gi
  ]

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

    // Analyze text for new project and pump indicators
    this.analyzeRiskIndicators(text, symbolMap)

    // Convert map to array and sort by mentions, then by risk score
    return Array.from(symbolMap.values())
      .sort((a, b) => {
        // Primary sort by mentions
        if (b.mentions !== a.mentions) {
          return b.mentions - a.mentions
        }
        // Secondary sort by risk score (higher risk first)
        return (b.riskScore || 0) - (a.riskScore || 0)
      })
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
        contexts: [context],
        newProjectIndicators: 0,
        pumpIndicators: 0,
        riskScore: 0
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
   * Analyze text for new project and pump indicators around symbols
   */
  private static analyzeRiskIndicators(
    text: string, 
    symbolMap: Map<string, ExtractedSymbol>
  ): void {
    const lowerText = text.toLowerCase()
    
    // For each symbol found, analyze the surrounding context
    for (const [symbol, symbolData] of symbolMap) {
      // Find all mentions of this symbol in the text
      const symbolPattern = new RegExp(`\\b(\\$?${symbol}|#${symbol})\\b`, 'gi')
      const matches = [...text.matchAll(symbolPattern)]
      
      for (const match of matches) {
        const matchIndex = match.index || 0
        
        // Get surrounding context (200 chars before and after)
        const contextStart = Math.max(0, matchIndex - 200)
        const contextEnd = Math.min(text.length, matchIndex + match[0].length + 200)
        const context = text.substring(contextStart, contextEnd).toLowerCase()
        
        // Check for new project indicators
        for (const pattern of this.NEW_PROJECT_PATTERNS) {
          const newProjectMatches = context.matchAll(pattern)
          for (const _ of newProjectMatches) {
            symbolData.newProjectIndicators = (symbolData.newProjectIndicators || 0) + 1
          }
        }
        
        // Check for pump indicators
        for (const pattern of this.PUMP_PATTERNS) {
          const pumpMatches = context.matchAll(pattern)
          for (const _ of pumpMatches) {
            symbolData.pumpIndicators = (symbolData.pumpIndicators || 0) + 1
          }
        }
      }
      
      // Calculate risk score (0-1)
      const newProjectScore = Math.min(1, (symbolData.newProjectIndicators || 0) * 0.3)
      const pumpScore = Math.min(1, (symbolData.pumpIndicators || 0) * 0.2)
      const unknownSymbolBonus = this.KNOWN_CRYPTOS[symbol] ? 0 : 0.3
      
      symbolData.riskScore = Math.min(1, newProjectScore + pumpScore + unknownSymbolBonus)
    }
  }

  /**
   * Find symbols with high new project indicators
   */
  static findNewProjectSymbols(
    symbols: ExtractedSymbol[],
    minNewProjectIndicators: number = 1
  ): ExtractedSymbol[] {
    return symbols.filter(s => (s.newProjectIndicators || 0) >= minNewProjectIndicators)
      .sort((a, b) => (b.newProjectIndicators || 0) - (a.newProjectIndicators || 0))
  }

  /**
   * Find symbols with high pump indicators (potential pump and dump)
   */
  static findPumpSymbols(
    symbols: ExtractedSymbol[],
    minPumpIndicators: number = 2
  ): ExtractedSymbol[] {
    return symbols.filter(s => (s.pumpIndicators || 0) >= minPumpIndicators)
      .sort((a, b) => (b.pumpIndicators || 0) - (a.pumpIndicators || 0))
  }

  /**
   * Find high-risk symbols (combination of new project + pump indicators + unknown status)
   */
  static findHighRiskSymbols(
    symbols: ExtractedSymbol[],
    minRiskScore: number = 0.5
  ): ExtractedSymbol[] {
    return symbols.filter(s => (s.riskScore || 0) >= minRiskScore)
      .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
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

  /**
   * Analyze text specifically for new project keywords
   */
  static analyzeNewProjectKeywords(text: string): {
    hasNewProjectKeywords: boolean
    keywords: string[]
    score: number
  } {
    const foundKeywords: string[] = []
    const lowerText = text.toLowerCase()
    
    for (const pattern of this.NEW_PROJECT_PATTERNS) {
      const matches = [...lowerText.matchAll(pattern)]
      for (const match of matches) {
        foundKeywords.push(match[0])
      }
    }
    
    return {
      hasNewProjectKeywords: foundKeywords.length > 0,
      keywords: [...new Set(foundKeywords)], // Remove duplicates
      score: Math.min(1, foundKeywords.length * 0.2)
    }
  }

  /**
   * Get all new project keywords for configuration
   */
  static getNewProjectKeywords(): string[] {
    return [
      'new project', 'new coin', 'new token', 'just launched', 'fresh launch',
      'brand new', 'gem found', 'hidden gem', 'early project', 'stealth launch',
      'fair launch', 'presale live', 'ido launching', 'new listing',
      'recently launched', 'recently listed', 'gem alert'
    ]
  }

  /**
   * Get all pump keywords for configuration
   */
  static getPumpKeywords(): string[] {
    return [
      'moon', 'moonshot', 'rocket', 'pump', '100x', '1000x', '10x', '50x',
      'diamond hands', 'ape in', 'yolo', 'to the moon', 'lambo',
      'get rich quick', 'easy money', 'guaranteed profit', 'next big thing',
      'don\'t miss out'
    ]
  }
}