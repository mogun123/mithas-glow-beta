import { memo, useCallback } from 'react';
import { Home, Calendar, BarChart3, User, Sparkles } from 'lucide-react';

interface ProfessionalBottomNavProps {
  currentView: 'dashboard' | 'bookings' | 'availability' | 'ai-assistant' | 'analytics' | 'profile';
  onNavigate: (view: 'dashboard' | 'bookings' | 'availability' | 'ai-assistant' | 'analytics' | 'profile') => void;
}

const ProfessionalBottomNav = memo(function ProfessionalBottomNav({ currentView, onNavigate }: ProfessionalBottomNavProps) {
  // 🎯 AI Assistant நீக்கப்பட்டு, சரியாக 5 பட்டன்கள் மட்டுமே உள்ளன (Clean Layout)
  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'bookings', icon: Calendar, label: 'Bookings' },
    { id: 'availability', icon: Sparkles, label: 'Availability' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'profile', icon: User, label: 'Profile' },
  ] as const;

  const handleNavigation = useCallback((viewId: typeof navItems[number]['id']) => {
    onNavigate(viewId);
  }, [onNavigate]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-purple-100 shadow-[0_-8px_32px_-10px_rgba(168,85,247,0.2)] z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 md:h-18 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              className={`group flex flex-col items-center justify-center w-full h-full space-y-1.5 transition-all duration-300 ${
                isActive 
                  ? 'scale-105' 
                  : 'hover:scale-105 active:scale-95'
              }`}
            >
              {/* 🎯 Perfectly Rounded (Circle) Premium Icon Container with Matching Theme Colors */}
              <div className={`relative flex items-center justify-center p-2.5 rounded-full transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-tr from-purple-100 to-fuchsia-100 text-fuchsia-600 shadow-sm border border-fuchsia-200/60' 
                  : 'text-slate-400 group-hover:text-fuchsia-500 group-hover:bg-purple-50/50'
              }`}>
                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110 fill-fuchsia-200/50' : 'group-hover:scale-110'}`} />
                
                {/* Active Pulse Dot */}
                {isActive && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-fuchsia-500 rounded-full shadow-[0_0_8px_rgba(217,70,239,0.8)] animate-pulse" />
                )}
              </div>
              
              {/* Label */}
              <span className={`text-[10px] font-extrabold tracking-wide transition-colors duration-300 ${
                isActive ? 'text-fuchsia-700' : 'text-slate-500 group-hover:text-fuchsia-500'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Safe area for modern edge-to-edge mobile screens */}
      <div className="h-safe-area-inset-bottom bg-white/90 backdrop-blur-2xl" />
    </div>
  );
});

export default ProfessionalBottomNav;
