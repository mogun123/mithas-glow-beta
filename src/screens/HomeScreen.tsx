import { useState, useEffect, Suspense } from "react";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { FeatureModal } from "../components/FeatureModal";
import { CosmeticAIScanner } from "../components/SkinToneAnalyzer";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

const GLOBAL_CSS = `
:root {
  --plasma-pink: #ec4899;
  --plasma-purple: #a855f7;
  --card-radius: 22px;
  --holo-border: linear-gradient(135deg,rgba(236,72,153,.5),rgba(168,85,247,.4),rgba(34,211,238,.3),rgba(236,72,153,.5));
}
.neural-bg { position:fixed;inset:0;pointer-events:none;z-index:0; background: radial-gradient(ellipse 80% 60% at 20% 10%,rgba(236,72,153,.07) 0%,transparent 60%), radial-gradient(ellipse 60% 80% at 80% 90%,rgba(168,85,247,.08) 0%,transparent 60%), radial-gradient(ellipse 100% 40% at 50% 50%,rgba(34,211,238,.03) 0%,transparent 70%), #fafafa; }
@media(prefers-color-scheme:dark){ .neural-bg{background: radial-gradient(ellipse 80% 60% at 20% 10%,rgba(236,72,153,.12) 0%,transparent 60%), radial-gradient(ellipse 60% 80% at 80% 90%,rgba(168,85,247,.14) 0%,transparent 60%), #0a0a0f;} }
.neural-bg::after{ content:'';position:absolute;inset:0; background-image:url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='0.8' fill='rgba(168,85,247,0.18)'/%3E%3Ccircle cx='0' cy='0' r='0.5' fill='rgba(236,72,153,0.14)'/%3E%3Ccircle cx='60' cy='0' r='0.5' fill='rgba(236,72,153,0.10)'/%3E%3Ccircle cx='0' cy='60' r='0.5' fill='rgba(168,85,247,0.10)'/%3E%3Ccircle cx='60' cy='60' r='0.5' fill='rgba(236,72,153,0.12)'/%3E%3C/svg%3E"); background-size:60px 60px;opacity:.6; animation:neural-drift 40s linear infinite; }
@keyframes neural-drift{to{background-position:60px 60px;}}
.scan-lines{ pointer-events:none;position:fixed;inset:0;z-index:0; background:repeating-linear-gradient(to bottom,transparent 0px,transparent 3px,rgba(0,0,0,.008) 3px,rgba(0,0,0,.008) 4px);}
.glass-header{ background:rgba(255,255,255,.72)!important; backdrop-filter:blur(24px) saturate(180%) brightness(1.05)!important; -webkit-backdrop-filter:blur(24px) saturate(180%) brightness(1.05)!important; border-bottom:1px solid transparent!important;background-clip:padding-box!important; box-shadow:0 0 0 1px rgba(236,72,153,.12),0 1px 20px rgba(168,85,247,.08),inset 0 1px 0 rgba(255,255,255,.8)!important; position:relative; }
.glass-header::after{ content:'';position:absolute;bottom:0;left:0;right:0;height:1px; background:linear-gradient(90deg,transparent,rgba(236,72,153,.4),rgba(168,85,247,.4),rgba(34,211,238,.3),transparent); }
.glass-nav{ background:rgba(255,255,255,.78)!important; backdrop-filter:blur(28px) saturate(180%)!important; -webkit-backdrop-filter:blur(28px) saturate(180%)!important; border-top:none!important; box-shadow:0 0 0 1px rgba(168,85,247,.14),0 -4px 30px rgba(236,72,153,.08),inset 0 1px 0 rgba(255,255,255,.9)!important; position:relative; }
.glass-nav::before{ content:'';position:absolute;top:0;left:10%;right:10%;height:1px; background:linear-gradient(90deg,transparent,rgba(236,72,153,.5),rgba(168,85,247,.5),transparent); }
@keyframes fade-up{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
.fade-up {animation:fade-up .45s cubic-bezier(.22,1,.36,1) both;}
.fade-up-d1{animation-delay:.05s;}
.fade-up-d2{animation-delay:.10s;}
.nav-tap-btn{transition:transform .16s cubic-bezier(.34,1.56,.64,1);-webkit-tap-highlight-color:transparent;}
.nav-tap-btn:active{transform:scale(.84);}
.ai-orb-float{animation:orb-float 3.2s ease-in-out infinite;}
@keyframes orb-float{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
.feed-title-gradient{ background:linear-gradient(135deg,#ec4899,#a855f7,#06b6d4,#ec4899); background-size:300% 300%;animation:gradient-flow 4s ease infinite; -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
@keyframes gradient-flow{0%,100%{background-position:0% 50%;}50%{background-position:100% 50%;}}
.onboard-beacon{animation:onboard-beacon 2.4s ease-in-out infinite;}
@keyframes onboard-beacon{0%,100%{box-shadow:0 0 0 0 rgba(236,72,153,.4);}50%{box-shadow:0 0 0 10px rgba(236,72,153,0);}}
.holo-card{position:relative;border-radius:var(--card-radius);transition:transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .2s ease;}
.holo-card:hover{transform:scale(1.025) translateY(-2px);box-shadow:0 8px 32px rgba(236,72,153,.18),0 2px 8px rgba(168,85,247,.14);}
.holo-card:active{transform:scale(.97);}
`;

