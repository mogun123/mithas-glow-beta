import { useState } from 'react';
import { Home, Calendar, Bot, BarChart3, User, Sparkles } from 'lucide-react';

interface ProfessionalBottomNavProps {
  currentView: 'dashboard' | 'bookings' | 'ai-assistant' | 'analytics' | 'profile';
  onNavigate: (view: 'dashboard' | 'bookings' | 'ai-assistant' | 'analytics' | 'profile') => void;
}

export default function ProfessionalBottomNav({ currentView, onNavigate }: ProfessionalBottomNavProps) {
  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'bookings', icon: Calendar, label: 'Bookings' },
    { id: 'ai-assistant', icon: Bot, label: 'AI Assistant' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'profile', icon: User, label: 'Profile' },
  ] as const;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-pink-100 shadow-[0_-10px_40px_-15px_rgba(255,182,193,0.3)] z-50 safe-area-bottom">
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
                  ? 'text-pink-500 scale-105' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className={`relative ${isActive ? 'animate-in fade-in-0 zoom-in-0 duration-300' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'fill-pink-100' : ''}`} />
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full animate-ping" />
                )}
              </div>
              <span className={`text-[10px] font-black tracking-wide ${
                isActive ? 'text-pink-600' : 'text-gray-400'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Safe area for mobile devices */}
      <div className="h-safe-area-inset-bottom bg-white/95 backdrop-blur-xl" />
    </div>
  );
}
