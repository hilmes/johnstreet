# Unconventional Sentiment Signals for Detecting Nascent Crypto Pumps

This document outlines 15 unique and unexpected signals derived from sentiment analysis to identify cryptocurrency pumps before they become mainstream.

## 1. Sentiment Velocity Divergence
**Status**: ✅ Implemented

### Description
Tracks when sentiment acceleration outpaces price movement, indicating potential accumulation or distribution phases.

### Key Indicators
- Sentiment velocity (rate of change)
- Sentiment acceleration (rate of velocity change)
- Price-sentiment divergence score
- Quiet accumulation patterns

### Signal Triggers
- Sentiment velocity > price velocity by significant margin
- Positive sentiment acceleration with flat price action
- Historical divergence patterns matching previous pumps

## 2. Cross-Language Arbitrage Signals
**Status**: ✅ Implemented

### Description
Exploits information asymmetry between language communities, tracking sentiment as it spreads from regional to global markets.

### Key Indicators
- Language-specific sentiment scores
- Translation lag measurements
- Regional premium detection (e.g., "kimchi premium")
- Cross-lingual sentiment correlation

### Signal Triggers
- High sentiment in non-English communities before English
- Regional exchange premium mentions
- Translation lag > 5 minutes with sentiment spread > 30%

## 3. Influencer Network Graph Analysis
**Status**: ✅ Implemented

### Description
Maps influence propagation through social networks to identify coordinated pump campaigns.

### Key Indicators
- Network centrality scores
- Influencer tier alignment
- Propagation velocity
- "Patient zero" identification

### Signal Triggers
- Mid-tier influencer convergence
- Rapid propagation paths (>10 nodes/hour)
- Coordinated posting patterns detected

## 4. Sentiment Exhaustion Patterns
**Status**: 🔄 Pending

### Description
Identifies when negative sentiment stops affecting price, indicating seller exhaustion.

### Key Indicators
- FUD resistance score
- Sentiment fatigue index
- Bear capitulation signals
- Volume-sentiment divergence

### Signal Triggers
- Sustained negative sentiment with stable/rising price
- Decreasing FUD effectiveness over time
- Volume declining during negative sentiment

## 5. Memetic Evolution Tracking
**Status**: 🔄 Pending

### Description
Monitors how memes evolve and spread through crypto communities.

### Key Indicators
- Meme mutation rate
- Virality coefficient
- Community layer penetration
- Inside joke mainstreaming

### Signal Triggers
- Rapid meme evolution (>5 variants/day)
- Cross-community meme adoption
- Exponential sharing growth

## 6. Discord/Telegram Voice Channel Analytics
**Status**: 🔄 Pending

### Description
Analyzes voice channel activity as a real-time sentiment indicator.

### Key Indicators
- Voice channel participant count
- Average session duration
- Emotional tone analysis
- Activity surge patterns

### Signal Triggers
- 3x increase in voice activity
- Sustained high energy discussions
- Cross-server voice migration

## 7. Smart Money Sentiment Footprints
**Status**: 🔄 Pending

### Description
Correlates on-chain whale movements with social sentiment shifts.

### Key Indicators
- Whale wallet social engagement
- GitHub activity correlation
- Smart contract deployment sentiment
- Developer community buzz

### Signal Triggers
- Known smart money addresses engaging with project
- Developer activity spike + positive sentiment
- Whale accumulation + social silence

## 8. Contrarian Cluster Detection
**Status**: 🔄 Pending

### Description
Identifies when coordinated FUD campaigns backfire and create buying opportunities.

### Key Indicators
- FUD coordination score
- Streisand effect measurement
- Censorship attempt detection
- Community rallying index

### Signal Triggers
- Coordinated negative campaign detected
- Community pushback > FUD volume
- Censorship attempts increasing interest

## 9. Sentiment Asymmetry Signals
**Status**: 🔄 Pending

### Description
Detects mismatches between sentiment and market mechanics.

### Key Indicators
- Order book sentiment divergence
- Buy wall vs. sentiment ratio
- Hidden accumulation/distribution
- Sentiment-volume correlation

### Signal Triggers
- Large buy walls + negative sentiment
- Positive sentiment + sell pressure
- Volume spikes against sentiment

