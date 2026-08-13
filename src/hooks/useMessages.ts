import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Message = Database['public']['Tables']['messages']['Row'];
type MessageWithMedia = Message & {
  media?: Database['public']['Tables']['message_media']['Row'][];
};

interface UseMessagesReturn {
  messages: MessageWithMedia[];
  loading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  markAsRead: (messageIds: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useMessages(conversationId: string | null): UseMessagesReturn {
  const [messages, setMessages] = useState<MessageWithMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: msgs, error: msgError } = await db
        .from('messages')
        .select(`
          *,
          media:message_media(*)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (msgError) throw msgError;
      setMessages(msgs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || !content.trim()) return;

    try {
      // Use the existing secure RPC
      const { error: sendError } = await db.rpc('process_message_with_enforcement', {
        p_conversation_id: conversationId,
        p_content: content.trim()
      });

      if (sendError) throw sendError;
    } catch (err) {
      throw err;
    }
  }, [conversationId]);

  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    try {
      await db
        .from('messages')
        .update({ is_read: true })
        .in('id', messageIds);
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  }, []);

  useEffect(() => {
    fetchMessages();

    if (!conversationId) return;

    // Subscribe to new messages in this conversation
    const channel = db
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [conversationId, fetchMessages]);

  return { messages, loading, error, sendMessage, markAsRead, refresh: fetchMessages };
}
