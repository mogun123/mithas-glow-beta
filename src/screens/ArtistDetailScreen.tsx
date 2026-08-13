--- src/screens/ArtistDetailScreen.tsx (原始)
import { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { Star, ChevronLeft, CheckCircle, AlertCircle, BadgeCheck, Clock, Calendar, MapPin, Instagram, Youtube, Share2, Image as ImageIcon, Heart, MessageCircle, User, ChevronRight } from "lucide-react";
import { useArtistProfile, useAvailableSlots, useCreateBooking } from "../../hooks/use-booking";
import { useAuthStore } from "../lib/store";
import { toast } from "sonner";
import { useArtistPortfolio } from "../hooks/useArtistPortfolio";
import { useArtistReviews } from "../hooks/useArtistReviews";

type ArtistDetailScreenProps = {
  artistId: string;
  onNavigateToMirror: () => void;
  onNavigateToProfile: () => void;
  onNavigateHome: () => void;
  onNavigateBack: () => void;
  onNavigateToMyBookings: () => void;
};

const ARTIST_DETAIL_CSS = `
@keyframes fade-in-artist-detail {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in-artist-detail { animation: fade-in-artist-detail 0.4s cubic-bezier(0.22,1,0.36,1) both; }
.fade-in-artist-detail-d1 { animation-delay: 0.05s; }
.fade-in-artist-detail-d2 { animation-delay: 0.1s; }
.fade-in-artist-detail-d3 { animation-delay: 0.15s; }
.fade-in-artist-detail-d4 { animation-delay: 0.2s; }

@keyframes success-pop {
  0% { transform: scale(0.9); opacity: 0; }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); opacity: 1; }
}
.success-pop { animation: success-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }

.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { scrollbar-width: none; msOverflowStyle: 'none'; }
`;

export function ArtistDetailScreen({
  artistId,
  onNavigateToMirror,
  onNavigateToProfile,
  onNavigateHome,
  onNavigateBack,
  onNavigateToMyBookings,
}: ArtistDetailScreenProps) {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [locationType, setLocationType] = useState<"studio" | "home">("studio");
  const [specialNotes, setSpecialNotes] = useState("");
  const [showPolicy, setShowPolicy] = useState(false);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [styleId, setStyleId] = useState("");
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);

  const authStore = useAuthStore();
  const userId = authStore.session?.user?.id;

  const { artist, services, loading: artistLoading } = useArtistProfile(artistId);
  const { slots, loading: slotsLoading } = useAvailableSlots(artistId, selectedDate);
  const { createBooking } = useCreateBooking();
  const { portfolioItems, socialLinks, loading: portfolioLoading } = useArtistPortfolio();
  const { reviews: artistReviews, summary: reviewSummary, loading: reviewsLoading } = useArtistReviews(artistId, 5);

  // Derive social links from socialLinks array
  const instagramLink = socialLinks?.find(link => link.platform === 'instagram');
  const youtubeLink = socialLinks?.find(link => link.platform === 'youtube');

  // Get featured portfolio items (first 5 or marked as featured)
  const featuredPortfolio = portfolioItems
    ?.filter(item => item.is_featured || true)
    .slice(0, 5) || [];

  // Generate next 7 days for date selection
  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().split("T")[0];
  });

  useEffect(() => {
    const id = "artist-detail-screen-css";
    if (!document.getElementById(id)) {
      const styleEl = document.createElement("style");
      styleEl.id = id;
      styleEl.textContent = ARTIST_DETAIL_CSS;
      document.head.appendChild(styleEl);
      setStyleId(id);
    }
    return () => {
      const s = styleId && document.getElementById(styleId);
      if (s) s.remove();
    };
  }, [styleId]);

  // Reset selections when date changes
  useEffect(() => {
    setSelectedTime(null);
  }, [selectedDate]);

  const handleCreateBooking = async () => {
    if (!userId || !selectedService || !selectedDate || !selectedTime) {
      toast.error("Please select a service, date, and time slot");
      return;
    }

    const service = services.find((s) => s.id === selectedService);
    if (!service) {
      toast.error("Invalid service selected");
      return;
    }

    try {
      setIsCreatingBooking(true);

      // Note: service.price is passed for UI reference only
      // The actual price is calculated server-side by the create_booking RPC
      // from the authoritative artist_services table
      await createBooking(
        userId,
        artistId,
        service.id,
        service.title,
        service.price, // Used for UI preview only - server ignores this
        selectedDate,
        selectedTime,
        specialNotes.trim()
      );

      setBookingSuccess(true);
      toast.success("Booking created successfully! ✨");
    } catch (error: any) {
      console.error("Booking creation error:", error);
      toast.error(error.message || "Failed to create booking");
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const handleShareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: artist?.shop_name || artist?.full_name,
          text: `Check out ${artist?.shop_name || artist?.full_name} on MITHAS GLOW!`,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  if (artistLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf5ff]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading artist details...</p>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf5ff]">
        <div className="text-center p-8">
          <AlertCircle className="w-16 h-16 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Artist Not Found</h2>
          <p className="text-slate-500 mb-4">This artist profile is not available.</p>
          <button
            onClick={onNavigateBack}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold shadow-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-[#faf5ff]" style={{ position: "relative", zIndex: 1 }}>
        <div className="glass-header sticky top-0" style={{ zIndex: 30 }}>
          <Header onNavigateToProfile={onNavigateToProfile} />
        </div>

        <main className="flex-grow overflow-y-auto pb-32 px-5" style={{
          WebkitOverflowScrolling: "touch",
          paddingTop: "80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px"
        }}>
          <div className="success-pop text-center">
            <div style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: "0 8px 32px rgba(34,197,94,0.3)"
            }}>
              <CheckCircle className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold mb-2 text-slate-900">
              Booking Confirmed! 🎉
            </h2>
            <p className="text-slate-600 mb-8">
              Your appointment with {artist.shop_name || artist.full_name} has been booked successfully.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
              <button
                onClick={onNavigateToMyBookings}
                className="nav-tap-btn px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-2xl font-bold shadow-lg"
              >
                View My Bookings
              </button>
              <button
                onClick={onNavigateHome}
                className="nav-tap-btn px-6 py-4 bg-white text-slate-700 rounded-2xl font-bold border border-pink-100 shadow-md"
              >
                Back to Home
              </button>
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

  // Format industry/profession for display
  const formatProfession = (industry?: string | null) => {
    if (!industry) return 'Professional';
    return industry
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-[#fffbfd]" style={{ position: "relative", zIndex: 1 }}>
      {/* Header */}
      <div className="sticky top-0 z-40" style={{ zIndex: 30 }}>
        <Header onNavigateToProfile={onNavigateToProfile} />
      </div>

      <main className="flex-grow overflow-y-auto pb-28" style={{
        WebkitOverflowScrolling: "touch",
        display: "flex",
        flexDirection: "column"
      }}>
        {/* Hero Section - Clean & Premium */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 p-0.5 shadow-sm">
                <div className="w-full h-full rounded-full overflow-hidden bg-white">
                  {artist.avatar_url ? (
                    <img src={artist.avatar_url} alt={artist.shop_name || artist.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">💄</div>
                  )}
                </div>
              </div>
              {artist.seller_status === 'verified' && (
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                  <BadgeCheck className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>

            {/* Artist Info */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-1.5 mb-1">
                <h1 className="text-lg font-bold text-slate-900 truncate">
                  {artist.shop_name || artist.full_name}
                </h1>
                {artist.seller_status === 'verified' && (
                  <BadgeCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-semibold text-slate-900">
                    {artist.average_rating?.toFixed(1) || "N/A"}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  ({artist.total_reviews || 0} reviews)
                </span>
              </div>

              {/* Profession & Location */}
              <p className="text-xs text-slate-600 font-medium mb-0.5">
                {formatProfession(artist.industry)}
              </p>
              {artist.location_city && (
                <div className="flex items-center gap-1 text-slate-500">
                  <MapPin className="w-3 h-3" />
                  <span className="text-xs">{artist.location_city}</span>
                </div>
              )}
            </div>

            {/* Share Button */}
            <button
              onClick={handleShareProfile}
              className="flex-shrink-0 p-2 bg-white rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors active:scale-95"
              aria-label="Share profile"
            >
              <Share2 className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* Bio */}
          {artist.bio && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                {artist.bio}
              </p>
            </div>
          )}

          {/* Specialities */}
          {artist.specialities && (
            <div className="mt-3 flex flex-wrap gap-2">
              {artist.specialities.split(',').slice(0, 4).map((spec, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2.5 py-1 bg-pink-50 rounded-full text-xs font-medium text-slate-700"
                >
                  {spec.trim()}
                </span>
              ))}
            </div>
          )}

          {/* Social Links */}
          {(instagramLink || youtubeLink) && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
              {instagramLink && (
                <a
                  href={instagramLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg text-white shadow-sm"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {youtubeLink && (
                <a
                  href={youtubeLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-red-500 rounded-lg text-white shadow-sm"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Portfolio Gallery - Instagram Style */}
        {featuredPortfolio.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between px-4 mb-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-pink-500" />
                Portfolio
              </h2>
              <button
                onClick={() => setShowPortfolioModal(true)}
                className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {featuredPortfolio.map((item, index) => (
                <div
                  key={item.id || index}
                  className="flex-shrink-0 w-28 h-36 rounded-xl overflow-hidden shadow-sm border border-slate-100"
                >
                  <img
                    src={item.image_url}
                    alt={item.caption || `Portfolio ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="mt-2 px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              Reviews
            </h2>
            {reviewSummary && reviewSummary.total_reviews > 0 && (
              <span className="text-xs text-slate-500">
                {reviewSummary.total_reviews} reviews
              </span>
            )}
          </div>

          {reviewsLoading ? (
            <div className="py-6 text-center">
              <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-slate-500">Loading reviews...</p>
            </div>
          ) : artistReviews.length > 0 ? (
            <>
              {/* Rating Summary */}
              {reviewSummary && (
                <div className="mb-3 p-3 bg-amber-50/80 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900">{reviewSummary.average_rating.toFixed(1)}</div>
                      <div className="flex gap-0.5 justify-center my-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${
                              star <= reviewSummary.average_rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500">{reviewSummary.total_reviews} reviews</p>
                    </div>
                    <div className="flex-1 space-y-1">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const count = reviewSummary.rating_distribution[rating as keyof typeof reviewSummary.rating_distribution];
                        const percentage = reviewSummary.total_reviews > 0 ? (count / reviewSummary.total_reviews) * 100 : 0;
                        return (
                          <div key={rating} className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 w-4">{rating}</span>
                            <div className="flex-1 bg-amber-100 rounded-full h-1 overflow-hidden">
                              <div
                                className="bg-amber-400 h-1 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Reviews List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {artistReviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-3 bg-white rounded-xl border border-slate-100"
                  >
                    <div className="flex items-start gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-pink-100">
                        {review.customer_avatar_url ? (
                          <img src={review.customer_avatar_url} alt={review.customer_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-pink-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-900 truncate">{review.customer_name}</span>
                          {review.is_verified && (
                            <span className="bg-emerald-50 text-emerald-600 text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-medium">
                              <CheckCircle className="w-2 h-2" />
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${
                                  star <= review.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-8 px-4 text-center bg-white rounded-xl border border-slate-100">
              <Star className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 mb-0.5">No reviews yet</p>
              <p className="text-xs text-slate-500">Be the first to review this artist</p>
            </div>
          )}
        </div>

        {/* Services Section */}
        <div className="mt-6 px-5">
          <h2 className="text-lg font-extrabold text-slate-900 mb-3">Select a Service</h2>
          <div className="flex flex-col gap-3">
            {services.length > 0 ? (
              services.map((service) => {
                const isSelected = selectedService === service.id;
                return (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className={`nav-tap-btn w-full transition-all duration-200 active:scale-[0.98] ${
                      isSelected
                        ? 'ring-2 ring-pink-500 shadow-lg'
                        : 'hover:shadow-md'
                    }`}
                    style={{
                      padding: "18px",
                      background: isSelected
                        ? "linear-gradient(135deg, rgba(236,72,153,0.08), rgba(168,85,247,0.08))"
                        : "#FFFFFF",
                      borderRadius: "20px",
                      border: isSelected ? "2px solid #ec4899" : "1px solid #f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      boxShadow: isSelected ? "0 8px 24px rgba(236,72,153,0.15)" : "0 2px 8px rgba(0,0,0,0.04)"
                    }}
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-base font-bold text-slate-900 truncate">
                          {service.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Duration Pill */}
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">
                          <Clock className="w-3 h-3" />
                          {service.duration_minutes} min
                        </span>
                        {/* Category Pill */}
                        <span className="inline-flex items-center px-2.5 py-1 bg-purple-50 rounded-full text-xs font-semibold text-purple-700 capitalize">
                          {service.category?.replace("_", " ") || "Service"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      {/* Price */}
                      <span className="text-lg font-black bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                        ₹{service.price}
                      </span>
                      {/* Add Button */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isSelected ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <span className="text-xl font-light leading-none">+</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-12 px-6 text-center bg-white rounded-2xl border border-pink-100 shadow-sm">
                <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No services available for this artist</p>
              </div>
            )}
          </div>
        </div>

        {/* Date Selection */}
        <div className="mt-6 px-5">
          <h2 className="text-lg font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            Select a Date
          </h2>
          <div className="flex gap-2.5 overflow-x-auto pb-3 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {availableDates.map((date) => {
              const dateObj = new Date(date);
              const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
              const dayNum = dateObj.getDate();
              const month = dateObj.toLocaleDateString("en-US", { month: "short" });
              const isSelected = selectedDate === date;

              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`nav-tap-btn flex-shrink-0 transition-all duration-200 active:scale-95 ${
                    isSelected ? 'shadow-lg scale-105' : 'hover:shadow-md'
                  }`}
                  style={{
                    minWidth: "76px",
                    padding: "14px 12px",
                    background: isSelected
                      ? "linear-gradient(135deg,#ec4899,#a855f7)"
                      : "#FFFFFF",
                    borderRadius: "18px",
                    border: isSelected ? "none" : "1px solid #f3f4f6",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                    boxShadow: isSelected ? "0 8px 24px rgba(236,72,153,0.3)" : "0 2px 8px rgba(0,0,0,0.04)"
                  }}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    isSelected ? "text-white/90" : "text-slate-500"
                  }`}>
                    {dayName}
                  </span>
                  <span className={`text-2xl font-black ${
                    isSelected ? "text-white" : "text-slate-900"
                  }`}>
                    {dayNum}
                  </span>
                  <span className={`text-[10px] font-semibold ${
                    isSelected ? "text-white/90" : "text-slate-500"
                  }`}>
                    {month}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Slots */}
        {selectedDate && (
          <div className="mt-6 px-5 fade-in-artist-detail-d4">
            <h2 className="text-lg font-extrabold text-slate-900 mb-3">Available Time Slots</h2>
            {slotsLoading ? (
              <div className="py-8 text-center">
                <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-slate-500">Loading available slots...</p>
              </div>
            ) : slots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2.5">
                {slots.map((slot) => {
                  const isSelected = selectedTime === slot.time;
                  const isUnavailable = !slot.available;

                  return (
                    <button
                      key={slot.time}
                      onClick={() => setSelectedTime(slot.time)}
                      disabled={isUnavailable}
                      className={`nav-tap-btn py-3 px-2 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 ${
                        isUnavailable
                          ? 'cursor-not-allowed opacity-50'
                          : isSelected
                            ? 'shadow-lg scale-105'
                            : 'hover:shadow-md'
                      }`}
                      style={{
                        background: isUnavailable
                          ? "#F3F4F6"
                          : isSelected
                            ? "linear-gradient(135deg,#ec4899,#a855f7)"
                            : "#FFFFFF",
                        color: isUnavailable
                          ? "#9CA3AF"
                          : isSelected
                            ? "#FFFFFF"
                            : "#1F2937",
                        border: isSelected && !isUnavailable ? "none" : "1px solid #f3f4f6",
                        cursor: isUnavailable ? "not-allowed" : "pointer",
                        opacity: isUnavailable ? 0.5 : 1,
                      }}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 px-6 text-center bg-white rounded-2xl border border-pink-100 shadow-sm">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 font-medium">No available slots for this date</p>
              </div>
            )}
          </div>
        )}

        {/* Booking Summary - Only shown when all selections made */}
        {selectedService && selectedDate && selectedTime && (
          <div className="mt-6 px-5 fade-in-artist-detail-d4">
            <div className="bg-white rounded-2xl p-5 border border-pink-100 shadow-[0_8px_30px_rgba(236,72,153,0.08)]">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-pink-500" />
                Booking Details
              </h3>

              {/* Service & Date/Time Summary */}
              <div className="space-y-2.5 mb-4 pb-4 border-b border-pink-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Service</span>
                  <span className="text-sm font-bold text-slate-900">{selectedServiceData?.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Date</span>
                  <span className="text-sm font-bold text-slate-900">
                    {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Time</span>
                  <span className="text-sm font-bold text-slate-900">{selectedTime}</span>
                </div>
              </div>

              {/* Location Selection */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-slate-700 mb-2.5 block">Service Location</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setLocationType("studio")}
                    className={`nav-tap-btn py-3 px-3 rounded-xl font-semibold text-xs transition-all duration-200 active:scale-95 ${
                      locationType === 'studio' ? 'shadow-md' : 'hover:shadow-sm'
                    }`}
                    style={{
                      background: locationType === 'studio'
                        ? "linear-gradient(135deg,#ec4899,#a855f7)"
                        : "#FFFFFF",
                      color: locationType === 'studio' ? "#FFFFFF" : "#475569",
                      border: locationType === 'studio' ? "none" : "1px solid #f3f4f6",
                    }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>Studio Visit</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setLocationType("home")}
                    className={`nav-tap-btn py-3 px-3 rounded-xl font-semibold text-xs transition-all duration-200 active:scale-95 ${
                      locationType === 'home' ? 'shadow-md' : 'hover:shadow-sm'
                    }`}
                    style={{
                      background: locationType === 'home'
                        ? "linear-gradient(135deg,#ec4899,#a855f7)"
                        : "#FFFFFF",
                      color: locationType === 'home' ? "#FFFFFF" : "#475569",
                      border: locationType === 'home' ? "none" : "1px solid #f3f4f6",
                    }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>Home Service</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Special Requests Input */}
              <div className="mb-4">
                <label htmlFor="special-notes" className="text-xs font-semibold text-slate-700 mb-2 block">
                  Special Requests or Notes
                </label>
                <textarea
                  id="special-notes"
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="Any specific requirements, allergies, or preferences for the artist..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-[#faf5ff] border border-pink-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent resize-none transition-all"
                />
              </div>

              {/* Price Breakdown */}
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-4 mb-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">Base Service Price</span>
                    <span className="text-slate-900 font-bold">₹{basePrice}</span>
                  </div>
                  {locationType === 'home' && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Travel Charges
                      </span>
                      <span className="text-slate-900 font-bold">₹{travelCharge}</span>
                    </div>
                  )}
                  <div className="pt-2 mt-2 border-t border-pink-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700">Total Amount</span>
                    <span className="text-lg font-black bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                      ₹{totalAmount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Advance Payment Highlight */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2.5 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-emerald-800 mb-0.5">Advance Payment Required</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Secure your booking with 20% advance</p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-emerald-100">
                  <span className="text-xs text-emerald-700 font-medium">Pay Now</span>
                  <span className="text-xl font-black text-emerald-700">₹{advancePayable}</span>
                </div>
              </div>

              {/* Cancellation Policy Accordion */}
              <div className="border border-pink-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowPolicy(!showPolicy)}
                  className="w-full px-4 py-3 bg-pink-50/50 flex items-center justify-between hover:bg-pink-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-pink-500" />
                    <span className="text-xs font-bold text-slate-700">Cancellation & Rescheduling Policy</span>
                  </div>
                  <ChevronLeft
                    className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                      showPolicy ? 'rotate-90' : '-rotate-90'
                    }`}
                  />
                </button>
                {showPolicy && (
                  <div className="px-4 py-3 bg-white text-xs text-slate-600 leading-relaxed space-y-2">
                    <p>• Free cancellation up to 24 hours before your appointment.</p>
                    <p>• 50% charge for cancellations within 24 hours.</p>
                    <p>• No refund for no-shows or same-day cancellations.</p>
                    <p>• Rescheduling is allowed once without charge (subject to availability).</p>
                    <p>• Advance payment is non-refundable but adjustable on reschedule.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Spacer for sticky bottom bar */}
        <div className="h-8"></div>
      </main>

      {/* Sticky Bottom Action Bar - Glassmorphic */}
      {selectedService && selectedDate && selectedTime ? (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto" style={{ zIndex: 40 }}>
          <div className="mx-4 mb-4 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-pink-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              {/* Advance Payment Info */}
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Advance Payable</span>
                <span className="text-xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  ₹{advancePayable}
                </span>
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleCreateBooking}
                disabled={isCreatingBooking}
                className="nav-tap-btn px-6 py-3.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold text-xs shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                style={{
                  background: isCreatingBooking
                    ? "linear-gradient(135deg,#9CA3AF,#6B7280)"
                    : "linear-gradient(135deg,#ec4899,#a855f7)",
                  minWidth: "120px"
                }}
              >
                {isCreatingBooking ? (
                  <span className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Booking...
                  </span>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Prompt Bar when no selection */
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto" style={{ zIndex: 40 }}>
          <div className="mx-4 mb-4 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-pink-100 px-5 py-4">
            <p className="text-center text-sm text-slate-500 font-medium">
              {!selectedService
                ? "Select a service to continue"
                : !selectedDate
                  ? "Choose your preferred date"
                  : "Pick an available time slot"}
            </p>
          </div>
        </div>
      )}

      {/* Portfolio Modal */}
      {showPortfolioModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowPortfolioModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-white w-full max-w-lg max-h-[80vh] rounded-t-3xl sm:rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-pink-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-pink-500" />
                Full Portfolio
              </h2>
              <button
                onClick={() => setShowPortfolioModal(false)}
                className="p-2 bg-pink-50 rounded-full hover:bg-pink-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 rotate-180 text-slate-600" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(80vh-80px)]">
              {portfolioItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {portfolioItems.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="aspect-square rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(236,72,153,0.1)] relative border border-pink-100/30"
                    >
                      <img
                        src={item.image_url}
                        alt={item.caption || `Portfolio ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {item.caption && (
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                          <p className="text-xs text-white font-medium line-clamp-2">{item.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No portfolio items yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

+++ src/screens/ArtistDetailScreen.tsx (修改后)
import { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { Star, ChevronLeft, CheckCircle, AlertCircle, BadgeCheck, Clock, Calendar, MapPin, Instagram, Youtube, Share2, Image as ImageIcon, Heart, MessageCircle, User, ChevronRight } from "lucide-react";
import { useArtistProfile, useAvailableSlots, useCreateBooking } from "../../hooks/use-booking";
import { useAuthStore } from "../lib/store";
import { toast } from "sonner";
import { useArtistPortfolio } from "../hooks/useArtistPortfolio";
import { useArtistReviews } from "../hooks/useArtistReviews";

type ArtistDetailScreenProps = {
  artistId: string;
  onNavigateToMirror: () => void;
  onNavigateToProfile: () => void;
  onNavigateHome: () => void;
  onNavigateBack: () => void;
  onNavigateToMyBookings: () => void;
  onNavigateToChat?: () => void;
};

const ARTIST_DETAIL_CSS = `
@keyframes fade-in-artist-detail {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in-artist-detail { animation: fade-in-artist-detail 0.4s cubic-bezier(0.22,1,0.36,1) both; }
.fade-in-artist-detail-d1 { animation-delay: 0.05s; }
.fade-in-artist-detail-d2 { animation-delay: 0.1s; }
.fade-in-artist-detail-d3 { animation-delay: 0.15s; }
.fade-in-artist-detail-d4 { animation-delay: 0.2s; }

@keyframes success-pop {
  0% { transform: scale(0.9); opacity: 0; }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); opacity: 1; }
}
.success-pop { animation: success-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }

.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { scrollbar-width: none; msOverflowStyle: 'none'; }
`;

export function ArtistDetailScreen({
  artistId,
  onNavigateToMirror,
  onNavigateToProfile,
  onNavigateHome,
  onNavigateBack,
  onNavigateToMyBookings,
}: ArtistDetailScreenProps) {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [locationType, setLocationType] = useState<"studio" | "home">("studio");
  const [specialNotes, setSpecialNotes] = useState("");
  const [showPolicy, setShowPolicy] = useState(false);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [styleId, setStyleId] = useState("");
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);

  const authStore = useAuthStore();
  const userId = authStore.session?.user?.id;

  const { artist, services, loading: artistLoading } = useArtistProfile(artistId);
  const { slots, loading: slotsLoading } = useAvailableSlots(artistId, selectedDate);
  const { createBooking } = useCreateBooking();
  const { portfolioItems, socialLinks, loading: portfolioLoading } = useArtistPortfolio();
  const { reviews: artistReviews, summary: reviewSummary, loading: reviewsLoading } = useArtistReviews(artistId, 5);

  // Derive social links from socialLinks array
  const instagramLink = socialLinks?.find(link => link.platform === 'instagram');
  const youtubeLink = socialLinks?.find(link => link.platform === 'youtube');

  // Get featured portfolio items (first 5 or marked as featured)
  const featuredPortfolio = portfolioItems
    ?.filter(item => item.is_featured || true)
    .slice(0, 5) || [];

  // Generate next 7 days for date selection
  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().split("T")[0];
  });

  useEffect(() => {
    const id = "artist-detail-screen-css";
    if (!document.getElementById(id)) {
      const styleEl = document.createElement("style");
      styleEl.id = id;
      styleEl.textContent = ARTIST_DETAIL_CSS;
      document.head.appendChild(styleEl);
      setStyleId(id);
    }
    return () => {
      const s = styleId && document.getElementById(styleId);
      if (s) s.remove();
    };
  }, [styleId]);

  // Reset selections when date changes
  useEffect(() => {
    setSelectedTime(null);
  }, [selectedDate]);

  const handleCreateBooking = async () => {
    if (!userId || !selectedService || !selectedDate || !selectedTime) {
      toast.error("Please select a service, date, and time slot");
      return;
    }

    const service = services.find((s) => s.id === selectedService);
    if (!service) {
      toast.error("Invalid service selected");
      return;
    }

    try {
      setIsCreatingBooking(true);

      // Note: service.price is passed for UI reference only
      // The actual price is calculated server-side by the create_booking RPC
      // from the authoritative artist_services table
      await createBooking(
        userId,
        artistId,
        service.id,
        service.title,
        service.price, // Used for UI preview only - server ignores this
        selectedDate,
        selectedTime,
        specialNotes.trim()
      );

      setBookingSuccess(true);
      toast.success("Booking created successfully! ✨");
    } catch (error: any) {
      console.error("Booking creation error:", error);
      toast.error(error.message || "Failed to create booking");
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const handleShareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: artist?.shop_name || artist?.full_name,
          text: `Check out ${artist?.shop_name || artist?.full_name} on MITHAS GLOW!`,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  if (artistLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf5ff]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading artist details...</p>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf5ff]">
        <div className="text-center p-8">
          <AlertCircle className="w-16 h-16 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Artist Not Found</h2>
          <p className="text-slate-500 mb-4">This artist profile is not available.</p>
          <button
            onClick={onNavigateBack}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold shadow-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-[#faf5ff]" style={{ position: "relative", zIndex: 1 }}>
        <div className="glass-header sticky top-0" style={{ zIndex: 30 }}>
          <Header onNavigateToProfile={onNavigateToProfile} />
        </div>

        <main className="flex-grow overflow-y-auto pb-32 px-5" style={{
          WebkitOverflowScrolling: "touch",
          paddingTop: "80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px"
        }}>
          <div className="success-pop text-center">
            <div style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: "0 8px 32px rgba(34,197,94,0.3)"
            }}>
              <CheckCircle className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold mb-2 text-slate-900">
              Booking Confirmed! 🎉
            </h2>
            <p className="text-slate-600 mb-8">
              Your appointment with {artist.shop_name || artist.full_name} has been booked successfully.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
              <button
                onClick={onNavigateToMyBookings}
                className="nav-tap-btn px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-2xl font-bold shadow-lg"
              >
                View My Bookings
              </button>
              <button
                onClick={onNavigateHome}
                className="nav-tap-btn px-6 py-4 bg-white text-slate-700 rounded-2xl font-bold border border-pink-100 shadow-md"
              >
                Back to Home
              </button>
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

  // Format industry/profession for display
  const formatProfession = (industry?: string | null) => {
    if (!industry) return 'Professional';
    return industry
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-[#fffbfd]" style={{ position: "relative", zIndex: 1 }}>
      {/* Header */}
      <div className="sticky top-0 z-40" style={{ zIndex: 30 }}>
        <Header onNavigateToProfile={onNavigateToProfile} />
      </div>

      <main className="flex-grow overflow-y-auto pb-28" style={{
        WebkitOverflowScrolling: "touch",
        display: "flex",
        flexDirection: "column"
      }}>
        {/* Hero Section - Clean & Premium */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 p-0.5 shadow-sm">
                <div className="w-full h-full rounded-full overflow-hidden bg-white">
                  {artist.avatar_url ? (
                    <img src={artist.avatar_url} alt={artist.shop_name || artist.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">💄</div>
                  )}
                </div>
              </div>
              {artist.seller_status === 'verified' && (
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                  <BadgeCheck className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>

            {/* Artist Info */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-1.5 mb-1">
                <h1 className="text-lg font-bold text-slate-900 truncate">
                  {artist.shop_name || artist.full_name}
                </h1>
                {artist.seller_status === 'verified' && (
                  <BadgeCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-semibold text-slate-900">
                    {artist.average_rating?.toFixed(1) || "N/A"}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  ({artist.total_reviews || 0} reviews)
                </span>
              </div>

              {/* Profession & Location */}
              <p className="text-xs text-slate-600 font-medium mb-0.5">
                {formatProfession(artist.industry)}
              </p>
              {artist.location_city && (
                <div className="flex items-center gap-1 text-slate-500">
                  <MapPin className="w-3 h-3" />
                  <span className="text-xs">{artist.location_city}</span>
                </div>
              )}
            </div>

            {/* Share Button */}
            <button
              onClick={handleShareProfile}
              className="flex-shrink-0 p-2 bg-white rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors active:scale-95"
              aria-label="Share profile"
            >
              <Share2 className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* Bio */}
          {artist.bio && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                {artist.bio}
              </p>
            </div>
          )}

          {/* Specialities */}
          {artist.specialities && (
            <div className="mt-3 flex flex-wrap gap-2">
              {artist.specialities.split(',').slice(0, 4).map((spec, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2.5 py-1 bg-pink-50 rounded-full text-xs font-medium text-slate-700"
                >
                  {spec.trim()}
                </span>
              ))}
            </div>
          )}

          {/* Social Links */}
          {(instagramLink || youtubeLink) && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
              {instagramLink && (
                <a
                  href={instagramLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg text-white shadow-sm"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {youtubeLink && (
                <a
                  href={youtubeLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-red-500 rounded-lg text-white shadow-sm"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* Message Artist Button - Glow Artist Mode Entry */}
          <button
            onClick={() => {
              if (onNavigateToChat) {
                onNavigateToChat();
              }
            }}
            className="mt-3 w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:from-amber-500 hover:to-orange-600 transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            Message Artist
          </button>
        </div>

        {/* Portfolio Gallery - Instagram Style */}
        {featuredPortfolio.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between px-4 mb-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-pink-500" />
                Portfolio
              </h2>
              <button
                onClick={() => setShowPortfolioModal(true)}
                className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {featuredPortfolio.map((item, index) => (
                <div
                  key={item.id || index}
                  className="flex-shrink-0 w-28 h-36 rounded-xl overflow-hidden shadow-sm border border-slate-100"
                >
                  <img
                    src={item.image_url}
                    alt={item.caption || `Portfolio ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="mt-2 px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              Reviews
            </h2>
            {reviewSummary && reviewSummary.total_reviews > 0 && (
              <span className="text-xs text-slate-500">
                {reviewSummary.total_reviews} reviews
              </span>
            )}
          </div>

          {reviewsLoading ? (
            <div className="py-6 text-center">
              <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-slate-500">Loading reviews...</p>
            </div>
          ) : artistReviews.length > 0 ? (
            <>
              {/* Rating Summary */}
              {reviewSummary && (
                <div className="mb-3 p-3 bg-amber-50/80 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900">{reviewSummary.average_rating.toFixed(1)}</div>
                      <div className="flex gap-0.5 justify-center my-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${
                              star <= reviewSummary.average_rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500">{reviewSummary.total_reviews} reviews</p>
                    </div>
                    <div className="flex-1 space-y-1">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const count = reviewSummary.rating_distribution[rating as keyof typeof reviewSummary.rating_distribution];
                        const percentage = reviewSummary.total_reviews > 0 ? (count / reviewSummary.total_reviews) * 100 : 0;
                        return (
                          <div key={rating} className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 w-4">{rating}</span>
                            <div className="flex-1 bg-amber-100 rounded-full h-1 overflow-hidden">
                              <div
                                className="bg-amber-400 h-1 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Reviews List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {artistReviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-3 bg-white rounded-xl border border-slate-100"
                  >
                    <div className="flex items-start gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-pink-100">
                        {review.customer_avatar_url ? (
                          <img src={review.customer_avatar_url} alt={review.customer_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-pink-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-900 truncate">{review.customer_name}</span>
                          {review.is_verified && (
                            <span className="bg-emerald-50 text-emerald-600 text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-medium">
                              <CheckCircle className="w-2 h-2" />
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${
                                  star <= review.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-8 px-4 text-center bg-white rounded-xl border border-slate-100">
              <Star className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 mb-0.5">No reviews yet</p>
              <p className="text-xs text-slate-500">Be the first to review this artist</p>
            </div>
          )}
        </div>

        {/* Services Section */}
        <div className="mt-6 px-5">
          <h2 className="text-lg font-extrabold text-slate-900 mb-3">Select a Service</h2>
          <div className="flex flex-col gap-3">
            {services.length > 0 ? (
              services.map((service) => {
                const isSelected = selectedService === service.id;
                return (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className={`nav-tap-btn w-full transition-all duration-200 active:scale-[0.98] ${
                      isSelected
                        ? 'ring-2 ring-pink-500 shadow-lg'
                        : 'hover:shadow-md'
                    }`}
                    style={{
                      padding: "18px",
                      background: isSelected
                        ? "linear-gradient(135deg, rgba(236,72,153,0.08), rgba(168,85,247,0.08))"
                        : "#FFFFFF",
                      borderRadius: "20px",
                      border: isSelected ? "2px solid #ec4899" : "1px solid #f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      boxShadow: isSelected ? "0 8px 24px rgba(236,72,153,0.15)" : "0 2px 8px rgba(0,0,0,0.04)"
                    }}
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-base font-bold text-slate-900 truncate">
                          {service.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Duration Pill */}
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">
                          <Clock className="w-3 h-3" />
                          {service.duration_minutes} min
                        </span>
                        {/* Category Pill */}
                        <span className="inline-flex items-center px-2.5 py-1 bg-purple-50 rounded-full text-xs font-semibold text-purple-700 capitalize">
                          {service.category?.replace("_", " ") || "Service"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      {/* Price */}
                      <span className="text-lg font-black bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                        ₹{service.price}
                      </span>
                      {/* Add Button */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isSelected ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <span className="text-xl font-light leading-none">+</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-12 px-6 text-center bg-white rounded-2xl border border-pink-100 shadow-sm">
                <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No services available for this artist</p>
              </div>
            )}
          </div>
        </div>

        {/* Date Selection */}
        <div className="mt-6 px-5">
          <h2 className="text-lg font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            Select a Date
          </h2>
          <div className="flex gap-2.5 overflow-x-auto pb-3 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {availableDates.map((date) => {
              const dateObj = new Date(date);
              const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
              const dayNum = dateObj.getDate();
              const month = dateObj.toLocaleDateString("en-US", { month: "short" });
              const isSelected = selectedDate === date;

              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`nav-tap-btn flex-shrink-0 transition-all duration-200 active:scale-95 ${
                    isSelected ? 'shadow-lg scale-105' : 'hover:shadow-md'
                  }`}
                  style={{
                    minWidth: "76px",
                    padding: "14px 12px",
                    background: isSelected
                      ? "linear-gradient(135deg,#ec4899,#a855f7)"
                      : "#FFFFFF",
                    borderRadius: "18px",
                    border: isSelected ? "none" : "1px solid #f3f4f6",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                    boxShadow: isSelected ? "0 8px 24px rgba(236,72,153,0.3)" : "0 2px 8px rgba(0,0,0,0.04)"
                  }}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    isSelected ? "text-white/90" : "text-slate-500"
                  }`}>
                    {dayName}
                  </span>
                  <span className={`text-2xl font-black ${
                    isSelected ? "text-white" : "text-slate-900"
                  }`}>
                    {dayNum}
                  </span>
                  <span className={`text-[10px] font-semibold ${
                    isSelected ? "text-white/90" : "text-slate-500"
                  }`}>
                    {month}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Slots */}
        {selectedDate && (
          <div className="mt-6 px-5 fade-in-artist-detail-d4">
            <h2 className="text-lg font-extrabold text-slate-900 mb-3">Available Time Slots</h2>
            {slotsLoading ? (
              <div className="py-8 text-center">
                <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-slate-500">Loading available slots...</p>
              </div>
            ) : slots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2.5">
                {slots.map((slot) => {
                  const isSelected = selectedTime === slot.time;
                  const isUnavailable = !slot.available;

                  return (
                    <button
                      key={slot.time}
                      onClick={() => setSelectedTime(slot.time)}
                      disabled={isUnavailable}
                      className={`nav-tap-btn py-3 px-2 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 ${
                        isUnavailable
                          ? 'cursor-not-allowed opacity-50'
                          : isSelected
                            ? 'shadow-lg scale-105'
                            : 'hover:shadow-md'
                      }`}
                      style={{
                        background: isUnavailable
                          ? "#F3F4F6"
                          : isSelected
                            ? "linear-gradient(135deg,#ec4899,#a855f7)"
                            : "#FFFFFF",
                        color: isUnavailable
                          ? "#9CA3AF"
                          : isSelected
                            ? "#FFFFFF"
                            : "#1F2937",
                        border: isSelected && !isUnavailable ? "none" : "1px solid #f3f4f6",
                        cursor: isUnavailable ? "not-allowed" : "pointer",
                        opacity: isUnavailable ? 0.5 : 1,
                      }}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 px-6 text-center bg-white rounded-2xl border border-pink-100 shadow-sm">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 font-medium">No available slots for this date</p>
              </div>
            )}
          </div>
        )}

        {/* Booking Summary - Only shown when all selections made */}
        {selectedService && selectedDate && selectedTime && (
          <div className="mt-6 px-5 fade-in-artist-detail-d4">
            <div className="bg-white rounded-2xl p-5 border border-pink-100 shadow-[0_8px_30px_rgba(236,72,153,0.08)]">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-pink-500" />
                Booking Details
              </h3>

              {/* Service & Date/Time Summary */}
              <div className="space-y-2.5 mb-4 pb-4 border-b border-pink-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Service</span>
                  <span className="text-sm font-bold text-slate-900">{selectedServiceData?.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Date</span>
                  <span className="text-sm font-bold text-slate-900">
                    {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Time</span>
                  <span className="text-sm font-bold text-slate-900">{selectedTime}</span>
                </div>
              </div>

              {/* Location Selection */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-slate-700 mb-2.5 block">Service Location</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setLocationType("studio")}
                    className={`nav-tap-btn py-3 px-3 rounded-xl font-semibold text-xs transition-all duration-200 active:scale-95 ${
                      locationType === 'studio' ? 'shadow-md' : 'hover:shadow-sm'
                    }`}
                    style={{
                      background: locationType === 'studio'
                        ? "linear-gradient(135deg,#ec4899,#a855f7)"
                        : "#FFFFFF",
                      color: locationType === 'studio' ? "#FFFFFF" : "#475569",
                      border: locationType === 'studio' ? "none" : "1px solid #f3f4f6",
                    }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>Studio Visit</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setLocationType("home")}
                    className={`nav-tap-btn py-3 px-3 rounded-xl font-semibold text-xs transition-all duration-200 active:scale-95 ${
                      locationType === 'home' ? 'shadow-md' : 'hover:shadow-sm'
                    }`}
                    style={{
                      background: locationType === 'home'
                        ? "linear-gradient(135deg,#ec4899,#a855f7)"
                        : "#FFFFFF",
                      color: locationType === 'home' ? "#FFFFFF" : "#475569",
                      border: locationType === 'home' ? "none" : "1px solid #f3f4f6",
                    }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>Home Service</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Special Requests Input */}
              <div className="mb-4">
                <label htmlFor="special-notes" className="text-xs font-semibold text-slate-700 mb-2 block">
                  Special Requests or Notes
                </label>
                <textarea
                  id="special-notes"
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="Any specific requirements, allergies, or preferences for the artist..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-[#faf5ff] border border-pink-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent resize-none transition-all"
                />
              </div>

              {/* Price Breakdown */}
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-4 mb-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">Base Service Price</span>
                    <span className="text-slate-900 font-bold">₹{basePrice}</span>
                  </div>
                  {locationType === 'home' && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Travel Charges
                      </span>
                      <span className="text-slate-900 font-bold">₹{travelCharge}</span>
                    </div>
                  )}
                  <div className="pt-2 mt-2 border-t border-pink-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700">Total Amount</span>
                    <span className="text-lg font-black bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                      ₹{totalAmount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Advance Payment Highlight */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2.5 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-emerald-800 mb-0.5">Advance Payment Required</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Secure your booking with 20% advance</p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-emerald-100">
                  <span className="text-xs text-emerald-700 font-medium">Pay Now</span>
                  <span className="text-xl font-black text-emerald-700">₹{advancePayable}</span>
                </div>
              </div>

              {/* Cancellation Policy Accordion */}
              <div className="border border-pink-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowPolicy(!showPolicy)}
                  className="w-full px-4 py-3 bg-pink-50/50 flex items-center justify-between hover:bg-pink-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-pink-500" />
                    <span className="text-xs font-bold text-slate-700">Cancellation & Rescheduling Policy</span>
                  </div>
                  <ChevronLeft
                    className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                      showPolicy ? 'rotate-90' : '-rotate-90'
                    }`}
                  />
                </button>
                {showPolicy && (
                  <div className="px-4 py-3 bg-white text-xs text-slate-600 leading-relaxed space-y-2">
                    <p>• Free cancellation up to 24 hours before your appointment.</p>
                    <p>• 50% charge for cancellations within 24 hours.</p>
                    <p>• No refund for no-shows or same-day cancellations.</p>
                    <p>• Rescheduling is allowed once without charge (subject to availability).</p>
                    <p>• Advance payment is non-refundable but adjustable on reschedule.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Spacer for sticky bottom bar */}
        <div className="h-8"></div>
      </main>

      {/* Sticky Bottom Action Bar - Glassmorphic */}
      {selectedService && selectedDate && selectedTime ? (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto" style={{ zIndex: 40 }}>
          <div className="mx-4 mb-4 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-pink-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              {/* Advance Payment Info */}
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Advance Payable</span>
                <span className="text-xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  ₹{advancePayable}
                </span>
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleCreateBooking}
                disabled={isCreatingBooking}
                className="nav-tap-btn px-6 py-3.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold text-xs shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                style={{
                  background: isCreatingBooking
                    ? "linear-gradient(135deg,#9CA3AF,#6B7280)"
                    : "linear-gradient(135deg,#ec4899,#a855f7)",
                  minWidth: "120px"
                }}
              >
                {isCreatingBooking ? (
                  <span className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Booking...
                  </span>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Prompt Bar when no selection */
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto" style={{ zIndex: 40 }}>
          <div className="mx-4 mb-4 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-pink-100 px-5 py-4">
            <p className="text-center text-sm text-slate-500 font-medium">
              {!selectedService
                ? "Select a service to continue"
                : !selectedDate
                  ? "Choose your preferred date"
                  : "Pick an available time slot"}
            </p>
          </div>
        </div>
      )}

      {/* Portfolio Modal */}
      {showPortfolioModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowPortfolioModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-white w-full max-w-lg max-h-[80vh] rounded-t-3xl sm:rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-pink-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-pink-500" />
                Full Portfolio
              </h2>
              <button
                onClick={() => setShowPortfolioModal(false)}
                className="p-2 bg-pink-50 rounded-full hover:bg-pink-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 rotate-180 text-slate-600" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(80vh-80px)]">
              {portfolioItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {portfolioItems.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="aspect-square rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(236,72,153,0.1)] relative border border-pink-100/30"
                    >
                      <img
                        src={item.image_url}
                        alt={item.caption || `Portfolio ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {item.caption && (
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                          <p className="text-xs text-white font-medium line-clamp-2">{item.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No portfolio items yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
