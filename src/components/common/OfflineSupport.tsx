import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export function useOfflineDetection() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}

export function OfflineBanner({ isOnline, onRetry }: { isOnline: boolean, onRetry?: () => void }) {
  if (isOnline) return null;

  return (
    <div className="bg-rose-500 text-white px-4 py-2 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-2 z-50 relative shadow-md">
      <WifiOff className="w-4 h-4" />
      You are currently offline. Check your internet connection.
      {onRetry && (
        <button onClick={onRetry} className="ml-2 bg-white/20 px-3 py-1 rounded hover:bg-white/30 transition-colors flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      )}
    </div>
  );
}
