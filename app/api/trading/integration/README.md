# Sentiment-to-Trade Integration API

This API endpoint manages the sentiment-to-trade integration service that automatically converts sentiment signals into trading actions.

## Endpoints

### GET /api/trading/integration
Check the current status of the integration service.

**Response:**
```json
{
  "status": "running" | "stopped",
  "isActive": true | false,
  "stats": {
    "activeSymbols": 3,
    "totalMentions": 45,
    "avgSentiment": 0.65,
    "topSymbols": [
      {
        "symbol": "BTC",
        "mentions": 25,
        "sentiment": 0.8
      }
    ],
    "timestamp": "2025-07-25T10:30:00.000Z"
  }
}
```

### POST /api/trading/integration
Start or stop the integration service.

**Request Body:**
```json
{
  "action": "start" | "stop",
  "config": {  // Optional, only for "start" action
    "symbolWhitelist": ["BTC", "ETH", "DOGE"],
    "minActivityThreshold": 5,
    "priceUpdateInterval": 30000,
    "sentimentAggregationWindow": 300000
  }
}
```

**Response (start):**
```json
{
  "success": true,
  "action": "started",
  "portfolio": {
    "cash": 10000,
    "totalValue": 10000,
    "positionCount": 0
  },
  "stats": { ... },
  "config": { ... }
}
```

**Response (stop):**
```json
{
  "success": true,
  "action": "stopped",
  "finalStats": { ... }
}
```

### DELETE /api/trading/integration
Reset the integration to default configuration.

**Response:**
```json
{
  "success": true,
  "message": "Integration reset to default configuration"
}
```

## Configuration Options

- **symbolWhitelist**: Array of symbols to monitor (e.g., ["BTC", "ETH"])
- **minActivityThreshold**: Minimum mentions per hour to consider a symbol active
- **priceUpdateInterval**: How often to fetch prices in milliseconds (min: 1000)
- **sentimentAggregationWindow**: Time window for sentiment aggregation in milliseconds (min: 60000)

## Error Handling

All endpoints return appropriate error responses:

```json
{
  "error": "Error message",
  "details": "Additional error details if available"
}
```

## Usage Example

```typescript
// Start the integration
const response = await fetch('/api/trading/integration', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'start',
    config: {
      symbolWhitelist: ['BTC', 'ETH'],
      minActivityThreshold: 3
    }
  })
})

// Check status
const status = await fetch('/api/trading/integration').then(r => r.json())
console.log('Integration status:', status)

// Stop the integration
await fetch('/api/trading/integration', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'stop' })
})
```

## Testing

Run the test script:
```bash
npm run test:integration-api
```