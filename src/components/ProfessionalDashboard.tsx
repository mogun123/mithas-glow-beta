import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import { 
  Calendar, Clock, DollarSign, Star, Users, TrendingUp, 
  CheckCircle, XCircle, AlertCircle, Briefcase, MessageSquare,
  ChevronRight, Plus, Edit2, Trash2, Camera, MapPin, Phone, Mail
} from 'lucide-react';
import { toast } from 'sonner';

interface ProfessionalProfile {
  id: string;
  email: string;
  full_name: string | null;
  shop_name: string | null;
  bio: string | null;
  experience: string | null;
  city: string | null;
  avatar_url: string | null;
  account_type: string | null;
  industry: string | null;
  seller_status: string | null;
  is_active: boolean;
  portfolio_link: string | null;
  operating_hours: string | null;
  phone: string | null;
}

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

interface DashboardStats {
  todayBookings: number;
  pendingRequests: number;
  upcomingAppointments: number;
  completedToday: number;
  todaysEarnings: number;
  monthlyEarnings: number;
  averageRating: number;
  totalReviews: number;
}

interface ProfessionalDashboardProps {
  onNavigateHome?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToMirror?: () => void;
}

export default function ProfessionalDashboard({ 
  onNavigateHome, 
  onNavigateToProfile,
  onNavigateToMirror 
}: ProfessionalDashboardProps) {
  const authStore = useAuthStore();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProfessional, setIsProfessional] = useState(false);

  // Fetch professional status and profile from Supabase Auth
  useEffect(() => {
    const checkProfessionalStatus = async () => {
      try {
        console.log('ProfessionalDashboard: Checking professional status...');
        
        // Get current user from Supabase Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          console.error('ProfessionalDashboard: No authenticated user', authError);
          toast.error('Please login to access your dashboard');
          return;
        }

        console.log('ProfessionalDashboard: User authenticated:', user.id);

        // Query profiles table for professional status
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .eq('account_type', 'professional')
          .eq('industry', 'makeup_artist')
          .single();

        if (profileError) {
          console.error('ProfessionalDashboard: Profile fetch error:', profileError.message);
          setIsProfessional(false);
          return;
        }

        if (profileData) {
          console.log('ProfessionalDashboard: Professional profile found:', profileData);
          setIsProfessional(true);
          setProfile(profileData);
          
          // Update auth store profile
          authStore.setProfile(profileData);
        } else {
          console.warn('ProfessionalDashboard: User is not a professional makeup artist');
          setIsProfessional(false);
        }
      } catch (error: any) {
        console.error('ProfessionalDashboard: Error checking status:', error.message);
        setIsProfessional(false);
      } finally {
        setLoading(false);
      }
    };

    checkProfessionalStatus();
  }, []);

  // Fetch dashboard stats
  useEffect(() => {
    if (!profile?.id) return;

    const fetchStats = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        // Today's bookings
        const { data: todayBookings } = await supabase
          .from('bookings')
          .select('*', { count: 'exact' })
          .eq('artist_id', profile.id)
          .eq('booking_date', today);

        // Pending requests
        const { data: pending } = await supabase
          .from('bookings')
          .select('*', { count: 'exact' })
          .eq('artist_id', profile.id)
          .eq('status', 'pending');

        // Upcoming appointments
        const { data: upcoming } = await supabase
          .from('bookings')
          .select('*', { count: 'exact' })
          .eq('artist_id', profile.id)
          .in('status', ['confirmed', 'pending'])
          .gte('booking_date', today);

        // Completed today
        const { data: completed } = await supabase
          .from('bookings')
          .select('*', { count: 'exact' })
          .eq('artist_id', profile.id)
          .eq('status', 'completed')
          .eq('booking_date', today);

        // Today's earnings
        const { data: earningsData } = await supabase
          .from('bookings')
          .select('total_price')
          .eq('artist_id', profile.id)
          .eq('status', 'completed')
          .eq('booking_date', today);

        // Monthly earnings
        const { data: monthlyData } = await supabase
          .from('bookings')
          .select('total_price')
          .eq('artist_id', profile.id)
          .eq('status', 'completed')
          .gte('booking_date', firstOfMonth);

        // Reviews
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('artist_id', profile.id);

        const totalRevenue = earningsData?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
        const monthlyRevenue = monthlyData?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
        const avgRating = reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

        setStats({
          todayBookings: todayBookings?.length || 0,
          pendingRequests: pending?.length || 0,
          upcomingAppointments: upcoming?.length || 0,
          completedToday: completed?.length || 0,
          todaysEarnings: totalRevenue,
          monthlyEarnings: monthlyRevenue,
          averageRating: parseFloat(avgRating.toFixed(1)),
          totalReviews: reviews?.length || 0,
        });
      } catch (err: any) {
        console.error('ProfessionalDashboard: Stats fetch error:', err.message);
      }
    };

    fetchStats();
  }, [profile?.id]);

  // Fetch bookings
  useEffect(() => {
    if (!profile?.id) return;

    const fetchBookings = async () => {
      try {
        let query = supabase
          .from('bookings')
          .select(`
            *,
            customer:profiles!bookings_customer_id_fkey(full_name, phone, avatar_url)
          `)
          .eq('artist_id', profile.id)
          .order('booking_date', { ascending: false })
          .order('booking_time', { ascending: false });

        if (activeTab !== 'all') {
          query = query.eq('status', activeTab);
        }

        const { data, error: queryError } = await query;

        if (queryError) throw queryError;
        setBookings(data || []);
      } catch (err: any) {
        console.error('ProfessionalDashboard: Bookings fetch error:', err.message);
      }
    };

    fetchBookings();
  }, [profile?.id, activeTab]);

  const handleAcceptBooking = async (bookingId: string) => {
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
  };

  const handleDeclineBooking = async (bookingId: string) => {
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
  };

  const handleCompleteBooking = async (bookingId: string) => {
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
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-yellow-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isProfessional || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-yellow-50">
        <div className="text-center max-w-md p-8">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">You don't have access to the professional dashboard.</p>
          <button
            onClick={onNavigateHome}
            className="px-6 py-3 bg-pink-500 text-white font-black rounded-2xl shadow-lg hover:bg-pink-600 transition-all"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-yellow-50 pb-24">
      {/* Header */}
      <header className="glass-header sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-gray-900 italic tracking-tighter">MITHAS GLOW</h1>
              <p className="text-xs text-gray-500">Professional Dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onNavigateToProfile}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center hover:scale-105 transition-transform"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <Users className="w-5 h-5 text-pink-500" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6">
        {/* Welcome Section */}
        <div className="mb-6">
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-pink-100/50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-2xl">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  "👤"
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-black text-gray-900">
                  Welcome back, {profile?.shop_name || profile?.full_name || "Professional"}
                </h2>
                <p className="text-sm text-gray-600">{profile?.industry?.replace('_', ' ').toUpperCase()}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  {profile?.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {profile.city}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-lg shadow-pink-100/30">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-pink-500" />
              <span className="text-2xl font-black">{stats?.todayBookings || 0}</span>
            </div>
            <p className="text-xs text-gray-600 font-medium">Today's Bookings</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg shadow-orange-100/30">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-6 h-6 text-orange-500" />
              <span className="text-2xl font-black">{stats?.pendingRequests || 0}</span>
            </div>
            <p className="text-xs text-gray-600 font-medium">Pending Requests</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg shadow-green-100/30">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6 text-green-500" />
              <span className="text-lg font-black">₹{stats?.todaysEarnings?.toLocaleString() || 0}</span>
            </div>
            <p className="text-xs text-gray-600 font-medium">Today's Earnings</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg shadow-purple-100/30">
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-6 h-6 text-purple-500" />
              <span className="text-2xl font-black">{stats?.averageRating || 0}</span>
            </div>
            <p className="text-xs text-gray-600 font-medium">Average Rating</p>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-3 shadow-lg text-center">
            <p className="text-xl font-black text-gray-900">{stats?.upcomingAppointments || 0}</p>
            <p className="text-xs text-gray-600 font-medium">Upcoming</p>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-lg text-center">
            <p className="text-xl font-black text-gray-900">{stats?.completedToday || 0}</p>
            <p className="text-xs text-gray-600 font-medium">Completed</p>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-lg text-center">
            <p className="text-xl font-black text-gray-900">{stats?.totalReviews || 0}</p>
            <p className="text-xs text-gray-600 font-medium">Reviews</p>
          </div>
        </div>

        {/* Bookings Section */}
        <div className="bg-white rounded-3xl shadow-xl shadow-pink-100/50 overflow-hidden mb-6">
          <div className="p-6 border-b border-pink-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-gray-900">Booking Management</h3>
              <span className="text-xs font-bold text-pink-500 bg-pink-50 px-3 py-1 rounded-full">
                {bookings.length} bookings
              </span>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${
                    activeTab === tab
                      ? 'bg-pink-500 text-white shadow-lg shadow-pink-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-4">
            {bookings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="font-medium">No bookings found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="border border-pink-100 rounded-2xl p-4 hover:bg-pink-50/30 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-xl flex-shrink-0">
                        {booking.customer?.avatar_url ? (
                          <img src={booking.customer.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          "👤"
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-black text-gray-900 truncate">
                            {booking.customer?.full_name || "Customer"}
                          </h4>
                          <span
                            className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider ${
                              booking.status === "pending" ? "bg-orange-100 text-orange-700" :
                              booking.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                              booking.status === "completed" ? "bg-green-100 text-green-700" :
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 font-medium mb-2">{booking.service_name || "Service"}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500 font-bold">
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
                            className="flex-1 py-2 bg-green-500 text-white font-black rounded-xl text-xs hover:bg-green-600 transition-all flex items-center justify-center gap-1"
                          >
                            <CheckCircle className="w-4 h-4" /> Accept
                          </button>
                          <button
                            onClick={() => handleDeclineBooking(booking.id)}
                            className="flex-1 py-2 bg-white border-2 border-red-200 text-red-500 font-black rounded-xl text-xs hover:bg-red-50 transition-all flex items-center justify-center gap-1"
                          >
                            <XCircle className="w-4 h-4" /> Decline
                          </button>
                        </>
                      )}
                      {booking.status === "confirmed" && (
                        <button
                          onClick={() => handleCompleteBooking(booking.id)}
                          className="flex-1 py-2 bg-pink-500 text-white font-black rounded-xl text-xs hover:bg-pink-600 transition-all flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" /> Complete
                        </button>
                      )}
                      {booking.status === "completed" && (
                        <span className="flex-1 py-2 bg-green-50 text-green-700 font-black rounded-xl text-xs text-center">
                          ✓ Completed
                        </span>
                      )}
                      {booking.status === "cancelled" && (
                        <span className="flex-1 py-2 bg-gray-100 text-gray-600 font-black rounded-xl text-xs text-center">
                          ✕ Cancelled
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation would be rendered by parent App.tsx */}
    </div>
  );
}
