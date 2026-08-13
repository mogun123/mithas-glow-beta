import React from 'react';
import { cn } from '../ui/utils';

type ConversationMode = 'artist' | 'contact' | 'messenger';

interface ModeTabsProps {
  activeMode: ConversationMode;
  onModeChange: (mode: ConversationMode) => void;
}

const MODE_CONFIG: Record<ConversationMode, { label: string; color: string; bg: string }> = {
  artist: { 
    label: 'Glow Artist', 
    color: 'text-amber-700',
    bg: 'bg-amber-100'
  },
  contact: { 
    label: 'Glow Contact', 
    color: 'text-purple-700',
    bg: 'bg-purple-100'
  },
  messenger: { 
    label: 'Glow Messenger', 
    color: 'text-pink-700',
    bg: 'bg-pink-100'
  }
};

export function ModeTabs({ activeMode, onModeChange }: ModeTabsProps) {
  return (
    <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-4">
      {(Object.keys(MODE_CONFIG) as ConversationMode[]).map((mode) => {
        const config = MODE_CONFIG[mode];
        const isActive = activeMode === mode;
        
        return (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200",
              isActive
                ? `${config.bg} ${config.color} shadow-sm`
                : "text-gray-600 hover:bg-gray-200"
            )}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
}
