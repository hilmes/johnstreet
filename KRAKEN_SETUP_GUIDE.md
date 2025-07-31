# Kraken Real Trading Setup Guide

## Quick Start Checklist

- [ ] 1. Create Kraken API keys with trading permissions
- [ ] 2. Fund your Kraken account with crypto/fiat
- [ ] 3. Set environment variables for API access
- [ ] 4. Start in STAGING mode with small amounts
- [ ] 5. Test deposits, trades, and withdrawals
- [ ] 6. Graduate to PRODUCTION with unlock key

## 1. Kraken Account Setup

### API Key Permissions (Required)
Create API key at: https://www.kraken.com/u/security/api

**Essential Permissions:**
- ✅ `Query Funds` - Check balances
- ✅ `Query Open Orders & Trades` - Monitor orders  
- ✅ `Query Ledger Entries` - Transaction history
- ✅ `Create & Modify Orders` - Place trades
- ✅ `Cancel/Close Orders` - Cancel orders
- ✅ `Query Trade Balance` - Portfolio value

**Optional (High Risk):**
- ⚠️ `Withdraw Funds` - Only if you need automated withdrawals

### Rate Limits
- **Starter**: 15 calls/minute
- **Intermediate**: 20 calls/minute  
- **Pro**: 25 calls/minute

## 2. Funding Your Account

### Option A: Direct Crypto Deposit (Recommended)
1. In Kraken: Funding → Deposit → Select crypto (BTC, ETH, etc.)
2. Copy your Kraken deposit address
3. Send crypto from your external wallet
4. Wait for confirmations (varies by crypto)

### Option B: Fiat Deposit
1. Bank wire or ACH transfer to Kraken
2. Convert fiat to crypto within Kraken
3. Higher fees but easier for large amounts

## 3. Environment Configuration

Create `.env.local`:
```bash
# Kraken API Credentials
KRAKEN_API_KEY=your_actual_api_key_here
KRAKEN_API_SECRET=your_actual_secret_here

# Trading Configuration
TRADING_MODE=STAGING              # Start here!
PRODUCTION_UNLOCK_KEY=secure-key-123
KILL_SWITCH_RESET_KEY=emergency-reset-456

# Risk Parameters (Conservative Start)
MAX_POSITION_SIZE_PCT=0.05        # 5% max per position
DAILY_LOSS_LIMIT_PCT=0.02         # 2% daily loss limit  
MAX_LEVERAGE=1.0                  # No leverage initially
MIN_ORDER_SIZE_USD=25             # Minimum order size

# Rate Limiting
KRAKEN_API_CALLS_PER_MINUTE=10    # Conservative start
```

## 4. Testing Phase (CRITICAL)

### Phase 1: Staging Mode (1-2 weeks)
```bash
# Set environment
export TRADING_MODE=STAGING
export KRAKEN_API_KEY=your_key
export KRAKEN_API_SECRET=your_secret

# Start with minimal capital
# $100-500 total portfolio
# $10-25 per trade maximum
```

**Test Checklist:**
- [ ] API connection works
- [ ] Balance retrieval accurate
- [ ] Small market order execution
- [ ] Small limit order placement/cancellation
- [ ] Stop-loss order functionality
- [ ] Emergency stop works
- [ ] Real-time price feeds working

### Phase 2: Production Unlock
Only after successful staging:
```bash
export TRADING_MODE=PRODUCTION
export PRODUCTION_UNLOCK_KEY=your-secure-key
```

## 5. Available Trading Pairs

Your system supports these Kraken pairs:
- **XBTUSD** - Bitcoin/USD (most liquid)
- **ETHUSD** - Ethereum/USD
- **XRPUSD** - Ripple/USD
- **ADAUSD** - Cardano/USD
- **SOLUSD** - Solana/USD
- **DOTUSD** - Polkadot/USD
- **LINKUSD** - Chainlink/USD
- **LTCUSD** - Litecoin/USD
- **XLMUSD** - Stellar/USD

## 6. Safety Features Built-In

Your system includes these protections:

### Circuit Breakers
- Daily loss limits (2% default)
- Position size limits (5% default)
- Rate limiting protection
- Emergency kill switch

### Order Validation
- Minimum order sizes
- Maximum position checks
- Slippage protection
- Balance verification

### Monitoring
- Real-time P&L tracking
- Order execution monitoring
- API error rate alerts
- Balance reconciliation

## 7. Operational Commands

### Check System Status
```bash
# Verify API connection
curl -X GET "http://localhost:3000/api/kraken/balance"

# Check trading mode
curl -X GET "http://localhost:3000/api/trading/status"
```

### Emergency Controls
```bash
# Emergency stop all trading
curl -X POST "http://localhost:3000/api/trading/emergency-stop"

# Cancel all open orders  
curl -X POST "http://localhost:3000/api/trading/cancel-all"
```

## 8. Common Issues & Solutions

### "Invalid API Key" Error
- Verify key/secret in .env.local
- Check API key permissions
- Ensure no extra spaces/characters

### "Insufficient Funds" 
- Check actual Kraken balance
- Verify currency pair availability
- Account for trading fees

### Rate Limit Exceeded
- Reduce API call frequency
- Upgrade Kraken verification level
- Implement exponential backoff

### Orders Not Executing
- Check minimum order size (usually $5-10)
- Verify trading pair is active
- Check market hours (crypto: 24/7)

## 9. Recommended Starting Strategy

### Week 1: Manual Verification
1. Deposit $100-200 to Kraken
2. Place 1-2 manual trades through Kraken UI
3. Verify balances and fees

### Week 2: API Testing  
1. Connect API, test balance queries
2. Place small limit orders ($10-20)
3. Test order cancellation
4. Verify real-time data feeds

### Week 3: Automated Testing
1. Enable paper trading with real data
2. Run strategies with $25-50 orders
3. Monitor for 1 week continuously
4. Verify P&L calculations

### Week 4: Small Live Trading
1. Switch to STAGING mode
2. Use 1-2% of capital per trade
3. Monitor closely for errors
4. Scale up gradually

## 10. Regulatory Considerations

### Tax Reporting
- Kraken provides CSV exports
- Track all trades for tax purposes
- Consider crypto tax software

### Compliance
- Verify your jurisdiction allows algo trading
- Understand local crypto regulations
- Keep detailed trading logs

## 11. Support & Monitoring

### System Monitoring
- Check logs daily: `tail -f logs/trading.log`
- Monitor API rate usage
- Track P&L vs expectations

### Emergency Contacts
- **Kraken Support**: https://support.kraken.com
- **System Admin**: [Your Contact]
- **Emergency Stop**: Kill switch in Control Center

---

## ⚠️ CRITICAL WARNINGS

1. **START SMALL**: Begin with money you can afford to lose
2. **TEST THOROUGHLY**: Spend weeks in staging before production
3. **MONITOR CLOSELY**: Never leave automated trading unattended initially
4. **HAVE STOPS**: Always use stop-losses and position limits
5. **KEEP RECORDS**: Track everything for debugging and taxes

## 🎯 Success Criteria

Before going live with significant capital:
- ✅ 1 week of successful staging trades
- ✅ Zero system crashes or API errors
- ✅ Emergency stops tested and working
- ✅ P&L calculations verified manually
- ✅ Risk limits functioning correctly

**Remember**: Algorithmic trading is high-risk. Start small, test extensively, and scale gradually!