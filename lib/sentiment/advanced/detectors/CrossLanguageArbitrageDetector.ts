import { BaseSignalDetector } from '../BaseSignalDetector';
import { SignalType, TextInput, CrossLanguageArbitrageSignal } from '../types';

/**
 * Detects cross-language arbitrage opportunities in sentiment
 * Identifies sentiment spreading from regional to global markets
 * Tracks translation lag exploitation opportunities
 */
export class CrossLanguageArbitrageDetector extends BaseSignalDetector {
  // Language detection patterns
  private readonly languagePatterns: Record<string, RegExp[]> = {
    chinese: [
      /[\u4e00-\u9fa5]+/g, // Chinese characters
      /[\u3040-\u309f\u30a0-\u30ff]+/g, // Japanese Hiragana/Katakana
    ],
    korean: [
      /[\uac00-\ud7af]+/g, // Korean Hangul
    ],
    arabic: [
      /[\u0600-\u06ff]+/g, // Arabic script
    ],
    russian: [
      /[\u0400-\u04ff]+/g, // Cyrillic script
    ],
    spanish: [
      /\b(el|la|los|las|un|una|de|en|por|para|con|sin|sobre)\b/gi,
      /[áéíóúñ¿¡]/gi
    ],
    french: [
      /\b(le|la|les|un|une|de|du|des|en|pour|avec|sans|sur)\b/gi,
      /[àâçèéêëîïôùûÿæœ]/gi
    ],
    german: [
      /\b(der|die|das|ein|eine|von|zu|mit|für|auf|in)\b/gi,
      /[äöüßÄÖÜ]/gi
    ],
    portuguese: [
      /\b(o|a|os|as|um|uma|de|em|para|com|sem|sobre)\b/gi,
      /[ãõáéíóúâêôç]/gi
    ],
    japanese: [
      /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g
    ],
    hindi: [
      /[\u0900-\u097f]+/g // Devanagari script
    ]
  };

  // Sentiment keywords in different languages
  private readonly sentimentKeywords: Record<string, { bullish: string[], bearish: string[] }> = {
    english: {
      bullish: ['moon', 'rocket', 'bullish', 'pump', 'rally', 'breakout', 'buy', 'long'],
      bearish: ['dump', 'crash', 'bearish', 'sell', 'short', 'drop', 'fall', 'collapse']
    },
    chinese: {
      bullish: ['涨', '牛市', '买入', '突破', '飞天', '暴涨', '做多'],
      bearish: ['跌', '熊市', '卖出', '崩盘', '暴跌', '做空']
    },
    korean: {
      bullish: ['상승', '불장', '매수', '돌파', '폭등', '롱'],
      bearish: ['하락', '베어', '매도', '폭락', '숏']
    },
    spanish: {
      bullish: ['luna', 'cohete', 'alcista', 'comprar', 'subir', 'romper'],
      bearish: ['bajista', 'vender', 'caer', 'desplome', 'colapso']
    },
    japanese: {
      bullish: ['上昇', '強気', '買い', 'ブレイクアウト', '爆上げ'],
      bearish: ['下落', '弱気', '売り', '暴落', 'ショート']
    }
  };

  // Regional market patterns (kimchi premium style)
  private readonly regionalPatterns: Record<string, string[]> = {
    korea: ['kimchi', 'upbit', 'bithumb', '김치', '업비트', '빗썸'],
    japan: ['bitflyer', 'zaif', 'ビットフライヤー'],
    china: ['huobi', 'okex', '火币', 'OKEx'],
    europe: ['bitstamp', 'kraken'],
    latam: ['mercado', 'bitcoin', 'cripto']
  };

  constructor() {
    super(SignalType.CROSS_LANGUAGE_ARBITRAGE);
  }

  protected async performDetection(input: TextInput): Promise<CrossLanguageArbitrageSignal | null> {
    const text = input.text;
    
    // Detect languages present in the text
    const detectedLanguages = this.detectLanguages(text);
    if (detectedLanguages.length < 2) {
      // Need at least 2 languages for arbitrage
      return null;
    }

    // Extract sentiment by language
    const languageSentiments = this.extractLanguageSentiments(text, detectedLanguages);
    
    // Calculate sentiment spread
    const sentimentSpread = this.calculateSentimentSpread(languageSentiments);
    
    // Detect translation timing patterns
    const translationLag = this.detectTranslationLag(text, detectedLanguages);
    
    // Calculate language velocity (how fast sentiment spreads)
    const languageVelocity = this.calculateLanguageVelocity(languageSentiments, input.timestamp);
    
    // Detect regional premium patterns
    const regionalPremium = this.detectRegionalPremium(text);
    
    // Calculate cross-lingual correlation
    const crossLingualCorrelation = this.calculateCrossLingualCorrelation(languageSentiments);
    
    // Determine arbitrage opportunity
    const arbitrageOpportunity = this.identifyArbitrageOpportunity(
      sentimentSpread,
      translationLag,
      languageVelocity,
      regionalPremium
    );

    if (!arbitrageOpportunity || arbitrageOpportunity.confidence < 0.3) {
      return null;
    }

    // Calculate overall signal strength
    const strength = this.calculateSignalStrength(
      sentimentSpread,
      translationLag,
      crossLingualCorrelation,
      arbitrageOpportunity
    );

    const primaryLanguage = this.identifyPrimaryLanguage(detectedLanguages, languageSentiments);
    const secondaryLanguages = detectedLanguages.filter(lang => lang !== primaryLanguage);

    return {
      id: this.generateSignalId(),
      type: SignalType.CROSS_LANGUAGE_ARBITRAGE,
      strength,
      metadata: this.createMetadata(arbitrageOpportunity.confidence, input.source),
      indicators: {
        primaryLanguage,
        secondaryLanguages,
        translationLag,
        sentimentSpread,
        regionalPremium,
        languageVelocity,
        crossLingualCorrelation,
        arbitrageOpportunity
      }
    };
  }

