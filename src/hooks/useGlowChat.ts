import { useState, useEffect, useCallback } from 'react';
import { supabase, db } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface UseGlowChatReturn {
  currentUserId: string | null;
  loading: boolean;
  error: string | null;
}

export function useGlowChat(): UseGlowChatReturn {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await db.auth.getUser();
        setCurrentUserId(user?.id || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get user');
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const { data: authListener } = db.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { currentUserId, loading, error };
}
