'use client'

import { create } from 'zustand'

interface LoadingState {
  isLoading: boolean
  message: string
  setLoading: (loading: boolean, message?: string) => void
  setMessage: (message: string) => void
}

export const useLoadingStore = create<LoadingState>((set) => ({
  isLoading: false,
  message: '',
  setLoading: (loading, message = '') =>
    set({ isLoading: loading, message }),
  setMessage: (message) => set({ message }),
}))

// Hook for loading states in components
export function useLoading() {
  const { isLoading, message, setLoading, setMessage } = useLoadingStore()

  return {
    isLoading,
    message,
    startLoading: (msg?: string) => setLoading(true, msg),
    stopLoading: () => setLoading(false),
    setMessage,
  }
}

// Hook for async operations with loading state
export function useAsyncLoading() {
  const { setLoading } = useLoadingStore()

  const execute = async <T,>(
    fn: () => Promise<T>,
    loadingMessage?: string
  ): Promise<{ data?: T; error?: Error }> => {
    try {
      setLoading(true, loadingMessage)
      const data = await fn()
      setLoading(false)
      return { data }
    } catch (error) {
      setLoading(false)
      return { error: error as Error }
    }
  }

  return { execute }
}
