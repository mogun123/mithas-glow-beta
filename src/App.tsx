import { useState, useEffect, lazy, Suspense } from "react";
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

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-white">
      <div className="text-center p-8 bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white">
        <div className="w-16 h-16 border-4 border-purple-100 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-700 font-extrabold tracking-wide">Starting Mithas Glow...</p>
      </div>
    </div>
  );
}

const THEME_MAP: Record<View, string> = {
  register: "mithas-theme", login: "mithas-theme", otp: "mithas-theme", profile: "mithas-theme",
  home: "glow-home-theme", mirror: "glow-mirror-theme", userprofile: "glow-profile-theme", events: "glow-home-theme",
  products: "glow-home-theme", coach: "glow-home-theme", booking: "glow-home-theme", "artist-detail": "glow-home-theme", professional: "glow-home-theme",
};

export default function App() {
  const authStore = useAuthStore();
  const globalStore = useGlobalStore();

  const user = globalStore.user;
  const appViewMode = globalStore.appViewMode;
  const currentUserRole = globalStore.currentUserRole;
  const isProUserFn = globalStore.isProUser;

  const [session, setSession] = useState<any>(null);
  const isAuthenticated = !!session;
  const profileCompleted = user?.profile_completed ?? false;

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>(() => {
    const savedView = localStorage.getItem("currentView") as View;
    return savedView || "register";
  });
  const [identifier, setIdentifier] = useState("");
  const [identifierType, setIdentifierType] = useState<"email" | "phone">("email");
  const [latestScanReport, setLatestScanReport] = useState<any>(null);

  const navigate = (view: View) => {
    setCurrentView(view);
    localStorage.setItem("currentView", view);
    window.history.pushState({ view }, "");
  };

  // 🚀 MASTER FIX: Bulletproof Fallback Timer
  // நெட்வொர்க் கட் ஆனாலும், 3.5 விநாடிகளில் லோடிங் ஸ்க்ரீன் தானாகவே மறைந்துவிடும்!
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 3500);
    return () => clearTimeout(fallbackTimer);
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view) setCurrentView(event.state.view);
    };

    const handleNavigateToEvents = (event: CustomEvent) => {
      if (event.detail?.scanReport && event.detail?.savedToDatabase === true) {
        setLatestScanReport(event.detail.scanReport);
      } else {
        setLatestScanReport(null);
      }
      navigate("events");
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("navigateToEventSection", handleNavigateToEvents as EventListener);
    window.addEventListener("navigateToProfileSetup", () => navigate("profile"));
    window.addEventListener("navigateToHome", () => navigate("home"));
    window.addEventListener("navigateToProfessional", () => navigate("professional"));

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("navigateToEventSection", handleNavigateToEvents as EventListener);
      window.removeEventListener("navigateToProfileSetup", () => navigate("profile"));
      window.removeEventListener("navigateToHome", () => navigate("home"));
      window.removeEventListener("navigateToProfessional", () => navigate("professional"));
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const initApp = async () => {
      try {
        setLatestScanReport(null);
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (currentSession && mounted) {
          setSession(currentSession);
          
          // Force fetch limit to 2 seconds to avoid freezing
          await Promise.race([
            globalStore.fetchUserProfile(currentSession.user.id),
            new Promise(resolve => setTimeout(resolve, 2000))
          ]);

          const updatedUser = useGlobalStore.getState().user;
          const validViews: View[] = ["home", "mirror", "userprofile", "events", "products", "coach", "booking", "artist-detail", "professional"];
          const savedView = localStorage.getItem("currentView") as View;

          if (updatedUser?.profile_completed) {
            if (updatedUser.role === 'seller' && updatedUser.industry === 'makeup_artist') {
              navigate("professional");
            } else if (savedView && validViews.includes(savedView)) {
              navigate(savedView);
            } else {
              navigate("home");
            }
          } else {
            navigate("profile");
          }
        } else if (mounted) {
          setSession(null);
          localStorage.removeItem("currentView");
          navigate("register");
        }
      } catch (error) {
        console.error('Init app error:', error);
        if (mounted) navigate("register");
      } finally {
        if (mounted) setIsInitialLoading(false);
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_IN' && currentSession) {
          setSession(currentSession);
          await globalStore.fetchUserProfile(currentSession.user.id);
          const updatedUser = useGlobalStore.getState().user;

          if (updatedUser?.profile_completed) {
            authStore.setProfileCompleted(true);
            if (updatedUser.role === 'seller' && updatedUser.industry === 'makeup_artist') {
              navigate("professional");
            } else {
              navigate("home");
            }
          } else {
            authStore.setProfileCompleted(false);
            navigate("profile");
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          authStore.logout();
          globalStore.clearData();
          navigate("register");
        } else if (event === 'TOKEN_REFRESHED' && currentSession) {
          setSession(currentSession);
          await globalStore.refreshProfile();
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
  }, [isAuthenticated, profileCompleted, currentView, isInitialLoading, currentUserRole]);

  useEffect(() => {
    const newTheme = THEME_MAP[currentView] || "mithas-theme";
    document.body.className = newTheme;
  }, [currentView]);

  const handleSendOTP = (id: string, type: "email" | "phone") => {
    setIdentifier(id);
    setIdentifierType(type);
    navigate("otp");
  };

  const handleVerifyOTP = () => {
    toast.success("Verification successful!");
    authStore.setProfileCompleted(false);
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
        authStore.setProfileCompleted(true);
        navigate(view as View);
        toast.success("Profile saved and synced! ✨");
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, industry, profile_completed')
        .eq('id', currentUser.id)
        .single();

      authStore.setProfileCompleted(true);
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
    authStore.setSession(userData.session);
    setSession(userData.session);
  };

  if (isInitialLoading) return <LoadingScreen />;

  if (currentView === "userprofile") {
    return <AuthGuard onUnauthenticated={() => navigate("register")}><ErrorBoundary><Toaster position="top-center" richColors /><Suspense fallback={<LoadingScreen />}><ProfileScreen onNavigateHome={() => navigate("home")} /></Suspense></ErrorBoundary></AuthGuard>;
  }

  if (currentView === "events") {
    return <AuthGuard onUnauthenticated={() => navigate("register")}><ErrorBoundary><Toaster position="top-center" richColors /><Suspense fallback={<LoadingScreen />}><EventScreen onNavigateHome={() => navigate("home")} latestScanReport={latestScanReport} setLatestScanReport={setLatestScanReport} /></Suspense></ErrorBoundary></AuthGuard>;
  }

  if (currentView === "mirror") {
    return <AuthGuard onUnauthenticated={() => navigate("register")}><ErrorBoundary><Toaster position="top-center" richColors /><Suspense fallback={<LoadingScreen />}><MirrorScreen onNavigateHome={() => navigate("home")} /></Suspense></ErrorBoundary></AuthGuard>;
  }

  if (currentView === "products") {
    return <AuthGuard onUnauthenticated={() => navigate("register")}><ErrorBoundary><Toaster position="top-center" richColors /><Suspense fallback={<LoadingScreen />}><ProductsScreen onNavigateToMirror={() => navigate("mirror")} onNavigateToProfile={() => navigate("userprofile")} onNavigateHome={() => navigate("home")} /></Suspense></ErrorBoundary></AuthGuard>;
  }

  if (currentView === "coach") {
    return <AuthGuard onUnauthenticated={() => navigate("register")}><ErrorBoundary><Toaster position="top-center" richColors /><Suspense fallback={<LoadingScreen />}><CoachScreen onNavigateToMirror={() => navigate("mirror")} onNavigateToProfile={() => navigate("userprofile")} onNavigateHome={() => navigate("home")} /></Suspense></ErrorBoundary></AuthGuard>;
  }

  if (currentView === "booking") {
    return <AuthGuard onUnauthenticated={() => navigate("register")}><ErrorBoundary><Toaster position="top-center" richColors /><Suspense fallback={<LoadingScreen />}><BookingScreen onNavigateToMirror={() => navigate("mirror")} onNavigateToProfile={() => navigate("userprofile")} onNavigateHome={() => navigate("home")} onNavigateToArtistDetail={(artistId: string) => { localStorage.setItem("selectedArtistId", artistId); navigate("artist-detail"); }} /></Suspense></ErrorBoundary></AuthGuard>;
  }

  if (currentView === "artist-detail") {
    const selectedArtistId = localStorage.getItem("selectedArtistId") || "";
    return <AuthGuard onUnauthenticated={() => navigate("register")}><ErrorBoundary><Toaster position="top-center" richColors /><Suspense fallback={<LoadingScreen />}><ArtistDetailScreen artistId={selectedArtistId} onNavigateToMirror={() => navigate("mirror")} onNavigateToProfile={() => navigate("userprofile")} onNavigateHome={() => navigate("home")} onNavigateBack={() => navigate("booking")} onNavigateToMyBookings={() => navigate("userprofile")} /></Suspense></ErrorBoundary></AuthGuard>;
  }

  if (currentView === "professional") {
    if (isProUserFn() && appViewMode === 'self') {
      return <AuthGuard onUnauthenticated={() => navigate("register")}><ErrorBoundary><Toaster position="top-center" richColors /><Suspense fallback={<LoadingScreen />}><HomeScreen onNavigateToMirror={() => navigate("mirror")} onNavigateToProfile={() => navigate("userprofile")} onNavigateToEvents={() => navigate("events")} onNavigateToProducts={() => navigate("products")} onNavigateToCoach={() => navigate("coach")} onNavigateToBooking={() => navigate("booking")} /></Suspense></ErrorBoundary></AuthGuard>;
    }
    return <AuthGuard onUnauthenticated={() => navigate("register")}><ErrorBoundary><Toaster position="top-center" richColors /><Suspense fallback={<LoadingScreen />}><ProfessionalDashboard onNavigateHome={() => navigate("home")} onNavigateToProfile={() => navigate("userprofile")} onNavigateToMirror={() => navigate("mirror")} /></Suspense></ErrorBoundary></AuthGuard>;
  }

  if (currentView === "home") {
    if (isProUserFn() && appViewMode === 'pro') {
      return <AuthGuard onUnauthenticated={() => navigate("register")}><ErrorBoundary><Toaster position="top-center" richColors /><Suspense fallback={<LoadingScreen />}><ProfessionalDashboard onNavigateHome={() => navigate("home")} onNavigateToProfile={() => navigate("userprofile")} onNavigateToMirror={() => navigate("mirror")} /></Suspense></ErrorBoundary></AuthGuard>;
    }

    return (
      <AuthGuard onUnauthenticated={() => navigate("register")}>
        <ErrorBoundary>
          <Toaster position="top-center" richColors />
          <Suspense fallback={<LoadingScreen />}>
            <HomeScreen
              onNavigateToMirror={() => navigate("mirror")}
              onNavigateToProfile={() => navigate("userprofile")}
              onNavigateToEvents={() => navigate("events")}
              onNavigateToProducts={() => navigate("products")}
              onNavigateToCoach={() => navigate("coach")}
              onNavigateToBooking={() => navigate("booking")}
            />
          </Suspense>
        </ErrorBoundary>
      </AuthGuard>
    );
  }

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
