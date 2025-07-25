import { 
  advancedSignals, 
  AdvancedSignalsIntegration,
  IntegrationConfig,
  AggregatedSignal,
  StreamingUpdate,
  Alert
} from '../AdvancedSignalsIntegration';
import { SocialMediaPost } from '../../SentimentAnalyzer';

/**
 * Example 1: Basic text analysis
 */
async function basicAnalysis() {
  console.log('=== Basic Text Analysis ===');
  
  const text = "BTC is showing massive momentum! Smart money is accumulating heavily. This could be the start of something big! 🚀";
  
  const result = await advancedSignals.analyzeText(text);
  
  if (result) {
    console.log('Symbol:', result.symbol);
    console.log('Sentiment:', result.sentiment);
    console.log('Overall Strength:', result.overallStrength.toFixed(2));
    console.log('Overall Confidence:', result.overallConfidence.toFixed(2));
    console.log('Priority:', result.priority);
    console.log('Detected Signals:', result.signals.map(s => s.type).join(', '));
    console.log('Signal Combinations:', result.combinations);
  }
}

/**
 * Example 2: Social media post analysis
 */
async function socialMediaAnalysis() {
  console.log('\n=== Social Media Post Analysis ===');
  
  const post: SocialMediaPost = {
    id: '123456',
    text: "ETH breaking out! Whales are buying, retail FOMO incoming. Get ready for the pump! 💎🙌",
    author: 'cryptowhale',
    timestamp: Date.now(),
    platform: 'twitter',
    engagement: {
      likes: 1500,
      retweets: 300,
      comments: 150
    },
    metadata: {
      followerCount: 50000,
      verified: true
    }
  };

  const result = await advancedSignals.analyzeSocialPost(post);
  
  if (result) {
    console.log('Analysis Result:', JSON.stringify(result, null, 2));
  }
}

/**
 * Example 3: Batch analysis
 */
async function batchAnalysis() {
  console.log('\n=== Batch Analysis ===');
  
  const texts = [
    "SOL momentum is insane right now, breaking all resistance levels",
    "Market exhaustion signs everywhere, time to take profits on BTC",
    "Coordinated pump detected on DOGE, be careful folks",
    "Smart money quietly accumulating MATIC while retail panics"
  ];

  const results = await advancedSignals.analyzeBatch(texts);
  
  results.forEach((result, index) => {
    console.log(`\nText ${index + 1}:`);
    console.log(`  Symbol: ${result.symbol}`);
    console.log(`  Sentiment: ${result.sentiment}`);
    console.log(`  Priority: ${result.priority}`);
    console.log(`  Risk Score: ${result.metadata.riskScore.toFixed(2)}`);
  });
}

/**
 * Example 4: Real-time streaming
 */
async function streamingExample() {
  console.log('\n=== Real-time Streaming ===');
  
  // Set up event listeners
  advancedSignals.on('streamingUpdate', (update: StreamingUpdate) => {
    console.log('\n📊 Streaming Update:');
    console.log(`  Symbol: ${update.symbol}`);
    console.log(`  New Signals: ${update.newSignals.length}`);
    console.log(`  Current Sentiment: ${update.aggregatedSignal.sentiment}`);
    console.log(`  Strength: ${update.aggregatedSignal.overallStrength.toFixed(2)}`);
    
    if (update.alerts.length > 0) {
      console.log('  ⚠️ Alerts:');
      update.alerts.forEach(alert => {
        console.log(`    - [${alert.level}] ${alert.message}`);
      });
    }
  });

  advancedSignals.on('alerts', (alerts: Alert[]) => {
    console.log('\n🚨 ALERTS TRIGGERED:');
    alerts.forEach(alert => {
      console.log(`  [${alert.level.toUpperCase()}] ${alert.type}: ${alert.message}`);
    });
  });

  // Start streaming
  advancedSignals.startStreaming();

  // Simulate incoming data
  setTimeout(async () => {
    await advancedSignals.analyzeText("URGENT: BTC whale alert! Massive buy orders hitting the books!");
  }, 2000);

  setTimeout(async () => {
    await advancedSignals.analyzeText("Smart money is loading up on ETH, institutional FOMO kicking in");
  }, 4000);

  // Stop after 10 seconds
  setTimeout(() => {
    advancedSignals.stopStreaming();
    console.log('\n✅ Streaming stopped');
  }, 10000);
}

