import { useState, useEffect, Suspense, useMemo } from "react";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { FeatureModal } from "../components/FeatureModal";
import { CosmeticAIScanner } from "../components/SkinToneAnalyzer";
import {
  Camera,
  Activity,
  Calendar,
  Flame,
  Gem,
  TrendingUp,
  ChevronRight,
  Star,
  MapPin,
  Sparkles,
  ShoppingBag,
  Clock,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

const GLOBAL_CSS = `
:root {
  --plasma-pink: #ec4899;
  --plasma-purple: #a855f7;
  --card-radius: 20px;
  --section-gap: 16px;
  --content-padding: 16px;
}
.neural-bg { position:fixed;inset:0;pointer-events:none;z-index:0; background: radial-gradient(ellipse 80% 60% at 20% 10%,rgba(236,72,153,.06) 0%,transparent 60%), radial-gradient(ellipse 60% 80% at 80% 90%,rgba(168,85,247,.07) 0%,transparent 60%), radial-gradient(ellipse 100% 40% at 50% 50%,rgba(34,211,238,.025) 0%,transparent 70%), #fafafa; }
@media(prefers-color-scheme:dark){ .neural-bg{background: radial-gradient(ellipse 80% 60% at 20% 10%,rgba(236,72,153,.12) 0%,transparent 60%), radial-gradient(ellipse 60% 80% at 80% 90%,rgba(168,85,247,.14) 0%,transparent 60%), #0a0a0f;} }
.neural-bg::after{ content:'';position:absolute;inset:0; background-image:url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='0.8' fill='rgba(168,85,247,0.12)'/%3E%3Ccircle cx='0' cy='0' r='0.5' fill='rgba(236,72,153,0.08)'/%3E%3Ccircle cx='60' cy='0' r='0.5' fill='rgba(236,72,153,0.06)'/%3E%3Ccircle cx='0' cy='60' r='0.5' fill='rgba(168,85,247,0.06)'/%3E%3Ccircle cx='60' cy='60' r='0.5' fill='rgba(236,72,153,0.08)'/%3E%3C/svg%3E"); background-size:60px 60px;opacity:.5; animation:neural-drift 40s linear infinite; }
@keyframes neural-drift{to{background-position:60px 60px;}}
.scan-lines{ pointer-events:none;position:fixed;inset:0;z-index:0; background:repeating-linear-gradient(to bottom,transparent 0px,transparent 4px,rgba(0,0,0,.005) 4px,rgba(0,0,0,.005) 5px);}
.glass-header{ position:fixed;top:0;left:0;right:0;max-width:480px;margin:0 auto; background:rgba(255,255,255,.80)!important; backdrop-filter:blur(24px) saturate(180%) brightness(1.05)!important; -webkit-backdrop-filter:blur(24px) saturate(180%) brightness(1.05)!important; border-bottom:1px solid transparent!important;background-clip:padding-box!important; box-shadow:0 0 0 1px rgba(236,72,153,.08),0 1px 16px rgba(168,85,247,.05),inset 0 1px 0 rgba(255,255,255,.9)!important; z-index:40; }
.glass-header::after{ content:'';position:absolute;bottom:0;left:0;right:0;height:1px; background:linear-gradient(90deg,transparent,rgba(236,72,153,.28),rgba(168,85,247,.28),rgba(34,211,238,.2),transparent); }
.home-bottom-nav{ position:fixed;bottom:0;left:0;right:0;max-width:480px;margin:0 auto;z-index:40; }
@keyframes fade-up{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
.fade-up {animation:fade-up .45s cubic-bezier(.22,1,.36,1) both;}
.fade-up-d1{animation-delay:.06s;}
.fade-up-d2{animation-delay:.12s;}
.fade-up-d3{animation-delay:.18s;}
.fade-up-d4{animation-delay:.24s;}
.fade-up-d5{animation-delay:.30s;}
.fade-up-d6{animation-delay:.36s;}
.fade-up-d7{animation-delay:.42s;}
.nav-tap-btn{transition:transform .14s cubic-bezier(.34,1.56,.64,1);-webkit-tap-highlight-color:transparent;}
.nav-tap-btn:active{transform:scale(.965);}
.ai-orb-float{animation:orb-float 3.8s ease-in-out infinite;}
@keyframes orb-float{0%,100%{transform:translateY(0);}50%{transform:translateY(-5px);}}
.title-gradient{ background:linear-gradient(135deg,#ec4899,#a855f7); -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
.dashboard-card{
  border-radius: var(--card-radius);
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(168,85,247,0.12);
  box-shadow: 0 2px 16px rgba(168,85,247,0.06);
  transition: transform .18s ease, box-shadow .18s ease;
}
.dashboard-card:active { transform: scale(.992); }
.hero-card{
  border-radius: var(--card-radius);
  background: linear-gradient(135deg, rgba(168,85,247,0.14) 0%, rgba(236,72,153,0.12) 50%, rgba(99,102,241,0.10) 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(168,85,247,0.22);
  box-shadow: 0 4px 24px rgba(168,85,247,0.12);
}
.section-label{
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #9ca3af;
  margin-bottom: 10px;
  padding: 0 2px;
}
.progress-bar-track{
  width: 100%;
  height: 6px;
  background: rgba(168,85,247,0.10);
  border-radius: 999px;
  overflow: hidden;
}
.progress-bar-fill{
  height: 100%;
  background: linear-gradient(90deg,#ec4899,#a855f7);
  border-radius: 999px;
  transition: width .5s cubic-bezier(.22,1,.36,1);
}
.artist-card{
  border-radius: 16px;
  background: rgba(255,255,255,0.96);
  border: 1px solid rgba(168,85,247,0.10);
  padding: 12px;
  min-width: 150px;
}
.activity-item{
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(168,85,247,0.06);
}
.activity-item:last-child { border-bottom: none; padding-bottom: 0; }
.activity-item:first-child { padding-top: 0; }
`;

type HomeScreenProps = {
  onNavigateToMirror: () => void;
  onNavigateToProfile: () => void;
  onNavigateToEvents?: () => void;
  onNavigateToProducts?: () => void;
  onNavigateToCoach?: () => void;
  onNavigateToBooking?: () => void;
};

type ActivityItem = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  time: string;
  color: string;
};

