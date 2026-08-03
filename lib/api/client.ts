/**
 * FastAPI Client Service
 * MITHAS GLOW - Arctic Layer 3 Integration
 *
 * This module provides a type-safe HTTP client for communicating with
 * the FastAPI backend as defined in the Arctic Layer architecture.
 */

// Environment configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || "v1"

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 30000

/**
 * API Error class for handling FastAPI errors
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = "APIError"
  }
}

/**
 * Request configuration options
 */
interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean | undefined>
  timeout?: number
  cache?: RequestCache
}

/**
 * Build query string from params object
 */
function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value))
    }
  })
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ""
}

/**
 * Get auth token from localStorage (client-side only)
 */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null

  try {
    const authData = localStorage.getItem("mithas-auth")
    if (authData) {
      const parsed = JSON.parse(authData)
      return parsed?.state?.session?.access_token || null
    }
  } catch {
    return null
  }
  return null
}

/**
 * Core fetch wrapper with error handling and timeout
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, params, timeout = REQUEST_TIMEOUT, cache = "no-store" } = options

  // Build full URL
  const queryString = params ? buildQueryString(params) : ""
  const url = `${API_BASE_URL}/api/${API_VERSION}${endpoint}${queryString}`

  // Set up abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  // Get auth token
  const token = getAuthToken()

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Client-Info": "mithas-glow-web",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache,
    })

    clearTimeout(timeoutId)

    // Parse response
    const data = await response.json().catch(() => null)

    // Handle error responses
    if (!response.ok) {
      throw new APIError(
        response.status,
        data?.message || data?.detail || `Request failed with status ${response.status}`,
        data,
      )
    }

    return data as T
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof APIError) {
      throw error
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new APIError(408, "Request timed out")
    }

    throw new APIError(500, "Network error occurred")
  }
}

// =====================================================
// API CLIENT METHODS - Arctic Layer 3 Endpoints
// =====================================================

/**
 * Authentication API
 */
export const authAPI = {
  /**
   * Register new user via FastAPI
   */
  register: (data: {
    email: string
    password: string
    ?: string
    phone?: string
    gender?: "female" | "male" | "other"
  }) =>
    request<{ user: unknown; token: string }>("/auth/register", {
      method: "POST",
      body: data,
    }),

  /**
   * Login user
   */
  login: (data: { email: string; password: string }) =>
    request<{ user: unknown; token: string; refresh_token: string }>("/auth/login", {
      method: "POST",
      body: data,
    }),

  /**
   * Refresh access token
   */
  refresh: (refreshToken: string) =>
    request<{ token: string }>("/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
    }),

  /**
   * Request OTP
   */
  requestOTP: (identifier: string, type: "email" | "phone") =>
    request<{ message: string }>("/auth/otp/request", {
      method: "POST",
      body: { identifier, type },
    }),

  /**
   * Verify OTP
   */
  verifyOTP: (identifier: string, otp: string) =>
    request<{ user: unknown; token: string }>("/auth/otp/verify", {
      method: "POST",
      body: { identifier, otp },
    }),

  /**
   * Get current user profile
   */
  me: () => request<{ user: unknown }>("/auth/me"),

  /**
   * Logout
   */
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),
}

/**
 * Products API - Arctic Layer 3 Product Engine
 */
export const productsAPI = {
  /**
   * Get all products with filters
   */
  list: (params?: {
    page?: number
    limit?: number
    category?: string
    subcategory?: string
    gender?: "female" | "male" | "other"
    min_price?: number
    max_price?: number
    sort_by?: string
    search?: string
    seller_id?: string
    featured?: boolean
    has_ar?: boolean
  }) =>
    request<{
      products: unknown[]
      total: number
      page: number
      pages: number
    }>("/products", { params }),

  /**
   * Get single product by ID or slug
   */
  get: (idOrSlug: string) => request<{ product: unknown }>(`/products/${idOrSlug}`),

  /**
   * Get product recommendations
   */
  recommendations: (productId: string, limit?: number) =>
    request<{ products: unknown[] }>(`/products/${productId}/recommendations`, {
      params: { limit },
    }),

  /**
   * Search products with AI-powered semantic search
   */
  search: (query: string, filters?: Record<string, unknown>) =>
    request<{ products: unknown[]; total: number }>("/products/search", {
      method: "POST",
      body: { query, ...filters },
    }),

  /**
   * Get trending products
   */
  trending: (limit?: number) => request<{ products: unknown[] }>("/products/trending", { params: { limit } }),

  /**
   * Get products as seen in reels
   */
  asSeenInReels: (limit?: number) => request<{ products: unknown[] }>("/products/reels", { params: { limit } }),
}

