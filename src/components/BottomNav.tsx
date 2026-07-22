import { useState } from 'react';
import { Home, Film, Sparkles, ShoppingBag, MessageSquare } from 'lucide-react';

interface BottomNavProps {
  onNavigateToMirror?: () => void;
  onNavigateToChat?: () => void;
  onNavigateToReels?: () => void;
  onNavigateToShop?: () => void;
  onsetCurrentViewToShop?: () => void;
  onNavigateToHome?: () => void;
}

export function BottomNav({ onNavigateToMirror, onNavigateToChat, onNavigateToReels, onNavigateToShop, onsetCurrentViewToShop, onNavigateToHome }: BottomNavProps) {
  const [activeTab, setActiveTab] = useState('Home');

  const navItems = [
    { id: 'Home', icon: Home, label: 'Home' },
    { id: 'Reels', icon: Film, label: 'Reels' },
    { id: 'Mirror', icon: Sparkles, label: 'Mirror', isMirror: true },
    { id: 'Shop', icon: ShoppingBag, label: 'Shop' },
    { id: 'Chat', icon: MessageSquare, label: 'Chat' },
  ];

  const handleNavClick = (tabName: string) => {
    setActiveTab(tabName);
    console.log(`Navigating to: ${tabName}`);
    
    // Haptic feedback if supported
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Navigate to appropriate screens
    if (tabName === 'Mirror' && onNavigateToMirror) {
      onNavigateToMirror();
    } else if (tabName === 'Chat' && onNavigateToChat) {
      onNavigateToChat();
    } else if (tabName === 'Reels' && onNavigateToReels) {
      onNavigateToReels();
    } else if (tabName === 'Shop' && (onNavigateToShop || onsetCurrentViewToShop)) {
      onNavigateToShop ? onNavigateToShop() : onsetCurrentViewToShop?.();
    } else if (tabName === 'Home' && onNavigateToHome) {
      onNavigateToHome();
    }
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-3 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.1)] z-20 rounded-t-3xl border-t border-gray-100">
      <nav className="flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const isMirror = item.isMirror;

          if (isMirror) {
            return (
              <div key={item.id} className="mirror-glow-wrapper w-20 h-20 -mt-8">
                <div className="mirror-glow-bg"></div>
                <div
                  onClick={() => handleNavClick(item.id)}
                  className="bubble w-20 h-20 bg-[#FF99CC] relative z-10 cursor-pointer"
                >
                  <item.icon className="w-8 h-8 text-white" />
                  <span className="text-xs mt-1 text-white">{item.label}</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`bubble ${isActive ? 'nav-glow-active' : ''}`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? 'text-pink-500' : 'text-gray-600'}`} />
              <span className={`text-xs mt-1 ${isActive ? 'text-pink-500' : 'text-gray-600'}`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </nav>
    </footer>
  );
}
