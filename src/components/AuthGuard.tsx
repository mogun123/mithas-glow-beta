import { useEffect } from 'react';
import { useGlobalStore } from '../lib/globalStore';
import { Sparkles } from 'lucide-react';

export const AuthGuard = ({ children, onUnauthenticated }: any) => {
  const user = useGlobalStore((state) => state.user);
  const isLoading = useGlobalStore((state) => state.isLoading);
  const error = useGlobalStore((state) => state.error);

  useEffect(() => {
    if (!isLoading && !user && !error) {
      onUnauthenticated();
    }
  }, [isLoading, user, error, onUnauthenticated]);

  if (isLoading && !user) {
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F4F0FA] via-[#FDF2F8] to-[#F4F0FA]">
        <div className="text-center bg-white/70 backdrop-blur-xl border border-white p-8 rounded-3xl shadow-lg max-w-sm w-full mx-4">
          <p className="text-slate-700 font-bold mb-2">Unable to restore your session.</p>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
};
