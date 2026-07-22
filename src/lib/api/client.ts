/**

 * FastAPI HTTP Client

 * MITHAS GLOW - Centralized API client with interceptors

 */



import { API_CONFIG, getApiUrl } from "./config"

import { useAuthStore } from "../store"



// Request/Response types

export interface ApiResponse<T = unknown> {

  data: T

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

}



// Token refresh state

let isRefreshing = false

let refreshSubscribers: Array<(token: string) => void> = []



const subscribeTokenRefresh = (callback: (token: string) => void) => {

  refreshSubscribers.push(callback)

}



const onTokenRefreshed = (token: string) => {

  refreshSubscribers.forEach((callback) => callback(token))

  refreshSubscribers = []

}



// Build URL with query params

const buildUrl = (endpoint: string, params?: Record<string, string | number | boolean | undefined>): string => {

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



// Get auth token from store

const getAuthToken = (): string | null => {

  const session = useAuthStore.getState().session

  return session?.access_token || null

}



// Create base headers

const createHeaders = (customHeaders?: Record<string, string>): HeadersInit => {

  const headers: Record<string, string> = {

    "Content-Type": "application/json",

    "X-Client-Info": "mithas-glow-web",

    "X-Request-Id": crypto.randomUUID(),

    ...customHeaders,

  }



  const token = getAuthToken()

  if (token) {

    headers["Authorization"] = `Bearer ${token}`

  }



  return headers

}



// Handle response\

const handleResponse = async <T>(response: Response)

: Promise<ApiResponse<T>> =>

{

  if (!response.ok) {

    const error: ApiError = {

      status: response.status,

      message: response.statusText,

    }



    try {

      const errorData = await response.json()

      error.message = errorData.detail || errorData.message || response.statusText

      error.code = errorData.code

      error.details = errorData

    } catch {

      // Use default error message

    }



    // Handle 401 - attempt token refresh

    if (response.status === 401) {

      const refreshed = await attemptTokenRefresh()

      if (!refreshed) {

        useAuthStore.getState().logout()

      }

    }



    throw error

  }



  const data = await response.json()

  return {

    data: data.data ?? data,

    success: true,

    message: data.message,

    meta: data.meta,

  };

}



// Token refresh logic

const attemptTokenRefresh = async (): Promise<boolean> => {

  if (isRefreshing) {

    return new Promise((resolve) => {

      subscribeTokenRefresh((token) => {

        resolve(!!token)

      })

    })

  }



  isRefreshing = true



  try {

    const session = useAuthStore.getState().session

    if (!session?.refresh_token) {

      return false

    }



    const response = await fetch(getApiUrl("/auth/refresh"), {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ refresh_token: session.refresh_token }),

    })



    if (!response.ok) {

      return false

    }



    const data = await response.json()

    useAuthStore.getState().setSession(data.session)

    onTokenRefreshed(data.session.access_token)

    return true

  } catch {

    return false

  } finally {

    isRefreshing = false

  }

}



// Retry logic with exponential backoff
const withRetry = async <T>(
  fn: () => Promise<T>,
  retries: number = API_CONFIG.MAX_RETRIES,
  delay: number = API_CONFIG.RETRY_DELAY
): Promise<T> => {
  try {
    return await fn();

  } catch (error) {

    const apiError = error as ApiError



    // Don't retry client errors (4xx) except 429 (rate limit)

    if (apiError.status >= 400 && apiError.status < 500 && apiError.status !== 429) {

      throw error

    }



    if (retries === 0) {

      throw error

    }



    await new Promise((resolve) => setTimeout(resolve, delay))

    return withRetry(fn, retries - 1, delay * 2);

  }

}



/**

 * FastAPI Client

 * Core HTTP methods for API communication

 */

export const apiClient = {

  /**

   * GET request

   */

  get: async <T = unknown>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> => {

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

  post: async <T = unknown>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> => {

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

  put: async <T = unknown>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> => {

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

  patch: async <T = unknown>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> => {

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

  delete: async <T = unknown>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> => {

    const url = buildUrl(endpoint, config?.params)



    const controller = new AbortController()

    const timeoutId = setTimeout(() => controller.abort(), config?.timeout || API_CONFIG.TIMEOUT)



    try {

      const response = await withRetry(() =>

        fetch(url, {

          method: "DELETE",

          headers: createHeaders(config?.headers),

          signal: config?.signal || controller.signal,

        }),

      )

      return handleResponse<T>(response)

    } finally {

      clearTimeout(timeoutId)

    }

  },



  /**

   * Upload file with multipart/form-data

   */

  upload: async <T = unknown>(

    endpoint: string,

    formData: FormData,

    config?: RequestConfig & { onProgress?: (progress: number) => void },

  ): Promise<ApiResponse<T>> => {

    const url = buildUrl(endpoint, config?.params)



    const headers: Record<string, string> = {

      "X-Client-Info": "mithas-glow-web",

      "X-Request-Id": crypto.randomUUID(),

      ...config?.headers,

    }



    const token = getAuthToken()

    if (token) {

      headers["Authorization"] = `Bearer ${token}`

    }



    // Don't set Content-Type - let browser set it with boundary

    const controller = new AbortController()

    const timeoutId = setTimeout(() => controller.abort(), config?.timeout || API_CONFIG.UPLOAD_TIMEOUT)



    try {

      const response = await fetch(url, {

        method: "POST",

        headers,

        body: formData,

        signal: config?.signal || controller.signal,

      })

      return handleResponse<T>(response)

    } finally {

      clearTimeout(timeoutId)

    }

  },

}



export default apiClient

