/**
 * AI Service - Arctic Layer 6 Integration
 * Skin Analysis, AR Try-On, AI Chat, Recommendations
 */

import { httpClient, type ApiResponse } from "../http-client"
import { ENDPOINTS } from "../config"

// Types
export interface SkinAnalysisResult {
  analysis_id: string
  skin_type: "dry" | "oily" | "combination" | "normal" | "sensitive"
  skinType?: string
  skin_tone: string
  undertone: "warm" | "cool" | "neutral"
  concerns: string[]
  scores: {
    hydration: number
    texture: number
    pores: number
    dark_spots: number
    wrinkles: number
    overall: number
  }
  overallScore?: number
  metrics?: { name: string; score: number; status: string }[]
  recommendations: ProductRecommendation[] | string[]
  routine: SkincareRoutine
  confidence: number
}

export interface ProductRecommendation {
  product_id: string
  name: string
  image: string
  price: number
  match_score: number
  reason: string
  category: string
}

export interface SkincareRoutine {
  morning: RoutineStep[]
  evening: RoutineStep[]
}

export interface RoutineStep {
  step: number
  type: string
  product?: ProductRecommendation
  instructions: string
}

export interface ARTryOnResult {
  session_id: string
  product_id: string
  processed_image_url: string
  resultImage?: string
  overlay_data: {
    landmarks: number[][]
    mask_url?: string
  }
  confidence: number
}

export interface FaceMeshResult {
  session_id: string
  landmarks: number[][]
  face_oval: number[][]
  features: {
    eyes: number[][]
    nose: number[][]
    lips: number[][]
    eyebrows: number[][]
  }
}

export interface StyleRecommendation {
  style_id: string
  name: string
  description: string
  occasion: string
  season: string
  products: ProductRecommendation[]
  total_price: number
  image_url: string
}

export interface AIChatMessage {
  role: "user" | "assistant"
  content: string
  products?: ProductRecommendation[]
  suggestions?: string[]
  timestamp: string
}

export interface VirtualPhotoshootResult {
  session_id: string
  images: {
    url: string
    prompt: string
    style: string
  }[]
}

/**
 * AI Service
 */
export const aiService = {
  // Skin Analysis (MediaPipe + TFLite)
  analyzeSkin: (image: File): Promise<ApiResponse<SkinAnalysisResult>> => {
    const formData = new FormData()
    formData.append("image", image)
    return httpClient.upload(ENDPOINTS.AI.SKIN_ANALYSIS, formData)
  },

  // AR Virtual Try-On (TensorFlow Lite)
  virtualTryOn: (data: {
    product_id: string
    user_image: File
  }): Promise<ApiResponse<ARTryOnResult>> => {
    const formData = new FormData()
    formData.append("product_id", data.product_id)
    formData.append("user_image", data.user_image)
    return httpClient.upload(ENDPOINTS.AI.VIRTUAL_TRYON, formData)
  },

  // Face Mesh (MediaPipe)
  getFaceMesh: (image: File): Promise<ApiResponse<FaceMeshResult>> => {
    const formData = new FormData()
    formData.append("image", image)
    return httpClient.upload(ENDPOINTS.AI.FACE_MESH, formData)
  },

  // Style Recommendations
  getStyleRecommendations: (params?: {
    occasion?: string
    season?: string
    budget_min?: number
    budget_max?: number
    preferences?: string[]
  }): Promise<ApiResponse<StyleRecommendation[]>> =>
    httpClient.get(ENDPOINTS.AI.STYLE_RECOMMENDATIONS, {
      params: {
        ...params,
        preferences: params?.preferences?.join(","),
      },
    }),

  // Personalized Feed (ML Recommendations)
  getPersonalizedFeed: (params?: {
    page?: number
    limit?: number
    include_types?: string[]
  }): Promise<
    ApiResponse<
      {
        type: "product" | "reel" | "style" | "deal"
        item_id: string
        score: number
        data: unknown
      }[]
    >
  > =>
    httpClient.get(ENDPOINTS.AI.PERSONALIZED_FEED, {
      params: {
        ...params,
        include_types: params?.include_types?.join(","),
      },
    }),

  // AI Stylist Chat
  chat: (
    message: string,
    context?: {
      skin_profile?: {
        skin_type: string
        concerns: string[]
      }
      preferences?: string[]
      history?: AIChatMessage[]
    },
  ): Promise<ApiResponse<AIChatMessage>> => httpClient.post(ENDPOINTS.AI.CHAT, { message, context }),

  // Visual Similarity Search (pgVector)
  searchBySimilarity: (image: File): Promise<ApiResponse<ProductRecommendation[]>> => {
    const formData = new FormData()
    formData.append("image", image)
    return httpClient.upload(ENDPOINTS.AI.SIMILARITY_SEARCH, formData)
  },

  // Virtual Photoshoot (Stable Diffusion + ControlNet)
  virtualPhotoshoot: (data: {
    user_image: File
    style: string
    background?: string
    outfit_ids?: string[]
  }): Promise<ApiResponse<VirtualPhotoshootResult>> => {
    const formData = new FormData()
    formData.append("user_image", data.user_image)
    formData.append("style", data.style)
    if (data.background) formData.append("background", data.background)
    if (data.outfit_ids) formData.append("outfit_ids", data.outfit_ids.join(","))
    return httpClient.upload(ENDPOINTS.AI.VIRTUAL_PHOTOSHOOT, formData)
  },
}

export default aiService
