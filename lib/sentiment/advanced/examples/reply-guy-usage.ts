import { ReplyGuyDetector } from '../detectors/ReplyGuyDetector';
import { TextInput } from '../types';

/**
 * Example usage of the ReplyGuyDetector
 * Demonstrates how to analyze response patterns for bot detection and engagement authenticity
 */

async function demonstrateReplyGuyDetection() {
  // Create detector instance
  const detector = new ReplyGuyDetector({
    sensitivity: 0.7,
    minConfidence: 0.4,
    debugMode: true
  });

  // Example 1: Organic conversation
  const organicConversation: TextInput = {
    text: "Discussion about $BTC price movement",
    source: "twitter",
    author: "crypto_analyst",
    timestamp: new Date(),
    metadata: {
      conversationId: "organic_btc_discussion",
      responses: [
        {
          text: "What do you think about the recent Bitcoin consolidation around $43k?",
          author: "crypto_analyst",
          timestamp: new Date(Date.now() - 300000),
          followers: 5000
        },
        {
          text: "I think we're seeing healthy consolidation after the recent rally. The support at $42k seems strong based on volume analysis.",
          author: "btc_trader_pro",
          timestamp: new Date(Date.now() - 240000),
          followers: 12000
        },
        {
          text: "Agreed, the RSI is cooling down from overbought levels. Good opportunity for accumulation if you believe in the long-term trajectory.",
          author: "chart_master",
          timestamp: new Date(Date.now() - 180000),
          followers: 8500
        },
        {
          text: "The institutional flow data I'm seeing suggests continued accumulation by smart money. Coinbase premium is still positive.",
          author: "onchain_analyst",
          timestamp: new Date(Date.now() - 120000),
          followers: 15000
        }
      ]
    }
  };

  console.log("=== Analyzing Organic Conversation ===");
  const organicResult = await detector.detect(organicConversation);
  if (organicResult) {
    console.log(`Signal Strength: ${organicResult.strength.toFixed(3)} (${organicResult.strength > 0 ? 'Organic' : 'Artificial'})`);
    console.log(`Confidence: ${organicResult.metadata.confidence.toFixed(3)}`);
    console.log(`Bot-to-Human Ratio: ${organicResult.indicators.responseMetrics.botToHumanRatio.toFixed(3)}`);
    console.log(`Organic Score: ${organicResult.indicators.engagementAuthenticity.organicScore.toFixed(3)}`);
    console.log(`Growth Pattern: ${organicResult.indicators.trendAnalysis.growthPattern}`);
    console.log(`Quality - Uniqueness: ${organicResult.indicators.qualityMetrics.uniquenessScore.toFixed(3)}`);
    console.log(`Quality - Relevance: ${organicResult.indicators.qualityMetrics.relevanceScore.toFixed(3)}`);
  }

  // Example 2: Suspicious bot activity
  const suspiciousActivity: TextInput = {
    text: "Pump discussion with bot responses",
    source: "telegram",
    author: "pump_coordinator",
    timestamp: new Date(),
    metadata: {
      conversationId: "suspicious_pump_chat",
      responses: [
        {
          text: "🚀 $NEWCOIN is going to moon! Don't miss this 100x gem! 🚀",
          author: "crypto_pumper",
          timestamp: new Date(Date.now() - 300000),
          followers: 1000
        },
        {
          text: "Great project! To the moon! 🌙",
          author: "moon_bot_1234",
          timestamp: new Date(Date.now() - 295000),
          followers: 50
        },
        {
          text: "Bullish! This is the next big thing!",
          author: "crypto_shill_9876",
          timestamp: new Date(Date.now() - 290000),
          followers: 25
        },
        {
          text: "To the moon! 🚀🚀🚀",
          author: "pump_bot_5555",
          timestamp: new Date(Date.now() - 285000),
          followers: 75
        },
        {
          text: "Great project! Still early! 💎",
          author: "moon_hunter_2023",
          timestamp: new Date(Date.now() - 280000),
          followers: 100
        },
        {
          text: "This will 100x easy! Don't miss out!",
          author: "gem_finder_bot",
          timestamp: new Date(Date.now() - 275000),
          followers: 200
        },
        {
          text: "Bullish! Great project!",
          author: "crypto_moon_4321",
          timestamp: new Date(Date.now() - 270000),
          followers: 150
        }
      ]
    }
  };

  console.log("\n=== Analyzing Suspicious Bot Activity ===");
  const suspiciousResult = await detector.detect(suspiciousActivity);
  if (suspiciousResult) {
    console.log(`Signal Strength: ${suspiciousResult.strength.toFixed(3)} (${suspiciousResult.strength > 0 ? 'Organic' : 'Artificial'})`);
    console.log(`Confidence: ${suspiciousResult.metadata.confidence.toFixed(3)}`);
    console.log(`Bot-to-Human Ratio: ${suspiciousResult.indicators.responseMetrics.botToHumanRatio.toFixed(3)}`);
    console.log(`Organic Score: ${suspiciousResult.indicators.engagementAuthenticity.organicScore.toFixed(3)}`);
    console.log(`Growth Pattern: ${suspiciousResult.indicators.trendAnalysis.growthPattern}`);
    console.log(`Coordination Score: ${suspiciousResult.indicators.botIndicators.coordinationScore.toFixed(3)}`);
    console.log(`Temporal Clustering: ${suspiciousResult.indicators.botIndicators.temporalClustering.toFixed(3)}`);
    console.log(`Generic Responses: ${suspiciousResult.indicators.contentPatterns.genericResponses}`);
    console.log(`Suspicious Accounts: ${suspiciousResult.indicators.botIndicators.suspiciousAccounts.length}`);
    
    // Show manipulation indicators
    if (suspiciousResult.indicators.engagementAuthenticity.manipulationIndicators.length > 0) {
      console.log(`Manipulation Indicators: ${suspiciousResult.indicators.engagementAuthenticity.manipulationIndicators.join(', ')}`);
    }

    // Show detected spikes
    if (suspiciousResult.indicators.trendAnalysis.spikesDetected.length > 0) {
      console.log(`Activity Spikes Detected: ${suspiciousResult.indicators.trendAnalysis.spikesDetected.length}`);
      suspiciousResult.indicators.trendAnalysis.spikesDetected.forEach((spike, index) => {
        console.log(`  Spike ${index + 1}: Intensity ${spike.intensity.toFixed(2)}, Source: ${spike.likelySource}, Suspicion: ${spike.suspicionLevel.toFixed(3)}`);
      });
    }
  }

  // Example 3: Mixed organic and artificial engagement
  const mixedEngagement: TextInput = {
    text: "Mixed discussion with some bots",
    source: "reddit",
    author: "discussion_starter",
    timestamp: new Date(),
    metadata: {
      conversationId: "mixed_engagement_thread",
      responses: [
        {
          text: "Interesting analysis on the recent market trends. What are your thoughts on the correlation with traditional markets?",
          author: "market_researcher",
          timestamp: new Date(Date.now() - 600000),
          followers: 3000
        },
        {
          text: "I've been tracking the correlation coefficient and it's been decreasing over the past month, suggesting crypto is decoupling from traditional assets.",
          author: "quantitative_analyst",
          timestamp: new Date(Date.now() - 580000),
          followers: 8000
        },
        {
          text: "Great project! To the moon!",
          author: "generic_bot_123",
          timestamp: new Date(Date.now() - 570000),
          followers: 100
        },
        {
          text: "The macroeconomic factors are definitely playing a role. Fed policy decisions seem to have less impact on crypto prices lately.",
          author: "macro_observer",
          timestamp: new Date(Date.now() - 550000),
          followers: 5500
        },
        {
          text: "Bullish! Still early!",
          author: "moon_seeker_456",
          timestamp: new Date(Date.now() - 540000),
          followers: 50
        },
        {
          text: "From a technical perspective, we're seeing stronger independent price action. The 200-day moving average is acting as solid support.",
          author: "technical_trader",
          timestamp: new Date(Date.now() - 520000),
          followers: 12000
        }
      ]
    }
  };

  console.log("\n=== Analyzing Mixed Engagement ===");
  const mixedResult = await detector.detect(mixedEngagement);
  if (mixedResult) {
    console.log(`Signal Strength: ${mixedResult.strength.toFixed(3)} (${mixedResult.strength > 0 ? 'Leaning Organic' : 'Leaning Artificial'})`);
    console.log(`Confidence: ${mixedResult.metadata.confidence.toFixed(3)}`);
    console.log(`Bot-to-Human Ratio: ${mixedResult.indicators.responseMetrics.botToHumanRatio.toFixed(3)}`);
    console.log(`Organic Score: ${mixedResult.indicators.engagementAuthenticity.organicScore.toFixed(3)}`);
    console.log(`Growth Pattern: ${mixedResult.indicators.trendAnalysis.growthPattern}`);
    console.log(`Natural Conversation Flow: ${mixedResult.indicators.engagementAuthenticity.naturalConversationFlow.toFixed(3)}`);
    console.log(`Diversity Index: ${mixedResult.indicators.engagementAuthenticity.diversityIndex.toFixed(3)}`);
  }
}

