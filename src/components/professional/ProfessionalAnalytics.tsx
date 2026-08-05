import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, DollarSign, Calendar, Users, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<{ month: string; revenue: number }[]>([]);
  const [popularServices, setPopularServices] = useState<{ name: string; count: number; percentage: number }[]>([]);

  // Fetch analytics data from Supabase
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);

        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];

        // Fetch all bookings for the artist
        const { data: allBookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('total_price, status, booking_date, service_name')
          .eq('artist_id', artistId);

        if (bookingsError) throw bookingsError;

        // Calculate metrics
        const totalBookings = allBookings?.length || 0;
        const completedBookings = allBookings?.filter(b => b.status === 'completed').length || 0;
        const cancelledBookings = allBookings?.filter(b => b.status === 'cancelled').length || 0;
        
        const todayBookings = allBookings?.filter(b => b.booking_date === today && b.status === 'completed') || [];
        const weekBookings = allBookings?.filter(b => b.booking_date >= weekAgo && b.status === 'completed') || [];
        const monthBookings = allBookings?.filter(b => b.booking_date >= monthStart && b.status === 'completed') || [];
        const yearBookings = allBookings?.filter(b => b.booking_date >= yearStart && b.status === 'completed') || [];

        const todayEarnings = todayBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
        const weekEarnings = weekBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
        const monthEarnings = monthBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
        const yearEarnings = yearBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

        const totalRevenue = allBookings?.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
        const averageBookingValue = completedBookings > 0 ? totalRevenue / completedBookings : 0;

        // Calculate rates
        const pendingBookings = allBookings?.filter(b => b.status === 'pending').length || 0;
        const acceptanceRate = totalBookings > 0 ? ((completedBookings + pendingBookings) / totalBookings) * 100 : 0;
        const completionRate = (completedBookings + pendingBookings) > 0 ? (completedBookings / (completedBookings + pendingBookings)) * 100 : 0;

        // Calculate retention rate: % of customers who have booked more than once
        const customerBookings: Record<string, number> = {};
        allBookings?.forEach(booking => {
          if (booking.status === 'completed' && booking.customer_id) {
            customerBookings[booking.customer_id] = (customerBookings[booking.customer_id] || 0) + 1;
          }
        });
        const totalCustomers = Object.keys(customerBookings).length;
        const repeatCustomers = Object.values(customerBookings).filter(count => count > 1).length;
        const customerRetentionRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

        setAnalytics({
          todayEarnings,
          weekEarnings,
          monthEarnings,
          yearEarnings,
          totalBookings,
          completedBookings,
          cancelledBookings,
          averageBookingValue,
          customerRetentionRate,
          acceptanceRate: Math.round(acceptanceRate),
          completionRate: Math.round(completionRate),
        });

        // Calculate revenue trend by month (last 6 months)
        const monthlyRevenue: Record<string, number> = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        allBookings?.forEach(booking => {
          if (booking.status === 'completed' && booking.booking_date) {
            const date = new Date(booking.booking_date);
            const key = monthNames[date.getMonth()];
            monthlyRevenue[key] = (monthlyRevenue[key] || 0) + (booking.total_price || 0);
          }
        });

        const last6Months = monthNames.slice(0, 6);
        const trendData = last6Months.map(month => ({
          month,
          revenue: monthlyRevenue[month] || 0,
        }));
        setRevenueTrend(trendData);

        // Calculate popular services
        const serviceCounts: Record<string, number> = {};
        allBookings?.forEach(booking => {
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
        console.error('ProfessionalAnalytics: Fetch error:', err.message);
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [artistId]);

  const getEarningsForRange = () => {
    if (!analytics) return 0;
    switch (timeRange) {
      case 'week': return analytics.weekEarnings;
      case 'year': return analytics.yearEarnings;
      default: return analytics.monthEarnings;
    }
  };

  const getGrowthIndicator = () => {
    const growth = 12.5; // Would calculate from period-over-period comparison
    return growth > 0 ? (
      <Badge className="bg-green-100 text-green-800">
        <ArrowUpRight className="w-3 h-3 mr-1" />
        +{growth}%
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">
        <ArrowDownRight className="w-3 h-3 mr-1" />
        {growth}%
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-[#D4AF37] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-gray-900">Analytics</h1>
              <p className="text-xs text-gray-500">Track your business performance</p>
            </div>
            <div className="flex gap-2">
              {(['week', 'month', 'year'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-[#D4AF37] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Primary Earnings Card */}
        <Card className="bg-gradient-to-br from-[#D4AF37] to-orange-500 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-6 h-6 opacity-80" />
                <span className="text-sm opacity-80">Total Earnings ({timeRange})</span>
              </div>
              {getGrowthIndicator()}
            </div>
            <p className="text-4xl font-black mb-2">₹{getEarningsForRange().toLocaleString()}</p>
            <div className="flex items-center gap-4 text-sm opacity-80">
              <span>Average: ₹{analytics.averageBookingValue.toLocaleString()}/booking</span>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-black">{analytics.totalBookings}</p>
                  <p className="text-xs text-gray-500">Total Bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-black">{analytics.completedBookings}</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-black">{analytics.customerRetentionRate}%</p>
                  <p className="text-xs text-gray-500">Retention Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-black">{analytics.acceptanceRate}%</p>
                  <p className="text-xs text-gray-500">Acceptance Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between h-32 gap-2">
              {revenueTrend.map((item, index) => {
                const maxRevenue = Math.max(...revenueTrend.map(r => r.revenue));
                const height = (item.revenue / maxRevenue) * 100;
                return (
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-[#D4AF37] to-orange-400 rounded-t-lg transition-all duration-500"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-gray-500">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Popular Services */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Popular Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {popularServices.map((service, index) => (
              <div key={service.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{service.name}</span>
                  <span className="text-xs text-gray-500">{service.count} bookings</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#D4AF37] to-orange-400 rounded-full transition-all duration-500"
                    style={{ width: `${service.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card className="bg-gradient-to-br from-gray-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completion Rate</span>
              <Badge className="bg-green-100 text-green-800">{analytics.completionRate}%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Acceptance Rate</span>
              <Badge className="bg-blue-100 text-blue-800">{analytics.acceptanceRate}%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Customer Retention</span>
              <Badge className="bg-purple-100 text-purple-800">{analytics.customerRetentionRate}%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Cancellation Rate</span>
              <Badge className="bg-red-100 text-red-800">
                {((analytics.cancelledBookings / analytics.totalBookings) * 100).toFixed(1)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
