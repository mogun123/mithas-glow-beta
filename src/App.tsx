import { useState, useEffect, lazy, Suspense, memo, useCallback, useRef, useMemo } from "react";
import { RegisterView } from "./components/RegisterView";
import { LoginView } from "./components/LoginView";
import { OTPView } from "./components/OTPView";
import ProfileSetupView from "./components/ProfileSetupView";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster, toast } from "sonner";
import { supabase } from "./lib/supabase";
import { AuthGuard } from "./components/AuthGuard";
import { useAuthStore } from "./lib/store";
import { useGlobalStore } from "./lib/globalStore";

import { HomeScreen } from "./screens/HomeScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { EventScreen } from "./screens/EventScreen";
import { ProductsScreen } from "./screens/ProductsScreen";
import { CoachScreen } from "./screens/CoachScreen";
import { BookingScreen } from "./screens/BookingScreen";
import { ArtistDetailScreen } from "./screens/ArtistDetailScreen";
import { MyBookingsScreen } from "./screens/MyBookingsScreen";
import { ChatListScreen } from "./screens/ChatListScreen";
import { ChatThreadScreen } from "./screens/ChatThreadScreen";
import { ContactSyncScreen } from "./screens/ContactSyncScreen";
import { MessageRequestsScreen } from "./screens/MessageRequestsScreen";
import { BlockedUsersScreen } from "./screens/BlockedUsersScreen";
import ProfessionalDashboard from "./components/ProfessionalDashboard";
import { GlowChatProvider } from "./components/chat/GlowChatProvider";
import { AdminProductCatalog } from "./screens/AdminProductCatalog";

const MirrorScreen = lazy(() => import("./screens/MirrorScreen"));

type View = "register" | "login" | "otp" | "profile" | "home" | "mirror" | "userprofile" | "events" | "products" | "coach" | "booking" | "artist-detail" | "my-bookings" | "professional" | "chat" | "chat-thread" | "chat-contacts" | "chat-requests" | "chat-blocked" | "admin-products";

const LoadingScreen = memo(function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-white">
      <div className="text-center p-8 bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white">
        <div className="w-16 h-16 border-4 border-purple-100 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-700 font-extrabold tracking-wide">Starting Mithas Glow...</p>
      </div>
    </div>
  );
});

const THEME_MAP: Record<View, string> = {
  register: "mithas-theme", login: "mithas-theme", otp: "mithas-theme", profile: "mithas-theme",
  home: "glow-home-theme", mirror: "glow-mirror-theme", userprofile: "glow-profile-theme", events: "glow-home-theme",
  products: "glow-home-theme", coach: "glow-home-theme", booking: "glow-home-theme", "artist-detail": "glow-home-theme", "my-bookings": "glow-home-theme", professional: "glow-home-theme",
  chat: "glow-home-theme", "chat-thread": "glow-home-theme", "chat-contacts": "glow-home-theme", "chat-requests": "glow-home-theme", "chat-blocked": "glow-home-theme", "admin-products": "glow-home-theme"
};

