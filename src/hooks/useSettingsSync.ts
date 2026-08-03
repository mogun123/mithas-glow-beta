import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface UserPreferences {
  id?: string;
  user_id: string;
  bubble_style: 'soft' | 'minimal' | 'bold';
  font_style: string;
  chat_background: string;
  app_theme: 'light' | 'dark' | 'glow';
  language: string;
  smart_alerts_enabled: boolean;
  online_status_hidden: boolean;
  read_receipts_disabled: boolean;
  profile_photo_hidden: boolean;
  cloud_sync_enabled: boolean;
  font_size: 'small' | 'medium' | 'large';
  animation_toggle: boolean;
  ai_personality: string;
  motion_intensity: 'low' | 'medium' | 'high';
  auto_clean_cache: boolean;
  haptic_feedback_strength: 'off' | 'low' | 'high';
  updated_at?: string;
}

interface UseSettingsSyncReturn {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  syncStatus: 'synced' | 'syncing' | 'error';
}

const DEFAULT_PREFERENCES: Omit<UserPreferences, 'user_id' | 'id'> = {
  bubble_style: 'soft',
  font_style: 'Glow Sans',
  chat_background: 'bg-gradient-to-b from-gray-50 to-white',
  app_theme: 'light',
  language: 'english',
  smart_alerts_enabled: true,
  online_status_hidden: false,
  read_receipts_disabled: false,
  profile_photo_hidden: false,
  cloud_sync_enabled: true,
  font_size: 'medium',
  animation_toggle: true,
  ai_personality: 'friendly',
  motion_intensity: 'medium',
  auto_clean_cache: false,
  haptic_feedback_strength: 'low',
};

export function useSettingsSync(): UseSettingsSyncReturn {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL || '',
    import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  );

  // Fetch user preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: existingPrefs, error: fetchError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingPrefs) {
        setPreferences(existingPrefs);
      } else {
        // Create default preferences for new user
        const newPrefs: UserPreferences = {
          ...DEFAULT_PREFERENCES,
          user_id: user.id,
        };

        const { data: createdPrefs, error: createError } = await supabase
          .from('user_preferences')
          .insert(newPrefs)
          .select()
          .single();

        if (createError) throw createError;
        setPreferences(createdPrefs);
      }

      setSyncStatus('synced');
    } catch (err) {
      console.error('Failed to fetch preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Debounced update function to prevent excessive API calls
  const debouncedUpdate = useCallback(
    debounce(async (updates: Partial<UserPreferences>) => {
      if (!preferences) return;

      try {
        setSyncStatus('syncing');

        const { data: updatedPrefs, error: updateError } = await supabase
          .from('user_preferences')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', preferences.id)
          .select()
          .single();

        if (updateError) throw updateError;

        setPreferences(updatedPrefs);
        setSyncStatus('synced');
      } catch (err) {
        console.error('Failed to update preferences:', err);
        setError(err instanceof Error ? err.message : 'Failed to update preferences');
        setSyncStatus('error');
      }
    }, 1000), // 1 second debounce
    [preferences, supabase]
  );

  const updatePreference = useCallback(
    async <K extends keyof UserPreferences>(
      key: K,
      value: UserPreferences[K]
    ) => {
      if (!preferences) return;

      // Update local state immediately for responsive UI
      const updatedPrefs = { ...preferences, [key]: value };
      setPreferences(updatedPrefs);

      // Only sync to cloud if cloud_sync is enabled
      if (preferences.cloud_sync_enabled) {
        await debouncedUpdate({ [key]: value });
      }
    },
    [preferences, debouncedUpdate]
  );

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      if (!preferences) return;

      // Update local state immediately
      const updatedPrefs = { ...preferences, ...updates };
      setPreferences(updatedPrefs);

      // Only sync to cloud if cloud_sync is enabled
      if (preferences.cloud_sync_enabled) {
        await debouncedUpdate(updates);
      }
    },
    [preferences, debouncedUpdate]
  );

  const resetToDefaults = useCallback(async () => {
    if (!preferences) return;

    try {
      setSyncStatus('syncing');

      const { data: updatedPrefs, error: resetError } = await supabase
        .from('user_preferences')
        .update({
          ...DEFAULT_PREFERENCES,
          updated_at: new Date().toISOString(),
        })
        .eq('id', preferences.id)
        .select()
        .single();

      if (resetError) throw resetError;

      setPreferences(updatedPrefs);
      setSyncStatus('synced');
    } catch (err) {
      console.error('Failed to reset preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset preferences');
      setSyncStatus('error');
    }
  }, [preferences, supabase]);

  // Force sync when cloud_sync is toggled on
  useEffect(() => {
    if (preferences && preferences.cloud_sync_enabled && syncStatus === 'error') {
      fetchPreferences();
    }
  }, [preferences?.cloud_sync_enabled, syncStatus, fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreference,
    updatePreferences,
    resetToDefaults,
    syncStatus,
  };
}

