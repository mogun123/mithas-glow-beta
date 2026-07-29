import { useState } from 'react';
import { Home, ShoppingBag, Calendar, Sparkles } from 'lucide-react';

interface BottomNavProps {
  onNavigateToHome?: () => void;
  onNavigateToProducts?: () => void;
  onNavigateToCoach?: () => void;
  onNavigateToBooking?: () => void;
}

export function BottomNav({
  onNavigateToHome,
  onNavigateToProducts,
  onNavigateToCoach,
  onNavigateToBooking,
}: BottomNavProps) {
  const [activeTab, setActiveTab] = useState('Home');

  const navItems = [
    { id: 'Home', icon: Home, label: 'Home' },
    { id: 'Products', icon: ShoppingBag, label: 'Products' },
    {
      id: 'AI Coach',
      icon: Sparkles,
      label: 'AI Coach',
      isCenter: true,
    },
    { id: 'Booking', icon: Calendar, label: 'Booking' },
  ];

  const handleNavClick = (tabName: string) => {
    setActiveTab(tabName);

    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    if (tabName === 'Home' && onNavigateToHome) {
      onNavigateToHome();
    } else if (tabName === 'Products' && onNavigateToProducts) {
      onNavigateToProducts();
    } else if (tabName === 'AI Coach' && onNavigateToCoach) {
      onNavigateToCoach();
    } else if (tabName === 'Booking' && onNavigateToBooking) {
      onNavigateToBooking();
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
          const isActive = activeTab === item.id;
          const isCenter = item.isCenter;

          if (isCenter) {
            return (
              <div
                key={item.id}
                className="w-16 h-16 -mt-8 flex flex-col items-center justify-center"
              >
                <div
                  onClick={() => handleNavClick(item.id)}
                  className="nav-tap-btn w-16 h-16 rounded-2xl relative cursor-pointer flex flex-col items-center justify-center"
                  style={{
                    background:
                      'linear-gradient(135deg,#ec4899,#a855f7,#6366f1)',
                    boxShadow: isActive
                      ? '0 0 28px rgba(168,85,247,.55), 0 8px 24px rgba(236,72,153,.38)'
                      : '0 8px 24px rgba(168,85,247,.38)',
                  }}
                >
                  <item.icon className="w-7 h-7 text-white" />
                  <span className="text-[10px] mt-0.5 font-bold text-white tracking-tight">
                    {item.label}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className="nav-tap-btn flex flex-col items-center justify-center gap-1 cursor-pointer px-2 py-1"
              style={{ width: '22%' }}
            >
              <item.icon
                className={`w-6 h-6 transition-colors duration-200 ${
                  isActive ? 'text-purple-600' : 'text-gray-400'
                }`}
                strokeWidth={isActive ? 2.3 : 1.8}
              />
              <span
                className={`text-[11px] font-semibold tracking-tight transition-colors duration-200 ${
                  isActive ? 'text-purple-700' : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </nav>
    </footer>
  );
}
