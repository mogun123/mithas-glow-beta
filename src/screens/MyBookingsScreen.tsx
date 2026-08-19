import React, { useState } from 'react';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { 
  Calendar, Clock, Tag, Wallet, Eye, XCircle, RotateCcw, 
  CheckCircle, AlertCircle, ArrowLeft, ArrowRight, User, Sparkles 
} from 'lucide-react';
import { useMyBookings, useCancelBooking } from '../../hooks/use-booking';
import type { Booking } from '../../hooks/use-booking';
import { toast } from 'sonner';

interface MyBookingsScreenProps {
  userId: string;
  onNavigateToArtistProfile?: (artistId: string) => void;
  onBack?: () => void;
  onNavigateHome?: () => void;
  onNavigateToMirror?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToProducts?: () => void;
  onNavigateToCoach?: () => void;
  onNavigateToBooking?: () => void;
  onNavigateToChat?: () => void;
}

type TabType = 'upcoming' | 'completed' | 'cancelled';

export const MyBookingsScreen: React.FC<MyBookingsScreenProps> = ({
  userId,
  onNavigateToArtistProfile,
  onBack,
  onNavigateHome,
  onNavigateToMirror,
  onNavigateToProfile,
  onNavigateToProducts,
  onNavigateToCoach,
  onNavigateToBooking,
  onNavigateToChat,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const { bookings, loading, error } = useMyBookings(userId);
  const { cancelBooking, loading: cancelling } = useCancelBooking();

  // Filter bookings by status tab
  const filteredBookings = (bookings || []).filter((booking) => {
    if (activeTab === 'upcoming') {
      return ['pending', 'confirmed'].includes(booking.status);
    } else if (activeTab === 'completed') {
      return booking.status === 'completed';
    } else {
      return booking.status === 'cancelled' || booking.status === 'no_show';
    }
  });

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await cancelBooking(bookingId);
      toast.success("Booking cancelled successfully.");
    } catch (err: any) {
      console.error('Failed to cancel booking:', err);
      toast.error(err?.message || "Failed to cancel booking");
    }
  };

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            Pending Confirmation
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3" />
            Confirmed
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-[#faf5ff]">
        <div className="sticky top-0 z-30">
          <Header onNavigateToProfile={onNavigateToProfile} />
        </div>
        <div className="flex-grow flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-slate-600">Loading your bookings...</p>
          </div>
        </div>
        <div className="sticky bottom-0 z-30">
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

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-[#fffbfd]" style={{ position: "relative", zIndex: 1 }}>
      {/* Top Header */}
      <div className="sticky top-0 z-40">
        <Header onNavigateToProfile={onNavigateToProfile} />
      </div>

      <main className="flex-grow overflow-y-auto pb-32 px-4 pt-4" style={{ WebkitOverflowScrolling: "touch" }}>
        {/* Title Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-white border border-pink-100 shadow-sm hover:bg-pink-50 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">My Bookings</h1>
              <p className="text-xs text-slate-500 font-medium">Track and manage your appointments</p>
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl mb-5">
          {(['upcoming', 'completed', 'cancelled'] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold capitalize transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Bookings List */}
        {filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const artistObj = booking.artist as any;
              const serviceObj = booking.service as any;
              const artistName = artistObj?.shop_name || artistObj?.full_name || artistObj?.username || 'Makeup Artist';
              const serviceName = booking.service_name || serviceObj?.title || 'Beauty Service';
              const price = booking.total_price || serviceObj?.price || 0;

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-2xl p-4 border border-pink-100 shadow-[0_4px_20px_rgba(236,72,153,0.06)] transition-all"
                >
                  {/* Header Row: Artist Info & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-pink-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 p-0.5 flex-shrink-0">
                        <div className="w-full h-full rounded-[14px] overflow-hidden bg-white flex items-center justify-center">
                          {artistObj?.avatar_url ? (
                            <img src={artistObj.avatar_url} alt={artistName} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-6 h-6 text-pink-400" />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{artistName}</h3>
                        <p className="text-xs text-pink-600 font-semibold truncate">{serviceName}</p>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {getStatusBadge(booking.status)}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-3 bg-pink-50/40 rounded-xl p-3 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-pink-500" />
                      <span>
                        {new Date(booking.booking_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <Clock className="w-3.5 h-3.5 text-purple-500" />
                      <span>{booking.booking_time}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <Tag className="w-3.5 h-3.5 text-pink-500" />
                      <span className="font-bold text-slate-900">₹{price.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                      <span className={`font-semibold ${
                        booking.payment_status === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {booking.payment_status === 'paid' ? 'Paid' : 'Payment Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {onNavigateToArtistProfile && (
                      <button
                        onClick={() => onNavigateToArtistProfile(booking.artist_id)}
                        className="flex-1 py-2 px-3 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Artist
                      </button>
                    )}

                    {['pending', 'confirmed'].includes(booking.status) && (
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={cancelling}
                        className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    )}

                    {booking.status === 'completed' && onNavigateToArtistProfile && (
                      <button
                        onClick={() => onNavigateToArtistProfile(booking.artist_id)}
                        className="flex-1 py-2 px-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Rebook
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="py-16 px-6 text-center bg-white rounded-3xl border border-pink-100 shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-pink-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {activeTab === 'upcoming'
                ? 'No upcoming bookings'
                : activeTab === 'completed'
                ? 'No completed bookings'
                : 'No cancelled bookings'}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mb-6 leading-relaxed">
              {activeTab === 'upcoming'
                ? 'Discover top makeup artists and book your next glam session!'
                : activeTab === 'completed'
                ? 'Your completed appointments will appear here.'
                : 'Your cancelled bookings will be listed here.'}
            </p>
            {activeTab === 'upcoming' && onNavigateToBooking && (
              <button
                onClick={onNavigateToBooking}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 active:scale-95 transition-transform"
              >
                <span>Browse Artists</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
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
};
