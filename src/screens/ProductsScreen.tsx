import { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";

type ProductsScreenProps = {
  onNavigateToMirror: () => void;
  onNavigateToProfile: () => void;
  onNavigateToEvents?: () => void;
  onNavigateHome?: () => void;
};

const SCREEN_CSS = `
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in-up { animation: fade-in-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
.fade-in-up-d1 { animation-delay: 0.08s; }
.fade-in-up-d2 { animation-delay: 0.16s; }
.fade-in-up-d3 { animation-delay: 0.24s; }
`;

export function ProductsScreen({ onNavigateToMirror, onNavigateToProfile, onNavigateHome }: ProductsScreenProps) {
  const [styleId, setStyleId] = useState<string>("");
  
  useEffect(() => {
    const id = "products-screen-css";
    if (!document.getElementById(id)) {
      const styleEl = document.createElement("style");
      styleEl.id = id;
      styleEl.textContent = SCREEN_CSS;
      document.head.appendChild(styleEl);
      setStyleId(id);
    }
    return () => {
      const s = styleId && document.getElementById(styleId);
      if (s) s.remove();
    };
  }, [styleId]);

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{ position: "relative", zIndex: 1 }}>
      <div className="neural-bg" aria-hidden="true" />
      <div className="glass-header sticky top-0" style={{ zIndex: 30 }}>
        <Header onNavigateToProfile={onNavigateToProfile} />
      </div>

      <main className="flex-grow overflow-y-auto pb-32 px-5" style={{ WebkitOverflowScrolling: "touch", paddingTop: "24px" }}>
        <div className="fade-in-up mb-8">
          <h1 className="text-3xl font-extrabold mb-2" style={{ 
            background: "linear-gradient(135deg,#a855f7,#ec4899)", 
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent",
            lineHeight: 1.1
          }}>
            Products
          </h1>
          <p className="text-sm font-medium" style={{ color: "#6b7280", marginTop: "4px" }}>
            AI Recommended Products
          </p>
        </div>

        <div className="fade-in-up-d1" style={{ 
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(168,85,247,0.18)",
          borderRadius: "28px",
          padding: "64px 32px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
          boxShadow: "0 8px 32px rgba(168,85,247,0.1)"
        }}>
          <div style={{ 
            width: "120px", 
            height: "120px", 
            borderRadius: "32px",
            background: "linear-gradient(135deg, rgba(236,72,153,0.12), rgba(168,85,247,0.15))",
            border: "1px solid rgba(168,85,247,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "56px",
          }}>
            🧴
          </div>

          <div>
            <h2 className="text-2xl font-extrabold mb-3" style={{ color: "#1f2937" }}>
              Coming Soon
            </h2>
            <p className="text-sm max-w-xs mx-auto leading-relaxed" style={{ color: "#6b7280" }}>
              Your personal AI-curated product recommendations based on your skin profile are on the way.
            </p>
          </div>

          <div style={{ 
            width: "100%",
            maxWidth: "280px",
            padding: "10px 16px",
            borderRadius: "999px",
            background: "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(236,72,153,0.1))",
            border: "1px solid rgba(168,85,247,0.2)",
            color: "#a855f7",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.02em",
            textAlign: "center"
          }}>
            ✦ In Development
          </div>
        </div>

        <div className="fade-in-up-d2 mt-8 grid grid-cols-2 gap-3">
          {[
            { icon: "✨", label: "Serums", desc: "Soon" },
            { icon: "🌿", label: "Cleansers", desc: "Soon" },
            { icon: "☀️", label: "Sunscreens", desc: "Soon" },
            { icon: "💧", label: "Moisturizers", desc: "Soon" },
          ].map((category) => (
            <div key={category.label} style={{
              background: "rgba(255,255,255,0.7)",
              borderRadius: "18px",
              padding: "20px 14px",
              textAlign: "center",
              border: "1px solid rgba(148,163,184,0.15)",
              opacity: 0.6
            }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>{category.icon}</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#374151" }}>{category.label}</div>
              <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>{category.desc}</div>
            </div>
          ))}
        </div>
      </main>

      <div className="glass-nav sticky bottom-0" style={{ zIndex: 30 }}>
        <BottomNav
          onNavigateHome={onNavigateHome}
          onNavigateToMirror={onNavigateToMirror}
          onNavigateToProfile={onNavigateToProfile}
        />
      </div>
    </div>
  );
}
