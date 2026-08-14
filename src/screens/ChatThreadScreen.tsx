import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Video, Phone, Shield, Flag, Trash2 } from 'lucide-react';
import { MessageBubble } from '../components/chat/MessageBubble';
import { MessageInput } from '../components/chat/MessageInput';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { BlockUserModal } from '../components/chat/BlockUserModal';
import { ReportModal } from '../components/chat/ReportModal';
// FIX: Changed ../../ to ../ for hooks and lib
import { useMessages } from '../hooks/useMessages';
import { useGlowChatContext } from '../components/chat/GlowChatProvider';
import type { Database } from '../lib/database.types';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface ChatThreadScreenProps {
  conversation: Conversation & {
    customer_profile?: Pick<Profile, 'full_name' | 'avatar_url'>;
    artist_profile?: Pick<Profile, 'full_name' | 'avatar_url'>;
  };
  booking?: Database['public']['Tables']['bookings']['Row'] | null;
  onNavigateBack: () => void;
}

export function ChatThreadScreen({ 
  conversation, 
  booking,
  onNavigateBack 
}: ChatThreadScreenProps) {
  const { currentUserId } = useGlowChatContext();
  const { messages, loading, error, sendMessage, markAsRead } = useMessages(conversation.id);
  
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine other participant
  const isCustomer = currentUserId === conversation.customer_id;
  const otherProfile = isCustomer ? conversation.artist_profile : conversation.customer_profile;
  const otherUserId = isCustomer ? conversation.artist_id : conversation.customer_id;
  
  const displayName = otherProfile?.full_name || 'Unknown User';
  const avatarUrl = otherProfile?.avatar_url;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (messages.length > 0 && currentUserId) {
      const unreadIds = messages
        .filter(m => !m.is_read && m.sender_id !== currentUserId)
        .map(m => m.id);
      
      if (unreadIds.length > 0) {
        markAsRead(unreadIds);
      }
    }
  }, [messages, currentUserId]);

  const handleSend = async (content: string) => {
    await sendMessage(content);
  };

  const handleBlock = () => {
    setShowBlockModal(true);
  };

  const handleConfirmBlock = async () => {
    // TODO: Implement block logic via Supabase
    setShowBlockModal(false);
  };

  const handleReport = () => {
    setShowReportModal(true);
  };

  const handleConfirmReport = async (reason: string) => {
    // TODO: Implement report logic via Supabase
    setShowReportModal(false);
  };

  if (loading && messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
      </div>
    );
  }

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
        
        {/* Custom Avatar */}
        <div className="h-10 w-10 rounded-full flex-shrink-0 bg-gradient-to-br from-pink-200 to-purple-200 border border-pink-100 flex items-center justify-center overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 truncate">{displayName}</h2>
          <p className="text-xs text-green-600">Online</p>
        </div>
        
        <div className="flex items-center gap-1">
          <button className="hidden sm:flex p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <Phone className="w-5 h-5" />
          </button>
          <button className="hidden sm:flex p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <Video className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div ref={scrollRef}>
          {error ? (
            <div className="text-center py-8 text-red-500">
              <p>{error}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.sender_id === currentUserId}
                  senderName={message.sender_id === currentUserId ? undefined : displayName}
                  senderAvatar={message.sender_id === currentUserId ? undefined : avatarUrl}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
          
          <TypingIndicator isTyping={isTyping} senderName={displayName} />
        </div>
      </div>

      {/* Message Input */}
      <MessageInput 
        onSend={handleSend} 
        disabled={loading}
        placeholder={`Message ${displayName}...`}
      />

      {/* Block Modal */}
      <BlockUserModal
        userName={displayName}
        open={showBlockModal}
        onConfirm={handleConfirmBlock}
        onCancel={() => setShowBlockModal(false)}
      />

      {/* Report Modal */}
      <ReportModal
        targetUserId={otherUserId}
        conversationId={conversation.id}
        open={showReportModal}
        onConfirm={handleConfirmReport}
        onCancel={() => setShowReportModal(false)}
      />
    </div>
  );
}