  /**
   * Detect languages present in the text
   */
  private detectLanguages(text: string): string[] {
    const detectedLanguages: string[] = [];
    
    // Always check for English (default if no specific patterns found)
    const hasEnglish = /[a-zA-Z]{2,}/.test(text);
    if (hasEnglish) {
      detectedLanguages.push('english');
    }

    // Check for other languages
    for (const [language, patterns] of Object.entries(this.languagePatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          if (!detectedLanguages.includes(language)) {
            detectedLanguages.push(language);
          }
          break;
        }
      }
    }

    return detectedLanguages;
  }

  /**
   * Extract sentiment scores by language
   */
  private extractLanguageSentiments(text: string, languages: string[]): Record<string, number> {
    const sentiments: Record<string, number> = {};

    for (const language of languages) {
      const keywords = this.sentimentKeywords[language] || this.sentimentKeywords.english;
      let bullishCount = 0;
      let bearishCount = 0;

      // Count bullish keywords
      for (const keyword of keywords.bullish) {
        const regex = new RegExp(keyword, 'gi');
        const matches = text.match(regex);
        bullishCount += matches ? matches.length : 0;
      }

      // Count bearish keywords
      for (const keyword of keywords.bearish) {
        const regex = new RegExp(keyword, 'gi');
        const matches = text.match(regex);
        bearishCount += matches ? matches.length : 0;
      }

      // Calculate sentiment score (-1 to 1)
      const total = bullishCount + bearishCount;
      if (total > 0) {
        sentiments[language] = (bullishCount - bearishCount) / total;
      } else {
        sentiments[language] = 0;
      }
    }

    return sentiments;
  }

  /**
   * Calculate sentiment spread between languages
   */
  private calculateSentimentSpread(languageSentiments: Record<string, number>): number {
    const sentimentValues = Object.values(languageSentiments);
    if (sentimentValues.length < 2) return 0;

    const max = Math.max(...sentimentValues);
    const min = Math.min(...sentimentValues);
    return max - min;
  }

  /**
   * Detect translation lag patterns
   */
  private detectTranslationLag(text: string, languages: string[]): number {
    // Look for temporal markers in different languages
    const temporalMarkers: Record<string, RegExp[]> = {
      english: [/just\s+now/i, /breaking/i, /\d+\s*(min|minute|hour|hr)s?\s+ago/i],
      chinese: [/刚刚/, /刚才/, /\d+分钟前/],
      korean: [/방금/, /지금/, /\d+분\s*전/],
      spanish: [/ahora\s+mismo/i, /hace\s+\d+\s*(minuto|hora)s?/i],
      japanese: [/たった今/, /さっき/, /\d+分前/]
    };

    const timeIndicators: number[] = [];

    for (const language of languages) {
      const markers = temporalMarkers[language] || [];
      for (const marker of markers) {
        if (marker.test(text)) {
          // Extract time value if present
          const timeMatch = text.match(/(\d+)\s*(min|minute|分|분)/i);
          if (timeMatch) {
            timeIndicators.push(parseInt(timeMatch[1]) * 60 * 1000); // Convert to ms
          } else {
            timeIndicators.push(0); // "just now"
          }
        }
      }
    }

    // Calculate average lag
    if (timeIndicators.length > 0) {
      return timeIndicators.reduce((a, b) => a + b, 0) / timeIndicators.length;
    }

    // Default lag estimation based on language diversity
    return languages.length > 2 ? 300000 : 180000; // 5 min : 3 min
  }

  /**
   * Calculate language velocity (sentiment propagation speed)
   */
  private calculateLanguageVelocity(
    languageSentiments: Record<string, number>,
    timestamp?: Date
  ): Record<string, number> {
    const velocity: Record<string, number> = {};
    
    // Simulate velocity based on language characteristics
    const baseVelocities: Record<string, number> = {
      english: 1.0,    // Baseline
      chinese: 0.8,    // Slightly slower due to translation
      korean: 0.85,    // Fast adoption in crypto
      japanese: 0.75,  // More cautious market
      spanish: 0.9,    // Quick spread in LATAM
      french: 0.7,     // Slower adoption
      german: 0.65,    // Most cautious
      portuguese: 0.85,
      arabic: 0.6,
      russian: 0.7,
      hindi: 0.55
    };

    for (const [language, sentiment] of Object.entries(languageSentiments)) {
      const baseVelocity = baseVelocities[language] || 0.5;
      // Adjust velocity based on sentiment strength
      velocity[language] = baseVelocity * (1 + Math.abs(sentiment) * 0.5);
    }

    return velocity;
  }

  /**
   * Detect regional premium patterns (like kimchi premium)
   */
  private detectRegionalPremium(text: string): number {
    let premiumIndicators = 0;
    let totalIndicators = 0;

    for (const [region, patterns] of Object.entries(this.regionalPatterns)) {
      for (const pattern of patterns) {
        if (text.toLowerCase().includes(pattern.toLowerCase())) {
          premiumIndicators++;
        }
        totalIndicators++;
      }
    }

    // Look for price difference mentions
    const priceDiffPatterns = [
      /premium/i,
      /price\s+difference/i,
      /arbitrage/i,
      /프리미엄/, // Korean "premium"
      /溢价/, // Chinese "premium"
      /差价/ // Chinese "price difference"
    ];

    for (const pattern of priceDiffPatterns) {
      if (pattern.test(text)) {
        premiumIndicators += 2; // Weight these higher
      }
    }

    // Extract percentage if mentioned
    const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch && premiumIndicators > 0) {
      return parseFloat(percentMatch[1]) / 100;
    }

    // Estimate based on indicators
    return premiumIndicators > 0 ? 0.03 : 0; // Default 3% premium if detected
  }

  /**
   * Calculate cross-lingual correlation
   */
  private calculateCrossLingualCorrelation(languageSentiments: Record<string, number>): number {
    const sentimentValues = Object.values(languageSentiments);
    if (sentimentValues.length < 2) return 0;

    // Calculate variance
    const mean = sentimentValues.reduce((a, b) => a + b, 0) / sentimentValues.length;
    const variance = sentimentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sentimentValues.length;
    
    // Lower variance = higher correlation
    return 1 - Math.min(1, Math.sqrt(variance));
  }

  /**
   * Identify arbitrage opportunity
   */
  private identifyArbitrageOpportunity(
    sentimentSpread: number,
    translationLag: number,
    languageVelocity: Record<string, number>,
    regionalPremium: number
  ): { direction: 'bullish' | 'bearish', confidence: number, estimatedDuration: number } | null {
    // Need significant spread and lag for arbitrage
    if (sentimentSpread < 0.3 || translationLag < 60000) { // 1 minute minimum
      return null;
    }

    // Calculate velocity spread
    const velocities = Object.values(languageVelocity);
    const velocitySpread = Math.max(...velocities) - Math.min(...velocities);

    // Determine direction based on faster language sentiment
    const fastestLanguage = Object.entries(languageVelocity)
      .sort(([, a], [, b]) => b - a)[0][0];
    
    // Calculate confidence
    const confidence = Math.min(1, 
      (sentimentSpread * 0.4) + 
      (velocitySpread * 0.3) + 
      (regionalPremium * 10 * 0.3)
    );

    // Estimate duration based on lag and velocity
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const estimatedDuration = translationLag / avgVelocity;

    return {
      direction: sentimentSpread > 0 ? 'bullish' : 'bearish',
      confidence,
      estimatedDuration: Math.round(estimatedDuration)
    };
  }

  /**
   * Calculate overall signal strength
   */
  private calculateSignalStrength(
    sentimentSpread: number,
    translationLag: number,
    crossLingualCorrelation: number,
    arbitrageOpportunity: { direction: 'bullish' | 'bearish', confidence: number }
  ): number {
    // Weight factors
    const spreadWeight = 0.3;
    const lagWeight = 0.2;
    const correlationWeight = 0.2;
    const confidenceWeight = 0.3;

    // Normalize lag (max 10 minutes)
    const normalizedLag = Math.min(1, translationLag / (10 * 60 * 1000));

    // Calculate weighted score
    const score = 
      (sentimentSpread * spreadWeight) +
      (normalizedLag * lagWeight) +
      ((1 - crossLingualCorrelation) * correlationWeight) + // Inverse - low correlation is good
      (arbitrageOpportunity.confidence * confidenceWeight);

    // Apply direction
    return arbitrageOpportunity.direction === 'bullish' ? score : -score;
  }

  /**
   * Identify primary language (source of sentiment)
   */
  private identifyPrimaryLanguage(
    languages: string[],
    languageSentiments: Record<string, number>
  ): string {
    // Primary language has strongest sentiment
    let primaryLanguage = languages[0];
    let maxSentiment = 0;

    for (const [language, sentiment] of Object.entries(languageSentiments)) {
      if (Math.abs(sentiment) > maxSentiment) {
        maxSentiment = Math.abs(sentiment);
        primaryLanguage = language;
      }
    }

    return primaryLanguage;
  }
}