type HomeScreenProps = {
  onNavigateToMirror: () => void;
  onNavigateToProfile: () => void;
  onNavigateToEvents?: () => void;
};

export function HomeScreen({ onNavigateToMirror, onNavigateToProfile, onNavigateToEvents }: HomeScreenProps) {
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

  useEffect(() => {
    const id = "infinity-glow-css-2050-v2";
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
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
          if (p) {
            setProfileData({ ...p, city: p.city || "Mumbai" });
            setIsNewUser((Date.now() - new Date(p.created_at || Date.now()).getTime()) / 36e5 < 24);
            setAiAnalysisComplete(!!(p.skin_tone || p.skin_analysis_at));
          }

          // Fetch active glow journey
          const { data: journeyData } = await supabase
            .rpc("get_active_glow_journey", { p_user_id: user.id });
          
          if (journeyData && journeyData.length > 0) {
            const journey = journeyData[0];
            setGlowJourney(journey);
            
            // Calculate journey stats
            const today = new Date();
            const startDate = new Date(journey.start_date);
            const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            
            // Check if journey should expire
            if (diffDays >= 30) {
              await supabase
                .from("glow_journeys")
                .update({ status: "completed", completion_date: new Date().toISOString() })
                .eq("id", journey.id);
              setGlowJourney(null);
            } else {
              // Fetch scan count for this journey
              const { data: analyses } = await supabase
                .from("face_analyses")
                .select("id")
                .eq("journey_id", journey.id);
              
              setJourneyStats({
                currentDay: diffDays + 1,
                totalScans: analyses?.length || 0,
                streakDays: journey.streak_days,
                glowPoints: journey.glow_points,
                xpEarned: journey.xp_earned
              });
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setAuthReady(true);
      }
    })();
  }, []);

  if (!authReady) {
    return (
      <div className="neural-bg" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: 40, height: 40 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid transparent", borderTopColor: "#ec4899", animation: "plasma-spin 1s linear infinite" }} />
          <div style={{ position: "absolute", inset: 6, borderRadius: "50%", border: "2px solid transparent", borderBottomColor: "#a855f7", animation: "plasma-spin2 1.5s linear infinite" }} />
        </div>
      </div>
    );
  }

  const handleNavigateToEvents = onNavigateToEvents || (() => {
    // Fallback if not passed, we'll modify App.tsx to pass it later
    window.dispatchEvent(new CustomEvent("navigateToEventSection"));
  });

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{ position: "relative", zIndex: 1 }}>
      <div className="neural-bg" aria-hidden="true" />
      <div className="scan-lines" aria-hidden="true" />

      <div className="glass-header sticky top-0" style={{ zIndex: 30 }}>
        <Header onNavigateToProfile={onNavigateToProfile} />
      </div>

      <main className="flex-grow overflow-y-auto pb-28" style={{ WebkitOverflowScrolling: "touch", position: "relative", zIndex: 1 }}>
        <div className="fade-up" style={{ marginTop: 8, padding: "0 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <h2 className="feed-title-gradient" style={{ fontSize: 22, fontWeight: 800, margin: 0, lineHeight: 1.15 }}>
                ✦ MITHAS SKIN AI
              </h2>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, display: "inline-block", background: "linear-gradient(135deg,#ec4899,#a855f7)", boxShadow: "0 0 5px rgba(236,72,153,.55)" }} />
                {currentUserId ? (profileData?.display_name || "User") : "Guest"} · {profileData?.city || "Local"}
                {aiAnalysisComplete && <span style={{ fontSize: 10, fontWeight: 600, color: "#ec4899", letterSpacing: ".04em" }}>· AI active</span>}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button 
                onClick={handleNavigateToEvents}
                className="onboard-beacon"
                style={{ 
                  padding: "6px 14px", 
                  flexShrink: 0, 
                  background: "linear-gradient(135deg,#10b981,#059669)", 
                  color: "#fff", 
                  fontSize: 11, 
                  fontWeight: 700, 
                  border: "none", 
                  borderRadius: 999, 
                  cursor: "pointer", 
                  boxShadow: "0 2px 12px rgba(16,185,129,.35)", 
                  letterSpacing: ".03em",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                📊 Events
              </button>
            </div>
          </div>
        </div>

        {/* ✨ Main Actions ✨ */}
        <div className="fade-up fade-up-d1" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Quick Action Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {/* Skin Scan */}
            <button
              onClick={() => setShowSkinToneAnalyzer(true)}
              className="nav-tap-btn holo-card"
              style={{
                padding: "24px 16px",
                background: "linear-gradient(135deg,rgba(236,72,153,.09),rgba(168,85,247,.11))",
                border: "1px solid rgba(236,72,153,.22)",
                borderRadius: 20,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
                textAlign: "center",
                boxShadow: "0 8px 32px rgba(236,72,153,.08)"
              }}
            >
              <div style={{ 
                width: 64, 
                height: 64, 
                borderRadius: "50%", 
                background: "linear-gradient(135deg,#ec4899,#a855f7)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                boxShadow: "0 0 20px rgba(236,72,153,.4)", 
                fontSize: 32 
              }}>
                📸
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: "#1f2937", margin: 0 }}>AI Skin Scan</p>
                <p style={{ fontSize: 11, color: "#6b7280", margin: "4px 0 0" }}>30-second scan</p>
              </div>
            </button>

            {/* Smart Mirror */}
            <button
              onClick={onNavigateToMirror}
              className="nav-tap-btn holo-card"
              style={{
                padding: "24px 16px",
                background: "linear-gradient(135deg,rgba(34,211,238,.09),rgba(6,182,212,.11))",
                border: "1px solid rgba(34,211,238,.22)",
                borderRadius: 20,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
                textAlign: "center",
                boxShadow: "0 8px 32px rgba(34,211,238,.08)"
              }}
            >
              <div style={{ 
                width: 64, 
                height: 64, 
                borderRadius: "50%", 
                background: "linear-gradient(135deg,#22d3ee,#06b6d4)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                boxShadow: "0 0 20px rgba(34,211,238,.4)", 
                fontSize: 32 
              }}>
                🪞
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: "#1f2937", margin: 0 }}>Smart Mirror</p>
                <p style={{ fontSize: 11, color: "#6b7280", margin: "4px 0 0" }}>Try on looks</p>
              </div>
            </button>
          </div>

          {/* 30-Day Skin Journey */}
          {glowJourney && journeyStats && (
            <div className="fade-up" style={{ zIndex: 9, position: "relative" }}>
              <div className="holo-card" style={{ 
                padding: "20px", 
                background: "rgba(255,255,255,0.85)", 
                backdropFilter: "blur(20px)", 
                borderRadius: "22px", 
                border: "1px solid rgba(34,211,238,0.3)", 
                boxShadow: "0 8px 32px rgba(34,211,238,0.15)" 
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#1f2937" }}>30-Day Skin Journey</h3>
                    <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>Day {journeyStats.currentDay} of 30</p>
                  </div>
                  <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg,#22d3ee,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "14px", boxShadow: "0 4px 12px rgba(34,211,238,0.4)" }}>
                    {journeyStats.streakDays}🔥
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                  <div style={{ flex: 1, background: "rgba(34,211,238,0.08)", borderRadius: "14px", padding: "12px 8px", textAlign: "center", border: "1px solid rgba(34,211,238,0.1)" }}>
                    <div style={{ fontSize: "10px", fontWeight: 800, color: "#22d3ee", textTransform: "uppercase", letterSpacing: "0.05em" }}>Scans</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#1f2937", marginTop: "4px" }}>{journeyStats.totalScans}</div>
                  </div>
                  <div style={{ flex: 1, background: "rgba(168,85,247,0.08)", borderRadius: "14px", padding: "12px 8px", textAlign: "center", border: "1px solid rgba(168,85,247,0.1)" }}>
                    <div style={{ fontSize: "10px", fontWeight: 800, color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.05em" }}>Points</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#1f2937", marginTop: "4px" }}>{journeyStats.glowPoints}</div>
                  </div>
                </div>

                <button
                  onClick={() => setShowSkinToneAnalyzer(true)}
                  className="nav-tap-btn"
                  style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg,#22d3ee,#06b6d4)", color: "#fff", border: "none", borderRadius: "16px", fontSize: "13px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 4px 16px rgba(34,211,238,0.3)", letterSpacing: "0.02em" }}
                >
                  📸 Scan Today
                </button>
              </div>
            </div>
          )}

          {/* Scan Today Banner for New Users */}
          {isNewUser && !aiAnalysisComplete && currentUserId && (
            <div className="fade-up fade-up-d2" style={{ zIndex: 10, position: "relative" }}>
              <button onClick={() => setShowSkinToneAnalyzer(true)} className="onboard-beacon holo-card" style={{ width: "100%", padding: "18px 16px", background: "linear-gradient(135deg,rgba(236,72,153,.09),rgba(168,85,247,.11))", border: "1px solid rgba(236,72,153,.22)", borderRadius: 20, display: "flex", alignItems: "center", gap: "16px", cursor: "pointer", textAlign: "left" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#ec4899,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(236,72,153,.4)", fontSize: 24 }}>✨</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: "#1f2937", margin: 0 }}>Unlock your skin profile</p>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>Run your free AI Skin Scan — takes 30 seconds</p>
                </div>
                <span style={{ fontSize: 20, color: "#ec4899", flexShrink: 0 }}>→</span>
              </button>
            </div>
          )}

          {/* Mini Report Card */}
          {aiAnalysisComplete && scanReport && (
            <div className="fade-up" style={{ zIndex: 10, position: "relative" }}>
              <div className="holo-card" style={{ 
                padding: "20px", 
                background: "rgba(255,255,255,0.85)", 
                backdropFilter: "blur(20px)", 
                borderRadius: "22px", 
                border: "1px solid rgba(236,72,153,0.3)", 
                boxShadow: "0 8px 32px rgba(236,72,153,0.15)" 
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#1f2937" }}>Your Skin Profile</h3>
                    <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>Based on your live 3D scan</p>
                  </div>
                  <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "linear-gradient(135deg,#ec4899,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "16px", boxShadow: "0 4px 12px rgba(236,72,153,0.4)" }}>
                    {scanReport.overallSkinHealthScore ? Math.round(scanReport.overallSkinHealthScore) : 92}%
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                  <div style={{ flex: 1, background: "rgba(236,72,153,0.08)", borderRadius: "14px", padding: "12px 8px", textAlign: "center", border: "1px solid rgba(236,72,153,0.1)" }}>
                    <div style={{ fontSize: "10px", fontWeight: 800, color: "#ec4899", textTransform: "uppercase", letterSpacing: "0.05em" }}>Skin Type</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#1f2937", marginTop: "4px" }}>{scanReport.skinType || "Balanced"}</div>
                  </div>
                  <div style={{ flex: 1, background: "rgba(168,85,247,0.08)", borderRadius: "14px", padding: "12px 8px", textAlign: "center", border: "1px solid rgba(168,85,247,0.1)" }}>
                    <div style={{ fontSize: "10px", fontWeight: 800, color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.05em" }}>Acne Level</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#1f2937", marginTop: "4px" }}>{scanReport.acne?.level || "Clear"}</div>
                  </div>
                </div>

                <button
                  onClick={handleNavigateToEvents}
                  className="nav-tap-btn"
                  style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg,#ec4899,#a855f7)", color: "#fff", border: "none", borderRadius: "16px", fontSize: "13px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 4px 16px rgba(236,72,153,0.3)", letterSpacing: "0.02em" }}
                >
                  ✨ View Event Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="glass-nav sticky bottom-0" style={{ zIndex: 30 }}>
        <BottomNav
          onNavigateHome={() => {}}
          onNavigateToMirror={onNavigateToMirror}
          onNavigateToProfile={onNavigateToProfile}
        />
      </div>

      {/* Modals */}
      <Suspense fallback={null}>
        {showFeatureModal && <FeatureModal onClose={() => setShowFeatureModal(false)} />}
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
