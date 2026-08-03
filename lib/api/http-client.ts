/**
 * MITHAS GLOW - HTTP Client
 * Unified fetch wrapper for FastAPI communication
 */

import { API_CONFIG, getApiUrl } from "./config"

// Response types
export interface ApiResponse<T = unknown> {
  data: T | null
  success: boolean
  message?: string
  error?: string
  meta?: {
    page?: number
    limit?: number
    total?: number
    hasMore?: boolean
  }
}

export interface ApiError {
  status: number
  message: string
  code?: string
  details?: Record<string, unknown>
}

export interface RequestConfig {
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean | undefined>
  timeout?: number
  signal?: AbortSignal
  cache?: RequestCache
  credentials?: RequestCredentials
}

/**
 * Build URL with query parameters
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
 * Get auth token from cookie (works server & client)
 */
function getAuthToken(): string | null {
  if (typeof document === "undefined") return null

  const cookies = document.cookie.split(";")
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=")
    if (name === API_CONFIG.AUTH_COOKIE_NAME) {
      return decodeURIComponent(value)
    }
  }
  return null
}

/**
 * Create request headers
 */
function createHeaders(customHeaders?: Record<string, string>): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Client-Info": "mithas-glow-web",
    ...customHeaders,
  }

  const token = getAuthToken()
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  return headers
}

/**
 * Handle API response
 */
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get("content-type")

  let data: unknown = null
  if (contentType?.includes("application/json")) {
    try {
      data = await response.json()
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    const error: ApiError = {
      status: response.status,
      message:
        (data as Record<string, string>)?.detail || (data as Record<string, string>)?.message || response.statusText,
      code: (data as Record<string, string>)?.code,
      details: data as Record<string, unknown>,
    }
    throw error
  }

  // Normalize response shape
  const responseData = data as Record<string, unknown>
  return {
    data: (responseData?.data ?? responseData) as T,
    success: true,
    message: responseData?.message as string,
    meta: responseData?.meta as ApiResponse<T>["meta"],
  }
}

/**
 * Retry with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = API_CONFIG.MAX_RETRIES,
  delay: number = API_CONFIG.RETRY_DELAY,
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    const apiError = error as ApiError

    // Don't retry client errors except rate limiting
    if (apiError.status >= 400 && apiError.status < 500 && apiError.status !== 429) {
      throw error
    }

    if (retries === 0) throw error

    await new Promise((resolve) => setTimeout(resolve, delay))
    return withRetry(fn, retries - 1, delay * 2)
  }
}

/**
 * HTTP Client for FastAPI Backend
 */
export const httpClient = {
  /**
   * GET request
   */
  async get<T = unknown>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint, config?.params)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config?.timeout || API_CONFIG.TIMEOUT)

    try {
      const response = await withRetry(() =>
        fetch(url, {
          method: "GET",
          headers: createHeaders(config?.headers),
          signal: config?.signal || controller.signal,
          cache: config?.cache,
          credentials: config?.credentials || "include",
        }),
      )
      return handleResponse<T>(response)
    } finally {
      clearTimeout(timeoutId)
    }
  },

  /**
   * POST request
   */
  async post<T = unknown>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint, config?.params)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config?.timeout || API_CONFIG.TIMEOUT)

    try {
      const response = await withRetry(() =>
        fetch(url, {
          method: "POST",
          headers: createHeaders(config?.headers),
          body: body ? JSON.stringify(body) : undefined,
          signal: config?.signal || controller.signal,
          credentials: config?.credentials || "include",
        }),
      )
      return handleResponse<T>(response)
    } finally {
      clearTimeout(timeoutId)
    }
  },

  /**
   * PUT request
   */
  async put<T = unknown>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint, config?.params)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config?.timeout || API_CONFIG.TIMEOUT)

    try {
      const response = await withRetry(() =>
        fetch(url, {
          method: "PUT",
          headers: createHeaders(config?.headers),
          body: body ? JSON.stringify(body) : undefined,
          signal: config?.signal || controller.signal,
          credentials: config?.credentials || "include",
        }),
      )
      return handleResponse<T>(response)
    } finally {
      clearTimeout(timeoutId)
    }
  },

  /**
   * PATCH request
   */
  async patch<T = unknown>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint, config?.params)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config?.timeout || API_CONFIG.TIMEOUT)

    try {
      const response = await withRetry(() =>
        fetch(url, {
          method: "PATCH",
          headers: createHeaders(config?.headers),
          body: body ? JSON.stringify(body) : undefined,
          signal: config?.signal || controller.signal,
          credentials: config?.credentials || "include",
        }),
      )
      return handleResponse<T>(response)
    } finally {
      clearTimeout(timeoutId)
    }
  },

  /**
   * DELETE request
   */
  async delete<T = unknown>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint, config?.params)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config?.timeout || API_CONFIG.TIMEOUT)

    try {
      const response = await withRetry(() =>
        fetch(url, {
          method: "DELETE",
          headers: createHeaders(config?.headers),
          signal: config?.signal || controller.signal,
          credentials: config?.credentials || "include",
        }),
      )
      return handleResponse<T>(response)
    } finally {
      clearTimeout(timeoutId)
    }
  },

  /**
   * Upload file (multipart/form-data)
   */
  async upload<T = unknown>(endpoint: string, formData: FormData, config?: RequestConfig): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint, config?.params)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config?.timeout || API_CONFIG.UPLOAD_TIMEOUT)

    // Don't set Content-Type for FormData - browser handles it
    const headers: Record<string, string> = {
      "X-Client-Info": "mithas-glow-web",
      ...config?.headers,
    }

    const token = getAuthToken()
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
        signal: config?.signal || controller.signal,
        credentials: config?.credentials || "include",
      })
      return handleResponse<T>(response)
    } finally {
      clearTimeout(timeoutId)
    }
  },
}

export default httpClient
