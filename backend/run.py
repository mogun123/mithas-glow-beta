#!/usr/bin/env python3
"""
Backend Server Startup Script
"""

import uvicorn
import sys
from pathlib import Path

if __name__ == "__main__":
    # Add app directory to Python path
    backend_dir = Path(__file__).parent
    if str(backend_dir / "app") not in sys.path:
        sys.path.insert(0, str(backend_dir / "app"))
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
