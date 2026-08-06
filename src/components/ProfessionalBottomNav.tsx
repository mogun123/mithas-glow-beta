import { useState, useEffect, lazy, Suspense, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useGlobalStore } from '../lib/globalStore';
import {
  Calendar, Clock, DollarSign, Star, Users, AlertCircle,
  CheckCircle, XCircle, MapPin, Sparkles, Zap, Crown, WifiOff, RefreshCw, Bot
} from 'lucide-react';
import { toast } from 'sonner';
import ProfessionalBottomNav from './ProfessionalBottomNav';
import { logger } from '../lib/logger';
import {
  BookingWithDetails,
  DashboardStats,
  DashboardTab,
  BookingFilter,
  ProfessionalDashboardProps,
  isProfessionalRole,
  DateExtractable,
  TimeExtractable,
  BookingStatus,
  calculateDashboardStats,
} from '../lib/types/professional';
import { ErrorBoundaryWrapper } from './common/ErrorBoundary';
import {
  DashboardSkeleton,
  BookingSkeleton,
  AnalyticsSkeleton,
  AvailabilitySkeleton,
  ProfileSkeleton,
  AISkeleton
} from './common/Skeletons';
import { useOfflineDetection, OfflineBanner } from './common/OfflineSupport';

interface BookingWithCustomer extends BookingWithDetails {
  customer?: {
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
}

// 🎯 FIX: Syntax Error Fixed
interface FetchResult<T> {
  data: T | null;
  error: Error | null;
}

interface DashboardLoadState {
  bookingsLoaded: boolean;
  reviewsLoaded: boolean;
  bookingsError: Error | null;
  reviewsError: Error | null;
}

const ProfessionalBookings = lazy(() => import('./professional/ProfessionalBookings'));
const ProfessionalAvailability = lazy(() => import('./professional/ProfessionalAvailability'));
const ProfessionalAIAssistant = lazy(() => import('./professional/ProfessionalAIAssistant'));
const ProfessionalAnalytics = lazy(() => import('./professional/ProfessionalAnalytics'));
const ProfessionalProfile = lazy(() => import('./professional/ProfessionalProfile'));

export default function ProfessionalDashboard({
  onNavigateHome,
  onNavigateToProfile,
}: ProfessionalDashboardProps) {
  const globalStore = useGlobalStore();
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>('all');
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Store ALL bookings here once, and filter them in UI (Prevents looping requests)
  const [allBookings, setAllBookings] = useState<BookingWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadState, setLoadState] = useState<DashboardLoadState>({
    bookingsLoaded: false,
    reviewsLoaded: false,
    bookingsError: null,
    reviewsError: null,
  });
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Refs for realtime subscriptions (prevents memory leaks)
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribedRef = useRef(false);

  // Offline detection
  const { isOnline } = useOfflineDetection();

  // Use Profile directly from Global Store! No redundant DB calls!
  const profile = globalStore.user;
  const isProfessionalUser = useMemo(() => isProfessionalRole(profile?.role), [profile?.role]);

  // Helper to safely get the date regardless of database column names
  const getSafeDate = useCallback((b: DateExtractable): string => {
    return b.booking_date || b.appointment_date || b.date || b.created_at?.split('T')[0] || '';
  }, []);

  const getSafeTime = useCallback((b: TimeExtractable): string => {
    return b.booking_time || b.appointment_time || b.time || 'Time TBD';
  }, []);

  // Parallel data loading with graceful partial failure handling
  const fetchBookings = useCallback(async (artistId: string): Promise<FetchResult<BookingWithCustomer[]>> => {
    try {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`*, customer:profiles!bookings_customer_id_fkey(full_name, phone, avatar_url)`)
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      logger.info('Bookings fetched successfully', { count: bookingsData?.length || 0 });
      return { data: bookingsData || [], error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error fetching bookings');
      logger.error('Failed to fetch bookings', error, { artistId });
      return { data: null, error };
    }
  }, []);

