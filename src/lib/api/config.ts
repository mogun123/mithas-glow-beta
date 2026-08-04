/**
 * API Configuration
 * MITHAS GLOW - FastAPI Backend Integration (Arctic Layer 3)
 */

// Environment variables for Next.js / Vite compatibility
const getEnvVar = (key: string, fallback = ""): string => {
  // Next.js
  if (typeof process !== "undefined" && process.env) {
    const nextVar = process.env[`NEXT_PUBLIC_${key}`] || process.env[key]
    if (nextVar) return nextVar
  }
  // Vite
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const viteVar = (import.meta.env as Record<string, string>)[`VITE_${key}`]
    if (viteVar) return viteVar
  }
  return fallback
}

export const API_CONFIG = {
  // FastAPI Backend URL (Arctic Layer 3)
  FASTAPI_URL: getEnvVar("FASTAPI_URL", "http://localhost:8000"),

  // API Version
  API_VERSION: "v1",

  // Timeout settings (ms)
  TIMEOUT: 30000,
  UPLOAD_TIMEOUT: 120000,

  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,

  // Cache TTL (seconds)
  CACHE_TTL: {
    PRODUCTS: 300, // 5 minutes
    CATEGORIES: 3600, // 1 hour
    USER_DATA: 60, // 1 minute
    AI_RESULTS: 1800, // 30 minutes
  },
} as const

// API Endpoints mapping to Arctic Layer 3 services
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    VERIFY_OTP: "/auth/verify-otp",
    SEND_OTP: "/auth/send-otp",
  },

  // Product endpoints
  PRODUCTS: {
    LIST: "/products",
    DETAIL: (id: string) => `/products/${id}`,
    SEARCH: "/products/search",
    CATEGORIES: "/products/categories",
    RECOMMENDATIONS: "/products/recommendations",
    FEATURED: "/products/featured",
    BY_SELLER: (sellerId: string) => `/sellers/${sellerId}/products`,
  },

  // AI Engine endpoints (Arctic Layer 6)
  AI: {
    SKIN_ANALYSIS: "/ai/skin-analysis",
    AR_TRYON: "/ai/ar-tryon",
    STYLE_RECOMMENDATIONS: "/ai/style-recommendations",
    PERSONALIZED_FEED: "/ai/personalized-feed",
    SIMILARITY_SEARCH: "/ai/similarity-search",
  },

  // Reels endpoints
  REELS: {
    LIST: "/reels",
    DETAIL: (id: string) => `/reels/${id}`,
    CREATE: "/reels",
    LIKE: (id: string) => `/reels/${id}/like`,
    SHARE: (id: string) => `/reels/${id}/share`,
    COMMENTS: (id: string) => `/reels/${id}/comments`,
    FOR_YOU: "/reels/for-you",
    TRENDING: "/reels/trending",
  },

  // Chat endpoints
  CHAT: {
    LIST: "/chats",
    DETAIL: (id: string) => `/chats/${id}`,
    MESSAGES: (chatId: string) => `/chats/${chatId}/messages`,
    AI_STYLIST: "/chats/ai-stylist",
    VENDOR_DM: "/chats/vendor",
  },

  // Order endpoints
  ORDERS: {
    LIST: "/orders",
    DETAIL: (id: string) => `/orders/${id}`,
    CREATE: "/orders",
    CANCEL: (id: string) => `/orders/${id}/cancel`,
    TRACK: (id: string) => `/orders/${id}/track`,
  },

  // Payment endpoints (Arctic Layer 3 - Payments Service)
  PAYMENTS: {
    CREATE_ORDER: "/payments/create-order",
    VERIFY: "/payments/verify",
    REFUND: "/payments/refund",
    METHODS: "/payments/methods",
    UPI_INTENT: "/payments/upi-intent",
  },

  // Seller endpoints
  SELLERS: {
    PROFILE: (id: string) => `/sellers/${id}`,
    DASHBOARD: "/sellers/dashboard",
    ANALYTICS: "/sellers/analytics",
    PRODUCTS: "/sellers/products",
    ORDERS: "/sellers/orders",
    WALLET: "/sellers/wallet",
  },

  // User profile endpoints
  USERS: {
    PROFILE: "/users/profile",
    UPDATE: "/users/profile",
    ADDRESSES: "/users/addresses",
    WISHLIST: "/users/wishlist",
    NOTIFICATIONS: "/users/notifications",
  },

  // Search endpoints (Arctic Layer 3 - Search Service)
  SEARCH: {
    PRODUCTS: "/search/products",
    SELLERS: "/search/sellers",
    REELS: "/search/reels",
    SUGGESTIONS: "/search/suggestions",
  },
} as const

// Helper to get full API URL
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.FASTAPI_URL.replace(/\/$/, "")
  const version = API_CONFIG.API_VERSION
  return `${baseUrl}/api/${version}${endpoint}`
}

// Check if API is configured
export const isApiConfigured = (): boolean => {
  return API_CONFIG.FASTAPI_URL !== "http://localhost:8000" && API_CONFIG.FASTAPI_URL !== ""
}

export default API_CONFIG
