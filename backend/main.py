# Backend ASGI App Entry Point
# Simplified approach to avoid import issues

import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
# Try multiple possible locations to handle both manual and npm run dev execution
possible_env_paths = []

# 1. Project root (when running from backend directory via npm run dev)
project_root_from_backend = Path(__file__).parent.parent
possible_env_paths.append(project_root_from_backend / ".env")

# 2. Current directory (when running manually from backend directory)
current_dir = Path(__file__).parent
possible_env_paths.append(current_dir / ".env")

# 3. Two levels up (extra safety)
two_levels_up = Path(__file__).parent.parent.parent
possible_env_paths.append(two_levels_up / ".env")

env_loaded = False
for env_path in possible_env_paths:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        print(f"[main] Loaded .env from: {env_path}")
        env_loaded = True
        break

if not env_loaded:
    print("[main] ERROR: Could not find .env file in any expected location")
    print("[main] Searched paths:")
    for env_path in possible_env_paths:
        print(f"  - {env_path}")

# Add backend directory to Python path
backend_dir = Path(__file__).parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Add app directory to Python path
app_dir = backend_dir / "app"
if str(app_dir) not in sys.path:
    sys.path.insert(0, str(app_dir))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="IONTYX Backend", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Try to include beard_engine router with database-driven recommendations
try:
    from app.api.beard_engine import router as beard_router
    app.include_router(beard_router)
    print("[OK] Using database-driven beard_engine with 61+ real beard styles")
except Exception as e:
    print(f"[ERROR] Beard engine failed to load: {e}")
    import traceback
    traceback.print_exc()
    print("[ERROR] Check Supabase connection and Python dependencies")

# Health check
@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0", "beard_engine": "database-driven"}

print("[OK] Backend configured with database-driven beard recommendations")

# Export the FastAPI app for ASGI servers
__all__ = ["app"]

# For uvicorn: uvicorn backend.main:app --reload
# For gunicorn: gunicorn backend.main:app -w 4 -k uvicorn.workers.UvicornWorker
