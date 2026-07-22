/**
 * Firebase Cloud Messaging Service - Layer 3 Push Notifications
 * FCM integration for real-time push notifications
 */

import { arcticConfig } from "@/lib/config/arctic"
import { httpClient, type ApiResponse } from "@/lib/api/http-client"

// Types
export interface FCMToken {
  token: string
  deviceType: "web" | "android" | "ios"
  createdAt: string
}

export interface PushNotification {
  title: string
  body: string
  icon?: string
  image?: string
  badge?: string
  data?: Record<string, string>
  actions?: NotificationAction[]
}

export interface NotificationAction {
  action: string
  title: string
  icon?: string
}

export interface NotificationPayload {
  type: "order" | "chat" | "promo" | "social" | "system"
  title: string
  body: string
  image_url?: string
  action_url?: string
  data?: Record<string, unknown>
}

/**
 * FCM Service for Push Notifications
 */
class FCMService {
  private vapidKey: string
  private enabled: boolean
  private registration: ServiceWorkerRegistration | null = null

  constructor() {
    this.vapidKey = arcticConfig.backend.fcm.vapidKey
    this.enabled = arcticConfig.backend.fcm.enabled
  }

  /**
   * Check if FCM is configured
   */
  isConfigured(): boolean {
    return this.enabled && !!this.vapidKey
  }

  /**
   * Check if notifications are supported
   */
  isSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermission | "unsupported" {
    if (!this.isSupported()) return "unsupported"
    return Notification.permission
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn("[FCM] Notifications not supported")
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      return permission === "granted"
    } catch (error) {
      console.error("[FCM] Permission request failed:", error)
      return false
    }
  }

  /**
   * Register service worker for push notifications
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) return null

    try {
      this.registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js")
      console.log("[FCM] Service worker registered")
      return this.registration
    } catch (error) {
      console.error("[FCM] Service worker registration failed:", error)
      return null
    }
  }

  /**
   * Get FCM token for this device
   */
  async getToken(): Promise<string | null> {
    if (!this.isConfigured() || !this.isSupported()) return null

    try {
      // Ensure service worker is registered
      if (!this.registration) {
        this.registration = await this.registerServiceWorker()
      }

      if (!this.registration) return null

      // Get push subscription
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidKey),
      })

      // Convert subscription to token format for backend
      const token = JSON.stringify(subscription.toJSON())
      return token
    } catch (error) {
      console.error("[FCM] Failed to get token:", error)
      return null
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<ApiResponse<{ subscribed: boolean }>> {
    const token = await this.getToken()
    if (!token) {
      return { data: null, success: false, error: "Failed to get FCM token" }
    }

    return httpClient.post("/notifications/subscribe", {
      token,
      device_type: "web",
    })
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<ApiResponse<void>> {
    if (this.registration) {
      const subscription = await this.registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
      }
    }

    return httpClient.post("/notifications/unsubscribe")
  }

  /**
   * Show local notification (for testing or fallback)
   */
  async showNotification(payload: PushNotification): Promise<void> {
    if (!this.isSupported() || Notification.permission !== "granted") {
      console.warn("[FCM] Cannot show notification")
      return
    }

    if (this.registration) {
      await this.registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || "/icon-192x192.png",
        image: payload.image,
        badge: payload.badge || "/badge-72x72.png",
        data: payload.data,
        actions: payload.actions,
        tag: "mithas-glow",
        renotify: true,
      })
    } else {
      // Fallback to basic notification
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || "/icon-192x192.png",
      })
    }
  }

  /**
   * Handle incoming messages (call from service worker)
   */
  onMessage(callback: (payload: NotificationPayload) => void): void {
    if (!this.isSupported()) return

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "PUSH_NOTIFICATION") {
        callback(event.data.payload)
      }
    })
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<
    ApiResponse<{
      email_notifications: boolean
      push_notifications: boolean
      order_updates: boolean
      promotional: boolean
      social_activity: boolean
      chat_messages: boolean
    }>
  > {
    return httpClient.get("/notifications/preferences")
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: {
    email_notifications?: boolean
    push_notifications?: boolean
    order_updates?: boolean
    promotional?: boolean
    social_activity?: boolean
    chat_messages?: boolean
  }): Promise<ApiResponse<void>> {
    return httpClient.patch("/notifications/preferences", preferences)
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }
}

export const fcmService = new FCMService()
export default fcmService
