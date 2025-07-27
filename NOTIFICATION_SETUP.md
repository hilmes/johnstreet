# Trading Bot Notification Setup Guide

Get instant alerts on your iPhone when your trading strategy needs attention!

## Quick Start

The notification system monitors your trading performance and sends alerts when:
- Strategy operates outside expected parameters
- Excessive drawdown occurs
- Daily loss limits are reached
- Anomalous behavior is detected

You can take action directly from your phone to pause trading, close positions, or adjust parameters.

## iOS Push Notifications (Recommended)

### Option 1: Pushover (Easiest)
1. **Download Pushover app** ($4.99 one-time)
   - [iOS App Store](https://apps.apple.com/us/app/pushover-notifications/id506088175)
   
2. **Create Pushover account**
   - Open app and create account
   - Note your **User Key** (shown in app)
   
3. **Create application**
   - Go to [pushover.net](https://pushover.net)
   - Create new application: "Trading Bot"
   - Note your **API Token**

4. **Configure bot**
   ```bash
   export PUSHOVER_USER_KEY="your-user-key"
   export PUSHOVER_API_TOKEN="your-api-token"
   ```

### Option 2: Custom Webhook
Use services like IFTTT or Zapier to receive webhooks and send iOS notifications.

## SMS Notifications (Backup)

### Twilio Setup
1. **Create Twilio account**
   - Sign up at [twilio.com](https://www.twilio.com)
   - Get free trial credits
   
2. **Get phone number**
   - Buy a phone number (~$1/month)
   - Note your Account SID and Auth Token
   
3. **Configure**
   ```bash
   export TWILIO_ACCOUNT_SID="your-account-sid"
   export TWILIO_AUTH_TOKEN="your-auth-token"
   export TWILIO_FROM_NUMBER="+1234567890"
   export SMS_TO_NUMBER="+0987654321"  # Your phone
   ```

## Discord Notifications

1. **Create Discord server**
2. **Add webhook**
   - Server Settings → Integrations → Webhooks
   - Create webhook for #alerts channel
   - Copy webhook URL
   
3. **Configure**
   ```bash
   export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
   ```

## Email Notifications

### Gmail Setup
1. **Enable 2FA** on your Google account
2. **Create App Password**
   - Google Account → Security → App passwords
   - Generate password for "Trading Bot"
   
3. **Configure**
   ```bash
   export EMAIL_FROM="your-email@gmail.com"
   export EMAIL_PASSWORD="your-app-password"
   export EMAIL_TO="your-email@gmail.com"
   ```

## Complete Configuration Example

Create a `.env` file:
```bash
# iOS Push Notifications (Pushover)
PUSHOVER_USER_KEY="u1234567890abcdef"
PUSHOVER_API_TOKEN="a1234567890abcdef"

# SMS Backup
TWILIO_ACCOUNT_SID="AC1234567890abcdef"
TWILIO_AUTH_TOKEN="1234567890abcdef"
TWILIO_FROM_NUMBER="+15551234567"
SMS_TO_NUMBER="+15559876543"

# Discord
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/123/abc"

# Email
EMAIL_FROM="trading.bot@gmail.com"
EMAIL_PASSWORD="abcd efgh ijkl mnop"
EMAIL_TO="your.email@gmail.com"

# Trading Safety
PRODUCTION_UNLOCK_KEY="your-secret-key"
KILL_SWITCH_RESET_KEY="admin-reset-key"
```

## Usage in Code

```python
from notification_system import NotificationConfig, NotificationSystem, PerformanceEnvelope
from production_monitor import ProductionMonitor
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create notification config
notification_config = NotificationConfig(
    # iOS Push
    pushover_user_key=os.getenv('PUSHOVER_USER_KEY'),
    pushover_api_token=os.getenv('PUSHOVER_API_TOKEN'),
    
    # SMS
    twilio_account_sid=os.getenv('TWILIO_ACCOUNT_SID'),
    twilio_auth_token=os.getenv('TWILIO_AUTH_TOKEN'),
    twilio_from_number=os.getenv('TWILIO_FROM_NUMBER'),
    sms_to_number=os.getenv('SMS_TO_NUMBER'),
    
    # Discord
    discord_webhook_url=os.getenv('DISCORD_WEBHOOK_URL'),
    
    # Email
    email_from=os.getenv('EMAIL_FROM'),
    email_password=os.getenv('EMAIL_PASSWORD'),
    email_to=os.getenv('EMAIL_TO')
)

# Create monitor with notifications
monitor = ProductionMonitor(
    kraken_api=api,
    kill_switch=kill_switch,
    risk_manager=risk_manager,
    notification_config=notification_config
)

# Start monitoring
await monitor.start()
```

## Alert Types & Actions

### 🚨 Critical Alerts (iOS + SMS)
- **Kill switch activated**: Trading halted
  - Actions: Reset kill switch, View positions, Generate report
  
- **Maximum drawdown exceeded**: Risk limit breached
  - Actions: Pause trading, Close all positions, Reduce sizes

### ⚠️ Error Alerts (iOS + Discord)
- **Daily loss limit**: Approaching max loss
  - Actions: Pause until tomorrow, Review positions
  
- **High API errors**: Connection issues
  - Actions: Check logs, Restart connection

### 📊 Warning Alerts (Discord + Email)
- **Losing streak**: Multiple losses
  - Actions: Reduce frequency, Review strategy
  
- **Low win rate**: Below expected performance
  - Actions: Adjust parameters, Run backtest

## Remote Control Actions

When you receive an alert, you can take action directly:

### iOS (Pushover)
- Tap notification → Opens control panel
- Select action button → Executes immediately

### SMS (Twilio)
- Reply with action number (1, 2, 3, etc.)
- Receive confirmation

### Discord
- Type `!pause_trading` or click reaction
- Bot confirms action

## Testing Notifications

```python
# Test notification system
python test_notifications.py

# Should receive:
# - iOS push notification
# - SMS message
# - Discord alert
# - Email
```

## Performance Envelope Settings

Customize when you get alerted:

```python
performance_envelope = PerformanceEnvelope(
    max_drawdown=0.10,          # Alert at 10% drawdown
    min_sharpe_ratio=0.5,       # Alert if Sharpe < 0.5
    max_losing_streak=5,        # Alert after 5 losses
    max_daily_loss=0.03,        # Alert at 3% daily loss
    min_win_rate=0.35,          # Alert if win rate < 35%
    max_position_loss=0.05,     # Alert if position down 5%
    deviation_threshold=2.0     # Alert if 2 std devs from normal
)
```

## Troubleshooting

### Not receiving iOS notifications?
1. Check Pushover app is installed and logged in
2. Verify API token and user key
3. Check notification settings in iOS Settings
4. Test with: `curl -s -F "token=APP_TOKEN" -F "user=USER_KEY" -F "message=test" https://api.pushover.net/1/messages.json`

### SMS not working?
1. Verify Twilio account has credits
2. Check phone numbers include country code
3. Test in Twilio console first

### Discord alerts missing?
1. Ensure webhook URL is correct
2. Check bot has permissions in channel
3. Test webhook in Discord settings

## Security Notes

- **Never commit** `.env` file to git
- Use **environment variables** for all credentials
- Rotate API keys regularly
- Use app-specific passwords for email
- Enable 2FA on all services

## Cost Estimates

- **Pushover**: $4.99 one-time (unlimited notifications)
- **Twilio SMS**: ~$0.0075 per SMS
- **Discord**: Free
- **Email**: Free (with limits)

For active trading with ~10 alerts/day:
- iOS Push: Free after app purchase
- SMS backup: ~$2.25/month
- Total: ~$2-3/month + initial $5

## Next Steps

1. Set up at least 2 notification channels (primary + backup)
2. Test all channels work correctly
3. Configure performance envelope for your risk tolerance
4. Run in staging mode to calibrate alert frequency
5. Enable for production trading

Remember: **Better to get too many alerts than miss a critical one!**