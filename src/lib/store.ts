/**
 * Global State Management with Zustand
 * MITHAS SKIN AI V1 - Centralized state for app
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Database } from './database.types';

// Type aliases for cleaner code
type Profile = Database['public']['Tables']['profiles']['Row'];
type Notification = Database['public']['Tables']['notifications']['Row'];

// =====================================================
// AUTH STORE
// =====================================================
interface AuthState {
  user: Profile | null;
  session: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  profileCompleted: boolean;
  profile: Profile | null;

  
  // Actions
  setUser: (user: Profile | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSession: (session: any | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  setProfileCompleted: (value: boolean) => void;
}
                                       

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      profileCompleted: false,
      profile: null as any,

      setProfile: (profile: any) => set({ profile }),

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setSession: (session) =>
        set({
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session?.user,
        }),

      setLoading: (loading) =>
        set({ isLoading: loading }),

      setProfileCompleted: (value) =>
        set({ profileCompleted: value }),

      logout: () =>
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          profileCompleted: false,
        }),
    }),
    {
      name: "mithas-auth",

      // ✅ THIS LINE FIXES WHITE SCREEN
      storage:
        typeof window !== "undefined"
          ? createJSONStorage(() => localStorage)
          : undefined,
    }
  )
);

// =====================================================
// NOTIFICATION STORE
// =====================================================
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  
  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  
  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    set({ notifications, unreadCount });
  },
  
  addNotification: (notification) => set((state) => {
    const notifications = [notification, ...state.notifications];
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    return { notifications, unreadCount };
  }),
  
  markAsRead: (notificationId) => set((state) => {
    const notifications = state.notifications.map((n) =>
      n.id === notificationId ? { ...n, is_read: true } : n
    );
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    return { notifications, unreadCount };
  }),
  
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
    unreadCount: 0,
  })),
  
  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
}));

// =====================================================
// UI STORE (Theme, Modals, etc.)
// =====================================================
interface UIState {
  theme: 'light' | 'dark';
  isSearchOpen: boolean;
  isNotificationOpen: boolean;
  activeModal: string | null;
  
  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSearch: () => void;
  toggleNotifications: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      isSearchOpen: false,
      isNotificationOpen: false,
      activeModal: null,
      
      setTheme: (theme) => set({ theme }),
      toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
      toggleNotifications: () => set((state) => ({
        isNotificationOpen: !state.isNotificationOpen,
      })),
      openModal: (modalId) => set({ activeModal: modalId }),
      closeModal: () => set({ activeModal: null }),
    }),
    {
      name: 'mithas-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);

// Export all stores
export default {
  useAuthStore,
  useNotificationStore,
  useUIStore,
};
