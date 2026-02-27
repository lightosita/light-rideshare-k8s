#!/usr/bin/env python3
import sys
import os

# Add current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.database import init_database
from app import app
from config import Config

def main():
    """Initialize and run the Trip Service"""
    print("🚗 Initializing Rideshare Trip Service...")
    
    try:
        # Initialize database
        print("📊 Initializing database...")
        init_database()
        print("✅ Database initialized successfully!")
        
        # Start Flask application
        print(f"🌐 Starting Trip Service on port {Config.PORT}...")
        app.run(host='0.0.0.0', port=Config.PORT, debug=Config.DEBUG)
        
    except Exception as e:
        print(f"❌ Failed to start Trip Service: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()