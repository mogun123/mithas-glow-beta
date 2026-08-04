"use client"

/**
 * AI Features Hook
 * Skin Analysis, AR Try-On, Style Recommendations
 */

import { useState, useCallback } from "react"
import { useAuthStore } from "../store"
import { aiService, type SkinAnalysisResult, type ARTryOnResult, type StyleRecommendation, type PersonalizedFeedItem } from "../api/services/ai.service"
import { ENV } from "../env"
import { toast } from "sonner"

export function useSkinAnalysis() {
  const { user } = useAuthStore()
  const [result, setResult] = useState<SkinAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeSkin = useCallback(
    async (imageFile: File) => {
      if (!ENV.ENABLE_AI_FEATURES) {
        toast.info("AI features are currently disabled")
        return { success: false, error: "AI features disabled" }
      }

      try {
        setIsAnalyzing(true)
        setError(null)

        const response = await aiService.analyzeSkin(imageFile)

        if (response.success && response.data) {
          setResult(response.data)
          toast.success("Skin analysis complete!")
          return { success: true, data: response.data }
        }

        return { success: false, error: response.error }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Skin analysis failed"
        console.error("Skin analysis error:", err)
        setError(message)
        toast.error(message)
        return { success: false, error: message }
      } finally {
        setIsAnalyzing(false)
      }
    },
    [user],
  )

  const clearResult = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    result,
    isAnalyzing,
    error,
    analyzeSkin,
    clearResult,
  }
}

export function useARTryOn() {
  const [result, setResult] = useState<ARTryOnResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tryOnProduct = useCallback(async (productId: string, userImage: File) => {
    if (!ENV.ENABLE_AR_TRYON) {
      toast.info("AR try-on is currently disabled")
      return { success: false, error: "AR try-on disabled" }
    }

    try {
      setIsProcessing(true)
      setError(null)

      const response = await aiService.getARTryOn({
        product_id: productId,
        user_image: userImage,
      })

      if (response.success && response.data) {
        setResult(response.data)
        return { success: true, data: response.data }
      }

      return { success: false, error: response.error }
    } catch (err) {
      const message = err instanceof Error ? err.message : "AR try-on failed"
      console.error("AR try-on error:", err)
      setError(message)
      toast.error(message)
      return { success: false, error: message }
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const clearResult = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    result,
    isProcessing,
    error,
    tryOnProduct,
    clearResult,
  }
}

export function useStyleRecommendations() {
  const [recommendations, setRecommendations] = useState<StyleRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRecommendations = useCallback(
    async (params?: {
      occasion?: string
      season?: string
      budget_min?: number
      budget_max?: number
      preferences?: string[]
    }) => {
      if (!ENV.ENABLE_AI_FEATURES) {
        return { success: false, error: "AI features disabled" }
      }

      try {
        setIsLoading(true)
        setError(null)

        const response = await aiService.getStyleRecommendations(params)

        if (response.success && response.data) {
          setRecommendations(response.data)
          return { success: true, data: response.data }
        }

        return { success: false, error: response.error }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to get recommendations"
        console.error("Style recommendations error:", err)
        setError(message)
        return { success: false, error: message }
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return {
    recommendations,
    isLoading,
    error,
    fetchRecommendations,
  }
}

export function usePersonalizedFeed() {
  const [feed, setFeed] = useState<PersonalizedFeedItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const fetchFeed = useCallback(
    async (reset = false) => {
      if (!ENV.ENABLE_AI_FEATURES) {
        return { success: false, error: "AI features disabled" }
      }

      try {
        setIsLoading(true)
        setError(null)

        const currentPage = reset ? 1 : page

        const response = await aiService.getPersonalizedFeed({
          page: currentPage,
          limit: 20,
        })

        if (response.success && response.data) {
          if (reset) {
            setFeed(response.data)
            setPage(2)
          } else {
            setFeed((prev) => [...prev, ...response.data!])
            setPage((p) => p + 1)
          }
          setHasMore(response.data.length === 20)
          return { success: true, data: response.data }
        }

        return { success: false, error: response.error }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load feed"
        console.error("Personalized feed error:", err)
        setError(message)
        return { success: false, error: message }
      } finally {
        setIsLoading(false)
      }
    },
    [page],
  )

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchFeed(false)
    }
  }, [isLoading, hasMore, fetchFeed])

  const refresh = useCallback(() => {
    fetchFeed(true)
  }, [fetchFeed])

  return {
    feed,
    isLoading,
    hasMore,
    error,
    loadMore,
    refresh,
  }
}
