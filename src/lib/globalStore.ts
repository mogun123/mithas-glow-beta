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
  role: 'buyer' | 'seller' | 'admin'; // CRITICAL: Must match DB constraint
  industry?: string | null;
  profile_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface GlobalState {
  // User data
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  
  // DUAL-MODE STATE (CRITICAL FOR PROFESSIONALS)
  appViewMode: 'pro' | 'self';

  // Actions
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAppViewMode: (mode: 'pro' | 'self') => void;
  toggleAppViewMode: () => void;

  // Data operations
  fetchUserProfile: (userId: string) => Promise<void>;
  refreshProfile: () => Promise<void>; // NEW: Force refresh from DB
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
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
      appViewMode: 'self', // Default to self mode

      // Basic setters
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      
      // DUAL-MODE ACTIONS
      setAppViewMode: (mode) => set({ appViewMode: mode }),
      toggleAppViewMode: () => {
        const current = get().appViewMode;
        set({ appViewMode: current === 'pro' ? 'self' : 'pro' });
      },

      // Fetch user profile
      fetchUserProfile: async (userId: string) => {
        try {
          set({ isLoading: true, error: null });

          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (error) throw error;

          // Set appViewMode based on role
          const isPro = data?.role === 'seller';
          set({ 
            user: data as UserProfile, 
            isLoading: false,
            appViewMode: isPro ? 'pro' : 'self'
          });
        } catch (error: any) {
          console.error('Error fetching user profile:', error);
          set({ error: error.message, isLoading: false });
        }
      },
      
      // NEW: Force refresh profile from DB (FIXES AUTH REFRESH BUG)
      refreshProfile: async () => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) return;
          
          await get().fetchUserProfile(authUser.id);
        } catch (error) {
          console.error('Error refreshing profile:', error);
        }
      },

      // Update profile
      updateProfile: async (data: Partial<UserProfile>) => {
        try {
          set({ isLoading: true, error: null });

          const currentUser = get().user;
          if (!currentUser) throw new Error('No user found');

          const { data: updatedData, error } = await supabase
            .from('profiles')
            .update({
              ...data,
              updated_at: new Date().toISOString()
            } as any)
            .eq('id', currentUser.id)
            .select()
            .single();

          if (error) throw error;

          set({ user: updatedData as UserProfile, isLoading: false });
        } catch (error: any) {
          console.error('Error updating profile:', error);
          set({ error: error.message, isLoading: false });
        }
      },

      // Complete profile setup
      completeProfileSetup: async (profileData: any, shopData?: any) => {
        try {
          set({ isLoading: true, error: null });

          // Get current user
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) throw new Error('No authenticated user');

          // Prepare profile data with role and industry for professionals
          // CRITICAL FIX: Database constraint only allows 'buyer', 'seller', 'admin'
          // Map: 'pro' -> 'seller', 'normal' -> 'buyer'
          const profileUpdate: any = {
            id: authUser.id,
            email: authUser.email,
            profile_completed: true,
            updated_at: new Date().toISOString(),
            // Map user_type to database role enum: 'pro' -> 'seller', 'normal' -> 'buyer'
            role: profileData.user_type === 'pro' ? 'seller' : 'buyer',
            // Only include industry for professionals (sellers)
            industry: profileData.user_type === 'pro' ? (profileData.industry || '') : null,
            // Copy only valid profile fields
            username: profileData.username,
            display_name: profileData.display_name,
            bio: profileData.bio,
            city: profileData.city,
            phone: profileData.phone,
            is_seller: profileData.is_seller ?? (profileData.user_type === 'pro'),
            seller_status: profileData.seller_status ?? (profileData.user_type === 'pro' ? 'pending' : null)
          };

          // Save profile data
          const { data: savedProfile, error: profileError } = await supabase
            .from('profiles')
            .upsert(profileUpdate)
            .select()
            .single();

          if (profileError) throw profileError;

          // If pro user with shop data, save shop details
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
              console.warn('Shop creation warning:', shopError);
              // Don't throw - profile was saved successfully
            } else {
              savedShop = shopResult;
            }
          }

          // Update global state
          set({
            user: savedProfile as UserProfile,
            isLoading: false
          });

          // Return the saved profile and shop data for immediate use
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
        return user?.role === 'seller'; // CRITICAL: Check role, not user_type
      },

      getDisplayName: () => {
        const user = get().user;
        if (!user) return 'Guest User';

        return user.display_name ||
               user.full_name ||
               user.username ||
               'Guest User';
      },

      clearData: () => {
        set({
          user: null,
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
        appViewMode: state.appViewMode, // Persist appViewMode for instant mode switching
      }),
    }
  )
);

// Real-time subscription hook
export const useRealtimeProfile = (userId: string) => {
  const { setUser } = useGlobalStore();

  useEffect(() => {
    if (!userId) return;

    // Subscribe to profile changes
    const profileSubscription = supabase
      .channel('profile-changes')
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
      .subscribe();

    return () => {
      profileSubscription.unsubscribe();
    };
  }, [userId, setUser]);
};
