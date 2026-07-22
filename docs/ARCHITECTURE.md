# MITHAS GLOW - Architecture Documentation

## Overview
MITHAS GLOW follows a 12-layer Arctic architecture with complete separation between frontend and backend.

## Architecture Layers

### 🧊 Layer 1: Edge & Delivery (Cloudflare)
**Purpose**: Global CDN, security, and edge routing

**Components**:
- Cloudflare CDN (Static assets, images)
- Cloudflare DNS (Domain management)
- Cloudflare SSL (HTTPS encryption)
- Cloudflare WAF (Web Application Firewall)
- Cloudflare DDoS Protection
- Cloudflare R2 (Object storage for reels, media)
- Cloudflare Stream (Video playback)
- Cloudflare Images (Image optimization)

**Traffic Flow**: ALL traffic hits Cloudflare first

---

### 🧊 Layer 2: Frontend Experience (Next.js)
**Purpose**: User interface and client-side logic

**Tech Stack**:
- Next.js 16 App Router
- React 19.2
- Tailwind CSS v4
- TypeScript
- Zustand (State management)

**Hosting Options**:
- AWS EC2 + Nginx
- AWS ECS (Docker)
- AWS EKS (Kubernetes) - **Recommended**
- Cloudflare Pages (Alternative)

**Key Points**:
- Frontend is UI ONLY - no business logic
- All data fetching goes through FastAPI
- Uses Supabase SDK for realtime and auth
- Deployed as Docker container

---

### 🧊 Layer 3: Backend Core (FastAPI)
**Purpose**: Main application server and business logic

**Tech Stack**:
- FastAPI (Python)
- Nginx (Reverse proxy)
- AWS ALB/NLB (Load balancer)
- Redis/Upstash (Caching)
- Meilisearch (Search engine)

**API Structure**:
```
https://api.mithasglow.com/api/v1/
├── /auth
│   ├── /login
│   ├── /register
│   ├── /refresh
│   └── /logout
├── /products
├── /cart
├── /orders
├── /reels
├── /ai
│   ├── /skin-analysis
│   ├── /virtual-tryon
│   └── /chat
├── /chat
├── /booking
├── /payments
└── /seller
```

---

### 🧊 Layer 4: Data Layer (Supabase)
**Purpose**: PostgreSQL database with extensions

**Features**:
- PostgreSQL 15+
- pgVector (AI embeddings)
- PostGIS (Geolocation)
- pgbouncer (Connection pooling)
- Row Level Security (RLS)

**Access Methods**:
1. **Server Components**: Direct Supabase SDK
2. **Client Components**: Supabase Realtime
3. **FastAPI**: Direct PostgreSQL connection

---

### 🧊 Layer 5: Storage & Media
**Purpose**: File and media storage

**Components**:
- **Supabase Storage**: User uploads, profile pictures, JSON
- **Cloudflare R2**: Large media, reels, videos
- **Cloudflare Stream**: Video playback and encoding

---

### 🧊 Layer 6: AI & Personalization
**Purpose**: Machine learning and AI features

**Tech Stack**:
- TensorFlow Lite
- PyTorch
- MediaPipe
- OpenCV
- CLIP
- Stable Diffusion + ControlNet

**Features**:
- Skin analysis
- Virtual makeup try-on
- AR mirror
- Product recommendations
- Style suggestions

---

### 🧊 Layer 7: AR Mirror (Glow Mirror)
**Purpose**: Real-time AR try-on

**Tech Stack**:
- MediaPipe FaceMesh
- TensorFlow Lite
- Unity AR Foundation (Phase 2)

---

### 🧊 Layer 8: Core Product Modules
- Glow Shop (E-commerce)
- Glow Reels (Video feed)
- Glow Chat (Messaging)
- Glow Mirror (AR)
- Glow Wallet (Payments)
- Glow Artist Booking
- Infinity Glow Feed (AI personalized)

---

### 🧊 Layer 9: Security & Identity
**Components**:
- Supabase Auth (Primary)
- Keycloak (Advanced IAM - optional)
- JWT + Refresh Tokens
- AES-256 Encryption
- HashiCorp Vault (Secrets)
- Cloudflare WAF Rules
- Rate Limiting (Nginx + Edge)

---

### 🧊 Layer 10: Analytics & Observability
**Tools**:
- PostHog (Product analytics)
- Grafana (Dashboards)
- Prometheus (Metrics)
- Loki (Logs)
- Jaeger (Tracing)
- Sentry (Error tracking)

