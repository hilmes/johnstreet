# Release Notes

## v0.2.0 - Real-time Price Feeds & Layout Improvements

### 🚀 New Features

#### Real-time Kraken WebSocket Price Feeds
- Implemented live cryptocurrency price feeds with second-to-second updates from Kraken
- Created `PriceFeedManager` to manage WebSocket connections with automatic reconnection
- Built standalone WebSocket server (`server/websocket-server.ts`) for broadcasting price updates
- Added `useLivePrices` React hook for easy component integration
- Updated `MarketDataWidget` to display live prices with connection status indicators
- Added visual pulse animations for live data updates
- Supports real-time price feeds for BTC, ETH, SOL, ADA, and DOT

#### WebSocket Infrastructure
- Automatic reconnection on disconnect with exponential backoff
- CORS protection with configurable allowed origins
- Client subscription management for efficient data distribution
- Sparkline data generation for price trend visualization
- Ping/pong heartbeat for connection health monitoring

### 🎨 UI/UX Improvements

#### Fixed Layout Issues
- Resolved excessive negative space on the left side of main content container
- Changed from padding-based to margin-based sidebar offset approach
- Implemented proper width calculations to avoid double spacing
- Removed problematic negative margins from page headers

#### Responsive Design Updates
- Standardized responsive padding across all pages:
  - Mobile (xs): 12px horizontal padding
  - Small (sm): 16px horizontal padding
  - Medium (md): 24px horizontal padding
  - Large (lg): 32px horizontal padding
- Added max-width constraint of 1920px with auto margins for ultra-wide screens
- Ensured consistent layout patterns across all 10+ page components

### 🔧 Technical Improvements

#### Environment Configuration
- Added WebSocket port configuration (`NEXT_PUBLIC_WS_PORT`)
- Created production environment example file
- Support for separate WebSocket server deployment URLs

#### Development Experience
- Added `npm run ws:server` script for running WebSocket server
- Installed `tsx` for TypeScript execution in Node.js
- Updated `dev:all` script to run WebSocket server concurrently

### 📚 Documentation

#### Data Sources Documentation
Created comprehensive documentation for pump detector data sources:
- Reddit integration via snoowrap API
- Monitored subreddits: r/CryptoCurrency, r/SatoshiStreetBets, r/CryptoMoonShots, etc.
- Detailed sentiment analysis methodology
- Symbol extraction patterns and techniques

#### WebSocket Deployment Guide
Created deployment documentation for WebSocket server:
- Instructions for Railway, Render, Fly.io, and Digital Ocean
- Environment variable configuration
- Client connection setup examples

### 🛠️ Files Changed

- **New Files:**
  - `hooks/useLivePrices.ts` - React hook for live price data
  - `lib/kraken/PriceFeedManager.ts` - WebSocket price feed manager
  - `server/websocket-server.ts` - Standalone WebSocket server
  - `server/README.md` - WebSocket deployment guide
  - `docs/DATA_SOURCES.md` - Pump detector data sources documentation
  - `.env.production.example` - Production environment template

- **Modified Files:**
  - `components/widgets/MarketDataWidget.tsx` - Added live price display
  - `components/ClientLayout.tsx` - Fixed layout spacing issues
  - `lib/kraken/websocket.ts` - Added Node.js/browser compatibility
  - All page components - Updated with responsive padding
  - `package.json` - Added WebSocket server scripts

### 🚨 Breaking Changes
None - All changes are backwards compatible

### 🔮 Next Steps
1. Deploy WebSocket server to a platform supporting persistent connections
2. Configure production WebSocket URL in environment variables
3. Consider adding more cryptocurrency pairs to live feed
4. Implement price alerts based on live data

### 🐛 Bug Fixes
- Fixed WebSocket import issues for Node.js environment
- Resolved layout redundancy with double sidebar spacing
- Corrected page header width calculations

---

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>