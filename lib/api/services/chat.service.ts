/**
 * Chat Service - Glow Chat Integration
 * Messaging via FastAPI + Supabase Realtime
 */

import { httpClient, type ApiResponse } from "../http-client"
import { ENDPOINTS } from "../config"

// Types
export interface Chat {
  id: string
  type: "vendor" | "support" | "ai_stylist"
  participant_id: string
  participant: {
    id: string
    name: string
    avatar_url: string
    is_online?: boolean
  }
  last_message?: ChatMessage
  unread_count: number
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  chat_id: string
  sender_id: string
  sender: {
    id: string
    name: string
    avatar_url: string
  }
  content: string
  message_type: "text" | "image" | "product" | "order" | "system"
  attachments?: MessageAttachment[]
  metadata?: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export interface MessageAttachment {
  type: "image" | "product" | "order"
  url?: string
  product_id?: string
  order_id?: string
  thumbnail_url?: string
}

export interface SendMessageData {
  content: string
  message_type?: "text" | "image" | "product" | "order"
  attachments?: MessageAttachment[]
}

/**
 * Chat Service
 */
export const chatService = {
  // Chats
  list: (): Promise<ApiResponse<Chat[]>> => httpClient.get(ENDPOINTS.CHAT.LIST),

  get: (id: string): Promise<ApiResponse<Chat>> => httpClient.get(ENDPOINTS.CHAT.DETAIL(id)),

  createVendorChat: (vendorId: string): Promise<ApiResponse<Chat>> =>
    httpClient.post(ENDPOINTS.CHAT.CREATE_VENDOR, { vendor_id: vendorId }),

  // Messages
  getMessages: (
    chatId: string,
    params?: { page?: number; limit?: number; before?: string },
  ): Promise<ApiResponse<ChatMessage[]>> => httpClient.get(ENDPOINTS.CHAT.MESSAGES(chatId), { params }),

  sendMessage: (chatId: string, data: SendMessageData): Promise<ApiResponse<ChatMessage>> =>
    httpClient.post(ENDPOINTS.CHAT.SEND(chatId), data),

  markAsRead: (chatId: string): Promise<ApiResponse<void>> => httpClient.post(ENDPOINTS.CHAT.MARK_READ(chatId)),

  // AI Stylist
  aiStylist: (
    message: string,
    context?: Record<string, unknown>,
  ): Promise<ApiResponse<ChatMessage & { suggestions?: string[]; products?: unknown[] }>> =>
    httpClient.post(ENDPOINTS.CHAT.AI_STYLIST, { message, context }),
}

export default chatService
