# MITHAS GLOW - Frontend-Backend Integration Guide

## 🚀 Overview

This guide covers the complete integration between the MITHAS GLOW frontend (React/Vite) and backend (FastAPI/Python) systems.

## 📁 Project Structure

```
MITHAS GLOW/
├── frontend/                 # React/Vite frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── lib/            # API clients and utilities
│   │   │   ├── supabase.ts # Supabase client
│   │   │   └── api.ts      # Backend API client
│   │   └── App.tsx         # Main app component
│   ├── package.json
│   └── vite.config.js
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── models/         # Database models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic
│   ├── main.py             # FastAPI app entry
│   └── requirements.txt
├── scripts/                 # Deployment scripts
│   ├── deploy.sh          # Linux/Mac deployment
│   └── deploy.ps1         # Windows PowerShell deployment
└── INTEGRATION_GUIDE.md    # This file
```

## 🔧 Environment Setup

### Frontend Environment (.env)

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# FastAPI Backend Configuration
VITE_API_URL=http://localhost:8000

# App Configuration
VITE_APP_NAME=Mithas Glow
VITE_APP_VERSION=1.0.0
```

### Backend Environment (.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost/mithas_glow

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis
REDIS_URL=redis://localhost:6379

# JWT
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB

# App
APP_NAME=Mithas Glow
APP_VERSION=1.0.0
DEBUG=true
```

## 🔌 API Integration

### Frontend API Client (`src/lib/api.ts`)

The frontend uses Axios for HTTP requests with automatic authentication:

```typescript
import { api } from '../lib/api';

// Example API calls
const user = await api.users.getProfile();
const reels = await api.reels.getReels();
const products = await api.products.getProducts();
```

### Authentication Flow

1. **Login**: Frontend sends credentials to `/auth/login`
2. **Token Storage**: JWT token stored in localStorage
3. **Auto-Auth**: Axios interceptor adds token to all requests
4. **Token Refresh**: Automatic token refresh on 401 errors

### Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | User authentication |
| `/auth/me` | GET | Get current user |
| `/reels` | GET | Get reels feed |
| `/reels/{id}` | GET | Get specific reel |
| `/products` | GET | Get products |
| `/cart` | GET/POST | Cart operations |
| `/orders` | GET/POST | Order management |
| `/chat` | GET/POST | Chat functionality |

## 🗄️ Database Integration

### Supabase Integration

- **Authentication**: User auth via Supabase Auth
- **Real-time**: Real-time subscriptions for live updates
- **Storage**: File uploads (videos, images)

### Local Database (PostgreSQL)

- **User Data**: Profiles, preferences, settings
- **Content**: Reels, products, comments
- **Transactions**: Orders, payments, wallet

### Database Migrations

```bash
cd backend
alembic upgrade head  # Apply migrations
alembic revision --autogenerate -m "description"  # Create new migration
```

## 🚀 Deployment

### Development Setup

```powershell
# Windows PowerShell
.\scripts\deploy.ps1 -Action all

# Linux/Mac
./scripts/deploy.sh all
```

### Production Build

```powershell
# Build frontend for production
.\scripts\deploy.ps1 -Action build

# Deploy to production
.\scripts\deploy.ps1 -Action deploy
```

### Service Management

```powershell
# Start services
.\scripts\deploy.ps1 -Action start

# Stop services
.\scripts\deploy.ps1 -Action stop

# Health check
.\scripts\deploy.ps1 -Action health
```

## 🔍 Testing

### Frontend Tests

```bash
cd frontend
npm test              # Unit tests
npm run test:e2e      # End-to-end tests
```

### Backend Tests

```bash
cd backend
python -m pytest     # Unit tests
python -m pytest tests/integration/  # Integration tests
```

### API Testing

```bash
# Test backend health
curl http://localhost:8000/health

# Test API docs
open http://localhost:8000/docs
```

## 📱 Features Integration

### Reels System

- **Video Upload**: Frontend → Backend → Supabase Storage
- **AR Processing**: TensorFlow Lite integration
- **Real-time Updates**: WebSocket connections
- **Comments/Likes**: Database with real-time sync

### Shopping System

- **Product Catalog**: Backend API with search
- **Cart Management**: Local state + backend sync
- **Order Processing**: Payment integration (Razorpay)
- **Budget Alternatives**: AI-powered recommendations

### Chat System

- **Real-time Messaging**: WebSocket connections
- **Media Sharing**: File upload integration
- **Notifications**: Push notifications
- **User Presence**: Online status tracking

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors**
   ```python
   # backend/main.py
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:5173"],
       allow_credentials=True,
   )
   ```

2. **Authentication Issues**
   ```typescript
   // Check token in localStorage
   const token = localStorage.getItem('access_token');
   console.log('Token:', token);
   ```

3. **Database Connection**
   ```bash
   # Check database connection
   python -c "from app.database import engine; print(engine.url)"
   ```

4. **Build Errors**
   ```bash
   # Clear cache and rebuild
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

### Debug Mode

```bash
# Frontend debug
VITE_DEBUG=true npm run dev

# Backend debug
DEBUG=true python -m uvicorn main:app --reload
```

## 📊 Monitoring

### Health Endpoints

- **Frontend**: `http://localhost:5173`
- **Backend**: `http://localhost:8000/health`
- **API Docs**: `http://localhost:8000/docs`

### Logging

```typescript
// Frontend logging
console.log('Frontend:', data);

// Backend logging
import logging
logging.basicConfig(level=logging.INFO)
```

## 🔄 Continuous Integration

### GitHub Actions Workflow

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Build
        run: npm run build
      - name: Deploy
        run: ./scripts/deploy.sh deploy
```

## 📚 Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://reactjs.org/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📞 Support

For integration issues:
1. Check this guide first
2. Review logs in both frontend and backend
3. Test API endpoints directly
4. Check environment variables
5. Verify database connections

---

**Last Updated**: 2026-02-05
**Version**: 1.0.0
