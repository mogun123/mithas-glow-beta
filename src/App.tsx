--- src/App.tsx (原始)
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
import { ChatListScreen } from "./screens/ChatListScreen";
import { ChatThreadScreen } from "./screens/ChatThreadScreen";
import { ContactSyncScreen } from "./screens/ContactSyncScreen";
import { MessageRequestsScreen } from "./screens/MessageRequestsScreen";
import { BlockedUsersScreen } from "./screens/BlockedUsersScreen";
import ProfessionalDashboard from "./components/ProfessionalDashboard";

const MirrorScreen = lazy(() => import("./screens/MirrorScreen"));

type View = "register" | "login" | "otp" | "profile" | "home" | "mirror" | "userprofile" | "events" | "products" | "coach" | "booking" | "artist-detail" | "professional" | "chat" | "chat-thread" | "chat-contacts" | "chat-requests" | "chat-blocked";

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
  products: "glow-home-theme", coach: "glow-home-theme", booking: "glow-home-theme", "artist-detail": "glow-home-theme", professional: "glow-home-theme",
};

export default function App() {
  const user = useGlobalStore((state) => state.user);
  const appViewMode = useGlobalStore((state) => state.appViewMode);

  const isProUser = !!user && (user.role === 'seller' || (user as any).is_seller || user.industry === 'makeup_artist');

  const setAuthSession = useAuthStore((state) => state.setSession);
  const setAuthProfileCompleted = useAuthStore((state) => state.setProfileCompleted);

  const [session, setSession] = useState<any>(null);
  const isAuthenticated = !!session;

  const [isInitialLoading, setIsInitialLoading] = useState(true);
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

  // 🎯 STRICTLY ORIGINAL APP LOGIC - NO TIMEOUTS, NO onAuthStateChange CONFLICTS
  useEffect(() => {
    const initApp = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setSession(session);

          // Original App Style Direct Fetch
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!profileError && profile) {
            useGlobalStore.getState().setUser(profile as any);
            setAuthProfileCompleted(!!profile.profile_completed);
          } else {
            setAuthProfileCompleted(false);
          }

          const savedView = localStorage.getItem("currentView") as View;
          const validViews: View[] = ["home", "mirror", "userprofile", "events", "products", "coach", "booking", "artist-detail", "professional"];

          if (savedView && validViews.includes(savedView)) {
            setCurrentView(savedView);
          } else if (profile?.profile_completed) {
            if (profile.role === 'seller' && profile.industry === 'makeup_artist') {
              setCurrentView('professional');
            } else {
              setCurrentView('home');
            }
          } else {
            setCurrentView('profile');
          }
        } else {
          localStorage.removeItem("currentView");
          setCurrentView('register');
        }
      } catch (error) {
        console.error('Init app error:', error);
        localStorage.removeItem("currentView");
        setCurrentView('register');
      } finally {
        setIsInitialLoading(false);
      }
    };

    initApp();
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
      if (profile.profile_completed) {
        setAuthProfileCompleted(true);
        if (profile.role === 'seller' && profile.industry === 'makeup_artist') {
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
    const screenMap: Record<string, JSX.Element> = {
      "userprofile": <ProfileScreen onNavigateHome={goHome} />,
      "events": <EventScreen onNavigateHome={goHome} latestScanReport={latestScanReport.current} setLatestScanReport={(val: any) => latestScanReport.current = val} />,
      "mirror": <MirrorScreen onNavigateHome={goHome} />,
      "products": <ProductsScreen onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateHome={goHome} />,
      "coach": <CoachScreen onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateHome={goHome} />,
      "booking": <BookingScreen onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateHome={goHome} onNavigateToArtistDetail={handleNavigateToArtistDetail} />,
      "artist-detail": <ArtistDetailScreen artistId={selectedArtistId} onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateHome={goHome} onNavigateBack={goBooking} onNavigateToMyBookings={goProfile} />,
      "professional": (isProUser && appViewMode === 'self') ? <HomeScreen onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateToEvents={goEvents} onNavigateToProducts={goProducts} onNavigateToCoach={goCoach} onNavigateToBooking={goBooking} /> : <ProfessionalDashboard onNavigateHome={goHome} onNavigateToProfile={goProfile} onNavigateToMirror={goMirror} />,
      "home": (isProUser && appViewMode === 'pro') ? <ProfessionalDashboard onNavigateHome={goHome} onNavigateToProfile={goProfile} onNavigateToMirror={goMirror} /> : <HomeScreen onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateToEvents={goEvents} onNavigateToProducts={goProducts} onNavigateToCoach={goCoach} onNavigateToBooking={goBooking} />
    };
    return screenMap[currentView] || null;
  }, [currentView, isProUser, appViewMode, selectedArtistId, goHome, goMirror, goProfile, goEvents, goProducts, goCoach, goBooking, handleNavigateToArtistDetail]);

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
        <Toaster position="top-center" richColors />
        <Suspense fallback={<LoadingScreen />}>
          {authenticatedScreen}
        </Suspense>
      </ErrorBoundary>
    </AuthGuard>
  );
}

