#!/usr/bin/env tsx

/**
 * Test script for the sentiment-to-trade integration API
 * 
 * Usage:
 *   npm run test:integration-api
 *   
 * Or directly:
 *   tsx scripts/test-integration-api.ts
 */

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function testIntegrationAPI() {
  console.log('Testing Sentiment-to-Trade Integration API\n')

  // 1. Check current status
  console.log('1. Checking current status...')
  try {
    const statusResponse = await fetch(`${API_BASE}/api/trading/integration`)
    const status = await statusResponse.json()
    console.log('Current status:', JSON.stringify(status, null, 2))
  } catch (error) {
    console.error('Error checking status:', error)
  }

  console.log('\n2. Starting integration with custom config...')
  try {
    const startResponse = await fetch(`${API_BASE}/api/trading/integration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'start',
        config: {
          symbolWhitelist: ['BTC', 'ETH', 'DOGE'],
          minActivityThreshold: 3,
          priceUpdateInterval: 60000, // 1 minute
          sentimentAggregationWindow: 10 * 60 * 1000 // 10 minutes
        }
      })
    })

    const startResult = await startResponse.json()
    console.log('Start result:', JSON.stringify(startResult, null, 2))

    if (!startResponse.ok) {
      console.error('Failed to start integration:', startResult.error)
      return
    }
  } catch (error) {
    console.error('Error starting integration:', error)
    return
  }

  // Wait a bit
  console.log('\n3. Waiting 5 seconds...')
  await new Promise(resolve => setTimeout(resolve, 5000))

  // Check status again
  console.log('\n4. Checking status after start...')
  try {
    const statusResponse = await fetch(`${API_BASE}/api/trading/integration`)
    const status = await statusResponse.json()
    console.log('Updated status:', JSON.stringify(status, null, 2))
  } catch (error) {
    console.error('Error checking status:', error)
  }

  // Stop the integration
  console.log('\n5. Stopping integration...')
  try {
    const stopResponse = await fetch(`${API_BASE}/api/trading/integration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'stop'
      })
    })

    const stopResult = await stopResponse.json()
    console.log('Stop result:', JSON.stringify(stopResult, null, 2))
  } catch (error) {
    console.error('Error stopping integration:', error)
  }

  // Final status check
  console.log('\n6. Final status check...')
  try {
    const statusResponse = await fetch(`${API_BASE}/api/trading/integration`)
    const status = await statusResponse.json()
    console.log('Final status:', JSON.stringify(status, null, 2))
  } catch (error) {
    console.error('Error checking final status:', error)
  }

  console.log('\nTest complete!')
}

// Run the test
testIntegrationAPI().catch(console.error)