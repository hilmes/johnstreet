"""
Test script for notification system

Run this to verify all notification channels are working correctly.
Usage: python test_notifications.py
"""

import asyncio
import os
from datetime import datetime
from dotenv import load_dotenv
import sys

from notification_system import (
    NotificationConfig, NotificationSystem, PerformanceEnvelope,
    AlertLevel, NotificationChannel, Alert
)

# Load environment variables
load_dotenv()


async def test_notifications():
    """Test all configured notification channels"""
    
    print("🔔 Trading Bot Notification Test")
    print("=" * 50)
    
    # Create notification config from environment
    config = NotificationConfig(
        # iOS Push (Pushover)
        pushover_user_key=os.getenv('PUSHOVER_USER_KEY'),
        pushover_api_token=os.getenv('PUSHOVER_API_TOKEN'),
        
        # SMS (Twilio)
        twilio_account_sid=os.getenv('TWILIO_ACCOUNT_SID'),
        twilio_auth_token=os.getenv('TWILIO_AUTH_TOKEN'),
        twilio_from_number=os.getenv('TWILIO_FROM_NUMBER'),
        sms_to_number=os.getenv('SMS_TO_NUMBER'),
        
        # Discord
        discord_webhook_url=os.getenv('DISCORD_WEBHOOK_URL'),
        
        # Telegram
        telegram_bot_token=os.getenv('TELEGRAM_BOT_TOKEN'),
        telegram_chat_id=os.getenv('TELEGRAM_CHAT_ID'),
        
        # Email
        email_from=os.getenv('EMAIL_FROM'),
        email_password=os.getenv('EMAIL_PASSWORD'),
        email_to=os.getenv('EMAIL_TO')
    )
    
    # Create performance envelope (using defaults)
    envelope = PerformanceEnvelope()
    
    # Initialize notification system
    notification_system = NotificationSystem(config, envelope)
    
    # Start control server for remote actions
    await notification_system.start_control_server()
    
    print("\nConfigured channels:")
    for channel, enabled in notification_system.channels.items():
        status = "✅" if enabled else "❌"
        print(f"  {status} {channel.value}")
    
    if not any(notification_system.channels.values()):
        print("\n❌ No notification channels configured!")
        print("Please set up at least one channel in your .env file")
        print("See NOTIFICATION_SETUP.md for instructions")
        return
    
    print("\n" + "=" * 50)
    
    # Test 1: Info Alert (Low priority)
    print("\n📘 Test 1: Info Alert")
    info_alert = Alert(
        alert_id="test-info-001",
        level=AlertLevel.INFO,
        title="Test Info Alert",
        message="This is a test info alert. Strategy is performing within normal parameters.",
        strategy_name="Test Strategy",
        metrics={
            "win_rate": 0.65,
            "sharpe_ratio": 1.8,
            "daily_pnl": 250.50,
            "total_trades": 42
        }
    )
    
    await notification_system.send_alert(info_alert)
    print("✅ Info alert sent")
    await asyncio.sleep(2)
    
    # Test 2: Warning Alert
    print("\n⚠️ Test 2: Warning Alert")
    warning_alert = Alert(
        alert_id="test-warning-002",
        level=AlertLevel.WARNING,
        title="Low Win Rate Warning",
        message="Win rate has dropped below threshold. Consider reviewing strategy parameters.",
        strategy_name="Momentum Strategy",
        metrics={
            "win_rate": 0.32,
            "consecutive_losses": 4,
            "daily_pnl": -150.75,
            "total_trades": 28
        },
        actions=[
            {"action": "pause_strategy", "label": "⏸️ Pause Strategy"},
            {"action": "adjust_parameters", "label": "⚙️ Adjust Parameters"},
            {"action": "run_backtest", "label": "📊 Run Backtest"}
        ]
    )
    
    await notification_system.send_alert(warning_alert)
    print("✅ Warning alert sent")
    await asyncio.sleep(2)
    
    # Test 3: Error Alert
    print("\n❌ Test 3: Error Alert")
    error_alert = Alert(
        alert_id="test-error-003",
        level=AlertLevel.ERROR,
        title="Daily Loss Limit Approaching",
        message="Daily loss is at 2.5%, approaching 3% limit. Immediate attention required.",
        strategy_name="Grid Trading",
        metrics={
            "daily_loss": -0.025,
            "current_drawdown": -0.08,
            "open_positions": 5,
            "at_risk_capital": 2500.00
        },
        actions=[
            {"action": "reduce_position_size", "label": "📉 Reduce Position Sizes"},
            {"action": "close_losing_positions", "label": "🛑 Close Losing Positions"},
            {"action": "pause_new_entries", "label": "⏸️ Pause New Entries"}
        ]
    )
    
    # Register mock callbacks for actions
    async def reduce_size_callback():
        print("  → Reducing position sizes by 50%")
        return "Position sizes reduced"
    
    notification_system.register_action_callback(
        error_alert.alert_id, "reduce_position_size", reduce_size_callback
    )
    
    await notification_system.send_alert(error_alert)
    print("✅ Error alert sent")
    await asyncio.sleep(2)
    
    # Test 4: Critical Alert (Highest priority)
    print("\n🚨 Test 4: Critical Alert")
    critical_alert = Alert(
        alert_id="test-critical-004",
        level=AlertLevel.CRITICAL,
        title="MAXIMUM DRAWDOWN EXCEEDED",
        message="Strategy has exceeded maximum drawdown limit of 10%. Emergency action required!",
        strategy_name="All Strategies",
        metrics={
            "current_drawdown": -0.12,
            "daily_loss": -0.045,
            "total_loss": -1250.00,
            "open_positions": 8,
            "at_risk_capital": 5000.00
        },
        actions=[
            {"action": "emergency_stop", "label": "🚨 EMERGENCY STOP ALL"},
            {"action": "close_all_positions", "label": "🛑 Close All Positions"},
            {"action": "pause_until_review", "label": "⏸️ Pause Until Review"}
        ]
    )
    
    # Send critical alert to all channels
    await notification_system.send_alert(
        critical_alert,
        channels=[
            NotificationChannel.IOS_PUSH,
            NotificationChannel.SMS,
            NotificationChannel.DISCORD,
            NotificationChannel.EMAIL
        ]
    )
    print("✅ Critical alert sent to ALL channels")
    
    # Test 5: Performance Envelope Check
    print("\n📊 Test 5: Performance Envelope Check")
    
    # Simulate bad performance metrics
    bad_metrics = {
        "strategy_name": "Test Strategy",
        "current_drawdown": -0.15,  # 15% drawdown (exceeds 10% limit)
        "daily_loss": -0.04,  # 4% daily loss (exceeds 3% limit)
        "consecutive_losses": 7,  # 7 losses in a row (exceeds 5 limit)
        "win_rate": 0.25,  # 25% win rate (below 35% minimum)
        "sharpe_ratio": 0.3,  # Below 0.5 minimum
        "total_trades": 50,
        "hourly_return": -0.005
    }
    
    # Check performance and get alerts
    performance_alerts = await notification_system.check_performance(bad_metrics)
    
    print(f"  Generated {len(performance_alerts)} performance alerts:")
    for alert in performance_alerts:
        print(f"    - {alert.level.value.upper()}: {alert.title}")
        
    # Send performance alerts
    for alert in performance_alerts[:2]:  # Send first 2 to avoid spam
        await notification_system.send_alert(alert)
        await asyncio.sleep(1)
    
    print("\n" + "=" * 50)
    print("\n✅ All notification tests completed!")
    print("\nYou should have received:")
    print("  - 4 test alerts at different severity levels")
    print("  - Performance envelope violation alerts")
    print("\nCheck your configured channels:")
    
    if notification_system.channels.get(NotificationChannel.IOS_PUSH):
        print("  📱 iOS: Check Pushover app")
    if notification_system.channels.get(NotificationChannel.SMS):
        print("  💬 SMS: Check your phone messages")
    if notification_system.channels.get(NotificationChannel.DISCORD):
        print("  💬 Discord: Check your Discord server")
    if notification_system.channels.get(NotificationChannel.EMAIL):
        print("  📧 Email: Check your inbox (and spam folder)")
    
    print(f"\n🌐 Control server running at: http://localhost:{notification_system.control_port}")
    print("   You can test remote actions from alert links")
    
    print("\n⏳ Keeping server running for 60 seconds to test remote actions...")
    print("   Press Ctrl+C to exit earlier")
    
    try:
        await asyncio.sleep(60)
    except KeyboardInterrupt:
        print("\n👋 Shutting down...")
    
    # Cleanup
    if notification_system.control_server:
        await notification_system.control_server.cleanup()


