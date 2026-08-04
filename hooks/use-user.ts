"use client"

/**
 * User Hooks
 * Profile, addresses, notifications
 */

import useSWR from "swr"
import useSWRMutation from "swr/mutation"
import { userService, type UserProfile, type Notification, type WishlistItem } from "@/lib/api"
import type { Address } from "@/lib/api"
import { toast } from "sonner"

export function useUserProfile() {
  const { data, error, isLoading, mutate } = useSWR<UserProfile>(
    "/users/profile",
    async () => {
      const response = await userService.getProfile()
      if (!response.success) throw new Error(response.error)
      return response.data!
    },
    { revalidateOnFocus: false },
  )

  const update = useSWRMutation(
    "/users/profile",
    async (_, { arg }: { arg: Partial<UserProfile> }) => {
      const response = await userService.updateProfile(arg)
      if (!response.success) throw new Error(response.error)
      return response.data
    },
    {
      onSuccess: () => {
        mutate()
        toast.success("Profile updated!")
      },
      onError: (err) => toast.error(err.message || "Failed to update profile"),
    },
  )

  return {
    profile: data,
    isLoading,
    error,
    updateProfile: update.trigger,
    isUpdating: update.isMutating,
    refetch: mutate,
  }
}

export function useAddresses() {
  const { data, error, isLoading, mutate } = useSWR<Address[]>(
    "/users/addresses",
    async () => {
      const response = await userService.getAddresses()
      if (!response.success) throw new Error(response.error)
      return response.data || []
    },
    { revalidateOnFocus: false },
  )

  const add = useSWRMutation(
    "/users/addresses",
    async (_, { arg }: { arg: Omit<Address, "id"> }) => {
      const response = await userService.addAddress(arg)
      if (!response.success) throw new Error(response.error)
      return response.data
    },
    {
      onSuccess: () => {
        mutate()
        toast.success("Address added!")
      },
      onError: (err) => toast.error(err.message || "Failed to add address"),
    },
  )

  const remove = useSWRMutation(
    "/users/addresses/delete",
    async (_, { arg }: { arg: string }) => {
      const response = await userService.deleteAddress(arg)
      if (!response.success) throw new Error(response.error)
    },
    {
      onSuccess: () => {
        mutate()
        toast.success("Address removed!")
      },
      onError: (err) => toast.error(err.message || "Failed to remove address"),
    },
  )

  return {
    addresses: data || [],
    isLoading,
    error,
    addAddress: add.trigger,
    isAdding: add.isMutating,
    deleteAddress: remove.trigger,
    isDeleting: remove.isMutating,
    refetch: mutate,
  }
}

export function useWishlist() {
  const { data, error, isLoading, mutate } = useSWR<WishlistItem[]>(
    "/users/wishlist",
    async () => {
      const response = await userService.getWishlist()
      if (!response.success) throw new Error(response.error)
      return response.data || []
    },
    { revalidateOnFocus: false },
  )

  const add = useSWRMutation(
    "/users/wishlist",
    async (_, { arg }: { arg: string }) => {
      const response = await userService.addToWishlist(arg)
      if (!response.success) throw new Error(response.error)
      return response.data
    },
    {
      onSuccess: () => {
        mutate()
        toast.success("Added to wishlist!")
      },
      onError: (err) => toast.error(err.message || "Failed to add to wishlist"),
    },
  )

  const remove = useSWRMutation(
    "/users/wishlist/remove",
    async (_, { arg }: { arg: string }) => {
      const response = await userService.removeFromWishlist(arg)
      if (!response.success) throw new Error(response.error)
    },
    {
      onSuccess: () => {
        mutate()
        toast.success("Removed from wishlist!")
      },
    },
  )

  return {
    items: data || [],
    productIds: data?.map((i) => i.product_id) || [],
    isLoading,
    error,
    addToWishlist: add.trigger,
    removeFromWishlist: remove.trigger,
    refetch: mutate,
  }
}

export function useNotifications() {
  const { data, error, isLoading, mutate } = useSWR<Notification[]>(
    "/users/notifications",
    async () => {
      const response = await userService.getNotifications({ limit: 50 })
      if (!response.success) throw new Error(response.error)
      return response.data || []
    },
    { revalidateOnFocus: true },
  )

  const markRead = useSWRMutation(
    "/notifications/read",
    async (_, { arg }: { arg: string }) => {
      await userService.markNotificationRead(arg)
    },
    { onSuccess: () => mutate() },
  )

  const markAllRead = useSWRMutation(
    "/notifications/read-all",
    async () => {
      await userService.markAllNotificationsRead()
    },
    {
      onSuccess: () => {
        mutate()
        toast.success("All notifications marked as read")
      },
    },
  )

  const unreadCount = data?.filter((n) => !n.is_read).length || 0

  return {
    notifications: data || [],
    unreadCount,
    isLoading,
    error,
    markRead: markRead.trigger,
    markAllRead: markAllRead.trigger,
    refetch: mutate,
  }
}
