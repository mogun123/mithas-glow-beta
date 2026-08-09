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

  // DUAL-MODE STATE
  const {
    appViewMode,
    toggleAppViewMode,
    isProUser,
    user,
  } = useGlobalStore();

  const isProfessional = isProUser();

  const profile = user;
  const glowCoins = user?.glow_points ?? 0;
  const hasUnreadNotifications = true;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.dispatchEvent(new CustomEvent('navigateToHome'));
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const handleModeToggle = () => {
    toggleAppViewMode();
    const newMode = useGlobalStore.getState().appViewMode;

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
        
        {/* MITHAS GLOW LOGO - FIXED (No Wrapping) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-pink-500 shrink-0" strokeWidth={2.5} />
          <h1 className="text-lg sm:text-2xl font-black italic tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-fuchsia-500 whitespace-nowrap">
            MITHAS GLOW
          </h1>
        </div>

        <div className="flex space-x-2.5 sm:space-x-3 items-center shrink-0">
          
          {/* DUAL-MODE TOGGLE - FIXED (No Overlapping, Clear Marquee) */}
          {isProfessional && (
            <button
              onClick={handleModeToggle}
              className={`
                relative rounded-xl font-black uppercase tracking-wider transition-all duration-300
                shadow-md border flex flex-col items-center justify-center shrink-0 overflow-hidden
                w-[130px] sm:w-[150px]
                ${appViewMode === 'pro'
                  ? 'bg-white text-pink-600 border-pink-200 hover:bg-pink-50 shadow-pink-500/10 py-2 sm:py-2.5' 
                  : 'bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white border-fuchsia-400 shadow-fuchsia-500/30 py-1.5'
                }
                hover:scale-105 active:scale-95
              `}
            >
              <div className="flex items-center justify-center gap-1.5 w-full">
                {appViewMode === 'pro' ? (
                  <>
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[10px] sm:text-xs whitespace-nowrap">Customer View</span>
                  </>
                ) : (
                  <>
                    <Briefcase className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[10px] sm:text-xs whitespace-nowrap">Studio Dashboard</span>
                  </>
                )}
              </div>
              
              {/* MOVING TEXT - Fixed height and spacing to prevent overlap */}
              {appViewMode === 'self' && (
                <div className="w-full mt-0.5 h-[12px] flex items-center">
                   <marquee scrollamount="3" className="text-[8px] font-extrabold tracking-widest text-white whitespace-nowrap leading-none">
                     EXPLORE YOUR PROFESSIONAL DASHBOARD ✨
                   </marquee>
                </div>
              )}
            </button>
          )}

          {/* Notifications - Fixed Size */}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative w-9 h-9 min-w-[36px] min-h-[36px] shrink-0 rounded-full bg-white flex items-center justify-center border border-pink-200 shadow-sm hover:bg-pink-50 transition-all"
          >
            <Bell className="w-4 h-4 text-slate-700" />
            {hasUnreadNotifications && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
            )}
          </button>

          {/* Glow Coins - Hidden on very small screens, visible on Desktop */}
          <div className="hidden sm:flex shrink-0 items-center px-3 py-1.5 bg-white border border-pink-200 shadow-sm rounded-full">
            <Gem className="w-4 h-4 text-amber-500 mr-1.5" />
            <span className="text-xs font-black text-slate-800">{glowCoins}</span>
          </div>

          {/* Profile Dropdown - Fixed Size (Won't become giant) */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowDropdown((p) => !p)}
              className="w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px] shrink-0 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-500 flex items-center justify-center shadow-md border-2 border-white hover:scale-105 transition-transform overflow-hidden"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-pink-100 py-1 z-50">
                <p className="px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-800 border-b border-pink-50 mb-1 truncate">
                  {profile?.full_name || profile?.display_name || profile?.username || "Glow User"}
                </p>

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
