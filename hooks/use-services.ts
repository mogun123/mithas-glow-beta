"use client"

import { useState, useCallback, useEffect } from "react"
import {
  aiService,
  paymentService,
  storageService,
  searchService,
  analyticsService,
  backendService,
  geoService,
  realtimeService,
  type SkinAnalysisResult,
  type VirtualTryOnResult,
  type PaymentResult,
  type UploadResult,
  type SearchResult,
  type ProductSearchHit,
  type SearchFilters,
  type SalonWithDistance,
} from "@/lib/services"

// Skin Analysis Hook
export function useSkinAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<SkinAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analyze = useCallback(async (imageFile: File) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const analysisResult = await aiService.analyzeSkin(imageFile)
      setResult(analysisResult)
      analyticsService.trackSkinAnalysis(analysisResult.skinType)
      return analysisResult
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed"
      setError(message)
      return null
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  return { analyze, isAnalyzing, result, error, reset: () => setResult(null) }
}

// Virtual Try-On Hook
export function useVirtualTryOn() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<VirtualTryOnResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const tryOn = useCallback(async (selfieFile: File, productIds: string[]) => {
    setIsProcessing(true)
    setError(null)

    try {
      const tryOnResult = await aiService.virtualTryOn(selfieFile, productIds)
      setResult(tryOnResult)
      analyticsService.trackVirtualTryOn(productIds)
      return tryOnResult
    } catch (err) {
      const message = err instanceof Error ? err.message : "Try-on failed"
      setError(message)
      return null
    } finally {
      setIsProcessing(false)
    }
  }, [])

  return { tryOn, isProcessing, result, error, reset: () => setResult(null) }
}

// AI Chat Hook
export function useAIChat() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(
    async (message: string, skinProfile?: SkinAnalysisResult) => {
      setIsLoading(true)
      const newMessages = [...messages, { role: "user" as const, content: message }]
      setMessages(newMessages)

      try {
        const response = await aiService.chat(message, {
          skinProfile,
          history: messages,
        })

        setMessages([...newMessages, { role: "assistant", content: response }])
        analyticsService.trackAIChat(newMessages.length + 1)
        return response
      } catch {
        const errorMessage = "Sorry, I couldn't process your request. Please try again."
        setMessages([...newMessages, { role: "assistant", content: errorMessage }])
        return errorMessage
      } finally {
        setIsLoading(false)
      }
    },
    [messages],
  )

  return {
    messages,
    sendMessage,
    isLoading,
    clearChat: () => setMessages([]),
  }
}

// Product Search Hook
export function useProductSearch() {
  const [results, setResults] = useState<SearchResult<ProductSearchHit> | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])

  const search = useCallback(async (query: string, filters?: SearchFilters, page = 1) => {
    setIsSearching(true)

    try {
      const searchResults = await searchService.searchProducts(query, filters, page)
      setResults(searchResults)
      analyticsService.trackSearch(query, searchResults.totalHits)
      return searchResults
    } catch {
      setResults(null)
      return null
    } finally {
      setIsSearching(false)
    }
  }, [])

  const getAutocomplete = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    const results = await searchService.getAutocompleteSuggestions(query)
    setSuggestions(results)
  }, [])

  return { search, results, isSearching, suggestions, getAutocomplete }
}

// File Upload Hook
export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const uploadImage = useCallback(
    async (
      file: File,
      bucket: "products" | "profiles" | "reels" | "reviews",
      path?: string,
    ): Promise<UploadResult | null> => {
      setIsUploading(true)
      setProgress(0)
      setError(null)

      try {
        const progressInterval = setInterval(() => {
          setProgress((prev) => Math.min(prev + 10, 90))
        }, 100)

        const result = await storageService.uploadImage(file, bucket, path)

        clearInterval(progressInterval)
        setProgress(100)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed"
        setError(message)
        return null
      } finally {
        setIsUploading(false)
      }
    },
    [],
  )

  const uploadVideo = useCallback(
    async (
      file: File,
      bucket: "products" | "profiles" | "reels" | "reviews",
      path?: string,
    ): Promise<UploadResult | null> => {
      setIsUploading(true)
      setProgress(0)
      setError(null)

      try {
        const progressInterval = setInterval(() => {
          setProgress((prev) => Math.min(prev + 5, 90))
        }, 200)

        const result = await storageService.uploadVideo(file, bucket, path)

        clearInterval(progressInterval)
        setProgress(100)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed"
        setError(message)
        return null
      } finally {
        setIsUploading(false)
      }
    },
    [],
  )

  return { uploadImage, uploadVideo, isUploading, progress, error }
}

