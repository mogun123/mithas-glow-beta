/**
 * Search Service - Meilisearch Integration via FastAPI
 * Full-text and semantic search with autocomplete
 */

import { httpClient, type ApiResponse } from "@/lib/api/http-client"
import { ENDPOINTS } from "@/lib/api/config"
import { arcticConfig } from "@/lib/config/arctic"

// Types
export interface SearchResult<T> {
  hits: T[]
  totalHits: number
  processingTimeMs: number
  query: string
}

export interface ProductSearchHit {
  id: string
  name: string
  description: string
  price: number
  category: string
  brand: string
  image_url: string
  rating: number
  seller_id: string
  seller_name: string
  score?: number
}

export interface SellerSearchHit {
  id: string
  name: string
  description: string
  rating: number
  total_products: number
  image_url: string
  verified: boolean
  score?: number
}

export interface SalonSearchHit {
  id: string
  name: string
  address: string
  city: string
  rating: number
  image_url: string
  distance_km?: number
  score?: number
}

export interface ReelSearchHit {
  id: string
  caption: string
  thumbnail_url: string
  creator_name: string
  creator_avatar: string
  likes_count: number
  score?: number
}

export interface GlobalSearchResult {
  id: string
  type: "product" | "seller" | "salon" | "reel"
  title: string
  subtitle: string
  image_url?: string
  url: string
  score?: number
}

export interface SearchFilters {
  category?: string
  price_min?: number
  price_max?: number
  rating?: number
  brand?: string
  city?: string
  sort_by?: "relevance" | "price_asc" | "price_desc" | "rating" | "newest"
  types?: string[]
}

/**
 * Search Service using Meilisearch via FastAPI
 */
class SearchService {
  private meilisearchHost: string
  private isConfigured: boolean

  constructor() {
    this.meilisearchHost = arcticConfig.backend.search.meilisearch.host
    this.isConfigured = !!arcticConfig.backend.search.meilisearch.apiKey
  }

  /**
   * Search products
   */
  async searchProducts(
    query: string,
    filters?: SearchFilters,
    page = 1,
    limit = 20,
  ): Promise<ApiResponse<ProductSearchHit[]>> {
    return httpClient.get(ENDPOINTS.SEARCH.PRODUCTS, {
      params: {
        q: query,
        page,
        limit,
        ...filters,
      },
    })
  }

  /**
   * Search sellers
   */
  async searchSellers(query: string, page = 1, limit = 20): Promise<ApiResponse<SellerSearchHit[]>> {
    return httpClient.get(ENDPOINTS.SEARCH.SELLERS, {
      params: { q: query, page, limit },
    })
  }

  /**
   * Search salons with optional geo filtering
   */
  async searchSalons(
    query: string,
    options?: {
      city?: string
      lat?: number
      lng?: number
      radius_km?: number
      page?: number
      limit?: number
    },
  ): Promise<ApiResponse<SalonSearchHit[]>> {
    return httpClient.get(ENDPOINTS.SEARCH.SALONS, {
      params: { q: query, ...options },
    })
  }

  /**
   * Search reels
   */
  async searchReels(query: string, page = 1, limit = 20): Promise<ApiResponse<ReelSearchHit[]>> {
    return httpClient.get(ENDPOINTS.SEARCH.REELS, {
      params: { q: query, page, limit },
    })
  }

  /**
   * Global search across all types
   */
  async global(query: string, filters?: SearchFilters): Promise<ApiResponse<GlobalSearchResult[]>> {
    return httpClient.get(ENDPOINTS.SEARCH.GLOBAL, {
      params: {
        q: query,
        types: filters?.types?.join(","),
        ...filters,
      },
    })
  }

  /**
   * Get autocomplete suggestions
   */
  async suggestions(query: string, limit = 8): Promise<ApiResponse<string[]>> {
    return httpClient.get(ENDPOINTS.SEARCH.SUGGESTIONS, {
      params: { q: query, limit },
    })
  }

  /**
   * Get trending searches
   */
  async trending(): Promise<ApiResponse<string[]>> {
    return httpClient.get("/search/trending")
  }

  /**
   * Get search history for user
   */
  async getHistory(): Promise<ApiResponse<string[]>> {
    return httpClient.get("/search/history")
  }

  /**
   * Clear search history
   */
  async clearHistory(): Promise<ApiResponse<void>> {
    return httpClient.delete("/search/history")
  }

  /**
   * Semantic search using pgVector embeddings
   */
  async semanticSearch(query: string, type: "products" | "reels" = "products"): Promise<ApiResponse<any[]>> {
    return httpClient.post("/search/semantic", {
      query,
      type,
      limit: 20,
    })
  }

  /**
   * Visual similarity search (using AI embeddings)
   */
  async visualSearch(imageUrl: string): Promise<ApiResponse<ProductSearchHit[]>> {
    return httpClient.post("/search/visual", {
      image_url: imageUrl,
      limit: 20,
    })
  }
}

export const searchService = new SearchService()
export default searchService
