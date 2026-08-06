import { useEffect, useState } from 'react';
import { useGlobalStore } from '../lib/globalStore';
import { Sparkles } from 'lucide-react';

export const AuthGuard = ({ children, onUnauthenticated }: any) => {
  const { user, isLoading } = useGlobalStore();
  const [timeoutReached, setTimeoutReached] = useState(false);

  // 1. Fallback Timer: நெட்வொர்க் கட் ஆனால் 4 செகண்டில் ஸ்பின்னரை அகற்றுவதற்கான டைமர்
  useEffect(() => {
    let timer: any;
    if (isLoading && !user) {
      timer = setTimeout(() => {
        setTimeoutReached(true);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [isLoading, user]);

  // 2. 🎯 THE MASTER FIX: onUnauthenticated() ஃபங்ஷனை கட்டாயமாக useEffect-க்குள் மட்டுமே அழைக்க வேண்டும்!
  useEffect(() => {
    if (!isLoading && !user && !timeoutReached) {
      onUnauthenticated();
    }
  }, [isLoading, user, timeoutReached, onUnauthenticated]);

  // 3. டேட்டா லோட் ஆகும்போது மட்டும் ஸ்பின்னரைக் காட்டவும்
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

  // 4. யூசர் இல்லை என்றால் UI-ஐ ப்ளாக் செய்துவிட்டு (null), லாகின் பேஜுக்கு அனுப்பிவிடும்
  if (!user) return null;

  // 5. எல்லாம் சரியாக இருந்தால் டாஷ்போர்டைக் காட்டும்
  return <>{children}</>;
};
