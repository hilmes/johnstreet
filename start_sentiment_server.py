#!/usr/bin/env python3
"""
Simple startup script for the sentiment analysis server
"""

import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import and run the sentiment server
from sentiment_server import app

if __name__ == '__main__':
    print("Starting Sentiment Analysis API Server...")
    print("Server will be available at http://localhost:5001")
    print("Press Ctrl+C to stop the server")
    
    try:
        app.run(host='0.0.0.0', port=5001, debug=False)
    except KeyboardInterrupt:
        print("\nShutting down server...")
        sys.exit(0)