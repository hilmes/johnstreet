// Advanced Sentiment Signals - Main Exports

export * from './types';
export { BaseSignalDetector } from './BaseSignalDetector';
export { SignalOrchestrator } from './SignalOrchestrator';

// Export detectors
export { UrgencyDetector } from './detectors/UrgencyDetector';
export { SentimentAsymmetryDetector } from './detectors/SentimentAsymmetryDetector';
export { VelocityDivergenceDetector } from './detectors/VelocityDivergenceDetector';
export { TimeZoneArbitrageDetector } from './detectors/TimeZoneArbitrageDetector';
export { SentimentExhaustionDetector } from './detectors/SentimentExhaustionDetector';
export { InfluencerNetworkDetector } from './detectors/InfluencerNetworkDetector';
export { SmartMoneyDetector } from './detectors/SmartMoneyDetector';
export { CrossLanguageArbitrageDetector } from './detectors/CrossLanguageArbitrageDetector';
export { ReplyGuyDetector } from './detectors/ReplyGuyDetector';
export { EmojiEvolutionDetector } from './detectors/EmojiEvolutionDetector';

// Export integration modules
export { 
  AdvancedSignalsIntegration,
  advancedSignals,
  type IntegrationConfig,
  type AggregatedSignal,
  type StreamingUpdate,
  type Alert
} from './AdvancedSignalsIntegration';

export {
  DashboardIntegration,
  dashboardIntegration,
  useAdvancedSignals,
  type DashboardSignal,
  type SignalChartData,
  type SignalTypeDistribution,
  type SymbolSummary
} from './DashboardIntegration';

// Re-export key types for convenience
export type {
  AdvancedSignal,
  SignalType,
  SignalAnalysisResult,
  ISignalDetector,
  ISignalOrchestrator,
  TextInput,
  BatchTextInput,
  DetectorConfig,
  SignalDetectorConfig
} from './types';