/**
 * Cart API
 */
export const cartAPI = {
  /**
   * Get user's cart
   */
  get: () => request<{ items: unknown[]; subtotal: number; count: number }>("/cart"),

  /**
   * Add item to cart
   */
  addItem: (data: {
    product_id: string
    variant_id?: string
    quantity?: number
  }) =>
    request<{ item: unknown }>("/cart/items", {
      method: "POST",
      body: data,
    }),

  /**
   * Update cart item quantity
   */
  updateItem: (itemId: string, quantity: number) =>
    request<{ item: unknown }>(`/cart/items/${itemId}`, {
      method: "PATCH",
      body: { quantity },
    }),

  /**
   * Remove item from cart
   */
  removeItem: (itemId: string) =>
    request<{ message: string }>(`/cart/items/${itemId}`, {
      method: "DELETE",
    }),

  /**
   * Clear cart
   */
  clear: () => request<{ message: string }>("/cart", { method: "DELETE" }),

  /**
   * Apply coupon
   */
  applyCoupon: (code: string) =>
    request<{ discount: number; message: string }>("/cart/coupon", {
      method: "POST",
      body: { code },
    }),
}

/**
 * Orders API
 */
export const ordersAPI = {
  /**
   * Get user's orders
   */
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    request<{ orders: unknown[]; total: number; page: number }>("/orders", { params }),

  /**
   * Get single order
   */
  get: (orderId: string) => request<{ order: unknown }>(`/orders/${orderId}`),

  /**
   * Create new order (checkout)
   */
  create: (data: {
    shipping_address_id: string
    billing_address_id?: string
    payment_method: string
    notes?: string
  }) =>
    request<{ order: unknown; payment_url?: string }>("/orders", {
      method: "POST",
      body: data,
    }),

  /**
   * Cancel order
   */
  cancel: (orderId: string, reason?: string) =>
    request<{ order: unknown }>(`/orders/${orderId}/cancel`, {
      method: "POST",
      body: { reason },
    }),

  /**
   * Track order
   */
  track: (orderId: string) => request<{ tracking: unknown }>(`/orders/${orderId}/tracking`),

  /**
   * Request refund
   */
  requestRefund: (orderId: string, reason: string) =>
    request<{ refund: unknown }>(`/orders/${orderId}/refund`, {
      method: "POST",
      body: { reason },
    }),
}

/**
 * Reels API - Arctic Layer 3 Video Engine
 */
export const reelsAPI = {
  /**
   * Get reels feed
   */
  feed: (params?: {
    page?: number
    limit?: number
    category?: string
    creator_id?: string
  }) => request<{ reels: unknown[]; total: number; page: number }>("/reels", { params }),

  /**
   * Get single reel
   */
  get: (reelId: string) => request<{ reel: unknown }>(`/reels/${reelId}`),

  /**
   * Create new reel
   */
  create: (data: {
    video_url: string
    thumbnail_url?: string
    caption?: string
    hashtags?: string[]
    tagged_products?: string[]
  }) =>
    request<{ reel: unknown }>("/reels", {
      method: "POST",
      body: data,
    }),

  /**
   * Like a reel
   */
  like: (reelId: string) => request<{ likes: number }>(`/reels/${reelId}/like`, { method: "POST" }),

  /**
   * Unlike a reel
   */
  unlike: (reelId: string) => request<{ likes: number }>(`/reels/${reelId}/unlike`, { method: "POST" }),

  /**
   * Share a reel
   */
  share: (reelId: string) => request<{ share_url: string }>(`/reels/${reelId}/share`, { method: "POST" }),

  /**
   * Get reel comments
   */
  comments: (reelId: string, params?: { page?: number; limit?: number }) =>
    request<{ comments: unknown[]; total: number }>(`/reels/${reelId}/comments`, { params }),

  /**
   * Add comment to reel
   */
  addComment: (reelId: string, content: string) =>
    request<{ comment: unknown }>(`/reels/${reelId}/comments`, {
      method: "POST",
      body: { content },
    }),
}

