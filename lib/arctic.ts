/**
 * Arctic Layer Architecture - Main Export
 * All 12 layers accessible from single import
 */

// Configuration
export { arcticConfig, getApiUrl, getApiBaseUrl, getCdnUrl, getStreamUrl, getImageUrl, getR2Url } from "./config/arctic"

// Layer 1: Edge & Delivery (Cloudflare)
export { cloudflareService } from "./services/cloudflare.service"

// Layer 3: Backend Core Services
export { redisService } from "./services/redis.service"
export { searchService } from "./services/search.service"
export { fcmService } from "./services/fcm.service"

// Layer 4: Data & Realtime (Supabase)
export { realtimeService } from "./services/realtime.service"

// Layer 5: Storage & Media
export { storageService } from "./services/storage.service"

// Layer 6: AI & Personalization
export { aiService } from "./api/services/ai.service"

// Layer 10: Analytics & Observability
export { analyticsService } from "./services/analytics.service"

// Layer 12: Payments
export { paymentService } from "./services/payment.service"

// API Services (all routes to FastAPI)
export * from "./api"

// Types
export type { ArcticConfig } from "./config/arctic"
