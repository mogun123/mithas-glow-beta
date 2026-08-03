/**
 * Analytics Service - Layer 10 Observability
 * PostHog, Sentry, Grafana integration
 */

import { arcticConfig } from "@/lib/config/arctic"

type EventProperties = Record<string, string | number | boolean | null | undefined | string[]>

interface UserTraits {
  email?: string
  name?: string
  username?: string
  is_seller?: boolean
  skin_type?: string
  [key: string]: any
}

/**
 * Analytics Service with PostHog + Sentry + Custom Metrics
 */
class AnalyticsService {
  private posthog: any = null
  private sentry: any = null
  private initialized = false
  private userId: string | null = null

  /**
   * Initialize analytics services
   */
  async initialize(): Promise<void> {
    if (this.initialized || typeof window === "undefined") return

    // Initialize PostHog
    if (arcticConfig.analytics.posthog.enabled) {
      try {
        const posthog = await import("posthog-js")
        posthog.default.init(arcticConfig.analytics.posthog.apiKey, {
          api_host: arcticConfig.analytics.posthog.host,
          loaded: (ph) => {
            this.posthog = ph
          },
          capture_pageview: false, // Manual pageview tracking
          capture_pageleave: true,
          autocapture: true,
        })
      } catch (error) {
        console.error("[Analytics] PostHog init failed:", error)
      }
    }

    // Initialize Sentry
    if (arcticConfig.analytics.sentry.enabled) {
      try {
        const Sentry = await import("@sentry/nextjs")
        Sentry.init({
          dsn: arcticConfig.analytics.sentry.dsn,
          environment: arcticConfig.analytics.sentry.environment,
          tracesSampleRate: 0.1,
        })
        this.sentry = Sentry
      } catch (error) {
        console.error("[Analytics] Sentry init failed:", error)
      }
    }

    this.initialized = true
  }

  /**
   * Identify user
   */
  identify(userId: string, traits?: UserTraits): void {
    this.userId = userId

    if (this.posthog) {
      this.posthog.identify(userId, traits)
    }

    if (this.sentry) {
      this.sentry.setUser({ id: userId, email: traits?.email })
    }
  }

  /**
   * Reset user (on logout)
   */
  resetUser(): void {
    this.userId = null

    if (this.posthog) {
      this.posthog.reset()
    }

    if (this.sentry) {
      this.sentry.setUser(null)
    }
  }

  /**
   * Track custom event
   */
  track(event: string, properties?: EventProperties): void {
    if (this.posthog) {
      this.posthog.capture(event, properties)
    }

    // Also send to custom metrics endpoint
    this.sendMetric(event, properties)
  }

  /**
   * Track page view
   */
  page(pageName: string, properties?: EventProperties): void {
    if (this.posthog) {
      this.posthog.capture("$pageview", {
        page: pageName,
        $current_url: window.location.href,
        ...properties,
      })
    }
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: Record<string, any>): void {
    if (this.sentry) {
      this.sentry.captureException(error, { extra: context })
    }

    this.track("Error", {
      error_message: error.message,
      error_name: error.name,
      ...context,
    })
  }

  // ==========================================
  // E-commerce Events
  // ==========================================

  trackProductViewed(product: { id: string; name: string; price: number; category: string; seller_id: string }): void {
    this.track("Product Viewed", {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      category: product.category,
      seller_id: product.seller_id,
    })
  }

  trackAddToCart(product: { id: string; name: string; price: number; quantity: number }): void {
    this.track("Add to Cart", {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      quantity: product.quantity,
      value: product.price * product.quantity,
    })
  }

  trackRemoveFromCart(productId: string, quantity: number): void {
    this.track("Remove from Cart", {
      product_id: productId,
      quantity,
    })
  }

  trackCheckoutStarted(cart: { items: any[]; total: number; coupon?: string }): void {
    this.track("Checkout Started", {
      items: cart.items.length,
      total: cart.total,
      coupon: cart.coupon,
    })
  }

  trackPurchaseCompleted(order: { id: string; total: number; items: any[]; payment_method: string }): void {
    this.track("Purchase Completed", {
      order_id: order.id,
      total: order.total,
      items: order.items.length,
      payment_method: order.payment_method,
    })
  }

  trackSearch(query: string, resultsCount: number, filters?: Record<string, any>): void {
    this.track("Search", {
      query,
      results_count: resultsCount,
      ...filters,
    })
  }

  // ==========================================
  // AI & AR Events
  // ==========================================

  trackSkinAnalysis(result: { skin_type: string; concerns: string[]; confidence: number }): void {
    this.track("Skin Analysis Completed", {
      skin_type: result.skin_type,
      concerns: result.concerns.join(","),
      confidence: result.confidence,
    })
  }

  trackVirtualTryOn(productId: string, duration: number): void {
    this.track("Virtual Try-On Used", {
      product_id: productId,
      duration_seconds: duration,
    })
  }

  trackAIChat(messageCount: number, topic?: string): void {
    this.track("AI Chat Interaction", {
      message_count: messageCount,
      topic,
    })
  }

  // ==========================================
  // Booking Events
  // ==========================================

  trackBookingStarted(salonId: string, serviceId: string): void {
    this.track("Booking Started", {
      salon_id: salonId,
      service_id: serviceId,
    })
  }

  trackBookingCompleted(booking: { salon_id: string; service_id: string; amount: number }): void {
    this.track("Booking Completed", {
      salon_id: booking.salon_id,
      service_id: booking.service_id,
      amount: booking.amount,
    })
  }

  trackBookingCancelled(bookingId: string, reason?: string): void {
    this.track("Booking Cancelled", {
      booking_id: bookingId,
      reason,
    })
  }

  // ==========================================
  // Reels Events
  // ==========================================

  trackReelViewed(reelId: string, watchDuration: number, percentWatched: number): void {
    this.track("Reel Viewed", {
      reel_id: reelId,
      watch_duration: watchDuration,
      percent_watched: percentWatched,
    })
  }

  trackReelLiked(reelId: string): void {
    this.track("Reel Liked", { reel_id: reelId })
  }

  trackReelShared(reelId: string, platform?: string): void {
    this.track("Reel Shared", {
      reel_id: reelId,
      platform,
    })
  }

  trackReelProductClicked(reelId: string, productId: string): void {
    this.track("Reel Product Clicked", {
      reel_id: reelId,
      product_id: productId,
    })
  }

  // ==========================================
  // Wallet Events
  // ==========================================

  trackWalletTopUp(amount: number, method: string): void {
    this.track("Wallet Top Up", { amount, method })
  }

  trackWalletPayment(amount: number, type: string): void {
    this.track("Wallet Payment", { amount, type })
  }

  // ==========================================
  // Performance Metrics
  // ==========================================

  trackPerformance(metric: string, value: number, tags?: Record<string, string>): void {
    this.track(`Performance: ${metric}`, {
      value,
      ...tags,
    })
  }

  // ==========================================
  // Internal Methods
  // ==========================================

  private async sendMetric(event: string, properties?: EventProperties): Promise<void> {
    // Send to custom metrics endpoint (Prometheus/Grafana compatible)
    if (!arcticConfig.analytics.grafana.enabled) return

    try {
      await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          properties,
          timestamp: Date.now(),
          user_id: this.userId,
        }),
      })
    } catch {
      // Silently fail for metrics
    }
  }
}

export const analyticsService = new AnalyticsService()
export default analyticsService
