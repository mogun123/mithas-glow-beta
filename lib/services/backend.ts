// Layer 3: Backend Core Service
// FastAPI Gateway - Main brain of MITHAS GLOW

import { config } from "@/lib/config/layers"

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  body?: unknown
  headers?: Record<string, string>
  token?: string
}

class BackendService {
  private baseUrl: string
  private apiVersion: string

  constructor() {
    this.baseUrl = config.backend.baseUrl
    this.apiVersion = config.backend.apiVersion
  }

  private getUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
    return `${this.baseUrl}/api/${this.apiVersion}${cleanEndpoint}`
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {}, token } = options

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    }

    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`
    }

    const response = await fetch(this.getUrl(endpoint), {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Glow Shop APIs
  shop = {
    getProducts: (params?: { category?: string; limit?: number; offset?: number }) =>
      this.request<{ products: Product[]; total: number }>("/shop/products", {
        method: "GET",
        body: params,
      }),

    getProduct: (id: string) => this.request<Product>(`/shop/products/${id}`),

    searchProducts: (query: string, filters?: ProductFilters) =>
      this.request<{ products: Product[]; total: number }>("/shop/search", {
        method: "POST",
        body: { query, filters },
      }),
  }

  // Glow Reels APIs
  reels = {
    getFeed: (params?: { limit?: number; offset?: number }) =>
      this.request<{ reels: Reel[]; hasMore: boolean }>("/reels/feed", {
        method: "GET",
        body: params,
      }),

    uploadReel: (data: FormData, token: string) =>
      this.request<Reel>("/reels/upload", {
        method: "POST",
        body: data,
        token,
      }),

    likeReel: (reelId: string, token: string) =>
      this.request<{ liked: boolean }>(`/reels/${reelId}/like`, {
        method: "POST",
        token,
      }),
  }

  // Glow AI APIs
  ai = {
    analyzeSkin: (imageBase64: string, token: string) =>
      this.request<SkinAnalysisResult>("/ai/skin-analysis", {
        method: "POST",
        body: { image: imageBase64 },
        token,
      }),

    tryOnMakeup: (imageBase64: string, makeupId: string, token: string) =>
      this.request<{ resultImage: string }>("/ai/makeup-tryon", {
        method: "POST",
        body: { image: imageBase64, makeup_id: makeupId },
        token,
      }),

    getRecommendations: (userId: string, token: string) =>
      this.request<{ products: Product[] }>("/ai/recommendations", {
        method: "GET",
        token,
      }),

    chatWithStylist: (message: string, conversationId: string, token: string) =>
      this.request<{ reply: string; suggestions: string[] }>("/ai/stylist-chat", {
        method: "POST",
        body: { message, conversation_id: conversationId },
        token,
      }),
  }

  // Booking APIs
  booking = {
    getAvailableSlots: (salonId: string, date: string) =>
      this.request<{ slots: TimeSlot[] }>(`/booking/slots/${salonId}`, {
        method: "GET",
        body: { date },
      }),

    createBooking: (data: BookingData, token: string) =>
      this.request<Booking>("/booking/create", {
        method: "POST",
        body: data,
        token,
      }),

    cancelBooking: (bookingId: string, token: string) =>
      this.request<{ cancelled: boolean }>(`/booking/${bookingId}/cancel`, {
        method: "POST",
        token,
      }),
  }

  // Wallet APIs
  wallet = {
    getBalance: (token: string) =>
      this.request<{ balance: number; currency: string }>("/wallet/balance", {
        method: "GET",
        token,
      }),

    getTransactions: (token: string, params?: { limit?: number; offset?: number }) =>
      this.request<{ transactions: Transaction[]; total: number }>("/wallet/transactions", {
        method: "GET",
        body: params,
        token,
      }),

    addFunds: (amount: number, paymentMethod: string, token: string) =>
      this.request<{ orderId: string }>("/wallet/add-funds", {
        method: "POST",
        body: { amount, payment_method: paymentMethod },
        token,
      }),
  }

  // Search APIs (Meilisearch/ElasticSearch)
  search = {
    global: (query: string, filters?: SearchFilters) =>
      this.request<SearchResults>("/search", {
        method: "POST",
        body: { query, filters },
      }),

    products: (query: string, filters?: ProductFilters) =>
      this.request<{ products: Product[]; total: number }>("/search/products", {
        method: "POST",
        body: { query, filters },
      }),

    salons: (query: string, location?: { lat: number; lng: number }) =>
      this.request<{ salons: Salon[]; total: number }>("/search/salons", {
        method: "POST",
        body: { query, location },
      }),
  }

  // Geo APIs (PostGIS)
  geo = {
    nearbySalons: (lat: number, lng: number, radiusKm = 10) =>
      this.request<{ salons: Salon[] }>("/geo/nearby-salons", {
        method: "GET",
        body: { lat, lng, radius_km: radiusKm },
      }),

    nearbyDeals: (lat: number, lng: number, radiusKm = 10) =>
      this.request<{ deals: Deal[] }>("/geo/nearby-deals", {
        method: "GET",
        body: { lat, lng, radius_km: radiusKm },
      }),
  }
}

// Types
interface Product {
  id: string
  name: string
  description: string
  price: number
  images: string[]
  category: string
  seller_id: string
  rating: number
  stock: number
}

interface ProductFilters {
  category?: string
  minPrice?: number
  maxPrice?: number
  rating?: number
  sortBy?: "price" | "rating" | "newest"
}

interface Reel {
  id: string
  video_url: string
  thumbnail_url: string
  caption: string
  user_id: string
  likes_count: number
  comments_count: number
  created_at: string
}

interface SkinAnalysisResult {
  skin_type: string
  skin_tone: string
  concerns: string[]
  recommendations: string[]
  confidence: number
}

interface TimeSlot {
  start: string
  end: string
  available: boolean
}

interface BookingData {
  salon_id: string
  service_id: string
  slot_start: string
  slot_end: string
  notes?: string
}

interface Booking {
  id: string
  salon_id: string
  service_id: string
  status: string
  slot_start: string
  slot_end: string
}

interface Transaction {
  id: string
  amount: number
  type: "credit" | "debit"
  description: string
  created_at: string
}

interface SearchFilters {
  type?: "products" | "salons" | "reels" | "users"
  category?: string
  location?: { lat: number; lng: number }
}

interface SearchResults {
  products?: Product[]
  salons?: Salon[]
  reels?: Reel[]
  total: number
}

interface Salon {
  id: string
  name: string
  address: string
  location: { lat: number; lng: number }
  rating: number
  services: string[]
  images: string[]
}

interface Deal {
  id: string
  title: string
  discount: number
  salon_id: string
  expires_at: string
}

export const backendService = new BackendService()
