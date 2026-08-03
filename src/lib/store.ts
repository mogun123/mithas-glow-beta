/**
 * Global State Management with Zustand
 * MITHAS SKIN AI V1 - Centralized state for app
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Database } from './database.types';
import { supabase } from './supabase';

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
  fetchProfile: (userId: string) => Promise<void>;
}
                                       

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      profileCompleted: false,
      profile: null as any,

      setProfile: (profile: any) => set({ profile }),

      // Fetch profile with glow_points and current_streak from database
      fetchProfile: async (userId: string) => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*, glow_points, current_streak, best_streak')
            .eq('id', userId)
            .single();

          if (error) throw error;
          
          if (data) {
            set({ 
              user: data,
              profile: data,
              isAuthenticated: !!data,
            });
            
            // Update last login
            await supabase
              .from('profiles')
              .update({ last_login_at: new Date().toISOString() })
              .eq('id', userId);
          }
        } catch (err: any) {
          console.error('Error fetching profile:', err.message || JSON.stringify(err));
        }
      },

      setUser: (user) =>
        set({
          user,
          profile: user, // Sync profile with user for immediate UI updates
          isAuthenticated: !!user,
        }),

      setSession: (session) =>
        set({
          session,
          user: session?.user ?? null,
          profile: session?.user ?? null, // Sync profile with session
          isAuthenticated: !!session?.user,
        }),

      setLoading: (loading) =>
        set({ isLoading: loading }),

      setProfileCompleted: (value) =>
        set({ profileCompleted: value }),

      logout: () =>
        set({
          user: null,
          profile: null,
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
