import { Home, ShoppingBag, MessageCircle, Calendar, Sparkles } from 'lucide-react';
import { cn } from "./ui/utils";
import { useAuthStore } from '../lib/store';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type BottomNavProps = {
  onNavigateHome?: () => void;
  onNavigateToMirror?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToEvents?: () => void;
  onNavigateToProducts?: () => void;
  onNavigateToCoach?: () => void;
  onNavigateToBooking?: () => void;
  onNavigateToChat?: () => void;
};

export function BottomNav({ 
  onNavigateHome,
  onNavigateToMirror,
  onNavigateToProfile,
  onNavigateToEvents,
  onNavigateToProducts,
  onNavigateToCoach,
  onNavigateToBooking,
  onNavigateToChat
}: BottomNavProps) {
  const authStore = useAuthStore();
  const [isProfessional, setIsProfessional] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, industry')
          .eq('id', user.id)
          .single();

        // Check if user is a professional makeup artist (seller role with makeup_artist industry)
        const isPro = profile?.role === 'seller' && profile?.industry === 'makeup_artist';
        setIsProfessional(isPro || false);
      } catch (error) {
        console.error('BottomNav: Error checking user role:', error);
        setIsProfessional(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserRole();
  }, []);

  // If professional, don't render customer bottom nav - they have their own
  if (isProfessional) {
    return null;
  }
  
  const navItems = [
    { 
      view: "home", 
      icon: Home, 
      label: "Home",
      action: onNavigateHome 
    },
    { 
      view: "products", 
      icon: ShoppingBag, 
      label: "Products",
      action: onNavigateToProducts 
    },
    {
      view: "chat",
      icon: MessageCircle,
      label: "Messages",
      action: onNavigateToChat
    },
    {
      view: "coach",
      icon: Sparkles,
      label: "AI Coach",
      isCenter: true,
      action: onNavigateToCoach
    },
    { 
      view: "booking", 
      icon: Calendar, 
      label: "Booking",
      action: onNavigateToBooking 
    },
  ];

  const handleNavClick = (action?: () => void, view?: string) => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    if (action) {
      action();
    } else if (view === "home" && onNavigateHome) {
      onNavigateHome();
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-t border-purple-100/80 dark:border-purple-950/60 pb-safe shadow-lg shadow-purple-500/5">
      <footer className="max-w-md mx-auto px-3 py-1.5">
        <nav className="flex justify-between items-center h-12">
          {navItems.map((item) => {
            const isCenter = item.isCenter;

            if (isCenter) {
              return (
                <div key={item.view} className="relative flex flex-col items-center justify-center -mt-5">
                  <button
                    onClick={() => handleNavClick(item.action, item.view)}
                    className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 shadow-md shadow-purple-500/35 flex flex-col items-center justify-center active:scale-95 transition-all"
                    aria-label={item.label}
                  >
                    <item.icon className="w-5 h-5 text-white" />
                  </button>
                  <span className="text-[10px] mt-0.5 font-bold text-purple-600 dark:text-purple-400 tracking-tight">
                    {item.label}
                  </span>
                </div>
              );
            }

            return (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.action, item.view)}
                className="flex flex-col items-center justify-center gap-0.5 cursor-pointer py-1 px-2 min-w-[54px] active:scale-95 transition-all"
                aria-label={item.label}
              >
                <item.icon
                  className="w-5 h-5 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors"
                  strokeWidth={1.9}
                />
                <span className="text-[10px] font-semibold tracking-tight text-gray-600 dark:text-gray-400">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </footer>
    </div>
  );


}
