import { useState, useEffect, lazy, Suspense, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useGlobalStore } from '../lib/globalStore';
import {
Calendar, Clock, DollarSign, Star, Users, AlertCircle,
CheckCircle, XCircle, MapPin, Zap, Crown, Cpu, Radio, Shield
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

interface FetchResult<T> {
data: T | null;
error: Error | null;
}

const ProfessionalBookings = lazy(() => import('./professional/ProfessionalBookings'));
const ProfessionalAvailability = lazy(() => import('./professional/ProfessionalAvailability'));
const ProfessionalAIAssistant = lazy(() => import('./professional/ProfessionalAIAssistant'));
const ProfessionalAnalytics = lazy(() => import('./professional/ProfessionalAnalytics'));
const ProfessionalProfile = lazy(() => import('./professional/ProfessionalProfile'));

// Helper for status badge styling - Cyberpunk HUD colors
const getStatusColor = (status: BookingStatus): string => {
switch (status) {
case "pending": return "bg-cyan-950/40 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]";
case "confirmed": return "bg-emerald-950/40 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(52,211,153,0.3)]";
case "completed": return "bg-violet-950/40 text-violet-400 border-violet-500/50 shadow-[0_0_10px_rgba(167,139,250,0.3)]";
default: return "bg-slate-950/40 text-slate-400 border-slate-500/50";
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
}: ProfessionalDashboardProps) {
const globalStore = useGlobalStore();
const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
const [bookingFilter, setBookingFilter] = useState<BookingFilter>('all');

const [allBookings, setAllBookings] = useState<BookingWithCustomer[]>([]);
const [reviewData, setReviewData] = useState<ReviewData>({ avgRating: 0, count: 0 });

const [initialLoading, setInitialLoading] = useState(true);
const [loadError, setLoadError] = useState<string | null>(null);

// Offline detection
const { isOnline } = useOfflineDetection();

// Clean artistId usage
const profile = globalStore.user;
const artistId = profile?.id;
const isProfessionalUser = useMemo(() => {
return isProfessionalRole(profile?.role) || profile?.industry === 'makeup_artist' || (profile as any)?.is_seller;
}, [profile?.role, profile?.industry, (profile as any)?.is_seller]);

// Safe Date & Time Extractors
const getSafeDate = useCallback((b: DateExtractable): string => {
return b.booking_date || b.appointment_date || b.date || b.created_at?.split('T')[0] || '';
}, []);

const getSafeTime = useCallback((b: TimeExtractable): string => {
return b.booking_time || b.appointment_time || b.time || 'Time TBD';
}, []);

// Parallel data loading from Supabase only
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

// Derived state for UI filtering
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
<div className="min-h-screen bg-[#030712] relative overflow-hidden pb-32">
<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-[#030712] to-[#0a0a0a]"></div>
<div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMNDAgMEw0MCA0MFoiIGZpbGw9InJnYmEoMTM5LDkyLDI0NiwwLjAzKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20 pointer-events-none"></div>
<OfflineBanner isOnline={isOnline} onRetry={handleRetry} />
<div className="relative max-w-4xl mx-auto px-4 pt-4">
<DashboardSkeleton />
</div>
</div>
);
}

if (!isProfessionalUser || !profile) {
return (
<div className="min-h-screen flex items-center justify-center bg-[#030712] relative overflow-hidden">
<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-[#030712] to-[#0a0a0a]"></div>
<div className="relative text-center max-w-sm w-full mx-4 p-6 bg-slate-950/80 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-[0_0_40px_rgba(34,211,238,0.15)]">
<AlertCircle className="w-16 h-16 text-cyan-400 mx-auto mb-4 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
<h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 mb-2 tracking-tight">Access Restricted</h2>
<p className="text-sm text-slate-400 font-medium mb-6 leading-relaxed">You don't have access to the professional dashboard.</p>
<button  
onClick={onNavigateHome}  
className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] hover:scale-105 transition-all duration-300 border border-cyan-500/30"  
>
Return to Home
</button>
</div>
</div>
);
}

return (
<div className="min-h-screen bg-[#030712] relative overflow-hidden pb-32">
<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-[#030712] to-[#0a0a0a]"></div>
<div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMNDAgMEw0MCA0MFoiIGZpbGw9InJnYmEoMTM5LDkyLDI0NiwwLjAzKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20 pointer-events-none"></div>
<div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-cyan-500/10 rounded-full blur-[100px] -z-10 pointer-events-none animate-pulse"></div>
<div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-fuchsia-500/10 rounded-full blur-[100px] -z-10 pointer-events-none animate-pulse" style={{animationDelay: '1s'}}></div>

<header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-2xl border-b border-cyan-500/30 shadow-[0_4px_30px_rgba(34,211,238,0.1)]">  
    <div className="max-w-4xl mx-auto px-4 py-3">  
      <div className="flex items-center justify-between">  
        <div>  
          <div className="flex items-center gap-1.5">  
            <Crown className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />  
            <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 italic tracking-tighter drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">  
              MITHAS GLOW  
            </h1>  
          </div>  
          <p className="text-[10px] text-cyan-400/80 font-bold tracking-[0.2em] mt-0.5 flex items-center gap-1">
            <Shield className="w-3 h-3 inline" />
            PROFESSIONAL DASHBOARD
          </p>  
        </div>  
          
        <div className="flex items-center gap-2">  
          {/* Home and Refresh icons have been removed from here! */}  
          <button  
            onClick={() => {  
              globalStore.toggleAppViewMode();  
              const newMode = useGlobalStore.getState().appViewMode;  
              toast.success(newMode === 'self' ? 'Switched to Self Mode' : 'Switched to Pro Mode');  
            }}  
            className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all duration-300 border ${  
              globalStore.appViewMode === 'pro'   
                ? 'bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white shadow-[0_0_20px_rgba(34,211,238,0.4)] border-cyan-500/50'   
                : 'bg-slate-900/80 text-cyan-400 border-cyan-500/30'  
            }`}  
          >  
            <Zap className="w-3 h-3 inline mr-1" />  
            {globalStore.appViewMode === 'self' ? 'SELF' : 'PRO'}  
          </button>  
            
          <button  
            onClick={onNavigateToProfile}  
            className="w-8 h-8 rounded-lg bg-slate-900/80 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)] flex items-center justify-center overflow-hidden hover:border-cyan-400/50 transition-colors"  
          >  
            {profile?.avatar_url ? (  
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />  
            ) : (  
              <Users className="w-4 h-4 text-cyan-400" />  
            )}  
          </button>  
        </div>  
      </div>  
    </div>  
  </header>  

  <main className="max-w-4xl mx-auto px-4 pt-4">  
    {activeTab === 'dashboard' && (  
      <ErrorBoundaryWrapper moduleName="DashboardOverview" errorMessage={loadError} onRetry={handleRetry} onBack={() => setActiveTab('dashboard')}>  
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">  
        {loadError && (  
          <div className="mb-4 rounded-xl border border-red-500/50 bg-red-950/40 p-3 text-sm text-red-400 font-semibold shadow-[0_0_15px_rgba(248,113,113,0.2)]">  
            {loadError}  
          </div>  
        )}  

        <div className="mb-4">  
          <div className="relative overflow-hidden bg-slate-950/60 backdrop-blur-xl rounded-xl p-4 border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.1)]">  
            <div className="flex items-center gap-3">  
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-cyan-950/50 to-fuchsia-950/50 border border-cyan-500/30 flex items-center justify-center text-xl overflow-hidden flex-shrink-0 shadow-[0_0_20px_rgba(34,211,238,0.15)]">  
                {profile?.avatar_url ? (  
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />  
                ) : (  
                  <span className="text-2xl">👤</span>  
                )}  
              </div>  
              <div className="flex-1">  
                <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 tracking-tight leading-tight">  
                  Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">{profile?.shop_name || profile?.display_name || "Professional"}</span>  
                </h2>  
                <p className="text-xs text-cyan-400/70 font-bold mt-1 tracking-wide">{formatIndustry(profile?.industry)}</p>  
                <div className="flex items-center gap-2 mt-2 text-[11px] text-cyan-400/80 font-bold">  
                  {profile?.city && (  
                    <span className="flex items-center gap-1 bg-cyan-950/40 px-2 py-1 rounded-lg border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.15)]">  
                      <MapPin className="w-3 h-3 text-cyan-400" /> {profile.city}  
                    </span>  
                  )}  
                </div>  
              </div>  
            </div>  
          </div>  
        </div>  

        <div className="grid grid-cols-2 gap-3 mb-4">  
          <div className="bg-slate-950/60 backdrop-blur-xl rounded-xl p-3 border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.1)]">  
            <div className="flex items-center gap-2 mb-2">  
              <div className="p-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30"><Calendar className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" /></div>  
              <span className="text-lg font-black text-cyan-400">{stats.todayBookings}</span>  
            </div>  
            <p className="text-[11px] text-cyan-400/80 font-bold">Today's Bookings</p>  
          </div>  

          <div className="bg-slate-950/60 backdrop-blur-xl rounded-xl p-3 border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.1)]">  
            <div className="flex items-center gap-2 mb-2">  
              <div className="p-1.5 rounded-lg bg-fuchsia-950/40 border border-fuchsia-500/30"><AlertCircle className="w-4 h-4 text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]" /></div>  
              <span className="text-lg font-black text-fuchsia-400">{stats.pendingRequests}</span>  
            </div>  
            <p className="text-[11px] tracking-wide text-slate-400 font-bold">Pending Requests</p>  
          </div>  

          <div className="bg-slate-950/60 backdrop-blur-xl rounded-xl p-3 border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.1)]">  
            <div className="flex items-center gap-2 mb-2">  
              <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30"><DollarSign className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" /></div>  
              <span className="text-base font-black text-emerald-400">₹{stats.todaysEarnings.toLocaleString()}</span>  
            </div>  
            <p className="text-[11px] text-cyan-400/80 font-bold">Today's Earnings</p>  
          </div>  

          <div className="bg-slate-950/60 backdrop-blur-xl rounded-xl p-3 border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.1)]">  
            <div className="flex items-center gap-2 mb-2">  
              <div className="p-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30"><Star className="w-4 h-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" /></div>  
              <span className="text-lg font-black text-cyan-400">{stats.averageRating.toFixed(1)}</span>  
            </div>  
            <p className="text-[11px] text-cyan-400/80 font-bold">Average Rating ({stats.reviewCount})</p>  
          </div>  
        </div>  

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white shadow-[0_0_20px_rgba(34,211,238,0.15)] overflow-hidden mb-6">  
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
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap shadow-[0_0_20px_rgba(34,211,238,0.15)] ${  
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
                  <div key={booking.id} className="bg-white/90 rounded-xl p-4 border border-white shadow-[0_0_20px_rgba(34,211,238,0.15)]">  
                    <div className="flex items-start gap-3">  
                      <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-lg shadow-[0_0_20px_rgba(34,211,238,0.15)]">  
                        {booking.customer?.avatar_url ? <img src={booking.customer.avatar_url} className="w-full h-full object-cover rounded-xl" /> : '👤'}  
                      </div>  
                      <div className="flex-1 min-w-0">  
                        <div className="flex items-center justify-between gap-1 mb-1">  
                          <h4 className="font-extrabold text-slate-900 truncate text-base">{booking.customer?.full_name || "Customer"}</h4>  
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border shadow-[0_0_20px_rgba(34,211,238,0.15)] ${getStatusColor(booking.status)}`}>  
                            {booking.status}  
                          </span>  
                        </div>  
                        <p className="text-xs text-slate-700 font-bold mb-2">{booking.service_name || "Service"}</p>  
                        <div className="flex flex-wrap gap-2 text-[10px] text-slate-700 font-bold">  
                          <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-purple-100"><Calendar className="w-3 h-3 text-cyan-400" /> {getSafeDate(booking)}</span>  
                          <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-purple-100"><Clock className="w-3 h-3 text-cyan-400" /> {getSafeTime(booking)}</span>  
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
