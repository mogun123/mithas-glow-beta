import React, { useState, useEffect } from 'react';
import { ArrowLeft, Inbox } from 'lucide-react';
import { db } from '../lib/supabase';
import { MessageRequests } from '../components/chat/MessageRequests';

interface MessageRequest {
  id: string;
  conversation_id: string;
  requester_profile?: {
    full_name: string;
    avatar_url: string | null;
  };
  last_message?: string;
  created_at: string;
}

interface MessageRequestsScreenProps {
  onNavigateBack: () => void;
}

export function MessageRequestsScreen({ onNavigateBack }: MessageRequestsScreenProps) {
  const [requests, setRequests] = useState<MessageRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessageRequests();

    // Subscribe to changes in conversations table
    const channel = db
      .channel('message-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: 'status=eq.pending'
        },
        () => {
          fetchMessageRequests();
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, []);

  const fetchMessageRequests = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await db.auth.getUser();
      
      if (!user) {
        setRequests([]);
        return;
      }

      // Fetch pending message requests where the current user is the recipient
      const { data, error } = await db
        .from('conversations')
        .select(`
          id,
          conversation_id:id,
          status,
          created_at,
          requester_profile:profiles!customer_id(full_name, avatar_url),
          last_message:messages!inner(content, created_at, sender_id, conversation_id)
        `)
        .eq('status', 'pending')
        .or(`customer_id.eq.${user.id},artist_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process the data to get the latest message for each conversation
      const processedRequests: MessageRequest[] = (data || []).map((convo: any) => {
        const messages = convo.last_message || [];
        const lastMsg = messages.length > 0 
          ? messages.reduce((a: any, b: any) => 
              new Date(a.created_at) > new Date(b.created_at) ? a : b
            )
          : undefined;

        return {
          id: convo.id,
          conversation_id: convo.conversation_id,
          requester_profile: convo.requester_profile,
          last_message: lastMsg?.content,
          created_at: convo.created_at
        };
      });

      setRequests(processedRequests);
    } catch (error) {
      console.error('Failed to fetch message requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (conversationId: string) => {
    try {
      // Update conversation status from 'pending' to 'active'
      const { error } = await db
        .from('conversations')
        .update({ status: 'active' })
        .eq('id', conversationId);

      if (error) throw error;
      
      // Remove from requests list
      setRequests(prev => prev.filter(r => r.conversation_id !== conversationId));
    } catch (error) {
      console.error('Failed to accept request:', error);
    }
  };

  const handleDecline = async (conversationId: string) => {
    try {
      // Delete the declined conversation
      const { error } = await db
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
      
      // Remove from requests list
      setRequests(prev => prev.filter(r => r.conversation_id !== conversationId));
    } catch (error) {
      console.error('Failed to decline request:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={onNavigateBack}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex-1">
          <h1 className="text-lg font-bold text-pink-900 flex items-center gap-2">
            <Inbox className="w-5 h-5" />
            Message Requests
          </h1>
          <p className="text-xs text-gray-500">Pending messages from new people</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
          </div>
        ) : (
          <MessageRequests
            requests={requests}
            onAccept={handleAccept}
            onDecline={handleDecline}
            loading={false}
          />
        )}
      </div>
    </div>
  );
}
