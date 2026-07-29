import { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { Star, MapPin, Clock, ChevronRight } from "lucide-react";

type BookingScreenProps = {
  onNavigateToMirror: () => void;
  onNavigateToProfile: () => void;
  onNavigateHome?: () => void;
};

const BOOKING_CSS = `
@keyframes fade-in-booking {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in-booking { animation: fade-in-booking 0.55s cubic-bezier(0.22,1,0.36,1) both; }
.fade-in-booking-d1 { animation-delay: 0.07s; }
.fade-in-booking-d2 { animation-delay: 0.14s; }
.fade-in-booking-d3 { animation-delay: 0.21s; }
.fade-in-booking-d4 { animation-delay: 0.28s; }
.fade-in-booking-d5 { animation-delay: 0.35s; }
`;

export function BookingScreen({ onNavigateToMirror, onNavigateToProfile, onNavigateHome }: BookingScreenProps) {
  const [styleId, setStyleId] = useState("");

  useEffect(() => {
    const id = "booking-screen-css";
    if (!document.getElementById(id)) {
      const styleEl = document.createElement("style");
      styleEl.id = id;
      styleEl.textContent = BOOKING_CSS;
      document.head.appendChild(styleEl);
      setStyleId(id);
    }
    return () => {
      const s = styleId && document.getElementById(styleId);
      if (s) s.remove();
    };
  }, [styleId]);

  const bookingSections = [
    {
      icon: "👰",
      label: "Bridal",
      desc: "Wedding & special events",
      color: "linear-gradient(135deg,#ec4899,#f472b6)",
      tag: "Most Popular",
    },
    {
      icon: "🎉",
      label: "Party",
      desc: "Cocktails & celebrations",
      color: "linear-gradient(135deg,#a855f7,#c084fc)",
      tag: "Trending",
    },
    {
      icon: "🏠",
      label: "Home Service",
      desc: "At your doorstep",
      color: "linear-gradient(135deg,#22d3ee,#06b6d4)",
      tag: "Premium",
    },
  ];

  const nearbyArtists = [
    {
      name: "Priya Sharma",
      rating: 4.9,
      distance: "1.2 km",
      experience: "8+ yrs",
      specialty: "Bridal Makeup",
      avatar: "💄",
      price: "₹2,500+",
    },
    {
      name: "Ananya Patel",
      rating: 4.8,
      distance: "2.4 km",
      experience: "6+ yrs",
      specialty: "HD Makeup",
      avatar: "✨",
      price: "₹1,800+",
    },
    {
      name: "Riya Kapoor",
      rating: 4.7,
      distance: "3.8 km",
      experience: "10+ yrs",
      specialty: "Celebrity Style",
      avatar: "🌟",
      price: "₹3,200+",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{ position: "relative", zIndex: 1 }}>
      <div className="neural-bg" aria-hidden="true" />
      <div className="glass-header sticky top-0" style={{ zIndex: 30 }}>
        <Header onNavigateToProfile={onNavigateToProfile} />
      </div>

      <main className="flex-grow overflow-y-auto pb-32 px-5" style={{ 
        WebkitOverflowScrolling: "touch", 
        paddingTop: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "24px"
      }}>
        {/* Header Title */}
        <div className="fade-in-booking">
          <h1 className="text-3xl font-extrabold mb-1" style={{ 
            background: "linear-gradient(135deg,#ec4899,#a855f7)", 
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent",
            lineHeight: 1.1
          }}>
            Book Makeup Artist
          </h1>
          <p className="text-sm font-medium" style={{ color: "#6b7280" }}>
            Premium professional services at your fingertips
          </p>
        </div>

        {/* Booking Categories */}
        <div className="fade-in-booking-d1 flex flex-col gap-3">
          {bookingSections.map((section) => (
            <div
              key={section.label}
              className="nav-tap-btn"
              style={{
                padding: "18px 18px",
                background: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(20px)",
                borderRadius: "22px",
                border: "1px solid rgba(148,163,184,0.1)",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                boxShadow: "0 4px 20px rgba(15,23,42,0.05)",
                cursor: "pointer"
              }}
            >
              <div style={{ 
                width: "56px", 
                height: "56px", 
                borderRadius: "18px",
                background: section.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                flexShrink: 0,
                boxShadow: `0 4px 16px ${section.color.includes('ec4899') ? 'rgba(236,72,153,0.25)' : section.color.includes('a855f7') ? 'rgba(168,85,247,0.25)' : 'rgba(34,211,238,0.25)'}`
              }}>
                {section.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <h3 className="text-base font-bold" style={{ color: "#1f2937", margin: 0 }}>
                    {section.label} Makeup
                  </h3>
                  <span style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "999px",
                    background: section.color,
                    color: "#fff",
                    letterSpacing: "0.03em"
                  }}>
                    {section.tag}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "#6b7280", margin: 0 }}>
                  {section.desc}
                </p>
              </div>
              <button
                className="nav-tap-btn"
                style={{
                  padding: "9px 14px",
                  borderRadius: "12px",
                  background: section.color,
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  boxShadow: `0 2px 10px ${section.color.includes('ec4899') ? 'rgba(236,72,153,0.3)' : section.color.includes('a855f7') ? 'rgba(168,85,247,0.3)' : 'rgba(34,211,238,0.3)'}`
                }}
              >
                Book Now
              </button>
            </div>
          ))}
        </div>

        {/* Nearby Artists */}
        <div className="fade-in-booking-d4">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div>
              <h2 className="text-lg font-extrabold mb-0.5" style={{ color: "#1f2937", margin: 0 }}>
                Nearby Artists
              </h2>
              <p className="text-xs" style={{ color: "#9ca3af", margin: 0 }}>
                Top-rated professionals near you
              </p>
            </div>
            <button style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              background: "transparent",
              border: "none",
              color: "#a855f7",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer"
            }}>
              See all <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {nearbyArtists.map((artist, idx) => (
              <div
                key={artist.name}
                className={`nav-tap-btn fade-in-booking-d${idx + 3}`}
                style={{
                  padding: "16px",
                  background: "rgba(255,255,255,0.88)",
                  backdropFilter: "blur(20px)",
                  borderRadius: "20px",
                  border: "1px solid rgba(148,163,184,0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  boxShadow: "0 4px 16px rgba(15,23,42,0.04)",
                  cursor: "pointer"
                }}
              >
                <div style={{ 
                  width: "52px", 
                  height: "52px", 
                  borderRadius: "18px",
                  background: "linear-gradient(135deg, rgba(236,72,153,0.1), rgba(168,85,247,0.12))",
                  border: "1px solid rgba(168,85,247,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "26px",
                  flexShrink: 0
                }}>
                  {artist.avatar}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                    <h4 className="text-sm font-bold" style={{ color: "#1f2937", margin: 0 }}>
                      {artist.name}
                    </h4>
                    <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                      <Star className="w-3.5 h-3.5" fill="#facc15" color="#facc15" />
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#92400e" }}>
                        {artist.rating}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs font-semibold mb-1" style={{ color: "#a855f7", margin: 0 }}>
                    {artist.specialty} · {artist.experience}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                      <MapPin className="w-3 h-3" style={{ color: "#6b7280" }} />
                      <span style={{ fontSize: "11px", color: "#6b7280" }}>
                        {artist.distance}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                      <Clock className="w-3 h-3" style={{ color: "#6b7280" }} />
                      <span style={{ fontSize: "11px", color: "#6b7280" }}>
                        Available today
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                  <span style={{ 
                    fontSize: "13px", 
                    fontWeight: 800, 
                    color: "#1f2937",
                    letterSpacing: "-0.01em"
                  }}>
                    {artist.price}
                  </span>
                  <button
                    className="nav-tap-btn"
                    style={{
                      padding: "7px 13px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg,#ec4899,#a855f7)",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      boxShadow: "0 2px 10px rgba(236,72,153,0.3)"
                    }}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
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
