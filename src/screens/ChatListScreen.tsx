import React, { useState } from 'react';
import { MessageCircle, UserPlus, Inbox, Shield, ArrowLeft } from 'lucide-react';
import { ConversationListItem } from '../components/chat/ConversationListItem';
import { useConversations } from '../hooks/useConversations';
import { useGlowChatContext } from '../components/chat/GlowChatProvider';

export type ConversationMode = 'artist' | 'contact' | 'messenger';

interface ChatListScreenProps {
  onNavigateHome?: () => void;
  onNavigateBack?: () => void;
  onNavigateToThread: (conversationId: string) => void;
  onNavigateToContacts: () => void;
  onNavigateToRequests: () => void;
  onNavigateToBlocked: () => void;
}

export function ChatListScreen({ 
  onNavigateHome,
  onNavigateBack,
  onNavigateToThread,
  onNavigateToContacts,
  onNavigateToRequests,
  onNavigateToBlocked
}: ChatListScreenProps) {
  const [activeMode, setActiveMode] = useState<ConversationMode>('artist');
  const { currentUserId, loading: userLoading } = useGlowChatContext();
  const { conversations, loading, error } = useConversations(activeMode);

  const handleBack = () => {
    if (onNavigateBack) onNavigateBack();
    else if (onNavigateHome) onNavigateHome();
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50/50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-purple-100/80 px-4 py-3 sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-2 text-slate-700 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all active:scale-95 flex-shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <MessageCircle className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 font-display tracking-tight leading-none">
              Glow Chat
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Real-time beauty messaging</p>
          </div>
        </div>
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

      {/* Mode Tabs (Inline Implementation) */}
      <div className="px-4 pt-4 bg-white">
        <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
          <button 
            onClick={() => setActiveMode('artist')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeMode === 'artist' 
                ? 'bg-white text-pink-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Artists
          </button>
          <button 
            onClick={() => setActiveMode('contact')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeMode === 'contact' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Contacts
          </button>
          <button 
            onClick={() => setActiveMode('messenger')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeMode === 'messenger' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Messenger
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
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
      </div>
    </div>
  );
}