/**
 * AI Engine API - Arctic Layer 6 AI Services
 */
export const aiAPI = {
  /**
   * Analyze skin from image
   */
  analyzeSkin: (imageData: string) =>
    request<{
      skin_type: string
      concerns: string[]
      recommendations: unknown[]
      scores: Record<string, number>
    }>("/ai/skin-analysis", {
      method: "POST",
      body: { image: imageData },
    }),

  /**
   * Get personalized product recommendations
   */
  recommendations: (data: {
    skin_type?: string
    concerns?: string[]
    preferences?: Record<string, unknown>
  }) =>
    request<{ products: unknown[] }>("/ai/recommendations", {
      method: "POST",
      body: data,
    }),

  /**
   * AR Virtual try-on
   */
  virtualTryOn: (data: {
    product_id: string
    face_image: string
  }) =>
    request<{
      result_image: string
      overlay_data: unknown
    }>("/ai/virtual-tryon", {
      method: "POST",
      body: data,
    }),

  /**
   * Chat with AI Stylist
   */
  chatStylist: (message: string, context?: Record<string, unknown>) =>
    request<{
      response: string
      suggestions: unknown[]
      products?: unknown[]
    }>("/ai/stylist/chat", {
      method: "POST",
      body: { message, context },
    }),

  /**
   * Generate style recommendations
   */
  styleRecommendations: (data: {
    occasion?: string
    style_preferences?: string[]
    budget_range?: [number, number]
  }) =>
    request<{ outfits: unknown[]; tips: string[] }>("/ai/style-recommendations", {
      method: "POST",
      body: data,
    }),
}

/**
 * Chat API - Arctic Layer 3 Messaging Service
 */
export const chatAPI = {
  /**
   * Get user's chats
   */
  list: () => request<{ chats: unknown[] }>("/chats"),

  /**
   * Get chat messages
   */
  messages: (chatId: string, params?: { page?: number; limit?: number }) =>
    request<{ messages: unknown[]; total: number }>(`/chats/${chatId}/messages`, { params }),

  /**
   * Send message
   */
  sendMessage: (
    chatId: string,
    data: {
      content: string
      message_type?: string
      attachments?: unknown[]
    },
  ) =>
    request<{ message: unknown }>(`/chats/${chatId}/messages`, {
      method: "POST",
      body: data,
    }),

  /**
   * Create new chat with vendor
   */
  createVendorChat: (vendorId: string) =>
    request<{ chat: unknown }>("/chats/vendor", {
      method: "POST",
      body: { vendor_id: vendorId },
    }),

  /**
   * Mark messages as read
   */
  markRead: (chatId: string) => request<{ message: string }>(`/chats/${chatId}/read`, { method: "POST" }),
}

/**
 * Seller API - Arctic Layer 3 Seller Services
 */
