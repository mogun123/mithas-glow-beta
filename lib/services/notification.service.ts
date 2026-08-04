// Notification Service - Push Notifications via Firebase
import { appConfig } from "@/lib/config"

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  data?: Record<string, any>
  url?: string
}

class NotificationService {
  private messaging: any = null
  private initialized = false
  private token: string | null = null

  async initialize(): Promise<string | null> {
    if (this.initialized || typeof window === "undefined") {
      return this.token
    }

    try {
      const firebase = await import("firebase/app")
      const { getMessaging, getToken, onMessage } = await import("firebase/messaging")

      const app = firebase.initializeApp(appConfig.notifications.firebaseConfig)
      this.messaging = getMessaging(app)

      // Request permission
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        return null
      }

      // Get FCM token
      this.token = await getToken(this.messaging, {
        vapidKey: appConfig.notifications.vapidKey,
      })

      // Handle foreground messages
      onMessage(this.messaging, (payload: any) => {
        this.showNotification({
          title: payload.notification?.title || "New Notification",
          body: payload.notification?.body || "",
          data: payload.data,
        })
      })

      this.initialized = true
      return this.token
    } catch (error) {
      console.error("Failed to initialize notifications:", error)
      return null
    }
  }

  async registerToken(userId: string): Promise<void> {
    const token = await this.initialize()
    if (!token) return

    await fetch(`${appConfig.api.baseUrl}/api/notifications/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, token }),
    })
  }

  showNotification(payload: NotificationPayload): void {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return
    }

    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon || "/icons/icon-192x192.png",
      data: payload.data,
    })

    if (payload.url) {
      notification.onclick = () => {
        window.open(payload.url, "_blank")
      }
    }
  }

  async subscribeToTopic(topic: string): Promise<void> {
    if (!this.token) return

    await fetch(`${appConfig.api.baseUrl}/api/notifications/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: this.token, topic }),
    })
  }

  async unsubscribeFromTopic(topic: string): Promise<void> {
    if (!this.token) return

    await fetch(`${appConfig.api.baseUrl}/api/notifications/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: this.token, topic }),
    })
  }
}

export const notificationService = new NotificationService()
