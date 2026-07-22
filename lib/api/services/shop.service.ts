/**
 * Shop Service - Glow Shop Integration
 * Products, Cart, Orders via FastAPI
 */

import { httpClient, type ApiResponse } from "../http-client"
import { ENDPOINTS } from "../config"

// Types
export interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number
  original_price?: number
  currency: string
  images: string[]
  category: string
  subcategory?: string
  seller_id: string
  seller?: {
    id: string
    shop_name: string
    is_verified: boolean
  }
  rating: number
  reviews_count: number
  stock: number
  is_active: boolean
  is_featured: boolean
  has_ar: boolean
  ar_model_url?: string
  tags: string[]
  variants?: ProductVariant[]
  created_at: string
}

export interface ProductVariant {
  id: string
  name: string
  price: number
  stock: number
  sku: string
  attributes: Record<string, string>
}

export interface Category {
  id: string
  name: string
  slug: string
  image_url: string
  subcategories: { id: string; name: string; slug: string }[]
  product_count: number
}

export interface CartItem {
  id: string
  product_id: string
  product: Product
  variant_id?: string
  variant?: ProductVariant
  quantity: number
  price: number
}

export interface Cart {
  items: CartItem[]
  subtotal: number
  discount: number
  shipping: number
  total: number
  coupon?: {
    code: string
    discount: number
  }
}

export interface ProductFilters {
  category?: string
  subcategory?: string
  gender?: "female" | "male" | "other"
  min_price?: number
  max_price?: number
  seller_id?: string
  tags?: string[]
  has_ar?: boolean
  is_featured?: boolean
  sort_by?: "newest" | "price_low" | "price_high" | "popular" | "rating"
  page?: number
  limit?: number
}

/**
 * Shop Service
 */
export const shopService = {
  // Products
  products: {
    list: (filters?: ProductFilters): Promise<ApiResponse<Product[]>> =>
      httpClient.get(ENDPOINTS.PRODUCTS.LIST, {
        params: {
          ...filters,
          tags: filters?.tags?.join(","),
        },
      }),

    get: (id: string): Promise<ApiResponse<Product>> => httpClient.get(ENDPOINTS.PRODUCTS.DETAIL(id)),

    search: (query: string, filters?: ProductFilters): Promise<ApiResponse<Product[]>> =>
      httpClient.get(ENDPOINTS.PRODUCTS.SEARCH, {
        params: { q: query, ...filters },
      }),

    featured: (limit?: number): Promise<ApiResponse<Product[]>> =>
      httpClient.get(ENDPOINTS.PRODUCTS.FEATURED, { params: { limit } }),

    trending: (limit?: number): Promise<ApiResponse<Product[]>> =>
      httpClient.get(ENDPOINTS.PRODUCTS.TRENDING, { params: { limit } }),

    recommendations: (params?: {
      product_id?: string
      limit?: number
    }): Promise<ApiResponse<Product[]>> => httpClient.get(ENDPOINTS.PRODUCTS.RECOMMENDATIONS, { params }),

    categories: (): Promise<ApiResponse<Category[]>> => httpClient.get(ENDPOINTS.PRODUCTS.CATEGORIES),

    reviews: (productId: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<Review[]>> =>
      httpClient.get(ENDPOINTS.PRODUCTS.REVIEWS(productId), { params }),
  },

  // Cart
  cart: {
    get: (): Promise<ApiResponse<Cart>> => httpClient.get(ENDPOINTS.CART.GET),

    addItem: (data: {
      product_id: string
      variant_id?: string
      quantity?: number
    }): Promise<ApiResponse<CartItem>> => httpClient.post(ENDPOINTS.CART.ADD, data),

    updateItem: (itemId: string, quantity: number): Promise<ApiResponse<CartItem>> =>
      httpClient.patch(ENDPOINTS.CART.UPDATE(itemId), { quantity }),

    removeItem: (itemId: string): Promise<ApiResponse<void>> => httpClient.delete(ENDPOINTS.CART.REMOVE(itemId)),

    clear: (): Promise<ApiResponse<void>> => httpClient.delete(ENDPOINTS.CART.CLEAR),

    applyCoupon: (code: string): Promise<ApiResponse<{ discount: number; message: string }>> =>
      httpClient.post(ENDPOINTS.CART.APPLY_COUPON, { code }),
  },

  // Orders
  orders: {
    list: (params?: {
      status?: string
      page?: number
      limit?: number
    }): Promise<ApiResponse<Order[]>> => httpClient.get(ENDPOINTS.ORDERS.LIST, { params }),

    get: (id: string): Promise<ApiResponse<Order>> => httpClient.get(ENDPOINTS.ORDERS.DETAIL(id)),

    create: (data: CreateOrderData): Promise<ApiResponse<Order>> => httpClient.post(ENDPOINTS.ORDERS.CREATE, data),

    cancel: (id: string, reason: string): Promise<ApiResponse<Order>> =>
      httpClient.post(ENDPOINTS.ORDERS.CANCEL(id), { reason }),

    track: (id: string): Promise<ApiResponse<OrderTracking>> => httpClient.get(ENDPOINTS.ORDERS.TRACK(id)),

    requestRefund: (id: string, reason: string): Promise<ApiResponse<void>> =>
      httpClient.post(ENDPOINTS.ORDERS.REFUND(id), { reason }),
  },
}

// Additional types
export interface Review {
  id: string
  user_id: string
  user: { id: string; username: string; avatar_url: string }
  rating: number
  title?: string
  comment: string
  images?: string[]
  helpful_count: number
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  buyer_id: string
  items: OrderItem[]
  subtotal: number
  discount: number
  shipping: number
  total: number
  currency: string
  status: OrderStatus
  shipping_address: Address
  billing_address?: Address
  payment_method: string
  payment_id?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  product_id: string
  product: Product
  variant_id?: string
  quantity: number
  price: number
  seller_id: string
}

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded"

export interface OrderTracking {
  order_id: string
  status: OrderStatus
  tracking_number?: string
  carrier?: string
  estimated_delivery?: string
  events: TrackingEvent[]
}

export interface TrackingEvent {
  status: string
  description: string
  location?: string
  timestamp: string
}

export interface Address {
  id?: string
  full_name: string
  phone: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  postal_code: string
  country: string
  is_default?: boolean
}

export interface CreateOrderData {
  shipping_address_id: string
  billing_address_id?: string
  payment_method: string
  notes?: string
  use_wallet_balance?: boolean
}

export default shopService
