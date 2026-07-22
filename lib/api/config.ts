/**
 * MITHAS GLOW - Unified API Configuration
 * Arctic Layer Architecture - All layers configured
 * NO Next.js API routes - all backend via FastAPI
 */

// Environment variable helper
const getEnv = (key: string, fallback = ""): string => {
  if (typeof process !== "undefined" && process.env) {
    return process.env[key] || process.env[`NEXT_PUBLIC_${key}`] || fallback
  }
  return fallback
}

/**
 * Complete API Configuration
 * Maps to Arctic Layer Architecture
 */
export const API_CONFIG = {
  // Layer 3: FastAPI Backend (Primary API)
  FASTAPI_URL: getEnv("API_URL", getEnv("FASTAPI_URL", "http://localhost:8000")),
  API_VERSION: "v1",

  // Timeouts
  TIMEOUT: 30000,
  UPLOAD_TIMEOUT: 120000,

  // Retry
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,

  // Layer 5: Storage URLs
  SUPABASE_URL: getEnv("SUPABASE_URL", ""),
  CDN_URL: getEnv("CDN_URL", ""),
  CLOUDFLARE_STREAM_URL: getEnv("CLOUDFLARE_STREAM_URL", ""),

  // Layer 9: Security
  AUTH_COOKIE_NAME: "mithas-auth-token",

  // Layer 10: Analytics
  POSTHOG_KEY: getEnv("POSTHOG_KEY", ""),
  SENTRY_DSN: getEnv("SENTRY_DSN", ""),

  // Layer 12: Payments
  RAZORPAY_KEY_ID: getEnv("RAZORPAY_KEY_ID", ""),
} as const

/**
 * API Endpoint Definitions
 * All FastAPI routes mapped here
 * NO Next.js /api routes
 */
