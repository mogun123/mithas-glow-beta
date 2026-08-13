import React, { createContext, useContext, ReactNode } from 'react';
import { useGlowChat } from '../../hooks/useGlowChat';

interface GlowChatContextValue {
  currentUserId: string | null;
  loading: boolean;
  error: string | null;
}

const GlowChatContext = createContext<GlowChatContextValue | undefined>(undefined);

interface GlowChatProviderProps {
  children: ReactNode;
}

export function GlowChatProvider({ children }: GlowChatProviderProps) {
  const { currentUserId, loading, error } = useGlowChat();

  return (
    <GlowChatContext.Provider value={{ currentUserId, loading, error }}>
      {children}
    </GlowChatContext.Provider>
  );
}

export function useGlowChatContext() {
  const context = useContext(GlowChatContext);
  if (context === undefined) {
    throw new Error('useGlowChatContext must be used within a GlowChatProvider');
  }
  return context;
}
