import {
  useState,
  useEffect,
  lazy,
  Suspense,
  useCallback,
  useMemo,
} from 'react';

import { supabase } from '../lib/supabase';
import { useGlobalStore } from '../lib/globalStore';

import {
  Calendar,
  Clock,
  DollarSign,
  Star,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  MapPin,
  Zap,
  Crown,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  RefreshCw,
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
  AISkeleton,
} from './common/Skeletons';

import {
  useOfflineDetection,
  OfflineBanner,
} from './common/OfflineSupport';

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

const ProfessionalBookings = lazy(
  () => import('./professional/ProfessionalBookings')
);

const ProfessionalAvailability = lazy(
  () => import('./professional/ProfessionalAvailability')
);

const ProfessionalAIAssistant = lazy(
  () => import('./professional/ProfessionalAIAssistant')
);

const ProfessionalAnalytics = lazy(
  () => import('./professional/ProfessionalAnalytics')
);

const ProfessionalProfile = lazy(
  () => import('./professional/ProfessionalProfile')
);

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const getStatusColor = (status: BookingStatus): string => {
  switch (status) {
    case 'pending':
      return 'border-amber-200/80 bg-amber-50 text-amber-700';

    case 'confirmed':
      return 'border-blue-200/80 bg-blue-50 text-blue-700';

    case 'completed':
      return 'border-emerald-200/80 bg-emerald-50 text-emerald-700';

    case 'cancelled':
      return 'border-rose-200/80 bg-rose-50 text-rose-600';

    default:
      return 'border-slate-200 bg-slate-100 text-slate-600';
  }
};

const formatIndustry = (industry?: string | null): string => {
  if (!industry) return 'PROFESSIONAL';

  return industry
    .replace(/_/g, ' ')
    .toUpperCase();
};

/* -------------------------------------------------------------------------- */
/* Reusable UI                                                                */
/* -------------------------------------------------------------------------- */

function GlassCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        rounded-[28px]
        border border-white/80
        bg-white/65
        backdrop-blur-2xl
        shadow-[0_18px_60px_rgba(88,28,135,0.08)]
        ${className}
      `}
    >
      {children}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  iconClass,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  iconClass: string;
  accent: string;
}) {
  return (
    <GlassCard className="group relative overflow-hidden p-4 sm:p-5">
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl opacity-30 ${accent}`}
      />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div
            className={`
              flex h-10 w-10 items-center justify-center
              rounded-2xl border border-white/80
              shadow-sm
              ${iconClass}
            `}
          >
            {icon}
          </div>

          <ArrowUpRight
            className="h-4 w-4 text-slate-300 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
          {label}
        </p>

        <div className="mt-1 flex items-end gap-2">
          <h3 className="text-2xl font-black tracking-tight text-slate-900">
            {value}
          </h3>

          {subtext && (
            <span className="mb-1 text-[10px] font-bold text-slate-400">
              {subtext}
            </span>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        rounded-full border
        px-2.5 py-1
        text-[9px]
        font-black
        uppercase
        tracking-[0.12em]
        ${getStatusColor(status)}
      `}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === 'confirmed'
            ? 'bg-blue-500'
            : status === 'completed'
            ? 'bg-emerald-500'
            : status === 'pending'
            ? 'animate-pulse bg-amber-500'
            : 'bg-rose-500'
        }`}
      />

      {status}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Dashboard                                                             */
/* -------------------------------------------------------------------------- */

export default function ProfessionalDashboard({
  onNavigateHome,
  onNavigateToProfile,
}: ProfessionalDashboardProps) {
  const globalStore = useGlobalStore();

  const [activeTab, setActiveTab] =
    useState<DashboardTab>('dashboard');

  const [bookingFilter, setBookingFilter] =
    useState<BookingFilter>('all');

  const [allBookings, setAllBookings] =
    useState<BookingWithCustomer[]>([]);

  const [reviewData, setReviewData] =
    useState<ReviewData>({
      avgRating: 0,
      count: 0,
    });

  const [initialLoading, setInitialLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const { isOnline } = useOfflineDetection();

  const profile = globalStore.user;
  const artistId = profile?.id;

  const isProfessionalUser = useMemo(() => {
    return (
      isProfessionalRole(profile?.role) ||
      profile?.industry === 'makeup_artist' ||
      (profile as any)?.is_seller
    );
  }, [
    profile?.role,
    profile?.industry,
    (profile as any)?.is_seller,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Safe extractors                                                          */
  /* ------------------------------------------------------------------------ */

  const getSafeDate = useCallback(
    (b: DateExtractable): string => {
      return (
        b.booking_date ||
        b.appointment_date ||
        b.date ||
        b.created_at?.split('T')[0] ||
        ''
      );
    },
    []
  );

  const getSafeTime = useCallback(
    (b: TimeExtractable): string => {
      return (
        b.booking_time ||
        b.appointment_time ||
        b.time ||
        'Time TBD'
      );
    },
    []
  );

  /* ------------------------------------------------------------------------ */
  /* Supabase                                                                  */
  /* ------------------------------------------------------------------------ */

  const fetchBookings = useCallback(
    async (
      targetArtistId: string
    ): Promise<BookingWithCustomer[]> => {
      const {
        data: bookingsData,
        error: bookingsError,
      } = await supabase
        .from('bookings')
        .select(
          `
          *,
          customer:profiles!bookings_customer_id_fkey(
            full_name,
            phone,
            avatar_url
          )
        `
        )
        .eq('artist_id', targetArtistId)
        .order('created_at', {
          ascending: false,
        });

      if (bookingsError) throw bookingsError;

      return (bookingsData || []) as BookingWithCustomer[];
    },
    []
  );

  const fetchReviews = useCallback(
    async (
      targetArtistId: string
    ): Promise<ReviewData> => {
      const {
        data: reviews,
        error: reviewsError,
      } = await supabase
        .from('reviews')
        .select('rating')
        .eq('artist_id', targetArtistId);

      if (reviewsError) throw reviewsError;

      const count = reviews?.length || 0;

      const avgRating =
        count > 0
          ? reviews.reduce(
              (sum, r) => sum + r.rating,
              0
            ) / count
          : 0;

      return {
        avgRating,
        count,
      };
    },
    []
  );

  const loadDashboardData = useCallback(
    async (targetArtistId: string) => {
      const [
        bookingsData,
        reviewsData,
      ] = await Promise.all([
        fetchBookings(targetArtistId),
        fetchReviews(targetArtistId),
      ]);

      setAllBookings(bookingsData);
      setReviewData(reviewsData);
    },
    [fetchBookings, fetchReviews]
  );

  const handleRetry = useCallback(
    async () => {
      if (!artistId) return;

      setInitialLoading(true);
      setLoadError(null);

      try {
        await loadDashboardData(artistId);

        toast.success(
          'Dashboard synced successfully'
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unknown dashboard error';

        setLoadError(message);
        toast.error(message);
      } finally {
        setInitialLoading(false);
      }
    },
    [artistId, loadDashboardData]
  );

  /* ------------------------------------------------------------------------ */
  /* Initial load                                                              */
  /* ------------------------------------------------------------------------ */

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

        const message =
          err instanceof Error
            ? err.message
            : 'Unknown dashboard error';

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
  }, [
    artistId,
    isProfessionalUser,
    loadDashboardData,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Stats                                                                     */
  /* ------------------------------------------------------------------------ */

  const stats = useMemo(() => {
    return calculateDashboardStats({
      bookings: allBookings,
      avgRating: reviewData.avgRating,
      reviewCount: reviewData.count,
    });
  }, [allBookings, reviewData]);

  const displayedBookings = useMemo(() => {
    if (bookingFilter === 'all') {
      return allBookings;
    }

    return allBookings.filter(
      (b) => b.status === bookingFilter
    );
  }, [allBookings, bookingFilter]);

  /* ------------------------------------------------------------------------ */
  /* Booking status                                                            */
  /* ------------------------------------------------------------------------ */

  const updateBookingStatus = async (
    bookingId: string,
    newStatus: BookingStatus,
    successMessage: string
  ) => {
    if (!artistId) {
      toast.error(
        'Missing artist id for booking update.'
      );
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) throw error;

      const refreshedBookings =
        await fetchBookings(artistId);

      setAllBookings(refreshedBookings);

      toast.success(successMessage);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Booking update failed';

      toast.error(message);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Realtime                                                                  */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!artistId) return;

    const channel = supabase
      .channel(`bookings:${artistId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `artist_id=eq.${artistId}`,
        },
        async () => {
          try {
            await loadDashboardData(artistId);
          } catch (err) {
            logger.error(
              'Realtime refresh failed',
              err
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [artistId, loadDashboardData]);

  /* ------------------------------------------------------------------------ */
  /* Loading                                                                   */
  /* ------------------------------------------------------------------------ */

  if (initialLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#faf7ff] pb-32">
        <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-fuchsia-300/20 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-purple-300/20 blur-[100px]" />

        <OfflineBanner
          isOnline={isOnline}
          onRetry={handleRetry}
        />

        <div className="mx-auto max-w-4xl px-4 pt-6">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Access restricted                                                         */
  /* ------------------------------------------------------------------------ */

  if (!isProfessionalUser || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf7ff] px-4">
        <GlassCard className="w-full max-w-sm p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-100 to-fuchsia-100">
            <AlertCircle className="h-8 w-8 text-purple-500" />
          </div>

          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Access Restricted
          </h2>

          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
            You don't have access to the professional dashboard.
          </p>

          <button
            onClick={onNavigateHome}
            className="
              mt-6 w-full rounded-2xl
              bg-gradient-to-r from-purple-600 to-fuchsia-500
              px-5 py-3.5
              text-sm font-black text-white
              shadow-[0_12px_30px_rgba(168,85,247,0.28)]
              transition-all
              hover:-translate-y-0.5
              active:scale-[0.98]
            "
          >
            Return to Home
          </button>
        </GlassCard>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Dashboard                                                                 */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#faf7ff] pb-32">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-purple-300/20 blur-[110px]" />
        <div className="absolute -left-40 bottom-0 h-[28rem] w-[28rem] rounded-full bg-fuchsia-300/15 blur-[110px]" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-pink-200/10 blur-[100px]" />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}

      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/60 backdrop-blur-2xl">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500 shadow-[0_8px_25px_rgba(168,85,247,0.3)]">
                <Sparkles className="h-5 w-5 text-white" />

                <div className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white/20 blur-md" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="truncate text-lg font-black tracking-tight text-slate-900">
                    MITHAS
                    <span className="bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
                      {' '}
                      GLOW
                    </span>
                  </h1>

                  <span className="rounded-full border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-purple-600">
                    PRO
                  </span>
                </div>

                <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Professional Studio
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  globalStore.toggleAppViewMode();

                  const newMode =
                    useGlobalStore.getState()
                      .appViewMode;

                  toast.success(
                    newMode === 'self'
                      ? 'Switched to Self Mode'
                      : 'Switched to Pro Mode'
                  );
                }}
                className={`
                  hidden items-center gap-1.5 rounded-full
                  px-3 py-2
                  text-[9px] font-black
                  tracking-widest
                  transition-all sm:flex
                  ${
                    globalStore.appViewMode === 'pro'
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white shadow-[0_8px_20px_rgba(168,85,247,0.25)]'
                      : 'border border-purple-100 bg-white/80 text-slate-600'
                  }
                `}
              >
                <Zap className="h-3 w-3" />
                {globalStore.appViewMode === 'self'
                  ? 'SELF'
                  : 'PRO'}
              </button>

              <button
                onClick={onNavigateToProfile}
                className="
                  relative h-10 w-10 overflow-hidden
                  rounded-2xl border border-white
                  bg-white shadow-sm
                  transition-transform
                  hover:scale-105
                "
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-100 to-fuchsia-100">
                    <Users className="h-4 w-4 text-purple-500" />
                  </div>
                )}

                <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Main                                                                */}
      {/* ------------------------------------------------------------------ */}

      <main className="mx-auto max-w-4xl px-4 pt-5">
        {activeTab === 'dashboard' && (
          <ErrorBoundaryWrapper
            moduleName="DashboardOverview"
            errorMessage={loadError}
            onRetry={handleRetry}
            onBack={() =>
              setActiveTab('dashboard')
            }
          >
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
              {/* Error */}
              {loadError && (
                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">
                    {loadError}
                  </span>

                  <button
                    onClick={handleRetry}
                    className="rounded-xl bg-white px-3 py-1.5 text-[10px] font-black shadow-sm"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* ---------------------------------------------------------- */}
              {/* Hero                                                        */}
              {/* ---------------------------------------------------------- */}

              <GlassCard className="relative mb-5 overflow-hidden p-5">
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-purple-300/20 blur-3xl" />

                <div className="relative flex items-center gap-4">
                  <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-[22px] border-2 border-white bg-gradient-to-br from-purple-100 to-fuchsia-100 shadow-lg">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">
                        👤
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="mb-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.18em] text-purple-500">
                      <Sparkles className="h-3 w-3" />
                      Welcome back
                    </p>

                    <h2 className="truncate text-xl font-black tracking-tight text-slate-900">
                      {profile.shop_name ||
                        profile.display_name ||
                        'Professional'}
                    </h2>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-purple-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-purple-600">
                        {formatIndustry(
                          profile.industry
                        )}
                      </span>

                      {profile.city && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <MapPin className="h-3 w-3" />
                          {profile.city}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* ---------------------------------------------------------- */}
              {/* KPI Stats                                                   */}
              {/* ---------------------------------------------------------- */}

              <div className="mb-5 grid grid-cols-2 gap-3">
                <StatCard
                  icon={
                    <Calendar className="h-4 w-4 text-purple-600" />
                  }
                  iconClass="bg-purple-50"
                  accent="bg-purple-500"
                  label="Today's Bookings"
                  value={String(
                    stats.todayBookings
                  )}
                />

                <StatCard
                  icon={
                    <AlertCircle className="h-4 w-4 text-fuchsia-600" />
                  }
                  iconClass="bg-fuchsia-50"
                  accent="bg-fuchsia-500"
                  label="Pending Requests"
                  value={String(
                    stats.pendingRequests
                  )}
                />

                <StatCard
                  icon={
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                  }
                  iconClass="bg-emerald-50"
                  accent="bg-emerald-500"
                  label="Today's Earnings"
                  value={`₹${stats.todaysEarnings.toLocaleString()}`}
                />

                <StatCard
                  icon={
                    <Star className="h-4 w-4 text-amber-500" />
                  }
                  iconClass="bg-amber-50"
                  accent="bg-amber-500"
                  label="Rating"
                  value={stats.averageRating.toFixed(1)}
                  subtext={`(${stats.reviewCount})`}
                />
              </div>

              {/* ---------------------------------------------------------- */}
              {/* Performance mini banner                                   */}
              {/* ---------------------------------------------------------- */}

              <GlassCard className="mb-5 overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Studio performance
                    </p>

                    <p className="mt-0.5 text-xs font-black text-slate-800">
                      Keep your availability updated to receive more bookings.
                    </p>
                  </div>

                  <Sparkles className="h-4 w-4 flex-shrink-0 text-purple-400" />
                </div>
              </GlassCard>

              {/* ---------------------------------------------------------- */}
              {/* Bookings                                                    */}
              {/* ---------------------------------------------------------- */}

              <GlassCard className="mb-6 overflow-hidden">
                <div className="border-b border-purple-100/60 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black tracking-tight text-slate-900">
                          Bookings
                        </h3>

                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-black text-purple-600">
                          {displayedBookings.length}
                        </span>
                      </div>

                      <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                        Manage your client appointments
                      </p>
                    </div>

                    <button
                      onClick={handleRetry}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-100 bg-white text-purple-500 shadow-sm transition hover:bg-purple-50 active:scale-95"
                      aria-label="Refresh bookings"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Filters */}
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
                    {(
                      [
                        'all',
                        'pending',
                        'confirmed',
                        'completed',
                        'cancelled',
                      ] as const
                    ).map(
                      (
                        filter: BookingFilter
                      ) => {
                        const active =
                          bookingFilter === filter;

                        return (
                          <button
                            key={filter}
                            onClick={() =>
                              setBookingFilter(
                                filter
                              )
                            }
                            className={`
                              flex-shrink-0 rounded-full
                              border px-3.5 py-2
                              text-[9px]
                              font-black
                              uppercase
                              tracking-wider
                              transition-all
                              ${
                                active
                                  ? 'border-transparent bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white shadow-[0_6px_18px_rgba(168,85,247,0.25)]'
                                  : 'border-purple-100 bg-white text-slate-500 hover:bg-purple-50'
                              }
                            `}
                          >
                            {filter}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="p-3">
                  {displayedBookings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-purple-200 bg-purple-50/40 py-12 text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                        <Calendar className="h-6 w-6 text-purple-300" />
                      </div>

                      <p className="text-sm font-black text-slate-700">
                        No bookings found
                      </p>

                      <p className="mt-1 max-w-xs text-[11px] font-medium leading-relaxed text-slate-400">
                        New client appointments will appear here automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {displayedBookings.map(
                        (booking) => (
                          <div
                            key={booking.id}
                            className="
                              group rounded-[24px]
                              border border-slate-100
                              bg-white/90
                              p-4
                              shadow-sm
                              transition-all
                              hover:-translate-y-0.5
                              hover:border-purple-200
                              hover:shadow-[0_12px_35px_rgba(88,28,135,0.08)]
                            "
                          >
                            {/* Customer */}
                            <div className="flex items-start gap-3">
                              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-fuchsia-50">
                                {booking.customer
                                  ?.avatar_url ? (
                                  <img
                                    src={
                                      booking
                                        .customer
                                        .avatar_url
                                    }
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-lg">
                                    👤
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h4 className="truncate text-sm font-black text-slate-900">
                                      {booking.customer
                                        ?.full_name ||
                                        'Customer'}
                                    </h4>

                                    <p className="mt-0.5 truncate text-[11px] font-bold text-purple-600">
                                      {booking.service_name ||
                                        'Service'}
                                    </p>
                                  </div>

                                  <StatusBadge
                                    status={
                                      booking.status
                                    }
                                  />
                                </div>

                                {/* Booking metadata */}
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  <span className="flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-500">
                                    <Calendar className="h-3 w-3 text-purple-500" />
                                    {getSafeDate(
                                      booking
                                    )}
                                  </span>

                                  <span className="flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-500">
                                    <Clock className="h-3 w-3 text-purple-500" />
                                    {getSafeTime(
                                      booking
                                    )}
                                  </span>

                                  {booking.total_price && (
                                    <span className="flex items-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">
                                      <DollarSign className="h-3 w-3" />
                                      ₹
                                      {booking.total_price}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            {booking.status ===
                              'pending' && (
                              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                                <button
                                  onClick={() =>
                                    updateBookingStatus(
                                      booking.id,
                                      'confirmed',
                                      'Booking accepted!'
                                    )
                                  }
                                  className="
                                    flex items-center
                                    justify-center gap-1.5
                                    rounded-xl
                                    bg-gradient-to-r
                                    from-emerald-500
                                    to-teal-500
                                    py-2.5
                                    text-[10px]
                                    font-black
                                    uppercase
                                    tracking-wider
                                    text-white
                                    shadow-[0_6px_16px_rgba(16,185,129,0.2)]
                                    transition-all
                                    hover:-translate-y-0.5
                                    active:scale-95
                                  "
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Accept
                                </button>

                                <button
                                  onClick={() =>
                                    updateBookingStatus(
                                      booking.id,
                                      'cancelled',
                                      'Booking declined'
                                    )
                                  }
                                  className="
                                    flex items-center
                                    justify-center gap-1.5
                                    rounded-xl
                                    border border-rose-200
                                    bg-rose-50
                                    py-2.5
                                    text-[10px]
                                    font-black
                                    uppercase
                                    tracking-wider
                                    text-rose-600
                                    transition-all
                                    hover:bg-rose-100
                                    active:scale-95
                                  "
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Decline
                                </button>
                              </div>
                            )}

                            {booking.status ===
                              'confirmed' && (
                              <button
                                onClick={() =>
                                  updateBookingStatus(
                                    booking.id,
                                    'completed',
                                    'Booking completed!'
                                  )
                                }
                                className="
                                  mt-4 flex w-full
                                  items-center justify-center
                                  gap-1.5
                                  rounded-xl
                                  bg-gradient-to-r
                                  from-purple-600
                                  to-fuchsia-500
                                  py-2.5
                                  text-[10px]
                                  font-black
                                  uppercase
                                  tracking-wider
                                  text-white
                                  shadow-[0_7px_20px_rgba(168,85,247,0.22)]
                                  transition-all
                                  hover:-translate-y-0.5
                                  active:scale-95
                                "
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Mark Complete
                              </button>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>
          </ErrorBoundaryWrapper>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Other tabs                                                        */}
        {/* ---------------------------------------------------------------- */}

        {activeTab === 'bookings' && (
          <ErrorBoundaryWrapper
            moduleName="Bookings"
            errorMessage={loadError}
            onRetry={handleRetry}
            onBack={() =>
              setActiveTab('dashboard')
            }
          >
            <Suspense
              fallback={<BookingSkeleton />}
            >
              <ProfessionalBookings
                artistId={artistId || ''}
                onBack={() =>
                  setActiveTab('dashboard')
                }
              />
            </Suspense>
          </ErrorBoundaryWrapper>
        )}

        {activeTab === 'availability' && (
          <ErrorBoundaryWrapper
            moduleName="Availability"
            errorMessage={loadError}
            onRetry={handleRetry}
            onBack={() =>
              setActiveTab('dashboard')
            }
          >
            <Suspense
              fallback={<AvailabilitySkeleton />}
            >
              <ProfessionalAvailability
                artistId={artistId || ''}
                onBack={() =>
                  setActiveTab('dashboard')
                }
              />
            </Suspense>
          </ErrorBoundaryWrapper>
        )}

        {activeTab === 'ai-assistant' && (
          <ErrorBoundaryWrapper
            moduleName="AI Assistant"
            errorMessage={loadError}
            onRetry={handleRetry}
            onBack={() =>
              setActiveTab('dashboard')
            }
          >
            <Suspense fallback={<AISkeleton />}>
              <ProfessionalAIAssistant
                artistId={artistId || ''}
                onBack={() =>
                  setActiveTab('dashboard')
                }
              />
            </Suspense>
          </ErrorBoundaryWrapper>
        )}

        {activeTab === 'analytics' && (
          <ErrorBoundaryWrapper
            moduleName="Analytics"
            errorMessage={loadError}
            onRetry={handleRetry}
            onBack={() =>
              setActiveTab('dashboard')
            }
          >
            <Suspense
              fallback={<AnalyticsSkeleton />}
            >
              <ProfessionalAnalytics
                artistId={artistId || ''}
                onBack={() =>
                  setActiveTab('dashboard')
                }
              />
            </Suspense>
          </ErrorBoundaryWrapper>
        )}

        {activeTab === 'profile' && (
          <ErrorBoundaryWrapper
            moduleName="Profile"
            errorMessage={loadError}
            onRetry={handleRetry}
            onBack={() =>
              setActiveTab('dashboard')
            }
          >
            <Suspense
              fallback={<ProfileSkeleton />}
            >
              <ProfessionalProfile
                artistId={artistId || ''}
                onBack={() =>
                  setActiveTab('dashboard')
                }
              />
            </Suspense>
          </ErrorBoundaryWrapper>
        )}
      </main>

      {/* Bottom Navigation */}
      <ProfessionalBottomNav
        currentView={activeTab}
        onNavigate={(view: DashboardTab) =>
          setActiveTab(view)
        }
      />
    </div>
  );
}
