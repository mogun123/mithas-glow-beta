import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Calendar, Clock, DollarSign, CheckCircle, XCircle, 
  AlertCircle, Filter
} from 'lucide-react';
import { toast } from 'sonner';

interface BookingWithDetails {
  id: string;
  customer_id: string;
  artist_id: string;
  service_name: string | null;
  total_price: number | null;
  booking_date: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  created_at: string;
  customer?: {
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
}

interface ProfessionalBookingsProps {
  artistId: string;
  onBack?: () => void;
}

export default function ProfessionalBookings({ artistId, onBack }: ProfessionalBookingsProps) {
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch bookings from Supabase
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from('bookings')
          .select(`
            *,
            customer:profiles!bookings_customer_id_fkey(full_name, phone, avatar_url)
          `)
          .eq('artist_id', artistId)
          .order('booking_date', { ascending: false })
          .order('booking_time', { ascending: false });

        if (bookingFilter !== 'all') {
          query = query.eq('status', bookingFilter);
        }

        const { data, error: queryError } = await query;

        if (queryError) throw queryError;
        setBookings(data || []);
      } catch (err: any) {
        console.error('ProfessionalBookings: Bookings fetch error:', err.message);
        toast.error('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [artistId, bookingFilter]);

  const handleAcceptBooking = useCallback(async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw error;
      toast.success('Booking accepted!');
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'confirmed' } : b));
    } catch (err: any) {
      toast.error('Failed to accept booking');
      console.error(err);
    }
  }, []);

  const handleDeclineBooking = useCallback(async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw error;
      toast.success('Booking declined');
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
    } catch (err: any) {
      toast.error('Failed to decline booking');
      console.error(err);
    }
  }, []);

  const handleCompleteBooking = useCallback(async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw error;
      toast.success('Booking completed!');
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'completed' } : b));
    } catch (err: any) {
      toast.error('Failed to complete booking');
      console.error(err);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 relative overflow-hidden">
      {/* Floating Ambient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />
        <div className="absolute top-3/4 left-1/4 w-80 h-80 bg-emerald-400/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/60 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Bookings</h1>
              <p className="text-xs text-slate-500 font-medium">{bookings.length} bookings found</p>
            </div>
            {onBack && (
              <button 
                onClick={onBack}
                className="px-4 py-2 bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl text-slate-700 font-semibold text-sm hover:bg-white/80 hover:scale-105 transition-all duration-300 shadow-sm"
              >
                Back
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 relative z-10">
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setBookingFilter(filter)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                bookingFilter === filter
                  ? 'bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-lg shadow-orange-500/30 hover:scale-105'
                  : 'bg-white/60 backdrop-blur-md border border-white/60 text-slate-600 hover:bg-white/80 hover:shadow-md'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-orange-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-500 font-medium">Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 mb-4 font-medium">No bookings found</p>
            <button 
              onClick={onBack}
              className="px-6 py-3 bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl text-slate-700 font-semibold hover:bg-white/80 hover:shadow-md transition-all duration-300"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="group relative overflow-hidden bg-white/60 backdrop-blur-xl rounded-3xl p-5 border border-white/80 shadow-[0_8px_32px_0_rgba(255,165,0,0.05)] hover:shadow-[0_12px_40px_0_rgba(255,165,0,0.1)] hover:scale-[1.02] transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400/20 to-amber-400/20 border border-white/60 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                    {booking.customer?.avatar_url ? (
                      <img src={booking.customer.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">👤</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-slate-900 truncate">
                        {booking.customer?.full_name || "Customer"}
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                          booking.status === "pending" ? "bg-orange-400/20 text-orange-600 border-orange-400/30" :
                          booking.status === "confirmed" ? "bg-blue-400/20 text-blue-600 border-blue-400/30" :
                          booking.status === "completed" ? "bg-emerald-400/20 text-emerald-600 border-emerald-400/30" :
                          "bg-slate-400/20 text-slate-600 border-slate-400/30"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600 font-medium mb-2">{booking.service_name || "Service"}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-slate-500 font-bold flex-wrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {booking.booking_time}
                      </div>
                      {booking.total_price && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ₹{booking.total_price.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  {booking.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleAcceptBooking(booking.id)}
                        className="flex-1 py-2.5 bg-gradient-to-r from-emerald-400 to-green-500 text-white font-bold rounded-full text-xs hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" /> Accept
                      </button>
                      <button
                        onClick={() => handleDeclineBooking(booking.id)}
                        className="flex-1 py-2.5 bg-white/60 backdrop-blur-md border border-red-400/30 text-red-500 font-bold rounded-full text-xs hover:bg-red-400/10 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-4 h-4" /> Decline
                      </button>
                    </>
                  )}
                  {booking.status === "confirmed" && (
                    <button
                      onClick={() => handleCompleteBooking(booking.id)}
                      className="flex-1 py-2.5 bg-gradient-to-r from-orange-400 to-amber-500 text-white font-bold rounded-full text-xs hover:shadow-lg hover:shadow-orange-500/30 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" /> Complete
                    </button>
                  )}
                  {booking.status === "completed" && (
                    <span className="flex-1 py-2.5 bg-emerald-400/20 text-emerald-600 font-bold rounded-full text-xs text-center border border-emerald-400/30">
                      ✓ Completed
                    </span>
                  )}
                  {booking.status === "cancelled" && (
                    <span className="flex-1 py-2.5 bg-slate-400/20 text-slate-500 font-bold rounded-full text-xs text-center border border-slate-400/30">
                      ✕ Cancelled
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
