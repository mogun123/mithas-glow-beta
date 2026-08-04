

import { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import { supabase, isSupabaseConfigured } from '../supabase';
import { toast } from 'sonner';
import type { Database } from '../database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useAuth() {
  console.log('useAuth: Calling useAuthStore...');
  const { user, session, isAuthenticated, isLoading, setUser, setSession, setLoading, logout: logoutStore } = useAuthStore();
  console.log('useAuth: user:', user?.id || 'no-user', 'session:', session?.user?.id || 'no-session', 'isAuthenticated:', isAuthenticated);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Check for existing session
    const initAuth = async () => {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
          setSession(session);
          await fetchProfile(session.user.id);
        }
      } catch (err: any) {
        console.error('Auth initialization error:', err.message || JSON.stringify(err));
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      setSession(session);
      
      if (event === 'SIGNED_IN' && session) {
        await fetchProfile(session.user.id);
        // CRITICAL FIX: Sync global store for dual-mode architecture
        try {
          const globalStore = await import('../globalStore').then(m => m.useGlobalStore.getState());
          await globalStore.fetchUserProfile(session.user.id);
        } catch (e) {
          console.error('Error syncing global store:', e);
        }
        toast.success('Welcome to MITHAS Glow! ✨');
      } else if (event === 'SIGNED_OUT') {
        logoutStore();
        // Clear global store on logout
        try {
          const globalStore = await import('../globalStore').then(m => m.useGlobalStore.getState());
          globalStore.clearData();
        } catch (e) {
          console.error('Error clearing global store:', e);
        }
        toast.info('Signed out successfully');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch user profile from database
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      if (data) {
        setUser(data);
        
        // Update last login
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', userId);
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err.message || JSON.stringify(err));
      setError(err.message);
    }
  };

  // Sign up with email
  const signUp = async (email: string, password: string, metadata?: Partial<Profile>) => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      toast.error('⚠️ Supabase is not configured. Please add your credentials to .env.local');
      console.warn('📖 See ENV_SETUP_INSTRUCTIONS.md for help');
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metadata } });
      
      if (error) throw error;
      
      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            full_name: metadata?.full_name || null,
            gender: metadata?.gender || null,
            role: 'buyer',
          });

        if (profileError) throw profileError;
        
        toast.success('Account created! Please check your email to verify.');
        return { success: true, data };
      }
      
      return { success: false, error: 'Failed to create account' };
    } catch (err: any) {
      console.error('Sign up error:', err.message || JSON.stringify(err));
      setError(err.message);
      toast.error(err.message || 'Failed to create account');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email
  const signIn = async (email: string, password: string) => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      toast.error('⚠️ Supabase is not configured. Please add your credentials to .env.local');
      console.warn('📖 See ENV_SETUP_INSTRUCTIONS.md for help');
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      
      if (data.session) {
        await fetchProfile(data.session.user.id);
        return { success: true, data };
      }
      
      return { success: false, error: 'Failed to sign in' };
    } catch (err: any) {
      console.error('Sign in error:', err.message || JSON.stringify(err));
      setError(err.message);
      toast.error(err.message || 'Failed to sign in');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Sign in with phone (OTP)
  const signInWithPhone = async (phone: string) => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      toast.error('⚠️ Supabase is not configured. Please add your credentials to .env.local');
      console.warn('📖 See ENV_SETUP_INSTRUCTIONS.md for help');
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithOtp({ phone });
      
      if (error) throw error;
      
      toast.success('OTP sent to your phone!');
      return { success: true, data };
    } catch (err: any) {
      console.error('Phone sign in error:', err.message || JSON.stringify(err));
      setError(err.message);
      toast.error(err.message || 'Failed to send OTP');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const verifyOTP = async (phone: string, token: string) => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      toast.error('⚠️ Supabase is not configured. Please add your credentials to .env.local');
      console.warn('📖 See ENV_SETUP_INSTRUCTIONS.md for help');
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
      
      if (error) throw error;
      
      if (data.session) {
        // Check if profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single();

        if (!profile) {
          // Create profile for new user
          await supabase.from('profiles').insert({
            id: data.session.user.id,
            phone: phone,
            role: 'buyer',
          });
        }
        
        await fetchProfile(data.session.user.id);
        return { success: true, data };
      }
      
      return { success: false, error: 'Invalid OTP' };
    } catch (err: any) {
      console.error('OTP verification error:', err.message || JSON.stringify(err));
      setError(err.message);
      toast.error(err.message || 'Invalid OTP');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Update profile
  const updateProfile = async (updates: Partial<Profile>) => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      toast.error('⚠️ Supabase is not configured. Please add your credentials to .env.local');
      console.warn('📖 See ENV_SETUP_INSTRUCTIONS.md for help');
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      if (!user) throw new Error('No user logged in');

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setUser(data);
        toast.success('Profile updated successfully!');
        return { success: true, data };
      }
      
      return { success: false, error: 'Failed to update profile' };
    } catch (err: any) {
      console.error('Update profile error:', err.message || JSON.stringify(err));
      setError(err.message);
      toast.error(err.message || 'Failed to update profile');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const logout = async () => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      // In demo mode, just clear local state
      logoutStore();
      toast.info('Logged out (demo mode)');
      return { success: true };
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      logoutStore();
      return { success: true };
    } catch (err: any) {
      console.error('Logout error:', err.message || JSON.stringify(err));
      setError(err.message);
      toast.error(err.message || 'Failed to sign out');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    // State
    user,
    session,
    isAuthenticated,
    isLoading,
    error,
    
    // Actions
    signUp,
    signIn,
    signInWithPhone,
    verifyOTP,
    updateProfile,
    logout,
  };
}
