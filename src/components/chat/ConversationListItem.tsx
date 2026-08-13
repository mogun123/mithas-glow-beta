import React from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card } from '../ui/card';
import { cn } from '../ui/utils';
import type { Database } from '../../lib/database.types';

type Conversation = Database['public']['Tables']['conversations']['Row'];

interface ConversationWithProfiles extends Conversation {
  customer_profile?: { full_name: string; avatar_url: string | null };
  artist_profile?: { full_name: string; avatar_url: string | null };
  last_message?: { content: string; created_at: string; sender_id: string };
  unread_count?: number;
}

interface ConversationListItemProps {
  conversation: ConversationWithProfiles;
  currentUserId: string;
  onClick: () => void;
}

export function ConversationListItem({ 
  conversation, 
  currentUserId,
  onClick 
}: ConversationListItemProps) {
  // Determine the other participant
  const isCustomer = currentUserId === conversation.customer_id;
  const otherProfile = isCustomer 
    ? conversation.artist_profile 
    : conversation.customer_profile;
  
  const displayName = otherProfile?.full_name || 'Unknown User';
  const avatarUrl = otherProfile?.avatar_url;
  
  const lastMessage = conversation.last_message;
  const unreadCount = conversation.unread_count || 0;
  
  const formattedTime = lastMessage?.created_at
    ? format(new Date(lastMessage.created_at), 'p')
    : '';

  return (
    <Card 
      className={cn(
        "flex items-center gap-4 p-4 cursor-pointer transition-all hover:shadow-md border-l-4",
        unreadCount > 0 ? "bg-white shadow-sm" : "bg-gray-50"
      )}
      onClick={onClick}
    >
      <Avatar className="h-12 w-12">
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt={displayName} />
        ) : (
          <AvatarFallback className="bg-gradient-to-br from-pink-200 to-purple-200 text-white font-semibold">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        )}
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className={cn(
            "font-semibold truncate",
            unreadCount > 0 ? "text-gray-900" : "text-gray-700"
          )}>
            {displayName}
          </h3>
          {formattedTime && (
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
              {formattedTime}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <p className={cn(
            "text-sm truncate pr-2",
            unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"
          )}>
            {lastMessage?.sender_id === currentUserId && (
              <span className="text-gray-400 mr-1">You:</span>
            )}
            {lastMessage?.content || 'No messages yet'}
          </p>
          
          {unreadCount > 0 && (
            <span className="flex-shrink-0 min-w-[20px] h-5 px-2 bg-pink-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