+++ src/App.tsx (修改后)
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
import { ChatListScreen } from "./screens/ChatListScreen";
import { ChatThreadScreen } from "./screens/ChatThreadScreen";
import { ContactSyncScreen } from "./screens/ContactSyncScreen";
import { MessageRequestsScreen } from "./screens/MessageRequestsScreen";
import { BlockedUsersScreen } from "./screens/BlockedUsersScreen";
import ProfessionalDashboard from "./components/ProfessionalDashboard";

const MirrorScreen = lazy(() => import("./screens/MirrorScreen"));

type View = "register" | "login" | "otp" | "profile" | "home" | "mirror" | "userprofile" | "events" | "products" | "coach" | "booking" | "artist-detail" | "professional" | "chat" | "chat-thread" | "chat-contacts" | "chat-requests" | "chat-blocked";

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
  products: "glow-home-theme", coach: "glow-home-theme", booking: "glow-home-theme", "artist-detail": "glow-home-theme", professional: "glow-home-theme",
};

export default function App() {
  const user = useGlobalStore((state) => state.user);
  const appViewMode = useGlobalStore((state) => state.appViewMode);

  const isProUser = !!user && (user.role === 'seller' || (user as any).is_seller || user.industry === 'makeup_artist');

  const setAuthSession = useAuthStore((state) => state.setSession);
  const setAuthProfileCompleted = useAuthStore((state) => state.setProfileCompleted);

  const [session, setSession] = useState<any>(null);
  const isAuthenticated = !!session;

  const [isInitialLoading, setIsInitialLoading] = useState(true);
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

  // 🎯 STRICTLY ORIGINAL APP LOGIC - NO TIMEOUTS, NO onAuthStateChange CONFLICTS
  useEffect(() => {
    const initApp = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setSession(session);

          // Original App Style Direct Fetch
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!profileError && profile) {
            useGlobalStore.getState().setUser(profile as any);
            setAuthProfileCompleted(!!profile.profile_completed);
          } else {
            setAuthProfileCompleted(false);
          }

          const savedView = localStorage.getItem("currentView") as View;
          const validViews: View[] = ["home", "mirror", "userprofile", "events", "products", "coach", "booking", "artist-detail", "professional"];

          if (savedView && validViews.includes(savedView)) {
            setCurrentView(savedView);
          } else if (profile?.profile_completed) {
            if (profile.role === 'seller' && profile.industry === 'makeup_artist') {
              setCurrentView('professional');
            } else {
              setCurrentView('home');
            }
          } else {
            setCurrentView('profile');
          }
        } else {
          localStorage.removeItem("currentView");
          setCurrentView('register');
        }
      } catch (error) {
        console.error('Init app error:', error);
        localStorage.removeItem("currentView");
        setCurrentView('register');
      } finally {
        setIsInitialLoading(false);
      }
    };

    initApp();
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
      if (profile.profile_completed) {
        setAuthProfileCompleted(true);
        if (profile.role === 'seller' && profile.industry === 'makeup_artist') {
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
    const screenMap: Record<string, JSX.Element> = {
      "userprofile": <ProfileScreen onNavigateHome={goHome} />,
      "events": <EventScreen onNavigateHome={goHome} latestScanReport={latestScanReport.current} setLatestScanReport={(val: any) => latestScanReport.current = val} />,
      "mirror": <MirrorScreen onNavigateHome={goHome} />,
      "products": <ProductsScreen onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateHome={goHome} />,
      "coach": <CoachScreen onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateHome={goHome} />,
      "booking": <BookingScreen onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateHome={goHome} onNavigateToArtistDetail={handleNavigateToArtistDetail} />,
      "artist-detail": <ArtistDetailScreen artistId={selectedArtistId} onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateHome={goHome} onNavigateBack={goBooking} onNavigateToMyBookings={goProfile} onNavigateToChat={goChat} />,
      "professional": (isProUser && appViewMode === 'self') ? <HomeScreen onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateToEvents={goEvents} onNavigateToProducts={goProducts} onNavigateToCoach={goCoach} onNavigateToBooking={goBooking} /> : <ProfessionalDashboard onNavigateHome={goHome} onNavigateToProfile={goProfile} onNavigateToMirror={goMirror} />,
      "home": (isProUser && appViewMode === 'pro') ? <ProfessionalDashboard onNavigateHome={goHome} onNavigateToProfile={goProfile} onNavigateToMirror={goMirror} /> : <HomeScreen onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateToEvents={goEvents} onNavigateToProducts={goProducts} onNavigateToCoach={goCoach} onNavigateToBooking={goBooking} />,
      "chat": <ChatListScreen onNavigateHome={goHome} onNavigateToProfile={goProfile} goChat={goChat} goChatThread={goChatThread} goChatContacts={goChatContacts} goChatRequests={goChatRequests} goChatBlocked={goChatBlocked} />,
      "chat-thread": <ChatThreadScreen onNavigateHome={goHome} onNavigateToProfile={goProfile} goChat={goChat} goChatThread={goChatThread} goChatContacts={goChatContacts} goChatRequests={goChatRequests} goChatBlocked={goChatBlocked} />,
      "chat-contacts": <ContactSyncScreen onNavigateHome={goHome} onNavigateToProfile={goProfile} goChat={goChat} goChatThread={goChatThread} goChatContacts={goChatContacts} goChatRequests={goChatRequests} goChatBlocked={goChatBlocked} />,
      "chat-requests": <MessageRequestsScreen onNavigateHome={goHome} onNavigateToProfile={goProfile} goChat={goChat} goChatThread={goChatThread} goChatContacts={goChatContacts} goChatRequests={goChatRequests} goChatBlocked={goChatBlocked} />,
      "chat-blocked": <BlockedUsersScreen onNavigateHome={goHome} onNavigateToProfile={goProfile} goChat={goChat} goChatThread={goChatThread} goChatContacts={goChatContacts} goChatRequests={goChatRequests} goChatBlocked={goChatBlocked} />
    };
    return screenMap[currentView] || null;
  }, [currentView, isProUser, appViewMode, selectedArtistId, goHome, goMirror, goProfile, goEvents, goProducts, goCoach, goBooking, handleNavigateToArtistDetail, goChat, goChatThread, goChatContacts, goChatRequests, goChatBlocked]);

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
        <Toaster position="top-center" richColors />
        <Suspense fallback={<LoadingScreen />}>
          {authenticatedScreen}
        </Suspense>
      </ErrorBoundary>
    </AuthGuard>
  );
}
