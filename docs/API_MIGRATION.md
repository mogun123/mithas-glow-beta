# API Migration Guide

## Overview
All Next.js API routes have been removed. The frontend now communicates exclusively with the FastAPI backend.

## Removed API Routes

### Authentication
- ❌ `app/api/auth/[...nextauth]/route.ts`
  - ✅ Now: `FastAPI /api/v1/auth/*` + Supabase Auth

### Products
- ❌ `app/api/v1/products/route.ts`
  - ✅ Now: `FastAPI /api/v1/products`
- ❌ `app/api/v1/products/[id]/route.ts`
  - ✅ Now: `FastAPI /api/v1/products/{id}`

### Cart
- ❌ `app/api/v1/cart/route.ts`
  - ✅ Now: `FastAPI /api/v1/cart`

### Orders
- ❌ `app/api/v1/orders/route.ts`
  - ✅ Now: `FastAPI /api/v1/orders`

### Reels
- ❌ `app/api/v1/reels/route.ts`
  - ✅ Now: `FastAPI /api/v1/reels`
- ❌ `app/api/reels/feed/route.ts`
  - ✅ Now: `FastAPI /api/v1/reels?type=for_you`

### AI Services
- ❌ `app/api/v1/ai/skin-analysis/route.ts`
  - ✅ Now: `FastAPI /api/v1/ai/skin-analysis`
- ❌ `app/api/v1/ai/virtual-tryon/route.ts`
  - ✅ Now: `FastAPI /api/v1/ai/virtual-tryon`
- ❌ `app/api/v1/ai/chat/route.ts`
  - ✅ Now: `FastAPI /api/v1/ai/chat`

### Payments
- ❌ `app/api/v1/payments/create-order/route.ts`
  - ✅ Now: `FastAPI /api/v1/payments/create-order`
- ❌ `app/api/v1/payments/verify/route.ts`
  - ✅ Now: `FastAPI /api/v1/payments/verify`

### Seller
- ❌ `app/api/v1/seller/dashboard/route.ts`
  - ✅ Now: `FastAPI /api/v1/seller/dashboard`
- ❌ `app/api/v1/seller/products/route.ts`
  - ✅ Now: `FastAPI /api/v1/seller/products`

### Wallet
- ❌ `app/api/v1/wallet/route.ts`
  - ✅ Now: `FastAPI /api/v1/wallet/balance`
- ❌ `app/api/v1/wallet/add/route.ts`
  - ✅ Now: `FastAPI /api/v1/wallet/add-funds`
- ❌ `app/api/v1/wallet/withdraw/route.ts`
  - ✅ Now: `FastAPI /api/v1/wallet/payout`

### Search
- ❌ `app/api/v1/search/route.ts`
  - ✅ Now: `FastAPI /api/v1/search`
- ❌ `app/api/search/suggestions/route.ts`
  - ✅ Now: `FastAPI /api/v1/search/suggestions`

### Geo
- ❌ `app/api/v1/geo/nearby/route.ts`
  - ✅ Now: `FastAPI /api/v1/geo/nearby-salons`

### Booking
- ❌ `app/api/v1/booking/salons/route.ts`
  - ✅ Now: `FastAPI /api/v1/booking/salons`
- ❌ `app/api/booking/slots/route.ts`
  - ✅ Now: `FastAPI /api/v1/booking/salons/{salon_id}/slots`

## Migration Examples

### Before (Next.js API Route)
```typescript
// ❌ OLD: app/api/v1/products/route.ts
export async function GET(request: Request) {
  const supabase = createClient()
  const { data } = await supabase
    .from('products')
    .select('*')
  
  return Response.json(data)
}
```

### After (FastAPI Backend)
```python
# ✅ NEW: FastAPI backend
@router.get("/api/v1/products")
async def get_products(
    category: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Product).filter(Product.is_active == True)
    
    if category:
        query = query.filter(Product.category == category)
    
    products = query.offset(offset).limit(limit).all()
    return {"data": products}
```

### Frontend Client Usage
```typescript
// ✅ Frontend usage
import { apiClient } from '@/lib/api/client'

// Fetch products
const { data } = await apiClient.get('/products', {
  params: {
    category: 'skincare',
    limit: 20
  }
})
```

## Authentication Flow

### Old Flow (Next.js)
```
Frontend → Next.js API Route → Supabase → Response
```

### New Flow (FastAPI)
```
Frontend → Supabase Auth (for login)
       ↓
Frontend → FastAPI (with JWT) → Supabase DB → Response
```

### Implementation

