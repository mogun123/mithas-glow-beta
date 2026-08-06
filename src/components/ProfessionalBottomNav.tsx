import { memo, useCallback } from 'react';
import { Home, Calendar, Bot, BarChart3, User, Sparkles } from 'lucide-react';

interface ProfessionalBottomNavProps {
  currentView: 'dashboard' | 'bookings' | 'availability' | 'ai-assistant' | 'analytics' | 'profile';
  onNavigate: (view: 'dashboard' | 'bookings' | 'availability' | 'ai-assistant' | 'analytics' | 'profile') => void;
}

const ProfessionalBottomNav = memo(function ProfessionalBottomNav({ currentView, onNavigate }: ProfessionalBottomNavProps) {
  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'bookings', icon: Calendar, label: 'Bookings' },
    { id: 'availability', icon: Sparkles, label: 'Availability' },
    { id: 'ai-assistant', icon: Bot, label: 'AI Assistant' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'profile', icon: User, label: 'Profile' },
  ] as const;

  const handleNavigation = useCallback((viewId: typeof navItems[number]['id']) => {
    onNavigate(viewId);
  }, [onNavigate]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-purple-100 shadow-[0_-8px_32px_-10px_rgba(168,85,247,0.15)] z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 md:h-18 max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              className={`group flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${
                isActive 
                  ? 'scale-105' 
                  : 'hover:scale-105 active:scale-95'
              }`}
            >
              {/* Premium Pill Icon Container */}
              <div className={`relative flex items-center justify-center p-1.5 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-purple-100 text-purple-600 shadow-sm border border-purple-200/50' 
                  : 'text-slate-400 group-hover:text-purple-400'
              }`}>
                <Icon className={`w-[18px] h-[18px] md:w-5 md:h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'fill-purple-200/50' : ''}`} />
                
                {/* Active Pulse Dot */}
                {isActive && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-fuchsia-500 rounded-full shadow-[0_0_8px_rgba(217,70,239,0.8)] animate-pulse" />
                )}
              </div>
              
              {/* Label */}
              <span className={`text-[9px] md:text-[10px] font-extrabold tracking-wide transition-colors duration-300 ${
                isActive ? 'text-purple-700' : 'text-slate-500 group-hover:text-purple-600'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Safe area for modern edge-to-edge mobile screens */}
      <div className="h-safe-area-inset-bottom bg-white/80 backdrop-blur-2xl" />
    </div>
  );
});

export default ProfessionalBottomNav;