## 10. Community Migration Patterns
**Status**: 🔄 Pending

### Description
Tracks user movement between project communities.

### Key Indicators
- Cross-community user overlap
- Migration velocity
- Builder movement patterns
- "Refugee pump" indicators

### Signal Triggers
- Mass migration from failed project
- Builder exodus to new ecosystem
- Community merger discussions

## 11. Linguistic Complexity Analysis
**Status**: 🔄 Pending

### Description
Analyzes language complexity shifts as indicator of market participant changes.

### Key Indicators
- Technical term frequency
- Average sentence complexity
- Jargon adoption rate
- Expertise level indicators

### Signal Triggers
- Shift from technical to simple language
- Rapid acronym mainstreaming
- Decreasing discussion sophistication

## 12. Time Zone Sentiment Arbitrage
**Status**: 🔄 Pending

### Description
Exploits sentiment patterns across global time zones.

### Key Indicators
- Regional sentiment momentum
- Time zone handoff patterns
- Weekend buildup index
- Market open predictions

### Signal Triggers
- Asia pump → Europe confirmation pattern
- Weekend sentiment buildup > 20%
- US night owl activity spike

## 13. Reply Guy Analytics
**Status**: 🔄 Pending

### Description
Analyzes response quality and patterns to gauge organic interest.

### Key Indicators
- Bot-to-human ratio
- Response quality score
- Engagement authenticity
- Reply velocity

### Signal Triggers
- Improving reply quality over time
- Decreasing bot percentage
- Organic engagement spike

## 14. Sentiment Contagion Modeling
**Status**: 🔄 Pending

### Description
Models how sentiment spreads between correlated assets.

### Key Indicators
- Cross-asset correlation
- Contagion velocity
- Sector rotation patterns
- Sentiment bleeding index

### Signal Triggers
- Lead asset sentiment spike
- Sector-wide sentiment shift
- Cross-chain correlation increase

## 15. Emoji Evolution Tracking
**Status**: 🔄 Pending

### Description
Tracks emoji usage patterns and evolution as sentiment indicators.

### Key Indicators
- New emoji adoption rate
- Emoji sentiment velocity
- Regional emoji preferences
- Emoji complexity progression

### Signal Triggers
- New emoji achieving critical mass
- Emoji usage pattern shifts
- Cultural emoji convergence

## Advanced Composite Signals

### "The Quiet Storm"
**Components**: Low volume + GitHub activity + developer Discord + neutral sentiment
**Indicates**: Smart money accumulation phase

### "The Refugee Pump"
**Components**: Failed project migration + influencer endorsement + meme evolution
**Indicates**: High probability explosive pump

### "The Time Zone Cascade"
**Components**: Asia spike + Europe confirmation + US FOMO
**Indicates**: 24-hour sustained pump cycle

### "The Linguistic Shift"
**Components**: Technical→simple language + emoji adoption + reply guy increase
**Indicates**: Retail wave incoming

## Implementation Progress

- ✅ Base Infrastructure (types, orchestrator, base detector)
- ✅ Sentiment Velocity Divergence Detector
- ✅ Cross-Language Arbitrage Detector
- ✅ Influencer Network Graph Analyzer
- 🔄 12 additional detectors pending implementation

## Usage

All detectors follow a common interface and can be used individually or through the SignalOrchestrator:

```typescript
import { SignalOrchestrator } from '@/lib/sentiment/advanced/SignalOrchestrator'
import { VelocityDivergenceDetector } from '@/lib/sentiment/advanced/detectors/VelocityDivergenceDetector'

// Individual detector
const velocityDetector = new VelocityDivergenceDetector()
const signal = await velocityDetector.detect(text, metadata)

// Orchestrated detection
const orchestrator = new SignalOrchestrator()
orchestrator.registerDetector('velocity', new VelocityDivergenceDetector())
const signals = await orchestrator.analyzeText(text, metadata)
```

## Future Enhancements

1. Machine learning models for signal combination
2. Real-time visualization dashboard
3. Backtesting framework for signal validation
4. API endpoints for signal streaming
5. Integration with trading execution pipeline