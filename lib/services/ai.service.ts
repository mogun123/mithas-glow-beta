// AI Service - Skin Analysis, Virtual Try-On, Chat, Recommendations
import { appConfig } from "@/lib/config"

export interface SkinAnalysisResult {
  skinType: "oily" | "dry" | "combination" | "normal" | "sensitive"
  concerns: string[]
  scores: {
    hydration: number
    elasticity: number
    texture: number
    pigmentation: number
    pores: number
  }
  recommendations: string[]
}

export interface VirtualTryOnResult {
  processedImageUrl: string
  confidence: number
  appliedProducts: string[]
}

export interface AIRecommendation {
  productId: string
  score: number
  reason: string
}

class AIService {
  private baseUrl: string

  constructor() {
    this.baseUrl = appConfig.api.baseUrl
  }

  async analyzeSkin(imageFile: File): Promise<SkinAnalysisResult> {
    const formData = new FormData()
    formData.append("image", imageFile)

    const response = await fetch(`${this.baseUrl}/api/ai/skin-analysis`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Skin analysis failed")
    }

    return response.json()
  }

  async virtualTryOn(selfieFile: File, productIds: string[]): Promise<VirtualTryOnResult> {
    const formData = new FormData()
    formData.append("selfie", selfieFile)
    formData.append("productIds", JSON.stringify(productIds))

    const response = await fetch(`${this.baseUrl}/api/ai/virtual-tryon`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Virtual try-on failed")
    }

    return response.json()
  }

  async chat(
    message: string,
    context?: { skinProfile?: SkinAnalysisResult; history?: Array<{ role: string; content: string }> },
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context }),
    })

    if (!response.ok) {
      throw new Error("AI chat failed")
    }

    const data = await response.json()
    return data.response
  }

  async getRecommendations(userId: string, skinProfile?: SkinAnalysisResult): Promise<AIRecommendation[]> {
    const response = await fetch(`${this.baseUrl}/api/ai/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, skinProfile }),
    })

    if (!response.ok) {
      throw new Error("Failed to get recommendations")
    }

    return response.json()
  }

  async semanticSearch(query: string, category?: string): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/ai/semantic-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, category }),
    })

    if (!response.ok) {
      throw new Error("Semantic search failed")
    }

    const data = await response.json()
    return data.productIds
  }
}

export const aiService = new AIService()
