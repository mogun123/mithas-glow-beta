"use client"

/**
 * App Providers - Arctic Layer Integration
 * All 12 layers initialized and provided to app
 */

import { useEffect, type ReactNode, Suspense } from "react"
import { ThemeProvider } from "next-themes"
import { Toaster } from "sonner"
import { useAuthStore } from "@/stores/auth-store"
import { useAppStore } from "@/stores/app-store"
import { createClient } from "@/lib/supabase/client"
import { analyticsService } from "@/lib/services/analytics.service"
import { fcmService } from "@/lib/services/fcm.service"
import { realtimeService } from "@/lib/services/realtime.service"

// Auth Provider - Supabase Auth with FastAPI sync
function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setSession, setLoading, initialize } = useAuthStore()

  useEffect(() => {
    // Initialize auth on mount
    initialize()

    const supabase = createClient()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

        if (profile) {
          setUser(profile)
          // Identify user in analytics
          analyticsService.identify(session.user.id, {
            email: session.user.email,
            name: profile.,
          })
        }
        setSession(session)
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setSession(null)
        analyticsService.resetUser()
      } else if (event === "TOKEN_REFRESHED" && session) {
        setSession(session)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [initialize, setUser, setSession, setLoading])

  return <>{children}</>
}

// Analytics Provider - PostHog + Sentry
function AnalyticsProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    analyticsService.initialize()
  }, [])

  return <>{children}</>
}

// Notifications Provider - FCM
function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  const { setUnreadNotifications } = useAppStore()

  useEffect(() => {
    if (!isAuthenticated) return

    // Request notification permission
    fcmService.requestPermission().then((granted) => {
      if (granted) {
        fcmService.subscribe()
      }
    })

    // Listen for incoming notifications
    fcmService.onMessage((payload) => {
      // Show toast notification
      import("sonner").then(({ toast }) => {
        toast(payload.title, {
          description: payload.body,
        })
      })
      // Update unread count
      setUnreadNotifications((prev: number) => prev + 1)
    })
  }, [isAuthenticated, setUnreadNotifications])

  return <>{children}</>
}

// Realtime Provider - Supabase Realtime
function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  const { incrementUnreadNotifications, incrementUnreadMessages } = useAppStore()

  useEffect(() => {
    if (!isAuthenticated || !user) return

    // Subscribe to notifications
    const unsubNotifications = realtimeService.subscribeToNotifications(user.id, () => {
      incrementUnreadNotifications()
    })

    return () => {
      unsubNotifications()
      realtimeService.cleanup()
    }
  }, [isAuthenticated, user, incrementUnreadNotifications, incrementUnreadMessages])

  return <>{children}</>
}

// Razorpay Script Loader
function RazorpayScript() {
  useEffect(() => {
    // Pre-load Razorpay script
    import("@/lib/services/payment.service").then(({ paymentService }) => {
      paymentService.loadRazorpayScript()
    })
  }, [])

  return null
}

// Main Providers Component
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <Suspense fallback={null}>
        <AnalyticsProvider>
          <AuthProvider>
            <RealtimeProvider>
              <NotificationsProvider>
                {children}
                <Toaster position="top-center" richColors />
                <RazorpayScript />
              </NotificationsProvider>
            </RealtimeProvider>
          </AuthProvider>
        </AnalyticsProvider>
      </Suspense>
    </ThemeProvider>
  )
}
