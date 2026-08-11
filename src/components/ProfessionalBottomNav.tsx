import { memo, useCallback } from 'react';
import { Home, Calendar, Bot, BarChart3, User, Sparkles } from 'lucide-react';

interface ProfessionalBottomNavProps {
  currentView: 'dashboard' | 'bookings' | 'availability' | 'ai-assistant' | 'analytics' | 'profile';
  onNavigate: (view: 'dashboard' | 'bookings' | 'availability' | 'ai-assistant' | 'analytics' | 'profile') => void;
}

const ProfessionalBottomNav = memo(function ProfessionalBottomNav({ currentView, onNavigate }: ProfessionalBottomNavProps) {
  // 1. Spacious Layout: 5 பட்டன்கள் மட்டுமே உள்ளன
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
    <>
      {/* 🤖 Floating AI Assistant Button */}
      {currentView !== 'ai-assistant' && (
        <button
          onClick={() => onNavigate('ai-assistant')}
          className="fixed bottom-24 right-4 md:right-8 z-40 flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-pink-600 to-purple-500 text-white rounded-full shadow-[0_8px_30px_rgba(236,72,153,0.4)] hover:scale-110 active:scale-95 transition-all duration-300 group"
          aria-label="Open AI Assistant"
        >
          <Bot className="w-6 h-6 transition-transform duration-300 group-hover:animate-bounce" />
          <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-lavender-400 rounded-full border-2 border-pink-500 animate-pulse"></div>
        </button>
      )}

      {/* 📱 Bottom Navigation Bar - TRULY SOLID PREMIUM COLOR (No Transparency) */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#2d1b4e] border-t border-pink-500/20 shadow-[0_-8px_32px_-10px_rgba(236,72,153,0.15)] z-50 safe-area-bottom">
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
                {/* 2 & 3. Perfectly Round Shape & Gradient Matching Colors */}
                <div className={`relative flex items-center justify-center p-2.5 rounded-full transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-tr from-pink-500/20 to-purple-500/20 text-pink-400 shadow-sm border border-pink-500/30' 
                    : 'text-pink-300/50 group-hover:text-pink-400 group-hover:bg-[#1a0b2e]/50'
                }`}>
                  <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110 fill-pink-500/30' : 'group-hover:scale-110'}`} />
                  
                  {/* Active Pulse Dot */}
                  {isActive && (
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.8)] animate-pulse" />
                  )}
                </div>
                
                {/* Label */}
                <span className={`text-[10px] font-extrabold tracking-wide transition-colors duration-300 ${
                  isActive ? 'text-pink-300' : 'text-pink-300/50 group-hover:text-pink-400'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Safe area for modern edge-to-edge mobile screens - Solid Color Matching */}
        <div className="h-safe-area-inset-bottom bg-[#2d1b4e]" />
      </div>
    </>
  );
});

export default ProfessionalBottomNav;