// Utility function to analyze reply guy patterns in real-time data
export async function analyzeReplyGuyPatterns(
  conversationData: TextInput[],
  options: {
    sensitivity?: number;
    minConfidence?: number;
    batchAnalysis?: boolean;
  } = {}
) {
  const detector = new ReplyGuyDetector({
    sensitivity: options.sensitivity || 0.6,
    minConfidence: options.minConfidence || 0.3,
    debugMode: false
  });

  if (options.batchAnalysis && conversationData.length > 1) {
    // Batch analysis for multiple conversations
    const results = await detector.detectBatch(conversationData);
    return results.map(result => ({
      conversationId: result.metadata.source,
      strength: result.strength,
      confidence: result.metadata.confidence,
      organicScore: result.indicators.engagementAuthenticity.organicScore,
      botRatio: result.indicators.responseMetrics.botToHumanRatio,
      growthPattern: result.indicators.trendAnalysis.growthPattern,
      manipulationIndicators: result.indicators.engagementAuthenticity.manipulationIndicators
    }));
  } else {
    // Single conversation analysis
    const results = [];
    for (const conversation of conversationData) {
      const result = await detector.detect(conversation);
      if (result) {
        results.push({
          conversationId: result.metadata.source,
          strength: result.strength,
          confidence: result.metadata.confidence,
          organicScore: result.indicators.engagementAuthenticity.organicScore,
          botRatio: result.indicators.responseMetrics.botToHumanRatio,
          growthPattern: result.indicators.trendAnalysis.growthPattern,
          manipulationIndicators: result.indicators.engagementAuthenticity.manipulationIndicators
        });
      }
    }
    return results;
  }
}

