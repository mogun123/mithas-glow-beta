import { useEffect, useState } from 'react';
import { useGlobalStore } from '../lib/globalStore';
import { Sparkles, RefreshCw } from 'lucide-react';

export const AuthGuard = ({ children, onUnauthenticated }: any) => {
  // Zustand Selectors for optimized performance
  const user = useGlobalStore((state) => state.user);
  const isLoading = useGlobalStore((state) => state.isLoading);
  const refreshProfile = useGlobalStore((state) => state.refreshProfile);
  
  const [timeoutReached, setTimeoutReached] = useState(false);

  // 1. ✨ FIX: Safety effect to reset timeout state when user loads or loading finishes
  useEffect(() => {
    if (user || !isLoading) {
      setTimeoutReached(false);
    }
  }, [user, isLoading]);

  // Fallback Timer: நெட்வொர்க் கட் ஆனால் 4 செகண்டில் ஸ்பின்னரை அகற்றுவதற்கான டைமர்
  useEffect(() => {
    let timer: any;
    if (isLoading && !user && !timeoutReached) {
      timer = setTimeout(() => {
        setTimeoutReached(true);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [isLoading, user, timeoutReached]);

  // Redirect Logic: onUnauthenticated() ஃபங்ஷனை கட்டாயமாக useEffect-க்குள் மட்டுமே அழைக்க வேண்டும்!
  useEffect(() => {
    if (!isLoading && !user && !timeoutReached) {
      onUnauthenticated();
    }
  }, [isLoading, user, timeoutReached, onUnauthenticated]);

  // 2. ✨ FIX: SPA-friendly Retry handler instead of full page reload
  const handleRetry = async () => {
    setTimeoutReached(false);
    try {
      await refreshProfile();
    } catch (err) {
      console.error("Profile retry failed:", err);
    }
  };

  // டேட்டா லோட் ஆகும்போது மட்டும் ஸ்பின்னரைக் காட்டவும்
  if (isLoading && !user && !timeoutReached) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F4F0FA] via-[#FDF2F8] to-[#F4F0FA]">
        <div className="text-center bg-white/70 backdrop-blur-xl border border-white p-6 rounded-3xl shadow-lg">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-purple-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-purple-500 animate-pulse" />
          </div>
          <p className="text-slate-700 font-extrabold tracking-wide text-sm">Resuming...</p>
        </div>
      </div>
    );
  }

  // Timeout Fallback UI with Smart Retry
  if (timeoutReached && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F4F0FA] via-[#FDF2F8] to-[#F4F0FA]">
        <div className="text-center bg-white/70 backdrop-blur-xl border border-white p-8 rounded-3xl shadow-lg max-w-sm w-full mx-4">
          <RefreshCw className="w-12 h-12 text-slate-400 mx-auto mb-4 opacity-50" />
          <p className="text-slate-700 font-bold mb-4">Connection is taking too long.</p>
          <button
            onClick={handleRetry}
            className="px-6 py-2 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition shadow-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Simplified null check
  if (!user) return null;

  // எல்லாம் சரியாக இருந்தால் டாஷ்போர்டைக் காட்டும்
  return <>{children}</>;
};
