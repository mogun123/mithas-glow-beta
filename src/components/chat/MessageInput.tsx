import React, { useState, useRef } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../ui/utils';

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({ 
  onSend, 
  disabled = false,
  placeholder = "Type a message..."
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || sending || disabled) return;
    
    try {
      setSending(true);
      await onSend(content.trim());
      setContent('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 bg-white border-t border-gray-100">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        disabled={disabled}
      >
        <Paperclip className="w-5 h-5" />
      </Button>
      
      <Input
        ref={inputRef}
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || sending}
        className="flex-1 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-pink-200"
      />
      
      <Button
        type="submit"
        size="icon"
        disabled={!content.trim() || sending || disabled}
        className={cn(
          "flex-shrink-0 transition-all",
          content.trim() && !disabled
            ? "bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-md"
            : "bg-gray-200 text-gray-400"
        )}
      >
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
}