---

### 🧊 Layer 11: DevOps & Deployment
**Stack**:
- Docker (Containerization)
- Kubernetes/AWS EKS (Orchestration)
- GitHub Actions (CI/CD)
- AWS ECR (Container registry)
- AWS S3 (Backups)
- Supabase Backups (Database)

---

### 🧊 Layer 12: Admin & QA
**Tools**:
- Appsmith/Retool (Admin dashboards)
- PyTest (Backend testing)
- Cypress (E2E testing)
- Postman (API testing)

---

## Traffic Flow

```
User Request
    ↓
Cloudflare CDN + WAF
    ↓
AWS ALB
    ↓
Nginx Reverse Proxy
    ↓
┌─────────────────┬──────────────────┐
│  Next.js        │  FastAPI         │
│  Frontend       │  Backend         │
│  (Docker)       │  (Docker)        │
└─────────────────┴──────────────────┘
         ↓                ↓
    ┌────────────────────────┐
    │  Supabase PostgreSQL   │
    │  + pgVector + PostGIS  │
    └────────────────────────┘
```

## Frontend → Backend Communication

### Authentication
```typescript
// Frontend calls Supabase Auth directly
const { data, error } = await supabase.auth.signInWithPassword({
  email, password
})

// For FastAPI-protected routes, pass the session token
const response = await apiClient.get('/products', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
})
```

### Data Fetching
```typescript
// ✅ Correct: Use FastAPI client
import { apiClient } from '@/lib/api/client'

const { data } = await apiClient.get('/products')

// ✅ Realtime: Use Supabase directly
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
supabase
  .channel('products')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'products' 
  }, (payload) => {
    console.log('Change received!', payload)
  })
  .subscribe()
```

## Environment Variables

See `.env.example` for complete list.

**Critical Variables**:
- `NEXT_PUBLIC_API_URL`: FastAPI backend URL
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Server-side Supabase key

## Deployment

### Frontend (Next.js)
```bash
# Build Docker image
docker build -t mithas-glow-frontend .

# Deploy to Kubernetes
kubectl apply -f k8s/frontend-deployment.yaml
```

### Backend (FastAPI)
```bash
# Your FastAPI deployment process
# Usually managed separately from Next.js
```

## Security Checklist

- [ ] All traffic through Cloudflare
- [ ] WAF rules configured
- [ ] Rate limiting enabled
- [ ] HTTPS only
- [ ] Supabase RLS policies enabled
- [ ] JWT tokens with short expiry
- [ ] Refresh token rotation
- [ ] Environment variables secured
- [ ] No sensitive data in frontend
- [ ] API authentication required
- [ ] CORS properly configured

## Development Workflow

### Local Development
```bash
# 1. Start Supabase (or use cloud)
# 2. Start FastAPI backend
cd backend
python -m uvicorn main:app --reload --port 8000

# 3. Start Next.js frontend
cd frontend
npm run dev
```

### Environment Setup
```bash
# Copy environment variables
cp .env.example .env.local

# Update with your values
# - NEXT_PUBLIC_API_URL=http://localhost:8000
# - NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# - NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

## Key Differences from Standard Next.js

| Feature | Standard Next.js | MITHAS GLOW |
|---------|-----------------|-------------|
| API Routes | app/api/ | FastAPI backend |
| Server Actions | ✅ Supported | ❌ Not used |
| Database | ORM in Next.js | FastAPI + Supabase |
| Auth | NextAuth | Supabase Auth |
| File Upload | API route | FastAPI + Supabase Storage |
| WebSockets | Next.js API | Supabase Realtime |

## Best Practices

### ✅ DO
- Use FastAPI for all business logic
- Use Supabase SDK for realtime features
- Keep frontend lightweight
- Cache API responses
- Use Cloudflare CDN for static assets
- Implement proper error handling
- Use TypeScript throughout

### ❌ DON'T
- Don't put business logic in frontend
- Don't store sensitive data in localStorage
- Don't bypass Cloudflare
- Don't use Next.js API routes
- Don't use Server Actions for data mutations
- Don't expose service role keys

## Monitoring

- **Frontend Errors**: Sentry
- **API Performance**: Grafana + Prometheus
- **User Analytics**: PostHog
- **Server Logs**: Loki
- **Distributed Tracing**: Jaeger

## Support

For architecture questions or issues:
1. Check this documentation
2. Review API documentation
3. Contact the backend team
4. Open an issue on GitHub
