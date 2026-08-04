"use client"

/**
 * Realtime Subscriptions Hook
 * Supabase Realtime for live updates
 */

import { useEffect, useCallback, useRef } from "react"
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import { supabase } from "../supabase"
import { useAuthStore, useNotificationStore } from "../store"
import type { Database } from "../database.types"

type Order = Database["public"]["Tables"]["orders"]["Row"]
type Notification = Database["public"]["Tables"]["notifications"]["Row"]
type Message = Database["public"]["Tables"]["messages"]["Row"]
type CartItem = Database["public"]["Tables"]["cart"]["Row"]

/**
 * Hook for subscribing to notifications
 */
export function useNotificationUpdates() {
  const { user } = useAuthStore()
  const { addNotification, setNotifications } = useNotificationStore()
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (data) {
      setNotifications(data as Notification[])
    }
  }, [user, setNotifications])

  useEffect(() => {
    if (!user) return

    fetchNotifications()

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on<Notification>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          const newNotification = payload.new as Notification
          if (newNotification) {
            addNotification(newNotification)

            // Show toast for new notification
            if (typeof window !== "undefined" && "Notification" in window) {
              if (Notification.permission === "granted") {
                new Notification(newNotification.title, {
                  body: newNotification.message,
                  icon: "/icons/notification.png",
                })
              }
            }
          }
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [user, addNotification, fetchNotifications])

  return { refetch: fetchNotifications }
}

/**
 * Hook for presence - online users in a room
 */
export function usePresence(roomId: string) {
  const { user } = useAuthStore()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const presenceRef = useRef<Map<string, { user_id: string; online_at: string }>>(new Map())

  const join = useCallback(
    (onSync: (users: Map<string, { user_id: string; online_at: string }>) => void) => {
      if (!user || !roomId) return

      const channel = supabase.channel(`presence-${roomId}`, {
        config: {
          presence: {
            key: user.id,
          },
        },
      })

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState()
          const users = new Map<string, { user_id: string; online_at: string }>()

          Object.entries(state).forEach(([key, value]) => {
            const presence = value[0] as { user_id: string; online_at: string }
            if (presence) {
              users.set(key, presence)
            }
          })

          presenceRef.current = users
          onSync(users)
        })
        .on("presence", { event: "join" }, ({ key, newPresences }) => {
          const presence = newPresences[0] as { user_id: string; online_at: string }
          if (presence) {
            presenceRef.current.set(key, presence)
            onSync(new Map(presenceRef.current))
          }
        })
        .on("presence", { event: "leave" }, ({ key }) => {
          presenceRef.current.delete(key)
          onSync(new Map(presenceRef.current))
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
            })
          }
        })

      channelRef.current = channel

      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current)
        }
      }
    },
    [user, roomId],
  )

  const leave = useCallback(async () => {
    if (channelRef.current) {
      await channelRef.current.untrack()
      await supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  return { join, leave, presence: presenceRef.current }
}

/**
 * Hook for seller order notifications
 */
export function useSellerOrderUpdates(sellerId?: string) {
  const { user } = useAuthStore()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const onNewOrderRef = useRef<((order: Order) => void) | null>(null)

  const subscribe = useCallback(
    (onNewOrder: (order: Order) => void) => {
      const id = sellerId || user?.id
      if (!id) return

      onNewOrderRef.current = onNewOrder

      const channel = supabase
        .channel(`seller-orders-${id}`)
        .on<Order>(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "orders",
            filter: `seller_id=eq.${id}`,
          },
          (payload: RealtimePostgresChangesPayload<Order>) => {
            const newOrder = payload.new as Order
            if (newOrder && onNewOrderRef.current) {
              onNewOrderRef.current(newOrder)

              // Play notification sound
              if (typeof window !== "undefined") {
                const audio = new Audio("/sounds/new-order.mp3")
                audio.play().catch(() => {
                  // Ignore autoplay errors
                })
              }
            }
          },
        )
        .subscribe()

      channelRef.current = channel

      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current)
        }
      }
    },
    [user, sellerId],
  )

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  return { subscribe }
}

/**
 * Master hook for initializing all realtime subscriptions
 */
export function useRealtimeInit() {
  const { user } = useAuthStore()

  useNotificationUpdates()

  useEffect(() => {
    if (user && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission()
      }
    }
  }, [user])
}
