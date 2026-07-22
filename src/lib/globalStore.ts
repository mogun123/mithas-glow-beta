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
  user_type: 'normal' | 'pro';
  profile_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface GlobalState {
  // User data
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Data operations
  fetchUserProfile: (userId: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  completeProfileSetup: (profileData: any) => Promise<void>;

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

      // Basic setters
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

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

          set({ user: data as UserProfile, isLoading: false });
        } catch (error: any) {
          console.error('Error fetching user profile:', error);
          set({ error: error.message, isLoading: false });
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
      completeProfileSetup: async (profileData: any) => {
        try {
          set({ isLoading: true, error: null });

          // Get current user
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) throw new Error('No authenticated user');

          // Save profile data
          const { data: savedProfile, error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: authUser.id,
              email: authUser.email,
              ...profileData,
              profile_completed: true,
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (profileError) throw profileError;

          // Update global state
          set({
            user: savedProfile as UserProfile,
            isLoading: false
          });

        } catch (error: any) {
          console.error('Error completing profile setup:', error);
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // Utility functions
      isProUser: () => {
        const user = get().user;
        return user?.user_type === 'pro';
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
          isLoading: false
        });
      }
    }),
    {
      name: 'mithas-glow-storage',
      partialize: (state) => ({
        user: state.user,
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
