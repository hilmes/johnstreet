# Advanced Sentiment Signals

This directory contains the infrastructure for detecting and analyzing 15 different advanced sentiment signals from text data.

## Architecture

### Core Components

1. **types.ts** - Complete TypeScript type definitions for all 15 signal types
2. **BaseSignalDetector.ts** - Abstract base class that all signal detectors inherit from
3. **SignalOrchestrator.ts** - Coordinates multiple detectors and aggregates results

### Signal Types

The system supports 15 distinct sentiment signals:

1. **URGENCY** - Detects time-sensitive language and pressure
2. **FEAR** - Identifies fear-based sentiment and risk aversion
3. **EXCITEMENT** - Captures positive enthusiasm and energy
4. **UNCERTAINTY** - Detects hesitation and lack of clarity
5. **CONFIDENCE** - Identifies assertive and certain language
6. **FOMO** - Fear of missing out indicators
7. **PANIC** - Extreme fear and selling pressure
8. **GREED** - Excessive profit focus and unrealistic expectations
9. **HOPE** - Forward-looking optimism
10. **DESPAIR** - Extreme negativity and hopelessness
11. **EUPHORIA** - Excessive optimism and celebration
12. **CAPITULATION** - Surrender and acceptance of losses
13. **DISBELIEF** - Denial and skepticism
14. **COMPLACENCY** - Lack of concern and overconfidence
15. **MOMENTUM_SHIFT** - Significant changes in sentiment direction

## Usage

### Creating a Signal Detector

```typescript
import { BaseSignalDetector, SignalType, TextInput, FearSignal } from './advanced';

class FearDetector extends BaseSignalDetector {
  constructor() {
    super(SignalType.FEAR);
  }

  protected async performDetection(input: TextInput): Promise<FearSignal | null> {
    // Implement fear detection logic
    const fearWords = this.extractKeywords(input.text, [
      /afraid/gi, /scared/gi, /worried/gi, /concern/gi
    ]);

    if (fearWords.length === 0) {
      return null;
    }

    return {
      id: this.generateSignalId(),
      type: SignalType.FEAR,
      strength: this.calculateStrength(0, fearWords.length, 10),
      metadata: this.createMetadata(0.8, input.source),
      indicators: {
        fearWords,
        negativeIntensity: 0.7,
        uncertaintyLevel: 0.6,
        riskMentions: fearWords.length
      }
    };
  }
}
```

### Using the Orchestrator

```typescript
import { SignalOrchestrator } from './advanced';
import { FearDetector } from './detectors/FearDetector';
import { UrgencyDetector } from './detectors/UrgencyDetector';

// Create orchestrator
const orchestrator = new SignalOrchestrator();

// Register detectors
orchestrator.registerDetector(new FearDetector());
orchestrator.registerDetector(new UrgencyDetector());

// Analyze text
const result = await orchestrator.analyze({
  text: "I'm worried about the market crash!",
  source: "twitter"
});

console.log(result.dominantSignal); // SignalType.FEAR
console.log(result.aggregateScore); // -0.7 (bearish)
```

## Implementing New Detectors

Each detector should:

1. Extend `BaseSignalDetector`
2. Implement the `performDetection` method
3. Use provided utilities for text analysis
4. Return properly typed signal or null
5. Include relevant indicators for the signal type

## Configuration

Detectors can be configured with:

- `enabled`: Turn detector on/off
- `sensitivity`: Adjust detection sensitivity (0-1)
- `minConfidence`: Minimum confidence threshold (0-1)
- `debugMode`: Enable debug logging

```typescript
orchestrator.updateDetectorConfig(SignalType.FEAR, {
  sensitivity: 0.8,
  minConfidence: 0.5
});
```