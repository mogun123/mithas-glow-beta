import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Calendar, Clock, DollarSign, CheckCircle, XCircle, 
  AlertCircle, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadBookings = useCallback(async (filter: typeof bookingFilter = bookingFilter) => {
    try {
      setLoading(true);
      setErrorMessage(null);

      let query = supabase
        .from('bookings')
        .select(`
          *,
          customer:profiles!bookings_customer_id_fkey(full_name, phone, avatar_url)
        `)
        .eq('artist_id', artistId)
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

      setBookings(data || []);
    } catch (err: any) {
      const message = err?.message || 'Failed to load bookings';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [artistId, bookingFilter]);

  useEffect(() => {
    void loadBookings(bookingFilter);
  }, [artistId, bookingFilter, loadBookings]);

  const handleAcceptBooking = useCallback(async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw error;
      await loadBookings(bookingFilter);
      toast.success('Booking accepted!');
    } catch (err: any) {
      const message = err?.message || 'Failed to accept booking';
      setErrorMessage(message);
      toast.error(message);
    }
  }, [bookingFilter, loadBookings]);

  const handleDeclineBooking = useCallback(async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw error;
      await loadBookings(bookingFilter);
      toast.success('Booking declined');
    } catch (err: any) {
      const message = err?.message || 'Failed to decline booking';
      setErrorMessage(message);
      toast.error(message);
    }
  }, [bookingFilter, loadBookings]);

  const handleCompleteBooking = useCallback(async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw error;
      await loadBookings(bookingFilter);
      toast.success('Booking completed!');
    } catch (err: any) {
      const message = err?.message || 'Failed to complete booking';
      setErrorMessage(message);
      toast.error(message);
    }
  }, [bookingFilter, loadBookings]);

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-pink-50/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-black text-slate-900">Bookings</h1>
              <p className="text-[10px] text-pink-600/70">{bookings.length} bookings found</p>
            </div>
            {onBack && (
              <Button onClick={onBack} variant="outline" size="sm" className="border-pink-200 text-pink-200 hover:bg-pink-100">
                Back
              </Button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setBookingFilter(filter)}
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                bookingFilter === filter
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-200'
                  : 'bg-pink-50/50 text-pink-600/70 hover:bg-pink-50/80 border border-pink-100'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {errorMessage ? (
          <div className="rounded-2xl border border-pink-200 bg-pink-50/70 p-6 text-center">
            <p className="text-sm font-semibold text-pink-600">{errorMessage}</p>
            <Button variant="outline" className="mt-4 border-pink-200 text-pink-200 hover:bg-pink-100" onClick={() => void loadBookings(bookingFilter)}>
              Retry
            </Button>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="relative w-12 h-12 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-[#2d1b4e] rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-pink-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-pink-600/70">Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-pink-200" />
            <p className="text-pink-600/70 mb-4">No bookings found</p>
            <Button variant="outline" onClick={onBack} className="border-pink-200 text-pink-200 hover:bg-pink-100">
              Return to Dashboard
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <Card
                key={booking.id}
                className="group relative overflow-hidden bg-pink-50/90 border-pink-100 hover:border-pink-500/40 transition-all"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 border border-pink-200 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                      {booking.customer?.avatar_url ? (
                        <img src={booking.customer.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-pink-600">👤</span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-black text-slate-900 truncate">
                          {booking.customer?.full_name || "Customer"}
                        </h4>
                        <Badge
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                            booking.status === "pending" ? "bg-pink-100 text-pink-600 border-pink-200" :
                            booking.status === "confirmed" ? "bg-purple-100 text-purple-600 border-purple-200" :
                            booking.status === "completed" ? "bg-lavender-500/20 text-lavender-300 border-lavender-500/30" :
                            "bg-pink-50/50 text-pink-600/70 border-pink-100"
                          }`}
                        >
                          {booking.status}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-pink-200/80 font-medium mb-2">{booking.service_name || "Service"}</p>
                      
                      <div className="flex items-center gap-4 text-[10px] text-pink-600/70 font-bold flex-wrap">
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
                          className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-lavender-600 text-white font-black rounded-xl text-[10px] hover:shadow-lg hover:shadow-purple-200 transition-all flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" /> Accept
                        </button>
                        <button
                          onClick={() => handleDeclineBooking(booking.id)}
                          className="flex-1 py-2 bg-white/50 border border-pink-200 text-pink-600 font-black rounded-xl text-[10px] hover:bg-pink-100 transition-all flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-4 h-4" /> Decline
                        </button>
                      </>
                    )}
                    {booking.status === "confirmed" && (
                      <button
                        onClick={() => handleCompleteBooking(booking.id)}
                        className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black rounded-xl text-[10px] hover:shadow-lg hover:shadow-pink-200 transition-all flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" /> Complete
                      </button>
                    )}
                    {booking.status === "completed" && (
                      <span className="flex-1 py-2 bg-lavender-500/20 text-lavender-300 font-black rounded-xl text-[10px] text-center border border-lavender-500/30">
                        ✓ Completed
                      </span>
                    )}
                    {booking.status === "cancelled" && (
                      <span className="flex-1 py-2 bg-pink-50/50 text-pink-600/70 font-black rounded-xl text-[10px] text-center border border-pink-100">
                        ✕ Cancelled
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
