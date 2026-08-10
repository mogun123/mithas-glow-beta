import { useState } from 'react';
import {
  Gem,
  User,
  Settings,
  LogOut,
  Bell,
  BarChart3,
  Briefcase,
  Crown,
  Sparkles,
} from 'lucide-react';
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

  // ---------------------------------------------------------
  // GLOBAL APP STATE
  // ---------------------------------------------------------
  const {
    appViewMode,
    toggleAppViewMode,
    isProUser,
    user,
  } = useGlobalStore();

  const isProfessional = isProUser();

  const profile = user;
  const glowCoins = user?.glow_points ?? 0;

  // Replace this later with your real notification unread count.
  const hasUnreadNotifications = true;

  // ---------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------
  const handleLogout = async () => {
    try {
      setShowDropdown(false);

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      toast.success('Logged out successfully');

      window.dispatchEvent(
        new CustomEvent('navigateToHome')
      );
    } catch (err) {
      console.error('Logout failed:', err);
      toast.error('Logout failed. Please try again.');
    }
  };

  // ---------------------------------------------------------
  // SELF <-> PRO MODE
  // ---------------------------------------------------------
  const handleModeToggle = () => {
    toggleAppViewMode();

    const newMode = useGlobalStore.getState().appViewMode;

    if (newMode === 'self') {
      toast.success('Switched to Customer View');

      window.dispatchEvent(
        new CustomEvent('navigateToHome')
      );
    } else {
      toast.success('Switched to Studio Dashboard');

      window.dispatchEvent(
        new CustomEvent('navigateToProfessional')
      );
    }
  };

  // ---------------------------------------------------------
  // PROFILE DROPDOWN ACTIONS
  // ---------------------------------------------------------
  const handleProfileAction = (action: string) => {
    setShowDropdown(false);

    if (action === 'Settings') {
      onNavigateToProfile?.();
      return;
    }

    if (action === 'Event Dashboard') {
      window.dispatchEvent(
        new CustomEvent('navigateToEventSection')
      );
      return;
    }

    if (action === 'Logout') {
      void handleLogout();
    }
  };

  return (
    <>
      {/* =====================================================
          HEADER
      ====================================================== */}
      <header
        className="
          sticky top-0 z-40
          flex items-center justify-between
          border-b border-pink-100
          bg-[#fdf4f8]/90
          px-4 py-3
          shadow-sm
          backdrop-blur-2xl
        "
      >
        {/* ===================================================
            LEFT — LOGO
        ==================================================== */}
        <div className="flex shrink-0 items-center gap-1.5">
          <div
            className="
              flex h-8 w-8 items-center justify-center
              rounded-xl
              bg-gradient-to-br
              from-pink-500
              via-fuchsia-500
              to-purple-600
              shadow-md
              shadow-pink-500/20
            "
          >
            <Crown
              className="h-4 w-4 text-white"
              strokeWidth={2.5}
            />
          </div>

          <div className="min-w-0">
            <h1
              className="
                whitespace-nowrap
                bg-gradient-to-r
                from-pink-600
                via-fuchsia-500
                to-purple-600
                bg-clip-text
                text-lg
                font-black
                italic
                tracking-tight
                text-transparent
                sm:text-2xl
              "
            >
              MITHAS GLOW
            </h1>

            {/* Small status label on larger screens */}
            <div className="hidden items-center gap-1 sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[8px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                Beauty • AI • AR
              </span>
            </div>
          </div>
        </div>

        {/* ===================================================
            RIGHT ACTIONS
        ==================================================== */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">

          {/* =================================================
              FUTURISTIC SELF / PRO MODE SWITCH
          ================================================= */}
          {isProfessional && (
            <button
              type="button"
              onClick={handleModeToggle}
              aria-label={
                appViewMode === 'pro'
                  ? 'Switch to Customer View'
                  : 'Switch to Studio Dashboard'
              }
              className="
                group
                relative
                flex
                items-center
                rounded-full
                border border-pink-200
                bg-white/80
                p-1
                shadow-sm
                backdrop-blur-xl
                transition-all
                duration-300
                hover:border-fuchsia-300
                hover:shadow-lg
                hover:shadow-fuchsia-500/10
                active:scale-95
              "
            >
              {/* ---------------------------------------------
                  SELF
              ---------------------------------------------- */}
              <span
                className={`
                  flex
                  items-center
                  gap-1.5
                  rounded-full
                  px-2.5
                  py-1.5
                  text-[9px]
                  font-black
                  uppercase
                  tracking-wide
                  transition-all
                  duration-300
                  sm:px-3
                  sm:text-[10px]
                  ${
                    appViewMode === 'self'
                      ? `
                        bg-gradient-to-r
                        from-pink-500
                        to-fuchsia-500
                        text-white
                        shadow-md
                        shadow-pink-500/25
                      `
                      : `
                        text-slate-500
                        hover:text-pink-600
                      `
                  }
                `}
              >
                <User className="h-3.5 w-3.5 shrink-0" />

                <span className="hidden xs:inline sm:inline">
                  SELF
                </span>
              </span>

              {/* ---------------------------------------------
                  PRO
              ---------------------------------------------- */}
              <span
                className={`
                  flex
                  items-center
                  gap-1.5
                  rounded-full
                  px-2.5
                  py-1.5
                  text-[9px]
                  font-black
                  uppercase
                  tracking-wide
                  transition-all
                  duration-300
                  sm:px-3
                  sm:text-[10px]
                  ${
                    appViewMode === 'pro'
                      ? `
                        bg-gradient-to-r
                        from-purple-500
                        via-fuchsia-500
                        to-pink-500
                        text-white
                        shadow-md
                        shadow-purple-500/25
                      `
                      : `
                        text-slate-500
                        hover:text-purple-600
                      `
                  }
                `}
              >
                <Briefcase className="h-3.5 w-3.5 shrink-0" />

                <span className="hidden xs:inline sm:inline">
                  PRO
                </span>
              </span>

              {/* Tiny glow indicator */}
              <span
                className={`
                  pointer-events-none
                  absolute
                  -right-0.5
                  -top-0.5
                  h-2
                  w-2
                  rounded-full
                  transition-all
                  duration-300
                  ${
                    appViewMode === 'pro'
                      ? 'bg-fuchsia-400 shadow-[0_0_8px_rgba(217,70,239,0.9)]'
                      : 'bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.9)]'
                  }
                `}
              />
            </button>
          )}

          {/* =================================================
              NOTIFICATIONS
          ==================================================== */}
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            aria-label="Open notifications"
            className="
              relative
              flex
              h-9
              w-9
              min-h-[36px]
              min-w-[36px]
              shrink-0
              items-center
              justify-center
              rounded-full
              border
              border-pink-200
              bg-white
              shadow-sm
              transition-all
              duration-200
              hover:border-pink-300
              hover:bg-pink-50
              hover:shadow-md
              active:scale-95
            "
          >
            <Bell className="h-4 w-4 text-slate-700" />

            {hasUnreadNotifications && (
              <>
                <span
                  className="
                    absolute
                    right-0
                    top-0
                    h-2.5
                    w-2.5
                    animate-pulse
                    rounded-full
                    bg-rose-500
                  "
                />

                <span
                  className="
                    absolute
                    right-[-1px]
                    top-[-1px]
                    h-2.5
                    w-2.5
                    rounded-full
                    border-2
                    border-white
                  "
                />
              </>
            )}
          </button>

          {/* =================================================
              GLOW COINS
          ==================================================== */}
          <div
            className="
              hidden
              shrink-0
              items-center
              gap-1.5
              rounded-full
              border
              border-amber-200
              bg-white
              px-3
              py-1.5
              shadow-sm
              sm:flex
            "
          >
            <Gem className="h-4 w-4 text-amber-500" />

            <span className="text-xs font-black text-slate-800">
              {glowCoins.toLocaleString()}
            </span>
          </div>

          {/* =================================================
              PROFILE
          ==================================================== */}
          <div className="relative shrink-0">

            {/* Profile button */}
            <button
              type="button"
              onClick={() =>
                setShowDropdown((previous) => !previous)
              }
              aria-label="Open profile menu"
              aria-expanded={showDropdown}
              className="
                relative
                flex
                h-10
                w-10
                min-h-[40px]
                min-w-[40px]
                items-center
                justify-center
                overflow-hidden
                rounded-full
                border-2
                border-white
                bg-gradient-to-br
                from-pink-500
                via-fuchsia-500
                to-purple-600
                shadow-md
                transition-all
                duration-200
                hover:scale-105
                hover:shadow-lg
                hover:shadow-pink-500/20
                active:scale-95
              "
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-white" />
              )}

              {/* Online indicator */}
              <span
                className="
                  absolute
                  bottom-0
                  right-0
                  h-2.5
                  w-2.5
                  rounded-full
                  border-2
                  border-white
                  bg-emerald-500
                "
              />
            </button>

            {/* =================================================
                PROFILE DROPDOWN
            ================================================== */}
            {showDropdown && (
              <>
                {/* Mobile backdrop */}
                <button
                  type="button"
                  aria-label="Close profile menu"
                  onClick={() => setShowDropdown(false)}
                  className="
                    fixed
                    inset-0
                    z-40
                    cursor-default
                    bg-transparent
                  "
                />

                <div
                  className="
                    absolute
                    right-0
                    z-50
                    mt-3
                    w-56
                    overflow-hidden
                    rounded-2xl
                    border
                    border-pink-100
                    bg-white
                    shadow-2xl
                    shadow-purple-900/10
                  "
                >
                  {/* User info */}
                  <div
                    className="
                      border-b
                      border-pink-50
                      bg-gradient-to-br
                      from-pink-50
                      via-white
                      to-purple-50
                      px-4
                      py-3
                    "
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="
                          flex
                          h-9
                          w-9
                          shrink-0
                          items-center
                          justify-center
                          overflow-hidden
                          rounded-full
                          bg-gradient-to-br
                          from-pink-500
                          to-fuchsia-500
                        "
                      >
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-4 w-4 text-white" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-slate-900">
                          {profile?.full_name ||
                            profile?.display_name ||
                            profile?.username ||
                            'Glow User'}
                        </p>

                        <div className="mt-0.5 flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5 text-fuchsia-500" />

                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            MITHAS GLOW
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Glow Coins — mobile */}
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      border-b
                      border-pink-50
                      px-4
                      py-2.5
                      sm:hidden
                    "
                  >
                    <div className="flex items-center">
                      <Gem className="mr-2 h-3.5 w-3.5 text-amber-500" />

                      <span className="text-xs font-bold text-slate-700">
                        Glow Coins
                      </span>
                    </div>

                    <span className="text-xs font-black text-slate-900">
                      {glowCoins.toLocaleString()}
                    </span>
                  </div>

                  {/* Settings */}
                  <button
                    type="button"
                    onClick={() =>
                      handleProfileAction('Settings')
                    }
                    className="
                      flex
                      w-full
                      items-center
                      px-4
                      py-3
                      text-xs
                      font-bold
                      text-slate-600
                      transition-colors
                      hover:bg-pink-50
                      hover:text-pink-600
                    "
                  >
                    <Settings className="mr-2.5 h-4 w-4" />
                    Settings
                  </button>

                  {/* Event Dashboard */}
                  <button
                    type="button"
                    onClick={() =>
                      handleProfileAction('Event Dashboard')
                    }
                    className="
                      flex
                      w-full
                      items-center
                      px-4
                      py-3
                      text-xs
                      font-bold
                      text-slate-600
                      transition-colors
                      hover:bg-purple-50
                      hover:text-purple-600
                    "
                  >
                    <BarChart3 className="mr-2.5 h-4 w-4" />
                    Event Dashboard
                  </button>

                  {/* Divider */}
                  <div className="mx-3 border-t border-slate-100" />

                  {/* Logout */}
                  <button
                    type="button"
                    onClick={() =>
                      handleProfileAction('Logout')
                    }
                    className="
                      flex
                      w-full
                      items-center
                      px-4
                      py-3
                      text-xs
                      font-bold
                      text-rose-500
                      transition-colors
                      hover:bg-rose-50
                      hover:text-rose-600
                    "
                  >
                    <LogOut className="mr-2.5 h-4 w-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* =====================================================
          NOTIFICATION CENTER
      ====================================================== */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
}
