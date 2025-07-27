# Production Trading Deployment Checklist

## Pre-Production Testing Phase (1-2 weeks)

### Phase 1: Dry Run Testing ✓
- [ ] Run system in `DRY_RUN` mode for at least 48 hours
- [ ] Verify all strategies execute without errors
- [ ] Monitor paper trading P&L and positions
- [ ] Test emergency stop functionality
- [ ] Verify rate limiting works correctly
- [ ] Check monitoring dashboards and alerts

### Phase 2: Paper Trading ✓
- [ ] Switch to `PAPER` mode with real market data
- [ ] Run for at least 1 week
- [ ] Achieve positive paper P&L
- [ ] Test all order types (market, limit, stop-loss)
- [ ] Verify order validation catches invalid orders
- [ ] Export and analyze paper trading results

### Phase 3: Staging Environment
- [ ] Set environment variables:
  ```bash
  export PRODUCTION_UNLOCK_KEY="your-secret-key"
  export KRAKEN_API_KEY="your-api-key"
  export KRAKEN_API_SECRET="your-api-secret"
  export KILL_SWITCH_RESET_KEY="admin-reset-key"
  ```
- [ ] Switch to `STAGING` mode with unlock key
- [ ] Start with minimal capital ($100-500)
- [ ] Execute small trades ($10-50 per order)
- [ ] Test on limited pairs (BTC/USD, ETH/USD only)
- [ ] Monitor for 3-5 days
- [ ] Verify real order execution and fills
- [ ] Test order cancellation
- [ ] Ensure proper fee calculation

## Production Deployment

### System Configuration
- [ ] Configure production logging to persistent storage
- [ ] Set up log rotation (daily, max 30 days)
- [ ] Configure alerting endpoints (email/Slack/Discord)
- [ ] Set conservative risk parameters:
  ```python
  max_position_size_pct = 0.05  # 5% per position
  max_leverage = 2.0            # 2x maximum
  daily_loss_limit_pct = 0.02   # 2% daily loss limit
  max_drawdown_pct = 0.10       # 10% maximum drawdown
  ```

### API Configuration
- [ ] Verify API keys have appropriate permissions
- [ ] Confirm API tier and rate limits
- [ ] Test API key rotation procedure
- [ ] Set up backup API keys

### Monitoring Setup
- [ ] Deploy monitoring dashboard
- [ ] Configure real-time P&L tracking
- [ ] Set up performance metrics collection
- [ ] Create alert rules:
  - High API error rate (>5/min)
  - Daily loss approaching limit (>1.5%)
  - Position concentration (>20%)
  - Low account balance (<$500)
  - System health degradation

### Safety Verification
- [ ] Test kill switch activation and reset
- [ ] Verify emergency position closing works
- [ ] Test graceful shutdown procedure
- [ ] Confirm order validation is active
- [ ] Verify slippage protection thresholds
- [ ] Test rate limiter backoff behavior

### Operational Procedures
- [ ] Document emergency contact information
- [ ] Create runbook for common issues
- [ ] Set up automated backups:
  - Trading state
  - Order history
  - Performance metrics
- [ ] Schedule daily system health reviews
- [ ] Plan for 24/7 monitoring rotation

## Go-Live Steps

1. **Final Safety Check**
   ```bash
   python safe_trading_system.py --check-safety
   ```

2. **Start in Production Mode**
   ```bash
   # Unlock production mode
   python -c "
   from trading_mode import TradingModeManager, TradingMode
   manager = TradingModeManager()
   manager.set_mode(TradingMode.PRODUCTION, unlock_key='$PRODUCTION_UNLOCK_KEY')
   "
   ```

3. **Launch with Monitoring**
   ```bash
   # Start with output logging
   nohup python safe_trading_system.py \
     --mode production \
     --strategy momentum \
     --log-file production.log \
     > stdout.log 2>&1 &
   
   # Monitor logs
   tail -f production.log
   ```

4. **Initial Production Constraints**
   - Start with 10% of intended capital
   - Limit to 1-2 active positions
   - Use tight stop losses (1-2%)
   - Monitor continuously for first 24 hours

## Post-Launch Monitoring

### First 24 Hours
- [ ] Monitor every trade execution
- [ ] Verify P&L calculations are accurate
- [ ] Check slippage on market orders
- [ ] Ensure positions are tracked correctly
- [ ] Verify risk limits are enforced

### First Week
- [ ] Daily P&L reconciliation
- [ ] Review all error logs
- [ ] Analyze order fill quality
- [ ] Adjust rate limits if needed
- [ ] Fine-tune strategy parameters

### Ongoing
- [ ] Weekly performance reviews
- [ ] Monthly strategy optimization
- [ ] Quarterly risk parameter review
- [ ] Regular disaster recovery tests

## Emergency Procedures

### Kill Switch Activation
```python
# Via API
await system.emergency_stop("Manual intervention required")

# Via command line
python -c "
from safe_trading_system import SafeTradingSystem
system = SafeTradingSystem(...)
await system.emergency_stop()
"
```

### Close All Positions
```python
# Emergency close
await system.kill_switch.emergency_close_all_positions()
```

### Reset After Emergency
1. Investigate root cause
2. Fix any issues
3. Reset kill switch with admin key
4. Start in staging mode first
5. Gradually return to production

## Success Criteria

Before considering the system production-ready:
- ✓ 2 weeks of profitable paper trading
- ✓ 1 week of successful staging trades
- ✓ Zero critical errors in staging
- ✓ All safety systems tested
- ✓ Monitoring and alerting functional
- ✓ Emergency procedures documented and tested
- ✓ Risk parameters properly calibrated

## Contact Information

- **Trading System Admin**: [Your Name]
- **Emergency Contact**: [Phone Number]
- **Exchange Support**: Kraken Support
- **System Alerts**: [Email/Slack/Discord]

---

**Remember**: Start small, monitor closely, and scale gradually. It's better to miss opportunities than to lose capital due to system issues.