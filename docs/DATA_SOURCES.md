# Pump Detector Data Sources

## Current Active Data Sources

### 1. Reddit
**Status**: ✅ Actively Scanning

#### Monitored Subreddits:
- **General Crypto Subreddits:**
  - r/CryptoCurrency
  - r/Bitcoin
  - r/ethereum
  - r/dogecoin
  - r/altcoin
  - r/defi
  - r/NFT
  - r/cardano
  - r/solana
  - r/binance
  - r/coinbase

- **High-Risk Pump Subreddits:**
  - r/CryptoMoonShots ⚠️
  - r/satoshistreetbets ⚠️
  - r/crypto_bets ⚠️
  - r/pennycrypto ⚠️
  - r/cryptomarsshots ⚠️
  - r/shitcoinmoonshots ⚠️

#### What We Scan:
- Post titles and content
- Comment text
- User engagement metrics (upvotes, comments)
- Posting patterns and timing
- Author activity patterns

#### Detection Methods:
- Sentiment analysis on posts and comments
- Symbol extraction ($BTC, #ETH patterns)
- Coordinated activity detection
- Sudden spike in mentions
- New account detection

## Planned Data Sources

### 2. Twitter/X
**Status**: 🔄 Planned
- Crypto influencer tweets
- Hashtag monitoring
- Reply sentiment analysis
- Retweet velocity tracking

### 3. Telegram
**Status**: 🔄 Planned
- Pump group monitoring
- Signal channel analysis
- Message frequency spikes
- Coordinated message detection

### 4. Discord
**Status**: 🔄 Planned
- Crypto server monitoring
- Voice channel activity
- Announcement tracking
- Role-based signal detection

### 5. StockTwits
**Status**: 🔄 Planned
- Crypto ticker streams
- Sentiment indicators
- Message velocity
- User reputation scoring

## Market Data Sources

### 1. Kraken Exchange
**Status**: ✅ Active
- Real-time price data
- Volume spike detection
- Order book analysis
- Price anomaly detection

### 2. Other Exchanges
**Status**: 🔄 Planned
- Binance
- Coinbase
- Uniswap (DEX)
- PancakeSwap (DEX)

## Analysis Metrics

### Social Metrics:
- Mention frequency
- Sentiment score (-1 to 1)
- Engagement rate
- Account quality score
- Coordination indicators

### Market Metrics:
- Volume multiplier (vs average)
- Price change percentage
- Volatility measurement
- Order book imbalance

## Risk Levels

### Critical 🔴
- Multiple indicators active
- Coordinated activity detected
- High confidence (>80%)

### High 🟠
- Strong social signals
- Market anomalies present
- Medium-high confidence (60-80%)

### Medium 🟡
- Notable mention increase
- Some suspicious patterns
- Medium confidence (40-60%)

### Low 🟢
- Normal activity levels
- Few risk indicators
- Low confidence (<40%)

## Limitations

1. **Reddit API Rate Limits**: 
   - 60 requests per minute
   - 2-second delay between subreddit scans

2. **Data Freshness**:
   - Reddit: Near real-time (1-2 min delay)
   - Market data: Real-time

3. **Coverage**:
   - Currently Reddit-only for social signals
   - Limited to English language content
   - Public posts only (no private groups)

## Future Enhancements

1. **Multi-Platform Integration**:
   - Twitter API v2 integration
   - Telegram Bot API
   - Discord Bot
   - StockTwits API

2. **Advanced Analytics**:
   - Machine learning models
   - Historical pattern matching
   - Cross-platform correlation
   - Influencer impact scoring

3. **Real-time Streaming**:
   - WebSocket connections
   - Push notifications
   - Live dashboard updates

4. **Geographic Analysis**:
   - Regional pump detection
   - Time zone correlation
   - Language-specific monitoring