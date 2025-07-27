#!/usr/bin/env python3
"""
Simple sentiment analysis API server for the johnstreet trading platform.
Provides mock sentiment analysis data for crypto symbols.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import random
import time
from datetime import datetime, timedelta
import threading

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:3005"])

# Mock data storage
sentiment_data = {}
pump_indicators = ['moon', 'rocket', '100x', 'diamond hands', 'to the moon', 'breakout', 'pump', 'bullish']
platforms = ['twitter', 'reddit', 'cryptopanic', 'lunarcrush']
sources = ['r/CryptoMoonShots', '@CryptoPump_Bot', 'CoinDesk', 'r/SatoshiStreetBets', '@elonmusk', 'CryptoPanic News']
symbols = ['BTC', 'ETH', 'PEPE', 'SHIB', 'DOGE', 'BONK', 'FLOKI', 'WOJAK', 'BRETT', 'TURBO', 'MEW', 'POPCAT', 'WIF', 'BOOK', 'TRUMP', 'TREMP']

def generate_sentiment_data():
    """Generate mock sentiment data"""
    return {
        'symbol': random.choice(symbols),
        'timestamp': int(time.time() * 1000),
        'platform': random.choice(platforms),
        'source': random.choice(sources),
        'sentiment': random.uniform(-1, 1),
        'confidence': random.uniform(0.7, 1.0),
        'pumpIndicators': random.sample(pump_indicators, k=random.randint(0, 4)),
        'engagement': random.randint(10, 5000),
        'riskScore': random.uniform(0, 1),
        'isNew': random.random() < 0.3
    }

def continuous_data_generation():
    """Continuously generate sentiment data"""
    while True:
        # Generate 1-3 new sentiment entries
        for _ in range(random.randint(1, 3)):
            data = generate_sentiment_data()
            key = f"{data['symbol']}_{data['timestamp']}"
            sentiment_data[key] = data
            
            # Keep only last 1000 entries
            if len(sentiment_data) > 1000:
                oldest_key = min(sentiment_data.keys())
                del sentiment_data[oldest_key]
        
        time.sleep(1)  # Generate new data every second

# Start background thread for data generation
data_thread = threading.Thread(target=continuous_data_generation, daemon=True)
data_thread.start()

@app.route('/api/sentiment/analyze', methods=['POST'])
def analyze_sentiment():
    """Analyze sentiment for a given text or symbol"""
    data = request.json
    text = data.get('text', '')
    symbol = data.get('symbol', 'BTC')
    
    # Mock sentiment analysis
    sentiment_score = random.uniform(-1, 1)
    confidence = random.uniform(0.7, 1.0)
    
    return jsonify({
        'success': True,
        'data': {
            'text': text,
            'symbol': symbol,
            'sentiment': sentiment_score,
            'confidence': confidence,
            'timestamp': int(time.time() * 1000)
        }
    })

@app.route('/api/sentiment/activity', methods=['GET'])
def get_activity():
    """Get recent sentiment activity"""
    limit = request.args.get('limit', 20, type=int)
    
    # Get most recent entries
    recent_data = sorted(sentiment_data.values(), key=lambda x: x['timestamp'], reverse=True)[:limit]
    
    return jsonify({
        'success': True,
        'data': {
            'detections': recent_data,
            'dataSourceStatus': [
                {
                    'name': 'RSS Monitor',
                    'isActive': True,
                    'eventsPerSecond': random.uniform(0.3, 0.8),
                    'totalEvents': random.randint(1000, 5000),
                    'totalProcessed': random.randint(1000, 5000),
                    'errors': random.randint(0, 5),
                    'lastActivity': int(time.time() * 1000),
                    'performance': {
                        'requestsPerMinute': random.randint(20, 50)
                    }
                },
                {
                    'name': 'Twitter Stream',
                    'isActive': random.choice([True, False]),
                    'eventsPerSecond': random.uniform(0, 0.5),
                    'totalEvents': random.randint(500, 2000),
                    'totalProcessed': random.randint(500, 2000),
                    'errors': random.randint(0, 10),
                    'lastActivity': int(time.time() * 1000),
                    'performance': {
                        'requestsPerMinute': random.randint(10, 30)
                    }
                },
                {
                    'name': 'Pushshift',
                    'isActive': True,
                    'eventsPerSecond': random.uniform(0.2, 0.5),
                    'totalEvents': random.randint(800, 3000),
                    'totalProcessed': random.randint(800, 3000),
                    'errors': random.randint(0, 3),
                    'lastActivity': int(time.time() * 1000),
                    'performance': {
                        'requestsPerMinute': random.randint(15, 40)
                    }
                }
            ]
        }
    })

@app.route('/api/sentiment/historical', methods=['GET'])
def get_historical():
    """Get historical sentiment data"""
    symbol = request.args.get('symbol', 'BTC')
    hours = request.args.get('hours', 24, type=int)
    
    # Generate mock historical data
    historical_data = []
    now = datetime.now()
    
    for i in range(hours * 4):  # 4 data points per hour
        timestamp = now - timedelta(minutes=i * 15)
        historical_data.append({
            'timestamp': int(timestamp.timestamp() * 1000),
            'sentiment': random.uniform(-0.5, 0.5) + (0.3 if symbol in ['BTC', 'ETH'] else 0),
            'volume': random.randint(100, 1000),
            'mentions': random.randint(10, 100)
        })
    
    return jsonify({
        'success': True,
        'data': {
            'symbol': symbol,
            'historical': historical_data
        }
    })

@app.route('/api/sentiment/subreddits', methods=['GET'])
def get_subreddits():
    """Get active subreddits for sentiment monitoring"""
    return jsonify({
        'success': True,
        'data': {
            'subreddits': [
                'CryptoCurrency',
                'Bitcoin',
                'ethereum',
                'CryptoMoonShots',
                'SatoshiStreetBets',
                'binance',
                'dogecoin',
                'altcoin'
            ]
        }
    })

@app.route('/api/sentiment/twitter', methods=['GET'])
def get_twitter_sentiment():
    """Get Twitter sentiment data"""
    return jsonify({
        'success': True,
        'data': {
            'trending': [
                {'hashtag': '#Bitcoin', 'mentions': random.randint(1000, 5000), 'sentiment': random.uniform(0, 0.8)},
                {'hashtag': '#Ethereum', 'mentions': random.randint(800, 4000), 'sentiment': random.uniform(0, 0.7)},
                {'hashtag': '#DeFi', 'mentions': random.randint(500, 2000), 'sentiment': random.uniform(-0.2, 0.6)},
                {'hashtag': '#Crypto', 'mentions': random.randint(2000, 8000), 'sentiment': random.uniform(-0.1, 0.5)}
            ]
        }
    })

@app.route('/api/sentiment/reddit', methods=['GET'])
def get_reddit_sentiment():
    """Get Reddit sentiment data"""
    return jsonify({
        'success': True,
        'data': {
            'hot_posts': [
                {
                    'title': 'Bitcoin hits new ATH!',
                    'subreddit': 'r/Bitcoin',
                    'score': random.randint(1000, 5000),
                    'comments': random.randint(100, 500),
                    'sentiment': random.uniform(0.5, 0.9)
                },
                {
                    'title': 'New DeFi protocol launched',
                    'subreddit': 'r/CryptoCurrency',
                    'score': random.randint(500, 2000),
                    'comments': random.randint(50, 200),
                    'sentiment': random.uniform(0, 0.6)
                }
            ]
        }
    })

@app.route('/api/sentiment/pump-detector', methods=['GET'])
def pump_detector():
    """Detect potential pump and dump schemes"""
    suspicious_symbols = []
    
    for _ in range(random.randint(0, 5)):
        suspicious_symbols.append({
            'symbol': random.choice(['SCAM', 'PUMP', 'MOON', 'ROCKET', 'LAMBO']),
            'riskScore': random.uniform(0.7, 1.0),
            'indicators': random.sample(pump_indicators, k=random.randint(3, 6)),
            'volumeSpike': random.uniform(200, 1000),
            'priceChange': random.uniform(50, 500),
            'socialMentions': random.randint(1000, 10000)
        })
    
    return jsonify({
        'success': True,
        'data': {
            'suspicious': suspicious_symbols,
            'timestamp': int(time.time() * 1000)
        }
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': int(time.time() * 1000)})

if __name__ == '__main__':
    print("Starting Sentiment Analysis API Server on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=False)