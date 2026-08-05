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

import { useGlobalStore } from "./lib/globalStore"; // DUAL-MODE IMPORT

// 🎯 FIX 1: SPEED OPTIMIZATION

// முக்கியமான ஸ்கிரீன்களை மட்டும் Direct Import செய்கிறோம்.

// அப்போதுதான் Back அழுத்தினால் 'Loading' லேக் இல்லாமல் இன்ஸ்டாகிராம் போல வேகமாக வரும்.

import { HomeScreen } from "./screens/HomeScreen";

import { ProfileScreen } from "./screens/ProfileScreen";

import { EventScreen } from "./screens/EventScreen";

import { ProductsScreen } from "./screens/ProductsScreen";

import { CoachScreen } from "./screens/CoachScreen";

import { BookingScreen } from "./screens/BookingScreen";

import { ArtistDetailScreen } from "./screens/ArtistDetailScreen";

import ProfessionalDashboard from "./components/ProfessionalDashboard";

// Lazy load heavy components for better performance
const MirrorScreen = lazy(() => import("./screens/MirrorScreen"));

type View = "register" | "login" | "otp" | "profile" | "home" | "mirror" | "userprofile" | "events" | "products" | "coach" | "booking" | "artist-detail" | "professional";

// Loading component

function LoadingScreen() {

return (

<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-yellow-50">

<div className="text-center">

<div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>

<p className="text-gray-600">Loading...</p>

</div>

</div>

);

}

// Theme configuration

const THEME_MAP: Record<View, string> = {

register: "mithas-theme", login: "mithas-theme", otp: "mithas-theme", profile: "mithas-theme",

home: "glow-home-theme", mirror: "glow-mirror-theme", userprofile: "glow-profile-theme", events: "glow-home-theme",

products: "glow-home-theme", coach: "glow-home-theme", booking: "glow-home-theme", "artist-detail": "glow-home-theme", professional: "glow-home-theme",

};

export default function App() {
  const authStore = useAuthStore();
  const globalStore = useGlobalStore();
  
  // CRITICAL: Subscribe to global store state for reactive rendering
  const user = globalStore.user;
  const appViewMode = globalStore.appViewMode;
  const currentUserRole = globalStore.currentUserRole;
  const isProUser = globalStore.isProUser();
  
  // Derive auth state from global store
  const isAuthenticated = !!user;
  const profileCompleted = user?.profile_completed ?? false;
  const authLoading = globalStore.isLoading;

  // Subscribe to appViewMode changes for reactive routing
  // This ensures the screen immediately re-renders when mode toggles
  const _modeSubscription = appViewMode;

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

// 🎯 FIX 2: BROWSER BACK BUTTON SYNC (Back அழுத்தினால் ஸ்கிரீன் மாறும்)

useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view) setCurrentView(event.state.view);
    };

    const handleNavigateToEvents = (event: CustomEvent) => {
      // Only set latestScanReport if it's actually saved to database
      if (event.detail?.scanReport && event.detail?.savedToDatabase === true) {
        setLatestScanReport(event.detail.scanReport);
      } else {
        // Clear any previous scan report to prevent ghost data
        setLatestScanReport(null);
      }
      navigate("events");
    };

    // Handle navigation to profile setup after registration
    const handleNavigateToProfileSetup = (event: CustomEvent) => {
      // No localStorage - display name will be fetched from Supabase Auth metadata/profiles table
      navigate("profile");
    };

    // Handle navigation to home (for logout and mode toggle)
    const handleNavigateToHome = () => {
      navigate("home");
    };

    // Handle navigation to professional dashboard (for mode toggle)
    const handleNavigateToProfessional = () => {
      navigate("professional");
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("navigateToEventSection", handleNavigateToEvents as EventListener);
    window.addEventListener("navigateToProfileSetup", handleNavigateToProfileSetup as EventListener);
    window.addEventListener("navigateToHome", handleNavigateToHome as EventListener);
    window.addEventListener("navigateToProfessional", handleNavigateToProfessional as EventListener);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("navigateToEventSection", handleNavigateToEvents as EventListener);
      window.removeEventListener("navigateToProfileSetup", handleNavigateToProfileSetup as EventListener);
      window.removeEventListener("navigateToHome", handleNavigateToHome as EventListener);
      window.removeEventListener("navigateToProfessional", handleNavigateToProfessional as EventListener);
    };
  }, []);

// CRITICAL: Authentication State Listener - Immediately updates UI on login/logout
useEffect(() => {
  const initApp = async () => {
    try {
      // Clear any previous scan report to prevent ghost data
      setLatestScanReport(null);

      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Fetch profile immediately and update global store
        await globalStore.fetchUserProfile(session.user.id);
        
        // Get the updated user from store
        const updatedUser = globalStore.getState().user;
        const isProf = updatedUser?.role === 'seller';
        
        // If there's a saved view and it's valid for authenticated user, use it
        const savedView = localStorage.getItem("currentView") as View;
        const validViews: View[] = ["home", "mirror", "userprofile", "events", "products", "coach", "booking", "artist-detail", "professional"];

        // CRITICAL SCHEMA FIX: Check role instead of account_type
        // CRITICAL SCHEMA FIX: Database constraint is role IN ('buyer', 'seller', 'admin')
        // Mapping: 'seller' = professional, 'buyer' = customer
        const isProfessionalMakeupArtist = updatedUser?.role === 'seller' && updatedUser?.industry === 'makeup_artist';

        if (isProfessionalMakeupArtist && updatedUser?.profile_completed) {
          // Professional makeup artists should be redirected to professional view
          navigate("professional");
          return;
        }

        if (savedView && validViews.includes(savedView)) {
          setCurrentView(savedView);
        } else if (updatedUser?.profile_completed) {
          setCurrentView('home');
        } else {
          setCurrentView('profile');
        }
      } else {
        // Not authenticated, clear saved view and go to register
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

  // Set up auth state listener for instant reactivity
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session) {
        // Immediately fetch profile and update global store
        await globalStore.fetchUserProfile(session.user.id);
        const updatedUser = globalStore.getState().user;
        
        if (updatedUser?.profile_completed) {
          authStore.setProfileCompleted(true);
          // Route based on role
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
        // Clear all state immediately
        authStore.logout();
        globalStore.clearData();
        navigate("register");
      } else if (event === 'TOKEN_REFRESHED') {
        // Refresh profile on token refresh to ensure role is current
        if (session) {
          await globalStore.refreshProfile();
        }
      }
    }
  );

  return () => {
    subscription.unsubscribe();
  };
}, []);