// Real-time monitoring function
export function createReplyGuyMonitor(options: {
  alertThreshold?: number;
  onSuspiciousActivity?: (signal: any) => void;
  onOrganicGrowth?: (signal: any) => void;
} = {}) {
  const detector = new ReplyGuyDetector({
    sensitivity: 0.7,
    minConfidence: 0.5
  });

  return {
    async analyzeConversation(conversation: TextInput) {
      const result = await detector.detect(conversation);
      
      if (!result) return null;

      // Alert on suspicious activity
      if (result.strength < -0.5 && options.onSuspiciousActivity) {
        options.onSuspiciousActivity({
          conversationId: result.metadata.source,
          botRatio: result.indicators.responseMetrics.botToHumanRatio,
          manipulationIndicators: result.indicators.engagementAuthenticity.manipulationIndicators,
          suspiciousAccounts: result.indicators.botIndicators.suspiciousAccounts,
          timestamp: result.metadata.timestamp
        });
      }

      // Alert on organic growth potential
      if (result.strength > 0.3 && result.indicators.trendAnalysis.viralPotential > 0.6 && options.onOrganicGrowth) {
        options.onOrganicGrowth({
          conversationId: result.metadata.source,
          organicScore: result.indicators.engagementAuthenticity.organicScore,
          viralPotential: result.indicators.trendAnalysis.viralPotential,
          qualityMetrics: result.indicators.qualityMetrics,
          timestamp: result.metadata.timestamp
        });
      }

      return result;
    }
  };
}

// Run the demonstration
if (require.main === module) {
  demonstrateReplyGuyDetection().catch(console.error);
}