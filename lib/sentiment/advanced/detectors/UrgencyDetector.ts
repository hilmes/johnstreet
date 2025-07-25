import { BaseSignalDetector } from '../BaseSignalDetector';
import { SignalType, TextInput, UrgencySignal } from '../types';

/**
 * Detects urgency signals in text
 * Looks for time pressure, immediacy, and urgent calls to action
 */
export class UrgencyDetector extends BaseSignalDetector {
  private readonly urgencyPatterns = [
    /\b(now|immediately|urgent|hurry|quick|fast|asap|right away|don't wait|last chance|ending soon|limited time|act now|today only)\b/gi,
    /\b(before it's too late|time is running out|deadline|expires|ending|closing)\b/gi,
    /\b(miss out|too late|gone forever|never again|final)\b/gi
  ];

  private readonly timeWords = [
    'now', 'immediately', 'today', 'tonight', 'soon', 'quickly',
    'hurry', 'rush', 'instant', 'moment', 'seconds', 'minutes', 'hours'
  ];

  constructor() {
    super(SignalType.URGENCY);
  }

  protected async performDetection(input: TextInput): Promise<UrgencySignal | null> {
    const text = input.text;
    const metrics = this.getTextMetrics(text);
    
    // Extract urgency keywords
    const urgencyKeywords = this.extractKeywords(text, this.urgencyPatterns);
    const timeRelatedWords = this.extractTimeWords(text);
    
    // Count exclamation marks
    const exclamationCount = (text.match(/!/g) || []).length;
    
    // Calculate caps ratio (adjusted for short texts)
    const capsRatio = metrics.capsRatio;
    
    // Calculate urgency score
    const urgencyScore = this.calculateUrgencyScore(
      urgencyKeywords.length,
      timeRelatedWords.length,
      exclamationCount,
      capsRatio,
      metrics.wordCount
    );

    // Check if urgency is detected
    if (urgencyScore < 0.3) {
      this.debug('Urgency score too low', { urgencyScore });
      return null;
    }

    // Calculate signal strength (-1 to 1, positive indicates bullish urgency)
    const strength = this.determineUrgencyDirection(text, urgencyScore);
    
    // Calculate confidence based on indicator strength
    const confidence = this.calculateConfidence(urgencyScore, urgencyKeywords.length);

    return {
      id: this.generateSignalId(),
      type: SignalType.URGENCY,
      strength,
      metadata: this.createMetadata(confidence, input.source),
      indicators: {
        exclamationCount,
        capsRatio,
        timeRelatedWords,
        urgencyScore
      }
    };
  }

  /**
   * Extract time-related words from text
   */
  private extractTimeWords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    return words.filter(word => 
      this.timeWords.includes(word.replace(/[.,!?;:'"]/g, ''))
    );
  }

  /**
   * Calculate urgency score based on multiple factors
   */
  private calculateUrgencyScore(
    urgencyKeywordCount: number,
    timeWordCount: number,
    exclamationCount: number,
    capsRatio: number,
    totalWords: number
  ): number {
    if (totalWords === 0) return 0;

    // Normalize counts by text length
    const normalizedUrgency = urgencyKeywordCount / Math.max(totalWords * 0.1, 1);
    const normalizedTime = timeWordCount / Math.max(totalWords * 0.1, 1);
    const normalizedExclamation = exclamationCount / Math.max(totalWords * 0.05, 1);

    // Weight different factors
    const score = 
      (normalizedUrgency * 0.4) +
      (normalizedTime * 0.3) +
      (normalizedExclamation * 0.2) +
      (capsRatio * 0.1);

    return Math.min(1, score);
  }

  /**
   * Determine if urgency is bullish or bearish
   */
  private determineUrgencyDirection(text: string, urgencyScore: number): number {
    const lowerText = text.toLowerCase();
    
    // Bearish urgency patterns
    const bearishPatterns = [
      /sell now/gi, /get out/gi, /dump/gi, /crash/gi, /plummet/gi,
      /exit now/gi, /evacuate/gi, /escape/gi
    ];
    
    // Bullish urgency patterns
    const bullishPatterns = [
      /buy now/gi, /get in/gi, /moon/gi, /explode/gi, /skyrocket/gi,
      /don't miss/gi, /opportunity/gi, /breakout/gi
    ];

    const bearishCount = this.countPatternOccurrences(lowerText, bearishPatterns);
    const bullishCount = this.countPatternOccurrences(lowerText, bullishPatterns);

    if (bearishCount > bullishCount) {
      return -urgencyScore; // Negative for bearish urgency
    } else if (bullishCount > bearishCount) {
      return urgencyScore; // Positive for bullish urgency
    } else {
      // Neutral urgency, slight positive bias
      return urgencyScore * 0.5;
    }
  }

  /**
   * Calculate confidence based on evidence strength
   */
  private calculateConfidence(urgencyScore: number, keywordCount: number): number {
    const baseConfidence = urgencyScore;
    const keywordBonus = Math.min(0.3, keywordCount * 0.1);
    
    return Math.min(1, baseConfidence + keywordBonus);
  }
}