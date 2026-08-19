import { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { Star, MapPin, BadgeCheck, Sparkles, X, ChevronRight, Search } from "lucide-react";
import { useVerifiedArtists, useSearchArtists } from "../../hooks/use-booking";

type BookingScreenProps = {
  onNavigateToMirror: () => void;
  onNavigateToProfile: () => void;
  onNavigateHome?: () => void;
  onNavigateToArtistDetail?: (artistId: string) => void;
  onNavigateToProducts?: () => void;
  onNavigateToCoach?: () => void;
  onNavigateToBooking?: () => void;
  onNavigateToChat?: () => void;
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
`;

// Service categories derived from real DB category types
const CATEGORY_CHIPS = [
  { id: undefined, label: "All", emoji: "✨" },
  { id: "bridal", label: "Bridal", emoji: "👰" },
  { id: "party", label: "Party", emoji: "🎉" },
  { id: "makeup", label: "Makeup", emoji: "💄" },
  { id: "hair", label: "Hair", emoji: "💇" },
  { id: "mehendi", label: "Mehendi", emoji: "🌿" },
  { id: "skin_facial", label: "Skin", emoji: "✨" },
  { id: "home_service", label: "Home Service", emoji: "🏠" },
];

export function BookingScreen({ 
  onNavigateToMirror, 
  onNavigateToProfile, 
  onNavigateHome, 
  onNavigateToArtistDetail,
  onNavigateToProducts,
  onNavigateToCoach,
  onNavigateToBooking,
  onNavigateToChat
}: BookingScreenProps) {
  const [styleId, setStyleId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'rating' | 'price'>('rating');

  // Fetch verified artists filtered by category
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

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-[#fffbfd]" style={{ position: "relative", zIndex: 1 }}>
      <div className="sticky top-0 z-40">
        <Header onNavigateToProfile={onNavigateToProfile} />
      </div>

      <main className="flex-grow overflow-y-auto pb-32 px-4 pt-4 flex flex-col gap-4" style={{ WebkitOverflowScrolling: "touch" }}>
        {/* Title Header */}
        <div className="fade-in-booking">
          <h1 className="text-xl font-black text-slate-900 tracking-tight mb-0.5">
            Discover Artists
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Find verified beauty professionals for your occasion
          </p>
        </div>

        {/* Search Bar */}
        <div className="fade-in-booking-d1 relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search artists, services or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white rounded-2xl border border-pink-100/90 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-300 shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Compact Horizontal Category Selector Chips */}
        <div className="fade-in-booking-d2">
          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {CATEGORY_CHIPS.map((chip) => {
              const isSelected = selectedCategory === chip.id;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setSelectedCategory(chip.id)}
                  className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md'
                      : 'bg-white border border-pink-100 text-slate-700 hover:bg-pink-50 shadow-sm'
                  }`}
                >
                  <span className="text-sm">{chip.emoji}</span>
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sort Controls */}
        <div className="fade-in-booking-d3 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {selectedCategory
              ? `${selectedCategory.replace('_', ' ').toUpperCase()} Professionals`
              : 'Verified Artists'}
          </span>

          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setSortBy('rating')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                sortBy === 'rating' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              ⭐ Top Rated
            </button>
            <button
              type="button"
              onClick={() => setSortBy('price')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                sortBy === 'price' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              💰 Lowest Price
            </button>
          </div>
        </div>

        {/* Artists Directory Results List */}
        <div className="fade-in-booking-d4">
          <div className="flex flex-col gap-3">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 font-medium text-xs">
                <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading verified artists...
              </div>
            ) : displayArtists && displayArtists.length > 0 ? (
              displayArtists.map((artist) => {
                const displayName = artist.shop_name || artist.full_name || artist.username || "Makeup Artist";
                const displayPrice = artist.starting_price
                  ? `From ₹${artist.starting_price.toLocaleString()}`
                  : "Custom Quote";
                const reviewCount = artist.total_reviews || 0;
                const rating = artist.average_rating ? artist.average_rating.toFixed(1) : "N/A";

                return (
                  <div
                    key={artist.id}
                    onClick={() => onNavigateToArtistDetail?.(artist.id)}
                    className="p-3 bg-white rounded-xl border border-pink-100/80 shadow-xs hover:shadow-sm flex items-center gap-3 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    {/* Real Profile Image Avatar (56-64px) */}
                    <div className="w-[58px] h-[58px] rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 border border-pink-200 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden shadow-xs">
                      {artist.avatar_url ? (
                        <img src={artist.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        "💄"
                      )}
                    </div>

                    {/* Artist Details Info Column */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <h3 className="text-[14px] font-bold text-slate-900 truncate">
                          {displayName}
                        </h3>
                        {artist.seller_status === 'verified' && (
                          <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        )}
                      </div>

                      {/* Rating + Reviews */}
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.2 rounded text-[10px] font-bold text-slate-900 border border-amber-100">
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          <span>{rating}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          ({reviewCount} reviews)
                        </span>
                      </div>

                      {/* Location & Specialties */}
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium truncate">
                        {artist.city && (
                          <div className="flex items-center gap-0.5 truncate">
                            <MapPin className="w-2.5 h-2.5 text-pink-500 flex-shrink-0" />
                            <span className="truncate">{artist.city}</span>
                          </div>
                        )}
                        {artist.specialities && (
                          <span className="truncate text-purple-600 font-medium">
                            · {artist.specialities.split(',')[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price & Primary Action (View Profile) */}
                    <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0 pl-1">
                      <span className="text-[13px] font-bold text-slate-900">
                        {displayPrice}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToArtistDetail?.(artist.id);
                        }}
                        className="px-2.5 py-1 bg-pink-50 text-pink-600 hover:bg-pink-100 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-0.5"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 px-6 text-center bg-white rounded-2xl border border-pink-100 shadow-sm">
                <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-600 font-bold text-sm mb-0.5">
                  {searchTerm.trim() ? 'No matching artists found' : 'No verified artists available'}
                </p>
                <p className="text-xs text-slate-400">
                  {searchTerm.trim() ? 'Try searching with a different keyword or location' : 'Check back soon for newly registered makeup professionals.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="sticky bottom-0 z-40">
        <BottomNav
          onNavigateHome={onNavigateHome}
          onNavigateToMirror={onNavigateToMirror}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToProducts={onNavigateToProducts}
          onNavigateToCoach={onNavigateToCoach}
          onNavigateToBooking={onNavigateToBooking}
          onNavigateToChat={onNavigateToChat}
        />
      </div>
    </div>
  );
}
