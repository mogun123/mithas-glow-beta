import { useState, useEffect } from 'react';
import { Gem, User, Settings, LogOut, Bell, BarChart3, Sparkles, Briefcase } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import { useRewardsStore } from '../store/useRewardsStore';
import { useGlobalStore } from '../lib/globalStore';

interface HeaderProps {
  onNavigateToProfile?: () => void;
}

export function Header({ onNavigateToProfile }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);
  
  // DUAL-MODE STATE
  const { appViewMode, toggleAppViewMode, isProUser } = useGlobalStore();
  const isProfessional = isProUser();
  
  // Subscribe to rewards store for real-time streak and points
  const { rewards, fetchRewards } = useRewardsStore();
  
  // Get user ID for fetching rewards
  const userId = user?.id || profile?.id;
  
  // Fetch rewards when user is available
  useEffect(() => {
    if (userId) {
      fetchRewards(userId);
    }
  }, [userId]);
  
  // Strictly use real glow_points from database - NO mock/fallback values
  // Priority: 1) rewards store (from profiles table), 2) profile.glow_points, 3) 0
  const glowCoins = rewards?.glow_points ?? profile?.glow_points ?? user?.glow_points ?? 0;
  const hasUnreadNotifications = true;

  const authLogout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      authLogout();
      // Navigate to home using custom event instead of window.location.href
      window.dispatchEvent(new CustomEvent('navigateToHome'));
    } catch (err) {
      console.error("Logout failed", err);
    }
  };
  
  // DUAL-MODE TOGGLE HANDLER
  const handleModeToggle = () => {
    toggleAppViewMode();
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
      <header className="p-4 flex justify-between items-start sticky top-0 z-10 backdrop-blur-md shadow-lg bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-yellow-500/20 border-b border-white/10">
        <h1 className="text-3xl text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-yellow-400 font-bold tracking-tight">
          GLOW
        </h1>

        <div className="flex space-x-3 items-center">
          {/* DUAL-MODE TOGGLE - ONLY FOR PROFESSIONALS */}
          {isProfessional && (
            <button
              onClick={handleModeToggle}
              className={`
                relative px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300
                backdrop-blur-md border border-white/20 shadow-lg
                ${appViewMode === 'pro' 
                  ? 'bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white shadow-purple-500/30' 
                  : 'bg-gradient-to-r from-yellow-400/80 to-orange-400/80 text-white shadow-yellow-500/30'
                }
                hover:scale-105 active:scale-95
              `}
            >
              <span className="flex items-center gap-2">
                {appViewMode === 'pro' ? (
                  <>
                    <Briefcase className="w-4 h-4" />
                    <span className="hidden sm:inline">Pro Mode</span>
                    <span className="sm:hidden">Pro</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden sm:inline">Self Mode</span>
                    <span className="sm:hidden">Self</span>
                  </>
                )}
              </span>
            </button>
          )}
          
          {/* Notifications */}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 hover:bg-white/30 transition-all"
          >
            <Bell className="w-5 h-5 text-white" />
            {hasUnreadNotifications && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white/50" />
            )}
          </button>

          {/* Glow Coins */}
          <div className="flex items-center px-3 py-1.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full">
            <Gem className="w-4 h-4 text-yellow-300 mr-1.5" />
            <span className="text-sm font-semibold text-white">{glowCoins}</span>
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown((p) => !p)}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
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
