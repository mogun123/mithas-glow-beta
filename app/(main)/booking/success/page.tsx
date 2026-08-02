"use client";

import { use, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Calendar, Clock, MapPin, CreditCard, Home, List, MessageSquare } from "lucide-react";

export default function BookingSuccessPage({ searchParams }: { searchParams: Promise<{ bookingId?: string }> }) {
  const router = useRouter();
  const resolvedSearchParams = use(searchParams);
  const bookingId = resolvedSearchParams.bookingId;

  // Mock booking data - in production, fetch from API using bookingId
  const booking = {
    id: bookingId || "BK-123456",
    serviceName: "Bridal Makeup",
    artistName: "Priya Sharma",
    date: new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    time: "10:00 AM",
    location: "Andheri West, Mumbai",
    amount: 15000,
    paymentStatus: "paid" as const
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          {/* Success Icon */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-gray-600">Your appointment has been successfully booked</p>
          </div>

          {/* Booking Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Booking ID</span>
              <Badge variant="outline">{booking.id.slice(0, 12)}</Badge>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex items-start gap-3 mb-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">{booking.serviceName}</p>
                  <p className="text-sm text-gray-600">with {booking.artistName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{booking.date}</p>
                  <p className="text-sm text-gray-600">{booking.time}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <p className="text-sm text-gray-600">{booking.location}</p>
              </div>

              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-400" />
                <div className="flex-1 flex justify-between items-center">
                  <p className="text-sm text-gray-600">Payment Status</p>
                  <Badge className="bg-green-100 text-green-800">Paid</Badge>
                </div>
              </div>
            </div>

            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-semibold text-gray-900">Total Amount</span>
              <span className="text-xl font-bold text-[#D4AF37]">₹{booking.amount.toLocaleString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              className="w-full bg-[#D4AF37] hover:bg-[#B8962E]"
              onClick={() => router.push("/my-bookings")}
            >
              <List className="w-4 h-4 mr-2" />
              View My Bookings
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => router.push("/")}>
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button variant="outline" onClick={() => router.push("/ai-mirror")}>
                <MessageSquare className="w-4 h-4 mr-2" />
                AI Coach
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
