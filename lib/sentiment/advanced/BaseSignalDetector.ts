import { 
  ISignalDetector, 
  SignalType, 
  DetectorConfig, 
  TextInput, 
  AdvancedSignal,
  SignalMetadata,
  BaseSignal
} from './types';

/**
 * Abstract base class for all sentiment signal detectors
 * Provides common functionality and enforces interface implementation
 */
export abstract class BaseSignalDetector implements ISignalDetector {
  public readonly type: SignalType;
  public config: DetectorConfig;
  
  protected readonly defaultConfig: DetectorConfig = {
    enabled: true,
    sensitivity: 0.5,
    minConfidence: 0.3,
    debugMode: false
  };

  constructor(type: SignalType, config?: Partial<DetectorConfig>) {
    this.type = type;
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Abstract method to be implemented by each specific detector
   * Performs the actual signal detection logic
   */
  protected abstract performDetection(input: TextInput): Promise<AdvancedSignal | null>;

  /**
   * Main detection method with common pre/post processing
   */
  public async detect(input: TextInput): Promise<AdvancedSignal | null> {
    if (!this.config.enabled) {
      return null;
    }

    const startTime = Date.now();

    try {
      // Preprocess input
      const processedInput = this.preprocessInput(input);
      
      // Perform detection
      const signal = await this.performDetection(processedInput);
      
      if (!signal) {
        return null;
      }

      // Apply confidence threshold
      if (signal.metadata.confidence < this.config.minConfidence) {
        if (this.config.debugMode) {
          console.log(`Signal confidence ${signal.metadata.confidence} below threshold ${this.config.minConfidence}`);
        }
        return null;
      }

      // Apply sensitivity adjustment
      const adjustedSignal = this.applySensitivity(signal);
      
      // Add processing time
      adjustedSignal.metadata.processingTime = Date.now() - startTime;

      return adjustedSignal;
    } catch (error) {
      if (this.config.debugMode) {
        console.error(`Error in ${this.type} detector:`, error);
      }
      return null;
    }
  }

  /**
   * Batch detection with parallel processing
   */
  public async detectBatch(inputs: TextInput[]): Promise<AdvancedSignal[]> {
    const detectionPromises = inputs.map(input => this.detect(input));
    const results = await Promise.all(detectionPromises);
    return results.filter((signal): signal is AdvancedSignal => signal !== null);
  }

  /**
   * Update detector configuration
   */
  public updateConfig(config: Partial<DetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Preprocess input text for analysis
   */
  protected preprocessInput(input: TextInput): TextInput {
    return {
      ...input,
      text: this.normalizeText(input.text),
      timestamp: input.timestamp || new Date()
    };
  }

  /**
   * Normalize text for consistent analysis
   */
  protected normalizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width characters
  }

  /**
   * Apply sensitivity adjustment to signal strength
   */
  protected applySensitivity(signal: AdvancedSignal): AdvancedSignal {
    const sensitivityMultiplier = 0.5 + this.config.sensitivity;
    const adjustedStrength = Math.max(-1, Math.min(1, signal.strength * sensitivityMultiplier));
    
    return {
      ...signal,
      strength: adjustedStrength
    };
  }

  /**
   * Generate unique signal ID
   */
  protected generateSignalId(): string {
    return `${this.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create base signal metadata
   */
  protected createMetadata(confidence: number, source: string): SignalMetadata {
    return {
      timestamp: new Date(),
      confidence,
      source,
      processingTime: 0 // Will be updated in detect()
    };
  }

  /**
   * Calculate text metrics for analysis
   */
  protected getTextMetrics(text: string): {
    wordCount: number;
    sentenceCount: number;
    avgWordLength: number;
    capsRatio: number;
    punctuationRatio: number;
  } {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const totalChars = text.length;
    const capsCount = (text.match(/[A-Z]/g) || []).length;
    const punctCount = (text.match(/[.!?,;:'"()\-]/g) || []).length;

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgWordLength: words.length > 0 ? 
        words.reduce((sum, word) => sum + word.length, 0) / words.length : 0,
      capsRatio: totalChars > 0 ? capsCount / totalChars : 0,
      punctuationRatio: totalChars > 0 ? punctCount / totalChars : 0
    };
  }

  /**
   * Extract keywords from text based on patterns
   */
  protected extractKeywords(text: string, patterns: RegExp[]): string[] {
    const keywords: string[] = [];
    const lowerText = text.toLowerCase();

    for (const pattern of patterns) {
      const matches = lowerText.match(pattern);
      if (matches) {
        keywords.push(...matches);
      }
    }

    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Count occurrences of patterns in text
   */
  protected countPatternOccurrences(text: string, patterns: RegExp[]): number {
    const lowerText = text.toLowerCase();
    return patterns.reduce((count, pattern) => {
      const matches = lowerText.match(new RegExp(pattern, 'g'));
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  /**
   * Calculate signal strength based on indicators
   */
  protected calculateStrength(
    positiveIndicators: number,
    negativeIndicators: number,
    totalIndicators: number
  ): number {
    if (totalIndicators === 0) return 0;
    
    const ratio = (positiveIndicators - negativeIndicators) / totalIndicators;
    return Math.max(-1, Math.min(1, ratio));
  }

  /**
   * Debug logging utility
   */
  protected debug(message: string, data?: any): void {
    if (this.config.debugMode) {
      console.log(`[${this.type}] ${message}`, data || '');
    }
  }
}