/**
 * Common utilities for sentiment signal detection
 */

// Common sentiment word patterns
export const SentimentPatterns = {
  // Positive patterns
  positive: {
    strong: /\b(amazing|incredible|fantastic|excellent|outstanding|brilliant|perfect|wonderful|awesome|great)\b/gi,
    moderate: /\b(good|nice|positive|better|improving|hopeful|optimistic|confident|solid|decent)\b/gi,
    weak: /\b(okay|fine|alright|fair|acceptable|adequate|satisfactory)\b/gi
  },
  
  // Negative patterns
  negative: {
    strong: /\b(terrible|horrible|awful|disastrous|catastrophic|devastating|ruined|destroyed|crashed)\b/gi,
    moderate: /\b(bad|negative|worse|declining|worried|concerned|problematic|difficult|struggling)\b/gi,
    weak: /\b(disappointing|subpar|mediocre|lackluster|underwhelming)\b/gi
  },
  
  // Market-specific patterns
  market: {
    bullish: /\b(bull|bullish|moon|mooning|pump|rocket|breakout|rally|surge|soar)\b/gi,
    bearish: /\b(bear|bearish|dump|crash|plunge|collapse|tank|fall|drop|decline)\b/gi,
    neutral: /\b(sideways|consolidate|range|stable|flat|unchanged)\b/gi
  }
};

// Common indicator words for different signals
export const SignalIndicators = {
  fear: [
    'afraid', 'scared', 'terrified', 'frightened', 'anxious', 'nervous',
    'panic', 'worry', 'concern', 'dread', 'apprehensive', 'uneasy'
  ],
  
  excitement: [
    'excited', 'thrilled', 'pumped', 'energized', 'enthusiastic', 'eager',
    'psyched', 'stoked', 'hyped', 'ecstatic', 'elated', 'overjoyed'
  ],
  
  uncertainty: [
    'maybe', 'perhaps', 'possibly', 'might', 'could', 'unsure',
    'unclear', 'confused', 'doubtful', 'hesitant', 'undecided', 'wondering'
  ],
  
  confidence: [
    'certain', 'sure', 'confident', 'guaranteed', 'definitely', 'absolutely',
    'convinced', 'positive', 'assured', 'determined', 'resolute', 'unwavering'
  ]
};

/**
 * Calculate weighted sentiment score from multiple indicators
 */
export function calculateWeightedSentiment(
  indicators: { value: number; weight: number }[]
): number {
  if (indicators.length === 0) return 0;
  
  const totalWeight = indicators.reduce((sum, ind) => sum + ind.weight, 0);
  if (totalWeight === 0) return 0;
  
  const weightedSum = indicators.reduce(
    (sum, ind) => sum + (ind.value * ind.weight), 
    0
  );
  
  return weightedSum / totalWeight;
}

/**
 * Normalize a value to a specific range
 */
export function normalizeToRange(
  value: number, 
  min: number, 
  max: number, 
  targetMin: number = -1, 
  targetMax: number = 1
): number {
  if (max === min) return (targetMin + targetMax) / 2;
  
  const normalized = (value - min) / (max - min);
  return targetMin + (normalized * (targetMax - targetMin));
}

/**
 * Calculate text complexity metrics
 */
export function getTextComplexity(text: string): {
  readabilityScore: number;
  sentenceComplexity: number;
  vocabularyDiversity: number;
} {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const uniqueWords = new Set(words);
  
  // Average words per sentence
  const avgWordsPerSentence = sentences.length > 0 ? 
    words.length / sentences.length : 0;
  
  // Vocabulary diversity (unique words / total words)
  const vocabularyDiversity = words.length > 0 ? 
    uniqueWords.size / words.length : 0;
  
  // Simple readability approximation
  const readabilityScore = Math.max(0, Math.min(1, 
    1 - (avgWordsPerSentence - 10) / 20
  ));
  
  return {
    readabilityScore,
    sentenceComplexity: avgWordsPerSentence / 20, // Normalized to 0-1
    vocabularyDiversity
  };
}

/**
 * Extract entities from text (simple implementation)
 */
export function extractEntities(text: string): {
  tickers: string[];
  numbers: number[];
  percentages: string[];
  urls: string[];
} {
  // Extract stock tickers (simple pattern)
  const tickers = (text.match(/\$[A-Z]{1,5}\b/g) || [])
    .map(t => t.substring(1));
  
  // Extract numbers
  const numbers = (text.match(/\b\d+\.?\d*\b/g) || [])
    .map(n => parseFloat(n))
    .filter(n => !isNaN(n));
  
  // Extract percentages
  const percentages = text.match(/\d+\.?\d*%/g) || [];
  
  // Extract URLs
  const urls = text.match(/https?:\/\/[^\s]+/g) || [];
  
  return { tickers, numbers, percentages, urls };
}

/**
 * Calculate temporal indicators
 */
export function getTemporalIndicators(text: string): {
  pastTense: number;
  presentTense: number;
  futureTense: number;
  temporalWords: string[];
} {
  const words = text.toLowerCase().split(/\s+/);
  
  // Simple tense detection patterns
  const pastPatterns = /\b(was|were|did|had|went|came|saw|made|got|gave|took|knew)\b/gi;
  const futurePatterns = /\b(will|shall|going to|gonna|planning|expecting|anticipate)\b/gi;
  
  const pastMatches = text.match(pastPatterns) || [];
  const futureMatches = text.match(futurePatterns) || [];
  
  // Temporal words
  const temporalPatterns = /\b(now|then|soon|later|yesterday|today|tomorrow|recently|previously|currently|eventually)\b/gi;
  const temporalWords = (text.match(temporalPatterns) || [])
    .map(w => w.toLowerCase());
  
  const totalTenseIndicators = pastMatches.length + futureMatches.length + words.length / 10;
  
  return {
    pastTense: pastMatches.length / totalTenseIndicators,
    presentTense: 1 - (pastMatches.length + futureMatches.length) / totalTenseIndicators,
    futureTense: futureMatches.length / totalTenseIndicators,
    temporalWords: [...new Set(temporalWords)]
  };
}

/**
 * Detect emotional intensity
 */
export function getEmotionalIntensity(text: string): number {
  const intensifiers = /\b(very|extremely|incredibly|absolutely|totally|completely|utterly|really|so|such)\b/gi;
  const exclamations = (text.match(/!/g) || []).length;
  const caps = (text.match(/[A-Z]{2,}/g) || []).length;
  const emphasis = (text.match(/\*\w+\*|_\w+_/g) || []).length;
  
  const intensifierCount = (text.match(intensifiers) || []).length;
  const wordCount = text.split(/\s+/).length;
  
  const intensity = (
    (intensifierCount / Math.max(wordCount * 0.1, 1)) * 0.3 +
    (exclamations / Math.max(wordCount * 0.05, 1)) * 0.3 +
    (caps / Math.max(wordCount * 0.05, 1)) * 0.2 +
    (emphasis / Math.max(wordCount * 0.05, 1)) * 0.2
  );
  
  return Math.min(1, intensity);
}

/**
 * Aggregate multiple signal scores
 */
export function aggregateSignalScores(
  scores: Record<string, number>,
  weights?: Record<string, number>
): number {
  const entries = Object.entries(scores);
  if (entries.length === 0) return 0;
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const [key, value] of entries) {
    const weight = weights?.[key] || 1;
    weightedSum += value * weight;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}