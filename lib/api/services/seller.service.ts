/**
 * Seller Service - Seller Dashboard Integration
 * Seller operations via FastAPI
 */

import { httpClient, type ApiResponse } from "../http-client"
import { ENDPOINTS } from "../config"
import type { Product, Order } from "./shop.service"
import type { WalletBalance, WalletTransaction, PayoutRequest } from "./wallet.service"

// Types
export interface SellerProfile {
  id: string
  user_id: string
  shop_name: string
  shop_slug: string
  shop_description: string
  shop_logo_url?: string
  shop_banner_url?: string
  business_registration_number?: string
  gst_number?: string
  is_verified: boolean
  verification_status: "pending" | "approved" | "rejected"
  rating: number
  reviews_count: number
  products_count: number
  followers_count: number
  created_at: string
}

export interface SellerDashboard {
  total_sales: number
  total_orders: number
  pending_orders: number
  completed_orders: number
  cancelled_orders: number
  wallet_balance: number
  pending_payout: number
  this_month_sales: number
  last_month_sales: number
  growth_percent: number
  top_products: Product[]
  recent_orders: Order[]
  sales_chart: { date: string; amount: number }[]
  totalSales?: number
  totalOrders?: number
  totalProducts?: number
  totalViews?: number
  topProducts?: { id: string; name: string; image: string; sold: number; revenue: number }[]
  recentOrders?: { id: string; status: string; created_at: string; items: number; total: number }[]
}

export interface SellerAnalytics {
  period: string
  total_revenue: number
  total_orders: number
  average_order_value: number
  conversion_rate: number
  top_products: { product: Product; sales: number; revenue: number }[]
  sales_by_category: { category: string; sales: number; revenue: number }[]
  traffic_sources: { source: string; visits: number; conversions: number }[]
  daily_stats: {
    date: string
    orders: number
    revenue: number
    visitors: number
  }[]
}

export interface CreateProductData {
  name: string
  description: string
  price: number
  original_price?: number
  category: string
  subcategory?: string
  images?: string[]
  stock: number
  sku?: string
  tags?: string[]
  has_ar?: boolean
  ar_model_url?: string
  variants?: {
    name: string
    price: number
    stock: number
    sku?: string
    attributes: Record<string, string>
  }[]
}

export interface SellerRegistrationData {
  shop_name: string
  shop_description?: string
  business_registration_number?: string
  gst_number?: string
  bank_account?: {
    account_number: string
    ifsc_code: string
    account_name: string
  }
}

/**
 * Seller Service
 */
export const sellerService = {
  // Registration & Profile
  register: (data: SellerRegistrationData): Promise<ApiResponse<SellerProfile>> =>
    httpClient.post(ENDPOINTS.SELLERS.REGISTER, data),

  getProfile: (): Promise<ApiResponse<SellerProfile>> => httpClient.get(ENDPOINTS.SELLERS.PROFILE),

  updateProfile: (data: Partial<SellerRegistrationData>): Promise<ApiResponse<SellerProfile>> =>
    httpClient.patch(ENDPOINTS.SELLERS.PROFILE, data),

  // Dashboard
  getDashboard: (): Promise<ApiResponse<SellerDashboard>> => httpClient.get(ENDPOINTS.SELLERS.DASHBOARD),

  getAnalytics: (params?: {
    period?: "7d" | "30d" | "90d" | "1y"
  }): Promise<ApiResponse<SellerAnalytics>> => httpClient.get(ENDPOINTS.SELLERS.ANALYTICS, { params }),

  // Products
  getProducts: (params?: {
    status?: "active" | "inactive" | "pending" | string
    page?: number
    limit?: number
  }): Promise<ApiResponse<Product[]>> => httpClient.get(ENDPOINTS.SELLERS.PRODUCTS, { params }),

  createProduct: (data: CreateProductData): Promise<ApiResponse<Product>> =>
    httpClient.post(ENDPOINTS.SELLERS.ADD_PRODUCT, data),

  updateProduct: (id: string, data: Partial<CreateProductData>): Promise<ApiResponse<Product>> =>
    httpClient.patch(ENDPOINTS.SELLERS.UPDATE_PRODUCT(id), data),

  deleteProduct: (id: string): Promise<ApiResponse<void>> => httpClient.delete(ENDPOINTS.SELLERS.DELETE_PRODUCT(id)),

  // Orders
  getOrders: (params?: {
    status?: string
    page?: number
    limit?: number
  }): Promise<ApiResponse<Order[]>> => httpClient.get(ENDPOINTS.SELLERS.ORDERS, { params }),

  updateOrderStatus: (
    orderId: string,
    data: { status: string; tracking_number?: string; carrier?: string },
  ): Promise<ApiResponse<Order>> => httpClient.patch(ENDPOINTS.SELLERS.UPDATE_ORDER(orderId), data),

  // Wallet & Payouts
  getWallet: (): Promise<ApiResponse<WalletBalance & { transactions: WalletTransaction[] }>> =>
    httpClient.get(ENDPOINTS.SELLERS.WALLET),

  getPayouts: (params?: {
    status?: string
    page?: number
    limit?: number
  }): Promise<ApiResponse<PayoutRequest[]>> => httpClient.get(ENDPOINTS.SELLERS.PAYOUTS, { params }),
}

export default sellerService
