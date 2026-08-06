import { useEffect, useState } from 'react';
import { useGlobalStore } from '../lib/globalStore';
import { Sparkles } from 'lucide-react';

export const AuthGuard = ({ children, onUnauthenticated }: any) => {
  const { user, isLoading } = useGlobalStore();
  const [timeoutReached, setTimeoutReached] = useState(false);

  // 🚀 Fallback Timer: நெட்வொர்க் கட் ஆனால் 4 செகண்டில் ஸ்பின்னரை அகற்றிவிடுவோம்
  useEffect(() => {
    let timer: any;
    if (isLoading && !user) {
      timer = setTimeout(() => {
        setTimeoutReached(true);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [isLoading, user]);

  // 🎯 THE MASTER FIX: 
  // User டேட்டா ஏற்கனவே இருந்தால் (அதாவது App-ஐ விட்டு வெளியே சென்று வந்தால்) 
  // ஸ்பின்னர் காட்டக்கூடாது! Silent ஆக உள்ளே அனுமதிக்க வேண்டும்.
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

  // 4 செகண்டுகள் ஆகியும் டேட்டா வரவில்லை, மற்றும் யூசர் லாகின் செய்யவில்லை என்றால்
  if (!isLoading && !user && !timeoutReached) {
    onUnauthenticated();
    return null;
  }

  return <>{children}</>;
};
