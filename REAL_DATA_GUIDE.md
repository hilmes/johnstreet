# 📊 Real Historical Data Integration Guide

Your trading bot now has **REAL historical data** from multiple exchanges! This guide shows you how to use it effectively.

## 🎯 What's New

### **Multiple Data Sources**
- ✅ **Kraken API** - Primary source (most accurate for Kraken trading)
- ✅ **CryptoCompare API** - Extensive historical data (up to 7 years)
- ✅ **Binance API** - Backup source with high liquidity data
- ✅ **Local SQLite Cache** - Stores data locally for fast access

### **Intelligent Fallbacks**
The system tries sources in order:
1. **Kraken** (most accurate for your exchange)
2. **CryptoCompare** (extensive history)
3. **Binance** (backup)
4. **Simulated** (if all fail)

## 🚀 Quick Start

### 1. Set Up API Keys (Optional but Recommended)

Create a `.env` file:
```bash
# Kraken (for most accurate data)
KRAKEN_API_KEY="your-public-api-key"
KRAKEN_API_SECRET="your-secret-key"

# CryptoCompare (for extensive history)
CRYPTOCOMPARE_API_KEY="your-free-api-key"
```

**Free CryptoCompare API**: Get one at [cryptocompare.com](https://min-api.cryptocompare.com/) (2000 requests/hour free)

### 2. Download Historical Data

```bash
# Download 90 days of BTC and ETH data
python download_historical_data.py --pairs XBTUSD ETHUSD --days 90

# Download all pairs and timeframes (takes longer)
python download_historical_data.py --all-pairs --all-timeframes --days 365
```

### 3. Test Your Data Sources

```bash
# Test if APIs are working
python download_historical_data.py --command test

# Check what's in your cache
python download_historical_data.py --command status
```

## 📈 Using Real Data in Backtesting

### **Backtesting UI** (Recommended)
```bash
python backtest_ui.py
```

Open http://localhost:8050 and:
1. Select **"📊 Real Historical Data"** (not simulated)
2. Choose your pairs and timeframe
3. Set date range (recent data is more accurate)
4. Run backtest with real market data!

### **Programmatic Backtesting**
```python
from backtesting_engine import BacktestingEngine
from historical_data_manager import HistoricalDataManager

# Create data manager
data_manager = HistoricalDataManager(
    kraken_api_key="your-key",
    cryptocompare_api_key="your-key"
)

# Create engine with real data
engine = BacktestingEngine(
    initial_capital=10000,
    data_manager=data_manager,
    use_real_data=True  # This is the key!
)

# Run backtest
results = await engine.backtest_strategy(
    strategy_class=YourStrategy,
    pairs=['XBTUSD'],
    start_date=datetime(2024, 1, 1),
    end_date=datetime(2024, 6, 1)
)
```

## 🎛️ Data Management Commands

### **Download Data**
```bash
# Basic download (recommended for start)
python download_historical_data.py

# Custom download
python download_historical_data.py \
  --pairs XBTUSD ETHUSD XRPUSD \
  --timeframes 5m 1h 1d \
  --days 180

# Force refresh (re-download existing data)
python download_historical_data.py --force
```

### **Check Cache Status**
```bash
python download_historical_data.py --command status
```

Output example:
```
Cache coverage:
------------------------------------------------------------
  XBTUSD   5m : 2024-01-01 to 2024-07-27 (208 days)
  XBTUSD   1h : 2024-01-01 to 2024-07-27 (208 days)
  XBTUSD   1d : 2024-01-01 to 2024-07-27 (208 days)
  ETHUSD   5m : 2024-06-01 to 2024-07-27 (56 days)
  ETHUSD   1h : No data
```

### **Test APIs**
```bash
python download_historical_data.py --command test
```

Sample output:
```
🧪 Testing data sources...
✅ Test successful: Retrieved 24 data points
   Date range: 2024-07-27 08:00:00 to 2024-07-27 10:00:00
   Price range: $66,234.50 - $66,891.20
📊 Sample data:
   2024-07-27 09:55:00: O:66645.5 H:66681.2 L:66612.1 C:66658.7
```

## 📊 Available Data

### **Trading Pairs**
- **XBTUSD** - Bitcoin/USD
- **ETHUSD** - Ethereum/USD  
- **XRPUSD** - Ripple/USD
- **ADAUSD** - Cardano/USD
- **SOLUSD** - Solana/USD
- **DOTUSD** - Polkadot/USD
- **LINKUSD** - Chainlink/USD
- **LTCUSD** - Litecoin/USD
- **BCHUSD** - Bitcoin Cash/USD
- **XLMUSD** - Stellar/USD

### **Timeframes**
- **1m** - 1 minute (high frequency)
- **5m** - 5 minutes (recommended for testing)
- **15m** - 15 minutes
- **1h** - 1 hour (good for longer strategies)
- **1d** - 1 day (position trading)

### **Historical Range**
- **Kraken**: Up to 720 data points per request
- **CryptoCompare**: Up to 7+ years of history
- **Binance**: Extensive recent data

## 🎯 Data Quality

### **Automatic Validation**
The system automatically:
- ✅ Removes duplicate timestamps
- ✅ Filters out invalid prices (zeros, negatives)
- ✅ Validates OHLC relationships (high ≥ open, close; low ≤ open, close)
- ✅ Removes extreme outliers (>50% price spikes)
- ✅ Sorts by timestamp

### **Quality Report**
```python
from backtesting_engine import BacktestingEngine

engine = BacktestingEngine(use_real_data=True)
report = engine.get_data_quality_report('XBTUSD')
print(report)
```

Example output:
```json
{
  "pair": "XBTUSD",
  "data_source": "real",
  "cache_entries": 3,
  "date_ranges": {
    "XBTUSD_2024-01-01_2024-07-27_5m": {
      "start": "2024-01-01T00:00:00",
      "end": "2024-07-27T10:00:00", 
      "points": 59840
    }
  }
}
```

## 🔧 Advanced Configuration

### **Custom Data Manager**
```python
from historical_data_manager import HistoricalDataManager

# Advanced configuration
data_manager = HistoricalDataManager(
    kraken_api_key="your-key",
    kraken_api_secret="your-secret",
    cryptocompare_api_key="your-key",
    cache_dir="custom_cache_folder"  # Custom cache location
)

# Check available date range
start, end = await data_manager.get_available_data_range('XBTUSD', '5m')
print(f"Available data: {start} to {end}")

# Get latest price
price = await data_manager.get_latest_price('XBTUSD')
print(f"Latest BTC price: ${price:,.2f}")
```

### **Cache Management**
```python
# Force cache refresh
data = await data_manager.get_historical_data(
    'XBTUSD', '5m', start_date, end_date,
    use_cache=False  # Force fresh download
)

# Pre-populate cache for faster backtesting
await data_manager.download_and_cache_data(
    pairs=['XBTUSD', 'ETHUSD'],
    timeframes=['5m', '1h'],
    days_back=365
)
```

## 💡 Pro Tips

### **For Accurate Backtesting**
1. **Use Kraken data** when possible (most accurate for actual trading)
2. **Download recent data** (last 30-90 days) for current market conditions
3. **Use 5m timeframe** for most strategies (good balance of detail vs speed)
4. **Pre-download data** before running multiple backtests

### **For Development**
1. **Start with simulated data** for initial strategy development
2. **Switch to real data** for final validation
3. **Use short date ranges** while debugging (faster)
4. **Cache longer periods** for production backtesting

### **Data Recommendations**
```bash
# For serious backtesting (download once, use many times)
python download_historical_data.py \
  --pairs XBTUSD ETHUSD \
  --timeframes 5m 1h \
  --days 180

# For quick testing (faster download)
python download_historical_data.py \
  --pairs XBTUSD \
  --timeframes 5m \
  --days 30
```

## 🚨 Troubleshooting

### **No Data Retrieved**
1. Check internet connection
2. Verify API keys in `.env` file
3. Check API rate limits (wait and retry)
4. Try different pairs/timeframes

### **Slow Downloads**
1. Reduce date range (`--days 30`)
2. Use fewer pairs/timeframes
3. Check API rate limits
4. Get CryptoCompare API key for faster access

### **Cache Issues**
1. Delete cache folder: `rm -rf data_cache/`
2. Force refresh: `--force` flag
3. Check disk space

### **API Errors**
```bash
# Test individual sources
python -c "
from historical_data_manager import KrakenDataSource
import asyncio
source = KrakenDataSource()
print('Testing Kraken...')
# Will show specific error messages
"
```

## 🎉 What This Means for Your Trading

### **Before (Simulated Data)**
- ❌ Fake price movements
- ❌ Perfect patterns that don't exist
- ❌ Overly optimistic backtest results

### **Now (Real Historical Data)**  
- ✅ **Actual market conditions**
- ✅ **Real volatility and gaps**
- ✅ **Accurate slippage estimation**
- ✅ **True strategy performance**

Your backtests now reflect **real market behavior**, giving you confidence that strategies will perform similarly in live trading!

---

## 📚 Next Steps

1. **Download data**: `python download_historical_data.py`
2. **Test backtesting**: Use UI with real data option
3. **Validate strategies**: Re-run backtests with real data
4. **Compare results**: Real vs simulated performance
5. **Go live**: Deploy strategies with confidence!

**Remember**: Real data = real results = real profits! 🚀💰