// Helper hook to convert preferences to component props
export function useSettingsProps() {
  const { preferences, updatePreference, ...rest } = useSettingsSync();

  if (!preferences) {
    return {
      ...rest,
      // Return default values while loading
      bubbleStyle: 'soft' as const,
      fontStyle: 'Glow Sans',
      chatBackground: 'bg-gradient-to-b from-gray-50 to-white',
      appTheme: 'light' as const,
      language: 'english',
      smartAlertsEnabled: true,
      onlineStatusHidden: false,
      readReceiptsDisabled: false,
      profilePhotoHidden: false,
      cloudSyncEnabled: true,
      fontSize: 'medium' as const,
      animationToggle: true,
      aiPersonality: 'friendly',
      motionIntensity: 'medium' as const,
      autoCleanCache: false,
      hapticFeedbackStrength: 'low' as const,
      setBubbleStyle: (value: any) => updatePreference('bubble_style', value),
      setFontStyle: (value: any) => updatePreference('font_style', value),
      setChatBackground: (value: any) => updatePreference('chat_background', value),
      setAppTheme: (value: any) => updatePreference('app_theme', value),
      setLanguage: (value: any) => updatePreference('language', value),
      setSmartAlertsEnabled: (value: any) => updatePreference('smart_alerts_enabled', value),
      setOnlineStatusHidden: (value: any) => updatePreference('online_status_hidden', value),
      setReadReceiptsDisabled: (value: any) => updatePreference('read_receipts_disabled', value),
      setProfilePhotoHidden: (value: any) => updatePreference('profile_photo_hidden', value),
      setCloudSyncEnabled: (value: any) => updatePreference('cloud_sync_enabled', value),
      setFontSize: (value: any) => updatePreference('font_size', value),
      setAnimationToggle: (value: any) => updatePreference('animation_toggle', value),
      setAiPersonality: (value: any) => updatePreference('ai_personality', value),
      setMotionIntensity: (value: any) => updatePreference('motion_intensity', value),
      setAutoCleanCache: (value: any) => updatePreference('auto_clean_cache', value),
      setHapticFeedbackStrength: (value: any) => updatePreference('haptic_feedback_strength', value),
    };
  }

  return {
    ...rest,
    bubbleStyle: preferences.bubble_style,
    fontStyle: preferences.font_style,
    chatBackground: preferences.chat_background,
    appTheme: preferences.app_theme,
    language: preferences.language,
    smartAlertsEnabled: preferences.smart_alerts_enabled,
    onlineStatusHidden: preferences.online_status_hidden,
    readReceiptsDisabled: preferences.read_receipts_disabled,
    profilePhotoHidden: preferences.profile_photo_hidden,
    cloudSyncEnabled: preferences.cloud_sync_enabled,
    fontSize: preferences.font_size,
    animationToggle: preferences.animation_toggle,
    aiPersonality: preferences.ai_personality,
    motionIntensity: preferences.motion_intensity,
    autoCleanCache: preferences.auto_clean_cache,
    hapticFeedbackStrength: preferences.haptic_feedback_strength,
    setBubbleStyle: (value: any) => updatePreference('bubble_style', value),
    setFontStyle: (value: any) => updatePreference('font_style', value),
    setChatBackground: (value: any) => updatePreference('chat_background', value),
    setAppTheme: (value: any) => updatePreference('app_theme', value),
    setLanguage: (value: any) => updatePreference('language', value),
    setSmartAlertsEnabled: (value: any) => updatePreference('smart_alerts_enabled', value),
    setOnlineStatusHidden: (value: any) => updatePreference('online_status_hidden', value),
    setReadReceiptsDisabled: (value: any) => updatePreference('read_receipts_disabled', value),
    setProfilePhotoHidden: (value: any) => updatePreference('profile_photo_hidden', value),
    setCloudSyncEnabled: (value: any) => updatePreference('cloud_sync_enabled', value),
    setFontSize: (value: any) => updatePreference('font_size', value),
    setAnimationToggle: (value: any) => updatePreference('animation_toggle', value),
    setAiPersonality: (value: any) => updatePreference('ai_personality', value),
    setMotionIntensity: (value: any) => updatePreference('motion_intensity', value),
    setAutoCleanCache: (value: any) => updatePreference('auto_clean_cache', value),
    setHapticFeedbackStrength: (value: any) => updatePreference('haptic_feedback_strength', value),
  };
}
