/**
 * Zustand App Store - Layer 2 Frontend State Management
 * Global application state
 */

import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

// Types
interface User {
  id: string
  email: string
  full_name: string
  username: string
  avatar_url?: string
  is_seller: boolean
  seller_id?: string
}

interface AppState {
  // User
  user: User | null
  isAuthenticated: boolean

  // UI State
  sidebarOpen: boolean
  mobileMenuOpen: boolean
  theme: "light" | "dark" | "system"

  // Loading States
  isLoading: boolean
  loadingMessage: string | null

  // Notifications
  unreadNotifications: number
  unreadMessages: number

  // Actions
  setUser: (user: User | null) => void
  logout: () => void
  setSidebarOpen: (open: boolean) => void
  setMobileMenuOpen: (open: boolean) => void
  setTheme: (theme: "light" | "dark" | "system") => void
  setUnreadNotifications: (count: number) => void
  setUnreadMessages: (count: number) => void
  incrementUnreadNotifications: () => void
  incrementUnreadMessages: () => void
  decrementUnreadNotifications: () => void
  decrementUnreadMessages: () => void
  setLoading: (loading: boolean, message?: string | null) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Initial State
        user: null,
        isAuthenticated: false,
        sidebarOpen: true,
        mobileMenuOpen: false,
        theme: "system",
        isLoading: false,
        loadingMessage: null,
        unreadNotifications: 0,
        unreadMessages: 0,

        // Actions
        setUser: (user) =>
          set({
            user,
            isAuthenticated: !!user,
          }),

        logout: () =>
          set({
            user: null,
            isAuthenticated: false,
            unreadNotifications: 0,
            unreadMessages: 0,
          }),

        setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
        setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
        setTheme: (theme) => set({ theme }),

        setLoading: (isLoading, message = null) =>
  set({
    isLoading,
    loadingMessage: message,
  }),

        setUnreadNotifications: (unreadNotifications) => set({ unreadNotifications }),
        setUnreadMessages: (unreadMessages) => set({ unreadMessages }),

        incrementUnreadNotifications: () =>
          set((state) => ({
            unreadNotifications: state.unreadNotifications + 1,
          })),
        incrementUnreadMessages: () =>
          set((state) => ({
            unreadMessages: state.unreadMessages + 1,
          })),
        decrementUnreadNotifications: () =>
          set((state) => ({
            unreadNotifications: Math.max(0, state.unreadNotifications - 1),
          })),
        decrementUnreadMessages: () =>
          set((state) => ({
            unreadMessages: Math.max(0, state.unreadMessages - 1),
          })),
      }),
      {
        name: "mithas-app-store",
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
        }),
      },
    ),
    { name: "AppStore" },
  ),
)