// Payment Hook
export function usePayment() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processPayment = useCallback(
    async (
      amount: number,
      userId: string,
      userInfo: { name: string; email: string; phone: string },
    ): Promise<PaymentResult> => {
      setIsProcessing(true)
      setError(null)

      try {
        const order = await paymentService.createOrder(amount, userId)
        const result = await paymentService.processPayment(order, userInfo)

        if (result.success && result.paymentId && result.orderId && result.signature) {
          const verified = await paymentService.verifyPayment(result.paymentId, result.orderId, result.signature)

          if (!verified) {
            return { success: false, error: "Payment verification failed" }
          }
        }

        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : "Payment failed"
        setError(message)
        return { success: false, error: message }
      } finally {
        setIsProcessing(false)
      }
    },
    [],
  )

  return { processPayment, isProcessing, error }
}

// Nearby Salons Hook
export function useNearbySalons() {
  const [salons, setSalons] = useState<SalonWithDistance[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  const findNearby = useCallback(async (radiusKm = 10) => {
    setIsLoading(true)
    setError(null)

    try {
      const currentLocation = await geoService.getCurrentLocation()
      setLocation(currentLocation)

      const nearbySalons = await geoService.findNearbySalons(currentLocation.lat, currentLocation.lng, { radiusKm })
      setSalons(nearbySalons)
      return nearbySalons
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to find nearby salons"
      setError(message)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { salons, location, findNearby, isLoading, error }
}

// Booking Hook
export function useBooking() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getAvailableSlots = useCallback(async (salonId: string, serviceId: string, date: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const { slots } = await backendService.booking.getAvailableSlots(salonId, serviceId, date)
      return slots
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get slots"
      setError(message)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createBooking = useCallback(
    async (data: Parameters<typeof backendService.booking.createBooking>[0], token: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const booking = await backendService.booking.createBooking(data, token)
        analyticsService.trackBooking(data.salon_id, data.service_id)
        return booking
      } catch (err) {
        const message = err instanceof Error ? err.message : "Booking failed"
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { getAvailableSlots, createBooking, isLoading, error }
}

// Reels Feed Hook
export function useReelsFeed() {
  const [reels, setReels] = useState<Awaited<ReturnType<typeof backendService.reels.getFeed>>["reels"]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMore = useCallback(async () => {
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const { reels: newReels, nextCursor: cursor } = await backendService.reels.getFeed({
        cursor: nextCursor || undefined,
        limit: 10,
      })

      setReels((prev) => (nextCursor ? [...prev, ...newReels] : newReels))
      setNextCursor(cursor)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load reels"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, nextCursor])

  const likeReel = useCallback(async (reelId: string, token: string) => {
    try {
      const { liked, likesCount } = await backendService.reels.likeReel(reelId, token)
      setReels((prev) => prev.map((reel) => (reel.id === reelId ? { ...reel, likes_count: likesCount } : reel)))
      return liked
    } catch {
      return false
    }
  }, [])

  return { reels, loadMore, likeReel, isLoading, hasMore: nextCursor !== null, error }
}

// Realtime Notifications Hook
export function useRealtimeNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<
    Array<{
      id: string
      type: string
      title: string
      body: string
      read: boolean
      created_at: string
    }>
  >([])

  useEffect(() => {
    if (!userId) return

    const unsubscribe = realtimeService.subscribeToNotifications(userId, (notification) => {
      setNotifications((prev) => [notification, ...prev])
    })

    return unsubscribe
  }, [userId])

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
  }, [])

  return { notifications, unreadCount: notifications.filter((n) => !n.read).length, markAsRead }
}

// GlowPay Wallet Hook
export function useGlowPayWallet(token: string | null) {
  const [balance, setBalance] = useState<number>(0)
  const [transactions, setTransactions] = useState<
    Awaited<ReturnType<typeof backendService.wallet.getTransactions>>["transactions"]
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBalance = useCallback(async () => {
    if (!token) return

    try {
      const { balance: bal } = await backendService.wallet.getBalance(token)
      setBalance(bal)
    } catch {
      // Silent fail for balance check
    }
  }, [token])

  const fetchTransactions = useCallback(async () => {
    if (!token) return

    setIsLoading(true)
    try {
      const { transactions: txns } = await backendService.wallet.getTransactions(token)
      setTransactions(txns)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load transactions"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  const addFunds = useCallback(
    async (amount: number) => {
      if (!token) return null

      setIsLoading(true)
      setError(null)

      try {
        const { orderId } = await backendService.wallet.addFunds(amount, token)
        return orderId
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add funds"
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [token],
  )

  const payWithWallet = useCallback(
    async (amount: number, description: string) => {
      if (!token) return null

      setIsLoading(true)
      setError(null)

      try {
        const result = await backendService.wallet.pay(amount, description, token)
        setBalance(result.newBalance)
        await fetchTransactions()
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : "Payment failed"
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [token, fetchTransactions],
  )

  useEffect(() => {
    fetchBalance()
    fetchTransactions()
  }, [fetchBalance, fetchTransactions])

  return { balance, transactions, addFunds, payWithWallet, isLoading, error, refresh: fetchBalance }
}
