import { Home, ShoppingBag, MessageCircle, Calendar, Sparkles } from 'lucide-react';
import { cn } from "@/components/ui/utils";
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
    <div className="fixed bottom-0 left-0 w-full bg-[#fff0f5] border-t border-pink-200 z-50 pb-safe shadow-[0_-4px_20px_rgba(236,72,153,0.2)]">
      <footer
        className="p-3 max-w-lg mx-auto rounded-t-3xl"
        style={{
          background: '#fff0f5', // Solid Pink-Lavender Mix (No Transparency)
          borderTop: '1px solid rgba(168,85,247,0.25)',
        }}
      >
        <nav className="flex justify-around items-end pb-1 pt-2">
          {navItems.map((item) => {
            const isCenter = item.isCenter;

            if (isCenter) {
              return (
                <div
                  key={item.view}
                  className="w-16 h-16 -mt-8 flex flex-col items-center justify-center"
                >
                  <button
                    onClick={() => handleNavClick(item.action, item.view)}
                    className="nav-tap-btn w-16 h-16 rounded-2xl relative cursor-pointer flex flex-col items-center justify-center min-w-[64px] min-h-[64px]"
                    style={{
                      background:
                        'linear-gradient(135deg,#ec4899,#a855f7,#6366f1)',
                      boxShadow:
                        '0 8px 24px rgba(168,85,247,.38)',
                    }}
                    aria-label={item.label}
                  >
                    <item.icon className="w-7 h-7 text-white" />
                    <span className="text-xs mt-0.5 font-bold text-white tracking-tight">
                      {item.label}
                    </span>
                  </button>
                </div>
              );
            }

            return (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.action, item.view)}
                className="nav-tap-btn flex flex-col items-center justify-center gap-1 cursor-pointer px-2 py-2 min-w-[60px] min-h-[44px]"
                style={{ width: '22%' }}
                aria-label={item.label}
              >
                <item.icon
                  className={cn(
                    "w-6 h-6 transition-colors duration-200",
                    "text-gray-500 hover:text-pink-600"
                  )}
                  strokeWidth={1.8}
                />
                <span
                  className={cn(
                    "text-xs font-semibold tracking-tight transition-colors duration-200",
                    "text-gray-700"
                  )}
                >
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
