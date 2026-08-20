import { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { Mic, Send, Sparkles } from "lucide-react";

type CoachScreenProps = {
  onNavigateToMirror: () => void;
  onNavigateToProfile: () => void;
  onNavigateHome?: () => void;
  onNavigateToProducts?: () => void;
  onNavigateToBooking?: () => void;
  onNavigateToChat?: () => void;
};

const COACH_CSS = `
@keyframes float-slow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(168,85,247,0.35), 0 0 40px rgba(236,72,153,0.2); }
  50% { box-shadow: 0 0 32px rgba(168,85,247,0.55), 0 0 60px rgba(236,72,153,0.3); }
}
.float-slow { animation: float-slow 4s ease-in-out infinite; }
.pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
@keyframes fade-in-coach {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in-coach { animation: fade-in-coach 0.55s cubic-bezier(0.22,1,0.36,1) both; }
.fade-in-coach-d1 { animation-delay: 0.08s; }
.fade-in-coach-d2 { animation-delay: 0.16s; }
.fade-in-coach-d3 { animation-delay: 0.24s; }
.fade-in-coach-d4 { animation-delay: 0.32s; }
`;

export function CoachScreen({ 
  onNavigateToMirror, 
  onNavigateToProfile, 
  onNavigateHome,
  onNavigateToProducts,
  onNavigateToBooking,
  onNavigateToChat
}: CoachScreenProps) {
  const [chatInput, setChatInput] = useState("");
  const [styleId, setStyleId] = useState("");

  useEffect(() => {
    const id = "coach-screen-css";
    if (!document.getElementById(id)) {
      const styleEl = document.createElement("style");
      styleEl.id = id;
      styleEl.textContent = COACH_CSS;
      document.head.appendChild(styleEl);
      setStyleId(id);
    }
    return () => {
      const s = styleId && document.getElementById(styleId);
      if (s) s.remove();
    };
  }, [styleId]);

  const suggestedChips = [
    { icon: "🌅", label: "Morning Routine" },
    { icon: "🌙", label: "Night Routine" },
    { icon: "🔍", label: "Check Product" },
    { icon: "📊", label: "Explain My Report" },
    { icon: "🏆", label: "Best Products" },
  ];

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{ position: "relative", zIndex: 1 }}>
      <div className="neural-bg" aria-hidden="true" />
      <div className="glass-header sticky top-0" style={{ zIndex: 30 }}>
        <Header onNavigateToProfile={onNavigateToProfile} />
      </div>

      <main className="flex-grow overflow-y-auto pb-32 px-5" style={{ 
        WebkitOverflowScrolling: "touch", 
        paddingTop: "80px",
        display: "flex",
        flexDirection: "column",
        gap: "20px"
      }}>
        {/* Hero Greeting */}
        <div className="fade-in-coach" style={{ 
          textAlign: "center", 
          padding: "16px 0 8px"
        }}>
          <div className="float-slow mx-auto" style={{ 
            width: "104px", 
            height: "104px", 
            borderRadius: "32px",
            background: "linear-gradient(135deg,#a855f7,#ec4899,#6366f1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 12px 40px rgba(168,85,247,0.35)",
            position: "relative",
            marginBottom: "20px"
          }}>
            <div style={{ fontSize: "48px" }}>🤖</div>
          </div>

          <h1 className="text-4xl font-extrabold mb-2" style={{ 
            background: "linear-gradient(135deg,#a855f7,#ec4899)",
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent",
            lineHeight: 1.05
          }}>
            Hi, Glow User!
          </h1>
          <p className="text-base font-semibold mb-1" style={{ color: "#6b7280", lineHeight: 1.5 }}>
            Ask anything about your skin
          </p>
        </div>

        {/* Suggested Chips */}
        <div className="fade-in-coach-d1">
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestedChips.map((chip, index) => (
              <button
                key={chip.label}
                className="nav-tap-btn"
                style={{
                  padding: "10px 16px",
                  background: "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(168,85,247,0.18)",
                  borderRadius: "999px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#6d28d9",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 12px rgba(168,85,247,0.06)",
                  animationDelay: `${(index + 1) * 0.05}s`
                }}
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Coming Soon Chat Area Placeholder */}
        <div className="fade-in-coach-d2" style={{ 
          flex: 1,
          marginTop: "8px",
          background: "linear-gradient(180deg, rgba(168,85,247,0.05), rgba(236,72,153,0.04))",
          border: "1px dashed rgba(168,85,247,0.2)",
          borderRadius: "24px",
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          minHeight: "220px"
        }}>
          <Sparkles className="w-10 h-10" style={{ color: "#a855f7" }} />
          <div style={{ textAlign: "center" }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: "#4c1d95" }}>Your AI Coach will reply here</h3>
            <p className="text-sm" style={{ color: "#7c3aed" }}>Start a conversation or tap a chip above</p>
          </div>
        </div>

                {/* Chat Input Area */}
        <div className="fade-in-coach-d3" style={{ 
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(168,85,247,0.2)",
          borderRadius: "24px",
          padding: "10px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          boxShadow: "0 4px 24px rgba(168,85,247,0.12)",
          marginTop: "auto",
          marginBottom: "90px"
        }}>
          <button
            className="nav-tap-btn pulse-glow"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "16px",
              background: "linear-gradient(135deg,#ec4899,#a855f7)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            <Mic className="w-5 h-5 text-white" />
          </button>

          {/* Real Input Field added here */}
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about your skin, products, or routine..."
              style={{
                width: "100%",
                background: "rgba(168,85,247,0.05)",
                borderRadius: "14px",
                padding: "12px 16px",
                border: "1px solid rgba(168,85,247,0.1)",
                fontSize: "14px",
                color: "#1f2937",
                outline: "none"
              }}
            />
          </div>

          <button
            className="nav-tap-btn"
            onClick={() => {
              if (chatInput.trim()) {
                console.Sending message: {chatInput};
                setChatInput("");
              }
            }}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "16px",
              background: "linear-gradient(135deg,#a855f7,#6366f1)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              opacity: chatInput.trim() ? 1 : 0.4
            }}
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </main>

      <div className="glass-nav sticky bottom-0" style={{ zIndex: 30 }}>
        <BottomNav
          onNavigateHome={onNavigateHome}
          onNavigateToMirror={onNavigateToMirror}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToProducts={onNavigateToProducts}
          onNavigateToBooking={onNavigateToBooking}
          onNavigateToChat={onNavigateToChat}
        />
      </div>
    </div>
  );
}
