import { Home, ShoppingBag, Calendar, Sparkles } from 'lucide-react';
import { cn } from "@/components/ui/utils";

type BottomNavProps = {
  onNavigateHome?: () => void;
  onNavigateToMirror?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToEvents?: () => void;
  onNavigateToProducts?: () => void;
  onNavigateToCoach?: () => void;
  onNavigateToBooking?: () => void;
};

export function BottomNav({ 
  onNavigateHome,
  onNavigateToMirror,
  onNavigateToProfile,
  onNavigateToEvents,
  onNavigateToProducts,
  onNavigateToCoach,
  onNavigateToBooking
}: BottomNavProps) {
  
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

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-3 z-50 rounded-t-3xl"
      style={{
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderTop: '1px solid rgba(168,85,247,0.12)',
        boxShadow:
          '0 -4px 28px rgba(236,72,153,.08), inset 0 1px 0 rgba(255,255,255,.92)',
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
                  "text-gray-400"
                )}
                strokeWidth={1.8}
              />
              <span
                className={cn(
                  "text-xs font-semibold tracking-tight transition-colors duration-200",
                  "text-gray-400"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </footer>
  );
}
