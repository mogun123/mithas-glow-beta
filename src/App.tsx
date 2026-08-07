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
import ProfessionalDashboard from "./components/ProfessionalDashboard";

const MirrorScreen = lazy(() => import("./screens/MirrorScreen"));

type View = "register" | "login" | "otp" | "profile" | "home" | "mirror" | "userprofile" | "events" | "products" | "coach" | "booking" | "artist-detail" | "professional";

// Optimization: Memoized LoadingScreen prevents unnecessary re-renders
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
  const currentUserRole = useGlobalStore((state) => state.currentUserRole);
  
  const isProUser = !!user && (user.role === 'seller' || (user as any).is_seller || user.industry === 'makeup_artist');
  
  const fetchUserProfile = useGlobalStore((state) => state.fetchUserProfile);
  const refreshProfile = useGlobalStore((state) => state.refreshProfile);
  const clearData = useGlobalStore((state) => state.clearData);

  const setAuthSession = useAuthStore((state) => state.setSession);
  const setAuthProfileCompleted = useAuthStore((state) => state.setProfileCompleted);
  const authLogout = useAuthStore((state) => state.logout);

  const [session, setSession] = useState<any>(null);
  const isAuthenticated = !!session;
  const profileCompleted = user?.profile_completed ?? false;

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
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
  
  const handleNavigateToArtistDetail = useCallback((artistId: string) => {
    setSelectedArtistId(artistId);
    sessionStorage.setItem("selectedArtistId", artistId);
    navigate("artist-detail");
  }, [navigate]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view) setCurrentView(event.state.view);
    };

    const handleNavigateToEvents = (event: CustomEvent) => {
      if (event.detail?.scanReport && event.detail?.savedToDatabase === true) {
        latestScanReport.current = event.detail.scanReport;
      } else {
        latestScanReport.current = null;
      }
      navigate("events");
    };

    const handleNavigateProfileSetup = () => navigate("profile");
    const handleNavigateProfessional = () => navigate("professional");

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("navigateToEventSection", handleNavigateToEvents as EventListener);
    window.addEventListener("navigateToProfileSetup", handleNavigateProfileSetup);
    window.addEventListener("navigateToHome", goHome);
    window.addEventListener("navigateToProfessional", handleNavigateProfessional);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("navigateToEventSection", handleNavigateToEvents as EventListener);
      window.removeEventListener("navigateToProfileSetup", handleNavigateProfileSetup);
      window.removeEventListener("navigateToHome", goHome);
      window.removeEventListener("navigateToProfessional", handleNavigateProfessional);
    };
  }, [navigate, goHome]);

  // 🎯 THE FIX: Clean, Timeout-free Initialization App logic
  useEffect(() => {
    let mounted = true;

    const initApp = async () => {
      try {
        setInitError(null);
        setIsInitialLoading(true);
        latestScanReport.current = null;

        // Native await without Promise.race timeout
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (!currentSession?.user?.id) {
          if (mounted) {
            setSession(null);
            localStorage.removeItem("currentView");
            setCurrentView("register");
          }
          return;
        }

        if (mounted) {
          setSession(currentSession);
        }

        // Native await for profile fetching
        await fetchUserProfile(currentSession.user.id, true);

        if (!mounted) return;

        const updatedUser = useGlobalStore.getState().user;
        if (!updatedUser) {
          throw new Error('No profile was restored for the active session.');
        }

        const validViews: View[] = ["home", "mirror", "userprofile", "events", "products", "coach", "booking", "artist-detail", "professional"];
        const savedView = localStorage.getItem("currentView") as View;

        // Strict Routing Logic based on real Data
        if (!updatedUser.profile_completed) {
          setCurrentView("profile");
          localStorage.setItem("currentView", "profile");
          return;
        }

        if (savedView && validViews.includes(savedView)) {
          setCurrentView(savedView);
          return;
        }

        if (updatedUser.role === 'seller' && updatedUser.industry === 'makeup_artist') {
          setCurrentView("professional");
          localStorage.setItem("currentView", "professional");
        } else {
          setCurrentView("home");
          localStorage.setItem("currentView", "home");
        }

      } catch (error) {
        console.error('initApp caught error:', error);
        if (!mounted) return;
        const message = error instanceof Error ? error.message : 'Unable to restore your session.';
        setInitError(message);
        setSession(null);
      } finally {
        if (mounted) {
          setIsInitialLoading(false);
        }
      }
    };

    void initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        if (event === 'INITIAL_SESSION') return;

        if (event === 'SIGNED_IN' && currentSession) {
          setSession(currentSession);
          try {
            await fetchUserProfile(currentSession.user.id, true);
            const updatedUser = useGlobalStore.getState().user;

            if (updatedUser?.profile_completed) {
              setAuthProfileCompleted(true);
              if (updatedUser.role === 'seller' && updatedUser.industry === 'makeup_artist') {
                setCurrentView("professional");
                localStorage.setItem("currentView", "professional");
              } else {
                setCurrentView("home");
                localStorage.setItem("currentView", "home");
              }
            } else {
              setAuthProfileCompleted(false);
              setCurrentView("profile");
              localStorage.setItem("currentView", "profile");
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to load your profile.';
            setInitError(message);
            setSession(null);
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setInitError(null);
          authLogout();
          clearData();
          localStorage.removeItem("currentView");
          setCurrentView("register");
        } else if (event === 'TOKEN_REFRESHED' && currentSession) {
          setSession(currentSession);
          try {
            await refreshProfile();
          } catch (err) {
            console.error('Silent refresh failed:', err);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, fetchUserProfile, setAuthProfileCompleted, authLogout, clearData, refreshProfile]);

  useEffect(() => {
    if (isInitialLoading) return;

    if (isAuthenticated) {
      if (!profileCompleted && currentView !== "profile") {
        navigate("profile");
      } else if (profileCompleted && ["register", "login", "otp", "profile"].includes(currentView)) {
        if (currentUserRole === 'seller') navigate("professional");
        else navigate("home");
      }
    } else if (!["login", "register", "otp"].includes(currentView)) {
      navigate("register");
    }
  }, [isAuthenticated, profileCompleted, currentView, isInitialLoading, currentUserRole, navigate]);

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
    navigate("profile");
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
        toast.success("Profile saved and synced! ✨");
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
      toast.success("Profile saved and synced! ✨");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleLogin = async (userData: any) => {
    setAuthSession(userData.session);
    setSession(userData.session);
  };

  const authenticatedScreen = useMemo(() => {
    const screenMap: Record<string, JSX.Element> = {
      "userprofile": <ProfileScreen onNavigateHome={goHome} />,
      "events": <EventScreen onNavigateHome={goHome} latestScanReport={latestScanReport.current} setLatestScanReport={(val: any) => latestScanReport.current = val} />,
      "mirror": <MirrorScreen onNavigateHome={goHome} />,
      "products": <ProductsScreen onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateHome={goHome} />,
      "coach": <CoachScreen onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateHome={goHome} />,
      "booking": (
        <BookingScreen
          onNavigateToMirror={goMirror}
          onNavigateToProfile={goProfile}
          onNavigateHome={goHome}
          onNavigateToArtistDetail={handleNavigateToArtistDetail}
        />
      ),
      "artist-detail": (
        <ArtistDetailScreen
          artistId={selectedArtistId}
          onNavigateToMirror={goMirror}
          onNavigateToProfile={goProfile}
          onNavigateHome={goHome}
          onNavigateBack={goBooking}
          onNavigateToMyBookings={goProfile}
        />
      ),
      "professional": (isProUser && appViewMode === 'self') 
        ? <HomeScreen onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateToEvents={goEvents} onNavigateToProducts={goProducts} onNavigateToCoach={goCoach} onNavigateToBooking={goBooking} />
        : <ProfessionalDashboard onNavigateHome={goHome} onNavigateToProfile={goProfile} onNavigateToMirror={goMirror} />,
      "home": (isProUser && appViewMode === 'pro')
        ? <ProfessionalDashboard onNavigateHome={goHome} onNavigateToProfile={goProfile} onNavigateToMirror={goMirror} />
        : <HomeScreen onNavigateToMirror={goMirror} onNavigateToProfile={goProfile} onNavigateToEvents={goEvents} onNavigateToProducts={goProducts} onNavigateToCoach={goCoach} onNavigateToBooking={goBooking} />
    };

    return screenMap[currentView] || null;
  }, [currentView, isProUser, appViewMode, selectedArtistId, goHome, goMirror, goProfile, goEvents, goProducts, goCoach, goBooking, handleNavigateToArtistDetail]);

  if (isInitialLoading) return <LoadingScreen />;

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-white p-4">
        <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white/80 p-8 text-center shadow-xl backdrop-blur-xl">
          <h2 className="text-xl font-black text-slate-900">Session restore failed</h2>
          <p className="mt-3 text-sm text-slate-600">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }

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
