/**
 * Example usage of the EmojiEvolutionDetector
 * Demonstrates how to track emoji patterns and evolution as sentiment indicators
 */

import { EmojiEvolutionDetector } from '../detectors/EmojiEvolutionDetector';
import { SignalOrchestrator } from '../SignalOrchestrator';
import { TextInput, SignalType } from '../types';

async function demonstrateEmojiEvolutionDetection() {
  console.log('🎯 Emoji Evolution Detection Demo\n');

  // Create detector with custom configuration
  const detector = new EmojiEvolutionDetector({
    enabled: true,
    sensitivity: 0.7,
    minConfidence: 0.3,
    debugMode: true
  });

  // Sample data representing different emoji evolution scenarios
  const sampleInputs: TextInput[] = [
    {
      text: 'Bitcoin breaking ATH! 🚀📈💎 Diamond hands forever! 🙌💪',
      source: 'twitter',
      timestamp: new Date('2024-01-15T10:30:00Z'),
      author: 'crypto_bull_2024',
      followers: 15000
    },
    {
      text: 'New meme coin alert! 🐸🚀 Pepe to the moon! 🌙✨',
      source: 'reddit',
      timestamp: new Date('2024-01-15T11:00:00Z'),
      author: 'meme_hunter',
      metadata: { region: 'western', subreddit: 'CryptoMoonShots' }
    },
    {
      text: 'Market crash incoming... 📉💀😭 Everything is red! 🩸',
      source: 'discord',
      timestamp: new Date('2024-01-15T11:30:00Z'),
      author: 'bear_market_prophet',
      metadata: { channel: 'trading-signals' }
    },
    {
      text: 'Evolution in crypto emojis: 💰→📈→🚀→🌙→💎→🤝→🌍',
      source: 'telegram',
      timestamp: new Date('2024-01-15T12:00:00Z'),
      author: 'crypto_analyst_pro',
      metadata: { region: 'east_asian' }
    },
    {
      text: 'Gen Z changing the game with new emoji combos! ✨🦄🌈💫🪐',
      source: 'tiktok',
      timestamp: new Date('2024-01-15T12:30:00Z'),
      author: 'gen_z_trader',
      metadata: { region: 'western', age_group: 'gen_z' }
    },
    {
      text: 'Regional preferences: 😊🌸✨ vs 😂🔥💯 vs 🙏❤️🌹',
      source: 'twitter',
      timestamp: new Date('2024-01-15T13:00:00Z'),
      author: 'cultural_observer',
      metadata: { study: 'cross_cultural_emoji_analysis' }
    }
  ];

  console.log('📊 Analyzing individual samples:\n');

  // Analyze each input individually
  for (const [index, input] of sampleInputs.entries()) {
    console.log(`--- Sample ${index + 1} ---`);
    console.log(`Text: "${input.text}"`);
    console.log(`Source: ${input.source}`);
    
    const signal = await detector.detect(input);
    
    if (signal) {
      console.log(`✅ Signal detected!`);
      console.log(`   Signal ID: ${signal.id}`);
      console.log(`   Strength: ${signal.strength.toFixed(3)}`);
      console.log(`   Confidence: ${signal.metadata.confidence.toFixed(3)}`);
      console.log(`   Processing Time: ${signal.metadata.processingTime}ms`);
      
      // Display key indicators
      const indicators = signal.indicators;
      
      console.log(`   📈 Adoption Metrics:`);
      console.log(`      New Emojis: ${indicators.adoptionMetrics.newEmojiCount}`);
      console.log(`      Adoption Rate: ${indicators.adoptionMetrics.adoptionRate.toFixed(2)}/hour`);
      console.log(`      Adoption Velocity: ${indicators.adoptionMetrics.adoptionVelocity.toFixed(3)}`);
      
      console.log(`   🔄 Evolution Patterns:`);
      console.log(`      Complexity Progressions: ${indicators.evolutionPatterns.complexityProgression.length}`);
      console.log(`      Emergent Combinations: ${indicators.evolutionPatterns.emergentCombinations.length}`);
      console.log(`      Semantic Drifts: ${indicators.evolutionPatterns.semanticDrift.length}`);
      
      console.log(`   🌍 Regional Patterns:`);
      const culturalCount = Object.keys(indicators.regionalPatterns.culturalClusters).length;
      console.log(`      Cultural Clusters: ${culturalCount}`);
      
      console.log(`   ⚡ Sentiment Velocity:`);
      const velocity = indicators.sentimentVelocity.velocityMetrics;
      console.log(`      Instantaneous: ${velocity.instantaneousVelocity.toFixed(3)}`);
      console.log(`      Acceleration: ${velocity.accelerationTrend.toFixed(3)}`);
      console.log(`      Momentum: ${velocity.momentumIndicator.toFixed(3)}`);
      
      console.log(`   📈 Virality Metrics:`);
      console.log(`      Spread Patterns: ${indicators.viralityMetrics.spreadPatterns.length}`);
      console.log(`      Network Density: ${indicators.viralityMetrics.networkEffects.networkDensity.toFixed(3)}`);
      
      console.log(`   🔮 Trend Predictions:`);
      console.log(`      Emerging Trends: ${indicators.trendPrediction.emergingTrends.length}`);
      console.log(`      Decline Indicators: ${indicators.trendPrediction.declineIndicators.length}`);
      
    } else {
      console.log(`❌ No signal detected`);
    }
    
    console.log('');
  }

  console.log('🔄 Batch Processing Demo:\n');
  
  // Demonstrate batch processing
  const batchResults = await detector.detectBatch(sampleInputs);
  console.log(`Processed ${sampleInputs.length} inputs, detected ${batchResults.length} signals`);
  
  if (batchResults.length > 0) {
    const avgStrength = batchResults.reduce((sum, signal) => sum + signal.strength, 0) / batchResults.length;
    const avgConfidence = batchResults.reduce((sum, signal) => sum + signal.metadata.confidence, 0) / batchResults.length;
    
    console.log(`Average Signal Strength: ${avgStrength.toFixed(3)}`);
    console.log(`Average Confidence: ${avgConfidence.toFixed(3)}`);
  }

  console.log('\n🎼 Orchestra Integration Demo:\n');
  
  // Demonstrate integration with SignalOrchestrator
  const orchestrator = new SignalOrchestrator();
  orchestrator.registerDetector(detector);
  
  const orchestratorResult = await orchestrator.analyze(sampleInputs[1]); // Use the meme coin example
  
  console.log('Orchestrator Analysis Result:');
  console.log(`Total Signals: ${orchestratorResult.signals.length}`);
  console.log(`Aggregate Score: ${orchestratorResult.aggregateScore.toFixed(3)}`);
  console.log(`Dominant Signal: ${orchestratorResult.dominantSignal || 'None'}`);
  console.log(`Processing Time: ${orchestratorResult.processingTime}ms`);
  
  // Display signal distribution
  console.log('\nSignal Distribution:');
  Object.entries(orchestratorResult.signalDistribution).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`  ${type}: ${count}`);
    }
  });
}

