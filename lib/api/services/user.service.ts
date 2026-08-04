/**
 * User Service - User Profile & Settings
 * User operations via FastAPI
 */

import { httpClient, type ApiResponse } from "../http-client"
import { ENDPOINTS } from "../config"
import type { Address } from "./shop.service"
import type { Product } from "./shop.service"

// Types
export interface UserProfile {
  id: string
  email: string
  phone?: string
  username: string
  full_name: string
  avatar_url?: string
  bio?: string
  gender?: "female" | "male" | "other"
  date_of_birth?: string
  skin_profile?: SkinProfile
  followers_count: number
  following_count: number
  is_seller: boolean
  seller_id?: string
  created_at: string
}

export interface SkinProfile {
  skin_type: "dry" | "oily" | "combination" | "normal" | "sensitive"
  skin_tone: string
  undertone: "warm" | "cool" | "neutral"
  concerns: string[]
  allergies?: string[]
  last_analysis_date?: string
}

export interface Notification {
  id: string
  user_id: string
  type: "order" | "promo" | "social" | "system" | "chat"
  title: string
  message: string
  image_url?: string
  action_url?: string
  is_read: boolean
  created_at: string
}

export interface NotificationPreferences {
  email_notifications: boolean
  push_notifications: boolean
  order_updates: boolean
  promotional: boolean
  social_activity: boolean
  chat_messages: boolean
}

export interface WishlistItem {
  id: string
  product_id: string
  product: Product
  added_at: string
}

/**
 * User Service
 */
export const userService = {
  // Profile
  getProfile: (): Promise<ApiResponse<UserProfile>> => httpClient.get(ENDPOINTS.USERS.PROFILE),

  updateProfile: (data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> =>
    httpClient.patch(ENDPOINTS.USERS.UPDATE, data),

  // Addresses
  getAddresses: (): Promise<ApiResponse<Address[]>> => httpClient.get(ENDPOINTS.USERS.ADDRESSES),

  addAddress: (data: Omit<Address, "id">): Promise<ApiResponse<Address>> =>
    httpClient.post(ENDPOINTS.USERS.ADD_ADDRESS, data),

  updateAddress: (id: string, data: Partial<Address>): Promise<ApiResponse<Address>> =>
    httpClient.patch(ENDPOINTS.USERS.DELETE_ADDRESS(id), data),

  deleteAddress: (id: string): Promise<ApiResponse<void>> => httpClient.delete(ENDPOINTS.USERS.DELETE_ADDRESS(id)),

  // Wishlist
  getWishlist: (): Promise<ApiResponse<WishlistItem[]>> => httpClient.get(ENDPOINTS.USERS.WISHLIST),

  addToWishlist: (productId: string): Promise<ApiResponse<WishlistItem>> =>
    httpClient.post(ENDPOINTS.USERS.WISHLIST, { product_id: productId }),

  removeFromWishlist: (productId: string): Promise<ApiResponse<void>> =>
    httpClient.delete(`${ENDPOINTS.USERS.WISHLIST}/${productId}`),

  // Notifications
  getNotifications: (params?: {
    type?: string
    unread_only?: boolean
    page?: number
    limit?: number
  }): Promise<ApiResponse<Notification[]>> => httpClient.get(ENDPOINTS.USERS.NOTIFICATIONS, { params }),

  markNotificationRead: (id: string): Promise<ApiResponse<void>> =>
    httpClient.post(ENDPOINTS.NOTIFICATIONS.MARK_READ(id)),

  markAllNotificationsRead: (): Promise<ApiResponse<void>> => httpClient.post(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ),

  // Preferences
  getPreferences: (): Promise<ApiResponse<NotificationPreferences>> => httpClient.get(ENDPOINTS.USERS.PREFERENCES),

  updatePreferences: (data: Partial<NotificationPreferences>): Promise<ApiResponse<NotificationPreferences>> =>
    httpClient.patch(ENDPOINTS.USERS.PREFERENCES, data),

  // Push Notifications
  subscribePush: (subscription: PushSubscription): Promise<ApiResponse<void>> =>
    httpClient.post(ENDPOINTS.NOTIFICATIONS.SUBSCRIBE_PUSH, {
      subscription: subscription.toJSON(),
    }),
}

export default userService
