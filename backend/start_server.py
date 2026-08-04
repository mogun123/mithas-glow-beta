#!/usr/bin/env python3
"""
Backend Server Startup Script
No fallbacks or mock data - strict production mode
"""

import uvicorn
import sys
import os
from pathlib import Path

def main():
    # Get the backend directory
    backend_dir = Path(__file__).parent
    
    # Add both backend directory and parent directory to Python path
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))
    if str(backend_dir / "app") not in sys.path:
        sys.path.insert(0, str(backend_dir / "app"))
    
    # Change to backend directory
    os.chdir(backend_dir)
    
    # Import the app directly - no fallbacks
    from app.main import app
    
    # Server configuration
    config = {
        "app": "app.main:app",
        "host": "0.0.0.0",
        "port": 8000,
        "reload": True,
        "reload_dirs": ["backend/app"],
        "log_level": "info"
    }
    
    uvicorn.run(**config)

if __name__ == "__main__":
    main()
