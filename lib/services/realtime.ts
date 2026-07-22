// Layer 4 Extension: Realtime Service
// Supabase Realtime + Redis Pub/Sub

import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

type RealtimeCallback<T> = (payload: T) => void

export class RealtimeService {
  private supabase = createClient()
  private channels: Map<string, RealtimeChannel> = new Map()

  // Subscribe to table changes
  subscribeToTable<T>(
    table: string,
    event: "INSERT" | "UPDATE" | "DELETE" | "*",
    callback: RealtimeCallback<{ new: T; old: T }>,
    filter?: string,
  ): () => void {
    const channelName = `${table}-${event}-${filter || "all"}`

    const channel = this.supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event,
          schema: "public",
          table,
          filter,
        },
        (payload) => {
          callback(payload as unknown as { new: T; old: T })
        },
      )
      .subscribe()

    this.channels.set(channelName, channel)

    return () => {
      channel.unsubscribe()
      this.channels.delete(channelName)
    }
  }

  // Subscribe to presence (online users)
  subscribeToPresence(
    roomId: string,
    callbacks: {
      onSync?: (state: PresenceState) => void
      onJoin?: (key: string, presence: PresencePayload) => void
      onLeave?: (key: string, presence: PresencePayload) => void
    },
  ): () => void {
    const channel = this.supabase.channel(`presence:${roomId}`)

    if (callbacks.onSync) {
      channel.on("presence", { event: "sync" }, () => {
        callbacks.onSync?.(channel.presenceState() as PresenceState)
      })
    }

    if (callbacks.onJoin) {
      channel.on("presence", { event: "join" }, ({ key, newPresences }) => {
        callbacks.onJoin?.(key, newPresences[0] as PresencePayload)
      })
    }

    if (callbacks.onLeave) {
      channel.on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        callbacks.onLeave?.(key, leftPresences[0] as PresencePayload)
      })
    }

    channel.subscribe()
    this.channels.set(`presence:${roomId}`, channel)

    return () => {
      channel.unsubscribe()
      this.channels.delete(`presence:${roomId}`)
    }
  }

  // Track user presence
  async trackPresence(roomId: string, userInfo: PresencePayload): Promise<void> {
    const channel = this.channels.get(`presence:${roomId}`)
    if (channel) {
      await channel.track(userInfo)
    }
  }

  // Subscribe to broadcast messages
  subscribeToBroadcast<T>(channelName: string, event: string, callback: RealtimeCallback<T>): () => void {
    const channel = this.supabase
      .channel(channelName)
      .on("broadcast", { event }, (payload) => {
        callback(payload.payload as T)
      })
      .subscribe()

    this.channels.set(channelName, channel)

    return () => {
      channel.unsubscribe()
      this.channels.delete(channelName)
    }
  }

  // Send broadcast message
  async broadcast<T>(channelName: string, event: string, payload: T): Promise<void> {
    const channel = this.channels.get(channelName) || this.supabase.channel(channelName)
    await channel.send({
      type: "broadcast",
      event,
      payload,
    })
  }

  // Subscribe to chat messages
  subscribeToChatRoom(roomId: string, onMessage: RealtimeCallback<ChatMessage>): () => void {
    return this.subscribeToTable<ChatMessage>(
      "chat_messages",
      "INSERT",
      (payload) => onMessage(payload.new),
      `room_id=eq.${roomId}`,
    )
  }

  // Subscribe to order updates
  subscribeToOrderUpdates(orderId: string, onUpdate: RealtimeCallback<OrderUpdate>): () => void {
    return this.subscribeToTable<OrderUpdate>(
      "orders",
      "UPDATE",
      (payload) => onUpdate(payload.new),
      `id=eq.${orderId}`,
    )
  }

  // Subscribe to reel likes
  subscribeToReelEngagement(
    reelId: string,
    callbacks: {
      onLike?: RealtimeCallback<LikeEvent>
      onComment?: RealtimeCallback<CommentEvent>
    },
  ): () => void {
    const unsubLikes = callbacks.onLike
      ? this.subscribeToTable<LikeEvent>(
          "reel_likes",
          "INSERT",
          (payload) => callbacks.onLike?.(payload.new),
          `reel_id=eq.${reelId}`,
        )
      : () => {}

    const unsubComments = callbacks.onComment
      ? this.subscribeToTable<CommentEvent>(
          "reel_comments",
          "INSERT",
          (payload) => callbacks.onComment?.(payload.new),
          `reel_id=eq.${reelId}`,
        )
      : () => {}

    return () => {
      unsubLikes()
      unsubComments()
    }
  }

  // Cleanup all subscriptions
  cleanup(): void {
    this.channels.forEach((channel) => channel.unsubscribe())
    this.channels.clear()
  }
}

interface PresenceState {
  [key: string]: PresencePayload[]
}

interface PresencePayload {
  user_id: string
  username: string
  avatar_url?: string
  online_at?: string
}

interface ChatMessage {
  id: string
  room_id: string
  user_id: string
  content: string
  created_at: string
}

interface OrderUpdate {
  id: string
  status: string
  updated_at: string
}

interface LikeEvent {
  id: string
  reel_id: string
  user_id: string
  created_at: string
}

interface CommentEvent {
  id: string
  reel_id: string
  user_id: string
  content: string
  created_at: string
}

export const realtimeService = new RealtimeService()
