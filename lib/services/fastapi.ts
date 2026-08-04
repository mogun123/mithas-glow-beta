/**
 * FastAPI Service
 * Direct FastAPI client for data fetching
 * Replaces Next.js API routes
 */

import { getApiUrl, arcticConfig } from "@/lib/config/arctic"

export interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
  timeout?: number
}

export interface ApiResponse<T> {
  data: T | null
  success: boolean
  error?: string
  message?: string
  meta?: {
    page?: number
    limit?: number
    total?: number
    hasMore?: boolean
  }
}

/**
 * Build URL with query params
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(getApiUrl(endpoint))

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  return url.toString()
}

/**
 * FastAPI fetch wrapper
 * For use in Server Components and Route Handlers
 */
export async function fastapiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<ApiResponse<T>> {
  const { params, timeout = arcticConfig.backend.timeout, ...fetchOptions } = options

  const url = buildUrl(endpoint, params)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        "X-Client-Info": "mithas-glow-web",
        ...fetchOptions.headers,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return {
        data: null,
        success: false,
        error: data?.detail || data?.message || `Request failed with status ${response.status}`,
      }
    }

    return {
      data: data?.data ?? data,
      success: true,
      message: data?.message,
      meta: data?.meta,
    }
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error && error.name === "AbortError") {
      return { data: null, success: false, error: "Request timeout" }
    }

    return {
      data: null,
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    }
  }
}

/**
 * Product fetching functions for Server Components
 */
export const serverProducts = {
  list: (filters?: {
    category?: string
    search?: string
    page?: number
    limit?: number
    featured?: boolean
  }) =>
    fastapiFetch<any[]>("/products", {
      params: filters,
      next: { revalidate: 60 },
    }),

  get: (id: string) =>
    fastapiFetch<any>(`/products/${id}`, {
      next: { revalidate: 60 },
    }),

  featured: (limit = 8) =>
    fastapiFetch<any[]>("/products/featured", {
      params: { limit },
      next: { revalidate: 300 },
    }),

  trending: (limit = 8) =>
    fastapiFetch<any[]>("/products/trending", {
      params: { limit },
      next: { revalidate: 300 },
    }),

  categories: () =>
    fastapiFetch<any[]>("/products/categories", {
      next: { revalidate: 3600 },
    }),
}

/**
 * Reels fetching for Server Components
 */
export const serverReels = {
  feed: (params?: { page?: number; limit?: number }) =>
    fastapiFetch<any[]>("/reels", {
      params,
      next: { revalidate: 30 },
    }),

  trending: (limit = 6) =>
    fastapiFetch<any[]>("/reels/trending", {
      params: { limit },
      next: { revalidate: 60 },
    }),

  get: (id: string) =>
    fastapiFetch<any>(`/reels/${id}`, {
      next: { revalidate: 30 },
    }),
}

/**
 * Search functions
 */
export const serverSearch = {
  products: (query: string, filters?: Record<string, any>) =>
    fastapiFetch<any[]>("/search/products", {
      params: { q: query, ...filters },
    }),

  suggestions: (query: string) =>
    fastapiFetch<string[]>("/search/suggestions", {
      params: { q: query },
    }),
}

/**
 * Booking functions
 */
export const serverBooking = {
  salons: (params?: { lat?: number; lng?: number; radius?: number }) =>
    fastapiFetch<any[]>("/booking/salons", {
      params,
      next: { revalidate: 300 },
    }),

  salon: (id: string) =>
    fastapiFetch<any>(`/booking/salons/${id}`, {
      next: { revalidate: 300 },
    }),
}

export default {
  fetch: fastapiFetch,
  products: serverProducts,
  reels: serverReels,
  search: serverSearch,
  booking: serverBooking,
}
