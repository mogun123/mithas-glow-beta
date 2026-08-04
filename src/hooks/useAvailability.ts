import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { ArtistAvailability, WeeklySchedule, BlockedDate } from '../lib/database.types';

interface UseAvailabilityReturn {
  availability: ArtistAvailability | null;
  loading: boolean;
  error: string | null;
  saveAvailability: (data: Partial<ArtistAvailability>) => Promise<boolean>;
  addBlockedDate: (date: string, reason: string) => Promise<boolean>;
  removeBlockedDate: (date: string) => Promise<boolean>;
  refreshAvailability: () => Promise<void>;
}

export function useAvailability(): UseAvailabilityReturn {
  const [availability, setAvailability] = useState<ArtistAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError('No authenticated user');
        setLoading(false);
        return;
      }

      // Try artist_availability table first
      let { data, error: availError } = await supabase
        .from('artist_availability')
        .select('*')
        .eq('artist_id', session.user.id)
        .single();

      // Fallback to profiles table if table doesn't exist
      if (availError && availError.code === '42P01') {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('availability_settings')
          .eq('id', session.user.id)
          .single();

        if (profileError) throw profileError;
        data = profileData?.availability_settings || null;
      }

      if (availError && availError.code !== '42P01') throw availError;
      setAvailability(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch availability');
      console.error('Availability fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const saveAvailability = async (data: Partial<ArtistAvailability>): Promise<boolean> => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError('No authenticated user');
        return false;
      }

      const payload = {
        artist_id: session.user.id,
        weekly_schedule: data.weekly_schedule || availability?.weekly_schedule || {},
        slot_duration: data.slot_duration || availability?.slot_duration || 60,
        max_bookings_per_day: data.max_bookings_per_day || availability?.max_bookings_per_day || 5,
        is_vacation_mode: data.is_vacation_mode ?? availability?.is_vacation_mode ?? false,
        updated_at: new Date().toISOString(),
      };

      // Try artist_availability table first
      let { error: upsertError } = await supabase
        .from('artist_availability')
        .upsert(payload);

      // Fallback to profiles table
      if (upsertError && upsertError.code === '42P01') {
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            availability_settings: {
              ...availability,
              ...payload,
              artist_id: undefined, // Don't store artist_id in JSONB
            },
          })
          .eq('id', session.user.id);

        if (profileUpdateError) throw profileUpdateError;
      } else if (upsertError) {
        throw upsertError;
      }

      await fetchAvailability();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to save availability');
      console.error('Availability save error:', err);
      return false;
    }
  };

  const addBlockedDate = async (date: string, reason: string): Promise<boolean> => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return false;

      const newBlockedDate: BlockedDate = {
        date,
        reason,
        blocked_at: new Date().toISOString(),
      };

      const updatedBlockedDates = [
        ...(availability?.blocked_dates || []),
        newBlockedDate,
      ];

      return await saveAvailability({ blocked_dates: updatedBlockedDates });
    } catch (err: any) {
      setError(err.message || 'Failed to add blocked date');
      return false;
    }
  };

  const removeBlockedDate = async (date: string): Promise<boolean> => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return false;

      const updatedBlockedDates = (availability?.blocked_dates || []).filter(
        (bd) => bd.date !== date
      );

      return await saveAvailability({ blocked_dates: updatedBlockedDates });
    } catch (err: any) {
      setError(err.message || 'Failed to remove blocked date');
      return false;
    }
  };

  return {
    availability,
    loading,
    error,
    saveAvailability,
    addBlockedDate,
    removeBlockedDate,
    refreshAvailability: fetchAvailability,
  };
}
