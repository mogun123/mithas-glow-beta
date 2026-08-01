import { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { Star, MapPin, Clock, ChevronRight, BadgeCheck } from "lucide-react";
import { useVerifiedArtists, useSearchArtists } from "../../hooks/use-booking";

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
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'trending'>('rating');
  
  // Fetch all verified artists or filtered by category
  const { artists: allArtists, loading: artistsLoading } = useVerifiedArtists({ 
    sortBy,
    category: selectedCategory 
  });
  
  // Search functionality
  const { artists: searchResults, loading: searchLoading } = useSearchArtists(searchTerm);
  
  // Use search results if searching, otherwise use filtered artists
  const displayArtists = searchTerm.trim() ? searchResults : allArtists;
  const isLoading = searchTerm.trim() ? searchLoading : artistsLoading;

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
      category: "bridal",
    },
    {
      icon: "🎉",
      label: "Party",
      desc: "Cocktails & celebrations",
      color: "linear-gradient(135deg,#a855f7,#c084fc)",
      tag: "Trending",
      category: "party",
    },
    {
      icon: "🏠",
      label: "Home Service",
      desc: "At your doorstep",
      color: "linear-gradient(135deg,#22d3ee,#06b6d4)",
      tag: "Premium",
      category: "home_service",
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
        paddingTop: "80px",
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

        {/* Search and Filter Bar */}
        <div className="fade-in-booking-d2" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search artists by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "12px 16px",
              borderRadius: "14px",
              border: "1px solid rgba(148,163,184,0.2)",
              background: "rgba(255,255,255,0.9)",
              fontSize: "14px",
              fontWeight: 500,
              outline: "none",
            }}
          />
          
          {/* Sort Buttons */}
          <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
            {(['rating', 'price', 'trending'] as const).map((sort) => (
              <button
                key={sort}
                onClick={() => setSortBy(sort)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "10px",
                  border: "none",
                  background: sortBy === sort 
                    ? "linear-gradient(135deg,#ec4899,#a855f7)" 
                    : "rgba(255,255,255,0.8)",
                  color: sortBy === sort ? "#fff" : "#6b7280",
                  fontSize: "12px",
                  fontWeight: sortBy === sort ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {sort === 'rating' ? '⭐ Top Rated' : sort === 'price' ? '💰 Lowest Price' : '🔥 Trending'}
              </button>
            ))}
          </div>
        </div>

        {/* Nearby Artists */}
        <div className="fade-in-booking-d4">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div>
              <h2 className="text-lg font-extrabold mb-0.5" style={{ color: "#1f2937", margin: 0 }}>
                {searchTerm.trim() ? 'Search Results' : 'All Artists'}
              </h2>
              <p className="text-xs" style={{ color: "#9ca3af", margin: 0 }}>
                {isLoading ? 'Loading...' : `${displayArtists?.length || 0} verified professionals`}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {isLoading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                Loading artists...
              </div>
            ) : displayArtists && displayArtists.length > 0 ? (
              displayArtists.map((artist, idx) => {
                const displayName = artist.shop_name || artist.full_name || artist.username || "Artist";
                const displayPrice = artist.starting_price ? `₹${artist.starting_price}+` : "Price on request";
                const displayDistance = artist.distance_km ? `${artist.distance_km.toFixed(1)} km` : "Distance N/A";
                
                return (
                  <div
                    key={artist.id}
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
                      flexShrink: 0,
                      overflow: "hidden"
                    }}>
                      {artist.avatar_url ? (
                        <img src={artist.avatar_url} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        "💄"
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                        <h4 className="text-sm font-bold" style={{ color: "#1f2937", margin: 0 }}>
                          {displayName}
                        </h4>
                        <BadgeCheck className="w-4 h-4" style={{ color: "#22d3ee" }} />
                        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                          <Star className="w-3.5 h-3.5" fill="#facc15" color="#facc15" />
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#92400e" }}>
                            {artist.average_rating?.toFixed(1) || "N/A"}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs font-semibold mb-1" style={{ color: "#a855f7", margin: 0 }}>
                        {artist.experience || "Professional"} · {artist.industry || "Makeup Artist"}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                          <MapPin className="w-3 h-3" style={{ color: "#6b7280" }} />
                          <span style={{ fontSize: "11px", color: "#6b7280" }}>
                            {displayDistance}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                          <Clock className="w-3 h-3" style={{ color: "#6b7280" }} />
                          <span style={{ fontSize: "11px", color: "#6b7280" }}>
                            Available
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
                        {displayPrice}
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
                );
              })
            ) : (
              <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                {searchTerm.trim() ? 'No artists found matching your search' : 'No verified artists available yet'}
              </div>
            )}
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
