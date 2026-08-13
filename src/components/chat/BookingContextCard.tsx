import React from 'react';
import { Calendar, Clock, DollarSign, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import type { Database } from '../../lib/database.types';

type Booking = Database['public']['Tables']['bookings']['Row'];

interface BookingContextCardProps {
  booking: Booking;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export function BookingContextCard({ booking }: BookingContextCardProps) {
  const statusColor = STATUS_COLORS[booking.status] || STATUS_COLORS.pending;

  return (
    <Card className="mb-4 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-amber-900 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Booking Details
          </h4>
          <Badge className={statusColor}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <Clock className="w-4 h-4 text-amber-600" />
            <div>
              <p className="text-xs text-gray-500">Date</p>
              <p className="font-medium">
                {format(new Date(booking.preferred_date), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-gray-700">
            <DollarSign className="w-4 h-4 text-amber-600" />
            <div>
              <p className="text-xs text-gray-500">Service</p>
              <p className="font-medium capitalize">{booking.service_type}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-amber-200">
          <div className="flex items-center gap-2 text-xs text-amber-800">
            <CheckCircle className="w-3 h-3" />
            <span>This conversation is linked to your booking</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
