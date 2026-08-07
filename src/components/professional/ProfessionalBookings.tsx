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
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-gray-900">Bookings</h1>
              <p className="text-xs text-gray-500">{bookings.length} bookings found</p>
            </div>
            {onBack && (
              <Button onClick={onBack} variant="outline" size="sm">
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
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                bookingFilter === filter
                  ? 'bg-[#D4AF37] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
            <p className="text-sm font-semibold text-rose-700">{errorMessage}</p>
            <Button variant="outline" className="mt-4" onClick={() => void loadBookings(bookingFilter)}>
              Retry
            </Button>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="relative w-12 h-12 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-[#D4AF37] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-500">Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">No bookings found</p>
            <Button variant="outline" onClick={onBack}>
              Return to Dashboard
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <Card
                key={booking.id}
                className="group relative overflow-hidden hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-gray-200 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                      {booking.customer?.avatar_url ? (
                        <img src={booking.customer.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">👤</span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-black text-gray-900 truncate">
                          {booking.customer?.full_name || "Customer"}
                        </h4>
                        <Badge
                          className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider border ${
                            booking.status === "pending" ? "bg-orange-500/20 text-orange-600 border-orange-500/30" :
                            booking.status === "confirmed" ? "bg-blue-500/20 text-blue-600 border-blue-500/30" :
                            booking.status === "completed" ? "bg-green-500/20 text-green-600 border-green-500/30" :
                            "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                        >
                          {booking.status}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 font-medium mb-2">{booking.service_name || "Service"}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500 font-bold flex-wrap">
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
                          className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-xl text-xs hover:shadow-lg hover:shadow-green-500/30 transition-all flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" /> Accept
                        </button>
                        <button
                          onClick={() => handleDeclineBooking(booking.id)}
                          className="flex-1 py-2 bg-white/10 border border-red-500/30 text-red-600 font-black rounded-xl text-xs hover:bg-red-500/20 transition-all flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-4 h-4" /> Decline
                        </button>
                      </>
                    )}
                    {booking.status === "confirmed" && (
                      <button
                        onClick={() => handleCompleteBooking(booking.id)}
                        className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black rounded-xl text-xs hover:shadow-lg hover:shadow-pink-500/30 transition-all flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" /> Complete
                      </button>
                    )}
                    {booking.status === "completed" && (
                      <span className="flex-1 py-2 bg-green-500/20 text-green-600 font-black rounded-xl text-xs text-center border border-green-500/30">
                        ✓ Completed
                      </span>
                    )}
                    {booking.status === "cancelled" && (
                      <span className="flex-1 py-2 bg-gray-100 text-gray-500 font-black rounded-xl text-xs text-center border border-gray-200">
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
