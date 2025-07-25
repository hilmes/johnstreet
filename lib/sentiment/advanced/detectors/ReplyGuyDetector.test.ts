import { ReplyGuyDetector } from './ReplyGuyDetector';
import { SignalType, TextInput } from '../types';

describe('ReplyGuyDetector', () => {
  let detector: ReplyGuyDetector;

  beforeEach(() => {
    detector = new ReplyGuyDetector({
      sensitivity: 0.5,
      minConfidence: 0.3,
      debugMode: false
    });
  });

  describe('Basic Functionality', () => {
    test('should create detector with correct type', () => {
      expect(detector.type).toBe(SignalType.REPLY_GUY);
    });

    test('should return null for insufficient responses', async () => {
      const input: TextInput = {
        text: "Single response",
        source: "test",
        author: "user1",
        metadata: {
          conversationId: "test_convo",
          responses: [
            {
              text: "Single response",
              author: "user1",
              timestamp: new Date()
            }
          ]
        }
      };

      const result = await detector.detect(input);
      expect(result).toBeNull();
    });
  });

  describe('Organic Engagement Detection', () => {
    test('should detect organic conversation patterns', async () => {
      const organicInput: TextInput = {
        text: "Organic discussion",
        source: "test_organic",
        author: "analyst1",
        metadata: {
          conversationId: "organic_discussion",
          responses: [
            {
              text: "What's your analysis on the recent market movement?",
              author: "analyst1",
              timestamp: new Date(Date.now() - 300000),
              followers: 5000
            },
            {
              text: "I think we're seeing a healthy correction after the recent rally. The volume profile suggests strong support at these levels.",
              author: "trader_pro",
              timestamp: new Date(Date.now() - 240000),
              followers: 8000
            },
            {
              text: "Agreed, the technical indicators are showing oversold conditions. RSI is at 25 which historically marks good entry points.",
              author: "chart_analyst",
              timestamp: new Date(Date.now() - 180000),
              followers: 12000
            },
            {
              text: "The fundamentals haven't changed, so this dip seems like a good accumulation opportunity for long-term holders.",
              author: "fundamental_researcher",
              timestamp: new Date(Date.now() - 120000),
              followers: 6500
            }
          ]
        }
      };

      const result = await detector.detect(organicInput);
      
      expect(result).not.toBeNull();
      expect(result!.type).toBe(SignalType.REPLY_GUY);
      expect(result!.strength).toBeGreaterThan(0); // Positive for organic
      expect(result!.indicators.engagementAuthenticity.organicScore).toBeGreaterThan(0.6);
      expect(result!.indicators.responseMetrics.botToHumanRatio).toBeLessThan(0.3);
      expect(result!.indicators.trendAnalysis.growthPattern).toBe('organic');
    });
  });

  describe('Bot Activity Detection', () => {
    test('should detect suspicious bot activity', async () => {
      const botInput: TextInput = {
        text: "Bot pump discussion",
        source: "test_bots",
        author: "pump_coordinator",
        metadata: {
          conversationId: "bot_pump_chat",
          responses: [
            {
              text: "🚀 NEW GEM ALERT! 100x POTENTIAL! 🚀",
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
              text: "Bullish! Still early!",
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
              text: "Great project! This is huge!",
              author: "moon_hunter_2023",
              timestamp: new Date(Date.now() - 280000),
              followers: 100
            },
            {
              text: "Bullish! Don't miss out!",
              author: "gem_finder_bot",
              timestamp: new Date(Date.now() - 275000),
              followers: 200
            }
          ]
        }
      };

      const result = await detector.detect(botInput);
      
      expect(result).not.toBeNull();
      expect(result!.strength).toBeLessThan(0); // Negative for artificial
      expect(result!.indicators.responseMetrics.botToHumanRatio).toBeGreaterThan(0.5);
      expect(result!.indicators.engagementAuthenticity.organicScore).toBeLessThan(0.4);
      expect(result!.indicators.botIndicators.suspiciousAccounts.length).toBeGreaterThan(2);
      expect(result!.indicators.contentPatterns.genericResponses).toBeGreaterThan(3);
      expect(result!.indicators.engagementAuthenticity.manipulationIndicators).toContain('high_bot_ratio');
    });

    test('should identify coordinated messaging patterns', async () => {
      const coordinatedInput: TextInput = {
        text: "Coordinated pump",
        source: "test_coordinated",
        author: "coordinator",
        metadata: {
          responses: [
            {
              text: "Check out this amazing project! Revolutionary technology!",
              author: "shill_account_1",
              timestamp: new Date(Date.now() - 300000)
            },
            {
              text: "Check out this amazing project! Game-changing innovation!",
              author: "shill_account_2",
              timestamp: new Date(Date.now() - 299000)
            },
            {
              text: "Check out this amazing project! Incredible potential!",
              author: "shill_account_3",
              timestamp: new Date(Date.now() - 298000)
            },
            {
              text: "Check out this amazing project! Don't miss this opportunity!",
              author: "shill_account_4",
              timestamp: new Date(Date.now() - 297000)
            }
          ]
        }
      };

      const result = await detector.detect(coordinatedInput);
      
      expect(result).not.toBeNull();
      expect(result!.indicators.botIndicators.coordinationScore).toBeGreaterThan(0.7);
      expect(result!.indicators.botIndicators.temporalClustering).toBeGreaterThan(0.8);
      expect(result!.indicators.botIndicators.linguisticSimilarity).toBeGreaterThan(0.8);
      expect(result!.indicators.engagementAuthenticity.manipulationIndicators).toContain('coordinated_messages');
    });
  });

  describe('Quality Metrics', () => {
    test('should calculate text complexity correctly', async () => {
      const complexInput: TextInput = {
        text: "Complex discussion",
        source: "test_complex",
        metadata: {
          responses: [
            {
              text: "The macroeconomic implications of quantitative easing policies have created unprecedented market conditions.",
              author: "economist1",
              timestamp: new Date(Date.now() - 200000)
            },
            {
              text: "Indeed, the correlation between monetary policy and asset valuations suggests we're in uncharted territory.",
              author: "analyst2",
              timestamp: new Date(Date.now() - 100000)
            }
          ]
        }
      };

      const simpleInput: TextInput = {
        text: "Simple discussion",
        source: "test_simple",
        metadata: {
          responses: [
            {
              text: "Moon soon!",
              author: "simple1",
              timestamp: new Date(Date.now() - 200000)
            },
            {
              text: "Yes! To moon!",
              author: "simple2",
              timestamp: new Date(Date.now() - 100000)
            }
          ]
        }
      };

      const complexResult = await detector.detect(complexInput);
      const simpleResult = await detector.detect(simpleInput);

      expect(complexResult).not.toBeNull();
      expect(simpleResult).not.toBeNull();
      expect(complexResult!.indicators.qualityMetrics.averageComplexity)
        .toBeGreaterThan(simpleResult!.indicators.qualityMetrics.averageComplexity);
    });

    test('should detect template usage', async () => {
      const templateInput: TextInput = {
        text: "Template responses",
        source: "test_templates",
        metadata: {
          responses: [
            {
              text: "Great project everyone!",
              author: "template1",
              timestamp: new Date(Date.now() - 300000)
            },
            {
              text: "Amazing project team!",
              author: "template2",
              timestamp: new Date(Date.now() - 200000)
            },
            {
              text: "Wow great project here!",
              author: "template3",
              timestamp: new Date(Date.now() - 100000)
            }
          ]
        }
      };

      const result = await detector.detect(templateInput);
      
      expect(result).not.toBeNull();
      expect(result!.indicators.qualityMetrics.templateDetection).toBeGreaterThan(0.5);
    });
  });

  describe('Trend Analysis', () => {
    test('should detect activity spikes', async () => {
      const spikeInput: TextInput = {
        text: "Activity spike discussion",
        source: "test_spike",
        metadata: {
          responses: [
            // Normal activity
            { text: "Regular discussion", author: "user1", timestamp: new Date(Date.now() - 600000) },
            { text: "Continuing conversation", author: "user2", timestamp: new Date(Date.now() - 580000) },
            
            // Sudden spike
            { text: "Pump it!", author: "pumper1", timestamp: new Date(Date.now() - 300000) },
            { text: "To the moon!", author: "pumper2", timestamp: new Date(Date.now() - 299000) },
            { text: "Buy now!", author: "pumper3", timestamp: new Date(Date.now() - 298000) },
            { text: "Don't miss out!", author: "pumper4", timestamp: new Date(Date.now() - 297000) },
            { text: "Last chance!", author: "pumper5", timestamp: new Date(Date.now() - 296000) },
            { text: "Going parabolic!", author: "pumper6", timestamp: new Date(Date.now() - 295000) }
          ]
        }
      };

      const result = await detector.detect(spikeInput);
      
      expect(result).not.toBeNull();
      expect(result!.indicators.trendAnalysis.spikesDetected.length).toBeGreaterThan(0);
      
      const spike = result!.indicators.trendAnalysis.spikesDetected[0];
      expect(spike.intensity).toBeGreaterThan(2);
      expect(spike.likelySource).toBe('bot'); // Due to generic content and timing
    });

    test('should calculate viral potential', async () => {
      const viralInput: TextInput = {
        text: "High quality viral discussion",
        source: "test_viral",
        metadata: {
          responses: [
            {
              text: "This breakthrough in blockchain technology could revolutionize how we think about decentralized systems.",
              author: "tech_expert_1",
              timestamp: new Date(Date.now() - 300000)
            },
            {
              text: "The implications for smart contract security are massive. This could solve the oracle problem we've been dealing with.",
              author: "security_researcher",
              timestamp: new Date(Date.now() - 250000)
            },
            {
              text: "I've been following this project since the whitepaper. The team's approach to consensus mechanisms is genuinely innovative.",
              author: "blockchain_dev",
              timestamp: new Date(Date.now() - 200000)
            },
            {
              text: "The peer review process they've implemented gives me confidence in the technical soundness of their solution.",
              author: "academic_reviewer",
              timestamp: new Date(Date.now() - 150000)
            }
          ]
        }
      };

      const result = await detector.detect(viralInput);
      
      expect(result).not.toBeNull();
      expect(result!.indicators.trendAnalysis.viralPotential).toBeGreaterThan(0.7);
      expect(result!.indicators.trendAnalysis.sustainabilityScore).toBeGreaterThan(0.8);
    });
  });

  describe('Content Pattern Analysis', () => {
    test('should detect copypasta phrases', async () => {
      const copypastaInput: TextInput = {
        text: "Copypasta discussion",
        source: "test_copypasta",
        metadata: {
          responses: [
            {
              text: "This is a revolutionary project that will change everything we know about cryptocurrency and blockchain technology forever",
              author: "copy1",
              timestamp: new Date(Date.now() - 300000)
            },
            {
              text: "This is a revolutionary project that will change everything we know about cryptocurrency and blockchain technology forever",
              author: "copy2",
              timestamp: new Date(Date.now() - 200000)
            },
            {
              text: "This is a revolutionary project that will change everything we know about cryptocurrency and blockchain technology forever",
              author: "copy3",
              timestamp: new Date(Date.now() - 100000)
            }
          ]
        }
      };

      const result = await detector.detect(copypastaInput);
      
      expect(result).not.toBeNull();
      expect(result!.indicators.contentPatterns.copypastaPhrases.length).toBeGreaterThan(0);
      expect(result!.indicators.qualityMetrics.uniquenessScore).toBeLessThan(0.3);
    });

    test('should identify shill keywords', async () => {
      const shillInput: TextInput = {
        text: "Shill content",
        source: "test_shill",
        metadata: {
          responses: [
            {
              text: "Join our Telegram for exclusive presale access! Limited time offer!",
              author: "shill1",
              timestamp: new Date(Date.now() - 200000)
            },
            {
              text: "This token will do 100x guaranteed! Don't miss this opportunity!",
              author: "shill2",
              timestamp: new Date(Date.now() - 100000)
            }
          ]
        }
      };

      const result = await detector.detect(shillInput);
      
      expect(result).not.toBeNull();
      expect(result!.indicators.contentPatterns.shillKeywords.length).toBeGreaterThan(0);
      expect(result!.indicators.contentPatterns.promotionalContent).toBeGreaterThan(0);
    });
  });

  describe('Mixed Engagement Scenarios', () => {
    test('should handle mixed organic and artificial engagement', async () => {
      const mixedInput: TextInput = {
        text: "Mixed engagement discussion",
        source: "test_mixed",
        metadata: {
          responses: [
            // Organic responses
            {
              text: "The technical architecture of this protocol addresses some fundamental scalability issues.",
              author: "legitimate_analyst",
              timestamp: new Date(Date.now() - 400000),
              followers: 15000
            },
            {
              text: "I've reviewed their GitHub repository and the code quality is impressive. Active development with meaningful commits.",
              author: "code_reviewer",
              timestamp: new Date(Date.now() - 350000),
              followers: 8000
            },
            
            // Bot responses
            {
              text: "Great project! To the moon!",
              author: "bot_account_123",
              timestamp: new Date(Date.now() - 300000),
              followers: 50
            },
            {
              text: "Bullish! Still early!",
              author: "moon_seeker_456",
              timestamp: new Date(Date.now() - 295000),
              followers: 75
            },
            
            // More organic responses
            {
              text: "The tokenomics model they've proposed creates interesting incentive alignments for long-term holders.",
              author: "tokenomics_expert",
              timestamp: new Date(Date.now() - 250000),
              followers: 12000
            }
          ]
        }
      };

      const result = await detector.detect(mixedInput);
      
      expect(result).not.toBeNull();
      expect(result!.indicators.trendAnalysis.growthPattern).toBe('mixed');
      expect(result!.indicators.responseMetrics.botToHumanRatio).toBeGreaterThan(0.2);
      expect(result!.indicators.responseMetrics.botToHumanRatio).toBeLessThan(0.6);
      expect(result!.indicators.engagementAuthenticity.organicScore).toBeGreaterThan(0.3);
      expect(result!.indicators.engagementAuthenticity.organicScore).toBeLessThan(0.8);
    });
  });

  describe('Batch Detection', () => {
    test('should handle batch detection correctly', async () => {
      const inputs: TextInput[] = [
        {
          text: "First conversation",
          source: "conv1",
          metadata: {
            responses: [
              { text: "Organic discussion point", author: "user1", timestamp: new Date() },
              { text: "Thoughtful response", author: "user2", timestamp: new Date() }
            ]
          }
        },
        {
          text: "Second conversation",
          source: "conv2",
          metadata: {
            responses: [
              { text: "Great project!", author: "bot1", timestamp: new Date() },
              { text: "To the moon!", author: "bot2", timestamp: new Date() }
            ]
          }
        }
      ];

      const results = await detector.detectBatch(inputs);
      
      expect(results).toHaveLength(2);
      expect(results[0].strength).toBeGreaterThan(results[1].strength); // First should be more organic
    });
  });

  describe('Configuration', () => {
    test('should respect sensitivity settings', async () => {
      const lowSensitivityDetector = new ReplyGuyDetector({ sensitivity: 0.1 });
      const highSensitivityDetector = new ReplyGuyDetector({ sensitivity: 0.9 });

      const borderlineInput: TextInput = {
        text: "Borderline case",
        source: "test_sensitivity",
        metadata: {
          responses: [
            { text: "Somewhat generic response", author: "user1", timestamp: new Date() },
            { text: "Another basic comment", author: "user2", timestamp: new Date() }
          ]
        }
      };

      const lowResult = await lowSensitivityDetector.detect(borderlineInput);
      const highResult = await highSensitivityDetector.detect(borderlineInput);

      // High sensitivity should amplify the signal strength
      if (lowResult && highResult) {
        expect(Math.abs(highResult.strength)).toBeGreaterThanOrEqual(Math.abs(lowResult.strength));
      }
    });

    test('should respect confidence threshold', async () => {
      const lowConfidenceDetector = new ReplyGuyDetector({ minConfidence: 0.1 });
      const highConfidenceDetector = new ReplyGuyDetector({ minConfidence: 0.9 });

      const weakSignalInput: TextInput = {
        text: "Weak signal case",
        source: "test_confidence",
        metadata: {
          responses: [
            { text: "Normal response", author: "user1", timestamp: new Date() },
            { text: "Another normal response", author: "user2", timestamp: new Date() }
          ]
        }
      };

      const lowResult = await lowConfidenceDetector.detect(weakSignalInput);
      const highResult = await highConfidenceDetector.detect(weakSignalInput);

      // Low confidence threshold should be more likely to return a result
      expect(lowResult).not.toBeNull();
      // High confidence threshold might filter out weak signals
      // (This test might need adjustment based on actual implementation)
    });
  });
});