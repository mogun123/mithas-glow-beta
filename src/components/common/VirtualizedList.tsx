--- src/components/common/VirtualizedList.tsx (原始)


+++ src/components/common/VirtualizedList.tsx (修改后)
/**
 * Virtualized Booking List Component
 * Lightweight virtualization for large booking lists (100+ items)
 * No external dependencies - custom implementation
 */

import { memo, useCallback, useMemo, useState, useEffect } from 'react';
import type { BookingWithDetails, BookingStatus } from '../../lib/types/professional';
import { BookingCard } from './DashboardComponents';
import { EmptyState } from './DashboardComponents';
import { Calendar } from 'lucide-react';

interface VirtualizedBookingListProps {
  bookings: BookingWithDetails[];
  onStatusChange?: (bookingId: string, status: BookingStatus, message: string) => void;
  onCall?: (phone: string | null) => void;
  onChat?: (customerId: string) => void;
  onViewDetails?: (bookingId: string) => void;
  onReschedule?: (bookingId: string) => void;
  itemHeight?: number;
  overscan?: number;
}

const ROW_HEIGHT = 180;
const OVERSCAN_COUNT = 3;

export const VirtualizedBookingList = memo(function VirtualizedBookingList({
  bookings,
  onStatusChange,
  onCall,
  onChat,
  onViewDetails,
  onReschedule,
  itemHeight = ROW_HEIGHT,
  overscan = OVERSCAN_COUNT,
}: VirtualizedBookingListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleContainerResize = useCallback(() => {
    const container = document.getElementById('virtualized-booking-container');
    if (container) {
      setContainerHeight(container.clientHeight);
    }
  }, []);

  useEffect(() => {
    handleContainerResize();
    window.addEventListener('resize', handleContainerResize);
    return () => window.removeEventListener('resize', handleContainerResize);
  }, [handleContainerResize]);

  const { startIndex, endIndex, totalHeight, offsetY } = useMemo(() => {
    const totalItems = bookings.length;
    const totalHeightVal = totalItems * itemHeight;
    const startIdx = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
    const endIdx = Math.min(totalItems, startIdx + visibleCount);

    return {
      startIndex: startIdx,
      endIndex: endIdx,
      totalHeight: totalHeightVal,
      offsetY: startIdx * itemHeight,
    };
  }, [bookings.length, scrollTop, containerHeight, itemHeight, overscan]);

  const visibleBookings = useMemo(() => {
    return bookings.slice(startIndex, endIndex);
  }, [bookings, startIndex, endIndex]);

  if (bookings.length < 100) {
    return (
      <div className="space-y-3">
        {bookings.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            onStatusChange={onStatusChange}
            onCall={onCall}
            onChat={onChat}
            onViewDetails={onViewDetails}
            onReschedule={onReschedule}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      id="virtualized-booking-container"
      className="relative overflow-auto"
      style={{ maxHeight: '60vh' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${offsetY}px)`,
          }}
          className="space-y-3"
        >
          {visibleBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onStatusChange={onStatusChange}
              onCall={onCall}
              onChat={onChat}
              onViewDetails={onViewDetails}
              onReschedule={onReschedule}
            />
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 bg-white/80 backdrop-blur-sm px-3 py-2 text-[10px] text-slate-500 font-bold text-center border-t border-purple-100">
        Showing {endIndex - startIndex} of {bookings.length} bookings
      </div>
    </div>
  );
});

interface BookingListProps {
  bookings: BookingWithDetails[];
  filter: 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';
  onStatusChange?: (bookingId: string, status: BookingStatus, message: string) => void;
  onCall?: (phone: string | null) => void;
  onChat?: (customerId: string) => void;
  onViewDetails?: (bookingId: string) => void;
  onReschedule?: (bookingId: string) => void;
}

export const BookingList = memo(function BookingList({
  bookings,
  filter,
  onStatusChange,
  onCall,
  onChat,
  onViewDetails,
  onReschedule,
}: BookingListProps) {
  const filteredBookings = useMemo(() => {
    if (filter === 'all') return bookings;
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  if (filteredBookings.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="w-12 h-12" />}
        title="No bookings found"
        message="There are no bookings matching this filter."
      />
    );
  }

  return (
    <VirtualizedBookingList
      bookings={filteredBookings}
      onStatusChange={onStatusChange}
      onCall={onCall}
      onChat={onChat}
      onViewDetails={onViewDetails}
      onReschedule={onReschedule}
    />
  );
});

export default {
  VirtualizedBookingList,
  BookingList,
};