/**
 * Example 5: Custom configuration
 */
async function customConfiguration() {
  console.log('\n=== Custom Configuration ===');
  
  // Create a new instance with custom config
  const customIntegration = new AdvancedSignalsIntegration({
    minSignalStrength: 0.6,
    minConfidence: 0.7,
    aggregationMethod: 'consensus',
    alertThresholds: {
      criticalStrength: 0.9,
      criticalConfidence: 0.9,
      combinationThreshold: 0.8
    },
    enableStreaming: true,
    streamingInterval: 3000 // 3 seconds
  });

  const text = "Multiple indicators showing BTC reversal incoming. RSI oversold, volume divergence clear.";
  const result = await customIntegration.analyzeText(text);
  
  if (result) {
    console.log('Custom Analysis Result:', {
      symbol: result.symbol,
      sentiment: result.sentiment,
      priority: result.priority,
      consensusLevel: result.metadata.consensusLevel
    });
  }
}

/**
 * Example 6: Get metrics and statistics
 */
async function metricsExample() {
  console.log('\n=== Metrics and Statistics ===');
  
  // Analyze some data first
  const texts = [
    "BTC showing strength",
    "ETH accumulation phase",
    "SOL breakout confirmed"
  ];
  
  await advancedSignals.analyzeBatch(texts);
  
  // Get metrics
  const metrics = advancedSignals.getMetrics();
  
  console.log('Integration Metrics:');
  console.log(`  Total Symbols Tracked: ${metrics.totalSymbolsTracked}`);
  console.log(`  Total Active Signals: ${metrics.totalActiveSignals}`);
  console.log(`  Detector Count: ${metrics.detectorCount}`);
  console.log(`  Is Streaming: ${metrics.isStreaming}`);
  console.log('\n  Signal Distribution:');
  Object.entries(metrics.signalDistribution).forEach(([type, count]) => {
    console.log(`    ${type}: ${count}`);
  });
}

/**
 * Example 7: Working with specific symbols
 */
async function symbolSpecificAnalysis() {
  console.log('\n=== Symbol-Specific Analysis ===');
  
  // Analyze multiple texts about BTC
  const btcTexts = [
    "BTC breaking out of consolidation, volume confirming",
    "Bitcoin smart money accumulation detected at these levels",
    "Massive BTC buy walls appearing, whales are back"
  ];

  for (const text of btcTexts) {
    await advancedSignals.analyzeText(text);
  }

  // Get all signals for BTC
  const btcSignals = advancedSignals.getSignalsForSymbol('BTC');
  
  console.log(`\nFound ${btcSignals.length} signals for BTC:`);
  btcSignals.forEach(signal => {
    console.log(`  - ${signal.type}: strength=${signal.strength.toFixed(2)}, direction=${signal.direction}`);
  });

  // Get all active signals
  const allActive = advancedSignals.getAllActiveSignals();
  console.log(`\nActive signals for ${allActive.size} symbols`);
}

/**
 * Example 8: Update detector configuration
 */
async function updateDetectorConfig() {
  console.log('\n=== Update Detector Configuration ===');
  
  // Make urgency detector more sensitive
  advancedSignals.updateDetectorConfig('urgency', {
    minConfidence: 0.4,
    urgentWords: ['NOW', 'IMMEDIATE', 'URGENT', 'ASAP', 'BREAKING']
  });

  // Test with urgent text
  const urgentText = "URGENT: BTC flash crash incoming! Get out NOW!";
  const result = await advancedSignals.analyzeText(urgentText);
  
  if (result) {
    const urgencySignal = result.signals.find(s => s.type === 'urgency');
    console.log('Urgency Signal:', urgencySignal);
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    await basicAnalysis();
    await socialMediaAnalysis();
    await batchAnalysis();
    await customConfiguration();
    await metricsExample();
    await symbolSpecificAnalysis();
    await updateDetectorConfig();
    
    // Run streaming last as it has delays
    await streamingExample();
    
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}

// Export individual examples for testing
export {
  basicAnalysis,
  socialMediaAnalysis,
  batchAnalysis,
  streamingExample,
  customConfiguration,
  metricsExample,
  symbolSpecificAnalysis,
  updateDetectorConfig
};