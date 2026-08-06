/**
 * Offline Detection and Support
 * Detects navigator.onLine and shows premium offline banner
 * Automatically retries when connection returns
 */

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { logger } from '../lib/logger';

interface OfflineProviderProps {
  children: ReactNode;
  onStatusChange?: (isOnline: boolean) => void;
}

interface OfflineState {
  isOnline: boolean;
  wasOffline: boolean;
}

export function useOfflineDetection(): OfflineState {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
  });

  const handleOnline = useCallback(() => {
    logger.info('Connection restored');
    setState(prev => ({
      isOnline: true,
      wasOffline: !prev.isOnline,
    }));
  }, []);

  const handleOffline = useCallback(() => {
    logger.warn('Connection lost');
    setState(prev => ({
      isOnline: false,
      wasOffline: prev.wasOffline,
    }));
  }, []);

  useEffect(() => {
    // Initial check
    const initialOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setState(prev => ({ ...prev, isOnline: initialOnline }));

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return state;
}

interface OfflineBannerProps {
  isOnline: boolean;
  onRetry?: () => void;
}

export function OfflineBanner({ isOnline, onRetry }: OfflineBannerProps): JSX.Element | null {
  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
      <div className="max-w-4xl mx-auto px-4 pt-2">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-black">You're Offline</p>
              <p className="text-[10px] font-medium opacity-90">Some features may be unavailable</p>
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface OfflineProviderProps {
  children: ReactNode;
  onReconnect?: () => void;
}

export function OfflineProvider({ children, onReconnect }: OfflineProviderProps): JSX.Element {
  const { isOnline, wasOffline } = useOfflineDetection();

  useEffect(() => {
    if (wasOffline && isOnline && onReconnect) {
      logger.info('Attempting to reconnect after offline period');
      onReconnect();
    }
  }, [isOnline, wasOffline, onReconnect]);

  return (
    <>
      <OfflineBanner isOnline={isOnline} onRetry={() => window.location.reload()} />
      {children}
    </>
  );
}

/**
 * Hook for retry logic when offline
 */
export function useRetryOnReconnect(maxRetries: number = 3) {
  const [retryCount, setRetryCount] = useState(0);
  const [lastAttempt, setLastAttempt] = useState<Date | null>(null);
  const { isOnline } = useOfflineDetection();

  const canRetry = useCallback(() => {
    return isOnline && retryCount < maxRetries;
  }, [isOnline, retryCount, maxRetries]);

  const resetRetryCount = useCallback(() => {
    setRetryCount(0);
    setLastAttempt(null);
    logger.info('Retry count reset');
  }, []);

  const attemptRetry = useCallback(async (
    fn: () => Promise<void>,
    onSuccess?: () => void,
    onFailure?: () => void
  ): Promise<boolean> => {
    if (!canRetry()) {
      logger.warn('Max retries exceeded or offline', { retryCount, maxRetries });
      onFailure?.();
      return false;
    }

    setRetryCount(prev => prev + 1);
    setLastAttempt(new Date());

    try {
      await fn();
      logger.info('Retry successful', { attempt: retryCount + 1 });
      resetRetryCount();
      onSuccess?.();
      return true;
    } catch (error) {
      logger.error('Retry failed', error as Error, { attempt: retryCount + 1 });
      onFailure?.();
      return false;
    }
  }, [canRetry, retryCount, maxRetries, resetRetryCount]);

  return {
    isOnline,
    retryCount,
    lastAttempt,
    canRetry,
    attemptRetry,
    resetRetryCount,
  };
}

export default {
  useOfflineDetection,
  OfflineBanner,
  OfflineProvider,
  useRetryOnReconnect,
};
