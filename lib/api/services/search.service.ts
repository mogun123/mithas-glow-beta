/**
 * Search Service - Meilisearch Integration
 * Full-text search via FastAPI
 */

import { httpClient, type ApiResponse } from "../http-client"
import { ENDPOINTS } from "../config"
import type { Product } from "./shop.service"
import type { Reel } from "./reels.service"
import type { Salon } from "./booking.service"

// Types
export interface SearchResult<T> {
  hits: T[]
  query: string
  total: number
  processing_time_ms: number
  facets?: Record<string, Record<string, number>>
}

export interface SearchSuggestion {
  query: string
  type: "product" | "category" | "brand" | "trending"
  count?: number
}

export interface GlobalSearchResult {
  products: Product[]
  reels: Reel[]
  salons: Salon[]
  sellers: { id: string; shop_name: string; logo_url: string }[]
}

/**
 * Search Service
 */
export const searchService = {
  // Products
  searchProducts: (
    query: string,
    params?: {
      category?: string
      min_price?: number
      max_price?: number
      sort_by?: string
      page?: number
      limit?: number
    },
  ): Promise<ApiResponse<SearchResult<Product>>> =>
    httpClient.get(ENDPOINTS.SEARCH.PRODUCTS, { params: { q: query, ...params } }),

  // Sellers
  searchSellers: (
    query: string,
    params?: { page?: number; limit?: number },
  ): Promise<ApiResponse<SearchResult<{ id: string; shop_name: string; logo_url: string; rating: number }>>> =>
    httpClient.get(ENDPOINTS.SEARCH.SELLERS, { params: { q: query, ...params } }),

  // Salons
  searchSalons: (
    query: string,
    params?: { city?: string; page?: number; limit?: number },
  ): Promise<ApiResponse<SearchResult<Salon>>> =>
    httpClient.get(ENDPOINTS.SEARCH.SALONS, { params: { q: query, ...params } }),

  // Reels
  searchReels: (query: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<SearchResult<Reel>>> =>
    httpClient.get(ENDPOINTS.SEARCH.REELS, { params: { q: query, ...params } }),

  // Suggestions (autocomplete)
  getSuggestions: (query: string): Promise<ApiResponse<SearchSuggestion[]>> =>
    httpClient.get(ENDPOINTS.SEARCH.SUGGESTIONS, { params: { q: query } }),

  // Global Search
  globalSearch: (query: string, params?: { limit_per_type?: number }): Promise<ApiResponse<GlobalSearchResult>> =>
    httpClient.get(ENDPOINTS.SEARCH.GLOBAL, { params: { q: query, ...params } }),
}

export default searchService