export default function App() {
  const user = useGlobalStore((state) => state.user);
  const appViewMode = useGlobalStore((state) => state.appViewMode);

  // Admin users should have access to professional features
  const isProUser = !!user && (user.role === 'admin' || user.role === 'seller' || (user as any).is_seller || user.industry === 'makeup_artist');

  const setAuthSession = useAuthStore((state) => state.setSession);
  const setAuthProfileCompleted = useAuthStore((state) => state.setProfileCompleted);

  const [session, setSession] = useState<any>(null);
  const isAuthenticated = !!session;

  // ⚡ INSTANT REFRESH: If user profile or savedView exists in cache/localStorage, skip full-screen splash immediately
  const [isInitialLoading, setIsInitialLoading] = useState(() => {
    const cachedUser = useGlobalStore.getState().user;
    const savedView = localStorage.getItem("currentView");
    return !cachedUser && !savedView;
  });

  const [currentView, setCurrentView] = useState<View>(() => {
    const savedView = localStorage.getItem("currentView") as View;
    return savedView || "register";
  });

  const [identifier, setIdentifier] = useState("");
  const [identifierType, setIdentifierType] = useState<"email" | "phone">("email");
  const [selectedArtistId, setSelectedArtistId] = useState<string>(() => sessionStorage.getItem("selectedArtistId") || "");
  const latestScanReport = useRef<any>(null);

  const navigate = useCallback((view: View) => {
    setCurrentView(view);
    localStorage.setItem("currentView", view);
    window.history.pushState({ view }, "");
  }, []);

  const goHome = useCallback(() => navigate("home"), [navigate]);
  const goMirror = useCallback(() => navigate("mirror"), [navigate]);
  const goProfile = useCallback(() => navigate("userprofile"), [navigate]);
  const goEvents = useCallback(() => navigate("events"), [navigate]);
  const goProducts = useCallback(() => navigate("products"), [navigate]);
  const goCoach = useCallback(() => navigate("coach"), [navigate]);
  const goBooking = useCallback(() => navigate("booking"), [navigate]);
  const goMyBookings = useCallback(() => navigate("my-bookings"), [navigate]);
  const goChat = useCallback(() => navigate("chat"), [navigate]);
  const goChatThread = useCallback((conversationId: string) => {
    sessionStorage.setItem("currentConversationId", conversationId);
    navigate("chat-thread");
  }, [navigate]);
  const goChatContacts = useCallback(() => navigate("chat-contacts"), [navigate]);
  const goChatRequests = useCallback(() => navigate("chat-requests"), [navigate]);
  const goChatBlocked = useCallback(() => navigate("chat-blocked"), [navigate]);

  const handleNavigateToArtistDetail = useCallback((artistId: string) => {
    setSelectedArtistId(artistId);
    sessionStorage.setItem("selectedArtistId", artistId);
    navigate("artist-detail");
  }, [navigate]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view) setCurrentView(event.state.view);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // 🎯 NON-BLOCKING BACKGROUND SYNC & 600ms HARD TIMEOUT SAFETY NET
  useEffect(() => {
    let isSubscribed = true;

    // Hard fallback timeout: max 600ms full-screen spinner
    const timer = setTimeout(() => {
      if (isSubscribed) setIsInitialLoading(false);
    }, 600);

    const initApp = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn('[AppInit] Session error notice:', sessionError.message);
          if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('invalid_grant') || (sessionError as any).status === 400) {
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          }
        }

        if (session) {
          setSession(session);

          // Background revalidation
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!profileError && profile) {
            useGlobalStore.getState().setUser(profile as any);
            setAuthProfileCompleted(!!profile.profile_completed);

            const isAdmin = profile.role === 'admin';
            const savedView = localStorage.getItem("currentView") as View;
            const validViews: View[] = ["home", "mirror", "userprofile", "events", "products", "coach", "booking", "artist-detail", "my-bookings", "professional", "chat", "chat-thread", "chat-contacts", "chat-requests", "chat-blocked", "admin-products"];

            if (savedView && validViews.includes(savedView)) {
              setCurrentView(savedView);
            } else if (isAdmin) {
              setCurrentView('professional');
            } else if (profile.role === 'seller' && profile.industry === 'makeup_artist') {
              setCurrentView('professional');
            } else if (profile.profile_completed) {
              setCurrentView('home');
            } else {
              setCurrentView('profile');
            }
          } else {
            const cachedUser = useGlobalStore.getState().user;
            if (!cachedUser) {
              localStorage.removeItem("currentView");
              setCurrentView('profile');
            }
          }
        } else {
          const cachedUser = useGlobalStore.getState().user;
          if (!cachedUser) {
            localStorage.removeItem("currentView");
            setCurrentView('register');
          }
        }
      } catch (error) {
        console.error('Init app error:', error);
        const cachedUser = useGlobalStore.getState().user;
        if (!cachedUser) {
          localStorage.removeItem("currentView");
          setCurrentView('register');
        }
      } finally {
        clearTimeout(timer);
        if (isSubscribed) {
          setIsInitialLoading(false);
        }
      }
    };

    initApp();

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, []);

  // 🚪 LOGOUT EVENT LISTENER & AUTH STATE CHANGE MONITOR
  useEffect(() => {
    const performFullLogout = () => {
      console.log('[AppLogout] Executing complete client-side logout cleanup...');
      setSession(null);
      useGlobalStore.getState().clearData();
      useAuthStore.getState().logout();
      localStorage.removeItem("currentView");
      localStorage.removeItem("mithas-glow-storage");
      sessionStorage.clear();
      setCurrentView("register");
    };

    // Listen for Supabase SIGNED_OUT event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      console.log('[AppAuthListener] Auth state changed:', event);
      if (event === 'SIGNED_OUT' || (!s && event !== 'INITIAL_SESSION')) {
        performFullLogout();
      }
    });

    // Listen for custom logout events dispatched by Header / UserProfileMenu
    const handleLogoutEvent = async () => {
      performFullLogout();
    };

    window.addEventListener("appLogout", handleLogoutEvent);
    window.addEventListener("navigateToRegister", handleLogoutEvent);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("appLogout", handleLogoutEvent);
      window.removeEventListener("navigateToRegister", handleLogoutEvent);
    };
  }, []);

  useEffect(() => {
    const newTheme = THEME_MAP[currentView] || "mithas-theme";
    const allThemes = Array.from(new Set(Object.values(THEME_MAP)));
    document.body.classList.remove(...allThemes);
    document.body.classList.add(newTheme);
  }, [currentView]);

  const handleSendOTP = (id: string, type: "email" | "phone") => {
    setIdentifier(id);
    setIdentifierType(type);
    navigate("otp");
  };

  const handleVerifyOTP = () => {
    toast.success("Verification successful!");
    setAuthProfileCompleted(false);
    setCurrentView("profile");
  };

  const handleProfileComplete = async (view?: string) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.error("User session not found!");
        return;
      }

      if (view) {
        setAuthProfileCompleted(true);
        navigate(view as View);
        toast.success("Profile saved! ✨");
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, industry, profile_completed')
        .eq('id', currentUser.id)
        .single();

      setAuthProfileCompleted(true);
      if (profileData?.role === 'seller' && profileData?.industry === 'makeup_artist') {
        navigate("professional");
      } else {
        navigate("home");
      }
      toast.success("Profile saved! ✨");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleLogin = async (userData: any) => {
    setAuthSession(userData.session);
    setSession(userData.session);

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();

    if (profile) {
      useGlobalStore.getState().setUser(profile as any);

      // 🎯 ADMIN USERS SKIP PROFILE COMPLETION CHECK
      const isAdmin = profile.role === 'admin';

      if (isAdmin || profile.profile_completed) {
        setAuthProfileCompleted(true);
        if (isAdmin) {
          // Admin users always go to professional view
          setCurrentView("professional");
        } else if (profile.role === 'seller' && profile.industry === 'makeup_artist') {
          setCurrentView("professional");
        } else {
          setCurrentView("home");
        }
      } else {
        setAuthProfileCompleted(false);
        setCurrentView("profile");
      }
    }
  };

  const authenticatedScreen = useMemo(() => {
    const screenMap: Record<string, React.ReactNode> = {
      "userprofile": <ProfileScreen onNavigateHome={goHome} />,
      "events": <EventScreen onNavigateHome={goHome} latestScanReport={latestScanReport.current} setLatestScanReport={(val: any) => latestScanReport.current = val} />,
      "mirror": <MirrorScreen onNavigateHome={goHome} />,
      "products": <ProductsScreen onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateHome={goHome} onNavigateToCoach={goCoach} onNavigateToBooking={goBooking} onNavigateToChat={goChat} />,
      "coach": <CoachScreen onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateHome={goHome} onNavigateToProducts={goProducts} onNavigateToBooking={goBooking} onNavigateToChat={goChat} />,
      "booking": <BookingScreen onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateHome={goHome} onNavigateToArtistDetail={handleNavigateToArtistDetail} onNavigateToProducts={goProducts} onNavigateToCoach={goCoach} onNavigateToChat={goChat} />,
      "artist-detail": <ArtistDetailScreen artistId={selectedArtistId} onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateHome={goHome} onNavigateBack={goBooking} onNavigateToMyBookings={goMyBookings} onNavigateToChat={goChat} />,
      "my-bookings": <MyBookingsScreen userId={user?.id || ''} onNavigateToArtistProfile={handleNavigateToArtistDetail} onBack={goBooking} onNavigateHome={goHome} onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateToProducts={goProducts} onNavigateToCoach={goCoach} onNavigateToBooking={goBooking} onNavigateToChat={goChat} />,
      "professional": (isProUser && appViewMode === 'self') ? <HomeScreen onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateToEvents={goEvents} onNavigateToProducts={goProducts} onNavigateToCoach={goCoach} onNavigateToBooking={goBooking} onNavigateToChat={goChat} /> : <ProfessionalDashboard onNavigateHome={goHome} onNavigateToProfile={goProfile} onNavigateToMirror={goMirror} onNavigateToAdminProducts={() => setCurrentView('admin-products')} />,
      "home": (isProUser && appViewMode === 'pro') ? <ProfessionalDashboard onNavigateHome={goHome} onNavigateToProfile={goProfile} onNavigateToMirror={goMirror} onNavigateToAdminProducts={() => setCurrentView('admin-products')} /> : <HomeScreen onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateToEvents={goEvents} onNavigateToProducts={goProducts} onNavigateToCoach={goCoach} onNavigateToBooking={goBooking} onNavigateToChat={goChat} />,
      "admin-products": <AdminProductCatalog />,
      "chat": <ChatListScreen onNavigateHome={goHome} onNavigateBack={goHome} onNavigateToThread={goChatThread} onNavigateToContacts={goChatContacts} onNavigateToRequests={goChatRequests} onNavigateToBlocked={goChatBlocked} />,
      "chat-thread": <ChatThreadScreen conversation={null as any} onNavigateBack={goChat} />,
      "chat-contacts": <ContactSyncScreen onNavigateBack={goChat} />,
      "chat-requests": <MessageRequestsScreen onNavigateBack={goChat} />,
      "chat-blocked": <BlockedUsersScreen onNavigateBack={goChat} />
    };
    return screenMap[currentView] || null;
  }, [currentView, isProUser, appViewMode, selectedArtistId, user?.id, goHome, goMirror, goProfile, goEvents, goProducts, goCoach, goBooking, goMyBookings, handleNavigateToArtistDetail, goChat, goChatThread, goChatContacts, goChatRequests, goChatBlocked]);

  if (isInitialLoading) return <LoadingScreen />;

  if (["register", "login", "otp", "profile"].includes(currentView)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Toaster position="top-center" richColors />
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden p-8">
          <header className="text-center mb-8">
            <h1 className="text-4xl tracking-tighter text-pink-600">MITHAS GLOW</h1>
            <p className="text-gray-500 mt-1">Discover your perfect look.</p>
          </header>
          {(currentView === "login" || currentView === "register") && (
            <div className="flex border-b border-gray-200 mb-6">
              <button onClick={() => navigate("login")} className={`flex-1 py-3 ${currentView === "login" ? "border-b-3 border-purple-500 text-purple-600 font-bold" : "text-gray-500"}`}>Login</button>
              <button onClick={() => navigate("register")} className={`flex-1 py-3 ${currentView === "register" ? "border-b-3 border-purple-500 text-purple-600 font-bold" : "text-gray-500"}`}>Register</button>
            </div>
          )}
          <Suspense fallback={null}>
            {currentView === "register" && <RegisterView onSendOTP={handleSendOTP} />}
            {currentView === "login" && <LoginView onLogin={handleLogin} />}
            {currentView === "otp" && <OTPView identifier={identifier} identifierType={identifierType} onVerify={handleVerifyOTP} onResend={() => toast.success("OTP Resent")} />}
            {currentView === "profile" && <ProfileSetupView onComplete={handleProfileComplete} />}
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard onUnauthenticated={() => navigate("register")}>
      <ErrorBoundary>
        <GlowChatProvider>
          <Toaster position="top-center" richColors />
          <Suspense fallback={<LoadingScreen />}>
            {authenticatedScreen}
          </Suspense>
        </GlowChatProvider>
      </ErrorBoundary>
    </AuthGuard>
  );
}
