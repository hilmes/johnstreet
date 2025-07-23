# WebSocket Server for Real-time Price Feeds

This standalone WebSocket server provides real-time cryptocurrency price feeds from Kraken.

## Local Development

```bash
npm run ws:server
```

The server will start on port 3001 (configurable via `WS_PORT` environment variable).

## Production Deployment

Since Vercel doesn't support WebSocket servers, you'll need to deploy this separately:

### Option 1: Railway

1. Create a new Railway project
2. Connect your GitHub repository
3. Set the start command to: `npm run ws:server`
4. Add environment variables:
   - `WS_PORT`: 3001 (or your preferred port)
   - `NODE_ENV`: production

### Option 2: Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm run ws:server`
5. Add environment variables as needed

### Option 3: Fly.io

1. Install Fly CLI: `brew install flyctl`
2. Create `fly.toml` in the project root
3. Deploy with: `fly deploy`

### Option 4: Digital Ocean App Platform

1. Create a new app
2. Connect GitHub repository
3. Configure as a Worker service
4. Set run command: `npm run ws:server`

## Environment Variables

- `WS_PORT`: WebSocket server port (default: 3001)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS

## Client Configuration

Update your frontend to connect to the deployed WebSocket server:

```typescript
// In your .env.production
NEXT_PUBLIC_WS_URL=wss://your-websocket-server.com
NEXT_PUBLIC_WS_PORT=443
```

## Testing Connection

```javascript
const ws = new WebSocket('ws://localhost:3001');
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    symbols: ['BTC/USD', 'ETH/USD']
  }));
};
ws.onmessage = (event) => {
  console.log('Price update:', JSON.parse(event.data));
};
```