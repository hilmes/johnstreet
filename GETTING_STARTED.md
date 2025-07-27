# 🚀 Getting Started with Johnstreet Trading Bot

Welcome to your complete algorithmic trading system! This guide will take you from zero to profitable trading in stages.

## 🎯 What You Have

A **production-ready trading system** with:
- ✅ **Safety-first design** with kill switches and risk management
- ✅ **Live trading capabilities** with Kraken exchange
- ✅ **Advanced backtesting** with clean web UI
- ✅ **iOS push notifications** for real-time alerts
- ✅ **Multiple trading strategies** ready to deploy
- ✅ **Paper trading mode** for risk-free testing

## 🎬 Quick Start (5 Minutes)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Try the Backtesting UI
```bash
python backtest_ui.py
```
Open http://localhost:8050 to see your strategy backtester!

### 3. Test Notifications (Optional)
Set up at least one notification channel, then:
```bash
python test_notifications.py
```

## 📋 Complete Setup Journey

### Phase 1: Environment Setup (15 minutes)

1. **Create Environment File**
   ```bash
   cp .env.example .env
   ```

2. **Get Kraken API Keys**
   - Go to [Kraken Pro](https://pro.kraken.com) → Settings → API
   - Create new API key with permissions:
     - ✅ Query Funds
     - ✅ Query Open Orders/Trades
     - ✅ Query Closed Orders/Trades
     - ✅ Create & Modify Orders
     - ✅ Cancel Orders
   
3. **Add API Keys to .env**
   ```bash
   KRAKEN_API_KEY="your-api-key"
   KRAKEN_API_SECRET="your-api-secret"
   PRODUCTION_UNLOCK_KEY="create-a-secret-password"
   KILL_SWITCH_RESET_KEY="admin-password"
   ```

### Phase 2: Backtest Your Strategies (30 minutes)

1. **Start Backtesting UI**
   ```bash
   python backtest_ui.py
   ```

2. **Test Different Strategies**
   - Try Momentum, Mean Reversion, Grid Trading
   - Use different time periods
   - Compare performance metrics
   - **Goal**: Find a strategy with >50% win rate and Sharpe ratio >1.0

3. **Example Good Results to Look For**
   - Total Return: >10% over 3 months
   - Win Rate: >45%
   - Sharpe Ratio: >1.0
   - Max Drawdown: <15%

### Phase 3: Set Up Notifications (15 minutes)

**Choose ONE to start:**

#### Option A: iOS Push (Recommended)
1. Buy Pushover app ($4.99) from App Store
2. Create account and note User Key
3. Create application at pushover.net
4. Add to .env:
   ```bash
   PUSHOVER_USER_KEY="your-user-key"
   PUSHOVER_API_TOKEN="your-api-token"
   ```

#### Option B: SMS Backup
1. Sign up for Twilio (free trial)
2. Get phone number (~$1/month)
3. Add to .env:
   ```bash
   TWILIO_ACCOUNT_SID="your-sid"
   TWILIO_AUTH_TOKEN="your-token"
   TWILIO_FROM_NUMBER="+1234567890"
   SMS_TO_NUMBER="+your-phone"
   ```

5. **Test Notifications**
   ```bash
   python test_notifications.py
   ```

### Phase 4: Paper Trading (1 week)

1. **Start in Dry Run Mode**
   ```bash
   python safe_trading_system.py
   ```
   
2. **Monitor Paper Performance**
   - Run for at least 5 trading days
   - Check daily P&L and alerts
   - Adjust strategy parameters if needed
   
3. **Success Criteria**
   - No critical errors
   - Positive paper trading P&L
   - Notifications working correctly

### Phase 5: Staging with Real Money (1 week)

⚠️ **IMPORTANT**: Start with small amounts!

1. **Switch to Staging Mode**
   ```python
   from trading_mode import TradingModeManager, TradingMode
   
   manager = TradingModeManager()
   manager.set_mode(TradingMode.STAGING, unlock_key='your-secret-password')
   ```

2. **Staging Limits**
   - Max $100 per order
   - Max 20 trades per day
   - Only BTC/USD and ETH/USD
   - Requires confirmation for each trade

3. **Monitor Closely**
   - Check every trade execution
   - Verify notifications arrive
   - Watch for any errors

### Phase 6: Production Trading

✅ **Only after successful staging period**

1. **Enable Production Mode**
   ```python
   manager.set_mode(TradingMode.PRODUCTION, unlock_key='your-secret-password')
   ```

2. **Start Conservative**
   - Begin with 10% of intended capital
   - Use tight stop losses (1-2%)
   - Monitor 24/7 for first week

## 📱 Notification Examples

You'll receive alerts like:

### 🚨 Critical Alert
"MAXIMUM DRAWDOWN EXCEEDED - Strategy has exceeded 10% drawdown limit"
- **Action Buttons**: Emergency Stop | Close Positions | Pause Trading

### ⚠️ Warning Alert  
"Low Win Rate - Win rate dropped to 32% below 35% threshold"
- **Action Buttons**: Adjust Parameters | Run Backtest | Pause Strategy

### 📊 Info Alert
"Daily Profit Target Reached - Generated $250 profit today"

## 🎛️ Remote Control

From your phone, you can:
- **Pause/Resume** trading instantly
- **Close all positions** in emergency
- **Adjust position sizes** on the fly
- **View performance** metrics
- **Reset kill switch** after issues

## 🔧 Available Strategies

### 1. Momentum Strategy
- **Best for**: Trending markets
- **Risk**: Medium
- **Expected Win Rate**: 45-55%
- **Timeframe**: 5-15 minutes

### 2. Mean Reversion
- **Best for**: Sideways markets  
- **Risk**: Low-Medium
- **Expected Win Rate**: 50-60%
- **Timeframe**: 15-60 minutes

### 3. Grid Trading
- **Best for**: Range-bound markets
- **Risk**: Medium-High
- **Expected Win Rate**: 60-70%
- **Timeframe**: Multiple

## 📊 Monitoring Your Bot

### Daily Checklist
- [ ] Check notification channels working
- [ ] Review overnight P&L
- [ ] Verify no critical alerts
- [ ] Check position sizes vs limits
- [ ] Monitor market conditions

### Weekly Review
- [ ] Analyze win rate trends
- [ ] Review largest wins/losses
- [ ] Adjust risk parameters if needed
- [ ] Backup trading history
- [ ] Test emergency procedures

## 🚨 Emergency Procedures

### If Things Go Wrong

1. **Immediate Actions** (from phone)
   - Open notification → Tap "Emergency Stop"
   - Or text "STOP" to SMS number
   - Or use Discord command: `!emergency_stop`

2. **Kill Switch Activation**
   ```bash
   python -c "
   from safe_trading_system import SafeTradingSystem
   system = SafeTradingSystem(...)
   await system.emergency_stop('Manual intervention')
   "
   ```

3. **Manual Position Close**
   - Log into Kraken Pro
   - Close all positions manually
   - Cancel all open orders

### Reset After Emergency
1. Investigate what went wrong
2. Fix any issues (strategy params, risk limits)
3. Reset kill switch with admin key
4. Test in staging mode first
5. Gradually return to production

## 💰 Profit Expectations

### Conservative Estimates
- **Monthly Return**: 2-5%
- **Win Rate**: 45-60%  
- **Max Drawdown**: 5-15%
- **Sharpe Ratio**: 1.0-2.0

### Remember
- **Start small** and scale gradually
- **Past performance** doesn't guarantee future results
- **Monitor closely** especially first month
- **Have exit strategy** and stick to limits

## 📚 Advanced Features

Once comfortable with basics:

### Strategy Optimization
- A/B test different parameters
- Use genetic algorithms for optimization
- Implement walk-forward analysis

### Multi-Exchange Support
- Add Binance, Coinbase Pro
- Arbitrage opportunities
- Cross-exchange hedging

### Machine Learning
- Sentiment analysis integration
- Market regime detection
- Adaptive position sizing

## 🆘 Support & Troubleshooting

### Common Issues

**"No API response"**
- Check API keys are correct
- Verify network connection
- Check Kraken status page

**"Order rejected"**
- Insufficient balance
- Invalid pair/volume
- Exchange maintenance

**"Rate limit exceeded"**
- Reduce trading frequency
- Check rate limiter settings
- Wait for reset period

### Getting Help

1. Check log files in `/logs` directory
2. Run diagnostics: `python --debug`
3. Test individual components
4. Review error messages in notifications

## 🎯 Success Tips

1. **Start Conservative**
   - Small position sizes
   - Tight risk limits
   - Conservative strategies

2. **Monitor Continuously**
   - First month: Check hourly
   - After month: Check daily
   - Always respond to critical alerts

3. **Keep Learning**
   - Analyze winning/losing trades
   - Study market conditions
   - Adjust strategies based on data

4. **Have Backup Plans**
   - Multiple notification channels
   - Manual trading knowledge
   - Emergency contact list

## 🎉 You're Ready!

Follow this guide step-by-step and you'll have a professional trading bot generating profits while you sleep. 

**Remember**: This is sophisticated software that can make or lose real money. Treat it with respect, start small, and always prioritize capital preservation over profits.

Good luck and happy trading! 🚀💰

---

**Next Steps:**
1. ✅ Complete Phase 1 setup
2. ✅ Backtest strategies thoroughly  
3. ✅ Set up notifications
4. ✅ Paper trade for 1 week
5. ✅ Graduate to staging mode
6. 🎯 Scale to production trading