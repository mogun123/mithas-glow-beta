import React from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '../ui/utils';
import type { Database } from '../../lib/database.types';

type Message = Database['public']['Tables']['messages']['Row'];

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  senderName?: string;
  senderAvatar?: string | null;
}

export function MessageBubble({ 
  message, 
  isOwn, 
  showAvatar = true,
  senderName,
  senderAvatar 
}: MessageBubbleProps) {
  const formattedTime = format(new Date(message.created_at), 'p');
  
  // Check if message was moderated/redacted
  const isModerated = message.moderation_status === 'flagged' || message.moderation_status === 'blocked';
  const displayContent = isModerated 
    ? '[Message under review]' 
    : message.content;

  return (
    <div className={cn(
      "flex gap-3 mb-4",
      isOwn ? "flex-row-reverse" : "flex-row"
    )}>
      {showAvatar && !isOwn && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          {senderAvatar ? (
            <AvatarImage src={senderAvatar} alt={senderName || ''} />
          ) : (
            <AvatarFallback className="bg-gradient-to-br from-pink-200 to-purple-200 text-white text-xs font-semibold">
              {senderName?.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          )}
        </Avatar>
      )}
      
      {showAvatar && isOwn && (
        <div className="w-8 flex-shrink-0" />
      )}
      
      <div className={cn(
        "max-w-[75%] flex flex-col",
        isOwn ? "items-end" : "items-start"
      )}>
        {!isOwn && senderName && (
          <span className="text-xs text-gray-500 mb-1 ml-1">
            {senderName}
          </span>
        )}
        
        <div className={cn(
          "px-4 py-2.5 rounded-2xl shadow-sm",
          isOwn 
            ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-tr-sm" 
            : "bg-white text-gray-900 border border-gray-100 rounded-tl-sm"
        )}>
          {isModerated ? (
            <p className="text-sm italic opacity-75">{displayContent}</p>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{displayContent}</p>
          )}
        </div>
        
        <div className={cn(
          "flex items-center gap-1 mt-1",
          isOwn ? "flex-row-reverse" : "flex-row"
        )}>
          <span className="text-xs text-gray-400">
            {formattedTime}
          </span>
          {isOwn && message.is_read && (
            <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
