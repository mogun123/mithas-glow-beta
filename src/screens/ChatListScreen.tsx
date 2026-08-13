import React, { useState } from 'react';
import { MessageCircle, UserPlus, Inbox, Shield } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { ModeTabs } from './chat/ModeTabs';
import { ConversationListItem } from './chat/ConversationListItem';
import { useConversations } from '../../hooks/useConversations';
import { useGlowChatContext } from './chat/GlowChatProvider';
import type { ConversationMode } from './chat/ModeTabs';

interface ChatListScreenProps {
  onNavigateToThread: (conversationId: string) => void;
  onNavigateToContacts: () => void;
  onNavigateToRequests: () => void;
  onNavigateToBlocked: () => void;
}

export function ChatListScreen({ 
  onNavigateToThread,
  onNavigateToContacts,
  onNavigateToRequests,
  onNavigateToBlocked
}: ChatListScreenProps) {
  const [activeMode, setActiveMode] = useState<ConversationMode>('artist');
  const { currentUserId, loading: userLoading } = useGlowChatContext();
  const { conversations, loading, error } = useConversations(activeMode);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-pink-500" />
          Glow Chat
        </h1>
      </div>

      {/* Navigation Actions */}
      <div className="flex gap-2 p-4 bg-white border-b border-gray-100">
        <button
          onClick={onNavigateToContacts}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span className="text-sm font-medium">Contacts</span>
        </button>
        <button
          onClick={onNavigateToRequests}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-lg transition-colors relative"
        >
          <Inbox className="w-4 h-4" />
          <span className="text-sm font-medium">Requests</span>
        </button>
        <button
          onClick={onNavigateToBlocked}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
        >
          <Shield className="w-4 h-4" />
          <span className="text-sm font-medium">Blocked</span>
        </button>
      </div>

      {/* Mode Tabs */}
      <div className="px-4 pt-4 bg-white">
        <ModeTabs activeMode={activeMode} onModeChange={setActiveMode} />
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1 px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">
            <p>{error}</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="font-semibold text-gray-700 mb-1">No conversations yet</h3>
            <p className="text-sm text-gray-500">
              {activeMode === 'artist' && 'Start a conversation with your booked artist'}
              {activeMode === 'contact' && 'Sync contacts to find friends on MITHAS GLOW'}
              {activeMode === 'messenger' && 'Send messages to anyone on MITHAS GLOW'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                currentUserId={currentUserId || ''}
                onClick={() => onNavigateToThread(conversation.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