```typescript
// 1. Login via Supabase
const { data: { session } } = await supabase.auth.signInWithPassword({
  email,
  password
})

// 2. Use session token for FastAPI calls
const response = await apiClient.get('/products', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
})

// Note: apiClient automatically adds the token from the store
```

## Data Fetching Patterns

### Server Components (Direct Supabase)
```typescript
// For READ-ONLY data in Server Components
import { createClient } from '@/lib/supabase/server'

export default async function ProductsPage() {
  const supabase = await createClient()
  
  // Direct database read for initial render
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
  
  return <ProductGrid products={products} />
}
```

### Client Components (FastAPI)
```typescript
// For mutations and client-side data fetching
'use client'

import { apiClient } from '@/lib/api/client'

export function AddToCartButton({ productId }: { productId: string }) {
  const handleAddToCart = async () => {
    const { data } = await apiClient.post('/cart/items', {
      product_id: productId,
      quantity: 1
    })
    
    toast.success('Added to cart!')
  }
  
  return <Button onClick={handleAddToCart}>Add to Cart</Button>
}
```

### Realtime Features (Supabase)
```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function RealtimeOrders() {
  const [orders, setOrders] = useState([])
  const supabase = createClient()
  
  useEffect(() => {
    // Subscribe to realtime changes
    const channel = supabase
      .channel('orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        console.log('Order updated:', payload)
        // Update local state
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
  
  return <OrderList orders={orders} />
}
```

## Error Handling

### FastAPI Errors
```typescript
import { apiClient } from '@/lib/api/client'
import { toast } from 'sonner'

try {
  const { data } = await apiClient.post('/orders', orderData)
} catch (error) {
  if (error.status === 400) {
    toast.error(error.message || 'Invalid order data')
  } else if (error.status === 401) {
    toast.error('Please login to continue')
    router.push('/auth/login')
  } else if (error.status === 500) {
    toast.error('Server error. Please try again.')
  } else {
    toast.error('An error occurred')
  }
}
```

## File Uploads

### Old (Next.js API Route)
```typescript
// ❌ OLD
const formData = new FormData()
formData.append('file', file)

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
})
```

### New (FastAPI + Supabase)
```typescript
// ✅ NEW Option 1: Direct to Supabase Storage
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data, error } = await supabase.storage
  .from('user-uploads')
  .upload(`${userId}/${filename}`, file)

// ✅ NEW Option 2: Through FastAPI
import { apiClient } from '@/lib/api/client'

const formData = new FormData()
formData.append('file', file)

const { data } = await apiClient.upload('/upload', formData)
```

## Testing

### Before
```typescript
// Testing Next.js API route
import { GET } from '@/app/api/v1/products/route'

const response = await GET(new Request('http://localhost/api/v1/products'))
```

### After
```typescript
// Test FastAPI endpoint
const response = await fetch('http://localhost:8000/api/v1/products')
const data = await response.json()
expect(data.products).toBeDefined()
```

## Deployment Checklist

- [ ] FastAPI backend deployed and accessible
- [ ] `NEXT_PUBLIC_API_URL` environment variable set
- [ ] Supabase environment variables configured
- [ ] CORS configured in FastAPI for your domain
- [ ] All API routes removed from Next.js
- [ ] Frontend client tested against production API
- [ ] Error handling implemented
- [ ] Authentication flow verified
- [ ] Cloudflare CDN configured
- [ ] SSL certificates valid

## Troubleshooting

### CORS Errors
```python
# FastAPI backend
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://mithasglow.com", "https://www.mithasglow.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Auth Errors
```typescript
// Check if token is being sent
import { apiClient } from '@/lib/api/client'

// apiClient automatically adds Authorization header
// from Zustand store (useAuthStore)

// Verify token in store
import { useAuthStore } from '@/lib/store'
const { session } = useAuthStore()
console.log('[v0] Session:', session)
```

### API URL Issues
```typescript
// Verify API_URL is set correctly
console.log('[v0] API URL:', process.env.NEXT_PUBLIC_API_URL)

// Should output: https://api.mithasglow.com
// NOT: undefined or localhost (unless in development)
```

## Performance Tips

1. **Use Cloudflare CDN** for static assets
2. **Cache API responses** with SWR or React Query
3. **Implement optimistic updates** for better UX
4. **Use Supabase Realtime** for live data (not polling)
5. **Batch API requests** where possible
6. **Use Server Components** for initial data
7. **Implement pagination** for large datasets

## Support

If you encounter issues:
1. Check FastAPI backend logs
2. Check browser console for errors
3. Verify environment variables
4. Test API endpoints directly with Postman
5. Contact backend team if persistent issues
```

```typescript file="" isHidden
