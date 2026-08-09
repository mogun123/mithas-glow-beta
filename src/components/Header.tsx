import { useState } from 'react';
import { Gem, User, Settings, LogOut, Bell, BarChart3, Briefcase, Crown } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { supabase } from '../lib/supabase';
import { useGlobalStore } from '../lib/globalStore';
import { toast } from 'sonner';

interface HeaderProps {
  onNavigateToProfile?: () => void;
}

export function Header({ onNavigateToProfile }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // DUAL-MODE STATE - Use global store as single source of truth
  const {
    appViewMode,
    toggleAppViewMode,
    isProUser,
    user,
  } = useGlobalStore();

  const isProfessional = isProUser();

  // Get user data from global store
  const profile = user;
  const glowCoins = user?.glow_points ?? 0;
  const hasUnreadNotifications = true;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Global store will be cleared by auth state listener in App.tsx
      window.dispatchEvent(new CustomEvent('navigateToHome'));
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  // DUAL-MODE TOGGLE HANDLER - Triggers actual state change and navigation
  const handleModeToggle = () => {
    toggleAppViewMode();
    const newMode = useGlobalStore.getState().appViewMode;

    // Navigate based on new mode - this triggers App.tsx re-render
    if (newMode === 'self') {
      toast.success('Switched to Customer View');
      window.dispatchEvent(new CustomEvent('navigateToHome'));
    } else {
      toast.success('Switched to Studio Dashboard');
      window.dispatchEvent(new CustomEvent('navigateToProfessional'));
    }
  };

  const handleProfileAction = (action: string) => {
    setShowDropdown(false);

    if (action === "Settings" && onNavigateToProfile) {
      onNavigateToProfile();
      return;
    }

    if (action === "Event Dashboard") {
      window.dispatchEvent(new CustomEvent('navigateToEventSection'));
      return;
    }

    if (action === "Logout") {
      handleLogout();
    }
  };

  return (
    <>
      <header className="px-4 py-3 flex justify-between items-center sticky top-0 z-10 backdrop-blur-xl shadow-sm bg-[#fdf4f8]/90 border-b border-pink-100">
        
        {/* MITHAS GLOW LOGO */}
        <div className="flex items-center gap-1.5">
          <Crown className="w-6 h-6 text-pink-500" strokeWidth={2.5} />
          <h1 className="text-xl sm:text-2xl font-black italic tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-fuchsia-500">
            MITHAS GLOW
          </h1>
        </div>

        <div className="flex space-x-2.5 sm:space-x-3 items-center">
          
          {/* DUAL-MODE TOGGLE - ONLY FOR PROFESSIONALS */}
          {isProfessional && (
            <button
              onClick={handleModeToggle}
              className={`
                relative px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300
                shadow-md border flex flex-col items-center justify-center min-w-[130px]
                ${appViewMode === 'pro'
                  ? 'bg-white text-pink-600 border-pink-200 hover:bg-pink-50 shadow-pink-500/10' // வென் இன் ப்ரோ மோட்
                  : 'bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white border-fuchsia-400 shadow-fuchsia-500/30' // வென் இன் கஸ்டமர் மோட்
                }
                hover:scale-105 active:scale-95
              `}
            >
              <span className="flex items-center gap-1.5">
                {appViewMode === 'pro' ? (
                  <>
                    <User className="w-3.5 h-3.5" />
                    <span>Customer View</span>
                  </>
                ) : (
                  <>
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Studio Dashboard</span>
                  </>
                )}
              </span>
              
              {/* MOVING TEXT (MARQUEE) - Shows only when user is in customer mode */}
              {appViewMode === 'self' && (
                <div className="w-[110px] overflow-hidden mt-0.5">
                   <marquee scrollamount="3" className="text-[8px] font-extrabold tracking-widest text-white/90">
                     EXPLORE YOUR PROFESSIONAL DASHBOARD ✨
                   </marquee>
                </div>
              )}
            </button>
          )}

          {/* Notifications - Solid Background for Visibility */}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative w-9 h-9 rounded-full bg-white flex items-center justify-center border border-pink-200 shadow-sm hover:bg-pink-50 transition-all"
          >
            <Bell className="w-4 h-4 text-slate-700" />
            {hasUnreadNotifications && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
            )}
          </button>

          {/* Glow Coins - Solid Background for Visibility */}
          <div className="hidden sm:flex items-center px-3 py-1.5 bg-white border border-pink-200 shadow-sm rounded-full">
            <Gem className="w-4 h-4 text-amber-500 mr-1.5" />
            <span className="text-xs font-black text-slate-800">{glowCoins}</span>
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown((p) => !p)}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-500 flex items-center justify-center shadow-md border-2 border-white hover:scale-105 transition-transform overflow-hidden"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-pink-100 py-1 z-50">
                {/* Profile Name Display */}
                <p className="px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-800 border-b border-pink-50 mb-1 truncate">
                  {profile?.full_name || profile?.display_name || profile?.username || "Glow User"}
                </p>

                {/* Show coins in dropdown for mobile view */}
                <div className="sm:hidden flex items-center px-4 py-2 text-xs font-bold text-slate-700 border-b border-pink-50 mb-1">
                  <Gem className="w-3.5 h-3.5 text-amber-500 mr-2" />
                  {glowCoins} Glow Coins
                </div>

                <button
                  onClick={() => handleProfileAction('Settings')}
                  className="flex items-center w-full px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </button>

                <button
                  onClick={() => handleProfileAction('Event Dashboard')}
                  className="flex items-center w-full px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Event Dashboard
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-50 transition-colors"
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
