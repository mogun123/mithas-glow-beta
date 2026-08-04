/**
 * Analytics Provider Component
 * Initializes PostHog analytics
 */

"use client"

import type React from "react"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { useAuthStore } from "@/src/lib/store"

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuthStore()

  // Initialize analytics on mount
  useEffect(() => {
    const init = async () => {
      const { analyticsService } = await import("@/lib/arctic")
      await analyticsService.initAnalytics()
    }
    init()
  }, [])

  // Track page views
  useEffect(() => {
    const trackPage = async () => {
      const { analyticsService } = await import("@/lib/arctic")
      analyticsService.trackPageView({
        path: pathname,
        search: searchParams.toString(),
      })
    }
    trackPage()
  }, [pathname, searchParams])

  // Identify user when logged in
  useEffect(() => {
    const identify = async () => {
      if (user) {
        const { analyticsService } = await import("@/lib/arctic")
        analyticsService.identifyUser(user.id, {
          email: user.email,
          name: user. || undefined,
          role: user.role,
          created_at: user.created_at,
        })
      }
    }
    identify()
  }, [user])

  return <>{children}</>
}

export default AnalyticsProvider
