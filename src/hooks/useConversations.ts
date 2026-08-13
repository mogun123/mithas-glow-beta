import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type ConversationMode = 'artist' | 'contact' | 'messenger';

interface ConversationWithProfiles extends Conversation {
  customer_profile?: { full_name: string; avatar_url: string | null };
  artist_profile?: { full_name: string; avatar_url: string | null };
  last_message?: { content: string; created_at: string; sender_id: string };
  unread_count?: number;
}

interface UseConversationsReturn {
  conversations: ConversationWithProfiles[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useConversations(mode: ConversationMode): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await db.auth.getUser();
      if (!user) {
        setConversations([]);
        return;
      }

      // Fetch conversations for the specific mode
      const { data: convos, error: convoError } = await db
        .from('conversations')
        .select(`
          *,
          customer_profile:profiles!customer_id(full_name, avatar_url),
          artist_profile:profiles!artist_id(full_name, avatar_url),
          last_message:messages!inner(content, created_at, sender_id, conversation_id),
          unread_count:messages!inner(is_read, sender_id, conversation_id)
        `)
        .eq('mode', mode)
        .or(`customer_id.eq.${user.id},artist_id.eq.${user.id}`)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (convoError) throw convoError;

      // Process to get last message and unread count per conversation
      const processed = (convos || []).map((convo) => {
        const messages = (convo.last_message as any[]) || [];
        const lastMsg = messages.length > 0 
          ? messages.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b)
          : undefined;
        
        const unread = messages.filter(
          m => !m.is_read && m.sender_id !== user.id
        ).length;

        return {
          ...convo,
          last_message: lastMsg,
          unread_count: unread
        };
      });

      setConversations(processed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch conversations');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchConversations();

    // Subscribe to conversation changes
    const channel = db
      .channel(`conversations:${mode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `mode=eq.${mode}`
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [mode, fetchConversations]);

  return { conversations, loading, error, refresh: fetchConversations };
}
