import { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import { 
  Calendar, Clock, DollarSign, Star, Users, TrendingUp, 
  CheckCircle, XCircle, AlertCircle, Briefcase, MessageSquare,
  ChevronRight, Plus, Edit2, Trash2, Camera, MapPin, Phone, Mail,
  Sparkles, Zap, Crown
} from 'lucide-react';
import { toast } from 'sonner';
import ProfessionalBottomNav from './ProfessionalBottomNav';

interface ProfessionalProfile {
  id: string;
  email: string;
  full_name: string | null;
  shop_name: string | null;
  bio: string | null;
  experience: string | null;
  city: string | null;
  avatar_url: string | null;
  role: string | null;
  industry: string | null;
  seller_status: string | null;
  is_active: boolean;
  portfolio_link: string | null;
  operating_hours: string | null;
  phone: string | null;
  artist_mode?: 'self' | 'pro';
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

type TabView = 'dashboard' | 'bookings' | 'availability' | 'ai-assistant' | 'analytics' | 'profile';

interface ProfessionalDashboardProps {
  onNavigateHome?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToMirror?: () => void;
}

// Lazy load professional components
const ProfessionalPortfolio = lazy(() => import('./professional/ProfessionalPortfolio'));
const ProfessionalAvailability = lazy(() => import('./professional/ProfessionalAvailability'));
const ProfessionalAIAssistant = lazy(() => import('./professional/ProfessionalAIAssistant'));
const ProfessionalAnalytics = lazy(() => import('./professional/ProfessionalAnalytics'));

export default function ProfessionalDashboard({ 
  onNavigateHome, 
  onNavigateToProfile,
  onNavigateToMirror 
}: ProfessionalDashboardProps) {
  const authStore = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabView>('dashboard');
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [artistMode, setArtistMode] = useState<'self' | 'pro'>('self');
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
          .eq('role', 'seller')
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
          setArtistMode((profileData.artist_mode as 'self' | 'pro') || 'self');
          
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

        if (bookingFilter !== 'all') {
          query = query.eq('status', bookingFilter);
        }

        const { data, error: queryError } = await query;

        if (queryError) throw queryError;
        setBookings(data || []);
      } catch (err: any) {
        console.error('ProfessionalDashboard: Bookings fetch error:', err.message);
      }
    };

    fetchBookings();
  }, [profile?.id, bookingFilter]);

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

  const toggleArtistMode = useCallback(() => {
    setArtistMode(prev => {
      const newMode = prev === 'self' ? 'pro' : 'self';
      toast.success(`Switched to ${newMode === 'self' ? 'Self' : 'Pro'} Mode`);
      return newMode;
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-pink-500/50 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-pink-400 animate-pulse" />
          </div>
          <p className="text-white/70 font-medium tracking-wide">Loading your premium dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isProfessional || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <div className="text-center max-w-md p-8">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-pink-500/20 blur-3xl rounded-full"></div>
            <AlertCircle className="relative w-20 h-20 text-pink-400 mx-auto" />
          </div>
          <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Access Restricted</h2>
          <p className="text-white/60 mb-8 leading-relaxed">You don't have access to the professional dashboard.</p>
          <button
            onClick={onNavigateHome}
            className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-2xl shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-105 transition-all duration-300"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/50 to-slate-950 pb-24">
      {/* Premium Glass Header */}
      <header className="sticky top-0 z-30 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="w-6 h-6 text-pink-400" />
                <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 italic tracking-tighter">
                  MITHAS GLOW
                </h1>
              </div>
              <p className="text-xs text-white/50 font-medium tracking-wide">PROFESSIONAL DASHBOARD</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Artist Mode Toggle */}
              <button
                onClick={toggleArtistMode}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                  artistMode === 'pro' 
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/30' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <Zap className="w-3 h-3 inline mr-1" />
                {artistMode === 'self' ? 'SELF' : 'PRO'} MODE
              </button>
              <button
                onClick={onNavigateToProfile}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-white/20 flex items-center justify-center hover:scale-105 transition-transform overflow-hidden"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-5 h-5 text-pink-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6">
        {/* Render content based on activeTab - ONLY ONE VIEW AT A TIME */}
        {activeTab === 'dashboard' && (
          <>
            {/* Welcome Section - Premium Glass Card */}
            <div className="mb-6">
              <div className="relative overflow-hidden bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-xl shadow-purple-500/10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 blur-3xl rounded-full"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full"></div>
                <div className="relative flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-white/20 flex items-center justify-center text-2xl overflow-hidden flex-shrink-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">👤</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-black text-white tracking-tight">
                      Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">{profile?.shop_name || profile?.full_name || "Professional"}</span>
                    </h2>
                    <p className="text-sm text-white/60 font-medium">{profile?.industry?.replace('_', ' ').toUpperCase()}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-white/50 font-medium">
                      {profile?.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {profile.city}
                        </span>
                      )}
                      {profile?.experience && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400" /> {profile.experience} exp
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Stats Grid - Glass Cards with Glows */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-pink-500/20">
                      <Calendar className="w-5 h-5 text-pink-400" />
                    </div>
                    <span className="text-2xl font-black text-white">{stats?.todayBookings || 0}</span>
                  </div>
                  <p className="text-xs text-white/60 font-medium">Today's Bookings</p>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-orange-500/20">
                      <AlertCircle className="w-5 h-5 text-orange-400" />
                    </div>
                    <span className="text-2xl font-black text-white">{stats?.pendingRequests || 0}</span>
                  </div>
                  <p className="text-xs text-white/60 font-medium">Pending Requests</p>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <DollarSign className="w-5 h-5 text-green-400" />
                    </div>
                    <span className="text-lg font-black text-white">₹{stats?.todaysEarnings?.toLocaleString() || 0}</span>
                  </div>
                  <p className="text-xs text-white/60 font-medium">Today's Earnings</p>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <Star className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-2xl font-black text-white">{stats?.averageRating || 0}</span>
                  </div>
                  <p className="text-xs text-white/60 font-medium">Average Rating</p>
                </div>
              </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
                <p className="text-xl font-black text-white">{stats?.upcomingAppointments || 0}</p>
                <p className="text-xs text-white/60 font-medium">Upcoming</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
                <p className="text-xl font-black text-white">{stats?.completedToday || 0}</p>
                <p className="text-xs text-white/60 font-medium">Completed</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
                <p className="text-xl font-black text-white">{stats?.totalReviews || 0}</p>
                <p className="text-xs text-white/60 font-medium">Reviews</p>
              </div>
            </div>

            {/* Bookings Section - Premium Glass Card */}
            <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-xl overflow-hidden mb-6">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-white">Booking Management</h3>
                  <span className="text-xs font-bold text-pink-400 bg-pink-500/20 px-3 py-1 rounded-full border border-pink-500/30">
                    {bookings.length} bookings
                  </span>
                </div>
                
                {/* Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setBookingFilter(filter)}
                      className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all duration-300 ${
                        bookingFilter === filter
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/30'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="p-4">
                {bookings.length === 0 ? (
                  <div className="text-center py-12 text-white/50">
                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="font-medium">No bookings found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="group bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 hover:border-pink-500/30 transition-all duration-300"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-white/20 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                            {booking.customer?.avatar_url ? (
                              <img src={booking.customer.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xl">👤</span>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-black text-white truncate">
                                {booking.customer?.full_name || "Customer"}
                              </h4>
                              <span
                                className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider border ${
                                  booking.status === "pending" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                                  booking.status === "confirmed" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                                  booking.status === "completed" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                                  "bg-white/10 text-white/60 border-white/20"
                                }`}
                              >
                                {booking.status}
                              </span>
                            </div>
                            
                            <p className="text-sm text-white/70 font-medium mb-2">{booking.service_name || "Service"}</p>
                            
                            <div className="flex items-center gap-4 text-xs text-white/50 font-bold flex-wrap">
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
                                className="flex-1 py-2 bg-white/10 border border-red-500/30 text-red-400 font-black rounded-xl text-xs hover:bg-red-500/20 transition-all flex items-center justify-center gap-1"
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
                            <span className="flex-1 py-2 bg-green-500/20 text-green-400 font-black rounded-xl text-xs text-center border border-green-500/30">
                              ✓ Completed
                            </span>
                          )}
                          {booking.status === "cancelled" && (
                            <span className="flex-1 py-2 bg-white/10 text-white/50 font-black rounded-xl text-xs text-center border border-white/20">
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
          </>
        )}

        {activeTab === 'bookings' && (
          <Suspense fallback={<div className="p-8 text-center text-white/70">Loading bookings...</div>}>
            <ProfessionalAvailability artistId={profile.id} onBack={() => setActiveTab('dashboard')} />
          </Suspense>
        )}

        {activeTab === 'availability' && (
          <Suspense fallback={<div className="p-8 text-center text-white/70">Loading availability...</div>}>
            <ProfessionalAvailability artistId={profile.id} onBack={() => setActiveTab('dashboard')} />
          </Suspense>
        )}

        {activeTab === 'ai-assistant' && (
          <Suspense fallback={<div className="p-8 text-center text-white/70">Loading AI Assistant...</div>}>
            <ProfessionalAIAssistant artistId={profile.id} onBack={() => setActiveTab('dashboard')} />
          </Suspense>
        )}

        {activeTab === 'analytics' && (
          <Suspense fallback={<div className="p-8 text-center text-white/70">Loading Analytics...</div>}>
            <ProfessionalAnalytics artistId={profile.id} onBack={() => setActiveTab('dashboard')} />
          </Suspense>
        )}

        {activeTab === 'profile' && (
          <Suspense fallback={<div className="p-8 text-center text-white/70">Loading Profile...</div>}>
            <ProfessionalPortfolio 
              artistId={profile.id}
              onBack={() => setActiveTab('dashboard')}
            />
          </Suspense>
        )}
      </main>

      {/* Professional Bottom Navigation - Only show when not in nested component */}
      {activeTab === 'dashboard' && (
        <ProfessionalBottomNav 
          currentView={activeTab}
          onNavigate={(view) => setActiveTab(view)}
        />
      )}
    </div>
  );
}
