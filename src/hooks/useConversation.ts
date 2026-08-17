import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface ConversationWithProfiles extends Conversation {
  customer_profile?: Pick<Profile, 'full_name' | 'avatar_url'>;
  artist_profile?: Pick<Profile, 'full_name' | 'avatar_url'>;
}

interface UseConversationReturn {
  conversation: ConversationWithProfiles | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useConversation(conversationId: string | null): UseConversationReturn {
  const [conversation, setConversation] = useState<ConversationWithProfiles | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversation = useCallback(async () => {
    if (!conversationId) {
      setConversation(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: convo, error: convoError } = await db
        .from('conversations')
        .select(`
          *,
          customer_profile:profiles!customer_id(full_name, avatar_url),
          artist_profile:profiles!artist_id(full_name, avatar_url)
        `)
        .eq('id', conversationId)
        .single();

      if (convoError) {
        if (convoError.code === 'PGRST116') {
          // Row not found - unauthorized or doesn't exist
          setConversation(null);
        } else {
          throw convoError;
        }
      } else {
        setConversation(convo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch conversation');
      setConversation(null);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchConversation();

    if (!conversationId) return;

    // Subscribe to conversation changes
    const channel = db
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        },
        () => {
          fetchConversation();
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [conversationId, fetchConversation]);

  return { conversation, loading, error, refresh: fetchConversation };
}