async def test_specific_channel(channel: str):
    """Test a specific notification channel"""
    
    # Map channel names
    channel_map = {
        'ios': NotificationChannel.IOS_PUSH,
        'sms': NotificationChannel.SMS,
        'discord': NotificationChannel.DISCORD,
        'telegram': NotificationChannel.TELEGRAM,
        'email': NotificationChannel.EMAIL
    }
    
    if channel.lower() not in channel_map:
        print(f"❌ Unknown channel: {channel}")
        print(f"Available channels: {', '.join(channel_map.keys())}")
        return
    
    selected_channel = channel_map[channel.lower()]
    
    # Create minimal config for selected channel
    config = NotificationConfig()
    
    # Load only needed credentials
    if selected_channel == NotificationChannel.IOS_PUSH:
        config.pushover_user_key = os.getenv('PUSHOVER_USER_KEY')
        config.pushover_api_token = os.getenv('PUSHOVER_API_TOKEN')
    elif selected_channel == NotificationChannel.SMS:
        config.twilio_account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        config.twilio_auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        config.twilio_from_number = os.getenv('TWILIO_FROM_NUMBER')
        config.sms_to_number = os.getenv('SMS_TO_NUMBER')
    # ... etc for other channels
    
    envelope = PerformanceEnvelope()
    notification_system = NotificationSystem(config, envelope)
    
    print(f"📤 Testing {channel.upper()} notifications only...")
    
    test_alert = Alert(
        alert_id=f"test-{channel}-001",
        level=AlertLevel.WARNING,
        title=f"{channel.upper()} Test Alert",
        message=f"This is a test of the {channel.upper()} notification channel.",
        strategy_name="Channel Test",
        metrics={"test": True}
    )
    
    await notification_system.send_alert(test_alert, channels=[selected_channel])
    print(f"✅ {channel.upper()} test alert sent!")


if __name__ == "__main__":
    # Check for command line arguments
    if len(sys.argv) > 1:
        # Test specific channel
        asyncio.run(test_specific_channel(sys.argv[1]))
    else:
        # Run full test suite
        asyncio.run(test_notifications())