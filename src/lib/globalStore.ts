import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect } from 'react';
import { supabase } from './supabase';

// Types for user profile
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  city: string | null;
  role: 'buyer' | 'seller' | 'admin';
  industry?: string | null;
  profile_completed: boolean;
  is_seller?: boolean;
  seller_status?: string | null;
  shop_name?: string | null;
  shop_type?: string | null;
  created_at: string;
  updated_at: string;
  glow_points?: number;
  current_streak?: number;
  best_streak?: number;
}

interface GlobalState {
  // User data
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;

  // DUAL-MODE STATE
  appViewMode: 'pro' | 'self';
  currentUserRole: 'buyer' | 'seller' | 'admin' | null;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAppViewMode: (mode: 'pro' | 'self') => void;
  toggleAppViewMode: () => void;
  setCurrentUserRole: (role: 'buyer' | 'seller' | 'admin' | null) => void;
  setCurrentProfile: (profile: UserProfile | null) => void;

  // Data operations
  fetchUserProfile: (userId: string, showLoader?: boolean) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>, showLoader?: boolean) => Promise<void>;
  completeProfileSetup: (profileData: any, shopData?: any) => Promise<{ profile: any; shop: any | null }>;

  // Utility functions
  isProUser: () => boolean;
  getDisplayName: () => string;
  clearData: () => void;
}

export const useGlobalStore = create<GlobalState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isLoading: false,
      error: null,
      appViewMode: 'self',
      currentUserRole: null,

      // Basic setters
      setUser: (user) => {
  const isProfessional = !!user && (user.role === 'seller' || user.is_seller || user.industry === 'makeup_artist');
  set((state) => ({
    user,
    currentUserRole: user?.role ?? null,
    appViewMode:
      state.user === null && user
        ? (isProfessional ? 'pro' : 'self')
        : state.appViewMode
  }));
},
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // DUAL-MODE ACTIONS
      setAppViewMode: (mode) => set({ appViewMode: mode }),
      toggleAppViewMode: () => {
        const current = get().appViewMode;
        set({ appViewMode: current === 'pro' ? 'self' : 'pro' });
      },
      setCurrentUserRole: (role) => set({ currentUserRole: role }),
      
      // Fixed: Reuse setUser logic for perfect consistency
      setCurrentProfile: (profile) => {
        get().setUser(profile);
      },

      // Fetch user profile (Kept maybeSingle() as it's a fetch/lookup operation)
      fetchUserProfile: async (userId: string, showLoader = false) => {
        try {
          if (showLoader) {
            set({ isLoading: true, error: null });
          }

          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            set((state) => ({
              user: data as UserProfile,
              currentUserRole: data.role,
              appViewMode:
                state.user == null
                  ? ((data.role === 'seller' || data.is_seller || data.industry === 'makeup_artist') ? 'pro' : 'self')
                  : state.appViewMode,
              isLoading: false
            }));
          } else {
            set({ isLoading: false });
          }

        } catch (error: any) {
          console.error('Error fetching user profile:', error);
          const message = error?.message || 'Failed to load user profile';
          set({
            error: message,
            isLoading: false,
            user: null,
            currentUserRole: null,
          });
          throw new Error(message);
        }
      },

      // Force refresh profile from DB
      refreshProfile: async () => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          
          if (!authUser) {
            set({ user: null, currentUserRole: null, isLoading: false, appViewMode: 'self' });
            return;
          }

          await get().fetchUserProfile(authUser.id, false);
        } catch (error: any) {
          console.error('Error refreshing profile:', error);
          set({ error: error.message || 'Profile refresh failed' });
        }
      },

      // Update profile
      updateProfile: async (updates: Partial<UserProfile>, showLoader = true) => {
        try {
          if (showLoader) set({ isLoading: true, error: null });

          const currentUser = get().user;
          if (!currentUser) throw new Error('No user found');

          const { data: updatedData, error } = await supabase
            .from('profiles')
            .update({
              ...updates,
              updated_at: new Date().toISOString()
            } as any)
            .eq('id', currentUser.id)
            .select()
            .single();

          if (error) throw error;

          set({
            user: updatedData as UserProfile,
            currentUserRole: updatedData?.role ?? null,
            isLoading: false
          });
        } catch (error: any) {
          console.error('Error updating profile:', error);
          set({ 
            error: error.message, 
            isLoading: false
          });
        }
      },

      // Complete profile setup
      completeProfileSetup: async (profileData: any, shopData?: any) => {
        try {
          set({ isLoading: true, error: null });

          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) throw new Error('No authenticated user');

          const profileUpdate: any = {
            id: authUser.id,
            email: authUser.email,
            profile_completed: true,
            updated_at: new Date().toISOString(),
            role: profileData.user_type === 'pro' ? 'seller' : 'buyer',
            industry: profileData.user_type === 'pro' ? (profileData.industry || '') : null,
            username: profileData.username,
            display_name: profileData.display_name,
            bio: profileData.bio,
            city: profileData.city,
            phone: profileData.phone,
            is_seller: profileData.is_seller ?? (profileData.user_type === 'pro'),
            seller_status: profileData.seller_status ?? (profileData.user_type === 'pro' ? 'pending' : null)
          };

          // Reverted to .single() for strict creation safety (Fail Fast)
          const { data: savedProfile, error: profileError } = await supabase
            .from('profiles')
            .upsert(profileUpdate)
            .select()
            .single();

          if (profileError) throw profileError;

          let savedShop = null;
          if (shopData && profileData.user_type === 'pro') {
            // Reverted to .single() for strict creation safety (Fail Fast)
            const { data: shopResult, error: shopError } = await supabase
              .from('shops')
              .insert({
                owner_id: authUser.id,
                ...shopData,
                is_active: true
              })
              .select()
              .single();

            if (shopError) {
              console.warn('Shop creation warning:', shopError);
            } else {
              savedShop = shopResult;
            }
          }

          const isPro = !!savedProfile && (savedProfile.role === 'seller' || savedProfile.is_seller || savedProfile.industry === 'makeup_artist');
          set({
            user: savedProfile as UserProfile,
            currentUserRole: savedProfile?.role ?? null,
            isLoading: false,
            appViewMode: isPro ? 'pro' : 'self'
          });

          return { profile: savedProfile, shop: savedShop };

        } catch (error: any) {
          console.error('Error completing profile setup:', error);
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // Utility functions
      isProUser: () => {
        const user = get().user;
        return !!user && (user.role === 'seller' || user.is_seller || user.industry === 'makeup_artist');
      },

      getDisplayName: () => {
        const user = get().user;
        if (!user) return 'Guest User';
        return user.display_name || user.full_name || user.username || 'Guest User';
      },

      clearData: () => {
        set({
          user: null,
          currentUserRole: null,
          error: null,
          isLoading: false,
          appViewMode: 'self'
        });
      }
    }),
    {
      name: 'mithas-glow-storage',
      partialize: (state) => ({
        user: state.user,
        currentUserRole: state.currentUserRole,
        appViewMode: state.appViewMode,
      }),
    }
  )
);

// Real-time subscription hook
export const useRealtimeProfile = (userId: string) => {
  const { setUser } = useGlobalStore();

  useEffect(() => {
    if (!userId) return;

    const profileSubscription = supabase
      .channel(`profile-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          if (payload.new) {
            setUser(payload.new as UserProfile);
          }
        }
      )
      .subscribe((status) => {
        // Safe logging only in Development environment
        if (import.meta.env.DEV) {
          console.log("Profile realtime subscription status:", status);
        }
      });

    return () => {
      supabase.removeChannel(profileSubscription);
    };
  }, [userId, setUser]);
};