async function demonstrateComplexityProgression() {
  console.log('\n🔬 Complexity Progression Analysis\n');
  
  const detector = new EmojiEvolutionDetector();
  
  // Simulate evolution progression over time
  const progressionSamples = [
    {
      text: 'Simple start: Money 💰',
      stage: 'Simple',
      timestamp: new Date('2024-01-01T00:00:00Z')
    },
    {
      text: 'Getting compound: Money plus chart! 💰📈',
      stage: 'Compound',
      timestamp: new Date('2024-01-02T00:00:00Z')
    },
    {
      text: 'Complex evolution: 💰→📈→🚀 The financial journey!',
      stage: 'Complex',
      timestamp: new Date('2024-01-03T00:00:00Z')
    },
    {
      text: 'Meta level: The 💰→📈→🚀→🌙→💎→🤝→🌍 represents the complete crypto enlightenment path',
      stage: 'Meta',
      timestamp: new Date('2024-01-04T00:00:00Z')
    }
  ];
  
  for (const sample of progressionSamples) {
    console.log(`--- ${sample.stage} Stage ---`);
    console.log(`Text: "${sample.text}"`);
    
    const signal = await detector.detect({
      text: sample.text,
      source: 'progression_study',
      timestamp: sample.timestamp
    });
    
    if (signal) {
      const complexity = signal.indicators.evolutionPatterns.complexityProgression;
      console.log(`Complexity Patterns Found: ${complexity.length}`);
      
      complexity.forEach((pattern, i) => {
        console.log(`  Pattern ${i + 1}:`);
        console.log(`    Sequence: ${pattern.sequence}`);
        console.log(`    Stage: ${pattern.progressionStage}`);
        console.log(`    Evolution Path: ${pattern.evolutionPath.join(' → ')}`);
        console.log(`    Sentiment Shift: ${pattern.sentimentShift.toFixed(3)}`);
        console.log(`    Cultural Significance: ${pattern.culturalSignificance.toFixed(3)}`);
      });
    }
    
    console.log('');
  }
}

async function demonstrateRegionalAnalysis() {
  console.log('\n🌍 Regional Emoji Pattern Analysis\n');
  
  const detector = new EmojiEvolutionDetector();
  
  const regionalSamples = [
    {
      text: 'Western crypto enthusiasm: 😂🔥💯🚀 HODL forever!',
      region: 'western',
      culture: 'Direct and intense expressions'
    },
    {
      text: 'Eastern subtle approach: 😊✨🌸💖 Gentle moon journey',
      region: 'east_asian',
      culture: 'Subtle and aesthetic preferences'
    },
    {
      text: 'Latin passion: 💃⚽🌮💕 Crypto fiesta!',
      region: 'latin_american',
      culture: 'Vibrant and celebratory'
    },
    {
      text: 'Middle Eastern blessing: 🙏🌙💚🤲 Blessed gains',
      region: 'middle_eastern',
      culture: 'Spiritual and grateful expressions'
    }
  ];
  
  for (const sample of regionalSamples) {
    console.log(`--- ${sample.region.toUpperCase()} Region ---`);
    console.log(`Text: "${sample.text}"`);
    console.log(`Cultural Context: ${sample.culture}`);
    
    const signal = await detector.detect({
      text: sample.text,
      source: 'regional_study',
      timestamp: new Date(),
      metadata: { region: sample.region }
    });
    
    if (signal) {
      const regional = signal.indicators.regionalPatterns;
      console.log(`Cultural Clusters: ${Object.keys(regional.culturalClusters).length}`);
      
      Object.entries(regional.geographicDistribution).forEach(([region, intensity]) => {
        if (intensity > 0) {
          console.log(`  ${region}: ${(intensity * 100).toFixed(1)}% intensity`);
        }
      });
      
      if (regional.culturalBarriers.length > 0) {
        console.log(`Cultural Barriers Detected: ${regional.culturalBarriers.length}`);
      }
    }
    
    console.log('');
  }
}

// Main execution
async function main() {
  try {
    await demonstrateEmojiEvolutionDetection();
    await demonstrateComplexityProgression();
    await demonstrateRegionalAnalysis();
    
    console.log('🎉 Emoji Evolution Detection Demo completed successfully!');
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Export for use in other modules
export {
  demonstrateEmojiEvolutionDetection,
  demonstrateComplexityProgression,
  demonstrateRegionalAnalysis
};

// Run demo if this file is executed directly
if (require.main === module) {
  main();
}