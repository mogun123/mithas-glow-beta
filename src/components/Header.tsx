import { useState } from 'react';
import { Gem, User, Settings, LogOut, Bell, BarChart3 } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';

interface HeaderProps {
  onNavigateToProfile?: () => void;
}

export function Header({ onNavigateToProfile }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profile = useAuthStore((state) => (state as any).profile) || {}; 



  const glowCoins = 450;
  const hasUnreadNotifications = true;

  const authLogout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      authLogout();
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const handleProfileAction = (action: string) => {
    setShowDropdown(false);

    if (action === "My Account" && onNavigateToProfile) {
      onNavigateToProfile();
      return;
    }

    if (action === "Event Dashboard") {
      // Dispatch event to open Event Dashboard
      window.dispatchEvent(new CustomEvent('navigateToEventSection'));
      return;
    }

    if (action === "Logout") {
      handleLogout();
    }
  };

  return (
    <>
      <header className="p-4 flex justify-between items-start sticky top-0 z-10 backdrop-blur-sm shadow-lg bg-white/80 border-b">
        <h1 className="text-3xl text-transparent bg-clip-text glow-accent">
          GLOW
        </h1>

        <div className="flex space-x-3 items-center">
          {/* Notifications */}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {hasUnreadNotifications && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-pink-500 rounded-full" />
            )}
          </button>

          {/* Glow Coins */}
          <div className="flex items-center px-3 py-1 bg-white border rounded-full">
            <Gem className="w-4 h-4 text-yellow-500 mr-1" />
            <span className="text-sm">{glowCoins}</span>
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown((p) => !p)}
              className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center"
            >
              <User className="w-5 h-5 text-white" />
            </button>

{showDropdown && (
  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
    {/* Profile Name Display */}
    <p className="px-4 py-2 text-sm font-medium text-gray-800 border-b border-gray-100 mb-1">
      {profile?.full_name || profile?.name || "Glow User"}
    </p>

    <button
      onClick={() => handleProfileAction('My Account')}
      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 transition-colors"
    >
      <Settings className="w-4 h-4 mr-2" />
      My Account
    </button>

    <button
      onClick={() => handleProfileAction('Event Dashboard')}
      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 transition-colors"
    >
      <BarChart3 className="w-4 h-4 mr-2" />
      Event Dashboard
    </button>

    <button
      onClick={handleLogout}
      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
    >
      <LogOut className="w-4 h-4 mr-2" />
      Logout
    </button>
  </div>
)} 

          </div>
        </div>
      </header>

      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
}
