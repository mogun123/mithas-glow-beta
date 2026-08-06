--- src/components/common/DashboardComponents.tsx (原始)


+++ src/components/common/DashboardComponents.tsx (修改后)
/**
 * Reusable Professional Dashboard Components
 * Optimized with React.memo to prevent unnecessary renders
 */

import { memo, useCallback } from 'react';
import { Calendar, Clock, DollarSign, Star, MapPin, Phone, MessageCircle, Navigation, MoreHorizontal, CheckCircle, XCircle } from 'lucide-react';
import type { BookingWithDetails, DashboardStats, BookingStatus } from '../../lib/types/professional';

// ============================================================================
// DashboardHeader Component
// ============================================================================

interface DashboardHeaderProps {
  shopName?: string | null;
  displayName?: string | null;
  industry?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
  onProfileClick?: () => void;
}

export const DashboardHeader = memo(function DashboardHeader({
  shopName,
  displayName,
  industry,
  city,
  avatarUrl,
  onProfileClick,
}: DashboardHeaderProps) {
  const handleProfileClick = useCallback(() => {
    onProfileClick?.();
  }, [onProfileClick]);

  return (
    <div className="mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-white shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-100 to-fuchsia-50 border border-white flex items-center justify-center text-xl overflow-hidden flex-shrink-0 shadow-sm cursor-pointer hover:scale-105 transition-transform duration-300"
            onClick={handleProfileClick}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>👤</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight truncate">
              Welcome back,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-fuchsia-600">
                {shopName || displayName || 'Professional'}
              </span>
            </h2>
            {industry && (
              <p className="text-xs text-slate-700 font-bold mt-1">
                {industry.replace('_', ' ').toUpperCase()}
              </p>
            )}
            {city && (
              <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-700 font-bold">
                <span className="flex items-center gap-1 bg-white/60 px-2 py-1 rounded-full border border-purple-100">
                  <MapPin className="w-3 h-3 text-purple-500" /> {city}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// StatCard Component
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  iconBgClass?: string;
  iconColorClass?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export const StatCard = memo(function StatCard({
  icon,
  value,
  label,
  iconBgClass = 'bg-purple-100/80',
  iconColorClass = 'text-purple-600',
  trend,
  trendValue,
}: StatCardProps) {
  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 border border-white shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${iconBgClass}`}>
          {icon}
        </div>
        <span className="text-lg font-extrabold text-slate-900">{value}</span>
      </div>
      <p className="text-[11px] text-slate-700 font-bold">{label}</p>
      {trend && trendValue && (
        <div className={`mt-1 text-[9px] font-bold ${
          trend === 'up' ? 'text-emerald-600' :
          trend === 'down' ? 'text-rose-600' : 'text-slate-500'
        }`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// StatsGrid Component
// ============================================================================

interface StatsGridProps {
  stats: DashboardStats;
}

export const StatsGrid = memo(function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      <StatCard
        icon={<Calendar className="w-4 h-4" />}
        value={stats.todayBookings || 0}
        label="Today's Bookings"
        iconBgClass="bg-purple-100/80"
        iconColorClass="text-purple-600"
      />
      <StatCard
        icon={<DollarSign className="w-4 h-4" />}
        value={`₹${(stats.todaysEarnings || 0).toLocaleString()}`}
        label="Today's Earnings"
        iconBgClass="bg-emerald-100/80"
        iconColorClass="text-emerald-600"
      />
      <StatCard
        icon={<Star className="w-4 h-4" />}
        value={stats.averageRating || 0}
        label="Average Rating"
        iconBgClass="bg-amber-100/80"
        iconColorClass="text-amber-600"
      />
      <StatCard
        icon={<Calendar className="w-4 h-4" />}
        value={stats.upcomingAppointments || 0}
        label="Upcoming"
        iconBgClass="bg-blue-100/80"
        iconColorClass="text-blue-600"
      />
    </div>
  );
});

// ============================================================================
// BookingCard Component
// ============================================================================

interface BookingCardProps {
  booking: BookingWithDetails;
  onStatusChange?: (bookingId: string, status: BookingStatus, message: string) => void;
  onCall?: (phone: string | null) => void;
  onChat?: (customerId: string) => void;
  onDirections?: (address?: string) => void;
  onViewDetails?: (bookingId: string) => void;
  onReschedule?: (bookingId: string) => void;
}

export const BookingCard = memo(function BookingCard({
  booking,
  onStatusChange,
  onCall,
  onChat,
  onDirections,
  onViewDetails,
  onReschedule,
}: BookingCardProps) {
  const handleAccept = useCallback(() => {
    onStatusChange?.(booking.id, 'confirmed', 'Accepted!');
  }, [booking.id, onStatusChange]);

  const handleDecline = useCallback(() => {
    onStatusChange?.(booking.id, 'cancelled', 'Declined');
  }, [booking.id, onStatusChange]);

  const handleComplete = useCallback(() => {
    onStatusChange?.(booking.id, 'completed', 'Completed!');
  }, [booking.id, onStatusChange]);

  const handleCall = useCallback(() => {
    onCall?.(booking.customer?.phone || null);
  }, [booking.customer?.phone, onCall]);

  const handleChat = useCallback(() => {
    onChat?.(booking.customer_id);
  }, [booking.customer_id, onChat]);

  const handleViewDetails = useCallback(() => {
    onViewDetails?.(booking.id);
  }, [booking.id, onViewDetails]);

  const handleReschedule = useCallback(() => {
    onReschedule?.(booking.id);
  }, [booking.id, onReschedule]);

  const getStatusBadgeClass = (status: BookingStatus): string => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'confirmed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'cancelled':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'no_show':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getSafeDate = (): string => {
    return booking.booking_date || booking.appointment_date || 'Date TBD';
  };

  const getSafeTime = (): string => {
    return booking.booking_time || booking.appointment_time || 'Time TBD';
  };

  return (
    <div className="bg-white/90 rounded-xl p-4 border border-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
      <div className="flex items-start gap-3">
        {/* Customer Avatar */}
        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-lg shadow-sm overflow-hidden flex-shrink-0">
          {booking.customer?.avatar_url ? (
            <img
              src={booking.customer.avatar_url}
              alt={booking.customer.full_name || 'Customer'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-xl">👤</span>
          )}
        </div>

        {/* Booking Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            <h4 className="font-extrabold text-slate-900 truncate text-base">
              {booking.customer?.full_name || 'Customer'}
            </h4>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border shadow-sm ${getStatusBadgeClass(booking.status)}`}>
              {booking.status}
            </span>
          </div>
          <p className="text-xs text-slate-700 font-bold mb-2 truncate">
            {booking.service_name || 'Service'}
          </p>
          <div className="flex flex-wrap gap-2 text-[10px] text-slate-700 font-bold">
            <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-purple-100">
              <Calendar className="w-3 h-3 text-purple-500" /> {getSafeDate()}
            </span>
            <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-purple-100">
              <Clock className="w-3 h-3 text-purple-500" /> {getSafeTime()}
            </span>
            {booking.total_price && (
              <span className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded text-emerald-700">
                <DollarSign className="w-3 h-3" /> ₹{booking.total_price}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-purple-100/50">
        {booking.status === 'pending' && (
          <>
            <button
              onClick={handleAccept}
              className="flex-1 py-2 bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-emerald-600 active:scale-95 transition-all duration-200 shadow-sm hover:shadow"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Accept
            </button>
            <button
              onClick={handleDecline}
              className="flex-1 py-2 bg-white text-rose-500 border border-rose-200 font-bold rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-rose-50 active:scale-95 transition-all duration-200"
            >
              <XCircle className="w-3.5 h-3.5" /> Decline
            </button>
          </>
        )}
        {booking.status === 'confirmed' && (
          <button
            onClick={handleComplete}
            className="w-full py-2 bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-purple-600 active:scale-95 transition-all duration-200 shadow-sm hover:shadow"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Mark Complete
          </button>
        )}
        {booking.status === 'completed' && (
          <div className="flex gap-2 w-full">
            <button
              onClick={handleCall}
              className="flex-1 py-2 bg-white text-slate-700 border border-slate-200 font-bold rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-slate-50 active:scale-95 transition-all duration-200"
            >
              <Phone className="w-3.5 h-3.5" /> Call
            </button>
            <button
              onClick={handleChat}
              className="flex-1 py-2 bg-white text-slate-700 border border-slate-200 font-bold rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-slate-50 active:scale-95 transition-all duration-200"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Chat
            </button>
            <button
              onClick={handleViewDetails}
              className="flex-1 py-2 bg-white text-slate-700 border border-slate-200 font-bold rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-slate-50 active:scale-95 transition-all duration-200"
            >
              <MoreHorizontal className="w-3.5 h-3.5" /> Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

// ============================================================================
// EmptyState Component
// ============================================================================

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message?: string;
  ctaText?: string;
  onCtaClick?: () => void;
  illustration?: React.ReactNode;
}

export const EmptyState = memo(function EmptyState({
  icon,
  title,
  message,
  ctaText,
  onCtaClick,
  illustration,
}: EmptyStateProps) {
  return (
    <div className="text-center py-10 px-4 animate-in fade-in zoom-in duration-300">
      {illustration ? (
        <div className="w-24 h-24 mx-auto mb-4 text-purple-300 opacity-50">
          {illustration}
        </div>
      ) : (
        <div className="w-16 h-16 mx-auto mb-4 text-purple-300 opacity-30">
          {icon}
        </div>
      )}
      <h3 className="font-bold text-slate-700 text-lg mb-1">{title}</h3>
      {message && (
        <p className="text-sm text-slate-500 font-medium mb-4">{message}</p>
      )}
      {ctaText && onCtaClick && (
        <button
          onClick={onCtaClick}
          className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-bold rounded-full shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 active:scale-95 transition-all duration-300"
        >
          {ctaText}
        </button>
      )}
    </div>
  );
});

export default {
  DashboardHeader,
  StatCard,
  StatsGrid,
  BookingCard,
  EmptyState,
};
