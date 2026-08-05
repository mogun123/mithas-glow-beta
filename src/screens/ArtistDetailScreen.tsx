import { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { Star, ChevronLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useArtistProfile, useAvailableSlots, useCreateBooking } from "../../hooks/use-booking";
import { useAuthStore } from "../lib/store";
import { toast } from "sonner";

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

  const authStore = useAuthStore();
  const userId = authStore.session?.user?.id;

  const { artist, services, loading: artistLoading } = useArtistProfile(artistId);
  const { slots, loading: slotsLoading } = useAvailableSlots(artistId, selectedDate);
  const { createBooking } = useCreateBooking();

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
        {/* Back Button */}
        <button
          onClick={onNavigateBack}
          className="fade-in-artist-detail nav-tap-btn flex items-center gap-2 text-gray-600 font-semibold"
          style={{
            padding: "10px 14px",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.8)",
            border: "none",
            cursor: "pointer"
          }}
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        {/* Artist Header */}
        <div className="fade-in-artist-detail-d1" style={{
          padding: "20px",
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(20px)",
          borderRadius: "22px",
          border: "1px solid rgba(148,163,184,0.1)",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 4px 20px rgba(15,23,42,0.05)"
        }}>
          <div style={{
            width: "72px",
            height: "72px",
            borderRadius: "18px",
            background: "linear-gradient(135deg, rgba(236,72,153,0.1), rgba(168,85,247,0.12))",
            border: "1px solid rgba(168,85,247,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "36px",
            flexShrink: 0,
            overflow: "hidden"
          }}>
            {artist.avatar_url ? (
              <img src={artist.avatar_url} alt={artist.shop_name || artist.full_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              "💄"
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="text-xl font-extrabold mb-1" style={{ color: "#1f2937", margin: 0 }}>
              {artist.shop_name || artist.full_name}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Star className="w-4 h-4" fill="#facc15" color="#facc15" />
              <span className="text-sm font-bold" style={{ color: "#92400e" }}>
                {artist.average_rating?.toFixed(1) || "N/A"}
              </span>
              <span className="text-xs" style={{ color: "#6b7280" }}>
                ({artist.total_reviews || 0} reviews)
              </span>
            </div>
            <p className="text-xs font-semibold" style={{ color: "#a855f7", margin: 0 }}>
              {artist.experience || "Professional"} · {artist.industry || "Makeup Artist"}
            </p>
          </div>
        </div>

        {/* Services Section */}
        <div className="fade-in-artist-detail-d2">
          <h2 className="text-lg font-extrabold mb-3" style={{ color: "#1f2937" }}>
            Select a Service
          </h2>
          <div className="flex flex-col gap-3">
            {services.length > 0 ? (
              services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className="nav-tap-btn"
                  style={{
                    padding: "16px",
                    background: selectedService === service.id
                      ? "linear-gradient(135deg, rgba(236,72,153,0.1), rgba(168,85,247,0.12))"
                      : "rgba(255,255,255,0.88)",
                    backdropFilter: "blur(20px)",
                    borderRadius: "18px",
                    border: selectedService === service.id
                      ? "2px solid #ec4899"
                      : "1px solid rgba(148,163,184,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ textAlign: "left" }}>
                    <h3 className="text-sm font-bold" style={{ color: "#1f2937", margin: "0 0 4px" }}>
                      {service.title}
                    </h3>
                    <p className="text-xs" style={{ color: "#6b7280", margin: 0 }}>
                      {service.duration_minutes} mins · {service.category.replace("_", " ")}
                    </p>
                  </div>
                  <span className="text-sm font-extrabold" style={{ color: "#ec4899" }}>
                    ₹{service.price}
                  </span>
                </button>
              ))
            ) : (
              <div style={{ padding: "32px", textAlign: "center", color: "#6b7280", background: "rgba(255,255,255,0.8)", borderRadius: "18px" }}>
                No services available for this artist
              </div>
            )}
          </div>
        </div>

        {/* Date Selection */}
        <div className="fade-in-artist-detail-d3">
          <h2 className="text-lg font-extrabold mb-3" style={{ color: "#1f2937" }}>
            Select a Date
          </h2>
          <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "8px" }}>
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
                  className="nav-tap-btn"
                  style={{
                    minWidth: "72px",
                    padding: "14px 10px",
                    background: isSelected
                      ? "linear-gradient(135deg,#ec4899,#a855f7)"
                      : "rgba(255,255,255,0.88)",
                    borderRadius: "16px",
                    border: isSelected ? "none" : "1px solid rgba(148,163,184,0.1)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    flexShrink: 0
                  }}
                >
                  <span className="text-xs font-semibold" style={{ color: isSelected ? "#fff" : "#6b7280" }}>
                    {dayName}
                  </span>
                  <span className="text-lg font-extrabold" style={{ color: isSelected ? "#fff" : "#1f2937" }}>
                    {dayNum}
                  </span>
                  <span className="text-xs" style={{ color: isSelected ? "#fff" : "#6b7280" }}>
                    {month}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Slots */}
        {selectedDate && (
          <div className="fade-in-artist-detail-d4">
            <h2 className="text-lg font-extrabold mb-3" style={{ color: "#1f2937" }}>
              Available Time Slots
            </h2>
            {slotsLoading ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
                Loading available slots...
              </div>
            ) : slots.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                {slots.map((slot) => {
                  const isSelected = selectedTime === slot.time;
                  return (
                    <button
                      key={slot.time}
                      onClick={() => setSelectedTime(slot.time)}
                      disabled={!slot.available}
                      className="nav-tap-btn"
                      style={{
                        padding: "12px 8px",
                        background: !slot.available
                          ? "rgba(148,163,184,0.2)"
                          : isSelected
                          ? "linear-gradient(135deg,#ec4899,#a855f7)"
                          : "rgba(255,255,255,0.88)",
                        borderRadius: "12px",
                        border: isSelected && slot.available ? "none" : "1px solid rgba(148,163,184,0.1)",
                        color: !slot.available ? "#9ca3af" : isSelected ? "#fff" : "#1f2937",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: slot.available ? "pointer" : "not-allowed",
                        opacity: slot.available ? 1 : 0.6,
                        transition: "all 0.2s ease"
                      }}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: "32px", textAlign: "center", color: "#6b7280", background: "rgba(255,255,255,0.8)", borderRadius: "18px" }}>
                No available slots for this date
              </div>
            )}
          </div>
        )}

        {/* Booking Summary & Confirm Button */}
        {selectedService && selectedDate && selectedTime && (
          <div className="fade-in-artist-detail-d4" style={{
            padding: "20px",
            background: "linear-gradient(135deg, rgba(236,72,153,0.05), rgba(168,85,247,0.08))",
            borderRadius: "22px",
            border: "1px solid rgba(236,72,153,0.2)",
            marginTop: "8px"
          }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: "#1f2937" }}>
              Booking Summary
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="text-xs" style={{ color: "#6b7280" }}>Service</span>
                <span className="text-sm font-bold" style={{ color: "#1f2937" }}>{selectedServiceData?.title}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="text-xs" style={{ color: "#6b7280" }}>Date</span>
                <span className="text-sm font-bold" style={{ color: "#1f2937" }}>{new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="text-xs" style={{ color: "#6b7280" }}>Time</span>
                <span className="text-sm font-bold" style={{ color: "#1f2937" }}>{selectedTime}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid rgba(236,72,153,0.2)" }}>
                <span className="text-sm font-bold" style={{ color: "#1f2937" }}>Total</span>
                <span className="text-lg font-extrabold" style={{ color: "#ec4899" }}>₹{selectedServiceData?.price}</span>
              </div>
            </div>
            <button
              onClick={handleCreateBooking}
              disabled={isCreatingBooking}
              className="nav-tap-btn w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-2xl font-extrabold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isCreatingBooking
                  ? "linear-gradient(135deg,#9ca3af,#6b7280)"
                  : "linear-gradient(135deg,#ec4899,#a855f7)"
              }}
            >
              {isCreatingBooking ? "Creating Booking..." : "Confirm Booking"}
            </button>
          </div>
        )}
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
