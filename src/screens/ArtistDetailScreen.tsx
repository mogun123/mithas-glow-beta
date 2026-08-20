import React, { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { ChevronLeft, AlertCircle, CheckCircle, MapPin, Sparkles } from "lucide-react";
import { useArtistProfile } from "../../hooks/use-booking";
import { useAuthStore } from "../lib/store";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { useArtistPortfolio } from "../hooks/useArtistPortfolio";
import { useArtistReviews } from "../hooks/useArtistReviews";
import type { ArtistService } from "../../hooks/use-booking";

// Modular Artist Components
import { ArtistProfileHeader } from "../components/artist/ArtistProfileHeader";
import { ArtistPortfolioGallery } from "../components/artist/ArtistPortfolioGallery";
import { ArtistServicesList } from "../components/artist/ArtistServicesList";
import { ArtistReviewsList } from "../components/artist/ArtistReviewsList";
import { BookingFlowModal } from "../components/artist/BookingFlowModal";

type ArtistDetailScreenProps = {
  artistId: string;
  onNavigateToMirror: () => void;
  onNavigateToProfile: () => void;
  onNavigateHome: () => void;
  onNavigateBack: () => void;
  onNavigateToMyBookings: () => void;
  onNavigateToChat?: () => void;
};

export function ArtistDetailScreen({
  artistId,
  onNavigateToMirror,
  onNavigateToProfile,
  onNavigateHome,
  onNavigateBack,
  onNavigateToMyBookings,
  onNavigateToChat,
}: ArtistDetailScreenProps) {
  const [selectedService, setSelectedService] = useState<ArtistService | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [shopConfig, setShopConfig] = useState<any>(null);

  const authStore = useAuthStore();
  const userId = authStore.session?.user?.id;

  // Custom Hooks
  const { artist, services, loading: artistLoading } = useArtistProfile(artistId);
  const { portfolioItems, socialLinks } = useArtistPortfolio(artistId);
  const { reviews, summary: reviewSummary, loading: reviewsLoading } = useArtistReviews(artistId, 10);

  // Fetch real shop configuration (travel charges, policies, etc.) from Supabase
  useEffect(() => {
    if (!artistId) return;
    const fetchShopConfig = async () => {
      try {
        const { data } = await supabase
          .from("shops")
          .select("travel_charges, cancellation_policy, travel_policy, is_home_service, is_vacation")
          .eq("user_id", artistId)
          .maybeSingle();
        if (data) {
          setShopConfig(data);
        }
      } catch (err) {
        console.error("Error fetching shop config:", err);
      }
    };
    fetchShopConfig();
  }, [artistId]);

  const handleServiceSelect = (service: ArtistService) => {
    setSelectedService(service);
    setIsBookingModalOpen(true);
  };

  const handleShareProfile = async () => {
    const shareTitle = artist?.shop_name || artist?.full_name || "Mithas Glow Artist";
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `Check out ${shareTitle} on MITHAS GLOW!`,
          url: shareUrl,
        });
      } catch (err) {
        // Share cancelled
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Profile link copied to clipboard!");
    }
  };

  const handleMessageArtist = () => {
    if (onNavigateToChat) {
      onNavigateToChat();
    } else {
      toast.info("Navigating to Glow Chat...");
    }
  };

  if (artistLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf5ff]">
        <div className="text-center p-8">
          <div className="w-14 h-14 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-semibold text-sm">Loading artist profile...</p>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf5ff] p-4">
        <div className="text-center bg-white p-8 rounded-3xl shadow-sm border border-pink-100 max-w-sm w-full">
          <AlertCircle className="w-14 h-14 text-pink-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">Artist Profile Not Available</h2>
          <p className="text-xs text-slate-500 mb-6">This artist profile may be updating or unavailable right now.</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={onNavigateBack}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold text-xs shadow-md hover:opacity-95 transition-opacity"
            >
              Explore Other Artists
            </button>
            <button
              onClick={onNavigateHome}
              className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Booking Confirmation Success Screen
  if (bookingConfirmed) {
    return (
      <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-[#faf5ff]" style={{ position: "relative", zIndex: 1 }}>
        <div className="sticky top-0 z-40">
          <Header onNavigateToProfile={onNavigateToProfile} />
        </div>

        <main className="flex-grow overflow-y-auto pb-32 px-5 pt-12 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-6">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          
          <h2 className="text-2xl font-black text-slate-900 mb-2">
            Appointment Confirmed! 🎉
          </h2>
          <p className="text-xs text-slate-600 max-w-xs mb-8 leading-relaxed font-medium">
            Your appointment with <span className="font-bold text-slate-900">{artist.shop_name || artist.full_name}</span> has been scheduled successfully.
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={onNavigateToMyBookings}
              className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-2xl font-bold text-xs shadow-lg active:scale-95 transition-transform"
            >
              View My Bookings
            </button>
            <button
              onClick={onNavigateHome}
              className="w-full py-3.5 bg-white text-slate-700 rounded-2xl font-bold text-xs border border-pink-100 shadow-sm active:scale-95 transition-transform"
            >
              Back to Home
            </button>
          </div>
        </main>

        <div className="sticky bottom-0 z-40">
          <BottomNav
            onNavigateHome={onNavigateHome}
            onNavigateToMirror={onNavigateToMirror}
            onNavigateToProfile={onNavigateToProfile}
          />
        </div>
      </div>
    );
  }

  const realCancellationPolicy = shopConfig?.cancellation_policy || null;
  const realTravelCharge = shopConfig?.travel_charges ?? (shopConfig?.is_home_service ? 0 : 0);

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-[#fffbfd]" style={{ position: "relative", zIndex: 1 }}>
      {/* Top Header Bar */}
      <div className="sticky top-0 z-40">
        <Header onNavigateToProfile={onNavigateToProfile} />
      </div>

      {/* Main Profile Body */}
      <main className="flex-grow overflow-y-auto pb-32" style={{ WebkitOverflowScrolling: "touch" }}>
        {/* Back Navigation Bar */}
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <button
            onClick={onNavigateBack}
            className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-pink-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Discovery</span>
          </button>

          {shopConfig?.is_vacation && (
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
              Currently On Vacation
            </span>
          )}
        </div>

        {/* 1. Artist Header Hero */}
        <ArtistProfileHeader
          artist={artist}
          socialLinks={socialLinks}
          onMessageArtist={handleMessageArtist}
          onShareProfile={handleShareProfile}
        />

        {/* 2. Portfolio Gallery */}
        <ArtistPortfolioGallery portfolioItems={portfolioItems} />

        {/* 3. Category Grouped Services Menu */}
        <ArtistServicesList
          services={services}
          selectedServiceId={selectedService?.id || null}
          onSelectService={handleServiceSelect}
        />

        {/* 4. Customer Reviews */}
        <ArtistReviewsList
          reviews={reviews}
          summary={reviewSummary}
          loading={reviewsLoading}
        />

        {/* 5. Policies & Additional Information */}
        <div className="mt-4 px-4 pb-4">
          <div className="p-3 bg-white rounded-xl border border-pink-100/80 shadow-xs space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
              Service & Cancellation Policies
            </h3>
            
            <div className="text-[11px] text-slate-600 space-y-1.5 leading-snug">
              <p className="font-normal">
                • <span className="font-semibold text-slate-800">Cancellation:</span>{" "}
                {realCancellationPolicy || "Standard appointment cancellation policy applies. Contact artist for custom terms."}
              </p>
              {shopConfig?.is_home_service && (
                <p className="font-normal">
                  • <span className="font-semibold text-slate-800">Home Service:</span>{" "}
                  {shopConfig.travel_charges
                    ? `Travel charge of ₹${shopConfig.travel_charges.toLocaleString()} applies for home visits.`
                    : "Home service available upon request."}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Action Bar with Mobile Safe Area Inset */}
      <div
        className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-40 pb-safe"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-4 mb-2 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-pink-100 p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Starting From</p>
            <p className="text-base font-extrabold text-slate-900">
              {services.length > 0
                ? `₹${Math.min(...services.map(s => s.price)).toLocaleString()}`
                : "Custom Quote"}
            </p>
          </div>

          <button
            onClick={() => {
              if (services.length > 0 && !selectedService) {
                setSelectedService(services[0]);
              }
              setIsBookingModalOpen(true);
            }}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg active:scale-95 transition-all text-center"
          >
            Book Now
          </button>
        </div>
      </div>

      {/* Step-by-Step Mobile Booking Flow Sheet */}
      <BookingFlowModal
        artist={artist}
        services={services}
        initialService={selectedService}
        userId={userId || ""}
        travelChargeConfig={realTravelCharge}
        cancellationPolicyConfig={realCancellationPolicy}
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onBookingSuccess={() => {
          setIsBookingModalOpen(false);
          setBookingConfirmed(true);
        }}
      />
    </div>
  );
}
