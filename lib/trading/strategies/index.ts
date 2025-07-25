/**
 * Trading Strategies Index
 * Exports all available trading strategies and utilities
 */

export {
  MomentumStrategy,
  MeanReversionStrategy,
  ScalpingStrategy,
  SafeHavenStrategy,
  defaultStrategies,
  getStrategyForCondition,
  createCustomStrategy
} from './defaults'

// Re-export strategy types for convenience
export type { Strategy } from '@/types/strategy'