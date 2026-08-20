import { useState, useEffect, lazy, Suspense, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useGlobalStore } from '../lib/globalStore';
import {
  Calendar, Clock, DollarSign, Star, Users, AlertCircle,
  CheckCircle, XCircle, MapPin, Zap, Crown, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import ProfessionalBottomNav from './ProfessionalBottomNav';
import { logger } from '../lib/logger';
import {
  BookingWithDetails,
  DashboardTab,
  BookingFilter,
  ProfessionalDashboardProps,
  isProfessionalRole,
  canAccessProfessionalDashboard,
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

interface ReviewData {
  avgRating: number;
  count: number;
}

const ProfessionalBookings = lazy(() => import('./professional/ProfessionalBookings'));
const ProfessionalAvailability = lazy(() => import('./professional/ProfessionalAvailability'));
const ProfessionalAIAssistant = lazy(() => import('./professional/ProfessionalAIAssistant'));
const ProfessionalAnalytics = lazy(() => import('./professional/ProfessionalAnalytics'));
const ProfessionalProfile = lazy(() => import('./professional/ProfessionalProfile'));

// Helper for status badge styling - Light Beauty Theme
const getStatusColor = (status: BookingStatus): string => {
  switch (status) {
    case "pending": return "bg-amber-50 text-amber-700 border-amber-200";
    case "confirmed": return "bg-blue-50 text-blue-700 border-blue-200";
    case "completed": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default: return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

// Helper for industry formatting
const formatIndustry = (industry?: string | null): string => {
  if (!industry) return "PROFESSIONAL";
  return industry.replace('_', ' ').toUpperCase();
};

export default function ProfessionalDashboard({
  onNavigateHome,
  onNavigateToProfile,
  onNavigateToAdminProducts,
}: ProfessionalDashboardProps) {
  const globalStore = useGlobalStore();
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>('all');

  const [allBookings, setAllBookings] = useState<BookingWithCustomer[]>([]);
  const [reviewData, setReviewData] = useState<ReviewData>({ avgRating: 0, count: 0 });

  // PULLING LIVE DATA STATES
  const [liveShopName, setLiveShopName] = useState<string>('');
  const [liveCity, setLiveCity] = useState<string>('');

  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Offline detection
  const { isOnline } = useOfflineDetection();

  // Clean artistId usage
  const profile = globalStore.user;
  const artistId = profile?.id;
  const isProfessionalUser = useMemo(() => {
    return canAccessProfessionalDashboard(profile?.role) || profile?.industry === 'makeup_artist' || (profile as any)?.is_seller;
  }, [profile?.role, profile?.industry, (profile as any)?.is_seller]);

  const getSafeDate = useCallback((b: DateExtractable): string => {
    return b.booking_date || b.appointment_date || b.date || b.created_at?.split('T')[0] || '';
  }, []);

  const getSafeTime = useCallback((b: TimeExtractable): string => {
    return b.booking_time || b.appointment_time || b.time || 'Time TBD';
  }, []);

  const fetchBookings = useCallback(async (targetArtistId: string): Promise<BookingWithCustomer[]> => {
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('*, customer:profiles!bookings_customer_id_fkey(full_name, phone, avatar_url)')
      .eq('artist_id', targetArtistId)
      .order('created_at', { ascending: false });

    if (bookingsError) throw bookingsError;
    return (bookingsData || []) as BookingWithCustomer[];
  }, []);

  const fetchReviews = useCallback(async (targetArtistId: string): Promise<ReviewData> => {
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('artist_id', targetArtistId);

    if (reviewsError) throw reviewsError;

    const count = reviews?.length || 0;
    const avgRating = count > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / count
      : 0;

    return { avgRating, count };
  }, []);

  const loadDashboardData = useCallback(async (targetArtistId: string) => {
    const [bookingsData, reviewsData] = await Promise.all([
      fetchBookings(targetArtistId),
      fetchReviews(targetArtistId),
    ]);

    setAllBookings(bookingsData);
    setReviewData(reviewsData);

    // FETCH LIVE SHOP NAME AND CITY DIRECTLY FROM DB
    try {
      const { data: shop } = await supabase.from('shops').select('shop_name, business_address').eq('user_id', targetArtistId).maybeSingle();
      const { data: prof } = await supabase.from('profiles').select('shop_name, display_name, full_name, city').eq('id', targetArtistId).maybeSingle();

      const finalShopName = shop?.shop_name || prof?.shop_name || prof?.display_name || prof?.full_name || '';
      const finalCity = shop?.business_address || prof?.city || '';

      if (finalShopName) setLiveShopName(finalShopName);
      if (finalCity) setLiveCity(finalCity);
    } catch (e) {
      console.error("Error fetching live shop info", e);
    }

  }, [fetchBookings, fetchReviews]);

  const handleRetry = useCallback(async () => {
    if (!artistId) return;

    setInitialLoading(true);
    setLoadError(null);

    try {
      await loadDashboardData(artistId);
      toast.success('Dashboard synced successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown dashboard error';
      setLoadError(message);
      toast.error(message);
    } finally {
      setInitialLoading(false);
    }
  }, [artistId, loadDashboardData]);

  useEffect(() => {
    let mounted = true;

    if (!artistId || !isProfessionalUser) {
      setInitialLoading(false);
      return;
    }

    const initFetch = async () => {
      setInitialLoading(true);
      setLoadError(null);

      try {
        await loadDashboardData(artistId);
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : 'Unknown dashboard error';
        setLoadError(message);
        toast.error(message);
      } finally {
        if (mounted) {
          setInitialLoading(false);
        }
      }
    };

    void initFetch();

    return () => {
      mounted = false;
    };
  }, [artistId, isProfessionalUser, loadDashboardData]);

  const stats = useMemo(() => {
    return calculateDashboardStats({
      bookings: allBookings,
      avgRating: reviewData.avgRating,
      reviewCount: reviewData.count,
    });
  }, [allBookings, reviewData]);

  const displayedBookings = useMemo(() => {
    if (bookingFilter === 'all') return allBookings;
    return allBookings.filter(b => b.status === bookingFilter);
  }, [allBookings, bookingFilter]);

  const updateBookingStatus = async (bookingId: string, newStatus: BookingStatus, successMessage: string) => {
    if (!artistId) {
      toast.error('Missing artist id for booking update.');
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw error;

      const refreshedBookings = await fetchBookings(artistId);
      setAllBookings(refreshedBookings);
      toast.success(successMessage);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Booking update failed';
      toast.error(message);
    }
  };

  useEffect(() => {
    if (!artistId) return;

    const channel = supabase.channel(`bookings:${artistId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `artist_id=eq.${artistId}` },
        async () => {
          try {
            await loadDashboardData(artistId);
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Realtime refresh failed';
            toast.error(message);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [artistId, loadDashboardData]);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#faf5ff] relative overflow-hidden pb-32">
        <OfflineBanner isOnline={isOnline} onRetry={handleRetry} />
        <div className="relative max-w-4xl mx-auto px-4 pt-4 z-10">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (!isProfessionalUser || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf5ff] relative overflow-hidden">
        <div className="relative text-center max-w-sm w-full mx-4 p-6 bg-white/90 backdrop-blur-xl border border-pink-100 rounded-2xl shadow-[0_8px_30px_rgba(236,72,153,0.08)] z-10">
          <AlertCircle className="w-16 h-16 text-pink-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-600 font-medium mb-6 leading-relaxed">You don't have access to the professional dashboard.</p>
          <button
            onClick={onNavigateHome}
            className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-lg shadow-[0_8px_30px_rgba(236,72,153,0.2)] hover:shadow-[0_8px_30px_rgba(236,72,153,0.3)] hover:scale-105 transition-all duration-300"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf5ff] relative overflow-hidden pb-32">
      {/* Subtle decorative elements */}
      <div className="absolute top-0 right-0 w-[20rem] h-[20rem] bg-pink-200/20 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[20rem] h-[20rem] bg-purple-200/20 rounded-full blur-[80px] -z-10 pointer-events-none"></div>

      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-pink-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <Crown className="w-5 h-5 text-pink-500" />
                <h1 className="text-lg font-black text-slate-900 italic tracking-tight">
                  MITHAS GLOW
                </h1>
              </div>
              <p className="text-[10px] text-pink-600 font-bold tracking-[0.2em] mt-0.5 flex items-center gap-1">
                <Shield className="w-3 h-3 inline" />
                PROFESSIONAL DASHBOARD
              </p>
            </div>

            <div className="flex items-center gap-2">
              {profile?.role === 'admin' && onNavigateToAdminProducts && (
                <button
                  onClick={() => {
                    console.log('[ADMIN PRODUCTS] button clicked');
                    console.log('[ADMIN PRODUCTS] navigating to /admin/products');
                    onNavigateToAdminProducts();
                  }}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm border border-purple-200 hover:opacity-90 transition-opacity"
                >
                  📦 Products
                </button>
              )}
              
              <button
                onClick={() => {
                  globalStore.toggleAppViewMode();
                  const newMode = useGlobalStore.getState().appViewMode;
                  toast.success(newMode === 'self' ? 'Switched to Self Mode' : 'Switched to Pro Mode');
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all duration-300 border ${globalStore.appViewMode === 'pro'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-[0_8px_30px_rgba(236,72,153,0.2)] border-pink-200'
                    : 'bg-white text-slate-600 border-pink-200'
                  }`}
              >
                <Zap className="w-3 h-3 inline mr-1" />
                {globalStore.appViewMode === 'self' ? 'SELF' : 'PRO'}
              </button>

              <button
                onClick={onNavigateToProfile}
                className="w-8 h-8 rounded-lg bg-white border border-pink-100 shadow-sm flex items-center justify-center overflow-hidden hover:border-pink-300 transition-colors"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-4 h-4 text-pink-500" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-4 pt-4">
        {activeTab === 'dashboard' && (
          <ErrorBoundaryWrapper moduleName="DashboardOverview" errorMessage={loadError} onRetry={handleRetry} onBack={() => setActiveTab('dashboard')}>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {loadError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 font-semibold">
                  {loadError}
                </div>
              )}

              {/* Professional Welcome Card */}
              <div className="mb-4">
                <div className="relative overflow-hidden bg-white rounded-xl p-4 border border-pink-100 shadow-[0_8px_30px_rgba(236,72,153,0.08)]">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-pink-100 to-purple-100 border border-pink-200 flex items-center justify-center text-xl overflow-hidden flex-shrink-0">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">👤</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                        Welcome back, <span className="text-pink-600">{liveShopName || profile?.shop_name || profile?.display_name || "Professional"}</span>
                      </h2>
                      <p className="text-xs text-slate-500 font-medium mt-1">{formatIndustry(profile?.industry)}</p>
                      
                      {(liveCity || profile?.city) && (
                        <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-600 font-medium">
                          <MapPin className="w-3 h-3 text-pink-500" /> {liveCity || profile?.city}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid - Light Beauty Theme */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-3 border border-pink-100 shadow-[0_8px_30px_rgba(236,72,153,0.06)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-pink-50 border border-pink-100"><Calendar className="w-4 h-4 text-pink-500" /></div>
                    <span className="text-lg font-black text-slate-900">{stats.todayBookings}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">Today's Bookings</p>
                </div>

                <div className="bg-white rounded-xl p-3 border border-pink-100 shadow-[0_8px_30px_rgba(236,72,153,0.06)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-100"><AlertCircle className="w-4 h-4 text-amber-500" /></div>
                    <span className="text-lg font-black text-slate-900">{stats.pendingRequests}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">Pending Requests</p>
                </div>

                <div className="bg-white rounded-xl p-3 border border-pink-100 shadow-[0_8px_30px_rgba(236,72,153,0.06)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-100"><DollarSign className="w-4 h-4 text-emerald-500" /></div>
                    <span className="text-base font-black text-slate-900">₹{stats.todaysEarnings.toLocaleString()}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">Today's Earnings</p>
                </div>

                <div className="bg-white rounded-xl p-3 border border-pink-100 shadow-[0_8px_30px_rgba(236,72,153,0.06)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-100"><Star className="w-4 h-4 text-amber-500" /></div>
                    <span className="text-lg font-black text-slate-900">{stats.averageRating.toFixed(1)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">Avg Rating ({stats.reviewCount})</p>
                </div>
              </div>

              {/* Bookings Section */}
              <div className="bg-white rounded-2xl border border-pink-100 shadow-[0_8px_30px_rgba(236,72,153,0.08)] overflow-hidden mb-6">
                <div className="p-4 border-b border-pink-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900">Bookings</h3>
                    <span className="text-[11px] font-bold text-slate-500 bg-pink-50 px-3 py-1 rounded-full">{displayedBookings.length} Total</span>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                    {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((filter: BookingFilter) => (
                      <button
                        key={filter}
                        onClick={() => setBookingFilter(filter)}
                        className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap active:scale-95 transition-transform ${bookingFilter === filter ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-[0_8px_30px_rgba(236,72,153,0.2)]' : 'bg-white text-slate-600 border border-pink-200'
                          }`}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3">
                  {displayedBookings.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium text-sm">No bookings found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {displayedBookings.map((booking) => (
                        <div key={booking.id} className="bg-white rounded-xl p-4 border border-pink-100 shadow-[0_8px_30px_rgba(236,72,153,0.06)]">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center text-lg overflow-hidden">
                              {booking.customer?.avatar_url ? <img src={booking.customer.avatar_url} className="w-full h-full object-cover rounded-xl" /> : '👤'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <h4 className="font-bold text-slate-900 truncate text-base">{booking.customer?.full_name || "Customer"}</h4>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${getStatusColor(booking.status)}`}>
                                  {booking.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 font-medium mb-2">{booking.service_name || "Service"}</p>
                              <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 font-medium">
                                <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200"><Calendar className="w-3 h-3 text-pink-500" /> {getSafeDate(booking)}</span>
                                <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200"><Clock className="w-3 h-3 text-pink-500" /> {getSafeTime(booking)}</span>
                                {booking.total_price && <span className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded text-emerald-700 border border-emerald-200"><DollarSign className="w-3 h-3" /> ₹{booking.total_price}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-4 pt-3 border-t border-pink-100">
                            {booking.status === "pending" && (
                              <>
                                <button onClick={() => updateBookingStatus(booking.id, 'confirmed', 'Accepted!')} className="flex-1 py-2 bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-emerald-600 transition-colors"><CheckCircle className="w-3.5 h-3.5" /> Accept</button>
                                <button onClick={() => updateBookingStatus(booking.id, 'cancelled', 'Declined')} className="flex-1 py-2 bg-white text-rose-600 border border-rose-200 font-bold rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-rose-50 transition-colors"><XCircle className="w-3.5 h-3.5" /> Decline</button>
                              </>
                            )}
                            {booking.status === "confirmed" && (
                              <button onClick={() => updateBookingStatus(booking.id, 'completed', 'Completed!')} className="w-full py-2 bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-purple-600 transition-colors"><CheckCircle className="w-3.5 h-3.5" /> Mark Complete</button>
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
          <ErrorBoundaryWrapper moduleName="Bookings" errorMessage={loadError} onRetry={handleRetry} onBack={() => setActiveTab('dashboard')}>
            <Suspense fallback={<BookingSkeleton />}>
              <ProfessionalBookings artistId={artistId || ''} onBack={() => setActiveTab('dashboard')} />
            </Suspense>
          </ErrorBoundaryWrapper>
        )}
        {activeTab === 'availability' && (
          <ErrorBoundaryWrapper moduleName="Availability" errorMessage={loadError} onRetry={handleRetry} onBack={() => setActiveTab('dashboard')}>
            <Suspense fallback={<AvailabilitySkeleton />}>
              <ProfessionalAvailability artistId={artistId || ''} onBack={() => setActiveTab('dashboard')} />
            </Suspense>
          </ErrorBoundaryWrapper>
        )}
        {activeTab === 'ai-assistant' && (
          <ErrorBoundaryWrapper moduleName="AI Assistant" errorMessage={loadError} onRetry={handleRetry} onBack={() => setActiveTab('dashboard')}>
            <Suspense fallback={<AISkeleton />}>
              <ProfessionalAIAssistant artistId={artistId || ''} onBack={() => setActiveTab('dashboard')} />
            </Suspense>
          </ErrorBoundaryWrapper>
        )}
        {activeTab === 'analytics' && (
          <ErrorBoundaryWrapper moduleName="Analytics" errorMessage={loadError} onRetry={handleRetry} onBack={() => setActiveTab('dashboard')}>
            <Suspense fallback={<AnalyticsSkeleton />}>
              <ProfessionalAnalytics artistId={artistId || ''} onBack={() => setActiveTab('dashboard')} />
            </Suspense>
          </ErrorBoundaryWrapper>
        )}
        {activeTab === 'profile' && (
          <ErrorBoundaryWrapper moduleName="Profile" errorMessage={loadError} onRetry={handleRetry} onBack={() => setActiveTab('dashboard')}>
            <Suspense fallback={<ProfileSkeleton />}>
              <ProfessionalProfile artistId={artistId || ''} onBack={() => setActiveTab('dashboard')} />
            </Suspense>
          </ErrorBoundaryWrapper>
        )}
      </main>

      <ProfessionalBottomNav currentView={activeTab} onNavigate={(view: DashboardTab) => setActiveTab(view)} />
    </div>
  );
}
