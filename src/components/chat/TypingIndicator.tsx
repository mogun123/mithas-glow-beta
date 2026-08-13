import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';

interface TypingIndicatorProps {
  isTyping: boolean;
  senderName?: string;
}

export function TypingIndicator({ isTyping, senderName }: TypingIndicatorProps) {
  if (!isTyping) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-2">
        <span className="text-xs text-gray-500 mr-1">
          {senderName || 'Someone'}
        </span>
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