export const ENDPOINTS = {
  // Authentication (via FastAPI, backed by Supabase Auth)
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    VERIFY_OTP: "/auth/verify-otp",
    SEND_OTP: "/auth/send-otp",
    ME: "/auth/me",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
  },

  // Products (Glow Shop)
  PRODUCTS: {
    LIST: "/products",
    DETAIL: (id: string) => `/products/${id}`,
    SEARCH: "/products/search",
    CATEGORIES: "/products/categories",
    FEATURED: "/products/featured",
    TRENDING: "/products/trending",
    RECOMMENDATIONS: "/products/recommendations",
    BY_SELLER: (sellerId: string) => `/sellers/${sellerId}/products`,
    REVIEWS: (id: string) => `/products/${id}/reviews`,
  },

  // Cart
  CART: {
    GET: "/cart",
    ADD: "/cart/items",
    UPDATE: (itemId: string) => `/cart/items/${itemId}`,
    REMOVE: (itemId: string) => `/cart/items/${itemId}`,
    CLEAR: "/cart",
    APPLY_COUPON: "/cart/coupon",
  },

  // Orders
  ORDERS: {
    LIST: "/orders",
    DETAIL: (id: string) => `/orders/${id}`,
    CREATE: "/orders",
    CANCEL: (id: string) => `/orders/${id}/cancel`,
    TRACK: (id: string) => `/orders/${id}/track`,
    REFUND: (id: string) => `/orders/${id}/refund`,
  },

  // Reels (Glow Reels) - via Cloudflare Stream
  REELS: {
    FEED: "/reels",
    FOR_YOU: "/reels/for-you",
    TRENDING: "/reels/trending",
    DETAIL: (id: string) => `/reels/${id}`,
    CREATE: "/reels",
    UPLOAD: "/reels/upload",
    LIKE: (id: string) => `/reels/${id}/like`,
    UNLIKE: (id: string) => `/reels/${id}/unlike`,
    SHARE: (id: string) => `/reels/${id}/share`,
    COMMENTS: (id: string) => `/reels/${id}/comments`,
    PRODUCTS: (id: string) => `/reels/${id}/products`,
  },

  // AI Engine (Layer 6) - via FastAPI + ML services
  AI: {
    SKIN_ANALYSIS: "/ai/skin-analysis",
    VIRTUAL_TRYON: "/ai/virtual-tryon",
    FACE_MESH: "/ai/face-mesh",
    STYLE_RECOMMENDATIONS: "/ai/style-recommendations",
    PERSONALIZED_FEED: "/ai/personalized-feed",
    CHAT: "/ai/chat",
    SIMILARITY_SEARCH: "/ai/similarity-search",
    VIRTUAL_PHOTOSHOOT: "/ai/virtual-photoshoot",
  },

  // Chat (Glow Chat) - via Supabase Realtime
  CHAT: {
    LIST: "/chats",
    DETAIL: (id: string) => `/chats/${id}`,
    MESSAGES: (id: string) => `/chats/${id}/messages`,
    SEND: (id: string) => `/chats/${id}/messages`,
    CREATE_VENDOR: "/chats/vendor",
    AI_STYLIST: "/chats/ai-stylist",
    MARK_READ: (id: string) => `/chats/${id}/read`,
  },

  // Booking (Google Calendar integration)
  BOOKING: {
    SALONS: "/booking/salons",
    SALON_DETAIL: (id: string) => `/booking/salons/${id}`,
    SERVICES: (salonId: string) => `/booking/salons/${salonId}/services`,
    SLOTS: (salonId: string) => `/booking/salons/${salonId}/slots`,
    CREATE: "/booking/create",
    MY_BOOKINGS: "/booking/my-bookings",
    CANCEL: (id: string) => `/booking/${id}/cancel`,
    RESCHEDULE: (id: string) => `/booking/${id}/reschedule`,
  },

  // Geo (PostGIS)
  GEO: {
    NEARBY_SALONS: "/geo/nearby-salons",
    NEARBY_DEALS: "/geo/nearby-deals",
    DIRECTIONS: "/geo/directions",
    SEARCH_LOCATION: "/geo/search",
  },

  // Payments (Razorpay)
  PAYMENTS: {
    CREATE_ORDER: "/payments/create-order",
    VERIFY: "/payments/verify",
    REFUND: "/payments/refund",
    METHODS: "/payments/methods",
    UPI_INTENT: "/payments/upi-intent",
  },

  // Wallet (GlowPay)
  WALLET: {
    BALANCE: "/wallet/balance",
    TRANSACTIONS: "/wallet/transactions",
    ADD_FUNDS: "/wallet/add-funds",
    PAY: "/wallet/pay",
    PAYOUT: "/wallet/payout",
    TRANSFER: "/wallet/transfer",
  },

  // User Profile
  USERS: {
    PROFILE: "/users/profile",
    UPDATE: "/users/profile",
    ADDRESSES: "/users/addresses",
    ADD_ADDRESS: "/users/addresses",
    DELETE_ADDRESS: (id: string) => `/users/addresses/${id}`,
    WISHLIST: "/users/wishlist",
    NOTIFICATIONS: "/users/notifications",
    PREFERENCES: "/users/preferences",
  },

  // Seller Dashboard
  SELLERS: {
    REGISTER: "/sellers/register",
    PROFILE: "/sellers/profile",
    DASHBOARD: "/sellers/dashboard",
    ANALYTICS: "/sellers/analytics",
    PRODUCTS: "/sellers/products",
    ADD_PRODUCT: "/sellers/products",
    UPDATE_PRODUCT: (id: string) => `/sellers/products/${id}`,
    DELETE_PRODUCT: (id: string) => `/sellers/products/${id}`,
    ORDERS: "/sellers/orders",
    UPDATE_ORDER: (id: string) => `/sellers/orders/${id}/status`,
    WALLET: "/sellers/wallet",
    PAYOUTS: "/sellers/payouts",
  },

  // Search (Meilisearch via FastAPI)
  SEARCH: {
    PRODUCTS: "/search/products",
    SELLERS: "/search/sellers",
    SALONS: "/search/salons",
    REELS: "/search/reels",
    SUGGESTIONS: "/search/suggestions",
    GLOBAL: "/search",
  },

  // Notifications (Firebase Cloud Messaging)
  NOTIFICATIONS: {
    LIST: "/notifications",
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: "/notifications/read-all",
    PREFERENCES: "/notifications/preferences",
    SUBSCRIBE_PUSH: "/notifications/subscribe",
  },

  // Reviews
  REVIEWS: {
    CREATE: "/reviews",
    PRODUCT: (productId: string) => `/products/${productId}/reviews`,
    SELLER: (sellerId: string) => `/sellers/${sellerId}/reviews`,
    HELPFUL: (id: string) => `/reviews/${id}/helpful`,
  },

  // Upload (Supabase Storage + Cloudflare R2)
  UPLOAD: {
    PRESIGNED: "/upload/presigned-url",
    DIRECT: "/upload",
    VIDEO: "/upload/video",
  },
} as const

/**
 * Build full API URL
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = API_CONFIG.FASTAPI_URL.replace(/\/$/, "")
  return `${baseUrl}/api/${API_CONFIG.API_VERSION}${endpoint}`
}

/**
 * Check if FastAPI is configured
 */
export function isBackendConfigured(): boolean {
  return API_CONFIG.FASTAPI_URL !== "http://localhost:8000" && API_CONFIG.FASTAPI_URL !== ""
}

export type ApiEndpoints = typeof ENDPOINTS
