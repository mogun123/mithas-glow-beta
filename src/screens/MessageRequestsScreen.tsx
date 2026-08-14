import React, { useState } from 'react';
import { ArrowLeft, Inbox } from 'lucide-react';
import { MessageRequests } from '../components/chat/MessageRequests';

interface MessageRequestsScreenProps {
  onNavigateBack: () => void;
}

export function MessageRequestsScreen({ onNavigateBack }: MessageRequestsScreenProps) {
  const [requests, setRequests] = useState<Array<{
    id: string;
    conversation_id: string;
    requester_profile?: {
      full_name: string;
      avatar_url: string | null;
    };
    last_message?: string;
    created_at: string;
  }>>([]);
  const [loading, setLoading] = useState(false);

  const handleAccept = async (conversationId: string) => {
    setLoading(true);
    try {
      // TODO: Update conversation status from 'pending' to 'active'
      // await db.rpc('accept_message_request', { p_conversation_id: conversationId });
      setRequests(prev => prev.filter(r => r.conversation_id !== conversationId));
    } catch (error) {
      console.error('Failed to accept request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async (conversationId: string) => {
    setLoading(true);
    try {
      // TODO: Delete or archive the declined request
      // await db.from('conversations').delete().eq('id', conversationId);
      setRequests(prev => prev.filter(r => r.conversation_id !== conversationId));
    } catch (error) {
      console.error('Failed to decline request:', error);
    } finally {
      setLoading(false);
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
        <MessageRequests
          requests={requests}
          onAccept={handleAccept}
          onDecline={handleDecline}
          loading={loading}
        />
      </div>
    </div>
  );
}