useEffect(() => {

if (isInitialLoading) return;

if (isAuthenticated) {

if (!profileCompleted && currentView !== "profile") setCurrentView("profile");

else if (profileCompleted && ["register", "login", "otp", "profile"].includes(currentView)) setCurrentView("home");

} else if (!["login", "register", "otp"].includes(currentView)) {

setCurrentView("register");

}

}, [isAuthenticated, profileCompleted, currentView, isInitialLoading]);

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

setCurrentView("profile");

};

const handleProfileComplete = async (view?: string) => {

try {

const { data: { user: currentUser } } = await supabase.auth.getUser();

if (!currentUser) {

toast.error("User session not found!");

return;

}

// If view is explicitly provided, use it directly (from ProfileSetupView navigation hint)
if (view) {
  console.log("[App] Navigation hint received:", view);
  authStore.setProfileCompleted(true);
  navigate(view);
  toast.success("Profile saved and synced! ✨");
  return;
}

// Fallback: Fetch the complete profile to check role and industry (CRITICAL SCHEMA FIX)
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('role, industry, profile_completed')
  .eq('id', currentUser.id)
  .single();

if (profileError) {
  console.error('Profile fetch error:', profileError);
}

authStore.setProfileCompleted(true);

// Route based on role and industry
if (profile?.role === 'seller' && profile?.industry === 'makeup_artist') {
  // Professional makeup artist - route to professional dashboard view
  navigate("professional");
} else {
  // Regular user - route to home
  navigate("home");
}

toast.success("Profile saved and synced! ✨");

} catch (error: any) {

toast.error(error.message);

}

};

// 🎯 FIX 3: REFRESH PROBLEM SOLVED (Login ஆனதும் Refresh இல்லாமல் ஹோம் போகும்)

const handleLogin = async (userData: any) => {

authStore.setSession(userData.session);

const { data: profile, error: profileError } = await supabase.from('profiles').select('profile_completed, role, industry').eq('id', userData.user.id).single();

if (!profileError && profile?.profile_completed) {

authStore.setProfileCompleted(true);

// CRITICAL SCHEMA FIX: Route based on role and industry for existing users
if (profile?.role === 'seller' && profile?.industry === 'makeup_artist') {
  navigate("professional");
} else {
  setCurrentView("home");
}

} else {

authStore.setProfileCompleted(false);

setCurrentView("profile");

}

};

if (isInitialLoading) return <LoadingScreen />;

// --- RENDERING LOGIC (Your Original Style Maintained) ---

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
  // DUAL-MODE LOGIC: If professional is in Self Mode, show Customer Home instead
  if (isProUser() && appViewMode === 'self') {
    // Professional in Self Mode -> Show Customer Home
    return <AuthGuard onUnauthenticated={() => navigate("register")}><ErrorBoundary><Toaster position="top-center" richColors /><Suspense fallback={<LoadingScreen />}><HomeScreen onNavigateToMirror={() => navigate("mirror")} onNavigateToProfile={() => navigate("userprofile")} onNavigateToEvents={() => navigate("events")} onNavigateToProducts={() => navigate("products")} onNavigateToCoach={() => navigate("coach")} onNavigateToBooking={() => navigate("booking")} /></Suspense></ErrorBoundary></AuthGuard>;
  }
  // Professional in Pro Mode -> Show Professional Dashboard
  return <AuthGuard onUnauthenticated={() => navigate("register")}><ErrorBoundary><Toaster position="top-center" richColors /><Suspense fallback={<LoadingScreen />}><ProfessionalDashboard onNavigateHome={() => navigate("home")} onNavigateToProfile={() => navigate("userprofile")} onNavigateToMirror={() => navigate("mirror")} /></Suspense></ErrorBoundary></AuthGuard>;
}

// DUAL-MODE LOGIC: For normal users or professionals who navigated to home while in self mode
if (currentView === "home") {
  // If a professional user is in Pro Mode but somehow landed on home, redirect to professional view
  if (isProUser() && appViewMode === 'pro') {
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



{/* 🎯 SKIP BUTTON REMOVED AS REQUESTED */}  

  <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden p-8">  

    <header className="text-center mb-8">  

      <h1 className="text-4xl tracking-tighter text-pink-600">MITHAS GLOW</h1>  

      <p className="text-gray-500 mt-1">Discover your perfect look.</p>  

    </header>  

    {(currentView === "login" || currentView === "register") && (  

      <div className="flex border-b border-gray-200 mb-6">  

        <button onClick={() => navigate("login")} className={`flex-1 py-3 ${currentView === "login" ? "border-b-3 border-pink-500 text-pink-600" : "text-gray-500"}`}>Login</button>  

        <button onClick={() => navigate("register")} className={`flex-1 py-3 ${currentView === "register" ? "border-b-3 border-pink-500 text-pink-600" : "text-gray-500"}`}>Register</button>  

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











