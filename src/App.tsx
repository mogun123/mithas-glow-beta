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
  // TRACE: Log every render with timestamp
  console.log(`[${performance.now().toFixed(0)}ms] APP RENDER - isInitialLoading=${isInitialLoading}, currentView=${currentView}`);

  const user = useGlobalStore((state) => state.user);
  const appViewMode = useGlobalStore((state) => state.appViewMode);
  const currentUserRole = useGlobalStore((state) => state.currentUserRole);
  
  // 1. ✨ FIX: Derived boolean value instead of function call
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

  // 3. ✨ FIX: Persist selectedArtistId across refreshes using sessionStorage
  const [selectedArtistId, setSelectedArtistId] = useState<string>(() => sessionStorage.getItem("selectedArtistId") || "");

  const latestScanReport = useRef<any>(null);

  // Stable navigate function via useCallback
  const navigate = useCallback((view: View) => {
    setCurrentView(view);
    localStorage.setItem("currentView", view);
    window.history.pushState({ view }, "");
  }, []);

  // 2. ✨ FIX: Memoized Navigation Callbacks to prevent Child Re-renders
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

  // Event Listeners with Stable Navigate
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

  // App Initialization & Auth State
  useEffect(() => {
    let mounted = true;

    const initApp = async () => {
      try {
        console.log(`[${performance.now().toFixed(0)}ms] STEP 1: initApp starting, setting isInitialLoading=true`);
        setInitError(null);
        setIsInitialLoading(true);
        latestScanReport.current = null;

        console.log(`[${performance.now().toFixed(0)}ms] STEP 2: Calling supabase.auth.getSession()`);
        const getSessionStart = performance.now();
        const { data: { session: currentSession }, error: sessionError } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: any }, error: any }>((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT: getSession() did not resolve in 8s')), 8000)
          )
        ]);
        console.log(`[${performance.now().toFixed(0)}ms] STEP 3: getSession() returned after ${(performance.now() - getSessionStart).toFixed(0)}ms`, { session: currentSession?.user?.id, error: sessionError });
        if (sessionError) throw sessionError;

        if (!currentSession?.user?.id) {
          console.log(`[${performance.now().toFixed(0)}ms] STEP 4a: No session found, redirecting to register`);
          if (mounted) {
            setSession(null);
            setCurrentView("register");
            localStorage.removeItem("currentView");
          }
          return;
        }

        console.log(`[${performance.now().toFixed(0)}ms] STEP 4b: Session found for user ${currentSession.user.id}, setting session state`);
        if (mounted) {
          setSession(currentSession);
        }

        console.log(`[${performance.now().toFixed(0)}ms] STEP 5: Calling fetchUserProfile(${currentSession.user.id}, true)`);
        const fetchProfileStart = performance.now();
        await Promise.race([
          fetchUserProfile(currentSession.user.id, true),
          new Promise<void>((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT: fetchUserProfile() did not resolve in 8s')), 8000)
          )
        ]);
        console.log(`[${performance.now().toFixed(0)}ms] STEP 6: fetchUserProfile() returned after ${(performance.now() - fetchProfileStart).toFixed(0)}ms`);

        if (!mounted) {
          console.log(`[${performance.now().toFixed(0)}ms] STEP 7: Component unmounted during fetch, aborting`);
          return;
        }

        const updatedUser = useGlobalStore.getState().user;
        console.log(`[${performance.now().toFixed(0)}ms] STEP 8: Retrieved user from store`, { userId: updatedUser?.id, profile_completed: updatedUser?.profile_completed });
        if (!updatedUser) {
          throw new Error('No profile was restored for the active session.');
        }

        const validViews: View[] = ["home", "mirror", "userprofile", "events", "products", "coach", "booking", "artist-detail", "professional"];
        const savedView = localStorage.getItem("currentView") as View;

        if (!updatedUser.profile_completed) {
          console.log(`[${performance.now().toFixed(0)}ms] STEP 9a: Profile not completed, navigating to profile setup`);
          setCurrentView("profile");
          localStorage.setItem("currentView", "profile");
          return;
        }

        if (updatedUser.role === 'seller' && updatedUser.industry === 'makeup_artist') {
          console.log(`[${performance.now().toFixed(0)}ms] STEP 9b: Pro user detected, navigating to professional dashboard`);
          setCurrentView("professional");
          localStorage.setItem("currentView", "professional");
          return;
        }

        if (savedView && validViews.includes(savedView)) {
          console.log(`[${performance.now().toFixed(0)}ms] STEP 9c: Restoring saved view: ${savedView}`);
          setCurrentView(savedView);
          localStorage.setItem("currentView", savedView);
          return;
        }

        console.log(`[${performance.now().toFixed(0)}ms] STEP 9d: Defaulting to home view`);
        setCurrentView("home");
        localStorage.setItem("currentView", "home");
      } catch (error) {
        console.error(`[${performance.now().toFixed(0)}ms] STEP ERROR: initApp caught error`, error);
        if (!mounted) {
          console.log(`[${performance.now().toFixed(0)}ms] STEP ERROR: Component unmounted, skipping state update`);
          return;
        }
        const message = error instanceof Error ? error.message : 'Unable to restore your session.';
        setInitError(message);
        setSession(null);
      } finally {
        console.log(`[${performance.now().toFixed(0)}ms] STEP FINALLY: Setting isInitialLoading=false`);
         setIsInitialLoading(false);
      }
    };

    void initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log(`[${performance.now().toFixed(0)}ms] onAuthStateChange: event=${event}`, { userId: currentSession?.user?.id });
        if (!mounted) {
          console.log(`[${performance.now().toFixed(0)}ms] onAuthStateChange: Component unmounted, ignoring event`);
          return;
        }

        // CRITICAL FIX: Skip INITIAL_SESSION since initApp() already handles session restoration
        // This prevents duplicate fetchUserProfile calls that race and leave isLoading stuck
        if (event === 'INITIAL_SESSION') {
          console.log(`[${performance.now().toFixed(0)}ms] onAuthStateChange: Skipping INITIAL_SESSION (handled by initApp)`);
          return;
        }

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
          setCurrentView("register");
          localStorage.removeItem("currentView");
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

  // Smart Routing Logic
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

  // Switch Case with Memoized Navigation Variables applied
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

  // Auth Layout Rendering
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

  // Centralized AuthGuard and Suspense for Authenticated Views
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