type ArtistPreview = {
  id: string;
  name: string;
  rating: number;
  distance?: string;
  price: string;
  tag: "⭐ Top Rated" | "📍 Nearby" | "🔥 Trending";
  avatar: string;
};

const ARTIST_PREVIEWS: ArtistPreview[] = [
  {
    id: "a1",
    name: "Priya Sharma",
    rating: 4.9,
    distance: "1.2 km",
    price: "₹2,500+",
    tag: "⭐ Top Rated",
    avatar: "👰",
  },
  {
    id: "a2",
    name: "Ananya Patel",
    rating: 4.8,
    distance: "2.4 km",
    price: "₹1,800+",
    tag: "📍 Nearby",
    avatar: "💄",
  },
  {
    id: "a3",
    name: "Riya Kapoor",
    rating: 4.7,
    price: "₹3,200+",
    tag: "🔥 Trending",
    avatar: "✨",
  },
];

const getTimeGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
};

export function HomeScreen({
  onNavigateToMirror,
  onNavigateToProfile,
  onNavigateToEvents,
  onNavigateToProducts,
  onNavigateToCoach,
  onNavigateToBooking,
}: HomeScreenProps) {
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [showSkinToneAnalyzer, setShowSkinToneAnalyzer] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [aiAnalysisComplete, setAiAnalysisComplete] = useState(false);
  const [scanReport, setScanReport] = useState<any>(null);
  const [glowJourney, setGlowJourney] = useState<any>(null);
  const [journeyStats, setJourneyStats] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<any>(null);
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);

  useEffect(() => {
    const id = "home-dashboard-css-v1";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = GLOBAL_CSS;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          const { data: p } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          if (p) {
            setProfileData({ ...p, city: p.city || "Mumbai" });
            setIsNewUser(
              (Date.now() - new Date(p.created_at || Date.now()).getTime()) /
                36e5 <
                24
            );
            setAiAnalysisComplete(!!(p.skin_tone || p.skin_analysis_at));
          }

          const { data: journeyData } = await supabase.rpc(
            "get_active_glow_journey",
            { p_user_id: user.id }
          );

          if (journeyData && journeyData.length > 0) {
            const journey = journeyData[0];
            setGlowJourney(journey);

            const today = new Date();
            const startDate = new Date(journey.start_date);
            const diffDays = Math.floor(
              (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (diffDays >= 30) {
              await supabase
                .from("glow_journeys")
                .update({
                  status: "completed",
                  completion_date: new Date().toISOString(),
                })
                .eq("id", journey.id);
              setGlowJourney(null);
            } else {
              const { data: analyses } = await supabase
                .from("face_analyses")
                .select("id")
                .eq("journey_id", journey.id);

              setJourneyStats({
                currentDay: diffDays + 1,
                totalScans: analyses?.length || 0,
                streakDays: journey.streak_days || 0,
                glowPoints: journey.glow_points || 0,
                xpEarned: journey.xp_earned || 0,
              });
            }
          }

          const { data: history } = await supabase
            .from("clinical_analyses")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5);

          if (history && history.length > 0) {
            // Normalize the history data to match EventScreen format for consistency
            const normalizedHistory = history.map((row) => {
              // Check if row already has clinicalMetrics (normalized) or needs normalization
              if (row.clinicalMetrics || row.skinType) {
                return row;
              }
              
              const metrics = row.metrics;
              if (!metrics || typeof metrics !== 'object') {
                return row;
              }
              
              const moisture = typeof metrics.moisture === 'number' ? metrics.moisture : 0;
              const texture = typeof metrics.texture === 'number' ? metrics.texture : 0;
              const acne = typeof metrics.acne === 'number' ? metrics.acne : 0;
              const redness = typeof metrics.redness === 'number' ? metrics.redness : 0;
              const oiliness = typeof metrics.oiliness === 'number' ? metrics.oiliness : 0;
              const pigment = typeof metrics.pigment === 'number' ? metrics.pigment : 0;
              const pores = typeof metrics.pores === 'number' ? metrics.pores : 0;
              const darkCircle = typeof metrics.darkCircle === 'number' ? metrics.darkCircle : 0;
              const elasticity = typeof metrics.elasticity === 'number' ? metrics.elasticity : 0;
              const glassSkin = typeof metrics.glassSkin === 'number' ? metrics.glassSkin : 0;
              const brightness = typeof metrics.brightness === 'number' ? metrics.brightness : 0;
              
              // Use the saved overallSkinHealthScore from the database row (single source of truth)
              // This ensures consistency with the live scan report calculation from clinicalMetricsEngine
              const overallSkinHealthScore = typeof row.overall_skin_health_score === 'number'
                ? row.overall_skin_health_score
                : typeof row.overallSkinHealthScore === 'number'
                  ? row.overallSkinHealthScore
                  : typeof metrics.overallSkinHealthScore === 'number'
                    ? metrics.overallSkinHealthScore
                    : null;
              
              return {
                ...row,
                overallSkinHealthScore,
                clinicalMetrics: {
                  moisture,
                  texture,
                  elasticity,
                  pores,
                  glassSkin,
                  oiliness,
                  redness,
                  pigment,
                  darkCircle,
                  acne,
                  brightness,
                },
                skinType: row.skin_type,
              };
            });
            
            setAnalysisHistory(normalizedHistory);
            setLatestAnalysis(normalizedHistory[0]);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setAuthReady(true);
      }
    })();
  }, []);

  // ── Helpers (plain functions, safe before hooks) ──
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr).getTime();
      const now = Date.now();
      const diffMin = Math.floor((now - d) / 60000);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDay = Math.floor(diffHr / 24);
      if (diffDay < 7) return `${diffDay}d ago`;
      return formatDate(dateStr);
    } catch {
      return "";
    }
  };

  const derivedHealthScore = () => {
    if (scanReport?.overallSkinHealthScore)
      return Math.round(scanReport.overallSkinHealthScore);
    if (latestAnalysis?.metrics) {
      const m = latestAnalysis.metrics;
      const mois = typeof m.moisture === "number" ? m.moisture : 0;
      const acne = typeof m.acne === "number" ? 100 - m.acne : 80;
      const red = typeof m.redness === "number" ? 100 - m.redness : 80;
      const elast = typeof m.elasticity === "number" ? m.elasticity : 75;
      const glass = typeof m.glassSkin === "number" ? m.glassSkin : 70;
      return Math.round((mois + acne + red + elast + glass) / 5);
    }
    return null;
  };

  const getPreviousAnalysis = () => {
    if (analysisHistory.length >= 2) return analysisHistory[1];
    return null;
  };

  // ── ALL useMemo hooks MUST be declared BEFORE any early return ──
  const aiSummaryText = useMemo(() => {
    if (!latestAnalysis) {
      if (isNewUser) return "Complete your first scan to unlock AI insights.";
      return "Scan your skin to start tracking your health journey.";
    }
    const prev = getPreviousAnalysis();
    const curr = latestAnalysis.metrics;
    if (!curr) return "Latest skin analysis is ready to view.";
    if (prev?.metrics) {
      const currMoisture = curr.moisture || 0;
      const prevMoisture = prev.metrics.moisture || currMoisture;
      const currPigment = curr.pigment || 0;
      const prevPigment = prev.metrics.pigment || currPigment;
      if (currMoisture - prevMoisture >= 5) {
        return "Hydration improved compared to your previous scan. Keep it up!";
      }
      if (prevMoisture - currMoisture >= 5) {
        return "Hydration dropped since last scan. Consider adding a moisturizer.";
      }
      if (currPigment < prevPigment - 3) {
        return "Pigmentation is looking better. Brightness has improved.";
      }
    }
    const mois = curr.moisture || 0;
    if (mois >= 75) return "Your skin is well-hydrated. Maintain this routine.";
    if (mois >= 55) return "Good progress. Hydration levels are steady.";
    return "Focus on boosting hydration for better skin health.";
  }, [latestAnalysis, analysisHistory, isNewUser]);

  const coachHeroContent = useMemo(() => {
    const latestDate = latestAnalysis?.created_at
      ? new Date(latestAnalysis.created_at)
      : null;
    const now = new Date();
    const daysSinceScan = latestDate
      ? Math.floor((now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (!aiAnalysisComplete && !latestAnalysis) {
      return {
        eyebrow: "Welcome 👋",
        title: "Let's start your glow journey",
        subtitle:
          "Take your first 30-second AI skin scan and unlock personalized recommendations.",
        primaryLabel: "Start AI Scan",
        secondaryLabel: "Meet AI Coach",
        variant: "welcome" as const,
      };
    }

    if (daysSinceScan >= 7) {
      return {
        eyebrow: `⚠️ ${daysSinceScan} days since last scan`,
        title: "Time to check in with your skin",
        subtitle:
          "You haven't scanned your skin recently. Quick scan to track progress.",
        primaryLabel: "Scan Now",
        secondaryLabel: "Open AI Coach",
        variant: "reminder" as const,
      };
    }

    const prev = getPreviousAnalysis();
    if (latestAnalysis?.metrics && prev?.metrics) {
      const currM = latestAnalysis.metrics.moisture || 0;
      const prevM = prev.metrics.moisture || currM;
      if (currM - prevM >= 6) {
        return {
          eyebrow: "Great progress ✨",
          title: "Your skin hydration improved",
          subtitle:
            "Would you like to update today's skincare routine to keep this momentum?",
          primaryLabel: "Continue Conversation",
          secondaryLabel: "Open AI Coach",
          variant: "improvement" as const,
        };
      }
    }

    if (latestAnalysis?.metrics) {
      const score = derivedHealthScore();
      if (score && score >= 80) {
        return {
          eyebrow: "Skin is glowing 💫",
          title: `Your health score is ${score}%`,
          subtitle:
            "Here's what to do next to maintain and improve your current results.",
          primaryLabel: "Continue Conversation",
          secondaryLabel: "Open AI Coach",
          variant: "maintain" as const,
        };
      }
    }

    return {
      eyebrow: "Personalized for you",
      title: "Your AI Coach has insights",
      subtitle:
        "Get routine tips, product picks, and answers about your latest scan.",
      primaryLabel: "Continue Conversation",
      secondaryLabel: "Open AI Coach",
      variant: "default" as const,
    };
  }, [latestAnalysis, analysisHistory, aiAnalysisComplete]);

  const recentActivities: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    analysisHistory.slice(0, 3).forEach((row, i) => {
      const m = row.metrics;
      const score = m
        ? Math.round(
            ((m.moisture || 0) +
              (100 - (m.acne || 0)) +
              (100 - (m.redness || 0)) +
              (m.elasticity || 0) +
              (m.glassSkin || 0)) /
              5
          )
        : null;
      items.push({
        id: `scan-${row.id || i}`,
        icon: "📸",
        title: "AI Scan Completed",
        subtitle: score
          ? `Skin Health: ${score}%`
          : "Clinical analysis saved",
        time: formatRelativeTime(row.created_at),
        color: "linear-gradient(135deg,#ec4899,#a855f7)",
      });
    });

    if (glowJourney && journeyStats) {
      items.push({
        id: `journey-${glowJourney.id}`,
        icon: "🎯",
        title: "30-Day Glow Journey",
        subtitle: `Day ${journeyStats.currentDay} of 30`,
        time: "Active",
        color: "linear-gradient(135deg,#22d3ee,#06b6d4)",
      });
    }

    if (journeyStats && journeyStats.streakDays >= 2) {
      items.push({
        id: `streak-${journeyStats.streakDays}`,
        icon: "🔥",
        title: `${journeyStats.streakDays}-Day Streak`,
        subtitle: "Keep scanning daily",
        time: "Ongoing",
        color: "linear-gradient(135deg,#f97316,#ef4444)",
      });
    }

    while (items.length < 5) {
      if (!aiAnalysisComplete) {
        items.push({
          id: `cta-${items.length}`,
          icon: "🤖",
          title: "AI Skin Scan",
          subtitle: "30-second clinical analysis",
          time: "Ready",
          color: "linear-gradient(135deg,#a855f7,#6366f1)",
        });
      } else {
        items.push({
          id: `suggest-${items.length}`,
          icon: "💡",
          title: "Daily Tip",
          subtitle:
            items.length % 2 === 0
              ? "Sunscreen keeps pigmentation away"
              : "Hydrate before sleep for best results",
          time: "Today",
          color: "linear-gradient(135deg,#10b981,#059669)",
        });
      }
    }

    return items.slice(0, 5);
  }, [analysisHistory, glowJourney, journeyStats, aiAnalysisComplete]);

  // ── Early return guard MUST come AFTER ALL hooks ──
  if (!authReady) {
    return (
      <div
        className="neural-bg"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ position: "relative", width: 36, height: 36 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "2.5px solid transparent",
              borderTopColor: "#ec4899",
              animation: "spin 1s linear infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 5,
              borderRadius: "50%",
              border: "2px solid transparent",
              borderBottomColor: "#a855f7",
              animation: "spin 1.5s linear infinite reverse",
            }}
          />
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    );
  }

  const handleNavigateToEvents =
    onNavigateToEvents ||
    (() => {
      window.dispatchEvent(new CustomEvent("navigateToEventSection"));
    });

  const handlePrimaryCoachAction = () => {
    if (
      coachHeroContent.variant === "welcome" ||
      coachHeroContent.variant === "reminder"
    ) {
      setShowSkinToneAnalyzer(true);
    } else {
      onNavigateToCoach?.();
    }
  };

  const userName = profileData?.display_name || profileData?.full_name || "Glow User";

  return (
    <div
      className="min-h-screen bg-transparent"
      style={{ position: "relative", zIndex: 1 }}
    >
      <div className="neural-bg" aria-hidden="true" />
      <div className="scan-lines" aria-hidden="true" />

      {/* 🔒 FIXED TOP HEADER */}
      <div className="glass-header">
        <Header onNavigateToProfile={onNavigateToProfile} />
      </div>

      {/* 🔒 FIXED BOTTOM NAVIGATION (4 tabs only) */}
      <div className="home-bottom-nav">
        <BottomNav
          onNavigateHome={() => {}}
          onNavigateToProducts={onNavigateToProducts}
          onNavigateToCoach={onNavigateToCoach}
          onNavigateToBooking={onNavigateToBooking}
        />
      </div>

      {/* 📜 SCROLLABLE MAIN CONTENT */}
      <main
        className="max-w-lg mx-auto"
        style={{
          paddingTop: "84px",
          paddingBottom: "104px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ padding: "0 var(--content-padding)" }}>
          {/* ========================================= */}
          {/* 1. GREETING                               */}
          {/* ========================================= */}
          <section className="fade-up" style={{ marginBottom: "20px" }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#9ca3af",
                margin: 0,
                letterSpacing: "0.01em",
              }}
            >
              {getTimeGreeting()}
            </p>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                lineHeight: 1.15,
                margin: "4px 0 0 0",
              }}
              className="title-gradient"
            >
              {userName}
            </h1>
          </section>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--section-gap)",
            }}
          >
            {/* ========================================= */}
            {/* 2. SKIN HEALTH SUMMARY                    */}
            {/* ========================================= */}
            <section className="fade-up fade-up-d1">
              <div className="section-label">Skin Health</div>
              <div className="dashboard-card" style={{ padding: "18px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    marginBottom: "14px",
                  }}
                >
                  {/* Health Score Orb */}
                  <div
                    className="ai-orb-float"
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: "18px",
                      background: derivedHealthScore()
                        ? "linear-gradient(135deg,#a855f7,#ec4899)"
                        : "linear-gradient(135deg,#e5e7eb,#d1d5db)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: derivedHealthScore()
                        ? "0 0 18px rgba(168,85,247,.35)"
                        : "none",
                      flexShrink: 0,
                    }}
                  >
                    {derivedHealthScore() ? (
                      <span
                        style={{
                          color: "#fff",
                          fontWeight: 800,
                          fontSize: "17px",
                        }}
                      >
                        {derivedHealthScore()}%
                      </span>
                    ) : (
                      <Camera
                        className="w-6 h-6"
                        style={{ color: "#9ca3af" }}
                      />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#111827",
                        lineHeight: 1.2,
                      }}
                    >
                      Overall Skin Health
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginTop: "3px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {latestAnalysis?.created_at
                        ? `Last scan ${formatDate(latestAnalysis.created_at)}`
                        : "No scan yet"}
                    </div>
                  </div>

                  {/* Quick Scan CTA (single entry — no duplicates) */}
                  <button
                    onClick={() => setShowSkinToneAnalyzer(true)}
                    className="nav-tap-btn"
                    style={{
                      padding: "8px 12px",
                      borderRadius: "12px",
                      background:
                        "linear-gradient(135deg,#ec4899,#a855f7)",
                      color: "#fff",
                      border: "none",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      whiteSpace: "nowrap",
                      boxShadow: "0 2px 12px rgba(236,72,153,.28)",
                    }}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Scan
                  </button>
                </div>

                {/* Short AI Summary */}
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "14px",
                    background:
                      "linear-gradient(135deg, rgba(168,85,247,0.06), rgba(236,72,153,0.05))",
                    border: "1px solid rgba(168,85,247,0.10)",
                    marginBottom: "14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                    }}
                  >
                    <Sparkles
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      style={{ color: "#a855f7" }}
                    />
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#374151",
                        margin: 0,
                        lineHeight: 1.45,
                      }}
                    >
                      {aiSummaryText}
                    </p>
                  </div>
                </div>

                {/* View Full Report */}
                <button
                  onClick={handleNavigateToEvents}
                  className="nav-tap-btn"
                  style={{
                    width: "100%",
                    padding: "11px",
                    borderRadius: "14px",
                    background: "rgba(168,85,247,0.07)",
                    border: "1px solid rgba(168,85,247,0.14)",
                    color: "#7c3aed",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <BarChart3 className="w-4 h-4" />
                  View Full Report
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </section>

            {/* ========================================= */}
            {/* 3. AI COACH DYNAMIC HERO CARD             */}
            {/* ========================================= */}
            <section className="fade-up fade-up-d2">
              <div className="section-label">AI Coach</div>
              <div className="hero-card" style={{ padding: "18px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    marginBottom: "14px",
                  }}
                >
                  <div
                    className="ai-orb-float"
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: "14px",
                      background:
                        "linear-gradient(135deg,#a855f7,#ec4899,#6366f1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      boxShadow: "0 0 16px rgba(168,85,247,.35)",
                      flexShrink: 0,
                    }}
                  >
                    🤖
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: "#7c3aed",
                        marginBottom: "4px",
                      }}
                    >
                      {coachHeroContent.eyebrow}
                    </div>
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#111827",
                        lineHeight: 1.25,
                        margin: 0,
                      }}
                    >
                      {coachHeroContent.title}
                    </h3>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#4b5563",
                        lineHeight: 1.45,
                        margin: "6px 0 0 0",
                      }}
                    >
                      {coachHeroContent.subtitle}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                  }}
                >
                  <button
                    onClick={handlePrimaryCoachAction}
                    className="nav-tap-btn"
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "14px",
                      background:
                        "linear-gradient(135deg,#ec4899,#a855f7)",
                      color: "#fff",
                      border: "none",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 4px 16px rgba(168,85,247,.30)",
                    }}
                  >
                    {coachHeroContent.primaryLabel}
                  </button>
                  <button
                    onClick={() => onNavigateToCoach?.()}
                    className="nav-tap-btn"
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "14px",
                      background: "rgba(255,255,255,0.7)",
                      border: "1px solid rgba(168,85,247,0.18)",
                      color: "#7c3aed",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {coachHeroContent.secondaryLabel}
                  </button>
                </div>
              </div>
            </section>

            {/* ========================================= */}
            {/* 4. RECENT ACTIVITY TIMELINE               */}
            {/* ========================================= */}
            <section className="fade-up fade-up-d3">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                  padding: "0 2px",
                }}
              >
                <span className="section-label" style={{ margin: 0 }}>
                  Recent Activity
                </span>
                <button
                  onClick={handleNavigateToEvents}
                  className="nav-tap-btn"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#a855f7",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: "4px 6px",
                    borderRadius: "8px",
                  }}
                >
                  View All
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="dashboard-card" style={{ padding: "4px 16px" }}>
                {recentActivities.map((a, i) => (
                  <div key={a.id} className="activity-item">
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "11px",
                        background: a.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 17,
                        flexShrink: 0,
                        boxShadow: "0 2px 8px rgba(168,85,247,0.15)",
                      }}
                    >
                      {a.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#111827",
                          lineHeight: 1.25,
                        }}
                      >
                        {a.title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6b7280",
                          marginTop: "2px",
                        }}
                      >
                        {a.subtitle}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#9ca3af",
                        flexShrink: 0,
                        paddingTop: "2px",
                      }}
                    >
                      {a.time}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ========================================= */}
            {/* 5. MAKEUP ARTIST PREVIEW                  */}
            {/* ========================================= */}
            <section className="fade-up fade-up-d4">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                  padding: "0 2px",
                }}
              >
                <span className="section-label" style={{ margin: 0 }}>
                  Makeup Artists
                </span>
                <button
                  onClick={() => onNavigateToBooking?.()}
                  className="nav-tap-btn"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#ec4899",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: "4px 6px",
                    borderRadius: "8px",
                  }}
                >
                  View All
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  overflowX: "auto",
                  padding: "2px 2px 8px 2px",
                  margin: "0 -2px",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                {ARTIST_PREVIEWS.map((artist) => (
                  <div
                    key={artist.id}
                    className="artist-card dashboard-card nav-tap-btn"
                    onClick={() => onNavigateToBooking?.()}
                    style={{ cursor: "pointer", flexShrink: 0 }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#ec4899",
                        marginBottom: "8px",
                      }}
                    >
                      {artist.tag}
                    </div>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "14px",
                        background:
                          "linear-gradient(135deg, rgba(236,72,153,0.12), rgba(168,85,247,0.14))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        marginBottom: "10px",
                      }}
                    >
                      {artist.avatar}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: "#111827",
                        lineHeight: 1.2,
                      }}
                    >
                      {artist.name}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        marginTop: "4px",
                        fontSize: 11,
                        color: "#6b7280",
                      }}
                    >
                      <Star
                        className="w-3 h-3 fill-current"
                        style={{ color: "#f59e0b" }}
                      />
                      <span style={{ fontWeight: 700, color: "#374151" }}>
                        {artist.rating}
                      </span>
                      {artist.distance && (
                        <>
                          <span style={{ color: "#d1d5db" }}>·</span>
                          <MapPin className="w-3 h-3" />
                          {artist.distance}
                        </>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#a855f7",
                        marginTop: "6px",
                        paddingTop: "6px",
                        borderTop: "1px solid rgba(168,85,247,0.08)",
                      }}
                    >
                      From {artist.price}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ========================================= */}
            {/* 6. PRODUCTS PREVIEW                       */}
            {/* ========================================= */}
            <section className="fade-up fade-up-d5">
              <div className="section-label">Products</div>
              <div
                className="dashboard-card nav-tap-btn"
                onClick={() => onNavigateToProducts?.()}
                style={{ padding: "16px", cursor: "pointer" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: "16px",
                      background:
                        "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.14))",
                      border: "1px solid rgba(16,185,129,0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 26,
                      flexShrink: 0,
                    }}
                  >
                    🧴
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "3px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          color: "#10b981",
                        }}
                      >
                        ✨ AI Recommended
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#111827",
                        lineHeight: 1.25,
                      }}
                    >
                      {aiAnalysisComplete
                        ? "Personalized picks for your skin"
                        : "Scan skin to unlock product matches"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginTop: "3px",
                      }}
                    >
                      {aiAnalysisComplete
                        ? "Hydrating moisturizer · SPF 50 · Brightening serum"
                        : "Clinical product analysis once you scan"}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "11px",
                      background: "rgba(16,185,129,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <ShoppingBag
                      className="w-4 h-4"
                      style={{ color: "#10b981" }}
                    />
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToProducts?.();
                  }}
                  className="nav-tap-btn"
                  style={{
                    width: "100%",
                    marginTop: "14px",
                    padding: "11px",
                    borderRadius: "14px",
                    background: "rgba(16,185,129,0.07)",
                    border: "1px solid rgba(16,185,129,0.16)",
                    color: "#059669",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <ShoppingBag className="w-4 h-4" />
                  Open Products
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </section>

            {/* ========================================= */}
            {/* 7. SKIN JOURNEY COMPACT CARD              */}
            {/* ========================================= */}
            <section className="fade-up fade-up-d6">
              <div className="section-label">Skin Journey</div>
              <div className="dashboard-card" style={{ padding: "16px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "10px",
                    marginBottom: "14px",
                  }}
                >
                  {/* Streak */}
                  <div
                    style={{
                      padding: "12px 10px",
                      borderRadius: "14px",
                      background:
                        "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(239,68,68,0.06))",
                      border: "1px solid rgba(249,115,22,0.12)",
                      textAlign: "center",
                    }}
                  >
                    <Flame
                      className="w-4 h-4 mx-auto mb-1.5"
                      style={{ color: "#f97316" }}
                    />
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#111827",
                        lineHeight: 1,
                      }}
                    >
                      {journeyStats?.streakDays || (aiAnalysisComplete ? 1 : 0)}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#f97316",
                        marginTop: "3px",
                      }}
                    >
                      Day Streak
                    </div>
                  </div>

                  {/* Glow Points */}
                  <div
                    style={{
                      padding: "12px 10px",
                      borderRadius: "14px",
                      background:
                        "linear-gradient(135deg, rgba(168,85,247,0.08), rgba(236,72,153,0.06))",
                      border: "1px solid rgba(168,85,247,0.12)",
                      textAlign: "center",
                    }}
                  >
                    <Gem
                      className="w-4 h-4 mx-auto mb-1.5"
                      style={{ color: "#a855f7" }}
                    />
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#111827",
                        lineHeight: 1,
                      }}
                    >
                      {journeyStats?.glowPoints ||
                        (aiAnalysisComplete ? 50 : 0)}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#a855f7",
                        marginTop: "3px",
                      }}
                    >
                      Glow Pts
                    </div>
                  </div>

                  {/* Journey Progress */}
                  <div
                    style={{
                      padding: "12px 10px",
                      borderRadius: "14px",
                      background:
                        "linear-gradient(135deg, rgba(34,211,238,0.08), rgba(6,182,212,0.06))",
                      border: "1px solid rgba(34,211,238,0.12)",
                      textAlign: "center",
                    }}
                  >
                    <TrendingUp
                      className="w-4 h-4 mx-auto mb-1.5"
                      style={{ color: "#06b6d4" }}
                    />
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#111827",
                        lineHeight: 1,
                      }}
                    >
                      {Math.round(
                        Math.min(
                          ((journeyStats?.currentDay ||
                            (aiAnalysisComplete ? 1 : 0)) /
                            30) *
                            100,
                          100
                        )
                      )}
                      %
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#06b6d4",
                        marginTop: "3px",
                      }}
                    >
                      Progress
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div
                  style={{
                    marginBottom: "6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#6b7280",
                    }}
                  >
                    30-Day Glow Journey
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#7c3aed",
                    }}
                  >
                    Day {journeyStats?.currentDay || (aiAnalysisComplete ? 1 : 0)}{" "}
                    / 30
                  </span>
                </div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min(
                        ((journeyStats?.currentDay ||
                          (aiAnalysisComplete ? 1 : 0)) /
                          30) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Modals */}
      <Suspense fallback={null}>
        {showFeatureModal && (
          <FeatureModal onClose={() => setShowFeatureModal(false)} />
        )}
        {showSkinToneAnalyzer && (
          <CosmeticAIScanner
            isOpen={showSkinToneAnalyzer}
            onClose={() => setShowSkinToneAnalyzer(false)}
            onAnalysisComplete={(report: any) => {
              setScanReport(report);
              setAiAnalysisComplete(true);
              toast.success("Scan complete! ✨");
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