export const sellerAPI = {
  /**
   * Get seller profile
   */
  profile: () => request<{ seller: unknown }>("/seller/profile"),

  /**
   * Register as seller
   */
  register: (data: {
    shop_name: string
    shop_type: string
    shop_description?: string
    business_registration_number?: string
    gst_number?: string
  }) =>
    request<{ seller: unknown }>("/seller/register", {
      method: "POST",
      body: data,
    }),

  /**
   * Update seller profile
   */
  updateProfile: (data: Record<string, unknown>) =>
    request<{ seller: unknown }>("/seller/profile", {
      method: "PATCH",
      body: data,
    }),

  /**
   * Get seller analytics
   */
  analytics: (params?: { period?: string }) =>
    request<{
      daily_sales: number
      total_orders: number
      views_today: number
      wallet_balance: number
      sales_chart: unknown[]
      top_products: unknown[]
    }>("/seller/analytics", { params }),

  /**
   * Get seller orders
   */
  orders: (params?: { page?: number; limit?: number; status?: string }) =>
    request<{ orders: unknown[]; total: number }>("/seller/orders", { params }),

  /**
   * Update order status
   */
  updateOrderStatus: (orderId: string, status: string, trackingNumber?: string) =>
    request<{ order: unknown }>(`/seller/orders/${orderId}/status`, {
      method: "PATCH",
      body: { status, tracking_number: trackingNumber },
    }),

  /**
   * Create product
   */
  createProduct: (data: Record<string, unknown>) =>
    request<{ product: unknown }>("/seller/products", {
      method: "POST",
      body: data,
    }),

  /**
   * Update product
   */
  updateProduct: (productId: string, data: Record<string, unknown>) =>
    request<{ product: unknown }>(`/seller/products/${productId}`, {
      method: "PATCH",
      body: data,
    }),

  /**
   * Delete product
   */
  deleteProduct: (productId: string) =>
    request<{ message: string }>(`/seller/products/${productId}`, {
      method: "DELETE",
    }),

  /**
   * Get seller products
   */
  products: (params?: { page?: number; limit?: number; status?: string }) =>
    request<{ products: unknown[]; total: number }>("/seller/products", { params }),
}

/**
 * Notifications API
 */
export const notificationsAPI = {
  /**
   * Get user notifications
   */
  list: (params?: { page?: number; limit?: number; unread_only?: boolean }) =>
    request<{ notifications: unknown[]; total: number; unread: number }>("/notifications", { params }),

  /**
   * Mark notification as read
   */
  markRead: (notificationId: string) =>
    request<{ message: string }>(`/notifications/${notificationId}/read`, { method: "POST" }),

  /**
   * Mark all as read
   */
  markAllRead: () => request<{ message: string }>("/notifications/read-all", { method: "POST" }),

  /**
   * Update notification preferences
   */
  updatePreferences: (preferences: Record<string, boolean>) =>
    request<{ preferences: Record<string, boolean> }>("/notifications/preferences", {
      method: "PUT",
      body: preferences,
    }),
}

/**
 * Reviews API
 */
export const reviewsAPI = {
  /**
   * Get product reviews
   */
  productReviews: (productId: string, params?: { page?: number; limit?: number }) =>
    request<{ reviews: unknown[]; total: number; average: number }>(`/products/${productId}/reviews`, { params }),

  /**
   * Create review
   */
  create: (data: {
    product_id?: string
    seller_id?: string
    order_id?: string
    rating: number
    title?: string
    comment?: string
    images?: string[]
  }) =>
    request<{ review: unknown }>("/reviews", {
      method: "POST",
      body: data,
    }),

  /**
   * Mark review as helpful
   */
  markHelpful: (reviewId: string) =>
    request<{ helpful_count: number }>(`/reviews/${reviewId}/helpful`, { method: "POST" }),
}

/**
 * File Upload API
 */
export const uploadAPI = {
  /**
   * Get presigned upload URL
   */
  getUploadUrl: (data: {
    filename: string
    content_type: string
    bucket?: string
  }) =>
    request<{ upload_url: string; file_url: string }>("/upload/presigned-url", {
      method: "POST",
      body: data,
    }),

  /**
   * Upload file directly
   */
  upload: async (file: File, bucket?: string) => {
    const formData = new FormData()
    formData.append("file", file)
    if (bucket) formData.append("bucket", bucket)

    const token = getAuthToken()

    const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/upload`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new APIError(response.status, error.message || "Upload failed")
    }

    return response.json() as Promise<{ file_url: string; file_id: string }>
  },
}

// Export unified API client
export const api = {
  auth: authAPI,
  products: productsAPI,
  cart: cartAPI,
  orders: ordersAPI,
  reels: reelsAPI,
  ai: aiAPI,
  chat: chatAPI,
  seller: sellerAPI,
  notifications: notificationsAPI,
  reviews: reviewsAPI,
  upload: uploadAPI,
}

export default api
