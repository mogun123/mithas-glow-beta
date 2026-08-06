--- src/components/ProfessionalBottomNav.tsx (原始)
import { Home, Calendar, Bot, BarChart3, User, Sparkles } from 'lucide-react';

interface ProfessionalBottomNavProps {
  currentView: 'dashboard' | 'bookings' | 'availability' | 'ai-assistant' | 'analytics' | 'profile';
  onNavigate: (view: 'dashboard' | 'bookings' | 'availability' | 'ai-assistant' | 'analytics' | 'profile') => void;
}

export default function ProfessionalBottomNav({ currentView, onNavigate }: ProfessionalBottomNavProps) {
  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'bookings', icon: Calendar, label: 'Bookings' },
    { id: 'availability', icon: Sparkles, label: 'Availability' },
    { id: 'ai-assistant', icon: Bot, label: 'AI Assistant' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'profile', icon: User, label: 'Profile' },
  ] as const;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/60 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_-15px_rgba(236,72,153,0.3)] z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${
                isActive
                  ? 'text-pink-400 scale-105'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <div className={`relative ${isActive ? 'animate-in fade-in-0 zoom-in-0 duration-300' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'fill-pink-500/20' : ''}`} />
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full animate-ping" />
                )}
              </div>
              <span className={`text-[10px] font-black tracking-wide ${
                isActive ? 'text-pink-400' : 'text-white/50'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Safe area for mobile devices */}
      <div className="h-safe-area-inset-bottom bg-black/60 backdrop-blur-xl" />
    </div>
  );
}

+++ src/components/ProfessionalBottomNav.tsx (修改后)
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
    <div className="fixed bottom-0 left-0 right-0 bg-black/60 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_-15px_rgba(236,72,153,0.3)] z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              className={`group flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${
                isActive
                  ? 'text-pink-400 scale-105'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <div className={`relative ${isActive ? 'animate-in fade-in-0 zoom-in-0 duration-300' : ''}`}>
                <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'fill-pink-500/20' : ''}`} />
                {isActive && (
                  <>
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full animate-ping" />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-pink-500 rounded-full opacity-50" />
                  </>
                )}
              </div>
              <span className={`text-[10px] font-black tracking-wide transition-colors duration-300 ${
                isActive ? 'text-pink-400' : 'text-white/50 group-hover:text-white/70'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Safe area for mobile devices */}
      <div className="h-safe-area-inset-bottom bg-black/60 backdrop-blur-xl" />
    </div>
  );
});

export default ProfessionalBottomNav;
