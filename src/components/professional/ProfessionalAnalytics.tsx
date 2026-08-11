import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Calendar, BarChart3, Sparkles, IndianRupee, Wallet, Activity, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface AnalyticsData {
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  yearEarnings: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  averageBookingValue: number;
  customerRetentionRate: number;
  acceptanceRate: number;
  completionRate: number;
}

interface ProfessionalAnalyticsProps {
  artistId: string;
  onBack?: () => void;
}

export default function ProfessionalAnalytics({ artistId, onBack }: ProfessionalAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<{ month: string; revenue: number }[]>([]);
  const [popularServices, setPopularServices] = useState<{ name: string; count: number; percentage: number }[]>([]);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];

      const { data: allBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('total_price, status, booking_date, service_name')
        .eq('artist_id', artistId);

      if (bookingsError) throw bookingsError;

      const bookings = allBookings || [];
      const totalBookings = bookings.length;
      const completedBookings = bookings.filter(b => b.status === 'completed').length;
      const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;

      const todayBookings = bookings.filter(b => (b.booking_date || '').startsWith(today) && b.status === 'completed');
      const weekBookings = bookings.filter(b => (b.booking_date || '') >= weekAgo && b.status === 'completed');
      const monthBookings = bookings.filter(b => (b.booking_date || '') >= monthStart && b.status === 'completed');
      const yearBookings = bookings.filter(b => (b.booking_date || '') >= yearStart && b.status === 'completed');

      const todayEarnings = todayBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
      const weekEarnings = weekBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
      const monthEarnings = monthBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
      const yearEarnings = yearBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

      const totalRevenue = bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.total_price || 0), 0);
      const averageBookingValue = completedBookings > 0 ? totalRevenue / completedBookings : 0;

      const pendingBookings = bookings.filter(b => b.status === 'pending').length;
      const acceptanceRate = totalBookings > 0 ? ((completedBookings + pendingBookings) / totalBookings) * 100 : 0;
      const completionRate = (completedBookings + pendingBookings) > 0 ? (completedBookings / (completedBookings + pendingBookings)) * 100 : 0;

      setAnalytics({
        todayEarnings,
        weekEarnings,
        monthEarnings,
        yearEarnings,
        totalBookings,
        completedBookings,
        cancelledBookings,
        averageBookingValue: Math.round(averageBookingValue),
        customerRetentionRate: 0,
        acceptanceRate: Math.round(acceptanceRate),
        completionRate: Math.round(completionRate),
      });

      const monthlyRevenue: Record<string, number> = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      bookings.forEach(booking => {
        if (booking.status === 'completed' && booking.booking_date) {
          const date = new Date(booking.booking_date);
          if (!isNaN(date.getTime())) {
            const key = monthNames[date.getMonth()];
            monthlyRevenue[key] = (monthlyRevenue[key] || 0) + (booking.total_price || 0);
          }
        }
      });

      const currentMonth = new Date().getMonth();
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(currentMonth - i);
        last6Months.push(monthNames[d.getMonth()]);
      }

      const trendData = last6Months.map(month => ({
        month,
        revenue: monthlyRevenue[month] || 0,
      }));
      setRevenueTrend(trendData);

      const serviceCounts: Record<string, number> = {};
      bookings.forEach(booking => {
        if (booking.service_name) {
          serviceCounts[booking.service_name] = (serviceCounts[booking.service_name] || 0) + 1;
        }
      });

      const totalServices = Object.values(serviceCounts).reduce((a, b) => a + b, 0);
      const sortedServices = Object.entries(serviceCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({
          name,
          count,
          percentage: totalServices > 0 ? Math.round((count / totalServices) * 100) : 0,
        }));
      setPopularServices(sortedServices);
    } catch (err: any) {
      const message = err?.message || 'Failed to load analytics';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [artistId]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const getEarningsForRange = () => {
    if (!analytics) return 0;
    switch (timeRange) {
      case 'week': return analytics.weekEarnings;
      case 'year': return analytics.yearEarnings;
      default: return analytics.monthEarnings;
    }
  };

  if (errorMessage) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <p className="text-sm font-semibold text-pink-600">{errorMessage}</p>
        <button onClick={() => void loadAnalytics()} className="mt-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-pink-200">
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-in fade-in duration-500 min-h-[60vh] flex flex-col items-center justify-center bg-white">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-[#2d1b4e] rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-pink-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <Sparkles className="absolute inset-0 m-auto w-7 h-7 text-pink-500 animate-pulse" />
        </div>
        <p className="text-pink-600/70 font-black tracking-widest text-[10px] uppercase animate-pulse">Processing Data...</p>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white min-h-screen">
      
      {/* 💎 Floating Glass Controls */}
      <div className="flex items-center justify-between mb-6 bg-pink-50/80 backdrop-blur-2xl p-2 pl-5 rounded-[2rem] border border-pink-100 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
        <div>
          <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Revenue</h2>
        </div>
        <div className="flex gap-1 p-1 bg-white/50 rounded-full border border-pink-100">
          {(['week', 'month', 'year'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
                timeRange === range
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-200'
                  : 'text-pink-600/70 hover:bg-pink-50'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* 🚀 Ultra-Premium Main Earning Card (Dark Theme Insert) */}
      <div className="relative bg-gradient-to-br from-[#2d1b4e] via-[#1e0f3a] to-[#2d1b4e] p-6 rounded-[2rem] shadow-2xl shadow-purple-900/20 mb-6 overflow-hidden border border-pink-100">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-pink-100 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-100 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl backdrop-blur-md border border-pink-100">
              <IndianRupee className="w-3.5 h-3.5 text-pink-500" />
              <span className="text-[9px] font-black uppercase tracking-widest text-pink-200">{timeRange}</span>
            </div>
          </div>
          
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-3xl font-bold text-pink-600/80">₹</span>
            <p className="text-5xl sm:text-6xl font-black text-white tracking-tighter drop-shadow-md">
              {getEarningsForRange().toLocaleString()}
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-[10px] font-extrabold tracking-wide text-pink-600/60 bg-black/20 w-fit px-3 py-1.5 rounded-lg border border-white/5">
            <Wallet className="w-3.5 h-3.5" />
            <span>AVG. ₹{analytics.averageBookingValue.toLocaleString()} / BOOKING</span>
          </div>
        </div>
      </div>

      {/* 📊 Visual Stats Grid (No more boring text cards) */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        
        {/* Total Bookings */}
        <div className="bg-pink-50/70 backdrop-blur-2xl p-5 rounded-3xl border border-pink-100 shadow-[0_8px_30px_rgba(0,0,0,0.3)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-bl-full transition-transform group-hover:scale-110"></div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white mb-3 shadow-lg shadow-purple-200">
            <Calendar className="w-5 h-5" />
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{analytics.totalBookings}</p>
          <p className="text-[9px] font-extrabold uppercase tracking-widest text-pink-600/50 mt-1">Total Bookings</p>
        </div>

        {/* Completed */}
        <div className="bg-pink-50/70 backdrop-blur-2xl p-5 rounded-3xl border border-pink-100 shadow-[0_8px_30px_rgba(0,0,0,0.3)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-lavender-500/10 rounded-bl-full transition-transform group-hover:scale-110"></div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-lavender-400 to-lavender-600 flex items-center justify-center text-white mb-3 shadow-lg shadow-lavender-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{analytics.completedBookings}</p>
          <p className="text-[9px] font-extrabold uppercase tracking-widest text-pink-600/50 mt-1">Completed</p>
        </div>

        {/* Accept Rate with Progress Bar */}
        <div className="bg-pink-50/70 backdrop-blur-2xl p-5 rounded-3xl border border-pink-100 shadow-[0_8px_30px_rgba(0,0,0,0.3)] relative overflow-hidden group col-span-2 sm:col-span-1">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-pink-200">
              <Activity className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-slate-900">{analytics.acceptanceRate}%</p>
          </div>
          <p className="text-[9px] font-extrabold uppercase tracking-widest text-pink-600/50 mb-2">Acceptance Rate</p>
          <div className="w-full h-2 bg-white rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-400 to-pink-600 rounded-full transition-all duration-1000" style={{ width: `${analytics.acceptanceRate}%`}}></div>
          </div>
        </div>

        {/* Completion Rate with Progress Bar */}
        <div className="bg-pink-50/70 backdrop-blur-2xl p-5 rounded-3xl border border-pink-100 shadow-[0_8px_30px_rgba(0,0,0,0.3)] relative overflow-hidden group col-span-2 sm:col-span-1">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-200">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-slate-900">{analytics.completionRate}%</p>
          </div>
          <p className="text-[9px] font-extrabold uppercase tracking-widest text-pink-600/50 mb-2">Completion Rate</p>
          <div className="w-full h-2 bg-white rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-1000" style={{ width: `${analytics.completionRate}%`}}></div>
          </div>
        </div>
      </div>

      {/* 📈 6-Month Visual Revenue Trend */}
      <div className="bg-pink-50/70 backdrop-blur-2xl p-6 rounded-3xl border border-pink-100 shadow-[0_8px_30px_rgba(0,0,0,0.3)] mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-pink-500" /> Revenue Timeline
        </h3>
        <div className="flex items-end justify-between h-40 gap-3">
          {revenueTrend.map((item) => {
            const maxRevenue = Math.max(...revenueTrend.map(r => r.revenue), 1); 
            const height = (item.revenue / maxRevenue) * 100;
            
            return (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-3 group cursor-pointer h-full justify-end">
                <div className="w-full relative flex justify-center h-full items-end">
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-pink-50 text-slate-900 text-[9px] font-bold px-2 py-1 rounded-lg transition-all transform group-hover:-translate-y-1 whitespace-nowrap z-10 shadow-lg border border-pink-100">
                    ₹{item.revenue.toLocaleString()}
                  </div>
                  <div
                    className={`w-full max-w-[24px] rounded-full transition-all duration-700 ease-out ${item.revenue > 0 ? 'bg-gradient-to-t from-pink-500 to-purple-400 shadow-[0_0_15px_rgba(236,72,153,0.4)] group-hover:shadow-[0_0_20px_rgba(236,72,153,0.6)]' : 'bg-white'}`}
                    style={{ height: `${Math.max(height, 8)}%` }}
                  />
                </div>
                <span className="text-[9px] font-extrabold text-pink-600/50 group-hover:text-pink-500 transition-colors uppercase">{item.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ⭐ Top Services Visually */}
      {popularServices.length > 0 && (
        <div className="bg-pink-50/70 backdrop-blur-2xl p-6 rounded-3xl border border-pink-100 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-500" /> Top Services
          </h3>
          <div className="space-y-5">
            {popularServices.map((service) => (
              <div key={service.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-pink-200 uppercase tracking-wide">{service.name}</span>
                  <span className="text-[9px] font-black text-pink-600 bg-pink-100 px-2 py-1 rounded-lg border border-pink-100">{service.count} SESSIONS</span>
                </div>
                <div className="h-3 bg-white rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-1000 ease-out shadow-sm"
                    style={{ width: `${service.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
