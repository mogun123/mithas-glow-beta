import { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { Star, ChevronLeft, CheckCircle, AlertCircle, BadgeCheck, Clock, Calendar, MapPin, Instagram, Youtube, Share2, Image as ImageIcon } from "lucide-react";
import { useArtistProfile, useAvailableSlots, useCreateBooking } from "../../hooks/use-booking";
import { useAuthStore } from "../lib/store";
import { toast } from "sonner";
import { useArtistPortfolio } from "../hooks/useArtistPortfolio";

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
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in-artist-detail { animation: fade-in-artist-detail 0.55s cubic-bezier(0.22,1,0.36,1) both; }
.fade-in-artist-detail-d1 { animation-delay: 0.07s; }
.fade-in-artist-detail-d2 { animation-delay: 0.14s; }
.fade-in-artist-detail-d3 { animation-delay: 0.21s; }
.fade-in-artist-detail-d4 { animation-delay: 0.28s; }

@keyframes success-pop {
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}
.success-pop { animation: success-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
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
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [styleId, setStyleId] = useState("");
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);

  const authStore = useAuthStore();
  const userId = authStore.session?.user?.id;

  const { artist, services, loading: artistLoading } = useArtistProfile(artistId);
  const { slots, loading: slotsLoading } = useAvailableSlots(artistId, selectedDate);
  const { createBooking } = useCreateBooking();
  const { portfolioItems, socialLinks } = useArtistPortfolio();

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
      await createBooking(
        userId,
        artistId,
        service.id,
        service.title,
        service.price,
        selectedDate,
        selectedTime,
        ""
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-yellow-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading artist details...</p>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-yellow-50">
        <div className="text-center p-8">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Artist Not Found</h2>
          <p className="text-gray-500 mb-4">This artist profile is not available.</p>
          <button
            onClick={onNavigateBack}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (bookingSuccess) {
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
            <h2 className="text-2xl font-extrabold mb-2" style={{
              background: "linear-gradient(135deg,#ec4899,#a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              Booking Confirmed! 🎉
            </h2>
            <p className="text-gray-600 mb-8">
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
                className="nav-tap-btn px-6 py-4 bg-white text-gray-700 rounded-2xl font-bold border border-gray-200 shadow-md"
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

  const selectedServiceData = services.find((s) => s.id === selectedService);
  const instagramLink = socialLinks.find(link => link.platform === 'instagram');
  const youtubeLink = socialLinks.find(link => link.platform === 'youtube');
  const featuredPortfolio = portfolioItems.filter(item => item.is_cover || item.is_featured).slice(0, 5);

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-[#FAFAFA]" style={{ position: "relative", zIndex: 1 }}>
      {/* Hero Cover Section */}
      <div className="glass-header sticky top-0" style={{ zIndex: 30 }}>
        <Header onNavigateToProfile={onNavigateToProfile} />
      </div>

      <main className="flex-grow overflow-y-auto pb-40" style={{
        WebkitOverflowScrolling: "touch",
        display: "flex",
        flexDirection: "column"
      }}>
        {/* Hero Section with Overlapping Avatar */}
        <div className="relative">
          {/* Cover Gradient Background */}
          <div className="h-48 w-full bg-gradient-to-br from-pink-200 via-purple-200 to-pink-300 relative overflow-hidden">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-4 left-8 w-20 h-20 bg-white/20 rounded-full blur-xl"></div>
              <div className="absolute bottom-8 right-12 w-32 h-32 bg-purple-300/30 rounded-full blur-2xl"></div>
              <div className="absolute top-12 right-6 w-16 h-16 bg-pink-300/25 rounded-full blur-lg"></div>
            </div>
            
            {/* Share Button */}
            <button
              onClick={handleShareProfile}
              className="absolute top-4 right-4 p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all active:scale-95"
              aria-label="Share profile"
            >
              <Share2 className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          {/* Overlapping Avatar Card */}
          <div className="px-5" style={{ marginTop: "-64px" }}>
            <div className="bg-white rounded-3xl shadow-xl p-5 border border-white/50">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 p-1 shadow-lg">
                    <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center text-5xl">
                      {artist.avatar_url ? (
                        <img src={artist.avatar_url} alt={artist.shop_name || artist.full_name} className="w-full h-full object-cover" />
                      ) : (
                        "💄"
                      )}
                    </div>
                  </div>
                  {/* Verified Badge */}
                  {artist.seller_status === 'verified' && (
                    <div className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                      <BadgeCheck className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Artist Info */}
                <div className="flex-1 pt-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-xl font-black text-gray-900 truncate">
                      {artist.shop_name || artist.full_name}
                    </h1>
                  </div>
                  
                  {/* Rating Badge */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-yellow-50 rounded-full">
                      <Star className="w-4 h-4" fill="#facc15" color="#facc15" />
                      <span className="text-sm font-bold text-amber-800">
                        {artist.average_rating?.toFixed(1) || "N/A"}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">
                      ({artist.total_reviews || 0} reviews)
                    </span>
                  </div>

                  {/* Experience & Industry */}
                  <p className="text-xs font-semibold text-purple-600 mb-2">
                    {artist.experience || "Professional"} · {artist.industry || "Makeup Artist"}
                  </p>

                  {/* Location (if available) */}
                  {artist.location_city && (
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{artist.location_city}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio Section */}
              {artist.bio && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                    {artist.bio}
                  </p>
                </div>
              )}

              {/* Social Links */}
              {(instagramLink || youtubeLink) && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                  {instagramLink && (
                    <a
                      href={instagramLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl text-white shadow-md hover:shadow-lg transition-all active:scale-95"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {youtubeLink && (
                    <a
                      href={youtubeLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-red-500 rounded-xl text-white shadow-md hover:shadow-lg transition-all active:scale-95"
                    >
                      <Youtube className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Portfolio Gallery - Instagram Style */}
        {featuredPortfolio.length > 0 && (
          <div className="mt-5 px-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-extrabold text-gray-900">Portfolio</h2>
              <button
                onClick={() => setShowPortfolioModal(true)}
                className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors"
              >
                View All
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {featuredPortfolio.map((item, index) => (
                <div
                  key={item.id || index}
                  className="flex-shrink-0 w-36 h-44 rounded-2xl overflow-hidden shadow-md relative group"
                >
                  <img
                    src={item.image_url}
                    alt={item.caption || `Portfolio ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services Section */}
        <div className="mt-6 px-5">
          <h2 className="text-lg font-extrabold text-gray-900 mb-3">Select a Service</h2>
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
                      border: isSelected ? "2px solid #ec4899" : "1px solid rgba(229,231,235,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      boxShadow: isSelected ? "0 8px 24px rgba(236,72,153,0.15)" : "0 2px 8px rgba(0,0,0,0.04)"
                    }}
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-base font-bold text-gray-900 truncate">
                          {service.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Duration Pill */}
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full text-xs font-semibold text-gray-600">
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
                          : 'bg-gray-100 text-gray-400'
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
              <div className="py-12 px-6 text-center bg-white rounded-2xl border border-gray-100">
                <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No services available for this artist</p>
              </div>
            )}
          </div>
        </div>

        {/* Date Selection */}
        <div className="mt-6 px-5">
          <h2 className="text-lg font-extrabold text-gray-900 mb-3 flex items-center gap-2">
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
                    border: isSelected ? "none" : "1px solid rgba(229,231,235,0.8)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                    boxShadow: isSelected ? "0 8px 24px rgba(236,72,153,0.3)" : "0 2px 8px rgba(0,0,0,0.04)"
                  }}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    isSelected ? "text-white/90" : "text-gray-500"
                  }`}>
                    {dayName}
                  </span>
                  <span className={`text-2xl font-black ${
                    isSelected ? "text-white" : "text-gray-900"
                  }`}>
                    {dayNum}
                  </span>
                  <span className={`text-[10px] font-semibold ${
                    isSelected ? "text-white/90" : "text-gray-500"
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
            <h2 className="text-lg font-extrabold text-gray-900 mb-3">Available Time Slots</h2>
            {slotsLoading ? (
              <div className="py-8 text-center">
                <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading available slots...</p>
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
                        border: isSelected && !isUnavailable ? "none" : "1px solid rgba(229,231,235,0.8)",
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
              <div className="py-10 px-6 text-center bg-white rounded-2xl border border-gray-100">
                <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 font-medium">No available slots for this date</p>
              </div>
            )}
          </div>
        )}

        {/* Booking Summary - Only shown when all selections made */}
        {selectedService && selectedDate && selectedTime && (
          <div className="mt-6 px-5 fade-in-artist-detail-d4">
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-5 border border-pink-100">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-pink-500" />
                Booking Summary
              </h3>
              <div className="space-y-2.5 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-medium">Service</span>
                  <span className="text-sm font-bold text-gray-900">{selectedServiceData?.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-medium">Date</span>
                  <span className="text-sm font-bold text-gray-900">
                    {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-medium">Time</span>
                  <span className="text-sm font-bold text-gray-900">{selectedTime}</span>
                </div>
                <div className="pt-3 mt-3 border-t border-pink-200 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">Total</span>
                  <span className="text-2xl font-black bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    ₹{selectedServiceData?.price}
                  </span>
                </div>
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
          <div className="mx-4 mb-4 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              {/* Total Price */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total</span>
                <span className="text-2xl font-black bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  ₹{selectedServiceData?.price}
                </span>
              </div>
              
              {/* Confirm Button */}
              <button
                onClick={handleCreateBooking}
                disabled={isCreatingBooking}
                className="nav-tap-btn px-8 py-3.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                style={{
                  background: isCreatingBooking
                    ? "linear-gradient(135deg,#9CA3AF,#6B7280)"
                    : "linear-gradient(135deg,#ec4899,#a855f7)",
                  minWidth: "140px"
                }}
              >
                {isCreatingBooking ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Booking...
                  </span>
                ) : (
                  "Confirm Booking"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Prompt Bar when no selection */
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto" style={{ zIndex: 40 }}>
          <div className="mx-4 mb-4 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 px-5 py-4">
            <p className="text-center text-sm text-gray-500 font-medium">
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
            <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-gray-900">Full Portfolio</h2>
              <button
                onClick={() => setShowPortfolioModal(false)}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 rotate-180" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(80vh-80px)]">
              {portfolioItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {portfolioItems.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="aspect-square rounded-2xl overflow-hidden shadow-md relative"
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
                  <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No portfolio items yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