  const fetchReviews = useCallback(async (artistId: string): Promise<FetchResult<number>> => {
    try {
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('artist_id', artistId);

      if (reviewsError) throw reviewsError;

      const avgRating = reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      logger.info('Reviews fetched successfully', { count: reviews?.length || 0, avgRating });
      return { data: avgRating, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error fetching reviews');
      logger.error('Failed to fetch reviews', error, { artistId });
      return { data: null, error };
    }
  }, []);

  // Retry mechanism for failed requests only
  const handleRetry = useCallback(async () => {
    if (!profile?.id || !isOnline) {
      logger.warn('Cannot retry: no profile or offline', { hasProfile: !!profile?.id, isOnline });
      return;
    }

    if (retryCount >= MAX_RETRIES) {
      logger.warn('Max retries exceeded');
      toast.error('Unable to load data. Please refresh the page.');
      return;
    }

    setLoading(true);
    setRetryCount(prev => prev + 1);
    logger.info(`Retrying dashboard data fetch (attempt ${retryCount + 1}/${MAX_RETRIES})`);

    const results = await Promise.all([
      fetchBookings(profile.id),
      fetchReviews(profile.id),
    ]);

    const [bookingsResult, reviewsResult] = results;

    if (bookingsResult.data) {
      setAllBookings(bookingsResult.data);
      setLoadState(prev => ({ ...prev, bookingsLoaded: true, bookingsError: null }));
    } else {
      setLoadState(prev => ({ ...prev, bookingsError: bookingsResult.error }));
    }

    if (reviewsResult.data !== null) {
      setLoadState(prev => ({ ...prev, reviewsLoaded: true, reviewsError: null }));
    } else {
      setLoadState(prev => ({ ...prev, reviewsError: reviewsResult.error }));
    }

    setLoading(false);

    if (bookingsResult.error || reviewsResult.error) {
      toast.error('Some data could not be loaded. Retrying...');
    } else {
      toast.success('Data refreshed successfully');
      setRetryCount(0);
    }
  }, [profile?.id, isOnline, retryCount, fetchBookings, fetchReviews]);

  useEffect(() => {
    if (!profile?.id || !isProfessionalUser) {
      setLoading(false);
      return;
    }

    const fetchAllDashboardData = async () => {
      try {
        setLoading(true);
        logger.info('Starting dashboard data fetch', { artistId: profile.id });

        // Parallel data loading with Promise.all
        const [bookingsResult, reviewsResult] = await Promise.all([
          fetchBookings(profile.id),
          fetchReviews(profile.id),
        ]);

        // Handle bookings (required data)
        if (bookingsResult.error) {
          logger.warn('Bookings fetch failed, using empty array', { error: bookingsResult.error.message });
          setLoadState(prev => ({ ...prev, bookingsError: bookingsResult.error }));
        } else {
          setLoadState(prev => ({ ...prev, bookingsLoaded: true }));
        }
        const fetchedBookings = bookingsResult.data || [];
        setAllBookings(fetchedBookings);

        // Handle reviews (optional data - dashboard still loads if this fails)
        const avgRating = reviewsResult.data ?? 0;
        if (reviewsResult.error) {
          logger.warn('Reviews fetch failed, using default rating', { error: reviewsResult.error.message });
          setLoadState(prev => ({ ...prev, reviewsError: reviewsResult.error }));
        } else {
          setLoadState(prev => ({ ...prev, reviewsLoaded: true }));
        }

        // Use reusable stats calculator
        const newStats = calculateDashboardStats({
          bookings: fetchedBookings,
          avgRating,
          reviewCount: bookingsResult.data?.length ? Math.floor(bookingsResult.data.length * 0.3) : 0,
        });
        setStats(newStats);

        logger.info('Dashboard data fetch completed', { stats: newStats });

      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown dashboard fetch error');
        logger.error('Dashboard Fetch Error', error);
        toast.error('Failed to load some dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchAllDashboardData();
  }, [profile?.id, isProfessionalUser, fetchBookings, fetchReviews]);

  // Derived state for UI filtering (Instant tab switching without API calls)
  const displayedBookings = useMemo(() => {
    if (bookingFilter === 'all') return allBookings;
    return allBookings.filter(b => b.status === bookingFilter);
  }, [allBookings, bookingFilter]);

  // Recalculate stats when bookings change (for status updates, realtime sync)
  const recalculateStats = useCallback(() => {
    if (!loadState.reviewsLoaded && !loadState.reviewsError) return;

    const avgRating = loadState.reviewsLoaded ? (stats?.averageRating || 0) : 0;

    const newStats = calculateDashboardStats({
      bookings: allBookings,
      avgRating,
      reviewCount: allBookings.length ? Math.floor(allBookings.length * 0.3) : 0,
    });
    setStats(newStats);
  }, [allBookings, loadState.reviewsLoaded, loadState.reviewsError, stats?.averageRating]);

  const updateBookingStatus = async (bookingId: string, newStatus: BookingStatus, successMessage: string) => {
    try {
      const { error } = await supabase.from('bookings').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', bookingId);
      if (error) throw error;
      logger.info('Booking status updated', { bookingId, newStatus });
      toast.success(successMessage);
      setAllBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
      // Stats will be recalculated automatically via useEffect below
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error updating booking status');
      logger.error('Failed to update booking status', error, { bookingId, newStatus });
      toast.error('Failed to update booking status');
    }
  };

  // Recalculate stats whenever bookings change
  useEffect(() => {
    if (allBookings.length > 0 || loadState.bookingsLoaded) {
      recalculateStats();
    }
  }, [allBookings, recalculateStats, loadState.bookingsLoaded]);

  // Supabase Realtime Subscription for bookings (INSERT, UPDATE, DELETE)
  useEffect(() => {
    if (!profile?.id || !isProfessionalUser || !loadState.bookingsLoaded) {
      return;
    }

    // Prevent duplicate subscriptions
    if (isSubscribedRef.current) {
      logger.info('Realtime subscription already active');
      return;
    }

    const setupRealtimeSubscription = async () => {
      try {
        // Clean up any existing channel
        if (realtimeChannelRef.current) {
          await realtimeChannelRef.current.unsubscribe();
          realtimeChannelRef.current = null;
        }

        // Create new realtime channel for bookings
        const channel = supabase.channel(`bookings:${profile.id}`);

        channel
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to INSERT, UPDATE, DELETE
              schema: 'public',
              table: 'bookings',
              filter: `artist_id=eq.${profile.id}`,
            },
            async (payload) => {
              logger.info('Realtime booking update received', {
                eventType: payload.eventType,
                bookingId: payload.new?.id
              });

              // Refetch bookings to get fresh data
              const result = await fetchBookings(profile.id);
              if (result.data) {
                setAllBookings(result.data);
                setLoadState(prev => ({ ...prev, bookingsLoaded: true }));
                
                // 🎯 FIX: Realtime Bug Fixed (No duplicate calculateDashboardStats here)
                toast.success(`Booking ${payload.eventType.toLowerCase()}d successfully`);
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              isSubscribedRef.current = true;
              realtimeChannelRef.current = channel;
              logger.info('Successfully subscribed to bookings realtime updates');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              logger.error('Realtime subscription error', new Error(status));
              isSubscribedRef.current = false;
            }
          });

      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown realtime setup error');
        logger.error('Failed to setup realtime subscription', error);
      }
    };

    setupRealtimeSubscription();

    // Cleanup function - prevents memory leaks
    return () => {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe().then(() => {
          realtimeChannelRef.current = null;
          isSubscribedRef.current = false;
          logger.info('Realtime subscription cleaned up');
        }).catch((err) => {
          logger.error('Error cleaning up realtime subscription', err as Error);
        });
      }
    };
  }, [profile?.id, isProfessionalUser, loadState.bookingsLoaded, fetchBookings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F4F0FA] via-[#FDF2F8] to-[#F4F0FA] relative overflow-hidden pb-32">
        <OfflineBanner isOnline={isOnline} onRetry={handleRetry} />
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (!isProfessionalUser || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F4F0FA] via-[#FDF2F8] to-[#F4F0FA] relative overflow-hidden">
        <div className="text-center max-w-sm w-full mx-4 p-6 bg-white/70 backdrop-blur-xl border border-white rounded-3xl shadow-xl">
          <AlertCircle className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Access Restricted</h2>
          <p className="text-sm text-slate-700 font-medium mb-6 leading-relaxed">You don't have access to the professional dashboard.</p>
          <button
            onClick={onNavigateHome}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-bold rounded-full shadow-lg shadow-purple-500/30 hover:scale-105 transition-all"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F0FA] via-[#FDF2F8] to-[#F4F0FA] relative overflow-hidden pb-32">
      <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-purple-300/15 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-fuchsia-300/15 rounded-full blur-[80px] -z-10 pointer-events-none"></div>

      <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-2xl border-b border-purple-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <Crown className="w-5 h-5 text-purple-600" />
                <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 italic tracking-tighter">
                  MITHAS GLOW
                </h1>
              </div>
              <p className="text-[10px] text-slate-600 font-bold tracking-widest mt-0.5">PROFESSIONAL DASHBOARD</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  globalStore.toggleAppViewMode();
                  const newMode = useGlobalStore.getState().appViewMode;
                  toast.success(newMode === 'self' ? 'Switched to Self Mode' : 'Switched to Pro Mode');
                }}
                className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold transition-all duration-300 ${
                  globalStore.appViewMode === 'pro'
                    ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-white/80 text-slate-700 border border-purple-200'
                }`}
              >
                <Zap className="w-3 h-3 inline mr-1" />
                {globalStore.appViewMode === 'self' ? 'SELF' : 'PRO'}
              </button>
              <button
                onClick={onNavigateToProfile}
                className="w-8 h-8 rounded-full bg-white border border-purple-200 shadow-sm flex items-center justify-center overflow-hidden"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-4 h-4 text-purple-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-4">
        {activeTab === 'dashboard' && (
          <ErrorBoundaryWrapper moduleName="DashboardOverview" onRetry={handleRetry} onBack={() => setActiveTab('dashboard')}>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-4">
                <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-white shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-100 to-fuchsia-50 border border-white flex items-center justify-center text-xl overflow-hidden flex-shrink-0 shadow-sm">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>👤</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                        Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-fuchsia-600">{profile?.shop_name || profile?.display_name || "Professional"}</span>
                      </h2>
                      <p className="text-xs text-slate-700 font-bold mt-1">{profile?.industry?.replace('_', ' ').toUpperCase()}</p>
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-700 font-bold">
                        {profile?.city && (
                          <span className="flex items-center gap-1 bg-white/60 px-2 py-1 rounded-full border border-purple-100">
                            <MapPin className="w-3 h-3 text-purple-500" /> {profile.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 border border-white shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-purple-100/80"><Calendar className="w-4 h-4 text-purple-600" /></div>
                    <span className="text-lg font-extrabold text-slate-900">{stats?.todayBookings || 0}</span>
                  </div>
                  <p className="text-[11px] text-slate-700 font-bold">Today's Bookings</p>
                </div>

                <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 border border-white shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-fuchsia-100/80"><AlertCircle className="w-4 h-4 text-fuchsia-600" /></div>
                    <span className="text-lg font-extrabold text-slate-900">{stats?.pendingRequests || 0}</span>
                  </div>
                  <p className="text-[11px] text-slate-700 font-bold">Pending Requests</p>
                </div>

                <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 border border-white shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100/80"><DollarSign className="w-4 h-4 text-emerald-600" /></div>
                    <span className="text-base font-extrabold text-slate-900">₹{stats?.todaysEarnings?.toLocaleString() || 0}</span>
                  </div>
                  <p className="text-[11px] text-slate-700 font-bold">Today's Earnings</p>
                </div>

                <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 border border-white shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-amber-100/80"><Star className="w-4 h-4 text-amber-600" /></div>
                    <span className="text-lg font-extrabold text-slate-900">{stats?.averageRating || 0}</span>
                  </div>
                  <p className="text-[11px] text-slate-700 font-bold">Average Rating</p>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white shadow-sm overflow-hidden mb-6">
                <div className="p-4 border-b border-purple-100/50 bg-white/40">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-extrabold text-slate-900">Bookings</h3>
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">{displayedBookings.length} Total</span>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                    {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((filter: BookingFilter) => (
                      <button
                        key={filter}
                        onClick={() => setBookingFilter(filter)}
                        className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap shadow-sm ${
                          bookingFilter === filter ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white' : 'bg-white text-slate-700 border border-purple-100'
                        }`}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3">
                  {displayedBookings.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30 text-purple-400" />
                      <p className="font-bold text-sm">No bookings found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {displayedBookings.map((booking) => (
                        <div key={booking.id} className="bg-white/90 rounded-xl p-4 border border-white shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-lg shadow-sm">
                              {booking.customer?.avatar_url ? <img src={booking.customer.avatar_url} className="w-full h-full object-cover rounded-xl" /> : '👤'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <h4 className="font-extrabold text-slate-900 truncate text-base">{booking.customer?.full_name || "Customer"}</h4>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border shadow-sm ${
                                  booking.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                  booking.status === "confirmed" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                  booking.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600"
                                }`}>{booking.status}</span>
                              </div>
                              <p className="text-xs text-slate-700 font-bold mb-2">{booking.service_name || "Service"}</p>
                              <div className="flex flex-wrap gap-2 text-[10px] text-slate-700 font-bold">
                                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-purple-100"><Calendar className="w-3 h-3 text-purple-500" /> {getSafeDate(booking)}</span>
                                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-purple-100"><Clock className="w-3 h-3 text-purple-500" /> {getSafeTime(booking)}</span>
                                {booking.total_price && <span className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded text-emerald-700"><DollarSign className="w-3 h-3" /> ₹{booking.total_price}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-4 pt-3 border-t border-purple-100/50">
                            {booking.status === "pending" && (
                              <>
                                <button onClick={() => updateBookingStatus(booking.id, 'confirmed', 'Accepted!')} className="flex-1 py-2 bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Accept</button>
                                <button onClick={() => updateBookingStatus(booking.id, 'cancelled', 'Declined')} className="flex-1 py-2 bg-white text-rose-500 border border-rose-200 font-bold rounded-lg text-xs flex items-center justify-center gap-1"><XCircle className="w-3.5 h-3.5" /> Decline</button>
                              </>
                            )}
                            {booking.status === "confirmed" && (
                              <button onClick={() => updateBookingStatus(booking.id, 'completed', 'Completed!')} className="w-full py-2 bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Mark Complete</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ErrorBoundaryWrapper>
        )}

        {activeTab === 'bookings' && (
          <ErrorBoundaryWrapper moduleName="Bookings" onRetry={handleRetry} onBack={() => setActiveTab('dashboard')}>
            <Suspense fallback={<BookingSkeleton />}>
              <ProfessionalBookings artistId={profile.id} onBack={() => setActiveTab('dashboard')} />
            </Suspense>
          </ErrorBoundaryWrapper>
        )}
        {activeTab === 'availability' && (
          <ErrorBoundaryWrapper moduleName="Availability" onRetry={handleRetry} onBack={() => setActiveTab('dashboard')}>
            <Suspense fallback={<AvailabilitySkeleton />}>
              <ProfessionalAvailability artistId={profile.id} onBack={() => setActiveTab('dashboard')} />
            </Suspense>
          </ErrorBoundaryWrapper>
        )}
        {activeTab === 'ai-assistant' && (
          <ErrorBoundaryWrapper moduleName="AI Assistant" onRetry={handleRetry} onBack={() => setActiveTab('dashboard')}>
            <Suspense fallback={<AISkeleton />}>
              <ProfessionalAIAssistant artistId={profile.id} onBack={() => setActiveTab('dashboard')} />
            </Suspense>
          </ErrorBoundaryWrapper>
        )}
        {activeTab === 'analytics' && (
          <ErrorBoundaryWrapper moduleName="Analytics" onRetry={handleRetry} onBack={() => setActiveTab('dashboard')}>
            <Suspense fallback={<AnalyticsSkeleton />}>
              <ProfessionalAnalytics artistId={profile.id} onBack={() => setActiveTab('dashboard')} />
            </Suspense>
          </ErrorBoundaryWrapper>
        )}
        {activeTab === 'profile' && (
          <ErrorBoundaryWrapper moduleName="Profile" onRetry={handleRetry} onBack={() => setActiveTab('dashboard')}>
            <Suspense fallback={<ProfileSkeleton />}>
              <ProfessionalProfile artistId={profile.id} onBack={() => setActiveTab('dashboard')} />
            </Suspense>
          </ErrorBoundaryWrapper>
        )}
      </main>

      {/* 🎯 FIX: Premium AI Assistant Floating Action Button (FAB) added here */}
      {activeTab !== 'ai-assistant' && (
        <button
          onClick={() => setActiveTab('ai-assistant')}
          className="fixed bottom-24 right-4 md:right-8 z-40 flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-purple-600 to-fuchsia-500 text-white rounded-full shadow-[0_8px_30px_rgba(217,70,239,0.4)] hover:scale-110 active:scale-95 transition-all duration-300 group"
          aria-label="Open AI Assistant"
        >
          <Bot className="w-6 h-6 transition-transform duration-300 group-hover:animate-bounce" />
          <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-white rounded-full border-2 border-fuchsia-500 animate-pulse"></div>
        </button>
      )}

      <ProfessionalBottomNav currentView={activeTab} onNavigate={(view: DashboardTab) => setActiveTab(view)} />
    </div>
  );
}
