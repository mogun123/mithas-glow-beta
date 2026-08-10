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
  
  // 🎯 FIX: Added servicesData parameter to accept the pricing list
  completeProfileSetup: (profileData: any, shopData?: any, servicesData?: any[]) => Promise<{ profile: any; shop: any | null }>;

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
      
      setCurrentProfile: (profile) => {
        get().setUser(profile);
      },

      fetchUserProfile: async (userId: string, showLoader = false) => {
        try {
          if (showLoader) {
            set({ isLoading: true, error: null });
          }

          console.log("🛠️ globalStore: Requesting profile data...");

          const fetchPromise = supabase.from('profiles').select('*').eq('id', userId).single();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT_ERROR')), 6000)
          );

          const result: any = await Promise.race([fetchPromise, timeoutPromise]);

          if (result.error) throw result.error;

          if (result.data) {
            const data = result.data;
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
            set({ user: null, currentUserRole: null, isLoading: false });
          }
        } catch (error: any) {
          console.error(`🛠️ globalStore.fetchUserProfile ERROR:`, error);
          
          set((state) => ({
            error: error?.message === 'TIMEOUT_ERROR' ? 'Network timeout' : (error?.message || 'Failed to load profile'),
            isLoading: false, 
            ...(error?.message !== 'TIMEOUT_ERROR' && { user: null, currentUserRole: null })
          }));
        }
      },

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
          set({ error: error.message || 'Profile refresh failed', isLoading: false });
        }
      },

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
          set({ error: error.message, isLoading: false });
        }
      },

      // 🎯 FIX: Included servicesData to save the Artist Rates 
      completeProfileSetup: async (profileData: any, shopData?: any, servicesData?: any[]) => {
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

          // NOTE: artist_services.artist_id FK references profiles(id), NOT users(id)
          // So we must ensure profiles row exists before any artist_services insert
          const { data: savedProfile, error: profileError } = await supabase
            .from('profiles')
            .upsert(profileUpdate)
            .select()
            .single();

          if (profileError) {
            console.error('Profile upsert failed:', profileError);
            throw new Error(`Failed to create profile: ${profileError.message}`);
          }

          if (!savedProfile) {
            throw new Error('Profile upsert returned no data');
          }

          let savedShop = null;
          if (shopData && profileData.user_type === 'pro') {
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
              console.error('Shop creation failed:', shopError);
              throw new Error(`Failed to create shop: ${shopError.message}`);
            } else {
              savedShop = shopResult;
            }

            // 🎯 NEW: Save Services (Rates) into artist_services table
            if (servicesData && servicesData.length > 0) {
              // Prepare data for Supabase insert
              const servicesToInsert = servicesData
                .filter((s: any) => s.title && s.price) // Only valid entries
                .map((s: any) => ({
                  artist_id: authUser.id,
                  title: s.title,
                  price: parseFloat(s.price),
                  duration_minutes: 60, // Default duration
                  category: 'bridal', // Default category
                  is_active: true
                }));

              if (servicesToInsert.length > 0) {
                const { error: servicesError } = await supabase
                  .from('artist_services')
                  .insert(servicesToInsert);

                if (servicesError) {
                  console.error('Services creation failed:', servicesError);
                  throw new Error(`Failed to save services: ${servicesError.message}`);
                } else {
                  console.log('Services (Rate Card) successfully saved!');
                }
              }
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
        if (import.meta.env.DEV) {
          console.log("Profile realtime subscription status:", status);
        }
      });

    return () => {
      supabase.removeChannel(profileSubscription);
    };
  }, [userId, setUser]);
};
