import { useState } from 'react';
import { TrendingUp, DollarSign, Calendar, Users, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

  // Mock analytics data - would be fetched from Supabase
  const analytics: AnalyticsData = {
    todayEarnings: 15000,
    weekEarnings: 85000,
    monthEarnings: 320000,
    yearEarnings: 2800000,
    totalBookings: 156,
    completedBookings: 142,
    cancelledBookings: 8,
    averageBookingValue: 12500,
    customerRetentionRate: 68,
    acceptanceRate: 92,
    completionRate: 95,
  };

  const revenueTrend = [
    { month: 'Jan', revenue: 180000 },
    { month: 'Feb', revenue: 220000 },
    { month: 'Mar', revenue: 195000 },
    { month: 'Apr', revenue: 280000 },
    { month: 'May', revenue: 320000 },
    { month: 'Jun', revenue: 290000 },
  ];

  const popularServices = [
    { name: 'Bridal Makeup', count: 45, percentage: 35 },
    { name: 'Reception Makeup', count: 32, percentage: 25 },
    { name: 'Party Makeup', count: 28, percentage: 22 },
    { name: 'HD Makeup', count: 15, percentage: 12 },
    { name: 'Hair Styling', count: 8, percentage: 6 },
  ];

  const getEarningsForRange = () => {
    switch (timeRange) {
      case 'week': return analytics.weekEarnings;
      case 'year': return analytics.yearEarnings;
      default: return analytics.monthEarnings;
    }
  };

  const getGrowthIndicator = () => {
    const growth = 12.5; // Mock growth percentage
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
