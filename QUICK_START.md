# 🚀 Quick Start Guide - Real Crypto Trading

Welcome to your cryptocurrency trading platform! This guide will get you up and running with real Kraken trading in under 30 minutes.

## ⚠️ IMPORTANT SAFETY NOTICE

**This system can trade with real money. Start small, test thoroughly, and understand all risks before proceeding.**

## 📋 Prerequisites

- Node.js 18+ installed
- A Kraken account with funds
- Basic understanding of cryptocurrency trading
- **Willingness to start with small amounts ($100-500)**

## 🔧 Quick Setup (5 minutes)

### 1. Environment Configuration

Your `.env.local` file has been created with safe defaults. Update it with your Kraken credentials:

```bash
# Edit .env.local
KRAKEN_API_KEY=your_actual_kraken_api_key_here
KRAKEN_API_SECRET=your_actual_kraken_secret_here

# Start in PAPER mode (no real money)
TRADING_MODE=PAPER
```

### 2. Kraken API Setup

1. Go to [Kraken API Settings](https://www.kraken.com/u/security/api)
2. Create a new API key with these permissions:
   - ✅ **Query Funds** (check balances)
   - ✅ **Query Open Orders & Trades** (monitor orders)
   - ✅ **Query Ledger Entries** (transaction history)
   - ✅ **Create & Modify Orders** (place trades)
   - ✅ **Cancel/Close Orders** (cancel orders)
   - ✅ **Query Trade Balance** (portfolio value)
   - ❌ **Withdraw Funds** (NEVER enable this)

3. Copy the API key and secret to your `.env.local` file

### 3. Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit http://localhost:3000/control-center to see your dashboard!

## 🧪 Testing Progression (Follow This Order)

### Phase 1: Paper Trading (Week 1)
- **Mode**: `TRADING_MODE=PAPER`
- **Goal**: Verify everything works without real money
- **Duration**: 3-7 days

**What to test:**
- [ ] Portfolio balance loads correctly
- [ ] Safety systems show proper risk metrics
- [ ] Emergency stop button works
- [ ] Mock trading executes without errors

### Phase 2: Staging Mode (Week 2)  
- **Mode**: `TRADING_MODE=STAGING`
- **Goal**: Test with small real money ($100-500)
- **Duration**: 5-10 days

**Update your environment:**
```bash
TRADING_MODE=STAGING
MAX_ORDER_SIZE_USD=50          # Maximum $50 per order
MIN_ORDER_SIZE_USD=10          # Minimum $10 per order
DAILY_LOSS_LIMIT_PCT=0.01      # 1% daily loss limit
```

**What to test:**
- [ ] Place small real trades ($10-25)
- [ ] Verify orders execute on Kraken
- [ ] Test order cancellation
- [ ] Confirm safety limits work
- [ ] Monitor for 3+ days without issues

### Phase 3: Production Mode (Week 3+)
- **Mode**: `TRADING_MODE=PRODUCTION`
- **Goal**: Full trading with reasonable limits
- **Requirements**: Successful staging completion

**Update your environment:**
```bash
TRADING_MODE=PRODUCTION
PRODUCTION_UNLOCK_KEY=your-secure-key-here
MAX_ORDER_SIZE_USD=1000        # Adjust to your comfort
DAILY_LOSS_LIMIT_PCT=0.02      # 2% daily loss limit
```

## 🎛️ Dashboard Overview

### Control Center (`/control-center`)
Your main trading dashboard showing:
- **Portfolio Value**: Real-time total value in USD
- **Daily P&L**: Today's profit/loss
- **Account Balances**: All crypto holdings
- **Safety Status**: Risk monitoring and emergency controls
- **Trading Mode**: Current mode (PAPER/STAGING/PRODUCTION)

### Key Features
- **Emergency Stop**: Instantly stop all trading
- **Real-time Data**: Updates every 10 seconds
- **Risk Monitoring**: Automatic safety checks
- **Balance Tracking**: Multi-asset portfolio view

## 🛡️ Built-in Safety Features

### Automatic Protections
- **Position Limits**: Max 5% of portfolio per position
- **Daily Loss Limits**: Auto-stop at 2% daily loss
- **Order Size Limits**: Min $25, Max $1000 per order
- **Emergency Stop**: Manual panic button
- **Rate Limiting**: Prevents API abuse

### Manual Controls
- **Emergency Stop**: Red button in Control Center
- **Mode Switching**: Upgrade from Paper → Staging → Production
- **Limit Adjustments**: Modify risk parameters

## 🚨 Emergency Procedures

### If Something Goes Wrong

1. **Emergency Stop**
   - Click the red "EMERGENCY STOP" button in Control Center
   - This cancels all open orders immediately

2. **Check Your Kraken Account**
   - Log into Kraken directly
   - Verify your actual positions and balances
   - Cancel any remaining orders manually if needed

3. **Reset the System**
   - Use the admin reset key in safety settings
   - Or restart in PAPER mode to diagnose issues

### Getting Help
- Check the `KRAKEN_SETUP_GUIDE.md` for detailed setup
- Review the `PRODUCTION_CHECKLIST.md` for safety procedures
- Monitor logs in the browser console for errors

## 📊 What to Monitor

### Daily Checks
- [ ] Portfolio balance matches Kraken
- [ ] Daily P&L calculations are accurate
- [ ] No safety violations showing
- [ ] Trading mode is correct

### Weekly Reviews
- [ ] Review all executed trades
- [ ] Analyze strategy performance
- [ ] Check for any error patterns
- [ ] Adjust limits if needed

## ⚡ Quick Commands

```bash
# Start development
npm run dev

# Build for production
npm run build

# Check for errors
npm run lint

# Run tests
npm test
```

## 🎯 Success Criteria

Before increasing your trading capital:

- ✅ **1 week** of stable operation in current mode
- ✅ **Zero critical errors** or system crashes
- ✅ **Accurate balance tracking** matching Kraken
- ✅ **Emergency stop tested** and working
- ✅ **Risk limits functioning** correctly
- ✅ **Comfortable with the system** behavior

## 🚀 Ready to Trade?

1. **Start in PAPER mode** - Get familiar with the interface
2. **Fund your Kraken account** - Start with money you can afford to lose
3. **Switch to STAGING** - Test with small amounts ($100-500)
4. **Monitor closely** - Watch every trade for the first week
5. **Scale gradually** - Only increase after proven success

## 📞 Support

- **Emergency**: Use the Emergency Stop button
- **Questions**: Check the detailed guides in this repository
- **Issues**: Monitor the browser console for error messages

---

**Remember: Start small, test thoroughly, scale gradually. Algorithmic trading is high-risk - never trade more than you can afford to lose!**

🎉 **Ready to begin? Visit http://localhost:3000/control-center and start with PAPER mode!**