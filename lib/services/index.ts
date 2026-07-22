// Services Index - Export all services for MITHAS GLOW 9-Layer Architecture

// Layer 1: Edge & Delivery
export { edgeService } from "./edge.service"

// Layer 3: Backend Core (FastAPI)
export {
  backendService,
  type Product,
  type Category,
  type ProductFilters,
  type Reel,
  type Salon,
  type SalonWithDistance,
  type Service,
  type TimeSlot,
  type Booking,
  type BookingData,
  type Deal,
  type WalletTransaction,
  type UserProfile,
  type UserPreview,
  type SellerDashboard,
  type Order,
} from "./backend.service"

// Layer 4: Data & Realtime
export { realtimeService } from "./realtime.service"

// Layer 4 Extension: Geo (PostGIS)
export { geoService } from "./geo.service"

// Layer 5: Storage & Media
export { storageService, type UploadResult, type ImageVariants } from "./storage.service"

// Layer 6: AI & Personalization
export { aiService, type SkinAnalysisResult, type VirtualTryOnResult, type AIRecommendation } from "./ai.service"

// Layer 8: Analytics & Monitoring
export { analyticsService } from "./analytics.service"

// Layer 9: Payments (Razorpay + GlowPay)
export {
  paymentService,
  type PaymentOrder,
  type PaymentResult,
  type WalletTransaction as PaymentWalletTransaction,
} from "./payment.service"

// Search (Meilisearch/ElasticSearch)
export {
  searchService,
  type SearchResult,
  type ProductSearchHit,
  type SellerSearchHit,
  type SearchFilters,
} from "./search.service"

// Notifications (FCM)
export { notificationService, type NotificationPayload } from "./notification.service"
