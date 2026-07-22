# Backend Startup Instructions

## Quick Start
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Alternative: Direct Python
```bash
cd backend
python main.py
```

## Verify Server is Running
Open http://localhost:8000/health in browser - should return:
```json
{"status": "ok", "version": "1.0.0"}
```

## Test API Endpoint
```bash
curl http://localhost:8000/api/v1/shop/products
```

## Common Issues
- **Port 8000 already in use**: Change port with `--port 8001`
- **Dependencies missing**: Run `pip install fastapi uvicorn python-multipart`
- **CORS issues**: Check that frontend URL (localhost:3000) is in ALLOWED_ORIGINS
